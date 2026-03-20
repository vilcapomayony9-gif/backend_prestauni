import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import {connectDB} from "./config/db.js";
import clienteRoutes from "./routes/cliente.route.js";
import authRoutes from "./routes/auth.route.js";
import contratoRoutes from "./routes/contrato.route.js";
import garantiaRoutes from "./routes/garantia.route.js";
import pagoRoutes from "./routes/pago.route.js";
import prestamoRoutes from "./routes/prestamo.route.js";
import metricsRoutes from "./routes/metrics.route.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

// Servir archivos estáticos (PDFs y otros uploads)
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.join(__dirname, "../uploads")));

//conectar DB
connectDB();

app.get("/test", (req, res) =>{
    res.send("OK BACKEND");
});

app.use("/cliente", clienteRoutes);
app.use("/auth", authRoutes);
app.use("/contrato", contratoRoutes);
app.use("/garantia", garantiaRoutes);
app.use("/prestamo", prestamoRoutes);
app.use("/pago", pagoRoutes);
app.use("/metrics", metricsRoutes);

export default app;


