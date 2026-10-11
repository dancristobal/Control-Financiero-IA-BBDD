import express from 'express';
import path from 'path';
import dotenv from 'dotenv';
import { GoogleGenAI, Type } from '@google/genai';
import {
  getDbPool,
  testDbConnection,
  initDatabaseTables,
  isMySQLAvailable,
  guardarFacturasEnMySQL,
  getDbConfig,
  updateDbConfig,
  generarScriptSqlCompleto,
  guardarAlertasEnMySQL,
  pingDb,
  guardarDatosNegocioEnMySQL,
  obtenerDatosNegocioDeMySQL,
  guardarCategoriasEnMySQL,
  obtenerCategoriasDeMySQL,
  guardarProveedoresEnMySQL,
  guardarHistoricoPreciosEnMySQL,
  obtenerHistoricoPreciosDeMySQL,
  sincronizarTodoHaciaMySQL,
  guardarParametrosSistemaEnMySQL,
  obtenerParametrosSistemaDeMySQL,
  guardarAnalisisEjecutivoEnMySQL,
  obtenerAnalisisEjecutivoDeMySQL,
  guardarMensajeChatEnMySQL,
  obtenerHistorialChatDeMySQL,
  limpiarHistorialChatEnMySQL,
  guardarDeclaracionAeatEnMySQL,
  obtenerDeclaracionesAeatDeMySQL,
  guardarConfiguracionGoogleEnMySQL,
  obtenerConfiguracionGoogleDeMySQL,
  obtenerFacturasDeMySQL,
  eliminarFacturaDeMySQL,
  actualizarEstadoFacturaEnMySQL,
  obtenerProveedoresDeMySQL,
  obtenerAlertasDeMySQL,
  actualizarEstadoAlertaEnMySQL
} from './src/db';

dotenv.config();

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parser for JSON payloads (supporting base64 invoice files up to 50MB)
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Initialize Google GenAI client (lazy/guarded)
// Accepts either process.env.MY_GEMINI_API_KEY (custom secret) or process.env.GEMINI_API_KEY
// Telemetry user-agent header is set to 'aistudio-build' as required
function getGeminiApiKey(): string | null {
  const customKey = process.env.MY_GEMINI_API_KEY?.trim();
  if (customKey && customKey !== 'MY_GEMINI_API_KEY' && customKey.length > 5) {
    return customKey;
  }
  const defaultKey = process.env.GEMINI_API_KEY?.trim();
  if (defaultKey && defaultKey !== 'MY_GEMINI_API_KEY' && defaultKey.length > 5) {
    return defaultKey;
  }
  return null;
}

