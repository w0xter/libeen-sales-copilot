# EXP-EXTRACT-01 — Gold auditado y particionado

**Rama:** `experiment/structured-extraction-v1`. La V0 en `main` no se modifica. Fuente: [corpus Notion aprobado](https://app.notion.com/p/41ba4247646881db88eff6c0ff6e93ba) y [especificación del benchmark](https://app.notion.com/p/41ba424764688164ab42c161f163921e).

## Estado G0 (18-11-2026)

- **48/48 casos revisados por un agente contra el texto y las decisiones semánticas aprobadas**, 51 afirmaciones y sus citas; seis casos con cambios registrados en `audit/gold-v1-audit.jsonl`.
- `datasets/gold.v0.1.jsonl` se mantiene intacto como histórico. `datasets/gold.v1.jsonl` es un **snapshot candidato auditado**, con `status: agent_reviewed_pending_independent`. No equivale a revisión humana independiente ni certificación para producción.
- Distribución manual estratificada: 12 `development`, 24 `evaluation` y 12 `reserved_nonblind`, siempre 2/4/2 por familia. Todos los casos ya eran visibles: `reserved_nonblind` **no es holdout ciego**. Un holdout independiente requiere casos *nuevos*, no divulgados al desarrollador del extractor B.
- La versión v1 es una referencia versionada en un commit; modificarla exige una revisión documentada y una versión posterior. No se han ejecutado modelos, ni fijado métricas, ni entrenado el extractor.

## Archivos

- `datasets/gold.v0.1.jsonl`: dataset original propuesto.
- `datasets/gold.v1.jsonl`: gold candidato auditado con `role`, fuentes, valores específicos, abstenciones esperadas y controles contextuales.
- `datasets/gold.v1.schema.json`: JSON Schema de estructura, sin prometer exactitud semántica.
- `datasets/split-manifest.v1.json`: particiones y cobertura; reservados no ciegos.
- `audit/gold-v1-audit.jsonl`: 48 registros de revisión, seis con correcciones y notas de decisión.
- `validate-gold-v1.mjs`: validación sin dependencias de atribución, evidencia, casos, partición, riesgos semánticos conocidos.

Validación local:

```bash
node experiments/structured-extraction-v1/validate-gold-v1.mjs
```

## Correcciones sustantivas v0.1 → v1

1. **F1-02 y F2-11**: ampliar citas del campo ubicación, evitando fragmentos demasiado incompletos para verificar por sí solos la relación semántica.
2. **F4-28**: `quincena` no es sinónimo estricto de `fortnight` (14 días); se conserva la unidad declarada.
3. **F4-30 y F4-31**: ampliar evidencia de deuda hasta incluir la declaración sobre si la cuota está descontada de los ingresos.
4. **F6-46**: eliminar escapes de corchetes de Markdown de la representación fuente; la frase original se conserva como «[Imagen adjunta no accesible] Ahí aparecen mis ingresos.»

**Adjudicación que requiere vigilancia:** el oráculo narrativo de F4-31 sugería una cuota mensual de 185 €, pero la frase solo identifica su importe y la relación con ingresos. v1 mantiene `period:null`, fiel a la regla aprobada de no inventar unidades.

**No añadir ni transformar:** ingresos de terceros en ingreso del comprador, comisiones parciales en renta total, ahorro inmovilizado en ahorro disponible, negaciones de deuda en importes ficticios, preferencias de contacto en plazo de compra, ciudades de residencia en destino, meses relativos en fechas absolutas.

## Puertas siguientes

1. **Revisión humana independiente** de las 48 anotaciones y del criterio F4-31; si cambia algo, publicar gold v1.1 con changelog.
2. Congelar prompt/modelos/validador y registrar commit SHA de gold antes de la primera ejecución A/B/C.
3. Usar `development` para ajustar B, evaluar en `evaluation`. **No llamar holdout** al bloque `reserved_nonblind`; si se necesita holdout real, preparar nuevos casos fuera del entorno de optimización.

**Nota de alcance:** aunque este gold es reproducible, los 48 casos sintéticos no representan una distribución real de clientes y el baseline V0 tiene un criterio más restrictivo para `interest`.
