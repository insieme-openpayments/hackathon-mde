# Prompts de la sesión con Claude Code (Claude Fable 5.1)

Registro literal de los mensajes enviados por el equipo a Claude Code para construir este
repositorio, en orden cronológico (16 de octubre de 2026). Los prompts que Claude Code generó
para sus subagentes (workflows) están en `prompts/workflows/`.

## 1. Fork inicial

> deseo un fork de el paquete boutique ubicado específicamente en https://github.com/interledger/testnet/tree/09dd1fb3cc77eff9e4b08f112be39a80f99d149d/packages/boutique porque deseo implementar una variante del boutique, pero luego le daremos identidad, inicialmente deseo una versión fork que funcione, luego vendran los demás ajustes.

## 2. Docker y verificación del flujo de pago

> Levanta back y front en docker, ejercita el flujo de pagos para verificar la conexión con la testnet interledger. Usa gsd-browser.

## 3. Reestructuración del repo

> Mueve las carpetas backend frontend y shared a la raiz, haciendo que la carpeta package no exista. Luego recrea el backend porque ya tiene los valores nuevos.

## 4. Pago desde otra wallet

> Obtuve https://wallet.interledger-test.dev/no-access?interactionId=62a97b16-0c3a-47de-985e-f8d4b4980a04&nonce=28B80B1F34F1FAF5 Access to the given resource is forbidden. El pago lo deseo hacer desde la wallet $ilp.interledger-test.dev/91b7c20f

## 5. Moneda y primer push

> El checkout de Opportunity cobró 1 Euro, hay un error en la UI porque el cobro es en COP, ajustar los montos adecuadamente. Luego sube todo el código al repo en main directamente.

## 6. Plan de migración de customer-frontend

> Haz pull, analiza el contenido de la carpeta customer-frontend, en ella está la propuesta de lo que será la plataforma, eso significa que se debe hacer un plan para migrar la experiencia que está en customer-frontend y que sea funcional en el frontend. Para hacer la adaptación del front/back, se debe cambiar las referencias de boutique a insieme (todo el codebase), y se debe hacer que los productos sean consumidos vía API (los que aparecen en el customer-frontend, json con tipo, convenio, requiere monto manual, después ajustamos el contrato). El propósito es que un usuario de Insieme pueda pagar vía Interledger las facturas/servicios que están disponibles vía API. Haz el plan, luego de la aprobación se implementa usando dynamic workflows, dejando la ejecución para agentes Sonet, Haiku, una orquestación y verificación con agente Opus, y una validación adversarial Fable (solo dos rondas).

Respuestas del equipo a las preguntas de Claude Code durante la planeación:

- Alcance de flujos: "Solo Servicios + Facturas".
- Wallet address: "El checkout debe presentar el ´One Click Buy Setup´ y el pago puede ser sin registro obligatorio ingresando la wallet en cada pago".
- Carrito: "Eliminar carrito, dejar one-click para después".

## 7. Mejoras desde hackathon-med y política de IA

> Analiza lo que está alojado en https://github.com/insieme-openpayments/hackathon-med/tree/main/hackathon-mde y con base en ello identifica oportunidades de mejora del plan definido. Ten presente para la ejecución lo definido en https://interledger.org/es/hackathon/ai-policy/

(El mensaje incluía pegado el texto de la Política de IA de los hackatones de Open Payments.)

Respuestas del equipo:

- Mejoras a incorporar: capa de liquidación con router de proveedores, factura enriquecida en el lookup, documentación de hackathon. Modo ensayo `SIMULATE_OP` descartado.
- Integración con `integration-backend` (repo del equipo): "Proveedor upstream con fallback".

## 8. Aprobación del plan

El plan completo generado por Claude Code se revisó y aprobó en la sesión; su contenido está
resumido en `docs/ARCHITECTURE.md` y los prompts de ejecución en `prompts/workflows/`.

## 9. Sincronización con los commits del equipo (durante la ejecución)

> Haz pull de los mas recientes commits, ya esta el contrato en un commit

> Haz nuevo pull, hay más cambios

Tras cada pull, Claude Code analizó los cambios del prototipo (`customer-frontend`) y del
repo `integration-backend` y ajustó el plan antes de lanzar los workflows (ver sección
"Ajustes de contrato" en `prompts/workflows/01-insieme-migration.js`).

## 10. Comandos ejecutados a mano por el equipo

Los archivos `.env.local` están bajo una regla de permisos que impide a Claude Code leerlos
o modificarlos. El rename de la base de datos lo ejecutó el equipo directamente en la terminal:

```sh
sed -i '' 's/boutique_backend/insieme_backend/g; s/Boutique/Insieme/g; s/boutique/insieme/g' backend/.env.example frontend/.env.example
sed -i '' 's/boutique_backend/insieme_backend/g' backend/.env.local
```

## 11. Ejecución de los workflows

Los dos workflows de `prompts/workflows/` se lanzaron desde esta misma sesión; sus scripts
contienen literalmente los prompts de cada subagente (Sonnet, Haiku, Opus y Fable). El
resultado de cada ronda se revisó en la sesión principal antes de hacer commit y push.