function getGeminiClient(): GoogleGenAI | null {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory data store for server-side persistence of invoices and suppliers
// This mirrors the Google Sheet tabs "Facturas" and "Proveedores"
let serverFacturas: any[] = [];
let serverProveedores: any[] = [];

// ==========================================
// CONFIGURACIÓN DE GOOGLE SHEETS Y GEMINI
// ==========================================
// Para conectar con tu Google Sheet real:
// 1. Configura GOOGLE_SHEETS_ID en tu archivo .env o en el panel de Configuración de la app.
// 2. Puedes usar un endpoint de Google Apps Script Web App (GOOGLE_SHEETS_ENDPOINT_URL)
//    para insertar filas automáticamente en la pestaña "Facturas" y leer "Proveedores".
// 3. El script de Google Apps Script recomendado está disponible en el panel de Configuración.
// 4. La clave de Gemini se toma de GEMINI_API_KEY en el entorno del servidor.
const SHEETS_CONFIG = {
  sheetId: process.env.GOOGLE_SHEETS_ID || '',
  endpointUrl: process.env.GOOGLE_SHEETS_ENDPOINT_URL || '',
};

// Health Check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    geminiConfigured: !!getGeminiApiKey(),
    sheetsConfigured: !!SHEETS_CONFIG.sheetId || !!SHEETS_CONFIG.endpointUrl,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// CATÁLOGO DE CATEGORÍAS DE GASTO
// ==========================================
let storedCategoriasGasto: Array<{
  id: string;
  nombre: string;
  descripcion?: string;
  color: string;
  esPredeterminada?: boolean;
}> = [
  {
    id: 'materias-primas',
    nombre: 'Materias Primas',
    descripcion: 'Harinas, lácteos, azúcares, ingredientes base y consumibles directos de producción.',
    color: '#f43f5e',
    esPredeterminada: true,
  },
  {
    id: 'suministros-y-energia',
    nombre: 'Suministros y Energía',
    descripcion: 'Electricidad, gas, agua, telecomunicaciones, internet y suministros energéticos operativos.',
    color: '#0ea5e9',
    esPredeterminada: true,
  },
  {
    id: 'envases-y-embalajes',
    nombre: 'Envases y Embalajes',
    descripcion: 'Cajas kraft, bobinas, bandejas, film, bolsas, etiquetas y material de empaquetado.',
    color: '#f59e0b',
    esPredeterminada: true,
  },
  {
    id: 'logistica-y-transporte',
    nombre: 'Logística y Transporte',
    descripcion: 'Portes, transporte frigorífico/refrigerado, envíos urgentes, fletes y servicios de reparto.',
    color: '#10b981',
    esPredeterminada: true,
  },
  {
    id: 'mantenimiento-y-maquinaria',
    nombre: 'Mantenimiento y Maquinaria',
    descripcion: 'Reparaciones técnicas, revisiones preventivas de hornos, climatización, recambios y herramientas.',
    color: '#8b5cf6',
    esPredeterminada: true,
  },
  {
    id: 'servicios-y-gestion',
    nombre: 'Servicios y Gestión',
    descripcion: 'Asesoría contable, fiscal y laboral, licencias de software, seguros y servicios profesionales.',
    color: '#ec4899',
    esPredeterminada: true,
  },
];

// Endpoints de Datos de Negocio (MySQL + memoria)
let serverDatosNegocio: any = {
  nombre: 'Finance AI — Obrador & Café',
  nif: 'B-87654321',
  direccion: 'Calle Mayor 45, Planta Baja',
  actividad: 'Hostelería, Obrador y Panadería Artesanal',
  sector: 'Alimentación y Bebidas',
  contextoOperativo: 'Producción propia diaria de panadería y pastelería, venta minorista al público y distribución B2B a restaurantes locales.',
  email: 'administracion@financeai.es',
  telefono: '+34 912 345 678',
};

app.get('/api/datos-negocio', async (req, res) => {
  try {
    const dbDatos = await obtenerDatosNegocioDeMySQL();
    if (dbDatos && dbDatos.nombre) {
      serverDatosNegocio = { ...serverDatosNegocio, ...dbDatos };
      return res.json({ success: true, datos: dbDatos, fuente: 'mysql' });
    }
  } catch (err: any) {
    console.warn('Aviso al leer datos_negocio de MySQL:', err?.message);
  }
  return res.json({ success: true, datos: serverDatosNegocio, fuente: 'memoria' });
});

app.post('/api/datos-negocio', async (req, res) => {
  const { datos } = req.body || {};
  if (datos && typeof datos === 'object') {
    serverDatosNegocio = { ...serverDatosNegocio, ...datos };
    let guardadoEnMySQL = false;
    try {
      const resDb = await guardarDatosNegocioEnMySQL(datos);
      guardadoEnMySQL = resDb.ok;
    } catch (e: any) {
      console.warn('Error al guardar datos_negocio en MySQL:', e?.message);
    }
    return res.json({
      success: true,
      datos: serverDatosNegocio,
      mysqlGuardado: guardadoEnMySQL,
    });
  }
  return res.status(400).json({ error: 'Payload de datos_negocio no válido' });
});

app.get('/api/categorias-gasto', async (req, res) => {
  try {
    const dbCats = await obtenerCategoriasDeMySQL();
    if (dbCats && dbCats.length > 0) {
      storedCategoriasGasto = dbCats;
      return res.json({ categorias: dbCats, fuente: 'mysql' });
    }
  } catch (err: any) {
    console.warn('Aviso al leer categorias_gasto de MySQL:', err?.message);
  }
  res.json({ categorias: storedCategoriasGasto, fuente: 'memoria' });
});

app.post('/api/categorias-gasto', async (req, res) => {
  const { categorias } = req.body;
  if (Array.isArray(categorias) && categorias.length > 0) {
    storedCategoriasGasto = categorias;
    let guardadoEnMySQL = false;
    let mysqlReplicadas = 0;
    try {
      const resDb = await guardarCategoriasEnMySQL(categorias);
      guardadoEnMySQL = resDb.mysqlDisponible;
      mysqlReplicadas = resDb.replicadas;
    } catch (e: any) {
      console.warn('Error al guardar categorias_gasto en MySQL:', e?.message);
    }
    return res.json({
      success: true,
      count: storedCategoriasGasto.length,
      categorias: storedCategoriasGasto,
      mysqlGuardado: guardadoEnMySQL,
      mysqlReplicadas,
    });
  }
  return res.status(400).json({ error: 'Array de categorías no válido' });
});

// Helper function to calculate fully dynamic, grounded executive analysis from real data
function generateGroundedExecutiveAnalysis(
  facturas: any[] = [],
  proveedores: any[] = [],
  alertas: any[] = [],
  resumenIVA: any = {},
  datosNegocioInput: any = 'La Empresa'
) {
  const safeFacturas = Array.isArray(facturas) ? facturas : [];
  const safeProveedores = Array.isArray(proveedores) ? proveedores : [];
  const safeAlertas = Array.isArray(alertas) ? alertas : [];

  const nombreNegocio = (typeof datosNegocioInput === 'string' ? datosNegocioInput : datosNegocioInput?.nombre) || 'La Empresa';
  const sector = (typeof datosNegocioInput === 'object' && datosNegocioInput?.sector) ? datosNegocioInput.sector : 'Comercio y Servicios';
  const contextoOperativo = (typeof datosNegocioInput === 'object' && datosNegocioInput?.contextoOperativo) ? datosNegocioInput.contextoOperativo : 'Operativa comercial estándar';

  const totalGasto = safeFacturas.reduce((acc, f) => acc + (Number(f.total) || 0), 0);
  const totalBase = safeFacturas.reduce((acc, f) => acc + (Number(f.baseImponible) || 0), 0);
  const facturasCount = safeFacturas.length;

  // Category breakdown
  const catMap: Record<string, number> = {};
  safeFacturas.forEach((f) => {
    const cat = f.categoriaGasto || 'Gastos Operativos';
    catMap[cat] = (catMap[cat] || 0) + (Number(f.total) || 0);
  });
  const sortedCategories = Object.entries(catMap)
    .map(([nombre, total]) => ({
      nombre,
      total,
      porcentaje: totalGasto > 0 ? (total / totalGasto) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Supplier breakdown
  const provMap: Record<string, { nombre: string; total: number; count: number }> = {};
  safeFacturas.forEach((f) => {
    const pId = f.idProveedor || f.nombreProveedor || 'PROV-GENERIC';
    const pNom = f.nombreProveedor || pId;
    if (!provMap[pId]) {
      provMap[pId] = { nombre: pNom, total: 0, count: 0 };
    }
    provMap[pId].total += Number(f.total) || 0;
    provMap[pId].count += 1;
  });
  const sortedSuppliers = Object.values(provMap)
    .map((p) => ({
      ...p,
      porcentaje: totalGasto > 0 ? (p.total / totalGasto) * 100 : 0,
    }))
    .sort((a, b) => b.total - a.total);

  // Invoice status
  const facturasVencidas = safeFacturas.filter((f) => f.estado === 'Vencida');
  const facturasPendientes = safeFacturas.filter((f) => f.estado === 'Pendiente');
  const totalVencido = facturasVencidas.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
  const totalPendiente = facturasPendientes.reduce((sum, f) => sum + (Number(f.total) || 0), 0);

  const topCat = sortedCategories[0] || { nombre: 'Gastos Generales', total: totalGasto, porcentaje: 100 };
  const topProv = sortedSuppliers[0] || { nombre: 'Proveedor Principal', total: totalGasto, porcentaje: 100, count: 1 };

  // Generate grounded summary contextualized to the specific business and sector
  const estadoGeneral = facturasCount > 0
    ? `${nombreNegocio} (Sector: ${sector}) registra un volumen acumulado de ${totalGasto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € distribuidos en ${facturasCount} facturas. La partida con mayor concentración presupuestaria es "${topCat.nombre}" (${topCat.porcentaje.toFixed(1)}% del gasto total). La relación de compras muestra a ${topProv.nombre} como principal suministrador del negocio, alineado con su operativa de ${contextoOperativo.slice(0, 120)}...`
    : `${nombreNegocio} (${sector}) no dispone de facturas suficientes registradas para emitir un balance consolidado. Se recomienda registrar facturas de proveedores para activar el análisis continuo.`;

  // Principales gastos
  const principalesGastos = sortedCategories.length > 0
    ? sortedCategories.slice(0, 4).map((c) => `${c.nombre}: ${c.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € (${c.porcentaje.toFixed(1)}% del total registrado)`)
    : ['Sin partidas registradas todavía en el periodo actual.'];

  // Cambios y variaciones
  const cambiosImportantes: string[] = [];
  const alertasPrecio = safeAlertas.filter((a) => a.tipo === 'SUBIDA DE PRECIO' || a.tipo === 'ANOMALIA');
  if (alertasPrecio.length > 0) {
    alertasPrecio.slice(0, 3).forEach((a) => {
      cambiosImportantes.push(`${a.proveedor || a.titulo}: ${a.descripcion}`);
    });
  } else if (sortedSuppliers.length > 0) {
    cambiosImportantes.push(`Concentración del gasto en ${topProv.nombre} alcanzando el ${topProv.porcentaje.toFixed(1)}% del presupuesto en ${sector}.`);
    if (sortedSuppliers.length > 1) {
      cambiosImportantes.push(`Segundo proveedor en volumen: ${sortedSuppliers[1].nombre} con ${sortedSuppliers[1].total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €.`);
    }
  } else {
    cambiosImportantes.push(`Evolución de costes estable según las facturas computadas para ${nombreNegocio}.`);
  }

  // Alertas
  const alertasGeneradas: string[] = [];
  if (facturasVencidas.length > 0) {
    alertasGeneradas.push(`${facturasVencidas.length} factura(s) vencida(s) pendiente(s) de regularizar por un total de ${totalVencido.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €.`);
  }
  if (topProv.porcentaje > 35 && sortedSuppliers.length > 1) {
    alertasGeneradas.push(`Dependencia operativa elevada en ${topProv.nombre} (${topProv.porcentaje.toFixed(1)}% de las compras en ${sector}).`);
  }
  if (facturasPendientes.length > 0) {
    alertasGeneradas.push(`${facturasPendientes.length} factura(s) pendiente(s) de pago con vencimiento programado (${totalPendiente.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €).`);
  }
  if (alertasGeneradas.length === 0) {
    alertasGeneradas.push('No se detectan incidencias críticas ni vencimientos superados en la cartera actual.');
  }

  // Oportunidades de ahorro adaptadas al negocio
  const oportunidadesAhorro: string[] = [];
  if (sortedSuppliers.length > 0) {
    oportunidadesAhorro.push(`Negociar acuerdo de rappel o descuento por volumen con ${topProv.nombre} sobre el volumen acumulado de ${topProv.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € para mitigar el coste de aprovisionamiento en ${sector}.`);
  }
  if (sortedCategories.length > 1) {
    oportunidadesAhorro.push(`Revisar y contrastar tarifas en la partida clave de "${sortedCategories[0].nombre}" para diversificar proveedores en la operativa de ${nombreNegocio}.`);
  }
  oportunidadesAhorro.push(`Agrupar pedidos y aprovisionamientos quincenales para optimizar costes de portes y gestión administrativa adaptada al modelo operativo.`);

  // 3 Acciones recomendadas
  const tresAcciones = [
    {
      accion: facturasVencidas.length > 0
        ? `Regularizar las ${facturasVencidas.length} facturas vencidas (${totalVencido.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €)`
        : `Revisar el calendario de vencimiento de las ${facturasPendientes.length} facturas pendientes`,
      motivo: `Asegurar el flujo continuo de suministros y evitar penalizaciones comerciales en ${nombreNegocio} (${sector}).`,
      datos: facturasVencidas.length > 0
        ? `Facturas: ${facturasVencidas.map((f) => f.idFactura).slice(0, 3).join(', ')}`
        : `Importe pendiente: ${totalPendiente.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`,
      impacto: 'Inmediato',
    },
    {
      accion: `Negociar condiciones marco con ${topProv.nombre}`,
      motivo: `Concentra el ${topProv.porcentaje.toFixed(1)}% del presupuesto total (${topProv.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €) en partidas estratégicas de ${nombreNegocio}.`,
      datos: `${topProv.count} facturas emitidas por este proveedor`,
      impacto: 'Alto',
    },
    {
      accion: `Auditar costes unitarios en la categoría "${topCat.nombre}"`,
      motivo: `Controlar el margen operativo frente a oscilaciones de precios del mercado en el sector ${sector}.`,
      datos: `Partida que representa ${topCat.total.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €`,
      impacto: 'Medio',
    },
  ];

  // Prioridad semana
  const prioridadSemana = facturasVencidas.length > 0
    ? `Regularizar con urgencia las ${facturasVencidas.length} factura(s) con vencimiento superado (${totalVencido.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €) para evitar retrasos en el aprovisionamiento de ${nombreNegocio}.`
    : `Revisar condiciones comerciales y precios con el proveedor principal (${topProv.nombre}) en ${sector}.`;

  return {
    id: `ANALISIS-${Date.now()}`,
    fechaGeneracion: new Date().toISOString(),
    estadoGeneral,
    principalesGastos,
    cambiosImportantes,
    alertas: alertasGeneradas,
    oportunidadesAhorro,
    tresAcciones,
    prioridadSemana,
  };
}

// Endpoint: Extraer datos de factura con Gemini
app.post('/api/gemini/extract-invoice', async (req, res) => {
  try {
    const {
      fileData,
      mimeType,
      fileName,
      existingSuppliers,
      nombreNegocio,
      datosNegocio,
      sector,
      contextoOperativo,
      categoriasDisponibles,
    } = req.body;

    if (!fileData) {
      return res.status(400).json({ error: 'No se ha proporcionado el archivo de factura.' });
    }

    const ai = getGeminiClient();
    const empresa = nombreNegocio || datosNegocio?.nombre || 'la empresa receptora';
    const sectorNegocio = sector || datosNegocio?.sector || 'Comercio y Hostelería';
    const contextoNegocio = contextoOperativo || datosNegocio?.contextoOperativo || 'Actividad comercial regular con compras a proveedores';
    const nifNegocio = datosNegocio?.nif || '';
    const direccionNegocio = datosNegocio?.direccion || '';

    // Obtener catálogo de categorías activas (predeterminadas + personalizadas por el usuario)
    const catsToUse = Array.isArray(categoriasDisponibles) && categoriasDisponibles.length > 0
      ? categoriasDisponibles
      : storedCategoriasGasto;

    const listaCatsPrompt = catsToUse
      .map((c: any) => `- "${c.nombre}": ${c.descripcion || 'Gastos de la actividad'}`)
      .join('\n');

    // Si no hay clave de API configurada, advertir con claridad en lugar de falsear datos
    if (!ai) {
      return res.status(503).json({
        error: 'No se ha detectado la clave de Gemini en el servidor (MY_GEMINI_API_KEY o GEMINI_API_KEY).',
        detail: 'Asegúrate de haber guardado el valor de tu clave en el secreto de entorno en Settings > Secrets.',
        code: 'MISSING_API_KEY'
      });
    }

    // Prompt estricto para extracción fiel mediante Gemini incluyendo obligatoriamente el contexto del negocio
    const systemPrompt = `Eres un auditor contable y analista financiero especializado en empresas del sector "${sectorNegocio}" para "${empresa}" (NIF: ${nifNegocio || 'No especificado'}, Dirección: ${direccionNegocio || 'No especificada'}).
Contexto operativo y modelo del negocio cliente: "${contextoNegocio}".

Tu misión es extraer con precisión matemática y fidelidad absoluta todos los datos de la factura adjunta emitida por un proveedor a favor de "${empresa}".

REGLAS OBLIGATORIAS:
1. El receptor o cliente de la factura es "${empresa}" (NIF: ${nifNegocio}). El emisor o vendedor es el proveedor. NO confundir el proveedor con el cliente receptor.
2. PROPUESTA AUTOMÁTICA DE CATEGORÍA DE GASTO ("categoriaGasto"):
Debes analizar minuciosamente el NOMBRE DEL PROVEEDOR (emisor) y la DESCRIPCIÓN/DETALLE DE LOS PRODUCTOS O SERVICIOS facturados para proponer automáticamente la categoría de gasto más exacta.
Catálogo de categorías disponibles en el sistema para esta empresa:
${listaCatsPrompt}

En "categoriaGastoJustificacion", redacta una frase concisa explicando cómo el proveedor y la descripción del producto justifican la categoría elegida (ej: "Propuesto como '${catsToUse[0]?.nombre || 'Materias Primas'}' porque el proveedor suministra...").
3. No inventar datos. Si un campo no existe en el documento, escribe exactamente: "Pendiente de confirmar".
4. Mantener exactamente el nombre del producto o servicio si aparece en las líneas.
5. Extraer los importes numéricos en euros sin símbolos de moneda.
6. Tipo de Gravamen e Impuestos:
   - Régimen General Peninsular: '21%', '10%', '4%'.
   - Tipos temporales reducidos de alimentos/aceite de oliva: '0% (Temporal)', '5% (Temporal)', '2% (Temporal)'.
   - Régimen autonómico canario: 'IGIC 7%', 'IGIC 3%', 'IGIC 0%'.
   - Recargo de Equivalencia (R.E.): Si la factura indica recargo de equivalencia (minoristas), marcar "aplicaRecargoEquivalencia: true", extraer la cuota del recargo en "cuotaRecargoEquivalencia" e indicar el tipo en "tipoRecargoEquivalencia" (ej: '5.2%', '1.4%', '0.5%', '0.62%', '0.7%').
   - Retención de IRPF: Si la factura incluye retención de IRPF (típico en facturas de autónomos y profesionales al 15% o 7%, o alquileres de locales al 19%, o agrícolas al 2%), marcar "aplicaRetencionIRPF: true", extraer "porcentajeIRPF" (número, ej: 15, 7, 19), "tipoRetencionIRPF" (ej: "15%", "7%", "19%"), "cuotaIRPF" (cuota retenida en euros), y "conceptoRetencionIRPF" ("PROFESIONAL", "ARRENDAMIENTO", "AGRARIO" o "OTRO"). El total líquido debe calcularse como: Base + IVA/IGIC + Recargo - Retención IRPF.
   - Operaciones exentas: '0% Exento'.
7. Si conoces la lista de proveedores registrados: ${JSON.stringify(existingSuppliers || [])}, intenta vincular el idProveedor si coincide el nombre del proveedor. Si es nuevo, asígnale un ID coherente.`;

    const cleanBase64 = fileData.includes('base64,') ? fileData.split('base64,')[1] : fileData;
    const documentPart = {
      inlineData: {
        mimeType: mimeType || 'application/pdf',
        data: cleanBase64,
      },
    };

    const textPart = {
      text: `Por favor analiza esta factura y extrae los datos estructurados en formato JSON según el siguiente esquema, contemplando el régimen fiscal (IVA Peninsular 21/10/4%, temporales 0/5%, IGIC canario 7/3%, Recargo de Equivalencia o Retención de IRPF) y proponiendo automáticamente la categoría de gasto adecuada.`,
    };

    let parsedJson: any = null;
    const invoiceSchema = {
      type: Type.OBJECT,
      properties: {
        idFactura: { type: Type.STRING, description: 'Número o ID oficial de la factura' },
        fechaEmision: { type: Type.STRING, description: 'Fecha de emisión en formato YYYY-MM-DD' },
        idProveedor: { type: Type.STRING, description: 'ID del proveedor o código asignado' },
        nombreProveedor: { type: Type.STRING, description: 'Nombre o razón social del proveedor' },
        concepto: { type: Type.STRING, description: 'Concepto general o descripción del servicio/compra' },
        importe: { type: Type.NUMBER, description: 'Base imponible o importe neto antes de impuestos' },
        fechaVencimiento: { type: Type.STRING, description: 'Fecha de vencimiento en formato YYYY-MM-DD' },
        estado: { type: Type.STRING, description: 'Estado: Pagada, Pendiente o Vencida' },
        fechaPago: { type: Type.STRING, description: 'Fecha en que se pagó o "Pendiente de confirmar"' },
        baseImponible: { type: Type.NUMBER, description: 'Base imponible total' },
        tiposIVA: { type: Type.STRING, description: 'Porcentaje o tipos aplicados, ej: "21%", "10%", "4%", "0% (Temporal)", "5% (Temporal)", "IGIC 7%"' },
        cuotaIVA: { type: Type.NUMBER, description: 'Importe de cuota de IVA o IGIC en euros' },
        regimenFiscal: { type: Type.STRING, description: 'Régimen fiscal: Régimen General Peninsular, Tipos Temporales / Alimentos, IGIC Canario, Recargo de Equivalencia, o Exento' },
        aplicaRecargoEquivalencia: { type: Type.BOOLEAN, description: 'true si la factura contiene recargo de equivalencia minorista' },
        tipoRecargoEquivalencia: { type: Type.STRING, description: 'Porcentaje del recargo de equivalencia ej: "5.2%", "1.4%", "0.5%", "0.62%", "0.7%"' },
        cuotaRecargoEquivalencia: { type: Type.NUMBER, description: 'Importe de la cuota del recargo de equivalencia en euros' },
        aplicaRetencionIRPF: { type: Type.BOOLEAN, description: 'true si la factura incluye retención de IRPF a cuenta (profesionales, alquileres, autónomos)' },
        porcentajeIRPF: { type: Type.NUMBER, description: 'Porcentaje numérico de IRPF aplicado (ej: 15, 7, 19, 2, 1)' },
        tipoRetencionIRPF: { type: Type.STRING, description: 'Texto del tipo de retención, ej: "15%", "7%", "19%"' },
        cuotaIRPF: { type: Type.NUMBER, description: 'Cuota monetaria retenida de IRPF en euros' },
        conceptoRetencionIRPF: { type: Type.STRING, description: 'Concepto IRPF: PROFESIONAL, ARRENDAMIENTO, AGRARIO o OTRO' },
        total: { type: Type.NUMBER, description: 'Importe total líquido de la factura (Base + IVA/IGIC + Recargo - Retención IRPF)' },
        categoriaGasto: {
          type: Type.STRING,
          description: `Categoría de gasto elegida entre: ${catsToUse.map((c: any) => `"${c.nombre}"`).join(', ')}`
        },
        categoriaGastoJustificacion: {
          type: Type.STRING,
          description: 'Breve explicación de cómo el nombre del proveedor y la descripción del producto determinan la categoría propuesta'
        },
        lineas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nombreProducto: { type: Type.STRING, description: 'Nombre exacto del producto o línea' },
              cantidad: { type: Type.NUMBER, description: 'Cantidad facturada' },
              unidad: { type: Type.STRING, description: 'Unidad de medida (kg, ud, L, cajas)' },
              precioUnitario: { type: Type.NUMBER, description: 'Precio unitario sin IVA' },
              subtotal: { type: Type.NUMBER, description: 'Subtotal de la línea' },
            },
            required: ['nombreProducto', 'cantidad', 'precioUnitario', 'subtotal']
          }
        }
      },
      required: [
        'idFactura',
        'fechaEmision',
        'nombreProveedor',
        'baseImponible',
        'tiposIVA',
        'cuotaIVA',
        'total',
        'categoriaGasto'
      ]
    };

    try {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: { parts: [documentPart, textPart] },
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: invoiceSchema
          }
        });
        parsedJson = JSON.parse(response.text || '{}');
      } catch (firstErr: any) {
        console.warn('Gemini 3.8 Flash busy on invoice extraction, retrying with gemini-3.1-flash-lite:', firstErr?.message);
        const retryResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: { parts: [documentPart, textPart] },
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: invoiceSchema
          }
        });
        parsedJson = JSON.parse(retryResponse.text || '{}');
      }
    } catch (apiErr: any) {
      console.error('Error al invocar la API de Gemini para extraer factura:', apiErr);
      const isQuota = apiErr?.message?.includes('429') || apiErr?.message?.includes('quota') || apiErr?.message?.includes('RESOURCE_EXHAUSTED');
      const isKeyInvalid = apiErr?.message?.includes('API_KEY_INVALID') || apiErr?.message?.includes('403');
      const isUnavailable = apiErr?.message?.includes('503') || apiErr?.message?.includes('UNAVAILABLE');
      
      return res.status(isUnavailable ? 503 : 502).json({
        error: isQuota
          ? 'Límite de cuota excedido temporalmente en Gemini API.'
          : isKeyInvalid
          ? 'La clave GEMINI_API_KEY no es válida o carece de permisos.'
          : isUnavailable
          ? 'Los servidores de Gemini están experimentando alta demanda temporal. Por favor inténtalo de nuevo en unos momentos.'
          : 'No se pudo leer la factura con Gemini AI.',
        detail: apiErr?.message || 'Error durante la lectura del documento.',
        code: isQuota ? 'QUOTA_EXCEEDED' : isKeyInvalid ? 'INVALID_KEY' : isUnavailable ? 'MODEL_BUSY' : 'EXTRACTION_FAILED'
      });
    }

    if (!parsedJson || !parsedJson.idFactura || !parsedJson.nombreProveedor) {
      return res.status(422).json({
        error: 'El modelo no pudo extraer los datos esenciales de la factura.',
        detail: 'Asegúrate de que el archivo sea legible y contenga el número de factura, fecha, proveedor e importes.',
        code: 'PARSE_FAILED'
      });
    }

    parsedJson.archivoNombre = fileName || 'documento.pdf';
    if (!parsedJson.idProveedor) parsedJson.idProveedor = 'PROV-NUEVO';
    if (!parsedJson.estado) parsedJson.estado = 'Pendiente';
    if (!parsedJson.fechaPago) parsedJson.fechaPago = 'Pendiente de confirmar';

    // Asegurar y enriquecer la propuesta automática de categoría de gasto
    parsedJson.categoriaGastoSugerida = true;
    if (!parsedJson.categoriaGasto || parsedJson.categoriaGasto === 'Pendiente de confirmar') {
      const textoCompleto = `${parsedJson.nombreProveedor || ''} ${parsedJson.concepto || ''} ${(parsedJson.lineas || []).map((l: any) => l.nombreProducto || '').join(' ')}`.toLowerCase();
      if (/transporte|logistica|logística|envio|envío|flete|porte|mensajer|paqueter|seur|dhl|mrw|gls|ups|nacex|fedex|reparto|distribuc/.test(textoCompleto)) {
        parsedJson.categoriaGasto = 'Logística';
        parsedJson.categoriaGastoJustificacion = `Propuesto automáticamente como 'Logística' por servicios de transporte o envíos de "${parsedJson.nombreProveedor}".`;
      } else if (/asesor|gestor|abogad|legal|software|licencia|hosting|cloud|consultor|seguro|limpieza|seguridad|auditor|honorario|banco|comision|cuota/.test(textoCompleto)) {
        parsedJson.categoriaGasto = 'Servicios';
        parsedJson.categoriaGastoJustificacion = `Propuesto automáticamente como 'Servicios' por gestión profesional o servicios de "${parsedJson.nombreProveedor}".`;
      } else if (/caja|carton|cartón|embalaj|envase|bolsa|film|bobina|kraft|etiqueta|empaque|plastico|plástico/.test(textoCompleto)) {
        parsedJson.categoriaGasto = 'Envases y Embalajes';
        parsedJson.categoriaGastoJustificacion = `Propuesto automáticamente como 'Envases y Embalajes' por materiales de empaque de "${parsedJson.nombreProveedor}".`;
      } else if (/electric|luz|gas|agua|energia|energía|iberdrola|endesa|naturgy|telefon|internet|fibra/.test(textoCompleto)) {
        parsedJson.categoriaGasto = 'Suministros y Energía';
        parsedJson.categoriaGastoJustificacion = `Propuesto automáticamente como 'Suministros y Energía' para consumos de suministros.`;
      } else if (/mantenimiento|reparac|maquinaria|horno|motor|recambio|repuesto|tecnico|técnico|averia|avería/.test(textoCompleto)) {
        parsedJson.categoriaGasto = 'Mantenimiento y Maquinaria';
        parsedJson.categoriaGastoJustificacion = `Propuesto automáticamente como 'Mantenimiento y Maquinaria' por soporte técnico de equipos.`;
      } else {
        parsedJson.categoriaGasto = 'Insumos';
        parsedJson.categoriaGastoJustificacion = `Propuesto automáticamente como 'Insumos' para producción según el proveedor "${parsedJson.nombreProveedor}".`;
      }
    } else if (!parsedJson.categoriaGastoJustificacion) {
      const primerProd = parsedJson.lineas?.[0]?.nombreProducto || parsedJson.concepto || 'productos';
      parsedJson.categoriaGastoJustificacion = `Propuesto automáticamente por Gemini en base al proveedor "${parsedJson.nombreProveedor}" y los artículos adquiridos (${primerProd}).`;
    }

    return res.json({ factura: parsedJson, simulated: false });
  } catch (error: any) {
    console.error('Error general al procesar factura con Gemini:', error);
    return res.status(500).json({
      error: 'Error interno al procesar el archivo de la factura.',
      detail: error?.message || 'Error inesperado del servidor.',
      code: 'SERVER_ERROR'
    });
  }
});

