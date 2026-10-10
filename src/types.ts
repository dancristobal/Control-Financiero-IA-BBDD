export interface ProductoLinea {
  nombreProducto: string;
  cantidad: number;
  unidad: string;
  precioUnitario: number;
  subtotal: number;
}

export interface CategoriaGastoDef {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string; // hex #f43f5e
  esPredeterminada?: boolean;
}

export interface Factura {
  idFactura: string;
  fechaEmision: string;
  idProveedor: string;
  nombreProveedor: string;
  concepto: string;
  importe: number; // Base imponible o importe principal
  fechaVencimiento: string;
  estado: 'Pagada' | 'Pendiente' | 'Vencida';
  fechaPago: string;
  baseImponible: number;
  tiposIVA: string; // ej: '4%', '10%', '21%', '5%', '0%', 'IGIC 7%', 'IGIC 3%' o con RE
  cuotaIVA: number;
  regimenFiscal?: string; // ej: 'Régimen General Peninsular', 'Tipos Temporales / Alimentos', 'IGIC Canario', 'Recargo de Equivalencia', 'Exento'
  tipoImpuestoNombre?: string; // 'IVA' | 'IGIC' | 'IPSI' | 'Exento'
  aplicaRecargoEquivalencia?: boolean;
  tipoRecargoEquivalencia?: string; // ej: '5.2%', '1.4%', '0.5%', '0.62%', '0.7%'
  cuotaRecargoEquivalencia?: number;
  // Retención de IRPF (Profesionales, Nuevos Autónomos, Arrendamientos, Agrario)
  aplicaRetencionIRPF?: boolean;
  tipoRetencionIRPF?: string; // ej: '15% Profesional', '7% Nuevo Autónomo', '19% Arrendamiento', '2% Agrario'
  porcentajeIRPF?: number; // ej: 15, 7, 19, 2, 1
  cuotaIRPF?: number; // Base Imponible * (porcentajeIRPF / 100)
  conceptoRetencionIRPF?: ConceptoRetencionIRPF;
  total: number; // Líquido total a pagar: Base + Cuota Impuesto + Cuota RE - Cuota IRPF
  categoriaGasto:
    | 'Insumos'
    | 'Logística'
    | 'Servicios'
    | 'Materias Primas'
    | 'Envases y Embalajes'
    | 'Suministros y Energía'
    | 'Logística y Transporte'
    | 'Mantenimiento y Maquinaria'
    | 'Servicios y Gestión'
    | string;
  categoriaGastoJustificacion?: string;
  categoriaGastoSugerida?: boolean;
  lineas?: ProductoLinea[];
  notas?: string;
  archivoNombre?: string;
  archivoBase64?: string;
  sincronizadoSheets?: boolean;
  driveFileUrl?: string;
  driveFolderUrl?: string;
  driveFileName?: string;
  driveFolderName?: string;
  driveGuardado?: boolean;
  driveError?: string;
}

export interface Proveedor {
  idProveedor: string;
  nombreProveedor: string;
  productosSuministrados: string;
  importeMensual: number;
  frecuencia: 'Semanal' | 'Quincenal' | 'Mensual' | 'Bimestral' | string;
  riesgoDependencia: 'Bajo' | 'Medio' | 'Alto';
  tiempoMedioEntrega: string;
  cif?: string;
  contacto?: string;
}

export type AlertaTipo =
  | 'POSIBLE DUPLICADO'
  | 'SUBIDA DE PRECIO'
  | 'GASTO INUSUAL'
  | 'NUEVO PROVEEDOR'
  | 'FACTURA VENCIDA'
  | 'CONCENTRACIÓN DE PROVEEDOR';

export type AlertaNivel = 'critica' | 'alta' | 'media' | 'informativa';

export interface Alerta {
  id: string;
  tipo: AlertaTipo;
  nivel: AlertaNivel;
  titulo: string;
  descripcion: string;
  fecha: string;
  estado: 'activa' | 'resuelta' | 'ignorada';
  datosRelacionados?: {
    idFactura?: string;
    facturaExistente?: string;
    archivoNuevo?: string;
    proveedor?: string;
    producto?: string;
    importe?: number;
    variacionPorcentaje?: number;
    precioAnterior?: number;
    precioNuevo?: number;
  };
}

export interface DesgloseIVA {
  tipo: string;
  tasa: number; // 0.04, 0.10, 0.21
  baseImponible: number;
  cuotaIVA: number;
  numFacturas: number;
}

