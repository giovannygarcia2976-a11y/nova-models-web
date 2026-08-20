import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

import Postulacion from './models/Postulacion.js';
import Pago from './models/Pago.js';
import Galeria from './models/Galeria.js';

// Cargar variables de entorno desde el archivo .env
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middlewares
app.use(cors());
app.use(express.json());

// Configurar Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configurar almacenamiento con Multer y Cloudinary
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    const isVideo = file.mimetype.startsWith('video') || file.originalname.match(/\.(mp4|mov|avi|webm|mkv)$/i);
    return {
      folder: 'nova_models_media',
      resource_type: isVideo ? 'video' : 'image',
      allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'mov', 'avi', 'mkv', 'webm']
    };
  }
});

const upload = multer({ storage: storage });

// Función auxiliar para extraer el public_id y resource_type de una URL de Cloudinary
const getCloudinaryInfoFromUrl = (url) => {
  if (!url || typeof url !== 'string' || !url.includes('cloudinary.com')) return null;
  try {
    const isVideo = url.includes('/video/upload/');
    const resourceType = isVideo ? 'video' : 'image';

    const uploadIndex = url.indexOf('/upload/');
    if (uploadIndex === -1) return null;

    let pathAfterUpload = url.substring(uploadIndex + '/upload/'.length);
    // Eliminar versión si existe (ej. v1723580000/)
    pathAfterUpload = pathAfterUpload.replace(/^v\d+\//, '');

    // Eliminar extensión de archivo (.jpg, .png, .mp4, etc.)
    const dotIndex = pathAfterUpload.lastIndexOf('.');
    const publicId = dotIndex !== -1 ? pathAfterUpload.substring(0, dotIndex) : pathAfterUpload;

    return { publicId, resourceType };
  } catch (err) {
    console.error('Error al extraer public_id de Cloudinary:', err);
    return null;
  }
};

// Conexión a la base de datos usando Mongoose
const MONGO_URI = process.env.MONGO_URI || '';

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ Conexión a MongoDB realizada con éxito.');
  })
  .catch((error) => {
    console.error('❌ Error al conectar a MongoDB:', error.message);
  });

// Ruta de prueba GET /api/status
app.get('/api/status', (req, res) => {
  res.json({ mensaje: 'API de Nova Models conectada y funcionando' });
});

// ==========================================
// RUTA DE SUBIDA DE ARCHIVOS MULTIMEDIA
// ==========================================

// POST /api/upload - Subir archivo a Cloudinary
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se ha proporcionado ningún archivo.' });
    }

    const secureUrl = req.file.path || req.file.secure_url;
    res.status(200).json({
      mensaje: 'Archivo subido con éxito a Cloudinary',
      secure_url: secureUrl,
      url: secureUrl
    });
  } catch (error) {
    res.status(500).json({ error: 'Error al procesar la subida del archivo', detalle: error.message });
  }
});

// ==========================================
// RUTAS DE POSTULACIONES
// ==========================================

// POST /api/postulaciones - Guardar nueva postulación
app.post('/api/postulaciones', async (req, res) => {
  try {
    const nuevaPostulacion = new Postulacion(req.body);
    const postulacionGuardada = await nuevaPostulacion.save();
    res.status(201).json(postulacionGuardada);
  } catch (error) {
    res.status(500).json({ error: 'Error al guardar la postulación', detalle: error.message });
  }
});

// GET /api/postulaciones - Ver todas las postulaciones
app.get('/api/postulaciones', async (req, res) => {
  try {
    const postulaciones = await Postulacion.find().sort({ createdAt: -1 });
    res.status(200).json(postulaciones);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener las postulaciones', detalle: error.message });
  }
});

// DELETE /api/postulaciones/:id - Eliminar postulación de MongoDB y borrar de Cloudinary
app.delete('/api/postulaciones/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const postulacion = await Postulacion.findById(id);

    if (!postulacion) {
      return res.status(404).json({ error: 'Postulación no encontrada' });
    }

    // Borrar foto de Cloudinary si existe
    if (postulacion.fotoUrl) {
      const info = getCloudinaryInfoFromUrl(postulacion.fotoUrl);
      if (info) {
        await cloudinary.uploader.destroy(info.publicId, { resource_type: info.resourceType });
      }
    }

    // Borrar video de Cloudinary si existe
    if (postulacion.videoUrl) {
      const info = getCloudinaryInfoFromUrl(postulacion.videoUrl);
      if (info) {
        await cloudinary.uploader.destroy(info.publicId, { resource_type: info.resourceType });
      }
    }

    // Eliminar documento de MongoDB
    await Postulacion.findByIdAndDelete(id);

    res.status(200).json({ mensaje: 'Postulación y archivos multimedia eliminados con éxito' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar la postulación', detalle: error.message });
  }
});

// ==========================================
// RUTAS DE GALERÍA Y PORTAFOLIO
// ==========================================

// POST /api/galeria - Agregar foto/video al portafolio público
app.post('/api/galeria', async (req, res) => {
  try {
    const nuevaPublicacion = new Galeria(req.body);
    const publicacionGuardada = await nuevaPublicacion.save();
    res.status(201).json(publicacionGuardada);
  } catch (error) {
    res.status(500).json({ error: 'Error al agregar elemento a la galería', detalle: error.message });
  }
});

// GET /api/galeria - Obtener publicaciones de la galería
app.get('/api/galeria', async (req, res) => {
  try {
    const items = await Galeria.find().sort({ createdAt: -1 });
    res.status(200).json(items);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener elementos de la galería', detalle: error.message });
  }
});

// DELETE /api/galeria/:id - Eliminar publicación de la galería en MongoDB y Cloudinary
app.delete('/api/galeria/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const item = await Galeria.findById(id);

    if (!item) {
      return res.status(404).json({ error: 'Elemento de la galería no encontrado' });
    }

    if (item.url) {
      const info = getCloudinaryInfoFromUrl(item.url);
      if (info) {
        await cloudinary.uploader.destroy(info.publicId, { resource_type: info.resourceType });
      }
    }

    await Galeria.findByIdAndDelete(id);
    res.status(200).json({ mensaje: 'Elemento eliminado con éxito de la galería' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar elemento de la galería', detalle: error.message });
  }
});

// ==========================================
// RUTAS DE PAGOS
// ==========================================

// POST /api/pagos - Registrar un nuevo pago
app.post('/api/pagos', async (req, res) => {
  try {
    const nuevoPago = new Pago(req.body);
    const pagoGuardado = await nuevoPago.save();
    res.status(201).json(pagoGuardado);
  } catch (error) {
    res.status(500).json({ error: 'Error al registrar el pago', detalle: error.message });
  }
});

// GET /api/pagos - Ver historial de pagos
app.get('/api/pagos', async (req, res) => {
  try {
    const pagos = await Pago.find().sort({ fecha: -1 });
    res.status(200).json(pagos);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener el historial de pagos', detalle: error.message });
  }
});

// Servidor a la escucha
app.listen(PORT, () => {
  console.log(`🚀 Servidor backend escuchando en http://localhost:${PORT}`);
});