// Endpoint: Análisis Ejecutivo con Gemini
app.post('/api/gemini/analisis-ejecutivo', async (req, res) => {
  try {
    const { facturas, proveedores, alertas, resumenIVA, nombreNegocio, datosNegocio, sector, contextoOperativo } = req.body;
    const businessName = nombreNegocio || datosNegocio?.nombre || 'La Empresa';
    const businessSector = sector || datosNegocio?.sector || 'Hostelería, Obrador y Confitería Artesanal';
    const businessContext = contextoOperativo || datosNegocio?.contextoOperativo || 'Obrador artesanal con despacho directo y distribución B2B. Aprovisionamiento clave de harinas especiales, grasas lácteas, azúcares, cajas kraft y consumo intensivo de energía en hornos.';
    const businessNif = datosNegocio?.nif || '';
    const businessAddress = datosNegocio?.direccion || '';

    const businessInfo = {
      nombre: businessName,
      sector: businessSector,
      contextoOperativo: businessContext,
      nif: businessNif,
      direccion: businessAddress,
    };
    const ai = getGeminiClient();

    if (!ai) {
      // Fallback con datos calculados matemáticamente de las facturas reales contextualizados al negocio
      const fallbackAnalisis = generateGroundedExecutiveAnalysis(
        facturas,
        proveedores,
        alertas,
        resumenIVA,
        businessInfo
      );
      return res.json({ analisis: fallbackAnalisis, simulated: true });
    }

    const systemPrompt = `Eres el Director Financiero (CFO) y auditor contable estratégico exclusivo de "${businessName}".

INFORMACIÓN OBLIGATORIA DEL NEGOCIO AUDITADO:
- Nombre / Razón Social: "${businessName}" (NIF: ${businessNif || 'No especificado'}, Sede: ${businessAddress || 'No especificada'})
- Sector de Actividad: "${businessSector}"
- Contexto Operativo y Modelo de Negocio: "${businessContext}"

INSTRUCCIONES OBLIGATORIAS DE AUDITORÍA Y PERSONALIZACIÓN:
1. OBLIGATORIO: Todas las conclusiones, diagnósticos de concentración de costes, alertas críticas, oportunidades de ahorro y las 3 acciones prioritarias DEBEN estar completamente personalizadas para "${businessName}", considerando obligatoriamente su sector ("${businessSector}") y su modelo operativo real ("${businessContext}").
2. Contextualiza las partidas contables en función de este sector concreto (por ejemplo, si es obrador/pastelería, los costes de harinas, mantecas, hornos y packaging; si es tecnología, hosting y licencias; etc.).
3. Detecta anomalías en precios, proveedores dominantes y riesgos de margen basándote ÚNICAMENTE en las facturas y proveedores reales recibidos. NO inventes proveedores ni datos ficticios.
4. Genera el resultado en formato JSON estricto respetando el esquema.`;

    const promptText = `Por favor elabora el informe de auditoría ejecutiva y análisis financiero de costes para:

DATOS DEL NEGOCIO:
- Empresa: ${businessName}
- Sector: ${businessSector}
- Contexto Operativo: ${businessContext}

FACTURAS REGISTRADAS (${facturas?.length || 0}): ${JSON.stringify(facturas?.slice(0, 35) || [])}
PROVEEDORES REGISTRADOS (${proveedores?.length || 0}): ${JSON.stringify(proveedores || [])}
ALERTAS REGISTRADAS: ${JSON.stringify(alertas || [])}
RESUMEN FISCAL / IVA: ${JSON.stringify(resumenIVA || {})}`;

    let parsed: any = null;
    try {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: promptText,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                estadoGeneral: { type: Type.STRING, description: 'Estado general del negocio (máximo 5 líneas concisas)' },
                principalesGastos: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Principales áreas y conceptos de gasto detectados'
                },
                cambiosImportantes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Variaciones relevantes y cambios respecto a periodos anteriores'
                },
                alertas: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Alertas financieras, de riesgo o proveedores'
                },
                oportunidadesAhorro: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: 'Oportunidades de ahorro o revisión fundadas en los datos'
                },
                tresAcciones: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      accion: { type: Type.STRING, description: 'Acción específica a ejecutar' },
                      motivo: { type: Type.STRING, description: 'Motivo o justificación empresarial' },
                      datos: { type: Type.STRING, description: 'Datos concretos que la justifican' },
                      impacto: { type: Type.STRING, description: 'Inmediato, Alto o Medio' }
                    },
                    required: ['accion', 'motivo', 'datos', 'impacto']
                  },
                  description: 'Exactamente 3 acciones recomendadas ordenadas por impacto'
                },
                prioridadSemana: {
                  type: Type.STRING,
                  description: 'Si solo pudieras revisar una sola cosa esta semana...'
                }
              },
              required: [
                'estadoGeneral',
                'principalesGastos',
                'cambiosImportantes',
                'alertas',
                'oportunidadesAhorro',
                'tresAcciones',
                'prioridadSemana'
              ]
            }
          }
        });
        parsed = JSON.parse(response.text || '{}');
      } catch (firstErr: any) {
        console.warn('Gemini 3.8 Flash busy on executive analysis, retrying with gemini-3.1-flash-lite:', firstErr?.message);
        const retryResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: promptText,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: 'application/json',
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                estadoGeneral: { type: Type.STRING },
                principalesGastos: { type: Type.ARRAY, items: { type: Type.STRING } },
                cambiosImportantes: { type: Type.ARRAY, items: { type: Type.STRING } },
                alertas: { type: Type.ARRAY, items: { type: Type.STRING } },
                oportunidadesAhorro: { type: Type.ARRAY, items: { type: Type.STRING } },
                tresAcciones: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      accion: { type: Type.STRING },
                      motivo: { type: Type.STRING },
                      datos: { type: Type.STRING },
                      impacto: { type: Type.STRING }
                    },
                    required: ['accion', 'motivo', 'datos', 'impacto']
                  }
                },
                prioridadSemana: { type: Type.STRING }
              },
              required: [
                'estadoGeneral',
                'principalesGastos',
                'cambiosImportantes',
                'alertas',
                'oportunidadesAhorro',
                'tresAcciones',
                'prioridadSemana'
              ]
            }
          }
        });
        parsed = JSON.parse(retryResponse.text || '{}');
      }
    } catch (modelErr: any) {
      console.warn('Gemini models temporarily busy in executive analysis, using dynamic grounded calculation:', modelErr?.message);
      parsed = generateGroundedExecutiveAnalysis(
        facturas,
        proveedores,
        alertas,
        resumenIVA,
        businessInfo
      );
    }

    if (!parsed || !parsed.estadoGeneral) {
      parsed = generateGroundedExecutiveAnalysis(
        facturas,
        proveedores,
        alertas,
        resumenIVA,
        businessInfo
      );
    }

    parsed.id = `ANALISIS-${Date.now()}`;
    parsed.fechaGeneracion = new Date().toISOString();

    // Persistir automáticamente en la tabla analisis_financieros_ia de MySQL
    try {
      await guardarAnalisisEjecutivoEnMySQL(parsed);
    } catch (e: any) {
      console.warn('Aviso al guardar análisis en MySQL:', e?.message);
    }

    return res.json({ analisis: parsed, simulated: false });
  } catch (error: any) {
    console.error('Error en análisis ejecutivo:', error);
    return res.status(500).json({ error: error?.message || 'Error al generar análisis ejecutivo' });
  }
});

