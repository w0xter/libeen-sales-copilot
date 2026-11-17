# Evolución y simplificación del enfoque

> Documentación de Libeen AI Lead Intake V0. [Volver al README principal](../../README.md). La aceptación vigente es de una **PoC supervisada con limitaciones**; las observaciones históricas siguen disponibles en los informes.

## 4. Evolución del producto: por qué simplificamos el enfoque

### 4.1. Primera propuesta: Sales Copilot basado en hitos

El desarrollo comenzó con un planteamiento más ambicioso: un Sales Copilot capaz de acompañar un expediente comercial a través de distintos hitos.

Se diseñaron conceptos como:

- `Case`
- `WorkflowDefinition`
- `FactSchema`
- `AgentProfile`
- Hitos comerciales M0–M5
- Políticas deterministas y orquestación de casos

Se implementó una primera arquitectura y se construyeron recorridos de prueba.

Esa propuesta permitía explorar más decisiones comerciales, pero también incrementaba considerablemente la superficie de comportamiento que había que validar.

### 4.2. Qué revelaron los primeros experimentos

Las pruebas iniciales con OpenAI mostraron problemas de salida estructurada y de interpretación.

Conseguir un JSON válido no garantiza que el contenido represente correctamente lo que dijo el cliente.

También se experimentó con un intérprete *multipass*, separando etapas de análisis.

En una comparación con 24 escenarios sintéticos, el enfoque single-pass obtuvo 23 comprobaciones automáticas PASS frente a 2 del multipass, con 54 y 139 intentos de proveedor, respectivamente.

**Estos resultados no son tasas de precisión.** Parte de los fallos correspondía a abstenciones o bloqueos conservadores, y la revisión manual detectó falsos positivos en el propio oráculo de evaluación.

Por tanto, no se demostró una superioridad semántica universal del single-pass. Lo que sí se observó fue que añadir multipass introducía complejidad y coste sin una mejora suficientemente acreditada para el objetivo inmediato.

Se exploró asimismo LangExtract como alternativa experimental de extracción, sin incorporarlo al runtime final.

### 4.3. El pivote a AI Lead Intake

La conclusión fue reducir el problema.

En lugar de intentar llevar automáticamente un expediente por un proceso comercial completo, la PoC se centra en tres preguntas:

1. **¿Qué información podemos extraer con evidencia?**
2. **¿Qué falta o necesita revisión?**
3. **¿Cuál sería la siguiente intervención útil?**

Esto permitió acotar la arquitectura a B → D → E y construir una interfaz alrededor de la revisión humana.

La simplificación no consistió únicamente en eliminar funcionalidades. También cambió el contrato de éxito:

**De automatizar decisiones sobre el avance comercial a producir información parcial, trazable y revisable que ayude al asesor a avanzar.**

El Sales Copilot anterior se conserva como referencia histórica en la rama `archive/sales-copilot-v0` y en `docs/legacy/`.

No forma parte del runtime activo de AI Lead Intake.

---
