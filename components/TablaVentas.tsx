"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { Download, Search, ChevronLeft, ChevronRight, Pencil, Trash2, X } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import { useTheme } from 'next-themes';

export default function TablaVentas() {
  const [ventas, setVentas] = useState<any[]>([]);
  const [cargando, setCargando] = useState(true);
  
  const [filtroMesAno, setFiltroMesAno] = useState('');
  const [filtroProducto, setFiltroProducto] = useState('Todos');
  const [buscarText, setBuscarText] = useState('');
  const [productosDisponibles, setProductosDisponibles] = useState<string[]>([]);
  
  const [pagina, setPagina] = useState(1);
  const registrosPorPagina = 10;
  
  const [ventaEditando, setVentaEditando] = useState<any>(null);
  const [editFecha, setEditFecha] = useState('');
  const [editCategoria, setEditCategoria] = useState('');
  const [editProducto, setEditProducto] = useState('');
  const [editIngreso, setEditIngreso] = useState('');
  const [guardandoEdicion, setGuardandoEdicion] = useState(false);

  const [mensajeError, setMensajeError] = useState('');
  const [errorEdicion, setErrorEdicion] = useState('');

  const { theme } = useTheme();

  const cargarDatos = async () => {
    setCargando(true);
    let query = supabase.from('ventas').select('*');
    if (filtroMesAno) {
      // Rango [día 1 del mes, día 1 del mes siguiente) para no generar fechas inválidas como 2026-02-31
      const [año, mes] = filtroMesAno.split('-').map(Number);
      const inicio = `${filtroMesAno}-01`;
      const siguiente = mes === 12
        ? `${año + 1}-01-01`
        : `${año}-${String(mes + 1).padStart(2, '0')}-01`;
      query = query.gte('fecha_venta', inicio).lt('fecha_venta', siguiente);
    }
    if (filtroProducto && filtroProducto !== 'Todos') {
      query = query.eq('producto', filtroProducto);
    }
    const { data, error } = await query.order('fecha_venta', { ascending: false });
    if (error) {
      setMensajeError('No se pudieron cargar las ventas: ' + error.message);
    } else {
      setMensajeError('');
      setVentas(data);
      setProductosDisponibles(Array.from(new Set(data.map((v: any) => v.producto).filter(Boolean))) as string[]);
    }
    setCargando(false);
  };

  useEffect(() => { 
    cargarDatos(); 
  }, [filtroMesAno, filtroProducto]);

  const eliminarVenta = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    // .select() devuelve las filas afectadas: con RLS, un bloqueo no da error sino 0 filas
    const { data, error } = await supabase.from('ventas').delete().eq('id', id).select();
    if (error || !data?.length) {
      setMensajeError('No se pudo eliminar la venta' + (error ? ': ' + error.message : ' (sin permisos o ya no existe).'));
      return;
    }
    cargarDatos();
  };

  const abrirModalEdicion = (venta: any) => {
    setErrorEdicion('');
    setVentaEditando(venta);
    setEditFecha(venta.fecha_venta); 
    setEditCategoria(venta.categoria || ''); 
    setEditProducto(venta.producto); 
    setEditIngreso(venta.ingreso.toString());
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoEdicion(true);
    setErrorEdicion('');
    const { data, error } = await supabase.from('ventas').update({
      fecha_venta: editFecha,
      categoria: editCategoria,
      producto: editProducto,
      ingreso: parseFloat(editIngreso)
    }).eq('id', ventaEditando.id).select();

    if (error || !data?.length) {
      setErrorEdicion('No se pudo guardar' + (error ? ': ' + error.message : ' (sin permisos o el registro ya no existe).'));
    } else {
      setVentaEditando(null);
      cargarDatos();
    }
    setGuardandoEdicion(false);
  };

  const ventasFiltradas = ventas.filter(v => {
    const s = buscarText.toLowerCase();
    return v.producto?.toLowerCase().includes(s) || v.categoria?.toLowerCase().includes(s) || v.fecha_venta?.includes(s);
  });

  const indiceUltimoRegistro = pagina * registrosPorPagina;
  const indicePrimerRegistro = indiceUltimoRegistro - registrosPorPagina;
  const registrosVisualizados = ventasFiltradas.slice(indicePrimerRegistro, indiceUltimoRegistro);
  const totalPaginas = Math.ceil(ventasFiltradas.length / registrosPorPagina) || 1;

  let datosGrafico = Object.values(ventasFiltradas.reduce((acc: any, venta) => {
    const f = venta.fecha_venta;
    if (!acc[f]) acc[f] = { fecha: f, total: 0 };
    acc[f].total += Number(venta.ingreso);
    return acc;
  }, {})).sort((a: any, b: any) => a.fecha.localeCompare(b.fecha));
  
  if (datosGrafico.length === 1) {
    datosGrafico = [{ fecha: 'Inicio', total: 0 }, ...datosGrafico];
  }

  const totalIngreso = ventasFiltradas.reduce((sum, v) => sum + Number(v.ingreso), 0);
  const totalTransacciones = ventasFiltradas.length;
  
  const obtenerProductoMasVendido = () => {
    if (ventasFiltradas.length === 0) return 'Ninguno';
    const conteo: { [key: string]: number } = {};
    ventasFiltradas.forEach(v => { if(v.producto) conteo[v.producto] = (conteo[v.producto] || 0) + 1; });
    if (Object.keys(conteo).length === 0) return 'Ninguno';
    return Object.keys(conteo).reduce((a, b) => conteo[a] > conteo[b] ? a : b);
  };

  const exportarExcel = () => {
    const datosExportar = ventasFiltradas.map(v => {
      const fechaObj = new Date(v.fecha_venta + 'T00:00:00');
      const mesTexto = fechaObj.toLocaleDateString('es-ES', { month: 'long' });
      return { 
        'Fecha': v.fecha_venta, 
        'Mes': mesTexto.charAt(0).toUpperCase() + mesTexto.slice(1), 
        'Categoría': v.categoria || 'Sin categoría', 
        'Producto': v.producto, 
        'Ingreso (S/)': v.ingreso 
      };
    });
    const hoja = XLSX.utils.json_to_sheet(datosExportar);
    const libro = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(libro, hoja, "Reporte");
    XLSX.writeFile(libro, `Reporte_Ventas_${filtroMesAno || 'historico'}.xlsx`);
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
          <label className={labelClass}>Año / Mes</label>
          <input type="month" value={filtroMesAno} onChange={(e) => { setFiltroMesAno(e.target.value); setPagina(1); }} className={inputClass}/>
        </div>
        <div>
          <label className={labelClass}>Producto</label>
          <select value={filtroProducto} onChange={(e) => { setFiltroProducto(e.target.value); setPagina(1); }} className={inputClass}>
            <option value="Todos">Todos los productos</option>
            {productosDisponibles.map(prod => (<option key={prod} value={prod}>{prod}</option>))}
          </select>
        </div>

        <div>
          <label className={labelClass}>Buscar</label>
          <div className="relative">
            <input 
              type="text" 
              placeholder="Buscar..." 
              value={buscarText} 
              onChange={(e) => { setBuscarText(e.target.value); setPagina(1); }} 
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
            <h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">S/ {totalIngreso.toLocaleString('es-PE', { minimumFractionDigits: 2 })}</h3>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-90">
            {datosGrafico.length > 1 && (
              <ResponsiveContainer height="100%" width="100%">
                <AreaChart data={datosGrafico}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={theme === 'dark' ? '#60a5fa' : '#2563eb'} stopOpacity={0.3}/>
                      <stop offset="95%" stopColor={theme === 'dark' ? '#60a5fa' : '#2563eb'} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area 
                    type="monotone" 
                    dataKey="total" 
                    stroke={theme === 'dark' ? '#60a5fa' : '#2563eb'} 
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
          <div><p className={labelClass}>Producto más vendido</p><h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1 truncate">{obtenerProductoMasVendido()}</h3></div>
        </div>
        <div className={`${cardClass} p-5 h-32`}>
          <div><p className={labelClass}>Transacciones</p><h3 className="text-2xl font-bold text-gray-800 dark:text-white mt-1">{totalTransacciones}</h3></div>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-gray-150 dark:border-slate-700 overflow-hidden transition-colors">
        <div className="p-4 flex justify-between items-center border-b border-gray-100 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50">
          <h2 className="text-base font-semibold text-slate-800 dark:text-white">Registros Recientes</h2>
          <button onClick={exportarExcel} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 text-xs font-semibold">
            <Download size={14} /> Exportar
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-slate-900/50 text-gray-500 dark:text-slate-400 text-xs border-b border-gray-250 dark:border-slate-700 uppercase font-bold tracking-wider">
                <th className="p-3.5 pl-6">Fecha</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Producto</th>
                <th className="p-3.5 text-right">Monto (S/)</th>
                <th className="p-3.5 text-center pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Cargando...</td></tr>
              ) : registrosVisualizados.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Sin registros.</td></tr>
              ) : (
                registrosVisualizados.map((venta) => (
                  <tr key={venta.id} className="border-b border-gray-100 dark:border-slate-700 hover:bg-gray-50/30 dark:hover:bg-slate-700/30">
                    <td className={`${tdClass} pl-6`}>{venta.fecha_venta}</td>
                    <td className={`${tdClass} font-medium`}>{venta.categoria || '-'}</td>
                    <td className={tdClass}>{venta.producto}</td>
                    <td className={`${tdClass} font-semibold text-gray-900 dark:text-white text-right`}>S/ {Number(venta.ingreso).toFixed(2)}</td>
                    <td className="p-3.5 text-center pr-6 flex justify-center gap-2">
                      <button onClick={() => abrirModalEdicion(venta)} className="text-blue-500 hover:bg-blue-100 dark:hover:bg-blue-900/30 p-1.5 rounded-md">
                        <Pencil size={16} />
                      </button>
                      <button onClick={() => eliminarVenta(venta.id)} className="text-red-500 hover:bg-red-100 dark:hover:bg-red-900/30 p-1.5 rounded-md">
                        <Trash2 size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {ventasFiltradas.length > registrosPorPagina && (
          <div className="p-3 border-t border-gray-100 dark:border-slate-700 flex justify-between items-center text-sm text-gray-550 dark:text-slate-400">
            <span>Página {pagina} de {totalPaginas}</span>
            <div className="flex gap-1">
              <button onClick={() => setPagina(prev => Math.max(prev - 1, 1))} disabled={pagina === 1} className="p-1 border border-gray-200 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPagina(prev => Math.min(prev + 1, totalPaginas))} disabled={pagina === totalPaginas} className="p-1 border border-gray-200 dark:border-slate-700 rounded-md hover:bg-gray-50 dark:hover:bg-slate-700 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {ventaEditando && (
        <div className="fixed inset-0 bg-slate-900/50 dark:bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-slate-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden border border-transparent dark:border-slate-700">
            <div className="px-6 py-4 border-b border-gray-100 dark:border-slate-700 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800 dark:text-white">Editar Venta</h3>
              <button onClick={() => setVentaEditando(null)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><X size={20} /></button>
            </div>
            <form onSubmit={guardarEdicion} className="p-6 space-y-4">
              <div>
                <label className={labelClass}>Fecha</label>
                <input type="date" required value={editFecha} onChange={(e) => setEditFecha(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Categoría</label>
                <input type="text" value={editCategoria} onChange={(e) => setEditCategoria(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Producto</label>
                <input type="text" required value={editProducto} onChange={(e) => setEditProducto(e.target.value)} className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Ingreso (S/)</label>
                <input type="number" step="0.01" required value={editIngreso} onChange={(e) => setEditIngreso(e.target.value)} className={inputClass} />
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