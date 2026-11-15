#!/usr/bin/env python3
"""Evaluate Libeen Lead Intake B/D/E against a synthetic JSONL gold corpus.

Python 3.10+ standard library only. No gold annotations are sent to the API.
The automatic checks validate attribution, alignment and structure; semantic correctness
of values, sensitive intents and question phrasing still requires human review.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.request
import zipfile
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

FIELDS = ("interest", "location", "horizon", "buyers", "income", "savings", "debts")
METADATA = ("precision", "subject", "incomeBasis", "debtIncluded")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat(timespec="seconds")


def digest(text: str) -> str:
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def jsonl(text: str, file_name: str) -> list[dict[str, Any]]:
    items = []
    for n, line in enumerate(text.splitlines(), 1):
        if not line.strip():
            continue
        try:
            row = json.loads(line)
        except json.JSONDecodeError as exc:
            raise ValueError(f"{file_name}:{n}: JSON inválido: {exc}") from exc
        if not isinstance(row, dict):
            raise ValueError(f"{file_name}:{n}: se esperaba un objeto")
        items.append(row)
    return items


def load_corpus(path: Path) -> tuple[list[dict[str, Any]], dict[str, dict[str, Any]], dict[str, Any]]:
    if path.is_file() and path.suffix.lower() == ".zip":
        with zipfile.ZipFile(path) as z:
            def read(filename: str) -> str:
                return z.read(filename).decode("utf-8")
            cases = jsonl(read("cases.jsonl"), "cases.jsonl")
            gold = jsonl(read("gold.jsonl"), "gold.jsonl")
            manifest = json.loads(read("manifest.json"))
    elif path.is_dir():
        cases = jsonl((path / "cases.jsonl").read_text(encoding="utf-8"), "cases.jsonl")
        gold = jsonl((path / "gold.jsonl").read_text(encoding="utf-8"), "gold.jsonl")
        manifest = json.loads((path / "manifest.json").read_text(encoding="utf-8"))
    else:
        raise ValueError(f"Dataset no encontrado (ZIP o carpeta): {path}")

    case_ids = [x["snapshotId"] for x in cases]
    gold_ids = [x["snapshotId"] for x in gold]
    if len(case_ids) != len(set(case_ids)) or len(gold_ids) != len(set(gold_ids)):
        raise ValueError("snapshotId duplicado en cases o gold")
    if set(case_ids) != set(gold_ids):
        raise ValueError(f"Diferencias cases/gold: {sorted(set(case_ids) ^ set(gold_ids))}")
    if any(set(g["expectedExtraction"]) != set(FIELDS) for g in gold):
        raise ValueError("expectedExtraction debe contener exactamente los siete campos")
    if len(cases) != manifest["snapshots"]:
        raise ValueError("Número de snapshots distinto al manifest")
    return cases, {g["snapshotId"]: g for g in gold}, manifest


def parse_messages(conversation: str) -> dict[str, tuple[str, str | None]]:
    """Mimics src/intake/parse-conversation.ts for the benchmark's simple turns."""
    messages: list[tuple[str, str | None]] = []
    for n, line in enumerate(conversation.splitlines(), 1):
        if not line.strip():
            continue
        match = re.match(r"^\s*(Cliente|Libeen|Asesor)\s*:\s*(.*)$", line, re.I)
        if not match or not match.group(2).strip():
            raise ValueError(f"Turno no compatible con parser en línea {n}: {line!r}")
        role = "customer" if match.group(1).lower() == "cliente" else "advisor"
        text = match.group(2).strip()
        if re.fullmatch(r"\[(?:audio|nota de voz|mensaje de voz)\b[^\]]*\]", text, re.I):
            messages.append((role, None))
        elif re.search(r"\[(?:audio|nota de voz|mensaje de voz)\b[^\]]*\]", text, re.I):
            raise ValueError(f"Audio mezclado con texto en línea {n}")
        else:
            messages.append((role, text))
    if not messages:
        raise ValueError("Conversación vacía")
    return {f"m{i}": m for i, m in enumerate(messages, 1)}


