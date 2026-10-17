# Brief de la landing page de Insieme (pegado por el equipo el 17 oct 2026)

> Al terminar, revisa el veredicto, haz commit y push ff, luego prepara otro workflow porque se debe crear una landing page, para eso todo el flujo se debe renderizar en el endpoint /pay de forma tal que la raiz sea usada por el sitio informativo. Primero verifica que el producto es funcional al moverlo fuera de la raiz y luego crea la landing page considerando:

## 1. Contexto y objetivo

Eres diseñador/a de producto y vas a crear la landing page de **Insieme**, una Corresponsalía Virtual que permite a colombianos en el exterior pagar o enviar dinero a su familia en Colombia desde su propia moneda, rápido y sin la cadena tradicional de intermediarios.

- **Qué es Insieme:** une el Protocolo Interledger (mueve el valor entre países) con un orquestador de pagos que entrega en Colombia por Bre-B o en efectivo en un corresponsal físico cercano a la familia. _Insieme_ significa “juntos” en italiano; el ampersand (&) une al migrante y a su familia.
- **Quién la usa:** el **ordenante**, la persona en el exterior (Madrid, Santiago de Chile, etc.) que paga o envía. La familia beneficiaria en Colombia también debe sentirse reconocida en la página.
- **Qué debe lograr:** que el ordenante entienda en menos de 30 segundos qué es Insieme y qué camino le sirve, se identifique con una historia real de familia y dé uno de dos pasos: **pagar** o **crear su wallet**.
- **Contexto:** Insieme nace en Beyond Access 2026, hackatón de Interledger, de Intrust, Twelve Network y Oplat. La narración es emocional pero concreta: nadie se va de Colombia por gusto, y la demora la paga la familia que se queda.

## 2. Reglas de contenido (no negociables)

- **No nombres al corresponsal.** En ningún texto, imagen, alt, metadato ni pie de página aparece “PuntoRed”. Usa “corresponsal físico”, “agente corresponsal” o “punto de atención cerca de casa”. Don Álvaro es “agente corresponsal”, sin marca asociada.
- **Sí nombra Bre-B.** Es el riel de pagos inmediatos de Colombia y el camino para quien tiene cuenta bancaria. Explícalo en una frase: “llega al instante a la llave o cuenta de tu familiar”.
- **Sin cifras no verificadas.** No pongas porcentajes de ahorro, tarifas ni tiempos garantizados (“4 días”, “sin comisiones”, “más barato”) hasta que Oplat los confirme. Usa lenguaje cualitativo: “más rápido”, “sin intermediarios en el camino”, “mismo día” solo si está validado.
- **Historias ilustrativas.** Cada historia lleva la nota “Historia ilustrativa basada en situaciones frecuentes de familias con migrantes”. Los personajes no son clientes reales ni usan fotos de personas reales.
- **Aviso de entorno de pruebas.** La wallet de https://wallet.interledger-test.dev/ es de pruebas (testnet). Junto al botón, di en una línea que es un entorno de demostración y que no mueve dinero real, salvo que Oplat indique lo contrario.
- **Español de Colombia**, tuteo cercano, sin jerga técnica en el cuerpo principal. Términos como Open Payments o ILP solo en un bloque opcional “Para quien quiere saber más”.

## 3. Estructura de la página

Una sola página con scroll, pensada primero para celular (el ordenante suele entrar desde el teléfono al salir del turno). La página se organiza alrededor de **dos escenarios**:

1. **Pagar directamente la obligación.** El ordenante paga desde el exterior un recibo, una matrícula o un servicio de su familia, y no tiene que girar efectivo.
2. **Enviar dinero al familiar.** Dos vías según el familiar: **Bre-B** si tiene cuenta bancaria (llega a su llave o cuenta al instante), o **giro nacional en efectivo** si no la tiene (lo cobra con su cédula en un corresponsal físico).

