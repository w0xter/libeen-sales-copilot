#!/usr/bin/env python3
"""Prepare and run a reproducible 20-conversation Kapibala pilot for Libeen.

Only Python stdlib. Running live model calls requires --allow-model-calls.
"""
import argparse
import csv
import datetime as dt
import hashlib
import json
import re
import sys
import time
import urllib.error
import urllib.request
from collections import Counter
from pathlib import Path

DATASET = "Thomasgudan/kapibala-sales-dialogues"
REVISION = "1e253fe"
FILES = ("conversations.jsonl", "meta.jsonl", "labels_L1_outcome.jsonl")
OUTCOMES = ("bought", "next_step", "undecided", "declined")
QUOTAS = {"real estate": 12, "financial": 8}
SEED = "libeen-kapibala-pilot-v1-2026-11-16"

def jsonl(path):
    with Path(path).open(encoding="utf-8") as f:
        return [json.loads(line) for line in f if line.strip()]

def write_jsonl(path, rows):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")

def download_sources(cache, revision, offline):
    cache = Path(cache)
    cache.mkdir(parents=True, exist_ok=True)
    files = {}
    for name in FILES:
        target = cache / name
        url = "https://huggingface.co/datasets/" + DATASET + "/resolve/" + revision + "/data/" + name
        if not target.exists():
            if offline:
                raise RuntimeError("Falta el fichero en modo offline: " + str(target))
            try:
                req = urllib.request.Request(url, headers={"User-Agent": "Libeen-Kapibala-Pilot/1.0"})
                with urllib.request.urlopen(req, timeout=90) as response:
                    payload = response.read()
            except (urllib.error.URLError, TimeoutError) as exc:
                raise RuntimeError("Descarga fallida; copia manualmente " + url + " en " + str(target) + ": " + str(exc)) from exc
            temp = target.with_suffix(".part")
            temp.write_bytes(payload)
            temp.replace(target)
        content = target.read_bytes()
        files[name] = {"url": url, "sha256": hashlib.sha256(content).hexdigest(), "bytes": len(content)}
    return files

def rank(case_id):
    return hashlib.sha256((SEED + "|" + case_id).encode()).hexdigest()

def scenario_group(case_id):
    # Generation arms share the same scenario/script and salesperson style.
    # e.g. kapibala-sim:talksub_loop:S26_pushy and ...:mstate:S26_pushy.
    return case_id.rsplit(":", 1)[-1]

def selection(cache):
    records = {x["id"]: x for x in jsonl(cache / FILES[0])}
    labels = {x["id"]: x for x in jsonl(cache / FILES[2])}
    available = []
    for meta in jsonl(cache / FILES[1]):
        case_id = meta["id"]
        domain = str(meta.get("domain", "")).lower().replace("_", " ").replace("-", " ").strip()
        language = str(meta.get("language", "")).lower().strip()
        if case_id in records and case_id in labels and domain in QUOTAS and language in ("en", "english"):
            outcome = labels[case_id].get("outcome")
            if outcome in OUTCOMES:
                available.append((case_id, domain, outcome, records[case_id], meta))
    selected = []
    used_groups = set()
    for domain, target in QUOTAS.items():
        pool = sorted((x for x in available if x[1] == domain), key=lambda x: rank(x[0]))
        if len({scenario_group(x[0]) for x in pool}) < target:
            raise RuntimeError("Insuficientes escenarios distintos en inglés para " + domain)
        chosen = []
        for outcome in OUTCOMES:
            for row in pool:
                if sum(x[2] == outcome for x in chosen) >= target // len(OUTCOMES):
                    break
                if row[2] == outcome and scenario_group(row[0]) not in used_groups:
                    chosen.append(row)
                    used_groups.add(scenario_group(row[0]))
        for row in pool:
            if len(chosen) >= target:
                break
            if scenario_group(row[0]) not in used_groups:
                chosen.append(row)
                used_groups.add(scenario_group(row[0]))
        if len(chosen) != target:
            raise RuntimeError("Selección incompleta para " + domain)
        selected.extend(chosen)
    if len(selected) != 20 or len({scenario_group(x[0]) for x in selected}) != 20:
        raise RuntimeError("La selección no tiene 20 escenarios distintos")
    return selected

