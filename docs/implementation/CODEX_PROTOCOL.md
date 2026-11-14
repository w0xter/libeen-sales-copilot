# Protocolo de ejecución con Codex + Superpowers

**Propósito:** aprovechar Superpowers como metodología individual sin construir un harness propio ni reabrir el diseño funcional. El [DAG](DAG.md) decide dependencias; cada [AI Task Brief](tasks/) decide scope; [AGENTS.md](../../AGENTS.md) determina invariantes globales.

## Autoridad por capas

| Fuente | Autoridad |
| --- | --- |
| Enunciado PDF | Reglas oficiales del ejercicio |
| AGENTS.md | Seguridad, límites del producto y colaboración |
| Contrato V0 | Significado de modelos/eventos/errores |
| DAG | Orden de ejecución y gates |
| Brief individual | Scope, rutas de escritura y criterios del trabajo |
| Superpowers | TDD, debugging, code review, worktree hygiene, verificación |

No invocar brainstorming global en tareas de implementación ya especificadas; sí plan técnico breve dentro del brief. No autorizar a una skill a cambiar políticas, clases de eventos o dependencias por su cuenta.

## Worktrees y ownership

- Una rama y worktree por agente, idealmente `codex/lib-00N`.
- Después de G0, workstreams: Facts `src/domain/facts/**`; Workflow `src/domain/{workflows,policies,actions}/**`; IA `src/adapters/ai/**`; UI `src/components/case-workspace/**` y, con exclusividad, `src/app/page.tsx`; integrador: `src/domain/cases/**`, persistencia y piezas compartidas.
- Los directorios `src/contracts/**`, `src/config/**`, `src/fixtures/**` y scripts/dependencias raíz solo los cambia el integrador salvo autorización expresa del brief.
- Cada agente puede leer las rutas comunes; no puede modificarlas unilateralmente para que su módulo compile.
- Los ejemplos y datos ficticios canónicos no se alteran para ocultar un fallo.

## Contract Change Request (CCR)

Cuando un agente necesita una interfaz nueva o diferente, debe informar: (a) campo/operación faltante y razón, (b) contrato actual y propuesta, (c) compatibilidad y consumidores afectados, (d) fixtures/tests nuevos, (e) trabajo bloqueado y trabajo independiente que puede continuar. El integrador cambia primero `src/contracts`, pasa tests de contrato y propaga el cambio a worktrees; **después** se reanuda la implementación dependiente.

## Gates y merge

1. G0 no se paraleliza: scripts, contratos y fixtures.
2. G1: revisión de diff, pruebas unitarias y contratos; no editar código de otro agente; entregar informe concreto.
3. Merge secuencial bajo integrador; resolver incompatibilidades sin degradar tests y sin invalidar reglas comerciales protegidas.
4. G2: validar Laura de extremo a extremo en replay con mensajes persistidos ante fallo de IA.
5. G3: Laura, R10, Javier, Rosa, opt-out, conflictos, eventos duplicados, salida LLM inválida y M5 pendiente.
6. G4: clean clone, instalación, ejecución, lectura de README, registro de agente y secretos. Solicitar permiso explícito para push/merge o cambiar permisos del repo.

Comandos actuales del scaffold: `pnpm dev`, `pnpm lint`, `pnpm build`. `pnpm test` / `pnpm typecheck` llegarán en LIB-001; comprobar scripts antes de citarlos. Un gate pasa por **resultados observados**, no porque un agente afirme haberlos ejecutado.

## Formato de handoff de cada tarea

```text
Task: LIB-XXX
Branch / worktree:
Files changed:
Contracts consumed / produced:
Behavior delivered:
Tests and commands actually run (with outcome):
Manual checks:
Known limitations and untested paths:
Contract change requests / blocked items:
Risks and follow-up:
```

## Stop conditions

Detener la parte afectada y escalar si faltan un contrato público, una fuente de negocio autorizada, un permiso de archivo, una autorización de efecto externo o un requisito explícito del brief. Se permite continuar con cambios locales e independientes dentro del scope. No usar Notion como dependencia de runtime; todas las specs imprescindibles para el agente están en este repositorio.
