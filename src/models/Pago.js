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
    },
    
    comprobante_pdf: {
      type: String,
      default: null
    },

    numero_cuota: {
      type: Number,
      default: null
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
    { $group: { 
      _id: null, 
      totalPagado: { $sum: "$monto_pagado" },
      totalMoraPagada: { $sum: "$monto_mora" } 
    } }
  ]);

  const totalMoraPagada = pagos[0]?.totalMoraPagada || 0;
  // El capital real que se abonó a la deuda es el totalPagado menos lo que se pagó de mora
  const totalAbonadoCapital = (pagos[0]?.totalPagado || 0) - totalMoraPagada;

  prestamo.saldo_pendiente = prestamo.monto_total - totalAbonadoCapital;

  // Actualizar el estado dinámico de cada cuota
  if (prestamo.cuotas && prestamo.cuotas.length > 0) {
    let capitalRestante = totalAbonadoCapital;
    prestamo.cuotas.forEach(c => {
      // Usar Math.round(x*100)/100 para evitar problemas de coma flotante
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

  if (totalAbonadoCapital >= prestamo.monto_total) {
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