import React, { useState, useEffect } from 'react';
import {
  CalendarCheck,
  Calendar,
  X,
  Check,
  CreditCard,
  Building2,
  FileText,
  Clock,
  Sparkles,
  ArrowRight
} from 'lucide-react';
import { Factura } from '../types';
import { formatMoneda } from '../utils/formatters';

interface ConfirmarPagoModalProps {
  isOpen: boolean;
  factura: Factura | null;
  onClose: () => void;
  onConfirmar: (idFactura: string, fechaPago: string) => Promise<void> | void;
}

export const ConfirmarPagoModal: React.FC<ConfirmarPagoModalProps> = ({
  isOpen,
  factura,
  onClose,
  onConfirmar,
}) => {
  const hoyStr = new Date().toISOString().split('T')[0];
  const [fechaPago, setFechaPago] = useState<string>(hoyStr);
  const [guardando, setGuardando] = useState<boolean>(false);

  // Inicializar la fecha de pago por defecto al día de hoy cada vez que se abra el modal
  useEffect(() => {
    if (isOpen) {
      setFechaPago(hoyStr);
      setGuardando(false);
    }
  }, [isOpen, hoyStr, factura]);

  if (!isOpen || !factura) return null;

  const handleConfirmar = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!fechaPago.trim()) {
      setFechaPago(hoyStr);
    }
    setGuardando(true);
    try {
      await onConfirmar(factura.idFactura, fechaPago.trim() || hoyStr);
      onClose();
    } catch (err) {
      console.error('Error al confirmar pago de factura:', err);
    } finally {
      setGuardando(false);
    }
  };

  // Fechas rápidas para conveniencia del usuario
  const ayerDate = new Date();
  ayerDate.setDate(ayerDate.getDate() - 1);
  const ayerStr = ayerDate.toISOString().split('T')[0];
  const fechaVencimientoFactura = factura.fechaVencimiento || factura.fechaEmision || '';

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-pago-titulo"
      >
        {/* Cabecera del Modal */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-[#111c30] to-[#0f172a]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shadow-md shadow-emerald-950/30">
              <CalendarCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 id="modal-pago-titulo" className="text-base font-bold text-slate-100 flex items-center gap-2">
                <span>Registrar Pago de Factura</span>
              </h3>
              <p className="text-xs text-slate-400">
                Selecciona la fecha efectiva en la que se realizó el pago
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={guardando}
            className="text-slate-400 hover:text-slate-200 p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
            title="Cancelar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleConfirmar} className="p-5 space-y-4">
          {/* Tarjeta Resumen de la Factura */}
          <div className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800/90 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] font-mono text-slate-400 block">Nº Factura</span>
                <span className="text-sm font-bold text-slate-200 font-mono truncate block">
                  {factura.idFactura}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 block">Total a Liquidar</span>
                <span className="text-base font-black text-emerald-400 font-mono block">
                  {formatMoneda(factura.total)} €
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1.5 text-xs text-slate-300 pt-1 border-t border-slate-800/70">
              <Building2 className="w-3.5 h-3.5 text-slate-500 shrink-0" />
              <span className="font-semibold truncate">{factura.nombreProveedor}</span>
            </div>

            {factura.concepto && (
              <p className="text-[11px] text-slate-400 truncate italic">
                {factura.concepto}
              </p>
            )}
          </div>

          {/* Campo de Fecha de Pago */}
          <div className="space-y-2">
            <label htmlFor="input-fecha-pago" className="text-xs font-semibold text-slate-200 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-4 h-4 text-emerald-400" />
                <span>Fecha de Pago Efectiva</span>
              </span>
              <span className="text-[10px] font-medium text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                Por defecto: Hoy
              </span>
            </label>

            <div className="relative">
              <input
                id="input-fecha-pago"
                type="date"
                required
                value={fechaPago}
                onChange={(e) => setFechaPago(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-emerald-500 text-slate-100 text-sm font-mono font-medium focus:outline-none transition-colors shadow-inner"
              />
            </div>

            {/* Accesos rápidos de fecha */}
            <div className="flex items-center gap-1.5 pt-1">
              <span className="text-[10px] text-slate-500">Atajos rápidos:</span>
              <button
                type="button"
                onClick={() => setFechaPago(hoyStr)}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  fechaPago === hoyStr
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                Hoy ({hoyStr})
              </button>

              <button
                type="button"
                onClick={() => setFechaPago(ayerStr)}
                className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                  fechaPago === ayerStr
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                }`}
              >
                Ayer
              </button>

              {fechaVencimientoFactura && (
                <button
                  type="button"
                  onClick={() => setFechaPago(fechaVencimientoFactura)}
                  className={`px-2 py-1 rounded-md text-[10px] font-semibold transition-all cursor-pointer ${
                    fechaPago === fechaVencimientoFactura
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                  title={`Usar fecha de vencimiento: ${fechaVencimientoFactura}`}
                >
                  Día Vencimiento
                </button>
              )}
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
              Esta fecha quedará registrada en el historial y en la base de datos MySQL como la fecha de liquidación bancaria del gasto.
            </p>
          </div>

          {/* Botones de Acción */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-800">
            <button
              type="button"
              disabled={guardando}
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="submit"
              disabled={guardando}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold tracking-wide shadow-lg shadow-emerald-950/40 transition-all cursor-pointer disabled:opacity-60"
            >
              {guardando ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Confirmar y Marcar como Pagada</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