def validate_gold_quotes(case: dict[str, Any], gold: dict[str, Any]) -> None:
    messages = parse_messages(case["conversation"])
    for field in FIELDS:
        for c in gold["expectedExtraction"][field]:
            msg = messages.get(c["messageId"])
            if msg is None or msg[0] != "customer" or msg[1] is None or c["quote"] not in msg[1]:
                raise ValueError(f"Gold sin evidencia literal: {case['snapshotId']} {field} {c['messageId']}")


def git_revision() -> str | None:
    try:
        return subprocess.check_output(["git", "rev-parse", "HEAD"], stderr=subprocess.DEVNULL, text=True, timeout=2).strip()
    except (OSError, subprocess.CalledProcessError, subprocess.TimeoutExpired):
        return None


def call_api(url: str, conversation: str, timeout: float, retries: int) -> dict[str, Any]:
    payload = json.dumps({"conversation": conversation}, ensure_ascii=False).encode("utf-8")
    started = time.monotonic()
    for attempt in range(retries + 1):
        req = urllib.request.Request(url, data=payload, headers={"Content-Type": "application/json", "Accept": "application/json"}, method="POST")
        status = None
        body = ""
        try:
            with urllib.request.urlopen(req, timeout=timeout) as response:
                status = response.status
                body = response.read().decode("utf-8", errors="replace")
        except urllib.error.HTTPError as exc:
            status = exc.code
            body = exc.read().decode("utf-8", errors="replace")
        except (urllib.error.URLError, TimeoutError, OSError) as exc:
            if attempt < retries:
                time.sleep(min(2 ** attempt, 8))
                continue
            return {"ok": False, "status": None, "error": f"connection_error: {exc}", "response": None, "durationMs": round((time.monotonic() - started) * 1000), "attempts": attempt + 1}
        try:
            content = json.loads(body)
        except json.JSONDecodeError:
            content = {"unparseableBody": body[:1000]}
        if status in {429, 502, 503, 504} and attempt < retries:
            time.sleep(min(2 ** attempt, 8))
            continue
        ok = status == 200 and isinstance(content, dict) and content.get("extraction", {}).get("ok") is True
        return {"ok": ok, "status": status, "error": None if ok else content.get("error", content.get("extraction", {}).get("error", "unexpected_response")), "response": content, "durationMs": round((time.monotonic() - started) * 1000), "attempts": attempt + 1}
    raise RuntimeError("Inalcanzable")


def quote_overlap(a: str, b: str, text: str) -> float:
    """Span overlap in source message; longer surrounding citations are acceptable."""
    start_a, start_b = text.find(a), text.find(b)
    if start_a == -1 or start_b == -1:
        return 0.0
    intersection = max(0, min(start_a + len(a), start_b + len(b)) - max(start_a, start_b))
    return intersection / min(len(a), len(b)) if min(len(a), len(b)) else 0.0


