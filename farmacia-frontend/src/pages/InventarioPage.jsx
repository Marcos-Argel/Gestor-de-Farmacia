import { useEffect, useMemo, useState } from 'react';
import { Plus, Search, Pencil, Ban, Package, Tags } from 'lucide-react';
import { productoService } from '../services/productoService';
import { categoriaService } from '../services/categoriaService';
import { proveedorService } from '../services/proveedorService';
import ProductoFormModal from '../components/ProductoFormModal';
import CategoriasModal from '../components/CategoriasModal';
import { useIdioma } from '../context/LanguageContext';
import { toast } from 'sonner';
import { confirmar } from '../components/ui/Confirmacion';

const formatoMoneda = new Intl.NumberFormat('es-CO', {
  style: 'currency',
  currency: 'COP',
  maximumFractionDigits: 0,
});

export default function InventarioPage() {
  const { t } = useIdioma();
  const [productos, setProductos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [modalAbierto, setModalAbierto] = useState(false);
  const [productoEditando, setProductoEditando] = useState(null);
  const [modalCategoriasAbierto, setModalCategoriasAbierto] = useState(false);

  const categoriasPorId = useMemo(() => {
    const mapa = {};
    categorias.forEach((c) => (mapa[c.id] = c.nombre));
    return mapa;
  }, [categorias]);

  async function cargarTodo(nombre) {
    setCargando(true);
    setError('');
    try {
      const [productosData, categoriasData, proveedoresData] = await Promise.all([
        productoService.listar(nombre),
        categoriaService.listar(),
        proveedorService.listar(),
      ]);
      setProductos(productosData);
      setCategorias(categoriasData);
      setProveedores(proveedoresData);
    } catch {
      setError(t('inventario.loadError'));
    } finally {
      setCargando(false);
    }
  }

  useEffect(() => {
    cargarTodo();
  }, []);

  function manejarBusqueda(e) {
    e.preventDefault();
    cargarTodo(busqueda.trim() || undefined);
  }

  function abrirCrear() {
    setProductoEditando(null);
    setModalAbierto(true);
  }

  function abrirEditar(producto) {
    setProductoEditando(producto);
    setModalAbierto(true);
  }

  function cerrarModal() {
    setModalAbierto(false);
    setProductoEditando(null);
  }

  function manejarGuardado() {
    cerrarModal();
    cargarTodo(busqueda.trim() || undefined);
  }

  async function manejarDesactivar(producto) {
    const confirmado = await confirmar({ titulo: t('inventario.confirmDeactivate', { nombre: producto.nombre }), peligro: true });
    if (!confirmado) return;

    try {
      await productoService.desactivar(producto.id);
      cargarTodo(busqueda.trim() || undefined);
    } catch {
      toast.error(t('inventario.deactivateError'));
    }
  }

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="font-display font-semibold text-2xl text-text">{t('inventario.title')}</h1>
          <p className="text-sm text-text-secondary mt-1">
            {t('inventario.subtitle')}
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setModalCategoriasAbierto(true)}
            className="flex items-center justify-center gap-2 text-text-secondary border border-border hover:bg-bg text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            <Tags className="w-4 h-4" />
            {t('inventario.categoriesButton')}
          </button>
          <button
            onClick={abrirCrear}
            className="flex items-center justify-center gap-2 bg-brand-forest hover:bg-brand-forest-dark text-white text-sm font-medium rounded-lg px-4 py-2.5 transition-colors"
          >
            <Plus className="w-4 h-4" />
            {t('inventario.newProductButton')}
          </button>
        </div>
      </div>

      <form onSubmit={manejarBusqueda} className="mb-5 flex gap-2 max-w-md">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-text-disabled absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder={t('inventario.searchPlaceholder')}
            className="w-full text-sm border border-border rounded-lg pl-9 pr-3 py-2.5 outline-none focus:border-brand-forest focus:ring-1 focus:ring-brand-forest transition-colors bg-surface"
          />
        </div>
        <button
          type="submit"
          className="px-4 py-2.5 text-sm font-medium text-text-secondary border border-border rounded-lg hover:bg-bg transition-colors"
        >
          {t('inventario.searchButton')}
        </button>
      </form>

      {error && (
        <p className="text-sm text-danger bg-danger/10 border border-danger/20 rounded-lg px-4 py-3 mb-5">
          {error}
        </p>
      )}

      <div className="bg-surface border border-border rounded-xl overflow-hidden">
        {cargando ? (
          <div className="p-6 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-10 rounded-lg bg-bg animate-pulse" />
            ))}
          </div>
        ) : productos.length === 0 ? (
          <div className="flex flex-col items-center justify-center text-center py-16">
            <div className="w-12 h-12 rounded-full bg-brand-forest-light flex items-center justify-center mb-3">
              <Package className="w-6 h-6 text-brand-forest" strokeWidth={1.75} />
            </div>
            <p className="text-sm font-medium text-text mb-1">{t('inventario.emptyTitle')}</p>
            <p className="text-sm text-text-secondary">{t('inventario.emptyHint')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-text-secondary uppercase tracking-wide">
                  <th className="px-5 py-3 font-medium">{t('inventario.colProduct')}</th>
                  <th className="px-5 py-3 font-medium">{t('inventario.colCategory')}</th>
                  <th className="px-5 py-3 font-medium">{t('inventario.colSalePrice')}</th>
                  <th className="px-5 py-3 font-medium">{t('inventario.colStock')}</th>
                  <th className="px-5 py-3 font-medium">{t('inventario.colPrescription')}</th>
                  <th className="px-5 py-3 font-medium text-right">{t('inventario.colActions')}</th>
                </tr>
              </thead>
              <tbody>
                {productos.map((p) => {
                  const stockBajo = p.stockActual != null && p.stockActual <= (p.stockMinimo ?? 0);
                  return (
                    <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg/60">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-md border border-border bg-bg flex items-center justify-center overflow-hidden shrink-0">
                            {p.imagenBase64 ? (
                              <img src={p.imagenBase64} alt={p.nombre} className="w-full h-full object-cover" />
                            ) : (
                              <Package className="w-4 h-4 text-text-disabled" strokeWidth={1.5} />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-text">{p.nombre}</p>
                            {p.presentacion && (
                              <p className="text-xs text-text-disabled">{p.presentacion}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3 text-text-secondary">
                        {categoriasPorId[p.categoriaId] ?? '—'}
                      </td>
                      <td className="px-5 py-3 text-text">
                        {formatoMoneda.format(p.precioVenta ?? 0)}
                      </td>
                      <td className="px-5 py-3">
                        <span className={stockBajo ? 'text-warning font-medium' : 'text-text'}>
                          {p.stockActual ?? 0}
                        </span>
                        <span className="text-text-disabled"> / {t('inventario.minAbbrev', { cantidad: p.stockMinimo ?? 0 })}</span>
                      </td>
                      <td className="px-5 py-3">
                        {p.requiereReceta ? (
                          <span className="text-xs font-medium text-accent-copper bg-accent-copper-light px-2 py-0.5 rounded-full">
                            {t('inventario.yes')}
                          </span>
                        ) : (
                          <span className="text-xs text-text-disabled">{t('inventario.no')}</span>
                        )}
                      </td>
                      <td className="px-5 py-3">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => abrirEditar(p)}
                            className="p-2 text-text-secondary hover:text-brand-forest hover:bg-brand-forest-light rounded-lg transition-colors"
                            aria-label={t('inventario.editAria', { nombre: p.nombre })}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => manejarDesactivar(p)}
                            className="p-2 text-text-secondary hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                            aria-label={t('inventario.deactivateAria', { nombre: p.nombre })}
                          >
                            <Ban className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {modalAbierto && (
        <ProductoFormModal
          producto={productoEditando}
          categorias={categorias}
          proveedores={proveedores}
          onClose={cerrarModal}
          onGuardado={manejarGuardado}
        />
      )}

      {modalCategoriasAbierto && (
        <CategoriasModal
          categorias={categorias}
          onClose={() => setModalCategoriasAbierto(false)}
          onCambio={() => cargarTodo(busqueda.trim() || undefined)}
        />
      )}
    </div>
  );
}
