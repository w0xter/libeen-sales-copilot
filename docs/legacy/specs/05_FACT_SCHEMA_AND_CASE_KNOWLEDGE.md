# FactSchema, FactAssertions y CaseKnowledge

**Estado:** modelo conceptual para capturar información extensible sin crear un formulario rígido ni mezclar interpretación IA con verificación comercial.

## Tres conceptos diferentes

1. **`FactSchema`** (configuración versionada): qué campos existen, tipos, unidades, sujetos y validaciones estructurales.
2. **`FactAssertion` / `Fact`** (afirmación): una declaración o interpretación concreta sobre un campo, con su **fuente, sujeto, período y precisión**. Varias afirmaciones pueden referirse al mismo campo.
3. **`CaseKnowledge`** (vista consolidada): interpretación operativa actual del expediente. Puede tener un valor utilizable o indicar `unknown`, `ambiguous` y `conflicting`; siempre debe preservar el origen.

**La IA produce candidatos con evidencia**, no hechos certificados. La conciliación y el motor aplican condiciones. Un campo puede ser conocido, aproximado y autodeclarado sin haberse verificado documentalmente.

## Contrato de FieldDefinition

| Propiedad | Significado |
| --- | --- |
| `id`, `label`, `description` | Identidad estable y semántica explícita. |
| `type` | Texto, enum, booleano, número, dinero, rango, fecha/período, colección. |
| `scope` | A quién corresponde el campo. |
| `cardinality` | Único o varios valores con sujeto/período. |
| `unit`, `granularity` | EUR, mes, anual, neto/bruto/indeterminado, precisión. |
| `enumOptions` | Valores permitidos, cuando aplica. |
| `structuralValidation` | Número válido, rango coherente, unidad permitida, etc. |
| `sensitivity`, `visibility` | Tratamiento y mínimo acceso al dato. |
| `schemaVersion` | Versión del significado del campo. |

**No incluir obligatoriedad universal** en FieldDefinition. El requisito de completar un hito depende del WorkflowDefinition y de la ruta. Los límites comerciales pertenecen a BusinessPolicy. El estilo de la pregunta pertenece a AgentProfile.

## Scopes / sujetos

| Scope | Ejemplo |
| --- | --- |
| `case` | Ubicación, plazo de mudanza e intención de producto. |
| `participant` | Ingresos, empleo, compromisos de una persona concreta. |
| `buying_unit` | Dos compradores, ingresos y ahorros conjuntos declarados. |

Si Laura dice «ganamos unos 3.800 € entre los dos», se guarda en `buying_unit`, **no** como 1.900 € para cada persona. No sumar ingresos/ahorros sin comprobar si ya están incluidos y a quién pertenecen. En V0 se pueden representar participantes simbólicos, sin nombres ni información personal real.

## Contrato mínimo de FactAssertion

`fieldId`, `subjectRef`, `value` normalizado opcional, `rawValue` / fragmento textual, `unit`, `period`, `source` (messageId/formulario/corrección), `observedAt`, interpretación (`explicit`, `approximate`, `ambiguous`, `inferred` cuando se permita), `reviewStatus`, versión del esquema y tipo de origen.

Un `FactAssertion` no equivale a verificación documental; el estado `confirmed_by_advisor` solo significa confirmación operativa, no prueba de solvencia.

## Estados de la visión consolidada

| Estado | Interpretación |
| --- | --- |
| `known` | Dato con interpretación utilizable y fuente. |
| `approximate` | Dato conocido pero aproximado. |
| `unknown` | No tenemos información. |
| `ambiguous` | La cifra existe, pero la semántica no está aclarada. |
| `conflicting` | Dos afirmaciones incompatibles sin resolución válida. |
| `not_applicable` | Campo no pertinente para ruta/sujeto, justificado. |

**Invariante:** el valor explícito `0` no significa `unknown`. Una deuda desconocida no es deuda cero. `false` tampoco equivale a ausencia. El período importa: ingresos de enero y febrero diferentes pueden ser válidos sin contradicción.

## Campos candidatos del esquema inicial SmartHousing

| Campo lógico | Scope | Tipo / observaciones |
| --- | --- | --- |
| `product_intent` | case | Enum: explorar SmartHousing, consulta, alquiler clásico, indeterminado. |
| `desired_locations` | case | Colección de ubicaciones; admite «Madrid o alrededores». |
| `moving_horizon` | case | Fecha/período/texto original; relativo a la fecha del mensaje. |
| `buyer_count` | buying_unit | Entero. |
| `declared_monthly_income` | participant / buying_unit | Dinero o rango, neto/bruto/indeterminado y periodicidad. |
| `employment_context` | participant | Texto/enum, sin rechazo automático por tipo. |
| `available_savings` | participant / buying_unit | Dinero/rango; cero explícito permitido. |
| `monthly_debt` | participant / buying_unit | Uno o varios compromisos conocidos; no «deuda total verificada». |
| `debt_deduction_semantics` | buying_unit | Incluida / no incluida / desconocida. |
| `requested_next_step` | case | Llamada, información, seguimiento, no contacto, indeterminado. |

Las **preguntas, objeciones y alertas de urgencia** pueden vivir inicialmente como `Blocker/Issue/Event` vinculados a mensajes. No es obligatorio crear un campo permanente por cada inquietud.

## Conciliación y corrección

- Nueva afirmación compatible → enriquecer evidencia y precisión sin borrar lo previo.
- Nueva afirmación contradictoria → exponer `conflicting`; decidir si se trata de sujetos o períodos diferentes antes de preguntar.
- Corrección expresa del asesor → nueva revisión con actor y motivo; usarla operativamente sin eliminar la fuente anterior.
- Si un dato corregido invalida M3 o M4 → reevaluar hitos dependientes y conservar la traza de la decisión original.
- Si aparece un dato no definido → preservar evidencia/no estructurado o requerir revisión; **el LLM no modifica FactSchema autónomamente**.

## Casos concretos

**Laura:** `monthly_income≈3800 EUR/month`, ámbito `buying_unit`, autodeclarado; `savings≈18000 EUR`; préstamo coche `250 EUR/month`, ámbito exacto por aclarar; `debt_deduction_semantics=unknown` pese a conocerse las cifras. No calcular automáticamente «3550» ni concluir capacidad económica.

**Javier:** ingresos **rango 2.000–3.000 EUR/mes**, inestables por su condición de autónomo, **neto/bruto desconocido**. No convertir a 2.500 fijo ni inferir el audio sin transcripción. Zona «Madrid o alrededores» no debe normalizarse falsamente a municipio exacto.

**Rosa:** ahorro **0 explícito**, ingresos de pareja 1.400 € declarados, mudanza en dos semanas, pregunta *condicional* de alquiler clásico y aprobación escrita. No deducir automáticamente que solo quiere alquiler ni rechazarla por la edad de su marido.

## Privacidad / V0

Solo conversaciones ficticias, sin DNI/NIE, extractos, datos bancarios ni pruebas documentales. La definición permite metadatos de sensibilidad aunque no se construyan todavía permisos granulares. El esquema es ampliable, no un motor de ontologías ni un editor de formularios.
