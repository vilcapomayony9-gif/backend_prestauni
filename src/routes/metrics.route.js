import express from "express";
import Prestamo from "../models/Prestamo.js";
import Garantia from "../models/Garantia.js";

const router = express.Router();

router.get("/", async (req, res) => {
  try {
    const totalPrestado = await Prestamo.aggregate([
      { $group: { _id: null, total: { $sum: "$monto_total" } } }
    ]);

    const prestamosActivos = await Prestamo.countDocuments({
      estado: "activo"
    });

    const garantiasCustodia = await Garantia.countDocuments({
      estado: "custodia"
    });

    res.json({
      totalPrestado: totalPrestado[0]?.total || 0,
      prestamosActivos,
      garantiasCustodia
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

export default router;
