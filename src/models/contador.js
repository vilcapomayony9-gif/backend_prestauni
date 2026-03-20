import mongoose from "mongoose";

const counterSchema = new mongoose.Schema({
    _id: String,
    secuencia: {
        type: Number,
        default: 1000
    }
});

export const Counter = mongoose.model("Counter", counterSchema);