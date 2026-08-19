# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Javi (dueño) y Pablo, dos amigos que llevan sus gastos personales y además comparten
algunos. Cualquiera puede registrarse, así que puede sumarse algún amigo más, pero el
producto no persigue usuarios desconocidos.

El uso real es en el móvil, con la app añadida a la pantalla de inicio, y en momentos
sueltos: se apunta un gasto justo después de hacerlo, de pie, en diez segundos.

## Product Purpose

Llevar el registro de lo que entra y lo que sale, y responder de un vistazo a **cuánto
queda libre este mes**. El propio Javi lo dijo por WhatsApp al pedirlo: «es solo pa
llevar un registro de los gastos y ver qué me sobra y qué no, y tenerlo visible ahí».

Éxito = abrir la app, apuntar algo y cerrarla sin fricción; y saber en cualquier momento
qué queda después de los fijos.

## Positioning

No es una app de presupuestos y lo es a propósito: Javi rechazó explícitamente los
presupuestos, las previsiones y las alertas («nah nah ni quiero»). Lo que la diferencia
de un Excel o de las apps de banco es que **los gastos fijos y las suscripciones se
arrastran solos al mes siguiente**, así que el mes empieza ya casi escrito, y que un
mismo libro puede llevarse entre dos personas viendo cada una quién apuntó qué.

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

Restricciones técnicas:

- React 19 + Vite + TypeScript, sin librería de componentes ni de estilos.
- Datos en PocketBase propio (`api-money.javistudio.dev`), en la VPS.
- El frontend es estático: build en GitHub Actions y `rsync` a la VPS.
- Sin conexión la app aún no arranca (pendiente).

## Brand Commitments

- **El nombre actual, «Money», se sustituye**: decisión de Javi (19/08/2026). Es
  genérico y no es defendible como marca.
- El dominio actual es `money.javistudio.dev`; con nombre nuevo se monta el subdominio
  que corresponda (hay DNS comodín y certificados automáticos, así que no es un freno).
- **JaviStudio** es el estudio y se mantiene como firma; el producto es suyo pero tiene
  nombre propio.
- El listón: que no parezca un proyecto de fin de semana. Tiene que aguantar que se
  enseñe.

## Evidence on Hand

- Conversación de WhatsApp con Pablo (19/08/2026) pidiendo login para los dos, un
  apartado para ver el ahorro mes a mes, y señalando el icono en blanco en la pantalla
  de inicio del iPhone con un «Logo?».
- La app en producción con su comportamiento real como fuente de verdad funcional.
