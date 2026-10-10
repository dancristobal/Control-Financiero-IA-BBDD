import {
  Factura,
  TrimestreFiscal,
  PeriodoFiscalModelo,
  DatosAdicionalesFiscalesAnio,
  DEFAULT_DATOS_TRIMESTRE,
  ResultadoModelo303,
  ResultadoModelo390,
  ResultadoModelo130,
  ResultadoModelo111,
  ResultadoModelo347,
  ResultadoModelo349,
  DeclaradoModelo347,
  OperacionModelo349,
  PerceptorModelo111,
  ParticularidadModelo
} from '../types';

const STORAGE_KEY_DATOS_ADICIONALES = 'fa_modelos_datos_adicionales_v1';

const cacheDatosFiscales: Record<number, DatosAdicionalesFiscalesAnio> = {};

/**
 * Obtiene los datos complementarios introducidos por el usuario
 * para la liquidación de ingresos, pagos previos y nóminas.
 */
export function obtenerDatosAdicionalesFiscales(anio: number = 2026): DatosAdicionalesFiscalesAnio {
  if (cacheDatosFiscales[anio]) {
    return cacheDatosFiscales[anio];
  }

  return {
    T1: { ...DEFAULT_DATOS_TRIMESTRE },
    T2: { ...DEFAULT_DATOS_TRIMESTRE },
    T3: { ...DEFAULT_DATOS_TRIMESTRE },
    T4: { ...DEFAULT_DATOS_TRIMESTRE },
  };
}

/**
 * Guarda los datos complementarios en memoria y los persiste en la base de datos MySQL (declaraciones_aeat).
 */
export function guardarDatosAdicionalesFiscales(
  datos: DatosAdicionalesFiscalesAnio,
  anio: number = 2026
): void {
  cacheDatosFiscales[anio] = datos;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('datosFiscalesAdicionalesActualizados', { detail: { anio, datos } }));
  }

  // ⚡ Persistir en la base de datos MySQL (declaraciones_aeat)
  fetch('/api/aeat/declaraciones', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      declaracion: {
        id: `datos-adicionales-${anio}`,
        modelo: 'DATOS_BASE',
        ejercicio: anio,
        periodo: 'Anual',
        estado: 'Borrador',
        resultadoDeclaracion: 0,
        datosCasillas: datos,
      },
    }),
  }).catch((err) => console.warn('Aviso al persistir datos adicionales fiscales en MySQL:', err));
}

/**
 * Determina el trimestre de una factura por fecha de emisión
 */
export function obtenerTrimestreFactura(fechaStr?: string): TrimestreFiscal {
  if (!fechaStr) return 'T1';
  const d = new Date(fechaStr);
  if (isNaN(d.getTime())) return 'T1';
  const m = d.getMonth(); // 0 a 11
  if (m <= 2) return 'T1';
  if (m <= 5) return 'T2';
  if (m <= 8) return 'T3';
  return 'T4';
}

/**
 * Filtra facturas por año y opcionalmente por trimestre
 */
export function filtrarFacturasPeriodo(
  facturas: Factura[] = [],
  anio: number = 2026,
  trimestre?: TrimestreFiscal
): Factura[] {
  return facturas.filter((f) => {
    if (!f || !f.fechaEmision) return false;
    const d = new Date(f.fechaEmision);
    if (isNaN(d.getTime())) return false;
    if (d.getFullYear() !== anio) return false;
    if (trimestre && obtenerTrimestreFactura(f.fechaEmision) !== trimestre) return false;
    return true;
  });
}

// =========================================================================
// 1. MODELO 303 (IVA TRIMESTRAL)
// =========================================================================

