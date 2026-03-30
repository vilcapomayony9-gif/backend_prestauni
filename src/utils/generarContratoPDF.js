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

  // Márgenes ligeramente más amplios para un aspecto más limpio
  const doc = new PDFDocument({ margin: 50, size: 'A4' });
  doc.pipe(fs.createWriteStream(rutaArchivo));

  // --- PALETA DE COLORES ---
  const colorPrimario = "#1E3A8A"; // Azul oscuro corporativo
  const colorTexto = "#334155"; // Gris pizarra oscuro
  const colorTextoClaro = "#64748B"; // Gris medio
  const colorFondo = "#F8FAFC"; // Gris muy claro para fondos

  // ===== ENCABEZADO =====
  const logoPath = path.join("public", "logo.png");
  let startY = 50;

  if (fs.existsSync(logoPath)) {
    doc.image(logoPath, 50, startY, { width: 80 });
  }

  // Información de la empresa alineada a la derecha
  doc
    .font("Helvetica-Bold")
    .fontSize(22)
    .fillColor(colorPrimario)
    .text("PRESTUNI", 200, startY, { align: "right" });
  
  doc
    .font("Helvetica")
    .fontSize(12)
    .fillColor(colorTextoClaro)
    .text("Servicios Financieros", { align: "right" });

  doc.moveDown(1.5);

  // Línea separadora del encabezado
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor(colorPrimario)
    .lineWidth(2)
    .stroke();

  doc.moveDown(2);

  // ===== TÍTULO Y METADATOS =====
  doc
    .fontSize(16)
    .font("Helvetica-Bold")
    .fillColor(colorTexto)
    .text("CONTRATO DE PRÉSTAMO CON GARANTÍA", { align: "left", characterSpacing: 1 });

  doc.moveDown(1);

  const fechaActual = new Date().toLocaleDateString();

  // Caja de metadatos (Fecha y N° Contrato)
  doc.rect(385, doc.y, 160, 40).fillAndStroke(colorFondo, "#E2E8F0");
  doc.fillColor(colorTexto).font("Helvetica-Bold").fontSize(10);
  doc.text(`Fecha:`, 395, doc.y - 32, { continued: true }).font("Helvetica").text(` ${fechaActual}`);
  doc.font("Helvetica-Bold").text(`N° Contrato:`, 395, doc.y + 5, { continued: true }).font("Helvetica").text(` ${numero_contrato}`);

  doc.moveDown(2);

  // ===== FUNCIONES DE DISEÑO =====
  const tituloSeccion = (titulo) => {
    doc.moveDown(1);
    const y = doc.y;
    // Fondo de la sección
    doc.rect(50, y, 495, 22).fill(colorFondo);
    doc
      .font("Helvetica-Bold")
      .fontSize(12)
      .fillColor(colorPrimario)
      .text(titulo.toUpperCase(), 60, y + 6);
    doc.moveDown(1);
  };

  const texto = (label, value) => {
    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor(colorTexto)
      .text(`${label}: `, { continued: true })
      .font("Helvetica")
      .fillColor(colorTextoClaro)
      .text(value);
    doc.moveDown(0.3);
  };

  // ===== DATOS DEL CLIENTE =====
  tituloSeccion("Datos del Cliente");
  texto("Nombre Completo", `${cliente.nombres} ${cliente.apellidos}`);
  texto("Documento de Identidad (DNI)", cliente.dni);
  texto("Institución Educativa", cliente.universidad);

  // ===== DATOS DEL PRÉSTAMO =====
  tituloSeccion("Detalles del Préstamo");
  texto("Monto Prestado", `S/ ${Number(prestamo.monto_prestado).toFixed(2)}`);
  texto("Tasa de Interés", `${contrato.interes}%`);
  texto("Monto Total a Pagar", `S/ ${Number(prestamo.monto_total).toFixed(2)}`);
  texto("Penalidad por Mora", `S/ ${Number(contrato.penalidad_mora).toFixed(2)}`);
  texto("Fecha de Vencimiento", new Date(prestamo.fecha_vencimiento).toLocaleDateString());
  texto("Frecuencia de Pago", prestamo.frecuencia_pago ? prestamo.frecuencia_pago.charAt(0).toUpperCase() + prestamo.frecuencia_pago.slice(1) : "Mensual");

  // ===== GARANTÍA =====
  tituloSeccion("Garantía Entregada");
  texto("Tipo de Bien", garantia.tipo);
  texto("Marca", garantia.marca);
  texto("Modelo", garantia.modelo);
  texto("Número de Serie", garantia.serie);

  // ===== CLÁUSULA =====
  tituloSeccion("Cláusula de Garantía");
  doc
    .font("Helvetica")
    .fontSize(10)
    .fillColor(colorTexto)
    .text(contrato.clausula_garantia, {
      align: "justify",
      lineGap: 4
    });

  doc.moveDown(2);

  // ===== CRONOGRAMA DE PAGOS =====
  // Verificamos si hay espacio en la página, si no, creamos una nueva
  if (doc.y > 600) doc.addPage();

  tituloSeccion("Cronograma de Pagos");

  const frecuencia = prestamo.frecuencia_pago || "mensual";
  let diasIncremento = 30;
  if (frecuencia === "diario") diasIncremento = 1;
  else if (frecuencia === "semanal") diasIncremento = 7;
  else if (frecuencia === "quincenal") diasIncremento = 15;

  const cuotas = prestamo.numero_cuotas;
  const montoPorCuota = (prestamo.monto_total / cuotas).toFixed(2);

  // Encabezado de la tabla
  const tableTop = doc.y;
  doc.rect(50, tableTop, 495, 20).fill(colorPrimario);
  doc.font("Helvetica-Bold").fontSize(10).fillColor("#FFFFFF");
  doc.text("Cuota N°", 60, tableTop + 5, { width: 80 });
  doc.text("Fecha de Pago Estimada", 150, tableTop + 5, { width: 200 });
  doc.text("Monto a Pagar", 380, tableTop + 5);

  let yPosition = tableTop + 20;
  let currentDate = new Date(prestamo.fecha_inicio || Date.now());

  doc.font("Helvetica").fillColor(colorTexto);

  for (let i = 1; i <= cuotas; i++) {
    // Si la tabla llega al final de la página, creamos una nueva
    if (yPosition > 750) {
      doc.addPage();
      yPosition = 50;
    }

    currentDate.setDate(currentDate.getDate() + diasIncremento);
    
    // Fila alternativa (Zebra striping)
    if (i % 2 === 0) doc.rect(50, yPosition, 495, 20).fill(colorFondo);
    
    doc.fillColor(colorTexto);
    doc.text(i.toString(), 60, yPosition + 5, { width: 80 });
    doc.text(currentDate.toLocaleDateString(), 150, yPosition + 5, { width: 200 });
    doc.text(`S/ ${montoPorCuota}`, 380, yPosition + 5);
    
    // Línea inferior de la celda
    doc.moveTo(50, yPosition + 20).lineTo(545, yPosition + 20).lineWidth(0.5).strokeColor("#E2E8F0").stroke();
    
    yPosition += 20;
  }

  // ===== FIRMAS =====
  // Asegurarnos de que las firmas no queden cortadas a mitad de página
  if (yPosition > 650) {
    doc.addPage();
  } else {
    doc.y = yPosition + 60; // Espacio antes de las firmas
  }

  const firmaY = doc.y;

  // Líneas de firma
  doc.moveTo(80, firmaY).lineTo(260, firmaY).lineWidth(1).strokeColor(colorTexto).stroke();
  doc.moveTo(330, firmaY).lineTo(510, firmaY).stroke();

  doc
    .fontSize(10)
    .font("Helvetica-Bold")
    .fillColor(colorTexto)
    .text("Firma del Cliente", 80, firmaY + 10, { width: 180, align: "center" })
    .text("Firma del Prestamista", 330, firmaY + 10, { width: 180, align: "center" });

  doc
    .font("Helvetica")
    .fontSize(8)
    .fillColor(colorTextoClaro)
    .text(`DNI: ${cliente.dni}`, 80, firmaY + 25, { width: 180, align: "center" });

  // ===== PIE DE PÁGINA =====
  const pageCount = doc.bufferedPageRange ? doc.bufferedPageRange().count : 1;
  doc.page.margins.bottom = 30;
  doc
    .fontSize(8)
    .fillColor(colorTextoClaro)
    .text(
      "Este documento constituye un acuerdo legal vinculante entre las partes. Generado automáticamente por PRESTUNI.",
      50,
      800,
      { align: "center", width: 495 }
    );

  doc.end();

  return rutaArchivo;
};