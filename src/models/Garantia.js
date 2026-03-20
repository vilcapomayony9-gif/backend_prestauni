import mongoose from "mongoose";

const GarantiaSchema = new mongoose.Schema(
  {
    tipo: {
      type: String,
      required: true,
      enum: ["Laptop", "Celular", "Tablet", "Monitor", "Consola", "Otro"],
      trim: true
    },

    marca: {
      type: String,
      required: true,
      trim: true
    },

    modelo: {
      type: String,
      required: true,
      trim: true
    },

    serie: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    estado_fisico: {
      type: String,
      enum: ["Excelente", "Bueno", "Regular", "Malo"],
      default: "Bueno"
    },

    valor_estimado: {
      type: Number,
      required: true,
      min: 0
    },

    accesorios: {
      type: [String],
      default: []
    },

    observaciones: {
      type: String,
      trim: true
    },

    estado_inventario: {
      type: String,
      enum: ["Disponible", "Prestado", "Retenido"],
      default: "Disponible"
    },

    cliente_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Cliente",
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

export default mongoose.model("Garantia", GarantiaSchema);
