// server.ts
import express from "express";
import path2 from "path";
import fs2 from "fs";
import dotenv2 from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";

// src/types.ts
var DEFAULT_DATOS_NEGOCIO = {
  nombre: "Mi Empresa",
  nif: "",
  direccion: "",
  actividad: "",
  sector: "",
  contextoOperativo: "",
  email: "",
  telefono: ""
};
var TIPOS_IMPOSITIVOS_PREDETERMINADOS = [
  // Régimen General Peninsular (IVA)
  {
    id: "iva-21",
    codigo: "IVA_21",
    nombre: "21% - IVA General Peninsular",
    valor: "21%",
    tipoImpuesto: "IVA",
    porcentaje: 21,
    porcentajeRecargo: 5.2,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: "Tipo general peninsular aplicable a la mayor\xEDa de suministros, energ\xEDa, paqueter\xEDa y servicios profesionales.",
    ejemplos: "Electricidad, gas, packaging, maquinaria, asesor\xEDa, reformas, transporte de mercanc\xEDas"
  },
  {
    id: "iva-10",
    codigo: "IVA_10",
    nombre: "10% - IVA Reducido",
    valor: "10%",
    tipoImpuesto: "IVA",
    porcentaje: 10,
    porcentajeRecargo: 1.4,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: "Alimentaci\xF3n humana general, agua, hosteler\xEDa, transporte de viajeros y flores.",
    ejemplos: "L\xE1cteos procesados, mantequillas, nata, chocolates, az\xFAcar, conservas, restaurantes"
  },
  {
    id: "iva-4",
    codigo: "IVA_4",
    nombre: "4% - IVA Superreducido",
    valor: "4%",
    tipoImpuesto: "IVA",
    porcentaje: 4,
    porcentajeRecargo: 0.5,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: "Productos de primera necesidad, pan com\xFAn, harinas panificables, leche y huevos.",
    ejemplos: "Harinas de fuerza y panificables, pan com\xFAn, leche fresca, huevos, legumbres, frutas"
  },
  // Tipos Temporales Reducidos (Alimentos y Aceite de Oliva - RDL)
  {
    id: "iva-0-temp",
    codigo: "IVA_0_TEMP",
    nombre: "0% - IVA Superreducido Temporal (Alimentos B\xE1sicos / Aceite)",
    valor: "0% (Temporal)",
    tipoImpuesto: "IVA",
    porcentaje: 0,
    porcentajeRecargo: 0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    esTemporal: true,
    descripcion: "Tipo temporal al 0% introducido en Espa\xF1a para alimentos b\xE1sicos de primera necesidad y aceite de oliva virgen extra.",
    ejemplos: "Aceite de oliva virgen extra, pan com\xFAn, leches, harinas panificables, frutas y hortalizas"
  },
  {
    id: "iva-2-temp",
    codigo: "IVA_2_TEMP",
    nombre: "2% - IVA Temporal Transitorio (Alimentos B\xE1sicos)",
    valor: "2% (Temporal)",
    tipoImpuesto: "IVA",
    porcentaje: 2,
    porcentajeRecargo: 0.26,
    aplicaRecargoDefecto: false,
    habilitado: true,
    esTemporal: true,
    descripcion: "Tipo transitorio aplicable en tramos de normalizaci\xF3n de alimentos de primera necesidad.",
    ejemplos: "Productos b\xE1sicos en fase de transici\xF3n tributaria seg\xFAn RDL 4/2024"
  },
  {
    id: "iva-5-temp",
    codigo: "IVA_5_TEMP",
    nombre: "5% - IVA Temporal Reducido (Aceites y Pastas)",
    valor: "5% (Temporal)",
    tipoImpuesto: "IVA",
    porcentaje: 5,
    porcentajeRecargo: 0.62,
    aplicaRecargoDefecto: false,
    habilitado: true,
    esTemporal: true,
    descripcion: "Tipo temporal reducido para aceites de semillas y pastas alimenticias.",
    ejemplos: "Pastas alimenticias, aceite de girasol, aceites de semillas comestibles"
  },
  {
    id: "iva-7.5-temp",
    codigo: "IVA_7.5_TEMP",
    nombre: "7.5% - IVA Temporal Transitorio (Pastas y Aceites)",
    valor: "7.5% (Temporal)",
    tipoImpuesto: "IVA",
    porcentaje: 7.5,
    porcentajeRecargo: 1,
    aplicaRecargoDefecto: false,
    habilitado: false,
    esTemporal: true,
    descripcion: "Tipo transitorio intermedio para aceites y pastas antes de retornar al 10%.",
    ejemplos: "Pastas alimenticias y aceites en escalonamiento tributario"
  },
  // Régimen Autonómico Canario (IGIC)
  {
    id: "igic-7",
    codigo: "IGIC_7",
    nombre: "IGIC 7% - Tipo General (Canarias)",
    valor: "IGIC 7%",
    tipoImpuesto: "IGIC",
    porcentaje: 7,
    porcentajeRecargo: 0.7,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: "Tipo general del Impuesto General Indirecto Canario aplicable a la mayor\xEDa de entregas de bienes y servicios.",
    ejemplos: "Mercanc\xEDas comerciales, suministros, paqueter\xEDa, log\xEDstica en el archipi\xE9lago canario"
  },
  {
    id: "igic-3",
    codigo: "IGIC_3",
    nombre: "IGIC 3% - Tipo Reducido (Canarias)",
    valor: "IGIC 3%",
    tipoImpuesto: "IGIC",
    porcentaje: 3,
    porcentajeRecargo: 0.3,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: "Tipo reducido para industria alimentaria elaborada en Canarias, madera, textil y transporte interior.",
    ejemplos: "Alimentos elaborados en Canarias, envases, transporte interior insular"
  },
  {
    id: "igic-0",
    codigo: "IGIC_0",
    nombre: "IGIC 0% - Tipo Cero (Canarias)",
    valor: "IGIC 0%",
    tipoImpuesto: "IGIC",
    porcentaje: 0,
    porcentajeRecargo: 0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: "Tipo cero canario para agua potable, medicamentos, libros y alimentos primarios no transformados.",
    ejemplos: "Entregas de agua potable, productos hortofrut\xEDcolas locales no transformados"
  },
  {
    id: "igic-9.5",
    codigo: "IGIC_9.5",
    nombre: "IGIC 9.5% - Tipo Incrementado (Canarias)",
    valor: "IGIC 9.5%",
    tipoImpuesto: "IGIC",
    porcentaje: 9.5,
    porcentajeRecargo: 0.95,
    aplicaRecargoDefecto: false,
    habilitado: false,
    descripcion: "Tipo incrementado aplicable a determinados veh\xEDculos y maquinaria espec\xEDfica en Canarias.",
    ejemplos: "Veh\xEDculos comerciales con emisiones espec\xEDficas, maquinaria industrial"
  },
  {
    id: "igic-15",
    codigo: "IGIC_15",
    nombre: "IGIC 15% - Tipo Especial (Canarias)",
    valor: "IGIC 15%",
    tipoImpuesto: "IGIC",
    porcentaje: 15,
    porcentajeRecargo: 1.5,
    aplicaRecargoDefecto: false,
    habilitado: false,
    descripcion: "Tipo especial para bebidas alcoh\xF3licas, labores de tabaco y bienes suntuarios.",
    ejemplos: "Bebidas espirituosas, art\xEDculos de joyer\xEDa y lujo"
  },
  // Régimen Especial de Ceuta y Melilla (IPSI)
  {
    id: "ipsi-0.5",
    codigo: "IPSI_0.5",
    nombre: "IPSI 0.5% - Tipo Superreducido (Ceuta y Melilla)",
    valor: "IPSI 0.5%",
    tipoImpuesto: "IPSI",
    porcentaje: 0.5,
    porcentajeRecargo: 0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: "Impuesto sobre la Producci\xF3n, los Servicios y la Importaci\xF3n (IPSI). Operaciones bancarias y suministros esenciales.",
    ejemplos: "Operaciones de seguro, suministros de agua y energ\xEDa de primera necesidad"
  },
  {
    id: "ipsi-1",
    codigo: "IPSI_1",
    nombre: "IPSI 1% - Tipo Reducido Alimentos B\xE1sicos (Ceuta y Melilla)",
    valor: "IPSI 1%",
    tipoImpuesto: "IPSI",
    porcentaje: 1,
    porcentajeRecargo: 0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: "Alimentos b\xE1sicos de primera necesidad, panader\xEDa, leche, huevos y transporte urbano.",
    ejemplos: "Pan com\xFAn, harinas, leche fresca, frutas, verduras, transporte colectivo urbano"
  },
  {
    id: "ipsi-2",
    codigo: "IPSI_2",
    nombre: "IPSI 2% - Tipo Reducido Vivienda y Obras (Ceuta y Melilla)",
    valor: "IPSI 2%",
    tipoImpuesto: "IPSI",
    porcentaje: 2,
    porcentajeRecargo: 0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: "Obras de alba\xF1iler\xEDa, construcci\xF3n y reparaci\xF3n de inmuebles, materiales b\xE1sicos.",
    ejemplos: "Materiales de construcci\xF3n, reformas de locales comerciales y viviendas"
  },
  {
    id: "ipsi-4",
    codigo: "IPSI_4",
    nombre: "IPSI 4% - Tipo General (Ceuta y Melilla)",
    valor: "IPSI 4%",
    tipoImpuesto: "IPSI",
    porcentaje: 4,
    porcentajeRecargo: 0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: "Tipo general en Ceuta y Melilla aplicable a hosteler\xEDa, servicios profesionales y comercio.",
    ejemplos: "Restauraci\xF3n, hosteler\xEDa, servicios inform\xE1ticos, consultor\xEDa, suministros comerciales"
  },
  {
    id: "ipsi-8",
    codigo: "IPSI_8",
    nombre: "IPSI 8% - Tipo Incrementado (Ceuta y Melilla)",
    valor: "IPSI 8%",
    tipoImpuesto: "IPSI",
    porcentaje: 8,
    porcentajeRecargo: 0,
    aplicaRecargoDefecto: false,
    habilitado: false,
    descripcion: "Veh\xEDculos de motor, embarcaciones y bienes semilujo en Ceuta y Melilla.",
    ejemplos: "Veh\xEDculos comerciales de alta potencia, electr\xF3nica especializada"
  },
  {
    id: "ipsi-10",
    codigo: "IPSI_10",
    nombre: "IPSI 10% - Tipo Especial (Ceuta y Melilla)",
    valor: "IPSI 10%",
    tipoImpuesto: "IPSI",
    porcentaje: 10,
    porcentajeRecargo: 0,
    aplicaRecargoDefecto: false,
    habilitado: false,
    descripcion: "Juegos de suerte, envite o azar, art\xEDculos de lujo y suntuarios.",
    ejemplos: "Art\xEDculos de joyer\xEDa, tabaco y bebidas alcoh\xF3licas de alta graduaci\xF3n"
  },
  // Operaciones Exentas
  {
    id: "exento-0",
    codigo: "EXENTO_0",
    nombre: "0% - Operaci\xF3n Exenta / Inversi\xF3n Sujeto Pasivo",
    valor: "0% Exento",
    tipoImpuesto: "EXENTO",
    porcentaje: 0,
    porcentajeRecargo: 0,
    aplicaRecargoDefecto: false,
    habilitado: true,
    descripcion: "Entregas exentas (art. 20 LIVA), adquisiciones intracomunitarias (VIES) o inversi\xF3n del sujeto pasivo.",
    ejemplos: "Servicios financieros, seguros, proveedores comunitarios intracomunitarios UE"
  }
];
var TIPOS_RETENCION_IRPF_PREDETERMINADOS = [
  {
    id: "irpf-15-prof",
    codigo: "IRPF_15_PROF",
    nombre: "15% - Retenci\xF3n Profesional General (Mod. 111)",
    valor: "15%",
    porcentaje: 15,
    concepto: "PROFESIONAL",
    modeloAEAT: "111",
    habilitado: true,
    descripcion: "Tipo de retenci\xF3n est\xE1ndar en Espa\xF1a aplicable a profesionales aut\xF3nomos colegiados y actividades profesionales (IAE Secci\xF3n 2 y 3).",
    ejemplos: "Servicios de asesor\xEDa fiscal, contable, abogados, desarrollo de software, dise\xF1o, consultor\xEDa t\xE9cnica"
  },
  {
    id: "irpf-7-nuevo-autonomo",
    codigo: "IRPF_7_NUEVO",
    nombre: "7% - Nuevos Aut\xF3nomos / Tipo Reducido (Mod. 111)",
    valor: "7%",
    porcentaje: 7,
    concepto: "PROFESIONAL",
    modeloAEAT: "111",
    habilitado: true,
    descripcion: "Tipo reducido aplicable a profesionales aut\xF3nomos durante el a\xF1o de inicio de su actividad y los dos ejercicios posteriores (art. 95.1 RIRPF).",
    ejemplos: "Profesionales en sus primeros 3 a\xF1os de actividad que hayan comunicado el tipo reducido"
  },
  {
    id: "irpf-19-alquiler",
    codigo: "IRPF_19_ALQUILER",
    nombre: "19% - Arrendamiento de Inmuebles Urbanos (Mod. 115)",
    valor: "19%",
    porcentaje: 19,
    concepto: "ARRENDAMIENTO",
    modeloAEAT: "115",
    habilitado: true,
    descripcion: "Retenci\xF3n obligatoria sobre el alquiler de locales comerciales, oficinas, almacenes o naves industriales (art. 62 RIRPF).",
    ejemplos: "Alquiler de local comercial, oficina de la empresa, almac\xE9n log\xEDstico"
  },
  {
    id: "irpf-2-agrario",
    codigo: "IRPF_2_AGRARIO",
    nombre: "2% - Actividades Agr\xEDcolas y Ganaderas (Mod. 111)",
    valor: "2%",
    porcentaje: 2,
    concepto: "AGRARIO",
    modeloAEAT: "111",
    habilitado: true,
    descripcion: "Retenci\xF3n aplicable a entregas de productos de agricultura, ganader\xEDa de cebo y avicultura.",
    ejemplos: "Productores agropecuarios, ganader\xEDa de cebo, avicultura"
  },
  {
    id: "irpf-1-modulos",
    codigo: "IRPF_1_MODULOS",
    nombre: "1% - Actividades en M\xF3dulos / Ciertos Sectores (Mod. 111)",
    valor: "1%",
    porcentaje: 1,
    concepto: "OTRO",
    modeloAEAT: "111",
    habilitado: true,
    descripcion: "Retenci\xF3n del 1% para determinadas actividades empresariales sujetas a retenci\xF3n en estimaci\xF3n objetiva (m\xF3dulos).",
    ejemplos: "Transporte de mercanc\xEDas por carretera, carpinter\xEDa, cerrajer\xEDa, pintura"
  },
  {
    id: "irpf-19-capital",
    codigo: "IRPF_19_CAPITAL",
    nombre: "19% - Capital Mobiliario / Licencias / Royalties (Mod. 123)",
    valor: "19%",
    porcentaje: 19,
    concepto: "CAPITAL_MOBILIARIO",
    modeloAEAT: "123",
    habilitado: false,
    descripcion: "Retenci\xF3n sobre cesi\xF3n de derechos de autor, licencias de propiedad intelectual o industrial y dividendos.",
    ejemplos: "Cesi\xF3n de marcas, patentes o derechos de explotaci\xF3n de propiedad intelectual"
  }
];
var DEFAULT_PARAMETROS_SISTEMA = {
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
  periodoDashboardPredeterminado: "ano",
  anoFiscalReferencia: 2026,
  topProveedoresRanking: 5,
  tipoIvaPredeterminado: "21%",
  regimenFiscalEmpresa: "IVA_PENINSULAR",
  regimenFiscalPredeterminado: "IVA_PENINSULAR",
  aplicaRecargoEquivalenciaDefecto: false,
  permitirIvaCeroOExento: true,
  mostrarTiposTemporales: true,
  mostrarTiposCanarios: true,
  mostrarTiposIpsi: true,
  tiposImpositivos: TIPOS_IMPOSITIVOS_PREDETERMINADOS,
  // Retenciones IRPF
  habilitarRetencionesIRPF: true,
  porcentajeIrpfPredeterminado: 15,
  tipoIrpfRetencionPredeterminado: "15%",
  conceptoIrpfPredeterminado: "PROFESIONAL",
  tiposRetencionIRPF: TIPOS_RETENCION_IRPF_PREDETERMINADOS
};

// src/db.ts
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";

// src/data/mockData.ts
var INITIAL_PROVEEDORES = [];
var INITIAL_FACTURAS = [];
var INITIAL_ALERTAS = [];
var INITIAL_ANALISIS_EJECUTIVO = {
  id: "ANALISIS-ACTUAL",
  fechaGeneracion: (/* @__PURE__ */ new Date()).toISOString(),
  estadoGeneral: "No hay facturas registradas todav\xEDa. La plataforma est\xE1 lista para procesar tus documentos y tickets para generar un an\xE1lisis financiero personalizado.",
  principalesGastos: [
    "A\xFAn no hay categor\xEDas de gasto con datos registrados."
  ],
  cambiosImportantes: [
    "El historial de compras se actualizar\xE1 conforme subas tus primeras facturas."
  ],
  alertas: [
    "No existen alertas activas en el sistema."
  ],
  oportunidadesAhorro: [
    "Registra tus facturas para que la IA identifique oportunidades de ahorro y optimizaci\xF3n de costes."
  ],
  tresAcciones: [],
  prioridadSemana: "Sube o escanea tu primera factura de compra para iniciar el control de costes y liquidaci\xF3n fiscal."
};

