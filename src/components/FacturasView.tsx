import React, { useState, useRef, useMemo, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Search,
  Filter,
  Eye,
  Trash2,
  RefreshCw,
  Plus,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  FileCheck,
  Check,
  X,
  FileSpreadsheet,
  Layers,
  Camera,
  CalendarRange,
  RotateCcw,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  Edit3,
  Download,
  StickyNote,
  Database
} from 'lucide-react';
import { Factura, ArchivoEnProceso, Proveedor, GoogleSheetsConfig, DatosNegocio, DEFAULT_DATOS_NEGOCIO, CategoriaGastoDef } from '../types';
import { obtenerParametrosSistema } from '../utils/parametrosSistema';
import { obtenerCategoriasGasto, obtenerColorCategoria } from '../utils/categoriasGasto';
import { FacturaDetalleModal } from './FacturaDetalleModal';
import { EliminarFacturaModal } from './EliminarFacturaModal';
import { VisorFacturaModal } from './VisorFacturaModal';
import { CamaraFacturaModal } from './CamaraFacturaModal';
import { FormularioFacturaModal } from './FormularioFacturaModal';

interface FacturasViewProps {
  facturas: Factura[];
  proveedores: Proveedor[];
  sheetsConfig: GoogleSheetsConfig;
  datosNegocio?: DatosNegocio;
  onSaveFactura: (
    factura: Factura,
    archivoInfo?: { base64Data?: string; fileName?: string; mimeType?: string }
  ) => Promise<{
    success: boolean;
    message?: string;
    facturaGuardada?: Factura;
    driveInfo?: any;
    driveGuardado?: boolean;
    driveError?: string;
  }>;
  onDeleteFactura?: (facturaOId: Factura | string) => Promise<any> | void;
  onOpenConfig: () => void;
  onSetGlobalLoading?: (loading: { activo: boolean; mensaje: string; progreso?: number }) => void;
  isGlobalLoading?: boolean;
  onUploadToDrive?: (factura: Factura) => Promise<any> | void;
  onActualizarEstadoFactura?: (
    idFactura: string,
    nuevoEstado: 'Pagada' | 'Pendiente' | 'Vencida',
    fechaPago?: string
  ) => Promise<any> | void;
}

