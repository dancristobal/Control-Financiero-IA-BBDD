import {
  TipoImpositivoConfigurable,
  RegimenFiscalEmpresa,
  TipoImpuestoJurisdiccion,
  TIPOS_IMPOSITIVOS_PREDETERMINADOS,
  TipoRetencionIRPFConfigurable,
  ConceptoRetencionIRPF,
  TIPOS_RETENCION_IRPF_PREDETERMINADOS,
  Factura,
} from '../types';

export type RegimenFiscalTipo =
  | 'IVA_GENERAL'
  | 'IVA_TEMPORAL'
  | 'IGIC_CANARIAS'
  | 'IPSI_CEUTA_MELILLA'
  | 'RECARGO_EQUIVALENCIA'
  | 'EXENTO'
  | 'OTRO';

export interface OpcionTipoImpositivo {
  id: string;
  codigo: string;
  valor: string; // ej: '21%', '10%', '4%', '0%', '5%', '2%', 'IGIC 7%', 'IGIC 3%', 'IPSI 4%'
  nombre: string;
  porcentaje: number;
  regimen: RegimenFiscalTipo;
  regimenEtiqueta: string;
  porcentajeRESugerido: number;
  esTemporal?: boolean;
  esCanario?: boolean;
  esIpsi?: boolean;
  tipoImpuesto?: TipoImpuestoJurisdiccion;
  descripcion: string;
  ejemplos: string;
}

/**
 * Catálogo completo de tipos impositivos vigentes en España:
 * - Régimen General Peninsular y Baleares (IVA 21%, 10%, 4%)
 * - Tipos Temporales Reducidos (RDL alimentos básicos / aceite: 0%, 2%, 5%, 7.5%)
 * - Régimen Especial Canario (IGIC 0%, 3%, 7%, 9.5%, 15%)
 * - Operaciones Exentas (0%)
 */