| #   | Sección                    | Contenido                                                                                                                                                                                                      | Acción                        |
| --- | -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1   | Hero                       | Titular emocional (propuesta: “Paga en Colombia desde donde estés. Tu familia lo recibe cerca de casa.”), subtítulo de una línea, ilustración con Marcela y Doña Rosa                                           | Botones primario y secundario |
| 2   | El problema                | Por qué hoy es lento y caro para la familia que se queda; una frase y un visual del “puente de intermediarios” que se elimina                                                                                   | Ninguna                       |
| 3   | Qué es Insieme             | Corresponsalía Virtual en tres pasos: pagas desde tu wallet, Insieme coordina, tu familia recibe                                                                                                                | Ninguna                       |
| 4   | Dos formas de usar Insieme | Selector de dos tarjetas: “Pago la obligación directamente” y “Le envío dinero a mi familiar”. La segunda se abre en dos sub-opciones: Bre-B y giro en efectivo. Cada tarjeta lleva su historia                 | Botón de pago en cada tarjeta |
| 5   | Personajes e historias     | Galería de los seis personajes con su historia de antes y con Insieme (ver sección 4)                                                                                                                          | Ninguna                       |
| 6   | Cómo empezar               | Tres pasos: crea tu wallet, fóndala, paga o envía. Aviso de entorno de pruebas                                                                                                                                  | Botón de wallet               |
| 7   | Confianza                  | Supervisión regulatoria y seguridad en lenguaje claro; logos de aliados (Intrust, Twelve Network, Oplat)                                                                                                        | Ninguna                       |
| 8   | Cierre y pie               | Repetición de los dos botones, preguntas frecuentes breves, nota de historias ilustrativas                                                                                                                      | Ambos botones                 |

### Los dos botones

- **“Ir al portal de pagos”** (primario, amarillo sobre morado): lleva al portal de pagos de Insieme. URL: **[por confirmar]**. Aparece en el hero, en la sección 4, en la sticky bar móvil y en el cierre.
- **“Crear mi wallet Interledger”** (secundario, contorno): abre https://wallet.interledger-test.dev/ en pestaña nueva (`target="_blank"`, `rel="noopener"`). Acompáñalo de una línea que explique qué es una wallet: “Tu billetera para pagar en cualquier moneda”. Aparece en el hero, en la sección 6 y en el cierre.

Ambos botones deben ser visibles sin hacer scroll en móvil y distinguirse sin depender solo del color.

## 4. Personajes e historias

Son dos familias ilustrativas. Cada personaje tiene rostro ilustrado propio (avatar circular, estilo plano y cálido, consistente en toda la página). Cada historia se cuenta en dos tiempos, **Lo que vivieron** y **Con Insieme**, y se asigna a un escenario. Las historias de la tabla ya están adaptadas a las reglas de la sección 2; el diseñador puede ajustar el texto sin cambiar el sentido.

| Personaje          | Rol y contexto                                                                                                      | Escenario            | Lo que vivieron                                                                                                                                      | Con Insieme                                                                                                                                                  |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Marcela, 34**    | Ordenante. Auxiliar de enfermería en Madrid; salió de Dosquebradas cuando cerró la empresa donde trabajaba          | 1. Pago directo      | Hace turnos dobles. Para la matrícula de Samuel envió dinero por una cadena de intermediarios; llegó tarde y una parte se quedó en el camino         | Paga la matrícula y el recibo de la luz desde su wallet al salir del turno, sin girar efectivo. Ve la confirmación en el celular                              |
| **Samuel, 9**      | Hijo de Marcela, cuarto de primaria; vive con su abuela                                                             | 1. Pago directo      | Estuvo cerca de perder su cupo por una matrícula que llegó tarde                                                                                     | La matrícula queda pagada a tiempo; no vuelve a perder clases                                                                                                |
| **Andrés, 28**     | Ordenante. Repartidor en bicicleta en Santiago de Chile; es de Bucaramanga                                          | 2a. Envío por Bre-B  | El plazo del semestre vencería un lunes y la transferencia internacional tardaba días y pedía datos de bancos intermediarios                         | Paga en pesos chilenos desde su wallet; el dinero llega por Bre-B a la llave de su hermana al instante                                                       |
| **Daniela, 19**    | Beneficiaria. Hermana de Andrés; recién entró a la universidad en Bucaramanga; tiene cuenta bancaria                | 2a. Envío por Bre-B  | Pasó el fin de semana pidiendo una prórroga a la universidad                                                                                         | Recibe en su llave Bre-B y paga el semestre ese mismo día                                                                                                    |
| **Doña Rosa, 67**  | Beneficiaria. Mamá de Marcela; cuida a su nieto; nunca ha tenido cuenta bancaria                                    | 2b. Giro en efectivo | Para cobrar un giro viajaba al centro, hacía fila con Samuel de la mano y a veces la oficina ya había cerrado                                        | Presenta su cédula en el corresponsal de su barrio y recibe el efectivo, o paga ahí mismo el recibo de la luz                                                |
| **Don Álvaro, 58** | Agente corresponsal. Tiene la tienda de la esquina hace 20 años                                                     | 2b. Giro en efectivo | Su tienda era solo una tienda                                                                                                                        | Es un punto de atención de confianza: consulta el pago, valida la cédula y entrega el efectivo. **Sin nombrar la red a la que pertenece**                    |

