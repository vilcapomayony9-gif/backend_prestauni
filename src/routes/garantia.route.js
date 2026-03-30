import express from "express";
import Garantia from "../models/Garantia.js";
import multer from "multer";
import path from "path"; 
import fs from "fs";


// Configuración de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = "uploads/evidencia_prestamos";
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});
const upload = multer({ storage });
const router = express.Router();

/* =========================
   CREAR GARANTÍA
========================= */
router.post("/", upload.single("imagen_evidencia"), async (req, res) => {

  try {
    const { cliente_id, tipo, tipo_otro, marca, modelo, serie, accesorios, valor_estimado, estado_fisico, estado_inventario } = req.body;

    const garantia = await Garantia.create({
      cliente_id,
      tipo,
      tipo_otro,
      marca,
      modelo,
      serie,
      accesorios: Array.isArray(accesorios) ? accesorios : (accesorios ? [accesorios] : []),
      valor_estimado,
      estado_fisico,
      estado_inventario,
      imagen_evidencia: req.file ? req.file.path.replace(/\\/g, "/") : ""
    });

    res.status(201).json(garantia);
  } catch (error) {
    res.status(400).json({
      message: "Error al crear garantía",
      error: error.message
    });
  }
});

/* =========================
   LISTAR GARANTÍAS
========================= */
router.get("/", async (req, res) => {
  try {
    const garantias = await Garantia.find();
    
    // Convertir a objetos planos y agregar dominio a la imagen si existe
    const garantiasUrl = garantias.map(g => {
      const obj = g.toObject();
      if (obj.imagen_evidencia && !obj.imagen_evidencia.startsWith("http")) {
        // En producción puedes cambiar esto por process.env.BACKEND_URL
        obj.imagen_evidencia = `http://localhost:4000/${obj.imagen_evidencia}`;
      }
      return obj;
    });

    res.json(garantiasUrl);
  } catch (error) {
    res.status(400).json({
      message: "Error al listar garantías",
      error: error.message
    });
  }
});

/* =========================
   OBTENER GARANTÍA POR ID
========================= */
router.get("/:id", async (req, res) => {
  try {
    const garantia = await Garantia.findById(req.params.id);

    if (!garantia) {
      return res.status(404).json({ message: "Garantía no encontrada" });
    }

    res.json(garantia);
  } catch (error) {
    res.status(400).json({
      message: "ID inválido",
      error: error.message
    });
  }
});

/* =========================
   ACTUALIZAR GARANTÍA
========================= */
router.put("/:id", async (req, res) => {
  try {
    const garantia = await Garantia.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!garantia) {
      return res.status(404).json({ message: "Garantía no encontrada" });
    }

    res.json(garantia);
  } catch (error) {
    res.status(400).json({
      message: "Error al actualizar garantía",
      error: error.message
    });
  }
});

/* =========================
   ELIMINAR GARANTÍA
========================= */
router.delete("/:id", async (req, res) => {
  try {
    const garantia = await Garantia.findByIdAndDelete(req.params.id);

    if (!garantia) {
      return res.status(404).json({ message: "Garantía no encontrada" });
    }

    res.json({ message: "Garantía eliminada correctamente" });
  } catch (error) {
    res.status(400).json({
      message: "Error al eliminar garantía",
      error: error.message
    });
  }
});

export default router;