export const CATALOGO_TIPOS_IMPOSITIVOS: OpcionTipoImpositivo[] = [
  // 1. Régimen General Peninsular (IVA)
  {
    id: 'iva-21',
    codigo: 'IVA_21',
    valor: '21%',
    nombre: '21% - IVA General Peninsular',
    porcentaje: 21,
    regimen: 'IVA_GENERAL',
    regimenEtiqueta: 'IVA General Peninsular',
    porcentajeRESugerido: 5.2,
    descripcion: 'Tipo impositivo general aplicable a la mayoría de bienes, servicios y suministros.',
    ejemplos: 'Electricidad, gas, envases, embalajes, paquetería, maquinaria, consultoría, reformas',
  },
  {
    id: 'iva-10',
    codigo: 'IVA_10',
    valor: '10%',
    nombre: '10% - IVA Reducido',
    porcentaje: 10,
    regimen: 'IVA_GENERAL',
    regimenEtiqueta: 'IVA General Peninsular',
    porcentajeRESugerido: 1.4,
    descripcion: 'Alimentación humana general, agua, hostelería y transporte de viajeros.',
    ejemplos: 'Lácteos procesados, mantequillas, nata, chocolates, azúcar, conservas, restaurantes',
  },
  {
    id: 'iva-4',
    codigo: 'IVA_4',
    valor: '4%',
    nombre: '4% - IVA Superreducido',
    porcentaje: 4,
    regimen: 'IVA_GENERAL',
    regimenEtiqueta: 'IVA General Peninsular',
    porcentajeRESugerido: 0.5,
    descripcion: 'Productos de primera necesidad, pan común, harinas panificables, leche y huevos.',
    ejemplos: 'Harinas de fuerza y panificables, pan común, leche fresca, huevos, legumbres, frutas',
  },

  // 2. Tipos Temporales Reducidos (Crisis inflacionaria / Alimentos básicos y aceite)
  {
    id: 'iva-0-temporal',
    codigo: 'IVA_0_TEMP',
    valor: '0% (Temporal)',
    nombre: '0% - IVA Superreducido Temporal (Alimentos Básicos / Aceite)',
    porcentaje: 0,
    regimen: 'IVA_TEMPORAL',
    regimenEtiqueta: 'Tipos Temporales / Alimentos',
    porcentajeRESugerido: 0,
    esTemporal: true,
    descripcion: 'Tipo temporal al 0% introducido en España para alimentos básicos de primera necesidad y aceite de oliva.',
    ejemplos: 'Aceite de oliva virgen extra, pan común, leches, harinas panificables, frutas y hortalizas',
  },
  {
    id: 'iva-2-temporal',
    codigo: 'IVA_2_TEMP',
    valor: '2% (Temporal)',
    nombre: '2% - IVA Temporal Transitorio (Alimentos Básicos)',
    porcentaje: 2,
    regimen: 'IVA_TEMPORAL',
    regimenEtiqueta: 'Tipos Temporales / Alimentos',
    porcentajeRESugerido: 0.26,
    esTemporal: true,
    descripcion: 'Tipo transitorio aplicable en tramos de normalización de alimentos de primera necesidad.',
    ejemplos: 'Productos básicos en fase de transición tributaria según RDL 4/2024',
  },
  {
    id: 'iva-5-temporal',
    codigo: 'IVA_5_TEMP',
    valor: '5% (Temporal)',
    nombre: '5% - IVA Temporal Reducido (Aceites y Pastas)',
    porcentaje: 5,
    regimen: 'IVA_TEMPORAL',
    regimenEtiqueta: 'Tipos Temporales / Alimentos',
    porcentajeRESugerido: 0.62,
    esTemporal: true,
    descripcion: 'Tipo temporal reducido para aceites de semillas y pastas alimenticias.',
    ejemplos: 'Pastas alimenticias, aceite de girasol, aceites de semillas comestibles',
  },
  {
    id: 'iva-7.5-temporal',
    codigo: 'IVA_7.5_TEMP',
    valor: '7.5% (Temporal)',
    nombre: '7.5% - IVA Temporal Transitorio (Pastas y Aceites)',
    porcentaje: 7.5,
    regimen: 'IVA_TEMPORAL',
    regimenEtiqueta: 'Tipos Temporales / Alimentos',
    porcentajeRESugerido: 1.0,
    esTemporal: true,
    descripcion: 'Tipo transitorio intermedio para aceites y pastas antes de retornar al 10%.',
    ejemplos: 'Pastas alimenticias y aceites en escalonamiento tributario',
  },

  // 3. Régimen Autonómico Canario (IGIC)
  {
    id: 'igic-7',
    codigo: 'IGIC_7',
    valor: 'IGIC 7%',
    nombre: '7% - IGIC Tipo General (Canarias)',
    porcentaje: 7,
    regimen: 'IGIC_CANARIAS',
    regimenEtiqueta: 'IGIC Canario',
    porcentajeRESugerido: 0.7,
    esCanario: true,
    descripcion: 'Tipo general del Impuesto General Indirecto Canario aplicable a la mayoría de entregas y servicios.',
    ejemplos: 'Mercancías estándar, suministros comerciales, logística en el archipiélago',
  },
  {
    id: 'igic-3',
    codigo: 'IGIC_3',
    valor: 'IGIC 3%',
    nombre: '3% - IGIC Tipo Reducido (Canarias)',
    porcentaje: 3,
    regimen: 'IGIC_CANARIAS',
    regimenEtiqueta: 'IGIC Canario',
    porcentajeRESugerido: 0.3,
    esCanario: true,
    descripcion: 'Tipo reducido para industria alimentaria elaborada, madera, textil y transporte interior.',
    ejemplos: 'Alimentos elaborados en Canarias, materiales de envasado, transporte interior insular',
  },
  {
    id: 'igic-0',
    codigo: 'IGIC_0',
    valor: 'IGIC 0%',
    nombre: '0% - IGIC Tipo Cero (Canarias)',
    porcentaje: 0,
    regimen: 'IGIC_CANARIAS',
    regimenEtiqueta: 'IGIC Canario',
    porcentajeRESugerido: 0,
    esCanario: true,
    descripcion: 'Tipo cero canario para agua, productos sanitarios, libros y alimentos primarios sin elaborar.',
    ejemplos: 'Entregas de agua potable, productos hortofrutícolas locales no transformados',
  },
  {
    id: 'igic-9.5',
    codigo: 'IGIC_9.5',
    valor: 'IGIC 9.5%',
    nombre: '9.5% - IGIC Tipo Incrementado (Canarias)',
    porcentaje: 9.5,
    regimen: 'IGIC_CANARIAS',
    regimenEtiqueta: 'IGIC Canario',
    porcentajeRESugerido: 0.95,
    esCanario: true,
    descripcion: 'Tipo incrementado aplicable a determinados vehículos y maquinaria específica en Canarias.',
    ejemplos: 'Vehículos comerciales con emisiones específicas, maquinaria industrial pesada',
  },
  {
    id: 'igic-15',
    codigo: 'IGIC_15',
    valor: 'IGIC 15%',
    nombre: '15% - IGIC Tipo Especial (Canarias)',
    porcentaje: 15,
    regimen: 'IGIC_CANARIAS',
    regimenEtiqueta: 'IGIC Canario',
    porcentajeRESugerido: 1.5,
    esCanario: true,
    descripcion: 'Tipo especial para bebidas alcohólicas, labores de tabaco y bienes suntuarios.',
    ejemplos: 'Licores para pastelería, bebidas espirituosas, artículos de lujo',
  },

  // 4. Régimen Especial de Ceuta y Melilla (IPSI)
  {
    id: 'ipsi-0.5',
    codigo: 'IPSI_0.5',
    valor: 'IPSI 0.5%',
    nombre: '0.5% - IPSI Superreducido (Ceuta y Melilla)',
    porcentaje: 0.5,
    regimen: 'IPSI_CEUTA_MELILLA',
    regimenEtiqueta: 'IPSI Ceuta y Melilla',
    porcentajeRESugerido: 0,
    esIpsi: true,
    tipoImpuesto: 'IPSI',
    descripcion: 'Operaciones bancarias, suministros de agua y energía de primera necesidad.',
    ejemplos: 'Suministros bancarios y de agua en Ceuta y Melilla',
  },
  {
    id: 'ipsi-1',
    codigo: 'IPSI_1',
    valor: 'IPSI 1%',
    nombre: '1% - IPSI Reducido Alimentos Básicos (Ceuta y Melilla)',
    porcentaje: 1,
    regimen: 'IPSI_CEUTA_MELILLA',
    regimenEtiqueta: 'IPSI Ceuta y Melilla',
    porcentajeRESugerido: 0,
    esIpsi: true,
    tipoImpuesto: 'IPSI',
    descripcion: 'Alimentación básica, pan común, harinas, leche, huevos y transporte urbano.',
    ejemplos: 'Pan común, harinas, leche fresca, transporte colectivo',
  },
  {
    id: 'ipsi-2',
    codigo: 'IPSI_2',
    valor: 'IPSI 2%',
    nombre: '2% - IPSI Reducido Vivienda y Materiales (Ceuta y Melilla)',
    porcentaje: 2,
    regimen: 'IPSI_CEUTA_MELILLA',
    regimenEtiqueta: 'IPSI Ceuta y Melilla',
    porcentajeRESugerido: 0,
    esIpsi: true,
    tipoImpuesto: 'IPSI',
    descripcion: 'Obras de albañilería, construcción y reparación de inmuebles, materiales básicos.',
    ejemplos: 'Materiales de construcción, reformas de locales comerciales y viviendas',
  },
  {
    id: 'ipsi-4',
    codigo: 'IPSI_4',
    valor: 'IPSI 4%',
    nombre: '4% - IPSI General (Ceuta y Melilla)',
    porcentaje: 4,
    regimen: 'IPSI_CEUTA_MELILLA',
    regimenEtiqueta: 'IPSI Ceuta y Melilla',
    porcentajeRESugerido: 0,
    esIpsi: true,
    tipoImpuesto: 'IPSI',
    descripcion: 'Tipo general en Ceuta y Melilla aplicable a hostelería, servicios profesionales y comercio.',
    ejemplos: 'Hostelería, restauración, consultoría, suministros comerciales en Ceuta o Melilla',
  },
  {
    id: 'ipsi-8',
    codigo: 'IPSI_8',
    valor: 'IPSI 8%',
    nombre: '8% - IPSI Incrementado (Ceuta y Melilla)',
    porcentaje: 8,
    regimen: 'IPSI_CEUTA_MELILLA',
    regimenEtiqueta: 'IPSI Ceuta y Melilla',
    porcentajeRESugerido: 0,
    esIpsi: true,
    tipoImpuesto: 'IPSI',
    descripcion: 'Vehículos de motor, embarcaciones y bienes semilujo en Ceuta y Melilla.',
    ejemplos: 'Vehículos comerciales de alta potencia, electrónica especializada',
  },
  {
    id: 'ipsi-10',
    codigo: 'IPSI_10',
    valor: 'IPSI 10%',
    nombre: '10% - IPSI Especial (Ceuta y Melilla)',
    porcentaje: 10,
    regimen: 'IPSI_CEUTA_MELILLA',
    regimenEtiqueta: 'IPSI Ceuta y Melilla',
    porcentajeRESugerido: 0,
    esIpsi: true,
    tipoImpuesto: 'IPSI',
    descripcion: 'Juegos de suerte, envite o azar, artículos de lujo y suntuarios.',
    ejemplos: 'Artículos de joyería, tabaco y bebidas alcohólicas de alta graduación',
  },

  // 5. Operaciones Exentas
  {
    id: 'exento-0',
    codigo: 'EXENTO_0',
    valor: '0% (Exento)',
    nombre: '0% - Operación Exenta / Intracomunitaria',
    porcentaje: 0,
    regimen: 'EXENTO',
    regimenEtiqueta: 'Exento / Cero',
    porcentajeRESugerido: 0,
    tipoImpuesto: 'EXENTO',
    descripcion: 'Entregas exentas (art. 20 LIVA), adquisiciones intracomunitarias o inversión del sujeto pasivo.',
    ejemplos: 'Servicios financieros, seguros, proveedores de la UE con VIES, operaciones exentas',
  },
];