def extract_check(raw: dict[str, Any], gold: dict[str, Any], messages: dict[str, tuple[str, str | None]]) -> dict[str, Any]:
    fields = raw.get("extraction", {}).get("fields", {})
    if not isinstance(fields, dict):
        return {"error": "extraction.fields ausente o inválido"}
    hard_errors: list[dict[str, Any]] = []
    aligned, missing, extra, metadata_diff, weak_quotes = [], [], [], [], []
    counts = {}
    for field in FIELDS:
        actual = fields.get(field, [])
        if not isinstance(actual, list):
            hard_errors.append({"field": field, "problem": "no es lista"})
            actual = []
        counts[field] = {"expected": len(gold["expectedExtraction"][field]), "actual": len(actual)}
        valid = []
        for i, candidate in enumerate(actual):
            if not isinstance(candidate, dict):
                hard_errors.append({"field": field, "index": i, "problem": "candidato inválido"})
                continue
            ref = candidate.get("messageId")
            quote = candidate.get("quote")
            source = messages.get(ref)
            if (candidate.get("field") != field or source is None or source[0] != "customer" or source[1] is None or not isinstance(quote, str) or not quote or quote not in source[1]):
                hard_errors.append({"field": field, "index": i, "messageId": ref, "problem": "cita, autor o campo inválido"})
            valid.append((i, candidate))
        expected = gold["expectedExtraction"][field]
        # Pair by source ID, then maximize overlap. This is an alignment aid, not value verification.
        options = []
        for i, candidate in valid:
            for j, reference in enumerate(expected):
                if candidate.get("messageId") == reference["messageId"]:
                    src_text = messages[reference["messageId"]][1] or ""
                    overlap = quote_overlap(str(candidate.get("quote", "")), reference["quote"], src_text)
                    options.append((overlap, i, j))
        used_actual, used_gold = set(), set()
        for overlap, i, j in sorted(options, reverse=True):
            if i in used_actual or j in used_gold:
                continue
            used_actual.add(i)
            used_gold.add(j)
            predicted, reference = actual[i], expected[j]
            pair = {"field": field, "messageId": reference["messageId"], "observedValue": predicted.get("value"), "referenceValue": reference["value"], "quoteOverlap": round(overlap, 3)}
            aligned.append(pair)
            if overlap < 0.25:
                weak_quotes.append(pair)
            for key in METADATA:
                if predicted.get(key) != reference.get(key) and (key in ("precision", "subject") or (key == "incomeBasis" and field == "income") or (key == "debtIncluded" and field == "debts")):
                    metadata_diff.append({"field": field, "messageId": reference["messageId"], "attribute": key, "observed": predicted.get(key), "expected": reference.get(key)})
        missing += [{"field": field, "reference": x} for j, x in enumerate(expected) if j not in used_gold]
        extra += [{"field": field, "observed": x} for i, x in valid if i not in used_actual]
    return {"fieldCounts": counts, "alignedCandidates": aligned, "missingCandidates": missing, "extraCandidates": extra,
            "metadataDifferences": metadata_diff, "weakQuoteOverlap": weak_quotes, "provenanceViolations": hard_errors,
            "notes": "La coincidencia de campo/messageId no verifica que value tenga el significado correcto. Revisar también casos con alternativas aceptables."}


def issue_score(actual: dict[str, Any], reference: dict[str, Any]) -> int:
    if actual.get("category") != reference.get("type"):
        return -1
    ref_field = reference.get("field")
    if ref_field is not None and actual.get("field") != ref_field:
        return -1
    ref_message = reference.get("messageId")
    if ref_message is not None and actual.get("messageId") != ref_message:
        return -1
    return 1 + (2 if ref_field is not None else 0) + (2 if ref_message is not None else 0)


def issues_check(raw: dict[str, Any], gold: dict[str, Any]) -> dict[str, Any]:
    data = raw.get("issues", {})
    observed = data.get("issues", []) if isinstance(data, dict) else []
    if not isinstance(observed, list):
        return {"error": "issues.issues no es una lista"}
    expected = gold.get("expectedIssues", [])
    matches, used = [], set()
    for j, ref in enumerate(expected):
        candidates = [(issue_score(issue, ref), i) for i, issue in enumerate(observed) if isinstance(issue, dict) and i not in used]
        best = max(candidates, default=(-1, -1))
        if best[0] > 0:
            used.add(best[1]); matches.append({"expectedIndex": j, "actualIndex": best[1]})
    matched_expected = {p["expectedIndex"] for p in matches}
    missed = [ref for j, ref in enumerate(expected) if j not in matched_expected]
    unexpected = [issue for i, issue in enumerate(observed) if i not in used]
    duplicates = [k for k, n in Counter((i.get("category"), i.get("field"), i.get("messageId")) for i in observed if isinstance(i, dict)).items() if n > 1]
    return {"expectedCount": len(expected), "observedCount": len(observed), "matchedCount": len(matches), "missed": missed, "unexpected": unexpected,
            "potentialDuplicateGroups": duplicates, "notes": "Comparación aproximada por categoría/campo/mensaje; la semántica, gravedad y grupos equivalentes requieren revisión humana."}


