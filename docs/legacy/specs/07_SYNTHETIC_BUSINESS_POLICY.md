# Política comercial sintética — `libeen-demo-routing / demo-v1`

**ADVERTENCIA:** todas las reglas que siguen son inventadas **para demostrar el diseño**. No son criterios oficiales de Libeen, no constituyen consejo financiero y no permiten aprobar o rechazar operaciones de compra.

## Por qué se decidió no simular solvencia

El enunciado permite crear reglas de ingresos/ahorro, pero no proporciona las políticas internas de Libeen. Nuestra V0 debe demostrar la separación IA/reglas y ahorro de tiempo, no presentar supuestos umbrales financieros como si fueran reales. Por eso las reglas se limitan a decidir **qué información comercial está suficientemente clara** para sugerir una llamada con un humano o una revisión adicional.

Los resultados autorizados de orientación son:

- `NEED_CLARIFICATION`: falta una aclaración importante.
- `READY_FOR_ADVISORY_CALL`: contexto suficiente para **proponer** llamada, nunca «aprobado».
- `HUMAN_REVIEW_REQUIRED`: derivación ante riesgo, petición vinculante o información insuficiente para decidir una ruta.
- `WAIT`: aún no corresponde nueva acción.
- `STOP_CONTACT`: no continuar actividad comercial.

Evitar resultados de negocio llamados `APPROVED`, `REJECTED`, `PREAPPROVED`, «hipoteca aprobada» o scoring de riesgo crediticio.

## Reglas R01–R10

| ID | Condición | Efecto propuesto | Naturaleza |
| --- | --- | --- | --- |
| **R01** | El cliente exige no más contactos | `STOP_CONTACT`; no generar nuevas preguntas comerciales | Protección irrenunciable |
| **R02** | Pide aprobación/garantía por escrito, vivienda asegurada o compromiso vinculante | Bloquear la afirmación y `HUMAN_REVIEW_REQUIRED` | Protección irrenunciable |
| **R03** | Dato necesario `unknown`, `ambiguous` o `conflicting` | Pregunta de aclaración o revisión humana | Calidad de información |
| **R04** | Interés en producto, ubicación, compradores, horizonte, ingresos autodeclarados y ahorros suficientemente conocidos | Contexto comercial mínimo disponible | Requisito de proceso editable |
| **R05** | Cuota de deuda conocida pero se ignora si ya se descontó del ingreso declarado | **M3 bloqueado**, pedir una aclaración antes de valorar contexto económico | Dependencia clave para Laura |
| **R06** | R04 satisfecho, semántica de deudas resuelta, sin bloqueo prioritario ni objeción crítica, ruta pertinente | `READY_FOR_ADVISORY_CALL`; propuesta sujeta a humano | Orientación editable |
| **R07** | Objeción explícita que condiciona avanzar (p. ej., fiabilidad) | `ANSWER_QUESTION` con fuente o derivar, antes de preguntas no urgentes | Estrategia conversacional |
| **R08** | Cliente confirma el siguiente paso o asesor confirma derivación/cierre | Registrar resultado y evaluar M5 según ruta | Evidencia de acuerdo |
| **R09** | Existe borrador aprobado pero no constan entrega ni respuesta | Mantener pendiente; no fingir envío, cita ni acuerdo | Control de efectos |
| **R10** | Se exige mes exacto de mudanza y solo hay horizonte aproximado | Pedir el mes antes de recomendar llamada | **Interruptor editable de la demo** |

**Precedencia:** R01/R02 y riesgos superiores → petición expresa/objeción → aclaración de dato crítico → paso comercial → espera. En una evaluación, varias reglas pueden aplicarse; se selecciona la acción más prioritaria y se conservan las demás como pendientes.

## Configuración ilustrativa

Este YAML es una **representación de diseño**, no un fichero ya integrado ni garantizado como sintaxis de un motor implementado:

```yaml
policy:
  id: libeen-demo-routing
  version: demo-v1
  synthetic: true

  advisory_call:
    require_product_interest: true
    require_location: true
    require_buyer_count: true
    require_moving_horizon: true
    require_specific_move_month_before_call: false
    require_declared_income_context: true
    require_declared_savings: true
    require_disclosed_debt_semantics_resolved: true
    prevent_when_critical_blocker_open: true

  financial_approval:
    enabled: false
```

Una implementación deberá **validar** que los nombres de campos/operadores existen en FactSchema y catálogo de predicados. La seguridad no debe relajarse con un booleano editable en AgentProfile. El ejemplo no tiene umbrales de ingresos, ahorro, edad o ratio de deudas.

## Regla de demo para demostrar configurabilidad

R10 empieza en `false`: «antes del verano» basta como horizonte comercial para **proponer** llamada si M3 está claro y se satisfacen las otras condiciones. Cambiarlo a `true` hace que la próxima acción sea **preguntar en qué mes quiere mudarse**. Esto **NO reabre M3**, porque el dato pendiente es del plazo de mudanza / ruta de llamada, no de finanzas.

Se espera que el cambio requiera como mucho recargar configuración y reevaluar, **sin modificar el motor**. Registrar versión antes y después. No afirmar que se ha verificado hasta probarlo en el repositorio real.

## Matriz de variaciones de Laura

| Aporte del cliente (sintético) | Interpretación segura | Hito / acción |
| --- | --- | --- |
| Caso inicial: 3.800 € netos conjuntos, 18.000 € ahorro, 250 € cuota; pregunta previa «después de deudas» | `debt_deduction_semantics=unknown` | M3 blocked; preguntar si los 250 € ya se descontaron. |
| «Sí, los 3.800 € ya son después del coche» | `included`: no volver a restar cuota | M3 puede completarse para orientación; llamada si R06. |
| «No, los 3.800 € son antes de pagar el coche» | `excluded`: guardar ingreso y cuota por separado, no elaborar solvencia total | M3 puede completarse para orientación; llamada si R06. |
| «No sé si lo conté antes» | Ambigüedad abierta | Reformular o derivar, no entrar en repetición mecánica. |
| «Me equivoqué, eran 3.800 € brutos» | Cambio semántico material neto/bruto | Reabrir dependencia, aclarar el ingreso neto si necesario. |
| Activar R10, plazo «antes del verano» | M3 financiero continúa completado | Pedir mes concreto antes de llamada. |
| Borrador de llamada aprobado, sin respuesta cliente | Propuesta aún pendiente | M5 pendiente, no marcar cita reservada. |
| Cliente acepta llamada en mensaje ficticio | Acuerdo registrado de forma simulada | M5 puede completarse según ruta, sin calendario real. |

## Restricciones de seguridad y de interpretación

- «Ahorro = 0» es valor explícito, no unknown ni causa automática de rechazo.
- El cliente puede omitir otras deudas; una sola cuota no certifica deuda total.
- Los importes de una pareja no se dividen automáticamente ni se agregan dos veces.
- Los ingresos de autónomos variables no se transforman en promedio fijo sin definición y autorización.
- Un rango o cantidad estimada conserva su incertidumbre.
- No usar edad, condición laboral o nacionalidad como exclusión automática.
- No producir documento de aprobación, cálculo de preconcesión ni promesa de vivienda.
- Una llamada puede **proponerse** sin un cálculo de elegibilidad; el asesor realizará cualquier revisión comercial/financiera posterior.

## Pertenencia de reglas a módulos

- R01/R02/R09 y prohibición de aprobación financiera: ReviewPolicy / invariantes del sistema.
- R03/R05: FactSchema + CaseKnowledge + guardas de WorkflowDefinition.
- R04/R06/R10: BusinessPolicy y rutas del workflow, con configuración versionada.
- R07: AgentProfile subordinado a restricciones.
- R08: evento de confirmación y guarda de M5.

Separar estas fronteras evita duplicar prioridades en prompts y código.