export interface ResumenIVA {
  periodo: 'T1' | 'T2' | 'T3' | 'T4' | 'Año Completo';
  numFacturas: number;
  baseImponibleTotal: number;
  cuotaIVATotal: number;
  totalConIVA: number;
  desglose: DesgloseIVA[];
}

export interface AccionRecomendada {
  accion: string;
  motivo: string;
  datos: string;
  impacto: 'Alto' | 'Medio' | 'Inmediato';
}

export interface AnalisisEjecutivo {
  id: string;
  fechaGeneracion: string;
  estadoGeneral: string; // Máx 5 líneas
  principalesGastos: string[];
  cambiosImportantes: string[];
  alertas: string[];
  oportunidadesAhorro: string[];
  tresAcciones: AccionRecomendada[];
  prioridadSemana: string;
}

export interface ArchivoEnProceso {
  id: string;
  nombre: string;
  tamano: number;
  tipo: string;
  estado: 'esperando' | 'procesando' | 'procesado' | 'duplicado' | 'error';
  progreso: number; // 0 - 100
  mensaje?: string;
  datosExtraidos?: Factura;
  duplicadoCon?: Factura;
  base64Data?: string;
  rawFile?: File;
  driveInfo?: {
    carpetaProveedor: string;
    nombreArchivo: string;
    fileUrl?: string;
    carpetaUrl?: string;
    creadaNuevaCarpeta?: boolean;
    error?: string;
  };
}

export interface GoogleSheetsConfig {
  sheetId: string;
  sheetUrl: string;
  endpointUrl: string;
  driveFolderId?: string;
  autoSync: boolean;
  status: 'sincronizado' | 'pendiente' | 'desconectado' | 'error';
  lastSync?: string;
  totalFilasFacturas?: number;
  totalFilasProveedores?: number;
}

export interface ChatMessage {
  id: string;
  emisor: 'usuario' | 'gemini';
  texto: string;
  fecha: string;
  sugerencias?: string[];
}

export interface MensajeChat {
  id: string;
  emisor: 'usuario' | 'asistente';
  texto: string;
  timestamp: string;
  sugerencias?: string[];
}

export interface GlobalLoadingState {
  activo: boolean;
  mensaje: string;
  progreso?: number;
}

export interface DatosNegocio {
  nombre: string;
  nif: string;
  direccion: string;
  actividad?: string;
  sector?: string;
  contextoOperativo?: string;
  email?: string;
  telefono?: string;
}

export interface ConfiguracionAlertas {
  umbralSubidaModeradaPct: number; // Ej: 8% (por defecto aviso / nivel alta)
  umbralSubidaCriticaPct: number;   // Ej: 15% (nivel crítica)
  notificarConcentracionProveedor?: boolean;
  umbralConcentracionPct?: number;  // Ej: 30%
  notificarFacturasVencidas?: boolean;
  diasAnticipacionVencimiento?: number; // Ej: 3 días antes
  actualizadoEn?: string;
}

export const DEFAULT_CONFIGURACION_ALERTAS: ConfiguracionAlertas = {
  umbralSubidaModeradaPct: 8,
  umbralSubidaCriticaPct: 15,
  notificarConcentracionProveedor: true,
  umbralConcentracionPct: 30,
  notificarFacturasVencidas: true,
  diasAnticipacionVencimiento: 3,
};

export const DEFAULT_DATOS_NEGOCIO: DatosNegocio = {
  nombre: 'Pastelería y Confitería Dulce Capricho S.L.',
  nif: 'B-82910394',
  direccion: 'C/ Mayor 24, Obrador Central',
  actividad: 'Obrador y Confitería Artesanal',
  sector: 'Hostelería, Obrador de Pastelería y Panadería',
  contextoOperativo:
    'Obrador artesanal con despacho directo y distribución B2B a cafeterías y hostelería. Sus compras principales abarcan materias primas agrícolas (harinas especiales, mantequillas, coberturas, azúcares), cajas y envoltorios kraft para take-away, suministros energéticos intensivos en hornos y servicios de transporte refrigerado.',
  email: 'administracion@dulcecapricho.com',
  telefono: '+34 912 345 678',
};

export interface ParametrosSistema {
  // 1. Alertas & Riesgos de Precios
  umbralSubidaModeradaPct: number; // Por defecto: 8 (%)
  umbralSubidaCriticaPct: number; // Por defecto: 15 (%)
  notificarConcentracionProveedor: boolean; // Por defecto: true
  umbralConcentracionProveedorPct: number; // Por defecto: 30 (%)
  notificarFacturasVencidas: boolean; // Por defecto: true
  diasAnticipacionVencimiento: number; // Por defecto: 3 (días antes)

