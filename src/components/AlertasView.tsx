import React, { useState, useMemo, useEffect } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Eye,
  Filter,
  ShieldAlert,
  Calendar,
  Building2,
  TrendingUp,
  FileText,
  DollarSign,
  Sliders,
  Settings,
  Sparkles,
  Percent,
  RefreshCw,
  RotateCcw
} from 'lucide-react';
import { Alerta, Factura, ConfiguracionAlertas, DEFAULT_CONFIGURACION_ALERTAS, DatosNegocio } from '../types';
import {
  obtenerConfiguracionAlertas,
  guardarConfiguracionAlertas,
  evaluarSubidasPrecioDesdeFacturas
} from '../utils/alertasConfig';
import { ConfiguracionAlertasModal } from './ConfiguracionAlertasModal';
import { FacturaDetalleModal } from './FacturaDetalleModal';
import { VisorFacturaModal } from './VisorFacturaModal';

interface AlertasViewProps {
  alertas: Alerta[];
  onResolverAlerta: (id: string) => void;
  onIgnorarAlerta: (id: string) => void;
  onReactivarAlerta?: (id: string) => void;
  onVerFactura?: (idFactura: string) => void;
  facturas?: Factura[];
  onActualizarAlertas?: (nuevasAlertas: Alerta[]) => void;
  datosNegocio?: DatosNegocio;
  onUploadToDrive?: (factura: Factura) => Promise<any> | void;
  onDeleteFactura?: (facturaOId: Factura | string) => Promise<any> | void;
  onActualizarEstadoFactura?: (
    idFactura: string,
    nuevoEstado: 'Pagada' | 'Pendiente' | 'Vencida',
    fechaPago?: string
  ) => Promise<any> | void;
}