// src/utils/sqlGenerator.ts
function escapeSql(val) {
  if (val === null || val === void 0) return "NULL";
  if (typeof val === "number") return isNaN(val) ? "0" : String(val);
  if (typeof val === "boolean") return val ? "1" : "0";
  return "'" + String(val).replace(/\\/g, "\\\\").replace(/'/g, "\\'").replace(/\n/g, "\\n").replace(/\r/g, "\\r") + "'";
}
function sanitizeSqlDate(val) {
  if (!val) return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split("T")[0];
  return (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
}
function generarScriptSqlCompleto(options = {}, provsArg = []) {
  let opts;
  if (Array.isArray(options)) {
    opts = {
      facturas: options,
      proveedores: provsArg
    };
  } else {
    opts = options || {};
  }
  const dbName = opts.databaseName || "finance_ai_db";
  const facturas = Array.isArray(opts.facturas) && opts.facturas.length > 0 ? opts.facturas : INITIAL_FACTURAS;
  const proveedores = Array.isArray(opts.proveedores) && opts.proveedores.length > 0 ? opts.proveedores : INITIAL_PROVEEDORES;
  const alertas = Array.isArray(opts.alertas) ? opts.alertas : INITIAL_ALERTAS;
  const negocio = opts.datosNegocio && opts.datosNegocio.nombre ? opts.datosNegocio : DEFAULT_DATOS_NEGOCIO;
  const parametros = opts.parametros && opts.parametros.anoFiscalReferencia ? opts.parametros : DEFAULT_PARAMETROS_SISTEMA;
  const categorias = Array.isArray(opts.categorias) && opts.categorias.length > 0 ? opts.categorias : [
    { id: "materias-primas", nombre: "Materias Primas", descripcion: "Harinas, l\xE1cteos, az\xFAcares, ingredientes base y consumibles directos.", color: "#f43f5e", esPredeterminada: true },
    { id: "suministros-y-energia", nombre: "Suministros y Energ\xEDa", descripcion: "Electricidad, gas, agua, telecomunicaciones e internet.", color: "#0ea5e9", esPredeterminada: true },
    { id: "envases-y-embalajes", nombre: "Envases y Embalajes", descripcion: "Cajas kraft, bobinas, bandejas, film, bolsas y etiquetas.", color: "#f59e0b", esPredeterminada: true },
    { id: "logistica-y-transporte", nombre: "Log\xEDstica y Transporte", descripcion: "Portes, transporte frigor\xEDfico, env\xEDos y fletes.", color: "#10b981", esPredeterminada: true },
    { id: "mantenimiento-y-maquinaria", nombre: "Mantenimiento y Maquinaria", descripcion: "Reparaciones de maquinaria, revisiones y recambios.", color: "#8b5cf6", esPredeterminada: true },
    { id: "servicios-y-gestion", nombre: "Servicios y Gesti\xF3n", descripcion: "Asesor\xEDa contable, fiscal y laboral, licencias de software y seguros.", color: "#ec4899", esPredeterminada: true }
  ];
  const facturasProvNombres = new Set(
    facturas.map((f) => (f.nombreProveedor || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, ""))
  );
  const provMap = /* @__PURE__ */ new Map();
  proveedores.forEach((p) => {
    const norm = (p.nombreProveedor || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    if (norm && (facturasProvNombres.size === 0 || facturasProvNombres.has(norm))) {
      if (!provMap.has(norm)) {
        provMap.set(norm, { ...p });
      } else {
        const exist = provMap.get(norm);
        exist.importeMensual = Math.max(Number(exist.importeMensual || 0), Number(p.importeMensual || 0));
      }
    }
  });
  facturas.forEach((f) => {
    const nom = (f.nombreProveedor || "").trim();
    const norm = nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    if (norm && !provMap.has(norm)) {
      provMap.set(norm, {
        idProveedor: f.idProveedor || "PROV-GEN",
        nombreProveedor: nom,
        importeMensual: Number(f.total || 0),
        frecuencia: "Mensual",
        riesgoDependencia: "Bajo",
        tiempoMedioEntrega: "24-48h",
        cif: "",
        contacto: "",
        productosSuministrados: f.concepto || ""
      });
    }
  });
  const proveedoresConsolidados = Array.from(provMap.values());
  const lines = [
    `-- ============================================================`,
    `-- FINANCE AI \u2014 Exportaci\xF3n SQL Completa para MySQL / MariaDB`,
    `-- Compatible con phpMyAdmin, MySQL Workbench y MySQL CLI (XAMPP)`,
    `-- Generado autom\xE1ticamente: ${(/* @__PURE__ */ new Date()).toISOString()}`,
    `-- Empresa: ${negocio.nombre}`,
    `-- Total Facturas: ${facturas.length} | Proveedores: ${proveedoresConsolidados.length}`,
    `-- ============================================================`,
    ``,
    `SET FOREIGN_KEY_CHECKS = 0;`,
    `SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";`,
    `SET time_zone = "+00:00";`,
    ``,
    `CREATE DATABASE IF NOT EXISTS \`${dbName}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    `USE \`${dbName}\`;`,
    ``,
    `-- ------------------------------------------------------------`,
    `-- 1. Estructura de la tabla: datos_negocio`,
    `-- ------------------------------------------------------------`,
    `CREATE TABLE IF NOT EXISTS \`datos_negocio\` (`,
    `  \`id\` INT PRIMARY KEY AUTO_INCREMENT,`,
    `  \`nombre\` VARCHAR(255) NOT NULL,`,
    `  \`nif\` VARCHAR(50) NOT NULL,`,
    `  \`direccion\` TEXT,`,
    `  \`actividad\` VARCHAR(255),`,
    `  \`sector\` VARCHAR(255),`,
    `  \`contexto_operativo\` TEXT,`,
    `  \`email\` VARCHAR(150),`,
    `  \`telefono\` VARCHAR(50),`,
    `  \`actualizado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `-- ------------------------------------------------------------`,
    `-- 2. Estructura de la tabla: categorias_gasto`,
    `-- ------------------------------------------------------------`,
    `CREATE TABLE IF NOT EXISTS \`categorias_gasto\` (`,
    `  \`id\` VARCHAR(64) PRIMARY KEY,`,
    `  \`nombre\` VARCHAR(150) NOT NULL,`,
    `  \`descripcion\` TEXT,`,
    `  \`color\` VARCHAR(20) DEFAULT '#0ea5e9',`,
    `  \`es_predeterminada\` BOOLEAN DEFAULT FALSE,`,
    `  \`creado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `-- ------------------------------------------------------------`,
    `-- 3. Estructura de la tabla: proveedores`,
    `-- ------------------------------------------------------------`,
    `CREATE TABLE IF NOT EXISTS \`proveedores\` (`,
    `  \`id_proveedor\` VARCHAR(64) PRIMARY KEY,`,
    `  \`nombre_proveedor\` VARCHAR(255) NOT NULL,`,
    `  \`cif\` VARCHAR(50),`,
    `  \`contacto\` VARCHAR(255),`,
    `  \`productos_suministrados\` TEXT,`,
    `  \`importe_mensual\` DECIMAL(12,2) DEFAULT 0.00,`,
    `  \`frecuencia\` VARCHAR(50) DEFAULT 'Mensual',`,
    `  \`riesgo_dependencia\` ENUM('Bajo', 'Medio', 'Alto') DEFAULT 'Bajo',`,
    `  \`tiempo_medio_entrega\` VARCHAR(100),`,
    `  \`creado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`,
    `  \`actualizado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `-- ------------------------------------------------------------`,
    `-- 4. Estructura de la tabla: facturas`,
    `-- ------------------------------------------------------------`,
    `CREATE TABLE IF NOT EXISTS \`facturas\` (`,
    `  \`id_factura\` VARCHAR(100) PRIMARY KEY,`,
    `  \`fecha_emision\` DATE NOT NULL,`,
    `  \`id_proveedor\` VARCHAR(64),`,
    `  \`nombre_proveedor\` VARCHAR(255) NOT NULL,`,
    `  \`concepto\` TEXT,`,
    `  \`importe\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,`,
    `  \`fecha_vencimiento\` DATE,`,
    `  \`estado\` ENUM('Pendiente', 'Pagada', 'Vencida') DEFAULT 'Pendiente',`,
    `  \`fecha_pago\` VARCHAR(50) DEFAULT 'Pendiente de confirmar',`,
    `  \`base_imponible\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,`,
    `  \`tipos_iva\` VARCHAR(50) DEFAULT '21%',`,
    `  \`cuota_iva\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,`,
    `  \`regimen_fiscal\` VARCHAR(100),`,
    `  \`aplica_recargo_equivalencia\` BOOLEAN DEFAULT FALSE,`,
    `  \`tipo_recargo_equivalencia\` VARCHAR(50),`,
    `  \`cuota_recargo_equivalencia\` DECIMAL(12,2) DEFAULT 0.00,`,
    `  \`aplica_retencion_irpf\` BOOLEAN DEFAULT FALSE,`,
    `  \`tipo_retencion_irpf\` VARCHAR(50),`,
    `  \`porcentaje_irpf\` DECIMAL(5,2) DEFAULT 0.00,`,
    `  \`cuota_irpf\` DECIMAL(12,2) DEFAULT 0.00,`,
    `  \`concepto_retencion_irpf\` VARCHAR(50),`,
    `  \`total\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,`,
    `  \`categoria_gasto\` VARCHAR(150),`,
    `  \`categoria_gasto_justificacion\` TEXT,`,
    `  \`notas\` TEXT,`,
    `  \`archivo_nombre\` VARCHAR(255),`,
    `  \`archivo_ruta\` TEXT,`,
    `  \`sincronizado_sheets\` BOOLEAN DEFAULT FALSE,`,
    `  \`creado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`,
    `  \`actualizado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,`,
    `  INDEX idx_proveedor (\`id_proveedor\`),`,
    `  INDEX idx_fecha (\`fecha_emision\`),`,
    `  INDEX idx_estado (\`estado\`)`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `-- ------------------------------------------------------------`,
    `-- 5. Estructura de la tabla: lineas_factura`,
    `-- ------------------------------------------------------------`,
    `CREATE TABLE IF NOT EXISTS \`lineas_factura\` (`,
    `  \`id\` INT PRIMARY KEY AUTO_INCREMENT,`,
    `  \`id_factura\` VARCHAR(100) NOT NULL,`,
    `  \`nombre_producto\` VARCHAR(255) NOT NULL,`,
    `  \`cantidad\` DECIMAL(10,2) NOT NULL DEFAULT 1.00,`,
    `  \`unidad\` VARCHAR(50) DEFAULT 'ud',`,
    `  \`precio_unitario\` DECIMAL(12,4) NOT NULL DEFAULT 0.00,`,
    `  \`subtotal\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,`,
    `  FOREIGN KEY (\`id_factura\`) REFERENCES \`facturas\`(\`id_factura\`) ON DELETE CASCADE`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `-- ------------------------------------------------------------`,
    `-- 6. Estructura de la tabla: historico_precios`,
    `-- ------------------------------------------------------------`,
    `CREATE TABLE IF NOT EXISTS \`historico_precios\` (`,
    `  \`id\` INT PRIMARY KEY AUTO_INCREMENT,`,
    `  \`nombre_producto\` VARCHAR(255) NOT NULL,`,
    `  \`id_proveedor\` VARCHAR(64) NOT NULL,`,
    `  \`nombre_proveedor\` VARCHAR(255) NOT NULL,`,
    `  \`id_factura\` VARCHAR(100) NOT NULL,`,
    `  \`fecha\` DATE NOT NULL,`,
    `  \`precio_unitario\` DECIMAL(12,4) NOT NULL,`,
    `  \`unidad\` VARCHAR(50) DEFAULT 'ud',`,
    `  \`creado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`,
    `  INDEX idx_hist_producto (\`nombre_producto\`),`,
    `  INDEX idx_hist_proveedor (\`id_proveedor\`),`,
    `  INDEX idx_hist_fecha (\`fecha\`)`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `-- ------------------------------------------------------------`,
    `-- 7. Estructura de la tabla: alertas`,
    `-- ------------------------------------------------------------`,
    `CREATE TABLE IF NOT EXISTS \`alertas\` (`,
    `  \`id\` VARCHAR(100) PRIMARY KEY,`,
    `  \`tipo\` VARCHAR(100) NOT NULL,`,
    `  \`nivel\` ENUM('critica', 'alta', 'media', 'informativa') DEFAULT 'media',`,
    `  \`titulo\` VARCHAR(255) NOT NULL,`,
    `  \`descripcion\` TEXT,`,
    `  \`fecha\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`,
    `  \`estado\` ENUM('activa', 'resuelta', 'ignorada') DEFAULT 'activa',`,
    `  \`datos_relacionados\` LONGTEXT`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `-- ------------------------------------------------------------`,
    `-- 8. Estructura de la tabla: configuracion_parametros`,
    `-- ------------------------------------------------------------`,
    `CREATE TABLE IF NOT EXISTS \`configuracion_parametros\` (`,
    `  \`id\` INT PRIMARY KEY AUTO_INCREMENT,`,
    `  \`umbral_subida_moderada_pct\` DECIMAL(5,2) DEFAULT 8.00,`,
    `  \`umbral_subida_critica_pct\` DECIMAL(5,2) DEFAULT 15.00,`,
    `  \`umbral_concentracion_proveedor_pct\` DECIMAL(5,2) DEFAULT 30.00,`,
    `  \`notificar_concentracion_proveedor\` BOOLEAN DEFAULT TRUE,`,
    `  \`dias_anticipacion_vencimiento\` INT DEFAULT 3,`,
    `  \`notificar_facturas_vencidas\` BOOLEAN DEFAULT TRUE,`,
    `  \`regimen_fiscal_predeterminado\` VARCHAR(100) DEFAULT 'R\xE9gimen General Peninsular',`,
    `  \`tipo_retencion_predeterminada\` VARCHAR(100) DEFAULT '15% Profesional',`,
    `  \`actualizado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `-- ------------------------------------------------------------`,
    `-- 9. Tablas de An\xE1lisis, Chat e Integraciones`,
    `-- ------------------------------------------------------------`,
    `CREATE TABLE IF NOT EXISTS \`analisis_financieros_ia\` (`,
    `  \`id\` VARCHAR(64) PRIMARY KEY,`,
    `  \`fecha_generacion\` DATETIME NOT NULL,`,
    `  \`estado_general\` TEXT NOT NULL,`,
    `  \`tres_acciones\` LONGTEXT NOT NULL,`,
    `  \`oportunidades_ahorro\` LONGTEXT,`,
    `  \`prioridad_semana\` TEXT,`,
    `  \`total_gasto_analizado\` DECIMAL(12,2) DEFAULT 0.00,`,
    `  \`creado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `CREATE TABLE IF NOT EXISTS \`historial_chat_ia\` (`,
    `  \`id\` VARCHAR(64) PRIMARY KEY,`,
    `  \`emisor\` ENUM('usuario', 'asistente') NOT NULL,`,
    `  \`mensaje\` TEXT NOT NULL,`,
    `  \`sugerencias\` LONGTEXT,`,
    `  \`creado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`,
    `  INDEX idx_chat_creado (\`creado_en\`)`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `CREATE TABLE IF NOT EXISTS \`declaraciones_aeat\` (`,
    `  \`id\` VARCHAR(64) PRIMARY KEY,`,
    `  \`modelo\` VARCHAR(10) NOT NULL,`,
    `  \`ejercicio\` INT NOT NULL,`,
    `  \`periodo\` VARCHAR(10) NOT NULL,`,
    `  \`estado\` ENUM('Borrador', 'Calculado', 'Presentado') DEFAULT 'Borrador',`,
    `  \`resultado_declaracion\` DECIMAL(12,2) NOT NULL DEFAULT 0.00,`,
    `  \`datos_casillas\` LONGTEXT,`,
    `  \`csv_justificante\` VARCHAR(100),`,
    `  \`fecha_presentacion\` DATE,`,
    `  \`creado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,`,
    `  \`actualizado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,`,
    `  INDEX idx_aeat_modelo (\`modelo\`),`,
    `  INDEX idx_aeat_ejercicio (\`ejercicio\`)`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `CREATE TABLE IF NOT EXISTS \`integraciones_google\` (`,
    `  \`id\` INT PRIMARY KEY AUTO_INCREMENT,`,
    `  \`sheet_id\` VARCHAR(150),`,
    `  \`endpoint_url\` TEXT,`,
    `  \`drive_folder_id\` VARCHAR(150),`,
    `  \`auto_sync\` BOOLEAN DEFAULT TRUE,`,
    `  \`is_sheet_data_active\` BOOLEAN DEFAULT FALSE,`,
    `  \`ultima_sincronizacion\` DATETIME,`,
    `  \`actualizado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `-- ============================================================`,
    `-- INSERCI\xD3N DE DATOS: IDENTIDAD Y CONFIGURACI\xD3N`,
    `-- ============================================================`,
    ``,
    `-- Datos del Negocio`,
    `INSERT INTO \`datos_negocio\` (\`id\`, \`nombre\`, \`nif\`, \`direccion\`, \`actividad\`, \`sector\`, \`contexto_operativo\`, \`email\`, \`telefono\`)`,
    `VALUES (1, ${escapeSql(negocio.nombre)}, ${escapeSql(negocio.nif)}, ${escapeSql(negocio.direccion)}, ${escapeSql(negocio.actividad)}, ${escapeSql(negocio.sector)}, ${escapeSql(negocio.contextoOperativo)}, ${escapeSql(negocio.email)}, ${escapeSql(negocio.telefono)})`,
    `ON DUPLICATE KEY UPDATE`,
    `  \`nombre\` = VALUES(\`nombre\`),`,
    `  \`nif\` = VALUES(\`nif\`),`,
    `  \`direccion\` = VALUES(\`direccion\`),`,
    `  \`actividad\` = VALUES(\`actividad\`),`,
    `  \`sector\` = VALUES(\`sector\`),`,
    `  \`contexto_operativo\` = VALUES(\`contexto_operativo\`),`,
    `  \`email\` = VALUES(\`email\`),`,
    `  \`telefono\` = VALUES(\`telefono\`);`,
    ``,
    `-- Categor\xEDas de Gasto`
  ];
  categorias.forEach((cat) => {
    lines.push(
      `INSERT INTO \`categorias_gasto\` (\`id\`, \`nombre\`, \`descripcion\`, \`color\`, \`es_predeterminada\`) VALUES (${escapeSql(cat.id)}, ${escapeSql(cat.nombre)}, ${escapeSql(cat.descripcion || "")}, ${escapeSql(cat.color || "#0ea5e9")}, ${cat.esPredeterminada ? 1 : 0}) ON DUPLICATE KEY UPDATE \`nombre\` = VALUES(\`nombre\`), \`descripcion\` = VALUES(\`descripcion\`), \`color\` = VALUES(\`color\`);`
    );
  });
  lines.push(``);
  lines.push(`-- Par\xE1metros del Sistema`);
  lines.push(
    `INSERT INTO \`configuracion_parametros\` (\`id\`, \`umbral_subida_moderada_pct\`, \`umbral_subida_critica_pct\`, \`umbral_concentracion_proveedor_pct\`, \`notificar_concentracion_proveedor\`, \`dias_anticipacion_vencimiento\`, \`notificar_facturas_vencidas\`, \`regimen_fiscal_predeterminado\`, \`tipo_retencion_predeterminada\`) VALUES (1, ${parametros.umbralSubidaModeradaPct || 8}, ${parametros.umbralSubidaCriticaPct || 15}, ${parametros.umbralConcentracionProveedorPct || 30}, ${parametros.notificarConcentracionProveedor !== false ? 1 : 0}, ${parametros.diasAnticipacionVencimiento || 3}, ${parametros.notificarFacturasVencidas !== false ? 1 : 0}, ${escapeSql(parametros.regimenFiscalPredeterminado || "R\xE9gimen General Peninsular")}, ${escapeSql(parametros.tipoRetencionPredeterminada || "15% Profesional")}) ON DUPLICATE KEY UPDATE \`umbral_subida_moderada_pct\` = VALUES(\`umbral_subida_moderada_pct\`), \`umbral_subida_critica_pct\` = VALUES(\`umbral_subida_critica_pct\`);`
  );
  lines.push(``);
  lines.push(`-- ============================================================`);
  lines.push(`-- INSERCI\xD3N DE PROVEEDORES`);
  lines.push(`-- ============================================================`);
  proveedoresConsolidados.forEach((p) => {
    const idProv = String(p.idProveedor || "").trim();
    if (!idProv) return;
    lines.push(
      `INSERT INTO \`proveedores\` (\`id_proveedor\`, \`nombre_proveedor\`, \`cif\`, \`contacto\`, \`productos_suministrados\`, \`importe_mensual\`, \`frecuencia\`, \`riesgo_dependencia\`, \`tiempo_medio_entrega\`) VALUES (${escapeSql(idProv)}, ${escapeSql(p.nombreProveedor)}, ${escapeSql(p.cif || "")}, ${escapeSql(p.contacto || "")}, ${escapeSql(p.productosSuministrados || "")}, ${Number(p.importeMensual || 0)}, ${escapeSql(p.frecuencia || "Mensual")}, ${escapeSql(p.riesgoDependencia || "Bajo")}, ${escapeSql(p.tiempoMedioEntrega || "")}) ON DUPLICATE KEY UPDATE \`nombre_proveedor\` = VALUES(\`nombre_proveedor\`), \`importe_mensual\` = VALUES(\`importe_mensual\`);`
    );
  });
  lines.push(``);
  lines.push(`-- ============================================================`);
  lines.push(`-- INSERCI\xD3N DE FACTURAS Y L\xCDNEAS DE DETALLE`);
  lines.push(`-- ============================================================`);
  facturas.forEach((f) => {
    const idFactura = String(f.idFactura || "").trim();
    if (!idFactura) return;
    const fechaEmisionSql = sanitizeSqlDate(f.fechaEmision);
    const fechaVencimientoSql = sanitizeSqlDate(f.fechaVencimiento || f.fechaEmision);
    const idProveedor = String(f.idProveedor || "PROV-GEN").trim();
    const nombreProveedor = String(f.nombreProveedor || "Proveedor General").trim();
    const total = Number(f.total || 0);
    const importe = Number(f.importe || f.baseImponible || 0);
    const baseImponible = Number(f.baseImponible || importe);
    const cuotaIVA = Number(f.cuotaIVA || 0);
    const cuotaRecargo = Number(f.cuotaRecargoEquivalencia || 0);
    const cuotaIRPF = Number(f.cuotaIRPF || 0);
    const porcentajeIRPF = Number(f.porcentajeIRPF || 0);
    lines.push(
      `INSERT INTO \`facturas\` (\`id_factura\`, \`fecha_emision\`, \`id_proveedor\`, \`nombre_proveedor\`, \`concepto\`, \`importe\`, \`fecha_vencimiento\`, \`estado\`, \`fecha_pago\`, \`base_imponible\`, \`tipos_iva\`, \`cuota_iva\`, \`regimen_fiscal\`, \`aplica_recargo_equivalencia\`, \`tipo_recargo_equivalencia\`, \`cuota_recargo_equivalencia\`, \`aplica_retencion_irpf\`, \`tipo_retencion_irpf\`, \`porcentaje_irpf\`, \`cuota_irpf\`, \`concepto_retencion_irpf\`, \`total\`, \`categoria_gasto\`, \`categoria_gasto_justificacion\`, \`notas\`, \`archivo_nombre\`, \`archivo_ruta\`, \`sincronizado_sheets\`) VALUES (${escapeSql(idFactura)}, ${escapeSql(fechaEmisionSql)}, ${escapeSql(idProveedor)}, ${escapeSql(nombreProveedor)}, ${escapeSql(f.concepto || "Factura")}, ${importe}, ${escapeSql(fechaVencimientoSql)}, ${escapeSql(f.estado || "Pendiente")}, ${escapeSql(f.fechaPago || "Pendiente de confirmar")}, ${baseImponible}, ${escapeSql(f.tiposIVA || "21%")}, ${cuotaIVA}, ${escapeSql(f.regimenFiscal || "R\xE9gimen General Peninsular")}, ${f.aplicaRecargoEquivalencia ? 1 : 0}, ${escapeSql(f.tipoRecargoEquivalencia || "")}, ${cuotaRecargo}, ${f.aplicaRetencionIRPF ? 1 : 0}, ${escapeSql(f.tipoRetencionIRPF || "")}, ${porcentajeIRPF}, ${cuotaIRPF}, ${escapeSql(f.conceptoRetencionIRPF || "")}, ${total}, ${escapeSql(f.categoriaGasto || "Materias Primas")}, ${escapeSql(f.categoriaGastoJustificacion || "")}, ${escapeSql(f.notas || "")}, ${escapeSql(f.archivoNombre || `${idFactura}.pdf`)}, ${escapeSql(f.driveFileUrl || "")}, 1) ON DUPLICATE KEY UPDATE \`total\` = VALUES(\`total\`), \`estado\` = VALUES(\`estado\`), \`base_imponible\` = VALUES(\`base_imponible\`);`
    );
    const lineas = Array.isArray(f.lineas) && f.lineas.length > 0 ? f.lineas : [{
      nombreProducto: f.concepto || "Producto General",
      cantidad: 1,
      unidad: "ud",
      precioUnitario: baseImponible,
      subtotal: baseImponible
    }];
    lineas.forEach((l) => {
      const prodNom = String(l.nombreProducto || "Producto General").trim();
      const cant = Number(l.cantidad || 1);
      const uni = String(l.unidad || "ud");
      const pUnit = Number(l.precioUnitario || 0);
      const sub = Number(l.subtotal || cant * pUnit);
      lines.push(
        `INSERT INTO \`lineas_factura\` (\`id_factura\`, \`nombre_producto\`, \`cantidad\`, \`unidad\`, \`precio_unitario\`, \`subtotal\`) VALUES (${escapeSql(idFactura)}, ${escapeSql(prodNom)}, ${cant}, ${escapeSql(uni)}, ${pUnit}, ${sub});`
      );
      lines.push(
        `INSERT INTO \`historico_precios\` (\`nombre_producto\`, \`id_proveedor\`, \`nombre_proveedor\`, \`id_factura\`, \`fecha\`, \`precio_unitario\`, \`unidad\`) VALUES (${escapeSql(prodNom)}, ${escapeSql(idProveedor)}, ${escapeSql(nombreProveedor)}, ${escapeSql(idFactura)}, ${escapeSql(fechaEmisionSql)}, ${pUnit}, ${escapeSql(uni)});`
      );
    });
  });
  lines.push(``);
  lines.push(`-- ============================================================`);
  lines.push(`-- INSERCI\xD3N DE ALERTAS`);
  lines.push(`-- ============================================================`);
  alertas.forEach((a) => {
    lines.push(
      `INSERT INTO \`alertas\` (\`id\`, \`tipo\`, \`nivel\`, \`titulo\`, \`descripcion\`, \`estado\`) VALUES (${escapeSql(a.id)}, ${escapeSql(a.tipo)}, ${escapeSql(a.nivel || "media")}, ${escapeSql(a.titulo)}, ${escapeSql(a.descripcion)}, ${escapeSql(a.estado || "activa")}) ON DUPLICATE KEY UPDATE \`estado\` = VALUES(\`estado\`);`
    );
  });
  lines.push(``);
  lines.push(`SET FOREIGN_KEY_CHECKS = 1;`);
  lines.push(`-- ============================================================`);
  lines.push(`-- FIN DEL SCRIPT SQL \u2014 FINANCE AI`);
  lines.push(`-- Importaci\xF3n completada con \xE9xito.`);
  lines.push(`-- ============================================================`);
  return lines.join("\n");
}

// src/utils/categoriasGasto.ts
var DEFAULT_CATEGORIAS_GASTO = [
  {
    id: "materias-primas",
    nombre: "Materias Primas",
    descripcion: "Harinas, l\xE1cteos, az\xFAcares, ingredientes base y consumibles directos de producci\xF3n.",
    color: "#f43f5e",
    // coral / rose
    esPredeterminada: true
  },
  {
    id: "suministros-y-energia",
    nombre: "Suministros y Energ\xEDa",
    descripcion: "Electricidad, gas, agua, telecomunicaciones, internet y suministros energ\xE9ticos operativos.",
    color: "#0ea5e9",
    // sky blue
    esPredeterminada: true
  },
  {
    id: "envases-y-embalajes",
    nombre: "Envases y Embalajes",
    descripcion: "Cajas kraft, bobinas, bandejas, film, bolsas, etiquetas y material de empaquetado.",
    color: "#f59e0b",
    // amber
    esPredeterminada: true
  },
  {
    id: "logistica-y-transporte",
    nombre: "Log\xEDstica y Transporte",
    descripcion: "Portes, transporte frigor\xEDfico/refrigerado, env\xEDos urgentes, fletes y servicios de reparto.",
    color: "#10b981",
    // emerald
    esPredeterminada: true
  },
  {
    id: "mantenimiento-y-maquinaria",
    nombre: "Mantenimiento y Maquinaria",
    descripcion: "Reparaciones t\xE9cnicas, revisiones preventivas de hornos, climatizaci\xF3n, recambios y herramientas.",
    color: "#8b5cf6",
    // purple
    esPredeterminada: true
  },
  {
    id: "servicios-y-gestion",
    nombre: "Servicios y Gesti\xF3n",
    descripcion: "Asesor\xEDa contable, fiscal y laboral, licencias de software, seguros y servicios profesionales.",
    color: "#ec4899",
    // pink
    esPredeterminada: true
  }
];
var cacheCategoriasGasto = [...DEFAULT_CATEGORIAS_GASTO];

// src/db.ts
dotenv.config();
function getDbConfigFilePath() {
  const dir = path.join(process.cwd(), "tmp");
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
    }
  }
  return path.join(dir, "mysql_config.json");
}
function loadPersistedDbConfig() {
  try {
    const file = getDbConfigFilePath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, "utf-8"));
      return data || {};
    }
  } catch {
  }
  return {};
}
function persistDbConfig(cfg) {
  try {
    const file = getDbConfigFilePath();
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2), "utf-8");
  } catch (e) {
    console.warn("No se pudo guardar la configuraci\xF3n de DB en disco:", e);
  }
}
var persistedDbConfig = loadPersistedDbConfig();
var activeConfig = {
  host: persistedDbConfig.host || process.env.DB_HOST || "127.0.0.1",
  port: Number(persistedDbConfig.port || process.env.DB_PORT) || 3306,
  user: persistedDbConfig.user || process.env.DB_USER || "root",
  password: persistedDbConfig.password !== void 0 ? persistedDbConfig.password : process.env.DB_PASSWORD || "",
  database: persistedDbConfig.database || process.env.DB_NAME || "finance_ai_db"
};
var dbPool = null;
var isDbConnected = false;
var lastErrorReason = "";
function getDbConfig() {
  return { ...activeConfig };
}
function updateDbConfig(newConfig) {
  activeConfig = {
    ...activeConfig,
    ...newConfig,
    port: Number(newConfig.port || activeConfig.port || 3306)
  };
  persistDbConfig(activeConfig);
  if (dbPool) {
    try {
      dbPool.end().catch(() => {
      });
    } catch {
    }
    dbPool = null;
  }
  isDbConnected = false;
  lastErrorReason = "";
}
function sanitizeSqlDate2(val) {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split("T")[0];
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === "null" || str.toLowerCase() === "undefined") return null;
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, "0");
    const month = ddmmyyyy[2].padStart(2, "0");
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }
  const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (yyyymmdd) {
    const year = yyyymmdd[1];
    const month = yyyymmdd[2].padStart(2, "0");
    const day = yyyymmdd[3].padStart(2, "0");
    return `${year}-${month}-${day}`;
  }
  return null;
}
function getDbPool(forceRecreate = false) {
  if (dbPool && !forceRecreate) return dbPool;
  try {
    dbPool = mysql.createPool({
      host: activeConfig.host,
      port: activeConfig.port,
      user: activeConfig.user,
      password: activeConfig.password,
      database: activeConfig.database,
      waitForConnections: true,
      connectionLimit: 5,
      queueLimit: 0,
      connectTimeout: 3500,
      enableKeepAlive: true,
      keepAliveInitialDelay: 0
    });
    return dbPool;
  } catch (err) {
    lastErrorReason = err?.message || "Error al instanciar pool MySQL";
    dbPool = null;
    return null;
  }
}
async function ensureDatabaseAndTables() {
  const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
  if (isVercel && (activeConfig.host === "127.0.0.1" || activeConfig.host === "localhost")) {
    lastErrorReason = "En Vercel (servidor Serverless en la nube) no es posible conectar a '127.0.0.1' ni a 'localhost'. Debes indicar la IP p\xFAblica o dominio de tu servidor MySQL/MariaDB remoto (ej: db.tudominio.com o IP p\xFAblica) y habilitar conexiones remotas en el puerto 3306.";
    isDbConnected = false;
    return { ok: false, reason: lastErrorReason };
  }
  const pool = getDbPool();
  if (!pool) {
    return { ok: false, reason: lastErrorReason || "Pool de MySQL no disponible" };
  }
  try {
    const conn = await pool.getConnection();
    await createTablesOnConnection(conn);
    conn.release();
    isDbConnected = true;
    lastErrorReason = "";
    return { ok: true };
  } catch (directErr) {
    if (directErr?.code === "ER_BAD_DB_ERROR" || directErr?.errno === 1049) {
      try {
        const rootConn = await mysql.createConnection({
          host: activeConfig.host,
          port: activeConfig.port,
          user: activeConfig.user,
          password: activeConfig.password,
          connectTimeout: 3500
        });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${activeConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await rootConn.end();
        const retryPool = getDbPool(true);
        if (retryPool) {
          const retryConn = await retryPool.getConnection();
          await createTablesOnConnection(retryConn);
          retryConn.release();
          isDbConnected = true;
          lastErrorReason = "";
          return { ok: true };
        }
      } catch (createDbErr) {
        lastErrorReason = `No se pudo crear la base de datos '${activeConfig.database}': ${createDbErr?.message || createDbErr}`;
        isDbConnected = false;
        return { ok: false, reason: lastErrorReason };
      }
    }
    if (!isVercel && (directErr?.code === "ECONNREFUSED" || directErr?.code === "ENOTFOUND") && activeConfig.host === "127.0.0.1") {
      try {
        const altConn = await mysql.createConnection({
          host: "localhost",
          port: activeConfig.port,
          user: activeConfig.user,
          password: activeConfig.password,
          database: activeConfig.database,
          connectTimeout: 3500
        });
        await createTablesOnConnection(altConn);
        await altConn.end();
        activeConfig.host = "localhost";
        getDbPool(true);
        isDbConnected = true;
        lastErrorReason = "";
        return { ok: true };
      } catch {
      }
    }
    lastErrorReason = directErr?.message || "Error de conexi\xF3n MySQL";
    isDbConnected = false;
    return { ok: false, reason: lastErrorReason };
  }
}
async function createTablesOnConnection(conn) {
  await conn.query(`
    CREATE TABLE IF NOT EXISTS datos_negocio (
      id INT PRIMARY KEY AUTO_INCREMENT,
      nombre VARCHAR(255) NOT NULL,
      nif VARCHAR(50) NOT NULL,
      direccion TEXT,
      actividad VARCHAR(255),
      sector VARCHAR(255),
      contexto_operativo TEXT,
      email VARCHAR(150),
      telefono VARCHAR(50),
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS categorias_gasto (
      id VARCHAR(64) PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      descripcion TEXT,
      color VARCHAR(20) DEFAULT '#0ea5e9',
      es_predeterminada BOOLEAN DEFAULT FALSE,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS proveedores (
      id_proveedor VARCHAR(64) PRIMARY KEY,
      nombre_proveedor VARCHAR(255) NOT NULL,
      cif VARCHAR(50),
      contacto VARCHAR(255),
      productos_suministrados TEXT,
      importe_mensual DECIMAL(12,2) DEFAULT 0.00,
      frecuencia VARCHAR(50) DEFAULT 'Mensual',
      riesgo_dependencia ENUM('Bajo', 'Medio', 'Alto') DEFAULT 'Bajo',
      tiempo_medio_entrega VARCHAR(100),
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS facturas (
      id_factura VARCHAR(100) PRIMARY KEY,
      fecha_emision DATE NOT NULL,
      id_proveedor VARCHAR(64),
      nombre_proveedor VARCHAR(255) NOT NULL,
      concepto TEXT,
      importe DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      fecha_vencimiento DATE,
      estado ENUM('Pendiente', 'Pagada', 'Vencida') DEFAULT 'Pendiente',
      fecha_pago VARCHAR(50) DEFAULT 'Pendiente de confirmar',
      base_imponible DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      tipos_iva VARCHAR(50) DEFAULT '21%',
      cuota_iva DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      regimen_fiscal VARCHAR(100),
      aplica_recargo_equivalencia BOOLEAN DEFAULT FALSE,
      tipo_recargo_equivalencia VARCHAR(50),
      cuota_recargo_equivalencia DECIMAL(12,2) DEFAULT 0.00,
      aplica_retencion_irpf BOOLEAN DEFAULT FALSE,
      tipo_retencion_irpf VARCHAR(50),
      porcentaje_irpf DECIMAL(5,2) DEFAULT 0.00,
      cuota_irpf DECIMAL(12,2) DEFAULT 0.00,
      concepto_retencion_irpf VARCHAR(50),
      total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      categoria_gasto VARCHAR(150),
      categoria_gasto_justificacion TEXT,
      notas TEXT,
      archivo_nombre VARCHAR(255),
      archivo_ruta TEXT,
      sincronizado_sheets BOOLEAN DEFAULT FALSE,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_proveedor (id_proveedor),
      INDEX idx_fecha (fecha_emision),
      INDEX idx_estado (estado)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS lineas_factura (
      id INT PRIMARY KEY AUTO_INCREMENT,
      id_factura VARCHAR(100) NOT NULL,
      nombre_producto VARCHAR(255) NOT NULL,
      cantidad DECIMAL(10,2) NOT NULL DEFAULT 1.00,
      unidad VARCHAR(50) DEFAULT 'ud',
      precio_unitario DECIMAL(12,4) NOT NULL DEFAULT 0.00,
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      FOREIGN KEY (id_factura) REFERENCES facturas(id_factura) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS alertas (
      id VARCHAR(100) PRIMARY KEY,
      tipo VARCHAR(100) NOT NULL,
      nivel ENUM('critica', 'alta', 'media', 'informativa') DEFAULT 'media',
      titulo VARCHAR(255) NOT NULL,
      descripcion TEXT,
      fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      estado ENUM('activa', 'resuelta', 'ignorada') DEFAULT 'activa',
      datos_relacionados LONGTEXT
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS historico_precios (
      id INT PRIMARY KEY AUTO_INCREMENT,
      nombre_producto VARCHAR(255) NOT NULL,
      id_proveedor VARCHAR(64) NOT NULL,
      nombre_proveedor VARCHAR(255) NOT NULL,
      id_factura VARCHAR(100) NOT NULL,
      fecha DATE NOT NULL,
      precio_unitario DECIMAL(12,4) NOT NULL,
      unidad VARCHAR(50) DEFAULT 'ud',
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_hist_producto (nombre_producto),
      INDEX idx_hist_proveedor (id_proveedor),
      INDEX idx_hist_fecha (fecha)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS configuracion_parametros (
      id INT PRIMARY KEY AUTO_INCREMENT,
      umbral_subida_moderada_pct DECIMAL(5,2) DEFAULT 8.00,
      umbral_subida_critica_pct DECIMAL(5,2) DEFAULT 15.00,
      umbral_concentracion_proveedor_pct DECIMAL(5,2) DEFAULT 30.00,
      notificar_concentracion_proveedor BOOLEAN DEFAULT TRUE,
      dias_anticipacion_vencimiento INT DEFAULT 3,
      notificar_facturas_vencidas BOOLEAN DEFAULT TRUE,
      regimen_fiscal_predeterminado VARCHAR(100) DEFAULT 'R\xE9gimen General Peninsular',
      tipo_retencion_predeterminada VARCHAR(100) DEFAULT '15% Profesional',
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS analisis_financieros_ia (
      id VARCHAR(64) PRIMARY KEY,
      fecha_generacion DATETIME NOT NULL,
      estado_general TEXT NOT NULL,
      principales_gastos LONGTEXT,
      cambios_importantes LONGTEXT,
      alertas LONGTEXT,
      tres_acciones LONGTEXT NOT NULL,
      oportunidades_ahorro LONGTEXT,
      prioridad_semana TEXT,
      total_gasto_analizado DECIMAL(12,2) DEFAULT 0.00,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  try {
    await conn.query("ALTER TABLE analisis_financieros_ia ADD COLUMN principales_gastos LONGTEXT");
  } catch {
  }
  try {
    await conn.query("ALTER TABLE analisis_financieros_ia ADD COLUMN cambios_importantes LONGTEXT");
  } catch {
  }
  try {
    await conn.query("ALTER TABLE analisis_financieros_ia ADD COLUMN alertas LONGTEXT");
  } catch {
  }
  await conn.query(`
    CREATE TABLE IF NOT EXISTS historial_chat_ia (
      id VARCHAR(64) PRIMARY KEY,
      emisor ENUM('usuario', 'asistente') NOT NULL,
      mensaje TEXT NOT NULL,
      sugerencias LONGTEXT,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_chat_creado (creado_en)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS declaraciones_aeat (
      id VARCHAR(64) PRIMARY KEY,
      modelo VARCHAR(10) NOT NULL,
      ejercicio INT NOT NULL,
      periodo VARCHAR(10) NOT NULL,
      estado ENUM('Borrador', 'Calculado', 'Presentado') DEFAULT 'Borrador',
      resultado_declaracion DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      datos_casillas LONGTEXT,
      csv_justificante VARCHAR(100),
      fecha_presentacion DATE,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_aeat_modelo (modelo),
      INDEX idx_aeat_ejercicio (ejercicio)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  await conn.query(`
    CREATE TABLE IF NOT EXISTS integraciones_google (
      id INT PRIMARY KEY AUTO_INCREMENT,
      sheet_id VARCHAR(150),
      endpoint_url TEXT,
      drive_folder_id VARCHAR(150),
      auto_sync BOOLEAN DEFAULT TRUE,
      is_sheet_data_active BOOLEAN DEFAULT FALSE,
      ultima_sincronizacion DATETIME,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);
  try {
    await conn.query("ALTER TABLE integraciones_google ADD COLUMN is_sheet_data_active BOOLEAN DEFAULT FALSE");
  } catch {
  }
  try {
    const [existingGoogle] = await conn.query("SELECT id, endpoint_url, drive_folder_id FROM integraciones_google WHERE id = 1 LIMIT 1");
    const defaultEndpoint = process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL || "https://script.google.com/macros/s/AKfycby_om7y_NBaPo5MXc-QyzGKgOIjqsg7graHUXWC_4nelkzXSTmu2HuV3iqRvbwW4a4SVQ/exec";
    const defaultDriveFolder = process.env.GOOGLE_DRIVE_FOLDER_ID || "1Uwm3ROGnrn3T7fF2IvbkblJQAo2VZ0mK";
    const defaultSheetId = process.env.GOOGLE_SHEETS_ID || "";
    if (!existingGoogle || existingGoogle.length === 0) {
      await conn.query(`
        INSERT INTO integraciones_google (id, sheet_id, endpoint_url, drive_folder_id, auto_sync, is_sheet_data_active)
        VALUES (1, ?, ?, ?, 1, 0)
      `, [defaultSheetId, defaultEndpoint, defaultDriveFolder]);
    } else if (!existingGoogle[0].endpoint_url && !existingGoogle[0].drive_folder_id) {
      await conn.query(`
        UPDATE integraciones_google
        SET endpoint_url = ?, drive_folder_id = ?
        WHERE id = 1
      `, [defaultEndpoint, defaultDriveFolder]);
    }
  } catch (seedErr) {
    console.warn("Aviso al sembrar integraciones_google en MySQL:", seedErr);
  }
  await seedInitialDataIfEmpty(conn);
}
async function seedInitialDataIfEmpty(conn) {
  try {
    const [rows] = await conn.query("SELECT COUNT(*) as count FROM facturas");
    const count = rows && rows[0] ? Number(rows[0].count) : 0;
    if (count === 0) {
      const [negRows] = await conn.query("SELECT COUNT(*) as cnt FROM datos_negocio");
      if (!negRows || Number(negRows[0].cnt) === 0) {
        await conn.query(`
          INSERT INTO datos_negocio (id, nombre, nif, direccion, actividad, sector, contexto_operativo, email, telefono)
          VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          DEFAULT_DATOS_NEGOCIO.nombre,
          DEFAULT_DATOS_NEGOCIO.nif,
          DEFAULT_DATOS_NEGOCIO.direccion,
          DEFAULT_DATOS_NEGOCIO.actividad,
          DEFAULT_DATOS_NEGOCIO.sector,
          DEFAULT_DATOS_NEGOCIO.contextoOperativo,
          DEFAULT_DATOS_NEGOCIO.email,
          DEFAULT_DATOS_NEGOCIO.telefono
        ]);
      }
      for (const cat of DEFAULT_CATEGORIAS_GASTO) {
        await conn.query(`
          INSERT IGNORE INTO categorias_gasto (id, nombre, descripcion, color, es_predeterminada)
          VALUES (?, ?, ?, ?, ?)
        `, [cat.id, cat.nombre, cat.descripcion || "", cat.color || "#0ea5e9", cat.esPredeterminada ? 1 : 0]);
      }
      for (const f of INITIAL_FACTURAS) {
        const idFactura = String(f.idFactura).trim();
        const idProveedor = String(f.idProveedor || "PROV-GEN").trim();
        const nombreProveedor = String(f.nombreProveedor || "Proveedor General").trim();
        const fechaEmisionSql = sanitizeSqlDate2(f.fechaEmision) || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const fechaVencimientoSql = sanitizeSqlDate2(f.fechaVencimiento) || fechaEmisionSql;
        const total = Number(f.total || 0);
        const baseImponible = Number(f.baseImponible || f.importe || 0);
        const importe = Number(f.importe || baseImponible || 0);
        const cuotaIVA = Number(f.cuotaIVA || 0);
        const cuotaRecargo = Number(f.cuotaRecargoEquivalencia || 0);
        const cuotaIRPF = Number(f.cuotaIRPF || 0);
        const porcentajeIRPF = Number(f.porcentajeIRPF || 0);
        await conn.query(`
          INSERT INTO proveedores (id_proveedor, nombre_proveedor, importe_mensual)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            nombre_proveedor = VALUES(nombre_proveedor),
            importe_mensual = importe_mensual + VALUES(importe_mensual)
        `, [idProveedor, nombreProveedor, total]);
        await conn.query(`
          INSERT IGNORE INTO facturas (
            id_factura, fecha_emision, id_proveedor, nombre_proveedor, concepto,
            importe, fecha_vencimiento, estado, fecha_pago, base_imponible,
            tipos_iva, cuota_iva, regimen_fiscal, aplica_recargo_equivalencia,
            tipo_recargo_equivalencia, cuota_recargo_equivalencia, aplica_retencion_irpf,
            tipo_retencion_irpf, porcentaje_irpf, cuota_irpf, concepto_retencion_irpf,
            total, categoria_gasto, categoria_gasto_justificacion, notas, archivo_nombre,
            archivo_ruta, sincronizado_sheets
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
        `, [
          idFactura,
          fechaEmisionSql,
          idProveedor,
          nombreProveedor,
          f.concepto || "Factura registrada",
          importe,
          fechaVencimientoSql,
          f.estado || "Pendiente",
          f.fechaPago || "Pendiente de confirmar",
          baseImponible,
          f.tiposIVA || "21%",
          cuotaIVA,
          f.regimenFiscal || "R\xE9gimen General Peninsular",
          Boolean(f.aplicaRecargoEquivalencia) ? 1 : 0,
          f.tipoRecargoEquivalencia || "",
          cuotaRecargo,
          Boolean(f.aplicaRetencionIRPF) ? 1 : 0,
          f.tipoRetencionIRPF || "",
          porcentajeIRPF,
          cuotaIRPF,
          f.conceptoRetencionIRPF || "",
          total,
          f.categoriaGasto || "Materias Primas",
          f.categoriaGastoJustificacion || "",
          f.notas || "",
          f.archivoNombre || `${idFactura}.pdf`,
          f.driveFileUrl || f.archivoRuta || f.archivo_ruta || null
        ]);
        const lineas = Array.isArray(f.lineas) && f.lineas.length > 0 ? f.lineas : [{
          nombreProducto: f.concepto || "Producto / Servicio",
          cantidad: 1,
          unidad: "ud",
          precioUnitario: importe,
          subtotal: importe
        }];
        const lineasData = lineas.map((l) => [
          idFactura,
          String(l.nombreProducto || "Art\xEDculo").trim(),
          Number(l.cantidad || 1),
          String(l.unidad || "ud").trim(),
          Number(l.precioUnitario || 0),
          Number(l.subtotal || Number(l.cantidad || 1) * Number(l.precioUnitario || 0))
        ]);
        await conn.query(
          `INSERT INTO lineas_factura (id_factura, nombre_producto, cantidad, unidad, precio_unitario, subtotal) VALUES ?`,
          [lineasData]
        );
        for (const l of lineas) {
          const precio = Number(l.precioUnitario || 0);
          const nomProd = String(l.nombreProducto || f.concepto || "Art\xEDculo").trim();
          if (precio > 0 && nomProd) {
            await conn.query(`
              INSERT INTO historico_precios (nombre_producto, id_proveedor, nombre_proveedor, id_factura, fecha, precio_unitario, unidad)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              nomProd,
              idProveedor,
              nombreProveedor,
              idFactura,
              fechaEmisionSql,
              precio,
              String(l.unidad || "ud").trim()
            ]);
          }
        }
      }
      for (const a of INITIAL_ALERTAS) {
        await conn.query(`
          INSERT IGNORE INTO alertas (id, tipo, nivel, titulo, descripcion, fecha, estado, datos_relacionados)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          a.id,
          a.tipo,
          a.nivel,
          a.titulo,
          a.descripcion,
          a.fecha ? new Date(a.fecha) : /* @__PURE__ */ new Date(),
          a.estado || "activa",
          a.datosRelacionados ? JSON.stringify(a.datosRelacionados) : null
        ]);
      }
      const [paramRows] = await conn.query("SELECT COUNT(*) as cnt FROM configuracion_parametros");
      if (!paramRows || Number(paramRows[0].cnt) === 0) {
        await conn.query(`
          INSERT INTO configuracion_parametros (
            id, umbral_subida_moderada_pct, umbral_subida_critica_pct,
            umbral_concentracion_proveedor_pct, notificar_concentracion_proveedor,
            dias_anticipacion_vencimiento, notificar_facturas_vencidas,
            regimen_fiscal_predeterminado, tipo_retencion_predeterminada
          ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          DEFAULT_PARAMETROS_SISTEMA.umbralSubidaModeradaPct,
          DEFAULT_PARAMETROS_SISTEMA.umbralSubidaCriticaPct,
          DEFAULT_PARAMETROS_SISTEMA.umbralConcentracionProveedorPct,
          DEFAULT_PARAMETROS_SISTEMA.notificarConcentracionProveedor ? 1 : 0,
          DEFAULT_PARAMETROS_SISTEMA.diasAnticipacionVencimiento,
          DEFAULT_PARAMETROS_SISTEMA.notificarFacturasVencidas ? 1 : 0,
          DEFAULT_PARAMETROS_SISTEMA.regimenFiscalPredeterminado || "IVA_PENINSULAR",
          DEFAULT_PARAMETROS_SISTEMA.tipoIrpfRetencionPredeterminado || "15%"
        ]);
      }
    }
  } catch (seedErr) {
    console.warn("Aviso en siembra inicial de MySQL:", seedErr);
  }
}
async function testDbConnection() {
  const isVercel = !!(process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);
  if (isVercel && (activeConfig.host === "127.0.0.1" || activeConfig.host === "localhost")) {
    return {
      connected: false,
      latencyMs: 1,
      message: `En Vercel (servidor Serverless en la nube) no es posible conectar a '127.0.0.1' ni a 'localhost'. Debes indicar la IP p\xFAblica o dominio de tu servidor MySQL/MariaDB remoto (ej: db.tudominio.com o IP p\xFAblica) y habilitar conexiones remotas en el puerto 3306.`,
      host: activeConfig.host,
      port: activeConfig.port,
      database: activeConfig.database
    };
  }
  const start = Date.now();
  let timer = null;
  const timeoutPromise = new Promise((resolve) => {
    timer = setTimeout(() => {
      resolve({
        ok: false,
        reason: `Tiempo de espera agotado (>5.5s) al conectar con ${activeConfig.host}:${activeConfig.port}. Comprueba que el servidor MySQL permita conexiones externas en el puerto 3306 y que el cortafuegos no est\xE9 bloqueando la IP de Vercel.`
      });
    }, 5500);
  });
  try {
    const check = await Promise.race([ensureDatabaseAndTables(), timeoutPromise]);
    if (timer) clearTimeout(timer);
    const latencyMs = Math.max(1, Date.now() - start);
    if (check.ok) {
      return {
        connected: true,
        latencyMs,
        message: `Conexi\xF3n exitosa a MySQL en ${activeConfig.host}:${activeConfig.port} (Base de datos: ${activeConfig.database})`,
        host: activeConfig.host,
        port: activeConfig.port,
        database: activeConfig.database
      };
    }
    return {
      connected: false,
      latencyMs,
      message: check.reason || `No se pudo conectar a MySQL en ${activeConfig.host}:${activeConfig.port}`,
      host: activeConfig.host,
      port: activeConfig.port,
      database: activeConfig.database
    };
  } catch (err) {
    if (timer) clearTimeout(timer);
    const latencyMs = Math.max(1, Date.now() - start);
    return {
      connected: false,
      latencyMs,
      message: err?.message || `Error al conectar con MySQL en ${activeConfig.host}:${activeConfig.port}`,
      host: activeConfig.host,
      port: activeConfig.port,
      database: activeConfig.database
    };
  }
}
async function pingDb() {
  const start = Date.now();
  const pool = getDbPool();
  if (!pool) {
    return {
      connected: false,
      latencyMs: 0,
      message: lastErrorReason || "Pool de MySQL no inicializado",
      host: activeConfig.host,
      port: activeConfig.port,
      database: activeConfig.database
    };
  }
  try {
    const conn = await pool.getConnection();
    const qStart = Date.now();
    await conn.query("SELECT 1");
    const latencyMs = Math.max(1, Date.now() - qStart);
    conn.release();
    isDbConnected = true;
    lastErrorReason = "";
    return {
      connected: true,
      latencyMs,
      message: "Conexi\xF3n activa",
      host: activeConfig.host,
      port: activeConfig.port,
      database: activeConfig.database
    };
  } catch (err) {
    isDbConnected = false;
    lastErrorReason = err?.message || "Error al comunicar con MySQL";
    return {
      connected: false,
      latencyMs: Math.max(1, Date.now() - start),
      message: lastErrorReason,
      host: activeConfig.host,
      port: activeConfig.port,
      database: activeConfig.database
    };
  }
}
function isMySQLAvailable() {
  return isDbConnected;
}
async function guardarFacturasEnMySQL(facturas) {
  if (!Array.isArray(facturas) || facturas.length === 0) {
    return { replicadas: 0, errores: [], mysqlDisponible: isDbConnected };
  }
  const check = await ensureDatabaseAndTables();
  if (!check.ok) {
    return {
      replicadas: 0,
      errores: [check.reason || "MySQL no est\xE1 accesible"],
      mysqlDisponible: false,
      razonFallo: check.reason || `No hay conexi\xF3n a ${activeConfig.host}:${activeConfig.port}`
    };
  }
  const pool = getDbPool();
  if (!pool) {
    return { replicadas: 0, errores: ["Pool de MySQL no disponible"], mysqlDisponible: false };
  }
  let replicadas = 0;
  const errores = [];
  try {
    const conn = await pool.getConnection();
    isDbConnected = true;
    for (const f of facturas) {
      if (!f || !f.idFactura) continue;
      try {
        const idFactura = String(f.idFactura).trim();
        const idProveedor = String(f.idProveedor || "PROV-GEN").trim();
        const nombreProveedor = String(f.nombreProveedor || "Proveedor General").trim();
        const fechaEmisionSql = sanitizeSqlDate2(f.fechaEmision) || (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
        const fechaVencimientoSql = sanitizeSqlDate2(f.fechaVencimiento) || fechaEmisionSql;
        const total = Number(f.total || 0);
        const baseImponible = Number(f.baseImponible || f.importe || 0);
        const importe = Number(f.importe || baseImponible || 0);
        const cuotaIVA = Number(f.cuotaIVA || 0);
        const cuotaRecargo = Number(f.cuotaRecargoEquivalencia || 0);
        const cuotaIRPF = Number(f.cuotaIRPF || 0);
        const porcentajeIRPF = Number(f.porcentajeIRPF || 0);
        await conn.query(`
          INSERT INTO proveedores (id_proveedor, nombre_proveedor, importe_mensual)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            nombre_proveedor = VALUES(nombre_proveedor),
            importe_mensual = importe_mensual + VALUES(importe_mensual)
        `, [idProveedor, nombreProveedor, total]);
        await conn.query(`
          INSERT INTO facturas (
            id_factura, fecha_emision, id_proveedor, nombre_proveedor, concepto,
            importe, fecha_vencimiento, estado, fecha_pago, base_imponible,
            tipos_iva, cuota_iva, regimen_fiscal, aplica_recargo_equivalencia,
            tipo_recargo_equivalencia, cuota_recargo_equivalencia, aplica_retencion_irpf,
            tipo_retencion_irpf, porcentaje_irpf, cuota_irpf, concepto_retencion_irpf,
            total, categoria_gasto, categoria_gasto_justificacion, notas, archivo_nombre,
            archivo_ruta, sincronizado_sheets
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)
          ON DUPLICATE KEY UPDATE
            fecha_emision = VALUES(fecha_emision),
            id_proveedor = VALUES(id_proveedor),
            nombre_proveedor = VALUES(nombre_proveedor),
            concepto = VALUES(concepto),
            importe = VALUES(importe),
            fecha_vencimiento = VALUES(fecha_vencimiento),
            estado = VALUES(estado),
            fecha_pago = VALUES(fecha_pago),
            base_imponible = VALUES(base_imponible),
            tipos_iva = VALUES(tipos_iva),
            cuota_iva = VALUES(cuota_iva),
            regimen_fiscal = VALUES(regimen_fiscal),
            aplica_recargo_equivalencia = VALUES(aplica_recargo_equivalencia),
            tipo_recargo_equivalencia = VALUES(tipo_recargo_equivalencia),
            cuota_recargo_equivalencia = VALUES(cuota_recargo_equivalencia),
            aplica_retencion_irpf = VALUES(aplica_retencion_irpf),
            tipo_retencion_irpf = VALUES(tipo_retencion_irpf),
            porcentaje_irpf = VALUES(porcentaje_irpf),
            cuota_irpf = VALUES(cuota_irpf),
            concepto_retencion_irpf = VALUES(concepto_retencion_irpf),
            total = VALUES(total),
            categoria_gasto = VALUES(categoria_gasto),
            categoria_gasto_justificacion = VALUES(categoria_gasto_justificacion),
            notas = VALUES(notas),
            archivo_nombre = VALUES(archivo_nombre),
            archivo_ruta = COALESCE(VALUES(archivo_ruta), archivo_ruta),
            sincronizado_sheets = 1
        `, [
          idFactura,
          fechaEmisionSql,
          idProveedor,
          nombreProveedor,
          f.concepto || "Factura registrada en Google Sheets",
          importe,
          fechaVencimientoSql,
          f.estado || "Pendiente",
          f.fechaPago || "Pendiente de confirmar",
          baseImponible,
          f.tiposIVA || "21%",
          cuotaIVA,
          f.regimenFiscal || "R\xE9gimen General Peninsular",
          Boolean(f.aplicaRecargoEquivalencia) ? 1 : 0,
          f.tipoRecargoEquivalencia || "",
          cuotaRecargo,
          Boolean(f.aplicaRetencionIRPF) ? 1 : 0,
          f.tipoRetencionIRPF || "",
          porcentajeIRPF,
          cuotaIRPF,
          f.conceptoRetencionIRPF || "",
          total,
          f.categoriaGasto || "Materias Primas",
          f.categoriaGastoJustificacion || "",
          f.notas || "",
          f.archivoNombre || `${idFactura}.pdf`,
          f.driveFileUrl || f.archivoRuta || f.archivo_ruta || null
        ]);
        const lineasParaGuardar = Array.isArray(f.lineas) && f.lineas.length > 0 ? f.lineas : [{
          nombreProducto: f.concepto || "Producto / Servicio General",
          cantidad: 1,
          unidad: "ud",
          precioUnitario: importe,
          subtotal: importe
        }];
        await conn.query("DELETE FROM lineas_factura WHERE id_factura = ?", [idFactura]);
        const lineasData = lineasParaGuardar.map((l) => [
          idFactura,
          String(l.nombreProducto || "Art\xEDculo").trim(),
          Number(l.cantidad || 1),
          String(l.unidad || "ud").trim(),
          Number(l.precioUnitario || 0),
          Number(l.subtotal || Number(l.cantidad || 1) * Number(l.precioUnitario || 0))
        ]);
        await conn.query(
          `INSERT INTO lineas_factura (id_factura, nombre_producto, cantidad, unidad, precio_unitario, subtotal) VALUES ?`,
          [lineasData]
        );
        for (const l of lineasParaGuardar) {
          const precio = Number(l.precioUnitario || 0);
          const nomProd = String(l.nombreProducto || f.concepto || "Art\xEDculo").trim();
          if (precio > 0 && nomProd) {
            await conn.query(`
              INSERT INTO historico_precios (nombre_producto, id_proveedor, nombre_proveedor, id_factura, fecha, precio_unitario, unidad)
              VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
              nomProd,
              idProveedor,
              nombreProveedor,
              idFactura,
              fechaEmisionSql,
              precio,
              String(l.unidad || "ud").trim()
            ]);
          }
        }
        replicadas++;
      } catch (rowErr) {
        errores.push(`Factura ${f.idFactura}: ${rowErr.message}`);
      }
    }
    conn.release();
    return { replicadas, errores, mysqlDisponible: true };
  } catch (err) {
    return {
      replicadas,
      errores: [...errores, err.message],
      mysqlDisponible: false,
      razonFallo: err.message
    };
  }
}
async function obtenerFacturasDeMySQL() {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    const [facturasRows] = await conn.query(`
      SELECT 
        id_factura AS idFactura,
        DATE_FORMAT(fecha_emision, '%Y-%m-%d') AS fechaEmision,
        id_proveedor AS idProveedor,
        nombre_proveedor AS nombreProveedor,
        concepto,
        importe,
        DATE_FORMAT(fecha_vencimiento, '%Y-%m-%d') AS fechaVencimiento,
        estado,
        fecha_pago AS fechaPago,
        base_imponible AS baseImponible,
        tipos_iva AS tiposIVA,
        cuota_iva AS cuotaIVA,
        regimen_fiscal AS regimenFiscal,
        aplica_recargo_equivalencia AS aplicaRecargoEquivalencia,
        tipo_recargo_equivalencia AS tipoRecargoEquivalencia,
        cuota_recargo_equivalencia AS cuotaRecargoEquivalencia,
        aplica_retencion_irpf AS aplicaRetencionIRPF,
        tipo_retencion_irpf AS tipoRetencionIRPF,
        porcentaje_irpf AS porcentajeIRPF,
        cuota_irpf AS cuotaIRPF,
        concepto_retencion_irpf AS conceptoRetencionIRPF,
        total,
        categoria_gasto AS categoriaGasto,
        categoria_gasto_justificacion AS categoriaGastoJustificacion,
        notas,
        archivo_nombre AS archivoNombre,
        archivo_ruta AS driveFileUrl,
        archivo_ruta AS archivoRuta,
        archivo_ruta AS archivo_ruta
      FROM facturas
      ORDER BY fecha_emision DESC
    `);
    let lineasRows = [];
    try {
      const [lRows] = await conn.query(`
        SELECT 
          id_factura AS idFactura,
          nombre_producto AS nombreProducto,
          cantidad,
          unidad,
          precio_unitario AS precioUnitario,
          subtotal
        FROM lineas_factura
        ORDER BY id ASC
      `);
      lineasRows = lRows || [];
    } catch {
    }
    conn.release();
    const lineasPorFactura = {};
    lineasRows.forEach((l) => {
      if (!lineasPorFactura[l.idFactura]) {
        lineasPorFactura[l.idFactura] = [];
      }
      lineasPorFactura[l.idFactura].push({
        nombreProducto: l.nombreProducto,
        cantidad: Number(l.cantidad || 1),
        unidad: l.unidad || "ud",
        precioUnitario: Number(l.precioUnitario || 0),
        subtotal: Number(l.subtotal || 0)
      });
    });
    return facturasRows.map((f) => ({
      ...f,
      importe: Number(f.importe || 0),
      baseImponible: Number(f.baseImponible || 0),
      cuotaIVA: Number(f.cuotaIVA || 0),
      cuotaRecargoEquivalencia: Number(f.cuotaRecargoEquivalencia || 0),
      cuotaIRPF: Number(f.cuotaIRPF || 0),
      porcentajeIRPF: Number(f.porcentajeIRPF || 0),
      total: Number(f.total || 0),
      aplicaRecargoEquivalencia: Boolean(f.aplicaRecargoEquivalencia),
      aplicaRetencionIRPF: Boolean(f.aplicaRetencionIRPF),
      sincronizadoSheets: true,
      driveGuardado: Boolean((f.driveFileUrl || f.archivoRuta || f.archivo_ruta) && String(f.driveFileUrl || f.archivoRuta || f.archivo_ruta).startsWith("http")),
      lineas: lineasPorFactura[f.idFactura] || []
    }));
  } catch (err) {
    console.warn("Aviso al consultar facturas en MySQL:", err?.message);
    return [];
  }
}
async function eliminarFacturaDeMySQL(idFactura) {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) {
    return { ok: false, affectedRows: 0, error: "MySQL no est\xE1 disponible" };
  }
  const normalizedId = String(idFactura).trim();
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      await conn.query("DELETE FROM lineas_factura WHERE id_factura = ?", [normalizedId]);
      const [res] = await conn.query("DELETE FROM facturas WHERE id_factura = ?", [normalizedId]);
      await conn.query("DELETE FROM alertas WHERE id LIKE ? OR id LIKE ?", [
        `ALT-VENC-${normalizedId}%`,
        `ALT-PRICE-${normalizedId}%`
      ]);
      await conn.commit();
      conn.release();
      return { ok: true, affectedRows: res?.affectedRows || 0 };
    } catch (txErr) {
      await conn.rollback();
      conn.release();
      return { ok: false, affectedRows: 0, error: txErr?.message };
    }
  } catch (err) {
    return { ok: false, affectedRows: 0, error: err?.message };
  }
}
async function actualizarEstadoFacturaEnMySQL(idFactura, nuevoEstado, fechaPago) {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) {
    return { ok: false, error: "MySQL no est\xE1 disponible" };
  }
  const normalizedId = String(idFactura).trim();
  try {
    const conn = await pool.getConnection();
    const query = fechaPago ? "UPDATE facturas SET estado = ?, fecha_pago = ? WHERE id_factura = ?" : "UPDATE facturas SET estado = ? WHERE id_factura = ?";
    const params = fechaPago ? [nuevoEstado, fechaPago, normalizedId] : [nuevoEstado, normalizedId];
    await conn.query(query, params);
    conn.release();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}
