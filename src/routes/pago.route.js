import express from "express";
import Prestamo from "../models/Prestamo.js";
import { generarComprobantePDF } from "../utils/generarComprobantePDF.js";
import { enviarEmail } from "../utils/mailer.js";
import path from "path";
import Pago from "../models/Pago.js";

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

    const prestamoActualizado = await Prestamo.findById(prestamo_id).populate("cliente_id");

    try {
      const rutaPDF = await generarComprobantePDF({
        pago,
        prestamo: prestamoActualizado,
        cliente: prestamoActualizado.cliente_id
      });
      const pdfUrl = `http://localhost:4000/${rutaPDF.replace(/\\/g, "/")}`;
      await Pago.updateOne({ _id: pago._id }, { comprobante_pdf: pdfUrl });
      pago.comprobante_pdf = pdfUrl;

      // --- ENVIAR EMAIL AL CLIENTE ---
      if (prestamoActualizado.cliente_id.email) {
        const adjuntoPath = path.resolve(rutaPDF);
        enviarEmail({
          to: prestamoActualizado.cliente_id.email,
          subject: `Comprobante de Pago PRESTUNI - S/ ${pago.monto_pagado.toFixed(2)}`,
          html: `
            <div style="font-family: Arial, sans-serif; color: #333;">
              <h2 style="color: #10B981;">¡Pago Recibido!</h2>
              <p>Hola <b>${prestamoActualizado.cliente_id.nombres}</b>,</p>
              <p>Hemos registrado tu pago de <b>S/ ${pago.monto_pagado.toFixed(2)}</b> con éxito.</p>
              <p>Adjunto encontrarás tu comprobante de pago electrónico.</p>
              <br/>
              <p><b>Resumen del préstamo:</b></p>
              <ul>
                <li>Nuevo Saldo Pendiente: S/ ${prestamoActualizado.saldo_pendiente.toFixed(2)}</li>
              </ul>
              <br/>
              <p>Gracias por tu cumplimiento.</p>
              <p>Atentamente,<br/><b>El equipo de PRESTUNI</b></p>
            </div>
          `,
          attachments: [
            {
              filename: `Recibo_Pago_${pago._id}.pdf`,
              path: adjuntoPath
            }
          ]
        });
      }
    } catch (pdfError) {
      console.error("Error generando PDF de comprobante:", pdfError);
    }

    res.status(201).json(pago);

  } catch (error) {
    console.error("ERROR CREANDO PAGO:", error);
    res.status(500).json({ error: error.message || String(error) });
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
      { $group: { 
        _id: null, 
        totalPagado: { $sum: "$monto_pagado" },
        totalMoraPagada: { $sum: "$monto_mora" }
      } }
    ]);

    const totalAbonadoCapital = (pagos[0]?.totalPagado || 0) - (pagos[0]?.totalMoraPagada || 0);

    if (prestamo) {
      prestamo.saldo_pendiente = prestamo.monto_total - totalAbonadoCapital;

      if (prestamo.cuotas && prestamo.cuotas.length > 0) {
        let capitalRestante = totalAbonadoCapital;
        prestamo.cuotas.forEach(c => {
          const montoCuota = Math.round(c.monto_cuota * 100) / 100;
          if (capitalRestante >= montoCuota) {
            c.estado = "pagado";
            c.monto_pagado = montoCuota;
            capitalRestante -= montoCuota;
            capitalRestante = Math.round(capitalRestante * 100) / 100;
          } else if (capitalRestante > 0) {
            c.estado = "parcial";
            c.monto_pagado = capitalRestante;
            capitalRestante = 0;
          } else {
            c.estado = "pendiente";
            c.monto_pagado = 0;
          }
        });
      }

      if (totalAbonadoCapital <= 0) {
        prestamo.estado = "activo";
      }

      if (totalAbonadoCapital >= prestamo.monto_total) {
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