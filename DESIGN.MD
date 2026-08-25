# Neural Terrena Console — Diseño

Referencia de diseño para nuevos desarrollos de la consola. Es la bajada a producto del **Neural Terrena Design System** (canon de agosto de 2026, mantenido en Claude Design).

**Fuente de verdad**

| Qué | Dónde |
|---|---|
| Canon completo (marca, voz, componentes) | Neural Terrena Design System · `claude.ai/design/p/db4d5515-1381-43f0-b059-19ed9e6073cb` |
| Tokens en este repo | `src/styles/tokens.scss` — port de `colors_and_type.css` del canon |
| Clases semánticas | `src/styles/global.scss` |
| Convención de features | `docs/FEATURE_CONVENTION.md` |

Si un token cambia en el canon, se cambia en `tokens.scss` y no en las hojas de estilo que lo consumen. Nunca hardcodear colores, tamaños de texto, espaciados, radios, sombras ni duraciones.

## Principios

- La interfaz es una herramienta de trabajo, no una landing ni una pieza comercial.
- El terreno, la visibilidad, el tiempo y el estado operacional son el centro. La marca acompaña sin gritar.
- El color comunica estado o jerarquía. Nunca decora.
- Densidad controlada, pantallas escaneables, sin ornamento.
- Si un diseño se siente ruidoso, decorativo o genérico, probablemente está mal. Releer *Anti-patrones* y empezar de nuevo.

## Voz

Habla como un analista con experiencia a otro profesional. Baja la voz, no vende. Verbos concretos: *calcula, modela, sincroniza, expone, traza*. Nunca «revolucionario», «next-gen», «all-in-one», «transformar», «empoderar». Nunca emoji en producto, web, deck o propuestas.

- Wordmark siempre en minúscula: `neural terrena`. En texto corrido: `Neural Terrena`.
- `Terrain Intelligence` en inglés y con mayúscula inicial incluso en prosa española: es una categoría propia.
- Acrónimos canónicos: `C-UAS` (nunca C-UAV), `HADR`, `CIP`, `LOS`, `DEM`.
- Idioma de la UI: español técnico-profesional. Todo string pasa por `t()` (`src/shared/i18n/translations.ts`), con `en` y `es` completos.

## Paleta

Cinco colores activos. **El orden es significado** — gradiente estratigráfico cálido arriba → frío abajo, igual que el isotipo.

| Token | Hex | Rol |
|---|---|---|
| `--nt-color-yellow` | `#F9B233` | Capa 1 · iluminación alta |
| `--nt-color-orange` | `#E85D2F` | Capa 2 · temperatura media |
| `--nt-color-red` | `#C62828` | **Alerta · error · riesgo — reservado** |
| `--nt-color-blue` | `#1E4F82` | Institucional · **CTA primario** |
| `--nt-color-black` | `#1A1A1A` | Texto · wordmark · superficies oscuras |

Escala de grises estratigráfica (`--nt-gray-100 / -300 / -500 / -700 / -900`): un paso por banda, de modo que la jerarquía de capas sobrevive sin color.

Reglas duras:

1. **El color es señal, no decoración.** Máximo tres colores activos por composición, más blanco y negro.
2. **El rojo es solo alerta.** Avisos críticos, errores, estados de riesgo. Nunca rojo para enfatizar, nunca un botón rojo.
3. **El azul es el único color de CTA.** Hover oscurece a `--nt-cta-primary-hover` (`#163E68`). No hay CTA verdes ni naranjas.
4. **Amarillo y naranja no pasan WCAG AA sobre blanco a tamaño de texto.** Solo sobre bloques rellenos con texto oscuro, en data viz o como acento display.
5. **El gradiente cálido→frío solo aparece cuando representa algo** — iluminación, altitud, temperatura, exposición — y siempre con leyenda. El orden nunca se invierte.

## Tipografía

Tres familias con separación estricta de rol:

| Token | Familia | Uso |
|---|---|---|
| `--nt-font-brand` | Helvetica NT | **Solo marca y print/pitch.** Nunca en web — no se sirve desde este repo. |
| `--nt-font-ui` | Inter (local, variable 100–900) | Toda la superficie digital. |
| `--nt-font-mono` | JetBrains Mono | Código, coordenadas, datos tabulares, lecturas de métricas. |

Escala modular, base 16 px, ratio ~1.25: `xs 12 · sm 14 · base 16 · lg 18 · xl 20 · 2xl 24 · 3xl 32 · 4xl 40 · 5xl 56 · 6xl 72`.

Titulares en Inter Bold (700) con `letter-spacing` negativo (`-0.015` a `-0.02em`) en tamaños display. Cuerpo en Inter Regular (400), `line-height: 1.6`. Las lecturas mono usan peso 500 para énfasis y `tabular-nums` siempre que haya números que comparar.

