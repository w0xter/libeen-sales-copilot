# F-02 MP-G6: preflight sin red — parcial

`pnpm eval:multipass --dry-run --case B01 --strategy both --model gpt-4.1-mini`

Opciones: `--case B01,B05,B06,B08,B10,C01`, `--strategy single|multipass|both`, `--model ID`, `--repeat 1..10`, `--mode interpreter|end-to-end`, `--max-requests 1..20`, `--max-cost N`, `--max-seconds N`, `--output PATH`. Salida JSON en stdout; `--output` crea un archivo nuevo sin sobrescribir. El orden de IDs se normaliza. No carga `.env`, credenciales ni módulos de proveedor; sin `--dry-run` termina con error. `planHash` identifica el plan, no una ejecución ni sus entradas. El modelo por defecto es una opción de planificación, no una verificación de disponibilidad o precio.

La herramienta **solo calcula un plan**. No ejecuta intérpretes, no empareja resultados ni calcula métricas; no está lista para ejecutar una comparación real. Los límites de coste y tiempo se registran pero **no se aplican en tiempo de ejecución**, y no se calculan estimaciones sin límites de tokens y tarifas verificables. No usar este preflight como autorización de llamadas. Para una implementación futura deben existir un contador compartido que reserve cada intento antes del transporte (incluidos errores y cancelaciones), corte de coste conservador antes de cada solicitud, deadline y cancelación globales; costes y tokens reales deben obtenerse de la respuesta del proveedor. Los dos transportes actuales no exponen tokens. SDK retries están desactivados. La concurrencia requiere reserva atómica. El límite de 20 no se aumenta.

## Matriz seleccionable

Estos seis IDs corresponden al CLI congelado de F-01, no al dataset de 352 registros. Sus expectativas en `F01_SEMANTIC_EVALUATION_PLAN.md` fueron preinscritas; no hay evidencia aquí de aprobación humana independiente. Son provisionales para este propósito. No se modificó el oráculo.

| ID | Fuente | Análisis | Single típico/máximo | Multipass típico/máximo |
|---|---|---:|---:|---:|
| B01 | Laura original | 1 | 2/2 | 5/7 |
| B05 | Javier original | 1 | 2/2 | 5/7 |
| B06 | Javier confianza parafraseada | 1 | 2/2 | 5/7 |
| B08 | Rosa original | 1 | 2/2 | 5/7 |
| B10 | Javier opt-out | 1 | 2/2 | 5/7 |
| C01 | Laura corrección bruto/neto | 2 | 4/4 | 10/14 |

C01 exige end-to-end. En ese modo se añade al máximo una generación por análisis y estrategia, aunque pueda no ser necesaria; el típico de la tabla solo cuenta interpretación. Se multiplican ambos techos por repeticiones. Una pareja B01 tiene 7 habituales y 9 máximas en modo interpreter; C01 tiene 14 habituales y 22 máximas end-to-end, por lo que no cabe una pareja bajo 20. Los fallos tempranos pueden reducir solicitudes, pero no el preflight. El máximo por multipass incluye adjudicación, reparación y cualquier intento adicional dentro del límite de siete.

La matriz semántica de 24 filas B01–B10, C01–C06, E01–E04, D01–D02 y R01 es un plan de regresión más amplio; algunas filas agrupan variantes o precisan inyección, borradores o replay y no están implementadas como entradas seleccionables aquí. El dataset F-01 v1.0.1 es otro corpus: 176 desarrollo, 88 validación, 88 holdout; anotaciones internamente auditadas, sin sign-off independiente. Este comando no accede a él ni desbloquea holdout.

## Pendiente antes de una evaluación real

Construir un ejecutor que congele instantáneas, configuración, versión de prompts, modelo y expectativas revisadas de forma independiente; inyectar entradas idénticas a ambos intérpretes. Emparejar mediante ID de ejecución + escenario + repetición y rechazar duplicados o mezcla de ejecuciones. Registrar solo metadatos sanitizados y resultados evaluados, sin transcripciones ni secretos. El informe debe distinguir precisión (valor, ámbito, unidad, periodo, base, sujeto/S2, evidencia e invenciones), recall protegido y falsos OPT_OUT/TRUST/HANDOFF/STOP_CONTACT, cobertura (abstención no es extracción correcta) y disponibilidad (completo/fallido/revisión). Una abstención segura no es automáticamente fallo de seguridad. Registrar llamadas intentadas, latencia, tokens, coste y regresiones emparejadas, incluyendo denominadores y valores no disponibles; mantener estados de revisión y procedencia del oráculo.

Propuesta piloto tras revisión independiente y autorización separada: una pareja B01 en modo interpreter, una repetición, máximo 9 intentos, seguida de una pareja B05 si el presupuesto restante y los límites de coste/tiempo lo permiten. Es exploratoria, no acredita precisión general. No se estima coste hasta disponer de modelo exacto, precios vigentes verificables y límites de consumo de entrada/salida; los tokens de razonamiento y tarifas aplicables también deben considerarse.
