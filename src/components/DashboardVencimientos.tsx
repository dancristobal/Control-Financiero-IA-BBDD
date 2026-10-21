import React, { useState, useMemo } from 'react';
import {
  CalendarClock,
  Calendar as CalendarIcon,
  AlertTriangle,
  Clock,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Search,
  Filter,
  ArrowUpDown,
  FileText,
  Building2,
  Eye,
  Check,
  TrendingDown,
  Layers,
  Sparkles,
  DollarSign,
  CalendarRange,
  X,
  CreditCard,
  ShieldAlert,
  ArrowRight,
  Download,
  FileSpreadsheet
} from 'lucide-react';
import { Factura, Proveedor } from '../types';
import { formatMoneda } from '../utils/formatters';
import { obtenerColorCategoria } from '../utils/categoriasGasto';
import { FacturaDetalleModal } from './FacturaDetalleModal';
import { ConfirmarPagoModal } from './ConfirmarPagoModal';

interface DashboardVencimientosProps {
  facturas: Factura[];
  proveedores?: Proveedor[];
  onActualizarEstadoFactura?: (
    idFactura: string,
    nuevoEstado: 'Pagada' | 'Pendiente' | 'Vencida',
    fechaPago?: string
  ) => Promise<any> | void;
  onNavigateToFacturas?: () => void;
  onVerFactura?: (factura: Factura) => void;
}

type ViewMode = 'split' | 'calendar' | 'list';
type UrgenciaFilter = 'todas' | 'vencidas' | '7dias' | 'esteMes' | 'altoImporte';
type SortOption = 'vencimiento-asc' | 'vencimiento-desc' | 'importe-desc' | 'importe-asc' | 'proveedor-asc';

