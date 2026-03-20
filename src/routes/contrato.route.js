import express from "express";
import { generarContratoPDF } from "../utils/generarContratoPDF.js";
import Contrato from "../models/Contrato.js";
import Prestamo from "../models/Prestamo.js";

const router = express.Router();

/* =========================
   CREAR CONTRATO
========================= */
router.post("/", async (req, res) => {
  try {
    const { prestamo_id, numero_contrato } = req.body;

    // Validar que exista el préstamo
    const prestamo = await Prestamo.findById(prestamo_id)
    .populate("cliente_id")
    .populate("garantia_id");

    if (!prestamo) {
      return res.status(404).json({ message: "Préstamo no encontrado" });
    }

    //Crear Contrato
    const contrato = await Contrato.create(req.body);

    // Generar PDF
    const rutaPDF = await generarContratoPDF({
      numero_contrato,
      cliente: prestamo.cliente_id,
      prestamo,
      garantia: prestamo.garantia_id,
      contrato
    });

    // Formatear url pública para el frontend
    const pdfUrl = `http://localhost:4000/${rutaPDF.replace(/\\/g, "/")}`;

    // Guardar ruta del PDF
    contrato.archivo_pdf = pdfUrl;
    await contrato.save();

    res.status(201).json({
      message: "Contrato creado y PDF generado",
      contrato,
      pdfUrl: pdfUrl
    });

  } catch (error) {
    res.status(400).json({
      message: "Error al crear contrato",
      error: error.message
  });


    // Validar que el préstamo no tenga ya contrato
    const contratoExistente = await Contrato.findOne({ prestamo_id });
    if (contratoExistente) {
      return res.status(400).json({
        message: "Este préstamo ya tiene un contrato asociado"
      });
    }
  }
});

/* =========================
   LISTAR CONTRATOS
========================= */
router.get("/", async (req, res) => {
  try {
    const contratos = await Contrato.find()
      .populate({
        path: "prestamo_id",
        populate: [
          { path: "cliente_id", select: "nombres apellidos dni" },
          { path: "garantia_id", select: "tipo marca modelo serie" }
        ]
      });

    res.json(contratos);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar contratos",
      error: error.message
    });
  }
});

/* =========================
   OBTENER CONTRATO POR ID
========================= */
router.get("/:id", async (req, res) => {
  try {
    const contrato = await Contrato.findById(req.params.id)
      .populate({
        path: "prestamo_id",
        populate: [
          { path: "cliente_id" },
          { path: "garantia_id" }
        ]
      });

    if (!contrato) {
      return res.status(404).json({ message: "Contrato no encontrado" });
    }

    res.json(contrato);
  } catch (error) {
    res.status(400).json({
      message: "ID inválido",
      error: error.message
    });
  }
});

/* =========================
   ACTUALIZAR CONTRATO
========================= */
router.put("/:id", async (req, res) => {
  try {
    const contrato = await Contrato.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!contrato) {
      return res.status(404).json({ message: "Contrato no encontrado" });
    }

    res.json(contrato);
  } catch (error) {
    res.status(400).json({
      message: "Error al actualizar contrato",
      error: error.message
    });
  }
});

/* =========================
   FIRMAR CONTRATO
========================= */
router.patch("/:id/firmar", async (req, res) => {
  try {
    const contrato = await Contrato.findByIdAndUpdate(
      req.params.id,
      { firmado_usuario: true },
      { new: true }
    );

    if (!contrato) {
      return res.status(404).json({ message: "Contrato no encontrado" });
    }

    res.json({
      message: "Contrato firmado correctamente",
      contrato
    });
  } catch (error) {
    res.status(400).json({
      message: "Error al firmar contrato",
      error: error.message
    });
  }
});

/* =========================
   ELIMINAR CONTRATO
========================= */
router.delete("/:id", async (req, res) => {
  try {
    const contrato = await Contrato.findByIdAndDelete(req.params.id);

    if (!contrato) {
      return res.status(404).json({ message: "Contrato no encontrado" });
    }

    res.json({ message: "Contrato eliminado correctamente" });
  } catch (error) {
    res.status(400).json({
      message: "Error al eliminar contrato",
      error: error.message
    });
  }
});

export default router;