/**
 * Tabla oficial de Recargos de Equivalencia según tipo de gravamen
 */
export const TABLA_RECARGO_EQUIVALENCIA = [
  { tipoIVA: 21, recargoEquivalencia: 5.2, descripcion: 'IVA General 21% -> R.E. 5,20% (Total: 26,20%)' },
  { tipoIVA: 10, recargoEquivalencia: 1.4, descripcion: 'IVA Reducido 10% -> R.E. 1,40% (Total: 11,40%)' },
  { tipoIVA: 4, recargoEquivalencia: 0.5, descripcion: 'IVA Superreducido 4% -> R.E. 0,50% (Total: 4,50%)' },
  { tipoIVA: 5, recargoEquivalencia: 0.62, descripcion: 'IVA Temporal 5% -> R.E. 0,62% (Total: 5,62%)' },
  { tipoIVA: 2, recargoEquivalencia: 0.26, descripcion: 'IVA Temporal 2% -> R.E. 0,26% (Total: 2,26%)' },
  { tipoIVA: 0, recargoEquivalencia: 0.0, descripcion: 'IVA Temporal/Exento 0% -> R.E. 0,00%' },
  { tipoIVA: 7, recargoEquivalencia: 0.7, descripcion: 'IGIC 7% -> Recargo Minorista Canario 0,70%' },
  { tipoIVA: 3, recargoEquivalencia: 0.3, descripcion: 'IGIC 3% -> Recargo Minorista Canario 0,30%' },
  { tipoIVA: 4, recargoEquivalencia: 0.0, descripcion: 'IPSI 4% -> Sin recargo minorista obligatorio' },
];

/**
 * Obtiene los tipos impositivos activos para usar en selectores de formularios
 */
export function obtenerTiposImpositivosActivos(
  tipos?: TipoImpositivoConfigurable[]
): TipoImpositivoConfigurable[] {
  const lista = Array.isArray(tipos) && tipos.length > 0 ? tipos : TIPOS_IMPOSITIVOS_PREDETERMINADOS;
  return lista.filter((t) => t.habilitado);
}

/**
 * Aplica un preajuste automático de tipos habilitados según el régimen de la empresa
 */
export function aplicarPreajusteRegimen(
  regimen: RegimenFiscalEmpresa,
  tiposActuales: TipoImpositivoConfigurable[]
): TipoImpositivoConfigurable[] {
  const lista = Array.isArray(tiposActuales) && tiposActuales.length > 0 ? tiposActuales : TIPOS_IMPOSITIVOS_PREDETERMINADOS;
  return lista.map((t) => {
    const copy = { ...t };
    switch (regimen) {
      case 'IVA_PENINSULAR':
        if (copy.tipoImpuesto === 'IVA') copy.habilitado = true;
        if (copy.tipoImpuesto === 'IGIC' || copy.tipoImpuesto === 'IPSI') copy.habilitado = false;
        if (copy.tipoImpuesto === 'EXENTO') copy.habilitado = true;
        break;
      case 'IGIC_CANARIAS':
        if (copy.tipoImpuesto === 'IGIC') copy.habilitado = true;
        if (copy.tipoImpuesto === 'IVA' || copy.tipoImpuesto === 'IPSI') copy.habilitado = false;
        if (copy.tipoImpuesto === 'EXENTO') copy.habilitado = true;
        break;
      case 'IPSI_CEUTA_MELILLA':
        if (copy.tipoImpuesto === 'IPSI') copy.habilitado = true;
        if (copy.tipoImpuesto === 'IVA' || copy.tipoImpuesto === 'IGIC') copy.habilitado = false;
        if (copy.tipoImpuesto === 'EXENTO') copy.habilitado = true;
        break;
      case 'RECARGO_EQUIVALENCIA':
        if (copy.tipoImpuesto === 'IVA') {
          copy.habilitado = true;
          copy.aplicaRecargoDefecto = copy.porcentajeRecargo > 0;
        }
        if (copy.tipoImpuesto === 'IGIC' || copy.tipoImpuesto === 'IPSI') copy.habilitado = false;
        if (copy.tipoImpuesto === 'EXENTO') copy.habilitado = true;
        break;
      case 'EXENTO_FRANQUICIA':
        if (copy.porcentaje === 0) copy.habilitado = true;
        else copy.habilitado = false;
        break;
      case 'MULTIRREGIMEN':
        if (['iva-21', 'iva-10', 'iva-4', 'iva-0-temp', 'iva-5-temp', 'igic-7', 'igic-3', 'igic-0', 'ipsi-0.5', 'ipsi-1', 'ipsi-2', 'ipsi-4', 'exento-0'].includes(copy.id)) {
          copy.habilitado = true;
        }
        break;
    }
    return copy;
  });
}

