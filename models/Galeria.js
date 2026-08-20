import mongoose from 'mongoose';

const galeriaSchema = new mongoose.Schema({
  titulo: {
    type: String,
    default: 'Sin título'
  },
  categoria: {
    type: String,
    default: 'General'
  },
  tipo: {
    type: String,
    default: 'foto'
  },
  url: {
    type: String,
    required: true
  },
  fecha: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Galeria = mongoose.model('Galeria', galeriaSchema);

export default Galeria;
