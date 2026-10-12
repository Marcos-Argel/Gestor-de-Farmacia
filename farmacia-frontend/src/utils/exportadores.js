// Las librerías de exportación (exceljs, jspdf, docx) son pesadas y solo
// las necesita alguien que de verdad haga clic en exportar -- por eso se
// importan de forma dinamica (import()) dentro de cada funcion en vez de
// arriba del archivo. Así Vite las separa en su propio chunk y no inflan
// el bundle principal que carga todo el mundo al entrar a la app.

import logoFarmaArgel from '../assets/logo-farma-argel.png';

// Paleta de marca (ver tailwind.config / brand tokens del proyecto).
const COLOR_FOREST = '1F4B3F';
const COLOR_FOREST_RGB = [31, 75, 63];
const COLOR_COPPER = 'C1622D';
const COLOR_COPPER_RGB = [193, 98, 45];
const COLOR_BANDA_SUAVE = 'EFF5F1'; // tinte muy suave del verde bosque, para filas alternas

function descargarBlob(blob, nombreArchivo) {
  const url = URL.createObjectURL(blob);
  const enlace = document.createElement('a');
  enlace.href = url;
  enlace.download = nombreArchivo;
  document.body.appendChild(enlace);
  enlace.click();
  document.body.removeChild(enlace);
  URL.revokeObjectURL(url);
}

// El logo (465x615px, proporcion ~0.756) se carga UNA sola vez y se
// reutiliza en las 3 exportaciones que lo necesitan (Excel, PDF, Word).
// Se guardan tanto el ArrayBuffer (lo pide docx) como el data URL en
// base64 (lo piden ExcelJS y jsPDF), para no tener que convertir dos veces.
let logoPromise = null;
function obtenerLogo() {
  if (!logoPromise) {
    logoPromise = fetch(logoFarmaArgel)
      .then((resp) => resp.blob())
      .then(
        (blob) =>
          new Promise((resolve, reject) => {
            const lector = new FileReader();
            lector.onload = async () => {
              resolve({ dataUrl: lector.result, arrayBuffer: await blob.arrayBuffer() });
            };
            lector.onerror = reject;
            lector.readAsDataURL(blob);
          })
      );
  }
  return logoPromise;
}

// columnas: [{ clave, etiqueta }]
// filas: [{ clave: valor, ... }]

export function exportarCSV(titulo, columnas, filas) {
  const encabezado = columnas.map((c) => `"${c.etiqueta}"`).join(',');
  const cuerpo = filas
    .map((fila) =>
      columnas.map((c) => `"${String(fila[c.clave] ?? '').replace(/"/g, '""')}"`).join(',')
    )
    .join('\n');
  const contenido = '\uFEFF' + encabezado + '\n' + cuerpo; // BOM para que Excel abra bien los acentos
  descargarBlob(new Blob([contenido], { type: 'text/csv;charset=utf-8;' }), `${titulo}.csv`);
  // El CSV es texto plano -- no soporta colores ni logo, por eso se deja
  // igual que antes. El branding se aplica en Excel, PDF y Word.
}