/**
 * Obtiene el tipo de Recargo de Equivalencia sugerido por la normativa oficial
 * según el porcentaje del impuesto soportado.
 */
export function obtenerRecargoEquivalenciaSugerido(
  porcentaje: number,
  esCanario = false,
  esIpsi = false
): number {
  if (esIpsi) return 0;
  if (esCanario) {
    if (Math.abs(porcentaje - 7) < 0.1) return 0.7;
    if (Math.abs(porcentaje - 3) < 0.1) return 0.3;
    if (porcentaje <= 0) return 0;
    return Math.round(porcentaje * 0.1 * 100) / 100;
  }

  if (Math.abs(porcentaje - 21) < 0.1) return 5.2;
  if (Math.abs(porcentaje - 10) < 0.1) return 1.4;
  if (Math.abs(porcentaje - 4) < 0.1) return 0.5;
  if (Math.abs(porcentaje - 5) < 0.1) return 0.62;
  if (Math.abs(porcentaje - 2) < 0.1) return 0.26;
  if (Math.abs(porcentaje - 7.5) < 0.1) return 1.0;
  if (porcentaje <= 0) return 0;

  // En caso de tipo no estándar, aproximar al 25% del tipo impositivo base
  return Math.round(porcentaje * 0.25 * 100) / 100;
}

/**
 * Detecta y analiza la información fiscal de un string de tipo impositivo
 * (ej: "21%", "10%", "4%", "5%", "0%", "IGIC 7%", "IGIC 3%", "IPSI 4%", "21% + 5.2% RE")
 */
export function analizarStringTipoImpositivo(
  rawStr: string,
  catalogo?: TipoImpositivoConfigurable[]
): {
  porcentaje: number;
  esCanario: boolean;
  esIpsi: boolean;
  esTemporal: boolean;
  esExento: boolean;
  tieneRecargo: boolean;
  porcentajeRE: number;
  tipoImpuesto: TipoImpuestoJurisdiccion;
  regimen: RegimenFiscalTipo;
  regimenEtiqueta: string;
  nombreVisible: string;
} {
  const str = (rawStr || '21%').trim();
  const lower = str.toLowerCase();

  const esCanario = lower.includes('igic') || lower.includes('canar');
  const esIpsi = lower.includes('ipsi') || lower.includes('ceuta') || lower.includes('melilla');
  const esExento = lower.includes('exent') || lower.includes('cero') || (str === '0%' && !lower.includes('temp') && !esCanario && !esIpsi);
  const tieneRecargo = lower.includes('re') || lower.includes('recargo') || lower.includes('+');

  // Buscar coincidencia exacta en el catálogo configurado si existe
  let matchedConfig: TipoImpositivoConfigurable | undefined;
  if (catalogo && catalogo.length > 0) {
    matchedConfig = catalogo.find(
      (c) =>
        c.valor.toLowerCase() === lower ||
        c.nombre.toLowerCase() === lower ||
        c.id.toLowerCase() === lower
    );
  }

  // Extraer el porcentaje principal
  let porcentaje = 21;
  if (matchedConfig) {
    porcentaje = matchedConfig.porcentaje;
  } else {
    const matchPct = str.match(/(\d+([.,]\d+)?)\s*%/);
    if (matchPct) {
      porcentaje = parseFloat(matchPct[1].replace(',', '.'));
    } else {
      // Si sólo hay un número
      const matchNum = str.match(/\d+([.,]\d+)?/);
      if (matchNum) {
        porcentaje = parseFloat(matchNum[0].replace(',', '.'));
      }
    }
  }

  // Extraer el recargo si está indicado en el string (ej: "21% + 5.2% RE")
  let porcentajeRE = 0;
  if (tieneRecargo) {
    const matchRE = str.match(/\+\s*(\d+([.,]\d+)?)\s*%/);
    if (matchRE) {
      porcentajeRE = parseFloat(matchRE[1].replace(',', '.'));
    } else if (matchedConfig && matchedConfig.porcentajeRecargo > 0) {
      porcentajeRE = matchedConfig.porcentajeRecargo;
    } else {
      porcentajeRE = obtenerRecargoEquivalenciaSugerido(porcentaje, esCanario, esIpsi);
    }
  }

  const esTemporal =
    matchedConfig?.esTemporal ||
    lower.includes('temp') ||
    lower.includes('alimento') ||
    lower.includes('aceite') ||
    (!esCanario && !esIpsi && (porcentaje === 0 || porcentaje === 2 || porcentaje === 5 || porcentaje === 7.5));

  let regimen: RegimenFiscalTipo = 'IVA_GENERAL';
  let regimenEtiqueta = 'IVA General Peninsular';
  let tipoImpuesto: TipoImpuestoJurisdiccion = matchedConfig?.tipoImpuesto || 'IVA';

  if (esIpsi || matchedConfig?.tipoImpuesto === 'IPSI') {
    regimen = 'IPSI_CEUTA_MELILLA';
    regimenEtiqueta = 'IPSI Ceuta y Melilla';
    tipoImpuesto = 'IPSI';
  } else if (esCanario || matchedConfig?.tipoImpuesto === 'IGIC') {
    regimen = 'IGIC_CANARIAS';
    regimenEtiqueta = 'IGIC Canario';
    tipoImpuesto = 'IGIC';
  } else if (tieneRecargo) {
    regimen = 'RECARGO_EQUIVALENCIA';
    regimenEtiqueta = 'Recargo de Equivalencia';
  } else if (esTemporal) {
    regimen = 'IVA_TEMPORAL';
    regimenEtiqueta = 'Tipos Temporales / Alimentos';
  } else if (esExento || porcentaje === 0 || matchedConfig?.tipoImpuesto === 'EXENTO') {
    regimen = 'EXENTO';
    regimenEtiqueta = 'Operación Exenta';
    tipoImpuesto = 'EXENTO';
  }

  let nombreVisible = `${porcentaje}%`;
  if (esIpsi || tipoImpuesto === 'IPSI') {
    nombreVisible = `IPSI ${porcentaje}%`;
  } else if (esCanario || tipoImpuesto === 'IGIC') {
    nombreVisible = `IGIC ${porcentaje}%`;
  } else if (esTemporal && (porcentaje === 0 || porcentaje === 5 || porcentaje === 2)) {
    nombreVisible = `IVA ${porcentaje}% (Temporal)`;
  } else if (esExento) {
    nombreVisible = '0% Exento';
  }

  if (tieneRecargo && porcentajeRE > 0) {
    nombreVisible += ` + R.E. ${porcentajeRE}%`;
  }

  return {
    porcentaje,
    esCanario,
    esIpsi,
    esTemporal,
    esExento,
    tieneRecargo,
    porcentajeRE,
    tipoImpuesto,
    regimen,
    regimenEtiqueta,
    nombreVisible,
  };
}

