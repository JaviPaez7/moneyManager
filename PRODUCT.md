# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Javi (dueño) y Pablo, dos amigos que llevan sus gastos personales y además comparten
algunos. Cualquiera puede registrarse, así que puede sumarse algún amigo más, pero el
producto no persigue usuarios desconocidos.

**Desde el 20/08/2026 también lo usa la hermana de Javi**, con su libro personal y sin
compartir nada con nadie. Importa porque cambia quién es el usuario típico: ya no son
solo dos amigos que hablan entre ellos y con quien hizo la app. Alguien que se queda
fuera no tiene a quién preguntar, así que la app tiene que saber decir por sí sola qué
ha pasado. De ahí salieron las dos decisiones de abajo, del 30/08/2026.

El uso real es en el móvil, con la app añadida a la pantalla de inicio, y en momentos
sueltos: se apunta un gasto justo después de hacerlo, de pie, en diez segundos.

## Product Purpose

Llevar el registro de lo que entra y lo que sale, y responder de un vistazo a **cuánto
queda ahora este mes** — ya descontados fijos, variables y lo apartado. El propio Javi
lo dijo por WhatsApp al pedirlo: «es solo pa llevar un registro de los gastos y ver
qué me sobra y qué no, y tenerlo visible ahí».

Éxito = abrir la app, apuntar algo y cerrarla sin fricción; y saber en cualquier momento
qué te sobra. Lo que quedaba después de los fijos se ve debajo, como el sobre del mes,
no como la cifra grande.

## Positioning

Lo que la diferencia de un Excel o de las apps de banco es que **los gastos fijos y las
suscripciones se arrastran solos al mes siguiente**, así que el mes empieza ya casi
escrito, y que un mismo libro puede llevarse entre dos personas viendo cada una quién
apuntó qué.

**Sobre los presupuestos (19/08/2026):** al pedir la app Javi los rechazó de plano
(«nah nah ni quiero»), y ese rechazo estuvo escrito aquí. Ese mismo día pidió lo
contrario: poder poner un tope por categoría —250 € de ocio este mes— y verlo
descontarse. Se hace, pero acotado a eso: **un tope y lo que queda**. Nada de
previsiones, avisos, notificaciones ni recomendaciones; eso sigue fuera y es lo que
mantiene la app siendo un registro y no un cuadro de mandos.

**Sobre la sesión (30/08/2026):** duraba cinco días, el valor de fábrica de PocketBase,
y eso echaba fuera a quien no abría la app una semana — que es exactamente cómo se usa
esto, «en momentos sueltos». Pasa a **90 días**. El listón es una app de banco en la
pantalla de inicio: no te echa cada semana. Lo que concede la sesión es ver y apuntar en
libros propios, no mueve dinero ni guarda medios de pago, así que 90 días es
proporcionado; quien quiera cortarla tiene el botón de salir.

Se descubrió por las malas: al caducar, la app no llevaba a la pantalla de entrada, se
quedaba dentro sin sesión. Y como PocketBase no da error al listar sin sesión —devuelve
la lista vacía— la app creía que la cuenta no tenía libros e intentaba crearle uno,
que sí choca contra la regla. Resultado: «Los datos no son válidos» encima de unas
cuentas intactas, sin forma de salir de ahí. Arreglado el mismo día.

**Sobre recuperar la contraseña (30/08/2026):** hasta ahora no había ninguna forma. Quien
olvidaba la suya quedaba fuera para siempre, y lo único que ofrecía la app era «créate una
cuenta», que tampoco vale porque el correo ya está cogido. Se añade el enlace por correo.
Es el mínimo para que la app se sostenga sola sin que Javi tenga que tocar la base de
datos por cada olvido.

## Operating Context

- Móvil, en la calle, con una mano, a menudo con mala cobertura.
- Dinero en euros, interfaz en español de España.
- Un «libro de cuentas» por contexto: el personal de cada uno y el compartido.
- Los libros se comparten pasando un código de seis caracteres, normalmente por WhatsApp.

## Capabilities and Constraints

Funciona hoy:

- Ingresos, gastos (fijos, suscripciones, variables con categorías) y ahorro por botes.
- Los fijos y las suscripciones se materializan solos cada mes; se pueden parar o saltar.
- Clasificación automática de la sección y la categoría a partir de lo que escribes.
- Libros personales y compartidos, con código de invitación y miembros.
- Editar y borrar movimientos; sacar dinero de un bote.
- Apartado «mes a mes» con lo ahorrado y lo que sobró en cada mes.
- Cuentas con registro abierto; los correos no se ven entre usuarios.
- Tope por categoría: se pone un máximo al mes y se ve lo que queda.
- Abre sin cobertura y enseña lo último que vio, avisando de que no hay red.
- La sesión guardada en el móvil dura 90 días, y al caducar lleva a la pantalla de
  entrada, no a un error.
- «No me acuerdo de la contraseña»: se pide un enlace por correo y se pone otra.

Restricciones técnicas:

- React 19 + Vite + TypeScript, sin librería de componentes ni de estilos.
- Datos en PocketBase propio (`api-neto.javistudio.dev`), en la VPS.
- El frontend es estático: build en GitHub Actions y `rsync` a la VPS.
- Sin conexión se lee, pero no se apunta: no hay cola de escrituras (pendiente).
- El correo sale por el SMTP configurado en PocketBase. Sin él no hay forma de recuperar
  la contraseña: es la única pieza del producto que depende de un servicio de fuera.

## Brand Commitments

- **El producto se llama «Neto»** desde el 19/08/2026. El nombre anterior, «Money», se
  descartó por decisión de Javi: genérico y no defendible como marca.
- El dominio es `neto.javistudio.dev` (API en `api-neto.javistudio.dev`).
  `money.javistudio.dev` se retiró sin redirección, también por decisión suya. Por dentro
  quedan restos del nombre viejo que no se tocan a propósito: el backend vive en
  `/opt/money-api` y las claves de `localStorage` siguen siendo `moneymanager.*`, porque
  renombrarlas borraría la caché y la migración de quien ya tiene datos.
- **JaviStudio** es el estudio y se mantiene como firma; el producto es suyo pero tiene
  nombre propio.
- El listón: que no parezca un proyecto de fin de semana. Tiene que aguantar que se
  enseñe.
- **Preferencia declarada (19/08/2026): la app debe parecerse a Revolut.** Javi la eligió
  después de ver funcionando una dirección propia y distinta, así que es una decisión
  informada, no un descarte por pereza. El listón de acabado es Revolut: si algo se ve
  peor que allí, está mal. Los dos modos, claro y oscuro, son de primera clase y siguen
  al sistema del móvil.

## Evidence on Hand

- Conversación de WhatsApp con Pablo (19/08/2026) pidiendo login para los dos, un
  apartado para ver el ahorro mes a mes, y señalando el icono en blanco en la pantalla
  de inicio del iPhone con un «Logo?».
- La app en producción con su comportamiento real como fuente de verdad funcional.
