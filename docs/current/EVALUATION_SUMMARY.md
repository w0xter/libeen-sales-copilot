# Evaluaciones y evidencias

> Documentación de Libeen AI Lead Intake V0. [Volver al README principal](../../README.md). La aceptación vigente es de una **PoC supervisada con limitaciones**; las observaciones históricas siguen disponibles en los informes.

## 6. Evaluación y pruebas realizadas

La evaluación se organizó en distintos niveles porque cada uno demuestra propiedades diferentes.

| Tipo de evaluación | Qué permite comprobar | Qué no demuestra |
|---|---|---|
| Unitarias | Reglas, estados y transformaciones | Calidad de extracción del LLM |
| Integración controlada | Contrato B/D/E y respuestas conocidas | Comportamiento probabilístico real |
| Replay | Regresiones sobre respuestas históricas | Una nueva inferencia |
| Playwright | Interacción, revisión, exportación y estados de UI | Precisión semántica general |
| OpenAI real | Comportamiento observado con el proveedor | Robustez estadística |
| Revisión humana | Corrección semántica de casos concretos | Cobertura universal |

### 6.1. Resultados del último cierre PoC

El último informe de hardening documenta:

| Comprobación | Resultado reportado |
|---|---|
| Vitest | **232 PASS / 4 SKIP** |
| Playwright | **19 PASS / 9 SKIP** |
| TypeScript | PASS |
| ESLint | PASS |
| Build | PASS |
| Inferencia real final | Una llamada satisfactoria sobre caso ficticio reservado |

Los tests optativos de proveedor real requieren credenciales y conectividad, y no están incluidos por defecto en la suite de navegador.

Estas cifras son los resultados registrados de la última iteración por Codex; no deben interpretarse como una auditoría independiente posterior.

### 6.2. Caso real reservado: Alicante

En la última evaluación con OpenAI real se utilizó una conversación ficticia sobre una compradora de Alicante.

La conversación contenía interés explícito en SmartHousing, horizonte de ocho meses, compra individual, ingresos aproximados de 2.750 € netos al mes, 11.000 € ahorrados y una cuota de 145 €/mes cuya inclusión era desconocida.

La ejecución documentada recuperó los siete campos con fuentes y propuso una pregunta específica sobre la cuota.

La respuesta está disponible en [la evidencia de Alicante](evaluation/hardening/poc-real.json).

**Es una observación satisfactoria, no una medición de estabilidad o precisión.** Después de esa inferencia se modificó la conservación de la revisión en la interfaz y se verificó con respuestas controladas, sin repetir el recorrido real completo.

### 6.3. Evaluación de flujos de revisión

Los tests de navegador controlado cubren, entre otros comportamientos:

- Confirmación, corrección y descarte de candidatos.
- Conservación de revisiones.
- Reanálisis y conflictos.
- Resolución y reapertura manual de una incidencia.
- Preguntas editables.
- Vista CRM y copia manual.
- Bloqueos por resultados desactualizados o contradictorios.
- Recuperación ante errores.

Esto permite comprobar la lógica de interacción sin confundirla con la fiabilidad semántica del LLM.

### 6.4. Accesibilidad

Se corrigió un problema de landmarks relacionado con el aviso final de la interfaz.

Las pruebas con Axe se realizaron en estados de entrada y resultados, en tamaños de escritorio y móvil. También existen verificaciones de interacción por teclado y foco.

No se realizó una auditoría WCAG integral ni una evaluación completa con lector de pantalla.

### 6.5. Evolución de los criterios de aceptación

La evaluación original incluía 23 criterios funcionales. La primera auditoría E2E registró 14 PASS, 4 PARTIAL y 5 FAIL.

El hardening corrigió algunos defectos, pero reveló también variabilidad semántica en casos de continuación y ambigüedad.

En lugar de cambiar retrospectivamente las evaluaciones, se definieron dos decisiones distintas:

- **Contrato original más estricto:** incluye resolver automáticamente determinadas aclaraciones; sigue sin demostrarse por completo.
- **Criterio actual de PoC supervisada:** permite intervención humana explícita para revisar y resolver incertidumbres; fue aceptado con limitaciones.

Los fallos históricos permanecen documentados.

Véanse la [matriz de aceptación](evaluation/ACCEPTANCE_MATRIX.md), los [criterios PoC vigentes](evaluation/POC_EVALUATION_CRITERIA.md) y el [informe de hardening](evaluation/HARDENING_RELEASE_REPORT.md).

---
