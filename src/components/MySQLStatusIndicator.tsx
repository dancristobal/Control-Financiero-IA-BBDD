import React, { useState, useEffect, useRef } from 'react';
import {
  Database,
  Activity,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Settings,
  Download,
  Info,
  Server,
  X
} from 'lucide-react';

interface MySQLStatusData {
  connected: boolean;
  latencyMs: number;
  message?: string;
  host?: string;
  port?: number;
  database?: string;
  user?: string;
  facturasCount?: number;
  proveedoresCount?: number;
  lineasCount?: number;
  alertasCount?: number;
  categoriasCount?: number;
  historicoPreciosCount?: number;
  timestamp?: string;
}

interface MySQLStatusIndicatorProps {
  onOpenConfigMySQL?: () => void;
  className?: string;
}

export const MySQLStatusIndicator: React.FC<MySQLStatusIndicatorProps> = ({
  onOpenConfigMySQL,
  className = '',
}) => {
  const [status, setStatus] = useState<MySQLStatusData | null>(null);
  const [isChecking, setIsChecking] = useState<boolean>(false);
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [errorDetails, setErrorDetails] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Consulta el estado completo o ping
  const checkStatus = async (full = false) => {
    setIsChecking(true);
    const endpoint = full ? '/api/mysql/status' : '/api/mysql/ping';
    const start = performance.now();
    try {
      const res = await fetch(endpoint);
      const clientElapsed = Math.round(performance.now() - start);
      if (res.ok) {
        const data = await res.json();
        const latency = data.latencyMs !== undefined ? data.latencyMs : clientElapsed;
        setStatus((prev) => ({
          ...prev,
          ...data,
          latencyMs: latency,
        }));
        if (!data.connected) {
          setErrorDetails(data.message || 'No se pudo conectar al servidor MySQL.');
        } else {
          setErrorDetails(null);
        }
      } else {
        setStatus((prev) => ({
          connected: false,
          latencyMs: clientElapsed,
          host: prev?.host || '127.0.0.1',
          port: prev?.port || 3306,
          database: prev?.database || 'finance_ai_db',
        }));
        setErrorDetails(`Error HTTP ${res.status} al verificar MySQL`);
      }
    } catch (err: any) {
      const clientElapsed = Math.round(performance.now() - start);
      setStatus((prev) => ({
        connected: false,
        latencyMs: clientElapsed,
        host: prev?.host || '127.0.0.1',
        port: prev?.port || 3306,
        database: prev?.database || 'finance_ai_db',
      }));
      setErrorDetails(err?.message || 'Error de red al comprobar MySQL');
    } finally {
      setIsChecking(false);
    }
  };

  // Carga inicial y polling periódico cada 25 segundos
  useEffect(() => {
    checkStatus(true);
    const interval = setInterval(() => {
      checkStatus(false);
    }, 25000);
    return () => clearInterval(interval);
  }, []);

  // Cerrar al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Cerrar con Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const isConnected = status?.connected ?? false;
  const latency = status?.latencyMs ?? 0;

  // Clasificación de la latencia
  // < 80ms: Excelente
  // 80 - 200ms: Normal / Buena
  // 200 - 400ms: Moderada
  // > 400ms: Alta / Crítica
  const isHighLatency = isConnected && latency > 200;
  const isModerateLatency = isConnected && latency > 80 && latency <= 200;

  const getLatencyTier = (ms: number) => {
    if (!isConnected) return { label: 'Sin Conexión', color: 'text-rose-400', bg: 'bg-rose-500' };
    if (ms <= 50) return { label: 'Excelente', color: 'text-emerald-400', bg: 'bg-emerald-500' };
    if (ms <= 150) return { label: 'Óptima', color: 'text-emerald-300', bg: 'bg-emerald-400' };
    if (ms <= 300) return { label: 'Moderada', color: 'text-amber-300', bg: 'bg-amber-400' };
    return { label: 'Latencia Alta', color: 'text-orange-400', bg: 'bg-orange-500' };
  };

  const tier = getLatencyTier(latency);

  return (
    <div className={`relative inline-block ${className}`} ref={dropdownRef}>
      {/* Botón Indicador en la Cabecera */}
      <button
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen && !status?.facturasCount) {
            checkStatus(true);
          }
        }}
        className={`group flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
          isConnected
            ? isHighLatency
              ? 'bg-amber-950/40 hover:bg-amber-900/50 border-amber-500/40 text-amber-200'
              : 'bg-emerald-950/40 hover:bg-emerald-900/50 border-emerald-500/40 text-emerald-200'
            : 'bg-rose-950/30 hover:bg-rose-900/40 border-rose-500/30 text-rose-300'
        }`}
        title={`MySQL ${isConnected ? (isHighLatency ? `Activo (Latencia alta: ${latency}ms)` : `Conectado (${latency}ms)`) : 'Desconectado'} - Clic para ver detalles`}
        aria-label="Estado de conexión MySQL"
        aria-expanded={isOpen}
      >
        {/* Icono con animación de estado */}
        <div className="relative flex items-center justify-center">
          <Database
            className={`w-3.5 h-3.5 transition-transform group-hover:scale-110 ${
              isConnected
                ? isHighLatency
                  ? 'text-amber-400'
                  : 'text-emerald-400'
                : 'text-rose-400'
            }`}
          />
          {isConnected && (
            <span
              className={`absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full ${
                isHighLatency ? 'bg-amber-400' : 'bg-emerald-400'
              } ${isHighLatency ? 'animate-ping opacity-75' : 'animate-ping opacity-60'}`}
            />
          )}
        </div>

        {/* Etiqueta visible */}
        <span className="hidden sm:inline font-semibold">MySQL</span>

        {/* Píldora de Latencia o Estado */}
        {isChecking && !status ? (
          <span className="w-1.5 h-1.5 rounded-full bg-slate-400 animate-pulse" />
        ) : isConnected ? (
          <span
            className={`font-mono text-[10px] px-1.5 py-0.2 rounded font-semibold ${
              isHighLatency
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
            }`}
          >
            {latency}ms
          </span>
        ) : (
          <span className="font-mono text-[10px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            Off
          </span>
        )}

        {/* Punto indicador de pulso en móviles */}
        <span
          className={`sm:hidden w-2 h-2 rounded-full ${
            isConnected
              ? isHighLatency
                ? 'bg-amber-400'
                : 'bg-emerald-400'
              : 'bg-rose-500'
          }`}
        />
      </button>

      {/* Menú Flotante / Popover con Diagnóstico Detallado */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl backdrop-blur-xl p-4 z-50 text-slate-200 animate-in fade-in zoom-in-95 duration-150">
          {/* Cabecera del Popover */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <div
                className={`p-1.5 rounded-lg ${
                  isConnected
                    ? isHighLatency
                      ? 'bg-amber-500/20 text-amber-400'
                      : 'bg-emerald-500/20 text-emerald-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                <Server className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white leading-tight">
                  Arquitectura Híbrida MySQL / MariaDB
                </h4>
                <p className="text-[10px] text-slate-400">
                  Replicación Dual-Write en Tiempo Real
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => checkStatus(true)}
                disabled={isChecking}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                title="Probar latencia y conexión ahora"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${isChecking ? 'animate-spin text-rose-400' : ''}`}
                />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Cerrar panel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Tarjeta de Estado y Latencia */}
          <div className="my-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800/80">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                {isConnected ? (
                  isHighLatency ? (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  ) : (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  )
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400" />
                )}
                <span className="text-xs font-bold">
                  {isConnected
                    ? isHighLatency
                      ? 'Conexión Activa con Latencia Alta'
                      : 'Conexión Activa y Operativa'
                    : 'MySQL No Accesible'}
                </span>
              </div>

              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  isConnected
                    ? isHighLatency
                      ? 'bg-amber-500/20 text-amber-300'
                      : 'bg-emerald-500/20 text-emerald-300'
                    : 'bg-rose-500/20 text-rose-300'
                }`}
              >
                {tier.label}
              </span>
            </div>

            {/* Medidor Gráfico de Latencia */}
            <div className="space-y-1 mt-2">
              <div className="flex justify-between items-center text-[10px]">
                <span className="text-slate-400 flex items-center gap-1">
                  <Activity className="w-3 h-3 text-slate-400" />
                  Latencia de respuesta:
                </span>
                <span className="font-mono font-bold text-xs text-white">
                  {isConnected ? `${latency} ms` : 'Inaccesible'}
                </span>
              </div>

              {/* Barra de progreso de latencia */}
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden flex">
                <div
                  className={`h-full transition-all duration-300 ${
                    !isConnected
                      ? 'w-full bg-rose-500/40'
                      : latency <= 50
                      ? 'bg-emerald-400'
                      : latency <= 150
                      ? 'bg-emerald-500'
                      : latency <= 300
                      ? 'bg-amber-400'
                      : 'bg-rose-500'
                  }`}
                  style={{
                    width: isConnected ? `${Math.min(100, Math.max(10, (latency / 400) * 100))}%` : '100%',
                  }}
                />
              </div>

              <div className="flex justify-between text-[9px] text-slate-500 font-mono px-0.5">
                <span>0ms (Excelente)</span>
                <span>150ms (Óptima)</span>
                <span>300ms+ (Lenta)</span>
              </div>
            </div>
          </div>

          {/* Detalles del Servidor y Base de Datos (6 Tablas Relacionales) */}
          <div className="grid grid-cols-2 gap-2 text-[11px] mb-3">
            <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Servidor / Puerto</span>
              <span className="font-mono font-medium text-slate-200 truncate block">
                {status?.host || '127.0.0.1'}:{status?.port || 3306}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Base de Datos</span>
              <span className="font-mono font-medium text-slate-200 truncate block">
                {status?.database || 'finance_ai_db'}
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Facturas / Líneas</span>
              <span className="font-bold text-slate-200">
                {status?.facturasCount !== undefined ? status.facturasCount : '-'} fac / {status?.lineasCount !== undefined ? status.lineasCount : '-'} lín
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Proveedores / Cats.</span>
              <span className="font-bold text-slate-200">
                {status?.proveedoresCount !== undefined ? status.proveedoresCount : '-'} prov / {status?.categoriasCount !== undefined ? status.categoriasCount : '-'} cat
              </span>
            </div>

            <div className="p-2 rounded-lg bg-slate-800/40 border border-slate-800 col-span-2 flex justify-between items-center">
              <div>
                <span className="text-slate-400 block text-[10px]">Alertas & Hist. Precios</span>
                <span className="font-bold text-slate-200">
                  {status?.alertasCount !== undefined ? status.alertasCount : '-'} alertas / {status?.historicoPreciosCount !== undefined ? status.historicoPreciosCount : '-'} precios
                </span>
              </div>
              <span className="text-[10px] text-emerald-400 font-semibold bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/50">
                6 Tablas Activas
              </span>
            </div>
          </div>

          {/* Explicación / Diagnóstico */}
          <div className="text-[10px] text-slate-400 bg-slate-950/40 rounded-xl p-2.5 mb-3 border border-slate-800/60">
            {isConnected ? (
              <p className="leading-relaxed">
                ✨ <strong className="text-slate-200">Arquitectura DB-First:</strong> MySQL/MariaDB es la <strong className="text-emerald-300">Única Fuente de Verdad (Single Source of Truth)</strong>. Todas las operaciones se leen y persisten directamente en la base de datos relacional sin intermediarios. Google Drive se usa exclusivamente para los archivos y recibos.
              </p>
            ) : (
              <div className="space-y-1">
                <p className="text-rose-300 font-semibold flex items-center gap-1">
                  <Info className="w-3 h-3 text-rose-400 shrink-0" />
                  Motivo: {errorDetails || 'ECONNREFUSED 127.0.0.1:3306'}
                </p>
                <p className="leading-relaxed text-slate-400">
                  Si estás en local, inicia el servicio MySQL en <strong className="text-slate-300">XAMPP</strong>. En modo desarrollo sin base de datos activa, el backend mantiene la persistencia transaccional en memoria del servidor.
                </p>
              </div>
            )}
          </div>

          {/* Acciones directas */}
          <div className="flex items-center gap-2 pt-2 border-t border-slate-800">
            <button
              onClick={() => checkStatus(true)}
              disabled={isChecking}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
              <span>{isChecking ? 'Probando...' : 'Probar Ping'}</span>
            </button>

            {onOpenConfigMySQL && (
              <button
                onClick={() => {
                  setIsOpen(false);
                  onOpenConfigMySQL();
                }}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 border border-rose-500/30 text-rose-300 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Settings className="w-3 h-3" />
                <span>Configurar</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