def normalize(item, ordinal):
    case_id, domain, outcome, record, meta = item
    messages = []
    for i, msg in enumerate(record["messages"]):
        role = {"b": "customer", "a": "advisor", "customer": "customer", "salesperson": "advisor"}.get(msg["role"])
        if not role:
            raise RuntimeError("Rol desconocido: " + str(msg["role"]))
        content = re.sub(r"\s+", " ", str(msg["content"])).strip()
        if not content:
            raise RuntimeError("Turno vacío en " + case_id)
        messages.append({"id": "m" + str(i+1), "role": role, "text": content})
    chat = "\n".join(("Cliente" if x["role"] == "customer" else "Asesor") + ": " + x["text"] for x in messages)
    return {"case_id": "kapibala-" + f"{ordinal:02d}", "source_id": case_id, "scenario_group": scenario_group(case_id), "domain": domain,
            "language": "en", "arm": meta.get("arm"), "product": meta.get("product"),
            "source_outcome_L1": outcome, "outcome_is_model_generated": True,
            "messages": messages, "conversation": chat}

def prepare(args):
    cache, root = Path(args.cache), Path(args.output)
    sources = download_sources(cache, args.revision, args.offline)
    rows = [normalize(x, i) for i, x in enumerate(selection(cache), 1)]
    write_jsonl(root / "inputs/kapibala_20.jsonl", rows)
    csv_path = root / "inputs/kapibala_20_catalog.csv"
    keys = ["case_id", "source_id", "scenario_group", "domain", "arm", "source_outcome_L1", "product", "n_messages"]
    with csv_path.open("w", encoding="utf-8", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=keys)
        writer.writeheader()
        for row in rows:
            writer.writerow({k: len(row["messages"]) if k == "n_messages" else row.get(k) for k in keys})
    write_jsonl(root / "review/kapibala_20_review_template.jsonl", [
        {"case_id": r["case_id"], "source_id": r["source_id"], "status": "not_annotated",
         "expected_facts": None, "expected_issues": None, "expected_next_action": None,
         "fact_grounding": None, "semantic_accuracy": None, "next_action_appropriate": None,
         "safety": None, "human_review_required": None, "reviewer_notes": None}
        for r in rows
    ])
    manifest = {"created_utc": dt.datetime.now(dt.timezone.utc).isoformat(), "dataset": DATASET,
                "revision_requested": args.revision, "seed": SEED, "quotas": QUOTAS,
                "selection": "Unique scenario/style across generation arms; up to quota/4 per L1 outcome, remainder by stable SHA256 rank",
                "files": sources, "ids": [r["source_id"] for r in rows],
                "license": "CC BY 4.0; preserve attribution",
                "limits": ["L1 labels are model judgements, not gold",
                           "The current Libeen code is SmartHousing-specific",
                           "Multiline turns are normalized to one line for the Libeen parser"]}
    (root / "source_manifest.json").write_text(json.dumps(manifest, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print("Prepared", len(rows), "cases:", dict(Counter(x["domain"] for x in rows)))
    print("L1 outcomes:", dict(Counter(x["source_outcome_L1"] for x in rows)))

def grounding(body, messages):
    extraction = body.get("extraction")
    if not isinstance(extraction, dict) or not extraction.get("ok"):
        return 0, 0
    customers = {m["id"]: m["text"] for m in messages if m["role"] == "customer"}
    candidates = [c for v in extraction.get("fields", {}).values() if isinstance(v, list) for c in v]
    valid = sum(isinstance(c, dict) and isinstance(c.get("quote"), str) and c.get("messageId") in customers
                and c["quote"] in customers[c["messageId"]] for c in candidates)
    return valid, len(candidates)

def run(args):
    if not args.allow_model_calls:
        raise RuntimeError("Usa --allow-model-calls para consentir llamadas al modelo y sus posibles costes.")
    if not args.endpoint.startswith(("http://localhost:", "http://127.0.0.1:")):
        raise RuntimeError("Este piloto solo acepta endpoints locales.")
    cases = jsonl(args.inputs)[:args.limit]
    if not cases:
        raise RuntimeError("Primero ejecuta prepare.")
    target = Path(args.output)
    if target.exists() and not args.overwrite:
        raise RuntimeError("El resultado ya existe; usa otra ruta o --overwrite.")
    observations = []
    for i, case in enumerate(cases, 1):
        payload = json.dumps({"conversation": case["conversation"]}, ensure_ascii=False).encode()
        req = urllib.request.Request(args.endpoint, data=payload,
                                     headers={"Content-Type": "application/json"}, method="POST")
        t0 = time.monotonic()
        try:
            with urllib.request.urlopen(req, timeout=args.timeout) as response:
                status, body = response.status, json.loads(response.read())
        except urllib.error.HTTPError as exc:
            status = exc.code
            raw = exc.read().decode("utf-8", errors="replace")
            try:
                body = json.loads(raw)
            except ValueError:
                body = {"raw_error": raw[:1500]}
        except (urllib.error.URLError, TimeoutError) as exc:
            status, body = 0, {"transport_error": str(exc)}
        good, total = grounding(body, case["messages"])
        intervention = body.get("intervention") if isinstance(body, dict) else None
        observations.append({"case_id": case["case_id"], "source_id": case["source_id"],
                             "domain": case["domain"], "http_status": status,
                             "duration_seconds": round(time.monotonic() - t0, 2),
                             "grounded_literal": good, "total_candidates": total,
                             "intervention_kind": intervention.get("kind") if isinstance(intervention, dict) else None,
                             "model_output": body})
        print(f"[{i}/{len(cases)}] {case['case_id']} status={status} literal={good}/{total}")
        if args.delay > 0 and i != len(cases):
            time.sleep(args.delay)
    write_jsonl(target, observations)
    print("Saved:", target, "HTTP 200:", sum(r["http_status"] == 200 for r in observations), "/", len(observations))
    print("These are observations, not semantic accuracy metrics without human gold.")

def main():
    p = argparse.ArgumentParser(description=__doc__)
    sub = p.add_subparsers(dest="action", required=True)
    a = sub.add_parser("prepare")
    a.add_argument("--output", default="benchmarks/kapibala-pilot")
    a.add_argument("--cache", default=".cache/kapibala-sales-dialogues")
    a.add_argument("--revision", default=REVISION)
    a.add_argument("--offline", action="store_true")
    a.set_defaults(fn=prepare)
    b = sub.add_parser("run")
    b.add_argument("--inputs", default="benchmarks/kapibala-pilot/inputs/kapibala_20.jsonl")
    b.add_argument("--output", default="benchmarks/kapibala-pilot/results/local_run.jsonl")
    b.add_argument("--endpoint", default="http://localhost:3000/api/intake")
    b.add_argument("--limit", type=int, default=3, choices=range(1, 21), metavar="1..20")
    b.add_argument("--delay", type=float, default=0.5)
    b.add_argument("--timeout", type=int, default=90)
    b.add_argument("--allow-model-calls", action="store_true")
    b.add_argument("--overwrite", action="store_true")
    b.set_defaults(fn=run)
    args = p.parse_args()
    try:
        args.fn(args)
    except (RuntimeError, FileNotFoundError, ValueError) as exc:
        p.exit(2, "ERROR: " + str(exc) + "\n")

if __name__ == "__main__":
    main()
