# P3 — Resultado del módulo E

`nextQuestion(extraction, issues)` en `src/intake/next-question.ts` consume las uniones existentes de B y D. Devuelve una pregunta con motivo, campo e identificador de incidencia, una revisión del asesor, ausencia de pregunta prioritaria o el error de B/D. No hace llamadas al modelo ni envía mensajes. La selección es determinista: solicitud sensible, ambigüedad (base de ingresos primero, después orden explícito por campo), primer faltante según P0 y, por último, ninguna pregunta. Para una ambigüedad sin campo se pide revisión humana.

## Ejemplo B → D → E con respuestas simuladas

En la prueba de Laura, B recibe mediante transporte simulado los candidatos de zona, horizonte, compradores, ingresos netos de 3.800 EUR/mes, ahorros y cuota de 250 EUR/mes con tratamiento desconocido; no recibe candidato de interés. D produce, entre otras, estas incidencias:

```json
[
  {"id":"issue-1","category":"missing","field":"interest","description":"Falta información sobre interest.","review":"clarification"},
  {"id":"issue-2","category":"ambiguous","field":"debts","messageId":"c","quote":"datos","description":"No se conoce si la cuota está descontada de los ingresos.","review":"clarification"}
]
```

E devuelve:

```json
{"kind":"question","question":"¿La cuota que habéis indicado ya está descontada de vuestros ingresos?","reason":"No se conoce si la cuota está descontada de los ingresos.","field":"debts","issueId":"issue-2"}
```

Al simular que la cuota ya está descontada, D deja de señalar esa duda y E pregunta por el interés en SmartHousing. En Alcalá se prioriza neto/bruto sobre la cuota. Las alertas sensibles de Rosa y Javier se introducen explícitamente en las pruebas como respuestas simuladas de D; no se afirma que sus mensajes originales las produzcan.

## Validación y límites

Pruebas deterministas: Laura y su aclaración, Alcalá, alertas sensibles simuladas, extracción parcial y fallida, ficha sin incidencias y orden de faltantes. La suite completa ha pasado con 140 pruebas y una omitida; `pnpm typecheck` y `pnpm lint` también han terminado correctamente. No se ha llamado a OpenAI.

E depende de las incidencias disponibles y de dos descripciones concretas de D para distinguir la base de ingresos y el tratamiento de cuotas; otras ambigüedades reciben una pregunta genérica del campo. No verifica el significado de los candidatos ni completa lo descartado por B. Los avisos de contenido inaccesible por sí solos no generan pregunta ni revisión automática en E; permanecen en D para el consumidor. Las limitaciones semánticas de P1 y de detección de P2 siguen vigentes, incluidas las formulaciones reales de Javier y Rosa.

**Recomendación: GO para preparar P4**, sujeto a autorización independiente y manteniendo visibles las limitaciones anteriores; este resultado acredita la selección con datos simulados, no la calidad de extracción o detección en conversaciones reales.