> **Pendiente:** JetBrains Mono aún no está en `public/fonts/`. `--nt-font-mono` la nombra primero y cae al mono del sistema. Para activarla hay que añadir `JetBrainsMono-{Regular,Medium,SemiBold,Bold}.ttf` (+ itálicas) y sus `@font-face` en `tokens.scss`.

## Espacio, estructura, superficies

**Escala** — base 8 px, `--nt-space-1: 8` … `--nt-space-16: 128`. El sub-paso de 4 px (`--nt-space-half`) se permite **solo** en UI de producto densa.

**Contenedores** — `--nt-container-prose 720 / content 1080 / wide 1280 / max 1440`. 12 columnas en escritorio, 4 en tablet, apilado en móvil.

**Fondos** — blanco o negro por defecto; `--nt-bg-subtle` (`#F6F6F6`) para cortes de sección. El gradiente estratigráfico solo a baja opacidad y solo como variable con leyenda. Sin fotografía genérica de paisaje, sin gradientes morados o rosas, sin neón, sin patrones ni texturas.

**Bordes antes que sombras.** Separadores de 1 px en `--nt-gray-100`, `--nt-gray-300` cuando hace falta más presencia. La card por defecto es superficie blanca + borde 1 px gray-100 + radio 4 px + sin sombra. Recurrir a `--nt-shadow-sm/md/lg` solo cuando el espacio y el peso tipográfico no bastan; nunca blur > 20 px; nunca sombra sobre iconos o logos. No anidar cards dentro de cards.

**Radios** — `none 0 / sm 2 / md 4 / lg 8 / full 9999`. **Por defecto 0 o 4.** De 12 a 24 px es territorio SaaS de consumo y está fuera de voz. `full` es para avatares y algún badge; nunca para botones ni para «pills» inventadas.

Las vistas operativas usan barras laterales, cabeceras compactas, tablas, paneles y listas. Sin heroes. En móvil las herramientas se apilan sin ocultar acciones principales.

## Movimiento

Contenido. Sin rebotes, sin muelles, sin parallax, sin autoplay.

```
--nt-dur-fast  120ms
--nt-dur-base  200ms
--nt-dur-slow  300ms
--nt-ease      cubic-bezier(0.2, 0.7, 0.2, 1)
```

Aceptable: fade-in al hacer scroll, transiciones de color/borde en hover, el scrubber de la línea de tiempo, un único pulso en un marcador de aviso crítico. No aceptable: bucles de hero, Lottie, fondos de partículas, gradientes animados. Respetar `prefers-reduced-motion`.

**Estados de interacción**

| Estado | Tratamiento |
|---|---|
| Hover (CTA) | Oscurecer el azul a `#163E68`. Sin escala. |
| Hover (enlace) | Color → `--nt-cta-primary-hover`, mantener subrayado. |
| Hover (card) | Borde `gray-100` → `gray-300`. Sin elevación ni cambio de sombra. |
| Press | Opacidad `.85` brevemente. Sin encoger, sin transform. |
| Focus | Outline de 2 px en `--nt-color-blue` con 2 px de offset. Nunca se quita. |
| Disabled | Relleno `--nt-gray-300`, texto `--nt-gray-500`, `cursor: not-allowed`. |
| Loading | Texto concreto de la acción, p. ej. `Validando`. |
| Error | Explicar el bloqueo sin culpar al usuario. |
| Vacío | Indicar el estado del sistema y la siguiente acción disponible. |
| Éxito | Mostrar el cambio de estado, no celebrarlo. |

## Componentes

El canon define seis primitivas que codifican reglas del sistema, no solo apariencia:

- **Button** — azul institucional como único color de CTA. `primary` / `secondary` (outline) / `tertiary` (texto); tres tamaños. **No hay variante destructiva**: el rojo está reservado a alertas.
- **SeverityTag** — el canon de severidad hecho componente.
- **StatReadout** — métrica en mono tabular que lleva su propio límite operativo y se pone en rojo al superarlo.
- **Meter** — valor sobre un rango, con marca del umbral en la propia pista.
- **AlertCard** — aviso que responde *qué* / *con qué confianza* / *dónde* / *cuándo* (antelación).
- **Panel** — contenedor colapsable; colapsa a su barra de cabecera. `tone="dark"` da la superficie de puesto de mando.

**Regla de severidad:**

> El rojo es el único color de alerta. `critical` puede rellenar en rojo (banner) o llevar borde/punto rojo. `elevated` y `advisory` se quedan neutros y transmiten urgencia por peso, posición y antelación. El gradiente cálido→frío queda reservado a iluminación/insolación, donde representa una variable real y con leyenda.

