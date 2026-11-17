# Fiabilidad ante errores y limitaciones conocidas

> Documentación de Libeen AI Lead Intake V0. [Volver al README principal](../../README.md). La aceptación vigente es de una **PoC supervisada con limitaciones**; las observaciones históricas siguen disponibles en los informes.

## 5. Fiabilidad: cómo responde el sistema ante errores de la IA

La fiabilidad no depende exclusivamente de obtener mejores respuestas del modelo. También depende de cómo responde la aplicación cuando el modelo se equivoca, omite información o deja de estar disponible.

### 5.1. Errores de entrada

El parser exige turnos con autores reconocibles.

Si una conversación está vacía, contiene mensajes sin emisor identificable o mezcla marcadores de audio con contenido incompatible, devuelve un error explícito.

No intenta adivinar arbitrariamente quién dijo una afirmación.

### 5.2. Errores del proveedor o de estructura

La ruta de análisis valida la entrada, requiere una clave configurada en el servidor y utiliza una salida estructurada.

Ante errores de proveedor, formato o análisis:

- Se informa del fallo.
- No se crea una ficha nueva con información inventada.
- No se sustituye la llamada fallida por un replay oculto.
- Se conserva la entrada de trabajo para poder corregirla o reintentarla.
- Los resultados anteriores no deben presentarse como un análisis actualizado.

### 5.3. Candidatos inválidos o sin evidencia

Si la respuesta del proveedor contiene un candidato inválido, el sistema puede descartarlo sin perder necesariamente el resto de candidatos útiles.

Entre los motivos de descarte están:

- Estructura inválida.
- Referencia a un mensaje inexistente.
- Fuente atribuida al asesor en lugar del cliente.
- Contenido inaccesible.
- Fragmento que no aparece en el mensaje original.
- Expresión de interés no suficientemente explícita.

Cuando se producen descartes, el análisis puede marcarse como incompleto.

**Limitación:** verificar la existencia literal de un fragmento no demuestra que su interpretación sea semánticamente correcta.

### 5.4. Ambigüedad y ausencia de información

Se distingue entre:

- Dato desconocido.
- Valor cero explícito.
- Cantidad aproximada.
- Rango.
- Conflicto entre declaraciones.

Por ejemplo, «no tenemos ahorros» permite conservar un cero conocido, mientras que no mencionar ahorros no permite asumir que son cero.

Una cuota de inclusión desconocida puede generar una incidencia específica aunque el modelo no haya emitido una señal semántica adecuada.

No se aplican cálculos financieros ni deducciones automáticas sobre la renta declarada.

### 5.5. Correcciones y reanálisis

Las revisiones humanas se mantienen como parte de la ficha efectiva.

Si un reanálisis devuelve información diferente:

- Se conservan las evidencias.
- Se muestran conflictos cuando no existe una resolución inequívoca.
- El asesor puede mantener o adoptar declaraciones.
- No se consolidan automáticamente contradicciones abiertas.

Para el caso particular de una cuota que sigue sin aclararse, la PoC incorpora una revisión manual conservadora.

La revisión puede mantenerse visible tras el reanálisis sin transformar un valor `unknown` en `included` o `excluded` si no existe evidencia suficiente.

### 5.6. Resultados desactualizados y exportación

Modificar una conversación requiere volver a analizarla.

La aplicación trata los resultados anteriores como desactualizados y puede bloquear la copia cuando hay conflictos o una etapa incompatible.

La ficha CRM distingue los datos disponibles, los ausentes, los conflictos y las intervenciones humanas.

No equivale a una sincronización ni a una validación documental.

### 5.7. Solicitudes sensibles

Las solicitudes de aprobación, garantía, no contacto y otras situaciones delicadas pueden activar revisión humana.

El sistema no promete financiación, no toma decisiones de elegibilidad ni envía mensajes.

La detección sensible no se considera exhaustiva: existen antecedentes de falsos negativos en las evaluaciones y una detección positiva aislada no garantiza cobertura general.

---

---

## 7. Known Issues y limitaciones

Esta sección describe el estado de entrega de la PoC, no únicamente los bugs de una versión histórica.

| Limitación | Estado actual | Consecuencia |
|---|---|---|
| Resolución automática de aclaraciones | No demostrada de forma estable | Algunas continuaciones requieren revisión manual |
| Clasificación semántica de interés | Conservadora e imperfecta | Puede omitir interés válido o necesitar revisión |
| Formulación de preguntas | Dependiente de señales del modelo | Puede generar una aclaración genérica o no priorizar correctamente |
| Detección de solicitudes sensibles | Cobertura no garantizada | Requiere supervisión del asesor |
| Reconciliación entre declaraciones | Conservadora | Puede mantener conflictos o valores desconocidos |
| Configuración de reglas | Requiere editar TypeScript | No existe editor externo o visual de reglas |
| Persistencia | Solo sesión del navegador | No hay recuperación de expedientes entre sesiones |
| CRM | Exportación manual | No hay sincronización ni actualización automática |
| Evaluación de inferencia real | Muestra limitada | No existen métricas representativas de precisión o estabilidad |
| Accesibilidad | Validación parcial | No hay certificación WCAG ni auditoría integral |

### Casos que motivaron el hardening

**F001 — Pregunta demasiado genérica**

En una evaluación real, el sistema detectó una ambigüedad sobre una cuota, pero formuló una pregunta que no aclaraba específicamente su inclusión en los ingresos.

Se mejoró el tratamiento de motivos de incidencia y se añadieron regresiones. No se garantiza que todas las formulaciones del modelo produzcan preguntas específicas.

**F002 — Interpretación incorrecta del interés**

En las conversaciones de Laura y Rosa se observaron menciones genéricas a anuncios o alquiler clasificadas como interés en SmartHousing.

Se introdujo una admisión más conservadora de candidatos de interés, con pruebas sobre positivos, negativos y consultas condicionales.

El enfoque reduce ciertas inferencias no justificadas, pero puede dejar expresiones válidas sin clasificar.

**F003 — Pregunta repetida tras una aclaración**

En varias evaluaciones reales, Laura volvía a recibir preguntas sobre cuestiones que parecían aclaradas.

La solución final no afirma haber resuelto automáticamente todas estas situaciones. Incorpora tratamiento conservador de cuotas inciertas y revisión manual persistente dentro de la sesión.

**F004 — Aviso fuera de landmarks**

Se corrigió el aviso situado fuera de regiones semánticas accesibles y se verificó mediante Axe en los estados evaluados.

La descripción detallada, las evidencias y los resultados anteriores se conservan en [FINDINGS.md](evaluation/FINDINGS.md).

### Qué no incluye esta versión

Deliberadamente no implementa:

- Autenticación y gestión multiusuario.
- Persistencia o base de datos de expedientes.
- Integración con WhatsApp.
- Sincronización CRM.
- Envío automático de mensajes.
- Transcripción de audios.
- Agenda, recordatorios o seguimiento programado.
- Verificación documental.
- Scoring, underwriting o aprobación financiera.
- Orquestación completa del Sales Copilot original.

Son exclusiones de alcance, no funcionalidades que deban suponerse implementadas.

---
