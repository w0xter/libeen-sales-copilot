# Arquitectura técnica y decisiones

> Documentación de Libeen AI Lead Intake V0. [Volver al README principal](../../README.md). La aceptación vigente es de una **PoC supervisada con limitaciones**; las observaciones históricas siguen disponibles en los informes.

## 3. Arquitectura y decisiones técnicas

### 3.1. Stack

| Capa | Tecnología |
|---|---|
| Aplicación web | Next.js 16, React 19, TypeScript |
| API | Next.js Route Handlers |
| Inferencia | OpenAI Responses API |
| Validación estructurada | Zod |
| Tests unitarios e integración | Vitest |
| Tests de navegador | Playwright |
| Accesibilidad automatizada | Axe |
| Persistencia | En memoria |


El objetivo fue mantener una arquitectura pequeña, fácil de inspeccionar y suficiente para el recorrido principal de la prueba. He decidido no usar una base de datos en este PoC y manejar la persistencia con memoria temporal. Así reducimos dependencias innecesarias para esta fase y el Coding Agent puede centrar los esfuerzos en validar el objetivo principal. 

No hay microservicios, infraestructura distribuida ni un framework genérico de agentes.

### 3.2. Pipeline B → D → E

El núcleo se organiza en tres capacidades:

**B — Extraction**

Interpreta la conversación mediante el modelo y devuelve candidatos de información con fuentes y metadatos.

**D — Issues**

Analiza los candidatos y las señales disponibles para identificar información ausente, ambigüedades, contenido inaccesible y solicitudes que requieren revisión.

**E — Next Question**

Prioriza las incidencias y propone una única intervención para el asesor.

El flujo conceptual es:

`Conversación → B: candidatos y fuentes → D: incidencias → E: siguiente intervención → Workspace del asesor → revisión humana → ficha CRM manual`


### 3.3. Ejemplo de extremo a extremo

**Entrada ficticia:**

> Gano unos 2.750 euros netos al mes y pago una cuota de 145 euros mensuales. No sé si esa cuota ya está descontada de mis ingresos.

**B — Extraction**

- Ingresos: aproximadamente 2.750 €/mes.
- Base: neta.
- Cuota: 145 €/mes.
- Inclusión de cuota: desconocida.
- Fuentes: fragmentos de la conversación.

**D — Issues**

Detecta que existe una cuota y no sabemos si está incluida en los ingresos declarados.

**E — Next Question**

Puede proponer:

> ¿La cuota que habéis indicado ya está descontada de vuestros ingresos?

El asesor revisa la interpretación y decide si utilizar o modificar esa pregunta.

Esta separación facilita comprobar individualmente la extracción, el tratamiento de incidencias y la elección de la siguiente acción.

### 3.4. Qué dejamos en manos del LLM y qué no

**El LLM se utiliza para:**

- Interpretar lenguaje natural.
- Proponer valores candidatos.
- Asociar fragmentos de evidencia.
- Identificar posibles ambigüedades y señales semánticas.

**La aplicación se responsabiliza de:**

- Validar estructura y referencias.
- Rechazar candidatos sin procedencia válida.
- Calcular campos ausentes.
- Aplicar prioridades de incidencias.
- Mantener revisiones y conflictos.
- Derivar la ficha efectiva.
- Gestionar estados, errores y bloqueos.
- Preparar la exportación manual.

Las señales semánticas del modelo no se consideran verdad absoluta. Algunas comprobaciones posteriores son deliberadamente conservadoras.

La frontera entre interpretación probabilística y comportamiento determinista fue una de las decisiones arquitectónicas principales.

### 3.5. Configuración

Las reglas comerciales mínimas se encuentran en `src/intake/rules.ts`.

Permiten modificar:

- Los seis campos esenciales de completitud; las cuotas constituyen el séptimo campo comercial, pero no son obligatorias en todos los casos.
- El orden de prioridad de ambigüedades.
- La prioridad de aclarar la base neta o bruta de los ingresos.

Actualmente la configuración requiere editar TypeScript y reiniciar o reconstruir la aplicación.

**No existe un editor de reglas en la interfaz ni una configuración externa administrable sin modificar código.** Es una limitación conocida respecto al objetivo más amplio de configurabilidad.

---
