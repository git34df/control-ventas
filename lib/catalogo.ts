"use client";

import { useEffect, useState } from 'react';
import { supabase } from './supabase';
import type { Catalogo, ProductoCatalogo } from './tipos';

/** Carga los productos activos de la tabla `productos`, agrupados por categoría. */
export function useCatalogo() {
  const [catalogo, setCatalogo] = useState<Catalogo>({});
  const [errorCatalogo, setErrorCatalogo] = useState('');

  useEffect(() => {
    let vigente = true;
    supabase
      .from('productos')
      .select('categoria, nombre, precio')
      .eq('activo', true)
      .order('id')
      .then(({ data, error }) => {
        if (!vigente) return;
        if (error) {
          setErrorCatalogo('No se pudo cargar el catálogo de productos: ' + error.message);
          return;
        }
        const agrupado: Catalogo = {};
        for (const p of data as ProductoCatalogo[]) {
          (agrupado[p.categoria] ??= []).push({ ...p, precio: Number(p.precio) });
        }
        setCatalogo(agrupado);
      });
    return () => { vigente = false; };
  }, []);

  return { catalogo, errorCatalogo };
}
