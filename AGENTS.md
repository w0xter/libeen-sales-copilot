<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Libeen AI Lead Intake V0

## Estado y alcance

El producto activo es Libeen AI Lead Intake V0. La fase actual es bootstrap documental; P0 todavía no se ha iniciado. Los módulos prioritarios son B (Extraction), D (Issues) y E (Next Question). No implementar P0 ni B/D/E hasta recibir las nuevas especificaciones y una tarea autorizada. El código existente pertenece al Sales Copilot anterior: es evidencia de comportamiento y material potencialmente reutilizable, no una arquitectura obligatoria.

## Jerarquía documental

1. Instrucciones explícitas de la tarea actual.
2. Documentación activa incorporada a `docs/current/`, cuando exista.
3. Código existente, como evidencia del comportamiento implementado y fuente de piezas reutilizables.
4. Documentación histórica en `docs/legacy/`, únicamente si se solicita consultarla.

La documentación histórica no establece requisitos vigentes para la nueva V0. La ausencia de documentación nueva no autoriza recuperar reglas anteriores. El punto de entrada documental es `docs/README.md`.

## Principios de desarrollo

- Preferir la solución funcional más pequeña y evitar abstracciones especulativas.
- No introducir multipass, workflows ni motores de políticas sin necesidad y autorización explícitas.
- Permitir resultados parciales y fallos semánticos identificables; conservar referencias a mensajes y expresar incertidumbres.
- No inventar hechos ni contenido inaccesible, ni confundir datos autodeclarados con datos verificados.
- Trabajar exclusivamente con datos ficticios. No realizar aprobaciones financieras ni envíos automáticos.
- Limitar cada tarea a su objetivo autorizado; no ampliar el trabajo para satisfacer documentos o pruebas del enfoque anterior.
