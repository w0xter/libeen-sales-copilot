# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

El usuario principal es un asesor comercial interno que revisa conversaciones ficticias sobre una posible compra y prepara una ficha para cargarla manualmente en un CRM.

## Product Purpose

Libeen AI Lead Intake V0 convierte conversaciones ficticias en información comercial revisable. Ayuda al asesor a encontrar datos y sus fuentes, identificar incertidumbres y decidir qué aclarar, conservando la autoridad de revisión humana.

## Operating Context

El asesor pega una conversación o utiliza un ejemplo ficticio, inicia el análisis de forma explícita, revisa candidatos e incidencias y prepara el resultado para su carga manual en un CRM. Puede añadir una intervención ficticia y solicitar un reanálisis. La aplicación es una demostración local y el estado vive en la sesión del navegador.

## Capabilities and Constraints

- Extrae candidatos para siete campos comerciales, con referencias a los mensajes y expresión de incertidumbre; ofrece una pregunta sugerida o indica que corresponde revisión humana.
- Permite revisar y corregir datos y preparar una ficha para copiarla manualmente. Los resultados parciales son útiles y los fallos deben ser visibles.
- Solo se utilizan datos ficticios. No hay envío automático de mensajes, integración o sincronización con CRM, aprobación financiera ni verificación documental.
- Los datos declarados por el cliente y revisados por el asesor no son datos verificados documentalmente. La cualificación comercial no equivale a aprobación financiera.
- No se inventan hechos ni contenido inaccesible; se distingue un dato desconocido de un cero explícito.
- La especificación activa y las limitaciones vigentes se encuentran en `docs/current/`; el código y la documentación del Sales Copilot anterior no establecen requisitos para la nueva V0.

## Brand Commitments

El nombre del producto es Libeen AI Lead Intake V0.

## Evidence on Hand

La especificación funcional está en `docs/current/01_FUNCTIONAL_SPEC_V0.md`; `docs/current/README.md` enlaza los resultados y limitaciones. El prototipo aprobado en `docs/current/ux-reference/libeen-ux2-prototipo-v0.3.html` es una referencia de diseño, no un motor funcional. Los ejemplos Laura, Javier y Rosa son ficticios.

## Product Principles

- Mantener al asesor como responsable de revisar y decidir.
- Mostrar el origen, los límites y las incertidumbres de cada interpretación.
- Conservar el valor de resultados parciales sin ocultar errores.
- Facilitar la preparación manual de información comercial sin simular integraciones ni decisiones financieras.