  // 2. Facturación Recurrente & Vencimientos
  limiteDiasFacturasRecurrentes: number; // Por defecto: 30 (días para clasificar compras recurrentes)
  diasToleranciaPagoVencido: number; // Por defecto: 7 (días margen tras fecha límite)
  evaluarVencimientosActivo: boolean; // Por defecto: true

  // 3. Proveedores & Dependencia Operativa
  umbralDependenciaAltaPct: number; // Por defecto: 35 (%)
  umbralDependenciaMediaPct: number; // Por defecto: 18 (%)
  minimoFacturasParaConcentracion: number; // Por defecto: 3 (mínimo facturas registradas)

  // 4. Panel de Control & Preferencias UI
  facturasPorPagina: number; // Por defecto: 10 (10 | 25 | 50 | 100)
  periodoDashboardPredeterminado: '7d' | '30d' | 'trimestre' | 'ano'; // Por defecto: 'ano'
  anoFiscalReferencia: number; // Por defecto: 2026
  topProveedoresRanking: number; // Por defecto: 5

  // 5. Fiscalidad e IVA / IGIC / IPSI
  tipoIvaPredeterminado: string; // Por defecto: '21%'
  regimenFiscalEmpresa: RegimenFiscalEmpresa; // Régimen fiscal principal configurado para la empresa
  regimenFiscalPredeterminado: 'IVA_PENINSULAR' | 'IGIC_CANARIAS' | 'IPSI_CEUTA_MELILLA' | 'RECARGO_EQUIVALENCIA' | 'TODOS';
  aplicaRecargoEquivalenciaDefecto: boolean; // Por defecto: false
  permitirIvaCeroOExento: boolean; // Por defecto: true
  mostrarTiposTemporales: boolean; // Por defecto: true (0%, 2%, 5%, 7.5%)
  mostrarTiposCanarios: boolean; // Por defecto: true (IGIC 7%, 3%, 0%, 9.5%, 15%)
  mostrarTiposIpsi: boolean; // Por defecto: true (IPSI 0.5%, 1%, 2%, 4%, 8%, 10%)
  tiposImpositivos: TipoImpositivoConfigurable[];

  // 6. Retenciones de IRPF (Profesionales, Nuevos Autónomos, Arrendamientos)
  habilitarRetencionesIRPF: boolean; // Por defecto: true
  porcentajeIrpfPredeterminado: number; // Por defecto: 15
  tipoIrpfRetencionPredeterminado: string; // Por defecto: '15% Profesional'
  conceptoIrpfPredeterminado: ConceptoRetencionIRPF; // Por defecto: 'PROFESIONAL'
  tiposRetencionIRPF: TipoRetencionIRPFConfigurable[];

  actualizadoEn?: string;
}

export type ConceptoRetencionIRPF =
  | 'PROFESIONAL'
  | 'ARRENDAMIENTO'
  | 'AGRARIO'
  | 'CAPITAL_MOBILIARIO'
  | 'OTRO';

export interface TipoRetencionIRPFConfigurable {
  id: string;
  codigo: string;
  nombre: string;
  valor: string; // ej: '15%', '7%', '19%', '2%', '1%'
  porcentaje: number;
  concepto: ConceptoRetencionIRPF;
  modeloAEAT: '111' | '115' | '123' | 'OTRO';
  habilitado: boolean;
  esPersonalizado?: boolean;
  descripcion?: string;
  ejemplos?: string;
}

export type TipoImpuestoJurisdiccion = 'IVA' | 'IGIC' | 'IPSI' | 'EXENTO' | 'OTRO';

export type RegimenFiscalEmpresa =
  | 'IVA_PENINSULAR' // Península y Baleares (IVA 21%, 10%, 4%)
  | 'IGIC_CANARIAS' // Canarias (IGIC 7%, 3%, 0%, 9.5%, 15%)
  | 'IPSI_CEUTA_MELILLA' // Ceuta y Melilla (IPSI 0.5%, 1%, 2%, 4%, 8%, 10%)
  | 'RECARGO_EQUIVALENCIA' // Minoristas con R.E. obligatorio (5.2%, 1.4%, 0.5%)
  | 'EXENTO_FRANQUICIA' // Exento / Franquicia fiscal
  | 'MULTIRREGIMEN'; // Multirégimen / Consolidado