export const FacturasView: React.FC<FacturasViewProps> = ({
  facturas,
  proveedores,
  sheetsConfig,
  datosNegocio,
  onSaveFactura,
  onDeleteFactura,
  onOpenConfig,
  onSetGlobalLoading,
  isGlobalLoading,
  onUploadToDrive,
  onActualizarEstadoFactura,
}) => {
  // File Upload State
  const [archivosEnCola, setArchivosEnCola] = useState<ArchivoEnProceso[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraDirectInputRef = useRef<HTMLInputElement>(null);

  // Duplicate Warning Modal State
  const [duplicadoEnConflicto, setDuplicadoEnConflicto] = useState<{
    archivo: ArchivoEnProceso;
    facturaExistente: Factura;
    facturaNueva: Factura;
  } | null>(null);

  // Selected Factura for Detail View
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);

  // Selected Factura for Integrated PDF/Document Viewer
  const [facturaParaVisor, setFacturaParaVisor] = useState<Factura | null>(null);

  // Deletion Confirmation Modal State
  const [facturaParaEliminar, setFacturaParaEliminar] = useState<Factura | null>(null);
  const [isDeletingFactura, setIsDeletingFactura] = useState(false);

  // Formulario Factura Inteligente (Modal)
  const [isFormularioOpen, setIsFormularioOpen] = useState(false);
  const [facturaParaFormulario, setFacturaParaFormulario] = useState<Partial<Factura> | null>(null);
  const [archivoParaFormulario, setArchivoParaFormulario] = useState<{
    base64Data?: string;
    fileName?: string;
    mimeType?: string;
  } | null>(null);

  const abrirFormularioConFactura = (
    factura?: Partial<Factura> | null,
    archivoInfo?: { base64Data?: string; fileName?: string; mimeType?: string } | null
  ) => {
    setFacturaParaFormulario(factura || null);
    setArchivoParaFormulario(archivoInfo || null);
    setIsFormularioOpen(true);
  };

  // Notification Toast
  const [notificacion, setNotificacion] = useState<string | null>(null);

  // Table Filters State
  const [busqueda, setBusqueda] = useState('');
  const [filtroProveedor, setFiltroProveedor] = useState('TODOS');
  const [filtroCategoria, setFiltroCategoria] = useState('TODAS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroIRPF, setFiltroIRPF] = useState<'TODOS' | 'CON_IRPF' | 'SIN_IRPF'>('TODOS');
  const [minImporte, setMinImporte] = useState('');
  const [maxImporte, setMaxImporte] = useState('');
  const [fechaDesde, setFechaDesde] = useState('');
  const [fechaHasta, setFechaHasta] = useState('');
  const [categoriasGasto, setCategoriasGasto] = useState<CategoriaGastoDef[]>(() =>
    obtenerCategoriasGasto()
  );

  // Parámetros activos del sistema
  const [parametrosActivos, setParametrosActivos] = useState(() => {
    try {
      return obtenerParametrosSistema();
    } catch {
      return {} as any;
    }
  });

  // Pagination State
  const [paginaActual, setPaginaActual] = useState(1);
  const [elementosPorPagina, setElementosPorPagina] = useState(() => {
    try {
      return obtenerParametrosSistema().facturasPorPagina || 10;
    } catch {
      return 10;
    }
  });

  // Sorting State
  const [sortField, setSortField] = useState<string>('fechaEmision');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortDirection(['fechaEmision', 'baseImponible', 'total', 'impuestos'].includes(field) ? 'desc' : 'asc');
    }
  };

  const renderSortIcon = (field: string) => {
    if (sortField === field) {
      return sortDirection === 'asc' ? (
        <ArrowUp className="w-3 h-3 text-rose-400" />
      ) : (
        <ArrowDown className="w-3 h-3 text-rose-400" />
      );
    }
    return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
  };

  // Sincronizar paginación y parámetros con cambios en los parámetros del sistema
  useEffect(() => {
    const handleParamsActualizados = (e: any) => {
      const nuevosParams = e?.detail || obtenerParametrosSistema();
      setParametrosActivos(nuevosParams);
      const nuevoLimite = nuevosParams?.facturasPorPagina;
      if (typeof nuevoLimite === 'number' && nuevoLimite > 0) {
        setElementosPorPagina(nuevoLimite);
      }
    };
    const handleCategoriasActualizadas = (e: any) => {
      setCategoriasGasto(e?.detail || obtenerCategoriasGasto());
    };
    window.addEventListener('fa_parametros_sistema_updated', handleParamsActualizados);
    window.addEventListener('categoriasGastoActualizadas', handleCategoriasActualizadas);
    return () => {
      window.removeEventListener('fa_parametros_sistema_updated', handleParamsActualizados);
      window.removeEventListener('categoriasGastoActualizadas', handleCategoriasActualizadas);
    };
  }, []);

  // Helper para normalizar cualquier fecha a formato estándar YYYY-MM-DD para comparaciones precisas
  const normalizarFecha = (fechaStr?: string): string => {
    if (!fechaStr) return '';
    const limpia = fechaStr.trim();
    // Formato YYYY-MM-DD o ISO con hora
    if (/^\d{4}-\d{2}-\d{2}/.test(limpia)) {
      return limpia.substring(0, 10);
    }
    // Formato DD/MM/YYYY o DD-MM-YYYY
    const partesDmy = limpia.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
    if (partesDmy) {
      const dia = partesDmy[1].padStart(2, '0');
      const mes = partesDmy[2].padStart(2, '0');
      const anio = partesDmy[3];
      return `${anio}-${mes}-${dia}`;
    }
    // Intento con objeto Date
    const d = new Date(limpia);
    if (!isNaN(d.getTime())) {
      return d.toISOString().substring(0, 10);
    }
    return limpia;
  };

  // Auto-reset page when any filter criteria or page size changes
  useEffect(() => {
    setPaginaActual(1);
  }, [
    busqueda,
    filtroProveedor,
    filtroCategoria,
    filtroEstado,
    minImporte,
    maxImporte,
    fechaDesde,
    fechaHasta,
    elementosPorPagina,
  ]);

  // Helper para generar números de página con elipsis inteligente
  const obtenerNumerosPagina = (actual: number, total: number): (number | string)[] => {
    if (total <= 7) {
      return Array.from({ length: total }, (_, i) => i + 1);
    }
    if (actual <= 4) {
      return [1, 2, 3, 4, 5, '...', total];
    }
    if (actual >= total - 3) {
      return [1, '...', total - 4, total - 3, total - 2, total - 1, total];
    }
    return [1, '...', actual - 1, actual, actual + 1, '...', total];
  };

  // Helper to show notification
  const showNotification = (msg: string) => {
    setNotificacion(msg);
    setTimeout(() => setNotificacion(null), 4000);
  };

  // Helper to reliably read file to base64
  const leerArchivoBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Manejador para facturas físicas capturadas mediante la cámara
  const handleCapturaCamara = (captura: {
    file: File;
    base64Data: string;
    nombre: string;
    autoProcesar?: boolean;
  }) => {
    const nuevoArchivo: ArchivoEnProceso = {
      id: `FILE-CAM-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nombre: captura.nombre,
      tamano: captura.file.size,
      tipo: 'image/jpeg',
      estado: 'esperando',
      progreso: 0,
      rawFile: captura.file,
      base64Data: captura.base64Data,
    };

    setArchivosEnCola((prev) => [...prev, nuevoArchivo]);
    showNotification('Factura capturada con cámara y convertida a base64 correctamente.');

    if (captura.autoProcesar) {
      setTimeout(() => {
        procesarColaArchivos([nuevoArchivo]);
      }, 150);
    }
  };

  // Multiple File Selection / Drop handler
  const handleArchivosSeleccionados = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;

    const nuevosArchivos: ArchivoEnProceso[] = Array.from(fileList).map((file) => ({
      id: `FILE-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      nombre: file.name,
      tamano: file.size,
      tipo: file.type || 'application/pdf',
      estado: 'esperando',
      progreso: 0,
      rawFile: file,
    }));

    setArchivosEnCola((prev) => [...prev, ...nuevosArchivos]);

    // Read base64 proactively and update state
    Array.from(fileList).forEach(async (file, index) => {
      const targetArchivoId = nuevosArchivos[index].id;
      try {
        const base64 = await leerArchivoBase64(file);
        setArchivosEnCola((prev) =>
          prev.map((a) => (a.id === targetArchivoId ? { ...a, base64Data: base64 } : a))
        );
      } catch (e) {
        console.warn('Error leyendo archivo a base64:', e);
      }
    });
  };

  // Trigger processing of queued files with Gemini
  const procesarColaArchivos = async (archivosEspecificos?: ArchivoEnProceso[]) => {
    const pendientes = archivosEspecificos && archivosEspecificos.length > 0
      ? archivosEspecificos
      : archivosEnCola.filter((a) => a.estado === 'esperando');
    if (pendientes.length === 0) return;

    setIsProcessing(true);
    onSetGlobalLoading?.({
      activo: true,
      mensaje: `Iniciando procesamiento de ${pendientes.length} ${pendientes.length === 1 ? 'factura' : 'facturas'}...`,
      progreso: 5,
    });

    try {
      for (let i = 0; i < pendientes.length; i++) {
        const archivo = pendientes[i];
        const basePct = Math.round((i / pendientes.length) * 100);

        onSetGlobalLoading?.({
          activo: true,
          mensaje: `Extrayendo datos de "${archivo.nombre}" con Gemini AI (${i + 1}/${pendientes.length})...`,
          progreso: Math.max(5, basePct),
        });

        // Update state to processing
        setArchivosEnCola((prev) =>
          prev.map((a) => (a.id === archivo.id ? { ...a, estado: 'procesando', progreso: 35 } : a))
        );

        try {
          // Asegurar base64Data disponible antes de enviar a Gemini y Drive
          let base64Activo = archivo.base64Data;
          if ((!base64Activo || base64Activo.length < 50) && archivo.rawFile) {
            try {
              base64Activo = await leerArchivoBase64(archivo.rawFile);
              setArchivosEnCola((prev) =>
                prev.map((a) => (a.id === archivo.id ? { ...a, base64Data: base64Activo } : a))
              );
            } catch (rErr) {
              console.error('No se pudo convertir el archivo a base64:', rErr);
            }
          }

          const resolvedNegocio: DatosNegocio = {
            ...DEFAULT_DATOS_NEGOCIO,
            ...datosNegocio,
            sector: datosNegocio?.sector || DEFAULT_DATOS_NEGOCIO.sector,
            contextoOperativo: datosNegocio?.contextoOperativo || DEFAULT_DATOS_NEGOCIO.contextoOperativo,
          };

          // Call backend server API with Gemini
          const response = await fetch('/api/gemini/extract-invoice', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fileData: base64Activo,
              mimeType: archivo.tipo,
              fileName: archivo.nombre,
              nombreNegocio: resolvedNegocio.nombre,
              datosNegocio: resolvedNegocio,
              sector: resolvedNegocio.sector,
              contextoOperativo: resolvedNegocio.contextoOperativo,
              existingSuppliers: proveedores.map((p) => ({
                id: p.idProveedor,
                nombre: p.nombreProveedor,
              })),
            }),
          });

          const data = await response.json().catch(() => ({}));

          if (!response.ok || !data.factura) {
            const errorMsg = data.error || 'Error al procesar la factura con Gemini AI';
            const detailMsg = data.detail ? ` (${data.detail})` : '';
            throw new Error(`${errorMsg}${detailMsg}`);
          }

          const facturaExtraida: Factura = {
            ...data.factura,
            archivoNombre: archivo.nombre,
            archivoBase64: base64Activo || undefined,
          };

          // Comprobación de duplicados:
          // mismo ID Factura + mismo proveedor + mismo importe total
          const duplicadoExacto = facturas.find(
            (f) =>
              f.idFactura.toLowerCase() === facturaExtraida.idFactura.toLowerCase() ||
              (f.nombreProveedor.toLowerCase() === facturaExtraida.nombreProveedor.toLowerCase() &&
                Math.abs(f.total - facturaExtraida.total) < 0.05)
          );

          if (duplicadoExacto) {
            // Detected duplicate! NO guardar automáticamente. Mostrar alerta roja.
            setArchivosEnCola((prev) =>
              prev.map((a) =>
                a.id === archivo.id
                  ? {
                      ...a,
                      estado: 'duplicado',
                      progreso: 100,
                      datosExtraidos: facturaExtraida,
                      duplicadoCon: duplicadoExacto,
                      mensaje: 'POSIBLE FACTURA DUPLICADA detectada',
                    }
                  : a
              )
            );

            // Open duplicate review dialog
            setDuplicadoEnConflicto({
              archivo,
              facturaExistente: duplicadoExacto,
              facturaNueva: facturaExtraida,
            });
          } else {
            // Guardar automáticamente en MySQL y en Google Drive en carpeta del proveedor
            onSetGlobalLoading?.({
              activo: true,
              mensaje: `Guardando "${facturaExtraida.idFactura}" en MySQL y Drive (${i + 1}/${pendientes.length})...`,
              progreso: Math.min(95, Math.round(((i + 0.6) / pendientes.length) * 100)),
            });

            const saveRes = await onSaveFactura(facturaExtraida, {
              base64Data: base64Activo,
              fileName: archivo.nombre,
              mimeType: archivo.tipo,
            });

            const isDriveGuardado = saveRes?.driveGuardado;
            const driveErrorMsg = saveRes?.driveError;

            const driveInfoRes = saveRes?.driveInfo || {
              carpetaProveedor: facturaExtraida.nombreProveedor,
              nombreArchivo: `${facturaExtraida.idFactura} ${facturaExtraida.fechaEmision}.pdf`,
              error: driveErrorMsg,
            };

            setArchivosEnCola((prev) =>
              prev.map((a) =>
                a.id === archivo.id
                  ? {
                      ...a,
                      estado: 'procesado',
                      progreso: 100,
                      datosExtraidos: saveRes?.facturaGuardada || facturaExtraida,
                      driveInfo: driveInfoRes,
                      mensaje: isDriveGuardado
                        ? `Archivada en Drive: ${driveInfoRes.carpetaProveedor} / ${driveInfoRes.nombreArchivo}`
                        : driveErrorMsg
                        ? `Aviso Drive: ${driveErrorMsg}`
                        : `Guardada localmente`,
                    }
                  : a
              )
            );

            if (isDriveGuardado) {
              showNotification(
                `Factura ${facturaExtraida.idFactura} archivada en Google Drive (Carpeta "${driveInfoRes.carpetaProveedor}")`
              );
            } else if (driveErrorMsg) {
              showNotification(
                `Factura ${facturaExtraida.idFactura} registrada (Aviso Drive: ${driveErrorMsg})`
              );
            } else {
              showNotification(`Factura ${facturaExtraida.idFactura} registrada con éxito`);
            }
          }
        } catch (err: any) {
          console.error('Error al procesar archivo:', err);
          setArchivosEnCola((prev) =>
            prev.map((a) =>
              a.id === archivo.id
                ? {
                    ...a,
                    estado: 'error',
                    progreso: 0,
                    mensaje: err?.message || 'Error en análisis Gemini',
                  }
                : a
            )
          );
        }
      }
    } finally {
      setIsProcessing(false);
      onSetGlobalLoading?.({ activo: false, mensaje: '' });
    }
  };

  // Cargar Lote de Demostración (5 facturas reales)
  const cargarLoteDemostracion = () => {
    const lotesDemo: ArchivoEnProceso[] = [
      {
        id: `DEMO-${Date.now()}-1`,
        nombre: 'FAC_2026_105_HarinasSur_Setiembre.pdf',
        tamano: 245000,
        tipo: 'application/pdf',
        estado: 'esperando',
        progreso: 0,
      },
      {
        id: `DEMO-${Date.now()}-2`,
        nombre: 'FAC_2026_112_LacteosCantabria_Nata.pdf',
        tamano: 310000,
        tipo: 'application/pdf',
        estado: 'esperando',
        progreso: 0,
      },
      {
        id: `DEMO-${Date.now()}-3`,
        nombre: 'FAC_2026_118_PackagingKraft_Bobinas.pdf',
        tamano: 180000,
        tipo: 'application/pdf',
        estado: 'esperando',
        progreso: 0,
      },
      {
        id: `DEMO-${Date.now()}-4`,
        nombre: 'FAC-2026-081_DuplicadaPrueba.pdf', // Proposito de prueba de duplicado
        tamano: 220000,
        tipo: 'application/pdf',
        estado: 'esperando',
        progreso: 0,
      },
      {
        id: `DEMO-${Date.now()}-5`,
        nombre: 'FAC_2026_124_VainillasEsencias_Polvo.pdf',
        tamano: 195000,
        tipo: 'application/pdf',
        estado: 'esperando',
        progreso: 0,
      },
    ];

    setArchivosEnCola((prev) => [...prev, ...lotesDemo]);
    showNotification('5 facturas de prueba añadidas a la cola. Pulsa "PROCESAR CON GEMINI" para extraerlas.');
  };

  // Actions on duplicate conflict
  const handleGuardarDeTodasFormas = async () => {
    if (!duplicadoEnConflicto) return;
    onSetGlobalLoading?.({
      activo: true,
      mensaje: `Guardando factura confirmada ${duplicadoEnConflicto.facturaNueva.idFactura} en MySQL y Drive...`,
    });
    try {
      await onSaveFactura(duplicadoEnConflicto.facturaNueva, {
        base64Data: duplicadoEnConflicto.archivo.base64Data,
        fileName: duplicadoEnConflicto.archivo.nombre,
        mimeType: duplicadoEnConflicto.archivo.tipo,
      });
      setArchivosEnCola((prev) =>
        prev.map((a) =>
          a.id === duplicadoEnConflicto.archivo.id
            ? { ...a, estado: 'procesado', mensaje: 'Guardada en MySQL y archivada en Drive tras confirmación' }
            : a
        )
      );
      showNotification(`Factura ${duplicadoEnConflicto.facturaNueva.idFactura} guardada en MySQL y Drive con confirmación.`);
      setDuplicadoEnConflicto(null);
    } finally {
      onSetGlobalLoading?.({ activo: false, mensaje: '' });
    }
  };

  const handleIgnorarDuplicado = () => {
    if (!duplicadoEnConflicto) return;
    setArchivosEnCola((prev) =>
      prev.map((a) =>
        a.id === duplicadoEnConflicto.archivo.id
          ? { ...a, estado: 'duplicado', mensaje: 'Duplicado omitido por el usuario' }
          : a
      )
    );
    setDuplicadoEnConflicto(null);
  };

  const handleRevisarDuplicado = () => {
    if (!duplicadoEnConflicto) return;
    setFacturaSeleccionada(duplicadoEnConflicto.facturaExistente);
  };

  // Progress Stats
  const totalArchivos = archivosEnCola.length;
  const procesadosCount = archivosEnCola.filter((a) => a.estado === 'procesado').length;
  const procesandoCount = archivosEnCola.filter((a) => a.estado === 'procesando').length;
  const duplicadosCount = archivosEnCola.filter((a) => a.estado === 'duplicado').length;
  const erroresCount = archivosEnCola.filter((a) => a.estado === 'error').length;
  const esperandoCount = archivosEnCola.filter((a) => a.estado === 'esperando').length;

  // Filtered & Sorted Invoices for Table
  const facturasFiltradas = useMemo(() => {
    const filtradas = facturas.filter((f) => {
      // Search text
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const match =
          f.idFactura.toLowerCase().includes(q) ||
          f.nombreProveedor.toLowerCase().includes(q) ||
          f.concepto.toLowerCase().includes(q) ||
          f.categoriaGasto.toLowerCase().includes(q) ||
          Boolean(f.notas && f.notas.toLowerCase().includes(q));
        if (!match) return false;
      }
      // Proveedor filter
      if (filtroProveedor !== 'TODOS' && f.idProveedor !== filtroProveedor) {
        return false;
      }
      // Categoria filter
      if (filtroCategoria !== 'TODAS' && f.categoriaGasto !== filtroCategoria) {
        return false;
      }
      // Estado filter
      if (filtroEstado !== 'TODOS' && f.estado !== filtroEstado) {
        return false;
      }
      // IRPF Withholding filter
      if (filtroIRPF === 'CON_IRPF' && !(f?.aplicaRetencionIRPF && (f?.cuotaIRPF ?? 0) !== 0)) {
        return false;
      }
      if (filtroIRPF === 'SIN_IRPF' && (f?.aplicaRetencionIRPF && (f?.cuotaIRPF ?? 0) !== 0)) {
        return false;
      }
      // Rango económico
      if (minImporte && f.total < parseFloat(minImporte)) {
        return false;
      }
      if (maxImporte && f.total > parseFloat(maxImporte)) {
        return false;
      }

      // Filtro dinámico por rango de fechas (selector desde - hasta)
      if (fechaDesde || fechaHasta) {
        const fechaNorm = normalizarFecha(f.fechaEmision);
        if (fechaNorm) {
          if (fechaDesde && fechaNorm < fechaDesde) {
            return false;
          }
          if (fechaHasta && fechaNorm > fechaHasta) {
            return false;
          }
        }
      }

      return true;
    });

    return filtradas.sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';

      if (sortField === 'idFactura') {
        aVal = a.idFactura || '';
        bVal = b.idFactura || '';
      } else if (sortField === 'fechaEmision') {
        aVal = a.fechaEmision || '';
        bVal = b.fechaEmision || '';
      } else if (sortField === 'nombreProveedor') {
        aVal = a.nombreProveedor || '';
        bVal = b.nombreProveedor || '';
      } else if (sortField === 'concepto') {
        aVal = a.concepto || '';
        bVal = b.concepto || '';
      } else if (sortField === 'baseImponible') {
        aVal = a.baseImponible || 0;
        bVal = b.baseImponible || 0;
      } else if (sortField === 'impuestos') {
        aVal = (a.cuotaIVA || 0) + (a.cuotaRecargoEquivalencia || 0) + (a.cuotaIRPF || 0);
        bVal = (b.cuotaIVA || 0) + (b.cuotaRecargoEquivalencia || 0) + (b.cuotaIRPF || 0);
      } else if (sortField === 'total') {
        aVal = a.total || 0;
        bVal = b.total || 0;
      } else if (sortField === 'categoriaGasto') {
        aVal = a.categoriaGasto || '';
        bVal = b.categoriaGasto || '';
      }

      if (typeof aVal === 'string') {
        const cmp = aVal.localeCompare(bVal);
        return sortDirection === 'asc' ? cmp : -cmp;
      } else {
        const cmp = aVal - bVal;
        return sortDirection === 'asc' ? cmp : -cmp;
      }
    });
  }, [facturas, busqueda, filtroProveedor, filtroCategoria, filtroEstado, filtroIRPF, minImporte, maxImporte, fechaDesde, fechaHasta, sortField, sortDirection]);

  // Pagination Calculations
  const totalElementos = facturasFiltradas.length;
  const totalPaginas = Math.max(1, Math.ceil(totalElementos / elementosPorPagina));
  const paginaSegura = Math.min(Math.max(1, paginaActual), totalPaginas);
  const indiceInicio = (paginaSegura - 1) * elementosPorPagina;
  const indiceFin = Math.min(indiceInicio + elementosPorPagina, totalElementos);

  // Paginated Invoices Slice
  const facturasPaginadas = useMemo(() => {
    return facturasFiltradas.slice(indiceInicio, indiceFin);
  }, [facturasFiltradas, indiceInicio, indiceFin]);

  // Exportar facturas filtradas/visibles a archivo CSV descargable
  const exportarFacturasCSV = () => {
    if (facturasFiltradas.length === 0) {
      showNotification('No hay facturas visibles para exportar con los filtros actuales.');
      return;
    }

    const encabezados = [
      'ID Factura',
      'Fecha Emisión',
      'ID Proveedor',
      'Nombre Proveedor',
      'CIF Proveedor',
      'Concepto',
      'Base Imponible (€)',
      'Tipos IVA (%)',
      'Cuota IVA (€)',
      'Aplica Recargo Eq.',
      'Tipo Recargo (%)',
      'Cuota Recargo (€)',
      'Retención IRPF (%)',
      'Cuota Retenida IRPF (€)',
      'Concepto Retención IRPF',
      'Total Líquido (€)',
      'Categoría Gasto',
      'Método de Pago',
      'Estado',
      'Enlace Google Drive',
      'Carpeta Drive',
      'Notas / Observaciones'
    ];

    const escapeCSV = (val: string | number | null | undefined): string => {
      if (val === null || val === undefined) return '""';
      const str = String(val).replace(/"/g, '""');
      return `"${str}"`;
    };

    const filas = facturasFiltradas.map((f) => [
      escapeCSV(f.idFactura),
      escapeCSV(f.fechaEmision),
      escapeCSV(f.idProveedor),
      escapeCSV(f.nombreProveedor),
      escapeCSV((f as any).cifProveedor || (f as any).cif || ''),
      escapeCSV(f.concepto),
      escapeCSV(Number(f.baseImponible || 0).toFixed(2).replace('.', ',')),
      escapeCSV(f.tiposIVA || '21%'),
      escapeCSV(Number(f.cuotaIVA || 0).toFixed(2).replace('.', ',')),
      escapeCSV(f.aplicaRecargoEquivalencia ? 'SÍ' : 'NO'),
      escapeCSV(f.aplicaRecargoEquivalencia ? (f.tipoRecargoEquivalencia || '5.2%') : '0%'),
      escapeCSV(Number(f.cuotaRecargoEquivalencia || 0).toFixed(2).replace('.', ',')),
      escapeCSV(f?.aplicaRetencionIRPF && (f?.cuotaIRPF ?? 0) !== 0 ? `${f.porcentajeIRPF || 15}%` : '0%'),
      escapeCSV(Number(f.cuotaIRPF || 0).toFixed(2).replace('.', ',')),
      escapeCSV(f.conceptoRetencionIRPF || (f?.aplicaRetencionIRPF && (f?.cuotaIRPF ?? 0) !== 0 ? 'PROFESIONAL' : '')),
      escapeCSV(Number(f.total || 0).toFixed(2).replace('.', ',')),
      escapeCSV(f.categoriaGasto),
      escapeCSV((f as any).metodoPago || ''),
      escapeCSV(f.estado),
      escapeCSV(f.driveFileUrl || f.archivoRuta || (f as any).archivo_ruta || ''),
      escapeCSV(f.driveFolderName || ''),
      escapeCSV((f as any).notas || (f as any).observaciones || '')
    ].join(';'));

    // UTF-8 BOM (\uFEFF) para compatibilidad nativa inmediata con Excel / Numbers / Calc en español
    const csvContent = '\uFEFF' + [encabezados.map((h) => `"${h}"`).join(';'), ...filas].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);

    const fechaActual = new Date().toISOString().substring(0, 10);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `facturas_exportadas_${fechaActual}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showNotification(`Se han exportado ${facturasFiltradas.length} factura(s) a archivo CSV descargable con éxito.`);
  };

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Toast Notification */}
      {notificacion && (
        <div className="fixed top-5 right-5 z-50 p-4 rounded-xl bg-emerald-950 border border-emerald-500/50 text-emerald-200 text-xs font-semibold shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>{notificacion}</span>
        </div>
      )}

      {/* Header & Sheets Sync Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-400 border border-rose-500/20 uppercase tracking-wider">
              Recepción Contable
            </span>
            <span className="text-xs text-slate-300">
              Sincronización &quot;Facturas&quot;
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1 tracking-tight">
            Subida Masiva y Listado de Facturas
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Procesa 10, 20 o hasta 100 facturas simultáneamente con extracción inteligente Gemini
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            id="btn-header-camara"
            onClick={() => setIsCameraOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shadow-lg shadow-rose-950/30 transition-all cursor-pointer"
            title="Capturar factura física directamente con la cámara del dispositivo"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Capturar con Cámara</span>
          </button>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#0f172a] border border-slate-800 text-xs text-slate-300">
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Destino: Base de Datos MySQL</span>
          </div>
          <button
            onClick={cargarLoteDemostracion}
            className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            + Cargar Lote Demo (5)
          </button>
        </div>
      </div>

      {/* Cloud Connection Status Banner */}
      {sheetsConfig.endpointUrl && sheetsConfig.endpointUrl.trim().startsWith('http') ? (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-indigo-950/30 border border-indigo-500/30 text-indigo-200 text-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            <div>
              <span className="font-bold text-indigo-300">MySQL (Single Source of Truth) &amp; Google Drive Conectados:</span>{' '}
              <span>Persistencia transaccional directa en base de datos relacional y archivado digital automático de recibos en carpetas de proveedor en Google Drive.</span>
            </div>
          </div>
          <button
            onClick={onOpenConfig}
            className="text-[11px] text-indigo-400 hover:text-indigo-300 underline font-semibold shrink-0 cursor-pointer self-start sm:self-auto"
          >
            Ver configuración / Drive
          </button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs">
          <div className="flex items-start sm:items-center gap-3">
            <Database className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5 sm:mt-0" />
            <div>
              <div className="font-bold text-indigo-300">Base de Datos MySQL (Single Source of Truth / DB-First) Activa</div>
              <div className="text-[11px] text-slate-300 mt-0.5">
                Las facturas se guardan y consultan directamente en MySQL. Si deseas archivar también los archivos PDF en Google Drive en carpetas organizadas por proveedor, añade el Webhook en Configuración.
              </div>
            </div>
          </div>
          <button
            onClick={onOpenConfig}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shrink-0 transition-colors shadow cursor-pointer self-start sm:self-auto"
          >
            Configurar Google Drive
          </button>
        </div>
      )}

      {/* ZONE 1: Drag and Drop Multiple Invoices (Large & Visual) */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleArchivosSeleccionados(e.dataTransfer.files);
        }}
        id="facturas-dropzone"
        className={`p-8 lg:p-10 rounded-2xl border-2 border-dashed transition-all text-center relative overflow-hidden ${
          dragOver
            ? 'border-rose-500 bg-rose-950/20'
            : 'border-slate-700/80 bg-gradient-to-b from-[#101828] to-[#0b101b] hover:border-slate-600'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,image/png,image/jpeg,.jpg"
          className="hidden"
          onChange={(e) => {
            handleArchivosSeleccionados(e.target.files);
            if (e.target) e.target.value = '';
          }}
        />

        <input
          ref={cameraDirectInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => {
            handleArchivosSeleccionados(e.target.files);
            if (e.target) e.target.value = '';
          }}
        />

        <div className="max-w-md mx-auto space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto shadow-lg shadow-rose-950/30">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-lg lg:text-xl font-bold text-slate-100 tracking-tight">
              ARRASTRA TUS FACTURAS AQUÍ
            </h3>
            <p className="text-xs text-slate-300 mt-1 leading-relaxed">
              Selecciona o arrastra múltiples archivos a la vez (10, 20, 50 o más). Admite{' '}
              <strong className="text-slate-200">PDF, JPG y PNG</strong> de cualquier proveedor.
            </p>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              id="btn-abrir-formulario-factura-dropzone"
              onClick={() => abrirFormularioConFactura()}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-rose-500 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-bold tracking-wide shadow-lg shadow-rose-950/40 transition-all cursor-pointer flex items-center gap-2"
              title="Abrir formulario para subir documento, analizar con Gemini y autocompletar la categoría de gasto automáticamente"
            >
              <Sparkles className="w-4 h-4 text-amber-200" />
              <span>NUEVA FACTURA CON FORMULARIO IA</span>
            </button>
            <button
              id="btn-seleccionar-archivos"
              onClick={() => fileInputRef.current?.click()}
              className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold tracking-wide transition-all border border-slate-700 cursor-pointer"
            >
              SELECCIONAR ARCHIVOS DEL EQUIPO
            </button>
            <button
              id="btn-abrir-camara-dropzone"
              onClick={() => setIsCameraOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold tracking-wide shadow-lg shadow-rose-950/40 transition-all cursor-pointer flex items-center gap-2"
              title="Abrir visor de cámara en directo para encuadrar y escanear"
            >
              <Camera className="w-4 h-4" />
              <span>ESCANEAR CON CÁMARA</span>
            </button>
            <button
              id="btn-foto-directa-dropzone"
              onClick={() => cameraDirectInputRef.current?.click()}
              className="px-4 py-2.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 text-xs font-semibold tracking-wide border border-slate-700/80 transition-all cursor-pointer flex items-center gap-1.5"
              title="Tomar fotografía directamente con la cámara del dispositivo móvil"
            >
              <Camera className="w-3.5 h-3.5 text-rose-400" />
              <span>Hacer Foto (Móvil)</span>
            </button>
          </div>

          {/* Drive automated pipeline explanation */}
          <div className="p-3 rounded-xl bg-[#0a0f18]/90 border border-slate-800 text-left space-y-1 mt-2">
            <div className="flex items-center gap-1.5 font-semibold text-sky-400 text-[11px]">
              <Layers className="w-3.5 h-3.5" />
              <span>Flujo automatizado de archivado en Google Drive:</span>
            </div>
            <div className="text-[11px] text-slate-400 space-y-0.5">
              <div>1. Extrae el <strong>nombre del proveedor</strong> de la factura.</div>
              <div>2. Si no existe su carpeta en Google Drive, la crea; si ya existe, la utiliza.</div>
              <div>3. Guarda el archivo con el formato: <code className="text-sky-300 bg-black/40 px-1 py-0.5 rounded font-mono">[ID Factura] [Fecha]</code> (ej: <span className="text-slate-200 font-mono">FAC-2026-001 2026-01-14.pdf</span>).</div>
            </div>
          </div>

          <p className="text-[11px] text-slate-400">
            *Detección automática de duplicados antes de insertar en MySQL y Google Drive.
          </p>
        </div>
      </div>

      {/* ZONE 2: Batch Processing Queue Progress & Badges */}
      {totalArchivos > 0 && (
        <div className="p-5 rounded-2xl bg-[#0f172a] border border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Cola de Documentos ({totalArchivos})
              </span>
              {isProcessing && (
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-400">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    Procesando {procesadosCount + duplicadosCount + erroresCount + 1} de {totalArchivos}
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2">
              <button
                disabled={isProcessing || esperandoCount === 0}
                onClick={() => { procesarColaArchivos(); }}
                className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wide flex items-center gap-2 transition-all ${
                  esperandoCount > 0 && !isProcessing
                    ? 'bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white shadow-md shadow-rose-950/40'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isProcessing ? 'animate-spin' : ''}`} />
                <span>PROCESAR CON GEMINI ({esperandoCount})</span>
              </button>

              <button
                disabled={isProcessing}
                onClick={() => setArchivosEnCola([])}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
                title="Limpiar cola"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Status Counter Pills */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap gap-2 text-xs">
              <span className="px-2.5 py-1 rounded-lg bg-slate-800/80 text-slate-300 border border-slate-700">
                Esperando: <strong>{esperandoCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
                Procesando: <strong>{procesandoCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Procesadas: <strong>{procesadosCount}</strong>
              </span>
              <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20">
                Duplicadas: <strong>{duplicadosCount}</strong>
              </span>
              {erroresCount > 0 && (
                <span className="px-2.5 py-1 rounded-lg bg-red-500/20 text-red-300 border border-red-500/40 font-semibold">
                  Errores de lectura: <strong>{erroresCount}</strong>
                </span>
              )}
            </div>

            {erroresCount > 0 && (
              <button
                onClick={onOpenConfig}
                className="text-[11px] text-red-400 hover:text-red-300 underline font-medium"
              >
                Revisar configuración de API Key
              </button>
            )}
          </div>

          {/* Warning Banner if there are errors */}
          {erroresCount > 0 && (
            <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-xs flex items-start gap-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <div className="font-bold text-red-300">
                  Advertencia: Fallo en la lectura con Gemini AI
                </div>
                <div className="text-[11px] text-red-200/90 leading-relaxed">
                  No se generaron facturas simuladas ficticias. Revisa los detalles de cada archivo a continuación. Si el motivo es límite de cuota o clave faltante, verifica la variable <code>GEMINI_API_KEY</code> en los ajustes del proyecto o reintenta tras unos instantes.
                </div>
              </div>
            </div>
          )}

          {/* Queue Items List */}
          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {archivosEnCola.map((item) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex items-center justify-between gap-3 text-xs transition-colors ${
                  item.estado === 'error'
                    ? 'bg-red-950/20 border-red-500/40'
                    : 'bg-[#0a0f18] border-slate-800/80'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {item.estado === 'error' ? (
                    <div className="w-7 h-7 rounded-lg bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400 shrink-0">
                      <AlertTriangle className="w-3.5 h-3.5" />
                    </div>
                  ) : item.nombre.startsWith('Factura_Camara_') || item.tipo.startsWith('image/') ? (
                    <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                      <Camera className="w-3.5 h-3.5" />
                    </div>
                  ) : (
                    <FileText className="w-4 h-4 text-slate-400 shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="font-medium text-slate-200 truncate flex items-center gap-1.5">
                      <span className="truncate">{item.nombre}</span>
                      {item.nombre.startsWith('Factura_Camara_') && (
                        <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-semibold text-[9px] border border-rose-500/30 shrink-0">
                          CÁMARA
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400 flex flex-wrap items-center gap-1.5 mt-0.5">
                      <span>{(item.tamano / 1024).toFixed(1)} KB</span>
                      <span>•</span>
                      <span className={item.estado === 'error' ? 'text-red-300 font-medium' : ''}>
                        {item.mensaje || 'Listo para procesar'}
                      </span>
                      {item.driveInfo && (
                        <span className="inline-flex items-center gap-1 text-[10px] text-sky-400 bg-sky-950/70 border border-sky-500/30 px-1.5 py-0.5 rounded font-mono">
                          <span>📁 {item.driveInfo.carpetaProveedor} / {item.driveInfo.nombreArchivo}</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold capitalize ${
                      item.estado === 'procesado'
                        ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                        : item.estado === 'procesando'
                        ? 'bg-sky-500/15 text-sky-400 border border-sky-500/30 animate-pulse'
                        : item.estado === 'duplicado'
                        ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
                        : item.estado === 'error'
                        ? 'bg-red-500/20 text-red-400 border border-red-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.estado === 'error' ? 'Error de lectura' : item.estado}
                  </span>

                  {item.estado === 'error' && (
                    <button
                      onClick={() => procesarColaArchivos([item])}
                      disabled={isProcessing}
                      className="px-2 py-1 rounded bg-red-600/20 hover:bg-red-600/30 text-red-300 border border-red-500/30 text-[10px] font-medium transition-colors"
                      title="Reintentar lectura de este archivo"
                    >
                      Reintentar
                    </button>
                  )}

                  {item.datosExtraidos && (
                    <div className="flex items-center gap-1.5">
                      {item.datosExtraidos.categoriaGasto && (
                        <span
                          className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 text-[10px] font-semibold"
                          title={item.datosExtraidos.categoriaGastoJustificacion || 'Categoría asignada con IA'}
                        >
                          <Sparkles className="w-3 h-3 text-emerald-400" />
                          <span>{item.datosExtraidos.categoriaGasto}</span>
                        </span>
                      )}
                      <button
                        onClick={() =>
                          abrirFormularioConFactura(item.datosExtraidos!, {
                            base64Data: item.base64Data,
                            fileName: item.nombre,
                            mimeType: item.tipo,
                          })
                        }
                        className="px-2 py-0.5 rounded bg-gradient-to-r from-rose-600/20 to-amber-600/20 hover:from-rose-600/40 hover:to-amber-600/40 text-amber-300 border border-amber-500/30 text-[10px] font-semibold flex items-center gap-1 transition-all cursor-pointer"
                        title="Revisar o editar datos y categoría autocompletada en el formulario"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span className="hidden md:inline">Formulario</span>
                      </button>
                      <button
                        onClick={() => setFacturaParaVisor(item.datosExtraidos!)}
                        className="p-1 rounded text-sky-400 hover:text-sky-200 hover:bg-sky-500/10 transition-colors"
                        title="Abrir visor de PDF"
                      >
                        <Eye className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setFacturaSeleccionada(item.datosExtraidos!)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px]"
                        title="Ver auditoría de datos"
                      >
                        Auditar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ZONE 3: Duplicate Conflict Red Alert Modal */}
      {duplicadoEnConflicto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl bg-[#0f172a] border-2 border-red-500/70 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 shrink-0">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <span className="text-[11px] font-black uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/30 text-red-300">
                  ALERTA CRÍTICA
                </span>
                <h3 className="text-lg font-bold text-red-100 mt-0.5">
                  POSIBLE FACTURA DUPLICADA
                </h3>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              El sistema ha detectado una factura idéntica ya registrada previamente en la base de datos
              MySQL (tabla &quot;facturas&quot;). Para evitar dobles contabilizaciones, no se ha
              guardado de forma automática.
            </p>

            {/* Comparison Box */}
            <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800 text-xs">
              <div className="border-r border-slate-800 pr-3 space-y-1">
                <div className="text-[10px] text-slate-300 uppercase font-bold">
                  Factura Existente
                </div>
                <div className="font-mono text-slate-200 font-bold">
                  {duplicadoEnConflicto.facturaExistente.idFactura}
                </div>
                <div className="text-slate-300 truncate">
                  {duplicadoEnConflicto.facturaExistente.nombreProveedor}
                </div>
                <div className="text-rose-400 font-mono font-bold">
                  {duplicadoEnConflicto.facturaExistente.total.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  €
                </div>
                <div className="text-[10px] text-slate-300">
                  Fecha: {duplicadoEnConflicto.facturaExistente.fechaEmision}
                </div>
              </div>

              <div className="space-y-1 pl-1">
                <div className="text-[10px] text-red-400 uppercase font-bold">
                  Archivo Nuevo
                </div>
                <div className="font-mono text-red-300 font-bold truncate">
                  {duplicadoEnConflicto.archivo.nombre}
                </div>
                <div className="text-slate-300 truncate">
                  {duplicadoEnConflicto.facturaNueva.nombreProveedor}
                </div>
                <div className="text-rose-400 font-mono font-bold">
                  {duplicadoEnConflicto.facturaNueva.total.toLocaleString('es-ES', {
                    minimumFractionDigits: 2,
                  })}{' '}
                  €
                </div>
                <div className="text-[10px] text-slate-300">
                  Fecha: {duplicadoEnConflicto.facturaNueva.fechaEmision}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
              <button
                onClick={handleRevisarDuplicado}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
              >
                Revisar Factura Existente
              </button>
              <button
                onClick={handleIgnorarDuplicado}
                className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
              >
                Ignorar Duplicado
              </button>
              <button
                onClick={handleGuardarDeTodasFormas}
                className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold tracking-wide"
              >
                Guardar de Todas Formas
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ZONE 4: Professional Invoices Table with Search & Rich Filters */}
      <div className="p-5 lg:p-6 rounded-2xl bg-[#101726] border border-slate-800/80 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-100">
                Listado de Facturas Registradas ({facturasFiltradas.length})
              </h3>
              {totalPaginas > 1 && (
                <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[10px] text-slate-300 font-semibold border border-slate-700/80">
                  Pág. {paginaSegura} de {totalPaginas}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Auditoría y persistencia relacional en MySQL (Single Source of Truth)
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <button
              id="btn-exportar-facturas-csv"
              onClick={exportarFacturasCSV}
              disabled={facturasFiltradas.length === 0}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                facturasFiltradas.length > 0
                  ? 'bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border-emerald-500/30 shadow-sm'
                  : 'bg-slate-800/50 text-slate-500 border-slate-800 cursor-not-allowed'
              }`}
              title="Descargar archivo CSV con todas las facturas visibles y filtradas (útil para auditoría externa y copias de seguridad)"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Exportar CSV ({facturasFiltradas.length})</span>
            </button>

            {(busqueda || filtroProveedor !== 'TODOS' || filtroCategoria !== 'TODAS' || filtroEstado !== 'TODOS' || filtroIRPF !== 'TODOS' || minImporte || maxImporte || fechaDesde || fechaHasta) && (
              <button
                id="btn-limpiar-todos-filtros"
                onClick={() => {
                  setBusqueda('');
                  setFiltroProveedor('TODOS');
                  setFiltroCategoria('TODAS');
                  setFiltroEstado('TODOS');
                  setFiltroIRPF('TODOS');
                  setMinImporte('');
                  setMaxImporte('');
                  setFechaDesde('');
                  setFechaHasta('');
                }}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs border border-slate-700 transition-colors cursor-pointer"
                title="Restablecer todos los filtros aplicados"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-400" />
                <span>Limpiar filtros</span>
              </button>
            )}
            <span className="text-xs text-slate-300">
              Total facturas:{' '}
              <strong className="text-slate-200">
                {facturasFiltradas
                  .reduce((sum, f) => sum + f.total, 0)
                  .toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}{' '}
                €
              </strong>
            </span>
          </div>
        </div>

        {/* Banner de Aviso de Google Drive si hay facturas con aviso de subida */}
        {sheetsConfig.endpointUrl && facturas.some(f => f.driveError) && (
          <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs text-amber-200 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Aviso Google Drive:</strong> Algunas facturas se registraron en MySQL pero su justificante no se pudo archivar en Google Drive. Puedes verificar la URL de tu Webhook en la pestaña &quot;Código Apps Script&quot;.
              </span>
            </div>
            <button
              onClick={onOpenConfig}
              className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-[11px] font-semibold transition-colors cursor-pointer"
            >
              Ver instrucciones de Apps Script
            </button>
          </div>
        )}

        {/* Barra de Filtrado por Rango de Fechas (Selector Desde - Hasta) */}
        <div
          id="barra-filtro-fechas"
          className="p-3 sm:p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800/80 flex flex-col lg:flex-row lg:items-center justify-between gap-3 text-xs"
        >
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200">
              <CalendarRange className="w-4 h-4 text-rose-400 shrink-0" />
              <span>Rango de Fechas:</span>
            </div>

            {/* Selector Desde */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filtro-fecha-desde" className="text-slate-400 text-[11px] font-medium whitespace-nowrap">
                Desde:
              </label>
              <input
                id="filtro-fecha-desde"
                type="date"
                value={fechaDesde}
                onChange={(e) => setFechaDesde(e.target.value)}
                className="bg-[#101726] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
                title="Filtrar facturas emitidas desde esta fecha"
              />
            </div>

            {/* Selector Hasta */}
            <div className="flex items-center gap-1.5">
              <label htmlFor="filtro-fecha-hasta" className="text-slate-400 text-[11px] font-medium whitespace-nowrap">
                Hasta:
              </label>
              <input
                id="filtro-fecha-hasta"
                type="date"
                value={fechaHasta}
                onChange={(e) => setFechaHasta(e.target.value)}
                className="bg-[#101726] border border-slate-700/80 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition-colors"
                title="Filtrar facturas emitidas hasta esta fecha"
              />
            </div>

            {/* Limpiar rango si está activo */}
            {(fechaDesde || fechaHasta) && (
              <button
                id="btn-limpiar-filtro-fechas"
                onClick={() => {
                  setFechaDesde('');
                  setFechaHasta('');
                }}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 text-[11px] font-semibold transition-colors cursor-pointer"
                title="Restablecer fechas a todas"
              >
                <X className="w-3 h-3" />
                <span>Quitar fechas</span>
              </button>
            )}

            {/* Resumen de filtro de fechas activo */}
            {(fechaDesde || fechaHasta) && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800/80 text-[10px] text-slate-300 border border-slate-700 font-mono">
                <span>{fechaDesde || 'Inicio'} → {fechaHasta || 'Fin'}</span>
              </span>
            )}
          </div>

          {/* Atajos de Rango Rápido */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 text-[10px] uppercase font-bold tracking-wider mr-0.5">
              Atajos:
            </span>
            <button
              type="button"
              id="btn-atajo-fechas-todas"
              onClick={() => {
                setFechaDesde('');
                setFechaHasta('');
              }}
              className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                !fechaDesde && !fechaHasta
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              id="btn-atajo-fechas-mes"
              onClick={() => {
                const hoy = new Date();
                const yyyy = hoy.getFullYear();
                const mm = String(hoy.getMonth() + 1).padStart(2, '0');
                const ultimoDia = new Date(yyyy, hoy.getMonth() + 1, 0).getDate();
                setFechaDesde(`${yyyy}-${mm}-01`);
                setFechaHasta(`${yyyy}-${mm}-${String(ultimoDia).padStart(2, '0')}`);
              }}
              className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Este Mes
            </button>
            <button
              type="button"
              id="btn-atajo-fechas-30d"
              onClick={() => {
                const hoy = new Date();
                const hace30 = new Date();
                hace30.setDate(hoy.getDate() - 30);
                setFechaDesde(hace30.toISOString().substring(0, 10));
                setFechaHasta(hoy.toISOString().substring(0, 10));
              }}
              className="px-2.5 py-1 rounded-md bg-slate-900/80 border border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
            >
              Últimos 30 días
            </button>
            <button
              type="button"
              id="btn-atajo-fechas-ano"
              onClick={() => {
                const ano = parametrosActivos?.anoFiscalReferencia || new Date().getFullYear();
                setFechaDesde(`${ano}-01-01`);
                setFechaHasta(`${ano}-12-31`);
              }}
              className={`px-2.5 py-1 rounded-md border transition-colors cursor-pointer ${
                (() => {
                  const ano = parametrosActivos?.anoFiscalReferencia || new Date().getFullYear();
                  return fechaDesde === `${ano}-01-01` && fechaHasta === `${ano}-12-31`;
                })()
                  ? 'bg-rose-500/20 border-rose-500/40 text-rose-300 font-semibold'
                  : 'bg-slate-900/80 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              Año {parametrosActivos?.anoFiscalReferencia || new Date().getFullYear()}
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 pt-1">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Buscar por ID, proveedor, concepto o notas..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full bg-[#0a0f18] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Supplier Select */}
          <select
            value={filtroProveedor}
            onChange={(e) => setFiltroProveedor(e.target.value)}
            className="bg-[#0a0f18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="TODOS">Todos los proveedores</option>
            {proveedores.map((p) => (
              <option key={p.idProveedor} value={p.idProveedor}>
                {p.nombreProveedor}
              </option>
            ))}
          </select>

          {/* Category Select */}
          <select
            value={filtroCategoria}
            onChange={(e) => setFiltroCategoria(e.target.value)}
            className="bg-[#0a0f18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="TODAS">Todas las categorías</option>
            {categoriasGasto.map((cat) => (
              <option key={cat.id} value={cat.nombre}>
                {cat.nombre}
              </option>
            ))}
          </select>

          {/* Status Select */}
          <select
            value={filtroEstado}
            onChange={(e) => setFiltroEstado(e.target.value)}
            className="bg-[#0a0f18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-rose-500"
          >
            <option value="TODOS">Todos los estados</option>
            <option value="Pagada">Pagada</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Vencida">Vencida</option>
          </select>

          {/* IRPF Withholding Filter */}
          <select
            value={filtroIRPF}
            onChange={(e) => setFiltroIRPF(e.target.value as any)}
            className="bg-[#0a0f18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-emerald-500"
            title="Filtrar por facturas con o sin retención de IRPF (Modelos 111 / 115)"
          >
            <option value="TODOS">Todos los regímenes IRPF</option>
            <option value="CON_IRPF">Con Retención IRPF (Mod. 111/115)</option>
            <option value="SIN_IRPF">Sin Retención IRPF</option>
          </select>

          {/* Economic Range Min - Max */}
          <div className="flex items-center gap-1.5">
            <input
              type="number"
              placeholder="Mín €"
              value={minImporte}
              onChange={(e) => setMinImporte(e.target.value)}
              className="w-1/2 bg-[#0a0f18] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
            <input
              type="number"
              placeholder="Máx €"
              value={maxImporte}
              onChange={(e) => setMaxImporte(e.target.value)}
              className="w-1/2 bg-[#0a0f18] border border-slate-800 rounded-xl px-2.5 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Table View */}
        <div className="rounded-xl border border-slate-800/80 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0a0f18] text-slate-400 border-b border-slate-800 uppercase text-[10px] tracking-wider font-bold">
              <tr>
                <th
                  onClick={() => handleSort('idFactura')}
                  className="p-3.5 cursor-pointer hover:text-slate-200 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>ID Factura</span>
                    {renderSortIcon('idFactura')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('fechaEmision')}
                  className="p-3.5 cursor-pointer hover:text-slate-200 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Fecha</span>
                    {renderSortIcon('fechaEmision')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('nombreProveedor')}
                  className="p-3.5 cursor-pointer hover:text-slate-200 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Proveedor</span>
                    {renderSortIcon('nombreProveedor')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('concepto')}
                  className="p-3.5 cursor-pointer hover:text-slate-200 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Concepto</span>
                    {renderSortIcon('concepto')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('baseImponible')}
                  className="p-3.5 text-right cursor-pointer hover:text-slate-200 select-none transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Base Imp.</span>
                    {renderSortIcon('baseImponible')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('impuestos')}
                  className="p-3.5 text-right cursor-pointer hover:text-slate-200 select-none transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Impuestos / RE / IRPF</span>
                    {renderSortIcon('impuestos')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('total')}
                  className="p-3.5 text-right cursor-pointer hover:text-slate-200 select-none transition-colors"
                >
                  <div className="flex items-center justify-end gap-1.5">
                    <span>Total Líquido</span>
                    {renderSortIcon('total')}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('categoriaGasto')}
                  className="p-3.5 cursor-pointer hover:text-slate-200 select-none transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Categoría</span>
                    {renderSortIcon('categoriaGasto')}
                  </div>
                </th>
                <th className="p-3.5">Google Drive</th>
                <th className="p-3.5 text-center">Estado</th>
                <th className="p-3.5 text-center">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 bg-[#101726]">
              {facturasPaginadas.length > 0 ? (
                facturasPaginadas.map((fac) => (
                  <tr
                    key={fac.idFactura}
                    onClick={() => setFacturaSeleccionada(fac)}
                    className="hover:bg-slate-800/40 transition-colors cursor-pointer"
                  >
                    <td className="p-3.5 font-mono font-bold text-slate-200">
                      {fac.idFactura}
                    </td>
                    <td className="p-3.5 text-slate-300 font-mono whitespace-nowrap">
                      {fac.fechaEmision}
                    </td>
                    <td className="p-3.5 font-medium text-slate-200 max-w-[170px] truncate">
                      {fac.nombreProveedor}
                    </td>
                    <td className="p-3.5 text-slate-400 max-w-[220px]">
                      <div className="flex items-center gap-1.5">
                        <span className="truncate">{fac.concepto}</span>
                        {fac.notas && fac.notas.trim() && (
                          <span
                            className="inline-flex items-center text-amber-400 hover:text-amber-300 shrink-0 cursor-help transition-colors"
                            title={`Nota / Recordatorio:\n${fac.notas}`}
                          >
                            <StickyNote className="w-3.5 h-3.5" />
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-3.5 text-right text-slate-300 font-mono">
                      {fac.baseImponible.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </td>
                    <td className="p-3.5 text-right font-mono whitespace-nowrap">
                      {(() => {
                        // IVA
                        const cuotaIVA = fac.cuotaIVA ?? 0;
                        const signIva = cuotaIVA > 0 ? '+' : '';
                        const formattedIva = cuotaIVA.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        
                        // Recargo de Equivalencia
                        const cuotaRE = fac.cuotaRecargoEquivalencia ?? 0;
                        const signRE = cuotaRE > 0 ? '+' : '';
                        const formattedRE = cuotaRE.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

                        // IRPF
                        const cuotaIRPF = fac.cuotaIRPF ?? 0;
                        const signIrpf = cuotaIRPF > 0 ? '-' : '';
                        const formattedIrpf = cuotaIRPF.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                        
                        return (
                          <>
                            <div className="text-sky-400">
                              {signIva}{formattedIva} €
                              <span className="text-[10px] text-slate-300 ml-1">({fac.tiposIVA})</span>
                            </div>
                            {(fac?.aplicaRecargoEquivalencia && cuotaRE !== 0) && (
                              <div className="text-[10px] text-purple-400 font-medium mt-0.5">
                                {signRE}{formattedRE} € ({fac.tipoRecargoEquivalencia || 'RE'})
                              </div>
                            )}
                            {(fac?.aplicaRetencionIRPF && cuotaIRPF !== 0) && (
                              <div className="text-[10px] text-emerald-400 font-medium mt-0.5">
                                {signIrpf}{formattedIrpf} € ({fac.porcentajeIRPF || 15}% IRPF)
                              </div>
                            )}
                          </>
                        );
                      })()}
                    </td>
                    <td className="p-3.5 text-right font-mono whitespace-nowrap">
                      <div className="font-bold text-rose-400">
                        {fac.total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </div>
                      {(() => {
                        const tieneIRPF = fac?.aplicaRetencionIRPF && (fac?.cuotaIRPF ?? 0) !== 0;
                        const tieneRE = fac?.aplicaRecargoEquivalencia && (fac?.cuotaRecargoEquivalencia ?? 0) !== 0;
                        if (tieneIRPF && tieneRE) {
                          return <div className="text-[9px] text-purple-300 font-normal">Líquido (RE e IRPF)</div>;
                        }
                        if (tieneIRPF) {
                          return <div className="text-[9px] text-emerald-400 font-normal">Líquido tras IRPF</div>;
                        }
                        if (tieneRE) {
                          return <div className="text-[9px] text-purple-400 font-normal">Total con Recargo</div>;
                        }
                        return null;
                      })()}
                    </td>
                    <td className="p-3.5 text-slate-300 whitespace-nowrap">
                      {(() => {
                        const catColor = obtenerColorCategoria(fac.categoriaGasto, categoriasGasto);
                        return (
                          <span
                            className="px-2.5 py-0.5 rounded-full text-[10px] font-bold inline-flex items-center gap-1.5"
                            style={{
                              backgroundColor: `${catColor}18`,
                              color: catColor,
                              border: `1px solid ${catColor}35`,
                            }}
                          >
                            <span
                              className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: catColor }}
                            />
                            <span>{fac.categoriaGasto}</span>
                          </span>
                        );
                      })()}
                    </td>
                    <td className="p-3.5 whitespace-nowrap">
                      {(() => {
                        const ruta = String(fac.driveFileUrl || fac.archivoRuta || (fac as any).archivo_ruta || '').trim();
                        const esUrlValida = Boolean(ruta && (ruta.startsWith('http://') || ruta.startsWith('https://')));
                        const nombreArchivo = fac.archivoNombre || (ruta && !esUrlValida ? ruta.split('/').pop() : '') || '';

                        if (esUrlValida) {
                          return (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={ruta}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="px-2 py-0.5 rounded bg-sky-950/60 hover:bg-sky-900/60 text-sky-300 border border-sky-500/25 text-[10px] font-mono flex items-center gap-1 max-w-[150px] transition-colors cursor-pointer"
                                title={`Abrir archivo en Google Drive\nURL: ${ruta}\nCarpeta: ${fac.driveFolderName || fac.nombreProveedor}\nArchivo: ${fac.driveFileName || nombreArchivo || `${fac.idFactura} ${fac.fechaEmision}.pdf`}`}
                              >
                                <span className="text-sky-400 shrink-0">📁</span>
                                <span className="truncate">{fac.driveFolderName || fac.nombreProveedor || 'Google Drive'}</span>
                                <span className="text-sky-400 hover:text-sky-300 font-bold text-xs shrink-0">↗</span>
                              </a>
                            </div>
                          );
                        }

                        if (ruta && !esUrlValida) {
                          return (
                            <div className="flex items-center gap-1.5">
                              <span
                                className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 text-[10px] font-mono flex items-center gap-1 max-w-[150px] truncate"
                                title={`Ruta de archivo: ${ruta}`}
                              >
                                <span className="text-slate-400 shrink-0">📄</span>
                                <span className="truncate">{nombreArchivo || ruta}</span>
                              </span>
                            </div>
                          );
                        }

                        return (
                          <div className="flex items-center gap-1.5">
                            {fac.driveError && (
                              <span
                                className="px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-300 border border-amber-500/30 text-[10px] font-mono cursor-help"
                                title={`Aviso Google Drive: ${fac.driveError}`}
                              >
                                ⚠️ Aviso
                              </span>
                            )}
                            {fac.archivoBase64 && onUploadToDrive && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onUploadToDrive(fac);
                                }}
                                className="px-2 py-0.5 rounded bg-sky-600/20 hover:bg-sky-600/35 text-sky-300 border border-sky-500/30 text-[10px] font-mono font-semibold cursor-pointer transition-colors"
                                title="Subir ahora a Google Drive (creará carpeta del proveedor si no existe)"
                              >
                                + Drive
                              </button>
                            )}
                            {fac.archivoBase64 ? (
                              <span className="text-[10px] text-slate-400 font-mono">Local</span>
                            ) : nombreArchivo ? (
                              <span className="text-[10px] text-slate-400 font-mono flex items-center gap-1 max-w-[120px] truncate" title={nombreArchivo}>
                                📄 <span className="truncate">{nombreArchivo}</span>
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-500 font-mono">Sin archivo</span>
                            )}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      {onActualizarEstadoFactura ? (
                        <select
                          value={fac.estado}
                          onChange={async (e) => {
                            e.stopPropagation();
                            const nuevo = e.target.value as 'Pagada' | 'Pendiente' | 'Vencida';
                            if (onActualizarEstadoFactura) {
                              await onActualizarEstadoFactura(fac.idFactura, nuevo);
                              setNotificacion('¡Estado actualizado con éxito y guardado en MySQL!');
                              setTimeout(() => setNotificacion(null), 3500);
                            }
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full cursor-pointer focus:outline-none transition-all ${
                            fac.estado === 'Pagada'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : fac.estado === 'Vencida'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                          title="Cambiar estado y persistir en MySQL"
                        >
                          <option value="Pagada" className="bg-[#0f172a] text-emerald-400">Pagada</option>
                          <option value="Pendiente" className="bg-[#0f172a] text-amber-400">Pendiente</option>
                          <option value="Vencida" className="bg-[#0f172a] text-rose-400">Vencida</option>
                        </select>
                      ) : (
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            fac.estado === 'Pagada'
                              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                              : fac.estado === 'Vencida'
                              ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                          }`}
                        >
                          {fac.estado}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFacturaParaVisor(fac);
                          }}
                          className="p-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 hover:text-sky-300 border border-sky-500/20 transition-colors cursor-pointer"
                          title="Ver documento en visor integrado"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            abrirFormularioConFactura(fac);
                          }}
                          className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 hover:text-amber-300 border border-amber-500/20 transition-colors cursor-pointer"
                          title="Editar factura y categoría de gasto en el formulario"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        {onDeleteFactura && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setFacturaParaEliminar(fac);
                            }}
                            className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 hover:text-rose-300 border border-rose-500/20 transition-colors cursor-pointer"
                            title="Eliminar factura coordinadamente"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-300 text-xs">
                    {facturas.length === 0
                      ? 'No hay facturas registradas en la base de datos (0 facturas).'
                      : fechaDesde || fechaHasta
                      ? `No se encontraron facturas en el rango de fechas seleccionado (${fechaDesde || 'inicio'} a ${fechaHasta || 'fin'}).`
                      : 'No se encontraron facturas con los filtros seleccionados.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalElementos > 0 && (
          <div
            id="paginacion-facturas"
            className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs"
          >
            {/* Left: Summary and Page Size Selector */}
            <div className="flex flex-wrap items-center gap-3 text-slate-300">
              <span>
                Mostrando <strong className="text-slate-100">{indiceInicio + 1}</strong> -{' '}
                <strong className="text-slate-100">{indiceFin}</strong> de{' '}
                <strong className="text-slate-100">{totalElementos}</strong> facturas
              </span>

              <div className="flex items-center gap-1.5 pl-2 sm:border-l sm:border-slate-800">
                <label htmlFor="selector-por-pagina" className="text-slate-400 text-[11px] whitespace-nowrap">
                  Por página:
                </label>
                <select
                  id="selector-por-pagina"
                  value={elementosPorPagina}
                  onChange={(e) => {
                    setElementosPorPagina(Number(e.target.value));
                    setPaginaActual(1);
                  }}
                  className="bg-[#0a0f18] border border-slate-800 rounded-lg px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
                >
                  <option value={5}>5</option>
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
              </div>
            </div>

            {/* Right: Page Navigation Controls */}
            <div className="flex items-center gap-1 self-center sm:self-auto">
              {/* First Page */}
              <button
                id="btn-paginacion-primera"
                onClick={() => setPaginaActual(1)}
                disabled={paginaSegura <= 1}
                className="p-1.5 rounded-lg border border-slate-800 bg-[#0a0f18] text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Primera página"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              {/* Prev Page */}
              <button
                id="btn-paginacion-anterior"
                onClick={() => setPaginaActual((p) => Math.max(1, p - 1))}
                disabled={paginaSegura <= 1}
                className="p-1.5 rounded-lg border border-slate-800 bg-[#0a0f18] text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Página anterior"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>

              {/* Page Number Buttons */}
              <div className="flex items-center gap-1 mx-1">
                {obtenerNumerosPagina(paginaSegura, totalPaginas).map((item, idx) =>
                  item === '...' ? (
                    <span key={`dots-${idx}`} className="px-1 text-slate-500 font-mono text-[11px] select-none">
                      …
                    </span>
                  ) : (
                    <button
                      key={`page-${item}`}
                      onClick={() => setPaginaActual(Number(item))}
                      className={`min-w-7 h-7 px-2 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                        item === paginaSegura
                          ? 'bg-rose-600 border-rose-500 text-white shadow-sm shadow-rose-950/40'
                          : 'bg-[#0a0f18] border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                      }`}
                    >
                      {item}
                    </button>
                  )
                )}
              </div>

              {/* Next Page */}
              <button
                id="btn-paginacion-siguiente"
                onClick={() => setPaginaActual((p) => Math.min(totalPaginas, p + 1))}
                disabled={paginaSegura >= totalPaginas}
                className="p-1.5 rounded-lg border border-slate-800 bg-[#0a0f18] text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Página siguiente"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Last Page */}
              <button
                id="btn-paginacion-ultima"
                onClick={() => setPaginaActual(totalPaginas)}
                disabled={paginaSegura >= totalPaginas}
                className="p-1.5 rounded-lg border border-slate-800 bg-[#0a0f18] text-slate-400 hover:text-slate-200 hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                title="Última página"
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Invoice Detail Modal */}
      <FacturaDetalleModal
        factura={facturaSeleccionada}
        onClose={() => setFacturaSeleccionada(null)}
        onDelete={(fac) => {
          setFacturaSeleccionada(null);
          setFacturaParaEliminar(fac);
        }}
        onAbrirVisor={(fac) => {
          setFacturaSeleccionada(null);
          setFacturaParaVisor(fac);
        }}
        onEditarEnFormulario={(fac) => {
          setFacturaSeleccionada(null);
          abrirFormularioConFactura(fac);
        }}
        onUploadToDrive={onUploadToDrive}
        onActualizarEstado={
          onActualizarEstadoFactura
            ? async (fac, nuevoEstado) => {
                await onActualizarEstadoFactura(fac.idFactura, nuevoEstado);
                setFacturaSeleccionada((prev) =>
                  prev && prev.idFactura === fac.idFactura
                    ? {
                        ...prev,
                        estado: nuevoEstado,
                        fechaPago:
                          nuevoEstado === 'Pagada'
                            ? new Date().toISOString().split('T')[0]
                            : 'Pendiente',
                      }
                    : prev
                );
              }
            : undefined
        }
      />

      {/* Integrated PDF / Document Viewer Modal */}
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

      {/* Camera Capture Modal */}
      <CamaraFacturaModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapturaCompletada={handleCapturaCamara}
      />

      {/* Intelligent Invoice Form Modal with Gemini AI categorization */}
      <FormularioFacturaModal
        isOpen={isFormularioOpen}
        onClose={() => {
          setIsFormularioOpen(false);
          setFacturaParaFormulario(null);
          setArchivoParaFormulario(null);
        }}
        facturaInicial={facturaParaFormulario}
        archivoInicial={archivoParaFormulario}
        proveedoresExistentes={proveedores}
        datosNegocio={datosNegocio}
        onSaveFactura={async (facturaGuardar, archivoInfo) => {
          const res = await onSaveFactura(facturaGuardar, archivoInfo);
          showNotification(
            `Factura ${facturaGuardar.idFactura} guardada con categoría "${facturaGuardar.categoriaGasto}".`
          );
          return res;
        }}
      />

      {/* Coordinated Deletion Confirmation Modal */}
      <EliminarFacturaModal
        factura={facturaParaEliminar}
        isOpen={Boolean(facturaParaEliminar)}
        isDeleting={isDeletingFactura}
        onConfirm={async () => {
          if (!facturaParaEliminar || !onDeleteFactura) return;
          setIsDeletingFactura(true);
          try {
            await onDeleteFactura(facturaParaEliminar);
            showNotification(`Factura ${facturaParaEliminar.idFactura} eliminada correctamente.`);
          } finally {
            setIsDeletingFactura(false);
            setFacturaParaEliminar(null);
          }
        }}
        onCancel={() => {
          if (!isDeletingFactura) {
            setFacturaParaEliminar(null);
          }
        }}
      />
    </div>
  );
};
