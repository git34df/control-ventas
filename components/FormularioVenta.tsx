"use client";

import { useState } from 'react';
import { supabase } from '../lib/supabase';

const CATALOGO: Record<string, { nombre: string; precio: number }[]> = {
  "Discos Sólidos (SSD/NVMe)": [
    { nombre: "SSD 2.5\" Kingston A400 - 120GB", precio: 110 },
    { nombre: "SSD 2.5\" Kingston KC600 - 256GB", precio: 190 },
    { nombre: "SSD 2.5\" Kingston KC600 - 512GB", precio: 280 },
    { nombre: "SSD 2.5\" Kingston KC600 - 1TB", precio: 450 },
    { nombre: "M.2 NVMe Kingston NV1 - 250GB", precio: 210 },
    { nombre: "M.2 NVMe Kingston KC3000 GAMER - 500GB", precio: 330 },
    { nombre: "M.2 NVMe Kingston KC3000 GAMER - 1TB", precio: 550 },
    { nombre: "M.2 NVMe Kingston KC3000 GAMER - 2TB", precio: 1100 },
  ],
  "Memorias RAM": [
    { nombre: "RAM DDR3 4GB (1333/1600 MHz) - PC/Laptop", precio: 80 },
    { nombre: "RAM DDR3 8GB (1333/1600 MHz) - PC/Laptop", precio: 110 },
    { nombre: "RAM DDR4 Kingston FURY 8GB - Laptop", precio: 200 },
    { nombre: "RAM DDR4 Kingston FURY 16GB - Laptop", precio: 380 },
    { nombre: "RAM DDR4 Kingston FURY 32GB - Laptop", precio: 650 },
    { nombre: "RAM DDR4 Fury/HyperX 8GB - PC", precio: 200 },
    { nombre: "RAM DDR4 Fury/HyperX 16GB - PC", precio: 380 },
    { nombre: "RAM DDR5 Fury 16GB (4800 MHz) - Laptop", precio: 750 },
    { nombre: "RAM DDR5 Kingston 16GB (5600 MHz) - Laptop", precio: 850 },
    { nombre: "RAM DDR5 Kingston 8GB (5600 MHz) - Laptop", precio: 400 },
    { nombre: "RAM DDR5 Fury 16GB (5600 MHz) - PC", precio: 850 },
  ],
  "Otros": [] 
};

export default function FormularioVenta({ onVentaExitosa }: { onVentaExitosa?: () => void }) {
  const [fecha, setFecha] = useState('');
  const [categoria, setCategoria] = useState('');
  const [producto, setProducto] = useState('');
  const [ingreso, setIngreso] = useState('');
  const [estado, setEstado] = useState({ tipo: '', mensaje: '' });

  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setCategoria(e.target.value); 
    setProducto(''); 
    setIngreso('');
  };

  const handleProductoChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const nombre = e.target.value;
    setProducto(nombre);
    if (categoria && CATALOGO[categoria]) {
      const item = CATALOGO[categoria].find(p => p.nombre === nombre);
      if (item) setIngreso(item.precio.toString());
    }
  };

  const guardarVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado({ tipo: 'cargando', mensaje: 'Guardando...' });
    const { error } = await supabase.from('ventas').insert([{ 
      fecha_venta: fecha, 
      categoria, 
      producto, 
      ingreso: parseFloat(ingreso) 
    }]);

    if (error) {
      setEstado({ tipo: 'error', mensaje: 'Hubo un error: ' + error.message });
    } else {
      setEstado({ tipo: 'exito', mensaje: '¡Venta registrada correctamente!' });
      setFecha(''); setCategoria(''); setProducto(''); setIngreso('');
      if (onVentaExitosa) onVentaExitosa();
      setTimeout(() => setEstado({ tipo: '', mensaje: '' }), 4000);
    }
  };

  const productosDisponibles = categoria ? CATALOGO[categoria] : [];
  const inputClass = "w-full border border-gray-200 dark:border-slate-600 rounded-md p-2 text-sm text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 transition-colors";
  const labelClass = "block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1";

  return (
    <form onSubmit={guardarVenta} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 max-w-md transition-colors">
      <h2 className="text-xl font-bold mb-5 text-slate-800 dark:text-white">Registrar Nueva Venta</h2>
      
      <div className="mb-4">
        <label className={labelClass}>Fecha</label>
        <input type="date" required value={fecha} onChange={(e) => setFecha(e.target.value)} className={inputClass} />
      </div>
      
      <div className="mb-4">
        <label className={labelClass}>Categoría</label>
        <select required value={categoria} onChange={handleCategoriaChange} className={inputClass}>
          <option value="" disabled>Seleccione una categoría...</option>
          {Object.keys(CATALOGO).map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div className="mb-4">
        <label className={labelClass}>Producto</label>
        {categoria === 'Otros' ? (
          <input type="text" required placeholder="Ingrese el producto..." value={producto} onChange={(e) => setProducto(e.target.value)} className={inputClass} />
        ) : (
          <select required value={producto} onChange={handleProductoChange} disabled={!categoria} className={`${inputClass} disabled:opacity-50`}>
            <option value="" disabled>{categoria ? "Seleccione un producto..." : "Elija una categoría"}</option>
            {productosDisponibles?.map((prod) => <option key={prod.nombre} value={prod.nombre}>{prod.nombre}</option>)}
          </select>
        )}
      </div>

      <div className="mb-6">
        <label className={labelClass}>Ingreso (S/)</label>
        <input type="number" step="0.01" required placeholder="0.00" value={ingreso} onChange={(e) => setIngreso(e.target.value)} className={inputClass} />
      </div>

      <button type="submit" disabled={estado.tipo === 'cargando'} className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 transition-colors text-sm">
        {estado.tipo === 'cargando' ? 'Guardando...' : 'Registrar Venta'}
      </button>

      {estado.mensaje && <p className={`mt-4 text-xs font-semibold uppercase text-center ${estado.tipo === 'error' ? 'text-red-500' : estado.tipo === 'exito' ? 'text-green-500' : 'text-gray-500'}`}>{estado.mensaje}</p>}
    </form>
  );
}