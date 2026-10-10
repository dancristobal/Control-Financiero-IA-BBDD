import React, { useState } from 'react';
import {
  Sparkles,
  FileText,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  CheckCircle2,
  Calendar,
  Clock,
  Printer,
  Download,
  Flame,
  ArrowRight,
  ShieldCheck,
  RefreshCw
} from 'lucide-react';
import { AnalisisEjecutivo, Factura, Proveedor, Alerta, DesgloseIVA, DatosNegocio, DEFAULT_DATOS_NEGOCIO } from '../types';

interface AnalisisIAViewProps {
  analisis: AnalisisEjecutivo;
  facturas: Factura[];
  proveedores: Proveedor[];
  alertas: Alerta[];
  datosNegocio?: DatosNegocio;
  onOpenPdfReport: () => void;
  onUpdateAnalisis: (nuevo: AnalisisEjecutivo) => void;
}

export const AnalisisIAView: React.FC<AnalisisIAViewProps> = ({
  analisis,
  facturas,
  proveedores,
  alertas,
  datosNegocio,
  onOpenPdfReport,
  onUpdateAnalisis,
}) => {
  const [loading, setLoading] = useState(false);
  const resolvedDatosNegocio: DatosNegocio = {
    ...DEFAULT_DATOS_NEGOCIO,
    ...datosNegocio,
    sector: datosNegocio?.sector || DEFAULT_DATOS_NEGOCIO.sector,
    contextoOperativo: datosNegocio?.contextoOperativo || DEFAULT_DATOS_NEGOCIO.contextoOperativo,
  };
  const nombreNegocio = resolvedDatosNegocio.nombre;
  const sectorNegocio = resolvedDatosNegocio.sector || DEFAULT_DATOS_NEGOCIO.sector;

  const ejecutarAnalisisConGemini = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/gemini/analisis-ejecutivo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nombreNegocio,
          datosNegocio: resolvedDatosNegocio,
          sector: sectorNegocio,
          contextoOperativo: resolvedDatosNegocio.contextoOperativo,
          facturas,
          proveedores,
          alertas,
          resumenIVA: {
            totalFacturas: facturas.length,
            totalGasto: facturas.reduce((sum, f) => sum + f.total, 0),
            cuotaIVA: facturas.reduce((sum, f) => sum + f.cuotaIVA, 0),
          },
        }),
      });

      const data = await response.json();
      if (data.analisis) {
        onUpdateAnalisis(data.analisis);
      }
    } catch (err) {
      console.error('Error al solicitar análisis a Gemini:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header & Main Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-gradient-to-r from-amber-500/20 to-rose-500/20 text-amber-300 border border-amber-500/30 uppercase tracking-wider">
              Gemini Financial Intelligence
            </span>
            <span className="text-xs text-slate-300 font-medium">
              Auditoría Ejecutiva • {nombreNegocio} ({sectorNegocio})
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1 tracking-tight">
            Análisis Ejecutivo con IA
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Diagnóstico integral de gastos, alertas críticas, recomendaciones y prioridad semanal
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            id="btn-analizar-gastos"
            disabled={loading}
            onClick={ejecutarAnalisisConGemini}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold tracking-wide shadow-lg shadow-rose-950/40 transition-all cursor-pointer disabled:opacity-50"
          >
            <Sparkles className={`w-4 h-4 text-white ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? 'ANALIZANDO FACTURAS...' : '✨ ANALIZAR MIS GASTOS'}</span>
          </button>

          <button
            id="btn-generar-pdf"
            onClick={onOpenPdfReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#101726] hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-bold tracking-wide transition-colors"
          >
            <Printer className="w-4 h-4 text-rose-400" />
            <span>GENERAR INFORME PDF (9 PÁG.)</span>
          </button>
        </div>
      </div>

      {/* SECTION 7 HIGHLIGHT: IF YOU COULD ONLY REVIEW ONE THING THIS WEEK */}
      <div
        id="card-diagnostico-semana"
        className="p-6 rounded-2xl bg-gradient-to-br from-red-950/40 via-[#161220] to-[#0c121e] border-2 border-red-500/50 shadow-xl shadow-red-950/20 relative overflow-hidden"
      >
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
            <Flame className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/30 text-red-300">
                PRIORIDAD CRÍTICA DE LA SEMANA
              </span>
              <span className="text-xs text-slate-300 font-mono">
                {new Date(analisis.fechaGeneracion).toLocaleDateString('es-ES')}
              </span>
            </div>
            <h3 className="text-lg font-bold text-red-100 mt-1">
              Si solo pudieras revisar una sola cosa esta semana...
            </h3>
            <p className="text-sm text-slate-200 font-medium leading-relaxed max-w-4xl pt-1">
              &quot;{analisis.prioridadSemana}&quot;
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: ESTADO GENERAL (Máx 5 líneas) */}
      <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          <h3 className="text-base font-bold text-slate-100">
            1. Estado General del Negocio
          </h3>
        </div>
        <p className="text-sm text-slate-300 leading-relaxed max-w-4xl">
          {analisis.estadoGeneral}
        </p>
      </div>

      {/* SECTIONS 2, 3, 4: Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SECTION 2: Principales Gastos */}
        <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-rose-400" />
              <span>2. Principales Gastos</span>
            </h3>
            <ul className="mt-4 space-y-3">
              {analisis.principalesGastos.map((gasto, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shrink-0 mt-1.5"></span>
                  <span>{gasto}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* SECTION 3: Cambios Importantes */}
        <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>3. Cambios Importantes</span>
            </h3>
            <ul className="mt-4 space-y-3">
              {analisis.cambiosImportantes.map((cambio, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0 mt-1.5"></span>
                  <span>{cambio}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* SECTION 4: Alertas Financieras */}
        <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-sm font-bold text-slate-100 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400" />
              <span>4. Alertas de Riesgo</span>
            </h3>
            <ul className="mt-4 space-y-3">
              {analisis.alertas.map((alerta, i) => (
                <li key={i} className="text-xs text-slate-300 flex items-start gap-2.5 leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5"></span>
                  <span>{alerta}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* SECTION 5: Oportunidades de Ahorro o Revisión */}
      <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-4">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-amber-400" />
          <h3 className="text-base font-bold text-slate-100">
            5. Oportunidades de Ahorro y Optimización de Márgenes
          </h3>
        </div>
        <p className="text-xs text-slate-300">
          Recomendaciones justificadas estrictamente en los datos de consumo de {nombreNegocio}:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {analisis.oportunidadesAhorro.map((op, idx) => (
            <div
              key={idx}
              className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/90 text-xs text-slate-300 leading-relaxed"
            >
              <div className="font-semibold text-amber-300 mb-1">
                Estrategia #{idx + 1}
              </div>
              {op}
            </div>
          ))}
        </div>
      </div>

      {/* SECTION 6: TRES ACCIONES RECOMENDADAS ORDENADAS POR IMPACTO */}
      <div className="p-6 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-4">
        <div>
          <h3 className="text-base font-bold text-slate-100">
            6. Tres Acciones Recomendadas Ordenadas por Impacto
          </h3>
          <p className="text-xs text-slate-300 mt-0.5">
            Plan de acción operativo con justificación empresarial y datos cuantitativos
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-1">
          {analisis.tresAcciones.map((acc, index) => (
            <div
              key={index}
              className="p-5 rounded-2xl bg-[#0d1424] border border-slate-800 flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-300">
                    Acción #{index + 1}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      acc.impacto === 'Inmediato'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : acc.impacto === 'Alto'
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    }`}
                  >
                    Impacto {acc.impacto}
                  </span>
                </div>

                <h4 className="text-sm font-bold text-slate-100 leading-snug">
                  {acc.accion}
                </h4>

                <div className="mt-3 text-xs space-y-2 text-slate-300 leading-relaxed">
                  <div>
                    <strong className="text-slate-200">Motivo:</strong> {acc.motivo}
                  </div>
                  <div className="pt-2 border-t border-slate-800/60 text-[11px] text-slate-300">
                    <strong className="text-slate-300">Datos:</strong> {acc.datos}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
