import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Sparkles,
  UploadCloud,
  FileText,
  Building2,
  Tag,
  DollarSign,
  Calendar,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  Plus,
  Trash2,
  Layers,
  ChevronDown,
  Info,
  Camera,
  ArrowRight,
  StickyNote
} from 'lucide-react';
import {
  Factura,
  ProductoLinea,
  Proveedor,
  DatosNegocio,
  DEFAULT_DATOS_NEGOCIO,
  CategoriaGastoDef,
  ParametrosSistema,
  TipoImpositivoConfigurable,
  TIPOS_IMPOSITIVOS_PREDETERMINADOS,
  TipoRetencionIRPFConfigurable,
  ConceptoRetencionIRPF,
  TIPOS_RETENCION_IRPF_PREDETERMINADOS,
} from '../types';
import { obtenerCategoriasGasto, obtenerColorCategoria } from '../utils/categoriasGasto';
import { CategoriasGastoModal } from './CategoriasGastoModal';
import { obtenerParametrosSistema } from '../utils/parametrosSistema';
import {
  CATALOGO_TIPOS_IMPOSITIVOS,
  calcularLiquidacionFactura,
  analizarStringTipoImpositivo,
  obtenerRecargoEquivalenciaSugerido,
  extraerPorcentajeIRPF,
} from '../utils/fiscalidad';

interface FormularioFacturaModalProps {
  isOpen: boolean;
  onClose: () => void;
  facturaInicial?: Partial<Factura> | null;
  archivoInicial?: { base64Data?: string; fileName?: string; mimeType?: string } | null;
  proveedoresExistentes: Proveedor[];
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
}

