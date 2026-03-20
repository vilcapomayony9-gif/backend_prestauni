import express from "express";
import bcrypt from "bcryptjs";
import AuthUser from "../models/AuthUser.js";
import { generarToken } from "../utils/jwt.js";

const router = express.Router();


// ===============================
// REGISTRO
// ===============================
router.post("/register", async (req, res) => {
  try {
    const { username, email, password, rol } = req.body;

    const existe = await AuthUser.findOne({ email });
    if (existe) {
      return res.status(400).json({ message: "Usuario ya existe" });
    }

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);

    const user = await AuthUser.create({
      username,
      email,
      password: hash,
      rol
    });

    res.status(201).json({
      message: "Usuario creado",
      user: {
        id: user._id,
        username: user.username,
        rol: user.rol
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ===============================
// LOGIN
// ===============================
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await AuthUser.findOne({ email });
    if (!user || !user.estado) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ message: "Credenciales inválidas" });
    }

    const token = generarToken(user);

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        rol: user.rol
      }
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});


// ===============================
// LISTAR USUARIOS (ADMIN)
// ===============================
router.get("/", async (req, res) => {
  const users = await AuthUser.find().select("-password");
  res.json(users);
});


// ===============================
// DESACTIVAR USUARIO
// ===============================
router.patch("/:id/estado", async (req, res) => {
  const user = await AuthUser.findByIdAndUpdate(
    req.params.id,
    { estado: false },
    { new: true }
  );

  res.json(user);
});

export default router;