export const AlertasView: React.FC<AlertasViewProps> = ({
  alertas,
  onResolverAlerta,
  onIgnorarAlerta,
  onReactivarAlerta,
  onVerFactura,
  facturas = [],
  onActualizarAlertas,
  datosNegocio,
  onUploadToDrive,
  onDeleteFactura,
  onActualizarEstadoFactura,
}) => {
  const [filtroNivel, setFiltroNivel] = useState('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'activa' | 'resuelta' | 'ignorada' | 'TODOS'>('activa');
  const [modalConfigAbierto, setModalConfigAbierto] = useState<boolean>(false);
  const [config, setConfig] = useState<ConfiguracionAlertas>(() => obtenerConfiguracionAlertas());
  const [toastNotificacion, setToastNotificacion] = useState<string | null>(null);

  // Estados para modal de detalle de factura específica y su visor
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);
  const [facturaParaVisor, setFacturaParaVisor] = useState<Factura | null>(null);

  const handleVerFactura = (idFactura: string) => {
    const target = String(idFactura).trim().toLowerCase();
    const encontrada = facturas.find(
      (f) => String(f.idFactura).trim().toLowerCase() === target
    );
    if (encontrada) {
      setFacturaSeleccionada(encontrada);
    } else if (onVerFactura) {
      onVerFactura(idFactura);
    }
  };

  // Escuchar actualizaciones de configuración (por si cambia en otra pestaña o componente)
  useEffect(() => {
    const handleConfigUpdate = (e: any) => {
      if (e.detail) {
        setConfig(e.detail);
      } else {
        setConfig(obtenerConfiguracionAlertas());
      }
    };
    window.addEventListener('fa_alertas_config_updated', handleConfigUpdate);
    return () => window.removeEventListener('fa_alertas_config_updated', handleConfigUpdate);
  }, []);

  // Deduplicar alertas de entrada por ID canónico y entidad
  const alertasUnicas = useMemo(() => {
    const map = new Map<string, Alerta>();
    const facturasVencidas = new Set<string>();
    (alertas || []).forEach((a) => {
      const canonId = (a.id || '').replace(/-\d+$/, '');
      if (a.tipo === 'FACTURA VENCIDA' && a.id.startsWith('ALT-VENC-')) {
        const fId = a.id.replace('ALT-VENC-', '').replace(/-\d+$/, '');
        if (facturasVencidas.has(fId)) return;
        facturasVencidas.add(fId);
      }
      if (!map.has(canonId)) {
        map.set(canonId, { ...a, id: canonId });
      }
    });
    return Array.from(map.values());
  }, [alertas]);

  const filtradas = useMemo(() => {
    return alertasUnicas.filter((a) => {
      if (filtroEstado !== 'TODOS' && a.estado !== filtroEstado) {
        return false;
      }
      if (filtroNivel !== 'TODOS' && a.nivel !== filtroNivel) {
        return false;
      }
      return true;
    });
  }, [alertasUnicas, filtroEstado, filtroNivel]);

  const activasCount = alertasUnicas.filter((a) => a.estado === 'activa').length;
  const criticasCount = alertasUnicas.filter((a) => a.estado === 'activa' && a.nivel === 'critica').length;
  const subidasCount = alertasUnicas.filter((a) => a.estado === 'activa' && a.tipo === 'SUBIDA DE PRECIO').length;

  // Manejador para guardar y recalcular alertas según el nuevo umbral
  const handleGuardarYRecalcular = (nuevaConfig: ConfiguracionAlertas) => {
    setConfig(nuevaConfig);
    guardarConfiguracionAlertas(nuevaConfig);

    if (facturas.length > 0 && onActualizarAlertas) {
      // 1. Conservar alertas que no son de subida de precio (vencidas, duplicados, concentración)
      const noSubidas = alertas.filter((a) => a.tipo !== 'SUBIDA DE PRECIO');

      // 2. Generar nuevas alertas de subida de precio con el nuevo umbral personalizado
      const nuevasSubidas = evaluarSubidasPrecioDesdeFacturas(facturas, nuevaConfig);

      const listaCombinada = [...nuevasSubidas, ...noSubidas];
      onActualizarAlertas(listaCombinada);

      setToastNotificacion(
        `Umbrales actualizados (+${nuevaConfig.umbralSubidaModeradaPct}% aviso / +${nuevaConfig.umbralSubidaCriticaPct}% crítica). Se detectaron ${nuevasSubidas.length} alertas de subida de precio.`
      );
    } else {
      setToastNotificacion(
        `Umbrales guardados con éxito (+${nuevaConfig.umbralSubidaModeradaPct}% aviso).`
      );
    }

    setTimeout(() => setToastNotificacion(null), 4000);
  };

  // Cambio rápido directo desde la barra de umbrales
  const handleCambioRapidoUmbral = (nuevoUmbral: number) => {
    const nuevaConfig: ConfiguracionAlertas = {
      ...config,
      umbralSubidaModeradaPct: nuevoUmbral,
      umbralSubidaCriticaPct: Math.max(config.umbralSubidaCriticaPct, nuevoUmbral),
    };
    handleGuardarYRecalcular(nuevaConfig);
  };

  const isConfigPersonalizada =
    config.umbralSubidaModeradaPct !== DEFAULT_CONFIGURACION_ALERTAS.umbralSubidaModeradaPct ||
    config.umbralSubidaCriticaPct !== DEFAULT_CONFIGURACION_ALERTAS.umbralSubidaCriticaPct;

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {toastNotificacion && (
        <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center justify-between shadow-lg shadow-emerald-950/30 animate-in fade-in">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{toastNotificacion}</span>
          </div>
          <button
            onClick={() => setToastNotificacion(null)}
            className="text-emerald-400 hover:text-emerald-200 text-xs px-2 py-0.5 rounded"
          >
            ✕
          </button>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
              Monitor de Riesgos
            </span>
            <span className="text-xs text-slate-300">
              Anomalías y Control de Precios
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1 tracking-tight">
            Bandeja de Alertas Financieras
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Detección preventiva de subidas de precio, facturas vencidas y concentración de proveedores
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Botón de configuración de umbrales */}
          <button
            id="btn-abrir-config-alertas"
            type="button"
            onClick={() => setModalConfigAbierto(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/40 text-rose-300 hover:text-rose-200 text-xs font-bold transition-all shadow-sm cursor-pointer"
            title="Personalizar umbrales de incremento de precios del sistema"
          >
            <Sliders className="w-4 h-4 text-rose-400" />
            <span>Configurar Umbrales</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded bg-black/40 text-amber-300 font-mono">
              +{config.umbralSubidaModeradaPct}%
            </span>
          </button>

          <span className="px-3 py-1.5 rounded-xl bg-red-950/40 border border-red-500/40 text-xs font-bold text-red-300">
            {criticasCount} Críticas
          </span>
          <span className="px-3 py-1.5 rounded-xl bg-[#0f172a] border border-slate-800 text-xs text-slate-300">
            {activasCount} Activas
          </span>
        </div>
      </div>

      {/* Threshold Status & Quick Control Card */}
      <div className="p-4 rounded-2xl bg-[#101726] border border-slate-800/80 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0 mt-0.5 sm:mt-0">
            <Percent className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-200">
                Umbral activo de subida de precio:
              </span>
              <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                +{config.umbralSubidaModeradaPct}% (Aviso)
              </span>
              <span className="text-xs font-black font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
                +{config.umbralSubidaCriticaPct}% (Crítica)
              </span>
              {isConfigPersonalizada ? (
                <span className="text-[10px] font-semibold px-2 py-0.2 rounded-full bg-slate-800 text-sky-300 border border-sky-500/30">
                  Personalizado
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">
                  (Predeterminado 8%)
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Se ignoran variaciones inferiores al +{config.umbralSubidaModeradaPct}%. {subidasCount} alertas de precio activas registradas.
            </p>
          </div>
        </div>

        {/* Quick presets buttons */}
        <div className="flex items-center gap-1.5 shrink-0 self-end md:self-center">
          <span className="text-[11px] text-slate-400 font-medium mr-1 hidden lg:inline">Ajuste rápido:</span>
          {[5, 8, 10, 12, 15].map((pct) => (
            <button
              key={pct}
              id={`btn-quick-umbral-${pct}`}
              type="button"
              onClick={() => handleCambioRapidoUmbral(pct)}
              className={`px-2 py-1 rounded-lg text-xs font-mono font-bold transition-all cursor-pointer border ${
                config.umbralSubidaModeradaPct === pct
                  ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 shadow-sm'
                  : 'bg-[#0a0f18] text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
              }`}
              title={`Establecer umbral de aviso al ${pct}% y recalcular`}
            >
              +{pct}%
            </button>
          ))}
          <button
            id="btn-ajustar-avanzado"
            type="button"
            onClick={() => setModalConfigAbierto(true)}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-1 cursor-pointer"
            title="Abrir configuración avanzada de umbrales"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Filter Tabs & Selectors */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Status Tabs */}
        <div className="flex items-center bg-[#0d131f] p-1 rounded-xl border border-slate-800 text-xs font-medium">
          <button
            id="tab-alertas-activas"
            onClick={() => setFiltroEstado('activa')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filtroEstado === 'activa'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Activas ({alertas.filter((a) => a.estado === 'activa').length})
          </button>
          <button
            id="tab-alertas-resueltas"
            onClick={() => setFiltroEstado('resuelta')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filtroEstado === 'resuelta'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Resueltas ({alertas.filter((a) => a.estado === 'resuelta').length})
          </button>
          <button
            id="tab-alertas-ignoradas"
            onClick={() => setFiltroEstado('ignorada')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filtroEstado === 'ignorada'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Ignoradas ({alertas.filter((a) => a.estado === 'ignorada').length})
          </button>
          <button
            id="tab-alertas-todas"
            onClick={() => setFiltroEstado('TODOS')}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filtroEstado === 'TODOS'
                ? 'bg-rose-500 text-white font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Todas ({alertas.length})
          </button>
        </div>

        {/* Severity Filter */}
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span>Severidad:</span>
          <select
            id="select-filtro-severidad"
            value={filtroNivel}
            onChange={(e) => setFiltroNivel(e.target.value)}
            className="bg-[#0a0f18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none cursor-pointer"
          >
            <option value="TODOS">Todos los niveles</option>
            <option value="critica">Crítica (Rojo)</option>
            <option value="alta">Alta (Naranja)</option>
            <option value="media">Media (Amarillo)</option>
            <option value="informativa">Informativa</option>
          </select>
        </div>
      </div>

      {/* Alerts List */}
      <div className="space-y-3.5">
        {filtradas.length > 0 ? (
          filtradas.map((alerta) => {
            const isCritica = alerta.nivel === 'critica';
            const isAlta = alerta.nivel === 'alta';
            const isMedia = alerta.nivel === 'media';

            return (
              <div
                key={alerta.id}
                id={`alerta-item-${alerta.id}`}
                className={`p-5 rounded-2xl border transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md ${
                  alerta.estado !== 'activa'
                    ? 'bg-[#0a0f18]/60 border-slate-800/60 opacity-60'
                    : isCritica
                    ? 'bg-red-950/20 border-red-500/40'
                    : isAlta
                    ? 'bg-amber-950/20 border-amber-500/30'
                    : isMedia
                    ? 'bg-yellow-950/15 border-yellow-500/25'
                    : 'bg-[#101726] border-slate-800'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      isCritica
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : isAlta
                        ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                        : isMedia
                        ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40'
                        : 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                    }`}
                  >
                    <AlertTriangle className="w-5 h-5" />
                  </div>

                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded ${
                          isCritica
                            ? 'bg-red-500/25 text-red-300'
                            : isAlta
                            ? 'bg-amber-500/25 text-amber-300'
                            : 'bg-slate-800 text-slate-300'
                        }`}
                      >
                        {alerta.tipo}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {alerta.fecha}
                      </span>
                      {alerta.estado !== 'activa' && (
                        <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 capitalize">
                          {alerta.estado}
                        </span>
                      )}
                    </div>

                    <h3 className="text-base font-bold text-slate-100">
                      {alerta.titulo}
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed max-w-3xl">
                      {alerta.descripcion}
                    </p>

                    {/* Related Data Badges */}
                    {alerta.datosRelacionados && (
                      <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300">
                        {alerta.datosRelacionados.proveedor && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                            Proveedor: <strong>{alerta.datosRelacionados.proveedor}</strong>
                          </span>
                        )}
                        {alerta.datosRelacionados.variacionPorcentaje !== undefined && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">
                            Variación: +{alerta.datosRelacionados.variacionPorcentaje.toFixed(1)}%
                          </span>
                        )}
                        {alerta.datosRelacionados.idFactura && (
                          <span className="px-2 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-slate-300">
                            Ref: {alerta.datosRelacionados.idFactura}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 self-end md:self-center pt-2 md:pt-0">
                  {alerta.datosRelacionados?.idFactura && (
                    <button
                      onClick={() => handleVerFactura(alerta.datosRelacionados!.idFactura!)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-slate-100 text-xs font-semibold transition-colors cursor-pointer border border-slate-700/80"
                      title="Ver pantalla de esta factura en concreto"
                    >
                      <Eye className="w-3.5 h-3.5 text-rose-400" />
                      <span>Ver Factura</span>
                    </button>
                  )}

                  {alerta.estado === 'activa' ? (
                    <>
                      <button
                        onClick={() => onResolverAlerta(alerta.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                        title="Marcar alerta como resuelta y guardar en base de datos"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Resolver</span>
                      </button>
                      <button
                        onClick={() => onIgnorarAlerta(alerta.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
                        title="Ignorar alerta y archivar en base de datos"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Ignorar</span>
                      </button>
                    </>
                  ) : alerta.estado === 'resuelta' ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-semibold">
                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        Resuelta
                      </span>
                      {onReactivarAlerta && (
                        <button
                          onClick={() => onReactivarAlerta(alerta.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                          title="Volver a marcar alerta como activa en base de datos"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-400" />
                          <span>Reactivar</span>
                        </button>
                      )}
                      <button
                        onClick={() => onIgnorarAlerta(alerta.id)}
                        className="flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs transition-colors cursor-pointer"
                        title="Cambiar a estado ignorada"
                      >
                        <XCircle className="w-3 h-3" />
                        <span>Ignorar</span>
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 text-[11px] px-2.5 py-1 rounded-lg bg-slate-800/80 border border-slate-700 text-slate-400 font-medium">
                        <XCircle className="w-3 h-3 text-slate-400" />
                        Ignorada
                      </span>
                      {onReactivarAlerta && (
                        <button
                          onClick={() => onReactivarAlerta(alerta.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                          title="Volver a marcar alerta como activa en base de datos"
                        >
                          <RotateCcw className="w-3 h-3 text-slate-400" />
                          <span>Reactivar</span>
                        </button>
                      )}
                      <button
                        onClick={() => onResolverAlerta(alerta.id)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600/15 hover:bg-emerald-600/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                        title="Marcar como resuelta en base de datos"
                      >
                        <CheckCircle2 className="w-3 h-3" />
                        <span>Resolver</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        ) : (
          <div className="p-12 text-center rounded-2xl bg-[#101726] border border-slate-800 text-slate-400 space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <p className="text-sm font-semibold text-slate-200">
              No hay alertas en este estado o filtro.
            </p>
            <p className="text-xs text-slate-400">
              Las subidas que superen tu umbral del +{config.umbralSubidaModeradaPct}% y las facturas vencidas se mostrarán aquí.
            </p>
          </div>
        )}
      </div>

      {/* Componente Modal de Configuración de Alertas */}
      <ConfiguracionAlertasModal
        isOpen={modalConfigAbierto}
        onClose={() => setModalConfigAbierto(false)}
        facturas={facturas}
        alertasActuales={alertas}
        onGuardarYRecalcular={handleGuardarYRecalcular}
      />

      {/* Modal de Detalle de Factura al pulsar 'Ver Factura' desde Alertas */}
      <FacturaDetalleModal
        factura={facturaSeleccionada}
        onClose={() => setFacturaSeleccionada(null)}
        onDelete={
          onDeleteFactura
            ? (fac) => {
                setFacturaSeleccionada(null);
                onDeleteFactura(fac);
              }
            : undefined
        }
        onAbrirVisor={(fac) => {
          setFacturaSeleccionada(null);
          setFacturaParaVisor(fac);
        }}
        onUploadToDrive={onUploadToDrive}
        onActualizarEstado={
          onActualizarEstadoFactura
            ? (fac, nuevoEstado) => onActualizarEstadoFactura(fac.idFactura, nuevoEstado)
            : undefined
        }
      />

      {/* Visor Factura Modal cuando se abre desde el detalle de la factura */}
      <VisorFacturaModal
        factura={facturaParaVisor}
        isOpen={Boolean(facturaParaVisor)}
        onClose={() => setFacturaParaVisor(null)}
        onVerDetallesCompletos={(fac) => {
          setFacturaParaVisor(null);
          setFacturaSeleccionada(fac);
        }}
        datosNegocio={datosNegocio}
      />
    </div>
  );
};
