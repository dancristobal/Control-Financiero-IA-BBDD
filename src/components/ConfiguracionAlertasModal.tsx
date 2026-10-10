import React, { useState, useMemo } from 'react';
import {
  Sliders,
  AlertTriangle,
  CheckCircle2,
  RotateCcw,
  Save,
  X,
  Info,
  TrendingUp,
  Percent,
  ShieldAlert,
  Sparkles,
  RefreshCw,
  Building2,
  Layers
} from 'lucide-react';
import { ConfiguracionAlertas, DEFAULT_CONFIGURACION_ALERTAS, Factura, Alerta } from '../types';
import {
  obtenerConfiguracionAlertas,
  guardarConfiguracionAlertas,
  restablecerConfiguracionAlertas,
  evaluarSubidasPrecioDesdeFacturas
} from '../utils/alertasConfig';

interface ConfiguracionAlertasModalProps {
  isOpen: boolean;
  onClose: () => void;
  facturas?: Factura[];
  alertasActuales?: Alerta[];
  onGuardarYRecalcular?: (nuevaConfig: ConfiguracionAlertas) => void;
}

const PRESETS_MODERADA = [5, 8, 10, 12, 15, 20];
const PRESETS_CRITICA = [12, 15, 20, 25, 30];

export const ConfiguracionAlertasModal: React.FC<ConfiguracionAlertasModalProps> = ({
  isOpen,
  onClose,
  facturas = [],
  alertasActuales = [],
  onGuardarYRecalcular,
}) => {
  // Cargar estado inicial de configuración de alertas (DB-First)
  const [config, setConfig] = useState<ConfiguracionAlertas>(() => obtenerConfiguracionAlertas());
  const [guardadoExitoso, setGuardadoExitoso] = useState<boolean>(false);

  // Sincronizar al abrir si hubo cambios externos
  React.useEffect(() => {
    if (isOpen) {
      setConfig(obtenerConfiguracionAlertas());
      setGuardadoExitoso(false);
    }
  }, [isOpen]);

  // Simulación en tiempo real del impacto en las facturas existentes
  const subidasSimuladas = useMemo(() => {
    return evaluarSubidasPrecioDesdeFacturas(facturas, config);
  }, [facturas, config]);

  const criticasSimuladas = subidasSimuladas.filter((a) => a.nivel === 'critica');
  const altasSimuladas = subidasSimuladas.filter((a) => a.nivel === 'alta');

  if (!isOpen) return null;

  const handleGuardar = (recalcular: boolean = false) => {
    // Validar coherencia: la subida crítica no debe ser inferior a la moderada
    let configFinal = { ...config };
    if (configFinal.umbralSubidaCriticaPct < configFinal.umbralSubidaModeradaPct) {
      configFinal.umbralSubidaCriticaPct = configFinal.umbralSubidaModeradaPct;
    }

    guardarConfiguracionAlertas(configFinal);
    setConfig(configFinal);
    setGuardadoExitoso(true);

    if (recalcular && onGuardarYRecalcular) {
      onGuardarYRecalcular(configFinal);
    }

    setTimeout(() => {
      setGuardadoExitoso(false);
      if (recalcular) {
        onClose();
      }
    }, 1200);
  };

  const handleRestablecer = () => {
    const defaultCfg = restablecerConfiguracionAlertas();
    setConfig(defaultCfg);
    setGuardadoExitoso(true);
    setTimeout(() => setGuardadoExitoso(false), 1200);
  };

  const isConfigModificada =
    config.umbralSubidaModeradaPct !== DEFAULT_CONFIGURACION_ALERTAS.umbralSubidaModeradaPct ||
    config.umbralSubidaCriticaPct !== DEFAULT_CONFIGURACION_ALERTAS.umbralSubidaCriticaPct ||
    config.umbralConcentracionPct !== DEFAULT_CONFIGURACION_ALERTAS.umbralConcentracionPct;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-sm overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl shadow-black/80 overflow-hidden text-slate-200 my-8"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4.5 border-b border-slate-800 bg-[#0a0f18]/80">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-slate-100">
                  Configuración de Umbrales de Alertas
                </h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                  Parámetros
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Define a partir de qué porcentaje de subida de precios debe avisarte el sistema
              </p>
            </div>
          </div>

          <button
            id="btn-cerrar-config-alertas"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cerrar configuración"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Status feedback message */}
          {guardadoExitoso && (
            <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>¡Preferencias guardadas con éxito!</strong> Los nuevos umbrales se aplicarán a todas las auditorías y facturas registradas.
              </span>
            </div>
          )}

          {/* Section 1: Umbral de Subida de Precios (Aviso / Alerta Alta) */}
          <div className="p-4.5 rounded-xl bg-[#0a0f18] border border-slate-800/90 space-y-3.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-amber-400" />
                  <h4 className="text-sm font-bold text-slate-200">
                    Umbral de Incremento de Precio (Aviso)
                  </h4>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Porcentaje mínimo de encarecimiento respecto a la última compra del mismo producto para emitir una alerta activa.
                  <span className="text-slate-500 block mt-0.5">
                    (Valor predeterminado: <strong>8%</strong>. Si se fija en 10%, no avisará por subidas del 8% o 9%).
                  </span>
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-2xl font-black font-mono text-amber-400">
                  +{config.umbralSubidaModeradaPct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Presets Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Valores rápidos:</span>
              {PRESETS_MODERADA.map((pct) => (
                <button
                  key={pct}
                  id={`btn-preset-moderada-${pct}`}
                  type="button"
                  onClick={() => {
                    const nueva = {
                      ...config,
                      umbralSubidaModeradaPct: pct,
                      umbralSubidaCriticaPct: Math.max(config.umbralSubidaCriticaPct, pct),
                    };
                    setConfig(nueva);
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                    config.umbralSubidaModeradaPct === pct
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  +{pct}% {pct === 8 ? '(Defecto)' : pct === 10 ? '(10%)' : ''}
                </button>
              ))}
            </div>

            {/* Range Slider & Manual Input */}
            <div className="flex items-center gap-4 pt-1">
              <input
                id="range-umbral-moderada"
                type="range"
                min="2"
                max="40"
                step="0.5"
                value={config.umbralSubidaModeradaPct}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setConfig((prev) => ({
                    ...prev,
                    umbralSubidaModeradaPct: val,
                    umbralSubidaCriticaPct: Math.max(prev.umbralSubidaCriticaPct, val),
                  }));
                }}
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
              <div className="flex items-center gap-1 w-24">
                <input
                  id="input-umbral-moderada"
                  type="number"
                  min="1"
                  max="100"
                  step="0.5"
                  value={config.umbralSubidaModeradaPct}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setConfig((prev) => ({
                      ...prev,
                      umbralSubidaModeradaPct: val,
                      umbralSubidaCriticaPct: Math.max(prev.umbralSubidaCriticaPct, val),
                    }));
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-amber-400 text-right focus:outline-none focus:border-amber-500"
                />
                <span className="text-xs text-slate-400 font-mono">%</span>
              </div>
            </div>
          </div>

          {/* Section 2: Umbral de Subida Crítica */}
          <div className="p-4.5 rounded-xl bg-[#0a0f18] border border-slate-800/90 space-y-3.5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <h4 className="text-sm font-bold text-slate-200">
                    Umbral de Subida Crítica (Nivel Severo)
                  </h4>
                </div>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                  Las subidas que igualen o superen este nivel se clasificarán como <strong>Críticas</strong> (rojo), activando advertencias destacadas en el panel ejecutivo.
                  <span className="text-slate-500 block mt-0.5">
                    (Valor predeterminado: <strong>15%</strong>).
                  </span>
                </p>
              </div>

              <div className="text-right shrink-0">
                <span className="text-2xl font-black font-mono text-rose-400">
                  +{config.umbralSubidaCriticaPct.toFixed(1)}%
                </span>
              </div>
            </div>

            {/* Presets Chips */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              <span className="text-[11px] text-slate-400 font-medium mr-1">Valores rápidos:</span>
              {PRESETS_CRITICA.map((pct) => (
                <button
                  key={pct}
                  id={`btn-preset-critica-${pct}`}
                  type="button"
                  onClick={() => {
                    setConfig((prev) => ({
                      ...prev,
                      umbralSubidaCriticaPct: pct,
                      umbralSubidaModeradaPct: Math.min(prev.umbralSubidaModeradaPct, pct),
                    }));
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                    config.umbralSubidaCriticaPct === pct
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-sm'
                      : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                  }`}
                >
                  +{pct}% {pct === 15 ? '(Defecto)' : ''}
                </button>
              ))}
            </div>

            {/* Range Slider & Manual Input */}
            <div className="flex items-center gap-4 pt-1">
              <input
                id="range-umbral-critica"
                type="range"
                min="5"
                max="60"
                step="0.5"
                value={config.umbralSubidaCriticaPct}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  setConfig((prev) => ({
                    ...prev,
                    umbralSubidaCriticaPct: val,
                    umbralSubidaModeradaPct: Math.min(prev.umbralSubidaModeradaPct, val),
                  }));
                }}
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-rose-500"
              />
              <div className="flex items-center gap-1 w-24">
                <input
                  id="input-umbral-critica"
                  type="number"
                  min="5"
                  max="100"
                  step="0.5"
                  value={config.umbralSubidaCriticaPct}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setConfig((prev) => ({
                      ...prev,
                      umbralSubidaCriticaPct: val,
                      umbralSubidaModeradaPct: Math.min(prev.umbralSubidaModeradaPct, val),
                    }));
                  }}
                  className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-xs font-mono font-bold text-rose-400 text-right focus:outline-none focus:border-rose-500"
                />
                <span className="text-xs text-slate-400 font-mono">%</span>
              </div>
            </div>
          </div>

          {/* Section 3: Concentración de Proveedor */}
          <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/90 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-sky-400" />
                <h4 className="text-xs font-bold text-slate-200">
                  Umbral de Concentración de Gasto en Proveedor
                </h4>
              </div>
              <span className="text-xs font-mono font-bold text-sky-400">
                {config.umbralConcentracionPct || 30}% del total
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              Genera alerta de riesgo de dependencia si un único proveedor acumula más de este porcentaje del gasto total del negocio.
            </p>
            <div className="flex items-center gap-4 pt-1">
              <input
                id="range-umbral-concentracion"
                type="range"
                min="15"
                max="60"
                step="5"
                value={config.umbralConcentracionPct || 30}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, umbralConcentracionPct: parseInt(e.target.value, 10) }))
                }
                className="flex-1 h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-sky-500"
              />
              <span className="text-xs font-mono text-slate-300 w-12 text-right">
                {config.umbralConcentracionPct || 30}%
              </span>
            </div>
          </div>

          {/* Section 4: Live Impact Preview based on current invoices */}
          <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                Simulación en Vivo sobre tus Facturas ({facturas.length} registradas)
              </span>
              <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-black/40 text-slate-200">
                {subidasSimuladas.length} alertas resultantes
              </span>
            </div>

            <p className="text-xs text-slate-300">
              Con un umbral de aviso al <strong>+{config.umbralSubidaModeradaPct}%</strong> y crítica al <strong>+{config.umbralSubidaCriticaPct}%</strong>:
            </p>

            {subidasSimuladas.length > 0 ? (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {subidasSimuladas.map((a, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-[#0a0f18] border border-slate-800/80 flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          a.nivel === 'critica' ? 'bg-red-400' : 'bg-amber-400'
                        }`}
                      />
                      <span className="text-slate-200 font-medium truncate">
                        {a.datosRelacionados?.producto}
                      </span>
                      <span className="text-[10px] text-slate-400 truncate hidden sm:inline">
                        ({a.datosRelacionados?.proveedor})
                      </span>
                    </div>

                    <div className="text-right shrink-0 flex items-center gap-2">
                      <span
                        className={`text-xs font-mono font-bold ${
                          a.nivel === 'critica' ? 'text-red-400' : 'text-amber-400'
                        }`}
                      >
                        +{a.datosRelacionados?.variacionPorcentaje?.toFixed(1)}%
                      </span>
                      <span
                        className={`text-[9px] font-black uppercase px-1.5 py-0.5 rounded ${
                          a.nivel === 'critica'
                            ? 'bg-red-500/20 text-red-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {a.nivel}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-3 rounded-lg bg-[#0a0f18] text-center text-xs text-slate-400">
                Ninguna subida en el catálogo supera el umbral del +{config.umbralSubidaModeradaPct}%.
              </div>
            )}
          </div>
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-slate-800 bg-[#0a0f18]/90">
          <button
            id="btn-restablecer-umbrales"
            type="button"
            onClick={handleRestablecer}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors py-1 cursor-pointer order-2 sm:order-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restablecer predeterminados (8% / 15%)</span>
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto order-1 sm:order-2">
            <button
              id="btn-guardar-solo-preferencias"
              type="button"
              onClick={() => handleGuardar(false)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Guardar preferencias</span>
            </button>

            <button
              id="btn-guardar-y-recalcular"
              type="button"
              onClick={() => handleGuardar(true)}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-950/40 cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Guardar y Recalcular Alertas</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
