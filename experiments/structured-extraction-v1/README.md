# EXP-EXTRACT-01 — Gold v1 validado por el usuario

**Rama:** `experiment/structured-extraction-v1`. La V0 en `main` no se modifica. Fuente: [corpus Notion aprobado](https://app.notion.com/p/41ba4247646881db88eff6c0ff6e93ba) y [especificación del benchmark](https://app.notion.com/p/41ba424764688164ab42c161f163921e).

## Estado G0 (18-11-2026)

- **48/48 casos revisados por un agente contra el texto y las decisiones semánticas aprobadas**, 51 afirmaciones y sus citas; seis casos con cambios registrados en `audit/gold-v1-audit.jsonl`.
- `datasets/gold.v0.1.jsonl` se mantiene intacto como histórico. **El propietario del dataset revisó y aprobó las 48 entradas de `datasets/gold.v1.jsonl` el 18-11-2026**, incluidas 51 afirmaciones y sus ausencias. Estado `user_approved`; la revisión del agente y la aprobación humana están registradas por separado en cada anotación y auditoría. La validación humana **no equivale a certificación para producción**.
- Distribución manual estratificada: 12 `development`, 24 `evaluation` y 12 `reserved_nonblind`, siempre 2/4/2 por familia. Los conjuntos `development` y `evaluation` tienen al menos un ejemplo de cada uno de los siete campos; los casos `reserved_nonblind` son casos de contraste adicionales, **no** un holdout independiente. Todos los casos ya eran visibles: `reserved_nonblind` **no es holdout ciego**. Un holdout independiente requiere casos *nuevos*, no divulgados al desarrollador del extractor B.
- La versión v1 queda **aprobada y congelada como referencia experimental** desde el commit de aprobación. Modificar el gold requerirá una nueva versión y registro de cambios; el experimento A/B/C debe fijar un SHA concreto al ejecutarse. No se han ejecutado modelos, ni fijado métricas, ni entrenado el extractor.

## Archivos

- `datasets/gold.v0.1.jsonl`: dataset original propuesto.
- `datasets/gold.v1.jsonl`: **gold v1 validado por el usuario** con `role`, fuentes, valores específicos, abstenciones esperadas y controles contextuales.
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

**Adjudicación validada en gold.v1:** el oráculo narrativo de F4-31 sugería una cuota mensual de 185 €, pero la frase solo identifica su importe y la relación con ingresos. v1 conserva `period:null`, de acuerdo con la regla aprobada de no inventar unidades.

**No añadir ni transformar:** ingresos de terceros en ingreso del comprador, comisiones parciales en renta total, ahorro inmovilizado en ahorro disponible, negaciones de deuda en importes ficticios, preferencias de contacto en plazo de compra, ciudades de residencia en destino, meses relativos en fechas absolutas.

## Puertas siguientes

1. **Gold v1 validado por el usuario el 18-11-2026**: sin revisión adicional obligatoria para arrancar la comparación sintética. Si se detecta un error futuro (incluido F4-31), publicar una versión posterior con changelog sin alterar retrospectivamente v1.
2. Registrar el SHA del commit de aprobación de v1, y congelar prompt/modelos/validador antes de la primera ejecución A/B/C.
3. Usar `development` para ajustar B y `evaluation` para compararlo con A/C. **No llamar holdout** al bloque `reserved_nonblind`; para una prueba ciega, obtener nuevos casos fuera del entorno de optimización.

**Nota de alcance:** aunque este gold es reproducible, los 48 casos sintéticos no representan una distribución real de clientes y el baseline V0 tiene un criterio más restrictivo para `interest`.