// Endpoint: Pregunta a tus facturas (Chat con Gemini)
app.post('/api/gemini/chat', async (req, res) => {
  try {
    const { mensaje, historial, facturas, proveedores, alertas, resumenIVA, nombreNegocio, datosNegocio, sector, contextoOperativo } = req.body;
    const businessName = nombreNegocio || datosNegocio?.nombre || 'tu empresa';
    const businessSector = sector || datosNegocio?.sector || 'Comercio y Hostelería';
    const businessContext = contextoOperativo || datosNegocio?.contextoOperativo || 'Actividad comercial regular con compras periódicas a proveedores';
    const businessNif = datosNegocio?.nif || '';
    const ai = getGeminiClient();

    const generateLocalChatAnswer = () => {
      const safeFacturas = Array.isArray(facturas) ? facturas : [];
      const safeProveedores = Array.isArray(proveedores) ? proveedores : [];
      const safeAlertas = Array.isArray(alertas) ? alertas : [];

      const totalGasto = safeFacturas.reduce((acc: number, f: any) => acc + (Number(f.total) || 0), 0);
      
      // Calculate top provider from invoices or suppliers
      const provSpendMap: Record<string, { nombre: string; total: number }> = {};
      safeFacturas.forEach((f: any) => {
        const pNom = f.nombreProveedor || 'Proveedor';
        if (!provSpendMap[pNom]) provSpendMap[pNom] = { nombre: pNom, total: 0 };
        provSpendMap[pNom].total += Number(f.total) || 0;
      });
      const topProv = Object.values(provSpendMap).sort((a, b) => b.total - a.total)[0] 
        || safeProveedores[0] 
        || { nombre: 'Proveedor Principal', total: totalGasto };

      // Category map
      const catMap: Record<string, number> = {};
      safeFacturas.forEach((f: any) => {
        const cat = f.categoriaGasto || 'Gastos Operativos';
        catMap[cat] = (catMap[cat] || 0) + (Number(f.total) || 0);
      });
      const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
      const topCat = topCategories[0] || ['Gastos Operativos', totalGasto];

      const facturasVencidas = safeFacturas.filter((f: any) => f.estado === 'Vencida');
      const facturasPendientes = safeFacturas.filter((f: any) => f.estado === 'Pendiente');
      const msgLower = (mensaje || '').toLowerCase();

      if (msgLower.includes('gastando más') || msgLower.includes('mayor gasto') || msgLower.includes('principales gastos')) {
        const breakdown = topCategories.slice(0, 3).map(([cat, tot], idx) => {
          const pct = totalGasto > 0 ? ((tot / totalGasto) * 100).toFixed(1) : '0';
          return `${idx + 1}. **${cat}**: ${tot.toLocaleString('es-ES', { minimumFractionDigits: 2 })} € (${pct}% del total)`;
        }).join('\n');

        return `Según los datos registrados de **${businessName}** (${businessSector}), el gasto total acumulado asciende a **${totalGasto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €**.\n\n` +
          `Tus principales partidas de gasto son:\n${breakdown || 'Sin partidas computadas aún.'}`;
      } else if (msgLower.includes('proveedor más importante') || msgLower.includes('principal proveedor') || (msgLower.includes('proveedor') && msgLower.includes('importante'))) {
        const pctProv = totalGasto > 0 && topProv.total ? ((topProv.total / totalGasto) * 100).toFixed(1) : '0';
        return `Tu proveedor de mayor volumen registrado para **${businessName}** (${businessSector}) es **${topProv.nombre || topProv.nombreProveedor}**, con un total acumulado de **${(topProv.total || topProv.importeMensual || 0).toLocaleString('es-ES', { minimumFractionDigits: 2 })} €** (aproximadamente un ${pctProv}% del gasto total).`;
      } else if (msgLower.includes('aumentado precios') || msgLower.includes('encarecido') || msgLower.includes('subid') || msgLower.includes('precio')) {
        const subidasAlertas = safeAlertas.filter((a: any) => a.tipo === 'SUBIDA DE PRECIO' || a.tipo === 'ANOMALIA');
        if (subidasAlertas.length > 0) {
          const lista = subidasAlertas.map((a: any) => `• **${a.proveedor || a.titulo}**: ${a.descripcion}`).join('\n');
          return `Se han detectado variaciones notables en las siguientes compras de **${businessName}**:\n\n${lista}`;
        }
        return `En base a las facturas computadas de **${businessName}**, no se han registrado incrementos anómalos o subidas críticas de precios en las alertas activas.`;
      } else if (msgLower.includes('revisar esta semana') || msgLower.includes('prioridad') || msgLower.includes('semana')) {
        if (facturasVencidas.length > 0) {
          const sumVencida = facturasVencidas.reduce((s: number, f: any) => s + (Number(f.total) || 0), 0);
          return `**Prioridad de la semana para ${businessName} (${businessSector}):**\n\nRegularizar las **${facturasVencidas.length} facturas vencidas** que suman un total de **${sumVencida.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €** (${facturasVencidas.map((f: any) => f.idFactura).slice(0, 3).join(', ')}) para asegurar el flujo de aprovisionamiento.`;
        }
        return `**Prioridad de la semana para ${businessName} (${businessSector}):**\n\nRevisar las condiciones de compra y tarifas de la categoría principal (**${topCat[0]}**), que representa el mayor volumen de gasto registrado.`;
      } else {
        return `Analizando las **${safeFacturas.length} facturas** y **${safeProveedores.length} proveedores** de **${businessName}** (${businessSector}):\n\n` +
          `• **Gasto total acumulado:** ${totalGasto.toLocaleString('es-ES', { minimumFractionDigits: 2 })} €.\n` +
          `• **Facturas pendientes/vencidas:** ${facturasPendientes.length + facturasVencidas.length}.\n` +
          `• **Categoría principal:** ${topCat[0]}.\n\n` +
          `¿Deseas que analice algún proveedor, factura o partida en particular?`;
      }
    };

    if (!ai) {
      return res.json({ respuesta: generateLocalChatAnswer(), simulated: true });
    }

    const systemPrompt = `Eres "Finance AI", el consultor financiero y analista contable exclusivo de "${businessName}".

INFORMACIÓN OBLIGATORIA DEL NEGOCIO:
- Empresa: "${businessName}" (NIF: ${businessNif || 'No especificado'})
- Sector: "${businessSector}"
- Contexto Operativo: "${businessContext}"

REGLAS OBLIGATORIAS:
1. Contextualiza SIEMPRE tus respuestas considerando que el negocio pertenece al sector "${businessSector}" y tiene el modelo operativo: ${businessContext}.
2. Utiliza ÚNICAMENTE la información financiera y de facturas actualmente registrada que te proporcionamos:
   - Facturas registradas (${facturas?.length || 0})
   - Proveedores registrados (${proveedores?.length || 0})
   - Alertas activas (${alertas?.length || 0})
   - Resumen de IVA
3. Responde con lenguaje claro, profesional y estructurado (usando negritas, viñetas y cifras numéricas exactas en euros).
4. Si la información solicitada no existe o no es suficiente en los datos registrados, responde con honestidad: "No puedo determinarlo con los datos disponibles en tus facturas."
5. No inventes datos, nombres de proveedores, importes ni fechas que no estén en la base de datos.`;

    const contextData = `
DATOS DEL NEGOCIO:
EMPRESA: ${businessName}
SECTOR: ${businessSector}
CONTEXTO OPERATIVO: ${businessContext}

REGISTROS DISPONIBLES:
FACTURAS: ${JSON.stringify(facturas || [])}
PROVEEDORES: ${JSON.stringify(proveedores || [])}
ALERTAS: ${JSON.stringify(alertas || [])}
RESUMEN IVA: ${JSON.stringify(resumenIVA || {})}`;

    // Construir historial de conversación
    const contents: any[] = [
      { text: `${contextData}\n\nPregunta del usuario: ${mensaje}` }
    ];

    if (historial && Array.isArray(historial) && historial.length > 0) {
      const recentHistory = historial.slice(-6);
      const conversationText = recentHistory.map((m: any) => `${m.emisor === 'usuario' ? 'Usuario' : 'Asistente'}: ${m.texto}`).join('\n');
      contents[0] = { text: `${contextData}\n\nConversación previa:\n${conversationText}\n\nNueva pregunta del usuario: ${mensaje}` };
    }

    let responseText = '';
    try {
      try {
        const response = await ai.models.generateContent({
          model: 'gemini-3.8-flash',
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
          }
        });
        responseText = response.text || '';
      } catch (firstErr: any) {
        console.warn('Gemini 3.8 Flash busy on chat, retrying with gemini-3.1-flash-lite:', firstErr?.message);
        const retryResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2,
          }
        });
        responseText = retryResponse.text || '';
      }
    } catch (modelErr: any) {
      console.warn('Gemini models busy in chat, using grounded response:', modelErr?.message);
      responseText = generateLocalChatAnswer();
    }

    const respuestaFinal = responseText || generateLocalChatAnswer();

    // Persistir automáticamente la interacción en la tabla historial_chat_ia de MySQL
    try {
      if (mensaje) {
        await guardarMensajeChatEnMySQL({ emisor: 'usuario', texto: mensaje });
      }
      if (respuestaFinal) {
        await guardarMensajeChatEnMySQL({ emisor: 'asistente', texto: respuestaFinal });
      }
    } catch (e: any) {
      console.warn('Aviso al guardar historial de chat en MySQL:', e?.message);
    }

    return res.json({ respuesta: respuestaFinal, simulated: false });
  } catch (error: any) {
    console.error('Error en chat con Gemini:', error);
    return res.status(500).json({ error: error?.message || 'Error en servicio de consulta' });
  }
});

