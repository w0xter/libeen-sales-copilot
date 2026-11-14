# Matriz de aceptación V0 (AC-01 a AC-15)

Los criterios proceden de la especificación funcional y se implementarán como pruebas reproducibles, no se consideran ejecutados hasta evidenciarlo. **Los nombres de casos son ficticios.** Los tests de textos LLM se basan en propiedades, no igualdad palabra por palabra.

| Criterio | Comportamiento esperado | Dueño principal | Dependencias |
| --- | --- | --- | --- |
| AC-01 | Abrir Laura muestra historia/facts/M3 y evidencia, sin datos inventados | LIB-011 | LIB-003/005/008/010 |
| AC-02 | Ingreso conjunto ~3.800, ahorro ~18.000, cuota 250, descuento desconocido | LIB-011 | LIB-005/007 |
| AC-03 | Propuesta focalizada y editable de aclaración de cuota | LIB-011 | LIB-006/007/008 |
| AC-04 | Borrador aprobado no equivale a envío ni a M5 | LIB-011 | LIB-004/009/010 |
| AC-05 | Respuesta included/excluded actualiza conocimiento/M3 sin doble descuento | LIB-011 | LIB-005/006/009 |
| AC-06 | Llamada/revisión según política demo, nunca aprobación financiera | LIB-011 | LIB-006/009 |
| AC-07 | M5 exige aceptación/derivación/cierre confirmado, no propuesta | LIB-011 | LIB-004/006/009 |
| AC-08 | Javier rango variable, base bruta/neta desconocida y TRUST prioritario | LIB-012 | LIB-005/006/007 |
| AC-09 | Sin contenido inventado del audio; confianza con fuente o derivación | LIB-012 | LIB-007/006 |
| AC-10 | Rosa ahorro cero, urgencia, pregunta alquiler condicional y solicitud escrita | LIB-012 | LIB-005/007 |
| AC-11 | Escalado humano sin garantía/edad/ahorro como rechazo | LIB-012 | LIB-006/009 |
| AC-12 | R10 true/false cambia ruta a llamada, no reabre M3 | LIB-011 | LIB-003/006 |
| AC-13 | Unknown/ambiguo/conflicting no generan progreso sin evidencia | LIB-012 | LIB-002/005/006 |
| AC-14 | Sin credencial/error LLM preserva estado y distingue replay/manual | LIB-012 | LIB-004/007/009 |
| AC-15 | DecisionRecord conserva fuentes, rule IDs, versiones/config | LIB-012 | LIB-002/009 |

## Invariantes adicionales de regresión

- Idempotencia `eventId`, `REVISION_CONFLICT`, `STALE_PROPOSAL` y consistencia de commits.
- Corrección material neto→bruto reabre dependencias con historia conservada.
- Un `DO_NOT_CONTACT_REQUESTED` domina cualquier objetivo comercial.
- Texto de cliente que intenta modificar reglas es dato no confiable, no instrucción.
- Sin fuente autorizada para una afirmación comercial, abstenerse o derivar.
- Replay y OpenAI real no se mezclan ni se presentan de forma engañosa.

## Pruebas de frontera antes de integración

| Contrato compartido | Producto de test |
| --- | --- |
| AI → Facts | EvidenceRef existente, `unknown` semántico, sin audio inventado |
| Facts → Workflow | Valores y sujeto correctos, contradicciones y correcciones |
| Config → Policy | Referencias válidas y R10 independiente de M3 |
| Policy → Action | Solo acciones permitidas y razones/ruleIds |
| Action → Draft | Ninguna redacción cambia la autorización comercial |
| Application → UI | CaseView coherente, borrador vs enviado vs acordado |
| Event → Repo | CAS/idempotencia, no pérdida ante fallo IA |

**Gates:** G0 interfaces y fixtures; G1 tests aislados; G2 Laura integrado; G3 suites completas; G4 README y arranque reproducible. Un fallo se corrige en el módulo propietario, no alterando arbitrariamente el expected del caso.