**Detalles para la narración:**

- Refleja la situación real del giro en efectivo: el familiar debe ir al corresponsal físico con su cédula. Ese paso es parte de la historia, no un defecto que haya que esconder.
- Muestra el cierre emocional: Marcela ve la confirmación en su celular en el momento en que Doña Rosa recibe. Antes llamaba cada noche a preguntar si ya había llegado.
- Cada escenario termina con el mismo botón de pago para que la emoción se convierta en acción.

## 5. Identidad visual y requisitos técnicos

| Elemento        | Especificación                                                                                                                                                                                |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Logo            | Horizontal (`logo-insieme.webp`) para encabezado y cierre; isotipo & (`isotipo-insieme.png`) para favicon, avatar y nodos. Se entregan con el brief                                            |
| Colores         | Morado #7A1FA2 (marca), amarillo #FFC20E (acción y acento), verde aliados #137766, tinta #1A1D24, fondo #F6F6F2                                                                                |
| Tipografía      | Sora para titulares (500–700), Manrope para texto (400–700)                                                                                                                                   |
| Ilustración     | Avatares circulares planos y cálidos para los seis personajes, coherentes entre sí; íconos de línea para wallet, Interledger, Bre-B, corresponsal físico y servicios                           |
| Tono visual     | Humano y cercano, no bancario; mucho aire, tarjetas redondeadas, el amarillo reservado a las acciones                                                                                          |
| Modo oscuro     | Versión clara y oscura con los mismos tokens de color                                                                                                                                         |
| Accesibilidad   | Contraste AA mínimo, texto alternativo en cada ilustración, foco visible, navegación por teclado, `prefers-reduced-motion` respetado                                                           |
| Responsive      | Diseño móvil primero (360 px) y escritorio (1280 px); barra de botones fija en móvil                                                                                                           |
| Rendimiento     | Ilustraciones en SVG; sin imágenes pesadas; carga inicial liviana para conexiones móviles                                                                                                      |
| SEO y compartir | Título, descripción e imagen Open Graph con la marca; sin “PuntoRed” en ningún metadato                                                                                                       |

## 6. Entregables y criterios de aceptación

**Entregables:** diseño de la landing en móvil y escritorio (modo claro y oscuro), sistema de componentes con los botones y las tarjetas de escenario, los seis avatares exportados en SVG y los textos finales en español. Formato: **[por confirmar: Figma o página HTML lista para publicar]**.

**La landing está aprobada cuando:**

- En 30 segundos un visitante sabe qué es Insieme y ve los dos botones sin hacer scroll en móvil.
- Los dos escenarios (pago directo y envío al familiar) y las dos vías de envío (Bre-B y giro en efectivo) se distinguen sin explicación adicional.
- Aparecen los seis personajes con su historia y la nota de historia ilustrativa.
- Bre-B se menciona por su nombre y “PuntoRed” no aparece en ninguna parte, ni en textos, ni en imágenes, ni en metadatos.
- No hay cifras, tarifas ni tiempos garantizados sin validar.
- El botón de wallet abre https://wallet.interledger-test.dev/ en pestaña nueva y indica que es un entorno de pruebas.
- Cumple los requisitos de accesibilidad y responsive de la sección 5.