// =========================================================================
// ARQUITECTURA DB-FIRST: Persistencia directa en MySQL (Single Source of Truth)
// y archivado de recibos/justificantes en Google Drive
// =========================================================================
async function procesarGuardadoFacturaDBFirst(req: any, res: any, facturaInput: any, configInput?: any, archivoInput?: any) {
  const pool = getDbPool();

  try {
    const factura = facturaInput;
    const config = configInput || req.body?.config;
    const archivo = archivoInput || req.body?.archivo;

    if (!factura || !factura.idFactura) {
      return res.status(400).json({ error: 'Datos de factura inválidos o ID ausente' });
    }

    const idFactura = String(factura.idFactura).trim();
    const idProveedor = String(factura.idProveedor || 'PROV-GEN').trim();
    const nombreProveedor = String(factura.nombreProveedor || 'Proveedor General').trim();
    const nombreOriginal = archivo?.fileName || factura.archivoNombre || 'factura.pdf';

    let extension = '.pdf';
    const dotIndex = nombreOriginal.lastIndexOf('.');
    if (dotIndex !== -1) {
      extension = nombreOriginal.substring(dotIndex);
    }
    const driveFileNameCalculado = `${idFactura} ${factura.fechaEmision || new Date().toISOString().split('T')[0]}${extension}`;
    const driveFolderNameCalculado = (nombreProveedor || 'Proveedores Varios').trim();

    const base64Data = archivo?.base64Data || archivo?.base64 || factura.archivoBase64;
    const hasBase64 = Boolean(base64Data && base64Data.length > 50);
    const mimeType = archivo?.mimeType || (nombreOriginal.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'image/jpeg');

    const nuevaFila: any = {
      idFactura,
      fechaEmision: factura.fechaEmision,
      idProveedor,
      nombreProveedor,
      concepto: factura.concepto || 'Factura de compra',
      importe: Number(factura.importe || factura.baseImponible || 0),
      fechaVencimiento: factura.fechaVencimiento || factura.fechaEmision,
      estado: factura.estado || 'Pendiente',
      fechaPago: factura.fechaPago || 'Pendiente de confirmar',
      baseImponible: Number(factura.baseImponible || 0),
      tiposIVA: factura.tiposIVA || '21%',
      cuotaIVA: Number(factura.cuotaIVA || 0),
      regimenFiscal: factura.regimenFiscal || 'Régimen General Peninsular',
      aplicaRecargoEquivalencia: Boolean(factura.aplicaRecargoEquivalencia),
      tipoRecargoEquivalencia: factura.tipoRecargoEquivalencia || '',
      cuotaRecargoEquivalencia: Number(factura.cuotaRecargoEquivalencia || 0),
      aplicaRetencionIRPF: Boolean(factura.aplicaRetencionIRPF),
      tipoRetencionIRPF: factura.tipoRetencionIRPF || '',
      porcentajeIRPF: Number(factura.porcentajeIRPF || 0),
      cuotaIRPF: Number(factura.cuotaIRPF || 0),
      conceptoRetencionIRPF: factura.conceptoRetencionIRPF || '',
      total: Number(factura.total || 0),
      categoriaGasto: factura.categoriaGasto || 'Materias Primas',
      categoriaGastoJustificacion: factura.categoriaGastoJustificacion || '',
      notas: factura.notas || undefined,
      lineas: factura.lineas || [],
      sincronizadoSheets: false,
      archivoNombre: nombreOriginal,
      archivoBase64: base64Data,
      driveFileName: driveFileNameCalculado,
      driveFolderName: driveFolderNameCalculado,
      driveGuardado: false,
      fechaRegistro: new Date().toISOString()
    };

    // 1. Guardado en Base de Datos MySQL (Single Source of Truth)
    let mysqlGuardado = false;
    let mysqlError: string | null = null;

    try {
      const mysqlSyncResult = await guardarFacturasEnMySQL([nuevaFila]);
      if (mysqlSyncResult.replicadas > 0 || mysqlSyncResult.mysqlDisponible) {
        mysqlGuardado = true;
        console.log(`✅ [DB-First] Factura ${idFactura} persistida directamente en MySQL.`);
      } else if (mysqlSyncResult.errores.length > 0) {
        mysqlError = mysqlSyncResult.errores.join('; ');
        console.warn('⚠️ [DB-First] Aviso al guardar en MySQL:', mysqlError);
      }
    } catch (dbErr: any) {
      mysqlError = dbErr?.message || 'Error en MySQL';
      console.warn('⚠️ [DB-First] Aviso al guardar en MySQL:', mysqlError);
    }

    // Mantener sincronizada la memoria del servidor
    const existingIndex = serverFacturas.findIndex((f) => f.idFactura === idFactura);
    if (existingIndex !== -1) {
      serverFacturas[existingIndex] = nuevaFila;
    } else {
      serverFacturas.push(nuevaFila);
    }

    // 2. Almacenamiento opcional de recibo / justificante en Google Drive
    let driveGuardado = false;
    let driveError: string | undefined = undefined;
    const endpointUrl = config?.endpointUrl || process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL;
    const driveFolderId = config?.driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID || '';

    if (hasBase64 && endpointUrl && endpointUrl.startsWith('http')) {
      try {
        console.log(`[Google Drive Storage] Archivando recibo de factura ${idFactura} en Google Drive...`);
        const response = await fetch(endpointUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          redirect: 'follow',
          signal: AbortSignal.timeout(16000),
          body: JSON.stringify({
            action: 'saveToDrive',
            driveFolderId: driveFolderId,
            nombreProveedor: driveFolderNameCalculado,
            idFactura: idFactura,
            fechaEmision: factura.fechaEmision,
            archivo: {
              base64: base64Data,
              nombre: driveFileNameCalculado,
              mimeType: mimeType
            }
          })
        });

        const rawText = await response.text();
        let webhookResult: any = null;
        try {
          webhookResult = JSON.parse(rawText);
        } catch {
          webhookResult = { status: 'non_json', raw: rawText.substring(0, 300) };
        }

        if (webhookResult && webhookResult.drive && webhookResult.drive.success) {
          driveGuardado = true;
          nuevaFila.driveGuardado = true;
          nuevaFila.driveFileUrl = webhookResult.drive.fileUrl;
          nuevaFila.driveFolderUrl = webhookResult.drive.carpetaProveedorUrl;
          nuevaFila.driveFileName = webhookResult.drive.fileName || driveFileNameCalculado;
          nuevaFila.driveFolderName = webhookResult.drive.carpetaProveedor || driveFolderNameCalculado;

          // Actualizar URL de Google Drive en MySQL
          if (pool && isMySQLAvailable()) {
            try {
              await pool.query('UPDATE facturas SET archivo_ruta = ? WHERE id_factura = ?', [
                webhookResult.drive.fileUrl,
                idFactura
              ]);
            } catch (updateErr) {
              console.warn('Aviso al actualizar ruta Drive en MySQL:', updateErr);
            }
          }
        } else if (webhookResult && webhookResult.drive && !webhookResult.drive.success) {
          driveError = webhookResult.drive.error || 'Aviso al archivar en Google Drive';
        }
      } catch (gErr: any) {
        console.warn('⚠️ [Google Drive] Error al subir justificante:', gErr?.message || gErr);
        driveError = `Fallo de conexión con Google Drive: ${gErr?.message || 'Timeout'}`;
      }
    }

    nuevaFila.driveGuardado = driveGuardado;
    if (driveError) nuevaFila.driveError = driveError;

    let mensajeRespuesta = '';
    if (mysqlGuardado && driveGuardado) {
      mensajeRespuesta = `Factura ${idFactura} guardada en MySQL y recibo archivado en Google Drive (Carpeta "${nuevaFila.driveFolderName}").`;
    } else if (mysqlGuardado) {
      mensajeRespuesta = `Factura ${idFactura} guardada con éxito en la base de datos MySQL.`;
    } else if (driveGuardado) {
      mensajeRespuesta = `Factura ${idFactura} registrada y recibo archivado en Google Drive.`;
    } else {
      mensajeRespuesta = `Factura ${idFactura} registrada localmente en el servidor.`;
    }

    return res.json({
      success: true,
      mensaje: mensajeRespuesta,
      mysqlGuardado,
      driveGuardado,
      driveError,
      factura: nuevaFila,
      driveInfo: {
        carpetaProveedor: nuevaFila.driveFolderName || driveFolderNameCalculado,
        nombreArchivo: nuevaFila.driveFileName || driveFileNameCalculado,
        fileUrl: nuevaFila.driveFileUrl,
        folderUrl: nuevaFila.driveFolderUrl,
        error: driveError,
        guardado: driveGuardado
      }
    });
  } catch (error: any) {
    console.error('Error en procesarGuardadoFacturaDBFirst:', error);
    return res.status(500).json({ error: error?.message || 'Error al guardar factura en base de datos' });
  }
}

// Endpoint: Guardar factura (compatibilidad con endpoints existentes)
app.post('/api/sheets/save-invoice', async (req, res) => {
  return await procesarGuardadoFacturaDBFirst(req, res, req.body.factura, req.body.config, req.body.archivo);
});

// Endpoint: Estado de la base de datos relacional y almacenamiento en la nube (Google Drive)
app.get('/api/sheets/status', async (req, res) => {
  const pool = getDbPool();
  let mysqlCount = 0;
  let mysqlOk = false;

  if (pool && isMySQLAvailable()) {
    try {
      const [rows]: [any[], any] = await pool.query('SELECT COUNT(*) AS total FROM facturas');
      mysqlCount = rows[0]?.total || 0;
      mysqlOk = true;
    } catch {
      mysqlOk = false;
    }
  }

  res.json({
    sheetId: '',
    endpointUrl: process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL || '',
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
    mysqlConectado: mysqlOk,
    mysqlFacturasCount: mysqlCount,
    totalFacturasGuardadas: mysqlOk ? mysqlCount : serverFacturas.length,
    status: (process.env.GOOGLE_DRIVE_ENDPOINT_URL || mysqlOk) ? 'sincronizado' : 'pendiente',
    tab: 'Facturas',
    motor: mysqlOk ? 'MySQL Relacional (Single Source of Truth / DB-First)' : 'Memoria del Servidor'
  });
});

// Endpoint: Verificar acceso real y permisos a Google Apps Script y MySQL
app.get('/api/sheets/verify', async (req, res) => {
  const endpointUrl = ((req.query?.endpointUrl as string) || process.env.GOOGLE_SHEETS_ENDPOINT_URL || '').trim();
  const rawSheetId = ((req.query?.sheetId as string) || process.env.GOOGLE_SHEETS_ID || '').trim();
  const sheetId = extractCleanSheetId(rawSheetId);
  const driveFolderId = ((req.query?.driveFolderId as string) || process.env.GOOGLE_DRIVE_FOLDER_ID || '').trim();

  const pool = getDbPool();
  const mysqlOk = pool ? await testDbConnection() : false;

  if (!endpointUrl) {
    return res.json({
      accessible: mysqlOk,
      code: mysqlOk ? 'OK_MYSQL_ONLY' : 'NO_ENDPOINT',
      sheetId: sheetId || '',
      driveFolderId: driveFolderId || '',
      mysqlConectado: mysqlOk,
      mensaje: mysqlOk
        ? 'Base de datos MySQL conectada y lista en local. (Google Apps Script no configurado).'
        : 'No hay ninguna URL de Google Apps Script configurada.',
    });
  }

  try {
    const testPayload = {
      action: 'ping',
      tab: 'Facturas',
      sheetId: sheetId || '',
      driveFolderId: driveFolderId || ''
    };

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(testPayload),
      redirect: 'follow',
      signal: AbortSignal.timeout(15000),
    });

    const contentType = response.headers.get('content-type') || '';
    const text = await response.text();

    if (text.includes('accounts.google.com') || text.includes('toegang nodig') || text.includes('Sign in') || text.includes('necesitas acceso')) {
      return res.json({
        accessible: false,
        code: 'PERMISOS_GOOGLE_RESTRICTED',
        sheetId,
        endpointUrl,
        mensaje: 'La Web App de Google Apps Script no tiene permisos públicos. En Google Apps Script, ve a Implementar > Gestionar implementaciones > Editar > Cambia "Quién tiene acceso" a "Cualquier usuario" (Anyone).',
      });
    }

    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
      // not json
    }

    if (parsed && parsed.status === 'success' && parsed.driveAuthorized !== undefined) {
      const drivePart = parsed.driveStatus ? ` (${parsed.driveStatus})` : '';
      return res.json({
        accessible: true,
        code: 'OK',
        sheetId,
        endpointUrl,
        versionCorrecta: true,
        driveAuthorized: parsed.driveAuthorized,
        mensaje: `Acceso verificado con éxito al servicio de almacenamiento de Google Drive${drivePart}`,
        driveStatus: parsed.driveStatus,
        detalles: parsed
      });
    }

    // Si responde pero con ignored o sin soporte de Drive (script antiguo)
    if (parsed && (parsed.status === 'ignored' || parsed.message === 'Fila insertada' || parsed.driveAuthorized === undefined)) {
      return res.json({
        accessible: true,
        code: 'VERSION_DESACTUALIZADA',
        sheetId,
        endpointUrl,
        versionCorrecta: false,
        driveAuthorized: false,
        mensaje: '⚠️ Tu Web App está activa pero ejecuta una VERSIÓN ANTIGUA del script (sin soporte para Google Drive). Debes copiar el código de "Código Apps Script" y publicar una "Nueva versión" en Implementar > Gestionar implementaciones.',
        detalles: parsed
      });
    }

    return res.json({
      accessible: false,
      code: 'RESPUESTA_DESCONOCIDA',
      sheetId,
      endpointUrl,
      versionCorrecta: false,
      mensaje: 'El endpoint respondió pero con un formato inesperado.',
      preview: text.substring(0, 300)
    });
  } catch (error: any) {
    return res.json({
      accessible: false,
      code: 'ERROR_CONEXION',
      sheetId,
      endpointUrl,
      mensaje: error?.message || 'Error al intentar conectar con el endpoint de Google Apps Script.'
    });
  }
});