/**
 * Extrae el porcentaje numérico de una retención de IRPF desde una cadena o catálogo
 */
export function extraerPorcentajeIRPF(
  tipoStr?: string,
  catalogo?: TipoRetencionIRPFConfigurable[]
): number {
  if (!tipoStr) return 15;
  const cats = catalogo && catalogo.length > 0 ? catalogo : TIPOS_RETENCION_IRPF_PREDETERMINADOS;
  const matchCat = cats.find(
    (c) =>
      c.id === tipoStr ||
      c.codigo.toLowerCase() === tipoStr.toLowerCase() ||
      c.valor === tipoStr ||
      c.nombre.toLowerCase().includes(tipoStr.toLowerCase())
  );
  if (matchCat) return matchCat.porcentaje;

  const matchNum = tipoStr.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (matchNum) {
    return parseFloat(matchNum[1].replace(',', '.'));
  }
  const soloNum = parseFloat(tipoStr.replace(',', '.'));
  if (!isNaN(soloNum)) return soloNum;
  return 15;
}

/**
 * Realiza el cálculo financiero completo de una factura
 * teniendo en cuenta Base, Tipo Impositivo, Recargo de Equivalencia y Retención de IRPF.
 */
export function calcularLiquidacionFactura(params: {
  baseImponible: number;
  tipoString: string;
  aplicaRecargo?: boolean;
  porcentajeREManual?: number;
  catalogo?: TipoImpositivoConfigurable[];
  // Soporte de Retención de IRPF
  aplicaIRPF?: boolean;
  porcentajeIRPFManual?: number;
  tipoRetencionIRPFString?: string;
  conceptoIRPF?: ConceptoRetencionIRPF;
  catalogoIRPF?: TipoRetencionIRPFConfigurable[];
}): {
  baseImponible: number;
  porcentajeImpuesto: number;
  cuotaImpuesto: number;
  aplicaRecargo: boolean;
  porcentajeRE: number;
  cuotaRE: number;
  aplicaIRPF: boolean;
  porcentajeIRPF: number;
  cuotaIRPF: number;
  conceptoIRPF?: ConceptoRetencionIRPF;
  total: number;
  totalBruto: number;
  tipoFormateado: string;
  regimenEtiqueta: string;
} {
  const base = Math.max(0, Number(params.baseImponible) || 0);
  const info = analizarStringTipoImpositivo(params.tipoString, params.catalogo);
  const aplicaRecargo = params.aplicaRecargo !== undefined ? params.aplicaRecargo : info.tieneRecargo;

  const porcentajeImpuesto = info.porcentaje;
  const cuotaImpuesto = Math.round(base * (porcentajeImpuesto / 100) * 100) / 100;

  let porcentajeRE = 0;
  let cuotaRE = 0;

  if (aplicaRecargo) {
    porcentajeRE =
      params.porcentajeREManual !== undefined && !isNaN(params.porcentajeREManual)
        ? params.porcentajeREManual
        : info.porcentajeRE > 0
        ? info.porcentajeRE
        : obtenerRecargoEquivalenciaSugerido(porcentajeImpuesto, info.esCanario, info.esIpsi);

    cuotaRE = Math.round(base * (porcentajeRE / 100) * 100) / 100;
  }

  // Retención de IRPF (descuenta del total líquido a pagar al proveedor)
  const aplicaIRPF = Boolean(params.aplicaIRPF);
  let porcentajeIRPF = 0;
  let cuotaIRPF = 0;

  if (aplicaIRPF) {
    if (params.porcentajeIRPFManual !== undefined && !isNaN(params.porcentajeIRPFManual)) {
      porcentajeIRPF = Math.max(0, params.porcentajeIRPFManual);
    } else if (params.tipoRetencionIRPFString) {
      porcentajeIRPF = extraerPorcentajeIRPF(params.tipoRetencionIRPFString, params.catalogoIRPF);
    } else {
      porcentajeIRPF = 15;
    }
    cuotaIRPF = Math.round(base * (porcentajeIRPF / 100) * 100) / 100;
  }

  const totalBruto = Math.round((base + cuotaImpuesto + cuotaRE) * 100) / 100;
  // Líquido a pagar al proveedor = Base + Impuestos Indirectos + RE - Retención IRPF
  const total = Math.max(0, Math.round((totalBruto - cuotaIRPF) * 100) / 100);

  let tipoFormateado = info.esIpsi
    ? `IPSI ${porcentajeImpuesto}%`
    : info.esCanario
    ? `IGIC ${porcentajeImpuesto}%`
    : `${porcentajeImpuesto}%`;

  if (info.esTemporal) {
    tipoFormateado += ' (Temporal)';
  }
  if (aplicaRecargo && porcentajeRE > 0) {
    tipoFormateado += ` + R.E. ${porcentajeRE}%`;
  }
  if (aplicaIRPF && porcentajeIRPF > 0) {
    tipoFormateado += ` (-${porcentajeIRPF}% IRPF)`;
  }

  return {
    baseImponible: base,
    porcentajeImpuesto,
    cuotaImpuesto,
    aplicaRecargo,
    porcentajeRE,
    cuotaRE,
    aplicaIRPF,
    porcentajeIRPF,
    cuotaIRPF,
    conceptoIRPF: params.conceptoIRPF,
    total,
    totalBruto,
    tipoFormateado,
    regimenEtiqueta: info.regimenEtiqueta,
  };
}

