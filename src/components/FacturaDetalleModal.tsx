import React, { useState, useEffect } from 'react';
import { X, FileText, CheckCircle2, Calendar, Building2, Tag, Layers, Download, Trash2, Eye, UploadCloud, Loader2, Sparkles, Edit3, StickyNote } from 'lucide-react';
import { Factura } from '../types';
import { obtenerColorCategoria } from '../utils/categoriasGasto';
import { ConfirmarPagoModal } from './ConfirmarPagoModal';

interface FacturaDetalleModalProps {
  factura: Factura | null;
  onClose: () => void;
  onDelete?: (factura: Factura) => void;
  onAbrirVisor?: (factura: Factura) => void;
  onUploadToDrive?: (factura: Factura) => Promise<any> | void;
  onEditarEnFormulario?: (factura: Factura) => void;
  onActualizarEstado?: (factura: Factura, nuevoEstado: 'Pagada' | 'Pendiente' | 'Vencida', fechaPago?: string) => Promise<any> | void;
}

export const FacturaDetalleModal: React.FC<FacturaDetalleModalProps> = ({
  factura: facturaProp,
  onClose,
  onDelete,
  onAbrirVisor,
  onUploadToDrive,
  onEditarEnFormulario,
  onActualizarEstado,
}) => {
  const [facturaActual, setFacturaActual] = useState<Factura | null>(facturaProp);
  const [subiendoDrive, setSubiendoDrive] = useState(false);
  const [feedbackMensaje, setFeedbackMensaje] = useState<string | null>(null);
  const [mostrarModalPago, setMostrarModalPago] = useState<boolean>(false);

  // Sincronizar reactivamente cuando cambia la prop de la factura
  useEffect(() => {
    setFacturaActual(facturaProp);
  }, [facturaProp]);

  const factura = facturaActual || facturaProp;
  if (!factura) return null;

  const handleCambiarEstado = async (nuevo: 'Pagada' | 'Pendiente' | 'Vencida', fechaPagoManual?: string) => {
    if (!onActualizarEstado) return;
    if (nuevo === 'Pagada' && !fechaPagoManual) {
      setMostrarModalPago(true);
      return;
    }
    const fechaPagoFinal =
      nuevo === 'Pagada' ? (fechaPagoManual || new Date().toISOString().split('T')[0]) : 'Pendiente';

    // 1. Actualización reactiva instantánea para que la pantalla y los badges se refresquen de inmediato
    const facturaActualizada: Factura = {
      ...factura,
      estado: nuevo,
      fechaPago: fechaPagoFinal,
    };
    setFacturaActual(facturaActualizada);

    // 2. Persistir en MySQL y actualizar estado global de la app
    try {
      await onActualizarEstado(facturaActualizada, nuevo, fechaPagoFinal);
      setFeedbackMensaje(`¡Estado actualizado a "${nuevo}" con fecha ${fechaPagoFinal}!`);
    } catch {
      setFeedbackMensaje(`Estado actualizado a "${nuevo}".`);
    }
    setTimeout(() => setFeedbackMensaje(null), 3500);
  };

  const handleSubirDrive = async () => {
    if (!onUploadToDrive) return;
    setSubiendoDrive(true);
    try {
      await onUploadToDrive(factura);
    } finally {
      setSubiendoDrive(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-[#111c30]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-slate-100 font-mono">
                  {factura.idFactura}
                </h3>
                {onActualizarEstado ? (
                  <select
                    value={factura.estado}
                    onChange={(e) => {
                      const nuevo = e.target.value as 'Pagada' | 'Pendiente' | 'Vencida';
                      handleCambiarEstado(nuevo);
                    }}
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full cursor-pointer focus:outline-none transition-all ${
                      factura.estado === 'Pagada'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : factura.estado === 'Vencida'
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                        : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                    }`}
                    title="Haz clic para modificar el estado y persistir en MySQL"
                  >
                    <option value="Pagada" className="bg-[#0f172a] text-emerald-400">Pagada</option>
                    <option value="Pendiente" className="bg-[#0f172a] text-amber-400">Pendiente</option>
                    <option value="Vencida" className="bg-[#0f172a] text-rose-400">Vencida</option>
                  </select>
                ) : (
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      factura.estado === 'Pagada'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : factura.estado === 'Vencida'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                        : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                    }`}
                  >
                    {factura.estado}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {factura.nombreProveedor} • {factura.idProveedor}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6">
          {feedbackMensaje && (
            <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-500/50 text-emerald-200 text-xs flex items-center gap-2.5 shadow-md shadow-emerald-950/30 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-semibold">{feedbackMensaje}</span>
            </div>
          )}

          {/* Key Facts Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Fecha Emisión</span>
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-1">
                {factura.fechaEmision}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-500" />
                <span>Vencimiento</span>
              </div>
              <div className="text-sm font-semibold text-slate-200 mt-1">
                {factura.fechaVencimiento}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80">
              <div className="text-[11px] text-slate-400 flex items-center gap-1">
                <Tag className="w-3 h-3 text-slate-500" />
                <span>Categoría</span>
              </div>
              <div className="mt-1">
                {(() => {
                  const catColor = obtenerColorCategoria(factura.categoriaGasto);
                  return (
                    <span
                      className="px-2 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5"
                      style={{
                        backgroundColor: `${catColor}20`,
                        color: catColor,
                        border: `1px solid ${catColor}40`,
                      }}
                    >
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: catColor }} />
                      <span className="truncate">{factura.categoriaGasto}</span>
                    </span>
                  );
                })()}
              </div>
            </div>

            <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80">
              <div className="text-[11px] text-slate-400 flex items-center justify-between">
                <span className="flex items-center gap-1">
                  <Layers className="w-3 h-3 text-slate-500" />
                  <span>Estado de Pago</span>
                </span>
                {onActualizarEstado && (
                  <button
                    type="button"
                    onClick={() => {
                      const nuevo = factura.estado === 'Pagada' ? 'Pendiente' : 'Pagada';
                      handleCambiarEstado(nuevo);
                    }}
                    className="text-[10px] text-sky-400 hover:text-sky-300 underline cursor-pointer"
                  >
                    {factura.estado === 'Pagada' ? 'Marcar Pendiente' : 'Marcar Pagada'}
                  </button>
                )}
              </div>
              <div className="text-xs font-semibold text-slate-200 mt-1 truncate">
                {factura.estado === 'Pagada' ? `Pagada (${factura.fechaPago || 'Confirmado'})` : factura.estado}
              </div>
            </div>
          </div>

          {/* Concepto */}
          <div className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800/80">
            <div className="text-xs font-medium text-slate-400">Concepto general</div>
            <div className="text-sm font-medium text-slate-200 mt-0.5 leading-relaxed">
              {factura.concepto}
            </div>
          </div>

          {/* Notas o Recordatorios Específicos */}
          {factura.notas && factura.notas.trim() && (
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs">
              <StickyNote className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1 w-full">
                <div className="font-semibold text-amber-300 flex items-center justify-between">
                  <span>Notas o Recordatorios Específicos</span>
                  {onEditarEnFormulario && (
                    <button
                      type="button"
                      onClick={() => onEditarEnFormulario(factura)}
                      className="text-[11px] text-amber-400 hover:text-amber-300 underline font-normal flex items-center gap-1 cursor-pointer"
                    >
                      <Edit3 className="w-3 h-3" />
                      <span>Editar</span>
                    </button>
                  )}
                </div>
                <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {factura.notas}
                </p>
              </div>
            </div>
          )}

          {/* Categoría Propuesta por Gemini */}
          {factura.categoriaGastoJustificacion && (
            <div className="p-3 rounded-xl bg-gradient-to-r from-slate-900 to-slate-900/90 border border-amber-500/30 flex items-start gap-2.5 text-xs text-slate-300">
              <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                  <span>Categoría propuesta automáticamente por Gemini:</span>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                    {factura.categoriaGasto}
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                  {factura.categoriaGastoJustificacion}
                </p>
              </div>
            </div>
          )}

          {/* Product Lines Breakdown */}
          <div>
            <div className="flex items-center justify-between mb-2.5">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Líneas de Producto Extraídas por Gemini
              </h4>
              <span className="text-[11px] text-slate-400">
                {factura.lineas?.length || 0} referencias
              </span>
            </div>

            {factura.lineas && factura.lineas.length > 0 ? (
              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#111827] text-slate-400 border-b border-slate-800 font-semibold">
                    <tr>
                      <th className="p-3">Producto</th>
                      <th className="p-3 text-right">Cantidad</th>
                      <th className="p-3 text-right">Precio Unit.</th>
                      <th className="p-3 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 bg-[#0a0f18]">
                    {factura.lineas.map((lin, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30">
                        <td className="p-3 font-medium text-slate-200">
                          {lin.nombreProducto}
                        </td>
                        <td className="p-3 text-right text-slate-400 font-mono">
                          {lin.cantidad} {lin.unidad}
                        </td>
                        <td className="p-3 text-right text-slate-300 font-mono">
                          {lin.precioUnitario.toLocaleString('es-ES', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 3,
                          })}{' '}
                          €
                        </td>
                        <td className="p-3 text-right font-semibold text-slate-100 font-mono">
                          {lin.subtotal.toLocaleString('es-ES', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{' '}
                          €
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800 text-center text-xs text-slate-500">
                Factura registrada sin desglose por líneas de producto.
              </div>
            )}
          </div>

          {/* Financial Totals & Tax Box */}
          <div
            id="modal-totales-financieros"
            className="p-4 rounded-xl bg-gradient-to-br from-[#121c2e] to-[#0d1422] border border-slate-800 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between text-slate-400">
              <span>Base Imponible</span>
              <span className="font-mono font-medium text-slate-200">
                {factura.baseImponible.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span>IVA / Impuesto ({factura.tiposIVA})</span>
              <span className="font-mono font-medium text-sky-400">
                {(() => {
                  const rawStr = `+${factura.cuotaIVA.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}`;
                  return rawStr.replace(/^([+-])\s*([+-])/, '$2');
                })()}{' '}
                €
              </span>
            </div>

            {/* Recargo de Equivalencia si aplica */}
            {(factura?.aplicaRecargoEquivalencia && factura?.cuotaRecargoEquivalencia !== 0) && (
              <div className="flex items-center justify-between text-purple-400 bg-purple-950/20 px-2 py-1 rounded-lg border border-purple-800/40">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">Recargo Equivalencia</span>
                  {factura.tipoRecargoEquivalencia && (
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono">
                      {(factura?.cuotaRecargoEquivalencia ?? 0) > 0 ? '+' : ''}{factura.tipoRecargoEquivalencia}
                    </span>
                  )}
                </div>
                <span className="font-mono font-bold">
                  {(() => {
                    const rawStr = `${(factura?.cuotaRecargoEquivalencia ?? 0) > 0 ? '+' : ''}${(factura.cuotaRecargoEquivalencia || 0).toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`;
                    return rawStr.replace(/^([+-])\s*([+-])/, '$2');
                  })()}{' '}
                  €
                </span>
              </div>
            )}

            {/* Retención de IRPF si aplica */}
            {(factura?.aplicaRetencionIRPF && factura?.cuotaIRPF !== 0) && (
              <div className="flex items-center justify-between text-emerald-400 bg-emerald-950/20 px-2 py-1 rounded-lg border border-emerald-800/40">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">Retención IRPF a Cuenta</span>
                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold">
                    {(factura?.cuotaIRPF ?? 0) > 0 ? '-' : ''}{factura.porcentajeIRPF || 15}% ({factura.conceptoRetencionIRPF === 'ARRENDAMIENTO' ? 'Mod. 115 Alquiler' : factura.conceptoRetencionIRPF === 'AGRARIO' ? 'Mod. 111 Agrario' : 'Mod. 111 Profesional'})
                  </span>
                </div>
                <span className="font-mono font-bold">
                  {(() => {
                    const rawStr = `${(factura?.cuotaIRPF ?? 0) > 0 ? '-' : ''}${(factura.cuotaIRPF || 0).toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}`;
                    return rawStr.replace(/^([+-])\s*([+-])/, '$2');
                  })()}{' '}
                  €
                </span>
              </div>
            )}

            <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between text-sm">
              <div>
                <span className="font-bold text-slate-100">Total Líquido a Pagar</span>

                 {/*
                {(factura.aplicaRetencionIRPF || (factura.cuotaIRPF && factura.cuotaIRPF > 0)) && (
                  <div className="text-[10px] text-emerald-400 font-normal">
                    (Base + IVA - Retención IRPF)
                  </div>
                )}*/}

              {(factura?.aplicaRetencionIRPF && factura?.cuotaIRPF !== 0) && (
                <div className="text-[10px] text-emerald-400 font-normal">
                  (Base + IVA - Retención IRPF)
                </div>
              )}

              </div>
              <span className="font-bold text-rose-400 font-mono text-base">
                {factura.total.toLocaleString('es-ES', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}{' '}
                €
              </span>
            </div>
          </div>

          {/* Google Drive Archiving & Sheets Sync Metadata */}
          <div className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-2.5">
            <div className="flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-1.5 text-sky-400 font-semibold">
                <Layers className="w-3.5 h-3.5 text-sky-400" />
                <span>Almacenamiento en Google Drive</span>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-mono border ${
                  factura.driveGuardado
                    ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                    : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                }`}
              >
                {factura.driveGuardado
                  ? `Carpeta: ${factura.driveFolderName || factura.nombreProveedor}`
                  : 'No archivado en Drive'}
              </span>
            </div>

            <div className="text-xs text-slate-300 space-y-1">
              <div className="flex items-center justify-between text-[11px] text-slate-400">
                <span>Nombre destino en Drive:</span>
                <span className="font-mono text-slate-200 font-medium">
                  {factura.driveFileName || `${factura.idFactura} ${factura.fechaEmision}.pdf`}
                </span>
              </div>
              {(() => {
                const rutaDrive = String(factura.driveFileUrl || factura.archivoRuta || (factura as any).archivo_ruta || '').trim();
                const esUrl = Boolean(rutaDrive && (rutaDrive.startsWith('http://') || rutaDrive.startsWith('https://')));
                if (esUrl) {
                  return (
                    <div className="pt-1 flex items-center justify-end gap-2 text-xs">
                      {onAbrirVisor && (
                        <button
                          type="button"
                          onClick={() => onAbrirVisor(factura)}
                          className="px-2.5 py-1 rounded-lg bg-sky-500/20 text-sky-300 hover:bg-sky-500/30 border border-sky-500/30 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Ver en Visor Integrado</span>
                        </button>
                      )}
                      <a
                        href={rutaDrive}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sky-400 hover:text-sky-300 underline text-[11px] font-medium"
                      >
                        Abrir factura en Google Drive ↗
                      </a>
                    </div>
                  );
                }
                return null;
              })()}
              {!String(factura.driveFileUrl || factura.archivoRuta || (factura as any).archivo_ruta || '').trim() && (
                <div className="pt-2 space-y-2">
                  {factura.driveError && (
                    <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-[11px] text-amber-300">
                      <strong>Aviso Google Drive:</strong> {factura.driveError}
                    </div>
                  )}
                  <div className="flex items-center justify-end gap-2">
                    {onAbrirVisor && (
                      <button
                        type="button"
                        onClick={() => onAbrirVisor(factura)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 text-slate-300 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Ver documento digital</span>
                      </button>
                    )}
                    {factura.archivoBase64 && onUploadToDrive && (
                      <button
                        type="button"
                        onClick={handleSubirDrive}
                        disabled={subiendoDrive}
                        className="px-3 py-1 rounded-lg bg-sky-600/25 hover:bg-sky-600/40 text-sky-300 border border-sky-500/40 text-[11px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        {subiendoDrive ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                            <span>Subiendo a Drive...</span>
                          </>
                        ) : (
                          <>
                            <UploadCloud className="w-3.5 h-3.5 text-sky-400" />
                            <span>Archivar en Google Drive Ahora</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* MySQL DB-First Metadata */}
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <div className="flex items-center gap-1.5 text-emerald-400">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Persistida en MySQL (tabla &quot;facturas&quot;)</span>
            </div>
            <span className="text-slate-500 font-mono text-[10px]">
              {factura.archivoNombre || 'archivo_digital.pdf'}
            </span>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0d131f] flex items-center justify-between gap-2">
          {onDelete ? (
            <button
              onClick={() => {
                onDelete(factura);
              }}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Eliminar Factura</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            {onEditarEnFormulario && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onEditarEnFormulario(factura);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-950/40 cursor-pointer"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Editar en Formulario</span>
              </button>
            )}
            {onAbrirVisor && (
              <button
                type="button"
                onClick={() => onAbrirVisor(factura)}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/40 text-xs font-semibold transition-colors cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Abrir Visor PDF</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Modal para introducir fecha de pago al pasar a Pagada */}
      {mostrarModalPago && (
        <ConfirmarPagoModal
          isOpen={mostrarModalPago}
          factura={factura}
          onClose={() => setMostrarModalPago(false)}
          onConfirmar={async (id, fechaPagoSeleccionada) => {
            setMostrarModalPago(false);
            await handleCambiarEstado('Pagada', fechaPagoSeleccionada);
          }}
        />
      )}
    </div>
  );
};
