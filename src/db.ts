import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { generarScriptSqlCompleto as generarScriptSqlCompletoUtil } from './utils/sqlGenerator';
import {
  INITIAL_FACTURAS,
  INITIAL_PROVEEDORES,
  INITIAL_ALERTAS,
} from './data/mockData';
import { DEFAULT_DATOS_NEGOCIO, DEFAULT_PARAMETROS_SISTEMA } from './types';
import { DEFAULT_CATEGORIAS_GASTO } from './utils/categoriasGasto';

dotenv.config();

export interface DbConfig {
  host: string;
  port: number;
  user: string;
  password?: string;
  database: string;
}

function getDbConfigFilePath(): string {
  const dir = path.join(process.cwd(), 'tmp');
  if (!fs.existsSync(dir)) {
    try { fs.mkdirSync(dir, { recursive: true }); } catch {}
  }
  return path.join(dir, 'mysql_config.json');
}

function loadPersistedDbConfig(): Partial<DbConfig> {
  try {
    const file = getDbConfigFilePath();
    if (fs.existsSync(file)) {
      const data = JSON.parse(fs.readFileSync(file, 'utf-8'));
      return data || {};
    }
  } catch {}
  return {};
}

function persistDbConfig(cfg: DbConfig): void {
  try {
    const file = getDbConfigFilePath();
    fs.writeFileSync(file, JSON.stringify(cfg, null, 2), 'utf-8');
  } catch (e) {
    console.warn('No se pudo guardar la configuración de DB en disco:', e);
  }
}

const persistedDbConfig = loadPersistedDbConfig();

let activeConfig: DbConfig = {
  host: persistedDbConfig.host || process.env.DB_HOST || '127.0.0.1',
  port: Number(persistedDbConfig.port || process.env.DB_PORT) || 3306,
  user: persistedDbConfig.user || process.env.DB_USER || 'root',
  password: persistedDbConfig.password !== undefined ? persistedDbConfig.password : (process.env.DB_PASSWORD || ''),
  database: persistedDbConfig.database || process.env.DB_NAME || 'finance_ai_db',
};

let dbPool: mysql.Pool | null = null;
let isDbConnected = false;
let lastErrorReason = '';

export function getDbConfig(): DbConfig {
  return { ...activeConfig };
}

export function updateDbConfig(newConfig: Partial<DbConfig>): void {
  activeConfig = {
    ...activeConfig,
    ...newConfig,
    port: Number(newConfig.port || activeConfig.port || 3306),
  };
  persistDbConfig(activeConfig);
  // Reiniciar pool para tomar nuevos parámetros
  if (dbPool) {
    try {
      dbPool.end().catch(() => {});
    } catch {}
    dbPool = null;
  }
  isDbConnected = false;
  lastErrorReason = '';
}

/**
 * Normaliza fechas a formato YYYY-MM-DD válido para MySQL o retorna null si es inválida.
 */
export function sanitizeSqlDate(val: any): string | null {
  if (!val) return null;
  if (val instanceof Date) {
    if (isNaN(val.getTime())) return null;
    return val.toISOString().split('T')[0];
  }
  const str = String(val).trim();
  if (!str || str.toLowerCase() === 'null' || str.toLowerCase() === 'undefined') return null;

  // DD/MM/YYYY o DD-MM-YYYY
  const ddmmyyyy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/);
  if (ddmmyyyy) {
    const day = ddmmyyyy[1].padStart(2, '0');
    const month = ddmmyyyy[2].padStart(2, '0');
    const year = ddmmyyyy[3];
    return `${year}-${month}-${day}`;
  }

  // YYYY-MM-DD
  const yyyymmdd = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (yyyymmdd) {
    const year = yyyymmdd[1];
    const month = yyyymmdd[2].padStart(2, '0');
    const day = yyyymmdd[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  return null;
}

/**
 * Obtiene el pool de conexiones MySQL o intenta inicializarlo.
 */
export function getDbPool(forceRecreate = false): mysql.Pool | null {
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
      keepAliveInitialDelay: 0,
    });
    return dbPool;
  } catch (err: any) {
    lastErrorReason = err?.message || 'Error al instanciar pool MySQL';
    dbPool = null;
    return null;
  }
}

/**
 * Garantiza que la base de datos y todas las tablas existan en MySQL.
 */
