import express from "express";
import Prestamo from "../models/Prestamo.js";
import Cliente from "../models/Cliente.js";
import Garantia from "../models/Garantia.js";

const router = express.Router();

/* =========================
   CREAR PRÉSTAMO
========================= */
router.post("/", async (req, res) => {
  try {

    console.log("BODY RECIBIDO:", req.body); // DEBUG

    if (!req.body) {
      return res.status(400).json({
        message: "No se enviaron datos en la petición"
      });
    }

    const { cliente_id, garantia_id } = req.body;

    if (!cliente_id || !garantia_id) {
      return res.status(400).json({
        message: "cliente_id y garantia_id son obligatorios"
      });
    }

    // Validar existencia de cliente y garantía
    const cliente = await Cliente.findById(cliente_id);
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    const garantia = await Garantia.findById(garantia_id);
    if (!garantia) {
      return res.status(404).json({ message: "Garantía no encontrada" });
    }

    if (garantia.estado_inventario !== "Disponible") {
      return res.status(400).json({ message: "Esta garantía ya está en uso y no se puede prestar de nuevo" });
    }

    if (garantia.cliente_id && String(garantia.cliente_id) !== String(cliente_id)) {
      return res.status(400).json({ message: "Esta garantía pertenece a otro cliente y no puede ser usada." });
    }

    const prestamo = await Prestamo.create(req.body);

    // 🔴 ACTUALIZAR ESTADO DE LA GARANTÍA
    await Garantia.findByIdAndUpdate(garantia_id, {
      estado_inventario: "Prestado",
      cliente_id: cliente_id
    });

    res.status(201).json(prestamo);

  } catch (error) {
    res.status(400).json({
      message: "Error al crear préstamo",
      error: error.message
    });
  }
});

/* =========================
   LISTAR PRÉSTAMOS
========================= */
router.get("/", async (req, res) => {
  try {

    const prestamos = await Prestamo.find()
      .populate("cliente_id", "nombres apellidos dni universidad")
      .populate("garantia_id", "tipo marca modelo serie");

    const hoy = new Date();

    const prestamosCalculados = prestamos.map((prestamo) => {

      let dias_atraso = 0;
      let monto_mora = 0;

      if (prestamo.fecha_vencimiento < hoy && prestamo.estado === "activo") {
        const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());
        const vencUtc = Date.UTC(prestamo.fecha_vencimiento.getFullYear(), prestamo.fecha_vencimiento.getMonth(), prestamo.fecha_vencimiento.getDate());

        dias_atraso = Math.floor(
          (hoyUtc - vencUtc) / (1000 * 60 * 60 * 24)
        );
        
        if (dias_atraso < 0) dias_atraso = 0;

        monto_mora = dias_atraso * 2; // S/2 por día
      }

      return {
        ...prestamo.toObject(),
        dias_atraso,
        monto_mora
      };

    });

    res.json(prestamosCalculados);

  } catch (error) {

    res.status(500).json({
      message: "Error al listar préstamos",
      error: error.message
    });

  }
});

/* =========================
   OBTENER PRÉSTAMO POR ID
========================= */
router.get("/:id", async (req, res) => {
  try {
    const prestamo = await Prestamo.findById(req.params.id)
      .populate("cliente_id")
      .populate("garantia_id");

    if (!prestamo) {
      return res.status(404).json({ message: "Préstamo no encontrado" });
    }

    res.json(prestamo);
  } catch (error) {
    res.status(400).json({
      message: "ID inválido",
      error: error.message
    });
  }
});

/* =========================
   ACTUALIZAR PRÉSTAMO
========================= */
router.put("/:id", async (req, res) => {
  try {
    const prestamo = await Prestamo.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!prestamo) {
      return res.status(404).json({ message: "Préstamo no encontrado" });
    }

    res.json(prestamo);
  } catch (error) {
    res.status(400).json({
      message: "Error al actualizar préstamo",
      error: error.message
    });
  }
});

/* =========================
   CAMBIAR ESTADO DEL PRÉSTAMO
========================= */
router.patch("/:id/estado", async (req, res) => {
  try {
    const { estado } = req.body;

    const estadosValidos = ["activo", "pagado", "vencido", "en_mora", "ejecutado"];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ message: "Estado inválido" });
    }

    const prestamo = await Prestamo.findByIdAndUpdate(
      req.params.id,
      { estado },
      { new: true }
    );

    if (!prestamo) {
      return res.status(404).json({ message: "Préstamo no encontrado" });
    }

    res.json(prestamo);
  } catch (error) {
    res.status(400).json({
      message: "Error al cambiar estado",
      error: error.message
    });
  }
});

/* =========================
   ELIMINAR PRÉSTAMO
========================= */
router.delete("/:id", async (req, res) => {
  try {
    const prestamo = await Prestamo.findByIdAndDelete(req.params.id);

    if (!prestamo) {
      return res.status(404).json({ message: "Préstamo no encontrado" });
    }

    res.json({ message: "Préstamo eliminado correctamente" });
  } catch (error) {
    res.status(400).json({
      message: "Error al eliminar préstamo",
      error: error.message
    });
  }
});
/* =========================
   PRESTAMOS VENCIDOS
========================= */

router.get("/vencidos", async (req, res) => {
  try {

    const hoy = new Date();

    const prestamos = await Prestamo.find({
      estado: "activo",
      fecha_vencimiento: { $lte: hoy }
    })
      .populate("cliente_id", "nombres apellidos")
      .populate("garantia_id", "tipo marca modelo")
      .limit(5);

    res.json(prestamos);

  } catch (error) {
    res.status(500).json({
      message: "Error al obtener préstamos vencidos",
      error: error.message
    });
  }
});

/* =========================
   ESTADÍSTICAS DASHBOARD
========================= */
router.get("/stats/dashboard", async (req, res) => {
  try {

    const prestamos = await Prestamo.find().populate("cliente_id");

    const totalPrestado = prestamos.reduce(
      (sum, p) => sum + p.monto_prestado,
      0
    );

    const activos = prestamos.filter(
      p => p.estado === "activo"
    ).length;

    const vencidos = prestamos.filter(p => {
      const hoy = new Date();
      return p.estado === "activo" && p.fecha_vencimiento <= hoy;
    }).length;

    const clientes = new Set(
      prestamos.map(p => p.cliente_id._id.toString())
    ).size;

    res.json({
      totalPrestado,
      prestamosActivos: activos,
      prestamosVencidos: vencidos,
      totalClientes: clientes
    });

  } catch (error) {
    res.status(500).json({
      message: "Error al obtener estadísticas",
      error: error.message
    });
  }
});

/* =========================
   PRESTAMOS POR VENCER
========================= */
router.get("/por-vencer", async (req, res) => {

  const hoy = new Date();
  const limite = new Date();
  limite.setDate(hoy.getDate() + 5);

  const prestamos = await Prestamo.find({
    estado: "activo",
    fecha_vencimiento: { $gte: hoy, $lte: limite }
  })
    .populate("cliente_id", "nombres apellidos")
    .limit(5);

  res.json(prestamos);
});

export default router;