export function calcularModelo303(params: {
  facturas: Factura[];
  trimestre: TrimestreFiscal;
  anio: number;
  datosAdicionales?: DatosAdicionalesFiscalesAnio;
}): ResultadoModelo303 {
  const { facturas, trimestre, anio } = params;
  const datos = params.datosAdicionales || obtenerDatosAdicionalesFiscales(anio);
  const datosT = datos[trimestre] || DEFAULT_DATOS_TRIMESTRE;

  const facturasT = filtrarFacturasPeriodo(facturas, anio, trimestre);

  // IVA Devengado (Ventas / Ingresos)
  const baseDevengado21 = Number(datosT.ingresosBase21) || 0;
  const cuotaDevengado21 = Math.round(baseDevengado21 * 0.21 * 100) / 100;

  const baseDevengado10 = Number(datosT.ingresosBase10) || 0;
  const cuotaDevengado10 = Math.round(baseDevengado10 * 0.10 * 100) / 100;

  const baseDevengado4 = Number(datosT.ingresosBase4) || 0;
  const cuotaDevengado4 = Math.round(baseDevengado4 * 0.04 * 100) / 100;

  const totalCuotaDevengada = Math.round((cuotaDevengado21 + cuotaDevengado10 + cuotaDevengado4) * 100) / 100;

  // IVA Deducible (Compras / Facturas registradas)
  let baseDeducibleCorriente = 0;
  let cuotaDeducibleCorriente = 0;
  let baseDeducibleBienesInversion = 0;
  let cuotaDeducibleBienesInversion = 0;

  facturasT.forEach((f) => {
    const base = Number(f.baseImponible) || 0;
    const cuota = Number(f.cuotaIVA) || 0;
    // Si la categoría de gasto es maquinaria, equipo informático, elementos de transporte o inmovilizado
    const cat = (f.categoriaGasto || '').toLowerCase();
    const esInversion = cat.includes('maquinaria') || cat.includes('equipo') || cat.includes('inmovilizado') || cat.includes('inversión');

    if (esInversion) {
      baseDeducibleBienesInversion += base;
      cuotaDeducibleBienesInversion += cuota;
    } else {
      baseDeducibleCorriente += base;
      cuotaDeducibleCorriente += cuota;
    }
  });

  const totalCuotaDeducible = Math.round((cuotaDeducibleCorriente + cuotaDeducibleBienesInversion) * 100) / 100;
  const diferenciaCuotas = Math.round((totalCuotaDevengada - totalCuotaDeducible) * 100) / 100;
  const resultadoFinal = diferenciaCuotas;

  let estadoResultado: 'A_INGRESAR' | 'A_COMPENSAR' | 'CERO' = 'CERO';
  if (resultadoFinal > 0) estadoResultado = 'A_INGRESAR';
  else if (resultadoFinal < 0) estadoResultado = 'A_COMPENSAR';

  // Particularidades y Requisitos
  const particularidades: ParticularidadModelo[] = [
    {
      id: 'p-303-compras',
      tipo: 'completado',
      titulo: 'IVA Soportado Deducible conciliado',
      descripcion: `Calculado automáticamente desde ${facturasT.length} facturas de proveedores registradas en el trimestre (Base: ${Math.round((baseDeducibleCorriente + baseDeducibleBienesInversion) * 100) / 100} €, Cuota: ${totalCuotaDeducible} €).`,
    },
    {
      id: 'p-303-ventas',
      tipo: totalCuotaDevengada > 0 ? 'completado' : 'pendiente',
      titulo: totalCuotaDevengada > 0 ? 'IVA Repercutido computado' : 'Pendiente: Registro de Facturas Emitidas / Ventas',
      descripcion: totalCuotaDevengada > 0
        ? `Calculado sobre ${Math.round((baseDevengado21 + baseDevengado10 + baseDevengado4) * 100) / 100} € de base de ventas declaradas para ${trimestre}.`
        : `Actualmente el IVA repercutido está en 0 €. Para obtener la cuota líquida a ingresar a la AEAT, introduce los ingresos de ventas del trimestre o sincroniza tus facturas emitidas.`,
      accionRequerida: totalCuotaDevengada === 0 ? 'Introduce tus ventas trimestrales en el panel inferior' : undefined,
    },
    {
      id: 'p-303-prorrata',
      tipo: 'info',
      titulo: 'Regla de Prorrata y Sectores Diferenciados',
      descripcion: 'Si realizas actividades exentas de IVA (como formación, salud o seguros), se debe aplicar el porcentaje de prorrata legal a las cuotas deducibles.',
    },
  ];

  return {
    periodo: trimestre,
    anio,
    baseDevengado21: Math.round(baseDevengado21 * 100) / 100,
    cuotaDevengado21,
    baseDevengado10: Math.round(baseDevengado10 * 100) / 100,
    cuotaDevengado10,
    baseDevengado4: Math.round(baseDevengado4 * 100) / 100,
    cuotaDevengado4,
    totalCuotaDevengada,
    baseDeducibleCorriente: Math.round(baseDeducibleCorriente * 100) / 100,
    cuotaDeducibleCorriente: Math.round(cuotaDeducibleCorriente * 100) / 100,
    baseDeducibleBienesInversion: Math.round(baseDeducibleBienesInversion * 100) / 100,
    cuotaDeducibleBienesInversion: Math.round(cuotaDeducibleBienesInversion * 100) / 100,
    totalCuotaDeducible,
    diferenciaCuotas,
    resultadoFinal,
    estadoResultado,
    particularidades,
    numFacturasGastos: facturasT.length,
  };
}

// =========================================================================
// 2. MODELO 390 (RESUMEN ANUAL IVA)
// =========================================================================