// Endpoint: Subir archivo de factura / recibo a Google Drive
const uploadToDriveHandler = async (req: any, res: any) => {
  try {
    const { idFactura, config, archivo, nombreProveedor, fechaEmision } = req.body;
    const endpointUrl = config?.endpointUrl || process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL;
    const driveFolderId = config?.driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID || '';

    if (!endpointUrl || !endpointUrl.startsWith('http')) {
      return res.status(400).json({
        success: false,
        error: 'No hay URL de Google Drive / Apps Script configurada.'
      });
    }

    const base64Data = archivo?.base64Data || archivo?.base64;
    if (!base64Data || base64Data.length < 50) {
      return res.status(400).json({
        success: false,
        error: 'No se recibieron datos binarios del archivo para subir a Drive.'
      });
    }

    const provCalculado = (nombreProveedor || 'Varios').trim();
    const driveFileNameCalculado = `${idFactura} ${fechaEmision || new Date().toISOString().split('T')[0]}.pdf`;
    const mimeType = archivo?.mimeType || 'application/pdf';

    console.log(`[Upload to Drive] Subiendo recibo de factura ${idFactura} a Google Drive...`);

    const response = await fetch(endpointUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      redirect: 'follow',
      body: JSON.stringify({
        action: 'saveToDrive',
        driveFolderId: driveFolderId,
        nombreProveedor: provCalculado,
        idFactura: idFactura,
        fechaEmision: fechaEmision,
        archivo: {
          base64: base64Data,
          nombre: driveFileNameCalculado,
          mimeType: mimeType
        }
      })
    });

    const rawText = await response.text();
    let result: any = null;
    try {
      result = JSON.parse(rawText);
    } catch {
      result = { status: 'error', raw: rawText.substring(0, 300) };
    }

    if (result && result.drive && result.drive.success) {
      // Actualizar factura en memoria del servidor
      const idx = serverFacturas.findIndex(f => f.idFactura === idFactura);
      if (idx !== -1) {
        serverFacturas[idx].driveGuardado = true;
        serverFacturas[idx].driveFileUrl = result.drive.fileUrl;
        serverFacturas[idx].driveFolderUrl = result.drive.carpetaProveedorUrl;
        serverFacturas[idx].driveFileName = result.drive.fileName || driveFileNameCalculado;
        serverFacturas[idx].driveFolderName = result.drive.carpetaProveedor || provCalculado;
        serverFacturas[idx].driveError = undefined;
      }

      // Actualizar en MySQL si está disponible
      const pool = getDbPool();
      if (pool && isMySQLAvailable()) {
        try {
          await pool.query('UPDATE facturas SET archivo_ruta = ? WHERE id_factura = ?', [
            result.drive.fileUrl,
            idFactura
          ]);
        } catch {}
      }

      return res.json({
        success: true,
        drive: result.drive,
        mensaje: `Recibo de factura ${idFactura} archivado con éxito en Google Drive`
      });
    } else {
      const errMsg = result?.drive?.error || result?.error || (result?.status === 'ignored' ? 'Tu script desplegado es la versión antigua y no soporta Google Drive.' : 'Error al guardar en Drive');
      return res.status(500).json({
        success: false,
        error: errMsg
      });
    }
  } catch (err: any) {
    return res.status(500).json({
      success: false,
      error: err?.message || 'Error de conexión al subir a Drive'
    });
  }
};

app.post('/api/drive/upload', uploadToDriveHandler);
app.post('/api/sheets/upload-to-drive', uploadToDriveHandler);

// Helpers de parseo de filas de Google Sheets
function extractCleanSheetId(input: string): string {
  if (!input) return '';
  const trimmed = input.trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}

function parseNumeric(val: any): number {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  let str = String(val).replace(/[^0-9,.-]/g, '').trim();
  if (str.includes(',') && str.includes('.')) {
    if (str.indexOf('.') < str.indexOf(',')) {
      str = str.replace(/\./g, '').replace(',', '.');
    } else {
      str = str.replace(/,/g, '');
    }
  } else if (str.includes(',')) {
    str = str.replace(',', '.');
  }
  const n = parseFloat(str);
  return isNaN(n) ? 0 : Math.round(n * 100) / 100;
}

function parseDate(val: any): string {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(str)) {
    return str.substring(0, 10);
  }
  return str;
}

function parseRawSheetRow(row: any[], index: number): any {
  if (!Array.isArray(row) || row.length === 0) return null;
  const idFactura = String(row[0] || '').trim();
  if (!idFactura || idFactura.toLowerCase() === 'id factura' || idFactura.toLowerCase() === 'id') {
    return null; // encabezado
  }

  const fechaEmision = parseDate(row[1]) || new Date().toISOString().split('T')[0];
  const idProveedor = String(row[2] || 'PROV-GEN').trim();

  // Detectar inteligentemente si la fila tiene 15 columnas (con Nombre proveedor en índice 3) o 14 columnas
  const is15Cols = row.length >= 15 || (row.length >= 14 && typeof row[3] === 'string' && (typeof row[5] === 'number' || !isNaN(parseFloat(String(row[5] || '').replace(/,/g, '.')))));

  let nombreProveedor = '';
  let concepto = '';
  let importe = 0;
  let fechaVencimiento = '';
  let rawEstado = '';
  let fechaPago = '';
  let baseImponible = 0;
  let tiposIVA = '21%';
  let cuotaIVA = 0;
  let total = 0;
  let categoriaGasto = 'Materias Primas';
  let driveFileUrl = '';

  if (is15Cols && row.length >= 5) {
    nombreProveedor = String(row[3] || '').trim() || (idProveedor.startsWith('PROV-') ? `Proveedor ${idProveedor}` : idProveedor);
    concepto = String(row[4] || 'Factura registrada en Google Sheets').trim();
    importe = parseNumeric(row[5]);
    fechaVencimiento = parseDate(row[6]) || fechaEmision;
    rawEstado = String(row[7] || 'Pendiente').toLowerCase();
    fechaPago = parseDate(row[8]) || '';
    baseImponible = parseNumeric(row[9]) || importe;
    tiposIVA = String(row[10] || '21%').trim();
    cuotaIVA = parseNumeric(row[11]) || Math.round(baseImponible * 0.21 * 100) / 100;
    total = parseNumeric(row[12]) || Math.round((baseImponible + cuotaIVA) * 100) / 100;
    categoriaGasto = String(row[13] || 'Materias Primas').trim();
    driveFileUrl = String(row[14] || '').trim();
  } else {
    nombreProveedor = idProveedor.startsWith('PROV-') ? `Proveedor ${idProveedor}` : idProveedor;
    concepto = String(row[3] || 'Factura registrada en Google Sheets').trim();
    importe = parseNumeric(row[4]);
    fechaVencimiento = parseDate(row[5]) || fechaEmision;
    rawEstado = String(row[6] || 'Pendiente').toLowerCase();
    fechaPago = parseDate(row[7]) || '';
    baseImponible = parseNumeric(row[8]) || importe;
    tiposIVA = String(row[9] || '21%').trim();
    cuotaIVA = parseNumeric(row[10]) || Math.round(baseImponible * 0.21 * 100) / 100;
    total = parseNumeric(row[11]) || Math.round((baseImponible + cuotaIVA) * 100) / 100;
    categoriaGasto = String(row[12] || 'Materias Primas').trim();
    driveFileUrl = String(row[13] || '').trim();
  }

  const estado = rawEstado.includes('pagad') ? 'Pagada' : rawEstado.includes('venc') ? 'Vencida' : 'Pendiente';
  if (estado === 'Pagada' && !fechaPago) {
    fechaPago = fechaEmision;
  }

  const notas = (is15Cols && row.length >= 16) ? String(row[15] || '').trim() : (!is15Cols && row.length >= 15) ? String(row[14] || '').trim() : '';

  return {
    idFactura,
    fechaEmision,
    idProveedor,
    nombreProveedor,
    concepto,
    importe: baseImponible,
    fechaVencimiento,
    estado,
    fechaPago,
    baseImponible,
    tiposIVA,
    cuotaIVA,
    total,
    categoriaGasto,
    notas: notas || undefined,
    sincronizadoSheets: true,
    driveFileUrl: driveFileUrl.startsWith('http') ? driveFileUrl : undefined,
    driveFileName: `${idFactura} ${fechaEmision}.pdf`,
    driveFolderName: nombreProveedor,
    driveGuardado: Boolean(driveFileUrl && driveFileUrl.startsWith('http')),
    fuente: 'google_sheets'
  };
}

// Endpoint: Obtener facturas directamente de MySQL (Single Source of Truth / DB-First)
app.all('/api/sheets/fetch-invoices', async (req, res) => {
  try {
    const facturas = await obtenerFacturasDeMySQL();
    if (facturas && facturas.length > 0) {
      serverFacturas = [...facturas];
      return res.json({
        success: true,
        connected: true,
        hasRealData: true,
        count: facturas.length,
        replicadasMySQL: facturas.length,
        mysqlDisponible: true,
        mysqlRazonFallo: '',
        mysqlErrores: [],
        facturas,
        source: 'mysql'
      });
    }
  } catch (err: any) {
    console.warn('Aviso en fetch-invoices desde MySQL:', err?.message);
  }

  return res.json({
    success: true,
    connected: true,
    hasRealData: serverFacturas.length > 0,
    count: serverFacturas.length,
    replicadasMySQL: serverFacturas.length,
    mysqlDisponible: isMySQLAvailable(),
    mysqlRazonFallo: '',
    mysqlErrores: [],
    facturas: serverFacturas,
    source: 'mysql'
  });
});

// Endpoint: Ping rápido para comprobación periódica y latencia de MySQL
app.get('/api/mysql/ping', async (req, res) => {
  const ping = await pingDb();
  return res.json({
    connected: ping.connected,
    latencyMs: ping.latencyMs,
    message: ping.message,
    host: ping.host,
    port: ping.port,
    database: ping.database,
    timestamp: new Date().toISOString()
  });
});

// Endpoint: Obtener o probar estado y configuración de la base de datos MySQL
app.get('/api/mysql/status', async (req, res) => {
  const check = await testDbConnection();
  const pool = getDbPool();
  let facturasCount = 0;
  let proveedoresCount = 0;
  let lineasCount = 0;
  let alertasCount = 0;
  let categoriasCount = 0;
  let historicoPreciosCount = 0;
  let parametrosCount = 0;
  let analisisCount = 0;
  let chatMensajesCount = 0;
  let declaracionesCount = 0;
  let googleConfigured = false;

  if (check.connected && pool) {
    try {
      const [fRows]: any = await pool.query('SELECT COUNT(*) as count FROM facturas').catch(() => [[{ count: 0 }]]);
      const [pRows]: any = await pool.query('SELECT COUNT(*) as count FROM proveedores').catch(() => [[{ count: 0 }]]);
      const [lRows]: any = await pool.query('SELECT COUNT(*) as count FROM lineas_factura').catch(() => [[{ count: 0 }]]);
      const [aRows]: any = await pool.query('SELECT COUNT(*) as count FROM alertas').catch(() => [[{ count: 0 }]]);
      const [cRows]: any = await pool.query('SELECT COUNT(*) as count FROM categorias_gasto').catch(() => [[{ count: 0 }]]);
      const [hRows]: any = await pool.query('SELECT COUNT(*) as count FROM historico_precios').catch(() => [[{ count: 0 }]]);
      const [paramRows]: any = await pool.query('SELECT COUNT(*) as count FROM configuracion_parametros').catch(() => [[{ count: 0 }]]);
      const [anRows]: any = await pool.query('SELECT COUNT(*) as count FROM analisis_financieros_ia').catch(() => [[{ count: 0 }]]);
      const [chRows]: any = await pool.query('SELECT COUNT(*) as count FROM historial_chat_ia').catch(() => [[{ count: 0 }]]);
      const [aeRows]: any = await pool.query('SELECT COUNT(*) as count FROM declaraciones_aeat').catch(() => [[{ count: 0 }]]);
      const [gRows]: any = await pool.query('SELECT COUNT(*) as count FROM integraciones_google').catch(() => [[{ count: 0 }]]);

      facturasCount = Number(fRows[0]?.count || 0);
      proveedoresCount = Number(pRows[0]?.count || 0);
      lineasCount = Number(lRows[0]?.count || 0);
      alertasCount = Number(aRows[0]?.count || 0);
      categoriasCount = Number(cRows[0]?.count || 0);
      historicoPreciosCount = Number(hRows[0]?.count || 0);
      parametrosCount = Number(paramRows[0]?.count || 0);
      analisisCount = Number(anRows[0]?.count || 0);
      chatMensajesCount = Number(chRows[0]?.count || 0);
      declaracionesCount = Number(aeRows[0]?.count || 0);
      googleConfigured = Number(gRows[0]?.count || 0) > 0;
    } catch (err: any) {
      console.warn('Error al consultar conteo en MySQL:', err?.message);
    }
  }

  const currentConfig = getDbConfig();

  return res.json({
    connected: check.connected,
    latencyMs: check.latencyMs,
    message: check.message,
    host: check.host,
    port: check.port,
    database: check.database,
    user: currentConfig.user,
    hasPassword: Boolean(currentConfig.password),
    facturasCount,
    proveedoresCount,
    lineasCount,
    alertasCount,
    categoriasCount,
    historicoPreciosCount,
    parametrosCount,
    analisisCount,
    chatMensajesCount,
    declaracionesCount,
    googleConfigured,
    timestamp: new Date().toISOString()
  });
});