export async function ensureDatabaseAndTables(): Promise<{ ok: boolean; reason?: string }> {
  const isVercel = !!(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  // En Vercel Serverless, 127.0.0.1 y localhost apuntan al contenedor efímero sin MySQL
  if (isVercel && (activeConfig.host === '127.0.0.1' || activeConfig.host === 'localhost')) {
    lastErrorReason =
      "En Vercel (servidor Serverless en la nube) no es posible conectar a '127.0.0.1' ni a 'localhost'. Debes indicar la IP pública o dominio de tu servidor MySQL/MariaDB remoto (ej: db.tudominio.com o IP pública) y habilitar conexiones remotas en el puerto 3306.";
    isDbConnected = false;
    return { ok: false, reason: lastErrorReason };
  }

  const pool = getDbPool();
  if (!pool) {
    return { ok: false, reason: lastErrorReason || 'Pool de MySQL no disponible' };
  }

  // 1. Intentar conectar directamente con la base de datos configurada
  try {
    const conn = await pool.getConnection();
    await createTablesOnConnection(conn);
    conn.release();
    isDbConnected = true;
    lastErrorReason = '';
    return { ok: true };
  } catch (directErr: any) {
    // Si el error es que la base de datos no existe aún (ER_BAD_DB_ERROR o código 1049), intentamos crearla
    if (directErr?.code === 'ER_BAD_DB_ERROR' || directErr?.errno === 1049) {
      try {
        const rootConn = await mysql.createConnection({
          host: activeConfig.host,
          port: activeConfig.port,
          user: activeConfig.user,
          password: activeConfig.password,
          connectTimeout: 3500,
        });
        await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${activeConfig.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
        await rootConn.end();

        // Reintentar con el pool
        const retryPool = getDbPool(true);
        if (retryPool) {
          const retryConn = await retryPool.getConnection();
          await createTablesOnConnection(retryConn);
          retryConn.release();
          isDbConnected = true;
          lastErrorReason = '';
          return { ok: true };
        }
      } catch (createDbErr: any) {
        lastErrorReason = `No se pudo crear la base de datos '${activeConfig.database}': ${createDbErr?.message || createDbErr}`;
        isDbConnected = false;
        return { ok: false, reason: lastErrorReason };
      }
    }

    // Fallback alternativo para localhost si 127.0.0.1 falló en entorno local (no en Vercel)
    if (!isVercel && (directErr?.code === 'ECONNREFUSED' || directErr?.code === 'ENOTFOUND') && activeConfig.host === '127.0.0.1') {
      try {
        const altConn = await mysql.createConnection({
          host: 'localhost',
          port: activeConfig.port,
          user: activeConfig.user,
          password: activeConfig.password,
          database: activeConfig.database,
          connectTimeout: 3500,
        });
        await createTablesOnConnection(altConn as any);
        await altConn.end();
        activeConfig.host = 'localhost';
        getDbPool(true);
        isDbConnected = true;
        lastErrorReason = '';
        return { ok: true };
      } catch {}
    }

    lastErrorReason = directErr?.message || 'Error de conexión MySQL';
    isDbConnected = false;
    return { ok: false, reason: lastErrorReason };
  }
}

async function createTablesOnConnection(conn: any): Promise<void> {
  // 1. Tabla datos_negocio
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

  // 2. Tabla categorias_gasto
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

  // 3. Tabla proveedores
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

  // Tabla clientes
  await conn.query(`
    CREATE TABLE IF NOT EXISTS clientes (
      id_cliente VARCHAR(64) PRIMARY KEY,
      nombre_cliente VARCHAR(255) NOT NULL,
      cif VARCHAR(50),
      contacto VARCHAR(255),
      direccion TEXT,
      volumen_ventas_anual DECIMAL(12,2) DEFAULT 0.00,
      email VARCHAR(150),
      telefono VARCHAR(50),
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Tabla facturas_emitidas
  await conn.query(`
    CREATE TABLE IF NOT EXISTS facturas_emitidas (
      id_factura VARCHAR(100) PRIMARY KEY,
      fecha_emision DATE NOT NULL,
      id_cliente VARCHAR(64),
      nombre_cliente VARCHAR(255) NOT NULL,
      cif_cliente VARCHAR(50),
      concepto TEXT,
      importe DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      fecha_vencimiento DATE,
      estado ENUM('Emitida', 'Cobrada', 'Vencida', 'Anulada') DEFAULT 'Emitida',
      fecha_cobro VARCHAR(50) DEFAULT 'Pendiente de cobrar',
      base_imponible DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      tipos_iva VARCHAR(50) DEFAULT '21%',
      cuota_iva DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      aplica_retencion_irpf BOOLEAN DEFAULT FALSE,
      tipo_retencion_irpf VARCHAR(50),
      porcentaje_irpf DECIMAL(5,2) DEFAULT 0.00,
      cuota_irpf DECIMAL(12,2) DEFAULT 0.00,
      total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      categoria_venta VARCHAR(150),
      notas TEXT,
      verifactu_hash VARCHAR(255),
      sincronizado_sheets BOOLEAN DEFAULT FALSE,
      creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_cliente (id_cliente),
      INDEX idx_fecha_emitida (fecha_emision)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // Tabla lineas_factura_emitida
  await conn.query(`
    CREATE TABLE IF NOT EXISTS lineas_factura_emitida (
      id INT PRIMARY KEY AUTO_INCREMENT,
      id_factura VARCHAR(100) NOT NULL,
      nombre_producto VARCHAR(255) NOT NULL,
      cantidad DECIMAL(10,2) NOT NULL DEFAULT 1.00,
      precio_unitario DECIMAL(12,4) NOT NULL DEFAULT 0.00,
      subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      FOREIGN KEY (id_factura) REFERENCES facturas_emitidas(id_factura) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 4. Tabla facturas
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

  // 5. Tabla lineas_factura

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

  // 6. Tabla alertas (compatible con todas las versiones de MariaDB y MySQL usando LONGTEXT)
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

  // 7. Tabla historico_precios para evolución de costes y auditoría
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

  // 8. Tabla configuracion_parametros (Sustituye fa_parametros_sistema_v1 y fa_alertas_config_v1)
  await conn.query(`
    CREATE TABLE IF NOT EXISTS configuracion_parametros (
      id INT PRIMARY KEY AUTO_INCREMENT,
      umbral_subida_moderada_pct DECIMAL(5,2) DEFAULT 8.00,
      umbral_subida_critica_pct DECIMAL(5,2) DEFAULT 15.00,
      umbral_concentracion_proveedor_pct DECIMAL(5,2) DEFAULT 30.00,
      notificar_concentracion_proveedor BOOLEAN DEFAULT TRUE,
      dias_anticipacion_vencimiento INT DEFAULT 3,
      notificar_facturas_vencidas BOOLEAN DEFAULT TRUE,
      regimen_fiscal_predeterminado VARCHAR(100) DEFAULT 'Régimen General Peninsular',
      tipo_retencion_predeterminada VARCHAR(100) DEFAULT '15% Profesional',
      actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
  `);

  // 9. Tabla analisis_financieros_ia (Sustituye fa_analisis_v1)
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
  try { await conn.query('ALTER TABLE analisis_financieros_ia ADD COLUMN principales_gastos LONGTEXT'); } catch {}
  try { await conn.query('ALTER TABLE analisis_financieros_ia ADD COLUMN cambios_importantes LONGTEXT'); } catch {}
  try { await conn.query('ALTER TABLE analisis_financieros_ia ADD COLUMN alertas LONGTEXT'); } catch {}

  // 10. Tabla historial_chat_ia (Sustituye la memoria RAM efímera del Chat IA)
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

  // 11. Tabla declaraciones_aeat (Registro y cierre oficial de Modelos Fiscales 303, 130, 111, 115, 347)
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

  // 12. Tabla integraciones_google (Sustituye fa_sheets_config_v1 y fa_is_sheet_data_active_v1)
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
  try { await conn.query('ALTER TABLE integraciones_google ADD COLUMN is_sheet_data_active BOOLEAN DEFAULT FALSE'); } catch {}

  try {
    const [existingGoogle]: [any[], any] = await conn.query('SELECT id, endpoint_url, drive_folder_id FROM integraciones_google WHERE id = 1 LIMIT 1');
    const defaultEndpoint = process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL || 'https://script.google.com/macros/s/AKfycby_om7y_NBaPo5MXc-QyzGKgOIjqsg7graHUXWC_4nelkzXSTmu2HuV3iqRvbwW4a4SVQ/exec';
    const defaultDriveFolder = process.env.GOOGLE_DRIVE_FOLDER_ID || '1Uwm3ROGnrn3T7fF2IvbkblJQAo2VZ0mK';
    const defaultSheetId = process.env.GOOGLE_SHEETS_ID || '';

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
    console.warn('Aviso al sembrar integraciones_google en MySQL:', seedErr);
  }

  // 13. Auto-siembra de arquitectura relacional completa si la base de datos empresarial está vacía
  await seedInitialDataIfEmpty(conn);
}

async function seedInitialDataIfEmpty(conn: any): Promise<void> {
  try {
    const [rows]: [any[], any] = await conn.query('SELECT COUNT(*) as count FROM facturas');
    const count = rows && rows[0] ? Number(rows[0].count) : 0;
    if (count === 0) {
      // 1. Datos de negocio
      const [negRows]: [any[], any] = await conn.query('SELECT COUNT(*) as cnt FROM datos_negocio');
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

      // 2. Categorías de gasto
      for (const cat of DEFAULT_CATEGORIAS_GASTO) {
        await conn.query(`
          INSERT IGNORE INTO categorias_gasto (id, nombre, descripcion, color, es_predeterminada)
          VALUES (?, ?, ?, ?, ?)
        `, [cat.id, cat.nombre, cat.descripcion || '', cat.color || '#0ea5e9', cat.esPredeterminada ? 1 : 0]);
      }

      // 3. Facturas completas con proveedores, líneas e histórico de precios
      for (const f of INITIAL_FACTURAS) {
        const idFactura = String(f.idFactura).trim();
        const idProveedor = String(f.idProveedor || 'PROV-GEN').trim();
        const nombreProveedor = String(f.nombreProveedor || 'Proveedor General').trim();
        const fechaEmisionSql = sanitizeSqlDate(f.fechaEmision) || new Date().toISOString().split('T')[0];
        const fechaVencimientoSql = sanitizeSqlDate(f.fechaVencimiento) || fechaEmisionSql;
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
          f.concepto || 'Factura registrada',
          importe,
          fechaVencimientoSql,
          f.estado || 'Pendiente',
          f.fechaPago || 'Pendiente de confirmar',
          baseImponible,
          f.tiposIVA || '21%',
          cuotaIVA,
          f.regimenFiscal || 'Régimen General Peninsular',
          Boolean(f.aplicaRecargoEquivalencia) ? 1 : 0,
          f.tipoRecargoEquivalencia || '',
          cuotaRecargo,
          Boolean(f.aplicaRetencionIRPF) ? 1 : 0,
          f.tipoRetencionIRPF || '',
          porcentajeIRPF,
          cuotaIRPF,
          f.conceptoRetencionIRPF || '',
          total,
          f.categoriaGasto || 'Materias Primas',
          f.categoriaGastoJustificacion || '',
          f.notas || '',
          f.archivoNombre || `${idFactura}.pdf`,
          f.driveFileUrl || f.archivoRuta || (f as any).archivo_ruta || null
        ]);

        const lineas = Array.isArray(f.lineas) && f.lineas.length > 0
          ? f.lineas
          : [{
              nombreProducto: f.concepto || 'Producto / Servicio',
              cantidad: 1,
              unidad: 'ud',
              precioUnitario: importe,
              subtotal: importe,
            }];

        const lineasData = lineas.map((l: any) => [
          idFactura,
          String(l.nombreProducto || 'Artículo').trim(),
          Number(l.cantidad || 1),
          String(l.unidad || 'ud').trim(),
          Number(l.precioUnitario || 0),
          Number(l.subtotal || (Number(l.cantidad || 1) * Number(l.precioUnitario || 0))),
        ]);


        await conn.query(
          `INSERT INTO lineas_factura (id_factura, nombre_producto, cantidad, unidad, precio_unitario, subtotal) VALUES ?`,
          [lineasData]
        );

        for (const l of lineas) {
          const precio = Number(l.precioUnitario || 0);
          const nomProd = String(l.nombreProducto || f.concepto || 'Artículo').trim();
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
              String(l.unidad || 'ud').trim()
            ]);
          }
        }
      }

      // 4. Sembrar alertas iniciales
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
          a.fecha ? new Date(a.fecha) : new Date(),
          a.estado || 'activa',
          a.datosRelacionados ? JSON.stringify(a.datosRelacionados) : null
        ]);
      }

      // 5. Sembrar configuración de parámetros
      const [paramRows]: [any[], any] = await conn.query('SELECT COUNT(*) as cnt FROM configuracion_parametros');
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
          DEFAULT_PARAMETROS_SISTEMA.regimenFiscalPredeterminado || 'IVA_PENINSULAR',
          DEFAULT_PARAMETROS_SISTEMA.tipoIrpfRetencionPredeterminado || '15%'
        ]);
      }
    }
  } catch (seedErr) {
    console.warn('Aviso en siembra inicial de MySQL:', seedErr);
  }
}

/**
 * Verifica si la base de datos MySQL está activa y accesible, midiendo el tiempo de respuesta.
 */
export async function testDbConnection(): Promise<{
  connected: boolean;
  latencyMs: number;
  message: string;
  host: string;
  port: number;
  database: string;
}> {
  const isVercel = !!(
    process.env.VERCEL ||
    process.env.VERCEL_ENV ||
    process.env.NOW_REGION ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT
  );

  if (isVercel && (activeConfig.host === '127.0.0.1' || activeConfig.host === 'localhost')) {
    return {
      connected: false,
      latencyMs: 1,
      message: `En Vercel (servidor Serverless en la nube) no es posible conectar a '127.0.0.1' ni a 'localhost'. Debes indicar la IP pública o dominio de tu servidor MySQL/MariaDB remoto (ej: db.tudominio.com o IP pública) y habilitar conexiones remotas en el puerto 3306.`,
      host: activeConfig.host,
      port: activeConfig.port,
      database: activeConfig.database,
    };
  }

  const start = Date.now();
  let timer: any = null;
  const timeoutPromise = new Promise<{ ok: boolean; reason: string }>((resolve) => {
    timer = setTimeout(() => {
      resolve({
        ok: false,
        reason: `Tiempo de espera agotado (>5.5s) al conectar con ${activeConfig.host}:${activeConfig.port}. Comprueba que el servidor MySQL permita conexiones externas en el puerto 3306 y que el cortafuegos no esté bloqueando la IP de Vercel.`
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
        message: `Conexión exitosa a MySQL en ${activeConfig.host}:${activeConfig.port} (Base de datos: ${activeConfig.database})`,
        host: activeConfig.host,
        port: activeConfig.port,
        database: activeConfig.database,
      };
    }
    return {
      connected: false,
      latencyMs,
      message: check.reason || `No se pudo conectar a MySQL en ${activeConfig.host}:${activeConfig.port}`,
      host: activeConfig.host,
      port: activeConfig.port,
      database: activeConfig.database,
    };
  } catch (err: any) {
    if (timer) clearTimeout(timer);
    const latencyMs = Math.max(1, Date.now() - start);
    return {
      connected: false,
      latencyMs,
      message: err?.message || `Error al conectar con MySQL en ${activeConfig.host}:${activeConfig.port}`,
      host: activeConfig.host,
      port: activeConfig.port,
      database: activeConfig.database,
    };
  }
}

/**
 * Ping ligero y de alta frecuencia para comprobar latencia en tiempo real sin recargar esquemas.
 */
export async function pingDb(): Promise<{
  connected: boolean;
  latencyMs: number;
  message: string;
  host: string;
  port: number;
  database: string;
}> {
  const start = Date.now();
  const pool = getDbPool();
  if (!pool) {
    return {
      connected: false,
      latencyMs: 0,
      message: lastErrorReason || 'Pool de MySQL no inicializado',
      host: activeConfig.host,
      port: activeConfig.port,
      database: activeConfig.database,
    };
  }

  try {
    const conn = await pool.getConnection();
    const qStart = Date.now();
    await conn.query('SELECT 1');
    const latencyMs = Math.max(1, Date.now() - qStart);
    conn.release();
    isDbConnected = true;
    lastErrorReason = '';
    return {
      connected: true,
      latencyMs,
      message: 'Conexión activa',
      host: activeConfig.host,
      port: activeConfig.port,
      database: activeConfig.database,
    };
  } catch (err: any) {
    isDbConnected = false;
    lastErrorReason = err?.message || 'Error al comunicar con MySQL';
    return {
      connected: false,
      latencyMs: Math.max(1, Date.now() - start),
      message: lastErrorReason,
      host: activeConfig.host,
      port: activeConfig.port,
      database: activeConfig.database,
    };
  }
}

/**
 * Retorna si la base de datos MySQL está disponible actualmente.
 */
export function isMySQLAvailable(): boolean {
  return isDbConnected;
}

export async function initDatabaseTables(): Promise<void> {
  await ensureDatabaseAndTables();
}

/**
 * Inserta o actualiza masivamente un array de facturas y sus proveedores en MySQL.
 */
export async function guardarFacturasEnMySQL(facturas: any[]): Promise<{ replicadas: number; errores: string[]; mysqlDisponible: boolean; razonFallo?: string }> {
  if (!Array.isArray(facturas) || facturas.length === 0) {
    return { replicadas: 0, errores: [], mysqlDisponible: isDbConnected };
  }

  const check = await ensureDatabaseAndTables();
  if (!check.ok) {
    return {
      replicadas: 0,
      errores: [check.reason || 'MySQL no está accesible'],
      mysqlDisponible: false,
      razonFallo: check.reason || `No hay conexión a ${activeConfig.host}:${activeConfig.port}`
    };
  }

  const pool = getDbPool();
  if (!pool) {
    return { replicadas: 0, errores: ['Pool de MySQL no disponible'], mysqlDisponible: false };
  }

  let replicadas = 0;
  const errores: string[] = [];

  try {
    const conn = await pool.getConnection();
    isDbConnected = true;

    for (const f of facturas) {
      if (!f || !f.idFactura) continue;

      try {
        const idFactura = String(f.idFactura).trim();
        const idProveedor = String(f.idProveedor || 'PROV-GEN').trim();
        const nombreProveedor = String(f.nombreProveedor || 'Proveedor General').trim();
        
        const fechaEmisionSql = sanitizeSqlDate(f.fechaEmision) || new Date().toISOString().split('T')[0];
        const fechaVencimientoSql = sanitizeSqlDate(f.fechaVencimiento) || fechaEmisionSql;
        
        const total = Number(f.total || 0);
        const baseImponible = Number(f.baseImponible || f.importe || 0);
        const importe = Number(f.importe || baseImponible || 0);
        const cuotaIVA = Number(f.cuotaIVA || 0);
        const cuotaRecargo = Number(f.cuotaRecargoEquivalencia || 0);
        const cuotaIRPF = Number(f.cuotaIRPF || 0);
        const porcentajeIRPF = Number(f.porcentajeIRPF || 0);

        // 1. Guardar o actualizar proveedor
        await conn.query(`
          INSERT INTO proveedores (id_proveedor, nombre_proveedor, importe_mensual)
          VALUES (?, ?, ?)
          ON DUPLICATE KEY UPDATE 
            nombre_proveedor = VALUES(nombre_proveedor),
            importe_mensual = importe_mensual + VALUES(importe_mensual)
        `, [idProveedor, nombreProveedor, total]);

        // 2. Guardar o actualizar factura
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
          f.concepto || 'Factura registrada en Google Sheets',
          importe,
          fechaVencimientoSql,
          f.estado || 'Pendiente',
          f.fechaPago || 'Pendiente de confirmar',
          baseImponible,
          f.tiposIVA || '21%',
          cuotaIVA,
          f.regimenFiscal || 'Régimen General Peninsular',
          Boolean(f.aplicaRecargoEquivalencia) ? 1 : 0,
          f.tipoRecargoEquivalencia || '',
          cuotaRecargo,
          Boolean(f.aplicaRetencionIRPF) ? 1 : 0,
          f.tipoRetencionIRPF || '',
          porcentajeIRPF,
          cuotaIRPF,
          f.conceptoRetencionIRPF || '',
          total,
          f.categoriaGasto || 'Materias Primas',
          f.categoriaGastoJustificacion || '',
          f.notas || '',
          f.archivoNombre || `${idFactura}.pdf`,
          f.driveFileUrl || f.archivoRuta || (f as any).archivo_ruta || null
        ]);

        // 3. Guardar líneas de factura (garantizando registros en lineas_factura)
        const lineasParaGuardar = Array.isArray(f.lineas) && f.lineas.length > 0
          ? f.lineas
          : [{
              nombreProducto: f.concepto || 'Producto / Servicio General',
              cantidad: 1,
              unidad: 'ud',
              precioUnitario: importe,
              subtotal: importe,
            }];

        // Limpiar líneas anteriores para evitar duplicados
        await conn.query('DELETE FROM lineas_factura WHERE id_factura = ?', [idFactura]);

        const lineasData = lineasParaGuardar.map((l: any) => [
          idFactura,
          String(l.nombreProducto || 'Artículo').trim(),
          Number(l.cantidad || 1),
          String(l.unidad || 'ud').trim(),
          Number(l.precioUnitario || 0),
          Number(l.subtotal || (Number(l.cantidad || 1) * Number(l.precioUnitario || 0))),
        ]);

        await conn.query(
          `INSERT INTO lineas_factura (id_factura, nombre_producto, cantidad, unidad, precio_unitario, subtotal) VALUES ?`,
          [lineasData]
        );

        // 4. Guardar en historico_precios para monitorizar variaciones de coste unitario
        for (const l of lineasParaGuardar) {
          const precio = Number(l.precioUnitario || 0);
          const nomProd = String(l.nombreProducto || f.concepto || 'Artículo').trim();
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
              String(l.unidad || 'ud').trim()
            ]);
          }
        }

        replicadas++;
      } catch (rowErr: any) {
        errores.push(`Factura ${f.idFactura}: ${rowErr.message}`);
      }
    }

    conn.release();
    return { replicadas, errores, mysqlDisponible: true };
  } catch (err: any) {
    return {
      replicadas,
      errores: [...errores, err.message],
      mysqlDisponible: false,
      razonFallo: err.message
    };
  }
}

/**
 * Obtiene todas las facturas y sus líneas asociadas almacenadas en MySQL.
 */
export async function obtenerFacturasDeMySQL(): Promise<any[]> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    const [facturasRows]: [any[], any] = await conn.query(`
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

    let lineasRows: any[] = [];
    try {
      const [lRows]: [any[], any] = await conn.query(`
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
    } catch {}

    conn.release();

    const lineasPorFactura: Record<string, any[]> = {};
    lineasRows.forEach((l) => {
      if (!lineasPorFactura[l.idFactura]) {
        lineasPorFactura[l.idFactura] = [];
      }
      lineasPorFactura[l.idFactura].push({
        nombreProducto: l.nombreProducto,
        cantidad: Number(l.cantidad || 1),
        unidad: l.unidad || 'ud',
        precioUnitario: Number(l.precioUnitario || 0),
        subtotal: Number(l.subtotal || 0),
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
      driveGuardado: Boolean((f.driveFileUrl || f.archivoRuta || f.archivo_ruta) && String(f.driveFileUrl || f.archivoRuta || f.archivo_ruta).startsWith('http')),
      lineas: lineasPorFactura[f.idFactura] || [],
    }));
  } catch (err: any) {
    console.warn('Aviso al consultar facturas en MySQL:', err?.message);
    return [];
  }
}

/**
 * Elimina una factura y todas sus líneas de detalle asociadas directamente en MySQL (Single Source of Truth).
 */
export async function eliminarFacturaDeMySQL(idFactura: string): Promise<{ ok: boolean; affectedRows: number; error?: string }> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) {
    return { ok: false, affectedRows: 0, error: 'MySQL no está disponible' };
  }
  const normalizedId = String(idFactura).trim();
  try {
    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      // Eliminar líneas de detalle
      await conn.query('DELETE FROM lineas_factura WHERE id_factura = ?', [normalizedId]);
      const [res]: [any, any] = await conn.query('DELETE FROM facturas WHERE id_factura = ?', [normalizedId]);
      await conn.query('DELETE FROM alertas WHERE id LIKE ? OR id LIKE ?', [
        `ALT-VENC-${normalizedId}%`,
        `ALT-PRICE-${normalizedId}%`,
      ]);
      await conn.commit();
      conn.release();
      return { ok: true, affectedRows: res?.affectedRows || 0 };
    } catch (txErr: any) {
      await conn.rollback();
      conn.release();
      return { ok: false, affectedRows: 0, error: txErr?.message };
    }
  } catch (err: any) {
    return { ok: false, affectedRows: 0, error: err?.message };
  }
}

/**
 * Actualiza el estado de pago o cobro de una factura directamente en la base de datos MySQL.
 */
export async function actualizarEstadoFacturaEnMySQL(
  idFactura: string,
  nuevoEstado: 'Pagada' | 'Pendiente' | 'Vencida',
  fechaPago?: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) {
    return { ok: false, error: 'MySQL no está disponible' };
  }
  const normalizedId = String(idFactura).trim();
  try {
    const conn = await pool.getConnection();
    const query = fechaPago
      ? 'UPDATE facturas SET estado = ?, fecha_pago = ? WHERE id_factura = ?'
      : 'UPDATE facturas SET estado = ? WHERE id_factura = ?';
    const params = fechaPago ? [nuevoEstado, fechaPago, normalizedId] : [nuevoEstado, normalizedId];
    await conn.query(query, params);
    conn.release();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}

/**
 * Guarda o actualiza los datos fiscales e identidad del negocio en la tabla datos_negocio de MySQL.
 */
export async function guardarDatosNegocioEnMySQL(
  datos: any
): Promise<{ ok: boolean; error?: string }> {
  if (!datos || typeof datos !== 'object') return { ok: false, error: 'Datos no válidos' };
  const check = await ensureDatabaseAndTables();
  if (!check.ok) return { ok: false, error: check.reason || 'MySQL no disponible' };

  const pool = getDbPool();
  if (!pool) return { ok: false, error: 'Pool de MySQL no disponible' };

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
      datos.nombre || 'Mi Empresa',
      datos.nif || 'B-00000000',
      datos.direccion || '',
      datos.actividad || '',
      datos.sector || '',
      datos.contextoOperativo || '',
      datos.email || '',
      datos.telefono || ''
    ]);
    conn.release();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Obtiene los datos de identidad del negocio almacenados en la tabla datos_negocio de MySQL.
 */
export async function obtenerDatosNegocioDeMySQL(): Promise<any | null> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return null;
  try {
    const conn = await pool.getConnection();
    const [rows]: [any[], any] = await conn.query('SELECT * FROM datos_negocio WHERE id = 1 LIMIT 1');
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

/**
 * Guarda masivamente el catálogo de categorías de gasto en la tabla categorias_gasto de MySQL.
 */
export async function guardarCategoriasEnMySQL(
  categorias: any[]
): Promise<{ replicadas: number; errores: string[]; mysqlDisponible: boolean }> {
  if (!Array.isArray(categorias) || categorias.length === 0) {
    return { replicadas: 0, errores: [], mysqlDisponible: isDbConnected };
  }
  const check = await ensureDatabaseAndTables();
  if (!check.ok) {
    return { replicadas: 0, errores: [check.reason || 'MySQL no disponible'], mysqlDisponible: false };
  }
  const pool = getDbPool();
  if (!pool) return { replicadas: 0, errores: ['Pool MySQL no disponible'], mysqlDisponible: false };

  let replicadas = 0;
  const errores: string[] = [];

  try {
    const conn = await pool.getConnection();
    for (const c of categorias) {
      try {
        const id = String(c.id || c.nombre || '').trim();
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
          c.descripcion || '',
          c.color || '#0ea5e9',
          Boolean(c.esPredeterminada) ? 1 : 0
        ]);
        replicadas++;
      } catch (err: any) {
        errores.push(`Categoría ${c.id}: ${err.message}`);
      }
    }
    conn.release();
    return { replicadas, errores, mysqlDisponible: true };
  } catch (err: any) {
    return { replicadas, errores: [err.message], mysqlDisponible: false };
  }
}

/**
 * Obtiene todas las categorías de gasto almacenadas en la tabla categorias_gasto de MySQL.
 */
export async function obtenerCategoriasDeMySQL(): Promise<any[]> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    const [rows]: [any[], any] = await conn.query(`
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

/**
 * Guarda o actualiza masivamente todos los proveedores con sus atributos completos en la tabla proveedores.
 */
export async function guardarProveedoresEnMySQL(
  proveedores: any[]
): Promise<{ replicadas: number; errores: string[]; mysqlDisponible: boolean }> {
  if (!Array.isArray(proveedores) || proveedores.length === 0) {
    return { replicadas: 0, errores: [], mysqlDisponible: isDbConnected };
  }
  const check = await ensureDatabaseAndTables();
  if (!check.ok) {
    return { replicadas: 0, errores: [check.reason || 'MySQL no disponible'], mysqlDisponible: false };
  }
  const pool = getDbPool();
  if (!pool) return { replicadas: 0, errores: ['Pool MySQL no disponible'], mysqlDisponible: false };

  let replicadas = 0;
  const errores: string[] = [];

  try {
    const conn = await pool.getConnection();
    for (const p of proveedores) {
      try {
        const id = String(p.idProveedor || p.id || p.nombreProveedor || '').trim();
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
          p.cif || '',
          p.contacto || '',
          p.productosSuministrados || '',
          Number(p.importeMensual || 0),
          p.frecuencia || 'Mensual',
          p.riesgoDependencia || 'Bajo',
          p.tiempoMedioEntrega || '2-3 días'
        ]);
        replicadas++;
      } catch (err: any) {
        errores.push(`Proveedor ${p.nombreProveedor}: ${err.message}`);
      }
    }
    conn.release();
    return { replicadas, errores, mysqlDisponible: true };
  } catch (err: any) {
    return { replicadas, errores: [err.message], mysqlDisponible: false };
  }
}

/**
 * Obtiene la lista completa de proveedores registrados en la tabla proveedores de MySQL.
 */
export async function obtenerProveedoresDeMySQL(): Promise<any[]> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    const [rows]: [any[], any] = await conn.query(`
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
      importeMensual: Number(p.importeMensual || 0),
    }));
  } catch (err: any) {
    console.warn('Aviso al consultar proveedores en MySQL:', err?.message);
    return [];
  }
}

/**
 * Obtiene el histórico de precios de compra registrado en la tabla historico_precios.
 */
export async function obtenerHistoricoPreciosDeMySQL(producto?: string): Promise<any[]> {
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
    const params: any[] = [];
    if (producto) {
      query += ` WHERE nombre_producto = ? `;
      params.push(producto);
    }
    query += ` ORDER BY fecha ASC, id ASC`;

    const [rows]: [any[], any] = await conn.query(query, params);
    conn.release();
    return rows.map((r) => ({
      ...r,
      precioUnitario: Number(r.precioUnitario || 0),
    }));
  } catch {
    return [];
  }
}

/**
 * Guarda registros adicionales en la tabla historico_precios.
 */
export async function guardarHistoricoPreciosEnMySQL(
  registros: any[]
): Promise<{ replicadas: number; errores: string[] }> {
  if (!Array.isArray(registros) || registros.length === 0) return { replicadas: 0, errores: [] };
  const pool = getDbPool();
  if (!pool || !isDbConnected) return { replicadas: 0, errores: ['MySQL no disponible'] };

  let replicadas = 0;
  const errores: string[] = [];
  try {
    const conn = await pool.getConnection();
    for (const r of registros) {
      try {
        const fechaSql = sanitizeSqlDate(r.fecha) || new Date().toISOString().split('T')[0];
        await conn.query(`
          INSERT INTO historico_precios (nombre_producto, id_proveedor, nombre_proveedor, id_factura, fecha, precio_unitario, unidad)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          String(r.nombreProducto || 'Artículo').trim(),
          String(r.idProveedor || 'PROV-GEN').trim(),
          String(r.nombreProveedor || 'Proveedor General').trim(),
          String(r.idFactura || 'FAC-GEN').trim(),
          fechaSql,
          Number(r.precioUnitario || 0),
          String(r.unidad || 'ud').trim()
        ]);
        replicadas++;
      } catch (err: any) {
        errores.push(err.message);
      }
    }
    conn.release();
    return { replicadas, errores };
  } catch (e: any) {
    return { replicadas, errores: [e.message] };
  }
}

/**
 * Guarda los parámetros y umbrales operativos del sistema en la tabla configuracion_parametros de MySQL.
 */
export async function guardarParametrosSistemaEnMySQL(params: any): Promise<{ ok: boolean; error?: string }> {
  if (!params || typeof params !== 'object') return { ok: false, error: 'Parámetros no válidos' };
  const check = await ensureDatabaseAndTables();
  if (!check.ok) return { ok: false, error: check.reason || 'MySQL no disponible' };
  const pool = getDbPool();
  if (!pool) return { ok: false, error: 'Pool de MySQL no disponible' };
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
      String(params.regimenFiscalPredeterminado || 'Régimen General Peninsular'),
      String(params.tipoRetencionPredeterminada || '15% Profesional')
    ]);
    conn.release();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Obtiene los parámetros del sistema guardados en la tabla configuracion_parametros de MySQL.
 */
export async function obtenerParametrosSistemaDeMySQL(): Promise<any | null> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return null;
  try {
    const conn = await pool.getConnection();
    const [rows]: [any[], any] = await conn.query('SELECT * FROM configuracion_parametros WHERE id = 1 LIMIT 1');
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
        regimenFiscalPredeterminado: r.regimen_fiscal_predeterminado || 'Régimen General Peninsular',
        tipoRetencionPredeterminada: r.tipo_retencion_predeterminada || '15% Profesional',
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Guarda o actualiza el diagnóstico ejecutivo generado por Gemini en la tabla analisis_financieros_ia.
 */
export async function guardarAnalisisEjecutivoEnMySQL(analisis: any): Promise<{ ok: boolean; error?: string }> {
  if (!analisis || !analisis.estadoGeneral) return { ok: false, error: 'Análisis no válido' };
  const check = await ensureDatabaseAndTables();
  if (!check.ok) return { ok: false, error: check.reason || 'MySQL no disponible' };
  const pool = getDbPool();
  if (!pool) return { ok: false, error: 'Pool de MySQL no disponible' };
  try {
    const conn = await pool.getConnection();
    const id = String(analisis.id || `analisis-${Date.now()}`);
    const fecha = analisis.fechaGeneracion ? new Date(analisis.fechaGeneracion) : new Date();
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
      analisis.prioridadSemana || '',
      Number(analisis.totalGastoAnalizado || 0)
    ]);
    conn.release();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Obtiene el último análisis ejecutivo generado de MySQL.
 */
export async function obtenerAnalisisEjecutivoDeMySQL(): Promise<any | null> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return null;
  try {
    const conn = await pool.getConnection();
    const [rows]: [any[], any] = await conn.query('SELECT * FROM analisis_financieros_ia ORDER BY fecha_generacion DESC, creado_en DESC LIMIT 1');
    conn.release();
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        id: r.id,
        fechaGeneracion: r.fecha_generacion ? new Date(r.fecha_generacion).toISOString() : new Date().toISOString(),
        estadoGeneral: r.estado_general,
        principalesGastos: r.principales_gastos ? JSON.parse(r.principales_gastos) : ['Aprovisionamientos y materias primas', 'Suministros energéticos', 'Logística y servicios operacionales'],
        cambiosImportantes: r.cambios_importantes ? JSON.parse(r.cambios_importantes) : ['Revisión periódica de precios de proveedores clave.'],
        alertas: r.alertas ? JSON.parse(r.alertas) : ['Monitoreo de vencimientos y concentración de compras.'],
        tresAcciones: r.tres_acciones ? JSON.parse(r.tres_acciones) : [],
        oportunidadesAhorro: r.oportunidades_ahorro ? JSON.parse(r.oportunidades_ahorro) : [],
        prioridadSemana: r.prioridad_semana || '',
        totalGastoAnalizado: Number(r.total_gasto_analizado || 0)
      };
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Guarda un mensaje individual del chat interactivo con el asesor IA en historial_chat_ia.
 */
export async function guardarMensajeChatEnMySQL(msg: any): Promise<{ ok: boolean; error?: string }> {
  if (!msg || !msg.texto) return { ok: false, error: 'Mensaje vacío' };
  const check = await ensureDatabaseAndTables();
  if (!check.ok) return { ok: false, error: check.reason || 'MySQL no disponible' };
  const pool = getDbPool();
  if (!pool) return { ok: false, error: 'Pool de MySQL no disponible' };
  try {
    const conn = await pool.getConnection();
    const id = String(msg.id || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`);
    const emisor = msg.emisor === 'usuario' ? 'usuario' : 'asistente';
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
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Obtiene el historial persistente de conversación con el Asistente IA de MySQL.
 */
export async function obtenerHistorialChatDeMySQL(limit: number = 50): Promise<any[]> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    const [rows]: [any[], any] = await conn.query(
      'SELECT id, emisor, mensaje AS texto, sugerencias, DATE_FORMAT(creado_en, "%Y-%m-%d %H:%i:%s") as fecha FROM historial_chat_ia ORDER BY creado_en ASC LIMIT ?',
      [limit]
    );
    conn.release();
    return rows.map((r) => ({
      id: r.id,
      emisor: r.emisor,
      texto: r.texto,
      fecha: r.fecha,
      sugerencias: r.sugerencias ? JSON.parse(r.sugerencias) : undefined
    }));
  } catch {
    return [];
  }
}

/**
 * Limpia el historial de chat en MySQL.
 */
export async function limpiarHistorialChatEnMySQL(): Promise<{ ok: boolean }> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return { ok: false };
  try {
    const conn = await pool.getConnection();
    await conn.query('DELETE FROM historial_chat_ia');
    conn.release();
    return { ok: true };
  } catch {
    return { ok: false };
  }
}

/**
 * Guarda o actualiza una declaración fiscal o liquidación tributaria en declaraciones_aeat.
 */
export async function guardarDeclaracionAeatEnMySQL(d: any): Promise<{ ok: boolean; error?: string }> {
  if (!d || !d.modelo) return { ok: false, error: 'Declaración AEAT no válida' };
  const check = await ensureDatabaseAndTables();
  if (!check.ok) return { ok: false, error: check.reason || 'MySQL no disponible' };
  const pool = getDbPool();
  if (!pool) return { ok: false, error: 'Pool de MySQL no disponible' };
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
      Number(d.ejercicio || new Date().getFullYear()),
      String(d.periodo || '1T'),
      String(d.estado || 'Calculado'),
      Number(d.resultadoDeclaracion || d.resultado || 0),
      d.datosCasillas ? JSON.stringify(d.datosCasillas) : null,
      d.csvJustificante || null,
      d.fechaPresentacion ? sanitizeSqlDate(d.fechaPresentacion) : null
    ]);
    conn.release();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Obtiene las declaraciones fiscales guardadas en MySQL.
 */
export async function obtenerDeclaracionesAeatDeMySQL(modelo?: string, ejercicio?: number): Promise<any[]> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    let query = 'SELECT * FROM declaraciones_aeat WHERE 1=1';
    const params: any[] = [];
    if (modelo) {
      query += ' AND modelo = ?';
      params.push(modelo);
    }
    if (ejercicio) {
      query += ' AND ejercicio = ?';
      params.push(ejercicio);
    }
    query += ' ORDER BY ejercicio DESC, periodo DESC';
    const [rows]: [any[], any] = await conn.query(query, params);
    conn.release();
    return rows.map((r) => ({
      id: r.id,
      modelo: r.modelo,
      ejercicio: r.ejercicio,
      periodo: r.periodo,
      estado: r.estado,
      resultadoDeclaracion: Number(r.resultado_declaracion || 0),
      datosCasillas: r.datos_casillas ? JSON.parse(r.datos_casillas) : undefined,
      csvJustificante: r.csv_justificante,
      fechaPresentacion: r.fecha_presentacion,
      actualizadoEn: r.actualizado_en
    }));
  } catch {
    return [];
  }
}

/**
 * Guarda la configuración de integración con Google Sheets y Google Drive en integraciones_google.
 */
export async function guardarConfiguracionGoogleEnMySQL(config: any): Promise<{ ok: boolean; error?: string }> {
  if (!config) return { ok: false, error: 'Configuración no válida' };
  const check = await ensureDatabaseAndTables();
  if (!check.ok) return { ok: false, error: check.reason || 'MySQL no disponible' };
  const pool = getDbPool();
  if (!pool) return { ok: false, error: 'Pool de MySQL no disponible' };
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
      config.sheetId || '',
      config.endpointUrl || '',
      config.driveFolderId || '',
      config.autoSync !== false ? 1 : 0,
      config.isSheetDataActive ? 1 : 0
    ]);
    conn.release();
    return { ok: true };
  } catch (err: any) {
    return { ok: false, error: err.message };
  }
}

/**
 * Obtiene la configuración de Google Sheets / Drive de MySQL.
 */
export async function obtenerConfiguracionGoogleDeMySQL(): Promise<any | null> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return null;
  try {
    const conn = await pool.getConnection();
    const [rows]: [any[], any] = await conn.query('SELECT * FROM integraciones_google WHERE id = 1 LIMIT 1');
    conn.release();
    if (rows && rows.length > 0) {
      const r = rows[0];
      return {
        sheetId: r.sheet_id || '',
        endpointUrl: r.endpoint_url || process.env.GOOGLE_DRIVE_ENDPOINT_URL || process.env.GOOGLE_SHEETS_ENDPOINT_URL || '',
        driveFolderId: r.drive_folder_id || process.env.GOOGLE_DRIVE_FOLDER_ID || '',
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

/**
 * Función Maestra: Sincroniza TODO el ecosistema contable hacia MySQL/MariaDB
 * Persiste datos_negocio, categorias_gasto, proveedores, facturas, lineas_factura, historico_precios, alertas,
 * parametros_sistema, analisis_financiero, y configuracion_google.
 */
export async function sincronizarTodoHaciaMySQL(datos: {
  facturas?: any[];
  proveedores?: any[];
  alertas?: any[];
  categorias?: any[];
  datosNegocio?: any;
  parametrosSistema?: any;
  analisis?: any;
  configuracionGoogle?: any;
  declaracionesAeat?: any[];
}): Promise<{
  success: boolean;
  mysqlDisponible: boolean;
  facturasReplicadas: number;
  proveedoresReplicados: number;
  alertasReplicadas: number;
  categoriasReplicadas: number;
  datosNegocioGuardados: boolean;
  parametrosGuardados: boolean;
  analisisGuardado: boolean;
  configuracionGoogleGuardada: boolean;
  declaracionesGuardadas: number;
  errores: string[];
  razonFallo?: string;
}> {
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
      errores: [check.reason || 'MySQL no está accesible'],
      razonFallo: check.reason || `No hay conexión con MySQL en ${activeConfig.host}:${activeConfig.port}`
    };
  }

  const erroresTotales: string[] = [];

  // 1. Guardar Datos de Negocio
  let datosNegocioGuardados = false;
  if (datos.datosNegocio) {
    const resNegocio = await guardarDatosNegocioEnMySQL(datos.datosNegocio);
    datosNegocioGuardados = resNegocio.ok;
    if (resNegocio.error) erroresTotales.push(`Datos Negocio: ${resNegocio.error}`);
  }

  // 2. Guardar Categorías de Gasto
  let categoriasReplicadas = 0;
  if (Array.isArray(datos.categorias) && datos.categorias.length > 0) {
    const resCats = await guardarCategoriasEnMySQL(datos.categorias);
    categoriasReplicadas = resCats.replicadas;
    erroresTotales.push(...resCats.errores);
  }

  // 3. Guardar Facturas (incluye desglose en lineas_factura e historico_precios)
  let facturasReplicadas = 0;
  if (Array.isArray(datos.facturas) && datos.facturas.length > 0) {
    const resFacts = await guardarFacturasEnMySQL(datos.facturas);
    facturasReplicadas = resFacts.replicadas;
    erroresTotales.push(...resFacts.errores);
  }

  // 4. Guardar Proveedores (información completa)
  let proveedoresReplicados = 0;
  if (Array.isArray(datos.proveedores) && datos.proveedores.length > 0) {
    const resProvs = await guardarProveedoresEnMySQL(datos.proveedores);
    proveedoresReplicados = resProvs.replicadas;
    erroresTotales.push(...resProvs.errores);
  }

  // 5. Guardar Alertas
  let alertasReplicadas = 0;
  if (Array.isArray(datos.alertas) && datos.alertas.length > 0) {
    const resAlerts = await guardarAlertasEnMySQL(datos.alertas);
    alertasReplicadas = resAlerts.replicadas;
    erroresTotales.push(...resAlerts.errores);
  }

  // 6. Guardar Parámetros y Umbrales del Sistema
  let parametrosGuardados = false;
  if (datos.parametrosSistema) {
    const resParams = await guardarParametrosSistemaEnMySQL(datos.parametrosSistema);
    parametrosGuardados = resParams.ok;
    if (resParams.error) erroresTotales.push(`Parámetros: ${resParams.error}`);
  }

  // 7. Guardar Análisis Ejecutivo IA
  let analisisGuardado = false;
  if (datos.analisis) {
    const resAnalisis = await guardarAnalisisEjecutivoEnMySQL(datos.analisis);
    analisisGuardado = resAnalisis.ok;
    if (resAnalisis.error) erroresTotales.push(`Análisis IA: ${resAnalisis.error}`);
  }

  // 8. Guardar Configuración de Integración Google
  let configuracionGoogleGuardada = false;
  if (datos.configuracionGoogle) {
    const resGoogle = await guardarConfiguracionGoogleEnMySQL(datos.configuracionGoogle);
    configuracionGoogleGuardada = resGoogle.ok;
    if (resGoogle.error) erroresTotales.push(`Configuración Google: ${resGoogle.error}`);
  }

  // 9. Guardar Declaraciones Fiscales AEAT
  let declaracionesGuardadas = 0;
  if (Array.isArray(datos.declaracionesAeat) && datos.declaracionesAeat.length > 0) {
    for (const d of datos.declaracionesAeat) {
      const resD = await guardarDeclaracionAeatEnMySQL(d);
      if (resD.ok) declaracionesGuardadas++;
      else if (resD.error) erroresTotales.push(`Declaración ${d.modelo}: ${resD.error}`);
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

/**
 * Inserta o actualiza un array de alertas en MariaDB/MySQL.
 * Los datos_relacionados se almacenan como LONGTEXT con formato JSON serializado
 * para máxima compatibilidad con todas las versiones de MariaDB y MySQL.
 */
export async function guardarAlertasEnMySQL(
  alertas: any[]
): Promise<{ replicadas: number; errores: string[]; mysqlDisponible: boolean }> {
  if (!Array.isArray(alertas) || alertas.length === 0) {
    return { replicadas: 0, errores: [], mysqlDisponible: isDbConnected };
  }

  const check = await ensureDatabaseAndTables();
  if (!check.ok) {
    return {
      replicadas: 0,
      errores: [check.reason || 'MySQL no está accesible'],
      mysqlDisponible: false,
    };
  }

  const pool = getDbPool();
  if (!pool) {
    return { replicadas: 0, errores: ['Pool de MySQL no disponible'], mysqlDisponible: false };
  }

  let replicadas = 0;
  const errores: string[] = [];

  try {
    const conn = await pool.getConnection();
    for (const a of alertas) {
      try {
        const id = String(a.id || '').trim();
        if (!id) continue;
        const tipo = String(a.tipo || 'GENERAL').trim();
        const nivel = ['critica', 'alta', 'media', 'informativa'].includes(a.nivel) ? a.nivel : 'media';
        const titulo = String(a.titulo || 'Alerta').trim();
        const descripcion = String(a.descripcion || '').trim();
        const fecha = a.fecha ? new Date(a.fecha) : new Date();
        const estado = ['activa', 'resuelta', 'ignorada'].includes(a.estado) ? a.estado : 'activa';

        // Formatear JSON de forma compatible con MariaDB (LONGTEXT)
        let datosRelacionadosJson: string | null = null;
        if (a.datosRelacionados) {
          datosRelacionadosJson = typeof a.datosRelacionados === 'string'
            ? a.datosRelacionados
            : JSON.stringify(a.datosRelacionados);
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
      } catch (rowErr: any) {
        errores.push(`Alerta ${a.id}: ${rowErr.message}`);
      }
    }
    conn.release();
    return { replicadas, errores, mysqlDisponible: true };
  } catch (err: any) {
    return { replicadas, errores: [...errores, err.message], mysqlDisponible: false };
  }
}

/**
 * Obtiene todas las alertas registradas en la tabla alertas de MySQL.
 */
export async function obtenerAlertasDeMySQL(): Promise<any[]> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) return [];
  try {
    const conn = await pool.getConnection();
    const [rows]: [any[], any] = await conn.query(`
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
          datosRelacionadosParsed = typeof a.datosRelacionados === 'string'
            ? JSON.parse(a.datosRelacionados)
            : a.datosRelacionados;
        } catch {
          datosRelacionadosParsed = a.datosRelacionados;
        }
      }
      return {
        ...a,
        datosRelacionados: datosRelacionadosParsed,
      };
    });
  } catch (err: any) {
    console.warn('Aviso al consultar alertas en MySQL:', err?.message);
    return [];
  }
}