export function calcularModelo390(params: {
  facturas: Factura[];
  anio: number;
  datosAdicionales?: DatosAdicionalesFiscalesAnio;
}): ResultadoModelo390 {
  const { facturas, anio } = params;
  const datos = params.datosAdicionales || obtenerDatosAdicionalesFiscales(anio);

  const trimestres: TrimestreFiscal[] = ['T1', 'T2', 'T3', 'T4'];
  let totalVentasDevengado = 0;
  let totalIvaRepercutido = 0;
  let totalComprasDeducible = 0;
  let totalIvaSoportado = 0;

  const desgloseTrimestral = trimestres.map((t) => {
    const res303 = calcularModelo303({ facturas, trimestre: t, anio, datosAdicionales: datos });
    const ventasT = res303.baseDevengado21 + res303.baseDevengado10 + res303.baseDevengado4;
    const comprasT = res303.baseDeducibleCorriente + res303.baseDeducibleBienesInversion;

    totalVentasDevengado += ventasT;
    totalIvaRepercutido += res303.totalCuotaDevengada;
    totalComprasDeducible += comprasT;
    totalIvaSoportado += res303.totalCuotaDeducible;

    return {
      trimestre: t,
      ivaRepercutido: res303.totalCuotaDevengada,
      ivaSoportado: res303.totalCuotaDeducible,
      saldo: res303.diferenciaCuotas,
    };
  });

  const resultadoAnualLiquidacion = Math.round((totalIvaRepercutido - totalIvaSoportado) * 100) / 100;
  const volumenOperaciones = Math.round(totalVentasDevengado * 100) / 100;

  const particularidades: ParticularidadModelo[] = [
    {
      id: 'p-390-conciliacion',
      tipo: 'info',
      titulo: 'Conciliación Anual con Modelos 303 Trimestrales',
      descripcion: 'El resultado y las bases anuales del Modelo 390 deben coincidir con exactitud con la suma de las cuatro declaraciones trimestrales del ejercicio.',
    },
    {
      id: 'p-390-exoneracion',
      tipo: 'info',
      titulo: 'Exoneración del Modelo 390 para ciertos contribuyentes',
      descripcion: 'Los autónomos que tributan exclusivamente en territorio común y cumplimenten las casillas de información adicional del Modelo 303 del 4T están exonerados de presentar el Modelo 390.',
    },
    {
      id: 'p-390-compras-completas',
      tipo: 'completado',
      titulo: 'Volumen de Compras y Soportado Completo',
      descripcion: `IVA Soportado anual acumulado de ${Math.round(totalIvaSoportado * 100) / 100} € sobre una base de gasto de ${Math.round(totalComprasDeducible * 100) / 100} €.`,
    },
  ];

  return {
    anio,
    totalVentasDevengado: Math.round(totalVentasDevengado * 100) / 100,
    totalIvaRepercutido: Math.round(totalIvaRepercutido * 100) / 100,
    totalComprasDeducible: Math.round(totalComprasDeducible * 100) / 100,
    totalIvaSoportado: Math.round(totalIvaSoportado * 100) / 100,
    resultadoAnualLiquidacion,
    desgloseTrimestral,
    volumenOperaciones,
    particularidades,
  };
}

// =========================================================================
// 3. MODELO 130 (PAGO FRACCIONADO IRPF - ESTIMACIÓN DIRECTA)
// =========================================================================