Por encima de las primitivas, el canon define tres capas de superficie para producto.

### Map Controls — implementada

Vive en `src/styles/map-controls.scss` (port de `ui_kits/product/map-controls.css`, seguido de un bloque de extensiones del proyecto claramente separado) y en `src/features/map/ui/controls/`.

- Contenedor `.nt-map` con `data-btn="elevated"` y `data-theme` sincronizado con el tema de la app, y esquinas `--tl/--tr/--bl/--br`.
- Primitivos: `.nt-mapbtn` (36 px escritorio / 48 px móvil), `.nt-mapgroup`, `.nt-mappanel`, `.nt-maprow`, `.nt-seg`, `.nt-mapscale`, `.nt-mappill`.
- Controles: zoom, brújula (gira con el rumbo), mi-ubicación, pantalla completa, buscador, basemaps, capas y predicción, medición y ajustes.
- Móvil (`.nt-map--mobile`): objetivos de 48 px, barra inferior de pestañas y paneles como bottom sheets, con `safe-area`.

Reglas al extenderla:

- No editar el bloque canónico del SCSS: todo lo propio va al bloque de extensiones, comentado con el motivo.
- Los primitivos que el canon dibuja como contenedores se renderizan como `button` reales para que sean operables con teclado; el reset vive en las extensiones.
- El único color de estado en los controles sigue siendo el azul de acción; el rojo queda para alertas.

### Command View — shell y timeline implementados

Vive en `src/styles/command.scss` (port de `ui_kits/product/command.css` más extensiones del proyecto) y en `src/features/map/ui/command/`. Ruta `/command`, fuera del shell de consola porque `.cmd` es `position: fixed; inset: 0` y una sidebar debajo sería espacio muerto.