export interface TipoImpositivoConfigurable {
  id: string;
  codigo: string;
  nombre: string;
  valor: string; // ej: '21%', '10%', '4%', '0% (Temporal)', 'IGIC 7%', 'IPSI 4%'
  tipoImpuesto: TipoImpuestoJurisdiccion;
  porcentaje: number;
  porcentajeRecargo: number; // Porcentaje de recargo de equivalencia o recargo minorista asociado
  aplicaRecargoDefecto: boolean;
  habilitado: boolean;
  esPersonalizado?: boolean;
  esTemporal?: boolean;
  descripcion?: string;
  ejemplos?: string;
}

export const TIPOS_IMPOSITIVOS_PREDETERMINADOS: TipoImpositivoConfigurable[] = [
  // Régimen General Peninsular (IVA)
  {
    id: 'iva-21',
    codigo: 'IVA_21',
    nombre: '21% - IVA General Peninsular',
    valor: '21%',
    tipoImpuesto: 'IVA',
    porcentaje: 21,
    porcentajeRecargo: 5.2,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Tipo general peninsular aplicable a la mayoría de suministros, energía, paquetería y servicios profesionales.',
    ejemplos: 'Electricidad, gas, packaging, maquinaria, asesoría, reformas, transporte de mercancías',
  },
  {
    id: 'iva-10',
    codigo: 'IVA_10',
    nombre: '10% - IVA Reducido',
    valor: '10%',
    tipoImpuesto: 'IVA',
    porcentaje: 10,
    porcentajeRecargo: 1.4,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Alimentación humana general, agua, hostelería, transporte de viajeros y flores.',
    ejemplos: 'Lácteos procesados, mantequillas, nata, chocolates, azúcar, conservas, restaurantes',
  },
  {
    id: 'iva-4',
    codigo: 'IVA_4',
    nombre: '4% - IVA Superreducido',
    valor: '4%',
    tipoImpuesto: 'IVA',
    porcentaje: 4,
    porcentajeRecargo: 0.5,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Productos de primera necesidad, pan común, harinas panificables, leche y huevos.',
    ejemplos: 'Harinas de fuerza y panificables, pan común, leche fresca, huevos, legumbres, frutas',
  },
  // Tipos Temporales Reducidos (Alimentos y Aceite de Oliva - RDL)
  {
    id: 'iva-0-temp',
    codigo: 'IVA_0_TEMP',
    nombre: '0% - IVA Superreducido Temporal (Alimentos Básicos / Aceite)',
    valor: '0% (Temporal)',
    tipoImpuesto: 'IVA',
    porcentaje: 0,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    esTemporal: true,
    descripcion: 'Tipo temporal al 0% introducido en España para alimentos básicos de primera necesidad y aceite de oliva virgen extra.',
    ejemplos: 'Aceite de oliva virgen extra, pan común, leches, harinas panificables, frutas y hortalizas',
  },
  {
    id: 'iva-2-temp',
    codigo: 'IVA_2_TEMP',
    nombre: '2% - IVA Temporal Transitorio (Alimentos Básicos)',
    valor: '2% (Temporal)',
    tipoImpuesto: 'IVA',
    porcentaje: 2,
    porcentajeRecargo: 0.26,
    aplicaRecargoDefecto: false,
    habilitado: true,
    esTemporal: true,
    descripcion: 'Tipo transitorio aplicable en tramos de normalización de alimentos de primera necesidad.',
    ejemplos: 'Productos básicos en fase de transición tributaria según RDL 4/2024',
  },
  {
    id: 'iva-5-temp',
    codigo: 'IVA_5_TEMP',
    nombre: '5% - IVA Temporal Reducido (Aceites y Pastas)',
    valor: '5% (Temporal)',
    tipoImpuesto: 'IVA',
    porcentaje: 5,
    porcentajeRecargo: 0.62,
    aplicaRecargoDefecto: false,
    habilitado: true,
    esTemporal: true,
    descripcion: 'Tipo temporal reducido para aceites de semillas y pastas alimenticias.',
    ejemplos: 'Pastas alimenticias, aceite de girasol, aceites de semillas comestibles',
  },
  {
    id: 'iva-7.5-temp',
    codigo: 'IVA_7.5_TEMP',
    nombre: '7.5% - IVA Temporal Transitorio (Pastas y Aceites)',
    valor: '7.5% (Temporal)',
    tipoImpuesto: 'IVA',
    porcentaje: 7.5,
    porcentajeRecargo: 1.0,
    aplicaRecargoDefecto: false,
    habilitado: false,
    esTemporal: true,
    descripcion: 'Tipo transitorio intermedio para aceites y pastas antes de retornar al 10%.',
    ejemplos: 'Pastas alimenticias y aceites en escalonamiento tributario',
  },
  // Régimen Autonómico Canario (IGIC)
  {
    id: 'igic-7',
    codigo: 'IGIC_7',
    nombre: 'IGIC 7% - Tipo General (Canarias)',
    valor: 'IGIC 7%',
    tipoImpuesto: 'IGIC',
    porcentaje: 7,
    porcentajeRecargo: 0.7,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Tipo general del Impuesto General Indirecto Canario aplicable a la mayoría de entregas de bienes y servicios.',
    ejemplos: 'Mercancías comerciales, suministros, paquetería, logística en el archipiélago canario',
  },
  {
    id: 'igic-3',
    codigo: 'IGIC_3',
    nombre: 'IGIC 3% - Tipo Reducido (Canarias)',
    valor: 'IGIC 3%',
    tipoImpuesto: 'IGIC',
    porcentaje: 3,
    porcentajeRecargo: 0.3,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Tipo reducido para industria alimentaria elaborada en Canarias, madera, textil y transporte interior.',
    ejemplos: 'Alimentos elaborados en Canarias, envases, transporte interior insular',
  },
  {
    id: 'igic-0',
    codigo: 'IGIC_0',
    nombre: 'IGIC 0% - Tipo Cero (Canarias)',
    valor: 'IGIC 0%',
    tipoImpuesto: 'IGIC',
    porcentaje: 0,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Tipo cero canario para agua potable, medicamentos, libros y alimentos primarios no transformados.',
    ejemplos: 'Entregas de agua potable, productos hortofrutícolas locales no transformados',
  },
  {
    id: 'igic-9.5',
    codigo: 'IGIC_9.5',
    nombre: 'IGIC 9.5% - Tipo Incrementado (Canarias)',
    valor: 'IGIC 9.5%',
    tipoImpuesto: 'IGIC',
    porcentaje: 9.5,
    porcentajeRecargo: 0.95,
    aplicaRecargoDefecto: false,
    habilitado: false,
    descripcion: 'Tipo incrementado aplicable a determinados vehículos y maquinaria específica en Canarias.',
    ejemplos: 'Vehículos comerciales con emisiones específicas, maquinaria industrial',
  },
  {
    id: 'igic-15',
    codigo: 'IGIC_15',
    nombre: 'IGIC 15% - Tipo Especial (Canarias)',
    valor: 'IGIC 15%',
    tipoImpuesto: 'IGIC',
    porcentaje: 15,
    porcentajeRecargo: 1.5,
    aplicaRecargoDefecto: false,
    habilitado: false,
    descripcion: 'Tipo especial para bebidas alcohólicas, labores de tabaco y bienes suntuarios.',
    ejemplos: 'Bebidas espirituosas, artículos de joyería y lujo',
  },
  // Régimen Especial de Ceuta y Melilla (IPSI)
  {
    id: 'ipsi-0.5',
    codigo: 'IPSI_0.5',
    nombre: 'IPSI 0.5% - Tipo Superreducido (Ceuta y Melilla)',
    valor: 'IPSI 0.5%',
    tipoImpuesto: 'IPSI',
    porcentaje: 0.5,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Impuesto sobre la Producción, los Servicios y la Importación (IPSI). Operaciones bancarias y suministros esenciales.',
    ejemplos: 'Operaciones de seguro, suministros de agua y energía de primera necesidad',
  },
  {
    id: 'ipsi-1',
    codigo: 'IPSI_1',
    nombre: 'IPSI 1% - Tipo Reducido Alimentos Básicos (Ceuta y Melilla)',
    valor: 'IPSI 1%',
    tipoImpuesto: 'IPSI',
    porcentaje: 1,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Alimentos básicos de primera necesidad, panadería, leche, huevos y transporte urbano.',
    ejemplos: 'Pan común, harinas, leche fresca, frutas, verduras, transporte colectivo urbano',
  },
  {
    id: 'ipsi-2',
    codigo: 'IPSI_2',
    nombre: 'IPSI 2% - Tipo Reducido Vivienda y Obras (Ceuta y Melilla)',
    valor: 'IPSI 2%',
    tipoImpuesto: 'IPSI',
    porcentaje: 2,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Obras de albañilería, construcción y reparación de inmuebles, materiales básicos.',
    ejemplos: 'Materiales de construcción, reformas de locales comerciales y viviendas',
  },
  {
    id: 'ipsi-4',
    codigo: 'IPSI_4',
    nombre: 'IPSI 4% - Tipo General (Ceuta y Melilla)',
    valor: 'IPSI 4%',
    tipoImpuesto: 'IPSI',
    porcentaje: 4,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Tipo general en Ceuta y Melilla aplicable a hostelería, servicios profesionales y comercio.',
    ejemplos: 'Restauración, hostelería, servicios informáticos, consultoría, suministros comerciales',
  },
  {
    id: 'ipsi-8',
    codigo: 'IPSI_8',
    nombre: 'IPSI 8% - Tipo Incrementado (Ceuta y Melilla)',
    valor: 'IPSI 8%',
    tipoImpuesto: 'IPSI',
    porcentaje: 8,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: false,
    descripcion: 'Vehículos de motor, embarcaciones y bienes semilujo en Ceuta y Melilla.',
    ejemplos: 'Vehículos comerciales de alta potencia, electrónica especializada',
  },
  {
    id: 'ipsi-10',
    codigo: 'IPSI_10',
    nombre: 'IPSI 10% - Tipo Especial (Ceuta y Melilla)',
    valor: 'IPSI 10%',
    tipoImpuesto: 'IPSI',
    porcentaje: 10,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: false,
    descripcion: 'Juegos de suerte, envite o azar, artículos de lujo y suntuarios.',
    ejemplos: 'Artículos de joyería, tabaco y bebidas alcohólicas de alta graduación',
  },
  // Operaciones Exentas
  {
    id: 'exento-0',
    codigo: 'EXENTO_0',
    nombre: '0% - Operación Exenta / Inversión Sujeto Pasivo',
    valor: '0% Exento',
    tipoImpuesto: 'EXENTO',
    porcentaje: 0,
    porcentajeRecargo: 0.0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: 'Entregas exentas (art. 20 LIVA), adquisiciones intracomunitarias (VIES) o inversión del sujeto pasivo.',
    ejemplos: 'Servicios financieros, seguros, proveedores comunitarios intracomunitarios UE',
  },
];

