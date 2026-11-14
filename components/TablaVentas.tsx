"use client";

import { useEffect, useRef, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCatalogo } from '../lib/catalogo';
import type { ResumenVentas, Venta } from '../lib/tipos';
import CamposVenta from './CamposVenta';
import { Download, Search, ChevronLeft, ChevronRight, Pencil, Trash2, X } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';

const REGISTROS_POR_PAGINA = 10;
/** Máximo de filas que Supabase devuelve por petición */
const TAMANO_LOTE = 1000;

const RESUMEN_VACIO: ResumenVentas = { total: 0, transacciones: 0, mas_vendido: null, por_dia: [], productos: [] };

/** Rango [día 1 del mes, día 1 del mes siguiente) para no generar fechas inválidas como 2026-02-31 */
function rangoDelMes(mesAno: string) {
  if (!mesAno) return null;
  const [año, mes] = mesAno.split('-').map(Number);
  const desde = `${mesAno}-01`;
  const hasta = mes === 12 ? `${año + 1}-01-01` : `${año}-${String(mes + 1).padStart(2, '0')}-01`;
  return { desde, hasta };
}

/** Quita los caracteres con significado especial en los filtros de Supabase */
function limpiarBusqueda(texto: string) {
  return texto.replace(/[,()"\\%*]/g, ' ').trim();
}

export default function TablaVentas({ recarga = 0 }: { recarga?: number }) {
  const { catalogo } = useCatalogo();

  const [ventas, setVentas] = useState<Venta[]>([]);
  const [totalRegistros, setTotalRegistros] = useState(0);
  const [resumen, setResumen] = useState<ResumenVentas>(RESUMEN_VACIO);
  const [cargando, setCargando] = useState(true);
  const [exportando, setExportando] = useState(false);

  const [filtroMesAno, setFiltroMesAno] = useState('');
  const [filtroProducto, setFiltroProducto] = useState('Todos');
  const [buscarText, setBuscarText] = useState('');
  // Texto de búsqueda que realmente se envía, con 300 ms de espera para no consultar en cada tecla
  const [busqueda, setBusqueda] = useState('');

  const [pagina, setPagina] = useState(1);

  const [ventaEditando, setVentaEditando] = useState<Venta | null>(null);
  const [editFecha, setEditFecha] = useState('');
  const [editVendedor, setEditVendedor] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editProducto, setEditProducto] = useState('');
  const [editIngreso, setEditIngreso] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [mensajeError, setMensajeError] = useState('');
  const [errorEdicion, setErrorEdicion] = useState('');

  // Evita que una respuesta lenta de un filtro anterior sobrescriba la más reciente
  const ultimaPeticion = useRef(0);

  // resolvedTheme da 'dark' o 'light' también cuando el tema elegido es 'system'
  const { resolvedTheme } = useTheme();
  const colorGrafico = resolvedTheme === 'dark' ? '#60a5fa' : '#2563eb';

  useEffect(() => {
    const t = setTimeout(() => {
      setBusqueda(limpiarBusqueda(buscarText));
      setPagina(1);
    }, 300);
    return () => clearTimeout(t);
  }, [buscarText]);

  /** Consulta de ventas con los filtros actuales (la misma para la tabla y para exportar) */
  const consultaVentas = (conConteo: boolean) => {
    let q = supabase.from('ventas').select('*', conConteo ? { count: 'exact' } : undefined);
    const rango = rangoDelMes(filtroMesAno);
    if (rango) q = q.gte('fecha_venta', rango.desde).lt('fecha_venta', rango.hasta);
    if (filtroProducto !== 'Todos') q = q.eq('producto', filtroProducto);
    if (busqueda) {
      q = q.or(`producto.ilike."%${busqueda}%",categoria.ilike."%${busqueda}%",vendedor.ilike."%${busqueda}%"`);
    }
    return q.order('fecha_venta', { ascending: false }).order('id', { ascending: false });
  };

  const cargarDatos = async () => {
    const peticion = ++ultimaPeticion.current;
    setCargando(true);
    const rango = rangoDelMes(filtroMesAno);
    const desde = (pagina - 1) * REGISTROS_POR_PAGINA;

    const [resPagina, resResumen] = await Promise.all([
      consultaVentas(true).range(desde, desde + REGISTROS_POR_PAGINA - 1),
      supabase.rpc('resumen_ventas', {
        p_desde: rango?.desde ?? null,
        p_hasta: rango?.hasta ?? null,
        p_producto: filtroProducto !== 'Todos' ? filtroProducto : null,
        p_buscar: busqueda || null,
      }),
    ]);
    if (peticion !== ultimaPeticion.current) return;

    // La página pedida ya no existe (p. ej. tras borrar): volver a la primera
    if (resPagina.error?.code === 'PGRST103') {
      setPagina(1);
      return;
    }
    const error = resPagina.error || resResumen.error;
    if (error) {
      setMensajeError('No se pudieron cargar las ventas: ' + error.message);
    } else {
      setMensajeError('');
      setVentas(resPagina.data as Venta[]);
      setTotalRegistros(resPagina.count ?? 0);
      setResumen(resResumen.data as ResumenVentas);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroMesAno, filtroProducto, busqueda, pagina, recarga]);

  const eliminarVenta = async (id: Venta['id']) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    // .select() devuelve las filas afectadas: con RLS, un bloqueo no da error sino 0 filas
    const { data, error } = await supabase.from('ventas').delete().eq('id', id).select();
    if (error || !data?.length) {
      setMensajeError('No se pudo eliminar la venta' + (error ? ': ' + error.message : ' (sin permisos o ya no existe).'));
      return;
    }
    // Si era el último registro de la página, ir a la anterior
    if (ventas.length === 1 && pagina > 1) setPagina(pagina - 1);
    else cargarDatos();
  };

  const abrirModalEdicion = (venta: Venta) => {
    setErrorEdicion('');
    setVentaEditando(venta);
    setEditFecha(venta.fecha_venta);
    setEditVendedor(venta.vendedor ?? '');
    setEditCategoria(venta.categoria || '');
    setEditProducto(venta.producto);
    setEditIngreso(venta.ingreso.toString());
  };

  const cambiarCategoriaEdicion = (nueva: string) => {
    setEditCategoria(nueva);
    setEditProducto('');
  };

  const cambiarProductoEdicion = (nombre: string, precio?: number) => {
    setEditProducto(nombre);
    if (precio !== undefined) setEditIngreso(precio.toString());
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ventaEditando) return;
    const monto = parseFloat(editIngreso);
    if (!Number.isFinite(monto) || monto <= 0) {
      setErrorEdicion('El ingreso debe ser un número mayor que 0.');
      return;
    }
    setGuardandoEdicion(true);
    setErrorEdicion('');
    const { data, error } = await supabase.from('ventas').update({
      fecha_venta: editFecha,
      vendedor: editVendedor,
      categoria: editCategoria,
      producto: editProducto,
      ingreso: monto
    }).eq('id', ventaEditando.id).select();

    if (error || !data?.length) {
      setErrorEdicion('No se pudo guardar' + (error ? ': ' + error.message : ' (sin permisos o el registro ya no existe).'));
    } else {
      setVentaEditando(null);
      cargarDatos();
    }
    setGuardandoEdicion(false);
  };

  const totalPaginas = Math.ceil(totalRegistros / REGISTROS_POR_PAGINA) || 1;

  let datosGrafico: { fecha: string; total: number }[] = resumen.por_dia.map((d) => ({ fecha: d.fecha, total: Number(d.total) }));
  if (datosGrafico.length === 1) {
    datosGrafico = [{ fecha: 'Inicio', total: 0 }, ...datosGrafico];
  }

  // Productos del filtro: mantener el elegido aunque no tenga ventas en el mes seleccionado
  const productosFiltro = filtroProducto !== 'Todos' && !resumen.productos.includes(filtroProducto)
    ? [...resumen.productos, filtroProducto].sort((a, b) => a.localeCompare(b))
    : resumen.productos;

  const exportarExcel = async () => {
    setExportando(true);
    // Todas las ventas que cumplen los filtros, en lotes (Supabase devuelve como máximo 1000 por petición)
    const todas: Venta[] = [];
    for (let desde = 0; ; desde += TAMANO_LOTE) {
      const { data, error } = await consultaVentas(false).range(desde, desde + TAMANO_LOTE - 1);
      if (error) {
        setMensajeError('No se pudo exportar: ' + error.message);
        setExportando(false);
        return;
      }
      todas.push(...(data as Venta[]));
      if (data.length < TAMANO_LOTE) break;
    }

    // Se carga solo al exportar, para no hacer más pesada la carga inicial de la página
    const XLSX = await import('xlsx');
    const datosExportar = todas.map(v => {
      const fechaObj = new Date(v.fecha_venta + 'T00:00:00');
      const mesTexto = fechaObj.toLocaleDateString('es-ES', { month: 'long' });
      return {
        'Fecha': v.fecha_venta,
        'Mes': mesTexto.charAt(0).toUpperCase() + mesTexto.slice(1),
        'Vendedor': v.vendedor || 'Sin vendedor',
        'Categoría': v.categoria || 'Sin categoría',
        'Producto': v.producto,
        'Ingreso (S/)': Number(v.ingreso)
      };
    });
    const hoja = XLSX.utils.json_to_sheet(datosExportar);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Reporte");
    XLSX.writeFile(libro, `Reporte_Ventas_${filtroMesAno || 'historico'}.xlsx`);
    setExportando(false);
  };

  const inputClass = "w-full border border-gray-200 dark:border-slate-700 rounded-md p-2 text-sm text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-700/50 focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 transition-colors";
  const labelClass = "block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1";
  const cardClass = "bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 flex flex-col justify-between transition-colors";
  const tdClass = "p-3.5 text-sm text-gray-700 dark:text-slate-300";

  return (
    <div className="space-y-6 relative">
      {mensajeError && (
        <div role="alert" className="flex justify-between items-start gap-3 p-3 rounded-md border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 text-sm text-red-700 dark:text-red-300">
          <span>{mensajeError}</span>
          <button onClick={() => setMensajeError('')} aria-label="Cerrar aviso" className="shrink-0 hover:opacity-70"><X size={16} /></button>
        </div>
      )}
      <div className={`${cardClass} p-4 grid grid-cols-1 md:grid-cols-3 gap-4`}>
        <div>
          <label htmlFor="filtro-mes" className={labelClass}>Año / Mes</label>
          <input id="filtro-mes" type="month" value={filtroMesAno} onChange={(e) => { setFiltroMesAno(e.target.value); setPagina(1); }} className={inputClass}/>
        </div>
        <div>
          <label htmlFor="filtro-producto" className={labelClass}>Producto</label>
          <select id="filtro-producto" value={filtroProducto} onChange={(e) => { setFiltroProducto(e.target.value); setPagina(1); }} className={inputClass}>
            <option value="Todos">Todos los productos</option>
            {productosFiltro.map(prod => (<option key={prod} value={prod}>{prod}</option>))}
          </select>
        </div>

        <div>
          <label htmlFor="filtro-buscar" className={labelClass}>Buscar</label>
          <div className="relative">
            <input
              id="filtro-buscar"
              type="text"
              placeholder="Producto, categoría o vendedor..."
              value={buscarText}
              onChange={(e) => setBuscarText(e.target.value)}
              className={`${inputClass} pl-9`}
            />
            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={`${cardClass} relative overflow-hidden h-32`}>
          <div className="p-5 z-10 relative">
            <p className={labelClass}>Total Ingresos</p>
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">S/ {Number(resumen.total).toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-90">
            {datosGrafico.length > 1 && (
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={datosGrafico}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={colorGrafico} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={colorGrafico} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="total"
                    stroke={colorGrafico}
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#colorTotal)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
        <div className={`${cardClass} p-5 h-32`}>
          <div><p className={labelClass}>Producto más vendido</p><h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1 truncate">{resumen.mas_vendido ?? 'Ninguno'}</h3></div>
        </div>
        <div className={`${cardClass} p-5 h-32`}>
          <div><p className={labelClass}>Transacciones</p><h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{resumen.transacciones}</h3></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-4 flex justify-between items-center border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Registros Recientes</h2>
          <button onClick={exportarExcel} disabled={exportando} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 disabled:opacity-60 text-xs font-semibold">
            <Download size={14} /> {exportando ? 'Exportando...' : 'Exportar'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 text-xs border-b border-gray-200 dark:border-slate-700 uppercase font-bold tracking-wider">
                <th className="p-3.5 pl-6">Fecha</th>
                <th className="p-3.5">Vendedor</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Producto</th>
                <th className="p-3.5 text-right">Monto (S/)</th>
                <th className="p-3.5 text-center pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Cargando...</td></tr>
              ) : ventas.length === 0 ? (
                <tr><td colSpan={6} className="p-8 text-center text-gray-400">Sin registros.</td></tr>
              ) : (
                ventas.map((venta) => (
                  <tr key={venta.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50/30 dark:hover:bg-slate-700/30">
                    <td className={`${tdClass} pl-6`}>{venta.fecha_venta}</td>
                    <td className={tdClass}>{venta.vendedor || '-'}</td>
                    <td className={`${tdClass} font-medium`}>{venta.categoria || '-'}</td>
                    <td className={tdClass}>{venta.producto}</td>
                    <td className={`${tdClass} font-semibold text-gray-900 dark:text-white text-right`}>S/ {Number(venta.ingreso).toFixed(2)}</td>
                    <td className="p-3.5 pr-6">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => abrirModalEdicion(venta)} aria-label="Editar venta" className="text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 p-1.5 rounded-md">
                          <Pencil size={16} />
                        </button>
                        <button onClick={() => eliminarVenta(venta.id)} aria-label="Eliminar venta" className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 p-1.5 rounded-md">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalRegistros > REGISTROS_POR_PAGINA && (
          <div className="p-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-sm text-gray-500 dark:text-slate-400">
            <span>Página {pagina} de {totalPaginas} · {totalRegistros} registros</span>
            <div className="flex gap-1">
              <button onClick={() => setPagina(Math.max(pagina - 1, 1))} disabled={pagina === 1 || cargando} aria-label="Página anterior" className="p-1 border border-gray-200 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPagina(Math.min(pagina + 1, totalPaginas))} disabled={pagina >= totalPaginas || cargando} aria-label="Página siguiente" className="p-1 border border-gray-200 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {ventaEditando && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-transparent dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Editar Venta</h3>
              <button onClick={() => setVentaEditando(null)} aria-label="Cerrar" className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
            </div>
            <form onSubmit={guardarEdicion} className="p-6 space-y-4">
              <div>
                <label htmlFor="editar-fecha" className={labelClass}>Fecha</label>
                <input id="editar-fecha" type="date" required value={editFecha} onChange={(e) => setEditFecha(e.target.value)} className={inputClass} />
              </div>
              <CamposVenta
                idPrefijo="editar"
                catalogo={catalogo}
                categoria={editCategoria}
                producto={editProducto}
                vendedor={editVendedor}
                onCategoria={cambiarCategoriaEdicion}
                onProducto={cambiarProductoEdicion}
                onVendedor={setEditVendedor}
                inputClass={inputClass}
                labelClass={labelClass}
              />
              <div>
                <label htmlFor="editar-ingreso" className={labelClass}>Ingreso (S/)</label>
                <input id="editar-ingreso" type="number" step="0.01" min="0.01" required value={editIngreso} onChange={(e) => setEditIngreso(e.target.value)} className={inputClass} />
              </div>
              {errorEdicion && <p role="alert" className="text-sm text-red-600 dark:text-red-400">{errorEdicion}</p>}
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setVentaEditando(null)} className="flex-1 bg-gray-100 dark:bg-slate-700 text-gray-700 dark:text-slate-300 font-semibold py-2 rounded-md hover:bg-gray-200 dark:hover:bg-slate-600 text-sm">Cancelar</button>
                <button type="submit" disabled={guardandoEdicion} className="flex-1 bg-blue-600 text-white font-semibold py-2 rounded-md hover:bg-blue-700 text-sm">{guardandoEdicion ? 'Guardando...' : 'Guardar'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
