import mongoose from "mongoose";

const contratoSchema = new mongoose.Schema(
  {
    prestamo_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Prestamo",
      required: true,
      unique: true
    },

    numero_contrato: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    fecha_firma: {
      type: Date,
      default: Date.now
    },

    interes: {
      type: String,
      required: true
    },

    penalidad_mora: {
      type: String,
      required: true
    },

    dias_gracia: {
      type: Number,
      default: 0,
      min: 0
    },

    clausula_garantia: {
      type: String,
      required: true
    },

    archivo_pdf: {
      type: String, // ruta o URL del PDF
      trim: true
    },

    firmado_usuario: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

export default mongoose.model("Contrato", contratoSchema);
