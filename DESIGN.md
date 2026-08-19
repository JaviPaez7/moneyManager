# Design

<!-- impeccable:design-schema 1 -->

## World

**Espécimen tipográfico.** La pantalla es una hoja de papel casi blanca donde manda un
solo número: lo que queda este mes, a tamaño de titular. Todo lo demás es letra de
máquina diminuta. La jerarquía se hace **solo con escala**, no con cajas, sombras ni
colores de fondo. Nada flota: lo único que separa unas cosas de otras son filetes de 1px
y aire.

El origen es el espécimen de una fundición tipográfica: una letra gigantesca, una rejilla
de datos debajo y las etiquetas técnicas en monoespaciada. Encaja con el producto porque
el trabajo del usuario es leer una cifra de un vistazo, con una mano, a menudo a plena
luz de la calle.

Elegido por Javi el 19/08/2026 frente a otras tres direcciones. Sustituye al mundo
anterior (verde azulado con serif Fraunces y tarjetas con sombra), que queda como
anti-referencia: **ninguna tarjeta vuelve**.

## Name

**Neto.** Lo que queda una vez descontado todo. Sustituye a «Money» por decisión de Javi.

## Palette

| Token | Valor | Uso |
|---|---|---|
| `--paper` | `#FAFAF8` | Fondo de la hoja |
| `--surface` | `#FFFFFF` | Campos y superficies que reciben escritura |
| `--ink` | `#101010` | Texto principal y cifras |
| `--muted` | `#6E6E68` | Etiquetas y texto secundario (4.8:1 sobre papel) |
| `--rule` | `#E2E2DC` | Filetes de 1px |
| `--accent` | `#0033FF` | Azul de fundición: foco, mes activo, acción principal |
| `--negative` | `#D50000` | Solo cifras en rojo |

El azul no decora: marca dónde estás y qué acción es la principal. Nunca se usa como
fondo de bloques grandes ni como degradado.

Solo modo claro, y es una decisión: se usa en la calle, de día, con el móvil en una mano;
el contraste alto gana al ambiente. Un modo oscuro llegaría como sistema completo, no
como inversión de colores.

## Type

- **Archivo** (variable 400–900), servida desde el propio dominio. Titulares, cifra
  principal e interfaz. Carácter ancho y estable a tamaños enormes.
- **IBM Plex Mono** (400/500), servida desde el propio dominio. Etiquetas, fechas,
  códigos e **importes de las filas**: es monoespaciada porque son medidas, no porque
  quede «técnico».
- Escala: cifra del mes hasta 6rem con `-0.035em`; etiquetas mono a 0.72rem con
  `0.08em` y caja alta; texto corriente 1rem.
- Todas las cifras con `font-variant-numeric: tabular-nums`, para que las columnas de
  importes cuadren y no bailen al cambiar de mes.

## Composition

- Una columna en el móvil; en pantalla ancha, la hoja se reparte en dos con la cifra y el
  resumen a la izquierda y el formulario a la derecha. Ancho máximo de lectura contenido.
- Los bloques se separan por aire y por filetes horizontales. **Sin tarjetas, sin
  sombras, sin esquinas redondeadas grandes.**
- Las filas de importes son pares etiqueta/cifra con la cifra alineada a la derecha.
- Nada de rótulos por encima de un titular: el titular se explica solo, y la frase que lo
  aclara va debajo y en voz baja.

## Motion

Un solo momento con autoría: al cambiar de mes, la cifra entra desplazada y se asienta
(180 ms, `cubic-bezier(0.16, 1, 0.3, 1)`), en la dirección del mes al que vas. El resto
de la interfaz no se mueve. Con `prefers-reduced-motion` no hay desplazamiento.

## Browser surfaces

Selección de texto, cursor de escritura, anillo de foco, barras de desplazamiento y
subrayados se tiñen de la paleta. Ninguna superficie del navegador se queda con el gris
de fábrica.

## Iconography

Marca y símbolos dibujados a mano en SVG, con el mismo grosor y radios. Tres barras que
menguan: lo que entra, lo que sale y lo que queda.
