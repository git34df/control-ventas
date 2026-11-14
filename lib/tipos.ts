export const VENDEDORES = ['Jhon', 'Rossy', 'Alejandro'] as const;
export type Vendedor = (typeof VENDEDORES)[number];

/** Categoría que permite escribir un producto que no está en el catálogo */
export const CATEGORIA_OTROS = 'Otros';

export type Venta = {
  id: string | number;
  fecha_venta: string;
  categoria: string | null;
  producto: string;
  ingreso: number;
  vendedor: Vendedor | null;
};

export type ProductoCatalogo = {
  categoria: string;
  nombre: string;
  precio: number;
};

/** Productos agrupados por categoría, en el orden del catálogo */
export type Catalogo = Record<string, ProductoCatalogo[]>;

/** Lo que devuelve la función resumen_ventas de Supabase */
export type ResumenVentas = {
  total: number;
  transacciones: number;
  mas_vendido: string | null;
  por_dia: { fecha: string; total: number }[];
  productos: string[];
};