export const TIPOS_RETENCION_IRPF_PREDETERMINADOS: TipoRetencionIRPFConfigurable[] = [
  {
    id: 'irpf-15-prof',
    codigo: 'IRPF_15_PROF',
    nombre: '15% - Retención Profesional General (Mod. 111)',
    valor: '15%',
    porcentaje: 15,
    concepto: 'PROFESIONAL',
    modeloAEAT: '111',
    habilitado: true,
    descripcion: 'Tipo de retención estándar en España aplicable a profesionales autónomos colegiados y actividades profesionales (IAE Sección 2 y 3).',
    ejemplos: 'Servicios de asesoría fiscal, contable, abogados, desarrollo de software, diseño, consultoría técnica',
  },
  {
    id: 'irpf-7-nuevo-autonomo',
    codigo: 'IRPF_7_NUEVO',
    nombre: '7% - Nuevos Autónomos / Tipo Reducido (Mod. 111)',
    valor: '7%',
    porcentaje: 7,
    concepto: 'PROFESIONAL',
    modeloAEAT: '111',
    habilitado: true,
    descripcion: 'Tipo reducido aplicable a profesionales autónomos durante el año de inicio de su actividad y los dos ejercicios posteriores (art. 95.1 RIRPF).',
    ejemplos: 'Profesionales en sus primeros 3 años de actividad que hayan comunicado el tipo reducido',
  },
  {
    id: 'irpf-19-alquiler',
    codigo: 'IRPF_19_ALQUILER',
    nombre: '19% - Arrendamiento de Inmuebles Urbanos (Mod. 115)',
    valor: '19%',
    porcentaje: 19,
    concepto: 'ARRENDAMIENTO',
    modeloAEAT: '115',
    habilitado: true,
    descripcion: 'Retención obligatoria sobre el alquiler de locales comerciales, oficinas, almacenes o naves industriales (art. 62 RIRPF).',
    ejemplos: 'Alquiler de local comercial, oficina de la empresa, almacén logístico',
  },
  {
    id: 'irpf-2-agrario',
    codigo: 'IRPF_2_AGRARIO',
    nombre: '2% - Actividades Agrícolas y Ganaderas (Mod. 111)',
    valor: '2%',
    porcentaje: 2,
    concepto: 'AGRARIO',
    modeloAEAT: '111',
    habilitado: true,
    descripcion: 'Retención aplicable a entregas de productos de agricultura, ganadería de cebo y avicultura.',
    ejemplos: 'Productores agropecuarios, ganadería de cebo, avicultura',
  },
  {
    id: 'irpf-1-modulos',
    codigo: 'IRPF_1_MODULOS',
    nombre: '1% - Actividades en Módulos / Ciertos Sectores (Mod. 111)',
    valor: '1%',
    porcentaje: 1,
    concepto: 'OTRO',
    modeloAEAT: '111',
    habilitado: true,
    descripcion: 'Retención del 1% para determinadas actividades empresariales sujetas a retención en estimación objetiva (módulos).',
    ejemplos: 'Transporte de mercancías por carretera, carpintería, cerrajería, pintura',
  },
  {
    id: 'irpf-19-capital',
    codigo: 'IRPF_19_CAPITAL',
    nombre: '19% - Capital Mobiliario / Licencias / Royalties (Mod. 123)',
    valor: '19%',
    porcentaje: 19,
    concepto: 'CAPITAL_MOBILIARIO',
    modeloAEAT: '123',
    habilitado: false,
    descripcion: 'Retención sobre cesión de derechos de autor, licencias de propiedad intelectual o industrial y dividendos.',
    ejemplos: 'Cesión de marcas, patentes o derechos de explotación de propiedad intelectual',
  },
];

