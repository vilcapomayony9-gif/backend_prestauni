import express from "express";
import Prestamo from "../models/Prestamo.js";
import Cliente from "../models/Cliente.js";
import Garantia from "../models/Garantia.js";
import multer from "multer";
import path from "path";
import fs from "fs";
import Pago from "../models/Pago.js";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const dir = "uploads/evidencia_prestamos";
    if (!fs.existsSync(dir)){
      fs.mkdirSync(dir, { recursive: true });
    }
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + path.extname(file.originalname));
  }
});
const upload = multer({ storage: storage });

const router = express.Router();

/* =========================
   CREAR PRÉSTAMO
========================= */
router.post("/", upload.single("imagen_evidencia"), async (req, res) => {
  try {

    console.log("BODY RECIBIDO:", req.body); // DEBUG
    console.log("FILE RECIBIDO:", req.file); // DEBUG

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

    const prestamoData = { ...req.body };
    
    if (req.file) {
      // Guardar ruta relativa de la imagen para que el frontend pueda cargarla con /uploads/evidencia_prestamos/...
      prestamoData.imagen_evidencia = req.file.path.replace(/\\/g, "/");
    }

    const prestamo = await Prestamo.create(prestamoData);

    // 🔴 ACTUALIZAR ESTADO DE LA GARANTÍA
    const garantiaUpdate = {
      estado_inventario: "Prestado",
      cliente_id: cliente_id
    };

    if (prestamoData.imagen_evidencia) {
      garantiaUpdate.imagen_evidencia = prestamoData.imagen_evidencia;
    }

    await Garantia.findByIdAndUpdate(garantia_id, garantiaUpdate);

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
      .populate("garantia_id", "tipo marca modelo serie estado_fisico valor_estimado imagen_evidencia");

    const hoy = new Date();

    const prestamosCalculados = prestamos.map((prestamo) => {

      let dias_atraso = 0;
      let monto_mora = 0;
      let estado_actual = prestamo.estado;
      
      const prestamoObj = prestamo.toObject();

      // Prefix URLs
      if (prestamoObj.imagen_evidencia && !prestamoObj.imagen_evidencia.startsWith("http")) {
        prestamoObj.imagen_evidencia = `http://localhost:4000/${prestamoObj.imagen_evidencia}`;
      }
      if (prestamoObj.garantia_id && prestamoObj.garantia_id.imagen_evidencia && !prestamoObj.garantia_id.imagen_evidencia.startsWith("http")) {
        prestamoObj.garantia_id.imagen_evidencia = `http://localhost:4000/${prestamoObj.garantia_id.imagen_evidencia}`;
      }

      const hoyUtc = Date.UTC(hoy.getFullYear(), hoy.getMonth(), hoy.getDate());

      if (prestamoObj.cuotas && prestamoObj.cuotas.length > 0) {
        // Nueva lógica con cuotas
        prestamoObj.cuotas.forEach(cuota => {
          if (cuota.estado === "pendiente" || cuota.estado === "parcial") {
            const fechaVenc = new Date(cuota.fecha_vencimiento);
            const vencUtc = Date.UTC(fechaVenc.getFullYear(), fechaVenc.getMonth(), fechaVenc.getDate());
            
            const atraso = Math.floor((hoyUtc - vencUtc) / (1000 * 60 * 60 * 24));
            
            if (atraso > 0) {
              cuota.mora_generada = atraso * 2; // S/2 por día
              monto_mora += cuota.mora_generada;
              if (atraso > dias_atraso) dias_atraso = atraso;
            } else {
              cuota.mora_generada = 0;
            }
          }
        });

      } else {
        // Lógica antigua (fallback)
        if (prestamo.fecha_vencimiento < hoy && prestamo.estado === "activo") {
          const vencUtc = Date.UTC(prestamo.fecha_vencimiento.getFullYear(), prestamo.fecha_vencimiento.getMonth(), prestamo.fecha_vencimiento.getDate());
  
          dias_atraso = Math.floor((hoyUtc - vencUtc) / (1000 * 60 * 60 * 24));
          if (dias_atraso < 0) dias_atraso = 0;
  
          monto_mora = dias_atraso * 2;
        }
      }

      // Actualizar estado dinámicamente para la vista
      if (prestamo.estado === "activo" && dias_atraso > 0) {
        estado_actual = "en_mora";
      }

      return {
        ...prestamoObj,
        estado: estado_actual,
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

/* =========================
   CONSULTA POR DNI (Para Flutter/App)
   Ruta: GET /prestamo/dni/:dni
========================= */
router.get("/dni/:dni", async (req, res) => {
  try {
    const { dni } = req.params;

    // 1. Buscar al cliente por DNI
    const cliente = await Cliente.findOne({ dni: dni });
    
    if (!cliente) {
      return res.status(404).json({ message: "Cliente no encontrado" });
    }

    // 2. Buscar el préstamo usando el cliente_id
    // Se asume que se busca el préstamo más reciente o activo
    const prestamo = await Prestamo.findOne({ cliente_id: cliente._id })
      .sort({ createdAt: -1 }); // Opcional: obtener el último

    if (!prestamo) {
      return res.status(404).json({ message: "No hay préstamos activos para este cliente" });
    }

    const pagos = await Pago.find({ prestamo_id: prestamo._id })
    .sort({ createdAt: -1 }); // Opcional: obtener el último
    if (!pagos) {
      return res.status(404).json({ message: "No hay pagos para este préstamo" });
    }

    // 3. Responder con la estructura que Flutter espera
    return res.json({
      _id: prestamo._id,
      nombre_cliente: `${cliente.nombres} ${cliente.apellidos}`,
      monto_total: prestamo.monto_total,
      saldo_pendiente: prestamo.saldo_pendiente,
      cuotas: prestamo.cuotas, 
      codigo_prestamo: prestamo.codigo_prestamo,
      fecha_pago: pagos.fecha_pago,
      medio_pago: pagos.medio_pago,
    });

  } catch (error) {
    console.error("Error en API /dni:", error);
    return res.status(500).json({ error: "Error interno del servidor" });
  }
});

export default router;
