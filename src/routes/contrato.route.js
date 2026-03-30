import express from "express";
import { generarContratoPDF } from "../utils/generarContratoPDF.js";
import { enviarEmail } from "../utils/mailer.js";
import path from "path";
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

    // --- ENVIAR EMAIL AL CLIENTE ---
    if (prestamo.cliente_id.email) {
      const adjuntoPath = path.resolve(rutaPDF);
      enviarEmail({
        to: prestamo.cliente_id.email,
        subject: `Tu Contrato de Préstamo PRESTUNI - N° ${numero_contrato}`,
        html: `
          <div style="font-family: Arial, sans-serif; color: #333;">
            <h2 style="color: #1E3A8A;">¡Hola ${prestamo.cliente_id.nombres}!</h2>
            <p>Se ha generado correctamente tu contrato de préstamo con <b>PRESTUNI</b>.</p>
            <p>Adjunto a este correo encontrarás una copia de tu contrato en formato PDF para tu registro.</p>
            <br/>
            <p>Atentamente,</p>
            <p><b>El equipo de PRESTUNI</b></p>
          </div>
        `,
        attachments: [
          {
            filename: `Contrato_${numero_contrato}.pdf`,
            path: adjuntoPath
          }
        ]
      });
    }

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

/* =========================
   ENVIAR CONTRATO POR EMAIL
========================= */
router.post("/:id/enviar-email", async (req, res) => {
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

    const { prestamo_id: prestamo } = contrato;
    const { cliente_id: cliente } = prestamo;

    if (!cliente.email) {
      return res.status(400).json({ message: "El cliente no tiene un correo electrónico registrado" });
    }

    if (!contrato.archivo_pdf) {
      return res.status(400).json({ message: "El contrato no tiene un archivo PDF generado" });
    }

    // Extraer la ruta local del archivo desde la URL si es necesario
    // La URL es http://localhost:4000/uploads/contratos/pdf-123.pdf
    // La ruta relativa es uploads/contratos/pdf-123.pdf
    let rutaRelativa = contrato.archivo_pdf;
    if (rutaRelativa.startsWith("http")) {
      const urlPartes = rutaRelativa.split("/");
      rutaRelativa = urlPartes.slice(3).join("/");
    }

    const adjuntoPath = path.resolve(rutaRelativa);

    await enviarEmail({
      to: cliente.email,
      subject: `Tu Contrato de Préstamo PRESTUNI - N° ${contrato.numero_contrato}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #333;">
          <h2 style="color: #1E3A8A;">¡Hola ${cliente.nombres}!</h2>
          <p>Se ha generado correctamente tu contrato de préstamo con <b>PRESTUNI</b>.</p>
          <p>Adjunto a este correo encontrarás una copia de tu contrato en formato PDF para tu registro.</p>
          <br/>
          <p>Atentamente,</p>
          <p><b>El equipo de PRESTUNI</b></p>
        </div>
      `,
      attachments: [
        {
          filename: `Contrato_${contrato.numero_contrato}.pdf`,
          path: adjuntoPath
        }
      ]
    });

    res.json({ message: "Email enviado correctamente" });

  } catch (error) {
    res.status(500).json({
      message: "Error al enviar el email",
      error: error.message
    });
  }
});

export default router;
