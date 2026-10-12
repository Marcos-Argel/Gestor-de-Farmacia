import api from './api';

// Todo lo que necesita el Dashboard sale de endpoints que ya existen en el
// backend (no hay un /api/dashboard dedicado). Aqui los combinamos y
// derivamos los KPIs en el cliente.

function claveDia(fecha) {
  const d = new Date(fecha);
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

export const dashboardService = {
  async obtenerResumen() {
    // allSettled en vez de all: el rol INVENTARIO no tiene permiso sobre
    // /ventas (403), y con Promise.all eso tumbaba el Dashboard completo.
    // Ahora cada bloque que falle simplemente queda vacio.
    const resultados = await Promise.allSettled([
      api.get('/productos'),
      api.get('/ventas'),
      api.get('/reportes/stock-bajo'),
      api.get('/reportes/proximos-a-vencer'),
      api.get('/reportes/mal-estado'),
    ]);
    const [productos, ventas, stockBajo, proximosVencer, dadosDeBaja] = resultados.map((r) =>
      r.status === 'fulfilled' ? r.value.data : []
    );
    const puedeVerVentas = resultados[1].status === 'fulfilled';

    // Ventas de los ultimos 7 dias (incluido hoy), dia por dia.
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const ultimos7 = Array.from({ length: 7 }, (_, i) => {
      const fecha = new Date(hoy);
      fecha.setDate(hoy.getDate() - (6 - i));
      return { fecha, clave: claveDia(fecha), total: 0, cantidad: 0 };
    });
    const porClave = new Map(ultimos7.map((d) => [d.clave, d]));
    for (const v of ventas) {
      const dia = porClave.get(claveDia(v.fecha));
      if (dia) {
        dia.total += Number(v.total || 0);
        dia.cantidad += 1;
      }
    }
    const diaHoy = ultimos7[6];
    const diaAyer = ultimos7[5];

    // Productos mas vendidos en los ultimos 30 dias (por unidades).
    const hace30 = new Date(hoy);
    hace30.setDate(hoy.getDate() - 29);
    const unidades = new Map();
    for (const v of ventas) {
      if (new Date(v.fecha) < hace30) continue;
      for (const d of v.detalles ?? []) {
        const actual = unidades.get(d.productoId) ?? { nombre: d.productoNombre, cantidad: 0, total: 0 };
        actual.cantidad += d.cantidad;
        actual.total += Number(d.subtotal || 0);
        unidades.set(d.productoId, actual);
      }
    }
    const masVendidos = [...unidades.values()].sort((a, b) => b.cantidad - a.cantidad).slice(0, 5);

    return {
      puedeVerVentas,
      productosActivos: productos.length,
      ventasHoyCantidad: diaHoy.cantidad,
      ventasHoyTotal: diaHoy.total,
      ventasAyerTotal: diaAyer.total,
      ventasSemana: ultimos7,
      ventasSemanaTotal: ultimos7.reduce((s, d) => s + d.total, 0),
      masVendidos,
      stockBajoCantidad: stockBajo.length,
      stockBajoLista: stockBajo.slice(0, 5),
      proximosVencerCantidad: proximosVencer.length,
      proximosVencerLista: [...proximosVencer].sort((a, b) => a.diasParaVencer - b.diasParaVencer).slice(0, 5),
      // Lotes que el backend ya saco de la venta (ver VencimientoScheduler):
      // antes salian mezclados en "Proximos a vencer" con dias negativos.
      dadosDeBajaLista: [...dadosDeBaja].sort((a, b) => a.diasParaVencer - b.diasParaVencer),
    };
  },
};