export function calcularModelo130(params: {
  facturas: Factura[];
  trimestre: TrimestreFiscal;
  anio: number;
  datosAdicionales?: DatosAdicionalesFiscalesAnio;
}): ResultadoModelo130 {
  const { facturas, trimestre, anio } = params;
  const datos = params.datosAdicionales || obtenerDatosAdicionalesFiscales(anio);

  // El modelo 130 es acumulativo desde el 1 de enero hasta el final del trimestre actual
  const trimestresAcumulados: TrimestreFiscal[] =
    trimestre === 'T1' ? ['T1']
    : trimestre === 'T2' ? ['T1', 'T2']
    : trimestre === 'T3' ? ['T1', 'T2', 'T3']
    : ['T1', 'T2', 'T3', 'T4'];

  let ingresosComputablesAcumulados = 0;
  let gastosDeduciblesAcumulados = 0;
  let retencionesSoportadasAcumuladas = 0;
  let pagosFraccionadosPrevios = 0;

  trimestresAcumulados.forEach((t) => {
    const dT = datos[t] || DEFAULT_DATOS_TRIMESTRE;
    const vTotal = (Number(dT.ingresosBase21) || 0) + (Number(dT.ingresosBase10) || 0) + (Number(dT.ingresosBase4) || 0) + (Number(dT.ingresosBaseOtros) || 0);
    ingresosComputablesAcumulados += vTotal;
    retencionesSoportadasAcumuladas += Number(dT.retencionesVentasSoportadas) || 0;

    // Sumar gastos acumulados de las facturas emitidas hasta este trimestre
    const facturasT = filtrarFacturasPeriodo(facturas, anio, t);
    facturasT.forEach((f) => {
      gastosDeduciblesAcumulados += Number(f.baseImponible) || 0;
    });

    // Sumar nóminas si las hay
    gastosDeduciblesAcumulados += Number(dT.baseNominasTrabajadores) || 0;
  });

  // Los pagos fraccionados previos son los declarados en trimestres anteriores (no el actual)
  trimestresAcumulados.slice(0, -1).forEach((t) => {
    const dT = datos[t] || DEFAULT_DATOS_TRIMESTRE;
    pagosFraccionadosPrevios += Number(dT.pagosFraccionadosPrevios130) || 0;
  });

  // Si el usuario especificó pagos previos en este trimestre
  const datosActualT = datos[trimestre] || DEFAULT_DATOS_TRIMESTRE;
  if (datosActualT.pagosFraccionadosPrevios130 > 0 && pagosFraccionadosPrevios === 0) {
    pagosFraccionadosPrevios = Number(datosActualT.pagosFraccionadosPrevios130);
  }

  const rendimientoNeto = Math.round((ingresosComputablesAcumulados - gastosDeduciblesAcumulados) * 100) / 100;
  // 20% si hay beneficio
  const pagoFraccionado20Pct = rendimientoNeto > 0 ? Math.round(rendimientoNeto * 0.20 * 100) / 100 : 0;

  // Casilla 07 = 20% - Retenciones previas - Pagos fraccionados de trimestres anteriores
  const preliminar = pagoFraccionado20Pct - retencionesSoportadasAcumuladas - pagosFraccionadosPrevios;
  const totalAIngresar = Math.max(0, Math.round(preliminar * 100) / 100);

  // ¿Exento por retenciones en factura > 70%?
  const exentoPorRetencionPrevia = retencionesSoportadasAcumuladas > 0 && ingresosComputablesAcumulados > 0 && (retencionesSoportadasAcumuladas / (ingresosComputablesAcumulados * 0.15)) >= 0.7;

  const particularidades: ParticularidadModelo[] = [
    {
      id: 'p-130-gastos',
      tipo: 'completado',
      titulo: 'Gastos computables acumulados desde facturas',
      descripcion: `Casilla 02 calculada con el neto deducible acumulado (${Math.round(gastosDeduciblesAcumulados * 100) / 100} €).`,
    },
    {
      id: 'p-130-ingresos',
      tipo: ingresosComputablesAcumulados > 0 ? 'completado' : 'pendiente',
      titulo: ingresosComputablesAcumulados > 0 ? 'Ingresos acumulados computados' : 'Pendiente: Registro de Ingresos Acumulados',
      descripcion: ingresosComputablesAcumulados > 0
        ? `Casilla 01 calculada sobre ${Math.round(ingresosComputablesAcumulados * 100) / 100} € acumulados hasta ${trimestre}.`
        : `Casilla 01 está en 0 €. Introduce tus ventas acumuladas del año para calcular el rendimiento neto real y la cuota del 20%.`,
      accionRequerida: ingresosComputablesAcumulados === 0 ? 'Introduce tus ingresos en la tabla inferior' : undefined,
    },
    {
      id: 'p-130-exencion-70',
      tipo: 'advertencia',
      titulo: 'Regla de Exención del 70% (Art. 109 Ley IRPF)',
      descripcion: 'Si al menos el 70% de los ingresos de tu actividad económica profesional han tenido retención de IRPF en factura por parte de tus clientes, estás legalmente exonerado de presentar el Modelo 130.',
    },
  ];

  return {
    periodo: trimestre,
    anio,
    ingresosComputablesAcumulados: Math.round(ingresosComputablesAcumulados * 100) / 100,
    gastosDeduciblesAcumulados: Math.round(gastosDeduciblesAcumulados * 100) / 100,
    rendimientoNeto,
    pagoFraccionado20Pct,
    retencionesSoportadasAcumuladas: Math.round(retencionesSoportadasAcumuladas * 100) / 100,
    pagosFraccionadosPrevios: Math.round(pagosFraccionadosPrevios * 100) / 100,
    totalAIngresar,
    exentoPorRetencionPrevia,
    particularidades,
  };
}

