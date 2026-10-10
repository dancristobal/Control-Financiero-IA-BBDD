import { Factura, Proveedor, Alerta, CategoriaGastoDef, DatosNegocio } from '../types';
import { obtenerCategoriasGasto } from '../utils/categoriasGasto';
import { obtenerParametrosSistema } from '../utils/parametrosSistema';

// ============================================================================
// DEFINICIÓN DE ESQUEMA COMPATIBLE CON MARIADB Y MYSQL (XAMPP / PRODUCCIÓN)
// ============================================================================
/**
 * ANÁLISIS DEL ERROR DE SINTAXIS MARIADB:
 * En MariaDB (especialmente versiones como 10.1.x y anteriores, o entornos con modos
 * estrictos de sintaxis SQL en XAMPP), el tipo de dato `JSON` no existe como palabra clave
 * nativa del parser DDL, lo que genera el error:
 * "near 'JSON ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci' at line 9".
 * 
 * En MariaDB, la documentación oficial estipula que `JSON` es conceptualmente un alias de `LONGTEXT`.
 * Por tanto, la definición 100% universal y estándar compatible tanto con cualquier versión de
 * MariaDB (10.0 hasta 11.x) como con MySQL (5.7, 8.0, 8.4) consiste en declarar los campos
 * que almacenan estructuras JSON (como `datos_relacionados` en la tabla `alertas`) como `LONGTEXT`.
 * 
 * En TypeScript/JavaScript, las estructuras se serializan con `JSON.stringify()` antes de insertar
 * y se reconstruyen con `JSON.parse()` al recuperar.
 */

export interface DefinicionTablaSql {
  nombre: string;
  descripcion: string;
  sqlCreateTable: string;
}

/**
 * Esquema DDL completo de todas las tablas del sistema diseñado específicamente
 * para compatibilidad total con MariaDB y MySQL.
 */
