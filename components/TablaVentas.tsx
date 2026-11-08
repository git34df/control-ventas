"use client";

import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import * as XLSX from 'xlsx';
import { Download, Search, ChevronLeft, ChevronRight, Pencil, Trash2, X } from 'lucide-react';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';

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

  const cargarDatos = async () => {
    setCargando(true);
    let query = supabase.from('ventas').select('*');

    if (filtroMesAno) {
      const [año, mes] = filtroMesAno.split('-');
      const primerDia = `${año}-${mes}-01`;
      const ultimoDia = `${año}-${mes}-31`; 
      query = query.gte('fecha_venta', primerDia).lte('fecha_venta', ultimoDia);
    }

    if (filtroProducto && filtroProducto !== 'Todos') {
      query = query.eq('producto', filtroProducto);
    }

    const { data, error } = await query.order('fecha_venta', { ascending: false });

    if (!error && data) {
      setVentas(data);
      const unicos = Array.from(new Set(data.map((v: any) => v.producto).filter(Boolean))) as string[];
      setProductosDisponibles(unicos);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [filtroMesAno, filtroProducto]);

  const eliminarVenta = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que deseas eliminar este registro?')) return;
    const { error } = await supabase.from('ventas').delete().eq('id', id);
    if (!error) cargarDatos();
    else alert('Error al eliminar: ' + error.message);
  };

  const abrirModalEdicion = (venta: any) => {
    setVentaEditando(venta);
    setEditFecha(venta.fecha_venta);
    setEditCategoria(venta.categoria || '');
    setEditProducto(venta.producto);
    setEditIngreso(venta.ingreso.toString());
  };

  const guardarEdicion = async (e: React.FormEvent) => {
    e.preventDefault();
    setGuardandoEdicion(true);
    const { error } = await supabase
      .from('ventas')
      .update({ 
        fecha_venta: editFecha, 
        categoria: editCategoria,
        producto: editProducto, 
        ingreso: parseFloat(editIngreso) 
      })
      .eq('id', ventaEditando.id);

    if (!error) {
      setVentaEditando(null);
      cargarDatos();
    } else {
      alert('Error al actualizar: ' + error.message);
    }
    setGuardandoEdicion(false);
  };

  const ventasFiltradas = ventas.filter(v => {
    const searchLower = buscarText.toLowerCase();
    return (v.producto?.toLowerCase().includes(searchLower)) || 
           (v.categoria?.toLowerCase().includes(searchLower)) ||
           (v.fecha_venta?.includes(searchLower));
  });

  const indiceUltimoRegistro = pagina * registrosPorPagina;
  const indicePrimerRegistro = indiceUltimoRegistro - registrosPorPagina;
  const registrosVisualizados = ventasFiltradas.slice(indicePrimerRegistro, indiceUltimoRegistro);
  const totalPaginas = Math.ceil(ventasFiltradas.length / registrosPorPagina) || 1;

  // CÁLCULO DEL GRÁFICO (Con corrección para 1 solo punto)
  let datosGrafico = Object.values(ventasFiltradas.reduce((acc: any, venta) => {
    const fecha = venta.fecha_venta;
    if (!acc[fecha]) acc[fecha] = { fecha, total: 0 };
    acc[fecha].total += Number(venta.ingreso);
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
    ventasFiltradas.forEach(v => {
      if(v.producto) conteo[v.producto] = (conteo[v.producto] || 0) + 1;
    });
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
    XLSX.utils.book_append_sheet(libro, hoja, "Reporte_Ventas");
    XLSX.writeFile(libro, `Reporte_Ventas_${filtroMesAno || 'historico'}.xlsx`);
  };

  return (
    <div className="space-y-6 relative">
      {/* BARRA DE FILTROS */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-100 grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Año / Mes</label>
          <input type="month" value={filtroMesAno} onChange={(e) => { setFiltroMesAno(e.target.value); setPagina(1); }} className="w-full border border-gray-200 rounded-md p-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-blue-500"/>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Producto</label>
          <select value={filtroProducto} onChange={(e) => { setFiltroProducto(e.target.value); setPagina(1); }} className="w-full border border-gray-200 rounded-md p-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-blue-500">
            <option value="Todos">Todos los productos</option>
            {productosDisponibles.map(prod => (<option key={prod} value={prod}>{prod}</option>))}
          </select>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Buscar</label>
          <div className="relative">
            <input type="text" placeholder="Buscar producto o categoría..." value={buscarText} onChange={(e) => { setBuscarText(e.target.value); setPagina(1); }} className="w-full border border-gray-200 rounded-md p-2 pl-8 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-blue-500"/>
            <Search className="absolute left-2.5 top-2.5 text-gray-400" size={16} />
          </div>
        </div>
      </div>

      {/* TARJETAS KPI (Estructura Corregida) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        
        {/* Tarjeta 1: Gráfico de Fondo */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between relative overflow-hidden h-32">
          <div className="p-5 z-10 relative">
            <p className="text-sm font-medium text-gray-500">Total Ingresos</p>
            <h3 className="text-2xl font-bold text-gray-800 mt-1">
              S/ {totalIngreso.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
          </div>
          <div className="absolute bottom-0 left-0 right-0 h-16 opacity-90">
            {datosGrafico.length > 1 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={datosGrafico}>
                  <defs>
                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#2563eb" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} fillOpacity={1} fill="url(#colorTotal)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : null}
          </div>
        </div>

        {/* Tarjeta 2 */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <div><p className="text-sm font-medium text-gray-500">Producto más vendido</p><h3 className="text-xl font-bold text-gray-800 mt-1 truncate" title={obtenerProductoMasVendido()}>{obtenerProductoMasVendido()}</h3></div>
        </div>
        
        {/* Tarjeta 3 */}
        <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-100 flex flex-col justify-between h-32">
          <div><p className="text-sm font-medium text-gray-500 text-center">Ventas</p><h3 className="text-2xl font-bold text-gray-800 mt-1 text-center">{totalTransacciones}</h3></div>
        </div>
      </div>

      {/* HISTORIAL Y TABLA */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-150 overflow-hidden">
        <div className="p-4 flex justify-between items-center border-b border-gray-100 bg-gray-50/50">
          <h2 className="text-base font-semibold text-gray-850">Registros Recientes</h2>
          <button onClick={exportarExcel} className="flex items-center gap-1.5 bg-green-600 text-white px-3 py-1.5 rounded-md hover:bg-green-700 transition-all text-xs font-semibold">
            <Download size={14} /> Exportar a Excel
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 text-gray-500 text-xs border-b border-gray-250 uppercase font-bold tracking-wider">
                <th className="p-3.5 pl-6">Fecha</th>
                <th className="p-3.5">Categoría</th>
                <th className="p-3.5">Producto</th>
                <th className="p-3.5 text-right">Monto (S/)</th>
                <th className="p-3.5 text-center pr-6">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {cargando ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">Cargando registros...</td></tr>
              ) : registrosVisualizados.length === 0 ? (
                <tr><td colSpan={5} className="p-8 text-center text-gray-400">No hay ventas registradas.</td></tr>
              ) : (
                registrosVisualizados.map((venta) => (
                  <tr key={venta.id} className="border-b border-gray-100 hover:bg-gray-50/30 transition-colors">
                    <td className="p-3.5 pl-6 text-sm text-gray-700">{venta.fecha_venta}</td>
                    <td className="p-3.5 text-sm text-gray-500 font-medium">{venta.categoria || '-'}</td>
                    <td className="p-3.5 text-sm text-gray-700">{venta.producto}</td>
                    <td className="p-3.5 text-sm font-semibold text-gray-900 text-right">S/ {Number(venta.ingreso).toFixed(2)}</td>
                    <td className="p-3.5 text-center pr-6 flex justify-center gap-2">
                      <button onClick={() => abrirModalEdicion(venta)} className="text-blue-500 hover:bg-blue-100 p-1.5 rounded-md transition-colors" title="Editar"><Pencil size={16} /></button>
                      <button onClick={() => eliminarVenta(venta.id)} className="text-red-500 hover:bg-red-100 p-1.5 rounded-md transition-colors" title="Eliminar"><Trash2 size={16} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {ventasFiltradas.length > registrosPorPagina && (
          <div className="p-3 border-t border-gray-100 flex justify-between items-center text-sm text-gray-550">
            <span>Página {pagina} de {totalPaginas}</span>
            <div className="flex gap-1">
              <button onClick={() => setPagina(prev => Math.max(prev - 1, 1))} disabled={pagina === 1} className="p-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40"><ChevronLeft size={16} /></button>
              <button onClick={() => setPagina(prev => Math.min(prev + 1, totalPaginas))} disabled={pagina === totalPaginas} className="p-1 border border-gray-200 rounded-md hover:bg-gray-50 disabled:opacity-40"><ChevronRight size={16} /></button>
            </div>
          </div>
        )}
      </div>

      {ventaEditando && (
        <div className="fixed inset-0 bg-slate-900/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-lg text-slate-800">Editar Venta</h3>
              <button onClick={() => setVentaEditando(null)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
            </div>
            <form onSubmit={guardarEdicion} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha</label>
                <input type="date" required value={editFecha} onChange={(e) => setEditFecha(e.target.value)} className="w-full border border-gray-200 rounded-md p-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Categoría</label>
                <input type="text" value={editCategoria} onChange={(e) => setEditCategoria(e.target.value)} className="w-full border border-gray-200 rounded-md p-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Producto</label>
                <input type="text" required value={editProducto} onChange={(e) => setEditProducto(e.target.value)} className="w-full border border-gray-200 rounded-md p-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ingreso (S/)</label>
                <input type="number" step="0.01" required value={editIngreso} onChange={(e) => setEditIngreso(e.target.value)} className="w-full border border-gray-200 rounded-md p-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-blue-500" />
              </div>
              <div className="pt-2 flex gap-3">
                <button type="button" onClick={() => setVentaEditando(null)} className="flex-1 bg-gray-100 text-gray-700 font-semibold py-2 px-4 rounded-md hover:bg-gray-200 transition-colors text-sm">Cancelar</button>
                <button type="submit" disabled={guardandoEdicion} className="flex-1 bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-blue-400 transition-colors text-sm">
                  {guardandoEdicion ? 'Guardando...' : 'Guardar Cambios'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}