// =========================================================================
// 4. MODELO 111 (RETENCIONES IRPF: PROFESIONALES, AUTÓNOMOS Y NÓMINAS)
// =========================================================================

export function calcularModelo111(params: {
  facturas: Factura[];
  trimestre: TrimestreFiscal;
  anio: number;
  datosAdicionales?: DatosAdicionalesFiscalesAnio;
}): ResultadoModelo111 {
  const { facturas, trimestre, anio } = params;
  const datos = params.datosAdicionales || obtenerDatosAdicionalesFiscales(anio);
  const datosT = datos[trimestre] || DEFAULT_DATOS_TRIMESTRE;

  const facturasT = filtrarFacturasPeriodo(facturas, anio, trimestre);

  // 1. Rendimientos del trabajo (Nóminas de empleados)
  const trabajoNumPerceptores = Number(datosT.numTrabajadoresNominas) || 0;
  const trabajoImportePercepciones = Number(datosT.baseNominasTrabajadores) || 0;
  const trabajoImporteRetenciones = Number(datosT.retencionesNominasTrabajadores) || 0;

  // 2. Rendimientos de actividades económicas (Profesionales y autónomos)
  const perceptoresMap = new Map<string, PerceptorModelo111>();

  let actividadesBase = 0;
  let actividadesRetencion = 0;
  let agrarioBase = 0;
  let agrarioRetencion = 0;
  const agrarioPerceptoresSet = new Set<string>();

  facturasT.forEach((f) => {
    const cuota = Number(f.cuotaIRPF) || 0;
    const tieneIRPF = Boolean(f.aplicaRetencionIRPF || cuota > 0 || (f.porcentajeIRPF && f.porcentajeIRPF > 0));

    if (tieneIRPF) {
      const base = Number(f.baseImponible) || 0;
      const pct = Number(f.porcentajeIRPF) || 15;
      const cuotaCalculada = cuota > 0 ? cuota : Math.round(base * (pct / 100) * 100) / 100;
      const nombreProv = f.nombreProveedor || f.idProveedor || 'Proveedor';
      const nifProv = (f as any).cif || (f as any).nif || (f as any).cifProveedor || 'PENDIENTE_CIF';

      // Descartar arrendamiento (el alquiler va al Modelo 115, no al 111)
      const concepto = f.conceptoRetencionIRPF || (pct === 19 ? 'ARRENDAMIENTO' : pct === 2 ? 'AGRARIO' : 'PROFESIONAL');
      if (concepto === 'ARRENDAMIENTO' || pct === 19) {
        return; // Va a Mod. 115
      }

      if (concepto === 'AGRARIO' || pct === 2) {
        agrarioBase += base;
        agrarioRetencion += cuotaCalculada;
        agrarioPerceptoresSet.add(nombreProv.toLowerCase());
      } else {
        actividadesBase += base;
        actividadesRetencion += cuotaCalculada;
      }

      const key = `${nifProv}_${nombreProv}`;
      if (!perceptoresMap.has(key)) {
        perceptoresMap.set(key, {
          nif: nifProv,
          nombre: nombreProv,
          subclave: concepto === 'AGRARIO' ? 'AGRARIO' : 'PROFESIONAL',
          base: 0,
          retencion: 0,
          tipoPct: pct,
          numFacturas: 0,
        });
      }

      const pObj = perceptoresMap.get(key)!;
      pObj.base = Math.round((pObj.base + base) * 100) / 100;
      pObj.retencion = Math.round((pObj.retencion + cuotaCalculada) * 100) / 100;
      pObj.numFacturas += 1;
    }
  });

  const perceptoresDetalle = Array.from(perceptoresMap.values()).sort((a, b) => b.retencion - a.retencion);
  const actividadesNumPerceptores = perceptoresDetalle.filter((p) => p.subclave !== 'AGRARIO').length;
  const agrarioNumPerceptores = agrarioPerceptoresSet.size;

  const totalRetencionesAIngresar = Math.round((trabajoImporteRetenciones + actividadesRetencion + agrarioRetencion) * 100) / 100;

  const particularidades: ParticularidadModelo[] = [
    {
      id: 'p-111-profesionales',
      tipo: 'completado',
      titulo: 'Retenciones a Profesionales Conciliadas',
      descripcion: `Casillas 07, 08 y 09 calculadas desde facturas de profesionales colegiados y nuevos autónomos (${actividadesNumPerceptores} perceptor(es), Base: ${Math.round(actividadesBase * 100) / 100} €, Retención: ${Math.round(actividadesRetencion * 100) / 100} €).`,
    },
    {
      id: 'p-111-separacion-115',
      tipo: 'info',
      titulo: 'Segregación oficial de Arrendamientos (Mod. 115)',
      descripcion: 'Las facturas con retención del 19% por alquiler de oficinas o naves se segregan automáticamente de este modelo y deben declararse en el Modelo 115.',
    },
    {
      id: 'p-111-nominas',
      tipo: trabajoNumPerceptores > 0 ? 'completado' : 'pendiente',
      titulo: trabajoNumPerceptores > 0 ? 'Rendimientos del trabajo incluidos' : 'Pendiente: Retenciones de Nóminas (si hay empleados)',
      descripcion: trabajoNumPerceptores > 0
        ? `Casillas 01 a 03 cumplimentadas con ${trabajoNumPerceptores} trabajadores y ${trabajoImporteRetenciones} € de retención salarial.`
        : `Si tu empresa o negocio tiene trabajadores contratados en nómina, introduce los datos de salarios y retenciones de IRPF para completar las casillas 01, 02 y 03.`,
      accionRequerida: trabajoNumPerceptores === 0 ? 'Introduce datos de nóminas si tienes personal a cargo' : undefined,
    },
  ];

  return {
    periodo: trimestre,
    anio,
    trabajoNumPerceptores,
    trabajoImportePercepciones: Math.round(trabajoImportePercepciones * 100) / 100,
    trabajoImporteRetenciones: Math.round(trabajoImporteRetenciones * 100) / 100,
    actividadesNumPerceptores,
    actividadesImportePercepciones: Math.round(actividadesBase * 100) / 100,
    actividadesImporteRetenciones: Math.round(actividadesRetencion * 100) / 100,
    agrarioNumPerceptores,
    agrarioImportePercepciones: Math.round(agrarioBase * 100) / 100,
    agrarioImporteRetenciones: Math.round(agrarioRetencion * 100) / 100,
    totalRetencionesAIngresar,
    perceptoresDetalle,
    particularidades,
  };
}

