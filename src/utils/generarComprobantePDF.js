import PDFDocument from "pdfkit";
import fs from "fs";
import path from "path";

export const generarComprobantePDF = async ({
  pago,
  prestamo,
  cliente
}) => {
  const rutaCarpeta = path.join("uploads", "comprobantes");
  if (!fs.existsSync(rutaCarpeta)) {
    fs.mkdirSync(rutaCarpeta, { recursive: true });
  }

  const nombreArchivo = `comprobante_${pago._id}.pdf`;
  const rutaArchivo = path.join(rutaCarpeta, nombreArchivo);

  // Formato similar a un recibo o ticket, pero en A4 para mejor presentación
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(fs.createWriteStream(rutaArchivo));

  // --- PALETA DE COLORES ---
  const colorPrimario = "#10B981"; // Verde para pagos/éxito
  const colorTexto = "#1F2937";
  const colorTextoClaro = "#6B7280";
  const colorFondo = "#F9FAFB";

  // ===== ENCABEZADO =====
  const logoPath = path.join("public", "logo.png");
  let startY = 50;

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, startY, { width: 60 });
  }

  doc
    .font("Helvetica-Bold")
    .fontSize(20)
    .fillColor(colorPrimario)
    .text("PRESTUNI", 200, startY, { align: "right" });
  
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(colorTextoClaro)
    .text("Comprobante de Pago Electrónico", { align: "right" });

  doc.moveDown(1);

  // Línea decorativa
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor(colorPrimario)
    .lineWidth(2)
    .stroke();

  doc.moveDown(2);

  // ===== TÍTULO =====
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(colorTexto)
    .text("RECIBO DE PAGO", { align: "center" });

  doc.moveDown(1);

  // ===== INFORMACIÓN CENTRAL =====
  const drawRow = (label, value, y) => {
    doc.font("Helvetica-Bold").fontSize(10).fillColor(colorTexto).text(label, 70, y);
    doc.font("Helvetica").fillColor(colorTextoClaro).text(value, 250, y);
    doc.moveTo(70, y + 15).lineTo(525, y + 15).lineWidth(0.5).strokeColor("#E5E7EB").stroke();
  };

  let currentY = doc.y + 20;

  // Fondo para los datos
  doc.rect(50, currentY - 10, 495, 230).fill(colorFondo);
  doc.fillColor(colorTexto);

  drawRow("N° OPERACIÓN:", pago._id.toString().toUpperCase(), currentY);
  currentY += 30;
  drawRow("FECHA DE PAGO:", new Date(pago.fecha_pago || Date.now()).toLocaleString(), currentY);
  currentY += 30;
  drawRow("CLIENTE:", `${cliente.nombres} ${cliente.apellidos}`, currentY);
  currentY += 30;
  drawRow("DNI:", cliente.dni, currentY);
  currentY += 30;
  drawRow("PRÉSTAMO ID:", prestamo._id.toString().slice(-8).toUpperCase(), currentY);
  currentY += 30;
  drawRow("MEDIO DE PAGO:", (pago.medio_pago || "Efectivo").toUpperCase(), currentY);
  currentY += 30;
  drawRow("TIPO DE PAGO:", (pago.tipo || "Abono").toUpperCase(), currentY);

  doc.moveDown(4);

  // ===== MONTO SESTACADO =====
  const montoY = doc.y;
  doc.rect(150, montoY, 300, 50).fill(colorPrimario);
  doc
    .font("Helvetica-Bold")
    .fontSize(12)
    .fillColor("#FFFFFF")
    .text("MONTO PAGADO", 150, montoY + 10, { width: 300, align: "center" });
  
  doc
    .fontSize(18)
    .text(`S/ ${Number(pago.monto_pagado).toFixed(2)}`, 150, montoY + 25, { width: 300, align: "center" });

  doc.moveDown(5);

  // ===== RESUMEN DE SALDO =====
  doc
    .font("Helvetica-Bold")
    .fontSize(10)
    .fillColor(colorTexto)
    .text("Resumen del Préstamo:", 70);
  
  doc.moveDown(0.5);
  doc
    .font("Helvetica")
    .fillColor(colorTextoClaro)
    .text(`Saldo Anterior: S/ ${(prestamo.saldo_pendiente + pago.monto_pagado).toFixed(2)}`, 90)
    .text(`Monto Abonado: S/ ${pago.monto_pagado.toFixed(2)}`, 90)
    .font("Helvetica-Bold")
    .fillColor(colorTexto)
    .text(`Nuevo Saldo Pendiente: S/ ${prestamo.saldo_pendiente.toFixed(2)}`, 90);

  // ===== MENSAJE FINAL =====
  doc.moveDown(4);
  doc
    .font("Helvetica-Oblique")
    .fontSize(9)
    .fillColor(colorTextoClaro)
    .text("Gracias por su cumplimiento. Este es un comprobante generado automáticamente.", { align: "center" });

  doc.end();

  // Retornar la ruta relativa para ser accesible vía URL
  return rutaArchivo;
};
