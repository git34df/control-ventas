-- =====================================================================
-- Fase 3 · Paso 1: ejecutar en Supabase → SQL Editor ANTES de probar la vista previa.
-- Todo es compatible con la versión actual en producción (no rompe nada).
-- =====================================================================

-- 1) Campo vendedor ----------------------------------------------------
-- Se crea sin NOT NULL para no romper producción mientras se despliega;
-- el NOT NULL se añade en el paso 2.
alter table ventas add column if not exists vendedor text;
alter table ventas drop constraint if exists vendedor_valido;
alter table ventas add constraint vendedor_valido
  check (vendedor in ('Jhon', 'Rossy', 'Alejandro'));

-- 2) Catálogo de productos ---------------------------------------------
create table if not exists productos (
  id        bigint generated always as identity primary key,
  categoria text not null,
  nombre    text not null unique,
  precio    numeric(10,2) not null check (precio > 0),
  activo    boolean not null default true  -- false = ya no se ofrece en el formulario
);

alter table productos enable row level security;
drop policy if exists "Solo usuarios autenticados" on productos;
create policy "Solo usuarios autenticados" on productos
  for all to authenticated using (true) with check (true);

-- El orden de inserción es el orden en que se muestran en el formulario
insert into productos (categoria, nombre, precio) values
  ('Discos Sólidos (SSD/NVMe)', 'SSD 2.5" Kingston A400 - 120GB', 110),
  ('Discos Sólidos (SSD/NVMe)', 'SSD 2.5" Kingston KC600 - 256GB', 190),
  ('Discos Sólidos (SSD/NVMe)', 'SSD 2.5" Kingston KC600 - 512GB', 280),
  ('Discos Sólidos (SSD/NVMe)', 'SSD 2.5" Kingston KC600 - 1TB', 450),
  ('Discos Sólidos (SSD/NVMe)', 'M.2 NVMe Kingston NV1 - 250GB', 210),
  ('Discos Sólidos (SSD/NVMe)', 'M.2 NVMe Kingston KC3000 GAMER - 500GB', 330),
  ('Discos Sólidos (SSD/NVMe)', 'M.2 NVMe Kingston KC3000 GAMER - 1TB', 550),
  ('Discos Sólidos (SSD/NVMe)', 'M.2 NVMe Kingston KC3000 GAMER - 2TB', 1100),
  ('Memorias RAM', 'RAM DDR3 4GB (1333/1600 MHz) - PC/Laptop', 80),
  ('Memorias RAM', 'RAM DDR3 8GB (1333/1600 MHz) - PC/Laptop', 110),
  ('Memorias RAM', 'RAM DDR4 Kingston FURY 8GB - Laptop', 200),
  ('Memorias RAM', 'RAM DDR4 Kingston FURY 16GB - Laptop', 380),
  ('Memorias RAM', 'RAM DDR4 Kingston FURY 32GB - Laptop', 650),
  ('Memorias RAM', 'RAM DDR4 Fury/HyperX 8GB - PC', 200),
  ('Memorias RAM', 'RAM DDR4 Fury/HyperX 16GB - PC', 380),
  ('Memorias RAM', 'RAM DDR5 Fury 16GB (4800 MHz) - Laptop', 750),
  ('Memorias RAM', 'RAM DDR5 Kingston 16GB (5600 MHz) - Laptop', 850),
  ('Memorias RAM', 'RAM DDR5 Kingston 8GB (5600 MHz) - Laptop', 400),
  ('Memorias RAM', 'RAM DDR5 Fury 16GB (5600 MHz) - PC', 850)
on conflict (nombre) do nothing;

-- 3) Resumen calculado en la base de datos ------------------------------
-- Devuelve total, transacciones, producto más vendido, datos del gráfico y
-- la lista de productos del filtro. Respeta RLS (security invoker).
-- Los mismos filtros que usa la tabla: mes [p_desde, p_hasta), producto y búsqueda.
create or replace function resumen_ventas(
  p_desde    text default null,
  p_hasta    text default null,
  p_producto text default null,
  p_buscar   text default null
) returns json
language sql stable security invoker
set search_path = public
as $$
  with del_mes as (
    select * from ventas
    where (p_desde is null or fecha_venta::date >= p_desde::date)
      and (p_hasta is null or fecha_venta::date <  p_hasta::date)
  ),
  filtradas as (
    select * from del_mes
    where (p_producto is null or producto = p_producto)
      and (p_buscar is null
           or producto  ilike '%' || p_buscar || '%'
           or categoria ilike '%' || p_buscar || '%'
           or vendedor  ilike '%' || p_buscar || '%')
  )
  select json_build_object(
    'total',         (select coalesce(sum(ingreso::numeric), 0) from filtradas),
    'transacciones', (select count(*) from filtradas),
    'mas_vendido',   (select producto from filtradas where producto is not null
                      group by producto order by count(*) desc, producto limit 1),
    'por_dia',       coalesce((select json_agg(json_build_object('fecha', d.fecha, 'total', d.total) order by d.fecha)
                               from (select fecha_venta::date as fecha, sum(ingreso::numeric) as total
                                     from filtradas group by 1) d), '[]'::json),
    -- Productos del filtro: respetan el mes pero NO el producto elegido ni la búsqueda
    'productos',     coalesce((select json_agg(p.producto order by p.producto)
                               from (select distinct producto from del_mes where producto is not null) p), '[]'::json)
  );
$$;

revoke execute on function resumen_ventas(text, text, text, text) from public, anon;
grant  execute on function resumen_ventas(text, text, text, text) to authenticated;
