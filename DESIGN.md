# Design

<!-- impeccable:design-schema 1 -->

## World

**Banca moderna, la convención ejecutada en serio.** Fondo oscuro (o claro, según el
móvil), tarjetas redondeadas y elevadas, un saldo enorme arriba, una fila de botones
redondos para las acciones y listas de movimientos con su círculo de color a la
izquierda. Es el lenguaje de Revolut y no se disimula: se ejecuta a su nivel.

Elegido por Javi el 19/08/2026 **después** de ver funcionando la dirección anterior (un
espécimen tipográfico sobre papel). Aquella queda como anti-referencia: no vuelve el
papel, ni los filetes de 1px, ni la monoespaciada, ni las cifras sobre fondo blanco.
Mezclar los dos mundos sería lo peor de ambos.

El listón es Revolut: si un detalle se ve peor que allí, está mal.

## Name

**Neto.**

## Palette

Dos temas de primera clase, elegidos por `prefers-color-scheme`. Los tokens son los
mismos; cambia lo que valen.

| Token | Oscuro | Claro | Uso |
|---|---|---|---|
| `--bg` | `#0B0C0F` | `#F4F5F7` | Fondo de la app |
| `--card` | `#16181D` | `#FFFFFF` | Tarjetas |
| `--card-2` | `#1F222A` | `#EFF1F4` | Campos y superficies dentro de una tarjeta |
| `--ink` | `#FFFFFF` | `#0B0C0F` | Texto principal y cifras |
| `--muted` | `#9AA1AE` | `#606775` | Texto secundario (≥4.5:1 sobre su tarjeta) |
| `--line` | `#252932` | `#E3E6EB` | Separadores dentro de una tarjeta |
| `--accent` | `#7B61FF` | `#6B4EFF` | Acción principal, foco, activo |
| `--accent-2` | `#3E7BFA` | `#3E7BFA` | Segundo color del degradado |
| `--income` | `#2ED47A` | `#12A05C` | Dinero que entra |
| `--negative` | `#FF5C5C` | `#D93636` | Saldo en rojo |

El degradado (`--accent` → `--accent-2`, 135°) se usa en la tarjeta del saldo y en el
botón principal. En ningún caso sobre texto.

## Type

**Archivo** (variable 400–900), servida desde el propio dominio. Una sola familia:
titulares, cifras e interfaz. Tracking apretado en los tamaños grandes (`-0.03em`), y
`tabular-nums` en todo lo que sea dinero.

Sin monoespaciada: era el recurso del mundo anterior y aquí no pinta nada.

## Composition

- **Tarjetas** con `border-radius: 20px` (16px en piezas pequeñas), sin borde en oscuro y
  con sombra suave en claro. Nunca una tarjeta dentro de otra.
- **Cabecera**: «Neto», el mes y un control de cuenta. El selector de libro va solo;
  crear, compartir y entrar quedan detrás de «Más».
- **Saldo** arriba del todo, sobre la tarjeta con degradado: cifra a 3–3.5rem (lo que
  sobra ahora), y debajo, en voz baja, el sobre tras fijos. La resta del mes se abre
  en la misma tarjeta, cerrada por defecto.
- **Fila de acciones**: círculos de 3.5rem con icono y su etiqueta debajo, como los
  «Añadir dinero / Enviar / Cambiar» de cualquier banco.
- **Una lista** de movimientos del mes, cronológica, con el círculo de 2.6rem, la
  inicial del concepto y el importe a la derecha. Sin tarjetas de sección (fijos /
  suscripciones / variables) en la portada.
- Ancho de contenido máximo 560px: la app se diseña como una columna de móvil y en
  escritorio se queda centrada, como hacen las apps de banco.

## Motion

Entradas cortas y suaves, nunca rebotes: 200 ms con `cubic-bezier(0.2, 0.8, 0.2, 1)`.
La cifra del saldo se asienta al cambiar de mes; las tarjetas no se mueven. Los botones
redondos bajan un 4% al pulsarlos. Todo se desactiva con `prefers-reduced-motion`.

## Browser surfaces

Selección, cursor, foco y barras de desplazamiento se tiñen del acento en ambos temas.
`color-scheme` declarado para que los controles nativos (fechas, desplegables) salgan del
color correcto y no en blanco sobre oscuro.

## Iconography

La marca se queda: tres barras que menguan. Cambia la piel — la barra que queda pasa a
llevar el degradado de la app. Los iconos de interfaz siguen dibujados a mano en SVG con
el mismo grosor.