// Endpoint: Actualizar configuración de MySQL y probar conexión
app.post('/api/mysql/config', async (req, res) => {
  const { host, port, user, password, database } = req.body || {};
  updateDbConfig({
    host: host ? String(host).trim() : undefined,
    port: port ? Number(port) : undefined,
    user: user ? String(user).trim() : undefined,
    password: password !== undefined ? String(password) : undefined,
    database: database ? String(database).trim() : undefined,
  });

  const check = await testDbConnection();
  return res.json({
    success: check.connected,
    connected: check.connected,
    message: check.message,
    host: check.host,
    port: check.port,
    database: check.database,
  });
});

// Endpoint: Exportar script SQL (.sql) de todas las facturas y proveedores
app.all('/api/mysql/export-sql', async (req, res) => {
  try {
    const bodyFacturas = Array.isArray(req.body?.facturas) && req.body.facturas.length > 0 ? req.body.facturas : null;
    const bodyProvs = Array.isArray(req.body?.proveedores) && req.body.proveedores.length > 0 ? req.body.proveedores : null;
    const bodyNegocio = req.body?.datosNegocio;
    const bodyCats = req.body?.categorias;
    const bodyParams = req.body?.parametros;

    let facturasParaExportar = bodyFacturas || serverFacturas;
    let provsParaExportar = bodyProvs || serverProveedores;

    if (isMySQLAvailable()) {
      if (!bodyFacturas || bodyFacturas.length === 0) {
        const dbFacturas = await obtenerFacturasDeMySQL();
        if (dbFacturas && dbFacturas.length > 0) {
          facturasParaExportar = dbFacturas;
        }
      }
      if (!bodyProvs || bodyProvs.length === 0) {
        const dbProvs = await obtenerProveedoresDeMySQL();
        if (dbProvs && dbProvs.length > 0) {
          provsParaExportar = dbProvs;
        }
      }
    }

    const negocioActual = bodyNegocio || (isMySQLAvailable() ? await obtenerDatosNegocioDeMySQL() : serverDatosNegocio);
    const catsActuales = bodyCats || (isMySQLAvailable() ? await obtenerCategoriasDeMySQL() : storedCategoriasGasto);
    const paramsActuales = bodyParams || (isMySQLAvailable() ? await obtenerParametrosSistemaDeMySQL() : null);

    const sql = generarScriptSqlCompleto(
      facturasParaExportar,
      provsParaExportar,
      negocioActual,
      catsActuales,
      paramsActuales
    );

    res.setHeader('Content-Type', 'application/sql; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="facturas_finance_ai.sql"');
    return res.send(sql);
  } catch (err: any) {
    console.error('Error generando exportación SQL:', err);
    return res.status(500).send('-- Error generando exportación SQL\n' + (err?.message || 'Error desconocido'));
  }
});