/**
 * Actualiza el estado de una alerta directamente en la base de datos MySQL ('activa', 'resuelta', 'ignorada').
 */
export async function actualizarEstadoAlertaEnMySQL(
  idAlerta: string,
  nuevoEstado: 'activa' | 'resuelta' | 'ignorada' | string,
  alertaCompleta?: any
): Promise<{ ok: boolean; error?: string }> {
  if (!isDbConnected) {
    await ensureDatabaseAndTables();
  }
  const pool = getDbPool();
  if (!pool || !isDbConnected) {
    return { ok: false, error: 'MySQL no está disponible' };
  }
  const normalizedId = String(idAlerta).trim();
  const estadoValido = ['activa', 'resuelta', 'ignorada'].includes(nuevoEstado) ? nuevoEstado : 'activa';
  try {
    const conn = await pool.getConnection();
    const [res]: any = await conn.query(
      'UPDATE alertas SET estado = ? WHERE id = ?',
      [estadoValido, normalizedId]
    );

    // Si la alerta no existía previamente en la tabla alertas (por ejemplo, generada al vuelo), insertarla
    if (res.affectedRows === 0 && alertaCompleta) {
      const a = alertaCompleta;
      const tipo = String(a.tipo || 'ANOMALÍA').trim();
      const nivel = String(a.nivel || 'media').trim();
      const titulo = String(a.titulo || 'Alerta').trim();
      const descripcion = String(a.descripcion || '').trim();
      const fecha = a.fecha ? new Date(a.fecha) : new Date();
      let datosRelacionadosJson: string | null = null;
      if (a.datosRelacionados) {
        datosRelacionadosJson = typeof a.datosRelacionados === 'string'
          ? a.datosRelacionados
          : JSON.stringify(a.datosRelacionados);
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
  } catch (err: any) {
    return { ok: false, error: err?.message };
  }
}


/**
 * Genera un script SQL descargable con la definición completa de la base de datos y todas las tablas para phpMyAdmin.
 */
export function generarScriptSqlCompleto(
  facturas: any[],
  proveedores: any[] = [],
  datosNegocio?: any,
  categorias?: any[],
  parametros?: any
): string {
  const dbName = activeConfig.database || 'finance_ai_db';
  return generarScriptSqlCompletoUtil({
    facturas,
    proveedores,
    datosNegocio,
    categorias,
    parametros,
    databaseName: dbName,
  });
}
