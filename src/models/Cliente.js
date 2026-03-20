import mongoose from "mongoose";

const ClienteSchema = new mongoose.Schema(
  {
    codigo_universitario: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },

    nombres: {
      type: String,
      required: true,
      trim: true
    },

    apellidos: {
      type: String,
      required: true,
      trim: true
    },

    dni: {
      type: String,
      required: true,
      unique: true,
      length: 8
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    telefono: {
      type: String,
      required: true,
      trim: true
    },

    universidad: {
      type: String,
      required: true,
      trim: true
    },

    facultad: {
      type: String,
      required: true,
      trim: true
    },

    estado: {
      type: String,
      enum: ["activo", "inactivo", "moroso"],
      default: "activo"
    }
  },
  {
    timestamps: {
      createdAt: "created_at",
      updatedAt: "updated_at"
    }
  }
);

export default mongoose.model("Cliente", ClienteSchema);
