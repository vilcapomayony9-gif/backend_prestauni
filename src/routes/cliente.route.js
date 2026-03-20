import express from "express";
import Cliente from "../models/Cliente.js";

const router = express.Router();

/* =========================
   CREAR CLIENTE
========================= */
router.post("/", async (req, res) => {
  try {
    const cliente = await Cliente.create(req.body);
    res.status(201).json(cliente);
  } catch (error) {
    res.status(400).json({
      message: "Error al crear cliente",
      error: error.message
    });
  }
});

/* =========================
   LISTAR CLIENTES
========================= */
router.get("/", async (req, res) => {
  try {
    const clientes = await Cliente.find();
    res.json(clientes);
  } catch (error) {
    res.status(500).json({
      message: "Error al listar clientes",
      error: error.message
    });
  }
});

/* =========================
   OBTENER CLIENTE POR ID
========================= */
router.get("/:id", async (req, res) => {
  try {
    const cliente = await Cliente.findById(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    res.json(cliente);
  } catch (error) {
    res.status(400).json({
      message: "ID inválido",
      error: error.message
    });
  }
});

/* =========================
   ACTUALIZAR CLIENTE
========================= */
router.put("/:id", async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    res.json(cliente);
  } catch (error) {
    res.status(400).json({
      message: "Error al actualizar cliente",
      error: error.message
    });
  }
});

/* =========================
   ELIMINAR CLIENTE
========================= */
router.delete("/:id", async (req, res) => {
  try {
    const cliente = await Cliente.findByIdAndDelete(req.params.id);

    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    res.json({ message: "Cliente eliminado correctamente" });
  } catch (error) {
    res.status(400).json({
      message: "Error al eliminar cliente",
      error: error.message
    });
  }
});

export default router;