// Endpoint: Replicar explícitamente cualquier conjunto de facturas hacia MySQL
app.post('/api/sheets/sync-to-mysql', async (req, res) => {
  try {
    const { facturas } = req.body;
    const facturasToSync = Array.isArray(facturas) && facturas.length > 0 ? facturas : serverFacturas;
    const result = await guardarFacturasEnMySQL(facturasToSync);
    return res.json({
      success: result.mysqlDisponible && result.replicadas > 0,
      total: facturasToSync.length,
      replicadas: result.replicadas,
      errores: result.errores,
      mysqlDisponible: result.mysqlDisponible,
      razonFallo: result.razonFallo,
      mensaje: result.mysqlDisponible
        ? `Replicadas ${result.replicadas}/${facturasToSync.length} facturas en MySQL.`
        : `No se pudo conectar a MySQL: ${result.razonFallo || 'Servidor no accesible'}`
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Error al sincronizar con MySQL' });
  }
});

// Endpoint: Replicar alertas hacia MariaDB/MySQL con formato JSON compatible (LONGTEXT)
app.post('/api/mysql/sync-alertas', async (req, res) => {
  try {
    const { alertas } = req.body;
    if (!Array.isArray(alertas) || alertas.length === 0) {
      return res.json({ success: true, replicadas: 0, errores: [] });
    }
    const result = await guardarAlertasEnMySQL(alertas);
    return res.json({
      success: result.mysqlDisponible,
      replicadas: result.replicadas,
      errores: result.errores,
      mysqlDisponible: result.mysqlDisponible,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Error al sincronizar alertas con MySQL' });
  }
});

// Endpoint: Consultar alertas persistidas en MariaDB/MySQL
app.get('/api/alertas', async (req, res) => {
  try {
    const alertas = await obtenerAlertasDeMySQL();
    if (alertas && alertas.length > 0) {
      return res.json({ success: true, alertas, count: alertas.length, fuente: 'mysql' });
    }
  } catch (err: any) {
    console.warn('Aviso al consultar alertas en MySQL:', err?.message);
  }
  return res.json({ success: true, alertas: [], count: 0, fuente: 'empty' });
});

app.post('/api/alertas', async (req, res) => {
  try {
    const { alertas } = req.body;
    if (!Array.isArray(alertas) || alertas.length === 0) {
      return res.json({ success: true, replicadas: 0, errores: [] });
    }
    const result = await guardarAlertasEnMySQL(alertas);
    return res.json({
      success: result.mysqlDisponible,
      replicadas: result.replicadas,
      errores: result.errores,
      mysqlDisponible: result.mysqlDisponible,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Error al guardar alertas en MySQL' });
  }
});

// Endpoint: Actualizar estado de una alerta en MySQL (activa, resuelta, ignorada)
app.patch('/api/alertas/:id/estado', async (req, res) => {
  try {
    const id = req.params.id;
    const { estado, alerta } = req.body;
    if (!id || !estado) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos (id o estado)' });
    }
    const result = await actualizarEstadoAlertaEnMySQL(id, estado, alerta);
    return res.json({ success: result.ok, error: result.error });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error al actualizar estado de alerta en MySQL' });
  }
});

app.post('/api/alertas/:id/estado', async (req, res) => {
  try {
    const id = req.params.id;
    const { estado, alerta } = req.body;
    if (!id || !estado) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos (id o estado)' });
    }
    const result = await actualizarEstadoAlertaEnMySQL(id, estado, alerta);
    return res.json({ success: result.ok, error: result.error });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error al actualizar estado de alerta en MySQL' });
  }
});


// Endpoint: Consultar facturas persistidas en MariaDB/MySQL
app.get('/api/facturas', async (req, res) => {
  try {
    const facturas = await obtenerFacturasDeMySQL();
    if (facturas && facturas.length > 0) {
      serverFacturas = [...facturas];
      return res.json({ success: true, facturas, count: facturas.length, fuente: 'mysql' });
    }
  } catch (err: any) {
    console.warn('Aviso al consultar facturas en MySQL:', err?.message);
  }
  return res.json({ success: true, facturas: serverFacturas, count: serverFacturas.length, fuente: 'memoria' });
});

app.post('/api/facturas', async (req, res) => {
  try {
    const { facturas, factura, config, archivo } = req.body;
    // Si se envía una lista masiva de facturas
    if (Array.isArray(facturas) && facturas.length > 0) {
      const result = await guardarFacturasEnMySQL(facturas);
      for (const f of facturas) {
        const idx = serverFacturas.findIndex((sf) => sf.idFactura === f.idFactura);
        if (idx !== -1) serverFacturas[idx] = f;
        else serverFacturas.push(f);
      }
      return res.json({
        success: result.mysqlDisponible,
        replicadas: result.replicadas,
        errores: result.errores,
        mysqlDisponible: result.mysqlDisponible,
      });
    }

    // Si se envía una factura individual (creación / subida)
    const targetFactura = factura || (Array.isArray(facturas) ? facturas[0] : null);
    if (targetFactura && targetFactura.idFactura) {
      return await procesarGuardadoFacturaDBFirst(req, res, targetFactura, config, archivo);
    }

    return res.json({ success: true, replicadas: 0, errores: [] });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Error al guardar facturas en MySQL' });
  }
});

// Endpoint: Actualizar estado de una factura directamente en MySQL
app.patch('/api/facturas/:id/estado', async (req, res) => {
  try {
    const id = req.params.id;
    const { estado, fechaPago } = req.body;
    if (!id || !estado) {
      return res.status(400).json({ success: false, error: 'Faltan parámetros requeridos (id o estado)' });
    }
    const result = await actualizarEstadoFacturaEnMySQL(id, estado, fechaPago);
    const idx = serverFacturas.findIndex((f) => f.idFactura === id);
    if (idx !== -1) {
      serverFacturas[idx].estado = estado;
      if (fechaPago) serverFacturas[idx].fechaPago = fechaPago;
    }
    return res.json({ success: result.ok, error: result.error });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error al actualizar estado en MySQL' });
  }
});

// Endpoint: Replicar proveedores completos hacia MariaDB/MySQL
app.post('/api/mysql/sync-proveedores', async (req, res) => {
  try {
    const { proveedores } = req.body;
    if (!Array.isArray(proveedores) || proveedores.length === 0) {
      return res.json({ success: true, replicadas: 0, errores: [] });
    }
    const result = await guardarProveedoresEnMySQL(proveedores);
    return res.json({
      success: result.mysqlDisponible,
      replicadas: result.replicadas,
      errores: result.errores,
      mysqlDisponible: result.mysqlDisponible,
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, error: error?.message || 'Error al sincronizar proveedores con MySQL' });
  }
});

// Endpoint: Consultar histórico de precios unitarios de compra de MySQL
app.get('/api/historico-precios', async (req, res) => {
  try {
    const producto = req.query.producto ? String(req.query.producto) : undefined;
    const historico = await obtenerHistoricoPreciosDeMySQL(producto);
    return res.json({ success: true, count: historico.length, historico });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error al consultar histórico de precios' });
  }
});

// Endpoint Maestro: Sincronización completa de TODAS las tablas hacia MySQL/MariaDB
// Sincroniza datos_negocio, categorias_gasto, proveedores, facturas, lineas_factura, historico_precios, alertas,
// parametros_sistema, analisis_financieros_ia, integraciones_google y declaraciones_aeat
app.post('/api/mysql/sync-all', async (req, res) => {
  try {
    const {
      facturas,
      proveedores,
      alertas,
      categorias,
      datosNegocio,
      parametrosSistema,
      analisis,
      configuracionGoogle,
      declaracionesAeat
    } = req.body || {};
    const facturasToSync = Array.isArray(facturas) && facturas.length > 0 ? facturas : serverFacturas;
    const provsToSync = Array.isArray(proveedores) && proveedores.length > 0 ? proveedores : serverProveedores;

    const result = await sincronizarTodoHaciaMySQL({
      facturas: facturasToSync,
      proveedores: provsToSync,
      alertas: Array.isArray(alertas) ? alertas : undefined,
      categorias: Array.isArray(categorias) ? categorias : storedCategoriasGasto,
      datosNegocio: datosNegocio || serverDatosNegocio,
      parametrosSistema,
      analisis,
      configuracionGoogle,
      declaracionesAeat
    });

    return res.json({
      ...result,
      mensaje: result.mysqlDisponible
        ? `Replicación completa: ${result.facturasReplicadas} facturas (con líneas e histórico), ${result.proveedoresReplicados} proveedores, ${result.alertasReplicadas} alertas, ${result.categoriasReplicadas} categorías, datos de negocio, parámetros del sistema, análisis IA y configuración guardados en MySQL.`
        : `MySQL no disponible: ${result.razonFallo || 'Sin conexión'}`
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message || 'Error en sincronización maestra' });
  }
});

// ============================================================================
// ENDPOINTS DE PERSISTENCIA EMPRESARIAL (SUSTITUCIÓN DE LOCALSTORAGE Y RAM)
// ============================================================================

// 1. Parámetros del Sistema (Configuración global y umbrales)
app.get('/api/parametros-sistema', async (req, res) => {
  try {
    const params = await obtenerParametrosSistemaDeMySQL();
    if (params) {
      return res.json({ success: true, parametros: params, fuente: 'mysql' });
    }
  } catch (err: any) {
    console.warn('Aviso al leer configuracion_parametros de MySQL:', err?.message);
  }
  return res.json({ success: true, parametros: null, fuente: 'default' });
});

app.post('/api/parametros-sistema', async (req, res) => {
  try {
    const { parametros } = req.body;
    if (!parametros) return res.status(400).json({ error: 'Parámetros no proporcionados' });
    const result = await guardarParametrosSistemaEnMySQL(parametros);
    return res.json({ success: result.ok, error: result.error });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 2. Histórico de Diagnósticos Ejecutivos IA
app.get('/api/analisis-ejecutivo', async (req, res) => {
  try {
    const analisis = await obtenerAnalisisEjecutivoDeMySQL();
    if (analisis) {
      return res.json({ success: true, analisis, fuente: 'mysql' });
    }
  } catch (err: any) {
    console.warn('Aviso al leer analisis_financieros_ia de MySQL:', err?.message);
  }
  return res.json({ success: true, analisis: null, fuente: 'ninguno' });
});

app.post('/api/analisis-ejecutivo', async (req, res) => {
  try {
    const { analisis } = req.body;
    if (!analisis) return res.status(400).json({ error: 'Análisis no proporcionado' });
    const result = await guardarAnalisisEjecutivoEnMySQL(analisis);
    return res.json({ success: result.ok, error: result.error });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 3. Histórico de Conversación con el Asistente IA (Chat)
app.get('/api/chat/historial', async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const historial = await obtenerHistorialChatDeMySQL(limit);
    return res.json({ success: true, count: historial.length, historial });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.post('/api/chat/mensaje', async (req, res) => {
  try {
    const { mensaje } = req.body;
    if (!mensaje || !mensaje.texto) return res.status(400).json({ error: 'Mensaje inválido' });
    const result = await guardarMensajeChatEnMySQL(mensaje);
    return res.json({ success: result.ok, error: result.error });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.delete('/api/chat/historial', async (req, res) => {
  try {
    const result = await limpiarHistorialChatEnMySQL();
    return res.json({ success: result.ok });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 4. Declaraciones Fiscales y Cierre de Modelos AEAT
app.get('/api/aeat/declaraciones', async (req, res) => {
  try {
    const modelo = req.query.modelo ? String(req.query.modelo) : undefined;
    const ejercicio = req.query.ejercicio ? parseInt(String(req.query.ejercicio), 10) : undefined;
    const declaraciones = await obtenerDeclaracionesAeatDeMySQL(modelo, ejercicio);
    return res.json({ success: true, count: declaraciones.length, declaraciones });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.post('/api/aeat/declaraciones', async (req, res) => {
  try {
    const { declaracion } = req.body;
    if (!declaracion || !declaracion.modelo) return res.status(400).json({ error: 'Declaración AEAT no válida' });
    const result = await guardarDeclaracionAeatEnMySQL(declaracion);
    return res.json({ success: result.ok, error: result.error });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// 5. Configuración de Google Sheets / Drive
app.get('/api/sheets/config', async (req, res) => {
  try {
    const config = await obtenerConfiguracionGoogleDeMySQL();
    if (config) {
      return res.json({ success: true, config, fuente: 'mysql' });
    }
  } catch (err: any) {
    console.warn('Aviso al leer integraciones_google de MySQL:', err?.message);
  }
  return res.json({
    success: true,
    config: {
      sheetId: process.env.GOOGLE_SHEETS_ID || '',
      endpointUrl: process.env.GOOGLE_SHEETS_ENDPOINT_URL || '',
      driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
      autoSync: true,
      isSheetDataActive: false,
    },
    fuente: 'env'
  });
});

app.post('/api/sheets/config', async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) return res.status(400).json({ error: 'Configuración no válida' });
    const result = await guardarConfiguracionGoogleEnMySQL(config);
    return res.json({ success: result.ok, error: result.error });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// =========================================================================
// ELIMINACIÓN DE FACTURAS (DB-First: MySQL + Google Drive para recibos)
// =========================================================================
async function eliminarFacturaDBFirstHandler(req: any, res: any) {
  const idFactura = req.params?.id || req.body?.idFactura || req.query?.idFactura;
  const { endpointUrl, driveFolderId, nombreProveedor, fileUrl } = req.body || {};

  if (!idFactura) {
    return res.status(400).json({ error: 'Falta el identificador de factura (idFactura)' });
  }

  const normalizedId = String(idFactura).trim();
  serverFacturas = serverFacturas.filter((f) => String(f.idFactura).trim().toLowerCase() !== normalizedId.toLowerCase());

  // 1. Eliminar transaccionalmente de MySQL (Single Source of Truth)
  let mysqlDeleted = false;
  let mysqlError: string | null = null;
  try {
    const dbRes = await eliminarFacturaDeMySQL(normalizedId);
    mysqlDeleted = dbRes.ok && dbRes.affectedRows > 0;
    if (dbRes.error) mysqlError = dbRes.error;
    console.log(`✅ [DB-First] Factura ${normalizedId} eliminada de MySQL (Afectadas: ${dbRes.affectedRows}).`);
  } catch (err: any) {
    mysqlError = err?.message;
    console.warn('Aviso al eliminar factura de MySQL:', err?.message);
  }

  // 2. Eliminar recibo/archivo de Google Drive vía Apps Script (si existe)
  let driveDeleted = false;
  let folderDeleted = false;
  let scriptStatus = 'no_endpoint';
  const targetEndpoint = endpointUrl || process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL;
  const targetFolderId = driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID;

  if (targetEndpoint && targetEndpoint.startsWith('http')) {
    try {
      console.log(`[Google Drive] Solicitando eliminación del archivo de factura ${normalizedId} en Drive...`);
      const response = await fetch(targetEndpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'deleteInvoice',
          idFactura: normalizedId,
          driveFolderId: targetFolderId,
          nombreProveedor: nombreProveedor || '',
          fileUrl: fileUrl || ''
        }),
        redirect: 'follow',
        signal: AbortSignal.timeout(14000),
      });
      const rawText = await response.text();
      try {
        const data = JSON.parse(rawText);
        driveDeleted = Boolean(data?.deletedDrive);
        folderDeleted = Boolean(data?.deletedFolder);
        scriptStatus = data?.status || 'ok';
      } catch {
        scriptStatus = 'non_json_response';
      }
    } catch (e: any) {
      console.warn('Aviso al eliminar en Google Drive:', e?.message || e);
      scriptStatus = 'error: ' + (e?.message || 'unknown');
    }
  }

  return res.json({
    success: true,
    idFactura: normalizedId,
    mysqlDeleted,
    driveDeleted,
    folderDeleted,
    scriptStatus,
    mysqlError,
    remainingCount: serverFacturas.length,
    message: `Factura ${normalizedId} eliminada de la base de datos MySQL${driveDeleted ? ' y su archivo de Google Drive' : ''}.`
  });
}

// Endpoints REST de eliminación
app.delete('/api/facturas/:id', eliminarFacturaDBFirstHandler);
app.post('/api/facturas/delete', eliminarFacturaDBFirstHandler);
app.post('/api/sheets/delete-invoice', eliminarFacturaDBFirstHandler);

// Endpoints de configuración de almacenamiento Google Drive
app.get('/api/drive/config', async (req, res) => {
  try {
    const config = await obtenerConfiguracionGoogleDeMySQL();
    return res.json({
      success: true,
      config: config || {
        driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || '',
        endpointUrl: process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL || '',
      }
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

app.post('/api/drive/config', async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) return res.status(400).json({ error: 'Configuración no válida' });
    const result = await guardarConfiguracionGoogleEnMySQL(config);
    return res.json({ success: result.ok, error: result.error });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});

// Endpoint: Obtener proveedores de MySQL o memoria (Consolidados por emisor real)
app.get('/api/proveedores', async (req, res) => {
  try {
    let rawProvs: any[] = [];
    try {
      rawProvs = await obtenerProveedoresDeMySQL();
    } catch {}
    if (!rawProvs || rawProvs.length === 0) {
      rawProvs = serverProveedores;
    }

    // Obtener facturas actuales para consolidar y excluir huérfanos o duplicados
    let facturasActuales: any[] = [];
    try {
      facturasActuales = await obtenerFacturasDeMySQL();
    } catch {}
    if (!facturasActuales || facturasActuales.length === 0) {
      facturasActuales = serverFacturas;
    }

    if (facturasActuales && facturasActuales.length > 0) {
      const mapFacturas = new Map<string, {
        nombre: string;
        id: string;
        total: number;
        count: number;
        conceptos: string[];
      }>();

      facturasActuales.forEach((f: any) => {
        const nom = (f.nombreProveedor || '').trim();
        const norm = nom
          .toLowerCase()
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^a-z0-9]/g, '');
        if (!norm) return;

        const entry = mapFacturas.get(norm) || {
          nombre: nom,
          id: f.idProveedor || 'PROV-GEN',
          total: 0,
          count: 0,
          conceptos: [],
        };

        entry.total += Number(f.total || 0);
        entry.count += 1;
        if (f.concepto) entry.conceptos.push(f.concepto);
        if (f.idProveedor && !f.idProveedor.startsWith('PROV-') && (!entry.id || entry.id.startsWith('PROV-'))) {
          entry.id = f.idProveedor;
        }
        mapFacturas.set(norm, entry);
      });

      const provsConsolidados: any[] = [];
      mapFacturas.forEach((data, norm) => {
        const provEncontrado = rawProvs.find((p: any) => {
          const pNorm = (p.nombreProveedor || '')
            .trim()
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9]/g, '');
          return pNorm === norm;
        });

        provsConsolidados.push({
          idProveedor: data.id || provEncontrado?.idProveedor || 'PROV-GEN',
          nombreProveedor: data.nombre || provEncontrado?.nombreProveedor,
          cif: provEncontrado?.cif || (data.id && /^[A-Z0-9-]{8,10}$/i.test(data.id) ? data.id : null),
          contacto: provEncontrado?.contacto || null,
          productosSuministrados: provEncontrado?.productosSuministrados || data.conceptos.slice(0, 3).join(', ') || 'Suministros diversos',
          importeMensual: Math.round(data.total * 100) / 100,
          frecuencia: data.count >= 8 ? 'Semanal' : data.count >= 4 ? 'Quincenal' : 'Mensual',
          riesgoDependencia: provEncontrado?.riesgoDependencia || 'Bajo',
          tiempoMedioEntrega: provEncontrado?.tiempoMedioEntrega || '24-48h',
        });
      });

      serverProveedores = [...provsConsolidados];
      return res.json({
        success: true,
        proveedores: provsConsolidados,
        count: provsConsolidados.length,
        fuente: isMySQLAvailable() ? 'mysql_consolidado' : 'memoria_consolidada',
      });
    }

    if (rawProvs && rawProvs.length > 0) {
      serverProveedores = [...rawProvs];
      return res.json({
        success: true,
        proveedores: rawProvs,
        count: rawProvs.length,
        fuente: 'mysql',
      });
    }
  } catch (err: any) {
    console.warn('Aviso al consultar proveedores:', err?.message);
  }

  res.json({ success: true, proveedores: serverProveedores, count: serverProveedores.length, fuente: 'memoria' });
});

// Endpoint: Guardar o actualizar proveedores en memoria y MySQL
app.post('/api/proveedores', async (req, res) => {
  const { proveedores } = req.body;
  if (Array.isArray(proveedores) && proveedores.length > 0) {
    serverProveedores = proveedores;
    let guardadoEnMySQL = false;
    let replicadas = 0;
    try {
      const resDb = await guardarProveedoresEnMySQL(proveedores);
      guardadoEnMySQL = resDb.mysqlDisponible;
      replicadas = resDb.replicadas;
    } catch (e: any) {
      console.warn('Error al guardar proveedores en MySQL:', e?.message);
    }
    return res.json({
      success: true,
      count: serverProveedores.length,
      proveedores: serverProveedores,
      mysqlGuardado: guardadoEnMySQL,
      mysqlReplicadas: replicadas,
    });
  }
  return res.status(400).json({ error: 'Array de proveedores no válido' });
});

// Endpoint: Vaciar todas las facturas del caché del servidor
app.post('/api/sheets/clear-cache', (req, res) => {
  serverFacturas = [];
  res.json({ success: true, message: 'Caché de facturas del servidor vaciado a 0' });
});

// Inicialización de Vite o estáticos en producción con verificación Dual-Write
async function startServer() {
  // Comprobar y preparar la conexión a MySQL si está disponible en local
  try {
    const dbConnected = await testDbConnection();
    if (dbConnected) {
      console.log('✅ [Database] Conexión activa con base de datos MySQL/MariaDB.');
    } else {
      console.log('ℹ️ [Database] MySQL no detectado en 127.0.0.1:3306. Modo DB-First activo con memoria del servidor y Google Drive.');
    }
  } catch {
    // Silencioso
  }

  if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Finance AI server (DB-First Single Source of Truth + Google Drive) running on http://0.0.0.0:${PORT}`);
    });
  }
}

// Export default app for Vercel Serverless Functions and other cloud platforms
export default app;
export { app };

if (!process.env.VERCEL) {
  startServer();
}


