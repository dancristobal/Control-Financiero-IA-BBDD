import React from 'react';
import { AlertTriangle, Trash2, Database, HardDrive, LayoutDashboard, Loader2, X } from 'lucide-react';
import { Factura } from '../types';

interface EliminarFacturaModalProps {
  factura: Factura | null;
  isOpen: boolean;
  isDeleting: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const EliminarFacturaModal: React.FC<EliminarFacturaModalProps> = ({
  factura,
  isOpen,
  isDeleting,
  onConfirm,
  onCancel,
}) => {
  if (!isOpen || !factura) return null;

  return (
    <div
      id="modal-eliminar-factura-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div
        id="modal-eliminar-factura-container"
        className="relative w-full max-w-lg bg-[#0f172a] border border-rose-500/30 rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        {/* Header con acento de peligro */}
        <div className="p-5 border-b border-rose-500/20 bg-gradient-to-r from-rose-950/40 via-rose-900/20 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">
                ¿Eliminar esta factura definitivamente?
              </h3>
              <p className="text-xs text-rose-300/80">
                Confirmación de borrado coordinado en 3 niveles
              </p>
            </div>
          </div>
          <button
            onClick={onCancel}
            disabled={isDeleting}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cuerpo con datos de la factura */}
        <div className="p-5 space-y-4">
          {/* Ficha resumen de la factura seleccionada */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 space-y-2.5">
            <div className="flex items-center justify-between">
              <span className="font-mono text-xs font-semibold text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded border border-rose-500/20">
                {factura.idFactura}
              </span>
              <span className="text-base font-bold text-white">
                {factura.total.toLocaleString('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                })}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800/80">
              <div>
                <span className="text-slate-400 block text-[11px]">Proveedor:</span>
                <span className="font-semibold text-slate-200 truncate block">
                  {factura.nombreProveedor || factura.idProveedor}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[11px]">Fecha de emisión:</span>
                <span className="font-medium text-slate-300 block">
                  {factura.fechaEmision || 'Sin fecha'}
                </span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-400 block text-[11px]">Concepto:</span>
                <span className="text-slate-300 truncate block">
                  {factura.concepto || 'Sin concepto'}
                </span>
              </div>
            </div>
          </div>

          {/* Desglose de lo que se borrará */}
          <div className="space-y-2">
            <p className="text-[11px] font-semibold text-slate-300 uppercase tracking-wider">
              Acciones de borrado que se ejecutarán:
            </p>

            <div className="space-y-2 text-xs">
              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="mt-0.5 text-indigo-400">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-medium text-slate-200">1. Base de Datos MySQL / MariaDB (Single Source of Truth):</span>
                  <p className="text-[11px] text-slate-400">
                    Eliminación transaccional directa del registro en <strong className="text-slate-300">&quot;facturas&quot;</strong> y borrado en cascada de sus partidas y productos en <strong className="text-slate-300">&quot;lineas_factura&quot;</strong>.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="mt-0.5 text-amber-400">
                  <HardDrive className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-medium text-slate-200">2. Google Drive (Almacenamiento de Justificantes):</span>
                  <p className="text-[11px] text-slate-400">
                    Se localiza el recibo digital/PDF en la carpeta del proveedor en Google Drive y se envía a la papelera.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-2.5 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800">
                <div className="mt-0.5 text-blue-400">
                  <LayoutDashboard className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-medium text-slate-200">3. Panel de Control & Métricas:</span>
                  <p className="text-[11px] text-slate-400">
                    Se actualizan al instante en memoria los totales de gasto, previsiones de tesorería y alertas analíticas.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-[11px] text-rose-300 leading-relaxed">
            ⚠️ <strong>Atención:</strong> Esta acción no se puede deshacer. Se purgarán los registros de la factura de forma definitiva en la base de datos MySQL y su recibo en Google Drive.
          </div>
        </div>

        {/* Footer con botones de confirmación */}
        <div className="p-4 border-t border-slate-800 bg-[#0d131f] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors disabled:opacity-50 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-900/30 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Eliminando en todo el sistema...</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>Sí, Eliminar Factura</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
