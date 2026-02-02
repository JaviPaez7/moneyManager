const express = require("express");
const cors = require("cors");
const transactionRoutes = require("./routes/transactions");

const app = express();

// --- MIDDLEWARES ---
app.use(cors());
app.use(express.json());

// --- RUTAS ---
// Asegúrate de que tu archivo de rutas esté en backend/routes/transactions.js
app.use("/api/transactions", transactionRoutes);

// Exportamos la app configurada (sin app.listen)
module.exports = app;
