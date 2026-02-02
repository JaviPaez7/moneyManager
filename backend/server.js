// backend/server.js

const express = require('express');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const cors = require('cors');

// Cargar variables de entorno del archivo .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// --- MIDDLEWARE ---
// Permite que el frontend (React) acceda a la API
app.use(cors()); 
// Permite que la API reciba datos JSON
app.use(express.json()); 

// --- CONEXIÓN A MONGO DB ---
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Conectado a MongoDB Atlas'))
  .catch(err => console.error('❌ Error de conexión a MongoDB:', err));

// --- MODELO DE DATOS (SCHEMA) ---
const transactionSchema = new mongoose.Schema({
  description: { type: String, required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  type: { type: String, enum: ['income', 'expense'], required: true }, 
  date: { type: Date, default: Date.now }
});
const Transaction = mongoose.model('Transaction', transactionSchema);

// --- RUTAS DE LA API (ENDPOINTS) ---

// 1. OBTENER TODAS LAS TRANSACCIONES (GET /api/transactions)
app.get('/api/transactions', async (req, res) => {
  try {
    // Busca todas las transacciones y las ordena por fecha de forma descendente (-1)
    const transactions = await Transaction.find().sort({ date: -1 });
    res.status(200).json(transactions);
  } catch (error) {
    res.status(500).json({ message: 'Error al obtener transacciones' });
  }
});

// 2. CREAR UNA NUEVA TRANSACCIÓN (POST /api/transactions)
app.post('/api/transactions', async (req, res) => {
  try {
    const newTransaction = new Transaction(req.body);
    const savedTransaction = await newTransaction.save();
    // 201 Created: Indica que el recurso fue creado con éxito
    res.status(201).json(savedTransaction); 
  } catch (error) {
    res.status(400).json({ message: 'Datos de transacción inválidos', error: error.message });
  }
});

// Nota: Faltan las rutas para PUT (Actualizar) y DELETE (Eliminar)

// --- INICIAR SERVIDOR ---
app.listen(PORT, () => {
  console.log(`📡 Servidor de API corriendo en http://localhost:${PORT}`);
});

// backend/server.js (Añade esto al final de la sección de Rutas)

// 3. ELIMINAR UNA TRANSACCIÓN (DELETE /api/transactions/:id)
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    // req.params.id obtiene el ID de la URL
    const { id } = req.params; 
    
    // Busca y elimina el documento por su ID
    const deletedTransaction = await Transaction.findByIdAndDelete(id);

    if (!deletedTransaction) {
      return res.status(404).json({ message: 'Transacción no encontrada' });
    }

    // 200 OK: Devuelve la transacción que fue eliminada
    res.status(200).json({ message: 'Transacción eliminada con éxito', deletedId: id }); 
    
  } catch (error) {
    // Si el ID no tiene el formato correcto (ej: no tiene 24 caracteres), Mongoose lanza un error
    res.status(500).json({ message: 'Error al eliminar la transacción', error: error.message });
  }
});

// backend/server.js (Añade esta ruta al final de la sección de Rutas)

// 4. ACTUALIZAR UNA TRANSACCIÓN (PUT /api/transactions/:id)
app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params; 
    const updateData = req.body; // Los datos actualizados (descripción, monto, categoría, etc.)

    // Mongoose: Busca la transacción por ID y la actualiza.
    // { new: true } asegura que Mongoose devuelva el DOCUMENTO ACTUALIZADO
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true } // runValidators: asegura que las reglas del esquema (ej: 'amount' sea número) se apliquen.
    );

    if (!updatedTransaction) {
      // Si el ID es válido pero no se encuentra el documento
      return res.status(404).json({ message: 'Transacción no encontrada para actualizar' });
    }

    // 200 OK: Devuelve la transacción ya actualizada
    res.status(200).json(updatedTransaction); 
    
  } catch (error) {
    // Manejo de errores de validación de Mongoose (ej: si se envía un string donde debe ir un número)
    res.status(400).json({ message: 'Datos de actualización inválidos', error: error.message });
  }
});