export const DEFAULT_PARAMETROS_SISTEMA: ParametrosSistema = {
  umbralSubidaModeradaPct: 8,
  umbralSubidaCriticaPct: 15,
  notificarConcentracionProveedor: true,
  umbralConcentracionProveedorPct: 30,
  notificarFacturasVencidas: true,
  diasAnticipacionVencimiento: 3,

  limiteDiasFacturasRecurrentes: 30,
  diasToleranciaPagoVencido: 7,
  evaluarVencimientosActivo: true,

  umbralDependenciaAltaPct: 35,
  umbralDependenciaMediaPct: 18,
  minimoFacturasParaConcentracion: 3,

  facturasPorPagina: 10,
  periodoDashboardPredeterminado: 'ano',
  anoFiscalReferencia: 2026,
  topProveedoresRanking: 5,

  tipoIvaPredeterminado: '21%',
  regimenFiscalEmpresa: 'IVA_PENINSULAR',
  regimenFiscalPredeterminado: 'IVA_PENINSULAR',
  aplicaRecargoEquivalenciaDefecto: false,
  permitirIvaCeroOExento: true,
  mostrarTiposTemporales: true,
  mostrarTiposCanarios: true,
  mostrarTiposIpsi: true,
  tiposImpositivos: TIPOS_IMPOSITIVOS_PREDETERMINADOS,

  // Retenciones IRPF
  habilitarRetencionesIRPF: true,
  porcentajeIrpfPredeterminado: 15,
  tipoIrpfRetencionPredeterminado: '15%',
  conceptoIrpfPredeterminado: 'PROFESIONAL',
  tiposRetencionIRPF: TIPOS_RETENCION_IRPF_PREDETERMINADOS,
};

