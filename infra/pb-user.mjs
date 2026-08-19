/**
 * Alta de cuentas en Money a dedo. Normalmente no hace falta: cualquiera puede
 * registrarse desde la propia app. Esto sirve para crear una cuenta a alguien
 * o para cambiarle la contraseña desde fuera.
 *
 *   PB_ADMIN_EMAIL=... PB_ADMIN_PASSWORD=... \
 *   node infra/pb-user.mjs pablo@ejemplo.com "contraseña" "Pablo"
 *
 * Si la cuenta ya existe le cambia la contraseña y el nombre.
 */

const PB_URL = (process.env.PB_URL || "https://api-money.javistudio.dev").replace(/\/$/, "");
const [email, password, name] = process.argv.slice(2);

if (!email || !password) {
  console.error("Uso: node infra/pb-user.mjs <email> <contraseña> [nombre]");
  process.exit(1);
}
if (password.length < 8) {
  console.error("La contraseña necesita 8 caracteres como mínimo.");
  process.exit(1);
}

let token = "";

async function api(path, init = {}) {
  const res = await fetch(`${PB_URL}${path}`, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...(token ? { authorization: token } : {}),
      ...(init.headers || {}),
    },
  });
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    throw new Error(`${init.method || "GET"} ${path} → ${res.status}\n${JSON.stringify(body, null, 2)}`);
  }
  return body;
}

const auth = await api(`/api/collections/_superusers/auth-with-password`, {
  method: "POST",
  body: JSON.stringify({
    identity: process.env.PB_ADMIN_EMAIL,
    password: process.env.PB_ADMIN_PASSWORD,
  }),
});
token = auth.token;

const found = await api(
  `/api/collections/users/records?filter=${encodeURIComponent(`email="${email}"`)}`,
);
const payload = {
  email,
  password,
  passwordConfirm: password,
  name: name || email.split("@")[0],
  emailVisibility: false,
  verified: true,
};

if (found.items.length > 0) {
  await api(`/api/collections/users/records/${found.items[0].id}`, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
  console.log(`~ actualizada la cuenta de ${email}`);
} else {
  await api(`/api/collections/users/records`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
  console.log(`+ creada la cuenta de ${email}`);
}
