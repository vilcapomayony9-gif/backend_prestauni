import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();

/**
 * Utilidad para el envío de correos electrónicos
 * @param {Object} options Options for sending email
 * @param {string} options.to Email address of recipient
 * @param {string} options.subject Subject line
 * @param {string} options.text Plain text body
 * @param {string} options.html HTML body
 * @param {Array} options.attachments Array of attachment objects { filename: string, path: string }
 */
export const enviarEmail = async ({ to, subject, text, html, attachments = [] }) => {
  try {
    // Verificar configuración
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.warn("⚠️ Nodemailer no configurado. Omite el envío de correo.");
      return null;
    }

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: (process.env.SMTP_PORT === "465"), // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    const info = await transporter.sendMail({
      from: process.env.EMAIL_FROM || `"PRESTUNI" <${process.env.SMTP_USER}>`,
      to,
      subject,
      text,
      html,
      attachments,
    });

    console.log("📨 Email enviado con éxito: %s", info.messageId);
    return info;

  } catch (error) {
    console.error("❌ Error enviando email:", error);
    // No lanzamos el error para que la operación principal (ej: guardar pago) no falle por el email
    return null;
  }
};