- Tema oscuro militar como primario; `data-mode="civ"` da el shell civil claro.
- Barra de estado: relojes local y Zulu, badge `EN VIVO` / `PREVISIÓN T+hh:mm` / `REVISIÓN T−hh:mm`, salud del feed por antigüedad del ciclo, conmutador MIL/CIV.
- Rail de módulos, paneles flotantes que nunca encogen el mapa, HUD que cede el mobiliario secundario por debajo de 1560 px, vista limpia y atajos: `Espacio` reproducir, `N` ir a ahora, flechas paso de cursor, `\` vista limpia.
- Timeline con un carril por variable operativa más la franja de iluminación. Arrastrar el cursor re-deriva el ráster del mapa y todas las lecturas.

**Densidad de esta capa:** altura de control 28 px, texto base 13 px, eyebrows mono de 9–10 px, radios de 2 px, hairlines de 1 px, `tabular-nums` en todo número, sin sombras, sin glass, sin blur, sin glow.

**Procedencia del dato — regla dura.** Es una propiedad de **cada muestra**, nunca del lado de la línea NOW: las estaciones se caen y dejan huecos en mitad del pasado, la telemetría llega con retraso, y hay variables sin estación cercana que son previsión de punta a punta. NOW marca el instante actual y nada más.

| Estado | Tratamiento | Clase |
|---|---|---|
| Observado | Relleno sólido, base continua | `.cmd-tl__prov--obs` |
| Previsto | Trama a 45°, 1 px cada 4 px | `.cmd-tl__prov--fct` |
| Sin dato | Sin relleno, base punteada | `.cmd-tl__prov--nd` |

En la procedencia **no se gasta color**: queda reservado a severidad, y el rojo sigue siendo solo alerta, de modo que un segmento que cruza el umbral puede ponerse rojo siendo observado o previsto sin ambigüedad. La trama no baja de 1/4 px porque hace muaré en pantallas de operación.

**Carriles y variables.** El canon propone visibilidad, viento, T−Td, cobertura LOS y techo; el Forecast Hub solo tiene viento. Los carriles son las variables que existen de verdad: viento, temperatura 2 m, inversión térmica y precipitación, más la franja de iluminación, que es astronomía y no necesita backend. Los umbrales operativos de `commandLanes.ts` son **provisionales** y deben revisarse con quien posee el procedimiento antes de usarse para decidir.

**Alertas y reglas.** Una regla es un predicado sobre la serie de previsión y se lee como una frase: `CUANDO <variable> <operador> <valor> DURANTE ≥ <horas> EN <punto>`. El canon usa zonas (`IN Z-03`); aquí no existen, así que la regla se evalúa donde se muestrea la serie —el centro del mapa— y lo dice, en vez de implicar zonas que no hay.

La severidad **se deriva de la antelación**, no se elige: `critical` solo cuando la ventana ya está corriendo, `warning` hasta 6 h, `advisory` más allá. Así el rojo se gasta únicamente en lo que ya está ocurriendo, y el banner rojo —la única superficie rellena de rojo del sistema— no aparece por algo que pasará pasado mañana.

Cada alerta responde a las cuatro preguntas del canon: **cuándo** (ventana y antelación), **con qué confianza** (pico alcanzado y cuánto rebasa el límite), **dónde** (el punto) y **qué hacer** (texto que aporta el operador al crear la regla; el sistema no lo inventa). Las reglas se guardan en `localStorage` a través de `commandRuleStore`; los componentes nunca tocan el almacenamiento.

**Hoy no hay observación.** El Hub no expone ningún endpoint de estaciones, así que todos los carriles se pintan como previstos y el eyebrow dice `MODELO`. El timeline afirma la verdad. Cuando exista fuente de estaciones, esas muestras pasan a `obs` y se dibujan sólidas sin rediseñar nada.

### Terrain Intelligence — pendiente

Especificada en el canon con `ui_kits/product/ti.css`; **este repo aún no la implementa**. Al abordarla, seguir sus prefijos de clase (`.nt-ti*`, `.nt-sev*`, `.nt-warn*`, `.nt-tl*`) y la misma densidad que el Command View.

## Iconografía

[Lucide](https://lucide.dev) — outline, trazo `1.5`, extremos redondeados, `currentColor`. Tamaños 16/20 en UI densa, 24 en contenido, 32–40 en hero. Sin rellenos, sin sombras.

Los iconos de dominio que no existen en Lucide (DEM, viewshed, línea de visión, sombra topográfica, vector de iluminación, exposición del terreno) están pendientes de producción y se dibujarán sobre la retícula de Lucide (24×24, 1.5 px). Hasta entonces se usan aproximaciones de Lucide.

Nunca: mezclar familias de iconos, rellenar iconos outline, ponerles sombra, usar emoji como sustituto ni dingbats Unicode.

## Anti-patrones

**Visual** — gradientes azul-morado, neón, «cyberpunk», «y2k». Cards con esquinas redondeadas y borde izquierdo de color. Tipografía display estarcida o condensada de estética militar. Camuflaje, retículas, miras, siluetas de casco. Tiras de logos «Trusted by» de clientes que no existen. Fotografía de stock de equipos sonrientes. SVG dibujados a mano, doodles. Fondos de partículas, gradientes animados. Tiers de precios SaaS, muros de checkmarks, carruseles de testimonios. Burbujas de chat flotantes, CTA pegados abajo en móvil. Cards de cristal esmerilado, sidebars translúcidas.

**Copy** — «revolucionario», «next-gen», «empoderar», «definitivo». «Estamos emocionados de…», el «nosotros» inflado de una empresa de un solo fundador. Emoji. Traducir *targeting* como *objetivos* a secas: pierde el matiz ético. Llamar «demo» a lo que es una *conversación piloto*.

**Color** — rojo donde no es alerta. CTA verdes o naranjas. Más de tres colores activos por composición. Invertir el gradiente estratigráfico. Rampas cálido→frío como decoración, sin leyenda y sin representar una variable.

## Accesibilidad

- Todo control interactivo con nombre accesible.
- Focus visible obligatorio.
- Contraste AA mínimo en texto.
- Errores de formulario con `role="alert"` o región `aria-live`.
- No depender solo del color para comunicar estado — de ahí que la severidad use peso y posición además de rojo.

## Autenticación

El flujo vive en `src/features/auth`.

- **Solo modo servidor.** No hay modo mock: `authService` habla siempre con el backend definido por `VITE_API_BASE_URL` y los `VITE_AUTH_*`.
- El `accessToken` vive **solo en memoria**, en `authSessionStore`. Nada lo persiste.
- El refresh usa cookie httpOnly del backend (`credentials: "include"`); no hay `refreshToken` en `localStorage`.
- El `AuthUser` se decodifica del payload del JWT en cliente.
- Todas las llamadas de red pasan por `apiClient`. Ante un `401` refresca una vez y reintenta.
- Nunca leer `localStorage` ni llamar a `fetch` desde un componente.
- Cualquier pantalla protegida lee sesión desde `useAuth`.

## Criterios para nuevas pantallas

Antes de dar por lista una vista:

- Compila con `npm run build`, pasa `npm run lint` y `npm run test`.
- No introduce colores, tamaños, espaciados, radios ni duraciones fuera de `tokens.scss`.
- No usa imágenes decorativas sin función.
- No convierte una herramienta en una landing.
- Todo string visible pasa por `t()`, con `en` y `es`.
- Nace dentro de una feature siguiendo `docs/FEATURE_CONVENTION.md`: `ui` decide cómo se ve, `model` cómo funciona, `api` cómo habla con servicios externos.
