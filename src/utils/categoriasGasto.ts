import { CategoriaGastoDef } from '../types';

export const DEFAULT_CATEGORIAS_GASTO: CategoriaGastoDef[] = [
  {
    id: 'materias-primas',
    nombre: 'Materias Primas',
    descripcion: 'Harinas, lácteos, azúcares, ingredientes base y consumibles directos de producción.',
    color: '#f43f5e', // coral / rose
    esPredeterminada: true,
  },
  {
    id: 'suministros-y-energia',
    nombre: 'Suministros y Energía',
    descripcion: 'Electricidad, gas, agua, telecomunicaciones, internet y suministros energéticos operativos.',
    color: '#0ea5e9', // sky blue
    esPredeterminada: true,
  },
  {
    id: 'envases-y-embalajes',
    nombre: 'Envases y Embalajes',
    descripcion: 'Cajas kraft, bobinas, bandejas, film, bolsas, etiquetas y material de empaquetado.',
    color: '#f59e0b', // amber
    esPredeterminada: true,
  },
  {
    id: 'logistica-y-transporte',
    nombre: 'Logística y Transporte',
    descripcion: 'Portes, transporte frigorífico/refrigerado, envíos urgentes, fletes y servicios de reparto.',
    color: '#10b981', // emerald
    esPredeterminada: true,
  },
  {
    id: 'mantenimiento-y-maquinaria',
    nombre: 'Mantenimiento y Maquinaria',
    descripcion: 'Reparaciones técnicas, revisiones preventivas de hornos, climatización, recambios y herramientas.',
    color: '#8b5cf6', // purple
    esPredeterminada: true,
  },
  {
    id: 'servicios-y-gestion',
    nombre: 'Servicios y Gestión',
    descripcion: 'Asesoría contable, fiscal y laboral, licencias de software, seguros y servicios profesionales.',
    color: '#ec4899', // pink
    esPredeterminada: true,
  },
];

export const PALETA_COLORES_SUGERIDOS: { nombre: string; hex: string }[] = [
  { nombre: 'Rosa / Coral', hex: '#f43f5e' },
  { nombre: 'Azul Cielo', hex: '#0ea5e9' },
  { nombre: 'Ámbar', hex: '#f59e0b' },
  { nombre: 'Esmeralda', hex: '#10b981' },
  { nombre: 'Púrpura', hex: '#8b5cf6' },
  { nombre: 'Magenta', hex: '#ec4899' },
  { nombre: 'Índigo', hex: '#6366f1' },
  { nombre: 'Cian', hex: '#06b6d4' },
  { nombre: 'Turquesa / Teal', hex: '#14b8a6' },
  { nombre: 'Naranja Cálido', hex: '#f97316' },
  { nombre: 'Lima', hex: '#84cc16' },
  { nombre: 'Pizarra / Slate', hex: '#64748b' },
];

export function deduplicarCategorias(categorias: CategoriaGastoDef[]): CategoriaGastoDef[] {
  if (!Array.isArray(categorias)) return [...DEFAULT_CATEGORIAS_GASTO];
  const map = new Map<string, CategoriaGastoDef>();
  for (const c of categorias) {
    if (!c) continue;
    const rawId = (c.id || c.nombre || '').toLowerCase().trim();
    if (!rawId) continue;
    if (!map.has(rawId)) {
      map.set(rawId, {
        id: c.id || rawId,
        nombre: (c.nombre || 'Categoría').trim(),
        descripcion: (c.descripcion || '').trim(),
        color: c.color || '#0ea5e9',
        esPredeterminada: Boolean(c.esPredeterminada),
      });
    }
  }
  return Array.from(map.values());
}

let cacheCategoriasGasto: CategoriaGastoDef[] = deduplicarCategorias(DEFAULT_CATEGORIAS_GASTO);

export function obtenerCategoriasGasto(): CategoriaGastoDef[] {
  cacheCategoriasGasto = deduplicarCategorias(cacheCategoriasGasto);
  return cacheCategoriasGasto;
}

