const mongoose = require("mongoose");
const dotenv = require("dotenv");
const app = require("./app"); // Importamos la configuración de app.js

dotenv.config();

const PORT = process.env.PORT || 5000;
const mongoUri = process.env.MONGO_URI;

// Función para conectar a la DB (exportable para tests si fuera necesario)
const connectToDatabase = async () => {
  if (!mongoUri) {
    console.error("❌ ERROR: No se encuentra la variable MONGO_URI en .env");
    process.exit(1);
  }

  try {
    await mongoose.connect(mongoUri);
    console.log("✅ Conectado a MongoDB Atlas");
  } catch (error) {
    console.error("❌ Error conectando a DB:", error);
    process.exit(1);
  }
};

// Solo arrancamos el servidor si este archivo se ejecuta directamente
// (Esto evita que los tests intenten abrir el puerto 5000 dos veces)
if (require.main === module) {
  connectToDatabase().then(() => {
    app.listen(PORT, () => {
      console.log(`📡 Servidor corriendo en http://localhost:${PORT}`);
    });
  });
}

module.exports = { connectToDatabase };
