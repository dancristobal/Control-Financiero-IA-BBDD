import React, { useState, useMemo, useEffect } from 'react';
import {
  X,
  FileText,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  RotateCw,
  Maximize2,
  Calendar,
  Building2,
  Tag,
  Layers,
  AlertCircle,
  FileSpreadsheet,
  Printer,
  CheckCircle2,
  Eye,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { Factura, DatosNegocio, DEFAULT_DATOS_NEGOCIO } from '../types';

interface VisorFacturaModalProps {
  factura: Factura | null;
  isOpen: boolean;
  onClose: () => void;
  onVerDetallesCompletos?: (factura: Factura) => void;
  datosNegocio?: DatosNegocio;
}

// Convert base64 data to Blob URL for clean browser/iframe rendering
function base64ToBlobUrl(base64Data: string, mimeType: string = 'application/pdf'): string | null {
  try {
    let cleanBase64 = base64Data;
    if (cleanBase64.includes(',')) {
      cleanBase64 = cleanBase64.split(',')[1];
    }
    // Clean any whitespace or newlines
    cleanBase64 = cleanBase64.replace(/\s/g, '');
    
    const byteCharacters = atob(cleanBase64);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.error('Error creating Blob URL from base64:', err);
    return null;
  }
}

export const VisorFacturaModal: React.FC<VisorFacturaModalProps> = ({
  factura,
  isOpen,
  onClose,
  onVerDetallesCompletos,
  datosNegocio,
}) => {
  const [zoom, setZoom] = useState<number>(100);
  const [rotacion, setRotacion] = useState<number>(0);
  const [pantallaCompleta, setPantallaCompleta] = useState<boolean>(false);
  // 'documento' (visor PDF/imagen), 'resumen' (representación contable formateada)
  const [vistaModo, setVistaModo] = useState<'documento' | 'resumen'>('documento');
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [iframeError, setIframeError] = useState<boolean>(false);

  // Obtener datos del negocio parametrizables (desde props o valores por defecto)
  const negocioActual = useMemo<DatosNegocio>(() => {
    if (datosNegocio && datosNegocio.nombre) return datosNegocio;
    return DEFAULT_DATOS_NEGOCIO;
  }, [datosNegocio]);

  // Generar Blob URL cuando cambie la factura o su base64
  useEffect(() => {
    setIframeError(false);
    if (!factura?.archivoBase64 || factura.archivoBase64.length < 30) {
      setBlobUrl(null);
      return;
    }

    const isPdf =
      factura.archivoBase64.startsWith('data:application/pdf') ||
      (factura.archivoNombre && factura.archivoNombre.toLowerCase().endsWith('.pdf')) ||
      !factura.archivoBase64.startsWith('data:image/');

    const mime = isPdf ? 'application/pdf' : 'image/jpeg';
    const url = base64ToBlobUrl(factura.archivoBase64, mime);
    setBlobUrl(url);

    return () => {
      if (url) {
        URL.revokeObjectURL(url);
      }
    };
  }, [factura?.archivoBase64, factura?.archivoNombre]);

  // Determinar URL de previsualización según Drive o Base64
  const previewData = useMemo(() => {
    if (!factura) {
      return {
        tipo: 'representacion_digital' as const,
        url: null,
        origen: 'digital' as const,
      };
    }

    // 1. Si tenemos URL de Google Drive válida, priorizar el visor integrado de Google Drive (evita bloqueos de Chrome con blobs grandes)
    if (factura.driveFileUrl && factura.driveFileUrl.startsWith('http')) {
      const driveUrl = factura.driveFileUrl;
      const matchId =
        driveUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
        driveUrl.match(/id=([a-zA-Z0-9_-]+)/);

      if (matchId && matchId[1]) {
        return {
          tipo: 'drive_embed' as const,
          url: `https://drive.google.com/file/d/${matchId[1]}/preview`,
          driveDirectUrl: driveUrl,
          origen: 'drive' as const,
        };
      }

      return {
        tipo: 'drive_embed' as const,
        url: driveUrl.includes('/preview')
          ? driveUrl
          : driveUrl.replace(/\/view(\?.*)?$/, '/preview'),
        driveDirectUrl: driveUrl,
        origen: 'drive' as const,
      };
    }

    // 2. Si tenemos base64 en la factura
    if (factura.archivoBase64 && factura.archivoBase64.length > 50) {
      const isPdf =
        factura.archivoBase64.startsWith('data:application/pdf') ||
        (factura.archivoNombre && factura.archivoNombre.toLowerCase().endsWith('.pdf')) ||
        !factura.archivoBase64.startsWith('data:image/');

      const isImg =
        factura.archivoBase64.startsWith('data:image/') ||
        (factura.archivoNombre &&
          /\.(jpg|jpeg|png|webp)$/i.test(factura.archivoNombre));

      let rawDataUrl = factura.archivoBase64;
      if (!rawDataUrl.startsWith('data:')) {
        rawDataUrl = isPdf
          ? `data:application/pdf;base64,${factura.archivoBase64}`
          : `data:image/jpeg;base64,${factura.archivoBase64}`;
      }

      return {
        tipo: isPdf ? ('pdf' as const) : isImg ? ('imagen' as const) : ('pdf' as const),
        url: blobUrl || rawDataUrl,
        rawDataUrl,
        origen: 'base64' as const,
      };
    }

    // 3. Fallback: No hay binario ni drive embed directo -> Representación contable digital
    return {
      tipo: 'representacion_digital' as const,
      url: null,
      origen: 'digital' as const,
    };
  }, [factura, blobUrl]);

  if (!isOpen || !factura) return null;

  const handleZoomIn = () => setZoom((prev) => Math.min(200, prev + 15));
  const handleZoomOut = () => setZoom((prev) => Math.max(50, prev - 15));
  const handleResetZoom = () => {
    setZoom(100);
    setRotacion(0);
  };
  const handleRotate = () => setRotacion((prev) => (prev + 90) % 360);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-2 sm:p-4 animate-in fade-in duration-200">
      <div
        className={`w-full bg-[#0a0f18] border border-slate-700/80 rounded-2xl shadow-2xl flex flex-col transition-all duration-200 overflow-hidden ${
          pantallaCompleta ? 'h-full max-h-[98vh] max-w-[98vw]' : 'h-[90vh] max-w-6xl'
        }`}
      >
        {/* Modal Header Bar */}
        <div className="px-4 py-3 bg-[#101726] border-b border-slate-800 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-sm sm:text-base font-bold text-slate-100 font-mono truncate">
                  {factura.idFactura}
                </h3>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    factura.estado === 'Pagada'
                      ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      : factura.estado === 'Vencida'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {factura.estado}
                </span>
                <span className="text-[11px] text-slate-400 font-mono hidden sm:inline-block">
                  {factura.archivoNombre || `${factura.idFactura}.pdf`}
                </span>
              </div>
              <p className="text-xs text-slate-400 truncate">
                {factura.nombreProveedor} • {factura.fechaEmision} •{' '}
                <strong className="text-rose-400 font-mono">
                  {factura.total.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}{' '}
                  €
                </strong>
              </p>
            </div>
          </div>

          {/* Action Tools and Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            {/* Selector de modo de vista */}
            <div className="flex items-center bg-[#070b12] border border-slate-800 rounded-xl p-0.5 text-xs font-semibold">
              <button
                onClick={() => setVistaModo('documento')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  vistaModo === 'documento'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title="Ver archivo original / PDF"
              >
                <FileText className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Documento</span>
              </button>
              <button
                onClick={() => setVistaModo('resumen')}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg transition-colors cursor-pointer ${
                  vistaModo === 'resumen'
                    ? 'bg-rose-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
                title="Ver representación contable estructurada"
              >
                <Eye className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Desglose</span>
              </button>
            </div>

            {/* Zoom Controls (para imágenes o representación) */}
            <div className="hidden md:flex items-center bg-[#070b12] border border-slate-800 rounded-xl p-0.5">
              <button
                onClick={handleZoomOut}
                disabled={zoom <= 50}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
                title="Reducir zoom"
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              <button
                onClick={handleResetZoom}
                className="px-2 text-[11px] font-mono font-medium text-slate-300 hover:text-white cursor-pointer"
                title="Restablecer tamaño"
              >
                {zoom}%
              </button>
              <button
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 transition-colors cursor-pointer"
                title="Aumentar zoom"
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              <button
                onClick={handleRotate}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors border-l border-slate-800 cursor-pointer"
                title="Girar 90°"
              >
                <RotateCw className="w-4 h-4" />
              </button>
            </div>

            {/* Alternar modo Pantalla Completa */}
            <button
              onClick={() => setPantallaCompleta(!pantallaCompleta)}
              className="p-2 rounded-xl border border-slate-800 bg-[#070b12] text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
              title={pantallaCompleta ? 'Salir de pantalla completa' : 'Pantalla completa'}
            >
              <Maximize2 className="w-4 h-4" />
            </button>

            {/* Enlace directo a Google Drive si existe */}
            {factura.driveFileUrl && (
              <a
                href={factura.driveFileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 text-xs font-semibold transition-colors"
                title="Abrir archivo original en Google Drive"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Google Drive</span>
              </a>
            )}

            {/* Botón Cerrar */}
            <button
              onClick={onClose}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors ml-1 cursor-pointer"
              title="Cerrar visor"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Content (Split Layout or Full Viewer) */}
        <div className="flex-1 overflow-hidden flex flex-col lg:flex-row bg-[#080d17]">
          {/* Left / Main: Document Preview Canvas */}
          <div className="flex-1 h-full overflow-auto p-3 sm:p-5 flex flex-col items-center justify-center relative bg-slate-950/60 border-b lg:border-b-0 lg:border-r border-slate-800/80">
            {vistaModo === 'documento' && previewData.tipo === 'drive_embed' && previewData.url && !iframeError ? (
              <div className="w-full h-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 relative flex flex-col">
                <iframe
                  src={previewData.url}
                  className="w-full h-full flex-1 border-0"
                  title={`Visor Google Drive - ${factura.idFactura}`}
                  allow="autoplay"
                  onError={() => setIframeError(true)}
                />
                <div className="px-3 py-2 bg-[#0d1524] border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-sky-400 font-medium">
                    <Layers className="w-3.5 h-3.5" />
                    Documento en Google Drive ({factura.driveFolderName || factura.nombreProveedor})
                  </span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIframeError(true)}
                      className="text-slate-400 hover:text-slate-200 text-[11px] underline"
                    >
                      ¿Problemas de visualización?
                    </button>
                    <a
                      href={factura.driveFileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-300 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Abrir en pestaña nueva <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                </div>
              </div>
            ) : (vistaModo === 'documento' && previewData.tipo === 'drive_embed' && iframeError) ? (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-4 bg-slate-900 rounded-xl border border-slate-800">
                <AlertCircle className="w-10 h-10 text-amber-400" />
                <div>
                  <h4 className="text-sm font-bold text-slate-100">Visor de Google Drive Protegido</h4>
                  <p className="text-xs text-slate-400 mt-1 max-w-md">
                    El navegador ha aplicado restricciones de seguridad (X-Frame-Options / CSP) para incrustar este documento directamente. Puedes abrirlo instantáneamente en Google Drive o consultar su desglose digital completo.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-3">
                  <a
                    href={factura.driveFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1.5 shadow-lg shadow-sky-950/40"
                  >
                    Abrir en Google Drive <ExternalLink className="w-4 h-4" />
                  </a>
                  <button
                    onClick={() => setVistaModo('resumen')}
                    className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                  >
                    Ver Desglose Digital Contable
                  </button>
                </div>
              </div>
            ) : vistaModo === 'documento' && previewData.tipo === 'pdf' && previewData.url && !iframeError ? (
              <div
                className="w-full h-full rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl transition-transform duration-150 origin-center relative flex flex-col"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotacion}deg)`,
                }}
              >
                {/* Fallback bar in case embedded PDF fails */}
                <div className="px-3 py-1.5 bg-[#0b101b] border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between z-10 shrink-0">
                  <span className="font-mono text-slate-300 truncate">
                    {factura.archivoNombre || `${factura.idFactura}.pdf`}
                  </span>
                  <div className="flex items-center gap-2">
                    <a
                      href={previewData.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 hover:underline flex items-center gap-1 text-[11px]"
                    >
                      Pestaña nueva <ExternalLink className="w-3 h-3" />
                    </a>
                    <button
                      onClick={() => setVistaModo('resumen')}
                      className="text-amber-400 hover:text-amber-300 hover:underline text-[11px] cursor-pointer"
                    >
                      Ver desglose
                    </button>
                  </div>
                </div>

                <object
                  data={previewData.url}
                  type="application/pdf"
                  className="w-full h-full flex-1 border-0"
                  onError={() => setIframeError(true)}
                >
                  <iframe
                    src={`${previewData.url}#toolbar=1&navpanes=0&scrollbar=1`}
                    className="w-full h-full border-0"
                    title={`Visor PDF - ${factura.idFactura}`}
                    onError={() => setIframeError(true)}
                  >
                    <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center text-slate-300 space-y-3">
                      <AlertCircle className="w-8 h-8 text-amber-400" />
                      <p className="text-sm">El navegador no permite mostrar el visor PDF integrado en este contexto.</p>
                      <div className="flex gap-2">
                        <a
                          href={previewData.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-xs font-semibold flex items-center gap-1"
                        >
                          Abrir PDF en pestaña <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                        <button
                          onClick={() => setVistaModo('resumen')}
                          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
                        >
                          Ver Desglose Digital
                        </button>
                      </div>
                    </div>
                  </iframe>
                </object>
              </div>
            ) : vistaModo === 'documento' && previewData.tipo === 'imagen' && previewData.url ? (
              <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                <img
                  src={previewData.url}
                  alt={`Comprobante ${factura.idFactura}`}
                  className="max-h-full max-w-full object-contain rounded-lg shadow-2xl transition-transform duration-150 origin-center"
                  style={{
                    transform: `scale(${zoom / 100}) rotate(${rotacion}deg)`,
                  }}
                />
              </div>
            ) : (
              /* Representación Digital Formal de Factura Extraída */
              <div
                className="w-full max-w-2xl bg-white text-slate-900 rounded-xl shadow-2xl p-6 sm:p-8 my-auto transition-transform duration-150 origin-top font-sans text-xs"
                style={{
                  transform: `scale(${zoom / 100}) rotate(${rotacion}deg)`,
                }}
              >
                {/* Cabecera de la Factura Impresa */}
                <div className="border-b-2 border-slate-900 pb-4 mb-4 flex flex-col sm:flex-row justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-widest text-rose-600">
                      Documento Digital Oficial
                    </span>
                    <h2 className="text-xl font-black tracking-tight text-slate-950 mt-0.5">
                      FACTURA COMERCIAL
                    </h2>
                    <p className="font-mono text-xs font-semibold text-slate-700 mt-1">
                      Nº: {factura.idFactura}
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      Fecha Emisión:{' '}
                      <strong className="text-slate-900">{factura.fechaEmision}</strong>
                    </p>
                    <p className="text-slate-600 text-[11px]">
                      Fecha Vencimiento:{' '}
                      <strong className="text-slate-900">{factura.fechaVencimiento}</strong>
                    </p>
                  </div>

                  <div className="text-right sm:max-w-xs">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      Emisor / Proveedor
                    </span>
                    <h4 className="text-sm font-bold text-slate-900">{factura.nombreProveedor}</h4>
                    <p className="text-[11px] font-mono text-slate-600">
                      CIF / NIF: {factura.idProveedor}
                    </p>
                    <p className="text-[11px] text-slate-500 mt-1">
                      Categoría: {factura.categoriaGasto}
                    </p>
                  </div>
                </div>

                {/* Receptor */}
                <div className="bg-slate-50 rounded-lg p-3 mb-4 border border-slate-200">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Cliente / Receptor
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {negocioActual.nombre}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {negocioActual.nif ? `NIF: ${negocioActual.nif}` : ''}
                    {negocioActual.nif && negocioActual.direccion ? ' • ' : ''}
                    {negocioActual.direccion || ''}
                  </p>
                </div>

                {/* Concepto General */}
                <div className="mb-4">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Concepto Principal
                  </span>
                  <p className="text-xs font-medium text-slate-800 mt-0.5 bg-slate-50 p-2.5 rounded border border-slate-200">
                    {factura.concepto}
                  </p>
                </div>

                {/* Categoría Propuesta por Gemini */}
                {factura.categoriaGastoJustificacion && (
                  <div className="mb-4 bg-amber-50 border border-amber-200/80 rounded-lg p-2.5 text-xs text-amber-900 flex items-start gap-2">
                    <Sparkles className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-amber-950 flex items-center gap-1.5">
                        <span>Categoría propuesta con IA:</span>
                        <span className="px-1.5 py-0.2 rounded bg-amber-200 text-amber-900 font-bold text-[10px]">
                          {factura.categoriaGasto}
                        </span>
                      </span>
                      <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                        {factura.categoriaGastoJustificacion}
                      </p>
                    </div>
                  </div>
                )}

                {/* Desglose de Líneas de Factura si existen */}
                {factura.lineas && factura.lineas.length > 0 ? (
                  <div className="mb-5 border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[10px] uppercase">
                        <tr>
                          <th className="p-2">Descripción</th>
                          <th className="p-2 text-right">Cant.</th>
                          <th className="p-2 text-right">Precio Ud.</th>
                          <th className="p-2 text-right">Subtotal</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {factura.lineas.map((linea, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-medium text-slate-900">
                              {linea.nombreProducto}
                            </td>
                            <td className="p-2 text-right font-mono text-slate-700">
                              {linea.cantidad} {linea.unidad || 'ud'}
                            </td>
                            <td className="p-2 text-right font-mono text-slate-700">
                              {linea.precioUnitario.toFixed(2)} €
                            </td>
                            <td className="p-2 text-right font-mono font-bold text-slate-900">
                              {linea.subtotal.toFixed(2)} €
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {/* Resumen Económico */}
                <div className="flex justify-end pt-2 border-t border-slate-200">
                  <div className="w-64 space-y-1.5 text-xs">
                    <div className="flex justify-between text-slate-600">
                      <span>Base Imponible:</span>
                      <span className="font-mono font-medium">
                        {factura.baseImponible.toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>IVA ({factura.tiposIVA}):</span>
                      <span className="font-mono font-medium text-sky-700">
                        +{factura.cuotaIVA.toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex justify-between text-base font-black text-slate-950 pt-2 border-t-2 border-slate-900">
                      <span>TOTAL FACTURA:</span>
                      <span className="font-mono text-rose-700">
                        {factura.total.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>

                {/* Pie de Certificación */}
                <div className="mt-6 pt-3 border-t border-slate-200 flex items-center justify-between text-[10px] text-slate-400">
                  <span>
                    Certificado de extracción con Google Gemini AI • {negocioActual.nombre}
                  </span>
                  <span className="font-mono text-emerald-600 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" />
                    Auditoría verificada
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Right: Quick Metadata and In-Depth Inspection Card */}
          <div className="w-full lg:w-80 shrink-0 bg-[#0d131f] border-t lg:border-t-0 lg:border-l border-slate-800/90 p-4 sm:p-5 flex flex-col justify-between overflow-y-auto space-y-5">
            <div className="space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Metadatos del Documento
                </span>
                <h4 className="text-sm font-bold text-slate-200 mt-1">
                  Resumen de Archivo y Registro
                </h4>
              </div>

              {/* Economic Overview */}
              <div className="p-3.5 rounded-xl bg-[#080c14] border border-slate-800 space-y-2 font-mono text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Base Imponible:</span>
                  <span className="text-slate-200 font-medium">
                    {factura.baseImponible.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    €
                  </span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>IVA ({factura.tiposIVA}):</span>
                  <span className="text-sky-400 font-medium">
                    +{factura.cuotaIVA.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    €
                  </span>
                </div>
                <div className="pt-2 border-t border-slate-800 flex justify-between text-sm font-bold">
                  <span className="text-slate-100">Total:</span>
                  <span className="text-rose-400">
                    {factura.total.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    €
                  </span>
                </div>
              </div>

              {/* Key Specs */}
              <div className="space-y-2.5 text-xs">
                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Emisión:
                  </span>
                  <span className="font-mono font-medium text-slate-200">{factura.fechaEmision}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    Vencimiento:
                  </span>
                  <span className="font-mono font-medium text-slate-200">{factura.fechaVencimiento}</span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    Proveedor:
                  </span>
                  <span className="font-medium text-slate-200 truncate max-w-[140px]" title={factura.nombreProveedor}>
                    {factura.nombreProveedor}
                  </span>
                </div>

                <div className="flex items-center justify-between text-slate-300">
                  <span className="text-slate-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-slate-500" />
                    Categoría:
                  </span>
                  <span className="px-2 py-0.5 rounded bg-slate-800 text-[10px] text-slate-200 border border-slate-700">
                    {factura.categoriaGasto}
                  </span>
                </div>
              </div>

              {/* Drive Storage Status */}
              <div className="p-3 rounded-xl bg-[#080c14] border border-slate-800 space-y-1.5">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-sky-400 font-semibold flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" />
                    Google Drive
                  </span>
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-mono border ${
                      factura.driveGuardado
                        ? 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                        : 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                    }`}
                  >
                    {factura.driveGuardado ? 'Archivado' : 'Local'}
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 truncate">
                  Carpeta: <span className="text-slate-200">{factura.driveFolderName || factura.nombreProveedor}</span>
                </p>
                {factura.driveFileUrl && (
                  <a
                    href={factura.driveFileUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-sky-400 hover:text-sky-300 underline flex items-center gap-1 pt-1"
                  >
                    Abrir en Google Drive <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="space-y-2 pt-3 border-t border-slate-800">
              {onVerDetallesCompletos && (
                <button
                  onClick={() => {
                    onClose();
                    onVerDetallesCompletos(factura);
                  }}
                  className="w-full py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" />
                  <span>Ver Auditoría Completa</span>
                </button>
              )}

              <button
                onClick={onClose}
                className="w-full py-2 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                Cerrar Visor
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
