"use client";

import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useCatalogo } from '../lib/catalogo';
import CamposVenta from './CamposVenta';

export default function FormularioVenta({ onVentaExitosa }: { onVentaExitosa?: () => void }) {
  const { catalogo, errorCatalogo } = useCatalogo();

  const [fecha, setFecha] = useState('');
  const [vendedor, setVendedor] = useState('');
  const [categoria, setCategoria] = useState('');
  const [producto, setProducto] = useState('');
  const [ingreso, setIngreso] = useState('');
  const [estado, setEstado] = useState({ tipo: '', mensaje: '' });

  const cambiarCategoria = (nueva: string) => {
    setCategoria(nueva);
    setProducto('');
    setIngreso('');
  };

  const cambiarProducto = (nombre: string, precio?: number) => {
    setProducto(nombre);
    if (precio !== undefined) setIngreso(precio.toString());
  };

  const guardarVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    const monto = parseFloat(ingreso);
    if (!Number.isFinite(monto) || monto <= 0) {
      setEstado({ tipo: 'error', mensaje: 'El ingreso debe ser un número mayor que 0.' });
      return;
    }
    setEstado({ tipo: 'cargando', mensaje: 'Guardando...' });
    const { error } = await supabase.from('ventas').insert([{
      fecha_venta: fecha,
      vendedor,
      categoria,
      producto,
      ingreso: monto
    }]);

    if (error) {
      setEstado({ tipo: 'error', mensaje: 'Hubo un error: ' + error.message });
    } else {
      setEstado({ tipo: 'exito', mensaje: '¡Venta registrada correctamente!' });
      // El vendedor se mantiene: normalmente la misma persona registra varias ventas seguidas
      setFecha(''); setCategoria(''); setProducto(''); setIngreso('');
      if (onVentaExitosa) onVentaExitosa();
      setTimeout(() => setEstado({ tipo: '', mensaje: '' }), 4000);
    }
  };

  const inputClass = "w-full border border-gray-200 dark:border-slate-600 rounded-md p-2 text-sm text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 transition-colors";
  const labelClass = "block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1";

  return (
    <form onSubmit={guardarVenta} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 max-w-md transition-colors">
      <h2 className="text-xl font-bold mb-5 text-slate-800 dark:text-white">Registrar Nueva Venta</h2>

      {errorCatalogo && <p role="alert" className="mb-4 text-sm text-red-600 dark:text-red-400">{errorCatalogo}</p>}

      <div className="mb-4">
        <label htmlFor="nueva-fecha" className={labelClass}>Fecha</label>
        <input id="nueva-fecha" type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
      </div>

      <CamposVenta
        idPrefijo="nueva"
        catalogo={catalogo}
        categoria={categoria}
        producto={producto}
        vendedor={vendedor}
        onCategoria={cambiarCategoria}
        onProducto={cambiarProducto}
        onVendedor={setVendedor}
        inputClass={inputClass}
        labelClass={labelClass}
        campoClass="mb-4"
      />

      <div className="mb-6">
        <label htmlFor="nueva-ingreso" className={labelClass}>Ingreso (S/)</label>
        <input id="nueva-ingreso" type="number" step="0.01" min="0.01" required placeholder="0.00" value={ingreso} onChange={(e) => setIngreso(e.target.value)} className={inputClass} />
      </div>

      <button type="submit" disabled={estado.tipo === 'cargando'} className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 transition-colors text-sm">
        {estado.tipo === 'cargando' ? 'Guardando...' : 'Registrar Venta'}
      </button>

      {estado.mensaje && <p className={`mt-4 text-xs font-semibold uppercase text-center ${estado.tipo === 'error' ? 'text-red-500' : estado.tipo === 'exito' ? 'text-green-500' : 'text-gray-500'}`}>{estado.mensaje}</p>}
    </form>
  );
}
