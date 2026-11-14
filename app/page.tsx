"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Moon, Sun, LogOut } from "lucide-react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import FormularioVenta from "../components/FormularioVenta";
import TablaVentas from "../components/TablaVentas";
import Login from "../components/Login";

export default function Home() {
  const [actualizarDisparador, setActualizarDisparador] = useState(0);
  const { theme, setTheme } = useTheme();
  const [montado, setMontado] = useState(false);

  const [sesion, setSesion] = useState<Session | null>(null);
  const [verificandoSesion, setVerificandoSesion] = useState(true);

  useEffect(() => setMontado(true), []);

  useEffect(() => {
    // Sesión guardada de una visita anterior
    supabase.auth.getSession().then(({ data }) => {
      setSesion(data.session);
      setVerificandoSesion(false);
    });
    // Login, logout y renovación del token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evento, nuevaSesion) => {
      setSesion(nuevaSesion);
    });
    return () => subscription.unsubscribe();
  }, []);

  const manejarVentaRegistrada = () => setActualizarDisparador((prev) => prev + 1);
  const cerrarSesion = () => supabase.auth.signOut();

  return (
    <main className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto">

        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Tablero de Control de Ventas</h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1.5 text-sm">Gestiona y exporta tus ingresos diarios.</p>
          </div>

          <div className="flex items-center gap-2">
            {montado && (
              <button
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                aria-label="Cambiar tema"
                className="p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                {theme === "dark" ? <Sun size={20} /> : <Moon size={20} />}
              </button>
            )}
            {sesion && (
              <button
                onClick={cerrarSesion}
                aria-label="Cerrar sesión"
                title="Cerrar sesión"
                className="p-2.5 rounded-full bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 shadow-sm border border-gray-200 dark:border-slate-700 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors"
              >
                <LogOut size={20} />
              </button>
            )}
          </div>
        </header>

        {verificandoSesion ? (
          <p className="text-center text-sm text-slate-400 py-16">Cargando...</p>
        ) : !sesion ? (
          <Login />
        ) : (
          <section className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            <div className="lg:col-span-1">
              <FormularioVenta onVentaExitosa={manejarVentaRegistrada}/>
            </div>
            <div className="lg:col-span-2">
              <TablaVentas key={actualizarDisparador}/>
            </div>
          </section>
        )}

      </div>
    </main>
  );
}