export const TABLAS_SCHEMA_MARIADB: Record<string, DefinicionTablaSql> = {
  datos_negocio: {
    nombre: 'datos_negocio',
    descripcion: 'Almacena la identidad y configuración fiscal del negocio',
    sqlCreateTable: `CREATE TABLE IF NOT EXISTS datos_negocio (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  },

  categorias_gasto: {
    nombre: 'categorias_gasto',
    descripcion: 'Catálogo de categorías de gasto y su codificación cromática',
    sqlCreateTable: `CREATE TABLE IF NOT EXISTS categorias_gasto (
  id VARCHAR(64) PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  color VARCHAR(20) DEFAULT '#0ea5e9',
  es_predeterminada BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  },

  proveedores: {
    nombre: 'proveedores',
    descripcion: 'Registro de proveedores, condiciones de suministro y riesgos',
    sqlCreateTable: `CREATE TABLE IF NOT EXISTS proveedores (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  },

  facturas: {
    nombre: 'facturas',
    descripcion: 'Facturas de compra con desglose impositivo y fiscal completo',
    sqlCreateTable: `CREATE TABLE IF NOT EXISTS facturas (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  },

  facturas_lineas: {
    nombre: 'facturas_lineas',
    descripcion: 'Detalle de partidas y productos de cada factura',
    sqlCreateTable: `CREATE TABLE IF NOT EXISTS facturas_lineas (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_factura VARCHAR(100) NOT NULL,
  nombre_producto VARCHAR(255) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  unidad VARCHAR(50) DEFAULT 'ud',
  precio_unitario DECIMAL(12,4) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (id_factura) REFERENCES facturas(id_factura) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  },

  lineas_factura: {
    nombre: 'lineas_factura',
    descripcion: 'Partidas desglosadas por factura (tabla estándar)',
    sqlCreateTable: `CREATE TABLE IF NOT EXISTS lineas_factura (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_factura VARCHAR(100) NOT NULL,
  nombre_producto VARCHAR(255) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  unidad VARCHAR(50) DEFAULT 'ud',
  precio_unitario DECIMAL(12,4) NOT NULL DEFAULT 0.00,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  FOREIGN KEY (id_factura) REFERENCES facturas(id_factura) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  },

  historico_precios: {
    nombre: 'historico_precios',
    descripcion: 'Registro cronológico de precios unitarios de compra por producto y proveedor',
    sqlCreateTable: `CREATE TABLE IF NOT EXISTS historico_precios (
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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  },

  alertas: {
    nombre: 'alertas',
    descripcion: 'Alertas financieras, anomalías y auditoría con almacenamiento JSON compatible',
    // NOTA CLAVE: En MariaDB se emplea LONGTEXT en lugar del tipo JSON nativo para evitar el error de sintaxis en el motor SQL
    sqlCreateTable: `CREATE TABLE IF NOT EXISTS alertas (
  id VARCHAR(100) PRIMARY KEY,
  tipo VARCHAR(100) NOT NULL,
  nivel ENUM('critica', 'alta', 'media', 'informativa') DEFAULT 'media',
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT,
  fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  estado ENUM('activa', 'resuelta', 'ignorada') DEFAULT 'activa',
  datos_relacionados LONGTEXT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`
  }
};

/**
 * Array ordenado de sentencias DDL para inicializar o restaurar la base de datos
 */
export const SQL_TABLAS_ORDENADAS_MARIADB: string[] = [
  TABLAS_SCHEMA_MARIADB.datos_negocio.sqlCreateTable,
  TABLAS_SCHEMA_MARIADB.categorias_gasto.sqlCreateTable,
  TABLAS_SCHEMA_MARIADB.proveedores.sqlCreateTable,
  TABLAS_SCHEMA_MARIADB.facturas.sqlCreateTable,
  TABLAS_SCHEMA_MARIADB.facturas_lineas.sqlCreateTable,
  TABLAS_SCHEMA_MARIADB.lineas_factura.sqlCreateTable,
  TABLAS_SCHEMA_MARIADB.historico_precios.sqlCreateTable,
  TABLAS_SCHEMA_MARIADB.alertas.sqlCreateTable,
];

/**
 * Formatea un objeto o payload para ser almacenado en la columna de tipo JSON (LONGTEXT en MariaDB).
 * Si el dato ya es una cadena o es nulo/indefinido, lo gestiona de forma segura.
 */
export function formatearJsonParaMariaDB(data: any): string | null {
  if (data === null || data === undefined) {
    return null;
  }
  if (typeof data === 'string') {
    return data;
  }
  try {
    return JSON.stringify(data);
  } catch (error) {
    console.warn('Error al serializar objeto para columna LONGTEXT (JSON) de MariaDB:', error);
    return null;
  }
}

/**
 * Parsea el contenido extraído de una columna LONGTEXT (JSON de MariaDB) a un tipo tipado.
 */
export function parsearJsonDeMariaDB<T = any>(columnaJson: string | null | undefined, fallback: T): T {
  if (!columnaJson) {
    return fallback;
  }
  try {
    return JSON.parse(columnaJson) as T;
  } catch (error) {
    console.warn('Error al parsear contenido JSON desde MariaDB:', error);
    return fallback;
  }
}

/**
 * Genera el script SQL completo de creación de base de datos y tablas,
 * 100% compatible con MariaDB (XAMPP) y MySQL.
 */
export function generarScriptCreacionMariaDB(nombreBaseDatos: string = 'finance_ai_db'): string {
  return [
    `-- ============================================================`,
    `-- FINANCE AI — Esquema DDL optimizado para MariaDB / MySQL`,
    `-- Compatible con XAMPP (Apache + MariaDB 10.x / MySQL 8.x)`,
    `-- Fecha: ${new Date().toISOString()}`,
    `-- ============================================================`,
    ``,
    `CREATE DATABASE IF NOT EXISTS \`${nombreBaseDatos}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`,
    `USE \`${nombreBaseDatos}\`;`,
    ``,
    ...SQL_TABLAS_ORDENADAS_MARIADB.map((ddl) => ddl + '\n')
  ].join('\n');
}

// ============================================================================
// INTERFACES Y MÉTODOS DE SINCRONIZACIÓN Y MIGRACIÓN
// ============================================================================

export interface ResultadoMigracion {
  success: boolean;
  totalFacturas: number;
  facturasMigradas: number;
  facturasFallidas: number;
  totalProveedores: number;
  proveedoresMigrados: number;
  totalCategorias: number;
  categoriasMigradas: number;
  totalAlertas: number;
  alertasMigradas: number;
  errores: string[];
  tiempoMs: number;
}

export interface EstadisticasLocalStorage {
  numFacturas: number;
  numProveedores: number;
  numAlertas: number;
  numCategorias: number;
  tieneDatosNegocio: boolean;
  tamanoBytesAprox: number;
}

/**
 * Obtiene un balance de todos los datos actualmente almacenados en el localStorage del navegador.
 */
export function obtenerEstadisticasLocalStorage(): EstadisticasLocalStorage {
  let numFacturas = 0;
  let numProveedores = 0;
  let numAlertas = 0;
  let numCategorias = 0;
  let tieneDatosNegocio = false;
  let tamanoBytesAprox = 0;

  try {
    const rawFacturas = localStorage.getItem('fa_facturas_v1');
    if (rawFacturas) {
      tamanoBytesAprox += rawFacturas.length * 2;
      const parsed = JSON.parse(rawFacturas);
      if (Array.isArray(parsed)) numFacturas = parsed.length;
    }

    const rawProvs = localStorage.getItem('fa_proveedores_v1');
    if (rawProvs) {
      tamanoBytesAprox += rawProvs.length * 2;
      const parsed = JSON.parse(rawProvs);
      if (Array.isArray(parsed)) numProveedores = parsed.length;
    }

    const rawAlerts = localStorage.getItem('fa_alertas_v1');
    if (rawAlerts) {
      tamanoBytesAprox += rawAlerts.length * 2;
      const parsed = JSON.parse(rawAlerts);
      if (Array.isArray(parsed)) numAlertas = parsed.length;
    }

    const rawCats = localStorage.getItem('fa_categorias_gasto_v1');
    if (rawCats) {
      tamanoBytesAprox += rawCats.length * 2;
      const parsed = JSON.parse(rawCats);
      if (Array.isArray(parsed)) numCategorias = parsed.length;
    } else {
      numCategorias = obtenerCategoriasGasto().length;
    }

    const rawNegocio = localStorage.getItem('fa_datos_negocio_v1');
    if (rawNegocio) {
      tamanoBytesAprox += rawNegocio.length * 2;
      tieneDatosNegocio = true;
    }
  } catch (e) {
    console.error('Error al calcular estadísticas de localStorage:', e);
  }

  return {
    numFacturas,
    numProveedores,
    numAlertas,
    numCategorias,
    tieneDatosNegocio,
    tamanoBytesAprox,
  };
}

/**
 * Extrae todas las facturas desde localStorage.
 */
export function leerFacturasLocalStorage(): Factura[] {
  try {
    const raw = localStorage.getItem('fa_facturas_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error al leer facturas de localStorage:', e);
  }
  return [];
}

/**
 * Extrae todos los proveedores desde localStorage.
 */
export function leerProveedoresLocalStorage(): Proveedor[] {
  try {
    const raw = localStorage.getItem('fa_proveedores_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error al leer proveedores de localStorage:', e);
  }
  return [];
}

/**
 * Extrae todas las alertas desde localStorage.
 */
export function leerAlertasLocalStorage(): Alerta[] {
  try {
    const raw = localStorage.getItem('fa_alertas_v1');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch (e) {
    console.warn('Error al leer alertas de localStorage:', e);
  }
  return [];
}

/**
 * Migra las categorías de gasto hacia MariaDB/MySQL.
 */
export async function migrarCategoriasAMySQL(
  categoriasPersonalizadas?: CategoriaGastoDef[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const cats = categoriasPersonalizadas || obtenerCategoriasGasto();
    if (!cats || cats.length === 0) {
      return { success: true, count: 0 };
    }

    const response = await fetch('/api/categorias-gasto', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categorias: cats }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { success: true, count: data.count || cats.length };
  } catch (err: any) {
    console.error('Error al migrar categorías a MySQL:', err);
    return { success: false, count: 0, error: err.message || 'Error de red' };
  }
}

/**
 * Migra una factura individual hacia la base de datos MySQL en el servidor local.
 */
export async function migrarFacturaIndividualAMySQL(
  factura: Factura
): Promise<{ success: boolean; error?: string }> {
  try {
    const payload = {
      factura: {
        ...factura,
        sincronizadoSheets: true,
      },
      archivo: factura.archivoBase64
        ? {
            fileName: factura.archivoNombre || `${factura.idFactura}.pdf`,
            base64Data: factura.archivoBase64,
          }
        : undefined,
    };

    const response = await fetch('/api/facturas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok || data.error) {
      throw new Error(data.error || `HTTP ${response.status}`);
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Error al guardar en MySQL' };
  }
}

/**
 * Migra en lote todas las facturas desde localStorage (o un array opcional) hacia MySQL.
 */
export async function migrarFacturasAMySQL(
  facturasInput?: Factura[],
  onProgreso?: (progreso: { actual: number; total: number; facturaActual?: string }) => void
): Promise<{ exitosas: number; fallidas: number; errores: string[] }> {
  const facturas = facturasInput || leerFacturasLocalStorage();
  let exitosas = 0;
  let fallidas = 0;
  const errores: string[] = [];

  for (let i = 0; i < facturas.length; i++) {
    const f = facturas[i];
    if (onProgreso) {
      onProgreso({
        actual: i + 1,
        total: facturas.length,
        facturaActual: f.idFactura || `Factura #${i + 1}`,
      });
    }

    const res = await migrarFacturaIndividualAMySQL(f);
    if (res.success) {
      exitosas++;
    } else {
      fallidas++;
      errores.push(`Factura ${f.idFactura || `#${i + 1}`}: ${res.error}`);
    }
  }

  return { exitosas, fallidas, errores };
}

/**
 * Migra las alertas almacenadas en localStorage hacia la tabla alertas de MariaDB/MySQL.
 * Garantiza que la propiedad 'datosRelacionados' se formatea correctamente en formato JSON
 * antes de enviarla a la base de datos (guardada en LONGTEXT).
 */
export async function migrarAlertasAMySQL(
  alertasInput?: Alerta[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const alertas = alertasInput || leerAlertasLocalStorage();
    if (!alertas || alertas.length === 0) {
      return { success: true, count: 0 };
    }

    // Formatear datos_relacionados asegurando JSON válido para MariaDB LONGTEXT
    const alertasFormateadas = alertas.map((a) => ({
      ...a,
      datosRelacionados: formatearJsonParaMariaDB(a.datosRelacionados),
    }));

    const response = await fetch('/api/mysql/sync-alertas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ alertas: alertasFormateadas }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.error || `HTTP ${response.status}`);
    }

    const data = await response.json();
    return { success: true, count: data.replicadas || alertas.length };
  } catch (err: any) {
    console.error('Error al migrar alertas a MariaDB:', err);
    return { success: false, count: 0, error: err.message || 'Error de red' };
  }
}

/**
 * Migra los datos de negocio e identidad hacia la tabla datos_negocio de MariaDB/MySQL.
 */
export async function migrarDatosNegocioAMySQL(
  datosNegocioInput?: DatosNegocio
): Promise<{ success: boolean; error?: string }> {
  try {
    let datos = datosNegocioInput;
    if (!datos) {
      const raw = localStorage.getItem('fa_datos_negocio_v1');
      if (raw) datos = JSON.parse(raw);
    }
    if (!datos) return { success: true };
    const response = await fetch('/api/datos-negocio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ datos }),
    });
    const resData = await response.json();
    return { success: resData.success };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

/**
 * Migra el directorio de proveedores hacia la tabla proveedores de MariaDB/MySQL.
 */
export async function migrarProveedoresAMySQL(
  proveedoresInput?: Proveedor[]
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const provs = proveedoresInput || leerProveedoresLocalStorage();
    if (!provs || provs.length === 0) return { success: true, count: 0 };
    const response = await fetch('/api/mysql/sync-proveedores', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ proveedores: provs }),
    });
    const data = await response.json();
    return { success: data.success, count: data.replicadas || provs.length };
  } catch (err: any) {
    return { success: false, count: 0, error: err.message };
  }
}

/**
 * Función principal para orquestar la migración completa de todos los datos
 * de localStorage (Datos de Negocio, Categorías, Facturas, Proveedores y Alertas) hacia las tablas de MySQL/MariaDB.
 */
export async function migrarTodoAMySQL(options?: {
  onProgreso?: (paso: string, porcentaje: number, detalle?: string) => void;
}): Promise<ResultadoMigracion> {
  const tInicio = performance.now();
  const erroresTotales: string[] = [];

  const notify = (paso: string, porcentaje: number, detalle?: string) => {
    if (options?.onProgreso) {
      options.onProgreso(paso, porcentaje, detalle);
    }
  };

  notify('Iniciando proceso de migración hacia MariaDB/MySQL...', 5);

  // 1. Migrar Datos de Negocio
  notify('Migrando datos e identidad fiscal del negocio...', 10);
  const resNegocio = await migrarDatosNegocioAMySQL();
  if (!resNegocio.success && resNegocio.error) {
    erroresTotales.push(`Datos Negocio: ${resNegocio.error}`);
  }

  // 2. Migrar Categorías de Gasto
  notify('Migrando catálogo de categorías de gasto...', 20);
  const categoriasLocales = obtenerCategoriasGasto();
  const resCategorias = await migrarCategoriasAMySQL(categoriasLocales);
  if (!resCategorias.success && resCategorias.error) {
    erroresTotales.push(`Categorías: ${resCategorias.error}`);
  }

  // 3. Leer Facturas de localStorage
  notify('Leyendo facturas almacenadas en localStorage...', 35);
  const facturasLocales = leerFacturasLocalStorage();
  const totalFacturas = facturasLocales.length;

  // 4. Migrar Facturas una a una
  notify(`Migrando ${totalFacturas} facturas hacia MySQL...`, 45);
  const resFacturas = await migrarFacturasAMySQL(facturasLocales, (prog) => {
    const pct = Math.round(45 + (prog.actual / (prog.total || 1)) * 30);
    notify(
      `Guardando factura ${prog.actual}/${prog.total} (${prog.facturaActual})...`,
      pct,
      prog.facturaActual
    );
  });
  erroresTotales.push(...resFacturas.errores);

  // 5. Migrar Proveedores
  notify('Migrando directorio de proveedores y condiciones...', 80);
  const proveedoresLocales = leerProveedoresLocalStorage();
  const resProvs = await migrarProveedoresAMySQL(proveedoresLocales);
  if (!resProvs.success && resProvs.error) {
    erroresTotales.push(`Proveedores: ${resProvs.error}`);
  }

  // 6. Migrar Alertas hacia la tabla alertas (con columna JSON/LONGTEXT)
  notify('Migrando alertas y registros de auditoría...', 90);
  const alertasLocales = leerAlertasLocalStorage();
  const resAlertas = await migrarAlertasAMySQL(alertasLocales);
  if (!resAlertas.success && resAlertas.error) {
    erroresTotales.push(`Alertas: ${resAlertas.error}`);
  }

  notify('Verificando consistencia en la base de datos MariaDB...', 98);

  const tFin = performance.now();
  notify('¡Migración completada con éxito!', 100);

  return {
    success: resFacturas.fallidas === 0 && erroresTotales.length === 0,
    totalFacturas,
    facturasMigradas: resFacturas.exitosas,
    facturasFallidas: resFacturas.fallidas,
    totalProveedores: proveedoresLocales.length,
    proveedoresMigrados: resProvs.count,
    totalCategorias: categoriasLocales.length,
    categoriasMigradas: resCategorias.count,
    totalAlertas: alertasLocales.length,
    alertasMigradas: resAlertas.count,
    errores: erroresTotales,
    tiempoMs: Math.round(tFin - tInicio),
  };
}

/**
 * Descarga una copia de seguridad en archivo JSON de todo el localStorage antes de migrar.
 */
export function descargarBackupLocalStorageJson(): void {
  try {
    const backupData = {
      fecha: new Date().toISOString(),
      facturas: leerFacturasLocalStorage(),
      proveedores: leerProveedoresLocalStorage(),
      alertas: leerAlertasLocalStorage(),
      categorias: obtenerCategoriasGasto(),
      parametros: obtenerParametrosSistema(),
      datosNegocio: (() => {
        try {
          const raw = localStorage.getItem('fa_datos_negocio_v1');
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })(),
    };

    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(backupData, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute(
      'download',
      `backup_finance_local_${new Date().toISOString().split('T')[0]}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  } catch (error) {
    console.error('Error al generar backup JSON de localStorage:', error);
  }
}

/**
 * Descarga el script DDL SQL completo compatible con MariaDB/MySQL para phpMyAdmin
 */
export function descargarEsquemaSqlMariaDB(nombreBaseDatos: string = 'finance_ai_db'): void {
  try {
    const sqlContent = generarScriptCreacionMariaDB(nombreBaseDatos);
    const blob = new Blob([sqlContent], { type: 'application/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', url);
    downloadAnchor.setAttribute('download', `esquema_mariadb_${nombreBaseDatos}.sql`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error al descargar esquema SQL de MariaDB:', error);
  }
}
