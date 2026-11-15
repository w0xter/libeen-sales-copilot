# F-02 — primera comparación REAL de C01 (experimento exploratorio)

**Estado:** preparada, no ejecutada. Este experimento es independiente del comparador `pnpm eval:multipass`, que continúa siendo exclusivamente offline. No se debe interpretar como validación estadística, benchmark de producción ni evaluación end-to-end.

## Propósito

Contestar una sola pregunta antes de desarrollar más infraestructura: ¿el intérprete multipass devuelve un resultado más útil y respaldado que single-pass al recibir una corrección de ingresos sin repetir importe?

Se utiliza C01, con dos etapas y el mismo fixture sintético inicial. Cada estrategia recibe su **propio** historial validado en la etapa de corrección, conservando las diferencias relevantes entre ambas. Mismo `OPENAI_MODEL`, una repetición por estrategia.

## Cómo ejecutar localmente

En la rama `codex/f02-first-live-c01`, con dependencias instaladas y `OPENAI_API_KEY` y `OPENAI_MODEL` en `.env.local`:

```sh
git switch codex/f02-first-live-c01
pnpm install --frozen-lockfile
pnpm typecheck
F02_LIVE_C01=1 node --env-file=.env.local node_modules/vitest/vitest.mjs run tests/evaluation/f02-live-smoke.test.ts --reporter=verbose
```

El último comando **hace llamadas reales y facturables** al proveedor OpenAI. No se ejecuta en el `pnpm test` ordinario (test omitido). No imprimir ni compartir la clave. Para ejecutar sin archivo de entorno, exportar ambas variables de forma segura en la shell antes del comando, y omitir `--env-file=.env.local`.

El informe se escribe con nombre único en `.eval-results/f02-c01-live-*.json` (directorio ignorado por Git). Incluye resultados de ambos intérpretes, errores, evidencias, conteo de solicitudes y latencia. **No subirlo automáticamente al repositorio**: puede incluir contenido generado.

## Límites

- Máximo global de **18 intentos reservados** entre ambas estrategias; timeout global de 300 segundos. El límite cuenta intentos del transporte antes de hacer la solicitud, también ante fallo.
- **No hay límite monetario**, estimación de coste ni contabilización de tokens. Verificar el presupuesto y los límites de la cuenta OpenAI antes de ejecutarlo.
- No se invoca CaseOrchestrator, BusinessPolicy ni DraftGenerator. No hay borradores, envíos o decisiones comerciales.
- Si la primera etapa de una estrategia falla o solicita revisión humana, esa estrategia no realiza la segunda etapa. Eso se reporta; no se fuerza un resultado.
- Solo una repetición. No optimizar prompts ni declarar un ganador estadístico con esta muestra.

## Revisión manual (sin crear otro oráculo todavía)

1. Confirmar que los dos `initialInputHash` coinciden.
2. Revisar el ingreso de Laura: **3.800 EUR**, conjunto, aproximadamente, originalmente **neto**. No dividirlo ni atribuirlo a un comprador individual.
3. En el mensaje nuevo C01, comprobar que la rectificación **a bruto** tiene fuente correcta y **no se inventa un importe repetido** en la cita nueva. Valorar si el historial permite resolverlo o exige revisión.
4. Revisar si cada estrategia preserva las evidencias anteriores y expone correctamente incertidumbre/conflicto, sin falsas objeciones ni promesas.
5. Comparar calidad práctica, abstención/revisión, número de solicitudes y latencia. Si una respuesta falla por red o esquema, señalarlo y no confundirlo con un fallo semántico.

**Regla de decisión:** si una estrategia resulta claramente más útil y segura, ampliar a B01, B05 y B08 con otra evaluación corta. Si ambas son similares, cuestionar la complejidad multipass. Si falla el primer experimento, corregir únicamente el bloqueo observado. No desarrollar más infraestructura especulativa antes de mirar la salida real.
