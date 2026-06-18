# Neural Terrena Console Design

Este documento es la referencia de diseño para nuevos desarrollos de la aplicación. Extiende el canon del design system raíz y lo aterriza en una consola de producto: densa, sobria y preparada para operación.

## Principios

- La interfaz debe parecer una herramienta de trabajo, no una landing ni una pieza comercial.
- El terreno, la visibilidad, el tiempo y el estado operacional son el centro. La marca acompaña sin gritar.
- El color comunica estado o jerarquía. No se usa como decoración.
- Las pantallas deben ser escaneables, con densidad controlada y sin ornamento innecesario.
- El copy debe ser preciso, sereno y técnico. Evitar hype, claims genéricos y lenguaje SaaS inflado.

## Stack visual

- React con componentes funcionales, TypeScript estricto y composición por features.
- CSS global con tokens y clases semánticas. Evitar estilos inline salvo para valores dinámicos inevitables.
- Iconografía con `lucide-react`, trazo `1.5` o `1.75`, sin rellenos ni sombras.
- Inter local para toda la UI. No usar Helvetica en superficies web o app.

## Tokens base

Los tokens viven en `src/styles/tokens.css` y deben conservar estos valores:

| Token | Valor | Uso |
|---|---:|---|
| `--nt-color-yellow` | `#F9B233` | iluminación, capa cálida, acento grande |
| `--nt-color-orange` | `#E85D2F` | advertencia, capa intermedia |
| `--nt-color-red` | `#C62828` | error, riesgo, alerta |
| `--nt-color-blue` | `#1E4F82` | acción primaria, institución, foco |
| `--nt-color-black` | `#1A1A1A` | texto, superficies oscuras |
| `--nt-bg-subtle` | `#F6F6F6` | fondos de app y separadores |

Reglas:

- Azul es el único color para acciones primarias.
- Rojo se reserva para errores y estados críticos.
- Amarillo y naranja no deben usarse como texto pequeño sobre blanco.
- Máximo tres colores activos por pantalla, además de blanco, negro y grises.

## Layout

- Base de espaciado: `8px`.
- Radios: `0`, `2px`, `4px`, `8px`. El valor por defecto para inputs, botones y cards es `4px`.
- Cards: fondo blanco, borde `1px` gris, sin sombra por defecto.
- No anidar cards dentro de cards.
- Las vistas operativas usan barras laterales, cabeceras compactas, tablas, paneles y listas. Evitar heroes.
- En móvil, las herramientas se apilan sin ocultar acciones principales.

## Componentes

### Botones

- Altura recomendada: `44px` o `48px`.
- Usar icono + texto en acciones importantes.
- Hover: oscurecer azul a `#163E68`, sin escala ni desplazamiento.
- Focus visible siempre con outline azul.

### Inputs

- Label visible siempre.
- Borde gris, fondo blanco, radio `4px`.
- Error con borde rojo y mensaje breve.
- Los campos de credenciales usan `autocomplete` correcto.

### Estados

- Loading: texto concreto de acción, por ejemplo `Validando`.
- Error: explicar el bloqueo sin culpar al usuario.
- Vacío: indicar el estado de sistema y la siguiente acción disponible.
- Éxito: mostrar el cambio de estado, no celebraciones.

## Autenticación

El flujo vive en `src/features/auth`.

- El modo `mock` permite desarrollo local con `admin/admin`.
- El modo `server` hace `POST` al endpoint definido por `VITE_API_BASE_URL` y `VITE_AUTH_LOGIN_PATH`.
- La app espera JWT Bearer (`accessToken`) y mantiene el token de acceso solo en memoria.
- El `refreshToken` se persiste y se usa tanto al recargar la app como tras un `401`.
- El storage está encapsulado en `authStorage`; no acceder a `localStorage` desde componentes.
- Las llamadas al backend deben hacerse a través de `apiClient`.
- Cualquier nueva pantalla protegida debe leer sesión desde `useAuth`.

## Copy UI

- Idioma inicial: español técnico-profesional.
- Usar `Neural Terrena` en texto y `neural terrena` solo para el wordmark.
- Mantener `Terrain Intelligence` en inglés.
- Acrónimos canónicos: `HADR`, `CIP`, `LOS`, `DEM`, `C-UAS`.
- Evitar: revolucionario, next-gen, all-in-one, transformar, empoderar.

## Accesibilidad

- Todo control interactivo debe tener nombre accesible.
- Focus visible obligatorio.
- Contraste AA mínimo en texto.
- Errores de formulario con `role="alert"` o región `aria-live`.
- No depender solo de color para comunicar estado.

## Criterios para nuevas pantallas

Antes de dar por lista una vista:

- Compila con `npm run build`.
- Pasa `npm run lint` y `npm run test`.
- No introduce nuevos colores fuera de tokens.
- No usa imágenes genéricas o decorativas sin función.
- No convierte una herramienta en una landing.