async function guardarDatosNegocioEnMySQL(datos) {
  if (!datos || typeof datos !== "object") return { ok: false, error: "Datos no v\xE1lidos" };
  const check = await ensureDatabaseAndTables();
  if (!check.ok) return { ok: false, error: check.reason || "MySQL no disponible" };
  const pool = getDbPool();
  if (!pool) return { ok: false, error: "Pool de MySQL no disponible" };
  try {
    const conn = await pool.getConnection();
    await conn.query(`
      INSERT INTO datos_negocio (id, nombre, nif, direccion, actividad, sector, contexto_operativo, email, telefono)
      VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        nombre = VALUES(nombre),
        nif = VALUES(nif),
        direccion = VALUES(direccion),
        actividad = VALUES(actividad),
        sector = VALUES(sector),
        contexto_operativo = VALUES(contexto_operativo),
        email = VALUES(email),
        telefono = VALUES(telefono)
    `, [
      datos.nombre || "Mi Empresa",
      datos.nif || "B-00000000",
      datos.direccion || "",
      datos.actividad || "",
      datos.sector || "",
      datos.contextoOperativo || "",
      datos.email || "",
      datos.telefono || ""
    ]);
    conn.release();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
async function obtenerDatosNegocioDeMySQL() {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return null;
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT * FROM datos_negocio WHERE id = 1 LIMIT 1");
    conn.release();
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        nombre: r.nombre,
        nif: r.nif,
        direccion: r.direccion,
        actividad: r.actividad,
        sector: r.sector,
        contextoOperativo: r.contexto_operativo,
        email: r.email,
        telefono: r.telefono
      };
    }
    return null;
  } catch {
    return null;
  }
}
async function guardarCategoriasEnMySQL(categorias) {
  if (!Array.isArray(categorias) || categorias.length === 0) {
    return { replicadas: 0, errores: [], mysqlDisponible: isDbConnected };
  }
  const check = await ensureDatabaseAndTables();
  if (!check.ok) {
    return { replicadas: 0, errores: [check.reason || "MySQL no disponible"], mysqlDisponible: false };
  }
  const pool = getDbPool();
  if (!pool) return { replicadas: 0, errores: ["Pool MySQL no disponible"], mysqlDisponible: false };
  let replicadas = 0;
  const errores = [];
  try {
    const conn = await pool.getConnection();
    for (const c of categorias) {
      try {
        const id = String(c.id || c.nombre || "").trim();
        if (!id) continue;
        await conn.query(`
          INSERT INTO categorias_gasto (id, nombre, descripcion, color, es_predeterminada)
          VALUES (?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nombre = VALUES(nombre),
            descripcion = VALUES(descripcion),
            color = VALUES(color),
            es_predeterminada = VALUES(es_predeterminada)
        `, [
          id,
          String(c.nombre || id).trim(),
          c.descripcion || "",
          c.color || "#0ea5e9",
          Boolean(c.esPredeterminada) ? 1 : 0
        ]);
        replicadas++;
      } catch (err) {
        errores.push(`Categor\xEDa ${c.id}: ${err.message}`);
      }
    }
    conn.release();
    return { replicadas, errores, mysqlDisponible: true };
  } catch (err) {
    return { replicadas, errores: [err.message], mysqlDisponible: false };
  }
}
async function obtenerCategoriasDeMySQL() {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(`
      SELECT id, nombre, descripcion, color, es_predeterminada AS esPredeterminada
      FROM categorias_gasto
      ORDER BY nombre ASC
    `);
    conn.release();
    return rows.map((r) => ({
      ...r,
      esPredeterminada: Boolean(r.esPredeterminada)
    }));
  } catch {
    return [];
  }
}
async function guardarProveedoresEnMySQL(proveedores) {
  if (!Array.isArray(proveedores) || proveedores.length === 0) {
    return { replicadas: 0, errores: [], mysqlDisponible: isDbConnected };
  }
  const check = await ensureDatabaseAndTables();
  if (!check.ok) {
    return { replicadas: 0, errores: [check.reason || "MySQL no disponible"], mysqlDisponible: false };
  }
  const pool = getDbPool();
  if (!pool) return { replicadas: 0, errores: ["Pool MySQL no disponible"], mysqlDisponible: false };
  let replicadas = 0;
  const errores = [];
  try {
    const conn = await pool.getConnection();
    for (const p of proveedores) {
      try {
        const id = String(p.idProveedor || p.id || p.nombreProveedor || "").trim();
        const nombre = String(p.nombreProveedor || p.nombre || id).trim();
        if (!id || !nombre) continue;
        await conn.query(`
          INSERT INTO proveedores (
            id_proveedor, nombre_proveedor, cif, contacto, productos_suministrados,
            importe_mensual, frecuencia, riesgo_dependencia, tiempo_medio_entrega
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON DUPLICATE KEY UPDATE
            nombre_proveedor = VALUES(nombre_proveedor),
            cif = COALESCE(NULLIF(VALUES(cif), ''), cif),
            contacto = COALESCE(NULLIF(VALUES(contacto), ''), contacto),
            productos_suministrados = COALESCE(NULLIF(VALUES(productos_suministrados), ''), productos_suministrados),
            importe_mensual = VALUES(importe_mensual),
            frecuencia = VALUES(frecuencia),
            riesgo_dependencia = VALUES(riesgo_dependencia),
            tiempo_medio_entrega = VALUES(tiempo_medio_entrega)
        `, [
          id,
          nombre,
          p.cif || "",
          p.contacto || "",
          p.productosSuministrados || "",
          Number(p.importeMensual || 0),
          p.frecuencia || "Mensual",
          p.riesgoDependencia || "Bajo",
          p.tiempoMedioEntrega || "2-3 d\xEDas"
        ]);
        replicadas++;
      } catch (err) {
        errores.push(`Proveedor ${p.nombreProveedor}: ${err.message}`);
      }
    }
    conn.release();
    return { replicadas, errores, mysqlDisponible: true };
  } catch (err) {
    return { replicadas, errores: [err.message], mysqlDisponible: false };
  }
}
async function obtenerProveedoresDeMySQL() {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(`
      SELECT 
        id_proveedor AS idProveedor,
        nombre_proveedor AS nombreProveedor,
        cif,
        contacto,
        productos_suministrados AS productosSuministrados,
        importe_mensual AS importeMensual,
        frecuencia,
        riesgo_dependencia AS riesgoDependencia,
        tiempo_medio_entrega AS tiempoMedioEntrega
      FROM proveedores
      ORDER BY nombre_proveedor ASC
    `);
    conn.release();
    return rows.map((p) => ({
      ...p,
      importeMensual: Number(p.importeMensual || 0)
    }));
  } catch (err) {
    console.warn("Aviso al consultar proveedores en MySQL:", err?.message);
    return [];
  }
}
async function obtenerHistoricoPreciosDeMySQL(producto) {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    let query = `
      SELECT 
        id,
        nombre_producto AS nombreProducto,
        id_proveedor AS idProveedor,
        nombre_proveedor AS nombreProveedor,
        id_factura AS idFactura,
        DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
        precio_unitario AS precioUnitario,
        unidad
      FROM historico_precios
    `;
    const params = [];
    if (producto) {
      query += ` WHERE nombre_producto = ? `;
      params.push(producto);
    }
    query += ` ORDER BY fecha ASC, id ASC`;
    const [rows] = await conn.query(query, params);
    conn.release();
    return rows.map((r) => ({
      ...r,
      precioUnitario: Number(r.precioUnitario || 0)
    }));
  } catch {
    return [];
  }
}
async function guardarParametrosSistemaEnMySQL(params) {
  if (!params || typeof params !== "object") return { ok: false, error: "Par\xE1metros no v\xE1lidos" };
  const check = await ensureDatabaseAndTables();
  if (!check.ok) return { ok: false, error: check.reason || "MySQL no disponible" };
  const pool = getDbPool();
  if (!pool) return { ok: false, error: "Pool de MySQL no disponible" };
  try {
    const conn = await pool.getConnection();
    await conn.query(`
      INSERT INTO configuracion_parametros (
        id, umbral_subida_moderada_pct, umbral_subida_critica_pct,
        umbral_concentracion_proveedor_pct, notificar_concentracion_proveedor,
        dias_anticipacion_vencimiento, notificar_facturas_vencidas,
        regimen_fiscal_predeterminado, tipo_retencion_predeterminada
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        umbral_subida_moderada_pct = VALUES(umbral_subida_moderada_pct),
        umbral_subida_critica_pct = VALUES(umbral_subida_critica_pct),
        umbral_concentracion_proveedor_pct = VALUES(umbral_concentracion_proveedor_pct),
        notificar_concentracion_proveedor = VALUES(notificar_concentracion_proveedor),
        dias_anticipacion_vencimiento = VALUES(dias_anticipacion_vencimiento),
        notificar_facturas_vencidas = VALUES(notificar_facturas_vencidas),
        regimen_fiscal_predeterminado = VALUES(regimen_fiscal_predeterminado),
        tipo_retencion_predeterminada = VALUES(tipo_retencion_predeterminada)
    `, [
      Number(params.umbralSubidaModeradaPct ?? 8),
      Number(params.umbralSubidaCriticaPct ?? 15),
      Number(params.umbralConcentracionProveedorPct ?? params.umbralConcentracionPct ?? 30),
      params.notificarConcentracionProveedor !== false ? 1 : 0,
      Number(params.diasAnticipacionVencimiento ?? 3),
      params.notificarFacturasVencidas !== false ? 1 : 0,
      String(params.regimenFiscalPredeterminado || "R\xE9gimen General Peninsular"),
      String(params.tipoRetencionPredeterminada || "15% Profesional")
    ]);
    conn.release();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
async function obtenerParametrosSistemaDeMySQL() {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return null;
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT * FROM configuracion_parametros WHERE id = 1 LIMIT 1");
    conn.release();
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        umbralSubidaModeradaPct: Number(r.umbral_subida_moderada_pct || 8),
        umbralSubidaCriticaPct: Number(r.umbral_subida_critica_pct || 15),
        umbralConcentracionProveedorPct: Number(r.umbral_concentracion_proveedor_pct || 30),
        notificarConcentracionProveedor: Boolean(r.notificar_concentracion_proveedor),
        diasAnticipacionVencimiento: Number(r.dias_anticipacion_vencimiento || 3),
        notificarFacturasVencidas: Boolean(r.notificar_facturas_vencidas),
        regimenFiscalPredeterminado: r.regimen_fiscal_predeterminado || "R\xE9gimen General Peninsular",
        tipoRetencionPredeterminada: r.tipo_retencion_predeterminada || "15% Profesional"
      };
    }
    return null;
  } catch {
    return null;
  }
}
async function guardarAnalisisEjecutivoEnMySQL(analisis) {
  if (!analisis || !analisis.estadoGeneral) return { ok: false, error: "An\xE1lisis no v\xE1lido" };
  const check = await ensureDatabaseAndTables();
  if (!check.ok) return { ok: false, error: check.reason || "MySQL no disponible" };
  const pool = getDbPool();
  if (!pool) return { ok: false, error: "Pool de MySQL no disponible" };
  try {
    const conn = await pool.getConnection();
    const id = String(analisis.id || `analisis-${Date.now()}`);
    const fecha = analisis.fechaGeneracion ? new Date(analisis.fechaGeneracion) : /* @__PURE__ */ new Date();
    await conn.query(`
      INSERT INTO analisis_financieros_ia (
        id, fecha_generacion, estado_general, principales_gastos, cambios_importantes, alertas, tres_acciones,
        oportunidades_ahorro, prioridad_semana, total_gasto_analizado
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        fecha_generacion = VALUES(fecha_generacion),
        estado_general = VALUES(estado_general),
        principales_gastos = VALUES(principales_gastos),
        cambios_importantes = VALUES(cambios_importantes),
        alertas = VALUES(alertas),
        tres_acciones = VALUES(tres_acciones),
        oportunidades_ahorro = VALUES(oportunidades_ahorro),
        prioridad_semana = VALUES(prioridad_semana),
        total_gasto_analizado = VALUES(total_gasto_analizado)
    `, [
      id,
      fecha,
      analisis.estadoGeneral,
      JSON.stringify(analisis.principalesGastos || []),
      JSON.stringify(analisis.cambiosImportantes || []),
      JSON.stringify(analisis.alertas || []),
      JSON.stringify(analisis.tresAcciones || []),
      JSON.stringify(analisis.oportunidadesAhorro || []),
      analisis.prioridadSemana || "",
      Number(analisis.totalGastoAnalizado || 0)
    ]);
    conn.release();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
async function obtenerAnalisisEjecutivoDeMySQL() {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return null;
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT * FROM analisis_financieros_ia ORDER BY fecha_generacion DESC, creado_en DESC LIMIT 1");
    conn.release();
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        fechaGeneracion: r.fecha_generacion ? new Date(r.fecha_generacion).toISOString() : (/* @__PURE__ */ new Date()).toISOString(),
        estadoGeneral: r.estado_general,
        principalesGastos: r.principales_gastos ? JSON.parse(r.principales_gastos) : ["Aprovisionamientos y materias primas", "Suministros energ\xE9ticos", "Log\xEDstica y servicios operacionales"],
        cambiosImportantes: r.cambios_importantes ? JSON.parse(r.cambios_importantes) : ["Revisi\xF3n peri\xF3dica de precios de proveedores clave."],
        alertas: r.alertas ? JSON.parse(r.alertas) : ["Monitoreo de vencimientos y concentraci\xF3n de compras."],
        tresAcciones: r.tres_acciones ? JSON.parse(r.tres_acciones) : [],
        oportunidadesAhorro: r.oportunidades_ahorro ? JSON.parse(r.oportunidades_ahorro) : [],
        prioridadSemana: r.prioridad_semana || "",
        totalGastoAnalizado: Number(r.total_gasto_analizado || 0)
      };
    }
    return null;
  } catch {
    return null;
  }
}
async function guardarMensajeChatEnMySQL(msg) {
  if (!msg || !msg.texto) return { ok: false, error: "Mensaje vac\xEDo" };
  const check = await ensureDatabaseAndTables();
  if (!check.ok) return { ok: false, error: check.reason || "MySQL no disponible" };
  const pool = getDbPool();
  if (!pool) return { ok: false, error: "Pool de MySQL no disponible" };
  try {
    const conn = await pool.getConnection();
    const id = String(msg.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const emisor = msg.emisor === "usuario" ? "usuario" : "asistente";
    await conn.query(`
      INSERT INTO historial_chat_ia (id, emisor, mensaje, sugerencias)
      VALUES (?, ?, ?, ?)
    `, [
      id,
      emisor,
      msg.texto,
      msg.sugerencias ? JSON.stringify(msg.sugerencias) : null
    ]);
    conn.release();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
async function obtenerHistorialChatDeMySQL(limit = 50) {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(
      'SELECT id, emisor, mensaje AS texto, sugerencias, DATE_FORMAT(creado_en, "%Y-%m-%d %H:%i:%s") as fecha FROM historial_chat_ia ORDER BY creado_en ASC LIMIT ?',
      [limit]
    );
    conn.release();
    return rows.map((r) => ({
      id: r.id,
      emisor: r.emisor,
      texto: r.texto,
      fecha: r.fecha,
      sugerencias: r.sugerencias ? JSON.parse(r.sugerencias) : void 0
    }));
  } catch {
    return [];
  }
}
async function limpiarHistorialChatEnMySQL() {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return { ok: false };
  try {
    const conn = await pool.getConnection();
    await conn.query("DELETE FROM historial_chat_ia");
    conn.release();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}
async function guardarDeclaracionAeatEnMySQL(d) {
  if (!d || !d.modelo) return { ok: false, error: "Declaraci\xF3n AEAT no v\xE1lida" };
  const check = await ensureDatabaseAndTables();
  if (!check.ok) return { ok: false, error: check.reason || "MySQL no disponible" };
  const pool = getDbPool();
  if (!pool) return { ok: false, error: "Pool de MySQL no disponible" };
  try {
    const conn = await pool.getConnection();
    const id = String(d.id || `${d.modelo}-${d.ejercicio}-${d.periodo}`);
    await conn.query(`
      INSERT INTO declaraciones_aeat (
        id, modelo, ejercicio, periodo, estado,
        resultado_declaracion, datos_casillas, csv_justificante, fecha_presentacion
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE
        estado = VALUES(estado),
        resultado_declaracion = VALUES(resultado_declaracion),
        datos_casillas = VALUES(datos_casillas),
        csv_justificante = VALUES(csv_justificante),
        fecha_presentacion = VALUES(fecha_presentacion)
    `, [
      id,
      String(d.modelo),
      Number(d.ejercicio || (/* @__PURE__ */ new Date()).getFullYear()),
      String(d.periodo || "1T"),
      String(d.estado || "Calculado"),
      Number(d.resultadoDeclaracion || d.resultado || 0),
      d.datosCasillas ? JSON.stringify(d.datosCasillas) : null,
      d.csvJustificante || null,
      d.fechaPresentacion ? sanitizeSqlDate2(d.fechaPresentacion) : null
    ]);
    conn.release();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
async function obtenerDeclaracionesAeatDeMySQL(modelo, ejercicio) {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    let query = "SELECT * FROM declaraciones_aeat WHERE 1=1";
    const params = [];
    if (modelo) {
      query += " AND modelo = ?";
      params.push(modelo);
    }
    if (ejercicio) {
      query += " AND ejercicio = ?";
      params.push(ejercicio);
    }
    query += " ORDER BY ejercicio DESC, periodo DESC";
    const [rows] = await conn.query(query, params);
    conn.release();
    return rows.map((r) => ({
      id: r.id,
      modelo: r.modelo,
      ejercicio: r.ejercicio,
      periodo: r.periodo,
      estado: r.estado,
      resultadoDeclaracion: Number(r.resultado_declaracion || 0),
      datosCasillas: r.datos_casillas ? JSON.parse(r.datos_casillas) : void 0,
      csvJustificante: r.csv_justificante,
      fechaPresentacion: r.fecha_presentacion,
      actualizadoEn: r.actualizado_en
    }));
  } catch {
    return [];
  }
}
async function guardarConfiguracionGoogleEnMySQL(config) {
  if (!config) return { ok: false, error: "Configuraci\xF3n no v\xE1lida" };
  const check = await ensureDatabaseAndTables();
  if (!check.ok) return { ok: false, error: check.reason || "MySQL no disponible" };
  const pool = getDbPool();
  if (!pool) return { ok: false, error: "Pool de MySQL no disponible" };
  try {
    const conn = await pool.getConnection();
    await conn.query(`
      INSERT INTO integraciones_google (
        id, sheet_id, endpoint_url, drive_folder_id, auto_sync, is_sheet_data_active, ultima_sincronizacion
      ) VALUES (1, ?, ?, ?, ?, ?, NOW())
      ON DUPLICATE KEY UPDATE
        sheet_id = VALUES(sheet_id),
        endpoint_url = VALUES(endpoint_url),
        drive_folder_id = VALUES(drive_folder_id),
        auto_sync = VALUES(auto_sync),
        is_sheet_data_active = VALUES(is_sheet_data_active),
        ultima_sincronizacion = NOW()
    `, [
      config.sheetId || "",
      config.endpointUrl || "",
      config.driveFolderId || "",
      config.autoSync !== false ? 1 : 0,
      config.isSheetDataActive ? 1 : 0
    ]);
    conn.release();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err.message };
  }
}
async function obtenerConfiguracionGoogleDeMySQL() {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return null;
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query("SELECT * FROM integraciones_google WHERE id = 1 LIMIT 1");
    conn.release();
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        sheetId: r.sheet_id || "",
        endpointUrl: r.endpoint_url || process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL || "",
        driveFolderId: r.drive_folder_id || process.env.GOOGLE_DRIVE_FOLDER_ID || "",
        autoSync: Boolean(r.auto_sync),
        isSheetDataActive: Boolean(r.is_sheet_data_active),
        ultimaSincronizacion: r.ultima_sincronizacion
      };
    }
    return null;
  } catch {
    return null;
  }
}
async function sincronizarTodoHaciaMySQL(datos) {
  const check = await ensureDatabaseAndTables();
  if (!check.ok) {
    return {
      success: false,
      mysqlDisponible: false,
      facturasReplicadas: 0,
      proveedoresReplicados: 0,
      alertasReplicadas: 0,
      categoriasReplicadas: 0,
      datosNegocioGuardados: false,
      parametrosGuardados: false,
      analisisGuardado: false,
      configuracionGoogleGuardada: false,
      declaracionesGuardadas: 0,
      errores: [check.reason || "MySQL no est\xE1 accesible"],
      razonFallo: check.reason || `No hay conexi\xF3n con MySQL en ${activeConfig.host}:${activeConfig.port}`
    };
  }
  const erroresTotales = [];
  let datosNegocioGuardados = false;
  if (datos.datosNegocio) {
    const resNegocio = await guardarDatosNegocioEnMySQL(datos.datosNegocio);
    datosNegocioGuardados = resNegocio.ok;
    if (resNegocio.error) erroresTotales.push(`Datos Negocio: ${resNegocio.error}`);
  }
  let categoriasReplicadas = 0;
  if (Array.isArray(datos.categorias) && datos.categorias.length > 0) {
    const resCats = await guardarCategoriasEnMySQL(datos.categorias);
    categoriasReplicadas = resCats.replicadas;
    erroresTotales.push(...resCats.errores);
  }
  let facturasReplicadas = 0;
  if (Array.isArray(datos.facturas) && datos.facturas.length > 0) {
    const resFacts = await guardarFacturasEnMySQL(datos.facturas);
    facturasReplicadas = resFacts.replicadas;
    erroresTotales.push(...resFacts.errores);
  }
  let proveedoresReplicados = 0;
  if (Array.isArray(datos.proveedores) && datos.proveedores.length > 0) {
    const resProvs = await guardarProveedoresEnMySQL(datos.proveedores);
    proveedoresReplicados = resProvs.replicadas;
    erroresTotales.push(...resProvs.errores);
  }
  let alertasReplicadas = 0;
  if (Array.isArray(datos.alertas) && datos.alertas.length > 0) {
    const resAlerts = await guardarAlertasEnMySQL(datos.alertas);
    alertasReplicadas = resAlerts.replicadas;
    erroresTotales.push(...resAlerts.errores);
  }
  let parametrosGuardados = false;
  if (datos.parametrosSistema) {
    const resParams = await guardarParametrosSistemaEnMySQL(datos.parametrosSistema);
    parametrosGuardados = resParams.ok;
    if (resParams.error) erroresTotales.push(`Par\xE1metros: ${resParams.error}`);
  }
  let analisisGuardado = false;
  if (datos.analisis) {
    const resAnalisis = await guardarAnalisisEjecutivoEnMySQL(datos.analisis);
    analisisGuardado = resAnalisis.ok;
    if (resAnalisis.error) erroresTotales.push(`An\xE1lisis IA: ${resAnalisis.error}`);
  }
  let configuracionGoogleGuardada = false;
  if (datos.configuracionGoogle) {
    const resGoogle = await guardarConfiguracionGoogleEnMySQL(datos.configuracionGoogle);
    configuracionGoogleGuardada = resGoogle.ok;
    if (resGoogle.error) erroresTotales.push(`Configuraci\xF3n Google: ${resGoogle.error}`);
  }
  let declaracionesGuardadas = 0;
  if (Array.isArray(datos.declaracionesAeat) && datos.declaracionesAeat.length > 0) {
    for (const d of datos.declaracionesAeat) {
      const resD = await guardarDeclaracionAeatEnMySQL(d);
      if (resD.ok) declaracionesGuardadas++;
      else if (resD.error) erroresTotales.push(`Declaraci\xF3n ${d.modelo}: ${resD.error}`);
    }
  }
  return {
    success: true,
    mysqlDisponible: true,
    facturasReplicadas,
    proveedoresReplicados,
    alertasReplicadas,
    categoriasReplicadas,
    datosNegocioGuardados,
    parametrosGuardados,
    analisisGuardado,
    configuracionGoogleGuardada,
    declaracionesGuardadas,
    errores: erroresTotales
  };
}
async function guardarAlertasEnMySQL(alertas) {
  if (!Array.isArray(alertas) || alertas.length === 0) {
    return { replicadas: 0, errores: [], mysqlDisponible: isDbConnected };
  }
  const check = await ensureDatabaseAndTables();
  if (!check.ok) {
    return {
      replicadas: 0,
      errores: [check.reason || "MySQL no est\xE1 accesible"],
      mysqlDisponible: false
    };
  }
  const pool = getDbPool();
  if (!pool) {
    return { replicadas: 0, errores: ["Pool de MySQL no disponible"], mysqlDisponible: false };
  }
  let replicadas = 0;
  const errores = [];
  try {
    const conn = await pool.getConnection();
    for (const a of alertas) {
      try {
        const id = String(a.id || "").trim();
        if (!id) continue;
        const tipo = String(a.tipo || "GENERAL").trim();
        const nivel = ["critica", "alta", "media", "informativa"].includes(a.nivel) ? a.nivel : "media";
        const titulo = String(a.titulo || "Alerta").trim();
        const descripcion = String(a.descripcion || "").trim();
        const fecha = a.fecha ? new Date(a.fecha) : /* @__PURE__ */ new Date();
        const estado = ["activa", "resuelta", "ignorada"].includes(a.estado) ? a.estado : "activa";
        let datosRelacionadosJson = null;
        if (a.datosRelacionados) {
          datosRelacionadosJson = typeof a.datosRelacionados === "string" ? a.datosRelacionados : JSON.stringify(a.datosRelacionados);
        }
        await conn.query(
          `INSERT INTO alertas (id, tipo, nivel, titulo, descripcion, fecha, estado, datos_relacionados)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)
           ON DUPLICATE KEY UPDATE
             nivel = VALUES(nivel),
             titulo = VALUES(titulo),
             descripcion = VALUES(descripcion),
             estado = VALUES(estado),
             datos_relacionados = VALUES(datos_relacionados)`,
          [id, tipo, nivel, titulo, descripcion, fecha, estado, datosRelacionadosJson]
        );
        replicadas++;
      } catch (rowErr) {
        errores.push(`Alerta ${a.id}: ${rowErr.message}`);
      }
    }
    conn.release();
    return { replicadas, errores, mysqlDisponible: true };
  } catch (err) {
    return { replicadas, errores: [...errores, err.message], mysqlDisponible: false };
  }
}
async function obtenerAlertasDeMySQL() {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    const [rows] = await conn.query(`
      SELECT 
        id,
        tipo,
        nivel,
        titulo,
        descripcion,
        DATE_FORMAT(fecha, '%Y-%m-%d %H:%i:%s') AS fecha,
        estado,
        datos_relacionados AS datosRelacionados
      FROM alertas
      ORDER BY fecha DESC
    `);
    conn.release();
    return rows.map((a) => {
      let datosRelacionadosParsed = null;
      if (a.datosRelacionados) {
        try {
          datosRelacionadosParsed = typeof a.datosRelacionados === "string" ? JSON.parse(a.datosRelacionados) : a.datosRelacionados;
        } catch {
          datosRelacionadosParsed = a.datosRelacionados;
        }
      }
      return {
        ...a,
        datosRelacionados: datosRelacionadosParsed
      };
    });
  } catch (err) {
    console.warn("Aviso al consultar alertas en MySQL:", err?.message);
    return [];
  }
}
async function actualizarEstadoAlertaEnMySQL(idAlerta, nuevoEstado, alertaCompleta) {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) {
    return { ok: false, error: "MySQL no est\xE1 disponible" };
  }
  const normalizedId = String(idAlerta).trim();
  const estadoValido = ["activa", "resuelta", "ignorada"].includes(nuevoEstado) ? nuevoEstado : "activa";
  try {
    const conn = await pool.getConnection();
    const [res] = await conn.query(
      "UPDATE alertas SET estado = ? WHERE id = ?",
      [estadoValido, normalizedId]
    );
    if (res.affectedRows === 0 && alertaCompleta) {
      const a = alertaCompleta;
      const tipo = String(a.tipo || "ANOMAL\xCDA").trim();
      const nivel = String(a.nivel || "media").trim();
      const titulo = String(a.titulo || "Alerta").trim();
      const descripcion = String(a.descripcion || "").trim();
      const fecha = a.fecha ? new Date(a.fecha) : /* @__PURE__ */ new Date();
      let datosRelacionadosJson = null;
      if (a.datosRelacionados) {
        datosRelacionadosJson = typeof a.datosRelacionados === "string" ? a.datosRelacionados : JSON.stringify(a.datosRelacionados);
      }
      await conn.query(
        `INSERT INTO alertas (id, tipo, nivel, titulo, descripcion, fecha, estado, datos_relacionados)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON DUPLICATE KEY UPDATE estado = VALUES(estado)`,
        [normalizedId, tipo, nivel, titulo, descripcion, fecha, estadoValido, datosRelacionadosJson]
      );
    }
    conn.release();
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}
function generarScriptSqlCompleto2(facturas, proveedores = [], datosNegocio, categorias, parametros) {
  const dbName = activeConfig.database || "finance_ai_db";
  return generarScriptSqlCompleto({
    facturas,
    proveedores,
    datosNegocio,
    categorias,
    parametros,
    databaseName: dbName
  });
}

