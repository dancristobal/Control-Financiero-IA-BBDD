import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  Factura,
  TrimestreFiscal,
  PeriodoFiscalModelo,
  DatosAdicionalesFiscalesAnio,
  DatosAdicionalesTrimestre,
  ResultadoModelo303,
  ResultadoModelo390,
  ResultadoModelo130,
  ResultadoModelo111,
  ResultadoModelo347,
  ResultadoModelo349,
  ParticularidadModelo
} from '../types';
import {
  obtenerDatosAdicionalesFiscales,
  guardarDatosAdicionalesFiscales,
  calcularModelo303,
  calcularModelo390,
  calcularModelo130,
  calcularModelo111,
  calcularModelo347,
  calcularModelo349
} from '../utils/modelosFiscales';
import {
  FileText,
  AlertTriangle,
  CheckCircle2,
  Info,
  Calendar,
  DollarSign,
  Building,
  Globe2,
  Users,
  Download,
  Save,
  HelpCircle,
  TrendingUp,
  Percent,
  ChevronRight,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';

export type ModeloFiscalTab = '303' | '390' | '130' | '111' | '347' | '349';

interface ModelosFiscalesViewProps {
  facturas: Factura[];
  anioInicial?: number;
  trimestreInicial?: TrimestreFiscal;
  onOpenConfiguracion?: () => void;
}

export const ModelosFiscalesView: React.FC<ModelosFiscalesViewProps> = ({
  facturas,
  anioInicial = 2026,
  trimestreInicial = 'T1',
  onOpenConfiguracion,
}) => {
  const [modeloActivo, setModeloActivo] = useState<ModeloFiscalTab>('303');
  const [trimestre, setTrimestre] = useState<TrimestreFiscal>(trimestreInicial);
  const [anio, setAnio] = useState<number>(anioInicial);

  // Datos complementarios de ingresos y nóminas
  const [datosAdicionales, setDatosAdicionales] = useState<DatosAdicionalesFiscalesAnio>(() =>
    obtenerDatosAdicionalesFiscales(anio)
  );
  const [mostrarEditorIngresos, setMostrarEditorIngresos] = useState<boolean>(false);
  const [guardadoExitoso, setGuardadoExitoso] = useState<boolean>(false);

  // Recargar datos si cambia el año
  useEffect(() => {
    setDatosAdicionales(obtenerDatosAdicionalesFiscales(anio));
  }, [anio]);

  // Actualizar un campo del trimestre actual
  const handleUpdateCampoTrimestre = (
    trim: TrimestreFiscal,
    campo: keyof DatosAdicionalesTrimestre,
    valor: number
  ) => {
    setDatosAdicionales((prev) => {
      const nuevo = {
        ...prev,
        [trim]: {
          ...prev[trim],
          [campo]: valor,
        },
      };
      return nuevo;
    });
  };

  const handleGuardarDatos = () => {
    guardarDatosAdicionalesFiscales(datosAdicionales, anio);

    // ⚡ Persistir liquidación del modelo fiscal activo en MySQL (declaraciones_aeat)
    try {
      fetch('/api/aeat/declaraciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          declaracion: {
            id: `mod${modeloActivo}-${anio}-${trimestre}`,
            modelo: modeloActivo,
            ejercicio: anio,
            periodo: modeloActivo === '390' || modeloActivo === '347' ? 'Anual' : trimestre,
            estado: 'Calculado',
            resultadoDeclaracion:
              modeloActivo === '303'
                ? mod303.resultadoFinal
                : modeloActivo === '130'
                ? mod130.totalAIngresar
                : modeloActivo === '111'
                ? mod111.totalRetencionesAIngresar
                : 0,
            datosCasillas:
              modeloActivo === '303'
                ? mod303
                : modeloActivo === '130'
                ? mod130
                : modeloActivo === '111'
                ? mod111
                : undefined,
          },
        }),
      }).catch((e) => console.warn('Aviso al guardar declaración AEAT en MySQL:', e));
    } catch {}

    setGuardadoExitoso(true);
    setTimeout(() => setGuardadoExitoso(false), 2500);
  };

  // Cálculos en tiempo real
  const mod303 = useMemo<ResultadoModelo303>(() => {
    return calcularModelo303({ facturas, trimestre, anio, datosAdicionales });
  }, [facturas, trimestre, anio, datosAdicionales]);

  const mod390 = useMemo<ResultadoModelo390>(() => {
    return calcularModelo390({ facturas, anio, datosAdicionales });
  }, [facturas, anio, datosAdicionales]);

  const mod130 = useMemo<ResultadoModelo130>(() => {
    return calcularModelo130({ facturas, trimestre, anio, datosAdicionales });
  }, [facturas, trimestre, anio, datosAdicionales]);

  const mod111 = useMemo<ResultadoModelo111>(() => {
    return calcularModelo111({ facturas, trimestre, anio, datosAdicionales });
  }, [facturas, trimestre, anio, datosAdicionales]);

  const mod347 = useMemo<ResultadoModelo347>(() => {
    return calcularModelo347({ facturas, anio });
  }, [facturas, anio]);

  const mod349 = useMemo<ResultadoModelo349>(() => {
    return calcularModelo349({ facturas, periodo: trimestre, anio });
  }, [facturas, trimestre, anio]);

  const editorRef = useRef<HTMLDivElement>(null);

  const handleResolverAhora = (itemId?: string) => {
    setMostrarEditorIngresos(true);
    setTimeout(() => {
      if (editorRef.current) {
        editorRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        // Resaltar o dar foco al input relevante
        let targetInputId = 'input-ingresos-21';
        if (itemId?.includes('nominas')) {
          targetInputId = 'input-num-empleados';
        } else if (itemId?.includes('130')) {
          targetInputId = 'input-retenciones-ventas';
        }
        const el = document.getElementById(targetInputId) as HTMLInputElement | null;
        if (el) {
          el.focus();
          el.select?.();
        }
      }
    }, 100);
  };

  // Función para renderizar la lista de particularidades y requisitos
  const renderParticularidades = (items: ParticularidadModelo[]) => (
    <div className="space-y-2.5">
      <div className="flex items-center gap-2 mb-1">
        <ShieldAlert className="w-4 h-4 text-amber-400" />
        <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
          Particularidades y Requisitos Pendientes para su Resolución
        </h4>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((item) => {
          let badgeColor = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
          let borderCard = 'border-slate-800 bg-[#0f172a]/70';
          let icon = <Info className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />;

          if (item.tipo === 'completado') {
            badgeColor = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
            borderCard = 'border-emerald-900/50 bg-[#061510]/60';
            icon = <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />;
          } else if (item.tipo === 'pendiente') {
            badgeColor = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
            borderCard = 'border-amber-900/50 bg-[#191409]/60';
            icon = <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />;
          } else if (item.tipo === 'advertencia') {
            badgeColor = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
            borderCard = 'border-purple-900/50 bg-[#160d21]/60';
            icon = <HelpCircle className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />;
          }

          return (
            <div key={item.id} className={`p-3.5 rounded-xl border ${borderCard} flex flex-col justify-between space-y-2`}>
              <div className="space-y-1.5">
                <div className="flex items-start gap-2">
                  {icon}
                  <span className="text-xs font-semibold text-slate-200 leading-snug">
                    {item.titulo}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed pl-5.5">
                  {item.descripcion}
                </p>
              </div>
              {item.accionRequerida && (
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
                  <span className="text-[10px] text-amber-400 font-medium">Acción recomendada:</span>
                  <button
                    onClick={() => handleResolverAhora(item.id)}
                    className="text-[10px] font-bold text-amber-300 hover:text-amber-200 underline flex items-center gap-1 cursor-pointer transition-colors"
                    title="Abre el panel de datos complementarios para rellenar esta información"
                  >
                    Resolver ahora <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header con Selección de Modelo y Selector de Periodo */}
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-[#0d1527] via-[#0b1320] to-[#0d1a24] border border-slate-800 shadow-xl">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-mono font-bold tracking-wider">
                AEAT OFICIAL
              </span>
              <h2 className="text-lg sm:text-xl font-black text-slate-100 tracking-tight">
                Generador y Control de Modelos Fiscales
              </h2>
            </div>
            <p className="text-xs text-slate-400 mt-1 max-w-2xl">
              Cálculo automático de liquidaciones a partir de tus facturas conciliadas, segregación por casillas oficiales y advertencias de requisitos pendientes.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Selector de Trimestre */}
            {modeloActivo !== '390' && modeloActivo !== '347' && (
              <div className="flex items-center bg-[#070b13] p-1 rounded-xl border border-slate-800">
                {(['T1', 'T2', 'T3', 'T4'] as TrimestreFiscal[]).map((t) => (
                  <button
                    key={t}
                    onClick={() => setTrimestre(t)}
                    className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer ${
                      trimestre === t
                        ? 'bg-rose-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
            )}

            {/* Selector de Año */}
            <div className="flex items-center bg-[#070b13] px-2.5 py-1.5 rounded-xl border border-slate-800 text-xs font-mono text-slate-300">
              <Calendar className="w-3.5 h-3.5 text-rose-400 mr-1.5" />
              <span>{anio}</span>
            </div>

            {/* Botón para abrir inputs complementarios */}
            <button
              onClick={() => setMostrarEditorIngresos(!mostrarEditorIngresos)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer border ${
                mostrarEditorIngresos
                  ? 'bg-slate-800 text-slate-200 border-slate-700'
                  : 'bg-emerald-600/20 text-emerald-300 border-emerald-500/40 hover:bg-emerald-600/30'
              }`}
            >
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              <span>{mostrarEditorIngresos ? 'Ocultar Datos Ventas/Nóminas' : 'Datos Complementarios (Ventas/Nóminas)'}</span>
            </button>
          </div>
        </div>

        {/* Pestañas de Modelos Oficiales */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 mt-4 border-t border-slate-800/80 no-scrollbar">
          {[
            { id: '303', nombre: 'Modelo 303', subtitulo: 'IVA Trimestral', icono: Percent },
            { id: '390', nombre: 'Modelo 390', subtitulo: 'Resumen Anual IVA', icono: FileText },
            { id: '130', nombre: 'Modelo 130', subtitulo: 'IRPF Fraccionado', icono: TrendingUp },
            { id: '111', nombre: 'Modelo 111', subtitulo: 'Retenciones IRPF', icono: Users },
            { id: '347', nombre: 'Modelo 347', subtitulo: 'Terceros > 3.005 €', icono: Building },
            { id: '349', nombre: 'Modelo 349', subtitulo: 'Intracomunitarias UE', icono: Globe2 },
          ].map((m) => {
            const Icon = m.icono;
            const esActivo = modeloActivo === m.id;
            return (
              <button
                key={m.id}
                onClick={() => setModeloActivo(m.id as ModeloFiscalTab)}
                className={`px-3.5 py-2 rounded-xl text-left transition-all shrink-0 flex items-center gap-2.5 cursor-pointer border ${
                  esActivo
                    ? 'bg-gradient-to-r from-rose-600/30 to-rose-700/20 text-rose-300 border-rose-500/60 shadow-md'
                    : 'bg-[#09101c]/80 text-slate-400 hover:text-slate-200 border-slate-800/80 hover:border-slate-700'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${esActivo ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-400'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="text-xs font-bold leading-tight flex items-center gap-1.5">
                    <span>{m.nombre}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 leading-tight">
                    {m.subtitulo}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Editor Desplegable de Datos Complementarios (Ingresos de Ventas, Retenciones Previas y Nóminas) */}
      {mostrarEditorIngresos && (
        <div
          ref={editorRef}
          className="p-5 rounded-2xl bg-[#0a1220] border border-emerald-600/40 shadow-xl space-y-4 animate-in fade-in duration-200 scroll-mt-6"
        >
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div>
              <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Datos Complementarios del Ejercicio {anio} ({trimestre})
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Introduce tus ingresos brutos facturados y datos de nóminas para calcular con total exactitud los Modelos 303, 130 y 111.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {guardadoExitoso && (
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Guardado correctamente
                </span>
              )}
              <button
                onClick={handleGuardarDatos}
                className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" /> Guardar Cambios
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Ventas e Ingresos Devengados */}
            <div className="p-3.5 rounded-xl bg-[#070d17] border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Ventas del Trimestre ({trimestre})
              </span>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Base imponible al 21% (€)</label>
                <input
                  id="input-ingresos-21"
                  type="number"
                  step="0.01"
                  value={datosAdicionales[trimestre].ingresosBase21 || ''}
                  onChange={(e) => handleUpdateCampoTrimestre(trimestre, 'ingresosBase21', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-[#0b1424] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Base imponible al 10% (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={datosAdicionales[trimestre].ingresosBase10 || ''}
                  onChange={(e) => handleUpdateCampoTrimestre(trimestre, 'ingresosBase10', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-[#0b1424] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Base imponible al 4% (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={datosAdicionales[trimestre].ingresosBase4 || ''}
                  onChange={(e) => handleUpdateCampoTrimestre(trimestre, 'ingresosBase4', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-[#0b1424] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>

            {/* Pagos Previos y Retenciones Soportadas en Ventas (Mod. 130) */}
            <div className="p-3.5 rounded-xl bg-[#070d17] border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Ajustes Modelo 130 (IRPF)
              </span>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Retenciones IRPF soportadas en ventas (€)</label>
                <input
                  id="input-retenciones-ventas"
                  type="number"
                  step="0.01"
                  value={datosAdicionales[trimestre].retencionesVentasSoportadas || ''}
                  onChange={(e) => handleUpdateCampoTrimestre(trimestre, 'retencionesVentasSoportadas', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-[#0b1424] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-emerald-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400">Retenciones practicadas por tus clientes (Casilla 05)</span>
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Pagos fraccionados trimestres anteriores (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={datosAdicionales[trimestre].pagosFraccionadosPrevios130 || ''}
                  onChange={(e) => handleUpdateCampoTrimestre(trimestre, 'pagosFraccionadosPrevios130', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-[#0b1424] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-emerald-500 focus:outline-hidden"
                />
                <span className="text-[10px] text-slate-400">Importes ya ingresados en el Mod. 130 durante {anio}</span>
              </div>
            </div>

            {/* Nóminas y Empleados (Mod. 111) */}
            <div className="p-3.5 rounded-xl bg-[#070d17] border border-slate-800 space-y-3">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider block">
                Nóminas de Empleados (Mod. 111)
              </span>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Número de empleados con nómina</label>
                <input
                  id="input-num-empleados"
                  type="number"
                  step="1"
                  value={datosAdicionales[trimestre].numTrabajadoresNominas || ''}
                  onChange={(e) => handleUpdateCampoTrimestre(trimestre, 'numTrabajadoresNominas', parseInt(e.target.value, 10) || 0)}
                  placeholder="0"
                  className="w-full bg-[#0b1424] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Total percepciones brutas salariales (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={datosAdicionales[trimestre].baseNominasTrabajadores || ''}
                  onChange={(e) => handleUpdateCampoTrimestre(trimestre, 'baseNominasTrabajadores', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-[#0b1424] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Retenciones IRPF practicadas en nóminas (€)</label>
                <input
                  type="number"
                  step="0.01"
                  value={datosAdicionales[trimestre].retencionesNominasTrabajadores || ''}
                  onChange={(e) => handleUpdateCampoTrimestre(trimestre, 'retencionesNominasTrabajadores', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-[#0b1424] border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-100 font-mono focus:border-emerald-500 focus:outline-hidden"
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          VISTA MODELO 303 (IVA TRIMESTRAL)
          ========================================================================= */}
      {modeloActivo === '303' && (
        <div className="space-y-5">
          {/* Tarjeta de Resumen Ejecutivo y Casilla 46 */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                IVA Devengado (Ventas)
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {mod303.totalCuotaDevengada.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
              <div className="text-[11px] text-slate-400">
                Casilla 27 AEAT (Suma de cuotas repercutidas)
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                IVA Deducible (Facturas Compras)
              </span>
              <div className="text-2xl font-black font-mono text-cyan-400">
                {mod303.totalCuotaDeducible.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
              <div className="text-[11px] text-slate-400">
                Casilla 45 AEAT ({mod303.numFacturasGastos} facturas procesadas)
              </div>
            </div>

            <div className={`p-4 rounded-2xl border space-y-1 ${
              mod303.estadoResultado === 'A_INGRESAR'
                ? 'bg-gradient-to-br from-rose-950/40 to-[#0e1626] border-rose-500/40'
                : mod303.estadoResultado === 'A_COMPENSAR'
                ? 'bg-gradient-to-br from-blue-950/40 to-[#0e1626] border-blue-500/40'
                : 'bg-[#0f172a] border-slate-800'
            }`}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Resultado Liquidación (Casilla 46)
                </span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                  mod303.estadoResultado === 'A_INGRESAR'
                    ? 'bg-rose-500/20 text-rose-300'
                    : mod303.estadoResultado === 'A_COMPENSAR'
                    ? 'bg-blue-500/20 text-blue-300'
                    : 'bg-slate-700 text-slate-300'
                }`}>
                  {mod303.estadoResultado === 'A_INGRESAR' ? 'A INGRESAR' : mod303.estadoResultado === 'A_COMPENSAR' ? 'A COMPENSAR' : 'CERO'}
                </span>
              </div>
              <div className={`text-2xl font-black font-mono ${
                mod303.resultadoFinal > 0 ? 'text-rose-400' : mod303.resultadoFinal < 0 ? 'text-blue-400' : 'text-slate-300'
              }`}>
                {mod303.resultadoFinal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">
                {mod303.resultadoFinal > 0
                  ? 'Importe a abonar en cuenta a la Agencia Tributaria'
                  : mod303.resultadoFinal < 0
                  ? 'Saldo acumulable para compensar en los siguientes trimestres'
                  : 'Sin cuota diferencial a liquidar'}
              </p>
            </div>
          </div>

          {/* Tabla Desglosada con Casillas Oficiales AEAT */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#0d1424]">
            <div className="p-4 bg-[#0a101d] border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                <Percent className="w-4 h-4 text-rose-400" />
                Desglose Oficial de Casillas AEAT - Modelo 303 ({trimestre} {anio})
              </h3>
              <span className="text-[11px] text-slate-400">Estructura oficial Formulario AEAT</span>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 divide-y lg:divide-y-0 lg:divide-x divide-slate-800">
              {/* Bloque IVA Devengado */}
              <div className="p-4 space-y-3">
                <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider pb-2 border-b border-slate-800">
                  I. IVA Devengado (Régimen General)
                </div>
                <table className="w-full text-xs">
                  <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-800/80">
                    <tr>
                      <th className="py-1 text-left">Concepto</th>
                      <th className="py-1 text-center font-mono">Casilla</th>
                      <th className="py-1 text-right font-mono">Base Imponible</th>
                      <th className="py-1 text-right font-mono">Cuota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    <tr>
                      <td className="py-2 text-slate-300">Régimen General al 21%</td>
                      <td className="py-2 text-center text-slate-400">[01-03]</td>
                      <td className="py-2 text-right text-slate-200">{mod303.baseDevengado21.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      <td className="py-2 text-right text-emerald-300 font-bold">{mod303.cuotaDevengado21.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-300">Régimen General al 10%</td>
                      <td className="py-2 text-center text-slate-400">[04-06]</td>
                      <td className="py-2 text-right text-slate-200">{mod303.baseDevengado10.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      <td className="py-2 text-right text-emerald-300 font-bold">{mod303.cuotaDevengado10.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-300">Régimen General al 4%</td>
                      <td className="py-2 text-center text-slate-400">[07-09]</td>
                      <td className="py-2 text-right text-slate-200">{mod303.baseDevengado4.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      <td className="py-2 text-right text-emerald-300 font-bold">{mod303.cuotaDevengado4.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    </tr>
                    <tr className="bg-emerald-950/20 font-bold">
                      <td className="py-2.5 text-emerald-300">Total Cuota Devengada</td>
                      <td className="py-2.5 text-center text-emerald-400">[27]</td>
                      <td className="py-2.5 text-right text-slate-300">{(mod303.baseDevengado21 + mod303.baseDevengado10 + mod303.baseDevengado4).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      <td className="py-2.5 text-right text-emerald-300">{mod303.totalCuotaDevengada.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Bloque IVA Deducible */}
              <div className="p-4 space-y-3">
                <div className="text-xs font-bold text-cyan-400 uppercase tracking-wider pb-2 border-b border-slate-800">
                  II. IVA Deducible (Facturas Soportadas)
                </div>
                <table className="w-full text-xs">
                  <thead className="text-[10px] text-slate-400 uppercase border-b border-slate-800/80">
                    <tr>
                      <th className="py-1 text-left">Concepto</th>
                      <th className="py-1 text-center font-mono">Casilla</th>
                      <th className="py-1 text-right font-mono">Base Deducible</th>
                      <th className="py-1 text-right font-mono">Cuota Deducible</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    <tr>
                      <td className="py-2 text-slate-300">Operaciones Interiores Corrientes</td>
                      <td className="py-2 text-center text-slate-400">[28-29]</td>
                      <td className="py-2 text-right text-slate-200">{mod303.baseDeducibleCorriente.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      <td className="py-2 text-right text-cyan-300 font-bold">{mod303.cuotaDeducibleCorriente.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    </tr>
                    <tr>
                      <td className="py-2 text-slate-300">Bienes de Inversión / Activos</td>
                      <td className="py-2 text-center text-slate-400">[30-31]</td>
                      <td className="py-2 text-right text-slate-200">{mod303.baseDeducibleBienesInversion.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      <td className="py-2 text-right text-cyan-300 font-bold">{mod303.cuotaDeducibleBienesInversion.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    </tr>
                    <tr className="bg-cyan-950/20 font-bold">
                      <td className="py-2.5 text-cyan-300">Total Cuotas Deducibles</td>
                      <td className="py-2.5 text-center text-cyan-400">[45]</td>
                      <td className="py-2.5 text-right text-slate-300">{(mod303.baseDeducibleCorriente + mod303.baseDeducibleBienesInversion).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      <td className="py-2.5 text-right text-cyan-300">{mod303.totalCuotaDeducible.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Particularidades y Requisitos */}
          {renderParticularidades(mod303.particularidades)}
        </div>
      )}

      {/* =========================================================================
          VISTA MODELO 390 (RESUMEN ANUAL IVA)
          ========================================================================= */}
      {modeloActivo === '390' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Volumen Total Operaciones (108)
              </span>
              <div className="text-xl font-bold font-mono text-slate-100">
                {mod390.volumenOperaciones.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Total facturado en el ejercicio {anio}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
                Total IVA Repercutido
              </span>
              <div className="text-xl font-bold font-mono text-emerald-300">
                {mod390.totalIvaRepercutido.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Suma T1 + T2 + T3 + T4</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-cyan-400 uppercase tracking-wider">
                Total IVA Soportado
              </span>
              <div className="text-xl font-bold font-mono text-cyan-300">
                {mod390.totalIvaSoportado.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Compras registradas en {anio}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                Saldo Anual Acumulado
              </span>
              <div className={`text-xl font-bold font-mono ${
                mod390.resultadoAnualLiquidacion > 0 ? 'text-rose-400' : 'text-blue-400'
              }`}>
                {mod390.resultadoAnualLiquidacion.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Diferencia anual neta</p>
            </div>
          </div>

          {/* Tabla de Conciliación Trimestral */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#0d1424]">
            <div className="p-4 bg-[#0a101d] border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Conciliación Trimestral de Modelos 303 en el Resumen Anual 390 ({anio})
              </h3>
            </div>
            <table className="w-full text-xs font-mono">
              <thead className="bg-[#070c16] text-[10px] uppercase text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="p-3 text-left">Trimestre</th>
                  <th className="p-3 text-right">IVA Repercutido (Ventas)</th>
                  <th className="p-3 text-right">IVA Soportado (Compras)</th>
                  <th className="p-3 text-right">Resultado 303</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {mod390.desgloseTrimestral.map((d) => (
                  <tr key={d.trimestre} className="hover:bg-slate-800/30">
                    <td className="p-3 font-bold text-slate-200">{d.trimestre} {anio}</td>
                    <td className="p-3 text-right text-emerald-300">{d.ivaRepercutido.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    <td className="p-3 text-right text-cyan-300">{d.ivaSoportado.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                    <td className={`p-3 text-right font-bold ${d.saldo > 0 ? 'text-rose-400' : 'text-blue-400'}`}>
                      {d.saldo.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-[#070b14] border-t border-slate-800 font-bold">
                <tr>
                  <td className="p-3 text-slate-200">TOTAL ANUAL EJERCICIO</td>
                  <td className="p-3 text-right text-emerald-300">{mod390.totalIvaRepercutido.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                  <td className="p-3 text-right text-cyan-300">{mod390.totalIvaSoportado.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                  <td className="p-3 text-right text-rose-400">{mod390.resultadoAnualLiquidacion.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {renderParticularidades(mod390.particularidades)}
        </div>
      )}

      {/* =========================================================================
          VISTA MODELO 130 (PAGO FRACCIONADO IRPF ESTIMACIÓN DIRECTA)
          ========================================================================= */}
      {modeloActivo === '130' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Ingresos Computables (Casilla 01)
              </span>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {mod130.ingresosComputablesAcumulados.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Acumulado desde 1 de enero</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Gastos Deducibles (Casilla 02)
              </span>
              <div className="text-xl font-bold font-mono text-cyan-400">
                {mod130.gastosDeduciblesAcumulados.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Bases imponibles acumuladas</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Rendimiento Neto (Casilla 03)
              </span>
              <div className={`text-xl font-bold font-mono ${
                mod130.rendimientoNeto >= 0 ? 'text-amber-400' : 'text-rose-400'
              }`}>
                {mod130.rendimientoNeto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Beneficio (Casilla 01 - 02)</p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-rose-950/40 to-[#0e1626] border border-rose-500/40 space-y-1">
              <span className="text-[11px] font-bold text-rose-300 uppercase tracking-wider">
                Total a Ingresar (Casilla 07/19)
              </span>
              <div className="text-2xl font-black font-mono text-rose-400">
                {mod130.totalAIngresar.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">20% neto menos retenciones y pagos previos</p>
            </div>
          </div>

          {/* Detalle de Casillas Modelo 130 */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#0d1424]">
            <div className="p-4 bg-[#0a101d] border-b border-slate-800">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Liquidación del Pago Fraccionado IRPF - Modelo 130 ({trimestre} {anio})
              </h3>
            </div>
            <table className="w-full text-xs font-mono">
              <tbody className="divide-y divide-slate-800/70">
                <tr className="hover:bg-slate-800/20">
                  <td className="p-3 text-slate-400 w-24">[01]</td>
                  <td className="p-3 text-slate-200">Ingresos computables acumulados del ejercicio</td>
                  <td className="p-3 text-right text-emerald-300 font-bold">{mod130.ingresosComputablesAcumulados.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="p-3 text-slate-400">[02]</td>
                  <td className="p-3 text-slate-200">Gastos fiscalmente deducibles acumulados del ejercicio (Facturas)</td>
                  <td className="p-3 text-right text-cyan-300 font-bold">{mod130.gastosDeduciblesAcumulados.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                </tr>
                <tr className="hover:bg-slate-800/20 bg-slate-900/40 font-bold">
                  <td className="p-3 text-slate-400">[03]</td>
                  <td className="p-3 text-slate-100">Rendimiento neto (Casilla 01 - Casilla 02)</td>
                  <td className="p-3 text-right text-amber-300">{mod130.rendimientoNeto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="p-3 text-slate-400">[04]</td>
                  <td className="p-3 text-slate-200">20% del rendimiento neto (si es positivo)</td>
                  <td className="p-3 text-right text-slate-200">{mod130.pagoFraccionado20Pct.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="p-3 text-slate-400">[05]</td>
                  <td className="p-3 text-slate-200">A deducir: Retenciones e ingresos a cuenta soportados en facturas de venta</td>
                  <td className="p-3 text-right text-emerald-400">-{mod130.retencionesSoportadasAcumuladas.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                </tr>
                <tr className="hover:bg-slate-800/20">
                  <td className="p-3 text-slate-400">[06]</td>
                  <td className="p-3 text-slate-200">A deducir: Pagos fraccionados ingresados en los trimestres anteriores</td>
                  <td className="p-3 text-right text-cyan-400">-{mod130.pagosFraccionadosPrevios.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                </tr>
                <tr className="bg-rose-950/20 border-t-2 border-rose-500/40 font-bold text-sm">
                  <td className="p-3.5 text-rose-400">[07 / 19]</td>
                  <td className="p-3.5 text-slate-100">RESULTADO DE LA DECLARACIÓN (A ingresar)</td>
                  <td className="p-3.5 text-right text-rose-300">{mod130.totalAIngresar.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                </tr>
              </tbody>
            </table>
          </div>

          {renderParticularidades(mod130.particularidades)}
        </div>
      )}

      {/* =========================================================================
          VISTA MODELO 111 (RETENCIONES IRPF: PROFESIONALES, AUTÓNOMOS Y NÓMINAS)
          ========================================================================= */}
      {modeloActivo === '111' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Rendimientos del Trabajo
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                  {mod111.trabajoNumPerceptores} empleados
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-emerald-400">
                {mod111.trabajoImporteRetenciones.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Retenciones practicadas en nóminas (Casilla 03)</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Actividades Profesionales
                </span>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                  {mod111.actividadesNumPerceptores} profesionales
                </span>
              </div>
              <div className="text-xl font-bold font-mono text-cyan-400">
                {mod111.actividadesImporteRetenciones.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Retenciones facturas (15%, 7%) (Casilla 09)</p>
            </div>

            <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/40 to-[#0e1626] border border-emerald-500/40 space-y-1">
              <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wider">
                Total IRPF a Ingresar (Casilla 28)
              </span>
              <div className="text-2xl font-black font-mono text-emerald-300">
                {mod111.totalRetencionesAIngresar.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Importe a liquidar en la AEAT ({trimestre} {anio})</p>
            </div>
          </div>

          {/* Tabla de Perceptores Conciliados */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#0d1424]">
            <div className="p-4 bg-[#0a101d] border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Libro Registro de Perceptores con Retención ({mod111.perceptoresDetalle.length})
              </h3>
              <span className="text-[11px] text-slate-400">Datos listos para exportar a la AEAT</span>
            </div>
            {mod111.perceptoresDetalle.length > 0 ? (
              <table className="w-full text-xs">
                <thead className="bg-[#070c16] text-[10px] uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 text-left">Perceptor</th>
                    <th className="p-3 text-left font-mono">NIF / CIF</th>
                    <th className="p-3 text-left">Subclave</th>
                    <th className="p-3 text-right font-mono">Base Percepción</th>
                    <th className="p-3 text-center font-mono">% Retención</th>
                    <th className="p-3 text-right font-mono">Retención AEAT</th>
                    <th className="p-3 text-center font-mono">Facturas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono">
                  {mod111.perceptoresDetalle.map((p, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="p-3 text-slate-200 font-sans font-semibold">{p.nombre}</td>
                      <td className="p-3 text-slate-400">{p.nif}</td>
                      <td className="p-3">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-sans">
                          {p.subclave}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-200">{p.base.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      <td className="p-3 text-center text-emerald-400 font-bold">{p.tipoPct}%</td>
                      <td className="p-3 text-right text-emerald-300 font-bold">{p.retencion.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      <td className="p-3 text-center text-slate-400">{p.numFacturas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No hay facturas con retención de IRPF profesional registradas en {trimestre} {anio}.
              </div>
            )}
          </div>

          {renderParticularidades(mod111.particularidades)}
        </div>
      )}

      {/* =========================================================================
          VISTA MODELO 347 (OPERACIONES CON TERCEROS > 3.005,06 €)
          ========================================================================= */}
      {modeloActivo === '347' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Proveedores a Declarar
              </span>
              <div className="text-2xl font-black font-mono text-rose-400">
                {mod347.numDeclarados}
              </div>
              <p className="text-[11px] text-slate-400">Superan 3.005,06 € en {anio}</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Volumen Total Declarable
              </span>
              <div className="text-2xl font-black font-mono text-cyan-400">
                {mod347.totalVolumenDeclarado.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Total con IVA incluido</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Revisión de NIF / CIF
              </span>
              <div className={`text-2xl font-black font-mono ${
                mod347.tercerosEnRevisionCif > 0 ? 'text-amber-400' : 'text-emerald-400'
              }`}>
                {mod347.tercerosEnRevisionCif === 0 ? '100% Válidos' : `${mod347.tercerosEnRevisionCif} Pendientes`}
              </div>
              <p className="text-[11px] text-slate-400">
                {mod347.tercerosEnRevisionCif > 0 ? 'Falta NIF en algún registro' : 'Identificaciones completas'}
              </p>
            </div>
          </div>

          {/* Tabla de Terceros del Modelo 347 con desglose trimestral */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#0d1424]">
            <div className="p-4 bg-[#0a101d] border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                  Listado de Terceros a Declarar en el Modelo 347 ({anio})
                </h3>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Desglose trimestral oficial requerido para la presentación informativa
                </p>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 font-mono">
                Umbral: {mod347.umbralMinimo.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </span>
            </div>
            {mod347.declarados.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead className="bg-[#070c16] text-[10px] uppercase text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-3 text-left">Tercero / Proveedor</th>
                      <th className="p-3 text-left">NIF / CIF</th>
                      <th className="p-3 text-right">T1</th>
                      <th className="p-3 text-right">T2</th>
                      <th className="p-3 text-right">T3</th>
                      <th className="p-3 text-right">T4</th>
                      <th className="p-3 text-right">Total Anual</th>
                      <th className="p-3 text-center">Estado NIF</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {mod347.declarados.map((d, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-3 text-slate-200 font-sans font-semibold">{d.nombre}</td>
                        <td className="p-3 text-slate-300">{d.nif}</td>
                        <td className="p-3 text-right text-slate-400">{d.t1.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                        <td className="p-3 text-right text-slate-400">{d.t2.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                        <td className="p-3 text-right text-slate-400">{d.t3.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                        <td className="p-3 text-right text-slate-400">{d.t4.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                        <td className="p-3 text-right text-rose-300 font-bold">{d.totalAnual.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                        <td className="p-3 text-center">
                          {d.tieneCifValido ? (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-sans font-bold">
                              Válido
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded text-[10px] bg-amber-500/20 text-amber-300 font-sans font-bold">
                              Revisar
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                Ningún proveedor supera el umbral de 3.005,06 € en el ejercicio {anio}.
              </div>
            )}
          </div>

          {renderParticularidades(mod347.particularidades)}
        </div>
      )}

      {/* =========================================================================
          VISTA MODELO 349 (OPERACIONES INTRACOMUNITARIAS UE)
          ========================================================================= */}
      {modeloActivo === '349' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Operadores Comunitarios
              </span>
              <div className="text-2xl font-black font-mono text-cyan-400">
                {mod349.numOperadoresUE}
              </div>
              <p className="text-[11px] text-slate-400">Proveedores de la Unión Europea identificados</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Adquisiciones Servicios (Clave I)
              </span>
              <div className="text-2xl font-black font-mono text-emerald-400">
                {mod349.totalAdquisicionesServiciosI.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Software, cloud y servicios digitales</p>
            </div>

            <div className="p-4 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-1">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Total Operaciones Intracomunitarias
              </span>
              <div className="text-2xl font-black font-mono text-rose-400">
                {mod349.totalOperacionesIntracomunitarias.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
              </div>
              <p className="text-[11px] text-slate-400">Base exenta sin IVA por inversión del sujeto pasivo</p>
            </div>
          </div>

          {/* Tabla de Operaciones Intracomunitarias */}
          <div className="rounded-2xl border border-slate-800 overflow-hidden bg-[#0d1424]">
            <div className="p-4 bg-[#0a101d] border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Operaciones Intracomunitarias Declarables ({trimestre} {anio})
              </h3>
              <span className="text-[11px] text-slate-400">Claves oficiales: Clave I (Servicios) / Clave A (Bienes)</span>
            </div>
            {mod349.operaciones.length > 0 ? (
              <table className="w-full text-xs font-mono">
                <thead className="bg-[#070c16] text-[10px] uppercase text-slate-400 border-b border-slate-800">
                  <tr>
                    <th className="p-3 text-left">Operador Comunitario</th>
                    <th className="p-3 text-center">País</th>
                    <th className="p-3 text-left">NIF-IVA Comunitario (VIES)</th>
                    <th className="p-3 text-center">Clave</th>
                    <th className="p-3 text-right">Base Imponible</th>
                    <th className="p-3 text-center">Facturas</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {mod349.operaciones.map((op, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/30">
                      <td className="p-3 text-slate-200 font-sans font-semibold">{op.nombre}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 font-bold">
                          {op.paisCodigo}
                        </span>
                      </td>
                      <td className="p-3 text-cyan-300 font-bold">{op.nifIvaUE}</td>
                      <td className="p-3 text-center">
                        <span className="px-2 py-0.5 rounded text-[10px] bg-emerald-500/20 text-emerald-300 font-bold">
                          {op.claveOperacion}
                        </span>
                      </td>
                      <td className="p-3 text-right text-slate-200">{op.baseImponible.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €</td>
                      <td className="p-3 text-center text-slate-400">{op.numFacturas}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center text-xs text-slate-400">
                No se han registrado operaciones intracomunitarias en este periodo. Si tienes facturas de Google, Adobe o AWS, asegúrate de que el CIF contenga el prefijo de país comunitario.
              </div>
            )}
          </div>

          {renderParticularidades(mod349.particularidades)}
        </div>
      )}
    </div>
  );
};