/**
 * Estructura de desglose dinámico agrupado para IvaView
 */
export interface GrupoFiscalResumen {
  id: string;
  clave: string;
  tipoNum: number;
  nombre: string;
  regimen: RegimenFiscalTipo;
  regimenEtiqueta: string;
  base: number;
  cuota: number;
  cuotaRE: number;
  total: number;
  count: number;
  esTemporal: boolean;
  esCanario: boolean;
  tieneRE: boolean;
  porcentajeREMedio: number;
  facturasIds: string[];
}

/**
 * Procesa un listado de facturas y genera un desglose dinámico
 * clasificando automáticamente por tipos del Régimen General,
 * Tipos Temporales Reducidos (0%, 5%), IGIC Canario y Recargo de Equivalencia.
 */
export function procesarDesgloseFiscalCompleto(
  facturas: any[],
  catalogo?: TipoImpositivoConfigurable[]
): {
  baseTotal: number;
  cuotaImpuestoTotal: number;
  cuotaRETotal: number;
  totalAcumulado: number;
  numFacturas: number;
  grupos: GrupoFiscalResumen[];
  regimenesPresentes: {
    tieneGeneral: boolean;
    tieneTemporal: boolean;
    tieneIGIC: boolean;
    tieneIPSI: boolean;
    tieneRE: boolean;
    tieneExento: boolean;
  };
} {
  let baseTotal = 0;
  let cuotaImpuestoTotal = 0;
  let cuotaRETotal = 0;
  let totalAcumulado = 0;

  const gruposMap = new Map<string, GrupoFiscalResumen>();

  let tieneGeneral = false;
  let tieneTemporal = false;
  let tieneIGIC = false;
  let tieneIPSI = false;
  let tieneRE = false;
  let tieneExento = false;

  facturas.forEach((f) => {
    const base = Number(f.baseImponible) || 0;
    const cuota = Number(f.cuotaIVA) || 0;
    const cuotaREFactura = Number(f.cuotaRecargoEquivalencia) || 0;
    const tot = Number(f.total) || base + cuota + cuotaREFactura;

    baseTotal += base;
    cuotaImpuestoTotal += cuota;
    cuotaRETotal += cuotaREFactura;
    totalAcumulado += tot;

    const info = analizarStringTipoImpositivo(f.tiposIVA || '', catalogo);
    const tieneREFactura = Boolean(f.aplicaRecargoEquivalencia || cuotaREFactura > 0 || info.tieneRecargo);

    if (info.regimen === 'IVA_GENERAL') tieneGeneral = true;
    if (info.regimen === 'IVA_TEMPORAL' || info.esTemporal) tieneTemporal = true;
    if (info.regimen === 'IGIC_CANARIAS' || info.esCanario) tieneIGIC = true;
    if (info.regimen === 'IPSI_CEUTA_MELILLA' || info.esIpsi) tieneIPSI = true;
    if (tieneREFactura) tieneRE = true;
    if (info.regimen === 'EXENTO' || info.esExento || info.porcentaje === 0) tieneExento = true;

    // Clave de agrupación única: régimen + porcentaje + tieneRE
    const clave = `${info.regimen}_${info.porcentaje}${tieneREFactura ? '_RE' : ''}`;

    if (!gruposMap.has(clave)) {
      let nombre = `${info.porcentaje}%`;
      if (info.esIpsi) {
        nombre = `IPSI ${info.porcentaje}%`;
      } else if (info.esCanario) {
        nombre = `IGIC ${info.porcentaje}%`;
      } else if (info.esTemporal) {
        nombre = `IVA ${info.porcentaje}% (Temporal)`;
      } else if (info.esExento) {
        nombre = 'Exento (0%)';
      } else {
        nombre = `IVA ${info.porcentaje}%`;
      }

      if (tieneREFactura) {
        const rePct = info.porcentajeRE > 0 ? info.porcentajeRE : obtenerRecargoEquivalenciaSugerido(info.porcentaje, info.esCanario, info.esIpsi);
        nombre += ` + R.E. ${rePct}%`;
      }

      gruposMap.set(clave, {
        id: clave,
        clave,
        tipoNum: info.porcentaje,
        nombre,
        regimen: info.regimen,
        regimenEtiqueta: info.regimenEtiqueta,
        base: 0,
        cuota: 0,
        cuotaRE: 0,
        total: 0,
        count: 0,
        esTemporal: info.esTemporal,
        esCanario: info.esCanario,
        tieneRE: tieneREFactura,
        porcentajeREMedio: info.porcentajeRE,
        facturasIds: [],
      });
    }

    const g = gruposMap.get(clave)!;
    g.base += base;
    g.cuota += cuota;
    g.cuotaRE += cuotaREFactura;
    g.total += tot;
    g.count += 1;
    g.facturasIds.push(f.idFactura);
  });

  // Ordenar grupos: primero IVA general (21, 10, 4), luego temporales (5, 2, 0), luego IGIC, luego IPSI, luego RE y exentos
  const grupos = Array.from(gruposMap.values()).sort((a, b) => {
    // Si son del mismo régimen, ordenar por porcentaje descendente
    if (a.regimen === b.regimen) {
      return b.tipoNum - a.tipoNum;
    }
    const ordenRegimen: Record<RegimenFiscalTipo, number> = {
      IVA_GENERAL: 1,
      IVA_TEMPORAL: 2,
      IGIC_CANARIAS: 3,
      IPSI_CEUTA_MELILLA: 4,
      RECARGO_EQUIVALENCIA: 5,
      EXENTO: 6,
      OTRO: 7,
    };
    return (ordenRegimen[a.regimen] || 99) - (ordenRegimen[b.regimen] || 99);
  });

  return {
    baseTotal,
    cuotaImpuestoTotal,
    cuotaRETotal,
    totalAcumulado,
    numFacturas: facturas.length,
    grupos,
    regimenesPresentes: {
      tieneGeneral,
      tieneTemporal,
      tieneIGIC,
      tieneIPSI,
      tieneRE,
      tieneExento,
    },
  };
}

