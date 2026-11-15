# P2 — Resultado del módulo D

D implementado como función determinista `identifyIssues(extraction, messages)` en `src/intake/issues.ts`. Consume directamente la unión devuelta por `extract` y los mensajes originales. No modifica ni devuelve la ficha: quien llama conserva el resultado de B. Una extracción fallida devuelve `{ ok: false, error }`, sin incidencias comerciales. Una extracción válida devuelve `{ ok: true, issues, incomplete }`; `incomplete` indica descartes de B. Las incidencias son propuestas revisables con categoría, descripción, campo y fuente cuando existen, e indican aclaración o revisión humana.

Las pruebas con respuestas simuladas cubren Laura, Javier, Rosa, Alcalá, salida parcial, descartes, fallo de B, garantía negada o hipotética, oposición al contacto e incertidumbres. No se llamó al proveedor. El ahorro cero se conserva como informado y una aproximación, por sí sola, no genera incidencia.

Ejemplo observado para Laura simulada, con interés sin candidato e ingresos netos, ahorros y cuota presentes:

```json
{"ok":true,"issues":[{"id":"issue-1","category":"missing","field":"interest","description":"Falta información sobre interest.","review":"clarification"},{"id":"issue-2","category":"ambiguous","field":"debts","messageId":"c","quote":"datos","description":"No se conoce si la cuota está descontada de los ingresos.","review":"clarification"}],"incomplete":false}
```

Límites: las señales delicadas usan unas pocas formulaciones literales y pueden omitir solicitudes o generar avisos falsos; las negaciones e hipótesis no se interpretan de manera general. Las contradicciones numéricas son solo posibles incompatibilidades entre cantidades simples, sin normalización de unidades, equivalencias ni reconciliación de correcciones; pueden requerir revisión y no cubren todos los campos. La atribución se comprueba con el contrato de mensajes actual, que solo representa cliente o asesor y no un autor desconocido. Una candidatura aceptada por B puede seguir siendo semánticamente errónea; D no valida su significado ni recupera contenido inaccesible. P1 puede descartar datos o producir interpretaciones incorrectas, como recoge P1_RESULT; no se ha cambiado B ni verificado el modelo de nuevo.

**Recomendación: GO para P3**, sujeto a autorización independiente: el contrato funciona con resultados simulados, incluso parciales o fallidos. Esto no revierte la evidencia de P1 ni certifica la precisión de B o de las alertas de D. No se identifica un bloqueo técnico de P1 para esta integración.
