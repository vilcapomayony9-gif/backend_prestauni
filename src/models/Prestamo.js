import mongoose from "mongoose";
import { Counter } from "./contador.js";

const prestamoSchema = new mongoose.Schema(
{
  codigo_prestamo: {
    type: String,
    unique: true
  },

  cliente_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Cliente",
    required: true
  },

  garantia_id: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Garantia",
    required: true
  },

  monto_prestado: {
    type: Number,
    required: true
  },

  interes_mensual: {
    type: Number,
    required: true
  },

  numero_cuotas: {
    type: Number,
    min: 5,
    max: 12,
    default: 5
  },

  frecuencia_pago: {
    type: String,
    enum: ["diario", "semanal", "quincenal", "mensual"],
    default: "mensual"
  },
  
  monto_total: Number,

  cuotas: [
    {
      numero: Number,
      monto_cuota: Number,
      fecha_vencimiento: Date,
      estado: {
        type: String,
        enum: ["pendiente", "pagado", "parcial"],
        default: "pendiente"
      },
      monto_pagado: { type: Number, default: 0 },
      mora_generada: { type: Number, default: 0 }
    }
  ],

  interes_generado: {
    type: Number,
    default: 0
  },

  monto_pagado: {
    type: Number,
    default: 0
  },

  saldo_pendiente: {
    type: Number,
    default: 0
  },

  dias_atraso: {
    type: Number,
    default: 0
  },

  monto_mora: {
    type: Number,
    default: 0
  },

  fecha_inicio: {
    type: Date,
    default: Date.now
  },

  fecha_vencimiento: Date,

  estado: {
    type: String,
    enum: ["activo", "pagado", "vencido", "en_mora", "ejecutado"],
    default: "activo"
  }

},
{ timestamps: true }
);

/* =========================
   PRE-SAVE: SOLO CUANDO SE CREA
========================= */
prestamoSchema.pre("save", async function () {

  // 🔥 SOLO si es nuevo
  if (this.isNew) {

    // generar codigo
    const contador = await Counter.findByIdAndUpdate(
      { _id: "prestamo" },
      { $inc: { secuencia: 1 } },
      { new: true, upsert: true }
    );

    this.codigo_prestamo = `PRE-${contador.secuencia}`;

    // calcular interés
    this.interes_generado =
      (this.monto_prestado * this.interes_mensual) / 100;

    // total
    this.monto_total =
      this.monto_prestado + this.interes_generado;

    const fecha = new Date(this.fecha_inicio);
    
    // Calcular plazo aproximado para la fecha final
    let diasIncremento = 30;
    if (this.frecuencia_pago === "diario") diasIncremento = 1;
    else if (this.frecuencia_pago === "semanal") diasIncremento = 7;
    else if (this.frecuencia_pago === "quincenal") diasIncremento = 15;
    
    fecha.setDate(fecha.getDate() + (this.numero_cuotas * diasIncremento));
    this.fecha_vencimiento = fecha;

    // Crear arreglo de cuotas
    if (!this.cuotas || this.cuotas.length === 0) {
      const cuotasArray = [];
      const montoPorCuota = this.monto_total / this.numero_cuotas;
      
      let curFecha = new Date(this.fecha_inicio);
      for (let i = 1; i <= this.numero_cuotas; i++) {
        curFecha.setDate(curFecha.getDate() + diasIncremento);
        cuotasArray.push({
          numero: i,
          monto_cuota: montoPorCuota,
          fecha_vencimiento: new Date(curFecha),
          estado: "pendiente",
          monto_pagado: 0,
          mora_generada: 0
        });
      }
      this.cuotas = cuotasArray;
    }

    // saldo inicial
    this.saldo_pendiente = this.monto_total;
  }  
});

export default mongoose.model("Prestamo", prestamoSchema);