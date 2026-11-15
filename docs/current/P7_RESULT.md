# P7 — Revisión humana

Cada candidato admite confirmación, corrección de texto y procedencia, descarte y restauración. La decisión conserva la propuesta original, su fuente y metadatos de precisión, sujeto, base e inclusión de cuota; el valor corregido conserva las unidades y periodos escritos por el asesor. La revisión es operativa y no se presenta como verificación documental. Si cambia un matiz estructurado, el asesor debe expresarlo en el texto o la nota; los metadatos guardados describen la propuesta original, no una nueva verificación.

Las pruebas `tests/unit/intake/review.test.ts` verifican conservación de propuesta, fuente y metadatos, y descarte/restauración. `pnpm typecheck` y `pnpm lint` han pasado. No se ha podido comprobar la interacción visual por la restricción del navegador documentada en P6. La conservación durante reanálisis, referencias y preguntas se aborda en P8. Los defectos de B/D/E siguen documentados en P4/P5.
