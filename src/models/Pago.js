import mongoose from "mongoose";

const pagoSchema = new mongoose.Schema(
  {
    prestamo_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prestamo",
      required: true,
      index: true
    },

    monto_pagado: {
      type: Number,
      required: true,
      min: 0
    },

    tipo: {
      type: String,
      enum: ["abono", "total", "mora"],
      required: true
    },

    medio_pago: {
      type: String,
      enum: ["efectivo", "yape", "plin", "transferencia"],
      required: true
    },

    fecha_pago: {
      type: Date,
      default: Date.now
    },

    observacion: {
      type: String,
      trim: true
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

/* =========================
   POST-SAVE: actualizar préstamo
========================= */
pagoSchema.post("save", async function () {
  const Prestamo = mongoose.model("Prestamo");
  const Pago = mongoose.model("Pago");

  const prestamo = await Prestamo.findById(this.prestamo_id);
  if (!prestamo) return;

  const pagos = await Pago.aggregate([
    { $match: { prestamo_id: this.prestamo_id } },
    { $group: { _id: null, totalPagado: { $sum: "$monto_pagado" } } }
  ]);

  const totalPagado = pagos[0]?.totalPagado || 0;

  prestamo.saldo_pendiente = prestamo.monto_total - totalPagado;

  if (totalPagado >= prestamo.monto_total) {
    prestamo.estado = "pagado";
    prestamo.saldo_pendiente = 0;
    
    // Liberar la garantía cuando se haya pagado el total
    if (prestamo.garantia_id) {
       const Garantia = mongoose.model("Garantia");
       await Garantia.findByIdAndUpdate(prestamo.garantia_id, {
         estado_inventario: "Disponible"
       });
    }
  }

  await prestamo.save();
});

export default mongoose.model("Pago", pagoSchema);