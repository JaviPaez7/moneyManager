# Neto

Lo que te queda cada mes, sin adornos. Control de ingresos, gastos fijos, suscripciones, variables y ahorro. Los fijos se
arrastran al mes siguiente.

Los datos viven en un PocketBase propio (`api-neto.javistudio.dev`) detrás de
login. Todo cuelga de un **libro de cuentas**: con un miembro es una cuenta
personal, con varios es compartida y los dos ven y apuntan lo mismo.

## Backend

| Pieza | Dónde |
|---|---|
| API y auth | PocketBase en `/opt/money-api` (VPS), volumen `money-api_pb_data` |
| Panel | https://api-neto.javistudio.dev/_/ |
| Identidad | `DESIGN.md`; iconos e imagen social con `node infra/icons.mjs` |
| Esquema | `infra/pb-schema.mjs` (idempotente) |
| Alta de cuentas | Desde la propia app; `infra/pb-user.mjs` para hacerlo a dedo |
| Correo | SMTP de PocketBase → Resend, la misma cuenta que Citaly, DanceFloor y Tanke |
| Remitente | `Neto <no-reply@mail.javistudio.dev>`; el dominio ya estaba verificado |

Quien olvida su contraseña pide un enlace desde la propia pantalla de entrada.
El correo lo manda PocketBase con la plantilla de `infra/pb-schema.mjs`, y el
enlace lleva a la app (`/#/recuperar/TOKEN`, en el hash para que el nginx que
sirve el sitio no tenga que saberse ninguna ruta) y vale media hora. **Hace falta
tener el SMTP puesto en PocketBase**: sin él la petición falla y no sale nada.

El registro es abierto: cualquiera puede crearse una cuenta desde la pantalla
de entrada. Cada cuenta arranca con su libro personal y no ve nada de nadie:
ni libros, ni movimientos, ni siquiera la lista de quién más usa la app (solo
se ve a uno mismo y a quien comparta algún libro contigo).

## Compartir un libro

Cada libro tiene un **código** de seis caracteres. El dueño lo pasa por donde
quiera y el otro lo pega en "Entrar con un código". Las reglas del servidor
hacen el trabajo:

- Un libro solo se puede leer si eres miembro **o** si mandas su código exacto
  en la petición (`?code=...`). No hay forma de listar libros ajenos ni de ir
  probando códigos a ciegas.
- Por la puerta del código la lista de miembros solo puede **crecer**: sirve
  para entrar y para nada más. Nadie usa una invitación para echar al dueño,
  quedarse el libro ni renombrarlo.
- Solo el dueño saca gente o cambia el código. Cambiarlo invalida el anterior,
  que es la salida si un código se va de las manos.

Ojo con lo que el código sí concede: quien entra ve y edita **todo** ese libro,
como cualquier otro miembro. Es la llave de ese libro, trátalo como tal.

## Comprobar

Los cálculos del dinero y la clasificación automática tienen tests; se corren
con el `node --test` que ya trae Node, sin runner aparte. En cada push se pasan
antes de construir, así que un test en rojo no llega a producción.

```bash
npm test
```

```bash
# actualizar el esquema tras tocar infra/pb-schema.mjs
PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... node infra/pb-schema.mjs

# dar de alta a alguien a dedo (o cambiarle la contraseña)
PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... node infra/pb-user.mjs correo@x.com "contraseña" "Nombre"
```

Las credenciales del panel están en `/opt/money-api/.env` en la VPS (fuera de git).

Live: https://neto.javistudio.dev