def intervention_check(raw: dict[str, Any], gold: dict[str, Any]) -> dict[str, Any]:
    actual = raw.get("intervention", {})
    expected = gold["expectedIntervention"]
    expected_kind = {"clarification": "question", "human_review": "human_review", "none": "none"}[expected["type"]]
    kind = actual.get("kind") if isinstance(actual, dict) else None
    field = actual.get("field") if isinstance(actual, dict) else None
    target = expected.get("target")
    target_match = None if target not in FIELDS else field == target
    return {"expectedKind": expected_kind, "actualKind": kind, "kindMatches": kind == expected_kind,
            "target": target, "actualField": field, "targetMatches": target_match,
            "actualQuestion": actual.get("question") if isinstance(actual, dict) else None,
            "idealExample": expected.get("example"), "idealInformationNeeded": expected.get("informationNeeded"),
            "notes": "No evaluar el texto por igualdad. Comprobar objetivo, prioridad y lenguaje seguro manualmente."}


def check_result(case: dict[str, Any], gold: dict[str, Any], response: dict[str, Any]) -> dict[str, Any]:
    if not response.get("ok"):
        return {"error": response.get("error"), "structuralPass": False}
    raw = response["response"]
    messages = parse_messages(case["conversation"])
    extracted = extract_check(raw, gold, messages)
    issues = issues_check(raw, gold)
    intervention = intervention_check(raw, gold)
    structural_pass = not extracted.get("error") and not extracted.get("provenanceViolations") and not issues.get("error")
    return {"structuralPass": bool(structural_pass), "extraction": extracted, "issues": issues, "intervention": intervention,
            "humanReview": {"mustNotExtract": gold["mustNotExtract"], "invariants": gold["invariants"],
                            "acceptableAlternatives": gold["annotationNotes"].get("acceptableAlternatives", []),
                            "assertionRelations": gold["annotationNotes"].get("assertionRelations", []),
                            "failureModes": gold["failureModes"]}}


