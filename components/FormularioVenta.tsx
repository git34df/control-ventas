"use client";

import { useState } from 'react';
import { supabase } from '../lib/supabase';

// Estructuramos tu inventario con precios para auto-completar
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
  "Otros": [] // Por si en el futuro vendes un cable, case o servicio extra
};

export default function FormularioVenta({ onVentaExitosa }: { onVentaExitosa?: () => void }) {
  const [fecha, setFecha] = useState('');
  const [categoria, setCategoria] = useState('');
  const [producto, setProducto] = useState('');
  const [ingreso, setIngreso] = useState('');
  const [estado, setEstado] = useState({ tipo: '', mensaje: '' });

  // Manejar el cambio de categoría
  const handleCategoriaChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const nuevaCategoria = e.target.value;
    setCategoria(nuevaCategoria);
    setProducto(''); // Reiniciar producto al cambiar categoría
    setIngreso(''); // Reiniciar precio
  };

  // Manejar el cambio de producto y auto-asignar el precio
  const handleProductoChange = (e: React.ChangeEvent<HTMLSelectElement | HTMLInputElement>) => {
    const nombreProducto = e.target.value;
    setProducto(nombreProducto);

    if (categoria && CATALOGO[categoria]) {
      const itemSeleccionado = CATALOGO[categoria].find(p => p.nombre === nombreProducto);
      if (itemSeleccionado) {
        setIngreso(itemSeleccionado.precio.toString());
      }
    }
  };

  const guardarVenta = async (e: React.FormEvent) => {
    e.preventDefault();
    setEstado({ tipo: 'cargando', mensaje: 'Guardando...' });

    const { error } = await supabase
      .from('ventas')
      .insert([
        { 
          fecha_venta: fecha,
          categoria: categoria, 
          producto: producto, 
          ingreso: parseFloat(ingreso) 
        }
      ]);

    if (error) {
      setEstado({ tipo: 'error', mensaje: 'Hubo un error: ' + error.message });
    } else {
      setEstado({ tipo: 'exito', mensaje: '¡Venta registrada correctamente!' });
      
      // Limpiar el formulario
      setFecha(''); setCategoria(''); setProducto(''); setIngreso('');
      
      if (onVentaExitosa) onVentaExitosa();
      setTimeout(() => setEstado({ tipo: '', mensaje: '' }), 4000);
    }
  };

  const productosDisponibles = categoria ? CATALOGO[categoria] : [];

  return (
    <form onSubmit={guardarVenta} className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 max-w-md">
      <h2 className="text-xl font-bold mb-5 text-slate-800">Registrar Nueva Venta</h2>
      
      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Fecha</label>
        <input 
          type="date" 
          required 
          value={fecha}
          onChange={(e) => setFecha(e.target.value)}
          className="w-full border border-gray-200 rounded-md p-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-blue-500"
        />
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Categoría</label>
        <select 
          required 
          value={categoria}
          onChange={handleCategoriaChange}
          className="w-full border border-gray-200 rounded-md p-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-blue-500"
        >
          <option value="" disabled>Seleccione una categoría...</option>
          {Object.keys(CATALOGO).map((cat) => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <div className="mb-4">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Producto</label>
        {categoria === 'Otros' ? (
          <input 
            type="text" 
            required 
            placeholder="Ingrese el producto manualmente..."
            value={producto}
            onChange={(e) => setProducto(e.target.value)}
            className="w-full border border-gray-200 rounded-md p-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-blue-500"
          />
        ) : (
          <select 
            required 
            value={producto}
            onChange={handleProductoChange}
            disabled={!categoria}
            className="w-full border border-gray-200 rounded-md p-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-blue-500 disabled:opacity-50"
          >
            <option value="" disabled>
              {categoria ? "Seleccione un producto..." : "Elija una categoría primero"}
            </option>
            {productosDisponibles?.map((prod) => (
              <option key={prod.nombre} value={prod.nombre}>{prod.nombre}</option>
            ))}
          </select>
        )}
      </div>

      <div className="mb-6">
        <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Ingreso (S/)</label>
        <input 
          type="number" 
          step="0.01" 
          required 
          placeholder="0.00"
          value={ingreso}
          onChange={(e) => setIngreso(e.target.value)}
          className="w-full border border-gray-200 rounded-md p-2 text-sm text-gray-700 bg-gray-50 focus:bg-white focus:outline-blue-500"
        />
      </div>

      <button 
        type="submit" 
        disabled={estado.tipo === 'cargando'}
        className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 transition-colors text-sm"
      >
        {estado.tipo === 'cargando' ? 'Guardando...' : 'Registrar Venta'}
      </button>

      {estado.mensaje && (
        <p className={`mt-4 text-xs font-semibold uppercase text-center ${estado.tipo === 'error' ? 'text-red-600' : estado.tipo === 'exito' ? 'text-green-600' : 'text-gray-500'}`}>
          {estado.mensaje}
        </p>
      )}
    </form>
  );
}