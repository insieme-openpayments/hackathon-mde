# Prompts

Esta carpeta guarda los prompts reales que se usaron para construir Insieme Payments, como pide la [política de IA del hackatón](https://interledger.org/es/hackathon/ai-policy/).

- `sesion-claude-code.md`: los mensajes que el equipo envió a Claude Code durante la sesión, transcritos en orden y sin cambios.
- `workflows/`: los scripts de los workflows (orquestación de subagentes) tal como se ejecutaron. Cada archivo contiene el prompt completo de cada agente. Se nombran `NN-<nombre>.js`, en el orden de ejecución:
  - `01-insieme-migration.js`: migración del fork (rename, backend, frontend, documentación).
  - `02-insieme-adversarial.js`: validación adversarial (dos rondas Fable + fixers Sonnet + compuerta Opus).
  - `03-customer-frontend-productos.js`: Giro Efecty, Bre-B y pago real de servicios en el prototipo `customer-frontend/` (ejecutores Sonnet por archivo, verificación Opus con gsd-browser, fixers Sonnet). El prototipo se retiró del repo después (commit `ef76b86` lo contiene).
  - `04-insieme-productos-efecty-breb.js`: los mismos productos y la liquidación real de servicios en la app React (contrato Sonnet, implementación paralela Sonnet/Haiku, verificación Opus con pagos reales en la testnet, fixers Sonnet).
- `integration-backend-productos.md`: contrato de la API de `integration-backend` que el equipo pegó como prompt (sección 13 de `sesion-claude-code.md`); se pasó verbatim a los agentes del workflow 03.

Los archivos de `workflows/` se añaden después de cada ejecución: se copia el script persistido tal cual se corrió, sin editar los prompts después.

Los prompts de `workflows/` describen el trabajo de cada subagente. La revisión humana de cada resultado está en [AI_USAGE.md](../AI_USAGE.md).
