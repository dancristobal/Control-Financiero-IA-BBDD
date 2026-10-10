import { Factura, Proveedor, DatosNegocio, CategoriaGastoDef, ParametrosSistema, Alerta } from '../types';
import { DEFAULT_DATOS_NEGOCIO, DEFAULT_PARAMETROS_SISTEMA } from '../types';
import { INITIAL_FACTURAS, INITIAL_PROVEEDORES, INITIAL_ALERTAS } from '../data/mockData';

export interface SqlExportOptions {
  facturas?: any[];
  proveedores?: any[];
  datosNegocio?: any;
  categorias?: any[];
  parametros?: any;
  alertas?: any[];
  databaseName?: string;
}

function escapeSql(val: any): string {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return isNaN(val) ? '0' : String(val);
  if (typeof val === 'boolean') return val ? '1' : '0';
  return "'" + String(val).replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/\n/g, '\\n').replace(/\r/g, '\\r') + "'";
}

function sanitizeSqlDate(val: any): string {
  if (!val) return new Date().toISOString().split('T')[0];
  const str = String(val).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
  const d = new Date(str);
  if (!isNaN(d.getTime())) return d.toISOString().split('T')[0];
  return new Date().toISOString().split('T')[0];
}

export function generarScriptSqlCompleto(options: SqlExportOptions | any[] = {}, provsArg: any[] = []): string {
  // Soporte para firma antigua: generarScriptSqlCompleto(facturas, proveedores)
  let opts: SqlExportOptions;
  if (Array.isArray(options)) {
    opts = {
      facturas: options,
      proveedores: provsArg,
    };
  } else {
    opts = options || {};
  }

  const dbName = opts.databaseName || 'finance_ai_db';
  const facturas = (Array.isArray(opts.facturas) && opts.facturas.length > 0) ? opts.facturas : INITIAL_FACTURAS;
  const proveedores = (Array.isArray(opts.proveedores) && opts.proveedores.length > 0) ? opts.proveedores : INITIAL_PROVEEDORES;
  const alertas = Array.isArray(opts.alertas) ? opts.alertas : INITIAL_ALERTAS;
  const negocio = opts.datosNegocio && opts.datosNegocio.nombre ? opts.datosNegocio : DEFAULT_DATOS_NEGOCIO;
  const parametros = opts.parametros && opts.parametros.anoFiscalReferencia ? opts.parametros : DEFAULT_PARAMETROS_SISTEMA;

  const categorias = Array.isArray(opts.categorias) && opts.categorias.length > 0 ? opts.categorias : [
    { id: 'materias-primas', nombre: 'Materias Primas', descripcion: 'Harinas, lácteos, azúcares, ingredientes base y consumibles directos.', color: '#f43f5e', esPredeterminada: true },
    { id: 'suministros-y-energia', nombre: 'Suministros y Energía', descripcion: 'Electricidad, gas, agua, telecomunicaciones e internet.', color: '#0ea5e9', esPredeterminada: true },
    { id: 'envases-y-embalajes', nombre: 'Envases y Embalajes', descripcion: 'Cajas kraft, bobinas, bandejas, film, bolsas y etiquetas.', color: '#f59e0b', esPredeterminada: true },
    { id: 'logistica-y-transporte', nombre: 'Logística y Transporte', descripcion: 'Portes, transporte frigorífico, envíos y fletes.', color: '#10b981', esPredeterminada: true },
    { id: 'mantenimiento-y-maquinaria', nombre: 'Mantenimiento y Maquinaria', descripcion: 'Reparaciones de maquinaria, revisiones y recambios.', color: '#8b5cf6', esPredeterminada: true },
    { id: 'servicios-y-gestion', nombre: 'Servicios y Gestión', descripcion: 'Asesoría contable, fiscal y laboral, licencias de software y seguros.', color: '#ec4899', esPredeterminada: true },
  ];

  // Consolidar proveedores por nombre normalizado y asociar a facturas activas
  const facturasProvNombres = new Set(
    facturas.map((f: any) => (f.nombreProveedor || '').trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, ''))
  );

  const provMap = new Map<string, any>();
  proveedores.forEach((p) => {
    const norm = (p.nombreProveedor || '')
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    if (norm && (facturasProvNombres.size === 0 || facturasProvNombres.has(norm))) {
      if (!provMap.has(norm)) {
        provMap.set(norm, { ...p });
      } else {
        const exist = provMap.get(norm);
        exist.importeMensual = Math.max(Number(exist.importeMensual || 0), Number(p.importeMensual || 0));
      }
    }
  });

  // Si alguna factura tiene un proveedor no presente en la lista, añadirlo
  facturas.forEach((f: any) => {
    const nom = (f.nombreProveedor || '').trim();
    const norm = nom.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '');
    if (norm && !provMap.has(norm)) {
      provMap.set(norm, {
        idProveedor: f.idProveedor || 'PROV-GEN',
        nombreProveedor: nom,
        importeMensual: Number(f.total || 0),
        frecuencia: 'Mensual',
        riesgoDependencia: 'Bajo',
        tiempoMedioEntrega: '24-48h',
        cif: '',
        contacto: '',
        productosSuministrados: f.concepto || '',
      });
    }
  });

  const proveedoresConsolidados = Array.from(provMap.values());

  const lines: string[] = [
    `-- ============================================================`,
    `-- FINANCE AI — Exportación SQL Completa para MySQL / MariaDB`,
    `-- Compatible con phpMyAdmin, MySQL Workbench y MySQL CLI (XAMPP)`,
    `-- Generado automáticamente: ${new Date().toISOString()}`,
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
    `-- 5. Estructura de la tabla: facturas_lineas y lineas_factura`,
    `-- ------------------------------------------------------------`,
    `CREATE TABLE IF NOT EXISTS \`facturas_lineas\` (`,
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
    `  \`regimen_fiscal_predeterminado\` VARCHAR(100) DEFAULT 'Régimen General Peninsular',`,
    `  \`tipo_retencion_predeterminada\` VARCHAR(100) DEFAULT '15% Profesional',`,
    `  \`actualizado_en\` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`,
    `) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`,
    ``,
    `-- ------------------------------------------------------------`,
    `-- 9. Tablas de Análisis, Chat e Integraciones`,
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
    `-- INSERCIÓN DE DATOS: IDENTIDAD Y CONFIGURACIÓN`,
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
    `-- Categorías de Gasto`,
  ];

  categorias.forEach((cat) => {
    lines.push(
      `INSERT INTO \`categorias_gasto\` (\`id\`, \`nombre\`, \`descripcion\`, \`color\`, \`es_predeterminada\`) ` +
      `VALUES (${escapeSql(cat.id)}, ${escapeSql(cat.nombre)}, ${escapeSql(cat.descripcion || '')}, ${escapeSql(cat.color || '#0ea5e9')}, ${cat.esPredeterminada ? 1 : 0}) ` +
      `ON DUPLICATE KEY UPDATE \`nombre\` = VALUES(\`nombre\`), \`descripcion\` = VALUES(\`descripcion\`), \`color\` = VALUES(\`color\`);`
    );
  });

  lines.push(``);
  lines.push(`-- Parámetros del Sistema`);
  lines.push(
    `INSERT INTO \`configuracion_parametros\` (\`id\`, \`umbral_subida_moderada_pct\`, \`umbral_subida_critica_pct\`, \`umbral_concentracion_proveedor_pct\`, \`notificar_concentracion_proveedor\`, \`dias_anticipacion_vencimiento\`, \`notificar_facturas_vencidas\`, \`regimen_fiscal_predeterminado\`, \`tipo_retencion_predeterminada\`) ` +
    `VALUES (1, ${parametros.umbralSubidaModeradaPct || 8}, ${parametros.umbralSubidaCriticaPct || 15}, ${parametros.umbralConcentracionProveedorPct || 30}, ${parametros.notificarConcentracionProveedor !== false ? 1 : 0}, ${parametros.diasAnticipacionVencimiento || 3}, ${parametros.notificarFacturasVencidas !== false ? 1 : 0}, ${escapeSql(parametros.regimenFiscalPredeterminado || 'Régimen General Peninsular')}, ${escapeSql(parametros.tipoRetencionPredeterminada || '15% Profesional')}) ` +
    `ON DUPLICATE KEY UPDATE \`umbral_subida_moderada_pct\` = VALUES(\`umbral_subida_moderada_pct\`), \`umbral_subida_critica_pct\` = VALUES(\`umbral_subida_critica_pct\`);`
  );

  lines.push(``);
  lines.push(`-- ============================================================`);
  lines.push(`-- INSERCIÓN DE PROVEEDORES`);
  lines.push(`-- ============================================================`);



  proveedoresConsolidados.forEach((p) => {
    const idProv = String(p.idProveedor || '').trim();
    if (!idProv) return;
    lines.push(
      `INSERT INTO \`proveedores\` (\`id_proveedor\`, \`nombre_proveedor\`, \`cif\`, \`contacto\`, \`productos_suministrados\`, \`importe_mensual\`, \`frecuencia\`, \`riesgo_dependencia\`, \`tiempo_medio_entrega\`) ` +
      `VALUES (${escapeSql(idProv)}, ${escapeSql(p.nombreProveedor)}, ${escapeSql(p.cif || '')}, ${escapeSql(p.contacto || '')}, ${escapeSql(p.productosSuministrados || '')}, ${Number(p.importeMensual || 0)}, ${escapeSql(p.frecuencia || 'Mensual')}, ${escapeSql(p.riesgoDependencia || 'Bajo')}, ${escapeSql(p.tiempoMedioEntrega || '')}) ` +
      `ON DUPLICATE KEY UPDATE \`nombre_proveedor\` = VALUES(\`nombre_proveedor\`), \`importe_mensual\` = VALUES(\`importe_mensual\`);`
    );
  });

  lines.push(``);
  lines.push(`-- ============================================================`);
  lines.push(`-- INSERCIÓN DE FACTURAS Y LÍNEAS DE DETALLE`);
  lines.push(`-- ============================================================`);

  facturas.forEach((f) => {
    const idFactura = String(f.idFactura || '').trim();
    if (!idFactura) return;

    const fechaEmisionSql = sanitizeSqlDate(f.fechaEmision);
    const fechaVencimientoSql = sanitizeSqlDate(f.fechaVencimiento || f.fechaEmision);
    const idProveedor = String(f.idProveedor || 'PROV-GEN').trim();
    const nombreProveedor = String(f.nombreProveedor || 'Proveedor General').trim();
    const total = Number(f.total || 0);
    const importe = Number(f.importe || f.baseImponible || 0);
    const baseImponible = Number(f.baseImponible || importe);
    const cuotaIVA = Number(f.cuotaIVA || 0);
    const cuotaRecargo = Number(f.cuotaRecargoEquivalencia || 0);
    const cuotaIRPF = Number(f.cuotaIRPF || 0);
    const porcentajeIRPF = Number(f.porcentajeIRPF || 0);

    lines.push(
      `INSERT INTO \`facturas\` (` +
      `\`id_factura\`, \`fecha_emision\`, \`id_proveedor\`, \`nombre_proveedor\`, \`concepto\`, ` +
      `\`importe\`, \`fecha_vencimiento\`, \`estado\`, \`fecha_pago\`, \`base_imponible\`, ` +
      `\`tipos_iva\`, \`cuota_iva\`, \`regimen_fiscal\`, \`aplica_recargo_equivalencia\`, ` +
      `\`tipo_recargo_equivalencia\`, \`cuota_recargo_equivalencia\`, \`aplica_retencion_irpf\`, ` +
      `\`tipo_retencion_irpf\`, \`porcentaje_irpf\`, \`cuota_irpf\`, \`concepto_retencion_irpf\`, ` +
      `\`total\`, \`categoria_gasto\`, \`categoria_gasto_justificacion\`, \`notas\`, \`archivo_nombre\`, \`archivo_ruta\`, \`sincronizado_sheets\`` +
      `) VALUES (` +
      `${escapeSql(idFactura)}, ${escapeSql(fechaEmisionSql)}, ${escapeSql(idProveedor)}, ${escapeSql(nombreProveedor)}, ${escapeSql(f.concepto || 'Factura')}, ` +
      `${importe}, ${escapeSql(fechaVencimientoSql)}, ${escapeSql(f.estado || 'Pendiente')}, ${escapeSql(f.fechaPago || 'Pendiente de confirmar')}, ${baseImponible}, ` +
      `${escapeSql(f.tiposIVA || '21%')}, ${cuotaIVA}, ${escapeSql(f.regimenFiscal || 'Régimen General Peninsular')}, ${f.aplicaRecargoEquivalencia ? 1 : 0}, ` +
      `${escapeSql(f.tipoRecargoEquivalencia || '')}, ${cuotaRecargo}, ${f.aplicaRetencionIRPF ? 1 : 0}, ` +
      `${escapeSql(f.tipoRetencionIRPF || '')}, ${porcentajeIRPF}, ${cuotaIRPF}, ${escapeSql(f.conceptoRetencionIRPF || '')}, ` +
      `${total}, ${escapeSql(f.categoriaGasto || 'Materias Primas')}, ${escapeSql(f.categoriaGastoJustificacion || '')}, ${escapeSql(f.notas || '')}, ` +
      `${escapeSql(f.archivoNombre || `${idFactura}.pdf`)}, ${escapeSql(f.driveFileUrl || '')}, 1` +
      `) ON DUPLICATE KEY UPDATE \`total\` = VALUES(\`total\`), \`estado\` = VALUES(\`estado\`), \`base_imponible\` = VALUES(\`base_imponible\`);`
    );

    // Insertar líneas de factura
    const lineas = Array.isArray(f.lineas) && f.lineas.length > 0
      ? f.lineas
      : [{
          nombreProducto: f.concepto || 'Producto General',
          cantidad: 1,
          unidad: 'ud',
          precioUnitario: baseImponible,
          subtotal: baseImponible,
        }];

    lineas.forEach((l: any) => {
      const prodNom = String(l.nombreProducto || 'Producto General').trim();
      const cant = Number(l.cantidad || 1);
      const uni = String(l.unidad || 'ud');
      const pUnit = Number(l.precioUnitario || 0);
      const sub = Number(l.subtotal || cant * pUnit);

      lines.push(
        `INSERT INTO \`facturas_lineas\` (\`id_factura\`, \`nombre_producto\`, \`cantidad\`, \`unidad\`, \`precio_unitario\`, \`subtotal\`) ` +
        `VALUES (${escapeSql(idFactura)}, ${escapeSql(prodNom)}, ${cant}, ${escapeSql(uni)}, ${pUnit}, ${sub});`
      );

      lines.push(
        `INSERT INTO \`lineas_factura\` (\`id_factura\`, \`nombre_producto\`, \`cantidad\`, \`unidad\`, \`precio_unitario\`, \`subtotal\`) ` +
        `VALUES (${escapeSql(idFactura)}, ${escapeSql(prodNom)}, ${cant}, ${escapeSql(uni)}, ${pUnit}, ${sub});`
      );

      lines.push(
        `INSERT INTO \`historico_precios\` (\`nombre_producto\`, \`id_proveedor\`, \`nombre_proveedor\`, \`id_factura\`, \`fecha\`, \`precio_unitario\`, \`unidad\`) ` +
        `VALUES (${escapeSql(prodNom)}, ${escapeSql(idProveedor)}, ${escapeSql(nombreProveedor)}, ${escapeSql(idFactura)}, ${escapeSql(fechaEmisionSql)}, ${pUnit}, ${escapeSql(uni)});`
      );
    });
  });

  lines.push(``);
  lines.push(`-- ============================================================`);
  lines.push(`-- INSERCIÓN DE ALERTAS`);
  lines.push(`-- ============================================================`);

  alertas.forEach((a) => {
    lines.push(
      `INSERT INTO \`alertas\` (\`id\`, \`tipo\`, \`nivel\`, \`titulo\`, \`descripcion\`, \`estado\`) ` +
      `VALUES (${escapeSql(a.id)}, ${escapeSql(a.tipo)}, ${escapeSql(a.nivel || 'media')}, ${escapeSql(a.titulo)}, ${escapeSql(a.descripcion)}, ${escapeSql(a.estado || 'activa')}) ` +
      `ON DUPLICATE KEY UPDATE \`estado\` = VALUES(\`estado\`);`
    );
  });

  lines.push(``);
  lines.push(`SET FOREIGN_KEY_CHECKS = 1;`);
  lines.push(`-- ============================================================`);
  lines.push(`-- FIN DEL SCRIPT SQL — FINANCE AI`);
  lines.push(`-- Importación completada con éxito.`);
  lines.push(`-- ============================================================`);

  return lines.join('\n');
}
