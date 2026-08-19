# Money

Control de ingresos, gastos fijos, suscripciones, variables y ahorro. Los fijos se
arrastran al mes siguiente.

Los datos viven en un PocketBase propio (`api-money.javistudio.dev`) detrás de
login. Todo cuelga de un **libro de cuentas**: con un miembro es una cuenta
personal, con varios es compartida y los dos ven y apuntan lo mismo.

## Backend

| Pieza | Dónde |
|---|---|
| API y auth | PocketBase en `/opt/money-api` (VPS), volumen `money-api_pb_data` |
| Panel | https://api-money.javistudio.dev/_/ |
| Esquema | `infra/pb-schema.mjs` (idempotente) |
| Alta de cuentas | Desde la propia app; `infra/pb-user.mjs` para hacerlo a dedo |

El registro es abierto: cualquiera puede crearse una cuenta desde la pantalla
de entrada. Los correos no se muestran entre usuarios (`emailVisibility` en
falso), para que nadie pueda cosechar direcciones registrándose. Cada cuenta
arranca con su libro personal y no ve nada de los demás hasta que alguien la
mete en un libro compartido.

```bash
# actualizar el esquema tras tocar infra/pb-schema.mjs
PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... node infra/pb-schema.mjs

# dar de alta a alguien a dedo (o cambiarle la contraseña)
PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... node infra/pb-user.mjs correo@x.com "contraseña" "Nombre"
```

Las credenciales del panel están en `/opt/money-api/.env` en la VPS (fuera de git).

Live: https://money.javistudio.dev
