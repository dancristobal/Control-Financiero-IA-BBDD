import React, { useState, useMemo, useEffect } from 'react';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Package,
  Calendar,
  DollarSign,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  CheckCircle2,
  FileText,
  Building2,
  Sparkles,
  SlidersHorizontal,
  X,
  Scale,
  Layers,
  ChevronRight,
  Info
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  ReferenceLine
} from 'recharts';
import { Factura } from '../types';
import { obtenerParametrosSistema } from '../utils/parametrosSistema';

interface EvolucionPreciosViewProps {
  facturas: Factura[];
}

// Fixed distinct color palette for major suppliers, with fallback generator
const PALETA_PROVEEDORES: Record<string, string> = {
  'Harinas y Granos del Sur S.L.': '#f43f5e', // rose-500
  'Molinos & Harinas del Ebro S.A.': '#38bdf8', // sky-400
  'Lácteos & Mantequillas Cantabria S.A.': '#fbbf24', // amber-400
  'Dulces e Ingredientes del Valle S.L.': '#34d399', // emerald-400
  'Envases & Packaging Gourmet S.L.': '#a78bfa', // violet-400
  'Frutas Seleccionadas & Esencias Ibérica': '#f472b6', // pink-400
  'Iberdrola Clientes S.A.U.': '#22d3ee', // cyan-400
  'Frío Express Logística Alimentaria': '#fb923c', // orange-400
};

const PALETA_COLORES_LISTA = [
  '#f43f5e', // rose
  '#38bdf8', // sky
  '#fbbf24', // amber
  '#34d399', // emerald
  '#a78bfa', // violet
  '#f472b6', // pink
  '#22d3ee', // cyan
  '#fb923c', // orange
  '#818cf8', // indigo
  '#4ade80', // green
];

const getProveedorColor = (nombre: string, index: number): string => {
  if (PALETA_PROVEEDORES[nombre]) {
    return PALETA_PROVEEDORES[nombre];
  }
  return PALETA_COLORES_LISTA[index % PALETA_COLORES_LISTA.length];
};

const formatearFechaCorta = (fechaStr: string) => {
  if (!fechaStr) return '';
  const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const partes = fechaStr.split('-');
  if (partes.length === 3) {
    const dia = parseInt(partes[2], 10);
    const mesIdx = parseInt(partes[1], 10) - 1;
    return `${dia} ${meses[mesIdx] || ''}`;
  }
  return fechaStr;
};

