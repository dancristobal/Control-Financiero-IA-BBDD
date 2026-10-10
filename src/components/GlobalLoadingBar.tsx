import React from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { GlobalLoadingState } from '../types';

interface GlobalLoadingBarProps {
  loading: GlobalLoadingState;
}

export const GlobalLoadingBar: React.FC<GlobalLoadingBarProps> = ({ loading }) => {
  if (!loading.activo) return null;

  const tieneProgreso = typeof loading.progreso === 'number' && loading.progreso >= 0;
  const porcentaje = tieneProgreso ? Math.min(100, Math.max(0, loading.progreso!)) : null;

  return (
    <div
      id="contenedor-carga-global"
      role="status"
      aria-live="polite"
      className="fixed inset-x-0 top-0 z-[9999] pointer-events-none select-none"
    >
      {/* 1. Barra de progreso superior adherida al tope de la ventana */}
      <div
        id="barra-progreso-superior"
        className="w-full h-1 bg-slate-900/60 overflow-hidden relative shadow-[0_1px_8px_rgba(225,29,72,0.45)]"
      >
        {tieneProgreso ? (
          <div
            className="h-full bg-gradient-to-r from-rose-600 via-rose-500 to-amber-400 transition-all duration-300 ease-out shadow-[0_0_12px_rgba(244,63,94,0.8)]"
            style={{ width: `${porcentaje}%` }}
          />
        ) : (
          <div className="h-full w-full relative">
            <div className="h-full bg-gradient-to-r from-rose-600 via-rose-400 to-amber-300 animate-progress-indeterminate w-full origin-left shadow-[0_0_12px_rgba(244,63,94,0.8)]" />
          </div>
        )}
      </div>

      {/* 2. Píldora flotante centrada con spinner y mensaje de acción */}
      <div className="flex justify-center pt-2.5 px-4">
        <div
          id="indicador-carga-flotante"
          className="pointer-events-auto flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-[#0f172a]/95 border border-rose-500/40 text-slate-100 text-xs font-medium shadow-2xl shadow-rose-950/40 backdrop-blur-md animate-in fade-in slide-in-from-top-2 duration-200"
        >
          <div className="relative flex items-center justify-center text-rose-400">
            <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
          </div>

          <span className="text-slate-200 font-semibold tracking-wide truncate max-w-[280px] sm:max-w-md">
            {loading.mensaje || 'Sincronizando datos...'}
          </span>

          {tieneProgreso && (
            <span className="px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono text-[10px] font-bold border border-rose-500/30">
              {porcentaje}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
