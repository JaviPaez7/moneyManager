const request = require('supertest');
const mongoose = require('mongoose');

const { app, Transaction } = require('../app');
const { connectToDatabase } = require('../server');

// --- TEST 1: Conexión exitosa a MongoDB Atlas ---
describe('MongoDB Atlas connection', () => {
  it('should call mongoose.connect with the provided URI and log success message', async () => {
    const mongoUri = 'mongodb+srv://user:pass@cluster/testdb';

    // Mock de mongoose.connect
    const connectMock = jest
      .spyOn(mongoose, 'connect')
      .mockResolvedValueOnce({});

    // Mock de console.log
    const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {});

    await connectToDatabase(mongoUri);

    expect(connectMock).toHaveBeenCalledWith(mongoUri);
    expect(consoleLogSpy).toHaveBeenCalledWith('✅ Conectado a MongoDB Atlas');

    connectMock.mockRestore();
    consoleLogSpy.mockRestore();
  });
});

// --- TESTS DE ENDPOINTS ---
describe('Transactions API', () => {
  beforeEach(() => {
    // Limpiar y configurar mocks en cada prueba
    jest.clearAllMocks();

    Transaction.find = jest.fn();
    Transaction.findByIdAndDelete = jest.fn();
    Transaction.findByIdAndUpdate = jest.fn();

    // Mock genérico para save en documentos nuevos
    Transaction.prototype.save = jest.fn();
  });

  // 2. Crear nueva transacción vía POST /api/transactions
  it('should create a new transaction with valid data (POST /api/transactions)', async () => {
    const newTransactionData = {
      description: 'Salary',
      amount: 3000,
      category: 'Income',
      type: 'income',
      date: new Date().toISOString(),
    };

    const savedTransaction = {
      _id: 'tx123',
      ...newTransactionData,
    };

    Transaction.prototype.save.mockResolvedValueOnce(savedTransaction);

    const response = await request(app)
      .post('/api/transactions')
      .send(newTransactionData)
      .expect(201);

    expect(Transaction.prototype.save).toHaveBeenCalledTimes(1);
    expect(response.body).toMatchObject(savedTransaction);
  });

  // 3. Obtener todas las transacciones en orden descendente por fecha
  it('should return all transactions in descending order of date (GET /api/transactions)', async () => {
    const transactions = [
      {
        _id: 'tx2',
        description: 'Groceries',
        amount: 50,
        category: 'Food',
        type: 'expense',
        date: new Date('2024-02-02').toISOString(),
      },
      {
        _id: 'tx1',
        description: 'Salary',
        amount: 3000,
        category: 'Income',
        type: 'income',
        date: new Date('2024-02-01').toISOString(),
      },
    ];

    const sortMock = jest.fn().mockResolvedValueOnce(transactions);
    Transaction.find.mockReturnValueOnce({ sort: sortMock });

    const response = await request(app)
      .get('/api/transactions')
      .expect(200);

    expect(Transaction.find).toHaveBeenCalledTimes(1);
    expect(sortMock).toHaveBeenCalledWith({ date: -1 });
    expect(response.body).toEqual(expect.arrayContaining(transactions));
    expect(response.body[0]._id).toBe('tx2');
    expect(response.body[1]._id).toBe('tx1');
  });

  // 4. Eliminar una transacción vía DELETE /api/transactions/:id
  it('should delete a transaction and return a success message (DELETE /api/transactions/:id)', async () => {
    const transactionId = 'tx123';

    Transaction.findByIdAndDelete.mockResolvedValueOnce({ _id: transactionId });

    const response = await request(app)
      .delete(`/api/transactions/${transactionId}`)
      .expect(200);

    expect(Transaction.findByIdAndDelete).toHaveBeenCalledWith(transactionId);
    expect(response.body).toMatchObject({
      message: 'Transacción eliminada con éxito',
      deletedId: transactionId,
    });
  });

  // 5. Actualizar una transacción vía PUT /api/transactions/:id
  it('should update a transaction and return the updated transaction (PUT /api/transactions/:id)', async () => {
    const transactionId = 'tx123';
    const updateData = {
      description: 'Updated description',
      amount: 100,
      category: 'Updated category',
      type: 'expense',
    };

    const updatedTransaction = {
      _id: transactionId,
      ...updateData,
      date: new Date().toISOString(),
    };

    Transaction.findByIdAndUpdate.mockResolvedValueOnce(updatedTransaction);

    const response = await request(app)
      .put(`/api/transactions/${transactionId}`)
      .send(updateData)
      .expect(200);

    expect(Transaction.findByIdAndUpdate).toHaveBeenCalledWith(
      transactionId,
      updateData,
      { new: true, runValidators: true }
    );
    expect(response.body).toMatchObject(updatedTransaction);
  });
});
