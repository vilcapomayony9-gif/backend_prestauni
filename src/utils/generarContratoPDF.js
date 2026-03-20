import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const generarContratoPDF = async ({
  numero_contrato,
  cliente,
  prestamo,
  garantia,
  contrato
}) => {
  const rutaCarpeta = path.join("uploads", "contratos");
  if (!fs.existsSync(rutaCarpeta)) {
    fs.mkdirSync(rutaCarpeta, { recursive: true });
  }

  const rutaArchivo = path.join(rutaCarpeta, `${numero_contrato}.pdf`);

  const doc = new PDFDocument({ margin: 50 });
  doc.pipe(fs.createWriteStream(rutaArchivo));

  // ===== ENCABEZADO =====
  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("CONTRATO DE PRÉSTAMO CON GARANTÍA", {
      align: "center"
    });

  doc.moveDown(0.5);

  doc
    .fontSize(10)
    .font("Helvetica")
    .text(`N° Contrato: ${numero_contrato}`, { align: "center" });

  // Línea separadora
  doc.moveDown(0.5);
  doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();

  doc.moveDown(1.5);

  // ===== FUNCIÓN PARA TÍTULOS =====
  const tituloSeccion = (titulo) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(13)
      .fillColor("#000")
      .text(titulo);
    doc.moveDown(0.5);
  };

  const texto = (label, value) => {
    doc
      .font("Helvetica-Bold")
      .text(`${label}: `, { continued: true })
      .font("Helvetica")
      .text(value);
  };

  // ===== DATOS DEL CLIENTE =====
  tituloSeccion("DATOS DEL CLIENTE");

  texto("Nombre", `${cliente.nombres} ${cliente.apellidos}`);
  texto("DNI", cliente.dni);
  texto("Universidad", cliente.universidad);

  doc.moveDown();

  // ===== DATOS DEL PRÉSTAMO =====
  tituloSeccion("DETALLES DEL PRÉSTAMO");

  texto("Monto prestado", `S/ ${prestamo.monto_prestado}`);
  texto("Interés", `${contrato.interes}%`);
  texto("Monto total", `S/ ${prestamo.monto_total}`);
  texto("Penalidad por mora", `S/ ${contrato.penalidad_mora}`);
  texto(
    "Fecha de vencimiento",
    new Date(prestamo.fecha_vencimiento).toLocaleDateString()
  );

  doc.moveDown();

  // ===== GARANTÍA =====
  tituloSeccion("GARANTÍA");

  texto("Tipo", garantia.tipo);
  texto("Marca", garantia.marca);
  texto("Modelo", garantia.modelo);
  texto("Serie", garantia.serie);

  doc.moveDown();

  // ===== CLÁUSULA =====
  tituloSeccion("CLÁUSULA DE GARANTÍA");

  doc
    .font("Helvetica")
    .fontSize(11)
    .text(contrato.clausula_garantia, {
      align: "justify",
      lineGap: 3
    });

  doc.moveDown(3);

  // ===== FIRMAS =====
  doc.moveTo(50, doc.y).lineTo(250, doc.y).stroke();
  doc.moveTo(300, doc.y).lineTo(500, doc.y).stroke();

  doc.moveDown(0.5);

  doc
    .fontSize(10)
    .text("Firma del Cliente", 50, doc.y, { width: 200, align: "center" })
    .text("Firma del Prestamista", 300, doc.y, { width: 200, align: "center" });

  doc.moveDown(2);

  // ===== PIE =====
  doc
    .fontSize(8)
    .fillColor("gray")
    .text(
      "Este documento es un contrato legal entre las partes. Generado automáticamente por el sistema.",
      { align: "center" }
    );

  doc.end();

  return rutaArchivo;
};