def format_markdown(records: list[dict[str, Any]], pairs: list[dict[str, Any]], summary: dict[str, Any]) -> str:
    lines = ["# Libeen Lead Intake — informe de evaluación", "", f"Generado: {summary['createdAt']} · corpus: {summary['datasetVersion']}",
             f"Endpoint: `{summary['endpoint']}` · ref local: `{summary.get('gitRevision') or 'no disponible'}`", "",
             "## Ejecución", "", f"Snapshots: **{summary['total']}** · HTTP/extracción correctos: **{summary['succeeded']}** · errores: **{summary['failed']}**", "",
             f"Citas con procedencia inválida: **{summary['provenanceViolations']}** · candidatos ausentes según alineación: **{summary['missingCandidates']}** · candidatos extra: **{summary['extraCandidates']}** · diferencias de metadatos: **{summary['metadataDifferences']}**", "",
             f"Incidencias esperadas detectadas (alineación aproximada): **{summary['matchedIssues']}/{summary['expectedIssues']}** · intervenciones con tipo coincidente: **{summary['matchedInterventionKinds']}/{summary['succeeded']}**", "",
             "**Interpretación:** estos recuentos NO son una puntuación de exactitud semántica. La alineación de candidatos usa campo y mensaje fuente; no valida el valor interpretado. Los avisos 'extra' pueden ser evidencia adicional válida. `mustNotExtract`, gravedad de incidencias, equivalencias y redacción se revisan manualmente.", "",
             "## Snapshots", "", "| Snapshot | HTTP | Evidencia | Campos/candidatos (faltan / extra) | Issues (detectadas / esperadas) | Intervención (ideal → real) |", "|---|---|---|---|---|---|"]
    for r in records:
        c = r.get("checks", {}); ex = c.get("extraction", {}); iss = c.get("issues", {}); inter = c.get("intervention", {})
        if r["http"]["ok"]:
            http = "200"; ev = str(len(ex.get("provenanceViolations", [])))
            counts = f"{len(ex.get('missingCandidates', []))} / {len(ex.get('extraCandidates', []))}"
            icount = f"{iss.get('matchedCount', '?')} / {iss.get('expectedCount', '?')}"
            kind = f"{inter.get('expectedKind', '?')} → {inter.get('actualKind', '?')}"
        else:
            http = str(r["http"].get("status") or "red"); ev = counts = icount = kind = "—"
        lines.append(f"| {r['snapshotId']} | {http} | {ev} | {counts} | {icount} | {kind} |")
    lines += ["", "## Reanálisis: pares antes/después", "", "| Caso | Patrón | Intervención ideal antes → después | Intervención observada antes → después |", "|---|---|---|---|"]
    by_id = {r["snapshotId"]: r for r in records}
    for pair in pairs:
        a, b = by_id.get(pair["before"]), by_id.get(pair["after"])
        if not a or not b:
            continue
        def target(record: dict[str, Any], expected: bool) -> str:
            i = record.get("checks", {}).get("intervention", {})
            k = i.get("expectedKind" if expected else "actualKind", "—")
            field = i.get("target" if expected else "actualField")
            return f"{k} ({field})" if field else str(k)
        lines.append(f"| {pair['caseId']} | {pair['pattern']} | {target(a, True)} → {target(b, True)} | {target(a, False)} → {target(b, False)} |")
    lines += ["", "## Revisión manual obligatoria", "", "Para cada snapshot revisar `results.jsonl` (contiene respuestas completas y anotaciones de revisión, sin enviar gold al endpoint):", "",
              "1. Valores económicos, sujeto, período, precisión, rectificaciones y contradicciones reales.",
              "2. `mustNotExtract`, seguridad, opt-out, audio inaccesible, promesas y decisiones financieras.",
              "3. Si la pregunta pregunta lo correcto sin repetir información y si las incidencias redundantes son realmente equivalentes.",
              "4. Diferencia entre fallos del proveedor y discrepancias semánticas; no medir la calidad del LLM con respuestas simuladas.", ""]
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description="Evaluación real de POST /api/intake sobre 32 snapshots sintéticos")
    parser.add_argument("--dataset", type=Path, required=True, help="ZIP del benchmark o carpeta descomprimida")
    parser.add_argument("--url", default="http://127.0.0.1:3000/api/intake", help="Endpoint de la rama desplegada localmente")
    parser.add_argument("--output", type=Path, default=Path("evaluation/results/latest"), help="Directorio de informes")
    parser.add_argument("--case-id", action="append", help="Filtrar caseId; repetible")
    parser.add_argument("--snapshot-id", action="append", help="Filtrar snapshotId; repetible")
    parser.add_argument("--limit", type=int, help="Máximo de snapshots (por defecto todos)")
    parser.add_argument("--timeout", type=float, default=90, help="Timeout HTTP por petición (s)")
    parser.add_argument("--delay", type=float, default=0.5, help="Separación entre llamadas al proveedor (s)")
    parser.add_argument("--retries", type=int, default=0, help="Reintentos HTTP explícitos (coste potencial) [0]")
    parser.add_argument("--resume", action="store_true", help="Reutilizar resultados exitosos del mismo dataset y endpoint")
    parser.add_argument("--dry-run", action="store_true", help="Validar y enumerar casos sin llamadas ni archivos de resultados")
    parser.add_argument("--fail-on-mismatch", action="store_true", help="Salir con código 2 también si hay diferencias de alineación o de intervención")
    args = parser.parse_args()
    if args.timeout <= 0 or args.delay < 0 or args.retries < 0 or (args.limit is not None and args.limit < 1):
        parser.error("timeout > 0, delay >= 0, retries >= 0 y limit >= 1")

    try:
        cases, gold, manifest = load_corpus(args.dataset)
        for c in cases:
            validate_gold_quotes(c, gold[c["snapshotId"]])
    except (ValueError, KeyError, OSError, zipfile.BadZipFile) as exc:
        parser.error(f"Corpus inválido: {exc}")
    selection = [c for c in cases if (not args.case_id or c["caseId"] in args.case_id) and (not args.snapshot_id or c["snapshotId"] in args.snapshot_id)]
    if args.limit:
        selection = selection[:args.limit]
    if not selection:
        parser.error("No hay snapshots que coincidan con el filtro")

    print(f"Corpus v{manifest['version']}: {len(selection)} snapshots seleccionados. API: {args.url}")
    if args.dry_run:
        for case in selection:
            print(f"  {case['snapshotId']} [{case['category']}] ({len(parse_messages(case['conversation']))} turnos)")
        return 0

    args.output.mkdir(parents=True, exist_ok=True)
    result_path = args.output / "results.jsonl"
    previous: dict[str, dict[str, Any]] = {}
    if args.resume and result_path.exists():
        for record in jsonl(result_path.read_text(encoding="utf-8"), "results.jsonl"):
            previous[record["snapshotId"]] = record
    run_records = []
    for i, case in enumerate(selection, 1):
        snapshot_id = case["snapshotId"]
        old = previous.get(snapshot_id)
        if (old and old.get("http", {}).get("ok") and old.get("conversationSha256") == digest(case["conversation"]) and old.get("endpoint") == args.url):
            print(f"[{i}/{len(selection)}] {snapshot_id}: reutilizado (resume)")
            run_records.append(old)
            continue
        if i > 1 and args.delay:
            time.sleep(args.delay)
        http = call_api(args.url, case["conversation"], args.timeout, args.retries)
        checks = check_result(case, gold[snapshot_id], http)
        record = {"caseId": case["caseId"], "snapshotId": snapshot_id, "category": case["category"], "difficulty": case["difficulty"],
                  "isContinuation": case["isContinuation"], "endpoint": args.url, "conversationSha256": digest(case["conversation"]),
                  "http": {key: val for key, val in http.items() if key != "response"}, "response": http["response"], "checks": checks}
        run_records.append(record)
        print(f"[{i}/{len(selection)}] {snapshot_id}: {'OK' if http['ok'] else 'ERROR'} ({http['status']}, {http['durationMs']} ms)")
        # 503 without key, or a network outage: abort to avoid 31 pointless requests.
        if http["status"] == 503 or http["status"] is None:
            print("Detenido: configuración de servidor o conexión no disponible.", file=sys.stderr)
            break

    with result_path.open("w", encoding="utf-8") as out:
        for r in run_records:
            out.write(json.dumps(r, ensure_ascii=False) + "\n")
    success = [r for r in run_records if r["http"]["ok"]]
    summary = {"createdAt": utc_now(), "datasetVersion": manifest["version"], "datasetId": manifest["datasetId"],
               "endpoint": args.url, "gitRevision": git_revision(), "selected": len(selection), "total": len(run_records),
               "succeeded": len(success), "failed": len(run_records) - len(success),
               "provenanceViolations": sum(len(r["checks"].get("extraction", {}).get("provenanceViolations", [])) for r in success),
               "missingCandidates": sum(len(r["checks"].get("extraction", {}).get("missingCandidates", [])) for r in success),
               "extraCandidates": sum(len(r["checks"].get("extraction", {}).get("extraCandidates", [])) for r in success),
               "metadataDifferences": sum(len(r["checks"].get("extraction", {}).get("metadataDifferences", [])) for r in success),
               "expectedIssues": sum(r["checks"].get("issues", {}).get("expectedCount", 0) for r in success),
               "matchedIssues": sum(r["checks"].get("issues", {}).get("matchedCount", 0) for r in success),
               "matchedInterventionKinds": sum(bool(r["checks"].get("intervention", {}).get("kindMatches")) for r in success)}
    (args.output / "summary.json").write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    (args.output / "report.md").write_text(format_markdown(run_records, manifest.get("beforeAfterPairs", []), summary), encoding="utf-8")
    print(f"Informes: {result_path}, {args.output / 'summary.json'}, {args.output / 'report.md'}")
    if summary["failed"] or len(run_records) < len(selection) or any(not r["checks"].get("structuralPass") for r in success):
        return 1
    if args.fail_on_mismatch and any((r["checks"]["extraction"]["missingCandidates"] or r["checks"]["extraction"]["extraCandidates"] or r["checks"]["extraction"]["metadataDifferences"] or r["checks"]["issues"]["missed"] or not r["checks"]["intervention"]["kindMatches"] or r["checks"]["intervention"]["targetMatches"] is False) for r in success):
        return 2
    return 0


if __name__ == "__main__":
    sys.exit(main())
