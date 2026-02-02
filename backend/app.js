const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const app = express();

// --- MIDDLEWARE ---
app.use(cors());
app.use(express.json());

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
    res.status(201).json(savedTransaction);
  } catch (error) {
    res.status(400).json({ message: 'Datos de transacción inválidos', error: error.message });
  }
});

// 3. ELIMINAR UNA TRANSACCIÓN (DELETE /api/transactions/:id)
app.delete('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const deletedTransaction = await Transaction.findByIdAndDelete(id);

    if (!deletedTransaction) {
      return res.status(404).json({ message: 'Transacción no encontrada' });
    }

    res.status(200).json({ message: 'Transacción eliminada con éxito', deletedId: id });
  } catch (error) {
    res.status(500).json({ message: 'Error al eliminar la transacción', error: error.message });
  }
});

// 4. ACTUALIZAR UNA TRANSACCIÓN (PUT /api/transactions/:id)
app.put('/api/transactions/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedTransaction) {
      return res.status(404).json({ message: 'Transacción no encontrada para actualizar' });
    }

    res.status(200).json(updatedTransaction);
  } catch (error) {
    res.status(400).json({ message: 'Datos de actualización inválidos', error: error.message });
  }
});

module.exports = { app, Transaction };
