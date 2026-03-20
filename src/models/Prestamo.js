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

  plazo_dias: {
    type: Number,
    required: true
  },

  monto_total: Number,

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

    // vencimiento
    const fecha = new Date(this.fecha_inicio);
    fecha.setDate(fecha.getDate() + this.plazo_dias);
    this.fecha_vencimiento = fecha;

    // saldo inicial
    this.saldo_pendiente = this.monto_total;
  }  
});

export default mongoose.model("Prestamo", prestamoSchema);