export function establecerCategoriasEnMemoria(categorias: CategoriaGastoDef[]): void {
  if (Array.isArray(categorias) && categorias.length > 0) {
    const dedup = deduplicarCategorias(categorias);
    cacheCategoriasGasto = dedup;
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent('categoriasGastoActualizadas', {
          detail: dedup,
        })
      );
    }
  }
}

export async function sincronizarCategoriasDesdeBD(): Promise<CategoriaGastoDef[]> {
  try {
    const res = await fetch('/api/categorias-gasto');
    const data = await res.json();
    if (data?.categorias && Array.isArray(data.categorias) && data.categorias.length > 0) {
      const dedup = deduplicarCategorias(data.categorias);
      cacheCategoriasGasto = dedup;
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('categoriasGastoActualizadas', {
            detail: dedup,
          })
        );
      }
      return dedup;
    }
  } catch (err) {
    console.warn('Aviso al sincronizar categorías desde MySQL:', err);
  }
  return cacheCategoriasGasto;
}

export function guardarCategoriasGasto(categorias: CategoriaGastoDef[]): void {
  const dedup = deduplicarCategorias(categorias);
  cacheCategoriasGasto = dedup;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('categoriasGastoActualizadas', {
        detail: dedup,
      })
    );
  }
  // Persistir directamente en base de datos MySQL (tabla categorias_gasto)
  fetch('/api/categorias-gasto', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ categorias: dedup }),
  }).catch((err) => {
    console.warn('Error al persistir categorías de gasto en MySQL:', err);
  });
}

function generarId(nombre: string): string {
  const base = nombre
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  return `${base || 'cat'}-${Date.now().toString(36)}`;
}

export function agregarCategoriaGasto(
  categoria: Omit<CategoriaGastoDef, 'id'>
): CategoriaGastoDef {
  const actuales = obtenerCategoriasGasto();
  const nueva: CategoriaGastoDef = {
    id: generarId(categoria.nombre),
    nombre: categoria.nombre.trim(),
    descripcion: categoria.descripcion?.trim() || '',
    color: categoria.color || '#0ea5e9',
    esPredeterminada: false,
  };
  const actualizadas = [...actuales, nueva];
  guardarCategoriasGasto(actualizadas);
  return nueva;
}

export function actualizarCategoriaGasto(
  id: string,
  cambios: Partial<CategoriaGastoDef>
): CategoriaGastoDef | null {
  const actuales = obtenerCategoriasGasto();
  let encontrada: CategoriaGastoDef | null = null;
  const actualizadas = actuales.map((c) => {
    if (c.id === id) {
      encontrada = {
        ...c,
        ...cambios,
        nombre: cambios.nombre !== undefined ? cambios.nombre.trim() : c.nombre,
        descripcion: cambios.descripcion !== undefined ? cambios.descripcion.trim() : c.descripcion,
      };
      return encontrada;
    }
    return c;
  });
  if (encontrada) {
    guardarCategoriasGasto(actualizadas);
  }
  return encontrada;
}

export function eliminarCategoriaGasto(id: string): boolean {
  const actuales = obtenerCategoriasGasto();
  const filtradas = actuales.filter((c) => c.id !== id);
  if (filtradas.length === actuales.length) return false;
  guardarCategoriasGasto(filtradas);
  return true;
}

export function restablecerCategoriasGasto(): CategoriaGastoDef[] {
  guardarCategoriasGasto(DEFAULT_CATEGORIAS_GASTO);
  return DEFAULT_CATEGORIAS_GASTO;
}

export function obtenerColorCategoria(
  nombreCategoria: string,
  categoriasDisponibles?: CategoriaGastoDef[]
): string {
  if (!nombreCategoria) return '#94a3b8';
  const lista = categoriasDisponibles || obtenerCategoriasGasto();
  const match = lista.find(
    (c) => c.nombre.toLowerCase().trim() === nombreCategoria.toLowerCase().trim()
  );
  if (match) return match.color;

  // Fallback para nombres antiguos o simplificados
  const nombreNorm = nombreCategoria.toLowerCase().trim();
  if (nombreNorm === 'insumos') return '#f43f5e';
  if (nombreNorm === 'logistica' || nombreNorm === 'logística') return '#10b981';
  if (nombreNorm === 'servicios') return '#ec4899';

  return '#94a3b8';
}
