import mongoose from 'mongoose';

const pagoSchema = new mongoose.Schema({
  nombreModelo: {
    type: String,
    required: true
  },
  monto: {
    type: Number,
    required: true
  },
  referencia: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  },
  estado: {
    type: String,
    default: 'pendiente'
  }
}, {
  timestamps: true
});

const Pago = mongoose.model('Pago', pagoSchema);

export default Pago;
