# Prompts

Esta carpeta guarda los prompts reales que se usaron para construir Insieme Payments, como pide la [política de IA del hackatón](https://interledger.org/es/hackathon/ai-policy/).

- `sesion-claude-code.md`: los mensajes que el equipo envió a Claude Code durante la sesión, transcritos en orden y sin cambios.
- `workflows/`: los scripts de los workflows (orquestación de subagentes) tal como se ejecutaron. Cada archivo contiene el prompt completo de cada agente. Se nombran `NN-<nombre>.js`, en el orden de ejecución:
  - `01-insieme-migration.js`: migración del fork (rename, backend, frontend, documentación).
  - `02-insieme-adversarial.js`: validación adversarial (dos rondas Fable + fixers Sonnet + compuerta Opus).

Los archivos de `workflows/` se añaden después de cada ejecución: se copia el script persistido tal cual se corrió, sin editar los prompts después.

Los prompts de `workflows/` describen el trabajo de cada subagente. La revisión humana de cada resultado está en [AI_USAGE.md](../AI_USAGE.md).
