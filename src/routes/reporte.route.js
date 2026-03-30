import express from "express";
import Prestamo from "../models/Prestamo.js";
import Pago from "../models/Pago.js";
import Cliente from "../models/Cliente.js";

const router = express.Router();

/* =========================
   OBTENER DATOS DE REPORTES
========================= */
router.get("/", async (req, res) => {
  try {
    const { fechaDesde, fechaHasta, estado, cliente } = req.query;

    // 1. Construir query para Préstamos
    let query = {};

    // Filtro por fecha (fecha_inicio)
    if (fechaDesde || fechaHasta) {
      query.fecha_inicio = {};
      if (fechaDesde) query.fecha_inicio.$gte = new Date(fechaDesde);
      if (fechaHasta) query.fecha_inicio.$lte = new Date(fechaHasta);
    }

    // Filtro por estado
    if (estado) {
      query.estado = estado;
    }

    // 2. Ejecutar búsqueda con populate para filtrar por cliente si es necesario
    let prestamos = await Prestamo.find(query)
      .populate("cliente_id", "nombres apellidos dni")
      .populate("garantia_id", "tipo marca modelo")
      .sort({ fecha_inicio: -1 });

    // Filtro manual por nombre de cliente (si se proporcionó)
    if (cliente) {
      const search = cliente.toLowerCase();
      prestamos = prestamos.filter(p => 
        p.cliente_id && (
          p.cliente_id.nombres.toLowerCase().includes(search) || 
          p.cliente_id.apellidos.toLowerCase().includes(search)
        )
      );
    }

    // 3. Calcular KPIs
    const totalCapitalPrestado = prestamos.reduce((sum, p) => sum + p.monto_prestado, 0);
    const totalInteresesGanados = prestamos.reduce((sum, p) => sum + (p.interes_generado || 0), 0);
    
    const prestamosEnMora = prestamos.filter(p => p.estado === "en_mora").length;
    const prestamosNoFinalizados = prestamos.filter(p => p.estado !== "pagado").length;
    const indiceMorosidad = prestamosNoFinalizados > 0 
      ? ((prestamosEnMora / prestamosNoFinalizados) * 100).toFixed(2) 
      : 0;

    // Calcular "Total Recaudado hoy"
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);

    const pagosHoy = await Pago.aggregate([
      { 
        $match: { 
          fecha_pago: { $gte: hoy, $lt: manana } 
        } 
      },
      { 
        $group: { 
          _id: null, 
          total: { $sum: "$monto_pagado" } 
        } 
      }
    ]);

    const totalRecaudadoHoy = pagosHoy[0]?.total || 0;

    res.json({
      kpis: {
        totalCapitalPrestado,
        totalInteresesGanados,
        indiceMorosidad,
        totalRecaudadoHoy
      },
      prestamos: prestamos.map(p => ({
        id: p.codigo_prestamo || p._id,
        _id: p._id,
        cliente: `${p.cliente_id?.nombres || ""} ${p.cliente_id?.apellidos || ""}`,
        fecha: p.fecha_inicio,
        monto: p.monto_prestado,
        cuotas: `${p.cuotas?.filter(c => c.estado === "pagado").length || 0}/${p.numero_cuotas || 0}`,
        estado: p.estado
      }))
    });

  } catch (error) {
    res.status(500).json({
      message: "Error al generar el reporte",
      error: error.message
    });
  }
});

export default router;