export const EvolucionPreciosView: React.FC<EvolucionPreciosViewProps> = ({
  facturas,
}) => {
  const [parametrosActivos, setParametrosActivos] = useState(() => obtenerParametrosSistema());

  // Escuchar cambios en los parámetros del sistema en tiempo real
  useEffect(() => {
    const handleParamsActualizados = (e: any) => {
      const nuevosParams = e?.detail || obtenerParametrosSistema();
      setParametrosActivos(nuevosParams);
    };
    window.addEventListener('fa_parametros_sistema_updated', handleParamsActualizados);
    return () => {
      window.removeEventListener('fa_parametros_sistema_updated', handleParamsActualizados);
    };
  }, []);

  const umbralModerado = parametrosActivos.umbralSubidaModeradaPct || 8;
  const umbralCritico = parametrosActivos.umbralSubidaCriticaPct || 15;

  // Extract all unique products across all invoice lines
  const todosLosProductos = useMemo(() => {
    const mapa: Record<
      string,
      Array<{
        idFactura: string;
        fecha: string;
        proveedor: string;
        cantidad: number;
        unidad: string;
        precioUnitario: number;
        subtotal: number;
      }>
    > = {};

    facturas.forEach((fac) => {
      if (fac.lineas && fac.lineas.length > 0) {
        fac.lineas.forEach((lin) => {
          const prodNombre = lin.nombreProducto.trim();
          if (!mapa[prodNombre]) {
            mapa[prodNombre] = [];
          }
          mapa[prodNombre].push({
            idFactura: fac.idFactura,
            fecha: fac.fechaEmision,
            proveedor: fac.nombreProveedor,
            cantidad: lin.cantidad,
            unidad: lin.unidad,
            precioUnitario: lin.precioUnitario,
            subtotal: lin.subtotal,
          });
        });
      }
    });

    // Sort purchase points by date ascending
    Object.keys(mapa).forEach((k) => {
      mapa[k].sort((a, b) => a.fecha.localeCompare(b.fecha));
    });

    return mapa;
  }, [facturas]);

  // Métricas agregadas por producto para determinar relevancia (gasto y volumen)
  const productosConMetricas = useMemo(() => {
    return Object.keys(todosLosProductos).map((nombre) => {
      const puntos = todosLosProductos[nombre] || [];
      const totalGasto = puntos.reduce((acc, p) => acc + (p.subtotal || 0), 0);
      const totalCantidad = puntos.reduce((acc, p) => acc + (p.cantidad || 0), 0);
      const totalCompras = puntos.length;
      return {
        nombre,
        puntos,
        totalGasto,
        totalCantidad,
        totalCompras,
      };
    });
  }, [todosLosProductos]);

  // Producto con mayor gasto acumulado / volumen de compra como selección predeterminada inteligente
  const productoPrincipalPorDefecto = useMemo(() => {
    if (productosConMetricas.length === 0) return '';
    const sorted = [...productosConMetricas].sort((a, b) => {
      if (b.totalGasto !== a.totalGasto) {
        return b.totalGasto - a.totalGasto;
      }
      if (b.totalCantidad !== a.totalCantidad) {
        return b.totalCantidad - a.totalCantidad;
      }
      return b.totalCompras - a.totalCompras;
    });
    return sorted[0]?.nombre || '';
  }, [productosConMetricas]);

  const listaNombresProductos = useMemo(() => {
    return [...productosConMetricas]
      .sort((a, b) => b.totalGasto - a.totalGasto || a.nombre.localeCompare(b.nombre))
      .map((p) => p.nombre);
  }, [productosConMetricas]);

  // Selected product: arranca de forma inteligente en el producto con mayor gasto / volumen acumulado
  const [productoSeleccionado, setProductoSeleccionado] = useState<string>(() => {
    if (productosConMetricas.length === 0) return '';
    const sorted = [...productosConMetricas].sort(
      (a, b) => b.totalGasto - a.totalGasto || b.totalCantidad - a.totalCantidad
    );
    return sorted[0]?.nombre || '';
  });

  // Mantener sincronizado el producto seleccionado si cambia el conjunto de datos o queda vacío
  useEffect(() => {
    if (!productoSeleccionado || !todosLosProductos[productoSeleccionado]) {
      if (productoPrincipalPorDefecto) {
        setProductoSeleccionado(productoPrincipalPorDefecto);
      }
    }
  }, [productoSeleccionado, todosLosProductos, productoPrincipalPorDefecto]);

  // Provider filter: 'TODOS' or a specific provider name
  const [filtroProveedor, setFiltroProveedor] = useState<string>('TODOS');

  // Interactive toggle: show market average reference line
  const [mostrarMedia, setMostrarMedia] = useState<boolean>(true);

  // Search in product sidebar
  const [busqueda, setBusqueda] = useState('');

  // All purchase points for selected product
  const puntosProducto = useMemo(() => {
    return todosLosProductos[productoSeleccionado] || [];
  }, [todosLosProductos, productoSeleccionado]);

  // Providers that have supplied the selected product
  const proveedoresDelProducto = useMemo(() => {
    if (puntosProducto.length === 0) return [];

    const agrupado: Record<
      string,
      {
        nombre: string;
        puntos: typeof puntosProducto;
      }
    > = {};

    puntosProducto.forEach((p) => {
      if (!agrupado[p.proveedor]) {
        agrupado[p.proveedor] = {
          nombre: p.proveedor,
          puntos: [],
        };
      }
      agrupado[p.proveedor].puntos.push(p);
    });

    return Object.values(agrupado).map((item, idx) => {
      const pSorted = [...item.puntos].sort((a, b) => a.fecha.localeCompare(b.fecha));
      const primerPrecio = pSorted[0].precioUnitario;
      const ultimoPrecio = pSorted[pSorted.length - 1].precioUnitario;
      const precios = pSorted.map((p) => p.precioUnitario);
      const precioMin = Math.min(...precios);
      const precioMax = Math.max(...precios);
      const variacionAbs = ultimoPrecio - primerPrecio;
      const variacionPorc = primerPrecio > 0 ? (variacionAbs / primerPrecio) * 100 : 0;
      const totalCantidad = pSorted.reduce((acc, p) => acc + p.cantidad, 0);
      const totalGasto = pSorted.reduce((acc, p) => acc + p.subtotal, 0);

      return {
        nombre: item.nombre,
        color: getProveedorColor(item.nombre, idx),
        totalCompras: pSorted.length,
        primerPrecio,
        ultimoPrecio,
        precioMin,
        precioMax,
        variacionAbs,
        variacionPorc,
        totalCantidad,
        totalGasto,
        primeraFecha: pSorted[0].fecha,
        ultimaFecha: pSorted[pSorted.length - 1].fecha,
        unidad: pSorted[0].unidad,
      };
    });
  }, [puntosProducto]);

  // Overall product metrics across all providers
  const metricasGlobales = useMemo(() => {
    if (puntosProducto.length === 0) return null;

    const primerPunto = puntosProducto[0];
    const ultimoPunto = puntosProducto[puntosProducto.length - 1];
    const precios = puntosProducto.map((p) => p.precioUnitario);
    const precioMin = Math.min(...precios);
    const precioMax = Math.max(...precios);
    const puntoMin = puntosProducto.find((p) => p.precioUnitario === precioMin);
    const puntoMax = puntosProducto.find((p) => p.precioUnitario === precioMax);

    const sumaTotalGasto = puntosProducto.reduce((acc, p) => acc + p.subtotal, 0);
    const sumaTotalCantidad = puntosProducto.reduce((acc, p) => acc + p.cantidad, 0);
    const precioMedioPonderado = sumaTotalCantidad > 0 ? sumaTotalGasto / sumaTotalCantidad : 0;

    const precioInicial = primerPunto.precioUnitario;
    const precioActual = ultimoPunto.precioUnitario;
    const variacionAbs = precioActual - precioInicial;
    const variacionPorc = precioInicial > 0 ? (variacionAbs / precioInicial) * 100 : 0;

    return {
      nombre: productoSeleccionado,
      unidad: ultimoPunto.unidad,
      totalCompras: puntosProducto.length,
      primerPunto,
      ultimoPunto,
      precioMin,
      puntoMin,
      precioMax,
      puntoMax,
      precioInicial,
      precioActual,
      precioMedioPonderado,
      variacionAbs,
      variacionPorc,
      tieneSubida: variacionPorc >= umbralModerado,
      subidaPronunciada: variacionPorc >= umbralCritico,
      sumaTotalGasto,
      sumaTotalCantidad,
    };
  }, [puntosProducto, productoSeleccionado, umbralModerado, umbralCritico]);

  // Active provider statistics (if filtered to a specific provider)
  const statsProveedorActivo = useMemo(() => {
    if (filtroProveedor === 'TODOS') return null;
    return proveedoresDelProducto.find((p) => p.nombre === filtroProveedor) || null;
  }, [filtroProveedor, proveedoresDelProducto]);

  // Check if active filter is valid when product changes
  React.useEffect(() => {
    if (filtroProveedor !== 'TODOS') {
      const existe = proveedoresDelProducto.some((p) => p.nombre === filtroProveedor);
      if (!existe) {
        setFiltroProveedor('TODOS');
      }
    }
  }, [productoSeleccionado, proveedoresDelProducto, filtroProveedor]);

  // Prepare chronological multi-provider timeline data for Recharts LineChart
  const chartTimeline = useMemo(() => {
    if (puntosProducto.length === 0) return [];

    // Points filtered by active provider or all
    const puntosParaMostrar =
      filtroProveedor === 'TODOS'
        ? puntosProducto
        : puntosProducto.filter((p) => p.proveedor === filtroProveedor);

    if (puntosParaMostrar.length === 0) return [];

    const media = metricasGlobales?.precioMedioPonderado || 0;

    // Build timeline entry for each purchase event
    return puntosParaMostrar.map((p) => {
      const entry: Record<string, any> = {
        fecha: p.fecha,
        fechaCorta: formatearFechaCorta(p.fecha),
        idFactura: p.idFactura,
        proveedor: p.proveedor,
        precioUnitario: p.precioUnitario,
        cantidad: p.cantidad,
        unidad: p.unidad,
        subtotal: p.subtotal,
        precioMedio: Number(media.toFixed(2)),
      };

      if (filtroProveedor === 'TODOS') {
        // In comparison mode, assign the unit price to the specific provider's key
        proveedoresDelProducto.forEach((prov) => {
          if (prov.nombre === p.proveedor) {
            entry[prov.nombre] = p.precioUnitario;
          }
        });
      } else {
        // In filtered mode, set the single line price
        entry[p.proveedor] = p.precioUnitario;
      }

      return entry;
    });
  }, [puntosProducto, filtroProveedor, proveedoresDelProducto, metricasGlobales]);

  // Purchases list for the historical table (filtered by provider)
  const comprasTabla = useMemo(() => {
    const list =
      filtroProveedor === 'TODOS'
        ? puntosProducto
        : puntosProducto.filter((p) => p.proveedor === filtroProveedor);

    // Calculate variation relative to previous purchase from the same provider
    const provLastPrice: Record<string, number> = {};

    return list.map((item) => {
      const prevPrice = provLastPrice[item.proveedor];
      let diffAbs = 0;
      let diffPorc = 0;
      if (prevPrice !== undefined) {
        diffAbs = item.precioUnitario - prevPrice;
        diffPorc = prevPrice > 0 ? (diffAbs / prevPrice) * 100 : 0;
      }
      provLastPrice[item.proveedor] = item.precioUnitario;

      return {
        ...item,
        diffAbs,
        diffPorc,
        tienePrevio: prevPrice !== undefined,
      };
    });
  }, [puntosProducto, filtroProveedor]);

  // Ranking of top price increases across all bakery items
  const rankingAumentos = useMemo(() => {
    return Object.keys(todosLosProductos)
      .map((nombre) => {
        const puntos = todosLosProductos[nombre];
        if (puntos.length < 2) return null;
        const pIni = puntos[0].precioUnitario;
        const pFin = puntos[puntos.length - 1].precioUnitario;
        const varPorc = ((pFin - pIni) / pIni) * 100;
        return {
          nombre,
          unidad: puntos[0].unidad,
          proveedor: puntos[puntos.length - 1].proveedor,
          precioInicial: pIni,
          precioActual: pFin,
          variacionPorcentaje: varPorc,
          comprasCount: puntos.length,
        };
      })
      .filter((item): item is NonNullable<typeof item> => item !== null)
      .sort((a, b) => b.variacionPorcentaje - a.variacionPorcentaje);
  }, [todosLosProductos]);

  // Custom Tooltip for Recharts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const dataPoint = payload[0]?.payload;
    const unidad = dataPoint?.unidad || metricasGlobales?.unidad || 'ud';

    return (
      <div className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-700/80 shadow-xl shadow-black/60 text-xs space-y-2 min-w-[240px]">
        <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
          <div className="flex items-center gap-1.5 text-slate-300">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold">{dataPoint?.fecha}</span>
          </div>
          <span className="font-mono text-[11px] font-bold text-slate-300 px-1.5 py-0.5 rounded bg-slate-800">
            {dataPoint?.idFactura}
          </span>
        </div>

        <div className="space-y-1.5 pt-0.5">
          {payload
            .filter((item: any) => item.value !== undefined && item.value !== null && item.dataKey !== 'precioMedio')
            .map((item: any, idx: number) => {
              const provColor = item.color || getProveedorColor(item.name, idx);
              return (
                <div key={idx} className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: provColor }}
                    />
                    <span className="text-slate-300 truncate max-w-[150px]" title={item.name}>
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right font-mono font-bold text-slate-100 shrink-0">
                    {Number(item.value).toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    € <span className="text-[10px] text-slate-400 font-sans">/{unidad}</span>
                  </div>
                </div>
              );
            })}

          {dataPoint?.cantidad && (
            <div className="pt-1 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
              <span>Volumen compra:</span>
              <span className="font-mono text-slate-200">
                {dataPoint.cantidad} {unidad} ({dataPoint.subtotal?.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €)
              </span>
            </div>
          )}

          {mostrarMedia && metricasGlobales && (
            <div className="flex items-center justify-between text-[10px] text-slate-400">
              <span className="flex items-center gap-1">
                <span className="w-2 h-0.5 bg-slate-400 inline-block" />
                Precio Medio Ponderado:
              </span>
              <span className="font-mono text-slate-300">
                {metricasGlobales.precioMedioPonderado.toFixed(2)} €
              </span>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5" />
              Auditoría y Comparativa
            </span>
            <span className="text-xs text-slate-300">
              Evolución Histórica de Precios por Proveedor
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1 tracking-tight">
            Evolución de Precios de Insumos
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Analiza la variación de precios unitarios a lo largo del tiempo y compara tarifas entre proveedores
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="px-3 py-1.5 rounded-xl bg-[#0f172a] border border-slate-800 text-xs text-slate-300">
            Productos analizados: <strong className="text-slate-200">{listaNombresProductos.length}</strong>
          </span>
          <span
            className="px-3 py-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-1.5"
            title="Umbrales configurados en los parámetros globales del sistema"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-amber-400" />
            <span>Alerta subida: <strong>≥{umbralModerado}%</strong></span>
            <span className="text-slate-500">•</span>
            <span>Crítica: <strong>≥{umbralCritico}%</strong></span>
          </span>
        </div>
      </div>

      {/* Main Analysis Layout: Selector + Current Product Inspection */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Product Selection & Search */}
        <div className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Package className="w-4 h-4 text-rose-400" />
              Seleccionar Producto
            </h3>
            <p className="text-xs text-slate-300 mt-0.5">
              Elige cualquier insumo para auditar su curva de precios
            </p>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              id="input-buscar-producto-precios"
              type="text"
              placeholder="Filtrar por nombre..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-[#0a0f18] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <div className="max-h-[480px] overflow-y-auto space-y-1.5 pr-1">
            {listaNombresProductos
              .filter((nom) => nom.toLowerCase().includes(busqueda.toLowerCase()))
              .map((nombre) => {
                const puntos = todosLosProductos[nombre];
                const pIni = puntos[0]?.precioUnitario || 0;
                const pFin = puntos[puntos.length - 1]?.precioUnitario || 0;
                const vPorc = pIni > 0 ? ((pFin - pIni) / pIni) * 100 : 0;
                const isSelected = productoSeleccionado === nombre;
                const numProvs = new Set(puntos.map((p) => p.proveedor)).size;

                return (
                  <button
                    key={nombre}
                    id={`btn-producto-${nombre.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                    onClick={() => {
                      setProductoSeleccionado(nombre);
                      setFiltroProveedor('TODOS');
                    }}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center justify-between gap-2 cursor-pointer ${
                      isSelected
                        ? 'bg-rose-500/15 border-rose-500/50 text-slate-100 shadow-md shadow-rose-950/20'
                        : 'bg-[#0a0f18] border-slate-800/80 text-slate-300 hover:bg-slate-800/40 hover:border-slate-700'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-semibold text-xs truncate text-slate-100">{nombre}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1.5">
                        <span>{puntos.length} compras</span>
                        <span>•</span>
                        <span className="text-sky-400 font-medium">
                          {numProvs} {numProvs === 1 ? 'proveedor' : 'proveedores'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-slate-200">
                        {pFin.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </div>
                      {puntos.length > 1 && (
                        <div
                          className={`text-[10px] font-semibold flex items-center justify-end gap-0.5 ${
                            vPorc >= umbralCritico
                              ? 'text-rose-400 font-bold'
                              : vPorc >= umbralModerado
                              ? 'text-amber-400 font-semibold'
                              : vPorc > 0
                              ? 'text-sky-400'
                              : 'text-emerald-400'
                          }`}
                        >
                          {vPorc > 0 ? '+' : ''}
                          {vPorc.toLocaleString('es-ES', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
          </div>
        </div>

        {/* Right Column (2 cols): Selected Product Detailed Evolution with Supplier Filter */}
        {metricasGlobales ? (
          <div className="lg:col-span-2 space-y-5">
            {/* Price Hike Alert Banner if applicable */}
            {metricasGlobales.tieneSubida && (
              <div
                className={`p-4 rounded-xl border flex items-start justify-between gap-3 ${
                  metricasGlobales.subidaPronunciada
                    ? 'bg-red-950/40 border-red-500/50 text-red-200'
                    : 'bg-amber-950/30 border-amber-500/40 text-amber-200'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      metricasGlobales.subidaPronunciada
                        ? 'bg-red-500/20 text-red-400'
                        : 'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-black/30">
                      {metricasGlobales.subidaPronunciada
                        ? `SUBIDA CRÍTICA DE PRECIO (≥${umbralCritico}%)`
                        : `SUBIDA MODERADA DE PRECIO (≥${umbralModerado}%)`}
                    </span>
                    <h4 className="text-sm font-bold mt-1 text-slate-100">
                      {metricasGlobales.nombre} ha experimentado un incremento del +
                      {metricasGlobales.variacionPorc.toLocaleString('es-ES', {
                        minimumFractionDigits: 1,
                        maximumFractionDigits: 1,
                      })}
                      %
                    </h4>
                    <p className="text-xs mt-0.5 opacity-90 leading-relaxed text-slate-300">
                      El coste unitario pasó de{' '}
                      {metricasGlobales.precioInicial.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                      € a{' '}
                      {metricasGlobales.precioActual.toLocaleString('es-ES', { minimumFractionDigits: 2 })}{' '}
                      € por {metricasGlobales.unidad}. Supera el umbral de alerta configurado (≥ {metricasGlobales.subidaPronunciada ? umbralCritico : umbralModerado}%). Compara las tarifas de tus proveedores para negociar o repercutir en escandallos.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Provider Filter & Chart Header Bar */}
            <div className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/70 pb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-bold text-slate-100">
                      Evolución Histórica: {metricasGlobales.nombre}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Precio unitario sin IVA (€/{metricasGlobales.unidad}) • {metricasGlobales.totalCompras} compras registradas
                  </p>
                </div>

                {/* Filter Control: Dropdown */}
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-[#0a0f18] border border-slate-800 text-xs">
                    <Filter className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                    <label htmlFor="select-filtro-proveedor" className="text-slate-400 text-[11px] font-medium hidden sm:inline">
                      Proveedor:
                    </label>
                    <select
                      id="select-filtro-proveedor"
                      value={filtroProveedor}
                      onChange={(e) => setFiltroProveedor(e.target.value)}
                      className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
                    >
                      <option value="TODOS" className="bg-[#0f172a] text-slate-200">
                        Todos los proveedores ({proveedoresDelProducto.length} proveedores)
                      </option>
                      {proveedoresDelProducto.map((prov) => (
                        <option key={prov.nombre} value={prov.nombre} className="bg-[#0f172a] text-slate-200">
                          {prov.nombre} ({prov.totalCompras} compras • {prov.ultimoPrecio.toFixed(2)}€)
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Toggle Average Reference Line */}
                  <button
                    id="btn-toggle-precio-medio"
                    onClick={() => setMostrarMedia(!mostrarMedia)}
                    className={`px-3 py-1.5 rounded-xl border text-xs font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
                      mostrarMedia
                        ? 'bg-slate-800 text-slate-200 border-slate-700'
                        : 'bg-[#0a0f18] text-slate-400 border-slate-800 hover:text-slate-200'
                    }`}
                    title="Activar o desactivar línea de referencia con el precio medio del producto"
                  >
                    <span className="w-2 h-0.5 bg-slate-400 inline-block" />
                    <span>Media: {metricasGlobales.precioMedioPonderado.toFixed(2)} €</span>
                  </button>
                </div>
              </div>

              {/* Provider Quick Filter Chips */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[11px] text-slate-400 font-medium mr-1">Filtrar:</span>
                <button
                  id="chip-proveedor-todos"
                  onClick={() => setFiltroProveedor('TODOS')}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border ${
                    filtroProveedor === 'TODOS'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                      : 'bg-[#0a0f18] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3 h-3 text-rose-400" />
                  <span>Todos (Comparar líneas)</span>
                  <span className="text-[10px] px-1 rounded bg-black/40 text-slate-300">
                    {proveedoresDelProducto.length}
                  </span>
                </button>

                {proveedoresDelProducto.map((prov) => {
                  const isActive = filtroProveedor === prov.nombre;
                  return (
                    <button
                      key={prov.nombre}
                      id={`chip-proveedor-${prov.nombre.toLowerCase().replace(/[^a-z0-9]/g, '-')}`}
                      onClick={() => setFiltroProveedor(prov.nombre)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 border ${
                        isActive
                          ? 'border-opacity-100 shadow-sm'
                          : 'bg-[#0a0f18] text-slate-400 border-slate-800 hover:border-slate-700 hover:text-slate-200'
                      }`}
                      style={{
                        backgroundColor: isActive ? `${prov.color}20` : undefined,
                        borderColor: isActive ? prov.color : undefined,
                        color: isActive ? '#ffffff' : undefined,
                      }}
                    >
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: prov.color }}
                      />
                      <span className="truncate max-w-[150px]">{prov.nombre}</span>
                      <span className="text-[10px] font-mono px-1 rounded bg-black/40 text-slate-300">
                        {prov.ultimoPrecio.toFixed(2)} €
                      </span>
                    </button>
                  );
                })}

                {filtroProveedor !== 'TODOS' && (
                  <button
                    onClick={() => setFiltroProveedor('TODOS')}
                    className="p-1 rounded-md text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors ml-auto text-[11px] flex items-center gap-1 cursor-pointer"
                    title="Restablecer filtro a todos los proveedores"
                  >
                    <X className="w-3 h-3" />
                    <span>Quitar filtro</span>
                  </button>
                )}
              </div>

              {/* Multi-provider Comparison Insights Card */}
              {proveedoresDelProducto.length > 1 && filtroProveedor === 'TODOS' && (
                <div className="p-3.5 rounded-xl bg-gradient-to-r from-sky-950/30 to-purple-950/20 border border-sky-800/40 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-lg bg-sky-500/20 text-sky-400 shrink-0">
                      <Scale className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="font-bold text-sky-200">
                        Comparativa de {proveedoresDelProducto.length} proveedores para este insumo
                      </span>
                      <p className="text-slate-300 text-[11px] mt-0.5">
                        Proveedor más económico:{' '}
                        <strong className="text-emerald-400">
                          {metricasGlobales.puntoMin?.proveedor} (
                          {metricasGlobales.precioMin.toFixed(2)} €/{metricasGlobales.unidad})
                        </strong>{' '}
                        vs más alto:{' '}
                        <strong className="text-rose-400">
                          {metricasGlobales.puntoMax?.proveedor} (
                          {metricasGlobales.precioMax.toFixed(2)} €/{metricasGlobales.unidad})
                        </strong>
                      </p>
                    </div>
                  </div>

                  <div className="shrink-0 font-mono text-right">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Brecha máx</span>
                    <span className="text-xs font-bold text-amber-300">
                      +{(metricasGlobales.precioMax - metricasGlobales.precioMin).toFixed(2)} €/
                      {metricasGlobales.unidad}
                    </span>
                  </div>
                </div>
              )}

              {/* Recharts LineChart */}
              <div className="h-72 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartTimeline}
                    margin={{ top: 15, right: 25, left: -15, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="fechaCorta"
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      dy={5}
                    />
                    <YAxis
                      stroke="#64748b"
                      tick={{ fontSize: 11 }}
                      domain={['auto', 'auto']}
                      tickFormatter={(v) => `${v.toFixed(2)} €`}
                    />
                    <Tooltip content={<CustomTooltip />} />

                    {/* Reference Line for Product Weighted Average */}
                    {mostrarMedia && (
                      <ReferenceLine
                        y={Number(metricasGlobales.precioMedioPonderado.toFixed(2))}
                        stroke="#94a3b8"
                        strokeDasharray="4 4"
                        label={{
                          value: `Media: ${metricasGlobales.precioMedioPonderado.toFixed(2)} €`,
                          fill: '#94a3b8',
                          fontSize: 10,
                          position: 'insideTopRight',
                        }}
                      />
                    )}

                    {/* Multiple lines: one for each supplier when comparing or filtered */}
                    {filtroProveedor === 'TODOS' ? (
                      proveedoresDelProducto.map((prov) => (
                        <Line
                          key={prov.nombre}
                          type="monotone"
                          dataKey={prov.nombre}
                          name={prov.nombre}
                          stroke={prov.color}
                          strokeWidth={3}
                          connectNulls={true}
                          dot={{
                            r: 4.5,
                            fill: '#0f172a',
                            stroke: prov.color,
                            strokeWidth: 2,
                          }}
                          activeDot={{
                            r: 7,
                            stroke: '#ffffff',
                            strokeWidth: 2,
                            fill: prov.color,
                          }}
                        />
                      ))
                    ) : (
                      // Single provider focused line
                      <Line
                        type="monotone"
                        dataKey={filtroProveedor}
                        name={filtroProveedor}
                        stroke={statsProveedorActivo?.color || '#f43f5e'}
                        strokeWidth={3.5}
                        connectNulls={true}
                        dot={{
                          r: 5,
                          fill: statsProveedorActivo?.color || '#f43f5e',
                          stroke: '#ffffff',
                          strokeWidth: 2,
                        }}
                        activeDot={{
                          r: 8,
                          stroke: '#ffffff',
                          strokeWidth: 2,
                          fill: statsProveedorActivo?.color || '#f43f5e',
                        }}
                      />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Chart Legend with Provider Toggles */}
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
                {proveedoresDelProducto.map((prov) => {
                  const isHighlighted = filtroProveedor === 'TODOS' || filtroProveedor === prov.nombre;
                  return (
                    <button
                      key={prov.nombre}
                      onClick={() =>
                        setFiltroProveedor(filtroProveedor === prov.nombre ? 'TODOS' : prov.nombre)
                      }
                      className={`flex items-center gap-2 transition-opacity cursor-pointer ${
                        isHighlighted ? 'opacity-100 font-semibold text-slate-200' : 'opacity-40 text-slate-400'
                      }`}
                      title={`Haz clic para filtrar exclusivamente por ${prov.nombre}`}
                    >
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: prov.color }}
                      />
                      <span>{prov.nombre}</span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        ({prov.ultimoPrecio.toFixed(2)} €)
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Metrics Row: Adjusts dynamically based on provider filter */}
            {statsProveedorActivo ? (
              // Metrics for Filtered Provider
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-[#101726] border border-slate-800/80">
                  <span className="text-[11px] text-slate-400">1ª Compra ({statsProveedorActivo.nombre.split(' ')[0]})</span>
                  <div className="text-xl font-bold text-slate-200 font-mono mt-1">
                    {statsProveedorActivo.primerPrecio.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </div>
                  <span className="text-[10px] text-slate-400">{statsProveedorActivo.primeraFecha}</span>
                </div>

                <div className="p-4 rounded-xl bg-[#101726] border border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Última Tarifa</span>
                  <div className="text-xl font-bold font-mono mt-1" style={{ color: statsProveedorActivo.color }}>
                    {statsProveedorActivo.ultimoPrecio.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </div>
                  <span className="text-[10px] text-slate-400">{statsProveedorActivo.ultimaFecha}</span>
                </div>

                <div className="p-4 rounded-xl bg-[#101726] border border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Variación con Proveedor</span>
                  <div
                    className={`text-xl font-bold font-mono mt-1 ${
                      statsProveedorActivo.variacionAbs > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {statsProveedorActivo.variacionAbs > 0 ? '+' : ''}
                    {statsProveedorActivo.variacionAbs.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {statsProveedorActivo.variacionPorc > 0 ? '+' : ''}
                    {statsProveedorActivo.variacionPorc.toFixed(1)}% acumulado
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#101726] border border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Volumen con Proveedor</span>
                  <div className="text-xl font-bold font-mono mt-1 text-slate-200">
                    {statsProveedorActivo.totalCantidad} {statsProveedorActivo.unidad}
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {statsProveedorActivo.totalGasto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € facturados
                  </span>
                </div>
              </div>
            ) : (
              // Global Metrics for All Providers
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-4 rounded-xl bg-[#101726] border border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Tarifa Mínima Histórica</span>
                  <div className="text-xl font-bold text-emerald-400 font-mono mt-1">
                    {metricasGlobales.precioMin.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block" title={metricasGlobales.puntoMin?.proveedor}>
                    {metricasGlobales.puntoMin?.proveedor}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#101726] border border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Tarifa Máxima Registrada</span>
                  <div className="text-xl font-bold text-rose-400 font-mono mt-1">
                    {metricasGlobales.precioMax.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block" title={metricasGlobales.puntoMax?.proveedor}>
                    {metricasGlobales.puntoMax?.proveedor}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#101726] border border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Variación General 2026</span>
                  <div
                    className={`text-xl font-bold font-mono mt-1 ${
                      metricasGlobales.variacionAbs > 0 ? 'text-rose-400' : 'text-emerald-400'
                    }`}
                  >
                    {metricasGlobales.variacionAbs > 0 ? '+' : ''}
                    {metricasGlobales.variacionAbs.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {metricasGlobales.variacionPorc > 0 ? '+' : ''}
                    {metricasGlobales.variacionPorc.toFixed(1)}% por {metricasGlobales.unidad}
                  </span>
                </div>

                <div className="p-4 rounded-xl bg-[#101726] border border-slate-800/80">
                  <span className="text-[11px] text-slate-400">Gasto Total en Insumo</span>
                  <div className="text-xl font-bold font-mono mt-1 text-slate-200">
                    {metricasGlobales.sumaTotalGasto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                  </div>
                  <span className="text-[10px] text-slate-400">
                    {metricasGlobales.sumaTotalCantidad} {metricasGlobales.unidad} compradas
                  </span>
                </div>
              </div>
            )}

            {/* Historical Invoices Table for this Product (Filtered) */}
            <div className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-rose-400" />
                  Compras Históricas Registradas ({comprasTabla.length})
                  {filtroProveedor !== 'TODOS' && (
                    <span className="text-amber-400 font-normal normal-case text-[11px]">
                      • Filtrado por: {filtroProveedor}
                    </span>
                  )}
                </h4>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0a0f18] text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="p-3">Factura</th>
                      <th className="p-3">Fecha</th>
                      <th className="p-3">Proveedor</th>
                      <th className="p-3 text-right">Cantidad</th>
                      <th className="p-3 text-right">Precio Unit.</th>
                      <th className="p-3 text-right">Variación</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-[#101726]">
                    {comprasTabla.map((p, idx) => {
                      const provColor = getProveedorColor(p.proveedor, idx);
                      return (
                        <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                          <td className="p-3 font-mono font-bold text-slate-200">{p.idFactura}</td>
                          <td className="p-3 text-slate-400 font-mono">{p.fecha}</td>
                          <td className="p-3">
                            <div className="flex items-center gap-1.5 truncate max-w-[200px]">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: provColor }}
                              />
                              <span className="text-slate-300 truncate">{p.proveedor}</span>
                            </div>
                          </td>
                          <td className="p-3 text-right text-slate-400 font-mono">
                            {p.cantidad} {p.unidad}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-slate-100">
                            {p.precioUnitario.toLocaleString('es-ES', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            €
                          </td>
                          <td className="p-3 text-right font-mono">
                            {p.tienePrevio ? (
                              <span
                                className={`text-[11px] font-semibold flex items-center justify-end gap-0.5 ${
                                  p.diffAbs > 0
                                    ? 'text-rose-400'
                                    : p.diffAbs < 0
                                    ? 'text-emerald-400'
                                    : 'text-slate-400'
                                }`}
                              >
                                {p.diffAbs > 0 ? (
                                  <ArrowUpRight className="w-3 h-3" />
                                ) : p.diffAbs < 0 ? (
                                  <ArrowDownRight className="w-3 h-3" />
                                ) : null}
                                {p.diffAbs > 0 ? '+' : ''}
                                {p.diffAbs.toFixed(2)} € ({p.diffPorc > 0 ? '+' : ''}
                                {p.diffPorc.toFixed(1)}%)
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-sans">1ª Compra</span>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-200">
                            {p.subtotal.toLocaleString('es-ES', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{' '}
                            €
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        ) : (
          <div className="lg:col-span-2 p-10 rounded-2xl bg-[#101726] border border-slate-800 text-center text-slate-500">
            Selecciona un producto para visualizar su evolución temporal.
          </div>
        )}
      </div>

      {/* Cross-Product Price Increase Ranking */}
      <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-100">
            Ranking de Productos con Mayor Incremento de Precio ({parametrosActivos.anoFiscalReferencia || 2026})
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Detección automática de anomalías según umbrales de alerta (Moderada ≥{umbralModerado}%, Crítica ≥{umbralCritico}%)
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rankingAumentos.map((item) => (
            <div
              key={item.nombre}
              onClick={() => {
                setProductoSeleccionado(item.nombre);
                setFiltroProveedor('TODOS');
              }}
              className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 hover:border-slate-700 cursor-pointer transition-all hover:bg-slate-800/20 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-semibold text-xs text-slate-200 truncate">{item.nombre}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    item.variacionPorcentaje >= umbralCritico
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : item.variacionPorcentaje >= umbralModerado
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : item.variacionPorcentaje > 0
                      ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  {item.variacionPorcentaje > 0 ? '+' : ''}
                  {item.variacionPorcentaje.toFixed(1)}%
                </span>
              </div>

              <p className="text-[11px] text-slate-400 truncate">{item.proveedor}</p>

              <div className="flex items-center justify-between text-xs pt-1 border-t border-slate-800/60 font-mono">
                <span className="text-slate-400">
                  {item.precioInicial.toFixed(2)} € →{' '}
                  <strong className="text-slate-100">{item.precioActual.toFixed(2)} €</strong>
                </span>
                <span className="text-[10px] text-slate-400 font-sans">
                  {item.comprasCount} compras
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