export const DashboardVencimientos: React.FC<DashboardVencimientosProps> = ({
  facturas,
  proveedores = [],
  onActualizarEstadoFactura,
  onNavigateToFacturas,
  onVerFactura,
}) => {
  // Fecha actual de referencia (normalizada a medianoche)
  const today = useMemo(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const todayStr = useMemo(() => {
    const y = today.getFullYear();
    const m = String(today.getMonth() + 1).padStart(2, '0');
    const d = String(today.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }, [today]);

  // Estado del componente
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [currentMonth, setCurrentMonth] = useState<Date>(() => new Date(today.getFullYear(), today.getMonth(), 1));
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [urgenciaFilter, setUrgenciaFilter] = useState<UrgenciaFilter>('todas');
  const [proveedorFilter, setProveedorFilter] = useState<string>('todos');
  const [sortBy, setSortBy] = useState<SortOption>('vencimiento-asc');
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);
  const [accionEnCurso, setAccionEnCurso] = useState<string | null>(null);
  const [facturaParaPago, setFacturaParaPago] = useState<Factura | null>(null);
  const [toastFeedback, setToastFeedback] = useState<string | null>(null);

  // Helper para normalizar fecha de vencimiento (formato YYYY-MM-DD)
  const getFechaVencimiento = (f: Factura): string => {
    if (f.fechaVencimiento && f.fechaVencimiento.trim() !== '') {
      return f.fechaVencimiento.split('T')[0];
    }
    return f.fechaEmision ? f.fechaEmision.split('T')[0] : todayStr;
  };

  // Helper de diferencia en días respecto a hoy
  const getDiasDiferencia = (fechaStr: string): number => {
    const [y, m, d] = fechaStr.split('-').map(Number);
    const target = new Date(y, (m || 1) - 1, d || 1);
    const diffTime = target.getTime() - today.getTime();
    return Math.round(diffTime / (1000 * 60 * 60 * 24));
  };

  // 1. Filtrado estricto por estado 'Pendiente' (o 'Vencida' que sigue sin pagar)
  const facturasPendientes = useMemo(() => {
    return facturas.filter((f) => f.estado === 'Pendiente' || f.estado === 'Vencida');
  }, [facturas]);

  // Lista de proveedores únicos con facturas pendientes para el selector
  const proveedoresConPendientes = useMemo(() => {
    const map = new Map<string, string>();
    facturasPendientes.forEach((f) => {
      if (f.nombreProveedor) {
        map.set(f.nombreProveedor, f.nombreProveedor);
      }
    });
    return Array.from(map.values()).sort();
  }, [facturasPendientes]);

  // Métricas globales de los vencimientos
  const metricas = useMemo(() => {
    let totalImporte = 0;
    let totalVencidasImporte = 0;
    let countVencidas = 0;
    let total7DiasImporte = 0;
    let count7Dias = 0;
    let totalMesImporte = 0;
    let countMes = 0;

    const currentYear = today.getFullYear();
    const currentMonthNum = today.getMonth();

    facturasPendientes.forEach((f) => {
      const imp = Number(f.total) || 0;
      totalImporte += imp;

      const fVenc = getFechaVencimiento(f);
      const dias = getDiasDiferencia(fVenc);

      // Vencidas (dias < 0)
      if (dias < 0) {
        totalVencidasImporte += imp;
        countVencidas++;
      }
      // Vencen en próximos 7 días (0 <= dias <= 7)
      if (dias >= 0 && dias <= 7) {
        total7DiasImporte += imp;
        count7Dias++;
      }

      // Vencen en el mes actual
      const [y, m] = fVenc.split('-').map(Number);
      if (y === currentYear && m - 1 === currentMonthNum) {
        totalMesImporte += imp;
        countMes++;
      }
    });

    const ticketMedio = facturasPendientes.length > 0 ? totalImporte / facturasPendientes.length : 0;

    return {
      totalCount: facturasPendientes.length,
      totalImporte,
      countVencidas,
      totalVencidasImporte,
      count7Dias,
      total7DiasImporte,
      countMes,
      totalMesImporte,
      ticketMedio,
    };
  }, [facturasPendientes, today]);

  // Proyección semanal de liquidez (Semana 1, 2, 3, 4+)
  const proyeccionSemanas = useMemo(() => {
    const semanas = [
      { id: 'vencidas', label: 'Vencidas (Urgente)', importe: 0, count: 0, color: 'bg-rose-500' },
      { id: 'sem1', label: 'Esta Semana (1-7d)', importe: 0, count: 0, color: 'bg-amber-500' },
      { id: 'sem2', label: 'Semana 2 (8-14d)', importe: 0, count: 0, color: 'bg-blue-500' },
      { id: 'sem3', label: 'Semana 3 (15-21d)', importe: 0, count: 0, color: 'bg-indigo-500' },
      { id: 'sem4mas', label: 'Semana 4 en adelante (>21d)', importe: 0, count: 0, color: 'bg-emerald-500' },
    ];

    facturasPendientes.forEach((f) => {
      const imp = Number(f.total) || 0;
      const fVenc = getFechaVencimiento(f);
      const dias = getDiasDiferencia(fVenc);

      if (dias < 0) {
        semanas[0].importe += imp;
        semanas[0].count++;
      } else if (dias <= 7) {
        semanas[1].importe += imp;
        semanas[1].count++;
      } else if (dias <= 14) {
        semanas[2].importe += imp;
        semanas[2].count++;
      } else if (dias <= 21) {
        semanas[3].importe += imp;
        semanas[3].count++;
      } else {
        semanas[4].importe += imp;
        semanas[4].count++;
      }
    });

    return semanas;
  }, [facturasPendientes]);

  // Mapa de facturas por fecha para el calendario: "YYYY-MM-DD" -> Factura[]
  const facturasPorFecha = useMemo(() => {
    const map = new Map<string, Factura[]>();
    facturasPendientes.forEach((f) => {
      const fecha = getFechaVencimiento(f);
      if (!map.has(fecha)) {
        map.set(fecha, []);
      }
      map.get(fecha)!.push(f);
    });
    return map;
  }, [facturasPendientes]);

  // Filtrado y ordenación para la lista de vencimientos
  const facturasFiltradas = useMemo(() => {
    let result = [...facturasPendientes];

    // Filtro por fecha seleccionada en calendario
    if (selectedDate) {
      result = result.filter((f) => getFechaVencimiento(f) === selectedDate);
    }

    // Filtro por término de búsqueda (proveedor, concepto, idFactura)
    if (searchTerm.trim() !== '') {
      const term = searchTerm.toLowerCase();
      result = result.filter((f) =>
        (f.nombreProveedor || '').toLowerCase().includes(term) ||
        (f.concepto || '').toLowerCase().includes(term) ||
        (f.idFactura || '').toLowerCase().includes(term) ||
        (f.categoriaGasto || '').toLowerCase().includes(term)
      );
    }

    // Filtro por urgencia
    if (urgenciaFilter === 'vencidas') {
      result = result.filter((f) => getDiasDiferencia(getFechaVencimiento(f)) < 0);
    } else if (urgenciaFilter === '7dias') {
      result = result.filter((f) => {
        const d = getDiasDiferencia(getFechaVencimiento(f));
        return d >= 0 && d <= 7;
      });
    } else if (urgenciaFilter === 'esteMes') {
      const currentYear = today.getFullYear();
      const currentMonthNum = today.getMonth();
      result = result.filter((f) => {
        const [y, m] = getFechaVencimiento(f).split('-').map(Number);
        return y === currentYear && m - 1 === currentMonthNum;
      });
    } else if (urgenciaFilter === 'altoImporte') {
      result = result.filter((f) => (Number(f.total) || 0) >= 1000);
    }

    // Filtro por proveedor
    if (proveedorFilter !== 'todos') {
      result = result.filter((f) => f.nombreProveedor === proveedorFilter);
    }

    // Ordenación
    result.sort((a, b) => {
      const fechaA = getFechaVencimiento(a);
      const fechaB = getFechaVencimiento(b);
      const impA = Number(a.total) || 0;
      const impB = Number(b.total) || 0;

      if (sortBy === 'vencimiento-asc') {
        return fechaA.localeCompare(fechaB);
      }
      if (sortBy === 'vencimiento-desc') {
        return fechaB.localeCompare(fechaA);
      }
      if (sortBy === 'importe-desc') {
        return impB - impA;
      }
      if (sortBy === 'importe-asc') {
        return impA - impB;
      }
      if (sortBy === 'proveedor-asc') {
        return (a.nombreProveedor || '').localeCompare(b.nombreProveedor || '');
      }
      return 0;
    });

    return result;
  }, [facturasPendientes, selectedDate, searchTerm, urgenciaFilter, proveedorFilter, sortBy, today]);

  // Agrupación cronológica de la lista (Timeline Buckets)
  const gruposCronologicos = useMemo(() => {
    const buckets: {
      id: string;
      titulo: string;
      subtitulo: string;
      colorBadge: string;
      icon: any;
      facturas: Factura[];
    }[] = [
      {
        id: 'vencidas',
        titulo: 'Vencidas (Pago Urgente)',
        subtitulo: 'Facturas cuya fecha de vencimiento ya ha expirado',
        colorBadge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
        icon: AlertTriangle,
        facturas: [],
      },
      {
        id: 'hoy',
        titulo: 'Vencen Hoy',
        subtitulo: 'Compromisos de pago para el día de hoy',
        colorBadge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
        icon: Clock,
        facturas: [],
      },
      {
        id: 'proximos7d',
        titulo: 'Próximos 7 Días',
        subtitulo: 'Pagos previstos en la próxima semana',
        colorBadge: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
        icon: CalendarRange,
        facturas: [],
      },
      {
        id: 'proximos30d',
        titulo: 'Próximos 8 a 30 Días',
        subtitulo: 'Vencimientos del resto del mes y siguientes semanas',
        colorBadge: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
        icon: CalendarIcon,
        facturas: [],
      },
      {
        id: 'futuras',
        titulo: 'Más de 30 Días / Futuras',
        subtitulo: 'Compromisos a medio plazo',
        colorBadge: 'bg-slate-500/15 text-slate-300 border-slate-700/50',
        icon: CalendarClock,
        facturas: [],
      },
    ];

    facturasFiltradas.forEach((f) => {
      const dias = getDiasDiferencia(getFechaVencimiento(f));
      if (dias < 0) {
        buckets[0].facturas.push(f);
      } else if (dias === 0) {
        buckets[1].facturas.push(f);
      } else if (dias > 0 && dias <= 7) {
        buckets[2].facturas.push(f);
      } else if (dias > 7 && dias <= 30) {
        buckets[3].facturas.push(f);
      } else {
        buckets[4].facturas.push(f);
      }
    });

    return buckets.filter((b) => b.facturas.length > 0);
  }, [facturasFiltradas]);

  // Generación de la cuadrícula del calendario
  const calendarGrid = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // Primer día del mes
    const firstDay = new Date(year, month, 1);
    // Día de la semana (0: domingo -> convertir a 0: lunes, 6: domingo)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek === -1) startDayOfWeek = 6;

    // Número de días en el mes
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    // Días del mes anterior para rellenar
    const prevMonthDays = new Date(year, month, 0).getDate();

    const cells: {
      dateStr: string;
      dayNumber: number;
      isCurrentMonth: boolean;
      isToday: boolean;
      facturas: Factura[];
      totalImporte: number;
      hasVencidas: boolean;
    }[] = [];

    // Rellenar días anteriores
    for (let i = startDayOfWeek - 1; i >= 0; i--) {
      const d = prevMonthDays - i;
      const prevDate = new Date(year, month - 1, d);
      const yStr = prevDate.getFullYear();
      const mStr = String(prevDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${yStr}-${mStr}-${dStr}`;
      const facs = facturasPorFecha.get(dateStr) || [];
      const total = facs.reduce((acc, f) => acc + (Number(f.total) || 0), 0);
      const hasVencidas = facs.some((f) => getDiasDiferencia(getFechaVencimiento(f)) < 0);

      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        facturas: facs,
        totalImporte: total,
        hasVencidas,
      });
    }

    // Días del mes actual
    for (let d = 1; d <= daysInMonth; d++) {
      const mStr = String(month + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${year}-${mStr}-${dStr}`;
      const facs = facturasPorFecha.get(dateStr) || [];
      const total = facs.reduce((acc, f) => acc + (Number(f.total) || 0), 0);
      const hasVencidas = facs.some((f) => getDiasDiferencia(getFechaVencimiento(f)) < 0);

      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
        facturas: facs,
        totalImporte: total,
        hasVencidas,
      });
    }

    // Rellenar días posteriores para completar las filas (múltiplo de 7)
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const nextDate = new Date(year, month + 1, d);
      const yStr = nextDate.getFullYear();
      const mStr = String(nextDate.getMonth() + 1).padStart(2, '0');
      const dStr = String(d).padStart(2, '0');
      const dateStr = `${yStr}-${mStr}-${dStr}`;
      const facs = facturasPorFecha.get(dateStr) || [];
      const total = facs.reduce((acc, f) => acc + (Number(f.total) || 0), 0);
      const hasVencidas = facs.some((f) => getDiasDiferencia(getFechaVencimiento(f)) < 0);

      cells.push({
        dateStr,
        dayNumber: d,
        isCurrentMonth: false,
        isToday: dateStr === todayStr,
        facturas: facs,
        totalImporte: total,
        hasVencidas,
      });
    }

    return cells;
  }, [currentMonth, facturasPorFecha, todayStr]);

  // Manejador para iniciar el proceso de marcar una factura como pagada con selector de fecha
  const handleMarcarPagada = (f: Factura) => {
    setFacturaParaPago(f);
  };

  const handleConfirmarPago = async (idFactura: string, fechaPagoSeleccionada: string) => {
    if (!onActualizarEstadoFactura) return;
    setAccionEnCurso(idFactura);

    try {
      await onActualizarEstadoFactura(idFactura, 'Pagada', fechaPagoSeleccionada);
      setToastFeedback(`Factura ${idFactura} marcada como Pagada con fecha ${fechaPagoSeleccionada}.`);
    } catch {
      setToastFeedback(`Actualizada factura ${idFactura}`);
    } finally {
      setAccionEnCurso(null);
      setFacturaParaPago(null);
      setTimeout(() => setToastFeedback(null), 4000);
    }
  };

  // Navegación de meses
  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDate(todayStr);
  };

  const nombreMes = currentMonth.toLocaleDateString('es-ES', { month: 'long', year: 'numeric' });

  // Exportar facturas pendientes/filtradas a CSV/Excel para conciliación bancaria
  const exportarVencimientosCSV = () => {
    if (facturasFiltradas.length === 0) {
      setToastFeedback('No hay facturas pendientes filtradas para exportar.');
      setTimeout(() => setToastFeedback(null), 3500);
      return;
    }

    const encabezados = [
      'ID Factura',
      'Fecha Vencimiento',
      'Fecha Emisión',
      'ID Proveedor',
      'Nombre Proveedor',
      'Concepto',
      'Base Imponible (€)',
      'Tipos IVA (%)',
      'Cuota IVA (€)',
      'Total Líquido (€)',
      'Categoría Gasto',
      'Estado',
      'Días / Urgencia'
    ];

    const escapeCSV = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const filas = facturasFiltradas.map((f) => {
      const fVenc = getFechaVencimiento(f);
      const dias = getDiasDiferencia(fVenc);
      const urgenciaStr = dias < 0 ? `Vencida (${Math.abs(dias)} días)` : dias === 0 ? 'Vence hoy' : `En ${dias} días`;

      return [
        escapeCSV(f.idFactura),
        escapeCSV(fVenc),
        escapeCSV(f.fechaEmision),
        escapeCSV(f.idProveedor),
        escapeCSV(f.nombreProveedor),
        escapeCSV(f.concepto),
        escapeCSV(Number(f.baseImponible || 0).toFixed(2).replace('.', ',')),
        escapeCSV(f.tiposIVA || '21%'),
        escapeCSV(Number(f.cuotaIVA || 0).toFixed(2).replace('.', ',')),
        escapeCSV(Number(f.total || 0).toFixed(2).replace('.', ',')),
        escapeCSV(f.categoriaGasto),
        escapeCSV(f.estado),
        escapeCSV(urgenciaStr)
      ].join(';');
    });

    // UTF-8 BOM (\uFEFF) para compatibilidad con Excel / Numbers
    const csvContent = '\uFEFF' + [encabezados.map((h) => `"${h}"`).join(';'), ...filas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const fechaActual = new Date().toISOString().substring(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `vencimientos_conciliacion_bancaria_${fechaActual}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    setToastFeedback(`Se han exportado ${facturasFiltradas.length} facturas pendientes a CSV/Excel con éxito.`);
    setTimeout(() => setToastFeedback(null), 4000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Feedback */}
      {toastFeedback && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl bg-emerald-950/90 border border-emerald-500/50 text-emerald-200 shadow-xl backdrop-blur-md animate-fade-in text-sm">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{toastFeedback}</span>
          <button
            onClick={() => setToastFeedback(null)}
            className="ml-2 text-emerald-400 hover:text-white font-bold"
          >
            &times;
          </button>
        </div>
      )}

      {/* Header Principal */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 bg-[#0d131f] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-amber-500/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-1.5">
            <span className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <CalendarClock className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                  Dashboard de Vencimientos
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                  {metricas.totalCount} facturas pendientes
                </span>
              </div>
              <p className="text-xs sm:text-sm text-slate-400">
                Calendario interactivo y cronograma de pagos para anticipar compromisos de tesorería
              </p>
            </div>
          </div>
        </div>

        {/* Selector de Modos de Vista */}
        <div className="flex flex-wrap items-center gap-2 relative z-10">
          <div className="inline-flex rounded-xl bg-slate-900/90 p-1 border border-slate-800">
            <button
              onClick={() => setViewMode('split')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'split'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Vista Dividida</span>
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'calendar'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Calendario</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                viewMode === 'list'
                  ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Cronograma</span>
            </button>
          </div>

          <button
            onClick={exportarVencimientosCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-950/30 transition-all cursor-pointer"
            title="Exportar facturas pendientes y filtradas a CSV/Excel para conciliación bancaria"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar CSV ({facturasFiltradas.length})</span>
          </button>

          {onNavigateToFacturas && (
            <button
              onClick={onNavigateToFacturas}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-medium transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>Ver todas</span>
              <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
            </button>
          )}
        </div>
      </div>

      {/* 4 KPI Cards Resumen */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Total Pendiente */}
        <div className="bg-[#0f172a] border border-slate-800 rounded-2xl p-4.5 flex flex-col justify-between shadow-lg relative overflow-hidden group hover:border-slate-700 transition-all">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">
              Total Pendiente de Pago
            </span>
            <span className="p-2 rounded-xl bg-slate-800 text-slate-300">
              <CreditCard className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-100 tracking-tight font-mono">
              {formatMoneda(metricas.totalImporte)} €
            </div>
            <div className="flex items-center justify-between text-xs text-slate-400 mt-1">
              <span>{metricas.totalCount} facturas sin liquidar</span>
              <span className="text-slate-500">Ticket medio: {formatMoneda(metricas.ticketMedio)} €</span>
            </div>
          </div>
        </div>

        {/* KPI 2: Vencidas Urgentes */}
        <div
          onClick={() => {
            setUrgenciaFilter(urgenciaFilter === 'vencidas' ? 'todas' : 'vencidas');
            setSelectedDate(null);
          }}
          className={`bg-[#0f172a] border rounded-2xl p-4.5 flex flex-col justify-between shadow-lg cursor-pointer transition-all ${
            metricas.countVencidas > 0
              ? 'border-rose-500/40 hover:border-rose-500 bg-rose-950/10'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
              Vencidas (Pago Urgente)
            </span>
            <span className="p-2 rounded-xl bg-rose-500/20 text-rose-400">
              <AlertTriangle className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-rose-300 tracking-tight font-mono">
              {formatMoneda(metricas.totalVencidasImporte)} €
            </div>
            <div className="flex items-center justify-between text-xs text-rose-300/80 mt-1">
              <span>
                {metricas.countVencidas === 0
                  ? 'Sin facturas vencidas'
                  : `${metricas.countVencidas} facturas fuera de plazo`}
              </span>
              <span className="text-[11px] underline">
                {urgenciaFilter === 'vencidas' ? 'Filtro activo' : 'Filtrar'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 3: Vencen en 7 Días */}
        <div
          onClick={() => {
            setUrgenciaFilter(urgenciaFilter === '7dias' ? 'todas' : '7dias');
            setSelectedDate(null);
          }}
          className={`bg-[#0f172a] border rounded-2xl p-4.5 flex flex-col justify-between shadow-lg cursor-pointer transition-all ${
            metricas.count7Dias > 0
              ? 'border-amber-500/40 hover:border-amber-500 bg-amber-950/10'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              Próximos 7 Días
            </span>
            <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400">
              <CalendarRange className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-amber-300 tracking-tight font-mono">
              {formatMoneda(metricas.total7DiasImporte)} €
            </div>
            <div className="flex items-center justify-between text-xs text-amber-300/80 mt-1">
              <span>{metricas.count7Dias} facturas inminentes</span>
              <span className="text-[11px] underline">
                {urgenciaFilter === '7dias' ? 'Filtro activo' : 'Filtrar'}
              </span>
            </div>
          </div>
        </div>

        {/* KPI 4: Compromiso Mes Actual */}
        <div
          onClick={() => {
            setUrgenciaFilter(urgenciaFilter === 'esteMes' ? 'todas' : 'esteMes');
            setSelectedDate(null);
          }}
          className={`bg-[#0f172a] border rounded-2xl p-4.5 flex flex-col justify-between shadow-lg cursor-pointer transition-all ${
            urgenciaFilter === 'esteMes'
              ? 'border-indigo-500/50 bg-indigo-950/10'
              : 'border-slate-800 hover:border-slate-700'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
              <CalendarIcon className="w-3.5 h-3.5 text-indigo-400" />
              Mes en Curso
            </span>
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div>
            <div className="text-2xl font-black text-indigo-300 tracking-tight font-mono">
              {formatMoneda(metricas.totalMesImporte)} €
            </div>
            <div className="flex items-center justify-between text-xs text-indigo-300/80 mt-1">
              <span>{metricas.countMes} facturas en el mes</span>
              <span className="text-[11px] underline">
                {urgenciaFilter === 'esteMes' ? 'Filtro activo' : 'Filtrar'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Proyección de Liquidez y Estrés de Tesorería por Semanas */}
      <div className="bg-[#0d131f] border border-slate-800/80 rounded-2xl p-5 shadow-lg">
        <div className="flex items-center justify-between mb-3.5">
          <div className="flex items-center gap-2">
            <TrendingDown className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-bold text-slate-200">
              Curva de Necesidad de Liquidez por Tramos Temporales
            </h3>
          </div>
          <span className="text-xs text-slate-400">
            Total comprometido: <strong className="text-slate-200 font-mono">{formatMoneda(metricas.totalImporte)} €</strong>
          </span>
        </div>

        {/* Barras de distribución de liquidez */}
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3">
          {proyeccionSemanas.map((s) => {
            const pct = metricas.totalImporte > 0 ? (s.importe / metricas.totalImporte) * 100 : 0;
            return (
              <div
                key={s.id}
                className="bg-slate-900/80 border border-slate-800/80 rounded-xl p-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400 mb-1">
                    <span>{s.label}</span>
                    <span className="font-mono text-slate-300">{s.count} fac.</span>
                  </div>
                  <div className="text-base font-bold text-slate-100 font-mono">
                    {formatMoneda(s.importe)} €
                  </div>
                </div>

                {/* Progress Mini Bar */}
                <div className="mt-2.5">
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full ${s.color} transition-all duration-500`}
                      style={{ width: `${Math.min(100, Math.max(pct, s.importe > 0 ? 5 : 0))}%` }}
                    />
                  </div>
                  <div className="text-right text-[10px] text-slate-500 mt-1 font-mono">
                    {pct.toFixed(1)}% del total
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Barra de Filtros, Búsqueda y Ordenación */}
      <div className="bg-[#0d131f] border border-slate-800/80 rounded-2xl p-4 shadow-lg flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-1 flex-wrap items-center gap-2.5">
          {/* Búsqueda */}
          <div className="relative flex-1 min-w-[220px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar proveedor, concepto, nº factura..."
              className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-hidden focus:border-amber-500/60"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 text-xs"
              >
                &times;
              </button>
            )}
          </div>

          {/* Selector de Urgencia */}
          <select
            value={urgenciaFilter}
            onChange={(e) => {
              setUrgenciaFilter(e.target.value as UrgenciaFilter);
              setSelectedDate(null);
            }}
            className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500/60"
          >
            <option value="todas">Todas las pendientes ({facturasPendientes.length})</option>
            <option value="vencidas">🚨 Solo Vencidas ({metricas.countVencidas})</option>
            <option value="7dias">⏳ Próximos 7 días ({metricas.count7Dias})</option>
            <option value="esteMes">📅 Este Mes ({metricas.countMes})</option>
            <option value="altoImporte">💎 Importe &gt; 1.000 €</option>
          </select>

          {/* Selector de Proveedor */}
          {proveedoresConPendientes.length > 0 && (
            <select
              value={proveedorFilter}
              onChange={(e) => setProveedorFilter(e.target.value)}
              className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-hidden focus:border-amber-500/60 max-w-[180px] truncate"
            >
              <option value="todos">Todos los proveedores</option>
              {proveedoresConPendientes.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          )}

          {/* Selector de Orden */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1">
            <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="bg-transparent text-xs text-slate-200 focus:outline-hidden py-1"
            >
              <option value="vencimiento-asc" className="bg-[#0f172a]">Vencimiento (Más urgente primero)</option>
              <option value="vencimiento-desc" className="bg-[#0f172a]">Vencimiento (Más lejano primero)</option>
              <option value="importe-desc" className="bg-[#0f172a]">Mayor Importe (€)</option>
              <option value="importe-asc" className="bg-[#0f172a]">Menor Importe (€)</option>
              <option value="proveedor-asc" className="bg-[#0f172a]">Proveedor (A - Z)</option>
            </select>
          </div>
        </div>

        {/* Resumen de filtro y botón de reseteo si hay filtro activo */}
        {(selectedDate || searchTerm || urgenciaFilter !== 'todas' || proveedorFilter !== 'todos') && (
          <div className="flex items-center gap-2 shrink-0">
            {selectedDate && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-medium">
                Día: {selectedDate}
                <button
                  onClick={() => setSelectedDate(null)}
                  className="hover:text-white ml-1 font-bold"
                >
                  &times;
                </button>
              </span>
            )}
            <button
              onClick={() => {
                setSelectedDate(null);
                setSearchTerm('');
                setUrgenciaFilter('todas');
                setProveedorFilter('todos');
              }}
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Limpiar filtros
            </button>
          </div>
        )}
      </div>

      {/* Contenido Principal: Calendario y/o Cronograma */}
      <div className={`grid gap-6 ${viewMode === 'split' ? 'grid-cols-1 lg:grid-cols-12' : 'grid-cols-1'}`}>
        {/* CALENDARIO INTERACTIVO */}
        {(viewMode === 'split' || viewMode === 'calendar') && (
          <div className={viewMode === 'split' ? 'lg:col-span-6 xl:col-span-7' : 'w-full'}>
            <div className="bg-[#0d131f] border border-slate-800/80 rounded-2xl p-5 shadow-xl">
              {/* Header del Calendario con navegación de mes */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-amber-400" />
                  <h2 className="text-base font-bold text-slate-100 capitalize">
                    {nombreMes}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={handleCurrentMonth}
                    className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors"
                  >
                    Hoy
                  </button>
                  <button
                    onClick={handlePrevMonth}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Mes anterior"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleNextMonth}
                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
                    title="Mes siguiente"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Días de la semana */}
              <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center text-xs font-semibold text-slate-400">
                <span>Lun</span>
                <span>Mar</span>
                <span>Mié</span>
                <span>Jue</span>
                <span>Vie</span>
                <span className="text-slate-500">Sáb</span>
                <span className="text-slate-500">Dom</span>
              </div>

              {/* Matriz del mes */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarGrid.map((cell, idx) => {
                  const hasFacturas = cell.facturas.length > 0;
                  const isSelected = selectedDate === cell.dateStr;

                  return (
                    <div
                      key={idx}
                      onClick={() => {
                        if (hasFacturas) {
                          setSelectedDate(isSelected ? null : cell.dateStr);
                        } else if (cell.isCurrentMonth) {
                          setSelectedDate(isSelected ? null : cell.dateStr);
                        }
                      }}
                      className={`min-h-[74px] sm:min-h-[82px] p-1.5 rounded-xl border flex flex-col justify-between transition-all cursor-pointer relative select-none ${
                        isSelected
                          ? 'border-amber-400 bg-amber-500/15 ring-2 ring-amber-400/30'
                          : cell.isToday
                          ? 'border-amber-500/40 bg-amber-950/20 shadow-inner'
                          : cell.isCurrentMonth
                          ? 'border-slate-800/80 bg-slate-900/50 hover:bg-slate-800/60 hover:border-slate-700'
                          : 'border-slate-900/60 bg-slate-950/30 opacity-40 hover:opacity-70'
                      }`}
                    >
                      {/* Cabecera del día */}
                      <div className="flex items-center justify-between">
                        <span
                          className={`text-xs font-semibold rounded-md px-1 ${
                            cell.isToday
                              ? 'bg-amber-500 text-slate-950 font-black'
                              : cell.isCurrentMonth
                              ? 'text-slate-200'
                              : 'text-slate-500'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {cell.hasVencidas && (
                          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" title="Vencimiento pasado sin pagar" />
                        )}
                      </div>

                      {/* Facturas acumuladas del día */}
                      {hasFacturas && (
                        <div className="mt-1">
                          <div
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold truncate flex items-center justify-between font-mono ${
                              cell.hasVencidas
                                ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                : cell.dateStr === todayStr
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                            }`}
                          >
                            <span>{cell.facturas.length} {cell.facturas.length === 1 ? 'fac' : 'facs'}</span>
                            <span className="hidden sm:inline font-black">{formatMoneda(cell.totalImporte)} €</span>
                          </div>
                          <div className="text-[9px] text-slate-400 sm:hidden font-mono mt-0.5 truncate">
                            {formatMoneda(cell.totalImporte)} €
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Leyenda del Calendario */}
              <div className="mt-4 pt-3 border-t border-slate-800/70 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-400">
                <div className="flex items-center gap-4">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                    Vencidas
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    Vence Hoy / Esta semana
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                    Próximas fechas
                  </span>
                </div>
                <span>Haz clic en un día para filtrar la lista</span>
              </div>
            </div>
          </div>
        )}

        {/* LISTA CRONOLÓGICA / TIMELINE */}
        {(viewMode === 'split' || viewMode === 'list') && (
          <div className={viewMode === 'split' ? 'lg:col-span-6 xl:col-span-5' : 'w-full'}>
            <div className="space-y-4">
              {/* Header de la Lista */}
              <div className="flex items-center justify-between bg-[#0d131f] border border-slate-800/80 rounded-2xl p-4 shadow-lg">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-slate-200">
                    Cronograma de Facturas Pendientes
                  </h3>
                </div>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 font-mono">
                  {facturasFiltradas.length} mostradas
                </span>
              </div>

              {/* Si no hay facturas pendientes en el filtro */}
              {facturasFiltradas.length === 0 ? (
                <div className="bg-[#0d131f] border border-slate-800/80 rounded-2xl p-8 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                    <CheckCircle2 className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-200">
                    ¡No hay facturas pendientes en este criterio!
                  </h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    {selectedDate
                      ? `Para el día ${selectedDate} no existen pagos programados.`
                      : 'Todos los pagos están al corriente o no coinciden con los filtros aplicados.'}
                  </p>
                  {(selectedDate || searchTerm || urgenciaFilter !== 'todas') && (
                    <button
                      onClick={() => {
                        setSelectedDate(null);
                        setSearchTerm('');
                        setUrgenciaFilter('todas');
                        setProveedorFilter('todos');
                      }}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors"
                    >
                      Mostrar todas las pendientes
                    </button>
                  )}
                </div>
              ) : (
                /* Grupos Cronológicos */
                gruposCronologicos.map((grupo) => {
                  const Icon = grupo.icon;
                  const totalGrupo = grupo.facturas.reduce((acc, f) => acc + (Number(f.total) || 0), 0);

                  return (
                    <div
                      key={grupo.id}
                      className="bg-[#0d131f] border border-slate-800/80 rounded-2xl p-4 shadow-lg space-y-3"
                    >
                      {/* Cabecera del Grupo */}
                      <div className="flex items-center justify-between pb-2.5 border-b border-slate-800/70">
                        <div className="flex items-center gap-2">
                          <span className={`p-1.5 rounded-lg border text-xs ${grupo.colorBadge}`}>
                            <Icon className="w-3.5 h-3.5" />
                          </span>
                          <div>
                            <h4 className="text-xs font-bold text-slate-200 tracking-wide">
                              {grupo.titulo}
                            </h4>
                            <p className="text-[10px] text-slate-400 hidden sm:block">
                              {grupo.subtitulo}
                            </p>
                          </div>
                        </div>

                        <div className="text-right">
                          <span className="text-xs font-bold font-mono text-slate-100">
                            {formatMoneda(totalGrupo)} €
                          </span>
                          <span className="block text-[10px] text-slate-500 font-mono">
                            {grupo.facturas.length} {grupo.facturas.length === 1 ? 'factura' : 'facturas'}
                          </span>
                        </div>
                      </div>

                      {/* Tarjetas de Factura */}
                      <div className="space-y-2.5">
                        {grupo.facturas.map((fac) => {
                          const fVenc = getFechaVencimiento(fac);
                          const dias = getDiasDiferencia(fVenc);
                          const isVencida = dias < 0;
                          const isHoy = dias === 0;
                          const enProceso = accionEnCurso === fac.idFactura;
                          const colorCat = obtenerColorCategoria(fac.categoriaGasto);

                          return (
                            <div
                              key={fac.idFactura}
                              className={`p-3 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                                isVencida
                                  ? 'bg-rose-950/15 border-rose-500/30 hover:border-rose-500/60'
                                  : isHoy
                                  ? 'bg-amber-950/15 border-amber-500/30 hover:border-amber-500/60'
                                  : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'
                              }`}
                            >
                              {/* Lado Izquierdo: Fecha e Info del Proveedor */}
                              <div className="flex items-start gap-3 min-w-0">
                                {/* Bloque de Fecha */}
                                <div
                                  className={`w-12 h-12 rounded-xl border flex flex-col items-center justify-center shrink-0 font-mono ${
                                    isVencida
                                      ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                                      : isHoy
                                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                                      : 'bg-slate-800/90 border-slate-700 text-slate-300'
                                  }`}
                                >
                                  <span className="text-sm font-black leading-none">
                                    {fVenc.split('-')[2] || '01'}
                                  </span>
                                  <span className="text-[9px] uppercase font-bold text-slate-400 leading-tight">
                                    {new Date(fVenc).toLocaleDateString('es-ES', { month: 'short' }).replace('.', '')}
                                  </span>
                                </div>

                                {/* Info Proveedor y Concepto */}
                                <div className="min-w-0">
                                  <div className="flex items-center gap-1.5 flex-wrap">
                                    <h5 className="text-xs font-bold text-slate-100 truncate max-w-[190px]">
                                      {fac.nombreProveedor || 'Proveedor sin asignar'}
                                    </h5>
                                    {fac.idFactura && (
                                      <span className="text-[10px] text-slate-500 font-mono">
                                        #{fac.idFactura}
                                      </span>
                                    )}
                                  </div>

                                  <p className="text-[11px] text-slate-400 truncate max-w-[240px] mt-0.5">
                                    {fac.concepto || 'Sin concepto detallado'}
                                  </p>

                                  <div className="flex items-center gap-2 mt-1.5">
                                    {/* Badge de Categoría */}
                                    {fac.categoriaGasto && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium"
                                        style={{
                                          backgroundColor: `${colorCat}20`,
                                          color: colorCat,
                                          borderColor: `${colorCat}40`,
                                        }}
                                      >
                                        <span
                                          className="w-1.5 h-1.5 rounded-full"
                                          style={{ backgroundColor: colorCat }}
                                        />
                                        {fac.categoriaGasto}
                                      </span>
                                    )}

                                    {/* Badge de Vencimiento / Días */}
                                    <span
                                      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded font-mono ${
                                        isVencida
                                          ? 'bg-rose-500/20 text-rose-300'
                                          : isHoy
                                          ? 'bg-amber-500/20 text-amber-300'
                                          : 'bg-slate-800 text-slate-400'
                                      }`}
                                    >
                                      {isVencida
                                        ? `Venció hace ${Math.abs(dias)} ${Math.abs(dias) === 1 ? 'día' : 'días'}`
                                        : isHoy
                                        ? 'Vence hoy'
                                        : `En ${dias} ${dias === 1 ? 'día' : 'días'}`}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Lado Derecho: Importe y Acciones Rápidas */}
                              <div className="flex items-center justify-between sm:justify-end gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800/60">
                                <div className="text-left sm:text-right">
                                  <div className="text-sm font-black text-slate-100 font-mono">
                                    {formatMoneda(fac.total)} €
                                  </div>
                                  <div className="text-[10px] text-slate-500">
                                    Base: {formatMoneda(fac.baseImponible)} €
                                  </div>
                                </div>

                                <div className="flex items-center gap-1.5">
                                  {/* Ver Detalle */}
                                  <button
                                    onClick={() => {
                                      if (onVerFactura) {
                                        onVerFactura(fac);
                                      } else {
                                        setFacturaSeleccionada(fac);
                                      }
                                    }}
                                    className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                                    title="Ver detalle completo de la factura"
                                  >
                                    <Eye className="w-3.5 h-3.5" />
                                  </button>

                                  {/* Botón Acción Rápida: Marcar como Pagada */}
                                  {onActualizarEstadoFactura && (
                                    <button
                                      disabled={enProceso}
                                      onClick={() => handleMarcarPagada(fac)}
                                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                                        enProceso
                                          ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                          : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm shadow-emerald-900/30'
                                      }`}
                                      title="Marcar como pagada en MySQL y liquidar compromiso"
                                    >
                                      <Check className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">Pagar</span>
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* Modal de Detalle de Factura Integrado */}
      {facturaSeleccionada && (
        <FacturaDetalleModal
          factura={facturaSeleccionada}
          onClose={() => setFacturaSeleccionada(null)}
          onActualizarEstado={async (fac, nuevoEstado, fechaPago) => {
            if (onActualizarEstadoFactura) {
              await onActualizarEstadoFactura(fac.idFactura, nuevoEstado, fechaPago);
            }
            setFacturaSeleccionada(null);
          }}
        />
      )}

      {/* Modal para introducir fecha de pago al pasar a Pagada */}
      {facturaParaPago && (
        <ConfirmarPagoModal
          isOpen={Boolean(facturaParaPago)}
          factura={facturaParaPago}
          onClose={() => setFacturaParaPago(null)}
          onConfirmar={handleConfirmarPago}
        />
      )}
    </div>
  );
};