/**
 * Estructura de perceptor individual con retención de IRPF
 */
export interface PerceptorIRPFResumen {
  idProveedor?: string;
  nombreProveedor: string;
  cifProveedor?: string;
  modeloAeat: '111' | '115' | '123' | 'OTRO' | string;
  concepto: ConceptoRetencionIRPF | string;
  baseTotal: number;
  porcentaje: number;
  cuotaTotal: number;
  facturasCount: number;
  facturasIds: string[];
}

/**
 * Estructura de desglose de retenciones de IRPF para declaraciones tributarias (Mod. 111 / 115)
 */
export interface ResumenRetencionesIRPF {
  cuotaIRPFTotal: number;
  totalRetenido: number;
  baseTotal: number;
  totalBaseSujeta: number;
  totalLiquidoAfectado: number;
  numFacturasConIRPF: number;
  facturasConIRPF: Factura[];
  modelo111: {
    nombre: string;
    descripcion: string;
    numPerceptores: number;
    baseTotal: number;
    cuotaTotal: number;
    count: number;
    facturasIds: string[];
  };
  modelo115: {
    nombre: string;
    descripcion: string;
    numPerceptores: number;
    baseTotal: number;
    cuotaTotal: number;
    count: number;
    facturasIds: string[];
  };
  otros: {
    nombre: string;
    descripcion: string;
    numPerceptores: number;
    baseTotal: number;
    cuotaTotal: number;
    count: number;
    facturasIds: string[];
  };
  desgloseModelos: {
    mod111: {
      nombre: string;
      descripcion: string;
      base: number;
      retencion: number;
      count: number;
      facturasIds: string[];
    };
    mod115: {
      nombre: string;
      descripcion: string;
      base: number;
      retencion: number;
      count: number;
      facturasIds: string[];
    };
    otros: {
      nombre: string;
      descripcion: string;
      base: number;
      retencion: number;
      count: number;
      facturasIds: string[];
    };
  };
  perceptores: PerceptorIRPFResumen[];
  desglosePorPorcentaje: {
    porcentaje: number;
    etiqueta: string;
    base: number;
    cuotaRetencion: number;
    count: number;
  }[];
}

/**
 * Procesa y agrupa todas las facturas con retención de IRPF
 * generando las métricas necesarias para los Modelos oficiales 111 y 115 de la AEAT
 */