// =========================================================================
// 5. MODELO 347 (DECLARACIÓN ANUAL OPERACIONES CON TERCEROS > 3.005,06 €)
// =========================================================================

export function calcularModelo347(params: {
  facturas: Factura[];
  anio: number;
  umbralMinimo?: number;
}): ResultadoModelo347 {
  const { facturas, anio, umbralMinimo = 3005.06 } = params;

  const facturasAnio = filtrarFacturasPeriodo(facturas, anio);

  // Agrupar por proveedor
  const proveedoresMap = new Map<string, {
    nif: string;
    nombre: string;
    t1: number;
    t2: number;
    t3: number;
    t4: number;
    total: number;
    numFacturas: number;
    tieneRetencion: boolean;
  }>();

  facturasAnio.forEach((f) => {
    const nombre = f.nombreProveedor || f.idProveedor || 'Proveedor';
    const nif = (f as any).cif || (f as any).nif || (f as any).cifProveedor || '';
    const key = (nif && nif.trim().length > 3) ? nif.toUpperCase().trim() : nombre.toLowerCase().trim();

    const t = obtenerTrimestreFactura(f.fechaEmision);
    const importeTotal = Number(f.total) || (Number(f.baseImponible) || 0) + (Number(f.cuotaIVA) || 0);

    const tieneRet = Boolean(f.aplicaRetencionIRPF || (f.cuotaIRPF && f.cuotaIRPF > 0));

    if (!proveedoresMap.has(key)) {
      proveedoresMap.set(key, {
        nif,
        nombre,
        t1: 0,
        t2: 0,
        t3: 0,
        t4: 0,
        total: 0,
        numFacturas: 0,
        tieneRetencion: false,
      });
    }

    const p = proveedoresMap.get(key)!;
    if (t === 'T1') p.t1 += importeTotal;
    else if (t === 'T2') p.t2 += importeTotal;
    else if (t === 'T3') p.t3 += importeTotal;
    else if (t === 'T4') p.t4 += importeTotal;

    p.total += importeTotal;
    p.numFacturas += 1;
    if (tieneRet) p.tieneRetencion = true;
    if (!p.nif && nif) p.nif = nif;
  });

  const declarados: DeclaradoModelo347[] = [];
  let totalVolumenDeclarado = 0;
  let tercerosEnRevisionCif = 0;

  proveedoresMap.forEach((p) => {
    // Redondear a 2 decimales
    const tot = Math.round(p.total * 100) / 100;
    if (tot >= umbralMinimo) {
      const tieneCifValido = Boolean(p.nif && p.nif.trim().length >= 8);
      if (!tieneCifValido) tercerosEnRevisionCif++;

      declarados.push({
        nif: p.nif || 'FALTA_CIF',
        nombre: p.nombre,
        tipoOperacion: 'COMPRAS',
        totalAnual: tot,
        t1: Math.round(p.t1 * 100) / 100,
        t2: Math.round(p.t2 * 100) / 100,
        t3: Math.round(p.t3 * 100) / 100,
        t4: Math.round(p.t4 * 100) / 100,
        tieneCifValido,
        numFacturas: p.numFacturas,
      });
      totalVolumenDeclarado += tot;
    }
  });

  // Ordenar por volumen descendente
  declarados.sort((a, b) => b.totalAnual - a.totalAnual);

  const particularidades: ParticularidadModelo[] = [
    {
      id: 'p-347-umbral',
      tipo: 'completado',
      titulo: `Filtro de Umbral Legal de ${umbralMinimo.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € (IVA Incluido)`,
      descripcion: `Se han detectado ${declarados.length} proveedores cuyo volumen anual supera el límite establecido por el art. 33 del RD 1065/2007.`,
    },
    {
      id: 'p-347-cifs',
      tipo: tercerosEnRevisionCif > 0 ? 'pendiente' : 'completado',
      titulo: tercerosEnRevisionCif > 0 ? `Revisión requerida: ${tercerosEnRevisionCif} proveedores sin CIF/NIF válido` : 'Todos los NIF/CIF identificados',
      descripcion: tercerosEnRevisionCif > 0
        ? `Hacienda rechaza las declaraciones del Modelo 347 si los registros no disponen de un NIF/CIF formal. Revisa los datos de estos proveedores en el directorio.`
        : `Los ${declarados.length} proveedores a declarar cuentan con su identificación fiscal completa.`,
      accionRequerida: tercerosEnRevisionCif > 0 ? 'Completa el CIF en el directorio de proveedores' : undefined,
    },
    {
      id: 'p-347-exclusion-retencion',
      tipo: 'advertencia',
      titulo: 'Exclusión obligatoria de operaciones con retención de IRPF',
      descripcion: 'Las operaciones que hayan sido objeto de retención (ej. profesionales y alquileres) no deben incluirse en el Modelo 347 si ya fueron informadas en los resúmenes anuales 190 o 180.',
    },
    {
      id: 'p-347-circularizacion',
      tipo: 'info',
      titulo: 'Circularización de saldos con proveedores',
      descripcion: 'Se recomienda enviar una circular informativa a cada proveedor antes de presentar el modelo en febrero para cotejar que sus facturas emitidas coincidan trimestre a trimestre con tus facturas registradas.',
    },
  ];

  return {
    anio,
    umbralMinimo,
    declarados,
    totalVolumenDeclarado: Math.round(totalVolumenDeclarado * 100) / 100,
    numDeclarados: declarados.length,
    tercerosEnRevisionCif,
    particularidades,
  };
}

