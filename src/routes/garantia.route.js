import express from "express";
import Garantia from "../models/Garantia.js";

const router = express.Router();

/* =========================
   CREAR GARANTÍA
========================= */
router.post("/", async (req, res) => {

  try {
    const garantia = await Garantia.create(req.body);
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
    res.json(garantias);
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
