# Uso de IA · AI usage

Este documento sigue la política de IA del hackatón Open Payments de Interledger:
https://interledger.org/es/hackathon/ai-policy/

## Herramientas usadas · Tools used

- **Claude Code** (CLI de Anthropic) con **Claude Fable 5.1** como agente principal.
- **Subagentes** de Claude Code (Opus, Sonnet y Haiku) ejecutados mediante _dynamic workflows_: orquestación y verificación con Opus, código con Sonnet, tareas mecánicas y documentación con Haiku, y validación adversarial con Fable.
- Créditos consumidos: `<completar por el equipo>`

## Dónde y cómo usamos IA · Where and how we used AI

La IA se usó en todo el proyecto:

- **Fork y rename** del proyecto upstream a `insieme` (paquetes, Docker, configuración, cadenas).
- **Backend** (`backend/src/`): catálogo y categorías (`product/`, `category/`), facturas (`bill/`), órdenes (`order/`, `order-item/`), integración con integration-backend (`integration/client.ts`, `catalog/sync.ts`), liquidación con router de proveedores (`settlement/`) y `shared/src/` (esquemas y tipos del contrato).
- **Frontend** (`frontend/src/`): migración de las pantallas del prototipo a React (`app/`, `components/insieme/`, `hooks/`, `lib/stores/`), tracker de estados y comprobante.
- **Documentación**: `README.md`, `backend/README.md`, `frontend/README.md`, `docs/` y este archivo.
- **Pruebas** (`backend/tests/`): pruebas de catálogo, facturas, órdenes, liquidación e idempotencia.

## Archivos con mínima o nula IA · Files with minimal or no AI

- `customer-frontend/**` (retirado del repo tras el commit `ef76b86`; sigue en el historial): prototipo exportado del Figma "Marca Blanca" del equipo. Fue la referencia de comportamiento y copy; no lo escribió la IA.
- `frontend/public/assets/**` y los logos de `backend/images/`: assets exportados del Figma o de fuentes públicas (la IA solo recortó el espacio en blanco de los logos de convenios y recoloreó los iconos SVG al morado de marca).
- `frontend/public/brand/**` (logo horizontal e isotipo de Insieme) y el manual de identidad (morado #7A1FA2, amarillo #FFC20E, aliados #137766): los aportó el equipo; la IA solo generó el favicon y los recortes para el encabezado.
- `LICENSE`: texto de Apache-2.0 heredado del upstream.
- Código heredado de `interledger/testnet` que se adaptó pero no se reescribió, por ejemplo `backend/src/open-payments/service.ts` y `backend/src/payment/service.ts`. Los cambios de la IA en esos archivos son acotados (descripciones, enganches de liquidación y rutas).
- Archivos de configuración heredados (`tsconfig`, `eslint.config.mjs`, `.prettierrc.js`, Dockerfiles base).

## Qué hicimos nosotros · What we did ourselves

- **Decisiones de producto**: el problema que atacamos (pagar la obligación de un familiar en Colombia desde el exterior), el alcance de la demo y lo que queda simulado.
- **Diseño**: el diseño visual en Figma y la aprobación del prototipo.
- **Configuración en la testnet**: creación de billeteras de prueba y Developer Keys.
- **Aprobación de grants**: cada consentimiento de pago lo dio una persona.
- **Verificación manual**: cada pago real en la testnet se verificó a mano hasta el estado final.
- **Revisión de código**: el equipo revisó todos los cambios antes de integrarlos a `main`.

## Registro de prompts · Prompt log

- [prompts/](prompts/README.md): los prompts reales de la sesión con Claude Code, transcritos sin cambios en [prompts/sesion-claude-code.md](prompts/sesion-claude-code.md), y los scripts de los workflows con cada prompt de subagente en `prompts/workflows/`.

## Preparación en Open Payments · Open Payments preparation

- El equipo completó la preparación requerida por la política (curso de Platzi o Guía de Open Payments): `<confirmar nombre del curso y fecha por el equipo>`.