// server.ts
dotenv2.config();
var app = express();
var PORT = 3e3;
app.use((req, _res, next) => {
  try {
    const rawUrl = req.url || "";
    if (rawUrl.includes("__path=")) {
      const urlObj = new URL(rawUrl, "http://localhost");
      const customPath = urlObj.searchParams.get("__path");
      if (customPath) {
        urlObj.searchParams.delete("__path");
        const remaining = urlObj.searchParams.toString();
        req.url = customPath + (remaining ? "?" + remaining : "");
      }
    } else if (req.headers && req.headers["x-target-path"]) {
      req.url = req.headers["x-target-path"];
    }
  } catch {
  }
  if (req.body !== void 0 && req.body !== null) {
    return next();
  }
  return express.json({ limit: "50mb" })(req, _res, (err) => {
    if (err) return next();
    return express.urlencoded({ extended: true, limit: "50mb" })(req, _res, next);
  });
});
app.get("/api", (_req, res) => {
  res.json({ success: true, service: "Finance AI API", version: "1.0.0" });
});
app.get("/api/health", (_req, res) => {
  res.json({ success: true, status: "ok", timestamp: (/* @__PURE__ */ new Date()).toISOString() });
});
function getGeminiApiKey() {
  const customKey = process.env.MY_GEMINI_API_KEY?.trim();
  if (customKey && customKey !== "MY_GEMINI_API_KEY" && customKey.length > 5) {
    return customKey;
  }
  const defaultKey = process.env.GEMINI_API_KEY?.trim();
  if (defaultKey && defaultKey !== "MY_GEMINI_API_KEY" && defaultKey.length > 5) {
    return defaultKey;
  }
  return null;
}
function getGeminiClient() {
  const apiKey = getGeminiApiKey();
  if (!apiKey) {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build"
      }
    }
  });
}
var DEFAULT_CATEGORIAS_GASTO_SERVER = [
  {
    id: "materias-primas",
    nombre: "Materias Primas",
    descripcion: "Harinas, l\xE1cteos, az\xFAcares, ingredientes base y consumibles directos de producci\xF3n.",
    color: "#f43f5e",
    esPredeterminada: true
  },
  {
    id: "suministros-y-energia",
    nombre: "Suministros y Energ\xEDa",
    descripcion: "Electricidad, gas, agua, telecomunicaciones, internet y suministros energ\xE9ticos operativos.",
    color: "#0ea5e9",
    esPredeterminada: true
  },
  {
    id: "envases-y-embalajes",
    nombre: "Envases y Embalajes",
    descripcion: "Cajas kraft, bobinas, bandejas, film, bolsas, etiquetas y material de empaquetado.",
    color: "#f59e0b",
    esPredeterminada: true
  },
  {
    id: "logistica-y-transporte",
    nombre: "Log\xEDstica y Transporte",
    descripcion: "Portes, transporte frigor\xEDfico/refrigerado, env\xEDos urgentes, fletes y servicios de reparto.",
    color: "#10b981",
    esPredeterminada: true
  },
  {
    id: "mantenimiento-y-maquinaria",
    nombre: "Mantenimiento y Maquinaria",
    descripcion: "Reparaciones t\xE9cnicas, revisiones preventivas de hornos, climatizaci\xF3n, recambios y herramientas.",
    color: "#8b5cf6",
    esPredeterminada: true
  },
  {
    id: "servicios-y-gestion",
    nombre: "Servicios y Gesti\xF3n",
    descripcion: "Asesor\xEDa contable, fiscal y laboral, licencias de software, seguros y servicios profesionales.",
    color: "#ec4899",
    esPredeterminada: true
  }
];
function getServerStorePath() {
  const dir = path2.join(process.cwd(), "tmp");
  if (!fs2.existsSync(dir)) {
    try {
      fs2.mkdirSync(dir, { recursive: true });
    } catch {
    }
  }
  return path2.join(dir, "enterprise_server_store.json");
}
function loadServerStore() {
  try {
    const file = getServerStorePath();
    if (fs2.existsSync(file)) {
      const data = JSON.parse(fs2.readFileSync(file, "utf-8"));
      if (data && Array.isArray(data.facturas)) {
        const hasDemoInvoices = data.facturas.length > 10 || data.facturas.some((f) => f.idFactura === "FAC-001" || f.nombreProveedor?.includes("Harinas"));
        return {
          facturas: hasDemoInvoices ? [] : data.facturas,
          proveedores: hasDemoInvoices ? [] : Array.isArray(data.proveedores) ? data.proveedores : [],
          datosNegocio: data.datosNegocio || DEFAULT_DATOS_NEGOCIO,
          categorias: Array.isArray(data.categorias) && data.categorias.length > 0 ? data.categorias : DEFAULT_CATEGORIAS_GASTO_SERVER
        };
      }
    }
  } catch (e) {
    console.warn("Aviso al cargar server store persistente de disco:", e);
  }
  return {
    facturas: [],
    proveedores: [],
    datosNegocio: { ...DEFAULT_DATOS_NEGOCIO },
    categorias: [...DEFAULT_CATEGORIAS_GASTO_SERVER]
  };
}
var initialLoadedStore = loadServerStore();
var serverFacturas = initialLoadedStore.facturas;
var serverProveedores = initialLoadedStore.proveedores;
var serverDatosNegocio = initialLoadedStore.datosNegocio;
var storedCategoriasGasto = initialLoadedStore.categorias;
function persistServerStore() {
  try {
    const file = getServerStorePath();
    const data = {
      facturas: serverFacturas,
      proveedores: serverProveedores,
      datosNegocio: serverDatosNegocio,
      categorias: storedCategoriasGasto
    };
    fs2.writeFileSync(file, JSON.stringify(data, null, 2), "utf-8");
  } catch (e) {
    console.warn("Aviso al persistir server store en disco:", e);
  }
}
var SHEETS_CONFIG = {
  sheetId: process.env.GOOGLE_SHEETS_ID || "",
  endpointUrl: process.env.GOOGLE_SHEETS_ENDPOINT_URL || ""
};
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    geminiConfigured: !!getGeminiApiKey(),
    sheetsConfigured: !!SHEETS_CONFIG.sheetId || !!SHEETS_CONFIG.endpointUrl,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/datos-negocio", async (req, res) => {
  try {
    const dbDatos = await obtenerDatosNegocioDeMySQL();
    if (dbDatos && dbDatos.nombre) {
      serverDatosNegocio = { ...serverDatosNegocio, ...dbDatos };
      persistServerStore();
      return res.json({ success: true, datos: dbDatos, fuente: "mysql" });
    }
  } catch (err) {
    console.warn("Aviso al leer datos_negocio de MySQL:", err?.message);
  }
  return res.json({ success: true, datos: serverDatosNegocio, fuente: "persistent_cache" });
});
app.post("/api/datos-negocio", async (req, res) => {
  const { datos } = req.body || {};
  if (datos && typeof datos === "object") {
    serverDatosNegocio = { ...serverDatosNegocio, ...datos };
    persistServerStore();
    let guardadoEnMySQL = false;
    try {
      const resDb = await guardarDatosNegocioEnMySQL(datos);
      guardadoEnMySQL = resDb.ok;
    } catch (e) {
      console.warn("Error al guardar datos_negocio en MySQL:", e?.message);
    }
    return res.json({
      success: true,
      datos: serverDatosNegocio,
      mysqlGuardado: guardadoEnMySQL
    });
  }
  return res.status(400).json({ error: "Payload de datos_negocio no v\xE1lido" });
});
app.get("/api/categorias-gasto", async (req, res) => {
  try {
    const dbCats = await obtenerCategoriasDeMySQL();
    if (dbCats && dbCats.length > 0) {
      storedCategoriasGasto = dbCats;
      persistServerStore();
      return res.json({ categorias: dbCats, fuente: "mysql" });
    }
  } catch (err) {
    console.warn("Aviso al leer categorias_gasto de MySQL:", err?.message);
  }
  return res.json({ categorias: storedCategoriasGasto, fuente: "persistent_cache" });
});
app.post("/api/categorias-gasto", async (req, res) => {
  const { categorias } = req.body;
  if (Array.isArray(categorias) && categorias.length > 0) {
    storedCategoriasGasto = categorias;
    persistServerStore();
    let guardadoEnMySQL = false;
    let mysqlReplicadas = 0;
    try {
      const resDb = await guardarCategoriasEnMySQL(categorias);
      guardadoEnMySQL = resDb.mysqlDisponible;
      mysqlReplicadas = resDb.replicadas;
    } catch (e) {
      console.warn("Error al guardar categorias_gasto en MySQL:", e?.message);
    }
    return res.json({
      success: true,
      count: storedCategoriasGasto.length,
      categorias: storedCategoriasGasto,
      mysqlGuardado: guardadoEnMySQL,
      mysqlReplicadas
    });
  }
  return res.status(400).json({ error: "Array de categor\xEDas no v\xE1lido" });
});
function generateGroundedExecutiveAnalysis(facturas = [], proveedores = [], alertas = [], resumenIVA = {}, datosNegocioInput = "La Empresa") {
  const safeFacturas = Array.isArray(facturas) ? facturas : [];
  const safeProveedores = Array.isArray(proveedores) ? proveedores : [];
  const safeAlertas = Array.isArray(alertas) ? alertas : [];
  const nombreNegocio = (typeof datosNegocioInput === "string" ? datosNegocioInput : datosNegocioInput?.nombre) || "La Empresa";
  const sector = typeof datosNegocioInput === "object" && datosNegocioInput?.sector ? datosNegocioInput.sector : "Comercio y Servicios";
  const contextoOperativo = typeof datosNegocioInput === "object" && datosNegocioInput?.contextoOperativo ? datosNegocioInput.contextoOperativo : "Operativa comercial est\xE1ndar";
  const totalGasto = safeFacturas.reduce((acc, f) => acc + (Number(f.total) || 0), 0);
  const totalBase = safeFacturas.reduce((acc, f) => acc + (Number(f.baseImponible) || 0), 0);
  const facturasCount = safeFacturas.length;
  const catMap = {};
  safeFacturas.forEach((f) => {
    const cat = f.categoriaGasto || "Gastos Operativos";
    catMap[cat] = (catMap[cat] || 0) + (Number(f.total) || 0);
  });
  const sortedCategories = Object.entries(catMap).map(([nombre, total]) => ({
    nombre,
    total,
    porcentaje: totalGasto > 0 ? total / totalGasto * 100 : 0
  })).sort((a, b) => b.total - a.total);
  const provMap = {};
  safeFacturas.forEach((f) => {
    const pId = f.idProveedor || f.nombreProveedor || "PROV-GENERIC";
    const pNom = f.nombreProveedor || pId;
    if (!provMap[pId]) {
      provMap[pId] = { nombre: pNom, total: 0, count: 0 };
    }
    provMap[pId].total += Number(f.total) || 0;
    provMap[pId].count += 1;
  });
  const sortedSuppliers = Object.values(provMap).map((p) => ({
    ...p,
    porcentaje: totalGasto > 0 ? p.total / totalGasto * 100 : 0
  })).sort((a, b) => b.total - a.total);
  const facturasVencidas = safeFacturas.filter((f) => f.estado === "Vencida");
  const facturasPendientes = safeFacturas.filter((f) => f.estado === "Pendiente");
  const totalVencido = facturasVencidas.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
  const totalPendiente = facturasPendientes.reduce((sum, f) => sum + (Number(f.total) || 0), 0);
  const topCat = sortedCategories[0] || { nombre: "Gastos Generales", total: totalGasto, porcentaje: 100 };
  const topProv = sortedSuppliers[0] || { nombre: "Proveedor Principal", total: totalGasto, porcentaje: 100, count: 1 };
  const estadoGeneral = facturasCount > 0 ? `${nombreNegocio} (Sector: ${sector}) registra un volumen acumulado de ${totalGasto.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC distribuidos en ${facturasCount} facturas. La partida con mayor concentraci\xF3n presupuestaria es "${topCat.nombre}" (${topCat.porcentaje.toFixed(1)}% del gasto total). La relaci\xF3n de compras muestra a ${topProv.nombre} como principal suministrador del negocio, alineado con su operativa de ${contextoOperativo.slice(0, 120)}...` : `${nombreNegocio} (${sector}) no dispone de facturas suficientes registradas para emitir un balance consolidado. Se recomienda registrar facturas de proveedores para activar el an\xE1lisis continuo.`;
  const principalesGastos = sortedCategories.length > 0 ? sortedCategories.slice(0, 4).map((c) => `${c.nombre}: ${c.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC (${c.porcentaje.toFixed(1)}% del total registrado)`) : ["Sin partidas registradas todav\xEDa en el periodo actual."];
  const cambiosImportantes = [];
  const alertasPrecio = safeAlertas.filter((a) => a.tipo === "SUBIDA DE PRECIO" || a.tipo === "ANOMALIA");
  if (alertasPrecio.length > 0) {
    alertasPrecio.slice(0, 3).forEach((a) => {
      cambiosImportantes.push(`${a.proveedor || a.titulo}: ${a.descripcion}`);
    });
  } else if (sortedSuppliers.length > 0) {
    cambiosImportantes.push(`Concentraci\xF3n del gasto en ${topProv.nombre} alcanzando el ${topProv.porcentaje.toFixed(1)}% del presupuesto en ${sector}.`);
    if (sortedSuppliers.length > 1) {
      cambiosImportantes.push(`Segundo proveedor en volumen: ${sortedSuppliers[1].nombre} con ${sortedSuppliers[1].total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC.`);
    }
  } else {
    cambiosImportantes.push(`Evoluci\xF3n de costes estable seg\xFAn las facturas computadas para ${nombreNegocio}.`);
  }
  const alertasGeneradas = [];
  if (facturasVencidas.length > 0) {
    alertasGeneradas.push(`${facturasVencidas.length} factura(s) vencida(s) pendiente(s) de regularizar por un total de ${totalVencido.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC.`);
  }
  if (topProv.porcentaje > 35 && sortedSuppliers.length > 1) {
    alertasGeneradas.push(`Dependencia operativa elevada en ${topProv.nombre} (${topProv.porcentaje.toFixed(1)}% de las compras en ${sector}).`);
  }
  if (facturasPendientes.length > 0) {
    alertasGeneradas.push(`${facturasPendientes.length} factura(s) pendiente(s) de pago con vencimiento programado (${totalPendiente.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC).`);
  }
  if (alertasGeneradas.length === 0) {
    alertasGeneradas.push("No se detectan incidencias cr\xEDticas ni vencimientos superados en la cartera actual.");
  }
  const oportunidadesAhorro = [];
  if (sortedSuppliers.length > 0) {
    oportunidadesAhorro.push(`Negociar acuerdo de rappel o descuento por volumen con ${topProv.nombre} sobre el volumen acumulado de ${topProv.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC para mitigar el coste de aprovisionamiento en ${sector}.`);
  }
  if (sortedCategories.length > 1) {
    oportunidadesAhorro.push(`Revisar y contrastar tarifas en la partida clave de "${sortedCategories[0].nombre}" para diversificar proveedores en la operativa de ${nombreNegocio}.`);
  }
  oportunidadesAhorro.push(`Agrupar pedidos y aprovisionamientos quincenales para optimizar costes de portes y gesti\xF3n administrativa adaptada al modelo operativo.`);
  const tresAcciones = [
    {
      accion: facturasVencidas.length > 0 ? `Regularizar las ${facturasVencidas.length} facturas vencidas (${totalVencido.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC)` : `Revisar el calendario de vencimiento de las ${facturasPendientes.length} facturas pendientes`,
      motivo: `Asegurar el flujo continuo de suministros y evitar penalizaciones comerciales en ${nombreNegocio} (${sector}).`,
      datos: facturasVencidas.length > 0 ? `Facturas: ${facturasVencidas.map((f) => f.idFactura).slice(0, 3).join(", ")}` : `Importe pendiente: ${totalPendiente.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC`,
      impacto: "Inmediato"
    },
    {
      accion: `Negociar condiciones marco con ${topProv.nombre}`,
      motivo: `Concentra el ${topProv.porcentaje.toFixed(1)}% del presupuesto total (${topProv.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC) en partidas estrat\xE9gicas de ${nombreNegocio}.`,
      datos: `${topProv.count} facturas emitidas por este proveedor`,
      impacto: "Alto"
    },
    {
      accion: `Auditar costes unitarios en la categor\xEDa "${topCat.nombre}"`,
      motivo: `Controlar el margen operativo frente a oscilaciones de precios del mercado en el sector ${sector}.`,
      datos: `Partida que representa ${topCat.total.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC`,
      impacto: "Medio"
    }
  ];
  const prioridadSemana = facturasVencidas.length > 0 ? `Regularizar con urgencia las ${facturasVencidas.length} factura(s) con vencimiento superado (${totalVencido.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC) para evitar retrasos en el aprovisionamiento de ${nombreNegocio}.` : `Revisar condiciones comerciales y precios con el proveedor principal (${topProv.nombre}) en ${sector}.`;
  return {
    id: `ANALISIS-${Date.now()}`,
    fechaGeneracion: (/* @__PURE__ */ new Date()).toISOString(),
    estadoGeneral,
    principalesGastos,
    cambiosImportantes,
    alertas: alertasGeneradas,
    oportunidadesAhorro,
    tresAcciones,
    prioridadSemana
  };
}
app.post("/api/gemini/extract-invoice", async (req, res) => {
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
      categoriasDisponibles
    } = req.body;
    if (!fileData) {
      return res.status(400).json({ error: "No se ha proporcionado el archivo de factura." });
    }
    const ai = getGeminiClient();
    const empresa = nombreNegocio || datosNegocio?.nombre || "la empresa receptora";
    const sectorNegocio = sector || datosNegocio?.sector || "Comercio y Hosteler\xEDa";
    const contextoNegocio = contextoOperativo || datosNegocio?.contextoOperativo || "Actividad comercial regular con compras a proveedores";
    const nifNegocio = datosNegocio?.nif || "";
    const direccionNegocio = datosNegocio?.direccion || "";
    const catsToUse = Array.isArray(categoriasDisponibles) && categoriasDisponibles.length > 0 ? categoriasDisponibles : storedCategoriasGasto;
    const listaCatsPrompt = catsToUse.map((c) => `- "${c.nombre}": ${c.descripcion || "Gastos de la actividad"}`).join("\n");
    if (!ai) {
      return res.status(503).json({
        error: "No se ha detectado la clave de Gemini en el servidor (MY_GEMINI_API_KEY o GEMINI_API_KEY).",
        detail: "Aseg\xFArate de haber guardado el valor de tu clave en el secreto de entorno en Settings > Secrets.",
        code: "MISSING_API_KEY"
      });
    }
    const systemPrompt = `Eres un auditor contable y analista financiero especializado en empresas del sector "${sectorNegocio}" para "${empresa}" (NIF: ${nifNegocio || "No especificado"}, Direcci\xF3n: ${direccionNegocio || "No especificada"}).
Contexto operativo y modelo del negocio cliente: "${contextoNegocio}".

Tu misi\xF3n es extraer con precisi\xF3n matem\xE1tica y fidelidad absoluta todos los datos de la factura adjunta emitida por un proveedor a favor de "${empresa}".

REGLAS OBLIGATORIAS:
1. El receptor o cliente de la factura es "${empresa}" (NIF: ${nifNegocio}). El emisor o vendedor es el proveedor. NO confundir el proveedor con el cliente receptor.
2. PROPUESTA AUTOM\xC1TICA DE CATEGOR\xCDA DE GASTO ("categoriaGasto"):
Debes analizar minuciosamente el NOMBRE DEL PROVEEDOR (emisor) y la DESCRIPCI\xD3N/DETALLE DE LOS PRODUCTOS O SERVICIOS facturados para proponer autom\xE1ticamente la categor\xEDa de gasto m\xE1s exacta.
Cat\xE1logo de categor\xEDas disponibles en el sistema para esta empresa:
${listaCatsPrompt}

En "categoriaGastoJustificacion", redacta una frase concisa explicando c\xF3mo el proveedor y la descripci\xF3n del producto justifican la categor\xEDa elegida (ej: "Propuesto como '${catsToUse[0]?.nombre || "Materias Primas"}' porque el proveedor suministra...").
3. No inventar datos. Si un campo no existe en el documento, escribe exactamente: "Pendiente de confirmar".
4. Mantener exactamente el nombre del producto o servicio si aparece en las l\xEDneas.
5. Extraer los importes num\xE9ricos en euros sin s\xEDmbolos de moneda.
6. Tipo de Gravamen e Impuestos:
   - R\xE9gimen General Peninsular: '21%', '10%', '4%'.
   - Tipos temporales reducidos de alimentos/aceite de oliva: '0% (Temporal)', '5% (Temporal)', '2% (Temporal)'.
   - R\xE9gimen auton\xF3mico canario: 'IGIC 7%', 'IGIC 3%', 'IGIC 0%'.
   - Recargo de Equivalencia (R.E.): Si la factura indica recargo de equivalencia (minoristas), marcar "aplicaRecargoEquivalencia: true", extraer la cuota del recargo en "cuotaRecargoEquivalencia" e indicar el tipo en "tipoRecargoEquivalencia" (ej: '5.2%', '1.4%', '0.5%', '0.62%', '0.7%').
   - Retenci\xF3n de IRPF: Si la factura incluye retenci\xF3n de IRPF (t\xEDpico en facturas de aut\xF3nomos y profesionales al 15% o 7%, o alquileres de locales al 19%, o agr\xEDcolas al 2%), marcar "aplicaRetencionIRPF: true", extraer "porcentajeIRPF" (n\xFAmero, ej: 15, 7, 19), "tipoRetencionIRPF" (ej: "15%", "7%", "19%"), "cuotaIRPF" (cuota retenida en euros), y "conceptoRetencionIRPF" ("PROFESIONAL", "ARRENDAMIENTO", "AGRARIO" o "OTRO"). El total l\xEDquido debe calcularse como: Base + IVA/IGIC + Recargo - Retenci\xF3n IRPF.
   - Operaciones exentas: '0% Exento'.
7. Si conoces la lista de proveedores registrados: ${JSON.stringify(existingSuppliers || [])}, intenta vincular el idProveedor si coincide el nombre del proveedor. Si es nuevo, as\xEDgnale un ID coherente.`;
    const cleanBase64 = fileData.includes("base64,") ? fileData.split("base64,")[1] : fileData;
    const documentPart = {
      inlineData: {
        mimeType: mimeType || "application/pdf",
        data: cleanBase64
      }
    };
    const textPart = {
      text: `Por favor analiza esta factura y extrae los datos estructurados en formato JSON seg\xFAn el siguiente esquema, contemplando el r\xE9gimen fiscal (IVA Peninsular 21/10/4%, temporales 0/5%, IGIC canario 7/3%, Recargo de Equivalencia o Retenci\xF3n de IRPF) y proponiendo autom\xE1ticamente la categor\xEDa de gasto adecuada.`
    };
    let parsedJson = null;
    const invoiceSchema = {
      type: Type.OBJECT,
      properties: {
        idFactura: { type: Type.STRING, description: "N\xFAmero o ID oficial de la factura" },
        fechaEmision: { type: Type.STRING, description: "Fecha de emisi\xF3n en formato YYYY-MM-DD" },
        idProveedor: { type: Type.STRING, description: "ID del proveedor o c\xF3digo asignado" },
        nombreProveedor: { type: Type.STRING, description: "Nombre o raz\xF3n social del proveedor" },
        concepto: { type: Type.STRING, description: "Concepto general o descripci\xF3n del servicio/compra" },
        importe: { type: Type.NUMBER, description: "Base imponible o importe neto antes de impuestos" },
        fechaVencimiento: { type: Type.STRING, description: "Fecha de vencimiento en formato YYYY-MM-DD" },
        estado: { type: Type.STRING, description: "Estado: Pagada, Pendiente o Vencida" },
        fechaPago: { type: Type.STRING, description: 'Fecha en que se pag\xF3 o "Pendiente de confirmar"' },
        baseImponible: { type: Type.NUMBER, description: "Base imponible total" },
        tiposIVA: { type: Type.STRING, description: 'Porcentaje o tipos aplicados, ej: "21%", "10%", "4%", "0% (Temporal)", "5% (Temporal)", "IGIC 7%"' },
        cuotaIVA: { type: Type.NUMBER, description: "Importe de cuota de IVA o IGIC en euros" },
        regimenFiscal: { type: Type.STRING, description: "R\xE9gimen fiscal: R\xE9gimen General Peninsular, Tipos Temporales / Alimentos, IGIC Canario, Recargo de Equivalencia, o Exento" },
        aplicaRecargoEquivalencia: { type: Type.BOOLEAN, description: "true si la factura contiene recargo de equivalencia minorista" },
        tipoRecargoEquivalencia: { type: Type.STRING, description: 'Porcentaje del recargo de equivalencia ej: "5.2%", "1.4%", "0.5%", "0.62%", "0.7%"' },
        cuotaRecargoEquivalencia: { type: Type.NUMBER, description: "Importe de la cuota del recargo de equivalencia en euros" },
        aplicaRetencionIRPF: { type: Type.BOOLEAN, description: "true si la factura incluye retenci\xF3n de IRPF a cuenta (profesionales, alquileres, aut\xF3nomos)" },
        porcentajeIRPF: { type: Type.NUMBER, description: "Porcentaje num\xE9rico de IRPF aplicado (ej: 15, 7, 19, 2, 1)" },
        tipoRetencionIRPF: { type: Type.STRING, description: 'Texto del tipo de retenci\xF3n, ej: "15%", "7%", "19%"' },
        cuotaIRPF: { type: Type.NUMBER, description: "Cuota monetaria retenida de IRPF en euros" },
        conceptoRetencionIRPF: { type: Type.STRING, description: "Concepto IRPF: PROFESIONAL, ARRENDAMIENTO, AGRARIO o OTRO" },
        total: { type: Type.NUMBER, description: "Importe total l\xEDquido de la factura (Base + IVA/IGIC + Recargo - Retenci\xF3n IRPF)" },
        categoriaGasto: {
          type: Type.STRING,
          description: `Categor\xEDa de gasto elegida entre: ${catsToUse.map((c) => `"${c.nombre}"`).join(", ")}`
        },
        categoriaGastoJustificacion: {
          type: Type.STRING,
          description: "Breve explicaci\xF3n de c\xF3mo el nombre del proveedor y la descripci\xF3n del producto determinan la categor\xEDa propuesta"
        },
        lineas: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              nombreProducto: { type: Type.STRING, description: "Nombre exacto del producto o l\xEDnea" },
              cantidad: { type: Type.NUMBER, description: "Cantidad facturada" },
              unidad: { type: Type.STRING, description: "Unidad de medida (kg, ud, L, cajas)" },
              precioUnitario: { type: Type.NUMBER, description: "Precio unitario sin IVA" },
              subtotal: { type: Type.NUMBER, description: "Subtotal de la l\xEDnea" }
            },
            required: ["nombreProducto", "cantidad", "precioUnitario", "subtotal"]
          }
        }
      },
      required: [
        "idFactura",
        "fechaEmision",
        "nombreProveedor",
        "baseImponible",
        "tiposIVA",
        "cuotaIVA",
        "total",
        "categoriaGasto"
      ]
    };
    try {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: { parts: [documentPart, textPart] },
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: invoiceSchema
          }
        });
        parsedJson = JSON.parse(response.text || "{}");
      } catch (firstErr) {
        console.warn("Gemini 3.8 Flash busy on invoice extraction, retrying with gemini-3.1-flash-lite:", firstErr?.message);
        const retryResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: { parts: [documentPart, textPart] },
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: invoiceSchema
          }
        });
        parsedJson = JSON.parse(retryResponse.text || "{}");
      }
    } catch (apiErr) {
      console.error("Error al invocar la API de Gemini para extraer factura:", apiErr);
      const isQuota = apiErr?.message?.includes("429") || apiErr?.message?.includes("quota") || apiErr?.message?.includes("RESOURCE_EXHAUSTED");
      const isKeyInvalid = apiErr?.message?.includes("API_KEY_INVALID") || apiErr?.message?.includes("403");
      const isUnavailable = apiErr?.message?.includes("503") || apiErr?.message?.includes("UNAVAILABLE");
      return res.status(isUnavailable ? 503 : 502).json({
        error: isQuota ? "L\xEDmite de cuota excedido temporalmente en Gemini API." : isKeyInvalid ? "La clave GEMINI_API_KEY no es v\xE1lida o carece de permisos." : isUnavailable ? "Los servidores de Gemini est\xE1n experimentando alta demanda temporal. Por favor int\xE9ntalo de nuevo en unos momentos." : "No se pudo leer la factura con Gemini AI.",
        detail: apiErr?.message || "Error durante la lectura del documento.",
        code: isQuota ? "QUOTA_EXCEEDED" : isKeyInvalid ? "INVALID_KEY" : isUnavailable ? "MODEL_BUSY" : "EXTRACTION_FAILED"
      });
    }
    if (!parsedJson || !parsedJson.idFactura || !parsedJson.nombreProveedor) {
      return res.status(422).json({
        error: "El modelo no pudo extraer los datos esenciales de la factura.",
        detail: "Aseg\xFArate de que el archivo sea legible y contenga el n\xFAmero de factura, fecha, proveedor e importes.",
        code: "PARSE_FAILED"
      });
    }
    parsedJson.archivoNombre = fileName || "documento.pdf";
    if (!parsedJson.idProveedor) parsedJson.idProveedor = "PROV-NUEVO";
    if (!parsedJson.estado) parsedJson.estado = "Pendiente";
    if (!parsedJson.fechaPago) parsedJson.fechaPago = "Pendiente de confirmar";
    parsedJson.categoriaGastoSugerida = true;
    if (!parsedJson.categoriaGasto || parsedJson.categoriaGasto === "Pendiente de confirmar") {
      const textoCompleto = `${parsedJson.nombreProveedor || ""} ${parsedJson.concepto || ""} ${(parsedJson.lineas || []).map((l) => l.nombreProducto || "").join(" ")}`.toLowerCase();
      if (/transporte|logistica|logística|envio|envío|flete|porte|mensajer|paqueter|seur|dhl|mrw|gls|ups|nacex|fedex|reparto|distribuc/.test(textoCompleto)) {
        parsedJson.categoriaGasto = "Log\xEDstica";
        parsedJson.categoriaGastoJustificacion = `Propuesto autom\xE1ticamente como 'Log\xEDstica' por servicios de transporte o env\xEDos de "${parsedJson.nombreProveedor}".`;
      } else if (/asesor|gestor|abogad|legal|software|licencia|hosting|cloud|consultor|seguro|limpieza|seguridad|auditor|honorario|banco|comision|cuota/.test(textoCompleto)) {
        parsedJson.categoriaGasto = "Servicios";
        parsedJson.categoriaGastoJustificacion = `Propuesto autom\xE1ticamente como 'Servicios' por gesti\xF3n profesional o servicios de "${parsedJson.nombreProveedor}".`;
      } else if (/caja|carton|cartón|embalaj|envase|bolsa|film|bobina|kraft|etiqueta|empaque|plastico|plástico/.test(textoCompleto)) {
        parsedJson.categoriaGasto = "Envases y Embalajes";
        parsedJson.categoriaGastoJustificacion = `Propuesto autom\xE1ticamente como 'Envases y Embalajes' por materiales de empaque de "${parsedJson.nombreProveedor}".`;
      } else if (/electric|luz|gas|agua|energia|energía|iberdrola|endesa|naturgy|telefon|internet|fibra/.test(textoCompleto)) {
        parsedJson.categoriaGasto = "Suministros y Energ\xEDa";
        parsedJson.categoriaGastoJustificacion = `Propuesto autom\xE1ticamente como 'Suministros y Energ\xEDa' para consumos de suministros.`;
      } else if (/mantenimiento|reparac|maquinaria|horno|motor|recambio|repuesto|tecnico|técnico|averia|avería/.test(textoCompleto)) {
        parsedJson.categoriaGasto = "Mantenimiento y Maquinaria";
        parsedJson.categoriaGastoJustificacion = `Propuesto autom\xE1ticamente como 'Mantenimiento y Maquinaria' por soporte t\xE9cnico de equipos.`;
      } else {
        parsedJson.categoriaGasto = "Insumos";
        parsedJson.categoriaGastoJustificacion = `Propuesto autom\xE1ticamente como 'Insumos' para producci\xF3n seg\xFAn el proveedor "${parsedJson.nombreProveedor}".`;
      }
    } else if (!parsedJson.categoriaGastoJustificacion) {
      const primerProd = parsedJson.lineas?.[0]?.nombreProducto || parsedJson.concepto || "productos";
      parsedJson.categoriaGastoJustificacion = `Propuesto autom\xE1ticamente por Gemini en base al proveedor "${parsedJson.nombreProveedor}" y los art\xEDculos adquiridos (${primerProd}).`;
    }
    return res.json({ factura: parsedJson, simulated: false });
  } catch (error) {
    console.error("Error general al procesar factura con Gemini:", error);
    return res.status(500).json({
      error: "Error interno al procesar el archivo de la factura.",
      detail: error?.message || "Error inesperado del servidor.",
      code: "SERVER_ERROR"
    });
  }
});
app.post("/api/gemini/analisis-ejecutivo", async (req, res) => {
  try {
    const { facturas, proveedores, alertas, resumenIVA, nombreNegocio, datosNegocio, sector, contextoOperativo } = req.body;
    const businessName = nombreNegocio || datosNegocio?.nombre || "La Empresa";
    const businessSector = sector || datosNegocio?.sector || "Hosteler\xEDa, Obrador y Confiter\xEDa Artesanal";
    const businessContext = contextoOperativo || datosNegocio?.contextoOperativo || "Obrador artesanal con despacho directo y distribuci\xF3n B2B. Aprovisionamiento clave de harinas especiales, grasas l\xE1cteas, az\xFAcares, cajas kraft y consumo intensivo de energ\xEDa en hornos.";
    const businessNif = datosNegocio?.nif || "";
    const businessAddress = datosNegocio?.direccion || "";
    const businessInfo = {
      nombre: businessName,
      sector: businessSector,
      contextoOperativo: businessContext,
      nif: businessNif,
      direccion: businessAddress
    };
    const ai = getGeminiClient();
    if (!ai) {
      const fallbackAnalisis = generateGroundedExecutiveAnalysis(
        facturas,
        proveedores,
        alertas,
        resumenIVA,
        businessInfo
      );
      return res.json({ analisis: fallbackAnalisis, simulated: true });
    }
    const systemPrompt = `Eres el Director Financiero (CFO) y auditor contable estrat\xE9gico exclusivo de "${businessName}".

INFORMACI\xD3N OBLIGATORIA DEL NEGOCIO AUDITADO:
- Nombre / Raz\xF3n Social: "${businessName}" (NIF: ${businessNif || "No especificado"}, Sede: ${businessAddress || "No especificada"})
- Sector de Actividad: "${businessSector}"
- Contexto Operativo y Modelo de Negocio: "${businessContext}"

INSTRUCCIONES OBLIGATORIAS DE AUDITOR\xCDA Y PERSONALIZACI\xD3N:
1. OBLIGATORIO: Todas las conclusiones, diagn\xF3sticos de concentraci\xF3n de costes, alertas cr\xEDticas, oportunidades de ahorro y las 3 acciones prioritarias DEBEN estar completamente personalizadas para "${businessName}", considerando obligatoriamente su sector ("${businessSector}") y su modelo operativo real ("${businessContext}").
2. Contextualiza las partidas contables en funci\xF3n de este sector concreto (por ejemplo, si es obrador/pasteler\xEDa, los costes de harinas, mantecas, hornos y packaging; si es tecnolog\xEDa, hosting y licencias; etc.).
3. Detecta anomal\xEDas en precios, proveedores dominantes y riesgos de margen bas\xE1ndote \xDANICAMENTE en las facturas y proveedores reales recibidos. NO inventes proveedores ni datos ficticios.
4. Genera el resultado en formato JSON estricto respetando el esquema.`;
    const promptText = `Por favor elabora el informe de auditor\xEDa ejecutiva y an\xE1lisis financiero de costes para:

DATOS DEL NEGOCIO:
- Empresa: ${businessName}
- Sector: ${businessSector}
- Contexto Operativo: ${businessContext}

FACTURAS REGISTRADAS (${facturas?.length || 0}): ${JSON.stringify(facturas?.slice(0, 35) || [])}
PROVEEDORES REGISTRADOS (${proveedores?.length || 0}): ${JSON.stringify(proveedores || [])}
ALERTAS REGISTRADAS: ${JSON.stringify(alertas || [])}
RESUMEN FISCAL / IVA: ${JSON.stringify(resumenIVA || {})}`;
    let parsed = null;
    try {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents: promptText,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                estadoGeneral: { type: Type.STRING, description: "Estado general del negocio (m\xE1ximo 5 l\xEDneas concisas)" },
                principalesGastos: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Principales \xE1reas y conceptos de gasto detectados"
                },
                cambiosImportantes: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Variaciones relevantes y cambios respecto a periodos anteriores"
                },
                alertas: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Alertas financieras, de riesgo o proveedores"
                },
                oportunidadesAhorro: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description: "Oportunidades de ahorro o revisi\xF3n fundadas en los datos"
                },
                tresAcciones: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      accion: { type: Type.STRING, description: "Acci\xF3n espec\xEDfica a ejecutar" },
                      motivo: { type: Type.STRING, description: "Motivo o justificaci\xF3n empresarial" },
                      datos: { type: Type.STRING, description: "Datos concretos que la justifican" },
                      impacto: { type: Type.STRING, description: "Inmediato, Alto o Medio" }
                    },
                    required: ["accion", "motivo", "datos", "impacto"]
                  },
                  description: "Exactamente 3 acciones recomendadas ordenadas por impacto"
                },
                prioridadSemana: {
                  type: Type.STRING,
                  description: "Si solo pudieras revisar una sola cosa esta semana..."
                }
              },
              required: [
                "estadoGeneral",
                "principalesGastos",
                "cambiosImportantes",
                "alertas",
                "oportunidadesAhorro",
                "tresAcciones",
                "prioridadSemana"
              ]
            }
          }
        });
        parsed = JSON.parse(response.text || "{}");
      } catch (firstErr) {
        console.warn("Gemini 3.8 Flash busy on executive analysis, retrying with gemini-3.1-flash-lite:", firstErr?.message);
        const retryResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents: promptText,
          config: {
            systemInstruction: systemPrompt,
            responseMimeType: "application/json",
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
                    required: ["accion", "motivo", "datos", "impacto"]
                  }
                },
                prioridadSemana: { type: Type.STRING }
              },
              required: [
                "estadoGeneral",
                "principalesGastos",
                "cambiosImportantes",
                "alertas",
                "oportunidadesAhorro",
                "tresAcciones",
                "prioridadSemana"
              ]
            }
          }
        });
        parsed = JSON.parse(retryResponse.text || "{}");
      }
    } catch (modelErr) {
      console.warn("Gemini models temporarily busy in executive analysis, using dynamic grounded calculation:", modelErr?.message);
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
    parsed.fechaGeneracion = (/* @__PURE__ */ new Date()).toISOString();
    try {
      await guardarAnalisisEjecutivoEnMySQL(parsed);
    } catch (e) {
      console.warn("Aviso al guardar an\xE1lisis en MySQL:", e?.message);
    }
    return res.json({ analisis: parsed, simulated: false });
  } catch (error) {
    console.error("Error en an\xE1lisis ejecutivo:", error);
    return res.status(500).json({ error: error?.message || "Error al generar an\xE1lisis ejecutivo" });
  }
});
app.post("/api/gemini/chat", async (req, res) => {
  try {
    const { mensaje, historial, facturas, proveedores, alertas, resumenIVA, nombreNegocio, datosNegocio, sector, contextoOperativo } = req.body;
    const businessName = nombreNegocio || datosNegocio?.nombre || "tu empresa";
    const businessSector = sector || datosNegocio?.sector || "Comercio y Hosteler\xEDa";
    const businessContext = contextoOperativo || datosNegocio?.contextoOperativo || "Actividad comercial regular con compras peri\xF3dicas a proveedores";
    const businessNif = datosNegocio?.nif || "";
    const ai = getGeminiClient();
    const generateLocalChatAnswer = () => {
      const safeFacturas = Array.isArray(facturas) ? facturas : [];
      const safeProveedores = Array.isArray(proveedores) ? proveedores : [];
      const safeAlertas = Array.isArray(alertas) ? alertas : [];
      const totalGasto = safeFacturas.reduce((acc, f) => acc + (Number(f.total) || 0), 0);
      const provSpendMap = {};
      safeFacturas.forEach((f) => {
        const pNom = f.nombreProveedor || "Proveedor";
        if (!provSpendMap[pNom]) provSpendMap[pNom] = { nombre: pNom, total: 0 };
        provSpendMap[pNom].total += Number(f.total) || 0;
      });
      const topProv = Object.values(provSpendMap).sort((a, b) => b.total - a.total)[0] || safeProveedores[0] || { nombre: "Proveedor Principal", total: totalGasto };
      const catMap = {};
      safeFacturas.forEach((f) => {
        const cat = f.categoriaGasto || "Gastos Operativos";
        catMap[cat] = (catMap[cat] || 0) + (Number(f.total) || 0);
      });
      const topCategories = Object.entries(catMap).sort((a, b) => b[1] - a[1]);
      const topCat = topCategories[0] || ["Gastos Operativos", totalGasto];
      const facturasVencidas = safeFacturas.filter((f) => f.estado === "Vencida");
      const facturasPendientes = safeFacturas.filter((f) => f.estado === "Pendiente");
      const msgLower = (mensaje || "").toLowerCase();
      if (msgLower.includes("gastando m\xE1s") || msgLower.includes("mayor gasto") || msgLower.includes("principales gastos")) {
        const breakdown = topCategories.slice(0, 3).map(([cat, tot], idx) => {
          const pct = totalGasto > 0 ? (tot / totalGasto * 100).toFixed(1) : "0";
          return `${idx + 1}. **${cat}**: ${tot.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC (${pct}% del total)`;
        }).join("\n");
        return `Seg\xFAn los datos registrados de **${businessName}** (${businessSector}), el gasto total acumulado asciende a **${totalGasto.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC**.

Tus principales partidas de gasto son:
${breakdown || "Sin partidas computadas a\xFAn."}`;
      } else if (msgLower.includes("proveedor m\xE1s importante") || msgLower.includes("principal proveedor") || msgLower.includes("proveedor") && msgLower.includes("importante")) {
        const pctProv = totalGasto > 0 && topProv.total ? (topProv.total / totalGasto * 100).toFixed(1) : "0";
        return `Tu proveedor de mayor volumen registrado para **${businessName}** (${businessSector}) es **${topProv.nombre || topProv.nombreProveedor}**, con un total acumulado de **${(topProv.total || topProv.importeMensual || 0).toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC** (aproximadamente un ${pctProv}% del gasto total).`;
      } else if (msgLower.includes("aumentado precios") || msgLower.includes("encarecido") || msgLower.includes("subid") || msgLower.includes("precio")) {
        const subidasAlertas = safeAlertas.filter((a) => a.tipo === "SUBIDA DE PRECIO" || a.tipo === "ANOMALIA");
        if (subidasAlertas.length > 0) {
          const lista = subidasAlertas.map((a) => `\u2022 **${a.proveedor || a.titulo}**: ${a.descripcion}`).join("\n");
          return `Se han detectado variaciones notables en las siguientes compras de **${businessName}**:

${lista}`;
        }
        return `En base a las facturas computadas de **${businessName}**, no se han registrado incrementos an\xF3malos o subidas cr\xEDticas de precios en las alertas activas.`;
      } else if (msgLower.includes("revisar esta semana") || msgLower.includes("prioridad") || msgLower.includes("semana")) {
        if (facturasVencidas.length > 0) {
          const sumVencida = facturasVencidas.reduce((s, f) => s + (Number(f.total) || 0), 0);
          return `**Prioridad de la semana para ${businessName} (${businessSector}):**

Regularizar las **${facturasVencidas.length} facturas vencidas** que suman un total de **${sumVencida.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC** (${facturasVencidas.map((f) => f.idFactura).slice(0, 3).join(", ")}) para asegurar el flujo de aprovisionamiento.`;
        }
        return `**Prioridad de la semana para ${businessName} (${businessSector}):**

Revisar las condiciones de compra y tarifas de la categor\xEDa principal (**${topCat[0]}**), que representa el mayor volumen de gasto registrado.`;
      } else {
        return `Analizando las **${safeFacturas.length} facturas** y **${safeProveedores.length} proveedores** de **${businessName}** (${businessSector}):

\u2022 **Gasto total acumulado:** ${totalGasto.toLocaleString("es-ES", { minimumFractionDigits: 2 })} \u20AC.
\u2022 **Facturas pendientes/vencidas:** ${facturasPendientes.length + facturasVencidas.length}.
\u2022 **Categor\xEDa principal:** ${topCat[0]}.

\xBFDeseas que analice alg\xFAn proveedor, factura o partida en particular?`;
      }
    };
    if (!ai) {
      return res.json({ respuesta: generateLocalChatAnswer(), simulated: true });
    }
    const systemPrompt = `Eres "Finance AI", el consultor financiero y analista contable exclusivo de "${businessName}".

INFORMACI\xD3N OBLIGATORIA DEL NEGOCIO:
- Empresa: "${businessName}" (NIF: ${businessNif || "No especificado"})
- Sector: "${businessSector}"
- Contexto Operativo: "${businessContext}"

REGLAS OBLIGATORIAS:
1. Contextualiza SIEMPRE tus respuestas considerando que el negocio pertenece al sector "${businessSector}" y tiene el modelo operativo: ${businessContext}.
2. Utiliza \xDANICAMENTE la informaci\xF3n financiera y de facturas actualmente registrada que te proporcionamos:
   - Facturas registradas (${facturas?.length || 0})
   - Proveedores registrados (${proveedores?.length || 0})
   - Alertas activas (${alertas?.length || 0})
   - Resumen de IVA
3. Responde con lenguaje claro, profesional y estructurado (usando negritas, vi\xF1etas y cifras num\xE9ricas exactas en euros).
4. Si la informaci\xF3n solicitada no existe o no es suficiente en los datos registrados, responde con honestidad: "No puedo determinarlo con los datos disponibles en tus facturas."
5. No inventes datos, nombres de proveedores, importes ni fechas que no est\xE9n en la base de datos.`;
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
    const contents = [
      { text: `${contextData}

Pregunta del usuario: ${mensaje}` }
    ];
    if (historial && Array.isArray(historial) && historial.length > 0) {
      const recentHistory = historial.slice(-6);
      const conversationText = recentHistory.map((m) => `${m.emisor === "usuario" ? "Usuario" : "Asistente"}: ${m.texto}`).join("\n");
      contents[0] = { text: `${contextData}

Conversaci\xF3n previa:
${conversationText}

Nueva pregunta del usuario: ${mensaje}` };
    }
    let responseText = "";
    try {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.8-flash",
          contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2
          }
        });
        responseText = response.text || "";
      } catch (firstErr) {
        console.warn("Gemini 3.8 Flash busy on chat, retrying with gemini-3.1-flash-lite:", firstErr?.message);
        const retryResponse = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite",
          contents,
          config: {
            systemInstruction: systemPrompt,
            temperature: 0.2
          }
        });
        responseText = retryResponse.text || "";
      }
    } catch (modelErr) {
      console.warn("Gemini models busy in chat, using grounded response:", modelErr?.message);
      responseText = generateLocalChatAnswer();
    }
    const respuestaFinal = responseText || generateLocalChatAnswer();
    try {
      if (mensaje) {
        await guardarMensajeChatEnMySQL({ emisor: "usuario", texto: mensaje });
      }
      if (respuestaFinal) {
        await guardarMensajeChatEnMySQL({ emisor: "asistente", texto: respuestaFinal });
      }
    } catch (e) {
      console.warn("Aviso al guardar historial de chat en MySQL:", e?.message);
    }
    return res.json({ respuesta: respuestaFinal, simulated: false });
  } catch (error) {
    console.error("Error en chat con Gemini:", error);
    return res.status(500).json({ error: error?.message || "Error en servicio de consulta" });
  }
});
async function procesarGuardadoFacturaDBFirst(req, res, facturaInput, configInput, archivoInput) {
  const pool = getDbPool();
  try {
    const factura = facturaInput;
    const config = configInput || req.body?.config;
    const archivo = archivoInput || req.body?.archivo;
    if (!factura || !factura.idFactura) {
      return res.status(400).json({ error: "Datos de factura inv\xE1lidos o ID ausente" });
    }
    const idFactura = String(factura.idFactura).trim();
    const idProveedor = String(factura.idProveedor || "PROV-GEN").trim();
    const nombreProveedor = String(factura.nombreProveedor || "Proveedor General").trim();
    const nombreOriginal = archivo?.fileName || factura.archivoNombre || "factura.pdf";
    let extension = ".pdf";
    const dotIndex = nombreOriginal.lastIndexOf(".");
    if (dotIndex !== -1) {
      extension = nombreOriginal.substring(dotIndex);
    }
    const driveFileNameCalculado = `${idFactura} ${factura.fechaEmision || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]}${extension}`;
    const driveFolderNameCalculado = (nombreProveedor || "Proveedores Varios").trim();
    const base64Data = archivo?.base64Data || archivo?.base64 || factura.archivoBase64;
    const hasBase64 = Boolean(base64Data && base64Data.length > 50);
    const mimeType = archivo?.mimeType || (nombreOriginal.toLowerCase().endsWith(".pdf") ? "application/pdf" : "image/jpeg");
    const nuevaFila = {
      idFactura,
      fechaEmision: factura.fechaEmision,
      idProveedor,
      nombreProveedor,
      concepto: factura.concepto || "Factura de compra",
      importe: Number(factura.importe || factura.baseImponible || 0),
      fechaVencimiento: factura.fechaVencimiento || factura.fechaEmision,
      estado: factura.estado || "Pendiente",
      fechaPago: factura.fechaPago || "Pendiente de confirmar",
      baseImponible: Number(factura.baseImponible || 0),
      tiposIVA: factura.tiposIVA || "21%",
      cuotaIVA: Number(factura.cuotaIVA || 0),
      regimenFiscal: factura.regimenFiscal || "R\xE9gimen General Peninsular",
      aplicaRecargoEquivalencia: Boolean(factura.aplicaRecargoEquivalencia),
      tipoRecargoEquivalencia: factura.tipoRecargoEquivalencia || "",
      cuotaRecargoEquivalencia: Number(factura.cuotaRecargoEquivalencia || 0),
      aplicaRetencionIRPF: Boolean(factura.aplicaRetencionIRPF),
      tipoRetencionIRPF: factura.tipoRetencionIRPF || "",
      porcentajeIRPF: Number(factura.porcentajeIRPF || 0),
      cuotaIRPF: Number(factura.cuotaIRPF || 0),
      conceptoRetencionIRPF: factura.conceptoRetencionIRPF || "",
      total: Number(factura.total || 0),
      categoriaGasto: factura.categoriaGasto || "Materias Primas",
      categoriaGastoJustificacion: factura.categoriaGastoJustificacion || "",
      notas: factura.notas || void 0,
      lineas: factura.lineas || [],
      sincronizadoSheets: false,
      archivoNombre: nombreOriginal,
      archivoBase64: base64Data,
      driveFileName: driveFileNameCalculado,
      driveFolderName: driveFolderNameCalculado,
      driveGuardado: false,
      fechaRegistro: (/* @__PURE__ */ new Date()).toISOString()
    };
    let mysqlGuardado = false;
    let mysqlError = null;
    try {
      const mysqlSyncResult = await guardarFacturasEnMySQL([nuevaFila]);
      if (mysqlSyncResult.replicadas > 0 || mysqlSyncResult.mysqlDisponible) {
        mysqlGuardado = true;
        console.log(`\u2705 [DB-First] Factura ${idFactura} persistida directamente en MySQL.`);
      } else if (mysqlSyncResult.errores.length > 0) {
        mysqlError = mysqlSyncResult.errores.join("; ");
        console.warn("\u26A0\uFE0F [DB-First] Aviso al guardar en MySQL:", mysqlError);
      }
    } catch (dbErr) {
      mysqlError = dbErr?.message || "Error en MySQL";
      console.warn("\u26A0\uFE0F [DB-First] Aviso al guardar en MySQL:", mysqlError);
    }
    const existingIndex = serverFacturas.findIndex((f) => f.idFactura === idFactura);
    if (existingIndex !== -1) {
      serverFacturas[existingIndex] = nuevaFila;
    } else {
      serverFacturas.push(nuevaFila);
    }
    persistServerStore();
    let driveGuardado = false;
    let driveError = void 0;
    const endpointUrl = config?.endpointUrl || process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL;
    const driveFolderId = config?.driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID || "";
    if (hasBase64 && endpointUrl && endpointUrl.startsWith("http")) {
      try {
        console.log(`[Google Drive Storage] Archivando recibo de factura ${idFactura} en Google Drive...`);
        const response = await fetch(endpointUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          redirect: "follow",
          signal: AbortSignal.timeout(16e3),
          body: JSON.stringify({
            action: "saveToDrive",
            driveFolderId,
            nombreProveedor: driveFolderNameCalculado,
            idFactura,
            fechaEmision: factura.fechaEmision,
            archivo: {
              base64: base64Data,
              nombre: driveFileNameCalculado,
              mimeType
            }
          })
        });
        const rawText = await response.text();
        let webhookResult = null;
        try {
          webhookResult = JSON.parse(rawText);
        } catch {
          webhookResult = { status: "non_json", raw: rawText.substring(0, 300) };
        }
        if (webhookResult && webhookResult.drive && webhookResult.drive.success) {
          driveGuardado = true;
          nuevaFila.driveGuardado = true;
          nuevaFila.driveFileUrl = webhookResult.drive.fileUrl;
          nuevaFila.driveFolderUrl = webhookResult.drive.carpetaProveedorUrl;
          nuevaFila.driveFileName = webhookResult.drive.fileName || driveFileNameCalculado;
          nuevaFila.driveFolderName = webhookResult.drive.carpetaProveedor || driveFolderNameCalculado;
          if (pool && isMySQLAvailable()) {
            try {
              await pool.query("UPDATE facturas SET archivo_ruta = ? WHERE id_factura = ?", [
                webhookResult.drive.fileUrl,
                idFactura
              ]);
            } catch (updateErr) {
              console.warn("Aviso al actualizar ruta Drive en MySQL:", updateErr);
            }
          }
        } else if (webhookResult && webhookResult.drive && !webhookResult.drive.success) {
          driveError = webhookResult.drive.error || "Aviso al archivar en Google Drive";
        }
      } catch (gErr) {
        console.warn("\u26A0\uFE0F [Google Drive] Error al subir justificante:", gErr?.message || gErr);
        driveError = `Fallo de conexi\xF3n con Google Drive: ${gErr?.message || "Timeout"}`;
      }
    }
    nuevaFila.driveGuardado = driveGuardado;
    if (driveError) nuevaFila.driveError = driveError;
    let mensajeRespuesta = "";
    if (mysqlGuardado && driveGuardado) {
      mensajeRespuesta = `Factura ${idFactura} guardada en MySQL y recibo archivado en Google Drive (Carpeta "${nuevaFila.driveFolderName}").`;
    } else if (mysqlGuardado) {
      mensajeRespuesta = `Factura ${idFactura} guardada con \xE9xito en la base de datos MySQL.`;
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
  } catch (error) {
    console.error("Error en procesarGuardadoFacturaDBFirst:", error);
    return res.status(500).json({ error: error?.message || "Error al guardar factura en base de datos" });
  }
}
app.post("/api/sheets/save-invoice", async (req, res) => {
  return await procesarGuardadoFacturaDBFirst(req, res, req.body.factura, req.body.config, req.body.archivo);
});
app.get("/api/sheets/status", async (req, res) => {
  const pool = getDbPool();
  let mysqlCount = 0;
  let mysqlOk = false;
  if (pool && isMySQLAvailable()) {
    try {
      const [rows] = await pool.query("SELECT COUNT(*) AS total FROM facturas");
      mysqlCount = rows[0]?.total || 0;
      mysqlOk = true;
    } catch {
      mysqlOk = false;
    }
  }
  res.json({
    sheetId: "",
    endpointUrl: process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL || "",
    driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || "",
    mysqlConectado: mysqlOk,
    mysqlFacturasCount: mysqlCount,
    totalFacturasGuardadas: mysqlOk ? mysqlCount : serverFacturas.length,
    status: process.env.GOOGLE_DRIVE_ENDPOINT_URL || mysqlOk ? "sincronizado" : "pendiente",
    tab: "Facturas",
    motor: mysqlOk ? "MySQL Relacional (Single Source of Truth / DB-First)" : "Memoria del Servidor"
  });
});
app.get("/api/sheets/verify", async (req, res) => {
  const endpointUrl = (req.query?.endpointUrl || process.env.GOOGLE_SHEETS_ENDPOINT_URL || "").trim();
  const rawSheetId = (req.query?.sheetId || process.env.GOOGLE_SHEETS_ID || "").trim();
  const sheetId = extractCleanSheetId(rawSheetId);
  const driveFolderId = (req.query?.driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID || "").trim();
  const pool = getDbPool();
  const mysqlOk = pool ? await testDbConnection() : false;
  if (!endpointUrl) {
    return res.json({
      accessible: mysqlOk,
      code: mysqlOk ? "OK_MYSQL_ONLY" : "NO_ENDPOINT",
      sheetId: sheetId || "",
      driveFolderId: driveFolderId || "",
      mysqlConectado: mysqlOk,
      mensaje: mysqlOk ? "Base de datos MySQL conectada y lista en local. (Google Apps Script no configurado)." : "No hay ninguna URL de Google Apps Script configurada."
    });
  }
  try {
    const testPayload = {
      action: "ping",
      tab: "Facturas",
      sheetId: sheetId || "",
      driveFolderId: driveFolderId || ""
    };
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(testPayload),
      redirect: "follow",
      signal: AbortSignal.timeout(15e3)
    });
    const contentType = response.headers.get("content-type") || "";
    const text = await response.text();
    if (text.includes("accounts.google.com") || text.includes("toegang nodig") || text.includes("Sign in") || text.includes("necesitas acceso")) {
      return res.json({
        accessible: false,
        code: "PERMISOS_GOOGLE_RESTRICTED",
        sheetId,
        endpointUrl,
        mensaje: 'La Web App de Google Apps Script no tiene permisos p\xFAblicos. En Google Apps Script, ve a Implementar > Gestionar implementaciones > Editar > Cambia "Qui\xE9n tiene acceso" a "Cualquier usuario" (Anyone).'
      });
    }
    let parsed = null;
    try {
      parsed = JSON.parse(text);
    } catch {
    }
    if (parsed && parsed.status === "success" && parsed.driveAuthorized !== void 0) {
      const drivePart = parsed.driveStatus ? ` (${parsed.driveStatus})` : "";
      return res.json({
        accessible: true,
        code: "OK",
        sheetId,
        endpointUrl,
        versionCorrecta: true,
        driveAuthorized: parsed.driveAuthorized,
        mensaje: `Acceso verificado con \xE9xito al servicio de almacenamiento de Google Drive${drivePart}`,
        driveStatus: parsed.driveStatus,
        detalles: parsed
      });
    }
    if (parsed && (parsed.status === "ignored" || parsed.message === "Fila insertada" || parsed.driveAuthorized === void 0)) {
      return res.json({
        accessible: true,
        code: "VERSION_DESACTUALIZADA",
        sheetId,
        endpointUrl,
        versionCorrecta: false,
        driveAuthorized: false,
        mensaje: '\u26A0\uFE0F Tu Web App est\xE1 activa pero ejecuta una VERSI\xD3N ANTIGUA del script (sin soporte para Google Drive). Debes copiar el c\xF3digo de "C\xF3digo Apps Script" y publicar una "Nueva versi\xF3n" en Implementar > Gestionar implementaciones.',
        detalles: parsed
      });
    }
    return res.json({
      accessible: false,
      code: "RESPUESTA_DESCONOCIDA",
      sheetId,
      endpointUrl,
      versionCorrecta: false,
      mensaje: "El endpoint respondi\xF3 pero con un formato inesperado.",
      preview: text.substring(0, 300)
    });
  } catch (error) {
    return res.json({
      accessible: false,
      code: "ERROR_CONEXION",
      sheetId,
      endpointUrl,
      mensaje: error?.message || "Error al intentar conectar con el endpoint de Google Apps Script."
    });
  }
});
var uploadToDriveHandler = async (req, res) => {
  try {
    const { idFactura, config, archivo, nombreProveedor, fechaEmision } = req.body;
    const endpointUrl = config?.endpointUrl || process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL;
    const driveFolderId = config?.driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID || "";
    if (!endpointUrl || !endpointUrl.startsWith("http")) {
      return res.status(400).json({
        success: false,
        error: "No hay URL de Google Drive / Apps Script configurada."
      });
    }
    const base64Data = archivo?.base64Data || archivo?.base64;
    if (!base64Data || base64Data.length < 50) {
      return res.status(400).json({
        success: false,
        error: "No se recibieron datos binarios del archivo para subir a Drive."
      });
    }
    const provCalculado = (nombreProveedor || "Varios").trim();
    const driveFileNameCalculado = `${idFactura} ${fechaEmision || (/* @__PURE__ */ new Date()).toISOString().split("T")[0]}.pdf`;
    const mimeType = archivo?.mimeType || "application/pdf";
    console.log(`[Upload to Drive] Subiendo recibo de factura ${idFactura} a Google Drive...`);
    const response = await fetch(endpointUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      redirect: "follow",
      body: JSON.stringify({
        action: "saveToDrive",
        driveFolderId,
        nombreProveedor: provCalculado,
        idFactura,
        fechaEmision,
        archivo: {
          base64: base64Data,
          nombre: driveFileNameCalculado,
          mimeType
        }
      })
    });
    const rawText = await response.text();
    let result = null;
    try {
      result = JSON.parse(rawText);
    } catch {
      result = { status: "error", raw: rawText.substring(0, 300) };
    }
    if (result && result.drive && result.drive.success) {
      const idx = serverFacturas.findIndex((f) => f.idFactura === idFactura);
      if (idx !== -1) {
        serverFacturas[idx].driveGuardado = true;
        serverFacturas[idx].driveFileUrl = result.drive.fileUrl;
        serverFacturas[idx].driveFolderUrl = result.drive.carpetaProveedorUrl;
        serverFacturas[idx].driveFileName = result.drive.fileName || driveFileNameCalculado;
        serverFacturas[idx].driveFolderName = result.drive.carpetaProveedor || provCalculado;
        serverFacturas[idx].driveError = void 0;
      }
      const pool = getDbPool();
      if (pool && isMySQLAvailable()) {
        try {
          await pool.query("UPDATE facturas SET archivo_ruta = ? WHERE id_factura = ?", [
            result.drive.fileUrl,
            idFactura
          ]);
        } catch {
        }
      }
      return res.json({
        success: true,
        drive: result.drive,
        mensaje: `Recibo de factura ${idFactura} archivado con \xE9xito en Google Drive`
      });
    } else {
      const errMsg = result?.drive?.error || result?.error || (result?.status === "ignored" ? "Tu script desplegado es la versi\xF3n antigua y no soporta Google Drive." : "Error al guardar en Drive");
      return res.status(500).json({
        success: false,
        error: errMsg
      });
    }
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: err?.message || "Error de conexi\xF3n al subir a Drive"
    });
  }
};
app.post("/api/drive/upload", uploadToDriveHandler);
app.post("/api/sheets/upload-to-drive", uploadToDriveHandler);
function extractCleanSheetId(input) {
  if (!input) return "";
  const trimmed = input.trim();
  const match = trimmed.match(/\/d\/([a-zA-Z0-9-_]+)/);
  if (match && match[1]) {
    return match[1];
  }
  return trimmed;
}
app.all("/api/sheets/fetch-invoices", async (req, res) => {
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
        mysqlRazonFallo: "",
        mysqlErrores: [],
        facturas,
        source: "mysql"
      });
    }
  } catch (err) {
    console.warn("Aviso en fetch-invoices desde MySQL:", err?.message);
  }
  return res.json({
    success: true,
    connected: true,
    hasRealData: serverFacturas.length > 0,
    count: serverFacturas.length,
    replicadasMySQL: serverFacturas.length,
    mysqlDisponible: isMySQLAvailable(),
    mysqlRazonFallo: "",
    mysqlErrores: [],
    facturas: serverFacturas,
    source: "mysql"
  });
});
app.get("/api/mysql/ping", async (req, res) => {
  const ping = await pingDb();
  return res.json({
    connected: ping.connected,
    latencyMs: ping.latencyMs,
    message: ping.message,
    host: ping.host,
    port: ping.port,
    database: ping.database,
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/mysql/status", async (req, res) => {
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
      const [fRows] = await pool.query("SELECT COUNT(*) as count FROM facturas").catch(() => [[{ count: 0 }]]);
      facturasCount = Number(fRows[0]?.count || 0);
      if (facturasCount > 0) {
        try {
          await pool.query(`
            INSERT INTO proveedores (id_proveedor, nombre_proveedor, importe_mensual)
            SELECT 
              COALESCE(NULLIF(f.id_proveedor, ''), CONCAT('PROV-', SUBSTRING(MD5(f.nombre_proveedor), 1, 8))),
              TRIM(f.nombre_proveedor),
              SUM(f.total)
            FROM facturas f
            WHERE f.nombre_proveedor IS NOT NULL AND TRIM(f.nombre_proveedor) != ''
            GROUP BY f.nombre_proveedor, f.id_proveedor
            ON DUPLICATE KEY UPDATE 
              nombre_proveedor = VALUES(nombre_proveedor)
          `).catch(() => {
          });
          await pool.query(`
            DELETE FROM proveedores
            WHERE id_proveedor NOT IN (SELECT DISTINCT id_proveedor FROM facturas WHERE id_proveedor IS NOT NULL AND TRIM(id_proveedor) != '')
              AND nombre_proveedor NOT IN (SELECT DISTINCT nombre_proveedor FROM facturas WHERE nombre_proveedor IS NOT NULL AND TRIM(nombre_proveedor) != '')
          `).catch(() => {
          });
        } catch {
        }
      }
      const [pRows] = await pool.query(
        facturasCount > 0 ? 'SELECT COUNT(DISTINCT COALESCE(NULLIF(TRIM(nombre_proveedor), ""), id_proveedor)) as count FROM facturas WHERE nombre_proveedor IS NOT NULL AND TRIM(nombre_proveedor) != ""' : "SELECT COUNT(*) as count FROM proveedores"
      ).catch(() => [[{ count: 0 }]]);
      const [lRows] = await pool.query("SELECT COUNT(*) as count FROM lineas_factura").catch(() => [[{ count: 0 }]]);
      const [aRows] = await pool.query("SELECT COUNT(*) as count FROM alertas").catch(() => [[{ count: 0 }]]);
      const [cRows] = await pool.query("SELECT COUNT(*) as count FROM categorias_gasto").catch(() => [[{ count: 0 }]]);
      const [hRows] = await pool.query("SELECT COUNT(*) as count FROM historico_precios").catch(() => [[{ count: 0 }]]);
      const [paramRows] = await pool.query("SELECT COUNT(*) as count FROM configuracion_parametros").catch(() => [[{ count: 0 }]]);
      const [anRows] = await pool.query("SELECT COUNT(*) as count FROM analisis_financieros_ia").catch(() => [[{ count: 0 }]]);
      const [chRows] = await pool.query("SELECT COUNT(*) as count FROM historial_chat_ia").catch(() => [[{ count: 0 }]]);
      const [aeRows] = await pool.query("SELECT COUNT(*) as count FROM declaraciones_aeat").catch(() => [[{ count: 0 }]]);
      const [gRows] = await pool.query("SELECT COUNT(*) as count FROM integraciones_google").catch(() => [[{ count: 0 }]]);
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
    } catch (err) {
      console.warn("Error al consultar conteo en MySQL:", err?.message);
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
    timestamp: (/* @__PURE__ */ new Date()).toISOString()
  });
});
app.get("/api/mysql/config", (_req, res) => {
  const cfg = getDbConfig();
  return res.json({
    success: true,
    host: cfg.host,
    port: cfg.port,
    database: cfg.database,
    user: cfg.user
  });
});
app.post("/api/mysql/config", async (req, res) => {
  try {
    const { host, port, user, password, database } = req.body || {};
    updateDbConfig({
      host: host ? String(host).trim() : void 0,
      port: port ? Number(port) : void 0,
      user: user ? String(user).trim() : void 0,
      password: password !== void 0 ? String(password) : void 0,
      database: database ? String(database).trim() : void 0
    });
    const check = await testDbConnection();
    return res.status(200).json({
      success: check.connected,
      connected: check.connected,
      message: check.message,
      host: check.host,
      port: check.port,
      database: check.database,
      latencyMs: check.latencyMs
    });
  } catch (err) {
    console.error("Error en /api/mysql/config:", err);
    return res.status(200).json({
      success: false,
      connected: false,
      message: err?.message || "Error inesperado al probar conexi\xF3n MySQL",
      host: req.body?.host,
      port: req.body?.port,
      database: req.body?.database
    });
  }
});
app.all("/api/mysql/export-sql", async (req, res) => {
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
    const sql = generarScriptSqlCompleto2(
      facturasParaExportar,
      provsParaExportar,
      negocioActual,
      catsActuales,
      paramsActuales
    );
    res.setHeader("Content-Type", "application/sql; charset=utf-8");
    res.setHeader("Content-Disposition", 'attachment; filename="facturas_finance_ai.sql"');
    return res.send(sql);
  } catch (err) {
    console.error("Error generando exportaci\xF3n SQL:", err);
    return res.status(500).send("-- Error generando exportaci\xF3n SQL\n" + (err?.message || "Error desconocido"));
  }
});
app.post("/api/sheets/sync-to-mysql", async (req, res) => {
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
      mensaje: result.mysqlDisponible ? `Replicadas ${result.replicadas}/${facturasToSync.length} facturas en MySQL.` : `No se pudo conectar a MySQL: ${result.razonFallo || "Servidor no accesible"}`
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || "Error al sincronizar con MySQL" });
  }
});
app.post("/api/mysql/sync-alertas", async (req, res) => {
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
      mysqlDisponible: result.mysqlDisponible
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || "Error al sincronizar alertas con MySQL" });
  }
});
app.get("/api/alertas", async (req, res) => {
  try {
    const alertas = await obtenerAlertasDeMySQL();
    if (alertas && alertas.length > 0) {
      return res.json({ success: true, alertas, count: alertas.length, fuente: "mysql" });
    }
  } catch (err) {
    console.warn("Aviso al consultar alertas en MySQL:", err?.message);
  }
  return res.json({ success: true, alertas: [], count: 0, fuente: "empty" });
});
app.post("/api/alertas", async (req, res) => {
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
      mysqlDisponible: result.mysqlDisponible
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || "Error al guardar alertas en MySQL" });
  }
});
app.patch("/api/alertas/:id/estado", async (req, res) => {
  try {
    const id = req.params.id;
    const { estado, alerta } = req.body;
    if (!id || !estado) {
      return res.status(400).json({ success: false, error: "Faltan par\xE1metros requeridos (id o estado)" });
    }
    const result = await actualizarEstadoAlertaEnMySQL(id, estado, alerta);
    return res.json({ success: result.ok, error: result.error });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Error al actualizar estado de alerta en MySQL" });
  }
});
app.post("/api/alertas/:id/estado", async (req, res) => {
  try {
    const id = req.params.id;
    const { estado, alerta } = req.body;
    if (!id || !estado) {
      return res.status(400).json({ success: false, error: "Faltan par\xE1metros requeridos (id o estado)" });
    }
    const result = await actualizarEstadoAlertaEnMySQL(id, estado, alerta);
    return res.json({ success: result.ok, error: result.error });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Error al actualizar estado de alerta en MySQL" });
  }
});
app.get("/api/facturas", async (req, res) => {
  try {
    const facturas = await obtenerFacturasDeMySQL();
    if (facturas && Array.isArray(facturas) && facturas.length > 0) {
      serverFacturas = [...facturas];
      persistServerStore();
      return res.json({ success: true, facturas, count: facturas.length, fuente: "mysql" });
    }
  } catch (err) {
    console.warn("Aviso al consultar facturas en MySQL:", err?.message);
  }
  if (serverFacturas.length > 10 || serverFacturas.some((f) => f.idFactura === "FAC-001")) {
    serverFacturas = [];
    persistServerStore();
  }
  return res.json({ success: true, facturas: serverFacturas, count: serverFacturas.length, fuente: serverFacturas.length > 0 ? "persistent_cache" : "empty" });
});
app.post("/api/facturas", async (req, res) => {
  try {
    const { facturas, factura, config, archivo } = req.body;
    if (Array.isArray(facturas) && facturas.length > 0) {
      const result = await guardarFacturasEnMySQL(facturas);
      for (const f of facturas) {
        const idx = serverFacturas.findIndex((sf) => sf.idFactura === f.idFactura);
        if (idx !== -1) serverFacturas[idx] = f;
        else serverFacturas.push(f);
      }
      persistServerStore();
      return res.json({
        success: result.mysqlDisponible,
        replicadas: result.replicadas,
        errores: result.errores,
        mysqlDisponible: result.mysqlDisponible
      });
    }
    const targetFactura = factura || (Array.isArray(facturas) ? facturas[0] : null);
    if (targetFactura && targetFactura.idFactura) {
      return await procesarGuardadoFacturaDBFirst(req, res, targetFactura, config, archivo);
    }
    return res.json({ success: true, replicadas: 0, errores: [] });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || "Error al guardar facturas en MySQL" });
  }
});
app.patch("/api/facturas/:id/estado", async (req, res) => {
  try {
    const id = req.params.id;
    const { estado, fechaPago } = req.body;
    if (!id || !estado) {
      return res.status(400).json({ success: false, error: "Faltan par\xE1metros requeridos (id o estado)" });
    }
    const result = await actualizarEstadoFacturaEnMySQL(id, estado, fechaPago);
    const idx = serverFacturas.findIndex((f) => f.idFactura === id);
    if (idx !== -1) {
      serverFacturas[idx].estado = estado;
      if (fechaPago) serverFacturas[idx].fechaPago = fechaPago;
      persistServerStore();
    }
    return res.json({ success: result.ok, error: result.error });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Error al actualizar estado en MySQL" });
  }
});
app.post("/api/mysql/sync-proveedores", async (req, res) => {
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
      mysqlDisponible: result.mysqlDisponible
    });
  } catch (error) {
    return res.status(500).json({ success: false, error: error?.message || "Error al sincronizar proveedores con MySQL" });
  }
});
app.get("/api/historico-precios", async (req, res) => {
  try {
    const producto = req.query.producto ? String(req.query.producto) : void 0;
    const historico = await obtenerHistoricoPreciosDeMySQL(producto);
    return res.json({ success: true, count: historico.length, historico });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Error al consultar hist\xF3rico de precios" });
  }
});
app.post("/api/mysql/sync-all", async (req, res) => {
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
      alertas: Array.isArray(alertas) ? alertas : void 0,
      categorias: Array.isArray(categorias) ? categorias : storedCategoriasGasto,
      datosNegocio: datosNegocio || serverDatosNegocio,
      parametrosSistema,
      analisis,
      configuracionGoogle,
      declaracionesAeat
    });
    return res.json({
      ...result,
      mensaje: result.mysqlDisponible ? `Replicaci\xF3n completa: ${result.facturasReplicadas} facturas (con l\xEDneas e hist\xF3rico), ${result.proveedoresReplicados} proveedores, ${result.alertasReplicadas} alertas, ${result.categoriasReplicadas} categor\xEDas, datos de negocio, par\xE1metros del sistema, an\xE1lisis IA y configuraci\xF3n guardados en MySQL.` : `MySQL no disponible: ${result.razonFallo || "Sin conexi\xF3n"}`
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message || "Error en sincronizaci\xF3n maestra" });
  }
});
app.get("/api/parametros-sistema", async (req, res) => {
  try {
    const params = await obtenerParametrosSistemaDeMySQL();
    if (params) {
      return res.json({ success: true, parametros: params, fuente: "mysql" });
    }
  } catch (err) {
    console.warn("Aviso al leer configuracion_parametros de MySQL:", err?.message);
  }
  return res.json({ success: true, parametros: null, fuente: "default" });
});
app.post("/api/parametros-sistema", async (req, res) => {
  try {
    const { parametros } = req.body;
    if (!parametros) return res.status(400).json({ error: "Par\xE1metros no proporcionados" });
    const result = await guardarParametrosSistemaEnMySQL(parametros);
    return res.json({ success: result.ok, error: result.error });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/analisis-ejecutivo", async (req, res) => {
  try {
    const analisis = await obtenerAnalisisEjecutivoDeMySQL();
    if (analisis) {
      return res.json({ success: true, analisis, fuente: "mysql" });
    }
  } catch (err) {
    console.warn("Aviso al leer analisis_financieros_ia de MySQL:", err?.message);
  }
  return res.json({ success: true, analisis: null, fuente: "ninguno" });
});
app.post("/api/analisis-ejecutivo", async (req, res) => {
  try {
    const { analisis } = req.body;
    if (!analisis) return res.status(400).json({ error: "An\xE1lisis no proporcionado" });
    const result = await guardarAnalisisEjecutivoEnMySQL(analisis);
    return res.json({ success: result.ok, error: result.error });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/chat/historial", async (req, res) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 50;
    const historial = await obtenerHistorialChatDeMySQL(limit);
    return res.json({ success: true, count: historial.length, historial });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/chat/mensaje", async (req, res) => {
  try {
    const { mensaje } = req.body;
    if (!mensaje || !mensaje.texto) return res.status(400).json({ error: "Mensaje inv\xE1lido" });
    const result = await guardarMensajeChatEnMySQL(mensaje);
    return res.json({ success: result.ok, error: result.error });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.delete("/api/chat/historial", async (req, res) => {
  try {
    const result = await limpiarHistorialChatEnMySQL();
    return res.json({ success: result.ok });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/aeat/declaraciones", async (req, res) => {
  try {
    const modelo = req.query.modelo ? String(req.query.modelo) : void 0;
    const ejercicio = req.query.ejercicio ? parseInt(String(req.query.ejercicio), 10) : void 0;
    const declaraciones = await obtenerDeclaracionesAeatDeMySQL(modelo, ejercicio);
    return res.json({ success: true, count: declaraciones.length, declaraciones });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/aeat/declaraciones", async (req, res) => {
  try {
    const { declaracion } = req.body;
    if (!declaracion || !declaracion.modelo) return res.status(400).json({ error: "Declaraci\xF3n AEAT no v\xE1lida" });
    const result = await guardarDeclaracionAeatEnMySQL(declaracion);
    return res.json({ success: result.ok, error: result.error });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/sheets/config", async (req, res) => {
  try {
    const config = await obtenerConfiguracionGoogleDeMySQL();
    if (config) {
      return res.json({ success: true, config, fuente: "mysql" });
    }
  } catch (err) {
    console.warn("Aviso al leer integraciones_google de MySQL:", err?.message);
  }
  return res.json({
    success: true,
    config: {
      sheetId: process.env.GOOGLE_SHEETS_ID || "",
      endpointUrl: process.env.GOOGLE_SHEETS_ENDPOINT_URL || "",
      driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || "",
      autoSync: true,
      isSheetDataActive: false
    },
    fuente: "env"
  });
});
app.post("/api/sheets/config", async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) return res.status(400).json({ error: "Configuraci\xF3n no v\xE1lida" });
    const result = await guardarConfiguracionGoogleEnMySQL(config);
    return res.json({ success: result.ok, error: result.error });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
async function eliminarFacturaDBFirstHandler(req, res) {
  const idFactura = req.params?.id || req.body?.idFactura || req.query?.idFactura;
  const { endpointUrl, driveFolderId, nombreProveedor, fileUrl } = req.body || {};
  if (!idFactura) {
    return res.status(400).json({ error: "Falta el identificador de factura (idFactura)" });
  }
  const normalizedId = String(idFactura).trim();
  serverFacturas = serverFacturas.filter((f) => String(f.idFactura).trim().toLowerCase() !== normalizedId.toLowerCase());
  persistServerStore();
  let mysqlDeleted = false;
  let mysqlError = null;
  try {
    const dbRes = await eliminarFacturaDeMySQL(normalizedId);
    mysqlDeleted = dbRes.ok && dbRes.affectedRows > 0;
    if (dbRes.error) mysqlError = dbRes.error;
    console.log(`\u2705 [DB-First] Factura ${normalizedId} eliminada de MySQL (Afectadas: ${dbRes.affectedRows}).`);
  } catch (err) {
    mysqlError = err?.message;
    console.warn("Aviso al eliminar factura de MySQL:", err?.message);
  }
  let driveDeleted = false;
  let folderDeleted = false;
  let scriptStatus = "no_endpoint";
  const targetEndpoint = endpointUrl || process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL;
  const targetFolderId = driveFolderId || process.env.GOOGLE_DRIVE_FOLDER_ID;
  if (targetEndpoint && targetEndpoint.startsWith("http")) {
    try {
      console.log(`[Google Drive] Solicitando eliminaci\xF3n del archivo de factura ${normalizedId} en Drive...`);
      const response = await fetch(targetEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "deleteInvoice",
          idFactura: normalizedId,
          driveFolderId: targetFolderId,
          nombreProveedor: nombreProveedor || "",
          fileUrl: fileUrl || ""
        }),
        redirect: "follow",
        signal: AbortSignal.timeout(14e3)
      });
      const rawText = await response.text();
      try {
        const data = JSON.parse(rawText);
        driveDeleted = Boolean(data?.deletedDrive);
        folderDeleted = Boolean(data?.deletedFolder);
        scriptStatus = data?.status || "ok";
      } catch {
        scriptStatus = "non_json_response";
      }
    } catch (e) {
      console.warn("Aviso al eliminar en Google Drive:", e?.message || e);
      scriptStatus = "error: " + (e?.message || "unknown");
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
    message: `Factura ${normalizedId} eliminada de la base de datos MySQL${driveDeleted ? " y su archivo de Google Drive" : ""}.`
  });
}
app.delete("/api/facturas/:id", eliminarFacturaDBFirstHandler);
app.post("/api/facturas/delete", eliminarFacturaDBFirstHandler);
app.post("/api/sheets/delete-invoice", eliminarFacturaDBFirstHandler);
app.get("/api/drive/config", async (req, res) => {
  try {
    const config = await obtenerConfiguracionGoogleDeMySQL();
    return res.json({
      success: true,
      config: config || {
        driveFolderId: process.env.GOOGLE_DRIVE_FOLDER_ID || "",
        endpointUrl: process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL || ""
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.post("/api/drive/config", async (req, res) => {
  try {
    const { config } = req.body;
    if (!config) return res.status(400).json({ error: "Configuraci\xF3n no v\xE1lida" });
    const result = await guardarConfiguracionGoogleEnMySQL(config);
    return res.json({ success: result.ok, error: result.error });
  } catch (err) {
    return res.status(500).json({ success: false, error: err?.message });
  }
});
app.get("/api/proveedores", async (req, res) => {
  try {
    let rawProvs = [];
    try {
      rawProvs = await obtenerProveedoresDeMySQL();
    } catch {
    }
    if (!rawProvs || rawProvs.length === 0) {
      rawProvs = serverProveedores;
    }
    let facturasActuales = [];
    try {
      facturasActuales = await obtenerFacturasDeMySQL();
    } catch {
    }
    if (!facturasActuales || facturasActuales.length === 0) {
      facturasActuales = serverFacturas;
    }
    if (facturasActuales && facturasActuales.length > 0) {
      const mapFacturas = /* @__PURE__ */ new Map();
      facturasActuales.forEach((f) => {
        const nom = (f.nombreProveedor || "").trim();
        const norm = nom.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        if (!norm) return;
        const entry = mapFacturas.get(norm) || {
          nombre: nom,
          id: f.idProveedor || "PROV-GEN",
          total: 0,
          count: 0,
          conceptos: []
        };
        entry.total += Number(f.total || 0);
        entry.count += 1;
        if (f.concepto) entry.conceptos.push(f.concepto);
        if (f.idProveedor && !f.idProveedor.startsWith("PROV-") && (!entry.id || entry.id.startsWith("PROV-"))) {
          entry.id = f.idProveedor;
        }
        mapFacturas.set(norm, entry);
      });
      const provsConsolidados = [];
      mapFacturas.forEach((data, norm) => {
        const provEncontrado = rawProvs.find((p) => {
          const pNorm = (p.nombreProveedor || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
          return pNorm === norm;
        });
        provsConsolidados.push({
          idProveedor: data.id || provEncontrado?.idProveedor || "PROV-GEN",
          nombreProveedor: data.nombre || provEncontrado?.nombreProveedor,
          cif: provEncontrado?.cif || (data.id && /^[A-Z0-9-]{8,10}$/i.test(data.id) ? data.id : null),
          contacto: provEncontrado?.contacto || null,
          productosSuministrados: provEncontrado?.productosSuministrados || data.conceptos.slice(0, 3).join(", ") || "Suministros diversos",
          importeMensual: Math.round(data.total * 100) / 100,
          frecuencia: data.count >= 8 ? "Semanal" : data.count >= 4 ? "Quincenal" : "Mensual",
          riesgoDependencia: provEncontrado?.riesgoDependencia || "Bajo",
          tiempoMedioEntrega: provEncontrado?.tiempoMedioEntrega || "24-48h"
        });
      });
      serverProveedores = [...provsConsolidados];
      persistServerStore();
      return res.json({
        success: true,
        proveedores: provsConsolidados,
        count: provsConsolidados.length,
        fuente: isMySQLAvailable() ? "mysql_consolidado" : "persistent_cache_consolidada"
      });
    }
    if (rawProvs && rawProvs.length > 0) {
      serverProveedores = [...rawProvs];
      persistServerStore();
      return res.json({
        success: true,
        proveedores: rawProvs,
        count: rawProvs.length,
        fuente: "mysql"
      });
    }
  } catch (err) {
    console.warn("Aviso al consultar proveedores:", err?.message);
  }
  return res.json({ success: true, proveedores: serverProveedores, count: serverProveedores.length, fuente: "persistent_cache" });
});
app.post("/api/proveedores", async (req, res) => {
  const { proveedores } = req.body;
  if (Array.isArray(proveedores) && proveedores.length > 0) {
    serverProveedores = proveedores;
    persistServerStore();
    let guardadoEnMySQL = false;
    let replicadas = 0;
    try {
      const resDb = await guardarProveedoresEnMySQL(proveedores);
      guardadoEnMySQL = resDb.mysqlDisponible;
      replicadas = resDb.replicadas;
    } catch (e) {
      console.warn("Error al guardar proveedores en MySQL:", e?.message);
    }
    return res.json({
      success: true,
      count: serverProveedores.length,
      proveedores: serverProveedores,
      mysqlGuardado: guardadoEnMySQL,
      mysqlReplicadas: replicadas
    });
  }
  return res.status(400).json({ error: "Array de proveedores no v\xE1lido" });
});
app.post("/api/sheets/clear-cache", (req, res) => {
  serverFacturas = [];
  res.json({ success: true, message: "Cach\xE9 de facturas del servidor vaciado a 0" });
});
async function startServer() {
  try {
    const dbConnected = await testDbConnection();
    if (dbConnected) {
      console.log("\u2705 [Database] Conexi\xF3n activa con base de datos MySQL/MariaDB.");
    } else {
      console.log("\u2139\uFE0F [Database] MySQL no detectado en 127.0.0.1:3306. Modo DB-First activo con memoria del servidor y Google Drive.");
    }
  } catch {
  }
  if (process.env.NODE_ENV !== "production" && !process.env.VERCEL) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else if (!process.env.VERCEL) {
    const distPath = path2.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path2.join(distPath, "index.html"));
    });
  }
  if (!process.env.VERCEL) {
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`Finance AI server (DB-First Single Source of Truth + Google Drive) running on http://0.0.0.0:${PORT}`);
    });
  }
}
var server_default = app;
var isServerless = Boolean(
  process.env.VERCEL || process.env.VERCEL_ENV || process.env.NOW_REGION || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT
);
if (!isServerless) {
  startServer().catch((err) => {
    console.error("Error starting Finance AI server:", err);
  });
}
export {
  app,
  server_default as default,
  startServer
};
//# sourceMappingURL=server.js.map
