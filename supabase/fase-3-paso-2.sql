-- =====================================================================
-- Fase 3 · Paso 2: ejecutar en Supabase → SQL Editor SOLO DESPUÉS de que
-- la fase 3 esté publicada en producción (la versión anterior no envía vendedor).
-- =====================================================================

-- Si alguna venta quedó sin vendedor, este SELECT la muestra; asígnale uno antes de seguir.
select id, fecha_venta, producto from ventas where vendedor is null;

-- Vendedor obligatorio
alter table ventas alter column vendedor set not null;

-- Importe siempre mayor que 0 (la app ya lo valida; esto lo garantiza en la base de datos)
alter table ventas drop constraint if exists ingreso_positivo;
alter table ventas add constraint ingreso_positivo check (ingreso > 0);
