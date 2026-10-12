import { useState } from 'react';
import { FileText, FileSpreadsheet, FileType, Download, Loader2 } from 'lucide-react';
import { exportarCSV, exportarExcel, exportarPDF, exportarWord } from '../utils/exportadores';

// columnas: [{ clave, etiqueta }]  filas: [{ clave: valor, ... }]
export default function BotonesExportar({ titulo, columnas, filas }) {
  const [exportando, setExportando] = useState(null);

  const sinDatos = filas.length === 0;

  async function manejar(formato, fn) {
    setExportando(formato);
    try {
      await fn(titulo, columnas, filas);
    } finally {
      setExportando(null);
    }
  }

  const botonClase =
    'flex items-center gap-1.5 text-xs font-medium text-text-secondary border border-border rounded-lg px-3 py-1.5 hover:bg-bg hover:text-text transition-colors disabled:opacity-40 disabled:cursor-not-allowed';

  return (
    <div className="flex flex-wrap gap-2">
      <button
        onClick={() => manejar('csv', exportarCSV)}
        disabled={sinDatos || exportando}
        className={botonClase}
      >
        {exportando === 'csv' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
        CSV
      </button>
      <button
        onClick={() => manejar('excel', exportarExcel)}
        disabled={sinDatos || exportando}
        className={botonClase}
      >
        {exportando === 'excel' ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <FileSpreadsheet className="w-3.5 h-3.5" />
        )}
        Excel
      </button>
      <button
        onClick={() => manejar('pdf', exportarPDF)}
        disabled={sinDatos || exportando}
        className={botonClase}
      >
        {exportando === 'pdf' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileType className="w-3.5 h-3.5" />}
        PDF
      </button>
      <button
        onClick={() => manejar('word', exportarWord)}
        disabled={sinDatos || exportando}
        className={botonClase}
      >
        {exportando === 'word' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileText className="w-3.5 h-3.5" />}
        Word
      </button>
    </div>
  );
}
