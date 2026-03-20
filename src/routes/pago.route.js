import express from "express";
import Pago from "../models/Pago.js";
import Prestamo from "../models/Prestamo.js";

const router = express.Router();

// ===============================
// CREAR PAGO (SIN DUPLICAR LÓGICA)
// ===============================
router.post("/", async (req, res) => {
  try {
    const { prestamo_id, monto_pagado } = req.body;

    if (!prestamo_id || !monto_pagado) {
      return res.status(400).json({ message: "Datos incompletos" });
    }

    const prestamo = await Prestamo.findById(prestamo_id);

    if (!prestamo) {
      return res.status(404).json({ message: "Préstamo no encontrado" });
    }

    if (prestamo.estado === "pagado") {
      return res.status(400).json({ message: "Préstamo ya está pagado" });
    }

    if (monto_pagado <= 0) {
      return res.status(400).json({ message: "Monto inválido" });
    }

    if (monto_pagado > prestamo.saldo_pendiente) {
      return res.status(400).json({
        message: "El monto excede el saldo pendiente"
      });
    }

    const pago = await Pago.create(req.body);

    res.status(201).json(pago);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// LISTAR TODOS LOS PAGOS
// ===============================
router.get("/", async (req, res) => {
  try {
    const pagos = await Pago.find()
      .populate("prestamo_id")
      .sort({ fecha_pago: -1 });

    res.json(pagos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// PAGOS POR PRÉSTAMO
// ===============================
router.get("/prestamos/:id", async (req, res) => {
  try {
    const pagos = await Pago.find({
      prestamo_id: req.params.id
    })
    .sort({ fecha_pago: -1 })
    .lean();

    res.json(pagos);

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ===============================
// ELIMINAR PAGO (RECALCULA AUTOMÁTICO)
// ===============================
router.delete("/:id", async (req, res) => {
  try {
    const pago = await Pago.findById(req.params.id);

    if (!pago) {
      return res.status(404).json({ message: "Pago no encontrado" });
    }

    const prestamo = await Prestamo.findById(pago.prestamo_id);

    await pago.deleteOne();

    // 🔥 recalcular saldo correctamente
    const pagos = await Pago.aggregate([
      { $match: { prestamo_id: pago.prestamo_id } },
      { $group: { _id: null, totalPagado: { $sum: "$monto_pagado" } } }
    ]);

    const totalPagado = pagos[0]?.totalPagado || 0;

    if (prestamo) {
      prestamo.saldo_pendiente = prestamo.monto_total - totalPagado;

      if (totalPagado <= 0) {
        prestamo.estado = "activo";
      }

      if (totalPagado >= prestamo.monto_total) {
        prestamo.estado = "pagado";
        prestamo.saldo_pendiente = 0;
      }

      await prestamo.save();
    }

    res.json({ message: "Pago eliminado correctamente" });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;