export const FormularioFacturaModal: React.FC<FormularioFacturaModalProps> = ({
  isOpen,
  onClose,
  facturaInicial,
  archivoInicial,
  proveedoresExistentes,
  datosNegocio,
  onSaveFactura,
}) => {
  // File state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>(archivoInicial?.base64Data || facturaInicial?.archivoBase64 || '');
  const [fileName, setFileName] = useState<string>(archivoInicial?.fileName || facturaInicial?.archivoNombre || '');
  const [fileMimeType, setFileMimeType] = useState<string>(archivoInicial?.mimeType || 'application/pdf');

  // AI Extraction State
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analisisEtapa, setAnalisisEtapa] = useState('');
  const [analisisError, setAnalisisError] = useState<string | null>(null);
  const [sugerenciaIaActiva, setSugerenciaIaActiva] = useState(Boolean(facturaInicial?.categoriaGastoSugerida));

  // Saving State
  const [isSaving, setIsSaving] = useState(false);
  const [guardadoError, setGuardadoError] = useState<string | null>(null);

  // Form Fields
  const [idFactura, setIdFactura] = useState(facturaInicial?.idFactura || '');
  const [fechaEmision, setFechaEmision] = useState(facturaInicial?.fechaEmision || new Date().toISOString().split('T')[0]);
  const [fechaVencimiento, setFechaVencimiento] = useState(facturaInicial?.fechaVencimiento || '');
  const [nombreProveedor, setNombreProveedor] = useState(facturaInicial?.nombreProveedor || '');
  const [idProveedor, setIdProveedor] = useState(facturaInicial?.idProveedor || '');
  const [concepto, setConcepto] = useState(facturaInicial?.concepto || '');
  const [categoriasGastoLista, setCategoriasGastoLista] = useState<CategoriaGastoDef[]>(() =>
    obtenerCategoriasGasto()
  );
  const [isCategoriasModalOpen, setIsCategoriasModalOpen] = useState(false);
  const [categoriaGasto, setCategoriaGasto] = useState<string>(() => {
    if (facturaInicial?.categoriaGasto) return facturaInicial.categoriaGasto;
    const iniciales = obtenerCategoriasGasto();
    return iniciales[0]?.nombre || 'Materias Primas';
  });
  const [categoriaGastoJustificacion, setCategoriaGastoJustificacion] = useState<string>(
    facturaInicial?.categoriaGastoJustificacion || ''
  );

  useEffect(() => {
    const handleActualizadas = (e: any) => {
      setCategoriasGastoLista(e?.detail || obtenerCategoriasGasto());
    };
    window.addEventListener('categoriasGastoActualizadas', handleActualizadas);
    return () => window.removeEventListener('categoriasGastoActualizadas', handleActualizadas);
  }, []);

  // Fiscal configuration from system parameters
  const [parametros, setParametros] = useState<ParametrosSistema>(() => obtenerParametrosSistema());
  const [tiposConfigurados, setTiposConfigurados] = useState<TipoImpositivoConfigurable[]>(() => {
    const p = obtenerParametrosSistema();
    return Array.isArray(p.tiposImpositivos) && p.tiposImpositivos.length > 0
      ? p.tiposImpositivos
      : TIPOS_IMPOSITIVOS_PREDETERMINADOS;
  });
  const [tiposRetencionIRPFConfigurados, setTiposRetencionIRPFConfigurados] = useState<
    TipoRetencionIRPFConfigurable[]
  >(() => {
    const p = obtenerParametrosSistema();
    return Array.isArray(p.tiposRetencionIRPF) && p.tiposRetencionIRPF.length > 0
      ? p.tiposRetencionIRPF
      : TIPOS_RETENCION_IRPF_PREDETERMINADOS;
  });

  useEffect(() => {
    const handleParamsUpdated = () => {
      const p = obtenerParametrosSistema();
      setParametros(p);
      if (Array.isArray(p.tiposImpositivos) && p.tiposImpositivos.length > 0) {
        setTiposConfigurados(p.tiposImpositivos);
      }
      if (Array.isArray(p.tiposRetencionIRPF) && p.tiposRetencionIRPF.length > 0) {
        setTiposRetencionIRPFConfigurados(p.tiposRetencionIRPF);
      }
    };
    window.addEventListener('parametrosSistemaActualizados', handleParamsUpdated);
    window.addEventListener('storage', handleParamsUpdated);
    return () => {
      window.removeEventListener('parametrosSistemaActualizados', handleParamsUpdated);
      window.removeEventListener('storage', handleParamsUpdated);
    };
  }, []);

  const [baseImponible, setBaseImponible] = useState<number>(facturaInicial?.baseImponible || 0);
  const [tiposIVA, setTiposIVA] = useState<string>(() => {
    if (facturaInicial?.tiposIVA) return facturaInicial.tiposIVA;
    const p = obtenerParametrosSistema();
    return p.tipoIvaPredeterminado || '21%';
  });
  const [cuotaIVA, setCuotaIVA] = useState<number>(facturaInicial?.cuotaIVA || 0);
  const [aplicaRecargoEquivalencia, setAplicaRecargoEquivalencia] = useState<boolean>(() => {
    if (facturaInicial?.aplicaRecargoEquivalencia !== undefined) {
      return Boolean(facturaInicial.aplicaRecargoEquivalencia);
    }
    if (facturaInicial?.cuotaRecargoEquivalencia && facturaInicial.cuotaRecargoEquivalencia > 0) {
      return true;
    }
    if (facturaInicial?.tiposIVA?.toLowerCase().includes('re')) {
      return true;
    }
    const p = obtenerParametrosSistema();
    return Boolean(p.aplicaRecargoEquivalenciaDefecto);
  });
  const [porcentajeRE, setPorcentajeRE] = useState<number>(() => {
    if (facturaInicial?.tipoRecargoEquivalencia) {
      return parseFloat(facturaInicial.tipoRecargoEquivalencia.replace('%', '')) || 5.2;
    }
    const p = obtenerParametrosSistema();
    const info = analizarStringTipoImpositivo(facturaInicial?.tiposIVA || p.tipoIvaPredeterminado || '21%', p.tiposImpositivos);
    return info.porcentajeRE > 0 ? info.porcentajeRE : obtenerRecargoEquivalenciaSugerido(info.porcentaje, info.esCanario, info.esIpsi);
  });
  const [cuotaRecargoEquivalencia, setCuotaRecargoEquivalencia] = useState<number>(
    facturaInicial?.cuotaRecargoEquivalencia || 0
  );

  // Estados de Retención de IRPF (Profesionales, Alquileres, Autónomos)
  const [aplicaRetencionIRPF, setAplicaRetencionIRPF] = useState<boolean>(() => {
    if (facturaInicial?.aplicaRetencionIRPF !== undefined) {
      return Boolean(facturaInicial.aplicaRetencionIRPF);
    }
    if (facturaInicial?.cuotaIRPF && facturaInicial.cuotaIRPF > 0) {
      return true;
    }
    return false;
  });
  const [porcentajeIRPF, setPorcentajeIRPF] = useState<number>(() => {
    if (facturaInicial?.porcentajeIRPF !== undefined && !isNaN(facturaInicial.porcentajeIRPF)) {
      return facturaInicial.porcentajeIRPF;
    }
    if (facturaInicial?.tipoRetencionIRPF) {
      return extraerPorcentajeIRPF(facturaInicial.tipoRetencionIRPF);
    }
    const p = obtenerParametrosSistema();
    return p.porcentajeIrpfPredeterminado || 15;
  });
  const [tipoRetencionIRPF, setTipoRetencionIRPF] = useState<string>(() => {
    if (facturaInicial?.tipoRetencionIRPF) return facturaInicial.tipoRetencionIRPF;
    return '15%';
  });
  const [conceptoRetencionIRPF, setConceptoRetencionIRPF] = useState<ConceptoRetencionIRPF>(() => {
    if (facturaInicial?.conceptoRetencionIRPF) return facturaInicial.conceptoRetencionIRPF;
    const p = obtenerParametrosSistema();
    return p.conceptoIrpfPredeterminado || 'PROFESIONAL';
  });
  const [cuotaIRPF, setCuotaIRPF] = useState<number>(() => {
    if (facturaInicial?.cuotaIRPF !== undefined) return facturaInicial.cuotaIRPF;
    return 0;
  });

  const [regimenFiscal, setRegimenFiscal] = useState<string>(facturaInicial?.regimenFiscal || '');
  const [total, setTotal] = useState<number>(facturaInicial?.total || 0);
  const [estado, setEstado] = useState<'Pendiente' | 'Pagada' | 'Vencida'>(facturaInicial?.estado || 'Pendiente');
  const [fechaPago, setFechaPago] = useState<string>(facturaInicial?.fechaPago || 'Pendiente de confirmar');
  const [notas, setNotas] = useState<string>(facturaInicial?.notas || '');
  const [lineas, setLineas] = useState<ProductoLinea[]>(facturaInicial?.lineas || []);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reset or initialize state when modal opens or initial values change
  useEffect(() => {
    if (isOpen) {
      if (facturaInicial) {
        setIdFactura(facturaInicial.idFactura || '');
        setFechaEmision(facturaInicial.fechaEmision || new Date().toISOString().split('T')[0]);
        setFechaVencimiento(facturaInicial.fechaVencimiento || '');
        setNombreProveedor(facturaInicial.nombreProveedor || '');
        setIdProveedor(facturaInicial.idProveedor || '');
        setConcepto(facturaInicial.concepto || '');
        setCategoriaGasto(facturaInicial.categoriaGasto || 'Insumos');
        setCategoriaGastoJustificacion(facturaInicial.categoriaGastoJustificacion || '');
        setBaseImponible(facturaInicial.baseImponible || 0);
        setTiposIVA(facturaInicial.tiposIVA || '21%');
        setCuotaIVA(facturaInicial.cuotaIVA || 0);

        const tieneREInicial = Boolean(
          facturaInicial.aplicaRecargoEquivalencia ||
          (facturaInicial.cuotaRecargoEquivalencia && facturaInicial.cuotaRecargoEquivalencia > 0) ||
          facturaInicial.tiposIVA?.toLowerCase().includes('re')
        );
        setAplicaRecargoEquivalencia(tieneREInicial);

        const info = analizarStringTipoImpositivo(facturaInicial.tiposIVA || '21%');
        const rePct = facturaInicial.tipoRecargoEquivalencia
          ? parseFloat(facturaInicial.tipoRecargoEquivalencia.replace('%', ''))
          : info.porcentajeRE > 0
          ? info.porcentajeRE
          : obtenerRecargoEquivalenciaSugerido(info.porcentaje, info.esCanario);
        setPorcentajeRE(rePct);
        setCuotaRecargoEquivalencia(facturaInicial.cuotaRecargoEquivalencia || 0);
        setRegimenFiscal(facturaInicial.regimenFiscal || info.regimenEtiqueta);

        // Inicializar Retención IRPF
        const tieneIRPFInicial = Boolean(
          facturaInicial.aplicaRetencionIRPF ||
          (facturaInicial.cuotaIRPF && facturaInicial.cuotaIRPF > 0)
        );
        setAplicaRetencionIRPF(tieneIRPFInicial);
        const irpfPct = facturaInicial.porcentajeIRPF !== undefined
          ? facturaInicial.porcentajeIRPF
          : facturaInicial.tipoRetencionIRPF
          ? extraerPorcentajeIRPF(facturaInicial.tipoRetencionIRPF)
          : 15;
        setPorcentajeIRPF(irpfPct);
        setTipoRetencionIRPF(facturaInicial.tipoRetencionIRPF || `${irpfPct}%`);
        setConceptoRetencionIRPF(facturaInicial.conceptoRetencionIRPF || (irpfPct === 19 ? 'ARRENDAMIENTO' : 'PROFESIONAL'));
        setCuotaIRPF(facturaInicial.cuotaIRPF || 0);

        setTotal(facturaInicial.total || 0);
        setEstado(facturaInicial.estado || 'Pendiente');
        setFechaPago(facturaInicial.fechaPago || 'Pendiente de confirmar');
        setNotas(facturaInicial.notas || '');
        setLineas(facturaInicial.lineas || []);
        setSugerenciaIaActiva(Boolean(facturaInicial.categoriaGastoSugerida || facturaInicial.categoriaGastoJustificacion));
      }
      if (archivoInicial) {
        setFileBase64(archivoInicial.base64Data || '');
        setFileName(archivoInicial.fileName || '');
        setFileMimeType(archivoInicial.mimeType || 'application/pdf');
      }
    }
  }, [isOpen, facturaInicial, archivoInicial]);

  if (!isOpen) return null;

  // Helper to deduce category locally if needed
  const deducirCategoriaLocal = (prov: string, desc: string, items: ProductoLinea[]) => {
    const texto = `${prov} ${desc} ${items.map((l) => l.nombreProducto).join(' ')}`.toLowerCase();
    
    // Primero comprobar si coincide directamente con el nombre o descripción de alguna categoría personalizada
    for (const cat of categoriasGastoLista) {
      const nom = cat.nombre.toLowerCase();
      if (texto.includes(nom)) {
        return {
          cat: cat.nombre,
          razon: `Propuesto automáticamente como '${cat.nombre}' por coincidencia con "${prov || 'proveedor'}".`,
        };
      }
    }

    if (/transporte|logistica|logística|envio|envío|flete|porte|mensajer|paqueter|seur|dhl|mrw|gls|ups|nacex|fedex|reparto|distribuc/.test(texto)) {
      return {
        cat: 'Logística y Transporte',
        razon: `Propuesto automáticamente como 'Logística y Transporte' al identificar transportes, portes o envíos de "${prov || 'proveedor'}".`,
      };
    }
    if (/asesor|gestor|abogad|legal|software|licencia|hosting|cloud|consultor|seguro|limpieza|seguridad|auditor|honorario|banco|comision|cuota/.test(texto)) {
      return {
        cat: 'Servicios y Gestión',
        razon: `Propuesto automáticamente como 'Servicios y Gestión' por gestión profesional, tecnología o asesoría de "${prov || 'proveedor'}".`,
      };
    }
    if (/caja|carton|cartón|embalaj|envase|bolsa|film|bobina|kraft|etiqueta|empaque|plastico|plástico/.test(texto)) {
      return {
        cat: 'Envases y Embalajes',
        razon: `Propuesto automáticamente como 'Envases y Embalajes' por materiales de empaquetado suministrados por "${prov || 'proveedor'}".`,
      };
    }
    if (/electric|luz|gas|agua|energia|energía|iberdrola|endesa|naturgy|telefon|internet|fibra/.test(texto)) {
      return {
        cat: 'Suministros y Energía',
        razon: `Propuesto automáticamente como 'Suministros y Energía' por consumo de energía o telecomunicaciones.`,
      };
    }
    if (/mantenimiento|reparac|maquinaria|horno|motor|recambio|repuesto|tecnico|técnico|averia|avería/.test(texto)) {
      return {
        cat: 'Mantenimiento y Maquinaria',
        razon: `Propuesto automáticamente como 'Mantenimiento y Maquinaria' por asistencia técnica o piezas de maquinaria.`,
      };
    }
    return {
      cat: categoriasGastoLista[0]?.nombre || 'Materias Primas',
      razon: `Propuesto automáticamente como '${categoriasGastoLista[0]?.nombre || 'Materias Primas'}' para aprovisionamiento directo según el emisor "${prov || 'proveedor'}".`,
    };
  };

  // Convert File to Base64
  const leerArchivoABase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  };

  // Handle File Selection
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      setSelectedFile(file);
      setFileName(file.name);
      setFileMimeType(file.type || 'application/pdf');
      const b64 = await leerArchivoABase64(file);
      setFileBase64(b64);
      // Auto-trigger Gemini analysis
      await ejecutarAnalisisGemini(b64, file.type, file.name);
    } catch (err: any) {
      console.error('Error al leer archivo:', err);
      setAnalisisError('No se pudo cargar el archivo seleccionado.');
    }
  };

  // Call Gemini extraction API
  const ejecutarAnalisisGemini = async (base64String: string, mime: string, nombreDoc: string) => {
    setIsAnalyzing(true);
    setAnalisisError(null);
    setAnalisisEtapa('1/3: Escaneando archivo con Gemini AI...');

    try {
      const resolvedNegocio = {
        ...DEFAULT_DATOS_NEGOCIO,
        ...datosNegocio,
        sector: datosNegocio?.sector || DEFAULT_DATOS_NEGOCIO.sector,
        contextoOperativo: datosNegocio?.contextoOperativo || DEFAULT_DATOS_NEGOCIO.contextoOperativo,
      };

      setAnalisisEtapa('2/3: Extrayendo proveedor, importes y líneas de producto...');

      const response = await fetch('/api/gemini/extract-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileData: base64String,
          mimeType: mime || 'application/pdf',
          fileName: nombreDoc,
          nombreNegocio: resolvedNegocio.nombre,
          datosNegocio: resolvedNegocio,
          sector: resolvedNegocio.sector,
          contextoOperativo: resolvedNegocio.contextoOperativo,
          categoriasDisponibles: categoriasGastoLista,
          existingSuppliers: proveedoresExistentes.map((p) => ({
            id: p.idProveedor,
            nombre: p.nombreProveedor,
          })),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.factura) {
        throw new Error(data.error || data.detail || 'Error al procesar la factura con Gemini');
      }

      setAnalisisEtapa('3/3: Proponiendo categoría de gasto y autocompletando formulario...');

      const f: Factura = data.factura;

      // Autocomplete all form fields
      if (f.idFactura) setIdFactura(f.idFactura);
      if (f.fechaEmision) setFechaEmision(f.fechaEmision);
      if (f.fechaVencimiento) setFechaVencimiento(f.fechaVencimiento);
      if (f.nombreProveedor) setNombreProveedor(f.nombreProveedor);
      if (f.idProveedor) setIdProveedor(f.idProveedor);
      if (f.concepto) setConcepto(f.concepto);
      if (f.baseImponible !== undefined) setBaseImponible(f.baseImponible);
      if (f.tiposIVA) setTiposIVA(f.tiposIVA);
      if (f.cuotaIVA !== undefined) setCuotaIVA(f.cuotaIVA);
      if (f.total !== undefined) setTotal(f.total);
      if (f.estado) setEstado(f.estado as any);
      if (f.fechaPago) setFechaPago(f.fechaPago);
      if (f.notas) setNotas(f.notas);
      if (f.lineas && Array.isArray(f.lineas)) setLineas(f.lineas);

      // Autocompletar datos de Retención de IRPF si Gemini los ha detectado
      if (f.aplicaRetencionIRPF !== undefined || (f.cuotaIRPF && f.cuotaIRPF > 0)) {
        const tieneRetencion = Boolean(f.aplicaRetencionIRPF || (f.cuotaIRPF && f.cuotaIRPF > 0));
        setAplicaRetencionIRPF(tieneRetencion);
        if (f.porcentajeIRPF) setPorcentajeIRPF(f.porcentajeIRPF);
        if (f.tipoRetencionIRPF) setTipoRetencionIRPF(f.tipoRetencionIRPF);
        if (f.cuotaIRPF) setCuotaIRPF(f.cuotaIRPF);
        if (f.conceptoRetencionIRPF) setConceptoRetencionIRPF(f.conceptoRetencionIRPF as any);
      }

      // AUTOCOMPLETE PROPOSED EXPENSE CATEGORY
      const categoriaPropuesta = f.categoriaGasto || 'Insumos';
      setCategoriaGasto(categoriaPropuesta);
      
      const justificacionPropuesta =
        f.categoriaGastoJustificacion ||
        `Propuesto automáticamente por Gemini en base al proveedor "${f.nombreProveedor}" y la descripción "${f.concepto || f.lineas?.[0]?.nombreProducto || 'productos'}".`;
      setCategoriaGastoJustificacion(justificacionPropuesta);
      setSugerenciaIaActiva(true);
    } catch (err: any) {
      console.warn('Fallo en análisis Gemini, aplicando inferencia inteligente de respaldo:', err);
      setAnalisisError(
        err?.message || 'Gemini no pudo extraer los datos automáticamente. Puedes completar el formulario manualmente.'
      );
      // Even if API fails, propose category from file name or previous values
      const fallback = deducirCategoriaLocal(nombreProveedor || fileName, concepto, lineas);
      setCategoriaGasto(fallback.cat);
      setCategoriaGastoJustificacion(fallback.razon);
      setSugerenciaIaActiva(true);
    } finally {
      setIsAnalyzing(false);
      setAnalisisEtapa('');
    }
  };

  // Re-deduce category on demand
  const handleRededucirCategoria = () => {
    const deducido = deducirCategoriaLocal(nombreProveedor, concepto, lineas);
    setCategoriaGasto(deducido.cat);
    setCategoriaGastoJustificacion(deducido.razon);
    setSugerenciaIaActiva(true);
  };

  // Recalculate IVA, Recargo de Equivalencia, Retención IRPF, and Total
  const recalcularTotales = (
    base: number,
    tipoStr: string,
    tieneRE: boolean,
    rePct: number,
    tieneIRPF: boolean = aplicaRetencionIRPF,
    irpfPct: number = porcentajeIRPF,
    irpfConcepto: ConceptoRetencionIRPF = conceptoRetencionIRPF
  ) => {
    const res = calcularLiquidacionFactura({
      baseImponible: base,
      tipoString: tipoStr,
      aplicaRecargo: tieneRE,
      porcentajeREManual: rePct,
      catalogo: tiposConfigurados,
      aplicaIRPF: tieneIRPF,
      porcentajeIRPFManual: irpfPct,
      conceptoIRPF: irpfConcepto,
      catalogoIRPF: tiposRetencionIRPFConfigurados,
    });
    setCuotaIVA(res.cuotaImpuesto);
    setCuotaRecargoEquivalencia(res.cuotaRE);
    setCuotaIRPF(res.cuotaIRPF);
    setRegimenFiscal(res.regimenEtiqueta);
    setTotal(res.total);
  };

  const handleBaseChange = (val: number) => {
    setBaseImponible(val);
    recalcularTotales(val, tiposIVA, aplicaRecargoEquivalencia, porcentajeRE, aplicaRetencionIRPF, porcentajeIRPF, conceptoRetencionIRPF);
  };

  const handleTipoIvaChange = (tipo: string) => {
    setTiposIVA(tipo);
    const info = analizarStringTipoImpositivo(tipo, tiposConfigurados);
    const sugeridoRE =
      info.porcentajeRE > 0
        ? info.porcentajeRE
        : obtenerRecargoEquivalenciaSugerido(info.porcentaje, info.esCanario, info.esIpsi);

    // Si el tipo impositivo configurado marca que sugiere recargo por defecto, activarlo
    const matched = tiposConfigurados.find(
      (t) => t.valor === tipo || t.nombre === tipo || t.id === tipo
    );

    let nuevoTieneRE = aplicaRecargoEquivalencia;
    if (matched?.aplicaRecargoDefecto && !aplicaRecargoEquivalencia) {
      nuevoTieneRE = true;
      setAplicaRecargoEquivalencia(true);
    }

    setPorcentajeRE(sugeridoRE);
    recalcularTotales(baseImponible, tipo, nuevoTieneRE, sugeridoRE, aplicaRetencionIRPF, porcentajeIRPF, conceptoRetencionIRPF);
  };

  const handleRecargoToggle = (activo: boolean) => {
    setAplicaRecargoEquivalencia(activo);
    recalcularTotales(baseImponible, tiposIVA, activo, porcentajeRE, aplicaRetencionIRPF, porcentajeIRPF, conceptoRetencionIRPF);
  };

  const handlePorcentajeREChange = (nuevoPct: number) => {
    setPorcentajeRE(nuevoPct);
    recalcularTotales(baseImponible, tiposIVA, aplicaRecargoEquivalencia, nuevoPct, aplicaRetencionIRPF, porcentajeIRPF, conceptoRetencionIRPF);
  };

  // Handlers para Retención de IRPF
  const handleRetencionIrpfToggle = (activo: boolean) => {
    setAplicaRetencionIRPF(activo);
    recalcularTotales(baseImponible, tiposIVA, aplicaRecargoEquivalencia, porcentajeRE, activo, porcentajeIRPF, conceptoRetencionIRPF);
  };

  const handlePorcentajeIrpfChange = (
    nuevoPct: number,
    concepto?: ConceptoRetencionIRPF,
    etiqueta?: string
  ) => {
    setPorcentajeIRPF(nuevoPct);
    if (concepto) setConceptoRetencionIRPF(concepto);
    if (etiqueta) setTipoRetencionIRPF(etiqueta);
    else setTipoRetencionIRPF(`${nuevoPct}%`);
    recalcularTotales(
      baseImponible,
      tiposIVA,
      aplicaRecargoEquivalencia,
      porcentajeRE,
      aplicaRetencionIRPF,
      nuevoPct,
      concepto || conceptoRetencionIRPF
    );
  };

  const handleConceptoIrpfChange = (concepto: ConceptoRetencionIRPF) => {
    setConceptoRetencionIRPF(concepto);
  };

  const handleCuotaIrpfManual = (val: number) => {
    setCuotaIRPF(val);
    const re = aplicaRecargoEquivalencia ? cuotaRecargoEquivalencia : 0;
    const bruto = baseImponible + cuotaIVA + re;
    setTotal(Math.max(0, Math.round((bruto - val) * 100) / 100));
  };

  // Lines management
  const handleAddLinea = () => {
    setLineas([
      ...lineas,
      {
        nombreProducto: 'Nuevo producto o servicio',
        cantidad: 1,
        unidad: 'ud',
        precioUnitario: 0,
        subtotal: 0,
      },
    ]);
  };

  const handleUpdateLinea = (idx: number, campo: keyof ProductoLinea, valor: any) => {
    setLineas((prev) =>
      prev.map((l, i) => {
        if (i !== idx) return l;
        const updated = { ...l, [campo]: valor };
        if (campo === 'cantidad' || campo === 'precioUnitario') {
          updated.subtotal = Math.round((updated.cantidad || 0) * (updated.precioUnitario || 0) * 100) / 100;
        }
        return updated;
      })
    );
  };

  const handleRemoveLinea = (idx: number) => {
    setLineas((prev) => prev.filter((_, i) => i !== idx));
  };

  // Submit and Save
  const handleGuardar = async () => {
    if (!idFactura.trim()) {
      setGuardadoError('El Número de Factura es obligatorio.');
      return;
    }
    if (!nombreProveedor.trim()) {
      setGuardadoError('El Nombre del Proveedor es obligatorio.');
      return;
    }
    if (!categoriaGasto.trim()) {
      setGuardadoError('Debes seleccionar una Categoría de Gasto.');
      return;
    }

    setIsSaving(true);
    setGuardadoError(null);

    try {
      const facturaAGuardar: Factura = {
        idFactura: idFactura.trim(),
        fechaEmision: fechaEmision || new Date().toISOString().split('T')[0],
        fechaVencimiento: fechaVencimiento || fechaEmision || new Date().toISOString().split('T')[0],
        idProveedor: idProveedor.trim() || 'PROV-NUEVO',
        nombreProveedor: nombreProveedor.trim(),
        concepto: concepto.trim() || lineas?.[0]?.nombreProducto || 'Compra a proveedor',
        importe: baseImponible,
        baseImponible: baseImponible,
        tiposIVA: aplicaRecargoEquivalencia && !tiposIVA.includes('RE') ? `${tiposIVA} + ${porcentajeRE}% RE` : tiposIVA,
        cuotaIVA: cuotaIVA,
        regimenFiscal: regimenFiscal || (tiposIVA.includes('IGIC') ? 'IGIC Canario' : 'Régimen General Peninsular'),
        tipoImpuestoNombre: tiposIVA.includes('IGIC') ? 'IGIC' : 'IVA',
        aplicaRecargoEquivalencia: aplicaRecargoEquivalencia,
        tipoRecargoEquivalencia: aplicaRecargoEquivalencia ? `${porcentajeRE}%` : undefined,
        cuotaRecargoEquivalencia: aplicaRecargoEquivalencia ? cuotaRecargoEquivalencia : 0,
        // Retención de IRPF
        aplicaRetencionIRPF: aplicaRetencionIRPF,
        tipoRetencionIRPF: aplicaRetencionIRPF ? tipoRetencionIRPF : undefined,
        porcentajeIRPF: aplicaRetencionIRPF ? porcentajeIRPF : undefined,
        cuotaIRPF: aplicaRetencionIRPF ? cuotaIRPF : 0,
        conceptoRetencionIRPF: aplicaRetencionIRPF ? conceptoRetencionIRPF : undefined,
        total: total || (baseImponible + cuotaIVA + (aplicaRecargoEquivalencia ? cuotaRecargoEquivalencia : 0) - (aplicaRetencionIRPF ? cuotaIRPF : 0)),
        categoriaGasto: categoriaGasto as any,
        categoriaGastoJustificacion: categoriaGastoJustificacion,
        categoriaGastoSugerida: sugerenciaIaActiva,
        estado: estado,
        fechaPago: estado === 'Pagada' ? fechaPago : 'Pendiente de confirmar',
        notas: notas.trim() || undefined,
        lineas: lineas,
        archivoNombre: fileName || facturaInicial?.archivoNombre,
        archivoBase64: fileBase64 || facturaInicial?.archivoBase64,
        driveFileUrl: facturaInicial?.driveFileUrl,
        driveFolderUrl: facturaInicial?.driveFolderUrl,
        driveGuardado: facturaInicial?.driveGuardado,
      };

      await onSaveFactura(facturaAGuardar, {
        base64Data: fileBase64,
        fileName: fileName,
        mimeType: fileMimeType,
      });

      onClose();
    } catch (err: any) {
      console.error('Error al guardar factura:', err);
      setGuardadoError(err?.message || 'Error al persistir la factura.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-[#0b111d] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-950/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-100 flex items-center gap-2">
                Formulario de Factura & Análisis Gemini
                {sugerenciaIaActiva && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-semibold uppercase tracking-wider">
                    Categorización IA Activa
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-400">
                Sube o escanea un documento para autocompletar los datos y proponer la categoría de gasto según el proveedor y productos.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* UPLOAD & GEMINI TRIGGER BANNER */}
          <div className="p-4 rounded-xl bg-gradient-to-r from-slate-900 via-slate-900 to-[#141b2d] border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 text-rose-400">
                <FileText className="w-6 h-6" />
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                  <span>Documento Origen:</span>
                  <span className="font-mono text-rose-400 truncate max-w-xs">{fileName || 'Ningún archivo cargado todavía'}</span>
                </div>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Admite archivos PDF, JPG y PNG. Al seleccionar uno nuevo, Gemini lo analizará automáticamente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,image/*,application/pdf"
                className="hidden"
                onChange={handleFileChange}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isAnalyzing}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <UploadCloud className="w-4 h-4 text-slate-400" />
                <span>{fileName ? 'Cambiar Archivo' : 'Cargar Archivo'}</span>
              </button>

              {fileBase64 && (
                <button
                  type="button"
                  onClick={() => ejecutarAnalisisGemini(fileBase64, fileMimeType, fileName || 'documento.pdf')}
                  disabled={isAnalyzing}
                  className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {isAnalyzing ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Analizando...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                      <span>Re-analizar con Gemini</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>

          {/* AI ANALYZING PROGRESS FEEDBACK */}
          {isAnalyzing && (
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-800/40 space-y-2 text-center animate-pulse">
              <div className="flex items-center justify-center gap-2 text-rose-400 text-xs font-bold">
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Gemini está analizando la factura en tiempo real</span>
              </div>
              <p className="text-xs text-slate-300 font-medium">{analisisEtapa}</p>
            </div>
          )}

          {analisisError && (
            <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 flex items-start gap-2.5 text-xs text-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold">Aviso en análisis Gemini:</span> {analisisError}
              </div>
            </div>
          )}

          {/* FORMULARIO */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* 1. Proveedor & Emisor */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Proveedor / Emisor *</span>
                <span className="text-[10px] text-slate-500">Razón social</span>
              </label>
              <div className="relative">
                <Building2 className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={nombreProveedor}
                  onChange={(e) => setNombreProveedor(e.target.value)}
                  placeholder="Ej: Harinas del Sur S.L."
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* 2. CIF/NIF del Proveedor */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">CIF / NIF Proveedor</label>
              <input
                type="text"
                value={idProveedor}
                onChange={(e) => setIdProveedor(e.target.value)}
                placeholder="Ej: B12345678"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            {/* 3. Nº Factura */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Número de Factura *</label>
              <input
                type="text"
                value={idFactura}
                onChange={(e) => setIdFactura(e.target.value)}
                placeholder="Ej: FAC-2026-089"
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            {/* 4. Fechas Emisión & Vencimiento */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Fecha Emisión</label>
                <input
                  type="date"
                  value={fechaEmision}
                  onChange={(e) => setFechaEmision(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Vencimiento</label>
                <input
                  type="date"
                  value={fechaVencimiento}
                  onChange={(e) => setFechaVencimiento(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            {/* 5. Concepto o Descripción del Producto */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span>Concepto / Descripción del Producto o Servicio *</span>
                <span className="text-[10px] text-slate-400">Determina la categoría contable</span>
              </label>
              <input
                type="text"
                value={concepto}
                onChange={(e) => setConcepto(e.target.value)}
                placeholder="Ej: Suministro de harina de fuerza 25kg, levaduras y materias primas"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500"
              />
            </div>

            {/* 6. CAMPO DESTACADO: CATEGORÍA DE GASTO AUTOCOMPLETADA POR GEMINI */}
            <div className="md:col-span-2 p-4 rounded-xl bg-gradient-to-br from-[#121c2e] to-[#0c1422] border-2 border-slate-700/80 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <label className="text-xs font-bold text-slate-100 flex items-center gap-2">
                  <Tag className="w-4 h-4 text-rose-400" />
                  <span>CATEGORÍA DE GASTO (Catálogo Personalizado) *</span>
                </label>

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => setIsCategoriasModalOpen(true)}
                    className="text-[11px] font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 cursor-pointer bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20"
                    title="Crear o editar categorías de gasto personalizadas con color y descripción"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Gestionar Categorías</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRededucirCategoria}
                    className="text-[11px] font-semibold text-amber-400 hover:text-amber-300 flex items-center gap-1 cursor-pointer bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20"
                    title="Deducir nuevamente la categoría en base al proveedor y descripción ingresados"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Re-deducir con IA</span>
                  </button>
                </div>
              </div>

              {/* Selector principal de categoría */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <select
                    value={categoriaGasto}
                    onChange={(e) => {
                      setCategoriaGasto(e.target.value);
                      setSugerenciaIaActiva(false);
                    }}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-900 border border-slate-600 text-slate-100 text-xs font-bold focus:outline-none focus:border-rose-500"
                  >
                    {categoriasGastoLista.map((cat) => (
                      <option key={cat.id} value={cat.nombre}>
                        {cat.nombre}
                      </option>
                    ))}
                    {!categoriasGastoLista.some((c) => c.nombre.toLowerCase() === categoriaGasto.toLowerCase()) && (
                      <option value={categoriaGasto}>{categoriaGasto}</option>
                    )}
                  </select>
                </div>

                {/* Chips rápidos de categorías dinámicas con color */}
                <div className="flex flex-wrap items-center gap-1.5 max-h-24 overflow-y-auto pr-1">
                  {categoriasGastoLista.map((cat) => {
                    const isSelected = categoriaGasto.toLowerCase() === cat.nombre.toLowerCase();
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => {
                          setCategoriaGasto(cat.nombre);
                          setSugerenciaIaActiva(false);
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                          isSelected
                            ? 'text-white shadow-md'
                            : 'bg-slate-800/90 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/70'
                        }`}
                        style={
                          isSelected
                            ? {
                                backgroundColor: cat.color,
                                boxShadow: `0 4px 12px ${cat.color}40`,
                              }
                            : undefined
                        }
                        title={cat.descripcion || cat.nombre}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: isSelected ? '#ffffff' : cat.color }}
                        />
                        <span>{cat.nombre}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Justificación y Badge de propuesta automática */}
              {categoriaGastoJustificacion && (
                <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-300">
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-0.5">
                    <div className="font-semibold text-amber-300 flex items-center gap-1.5">
                      <span>Propuesta automática de Gemini basada en proveedor y producto:</span>
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold text-[10px]">
                        {categoriaGasto}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed font-sans">
                      {categoriaGastoJustificacion}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* 7. Importes Económicos */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Base Imponible (€)</label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  value={baseImponible || ''}
                  onChange={(e) => handleBaseChange(parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500 font-mono font-medium"
                />
              </div>
            </div>

            {/* Selector de Tipo Impositivo y Régimen Fiscal */}
            <div className="space-y-3 p-3.5 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold text-slate-300">Tipo Impositivo</label>
                    <span className="text-[10px] text-sky-400 font-mono">
                      {tiposIVA.toUpperCase().includes('IPSI')
                        ? 'Régimen Ceuta / Melilla (IPSI)'
                        : tiposIVA.toUpperCase().includes('IGIC')
                        ? 'Régimen Canario (IGIC)'
                        : tiposIVA.includes('Temp') || tiposIVA === '0%' || tiposIVA === '5%' || tiposIVA === '2%'
                        ? 'Tipo Temporal / Especial'
                        : 'IVA Peninsular'}
                    </span>
                  </div>
                  <select
                    value={tiposIVA}
                    onChange={(e) => handleTipoIvaChange(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500 font-mono"
                  >
                    {/* Agrupación de Tipos Peninsulares Ordinarios */}
                    {tiposConfigurados.some((t) => t.habilitado && t.tipoImpuesto === 'IVA' && !t.esTemporal && !t.esPersonalizado) && (
                      <optgroup label="Régimen General Peninsular (IVA)">
                        {tiposConfigurados
                          .filter((t) => t.habilitado && t.tipoImpuesto === 'IVA' && !t.esTemporal && !t.esPersonalizado)
                          .map((t) => (
                            <option key={t.id} value={t.valor}>
                              {t.nombre} ({t.porcentaje}%{t.porcentajeRecargo > 0 ? ` + R.E. ${t.porcentajeRecargo}%` : ''})
                            </option>
                          ))}
                      </optgroup>
                    )}

                    {/* Agrupación de Tipos Temporales / Alimentos */}
                    {tiposConfigurados.some((t) => t.habilitado && t.esTemporal) && (
                      <optgroup label="Tipos Temporales / RDL Alimentos y Aceites">
                        {tiposConfigurados
                          .filter((t) => t.habilitado && t.esTemporal)
                          .map((t) => (
                            <option key={t.id} value={t.valor}>
                              {t.nombre} ({t.porcentaje}%{t.porcentajeRecargo > 0 ? ` + R.E. ${t.porcentajeRecargo}%` : ''})
                            </option>
                          ))}
                      </optgroup>
                    )}

                    {/* Agrupación Canario (IGIC) */}
                    {tiposConfigurados.some((t) => t.habilitado && t.tipoImpuesto === 'IGIC') && (
                      <optgroup label="Régimen Canario (IGIC)">
                        {tiposConfigurados
                          .filter((t) => t.habilitado && t.tipoImpuesto === 'IGIC')
                          .map((t) => (
                            <option key={t.id} value={t.valor}>
                              {t.nombre} ({t.porcentaje}%)
                            </option>
                          ))}
                      </optgroup>
                    )}

                    {/* Agrupación Ceuta y Melilla (IPSI) */}
                    {tiposConfigurados.some((t) => t.habilitado && t.tipoImpuesto === 'IPSI') && (
                      <optgroup label="Régimen Ceuta y Melilla (IPSI)">
                        {tiposConfigurados
                          .filter((t) => t.habilitado && t.tipoImpuesto === 'IPSI')
                          .map((t) => (
                            <option key={t.id} value={t.valor}>
                              {t.nombre} ({t.porcentaje}%)
                            </option>
                          ))}
                      </optgroup>
                    )}

                    {/* Agrupación Personalizados / Otros */}
                    {tiposConfigurados.some((t) => t.habilitado && (t.esPersonalizado || t.tipoImpuesto === 'OTRO')) && (
                      <optgroup label="Tipos Personalizados de Empresa">
                        {tiposConfigurados
                          .filter((t) => t.habilitado && (t.esPersonalizado || t.tipoImpuesto === 'OTRO'))
                          .map((t) => (
                            <option key={t.id} value={t.valor}>
                              {t.nombre} ({t.porcentaje}%)
                            </option>
                          ))}
                      </optgroup>
                    )}

                    {/* Agrupación Exentos */}
                    {tiposConfigurados.some((t) => t.habilitado && (t.tipoImpuesto === 'EXENTO' || t.valor.includes('Exento'))) && (
                      <optgroup label="Operaciones Exentas / Especiales">
                        {tiposConfigurados
                          .filter((t) => t.habilitado && (t.tipoImpuesto === 'EXENTO' || t.valor.includes('Exento')))
                          .map((t) => (
                            <option key={t.id} value={t.valor}>
                              {t.nombre}
                            </option>
                          ))}
                        <option value="10% y 21%">10% y 21% - Factura con tipos mixtos</option>
                      </optgroup>
                    )}

                    {/* Fallback si el valor actual no está en la lista de habilitados */}
                    {!tiposConfigurados.some((t) => t.habilitado && t.valor === tiposIVA) && (
                      <optgroup label="Valor Actual de la Factura">
                        <option value={tiposIVA}>{tiposIVA}</option>
                      </optgroup>
                    )}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300">
                    Cuota {tiposIVA.toUpperCase().includes('IPSI') ? 'IPSI' : tiposIVA.toUpperCase().includes('IGIC') ? 'IGIC' : 'IVA'} (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={cuotaIVA || ''}
                    onChange={(e) => {
                      const c = parseFloat(e.target.value) || 0;
                      setCuotaIVA(c);
                      const re = aplicaRecargoEquivalencia ? cuotaRecargoEquivalencia : 0;
                      setTotal(Math.round((baseImponible + c + re) * 100) / 100);
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-sky-400 text-xs focus:outline-none focus:border-rose-500 font-mono font-medium"
                  />
                </div>
              </div>

              {/* Toggle de Recargo de Equivalencia (R.E.) */}
              <div className="pt-2 border-t border-slate-800/80">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aplicaRecargoEquivalencia}
                    onChange={(e) => handleRecargoToggle(e.target.checked)}
                    className="w-4 h-4 rounded text-purple-600 bg-slate-950 border-slate-700 focus:ring-purple-500 focus:ring-offset-slate-900"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-purple-300 font-semibold">
                    <span>Aplicar Régimen de Recargo de Equivalencia (R.E.)</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-200 font-normal">
                      Comercio Minorista
                    </span>
                  </div>
                </label>

                {aplicaRecargoEquivalencia && (
                  <div className="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2.5 p-2.5 rounded-xl bg-purple-950/20 border border-purple-800/40 animate-in fade-in duration-150">
                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-purple-300">Tipo R.E. (%)</label>
                      <div className="flex items-center gap-1.5">
                        <select
                          value={porcentajeRE}
                          onChange={(e) => handlePorcentajeREChange(parseFloat(e.target.value) || 5.2)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-purple-700/50 text-purple-200 text-xs font-mono"
                        >
                          <option value="5.2">5,20% (Correspondiente a IVA 21%)</option>
                          <option value="1.4">1,40% (Correspondiente a IVA 10%)</option>
                          <option value="0.5">0,50% (Correspondiente a IVA 4%)</option>
                          <option value="0.62">0,62% (Correspondiente a IVA 5% temporal)</option>
                          <option value="0.26">0,26% (Correspondiente a IVA 2% temporal)</option>
                          <option value="0.7">0,70% (Recargo minorista IGIC 7%)</option>
                          <option value="0.3">0,30% (Recargo minorista IGIC 3%)</option>
                          {tiposConfigurados
                            .filter((t) => t.porcentajeRecargo > 0 && ![5.2, 1.4, 0.5, 0.62, 0.26, 0.7, 0.3].includes(t.porcentajeRecargo))
                            .map((t) => (
                              <option key={t.id} value={t.porcentajeRecargo}>
                                {t.porcentajeRecargo}% ({t.nombre})
                              </option>
                            ))}
                        </select>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[11px] font-medium text-purple-300">Cuota R.E. (€)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={cuotaRecargoEquivalencia || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setCuotaRecargoEquivalencia(val);
                          const irpfDeducir = aplicaRetencionIRPF ? cuotaIRPF : 0;
                          setTotal(Math.max(0, Math.round((baseImponible + cuotaIVA + val - irpfDeducir) * 100) / 100));
                        }}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-purple-700/50 text-purple-300 text-xs font-mono font-medium"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Toggle de Retención de IRPF (Autónomos / Profesionales / Arrendamiento) */}
              <div className="pt-2.5 border-t border-slate-800/80">
                <label className="flex items-center gap-2.5 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aplicaRetencionIRPF}
                    onChange={(e) => handleRetencionIrpfToggle(e.target.checked)}
                    className="w-4 h-4 rounded text-emerald-600 bg-slate-950 border-slate-700 focus:ring-emerald-500 focus:ring-offset-slate-900"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-emerald-300 font-semibold">
                    <span>Aplicar Retención de IRPF a Cuenta</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-200 font-normal">
                      Autónomos / Profesionales / Alquiler
                    </span>
                  </div>
                </label>

                {aplicaRetencionIRPF && (
                  <div className="mt-2.5 p-3 rounded-xl bg-emerald-950/20 border border-emerald-800/40 space-y-3 animate-in fade-in duration-150">
                    {/* Botones de Selección Rápida de Tipo de Retención */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-semibold text-emerald-300">
                          Selección rápida de retención:
                        </span>
                        <span className="text-[10px] font-mono text-emerald-400 font-bold">
                          -{porcentajeIRPF}% IRPF (-{cuotaIRPF.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €)
                        </span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                        <button
                          type="button"
                          onClick={() => handlePorcentajeIrpfChange(15, 'PROFESIONAL', '15% Profesional')}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-left transition-all border cursor-pointer ${
                            porcentajeIRPF === 15 && conceptoRetencionIRPF === 'PROFESIONAL'
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                              : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-emerald-700/60 hover:text-emerald-200'
                          }`}
                        >
                          <div className="font-bold">15% Profesional</div>
                          <div className="text-[9px] opacity-80">Mod. 111 General</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePorcentajeIrpfChange(7, 'PROFESIONAL', '7% Nuevos Autónomos')}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-left transition-all border cursor-pointer ${
                            porcentajeIRPF === 7
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                              : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-emerald-700/60 hover:text-emerald-200'
                          }`}
                        >
                          <div className="font-bold">7% Nuevo Autónomo</div>
                          <div className="text-[9px] opacity-80">Mod. 111 Reducido</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePorcentajeIrpfChange(19, 'ARRENDAMIENTO', '19% Arrendamiento')}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-left transition-all border cursor-pointer ${
                            porcentajeIRPF === 19 && conceptoRetencionIRPF === 'ARRENDAMIENTO'
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                              : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-emerald-700/60 hover:text-emerald-200'
                          }`}
                        >
                          <div className="font-bold">19% Alquiler</div>
                          <div className="text-[9px] opacity-80">Mod. 115 Inmuebles</div>
                        </button>

                        <button
                          type="button"
                          onClick={() => handlePorcentajeIrpfChange(2, 'AGRARIO', '2% Agrario')}
                          className={`px-2 py-1.5 rounded-lg text-[11px] font-semibold text-left transition-all border cursor-pointer ${
                            porcentajeIRPF === 2
                              ? 'bg-emerald-600 text-white border-emerald-500 shadow-xs'
                              : 'bg-slate-950/80 text-slate-300 border-slate-800 hover:border-emerald-700/60 hover:text-emerald-200'
                          }`}
                        >
                          <div className="font-bold">2% Agrario / Gan.</div>
                          <div className="text-[9px] opacity-80">Mod. 111 Sectorial</div>
                        </button>
                      </div>
                    </div>

                    {/* Controles de Porcentaje, Concepto y Cuota retenida */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-emerald-300">
                          % Retención IRPF
                        </label>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            max="50"
                            value={porcentajeIRPF}
                            onChange={(e) => handlePorcentajeIrpfChange(parseFloat(e.target.value) || 0)}
                            className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-emerald-700/50 text-emerald-200 text-xs font-mono font-bold"
                          />
                          <span className="text-xs text-emerald-400 font-mono">%</span>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-emerald-300">
                          Concepto y Modelo AEAT
                        </label>
                        <select
                          value={conceptoRetencionIRPF}
                          onChange={(e) => handleConceptoIrpfChange(e.target.value as ConceptoRetencionIRPF)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-emerald-700/50 text-emerald-200 text-xs font-sans"
                        >
                          <option value="PROFESIONAL">Actividad Profesional (Mod. 111)</option>
                          <option value="ARRENDAMIENTO">Alquiler / Inmueble Urbano (Mod. 115)</option>
                          <option value="AGRARIO">Actividad Agrícola / Ganadera (Mod. 111)</option>
                          <option value="CAPITAL_MOBILIARIO">Capital Mobiliario / Licencias (Mod. 123)</option>
                          <option value="OTRO">Otros Rendimientos / Especial</option>
                        </select>
                      </div>

                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-emerald-300">
                          Cuota Retenida (€ a restar)
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          value={cuotaIRPF || ''}
                          onChange={(e) => handleCuotaIrpfManual(parseFloat(e.target.value) || 0)}
                          className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-emerald-700/50 text-emerald-300 text-xs font-mono font-bold"
                          title="Importe deducido del total a pagar e ingresado a la Agencia Tributaria"
                        />
                      </div>
                    </div>

                    <div className="text-[10px] text-emerald-400/80 bg-emerald-950/40 p-2 rounded-lg border border-emerald-800/30 flex items-center justify-between">
                      <span>💡 Esta retención minorará el total a pagar al proveedor y se liquidará ante Hacienda.</span>
                      <span className="font-mono font-bold text-emerald-300">
                        Base ({baseImponible.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €) × {porcentajeIRPF}% = {cuotaIRPF.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Resumen Financiero de la Liquidación (Base + IVA/IGIC + RE - IRPF = Total Líquido) */}
            <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-1.5 font-mono">
              <div className="flex items-center justify-between text-slate-400">
                <span>Base Imponible:</span>
                <span>{baseImponible.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
              </div>
              <div className="flex items-center justify-between text-sky-400">
                <span>(+) Cuota {tiposIVA.toUpperCase().includes('IPSI') ? 'IPSI' : tiposIVA.toUpperCase().includes('IGIC') ? 'IGIC' : 'IVA'} ({tiposIVA}):</span>
                <span>+{cuotaIVA.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
              </div>
              {aplicaRecargoEquivalencia && cuotaRecargoEquivalencia > 0 && (
                <div className="flex items-center justify-between text-purple-400">
                  <span>(+) Recargo de Equivalencia ({porcentajeRE}%):</span>
                  <span>+{cuotaRecargoEquivalencia.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
              )}
              {aplicaRetencionIRPF && cuotaIRPF > 0 && (
                <div className="flex items-center justify-between text-emerald-400 font-semibold bg-emerald-950/20 px-1.5 py-0.5 rounded">
                  <span>(-) Retención IRPF ({porcentajeIRPF}% - {conceptoRetencionIRPF === 'ARRENDAMIENTO' ? 'Mod. 115' : 'Mod. 111'}):</span>
                  <span>-{cuotaIRPF.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                </div>
              )}
              <div className="border-t border-slate-800 pt-1.5 flex items-center justify-between font-bold text-sm">
                <span className="text-slate-200">TOTAL LÍQUIDO A PAGAR:</span>
                <span className="text-rose-400">{total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
              </div>
            </div>

            {/* Total Factura Editable */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-200">TOTAL LÍQUIDO FACTURA (€) *</label>
                {aplicaRetencionIRPF && (
                  <span className="text-[10px] text-emerald-400 font-medium">
                    (Importe neto resultante tras descontar la retención de IRPF)
                  </span>
                )}
              </div>
              <input
                type="number"
                step="0.01"
                value={total || ''}
                onChange={(e) => setTotal(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-rose-400 text-sm font-black focus:outline-none focus:border-rose-500 font-mono"
              />
            </div>

            {/* Estado de Pago */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Estado Pago</label>
                <select
                  value={estado}
                  onChange={(e) => setEstado(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500 font-semibold"
                >
                  <option value="Pendiente">Pendiente</option>
                  <option value="Pagada">Pagada</option>
                  <option value="Vencida">Vencida</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-slate-300">Fecha Pago</label>
                <input
                  type="text"
                  value={fechaPago}
                  onChange={(e) => setFechaPago(e.target.value)}
                  placeholder="YYYY-MM-DD o Pendiente"
                  className="w-full px-3 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-rose-500 font-mono"
                />
              </div>
            </div>

            {/* Notas y Recordatorios Específicos */}
            <div className="md:col-span-2 space-y-1.5 pt-1">
              <label htmlFor="input-factura-notas" className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                <span className="flex items-center gap-1.5 text-amber-300">
                  <StickyNote className="w-3.5 h-3.5" />
                  <span>Notas o Recordatorios Específicos (Opcional)</span>
                </span>
                <span className="text-[11px] text-slate-400">Comentarios internos, acuerdos o recordatorios</span>
              </label>
              <textarea
                id="input-factura-notas"
                rows={2}
                value={notas}
                onChange={(e) => setNotas(e.target.value)}
                placeholder="Añade notas o recordatorios específicos sobre esta factura (ej: pago acordado con 5% de descuento por pronto pago, pendiente de cotejar con albarán nº 412, abono previsto en próxima remesa...)"
                className="w-full px-3 py-2.5 rounded-xl bg-slate-900 border border-slate-700 text-slate-100 text-xs focus:outline-none focus:border-amber-500/70 placeholder:text-slate-400 resize-y transition-colors leading-relaxed"
              />
            </div>
          </div>

          {/* 8. Líneas de Producto Desglosadas */}
          <div className="space-y-3 pt-2 border-t border-slate-800">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                  Líneas de Producto / Servicios Desglosados ({lineas.length})
                </h4>
                <p className="text-[11px] text-slate-400">
                  Permiten el control de subidas de precio y análisis de compras.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddLinea}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 border border-slate-700 transition-all cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Añadir Línea</span>
              </button>
            </div>

            {lineas.length > 0 ? (
              <div className="overflow-x-auto border border-slate-800 rounded-xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/90 text-slate-400 font-bold border-b border-slate-800 text-[10px] uppercase">
                    <tr>
                      <th className="p-2.5">Producto / Servicio</th>
                      <th className="p-2.5 w-20 text-right">Cant.</th>
                      <th className="p-2.5 w-20">Unidad</th>
                      <th className="p-2.5 w-28 text-right">Precio Ud. (€)</th>
                      <th className="p-2.5 w-28 text-right">Subtotal (€)</th>
                      <th className="p-2.5 w-10 text-center"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {lineas.map((linea, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                        <td className="p-2">
                          <input
                            type="text"
                            value={linea.nombreProducto}
                            onChange={(e) => handleUpdateLinea(idx, 'nombreProducto', e.target.value)}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs font-sans"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={linea.cantidad}
                            onChange={(e) => handleUpdateLinea(idx, 'cantidad', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs text-right"
                          />
                        </td>
                        <td className="p-2">
                          <input
                            type="text"
                            value={linea.unidad || 'ud'}
                            onChange={(e) => handleUpdateLinea(idx, 'unidad', e.target.value)}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs"
                          />
                        </td>
                        <td className="p-2 text-right">
                          <input
                            type="number"
                            step="0.01"
                            value={linea.precioUnitario}
                            onChange={(e) => handleUpdateLinea(idx, 'precioUnitario', parseFloat(e.target.value) || 0)}
                            className="w-full px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-200 text-xs text-right"
                          />
                        </td>
                        <td className="p-2 text-right font-bold text-slate-200">
                          {linea.subtotal.toFixed(2)} €
                        </td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveLinea(idx)}
                            className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800 text-center text-xs text-slate-500">
                No hay líneas desglosadas. Se guardará con el concepto general.
              </div>
            )}
          </div>

          {/* Drive notice */}
          <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800 flex items-center justify-between text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-sky-400" />
              <span>
                Al guardar, la factura se registrará en la base de datos <strong>MySQL</strong> y su recibo se archivará en la carpeta{' '}
                <strong className="text-slate-200">"{nombreProveedor || 'Proveedor'}"</strong> de Google Drive.
              </span>
            </div>
          </div>

          {guardadoError && (
            <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-800/60 text-rose-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{guardadoError}</span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0f172a] flex items-center justify-between">
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-all cursor-pointer"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={handleGuardar}
            disabled={isSaving || isAnalyzing}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold shadow-lg shadow-rose-950/50 flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Guardando en MySQL y Drive...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar y Guardar Factura</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Gestor Modal de Categorías de Gasto */}
      <CategoriasGastoModal
        isOpen={isCategoriasModalOpen}
        onClose={() => setIsCategoriasModalOpen(false)}
        onCategoriaCreadaOActualizada={(nuevaCat) => {
          setCategoriaGasto(nuevaCat.nombre);
          setSugerenciaIaActiva(false);
        }}
      />
    </div>
  );
};