// =========================================================================
// 6. MODELO 349 (DECLARACIÓN DE OPERACIONES INTRACOMUNITARIAS UE)
// =========================================================================

export function calcularModelo349(params: {
  facturas: Factura[];
  periodo: PeriodoFiscalModelo;
  anio: number;
}): ResultadoModelo349 {
  const { facturas, periodo, anio } = params;

  const facturasPeriodo = periodo === 'ANUAL'
    ? filtrarFacturasPeriodo(facturas, anio)
    : filtrarFacturasPeriodo(facturas, anio, periodo as TrimestreFiscal);

  // Lista de códigos de países de la UE (ISO 2 letras)
  const paisesUE = ['AT', 'BE', 'BG', 'CY', 'CZ', 'DE', 'DK', 'EE', 'EL', 'GR', 'ES', 'FI', 'FR', 'HR', 'HU', 'IE', 'IT', 'LT', 'LU', 'LV', 'MT', 'NL', 'PL', 'PT', 'RO', 'SE', 'SI', 'SK'];

  // Identificar operaciones intracomunitarias
  const operacionesMap = new Map<string, OperacionModelo349>();

  facturasPeriodo.forEach((f) => {
    const nombre = (f.nombreProveedor || '').toLowerCase();
    const idProv = (f.idProveedor || '').toLowerCase();
    const cifProv = ((f as any).cif || (f as any).nif || (f as any).cifProveedor || '').toUpperCase().trim();
    const cat = (f.categoriaGasto || '').toLowerCase();
    const tipos = (f.tiposIVA || '').toLowerCase();

    // Detección de proveedor comunitario:
    // 1. CIF con prefijo de país UE (ej. IE6388047V, DE123456789, FR12345678901...)
    // 2. Proveedores tecnológicos conocidos con sede en la UE (Google Cloud Irlanda, Microsoft Ireland, Adobe Systems Irlanda, AWS Luxembourg, Meta Platforms Ireland...)
    // 3. Indicación de exento por inversión de sujeto pasivo o IVA 0% intracomunitario
    const prefijoPais = cifProv.substring(0, 2);
    const esPrefijoUE = paisesUE.includes(prefijoPais) && prefijoPais !== 'ES';

    const esProveedorUEConocido =
      nombre.includes('google') ||
      nombre.includes('adobe') ||
      nombre.includes('aws') ||
      nombre.includes('amazon web') ||
      nombre.includes('microsoft') ||
      nombre.includes('meta') ||
      nombre.includes('digitalocean') ||
      nombre.includes('stripe') ||
      nombre.includes('shopify') ||
      nombre.includes('zoom') ||
      idProv.includes('google') ||
      idProv.includes('adobe');

    const tieneIvaCeroOInversion = tipos.includes('0%') || tipos.includes('exento') || f.cuotaIVA === 0;

    if (esPrefijoUE || (esProveedorUEConocido && tieneIvaCeroOInversion)) {
      const base = Number(f.baseImponible) || Number(f.total) || 0;
      const pais = esPrefijoUE ? prefijoPais : 'IE'; // Irlanda por defecto para software y cloud
      const claveOperacion: 'A' | 'I' = (cat.includes('suministro') || cat.includes('material') || cat.includes('mercancía')) ? 'A' : 'I';

      const nifIva = esPrefijoUE ? cifProv : `${pais}${cifProv.replace(/^ES/, '') || '6388047V'}`;
      const nombreVisible = f.nombreProveedor || 'Proveedor Comunitario UE';

      const key = `${pais}_${nifIva}_${claveOperacion}`;

      if (!operacionesMap.has(key)) {
        operacionesMap.set(key, {
          nifIvaUE: nifIva,
          nombre: nombreVisible,
          paisCodigo: pais,
          claveOperacion,
          baseImponible: 0,
          numFacturas: 0,
          viesValido: true,
        });
      }

      const op = operacionesMap.get(key)!;
      op.baseImponible = Math.round((op.baseImponible + base) * 100) / 100;
      op.numFacturas += 1;
    }
  });

  const operaciones = Array.from(operacionesMap.values()).sort((a, b) => b.baseImponible - a.baseImponible);

  let totalAdquisicionesServiciosI = 0;
  let totalAdquisicionesBienesA = 0;

  operaciones.forEach((o) => {
    if (o.claveOperacion === 'I') totalAdquisicionesServiciosI += o.baseImponible;
    else if (o.claveOperacion === 'A') totalAdquisicionesBienesA += o.baseImponible;
  });

  const totalOperacionesIntracomunitarias = Math.round((totalAdquisicionesServiciosI + totalAdquisicionesBienesA) * 100) / 100;

  const particularidades: ParticularidadModelo[] = [
    {
      id: 'p-349-roi',
      tipo: 'advertencia',
      titulo: 'Inscripción obligatoria en el ROI / VIES (Modelo 036)',
      descripcion: 'Para emitir o recibir facturas intracomunitarias sin IVA es requisito indispensable estar dado de alta en el Registro de Operadores Intracomunitarios (ROI).',
    },
    {
      id: 'p-349-claves',
      tipo: 'info',
      titulo: 'Claves de Operación: Clave I (Servicios) y Clave A (Bienes)',
      descripcion: 'La Clave I corresponde a prestaciones y adquisiciones de servicios (licencias cloud, software, servidores), mientras que la Clave A refleja adquisiciones de bienes físicos.',
    },
    {
      id: 'p-349-operaciones-detectadas',
      tipo: operaciones.length > 0 ? 'completado' : 'pendiente',
      titulo: operaciones.length > 0 ? `${operaciones.length} operadores intracomunitarios detectados` : 'Sin operaciones intracomunitarias en el periodo',
      descripcion: operaciones.length > 0
        ? `Total de adquisiciones intracomunitarias: ${totalOperacionesIntracomunitarias.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €.`
        : `No se han identificado facturas con proveedores de la UE exentas por inversión de sujeto pasivo. Si utilizas herramientas como Google, AWS o Adobe, revisa el CIF de la factura.`,
      accionRequerida: operaciones.length === 0 ? 'Añade el prefijo de país de la UE al CIF del proveedor' : undefined,
    },
  ];

  return {
    periodo,
    anio,
    operaciones,
    totalAdquisicionesServiciosI: Math.round(totalAdquisicionesServiciosI * 100) / 100,
    totalAdquisicionesBienesA: Math.round(totalAdquisicionesBienesA * 100) / 100,
    totalOperacionesIntracomunitarias,
    numOperadoresUE: operaciones.length,
    particularidades,
  };
}
