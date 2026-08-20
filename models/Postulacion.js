import mongoose from 'mongoose';

const postulacionSchema = new mongoose.Schema({
  nombre: {
    type: String,
    required: true
  },
  edad: {
    type: Number
  },
  telefono: {
    type: String
  },
  email: {
    type: String
  },
  cedula: {
    type: String
  },
  altura: {
    type: String
  },
  ciudad: {
    type: String,
    default: 'San Cristóbal, Táchira'
  },
  categoria: {
    type: String,
    default: 'Nuevos Talentos'
  },
  nombreRepresentante: {
    type: String
  },
  emailRepresentante: {
    type: String
  },
  telefonoRepresentante: {
    type: String
  },
  cedulaRepresentante: {
    type: String
  },
  estado: {
    type: String,
    default: 'pendiente'
  },
  fotoUrl: {
    type: String,
    default: ''
  },
  videoUrl: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

const Postulacion = mongoose.model('Postulacion', postulacionSchema);

export default Postulacion;
