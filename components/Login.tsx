"use client";

import { useState } from 'react';
import { supabase } from '../lib/supabase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [entrando, setEntrando] = useState(false);
  const [error, setError] = useState('');

  const iniciarSesion = async (e: React.FormEvent) => {
    e.preventDefault();
    setEntrando(true);
    setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : 'No se pudo iniciar sesión: ' + error.message);
    }
    // Si va bien, onAuthStateChange en page.tsx muestra el tablero
    setEntrando(false);
  };

  const inputClass = "w-full border border-gray-200 dark:border-slate-600 rounded-md p-2 text-sm text-gray-700 dark:text-slate-200 bg-gray-50 dark:bg-slate-700 focus:bg-white dark:focus:bg-slate-800 focus:outline-blue-500 transition-colors";
  const labelClass = "block text-xs font-semibold text-gray-500 dark:text-slate-400 uppercase mb-1";

  return (
    <form onSubmit={iniciarSesion} className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-100 dark:border-slate-700 w-full max-w-sm mx-auto transition-colors">
      <h2 className="text-xl font-bold mb-5 text-slate-800 dark:text-white">Iniciar sesión</h2>

      <div className="mb-4">
        <label htmlFor="login-email" className={labelClass}>Correo</label>
        <input id="login-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
      </div>

      <div className="mb-6">
        <label htmlFor="login-password" className={labelClass}>Contraseña</label>
        <input id="login-password" type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} className={inputClass} />
      </div>

      <button type="submit" disabled={entrando} className="w-full bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-slate-600 transition-colors text-sm">
        {entrando ? 'Entrando...' : 'Entrar'}
      </button>

      {error && <p role="alert" className="mt-4 text-sm text-center text-red-600 dark:text-red-400">{error}</p>}
    </form>
  );
}
