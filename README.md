# Libeen AI Lead Intake V0

Aplicación local de demostración para convertir conversaciones **ficticias** en una ficha comercial revisable. Extrae candidatos con fuentes, muestra incidencias, propone una pregunta y permite revisiones humanas, reanálisis y copia manual para CRM. No envía mensajes ni sincroniza CRM; no aprueba financiación ni verifica documentos.

## Arranque

Requisitos: Node.js 22 y pnpm 12.16.1.

```sh
pnpm install --frozen-lockfile
cp .env.example .env.local
# Configura OPENAI_API_KEY en .env.local; opcionalmente OPENAI_MODEL.
pnpm dev
```

Abre http://localhost:3000. Selecciona Laura, Javier o Rosa, o pega una conversación ficticia con turnos `Cliente:`, `Libeen:` o `Asesor:`. Pulsa **Analizar conversación**; escribir no ejecuta análisis automáticamente. El proveedor recibe el texto ficticio desde el servidor. Sin clave o ante un fallo se muestra el error, sin replay ni sustitución por datos inventados. Los resultados y revisiones solo viven en la sesión del navegador.

Revisa candidatos y alertas, confirma la etapa sugerida si corresponde y copia la vista previa CRM para cargarla manualmente. Un cambio de conversación exige reanálisis; las correcciones y evidencias contradictorias se muestran para resolución. Una alerta sensible pendiente bloquea copiar la pregunta. Cualificado indica completitud comercial, no solvencia ni aprobación.

## Configuración mínima

Los campos comerciales obligatorios y su orden, el orden de ambigüedades y la prioridad de la base de ingresos se editan en `src/intake/rules.ts`. Reinicia o reconstruye tras cambiarlo; no hay editor de reglas en la interfaz.

## Comprobación

```sh
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

Las pruebas con proveedor real son optativas y precisan clave y red; las pruebas deterministas con transporte simulado no prueban la calidad del modelo. Los detalles y limitaciones están en [docs/current](docs/current/README.md). La revisión visual y de accesibilidad en navegador sigue pendiente. No utilizar con datos reales ni como sistema de producción.

El código del Sales Copilot anterior permanece en el repositorio como legado y no es el runtime de esta interfaz. Su documentación está en [docs/legacy](docs/legacy/README.md).