export async function exportarExcel(titulo, columnas, filas) {
  const [{ default: ExcelJS }, { dataUrl }] = await Promise.all([import('exceljs'), obtenerLogo()]);

  const libro = new ExcelJS.Workbook();
  libro.creator = 'Farma Argel';
  const hoja = libro.addWorksheet(titulo.slice(0, 31), {
    views: [{ showGridLines: false }], // se ve mas limpio sin la cuadricula gris de fondo
  });

  const totalColumnas = Math.max(columnas.length, 3);
  hoja.columns = columnas.map((c) => ({ key: c.clave, width: 24 }));

  // Logo arriba a la izquierda (columna A, filas 1-3).
  const logoId = libro.addImage({ base64: dataUrl, extension: 'png' });
  hoja.addImage(logoId, { tl: { col: 0, row: 0 }, ext: { width: 56, height: 74 } });

  // Titulo y subtitulo, corridos a la columna B para no tapar el logo.
  hoja.getRow(1).height = 22;
  hoja.getRow(2).height = 16;

  hoja.mergeCells(1, 2, 1, totalColumnas + 1);
  const celdaTitulo = hoja.getCell(1, 2);
  celdaTitulo.value = titulo;
  celdaTitulo.font = { size: 14, bold: true, color: { argb: `FF${COLOR_FOREST}` } };
  celdaTitulo.alignment = { vertical: 'middle' };

  hoja.mergeCells(2, 2, 2, totalColumnas + 1);
  const celdaSubtitulo = hoja.getCell(2, 2);
  celdaSubtitulo.value = `Farma Argel · ${new Date().toLocaleString('es-CO')}`;
  celdaSubtitulo.font = { size: 9, italic: true, color: { argb: `FF${COLOR_COPPER}` } };
  celdaSubtitulo.alignment = { vertical: 'middle' };

  // Fila 3 se deja en blanco como respiro visual; el encabezado real va en la 4.
  const filaEncabezado = hoja.getRow(4);
  columnas.forEach((c, i) => {
    const celda = filaEncabezado.getCell(i + 1);
    celda.value = c.etiqueta;
    celda.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_FOREST}` } };
    celda.alignment = { vertical: 'middle' };
  });
  filaEncabezado.height = 20;

  // Filas de datos con "zebra striping" (bandas alternas) para que sea
  // mas facil seguir una fila larga con la vista.
  filas.forEach((fila, indice) => {
    const filaExcel = hoja.addRow(columnas.map((c) => fila[c.clave] ?? ''));
    if (indice % 2 === 1) {
      filaExcel.eachCell((celda) => {
        celda.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: `FF${COLOR_BANDA_SUAVE}` } };
      });
    }
  });

  const buffer = await libro.xlsx.writeBuffer();
  descargarBlob(
    new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
    `${titulo}.xlsx`
  );
}

export async function exportarPDF(titulo, columnas, filas) {
  const [[{ default: jsPDF }, { default: autoTable }], { dataUrl }] = await Promise.all([
    Promise.all([import('jspdf'), import('jspdf-autotable')]),
    obtenerLogo(),
  ]);

  const doc = new jsPDF();

  // Logo arriba a la izquierda, manteniendo la proporcion real del PNG
  // (465x615 ≈ 0.756) para que no se vea deformado.
  doc.addImage(dataUrl, 'PNG', 14, 8, 14, 18.5);

  doc.setFontSize(14);
  doc.setTextColor(...COLOR_FOREST_RGB);
  doc.text(titulo, 32, 15);

  doc.setFontSize(9);
  doc.setTextColor(...COLOR_COPPER_RGB);
  doc.text(`Farma Argel · ${new Date().toLocaleString('es-CO')}`, 32, 21);

  // Linea divisoria color cobre debajo del encabezado, como acento de marca.
  doc.setDrawColor(...COLOR_COPPER_RGB);
  doc.setLineWidth(0.4);
  doc.line(14, 28, 196, 28);

  autoTable(doc, {
    startY: 33,
    head: [columnas.map((c) => c.etiqueta)],
    body: filas.map((fila) => columnas.map((c) => String(fila[c.clave] ?? ''))),
    headStyles: { fillColor: COLOR_FOREST_RGB, textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [239, 245, 241] }, // mismo tinte suave que en Excel
    styles: { fontSize: 8 },
  });

  doc.save(`${titulo}.pdf`);
}

export async function exportarWord(titulo, columnas, filas) {
  const [
    { Document, Packer, Paragraph, Table, TableRow, TableCell, HeadingLevel, WidthType, ImageRun, TextRun, ShadingType },
    { arrayBuffer },
  ] = await Promise.all([import('docx'), obtenerLogo()]);

  const filaEncabezado = new TableRow({
    children: columnas.map(
      (c) =>
        new TableCell({
          shading: { type: ShadingType.SOLID, fill: COLOR_FOREST },
          children: [new Paragraph({ children: [new TextRun({ text: c.etiqueta, bold: true, color: 'FFFFFF' })] })],
        })
    ),
  });

  const filasDatos = filas.map(
    (fila, indice) =>
      new TableRow({
        children: columnas.map(
          (c) =>
            new TableCell({
              shading: indice % 2 === 1 ? { type: ShadingType.SOLID, fill: COLOR_BANDA_SUAVE } : undefined,
              children: [new Paragraph(String(fila[c.clave] ?? ''))],
            })
        ),
      })
  );

  const doc = new Document({
    sections: [
      {
        children: [
          // Logo, manteniendo su proporcion real (465x615 ≈ 0.756).
          new Paragraph({
            children: [
              new ImageRun({
                type: 'png',
                data: arrayBuffer,
                transformation: { width: 42, height: 55 },
              }),
            ],
          }),
          new Paragraph({
            children: [new TextRun({ text: titulo, bold: true, size: 32, color: COLOR_FOREST })],
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 120 },
          }),
          new Paragraph({
            children: [
              new TextRun({
                text: `Farma Argel · ${new Date().toLocaleString('es-CO')}`,
                italics: true,
                size: 18,
                color: COLOR_COPPER,
              }),
            ],
            spacing: { after: 200 },
          }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [filaEncabezado, ...filasDatos],
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  descargarBlob(blob, `${titulo}.docx`);
}