// ==========================================
// MODELOS TRIBUTARIOS OFICIALES AEAT
// ==========================================

export type TrimestreFiscal = 'T1' | 'T2' | 'T3' | 'T4';
export type PeriodoFiscalModelo = 'T1' | 'T2' | 'T3' | 'T4' | 'ANUAL';

export interface DatosAdicionalesTrimestre {
  ingresosBase21: number;
  ingresosBase10: number;
  ingresosBase4: number;
  ingresosBaseOtros: number;
  retencionesVentasSoportadas: number;
  pagosFraccionadosPrevios130: number;
  baseNominasTrabajadores: number;
  retencionesNominasTrabajadores: number;
  numTrabajadoresNominas: number;
}

export type DatosAdicionalesFiscalesAnio = Record<TrimestreFiscal, DatosAdicionalesTrimestre>;

export const DEFAULT_DATOS_TRIMESTRE: DatosAdicionalesTrimestre = {
  ingresosBase21: 0,
  ingresosBase10: 0,
  ingresosBase4: 0,
  ingresosBaseOtros: 0,
  retencionesVentasSoportadas: 0,
  pagosFraccionadosPrevios130: 0,
  baseNominasTrabajadores: 0,
  retencionesNominasTrabajadores: 0,
  numTrabajadoresNominas: 0,
};

export interface ParticularidadModelo {
  id: string;
  tipo: 'completado' | 'pendiente' | 'advertencia' | 'info';
  titulo: string;
  descripcion: string;
  accionRequerida?: string;
}

