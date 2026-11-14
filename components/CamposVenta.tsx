"use client";

import { CATEGORIA_OTROS, VENDEDORES, type Catalogo } from '../lib/tipos';

type Props = {
  idPrefijo: string;
  catalogo: Catalogo;
  categoria: string;
  producto: string;
  vendedor: string;
  onCategoria: (categoria: string) => void;
  /** precio llega solo cuando el producto se eligió del catálogo */
  onProducto: (producto: string, precio?: number) => void;
  onVendedor: (vendedor: string) => void;
  inputClass: string;
  labelClass: string;
  campoClass?: string;
};

/** Vendedor, categoría y producto: compartido por el formulario de registro y el de edición. */
export default function CamposVenta({
  idPrefijo, catalogo, categoria, producto, vendedor,
  onCategoria, onProducto, onVendedor, inputClass, labelClass, campoClass = '',
}: Props) {
  const categorias = [...Object.keys(catalogo), CATEGORIA_OTROS];
  // Al editar una venta antigua, su categoría puede no existir ya en el catálogo
  if (categoria && !categorias.includes(categoria)) categorias.unshift(categoria);

  const productosCategoria = catalogo[categoria] ?? [];
  const esTextoLibre = categoria === CATEGORIA_OTROS || (categoria !== '' && !catalogo[categoria]);
  // Producto que ya no está activo en el catálogo: se muestra igualmente para no perderlo al editar
  const productoFueraDeCatalogo = producto !== '' && !productosCategoria.some((p) => p.nombre === producto);

  const elegirProducto = (nombre: string) => {
    const item = productosCategoria.find((p) => p.nombre === nombre);
    onProducto(nombre, item?.precio);
  };

  return (
    <>
      <div className={campoClass}>
        <label htmlFor={`${idPrefijo}-vendedor`} className={labelClass}>Vendedor</label>
        <select id={`${idPrefijo}-vendedor`} required value={vendedor} onChange={(e) => onVendedor(e.target.value)} className={inputClass}>
          <option value="" disabled>Seleccione un vendedor...</option>
          {VENDEDORES.map((v) => <option key={v} value={v}>{v}</option>)}
        </select>
      </div>

      <div className={campoClass}>
        <label htmlFor={`${idPrefijo}-categoria`} className={labelClass}>Categoría</label>
        <select id={`${idPrefijo}-categoria`} required value={categoria} onChange={(e) => onCategoria(e.target.value)} className={inputClass}>
          <option value="" disabled>Seleccione una categoría...</option>
          {categorias.map((cat) => <option key={cat} value={cat}>{cat}</option>)}
        </select>
      </div>

      <div className={campoClass}>
        <label htmlFor={`${idPrefijo}-producto`} className={labelClass}>Producto</label>
        {esTextoLibre ? (
          <input id={`${idPrefijo}-producto`} type="text" required placeholder="Ingrese el producto..." value={producto} onChange={(e) => onProducto(e.target.value)} className={inputClass} />
        ) : (
          <select id={`${idPrefijo}-producto`} required value={producto} onChange={(e) => elegirProducto(e.target.value)} disabled={!categoria} className={`${inputClass} disabled:opacity-50`}>
            <option value="" disabled>{categoria ? 'Seleccione un producto...' : 'Elija una categoría'}</option>
            {productoFueraDeCatalogo && <option value={producto}>{producto}</option>}
            {productosCategoria.map((p) => <option key={p.nombre} value={p.nombre}>{p.nombre}</option>)}
          </select>
        )}
      </div>
    </>
  );
}
