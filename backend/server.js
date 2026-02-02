// backend/server.js

const dotenv = require('dotenv');
const mongoose = require('mongoose');
const { app } = require('./app');

// Cargar variables de entorno del archivo .env
dotenv.config();

const PORT = process.env.PORT || 5000;

// --- CONEXIÓN A MONGO DB ---
async function connectToDatabase(uri) {
  try {
    await mongoose.connect(uri);
    console.log('✅ Conectado a MongoDB Atlas');
  } catch (err) {
    console.error('❌ Error de conexión a MongoDB:', err);
    throw err;
  }
}

// --- INICIAR SERVIDOR (solo si se ejecuta directamente) ---
if (require.main === module) {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    console.error('❌ MONGO_URI no está definido en las variables de entorno');
    process.exit(1);
  }

  connectToDatabase(mongoUri)
    .then(() => {
      app.listen(PORT, () => {
        console.log(`📡 Servidor de API corriendo en http://localhost:${PORT}`);
      });
    })
    .catch(() => {
      // El error ya fue logueado en connectToDatabase
      process.exit(1);
    });
}

module.exports = { app, connectToDatabase };
