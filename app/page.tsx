"use client";

import { useState } from "react";
import FormularioVenta from "../components/FormularioVenta";
import TablaVentas from "../components/TablaVentas";

export default function Home() {
  // Estado simple para obligar a refrescar la tabla cuando se registre una venta
  const [actualizarDisparador, setActualizarDisparador] = useState(0);

  const manejarVentaRegistrada = () => {
    setActualizarDisparador((prev) => prev + 1);
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] p-4 md:p-8">
      <div className="max-w-6xl mx-auto">
        
        {/* Encabezado */}
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Tablero de Control de Ventas</h1>
          <p className="text-slate-550 mt-1.5 text-sm text-slate-900">Gestiona y exporta tus ingresos diarios.</p>
        </header>

        {/* Distribución Grid */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
          
          {/* Lado Izquierdo: El Formulario */}
          <div className="lg:col-span-1">
            <FormularioVenta onVentaExitosa={manejarVentaRegistrada} />
          </div>
          
          {/* Lado Derecho: Filtros, KPIs y Historial de la Tabla */}
          <div className="lg:col-span-2">
            <TablaVentas key={actualizarDisparador} />
          </div>

        </section>

      </div>
    </main>
  );
}