export interface ResultadoModelo303 {
  periodo: TrimestreFiscal;
  anio: number;
  // IVA Devengado (Ingresos / Ventas)
  baseDevengado21: number;
  cuotaDevengado21: number;
  baseDevengado10: number;
  cuotaDevengado10: number;
  baseDevengado4: number;
  cuotaDevengado4: number;
  totalCuotaDevengada: number; // Casilla 27
  // IVA Deducible (Gastos / Facturas)
  baseDeducibleCorriente: number; // Casilla 28
  cuotaDeducibleCorriente: number; // Casilla 29
  baseDeducibleBienesInversion: number; // Casilla 30
  cuotaDeducibleBienesInversion: number; // Casilla 31
  totalCuotaDeducible: number; // Casilla 45
  // Resultado
  diferenciaCuotas: number; // Casilla 46 = Casilla 27 - Casilla 45
  resultadoFinal: number; // Positivo a ingresar, negativo a compensar/devolver
  estadoResultado: 'A_INGRESAR' | 'A_COMPENSAR' | 'CERO';
  particularidades: ParticularidadModelo[];
  numFacturasGastos: number;
}

export interface ResultadoModelo390 {
  anio: number;
  totalVentasDevengado: number;
  totalIvaRepercutido: number;
  totalComprasDeducible: number;
  totalIvaSoportado: number;
  resultadoAnualLiquidacion: number;
  desgloseTrimestral: {
    trimestre: TrimestreFiscal;
    ivaRepercutido: number;
    ivaSoportado: number;
    saldo: number;
  }[];
  volumenOperaciones: number; // Casilla 108
  particularidades: ParticularidadModelo[];
}

export interface ResultadoModelo130 {
  periodo: TrimestreFiscal;
  anio: number;
  ingresosComputablesAcumulados: number; // Casilla 01
  gastosDeduciblesAcumulados: number; // Casilla 02
  rendimientoNeto: number; // Casilla 03
  pagoFraccionado20Pct: number; // Casilla 04 (20% del rendimiento neto si positivo)
  retencionesSoportadasAcumuladas: number; // Casilla 05
  pagosFraccionadosPrevios: number; // Casilla 06
  totalAIngresar: number; // Casilla 07 / 19
  exentoPorRetencionPrevia: boolean;
  particularidades: ParticularidadModelo[];
}

export interface PerceptorModelo111 {
  nif: string;
  nombre: string;
  subclave: 'PROFESIONAL' | 'AGRARIO' | 'TRABAJO' | 'OTRO';
  base: number;
  retencion: number;
  tipoPct: number;
  numFacturas: number;
}

export interface ResultadoModelo111 {
  periodo: TrimestreFiscal;
  anio: number;
  // Rendimientos del trabajo
  trabajoNumPerceptores: number; // Casilla 01
  trabajoImportePercepciones: number; // Casilla 02
  trabajoImporteRetenciones: number; // Casilla 03
  // Rendimientos de actividades económicas
  actividadesNumPerceptores: number; // Casilla 07
  actividadesImportePercepciones: number; // Casilla 08
  actividadesImporteRetenciones: number; // Casilla 09
  // Agrícolas / Ganaderas
  agrarioNumPerceptores: number; // Casilla 10
  agrarioImportePercepciones: number; // Casilla 11
  agrarioImporteRetenciones: number; // Casilla 12
  // Total a ingresar
  totalRetencionesAIngresar: number; // Casilla 28
  perceptoresDetalle: PerceptorModelo111[];
  particularidades: ParticularidadModelo[];
}

export interface DeclaradoModelo347 {
  nif: string;
  nombre: string;
  tipoOperacion: 'COMPRAS' | 'VENTAS';
  totalAnual: number;
  t1: number;
  t2: number;
  t3: number;
  t4: number;
  tieneCifValido: boolean;
  numFacturas: number;
}

export interface ResultadoModelo347 {
  anio: number;
  umbralMinimo: number; // 3.005,06 €
  declarados: DeclaradoModelo347[];
  totalVolumenDeclarado: number;
  numDeclarados: number;
  tercerosEnRevisionCif: number;
  particularidades: ParticularidadModelo[];
}

export interface OperacionModelo349 {
  nifIvaUE: string;
  nombre: string;
  paisCodigo: string;
  claveOperacion: 'A' | 'I' | 'E' | 'S'; // A = Adquisición bienes, I = Adquisición servicios
  baseImponible: number;
  numFacturas: number;
  viesValido?: boolean;
}

export interface ResultadoModelo349 {
  periodo: PeriodoFiscalModelo;
  anio: number;
  operaciones: OperacionModelo349[];
  totalAdquisicionesServiciosI: number;
  totalAdquisicionesBienesA: number;
  totalOperacionesIntracomunitarias: number;
  numOperadoresUE: number;
  particularidades: ParticularidadModelo[];
}