export function procesarRetencionesIRPF(facturas: Factura[] = []): ResumenRetencionesIRPF {
  let totalRetenido = 0;
  let totalBaseSujeta = 0;
  let totalLiquidoAfectado = 0;

  const facturasConIRPF: Factura[] = [];

  const mod111 = {
    nombre: 'Modelo 111 (Profesionales y Autónomos)',
    descripcion: 'Retenciones del IRPF a profesionales colegiados, nuevos autónomos y actividades agrarias.',
    base: 0,
    retencion: 0,
    count: 0,
    facturasIds: [] as string[],
    perceptoresSet: new Set<string>(),
  };

  const mod115 = {
    nombre: 'Modelo 115 (Arrendamientos de Inmuebles Urbanos)',
    descripcion: 'Retenciones sobre el alquiler de locales comerciales, oficinas y almacenes.',
    base: 0,
    retencion: 0,
    count: 0,
    facturasIds: [] as string[],
    perceptoresSet: new Set<string>(),
  };

  const otros = {
    nombre: 'Otras Retenciones (Mod. 123 / Capital / Otros)',
    descripcion: 'Retenciones sobre rendimientos del capital mobiliario, licencias o epígrafes singulares.',
    base: 0,
    retencion: 0,
    count: 0,
    facturasIds: [] as string[],
    perceptoresSet: new Set<string>(),
  };

  const mapPorcentaje = new Map<number, { porcentaje: number; etiqueta: string; base: number; cuotaRetencion: number; count: number }>();
  const mapPerceptores = new Map<string, PerceptorIRPFResumen>();

  const facturasList = Array.isArray(facturas) ? facturas : [];

  facturasList.forEach((f) => {
    if (!f) return;
    // Comprobar si la factura tiene retención explícita o calculada
    const cuota = Number(f.cuotaIRPF) || 0;
    const tieneRetencion = Boolean(f.aplicaRetencionIRPF || cuota > 0 || (f.porcentajeIRPF && f.porcentajeIRPF > 0));

    if (tieneRetencion) {
      const base = Number(f.baseImponible) || 0;
      const pct = f.porcentajeIRPF !== undefined && f.porcentajeIRPF !== null && !isNaN(Number(f.porcentajeIRPF))
        ? Number(f.porcentajeIRPF)
        : extraerPorcentajeIRPF(f.tipoRetencionIRPF);
      const cuotaCalculada = cuota > 0 ? cuota : Math.round(base * (pct / 100) * 100) / 100;
      const tot = Number(f.total) || (base - cuotaCalculada);

      // Si la cuota calculada es 0 y no hay porcentaje, ignorar
      if (cuotaCalculada === 0 && pct === 0) return;

      totalRetenido += cuotaCalculada;
      totalBaseSujeta += base;
      totalLiquidoAfectado += tot;
      facturasConIRPF.push(f);

      // Clasificación por modelo AEAT
      const concepto = f.conceptoRetencionIRPF || (pct === 19 ? 'ARRENDAMIENTO' : pct === 2 ? 'AGRARIO' : 'PROFESIONAL');
      const nombreProv = f.nombreProveedor || f.idProveedor || 'Proveedor sin nombre';
      const cifProv = (f as any).cif || (f as any).nif || (f as any).cifProveedor || '';

      let modeloAeat: '111' | '115' | '123' | 'OTRO' = '111';

      if (concepto === 'ARRENDAMIENTO' || (pct === 19 && (!f.conceptoRetencionIRPF || f.conceptoRetencionIRPF === 'ARRENDAMIENTO'))) {
        modeloAeat = '115';
        mod115.base += base;
        mod115.retencion += cuotaCalculada;
        mod115.count += 1;
        mod115.facturasIds.push(f.idFactura);
        mod115.perceptoresSet.add(nombreProv.toLowerCase().trim());
      } else if (concepto === 'PROFESIONAL' || concepto === 'AGRARIO' || pct === 15 || pct === 7 || pct === 2 || pct === 1) {
        modeloAeat = '111';
        mod111.base += base;
        mod111.retencion += cuotaCalculada;
        mod111.count += 1;
        mod111.facturasIds.push(f.idFactura);
        mod111.perceptoresSet.add(nombreProv.toLowerCase().trim());
      } else {
        modeloAeat = 'OTRO';
        otros.base += base;
        otros.retencion += cuotaCalculada;
        otros.count += 1;
        otros.facturasIds.push(f.idFactura);
        otros.perceptoresSet.add(nombreProv.toLowerCase().trim());
      }

      // Agrupación de perceptor
      const keyPerceptor = `${nombreProv.toLowerCase().trim()}_${modeloAeat}_${pct}`;
      if (!mapPerceptores.has(keyPerceptor)) {
        mapPerceptores.set(keyPerceptor, {
          idProveedor: f.idProveedor,
          nombreProveedor: nombreProv,
          cifProveedor: cifProv,
          modeloAeat,
          concepto,
          baseTotal: 0,
          porcentaje: pct,
          cuotaTotal: 0,
          facturasCount: 0,
          facturasIds: [],
        });
      }

      const pObj = mapPerceptores.get(keyPerceptor)!;
      pObj.baseTotal = Math.round((pObj.baseTotal + base) * 100) / 100;
      pObj.cuotaTotal = Math.round((pObj.cuotaTotal + cuotaCalculada) * 100) / 100;
      pObj.facturasCount += 1;
      pObj.facturasIds.push(f.idFactura);
      if (!pObj.cifProveedor && cifProv) pObj.cifProveedor = cifProv;

      // Desglose por porcentaje
      if (!mapPorcentaje.has(pct)) {
        let etiqueta = `${pct}% IRPF`;
        if (pct === 15) etiqueta = '15% Profesional General';
        else if (pct === 7) etiqueta = '7% Nuevos Autónomos';
        else if (pct === 19) etiqueta = '19% Arrendamiento';
        else if (pct === 2) etiqueta = '2% Agrario';
        else if (pct === 1) etiqueta = '1% Módulos';

        mapPorcentaje.set(pct, {
          porcentaje: pct,
          etiqueta,
          base: 0,
          cuotaRetencion: 0,
          count: 0,
        });
      }

      const itemPct = mapPorcentaje.get(pct)!;
      itemPct.base += base;
      itemPct.cuotaRetencion += cuotaCalculada;
      itemPct.count += 1;
    }
  });

  const desglosePorPorcentaje = Array.from(mapPorcentaje.values()).sort((a, b) => b.porcentaje - a.porcentaje);
  const perceptores = Array.from(mapPerceptores.values()).sort((a, b) => b.cuotaTotal - a.cuotaTotal);

  const roundedTotalRetenido = Math.round(totalRetenido * 100) / 100;
  const roundedBaseSujeta = Math.round(totalBaseSujeta * 100) / 100;

  return {
    cuotaIRPFTotal: roundedTotalRetenido,
    totalRetenido: roundedTotalRetenido,
    baseTotal: roundedBaseSujeta,
    totalBaseSujeta: roundedBaseSujeta,
    totalLiquidoAfectado: Math.round(totalLiquidoAfectado * 100) / 100,
    numFacturasConIRPF: facturasConIRPF.length,
    facturasConIRPF,
    modelo111: {
      nombre: mod111.nombre,
      descripcion: mod111.descripcion,
      numPerceptores: mod111.perceptoresSet.size,
      baseTotal: Math.round(mod111.base * 100) / 100,
      cuotaTotal: Math.round(mod111.retencion * 100) / 100,
      count: mod111.count,
      facturasIds: mod111.facturasIds,
    },
    modelo115: {
      nombre: mod115.nombre,
      descripcion: mod115.descripcion,
      numPerceptores: mod115.perceptoresSet.size,
      baseTotal: Math.round(mod115.base * 100) / 100,
      cuotaTotal: Math.round(mod115.retencion * 100) / 100,
      count: mod115.count,
      facturasIds: mod115.facturasIds,
    },
    otros: {
      nombre: otros.nombre,
      descripcion: otros.descripcion,
      numPerceptores: otros.perceptoresSet.size,
      baseTotal: Math.round(otros.base * 100) / 100,
      cuotaTotal: Math.round(otros.retencion * 100) / 100,
      count: otros.count,
      facturasIds: otros.facturasIds,
    },
    desgloseModelos: {
      mod111: {
        nombre: mod111.nombre,
        descripcion: mod111.descripcion,
        base: Math.round(mod111.base * 100) / 100,
        retencion: Math.round(mod111.retencion * 100) / 100,
        count: mod111.count,
        facturasIds: mod111.facturasIds,
      },
      mod115: {
        nombre: mod115.nombre,
        descripcion: mod115.descripcion,
        base: Math.round(mod115.base * 100) / 100,
        retencion: Math.round(mod115.retencion * 100) / 100,
        count: mod115.count,
        facturasIds: mod115.facturasIds,
      },
      otros: {
        nombre: otros.nombre,
        descripcion: otros.descripcion,
        base: Math.round(otros.base * 100) / 100,
        retencion: Math.round(otros.retencion * 100) / 100,
        count: otros.count,
        facturasIds: otros.facturasIds,
      },
    },
    perceptores,
    desglosePorPorcentaje,
  };
}
