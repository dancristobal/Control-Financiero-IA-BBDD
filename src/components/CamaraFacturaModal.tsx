import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  X,
  RotateCcw,
  Check,
  SwitchCamera,
  Zap,
  ZapOff,
  AlertCircle,
  ScanLine,
  Sparkles,
  Upload
} from 'lucide-react';

interface CamaraFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapturaCompletada: (captura: {
    file: File;
    base64Data: string;
    nombre: string;
    autoProcesar?: boolean;
  }) => void;
}

export const CamaraFacturaModal: React.FC<CamaraFacturaModalProps> = ({
  isOpen,
  onClose,
  onCapturaCompletada,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const nativeInputRef = useRef<HTMLInputElement | null>(null);

  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [errorCamara, setErrorCamara] = useState<string | null>(null);
  const [iniciandoCamara, setIniciandoCamara] = useState(false);
  const [fotoCapturada, setFotoCapturada] = useState<{
    base64: string;
    file: File;
    ancho: number;
    alto: number;
    tamanoKb: number;
  } | null>(null);

  // Parar tracks de la cámara
  const detenerCamara = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => {
        try {
          t.stop();
        } catch (e) {
          console.warn('Error deteniendo track de cámara:', e);
        }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }, []);

  // Iniciar la cámara WebRTC
  const iniciarCamara = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setErrorCamara('Tu navegador o dispositivo no soporta acceso directo a la cámara WebRTC.');
      return;
    }

    detenerCamara();
    setIniciandoCamara(true);
    setErrorCamara(null);

    try {
      const constraints: MediaStreamConstraints = {
        audio: false,
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      // Comprobar si la pista soporta linterna/antorcha
      const videoTrack = stream.getVideoTracks()[0];
      if (videoTrack) {
        const capabilities: any = videoTrack.getCapabilities ? videoTrack.getCapabilities() : {};
        setHasTorch(Boolean(capabilities.torch));
      }
    } catch (err: any) {
      const isPermissionIssue =
        err?.name === 'NotAllowedError' ||
        err?.name === 'PermissionDeniedError' ||
        String(err?.message || '').toLowerCase().includes('permission') ||
        String(err?.message || '').toLowerCase().includes('dismissed') ||
        String(err?.message || '').toLowerCase().includes('denied');

      if (isPermissionIssue) {
        console.warn('Permiso de cámara no concedido o desestimado:', err?.message || err?.name);
        setErrorCamara('El permiso de cámara fue desestimado o denegado por el navegador. Puedes usar la cámara nativa de tu dispositivo mediante el botón a continuación:');
        return;
      }

      console.warn('Aviso al iniciar cámara con restricciones preferentes:', err?.message || err?.name);
      // Reintentar sin constraints específicos si falló por restricciones de resolución o orientación
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        });
        streamRef.current = fallbackStream;
        if (videoRef.current) {
          videoRef.current.srcObject = fallbackStream;
          await videoRef.current.play().catch(() => {});
        }
      } catch (fallbackErr: any) {
        console.warn('Aviso accediendo a cámara WebRTC:', fallbackErr?.message || fallbackErr?.name);
        if (
          fallbackErr?.name === 'NotAllowedError' ||
          fallbackErr?.name === 'PermissionDeniedError' ||
          String(fallbackErr?.message || '').toLowerCase().includes('permission') ||
          String(fallbackErr?.message || '').toLowerCase().includes('dismissed') ||
          String(fallbackErr?.message || '').toLowerCase().includes('denied')
        ) {
          setErrorCamara('El permiso de cámara fue desestimado o denegado por el navegador. Puedes usar la cámara nativa de tu dispositivo mediante el botón a continuación:');
        } else if (fallbackErr?.name === 'NotFoundError' || fallbackErr?.name === 'DevicesNotFoundError') {
          setErrorCamara('No se ha detectado ninguna cámara conectada en este dispositivo.');
        } else {
          setErrorCamara('No fue posible abrir la cámara en directo. Puedes utilizar la cámara nativa de tu dispositivo mediante el botón inferior:');
        }
      }
    } finally {
      setIniciandoCamara(false);
    }
  }, [facingMode, detenerCamara]);

  // Manejar apertura/cierre del modal
  useEffect(() => {
    if (isOpen) {
      setFotoCapturada(null);
      iniciarCamara();
    } else {
      detenerCamara();
      setFotoCapturada(null);
      setTorchOn(false);
    }

    return () => {
      detenerCamara();
    };
  }, [isOpen, iniciarCamara, detenerCamara]);

  // Alternar linterna/flash si está soportado
  const toggleTorch = async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (track && hasTorch) {
      try {
        const nuevoEstado = !torchOn;
        await (track as any).applyConstraints({
          advanced: [{ torch: nuevoEstado }],
        });
        setTorchOn(nuevoEstado);
      } catch (e) {
        console.warn('No se pudo activar la linterna:', e);
      }
    }
  };

  // Alternar entre cámara trasera y delantera
  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  // Convertir Base64 Data URL a File object
  const dataUrlToFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mime = arr[0].match(/:(.*?);/)![1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  };

  // Disparador de captura fotográfica
  const capturarFoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    const ancho = video.videoWidth || 1280;
    const alto = video.videoHeight || 720;

    const canvas = document.createElement('canvas');
    canvas.width = ancho;
    canvas.height = alto;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Si es cámara delantera, aplicar efecto espejo para fidelidad
    if (facingMode === 'user') {
      ctx.translate(ancho, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, ancho, alto);

    // Obtener base64 de alta resolución en formato JPEG
    const base64Data = canvas.toDataURL('image/jpeg', 0.92);
    const fechaTimestamp = new Date().toISOString().replace(/[:.]/g, '-').substring(0, 19);
    const nombreArchivo = `Factura_Camara_${fechaTimestamp}.jpg`;
    const file = dataUrlToFile(base64Data, nombreArchivo);
    const tamanoKb = Math.round(file.size / 1024);

    setFotoCapturada({
      base64: base64Data,
      file,
      ancho,
      alto,
      tamanoKb,
    });

    // Detener la cámara mientras revisa la foto para ahorrar batería y recursos
    detenerCamara();
  };

  // Reanudar la cámara si quiere repetir
  const reintentarCaptura = () => {
    setFotoCapturada(null);
    iniciarCamara();
  };

  // Aceptar la captura y pasarla al flujo de facturas
  const confirmarCaptura = (autoProcesar: boolean = false) => {
    if (!fotoCapturada) return;
    onCapturaCompletada({
      file: fotoCapturada.file,
      base64Data: fotoCapturada.base64,
      nombre: fotoCapturada.file.name,
      autoProcesar,
    });
    onClose();
  };

  // Manejar selección nativa de archivo o cámara móvil nativa
  const handleNativeCapture = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64Data = reader.result as string;
      const tamanoKb = Math.round(file.size / 1024);

      // Cargar dimensiones de la imagen
      const img = new Image();
      img.onload = () => {
        setFotoCapturada({
          base64: base64Data,
          file,
          ancho: img.width,
          alto: img.height,
          tamanoKb,
        });
        detenerCamara();
      };
      img.src = base64Data;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#111c30] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-sm sm:text-base flex items-center gap-2">
                <span>Capturar Factura con Cámara</span>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/30">
                  Gemini OCR
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                Digitaliza tickets y facturas físicas para extracción automática de datos e IVA
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Input invisible para cámara nativa o fallback */}
        <input
          ref={nativeInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleNativeCapture}
        />

        {/* Viewfinder or Preview Area */}
        <div
          id="camera-viewfinder-screen"
          style={{ backgroundColor: '#020617' }}
          className="relative flex-1 bg-black overflow-hidden min-h-[320px] sm:min-h-[420px] flex items-center justify-center"
        >
          {fotoCapturada ? (
            /* Vista previa de foto tomada */
            <div className="relative w-full h-full flex flex-col items-center justify-center bg-black/90 p-4">
              <img
                src={fotoCapturada.base64}
                alt="Factura capturada"
                className="max-h-[50vh] max-w-full rounded-xl object-contain shadow-2xl border border-slate-700/80"
              />
              <div className="mt-3 flex items-center gap-3 text-xs text-slate-300 bg-slate-900/90 border border-slate-800 px-3.5 py-1.5 rounded-full font-mono">
                <span className="text-emerald-400 font-bold">✓ Captura lista</span>
                <span>•</span>
                <span>{fotoCapturada.ancho} × {fotoCapturada.alto} px</span>
                <span>•</span>
                <span>{fotoCapturada.tamanoKb} KB</span>
                <span>•</span>
                <span className="text-rose-400 font-semibold">Base64 codificado</span>
              </div>
            </div>
          ) : errorCamara ? (
            /* Estado de Error o Sin Soporte WebRTC */
            <div className="p-8 text-center max-w-md mx-auto space-y-4 text-slate-300">
              <div className="w-14 h-14 rounded-2xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div>
                <h4 className="font-bold text-slate-100 text-sm mb-1">
                  Acceso a la cámara en directo
                </h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {errorCamara}
                </p>
              </div>
              <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
                <button
                  onClick={() => nativeInputRef.current?.click()}
                  className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/40"
                >
                  <Camera className="w-4 h-4" />
                  <span>Tomar Foto con Cámara Nativa</span>
                </button>
                <button
                  onClick={iniciarCamara}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reintentar Permiso</span>
                </button>
              </div>
            </div>
          ) : (
            /* Live Camera Viewfinder */
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />

              {iniciandoCamara && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-slate-200 gap-3">
                  <div className="w-8 h-8 border-2 border-rose-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">Iniciando cámara del dispositivo...</span>
                </div>
              )}

              {/* Guías ópticas para escanear facturas */}
              {!iniciandoCamara && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                  {/* Banner superior con consejo */}
                  <div className="bg-black/65 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-white text-[11px] font-medium flex items-center gap-2 shadow-lg">
                    <ScanLine className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                    <span>Encuadra la factura dentro del marco con buena luz</span>
                  </div>

                  {/* Rectángulo de escaneo con esquinas estilizadas */}
                  <div className="relative w-[85%] max-w-[480px] h-[65%] border-2 border-white/20 rounded-2xl flex items-center justify-center shadow-[0_0_0_9999px_rgba(0,0,0,0.45)]">
                    {/* Corner Brackets */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-rose-500 rounded-tl-xl" />
                    <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-rose-500 rounded-tr-xl" />
                    <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-rose-500 rounded-bl-xl" />
                    <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-rose-500 rounded-br-xl" />

                    {/* Línea sutil de escaneo animada */}
                    <div className="w-full h-0.5 bg-gradient-to-r from-transparent via-rose-500/80 to-transparent animate-pulse" />
                  </div>

                  {/* Controles flotantes en la vista de cámara */}
                  <div className="w-full flex items-center justify-between pointer-events-auto max-w-sm px-4">
                    {hasTorch ? (
                      <button
                        onClick={toggleTorch}
                        className={`p-2.5 rounded-full backdrop-blur-md border transition-colors cursor-pointer ${
                          torchOn
                            ? 'bg-amber-400 text-slate-950 border-amber-300 shadow-lg shadow-amber-400/40'
                            : 'bg-black/50 text-white border-white/20 hover:bg-black/70'
                        }`}
                        title="Activar Linterna"
                      >
                        {torchOn ? <Zap className="w-4 h-4" /> : <ZapOff className="w-4 h-4" />}
                      </button>
                    ) : <div className="w-9" />}

                    <button
                      onClick={switchCamera}
                      className="p-2.5 rounded-full bg-black/50 text-white border border-white/20 hover:bg-black/70 backdrop-blur-md transition-colors cursor-pointer"
                      title="Cambiar Cámara (Trasera / Delantera)"
                    >
                      <SwitchCamera className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer with Controls */}
        <div className="p-4 border-t border-slate-800 bg-[#0d131f] flex flex-col sm:flex-row items-center justify-between gap-3">
          {fotoCapturada ? (
            /* Botones de acción tras tomar la foto */
            <div className="w-full flex flex-col sm:flex-row items-center justify-between gap-3">
              <button
                onClick={reintentarCaptura}
                className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Repetir Foto</span>
              </button>

              <div className="w-full sm:w-auto flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  onClick={() => confirmarCaptura(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700 transition-colors flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 text-emerald-400" />
                  <span>Añadir a la Cola</span>
                </button>
                <button
                  onClick={() => confirmarCaptura(true)}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-950/40 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4" />
                  <span>Procesar con Gemini Ya</span>
                </button>
              </div>
            </div>
          ) : (
            /* Botón de captura cuando la cámara está activa */
            <div className="w-full flex items-center justify-between">
              <button
                onClick={() => nativeInputRef.current?.click()}
                className="text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer py-1"
                title="Tomar foto con app nativa o subir archivo"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Subir de galería / Cámara nativa</span>
              </button>

              {!errorCamara && (
                <div className="flex items-center gap-3">
                  <button
                    onClick={capturarFoto}
                    disabled={iniciandoCamara}
                    className="relative group p-1.5 rounded-full border-2 border-rose-500 bg-rose-500/20 hover:bg-rose-500/30 transition-all cursor-pointer disabled:opacity-50"
                  >
                    <div className="w-12 h-12 rounded-full bg-rose-600 group-hover:bg-rose-500 text-white flex items-center justify-center shadow-lg shadow-rose-950/50 transition-transform active:scale-95">
                      <Camera className="w-6 h-6" />
                    </div>
                  </button>
                </div>
              )}

              <button
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl text-slate-400 hover:text-slate-200 text-xs font-semibold hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
