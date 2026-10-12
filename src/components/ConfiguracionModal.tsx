import React, { useState, useEffect } from 'react';
import {
  X,
  Settings,
  Cloud,
  Key,
  Copy,
  Check,
  FileSpreadsheet,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Code,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Sun,
  Moon,
  Palette,
  Building2,
  Sliders,
  Clock,
  TrendingUp,
  Percent,
  ShieldAlert,
  RotateCcw,
  Calendar,
  Layers,
  Save,
  Info,
  CalendarDays,
  Tag,
  Plus,
  Sparkles,
  Database,
  Download,
  HardDrive,
} from 'lucide-react';
import {
  GoogleSheetsConfig,
  DatosNegocio,
  DEFAULT_DATOS_NEGOCIO,
  ParametrosSistema,
  DEFAULT_PARAMETROS_SISTEMA,
  CategoriaGastoDef,
  TIPOS_IMPOSITIVOS_PREDETERMINADOS,
} from '../types';
import { ThemeMode } from '../utils/theme';
import {
  obtenerParametrosSistema,
  guardarParametrosSistema,
  restablecerParametrosSistema,
} from '../utils/parametrosSistema';
import { obtenerCategoriasGasto } from '../utils/categoriasGasto';
import { CategoriasGastoModal } from './CategoriasGastoModal';
import { ConfiguracionFiscalTab } from './ConfiguracionFiscalTab';
import { generarScriptSqlCompleto } from '../utils/sqlGenerator';

interface ConfiguracionModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: GoogleSheetsConfig;
  onSaveConfig: (nuevaConfig: GoogleSheetsConfig) => void;
  onResetData: () => void;
  onSyncFacturas?: () => Promise<{ success: boolean; count: number; message?: string }>;
  theme?: ThemeMode;
  onSetTheme?: (theme: ThemeMode) => void;
  datosNegocio?: DatosNegocio;
  onSaveDatosNegocio?: (datos: DatosNegocio) => void;
  initialTab?: 'negocio' | 'categorias' | 'fiscalidad' | 'parametros' | 'sheets' | 'mysql' | 'gemini' | 'script' | 'apariencia';
}

export const ConfiguracionModal: React.FC<ConfiguracionModalProps> = ({
  isOpen,
  onClose,
  config,
  onSaveConfig,
  onResetData,
  onSyncFacturas,
  theme = 'dark',
  onSetTheme,
  datosNegocio,
  onSaveDatosNegocio,
  initialTab = 'negocio',
}) => {
  const [sheetId, setSheetId] = useState(config.sheetId || '');
  const [endpointUrl, setEndpointUrl] = useState(config.endpointUrl || '');
  const [driveFolderId, setDriveFolderId] = useState(config.driveFolderId || '');
  const [negocio, setNegocio] = useState<DatosNegocio>(() => {
    if (datosNegocio && datosNegocio.nombre) {
      return {
        ...DEFAULT_DATOS_NEGOCIO,
        ...datosNegocio,
        sector: datosNegocio.sector || DEFAULT_DATOS_NEGOCIO.sector,
        contextoOperativo: datosNegocio.contextoOperativo || DEFAULT_DATOS_NEGOCIO.contextoOperativo,
      };
    }
    return DEFAULT_DATOS_NEGOCIO;
  });

  useEffect(() => {
    if (datosNegocio && datosNegocio.nombre) {
      setNegocio({
        ...DEFAULT_DATOS_NEGOCIO,
        ...datosNegocio,
        sector: datosNegocio.sector || DEFAULT_DATOS_NEGOCIO.sector,
        contextoOperativo: datosNegocio.contextoOperativo || DEFAULT_DATOS_NEGOCIO.contextoOperativo,
      });
    }
  }, [datosNegocio]);
  const [copiado, setCopiado] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [guardadoExitosoNegocio, setGuardadoExitosoNegocio] = useState(false);
  const [verificando, setVerificando] = useState(false);
  const [sincronizando, setSincronizando] = useState(false);
  const [resultadoSincronizacion, setResultadoSincronizacion] = useState<{
    success: boolean;
    count: number;
    mensaje: string;
  } | null>(null);
  const [resultadoVerificacion, setResultadoVerificacion] = useState<{
    accessible: boolean;
    mensaje: string;
    code?: string;
  } | null>(null);
  const [parametros, setParametros] = useState<ParametrosSistema>(() => obtenerParametrosSistema());
  const [guardadoExitosoParametros, setGuardadoExitosoParametros] = useState(false);
  const [categoriasGastoLista, setCategoriasGastoLista] = useState<CategoriaGastoDef[]>(() =>
    obtenerCategoriasGasto()
  );
  const [isCategoriasModalOpen, setIsCategoriasModalOpen] = useState(false);
  const [tabActiva, setTabActiva] = useState<
    'negocio' | 'categorias' | 'fiscalidad' | 'parametros' | 'sheets' | 'mysql' | 'gemini' | 'script' | 'apariencia'
  >(initialTab || 'negocio');

  // Estado y configuración de Base de Datos MySQL / MariaDB
  const [mysqlConfig, setMysqlConfig] = useState({
    host: '127.0.0.1',
    port: 3306,
    user: 'root',
    password: '',
    database: 'finance_ai_db',
  });
  const [mysqlStatus, setMysqlStatus] = useState<{
    connected: boolean;
    message: string;
    host?: string;
    port?: number;
    database?: string;
    user?: string;
    facturasCount?: number;
    proveedoresCount?: number;
    latencyMs?: number;
  } | null>(null);
  const [probandoMysql, setProbandoMysql] = useState(false);
  const [guardadoExitosoMysql, setGuardadoExitosoMysql] = useState(false);
  const [replicandoMysql, setReplicandoMysql] = useState(false);
  const [resultadoReplicacionMysql, setResultadoReplicacionMysql] = useState<{
    success: boolean;
    mensaje: string;
  } | null>(null);
  const [descargandoSql, setDescargandoSql] = useState(false);

  const cargarEstadoMysql = async () => {
    try {
      const res = await fetch('/api/mysql/status', {
        headers: {
          'x-target-path': '/api/mysql/status',
        },
      });
      if (res.ok) {
        const data = await res.json();
        setMysqlStatus(data);
        if (data.host) {
          setMysqlConfig((prev) => ({
            ...prev,
            host: data.host || prev.host,
            port: data.port || prev.port,
            database: data.database || prev.database,
            user: data.user || prev.user,
          }));
        }
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      cargarEstadoMysql();
    }
  }, [isOpen]);

  const handleProbarGuardarMysql = async () => {
    setProbandoMysql(true);
    setResultadoReplicacionMysql(null);

    const isCloudHost = typeof window !== 'undefined' && 
      window.location.hostname !== 'localhost' && 
      window.location.hostname !== '127.0.0.1';
    const isLocalhostDb = mysqlConfig.host.trim() === '127.0.0.1' || mysqlConfig.host.trim().toLowerCase() === 'localhost';

    if (isCloudHost && isLocalhostDb) {
      setResultadoReplicacionMysql({
        success: false,
        mensaje: `⚠️ Estás accediendo a la aplicación desplegada en la nube (${window.location.hostname}). En Vercel no es posible conectar a '127.0.0.1' ni a 'localhost' porque no hay un servicio MySQL local en el servidor de Vercel. Debes escribir la IP pública o dominio de tu servidor MySQL/MariaDB (ej: db.tudominio.com o la IP de tu VPS/Hosting) y habilitar conexiones remotas en el puerto 3306.`,
      });
      setProbandoMysql(false);
      return;
    }

    try {
      const res = await fetch('/api/mysql/config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-target-path': '/api/mysql/config',
        },
        body: JSON.stringify(mysqlConfig),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        if (res.status === 404 || text.includes('The page could not be found') || text.includes('404')) {
          throw new Error(
            'El endpoint /api/mysql/config devolvió 404 Not Found. Asegúrate de incluir el archivo vercel.json y la función /api/index.ts en tu repositorio de Vercel.'
          );
        }
        if (text.includes('FUNCTION_INVOCATION_FAILED')) {
          throw new Error(
            'Fallo de invocación en Vercel Serverless Function (HTTP 500). El host MySQL no respondió a tiempo (>6s) o no permite conexiones externas al puerto 3306. Si usas cPanel, Plesk o VPS, revisa "MySQL Remoto" y añade "%" o autoriza la conexión externa.'
          );
        }
        throw new Error(`Respuesta no válida del servidor (HTTP ${res.status}): ${text.slice(0, 120)}`);
      }

      setMysqlStatus(data);
      if (data.connected) {
        setGuardadoExitosoMysql(true);
        setTimeout(() => setGuardadoExitosoMysql(false), 2500);
        setResultadoReplicacionMysql({
          success: true,
          mensaje: `¡Conexión verificada con éxito a MySQL en ${data.host}:${data.port}! Base de datos y tablas comprobadas.`,
        });
      } else {
        setResultadoReplicacionMysql({
          success: false,
          mensaje: data.message || `No se pudo conectar a ${mysqlConfig.host}:${mysqlConfig.port}`,
        });
      }
    } catch (e: any) {
      setResultadoReplicacionMysql({
        success: false,
        mensaje: `Error al probar conexión: ${e?.message || e}`,
      });
    } finally {
      setProbandoMysql(false);
    }
  };

  const handleReplicarTodoMysql = async () => {
    setReplicandoMysql(true);
    setResultadoReplicacionMysql(null);
    try {
      // En arquitectura DB-First se envía el catálogo y configuración actual directamente a MySQL
      const res = await fetch('/api/mysql/sync-all', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-target-path': '/api/mysql/sync-all',
        },
        body: JSON.stringify({
          facturas: [],
          proveedores: [],
          alertas: [],
          categorias: categoriasGastoLista || obtenerCategoriasGasto(),
          datosNegocio: negocio,
          parametrosSistema: parametros,
          analisis: null,
          configuracionGoogle: {
            endpointUrl: endpointUrl.trim(),
            driveFolderId: driveFolderId.trim(),
          },
        }),
      });

      const contentType = res.headers.get('content-type') || '';
      let data: any;

      if (contentType.includes('application/json')) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          res.status === 404
            ? 'Endpoint /api/mysql/sync-all no encontrado (404). Comprueba la configuración de Serverless Functions en Vercel.'
            : `Error HTTP ${res.status}: ${text.slice(0, 100)}`
        );
      }

      setResultadoReplicacionMysql({
        success: data.success,
        mensaje: data.mensaje || (data.success ? `Replicación completa hacia MySQL finalizada.` : data.razonFallo || 'Error al replicar'),
      });
      cargarEstadoMysql();
    } catch (e: any) {
      setResultadoReplicacionMysql({
        success: false,
        mensaje: `Error al replicar: ${e?.message || e}`,
      });
    } finally {
      setReplicandoMysql(false);
    }
  };

  const handleDescargarSql = async () => {
    setDescargandoSql(true);
    try {
      let sqlText = '';
      // 1. Intentar descargar mediante POST autenticado vía fetch
      try {
        const res = await fetch('/api/mysql/export-sql', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-target-path': '/api/mysql/export-sql',
          },
          body: JSON.stringify({
            datosNegocio: negocio,
            parametros: parametros,
            categorias: categoriasGastoLista,
          }),
        });
        if (res.ok) {
          const text = await res.text();
          // Verificar que no sea un HTML de redirección de proxy ni Cookie Check
          if (text && !text.includes('<!doctype html>') && !text.includes('<html') && text.includes('CREATE TABLE')) {
            sqlText = text;
          }
        }
      } catch (e) {
        console.warn('Aviso al solicitar exportación SQL al servidor:', e);
      }

      // 2. Si el backend fue interceptado por el proxy o devolvió HTML, generar el script SQL directamente en el cliente
      if (!sqlText || sqlText.length < 50) {
        sqlText = generarScriptSqlCompleto({
          datosNegocio: negocio,
          parametros: parametros,
          categorias: categoriasGastoLista,
        });
      }

      // 3. Crear Blob y forzar la descarga de un archivo .sql puro sin redirecciones
      const blob = new Blob([sqlText], { type: 'application/sql;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `facturas_finance_ai_${new Date().toISOString().slice(0, 10)}.sql`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    } catch (err) {
      console.error('Error al generar o descargar script SQL:', err);
    } finally {
      setDescargandoSql(false);
    }
  };

  useEffect(() => {
    if (initialTab) {
      setTabActiva(initialTab);
    }
  }, [initialTab, isOpen]);

  useEffect(() => {
    const handleCatUpdated = (e: any) => {
      setCategoriasGastoLista(e?.detail || obtenerCategoriasGasto());
    };
    window.addEventListener('categoriasGastoActualizadas', handleCatUpdated);
    return () => window.removeEventListener('categoriasGastoActualizadas', handleCatUpdated);
  }, []);

  if (!isOpen) return null;

  const handleVerificarConexion = async () => {
    setVerificando(true);
    setResultadoVerificacion(null);
    try {
      const queryParams = new URLSearchParams({
        endpointUrl: endpointUrl.trim(),
        sheetId: sheetId.trim(),
        driveFolderId: driveFolderId.trim(),
      });
      const res = await fetch(`/api/sheets/verify?${queryParams.toString()}`, {
        signal: AbortSignal.timeout(25000),
      });
      const data = await res.json();
      setResultadoVerificacion(data);
    } catch (e: any) {
      setResultadoVerificacion({
        accessible: false,
        code: 'ERROR',
        mensaje: e?.name === 'TimeoutError'
          ? 'Tiempo de espera agotado al verificar conexión (timeout 25s). Asegúrate de que la Web App en Apps Script tenga el acceso público configurado en "Cualquier usuario".'
          : (e?.message || 'Error de red al comprobar acceso con el servidor.'),
      });
    } finally {
      setVerificando(false);
    }
  };

  const handleSincronizarHoja = async () => {
    setSincronizando(true);
    setResultadoSincronizacion(null);
    try {
      if (onSyncFacturas) {
        const res = await onSyncFacturas();
        setResultadoSincronizacion({
          success: res.success,
          count: res.count,
          mensaje: res.message || `Sincronización completada. ${res.count} facturas reales cargadas y replicadas en MySQL.`,
        });
        cargarEstadoMysql();
      } else {
        const res = await fetch('/api/sheets/fetch-invoices', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: AbortSignal.timeout(25000),
          body: JSON.stringify({ sheetId, endpointUrl }),
        });
        const data = await res.json();
        cargarEstadoMysql();

        let detalleMysql = '';
        if (data.replicadasMySQL > 0) {
          detalleMysql = ` y ${data.replicadasMySQL} replicadas con éxito en MySQL.`;
        } else if (data.mysqlRazonFallo) {
          detalleMysql = `. Aviso MySQL: ${data.mysqlRazonFallo}. Puedes revisar la pestaña "Base de Datos MySQL" para configurar el host o exportar SQL.`;
        }

        setResultadoSincronizacion({
          success: data.success,
          count: data.count || 0,
          mensaje: data.count > 0
            ? `Se han cargado ${data.count} facturas reales desde Google Sheets${detalleMysql}`
            : (data.error || 'Conexión activa pero la hoja "Facturas" aún no contiene filas de datos.'),
        });
      }
    } catch (e: any) {
      setResultadoSincronizacion({
        success: false,
        count: 0,
        mensaje: e?.name === 'TimeoutError'
          ? 'Tiempo de espera agotado al conectar con Google Sheets (timeout 25s).'
          : (e?.message || 'Error al conectar con la hoja de Google Sheets.'),
      });
    } finally {
      setSincronizando(false);
    }
  };

  const handleSave = () => {
    setGuardando(true);
    
    // Guardar parámetros del sistema en la base de datos MySQL (DB-First)
    guardarParametrosSistema(parametros);

    // Guardar datos del negocio directamente en MySQL
    if (onSaveDatosNegocio) {
      onSaveDatosNegocio(negocio);
    }

    onSaveConfig({
      sheetId: sheetId.trim(),
      endpointUrl: endpointUrl.trim(),
      driveFolderId: driveFolderId.trim(),
      status: endpointUrl.trim() ? 'sincronizado' : 'pendiente',
      lastSync: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      sheetUrl: '',
      autoSync: false,
    });
    setTimeout(() => {
      setGuardando(false);
      onClose();
    }, 400);
  };

  const handleGuardarParametrosDirecto = () => {
    guardarParametrosSistema(parametros);
    setGuardadoExitosoParametros(true);
    setTimeout(() => setGuardadoExitosoParametros(false), 2500);
  };

  const handleRestablecerParametros = () => {
    const defaults = restablecerParametrosSistema();
    setParametros(defaults);
    setGuardadoExitosoParametros(true);
    setTimeout(() => setGuardadoExitosoParametros(false), 2500);
  };

  const handleGuardarNegocioDirecto = () => {
    if (onSaveDatosNegocio) {
      onSaveDatosNegocio(negocio);
    }
    setGuardadoExitosoNegocio(true);
    setTimeout(() => setGuardadoExitosoNegocio(false), 2500);
  };

  const nombreEmpresaSeguro = (negocio.nombre || 'Mi Negocio').replace(/["\\]/g, '').trim();
  const nombreCarpetaDrive = `Facturas ${nombreEmpresaSeguro}`;

  const appsScriptCode = `/**
 * FINANCE AI — Google Apps Script Web App
 * Almacenamiento y organización automática de justificantes y recibos en Google Drive
 * para "${nombreEmpresaSeguro}"
 * 
 * ARQUITECTURA DB-FIRST (Single Source of Truth):
 * - Base de Datos MySQL: Única fuente de verdad para todas las facturas, proveedores e impuestos.
 * - Google Drive: Servicio en la nube para archivar digitalmente recibos, tickets y PDFs originales.
 */

/**
 * ⚡ PASO 1 (Ejecutar una sola vez desde el editor de Apps Script):
 * Selecciona "autorizarPermisosDrive" en la barra superior y pulsa el botón "Ejecutar" (▶).
 * Google te solicitará autorizar permisos para acceder a Google Drive.
 * (Haz clic en "Revisar permisos" > Elige tu cuenta > "Avanzado" > "Ir a proyecto (no seguro)" > "Permitir").
 */
function autorizarPermisosDrive() {
  try {
    var rootFolders = DriveApp.getFoldersByName("${nombreCarpetaDrive}");
    var folder = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("${nombreCarpetaDrive}");
    Logger.log("✅ Permisos de Google Drive autorizados con éxito.");
    Logger.log("Carpeta principal disponible: " + folder.getName() + " (ID: " + folder.getId() + ")");
    return "OK: Permisos concedidos. Carpeta: " + folder.getName();
  } catch (err) {
    Logger.log("❌ Error en autorización de Drive: " + err);
    throw err;
  }
}

function doGet(e) {
  var action = (e && e.parameter && e.parameter.action) || "ping";
  if (action === "deleteInvoice" || action === "deleteFile") {
    return handleDeleteInvoice({
      idFactura: (e && e.parameter && e.parameter.idFactura) || "",
      fileUrl: (e && e.parameter && e.parameter.fileUrl) || "",
      driveFolderId: (e && e.parameter && e.parameter.driveFolderId) || "",
      nombreProveedor: (e && e.parameter && e.parameter.nombreProveedor) || ""
    });
  }
  return ContentService.createTextOutput(JSON.stringify({
    status: "success",
    service: "Finance AI Google Drive Receipt Webhook",
    message: "Google Apps Script activo y listo para archivar justificantes en Google Drive"
  })).setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);

    // 1. Ping de verificación y estado de Google Drive
    if (data.action === "ping") {
      var driveMsg = "Google Drive listo";
      var driveAuthorized = false;
      try {
        if (data.driveFolderId && data.driveFolderId.trim() !== "") {
          var fId = extractDriveFolderId(data.driveFolderId);
          var tf = DriveApp.getFolderById(fId);
          driveMsg = "Carpeta configurada de Drive: " + tf.getName();
          driveAuthorized = true;
        } else {
          var rootFolders = DriveApp.getFoldersByName("${nombreCarpetaDrive}");
          var f = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("${nombreCarpetaDrive}");
          driveMsg = "Carpeta '${nombreCarpetaDrive}' verificada en tu Google Drive";
          driveAuthorized = true;
        }
      } catch(fErr) {
        driveMsg = "Aviso Google Drive (requiere autorización en el editor): " + fErr.toString();
        driveAuthorized = false;
      }
      return ContentService.createTextOutput(JSON.stringify({
        status: "success",
        message: "Conexión activa con Google Drive (Almacenamiento de Recibos)",
        driveStatus: driveMsg,
        driveAuthorized: driveAuthorized
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Archivar recibo/factura en Google Drive (en subcarpeta por proveedor)
    if (data.action === "saveToDrive" || data.action === "appendInvoice") {
      var driveResult = guardarFacturaEnDrive({
        driveFolderId: data.driveFolderId,
        nombreProveedor: data.nombreProveedor || (data.row ? data.row[3] : "Proveedores Varios"),
        idFactura: data.idFactura || (data.row ? data.row[0] : "FAC"),
        fechaEmision: data.fechaEmision || (data.row ? data.row[1] : ""),
        archivo: data.archivo
      });

      return ContentService.createTextOutput(JSON.stringify({
        status: (driveResult && driveResult.success) ? "success" : "error",
        message: (driveResult && driveResult.success)
          ? "Recibo archivado correctamente en Google Drive"
          : "Aviso al archivar en Google Drive: " + ((driveResult && driveResult.error) || "Sin archivo"),
        drive: driveResult
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Eliminar archivo de factura de Google Drive
    if (data.action === "deleteInvoice" || data.action === "deleteFile") {
      return handleDeleteInvoice(data);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: "ignored", action: data.action }))
      .setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({ status: "error", error: err.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * LÓGICA DE ALMACENAMIENTO EN GOOGLE DRIVE:
 * 1.- Toma el nombre del proveedor de la factura
 * 2.- Si no existe una carpeta con el nombre del proveedor debe crearla.
 * 3.- Si existe una carpeta con el nombre del proveedor debe guardar la factura en esa carpeta
 *     con el nombre del ID factura y Fecha de factura por ejemplo FAC-2026-001 2026-01-14
 */
function guardarFacturaEnDrive(params) {
  try {
    if (!params || !params.archivo || !params.archivo.base64) {
      return {
        success: false,
        error: "No se proporcionó contenido del archivo (base64 vacío)"
      };
    }

    var rawFolderId = params.driveFolderId;
    var carpetaPadre = null;

    // Obtener la carpeta concreta destino en Google Drive si fue indicada
    if (rawFolderId && rawFolderId.trim() !== "") {
      var folderId = extractDriveFolderId(rawFolderId);
      try {
        carpetaPadre = DriveApp.getFolderById(folderId);
      } catch (err) {
        Logger.log("Aviso: no se pudo abrir la carpeta por ID: " + err);
      }
    }

    // Si no se proporcionó o no se encontró, buscar o crear la carpeta "${nombreCarpetaDrive}"
    if (!carpetaPadre) {
      var rootFolders = DriveApp.getFoldersByName("${nombreCarpetaDrive}");
      carpetaPadre = rootFolders.hasNext() ? rootFolders.next() : DriveApp.createFolder("${nombreCarpetaDrive}");
    }

    // 1.- Tomar el nombre del proveedor de la factura
    var nombreProveedor = (params.nombreProveedor || "Proveedores Varios").toString().trim();
    if (!nombreProveedor) nombreProveedor = "Proveedores Varios";

    // 2.- Si no existe una carpeta con el nombre del proveedor debe crearla; si existe la utiliza
    var subCarpetas = carpetaPadre.getFoldersByName(nombreProveedor);
    var carpetaProveedor;
    var esNuevaCarpeta = false;

    if (subCarpetas.hasNext()) {
      carpetaProveedor = subCarpetas.next();
    } else {
      carpetaProveedor = carpetaPadre.createFolder(nombreProveedor);
      esNuevaCarpeta = true;
    }

    // Obtener extensión del archivo (.pdf, .png, etc.)
    var originalName = (params.archivo && params.archivo.nombre) || "factura.pdf";
    var extension = ".pdf";
    var dotIdx = originalName.lastIndexOf(".");
    if (dotIdx !== -1) {
      extension = originalName.substring(dotIdx);
    }

    // 3.- Guardar con el nombre del ID factura y Fecha de factura (ej: FAC-2026-001 2026-01-14.pdf)
    var idFactura = (params.idFactura || "FAC").toString().trim();
    var fechaEmision = (params.fechaEmision || Utilities.formatDate(new Date(), "GMT+1", "yyyy-MM-dd")).toString().trim();
    var nuevoNombreArchivo = idFactura + " " + fechaEmision + extension;

    // Decodificar Base64 y crear el archivo en la carpeta del proveedor
    var base64Limpio = String(params.archivo.base64 || "");
    var commaIdx = base64Limpio.indexOf(",");
    if (commaIdx !== -1) {
      base64Limpio = base64Limpio.substring(commaIdx + 1);
    }
    base64Limpio = base64Limpio.replace(/\s+/g, "");
    var mimeType = params.archivo.mimeType || "application/pdf";
    var bytes = Utilities.base64Decode(base64Limpio);
    var blob = Utilities.newBlob(bytes, mimeType, nuevoNombreArchivo);

    var archivoDrive = carpetaProveedor.createFile(blob);
    try {
      archivoDrive.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (eShare) {
      Logger.log("Aviso al establecer permisos públicos: " + eShare);
    }

    return {
      success: true,
      fileId: archivoDrive.getId(),
      fileName: nuevoNombreArchivo,
      fileUrl: archivoDrive.getUrl(),
      carpetaProveedor: nombreProveedor,
      carpetaProveedorId: carpetaProveedor.getId(),
      carpetaProveedorUrl: carpetaProveedor.getUrl(),
      carpetaPadreNombre: carpetaPadre.getName(),
      carpetaNuevaCreada: esNuevaCarpeta
    };
  } catch (err) {
    Logger.log("Error al guardar en Drive: " + err);
    return {
      success: false,
      error: err.toString()
    };
  }
}

function handleDeleteInvoice(data) {
  try {
    var idToDelete = String(data.idFactura || "").trim();
    var fileUrlFound = String(data.fileUrl || "").trim();

    var driveResult = eliminarFacturaDeDrive(idToDelete, fileUrlFound, data.driveFolderId, data.nombreProveedor);
    var deletedDrive = false;
    var deletedFolder = false;
    if (typeof driveResult === "object" && driveResult !== null) {
      deletedDrive = Boolean(driveResult.fileDeleted);
      deletedFolder = Boolean(driveResult.folderDeleted);
    } else {
      deletedDrive = Boolean(driveResult);
    }

    return ContentService.createTextOutput(JSON.stringify({
      status: "success",
      deleted: deletedDrive,
      deletedDrive: deletedDrive,
      deletedFolder: deletedFolder,
      idFactura: idToDelete
    })).setMimeType(ContentService.MimeType.JSON);
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({
      status: "error",
      deleted: false,
      deletedDrive: false,
      deletedFolder: false,
      error: err.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

/**
 * Elimina o envía a la papelera el archivo de la factura en Google Drive.
 * Si la factura eliminada era la última de su carpeta y queda vacía, elimina también la carpeta.
 */
function eliminarFacturaDeDrive(idFactura, fileUrl, rawFolderId, nombreProveedor) {
  var deleted = false;
  var folderDeleted = false;
  var foldersToCheck = [];

  try {
    // Proteger carpetas raíz principales para nunca borrarlas
    var protectedFolderIds = {};
    try {
      var rootFolder = DriveApp.getRootFolder();
      if (rootFolder) protectedFolderIds[rootFolder.getId()] = true;
    } catch (e) {}

    if (rawFolderId && String(rawFolderId).trim() !== "") {
      try {
        var configuredId = extractDriveFolderId(rawFolderId);
        if (configuredId) protectedFolderIds[configuredId] = true;
      } catch (e) {}
    }

    try {
      var customRoots = DriveApp.getFoldersByName("${nombreCarpetaDrive}");
      while (customRoots.hasNext()) {
        protectedFolderIds[customRoots.next().getId()] = true;
      }
      var legacyRoots = DriveApp.getFoldersByName("Facturas Dulce Capricho");
      while (legacyRoots.hasNext()) {
        protectedFolderIds[legacyRoots.next().getId()] = true;
      }
    } catch (e) {}

    function registrarPadres(file) {
      if (!file) return;
      try {
        var parents = file.getParents();
        while (parents.hasNext()) {
          var p = parents.next();
          if (p && !protectedFolderIds[p.getId()]) {
            foldersToCheck.push(p);
          }
        }
      } catch (e) {}
    }

    // 1. Borrado directo por URL o ID de archivo
    if (fileUrl && fileUrl.indexOf("drive.google.com") !== -1) {
      var fileId = "";
      if (fileUrl.indexOf("/d/") !== -1) {
        var dParts = fileUrl.split("/d/")[1];
        fileId = dParts.split("/")[0].split("?")[0].trim();
      } else if (fileUrl.indexOf("id=") !== -1) {
        var idParts = fileUrl.split("id=")[1];
        fileId = idParts.split("&")[0].split("#")[0].trim();
      }
      if (fileId) {
        try {
          var targetFile = DriveApp.getFileById(fileId);
          if (targetFile) {
            registrarPadres(targetFile);
            targetFile.setTrashed(true);
            deleted = true;
            Logger.log("✅ Archivo enviado a la papelera por ID: " + fileId);
          }
        } catch (e) {
          Logger.log("Aviso al borrar por ID de archivo: " + e);
        }
      }
    }

    // 2. Búsqueda en carpetas de proveedores y en carpeta principal
    if (!deleted && idFactura) {
      var carpetas = [];
      if (rawFolderId && String(rawFolderId).trim() !== "") {
        try {
          var fId = extractDriveFolderId(rawFolderId);
          if (fId) carpetas.push(DriveApp.getFolderById(fId));
        } catch(e) {}
      }
      try {
        var rootFolders = DriveApp.getFoldersByName("${nombreCarpetaDrive}");
        while (rootFolders.hasNext()) {
          carpetas.push(rootFolders.next());
        }
        var legacyRoots2 = DriveApp.getFoldersByName("Facturas Dulce Capricho");
        while (legacyRoots2.hasNext()) {
          carpetas.push(legacyRoots2.next());
        }
      } catch(e) {}

      for (var k = 0; k < carpetas.length; k++) {
        var cPadre = carpetas[k];
        var subFolders = cPadre.getFolders();
        while (subFolders.hasNext()) {
          var subF = subFolders.next();
          var provMatch = !nombreProveedor || subF.getName().toLowerCase().indexOf(nombreProveedor.toLowerCase()) !== -1 || nombreProveedor.toLowerCase().indexOf(subF.getName().toLowerCase()) !== -1;
          if (provMatch) {
            var files = subF.getFiles();
            while (files.hasNext()) {
              var f = files.next();
              var fName = f.getName();
              if (fName.indexOf(idFactura) !== -1) {
                registrarPadres(f);
                if (!protectedFolderIds[subF.getId()]) {
                  foldersToCheck.push(subF);
                }
                f.setTrashed(true);
                deleted = true;
                Logger.log("✅ Archivo enviado a papelera en subcarpeta " + subF.getName() + ": " + fName);
              }
            }
          }
        }
        
        var rootFiles = cPadre.getFiles();
        while (rootFiles.hasNext()) {
          var rf = rootFiles.next();
          if (rf.getName().indexOf(idFactura) !== -1) {
            rf.setTrashed(true);
            deleted = true;
          }
        }
      }
    }

    // 3. Fallback con búsqueda global segura
    if (!deleted && idFactura) {
      try {
        var cleanId = idFactura.replace(/["']/g, "").trim();
        if (cleanId.length >= 2) {
          var filesSearch = DriveApp.searchFiles("title contains '" + cleanId + "' and trashed = false");
          while (filesSearch.hasNext()) {
            var sf = filesSearch.next();
            if (sf.getName().indexOf(idFactura) !== -1) {
              registrarPadres(sf);
              sf.setTrashed(true);
              deleted = true;
            }
          }
        }
      } catch (searchErr) {
        Logger.log("Aviso en búsqueda global: " + searchErr);
      }
    }

    // Si se especificó nombre de proveedor, añadir su subcarpeta para verificación de vaciado
    if (nombreProveedor) {
      try {
        var provClean = nombreProveedor.toLowerCase().trim();
        var allRoots = [];
        if (rawFolderId) {
          try {
            var cfId = extractDriveFolderId(rawFolderId);
            if (cfId) allRoots.push(DriveApp.getFolderById(cfId));
          } catch(e) {}
        }
        var dRoots = DriveApp.getFoldersByName("${nombreCarpetaDrive}");
        while (dRoots.hasNext()) allRoots.push(dRoots.next());
        var dRootsLegacy = DriveApp.getFoldersByName("Facturas Dulce Capricho");
        while (dRootsLegacy.hasNext()) allRoots.push(dRootsLegacy.next());
        
        for (var rIdx = 0; rIdx < allRoots.length; rIdx++) {
          var subs = allRoots[rIdx].getFolders();
          while (subs.hasNext()) {
            var sfb = subs.next();
            if (sfb.getName().toLowerCase().trim() === provClean || sfb.getName().toLowerCase().indexOf(provClean) !== -1) {
              if (!protectedFolderIds[sfb.getId()]) {
                foldersToCheck.push(sfb);
              }
            }
          }
        }
      } catch (e) {}
    }

    // 4. Si la carpeta del proveedor quedó vacía tras borrar la factura, eliminar la carpeta
    var processedFolderIds = {};
    for (var i = 0; i < foldersToCheck.length; i++) {
      var folder = foldersToCheck[i];
      if (!folder) continue;
      try {
        var fldId = folder.getId();
        if (processedFolderIds[fldId]) continue;
        processedFolderIds[fldId] = true;

        if (protectedFolderIds[fldId]) continue;
        if (folder.getName() === "${nombreCarpetaDrive}" || folder.getName() === "Facturas Dulce Capricho") continue;

        // Comprobar si tiene algún archivo activo
        var hasActiveFiles = false;
        var fIter = folder.getFiles();
        while (fIter.hasNext()) {
          var testF = fIter.next();
          if (!testF.isTrashed()) {
            hasActiveFiles = true;
            break;
          }
        }

        // Comprobar si tiene alguna subcarpeta activa
        var hasActiveSubs = false;
        if (!hasActiveFiles) {
          var subIter = folder.getFolders();
          while (subIter.hasNext()) {
            var testSub = subIter.next();
            if (!testSub.isTrashed()) {
              hasActiveSubs = true;
              break;
            }
          }
        }

        // Si no tiene archivos ni subcarpetas activos, está vacía: enviar a la papelera
        if (!hasActiveFiles && !hasActiveSubs) {
          Logger.log("🗑️ Carpeta vacía tras eliminar factura: " + folder.getName() + ". Eliminando carpeta de Drive...");
          folder.setTrashed(true);
          folderDeleted = true;
        }
      } catch (checkErr) {
        Logger.log("Aviso al verificar carpeta vacía: " + checkErr);
      }
    }
  } catch (err) {
    Logger.log("Error al eliminar archivo/carpeta en Drive: " + err);
  }

  return {
    fileDeleted: deleted,
    folderDeleted: folderDeleted
  };
}

function extractDriveFolderId(input) {
  if (!input) return "";
  var str = input.toString().trim();
  if (str.indexOf("folders/") !== -1) {
    var folderPart = str.split("folders/")[1];
    return folderPart.split("/")[0].split("?")[0].trim();
  }
  if (str.indexOf("id=") !== -1) {
    var idPart = str.split("id=")[1];
    return idPart.split("&")[0].split("#")[0].trim();
  }
  return str;
}
`;

  const copiarScript = () => {
    navigator.clipboard.writeText(appsScriptCode);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 sm:p-6 animate-in fade-in">
      <div className="w-full max-w-3xl lg:max-w-4xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] md:max-h-[85vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-800 bg-[#111c30] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100">
                Configuración General y Conexiones
              </h3>
              <p className="text-xs text-slate-400">
                Empresa • Parámetros • Google Drive (Recibos) • MySQL DB-First • Servidor • Apariencia
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Cerrar"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs Bar */}
        <div className="flex border-b border-slate-800 bg-[#0a0f18] text-xs font-semibold px-6 pt-2 overflow-x-auto shrink-0 gap-1">
          <button
            onClick={() => setTabActiva('negocio')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              tabActiva === 'negocio'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Datos de Empresa</span>
          </button>
          <button
            id="tab-categorias-gasto"
            onClick={() => setTabActiva('categorias')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              tabActiva === 'categorias'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            <span>Categorías de Gasto</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-rose-500/20 text-rose-300 text-[10px] font-bold">
              {categoriasGastoLista.length}
            </span>
          </button>
          <button
            id="tab-configuracion-fiscal"
            onClick={() => setTabActiva('fiscalidad')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              tabActiva === 'fiscalidad'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Percent className="w-3.5 h-3.5" />
            <span>Configuración Fiscal</span>
            <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
              {(parametros.tiposImpositivos || []).filter((t) => t.habilitado).length || 10}
            </span>
          </button>
          <button
            id="tab-parametros-sistema"
            onClick={() => setTabActiva('parametros')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              tabActiva === 'parametros'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>Parámetros del Sistema</span>
          </button>
          <button
            id="tab-drive-storage"
            onClick={() => setTabActiva('sheets')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-2 shrink-0 ${
              tabActiva === 'sheets'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardDrive className="w-3.5 h-3.5 text-sky-400" />
            <span>Google Drive (Recibos)</span>
          </button>
          <button
            id="tab-mysql-db"
            onClick={() => {
              setTabActiva('mysql');
              cargarEstadoMysql();
            }}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              tabActiva === 'mysql'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Base de Datos MySQL (DB-First)</span>
            {mysqlStatus && (
              <span
                className={`w-2 h-2 rounded-full ${
                  mysqlStatus.connected ? 'bg-emerald-400' : 'bg-rose-400'
                }`}
                title={mysqlStatus.connected ? 'MySQL Conectado' : 'MySQL Desconectado'}
              />
            )}
          </button>
          <button
            onClick={() => setTabActiva('script')}
            className={`px-4 py-3 border-b-2 transition-colors shrink-0 ${
              tabActiva === 'script'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Código Apps Script
          </button>
          <button
            onClick={() => setTabActiva('gemini')}
            className={`px-4 py-3 border-b-2 transition-colors shrink-0 ${
              tabActiva === 'gemini'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Seguridad & Servidor
          </button>
          <button
            onClick={() => setTabActiva('apariencia')}
            className={`px-4 py-3 border-b-2 transition-colors flex items-center gap-1.5 shrink-0 ${
              tabActiva === 'apariencia'
                ? 'border-rose-500 text-rose-400 font-bold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Tema & Apariencia</span>
          </button>
        </div>

        {/* Modal Content */}
        <div className="flex-1 min-h-0 p-6 overflow-y-auto space-y-5 text-xs text-slate-300">
          {tabActiva === 'negocio' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-1.5">
                <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                  <Building2 className="w-4 h-4" />
                  <span>Datos Fiscales y de Identidad del Negocio</span>
                </div>
                <p className="text-slate-400 leading-relaxed text-[11px]">
                  Configura la razón social, NIF y dirección de tu empresa. Estos datos se utilizarán dinámicamente como <strong>Cliente / Receptor</strong> en el visor de facturas, en los informes PDF y en las auditorías contables.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre / Razón Social */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Nombre Comercial o Razón Social <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={negocio.nombre}
                    onChange={(e) => setNegocio({ ...negocio, nombre: e.target.value })}
                    placeholder="Ej. Pastelería y Confitería Dulce Capricho S.L."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* NIF / CIF */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    NIF / CIF <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={negocio.nif}
                    onChange={(e) => setNegocio({ ...negocio, nif: e.target.value })}
                    placeholder="Ej. B-82910394"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs font-mono focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* Actividad / Subtítulo */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Actividad / Subtítulo
                  </label>
                  <input
                    type="text"
                    value={negocio.actividad || ''}
                    onChange={(e) => setNegocio({ ...negocio, actividad: e.target.value })}
                    placeholder="Ej. Obrador y Confitería Artesanal"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* Sector del Negocio */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                    <span>Sector o Industria del Negocio <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-amber-400 font-normal">Obligatorio para Gemini AI</span>
                  </label>
                  <input
                    type="text"
                    value={negocio.sector || ''}
                    onChange={(e) => setNegocio({ ...negocio, sector: e.target.value })}
                    placeholder="Ej. Hostelería, Panadería y Confitería Artesanal / Clínica Dental / Servicios IT"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* Contexto Operativo Específico */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300 flex items-center justify-between">
                    <span>Contexto Operativo y Modelo de Negocio <span className="text-rose-400">*</span></span>
                    <span className="text-[10px] text-amber-400 font-normal">Clave para personalizar análisis de IA</span>
                  </label>
                  <textarea
                    rows={3}
                    value={negocio.contextoOperativo || ''}
                    onChange={(e) => setNegocio({ ...negocio, contextoOperativo: e.target.value })}
                    placeholder="Describe las compras principales, insumos críticos, modelo de venta y operativa de tu empresa."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors resize-none leading-relaxed"
                  />
                  <p className="text-[10px] text-slate-400">
                    Todas las peticiones a Gemini incluirán este contexto operativo obligatoriamente para fundamentar sus diagnósticos, alertas y recomendaciones.
                  </p>
                </div>

                {/* Dirección / Sede */}
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Dirección Fiscal / Sede <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={negocio.direccion}
                    onChange={(e) => setNegocio({ ...negocio, direccion: e.target.value })}
                    placeholder="Ej. C/ Mayor 24, Obrador Central"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* Email de administración */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Email de Administración
                  </label>
                  <input
                    type="email"
                    value={negocio.email || ''}
                    onChange={(e) => setNegocio({ ...negocio, email: e.target.value })}
                    placeholder="Ej. administracion@dulcecapricho.com"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>

                {/* Teléfono */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-bold text-slate-300">
                    Teléfono
                  </label>
                  <input
                    type="text"
                    value={negocio.telefono || ''}
                    onChange={(e) => setNegocio({ ...negocio, telefono: e.target.value })}
                    placeholder="Ej. +34 912 345 678"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 transition-colors"
                  />
                </div>
              </div>

              {/* Vista Previa en Vivo de la cabecera en el Visor */}
              <div className="p-4 rounded-xl bg-slate-900/70 border border-slate-800 space-y-2.5">
                <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Vista Previa en el Visor de Facturas (Cliente / Receptor)
                </div>
                <div className="bg-slate-50 text-slate-900 rounded-lg p-3 border border-slate-200 shadow-xs">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                    Cliente / Receptor
                  </span>
                  <p className="text-xs font-bold text-slate-900 mt-0.5">
                    {negocio.nombre || '(Nombre de la empresa)'}
                  </p>
                  <p className="text-[11px] text-slate-600">
                    {negocio.nif ? `NIF: ${negocio.nif}` : 'NIF: (NIF no definido)'}
                    {negocio.direccion ? ` • ${negocio.direccion}` : ''}
                  </p>
                </div>
              </div>

              {/* Botón de guardado rápido de datos de empresa */}
              <div className="flex items-center justify-between pt-2">
                <button
                  type="button"
                  onClick={() => setNegocio(DEFAULT_DATOS_NEGOCIO)}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline transition-colors"
                >
                  Restablecer valores originales
                </button>
                <button
                  type="button"
                  onClick={handleGuardarNegocioDirecto}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-colors"
                >
                  {guardadoExitosoNegocio ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Guardado correctamente!</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Guardar Datos de Empresa</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {tabActiva === 'categorias' && (
            <div className="space-y-5" id="panel-gestion-categorias">
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <Tag className="w-4 h-4" />
                    <span>Catálogo de Categorías de Gasto Personalizadas</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Define las categorías contables de tu sector. Gemini AI las utilizará automáticamente al escanear facturas y los gráficos del Resumen Financiero se agruparán según tus preferencias.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsCategoriasModalOpen(true)}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-2 shadow-md shadow-rose-950/40 shrink-0 cursor-pointer transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  <span>Añadir o Gestionar Categorías</span>
                </button>
              </div>

              {/* Lista visual de categorías */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {categoriasGastoLista.map((cat) => (
                  <div
                    key={cat.id}
                    className="p-3.5 rounded-xl bg-[#111827] border border-slate-800 hover:border-slate-700 transition-colors flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-3 h-3 rounded-full shrink-0 shadow-sm"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-bold text-slate-100 text-xs truncate">
                          {cat.nombre}
                        </span>
                      </div>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-mono font-bold shrink-0"
                        style={{
                          backgroundColor: `${cat.color}20`,
                          color: cat.color,
                          border: `1px solid ${cat.color}40`,
                        }}
                      >
                        {cat.color}
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-400 leading-relaxed">
                      {cat.descripcion || 'Sin descripción detallada definida.'}
                    </p>
                  </div>
                ))}
              </div>

              <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 flex items-start gap-2.5 text-xs text-slate-400">
                <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <p className="leading-relaxed text-[11px]">
                  <strong>Integración directa con Inteligencia Artificial:</strong> Al crear o editar categorías, el prompt de extracción de facturas se adapta inmediatamente para clasificar tus compras en base a estas definiciones.
                </p>
              </div>
            </div>
          )}

          {tabActiva === 'fiscalidad' && (
            <div id="panel-gestion-fiscalidad">
              <ConfiguracionFiscalTab
                parametros={parametros}
                onUpdateParametros={(nuevos) => {
                  setParametros(nuevos);
                  guardarParametrosSistema(nuevos);
                }}
              />
            </div>
          )}

          {tabActiva === 'parametros' && (
            <div className="space-y-6" id="panel-gestion-parametros">
              {/* Tarjeta de Cabecera y Acciones Rápidas */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
                    <Sliders className="w-4 h-4" />
                    <span>Gestión Centralizada de Valores Predeterminados y Umbrales</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed text-[11px]">
                    Define los umbrales de alerta de precios, límites de días para facturas recurrentes y reglas analíticas.
                    Todos los valores se persisten directamente en la base de datos relacional <code className="text-emerald-300 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">MySQL</code> (tabla <code className="text-indigo-300 font-mono text-[10px] bg-slate-900 px-1 py-0.5 rounded">parametros_sistema</code>) y personalizan la aplicación en tiempo real.
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    id="btn-restablecer-parametros"
                    onClick={handleRestablecerParametros}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs flex items-center gap-1.5 transition-colors border border-slate-700/60"
                    title="Revertir todos los parámetros a sus valores predeterminados de fábrica"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Predeterminados</span>
                  </button>
                  <button
                    type="button"
                    id="btn-guardar-parametros-directo"
                    onClick={handleGuardarParametrosDirecto}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-colors"
                  >
                    {guardadoExitosoParametros ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>¡Guardado!</span>
                      </>
                    ) : (
                      <>
                        <Save className="w-3.5 h-3.5" />
                        <span>Guardar Parámetros</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Feedback de éxito */}
              {guardadoExitosoParametros && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in duration-200">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>
                    <strong>Parámetros actualizados con éxito:</strong> Las preferencias se han persistido en tu navegador y los motores de detección y cuadros de mando aplican ahora estos criterios.
                  </span>
                </div>
              )}

              {/* BLOQUE 1: Alertas y Umbrales de Precios */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs">
                    <TrendingUp className="w-4 h-4" />
                    <span className="uppercase tracking-wider">1. Detección de Anomalías e Incremento de Precios</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">alertasConfig / mockData</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Umbral de Subida Moderada (8% por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Umbral de Alerta Moderada
                      </label>
                      <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono font-bold text-xs border border-amber-500/30">
                        +{parametros.umbralSubidaModeradaPct}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Porcentaje de encarecimiento en un producto entre compras sucesivas para generar un aviso preventivo.
                    </p>
                    <input
                      type="range"
                      min={1}
                      max={30}
                      step={1}
                      value={parametros.umbralSubidaModeradaPct}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          umbralSubidaModeradaPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>Presets rápidos:</span>
                      <div className="flex gap-1.5">
                        {[5, 8, 10, 12, 15].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setParametros({ ...parametros, umbralSubidaModeradaPct: val })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              parametros.umbralSubidaModeradaPct === val
                                ? 'bg-amber-500 text-slate-950 font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {val}%{val === 8 ? ' (Defecto)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Umbral de Subida Crítica (15% por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Umbral de Alerta Crítica
                      </label>
                      <span className="px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-mono font-bold text-xs border border-rose-500/30">
                        +{parametros.umbralSubidaCriticaPct}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Subida severa que clasifica la alerta con prioridad crítica y destaca el producto para renegociación urgente.
                    </p>
                    <input
                      type="range"
                      min={5}
                      max={50}
                      step={1}
                      value={parametros.umbralSubidaCriticaPct}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          umbralSubidaCriticaPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>Presets rápidos:</span>
                      <div className="flex gap-1.5">
                        {[10, 15, 20, 25, 30].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setParametros({ ...parametros, umbralSubidaCriticaPct: val })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              parametros.umbralSubidaCriticaPct === val
                                ? 'bg-rose-500 text-white font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {val}%{val === 15 ? ' (Defecto)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Anticipación de Facturas por Vencer (3 días por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Anticipación de Vencimientos
                      </label>
                      <span className="px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-300 font-mono font-bold text-xs border border-sky-500/30">
                        {parametros.diasAnticipacionVencimiento} días antes
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Días de antelación para notificar que una factura pendiente se aproxima a su fecha de vencimiento.
                    </p>
                    <input
                      type="range"
                      min={1}
                      max={15}
                      step={1}
                      value={parametros.diasAnticipacionVencimiento}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          diasAnticipacionVencimiento: Number(e.target.value),
                        })
                      }
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>Opciones habituales:</span>
                      <div className="flex gap-1.5">
                        {[1, 3, 5, 7, 10].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setParametros({ ...parametros, diasAnticipacionVencimiento: val })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              parametros.diasAnticipacionVencimiento === val
                                ? 'bg-sky-500 text-slate-950 font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {val}d{val === 3 ? ' (Defecto)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Concentración de Gasto en un Proveedor (30% por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="check-concentracion"
                          checked={parametros.notificarConcentracionProveedor}
                          onChange={(e) =>
                            setParametros({
                              ...parametros,
                              notificarConcentracionProveedor: e.target.checked,
                            })
                          }
                          className="rounded border-slate-700 text-rose-600 focus:ring-rose-500"
                        />
                        <label
                          htmlFor="check-concentracion"
                          className="text-xs font-semibold text-slate-200 cursor-pointer"
                        >
                          Alerta de Concentración
                        </label>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-300 font-mono font-bold text-xs border border-purple-500/30">
                        {parametros.umbralConcentracionProveedorPct}% del gasto
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Avisa si una sola empresa concentra un porcentaje excesivo del presupuesto operativo.
                    </p>
                    <input
                      type="range"
                      min={10}
                      max={60}
                      step={5}
                      disabled={!parametros.notificarConcentracionProveedor}
                      value={parametros.umbralConcentracionProveedorPct}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          umbralConcentracionProveedorPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-purple-500 cursor-pointer disabled:opacity-40"
                    />
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>Presets recomendados:</span>
                      <div className="flex gap-1.5">
                        {[20, 25, 30, 40, 50].map((val) => (
                          <button
                            key={val}
                            type="button"
                            disabled={!parametros.notificarConcentracionProveedor}
                            onClick={() =>
                              setParametros({ ...parametros, umbralConcentracionProveedorPct: val })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors disabled:opacity-40 ${
                              parametros.umbralConcentracionProveedorPct === val
                                ? 'bg-purple-500 text-white font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {val}%{val === 30 ? ' (Defecto)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOQUE 2: Facturación Recurrente y Ciclos de Operación */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs">
                    <Clock className="w-4 h-4" />
                    <span className="uppercase tracking-wider">2. Facturación Recurrente y Ciclo de Vencimiento</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">Gestión Operativa</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Límite de Días para Facturas Recurrentes (30 días por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Ventana de Facturas Recurrentes
                      </label>
                      <span className="px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-mono font-bold text-xs border border-indigo-500/30">
                        {parametros.limiteDiasFacturasRecurrentes} días
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Límite o ventana temporal de días para identificar y clasificar compras periódicas habituales de un mismo proveedor o contratos de suministros continuados.
                    </p>
                    <input
                      type="range"
                      min={7}
                      max={90}
                      step={1}
                      value={parametros.limiteDiasFacturasRecurrentes}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          limiteDiasFacturasRecurrentes: Number(e.target.value),
                        })
                      }
                      className="w-full accent-indigo-500 cursor-pointer"
                    />
                    <div className="flex flex-wrap items-center justify-between pt-1 gap-2 text-[10px] text-slate-400">
                      <span>Ciclos habituales:</span>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          { dias: 7, etiqueta: 'Semanal' },
                          { dias: 15, etiqueta: 'Quincenal' },
                          { dias: 30, etiqueta: 'Mensual (Defecto)' },
                          { dias: 60, etiqueta: 'Bimestral' },
                          { dias: 90, etiqueta: 'Trimestral' },
                        ].map((item) => (
                          <button
                            key={item.dias}
                            type="button"
                            onClick={() =>
                              setParametros({
                                ...parametros,
                                limiteDiasFacturasRecurrentes: item.dias,
                              })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              parametros.limiteDiasFacturasRecurrentes === item.dias
                                ? 'bg-indigo-500 text-white font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {item.dias}d • {item.etiqueta}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Margen de Cortesía tras Vencimiento (7 días por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Margen de Cortesía tras Vencimiento
                      </label>
                      <span className="px-2 py-0.5 rounded-md bg-teal-500/20 text-teal-300 font-mono font-bold text-xs border border-teal-500/30">
                        {parametros.diasToleranciaPagoVencido} días de gracia
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Margen de tolerancia concedido tras la fecha límite de pago antes de catalogar el impago como mora en reclamación crítica.
                    </p>
                    <input
                      type="range"
                      min={0}
                      max={30}
                      step={1}
                      value={parametros.diasToleranciaPagoVencido}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          diasToleranciaPagoVencido: Number(e.target.value),
                        })
                      }
                      className="w-full accent-teal-500 cursor-pointer"
                    />
                    <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400">
                      <span>Plazos comunes:</span>
                      <div className="flex gap-1.5">
                        {[0, 3, 7, 15, 30].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() =>
                              setParametros({ ...parametros, diasToleranciaPagoVencido: val })
                            }
                            className={`px-1.5 py-0.5 rounded text-[10px] font-mono transition-colors ${
                              parametros.diasToleranciaPagoVencido === val
                                ? 'bg-teal-500 text-slate-950 font-bold'
                                : 'bg-slate-800 hover:bg-slate-700 text-slate-300'
                            }`}
                          >
                            {val}d{val === 7 ? ' (Defecto)' : ''}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* BLOQUE 3: Clasificación de Proveedores y Dependencia Operativa */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
                    <Building2 className="w-4 h-4" />
                    <span className="uppercase tracking-wider">3. Proveedores y Dependencia en Cadena de Suministro</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">sheetDataSync</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Riesgo Alto (>35% por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Dependencia: Riesgo Alto
                      </label>
                      <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-mono font-bold text-xs">
                        &gt; {parametros.umbralDependenciaAltaPct}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Cuota sobre el gasto total para catalogar al proveedor como de alto riesgo de suministro.
                    </p>
                    <input
                      type="range"
                      min={20}
                      max={60}
                      step={1}
                      value={parametros.umbralDependenciaAltaPct}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          umbralDependenciaAltaPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-rose-500 cursor-pointer"
                    />
                  </div>

                  {/* Riesgo Medio (18% - 35% por defecto) */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Dependencia: Riesgo Medio
                      </label>
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono font-bold text-xs">
                        &gt; {parametros.umbralDependenciaMediaPct}%
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Rango intermedio de cuota para catalogar dependencia moderada en compras.
                    </p>
                    <input
                      type="range"
                      min={10}
                      max={30}
                      step={1}
                      value={parametros.umbralDependenciaMediaPct}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          umbralDependenciaMediaPct: Number(e.target.value),
                        })
                      }
                      className="w-full accent-amber-500 cursor-pointer"
                    />
                  </div>

                  {/* Mínimo de Facturas para Evaluar Concentración */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-200">
                        Mínimo de Facturas
                      </label>
                      <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-200 font-mono font-bold text-xs border border-slate-700">
                        {parametros.minimoFacturasParaConcentracion} facturas
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 leading-tight">
                      Registros mínimos requeridos antes de computar métricas de concentración de gasto.
                    </p>
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={1}
                      value={parametros.minimoFacturasParaConcentracion}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          minimoFacturasParaConcentracion: Number(e.target.value),
                        })
                      }
                      className="w-full accent-slate-400 cursor-pointer"
                    />
                  </div>
                </div>
              </div>

              {/* BLOQUE 4: Preferencias de Visualización y Cuadros de Mando */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-sky-400 font-bold text-xs">
                    <Calendar className="w-4 h-4" />
                    <span className="uppercase tracking-wider">4. Preferencias de Visualización y Cuadros de Mando</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">FacturasView / ResumenView</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {/* Facturas por Página */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">
                      Facturas por Página
                    </label>
                    <select
                      value={parametros.facturasPorPagina}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          facturasPorPagina: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500"
                    >
                      <option value={10}>10 facturas (Predeterminado)</option>
                      <option value={25}>25 facturas</option>
                      <option value={50}>50 facturas</option>
                      <option value={100}>100 facturas</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Paginación en la tabla de facturas.</p>
                  </div>

                  {/* Periodo Predeterminado del Dashboard */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">
                      Periodo Inicial del Resumen
                    </label>
                    <select
                      value={parametros.periodoDashboardPredeterminado}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          periodoDashboardPredeterminado: e.target.value as any,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500"
                    >
                      <option value="7d">Últimos 7 días</option>
                      <option value="30d">Últimos 30 días</option>
                      <option value="trimestre">Trimestre en Curso</option>
                      <option value="ano">Año Completo (Predeterminado)</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Filtro cargado por defecto en KPIs.</p>
                  </div>

                  {/* Año Fiscal de Referencia */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">
                      Año Fiscal de Referencia
                    </label>
                    <select
                      value={parametros.anoFiscalReferencia}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          anoFiscalReferencia: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 font-mono"
                    >
                      <option value={2024}>2024</option>
                      <option value={2025}>2025</option>
                      <option value={2026}>2026 (Ejercicio Activo)</option>
                      <option value={2027}>2027</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Año contable para balances anuales.</p>
                  </div>

                  {/* Top Proveedores en Ranking */}
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">
                      Top Proveedores (Ranking)
                    </label>
                    <select
                      value={parametros.topProveedoresRanking}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          topProveedoresRanking: Number(e.target.value),
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500"
                    >
                      <option value={3}>Top 3</option>
                      <option value={5}>Top 5 (Predeterminado)</option>
                      <option value={10}>Top 10</option>
                    </select>
                    <p className="text-[10px] text-slate-400">Número de filas en el podio de compras.</p>
                  </div>
                </div>
              </div>

              {/* BLOQUE 5: Fiscalidad e IVA Predeterminado */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800/80 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <Percent className="w-4 h-4" />
                    <span className="uppercase tracking-wider">5. Fiscalidad e Impuestos Predeterminados</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setTabActiva('fiscalidad')}
                    className="text-[11px] text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1 hover:underline"
                  >
                    <span>Configurar Catálogo Completo (IVA/IGIC/IPSI) →</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">
                      Tipo Impositivo Predeterminado para Nuevos Registros
                    </label>
                    <select
                      value={parametros.tipoIvaPredeterminado}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          tipoIvaPredeterminado: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 font-mono"
                    >
                      {(parametros.tiposImpositivos || TIPOS_IMPOSITIVOS_PREDETERMINADOS)
                        .filter((t) => t.habilitado)
                        .map((t) => (
                          <option key={t.id} value={t.valor}>
                            {t.nombre} ({t.porcentaje}%{t.porcentajeRecargo > 0 ? ` + R.E. ${t.porcentajeRecargo}%` : ''})
                          </option>
                        ))}
                    </select>
                    <p className="text-[10px] text-slate-400">
                      Tipo impositivo aplicado automáticamente en facturas sin desglose explícito.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-slate-300">
                      Régimen Tributario Predeterminado
                    </label>
                    <select
                      value={parametros.regimenFiscalEmpresa || parametros.regimenFiscalPredeterminado || 'IVA_GENERAL'}
                      onChange={(e) => {
                        const val = e.target.value as any;
                        setParametros({
                          ...parametros,
                          regimenFiscalEmpresa: val === 'TODOS' ? 'MULTIRREGIMEN' : val,
                          regimenFiscalPredeterminado: val,
                        });
                      }}
                      className="w-full px-3 py-2 rounded-xl bg-[#0a0f18] border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 font-mono"
                    >
                      <option value="IVA_GENERAL">Régimen General Peninsular (IVA 21%, 10%, 4%)</option>
                      <option value="IGIC_CANARIAS">Régimen Autonómico Canario (IGIC 7%, 3%)</option>
                      <option value="IPSI_CEUTA_MELILLA">Régimen Especial Ceuta y Melilla (IPSI)</option>
                      <option value="RECARGO_EQUIVALENCIA">Régimen Especial Recargo de Equivalencia (R.E.)</option>
                      <option value="MULTIRREGIMEN">Consolidado / Multirégimen (Todos los tipos)</option>
                      <option value="EXENTO_FRANQUICIA">Franquicia Fiscal / Operaciones Exentas</option>
                    </select>
                    <p className="text-[10px] text-slate-400">
                      Define el régimen fiscal de tu empresa y la vista en el panel de impuestos.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-200">
                        Régimen de Recargo de Equivalencia (R.E.)
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Marcar automáticamente para comerciantes minoristas autónomos (5,2%, 1,4%, 0,5%).
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={Boolean(parametros.aplicaRecargoEquivalenciaDefecto)}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          aplicaRecargoEquivalenciaDefecto: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer shrink-0"
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="text-xs font-semibold text-slate-200">
                        Permitir Facturas Exentas o con IVA al 0%
                      </div>
                      <p className="text-[10px] text-slate-400">
                        Habilita la asignación de cuota cero para operaciones intracomunitarias o suministros exentos.
                      </p>
                    </div>
                    <input
                      type="checkbox"
                      checked={parametros.permitirIvaCeroOExento}
                      onChange={(e) =>
                        setParametros({
                          ...parametros,
                          permitirIvaCeroOExento: e.target.checked,
                        })
                      }
                      className="w-4 h-4 rounded border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer shrink-0"
                    />
                  </div>
                </div>
              </div>

              {/* Botón inferior de guardado directo */}
              <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                <button
                  type="button"
                  onClick={handleRestablecerParametros}
                  className="text-[11px] text-slate-400 hover:text-slate-200 underline transition-colors"
                >
                  Restablecer valores originales de fábrica
                </button>
                <button
                  type="button"
                  onClick={handleGuardarParametrosDirecto}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-rose-950/40 transition-colors"
                >
                  {guardadoExitosoParametros ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>¡Guardado correctamente!</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      <span>Guardar Parámetros del Sistema</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {tabActiva === 'sheets' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sky-400 font-bold">
                    <HardDrive className="w-4 h-4" />
                    <span>Almacenamiento Digital de Recibos y Justificantes (Google Drive)</span>
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    DB-First • MySQL como Single Source of Truth
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed text-xs">
                  En este entorno empresarial, todos los registros contables, facturas, impuestos y análisis residen <strong>exclusivamente en la base de datos relacional MySQL</strong>. Se ha eliminado por completo el modelo Dual-Write y la integración con Google Sheets.
                </p>
                <p className="text-slate-400 leading-relaxed text-[11.5px]">
                  Google Drive se utiliza como repositorio de almacenamiento para los archivos físicos originales (PDFs de facturas y tickets escaneados), archivados de forma automática y ordenada en subcarpetas creadas dinámicamente por proveedor.
                </p>
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-1 flex items-center justify-between">
                  <span>URL del Webhook (Google Apps Script Web App para Drive)</span>
                  <span className="text-[10px] text-sky-400 font-mono font-normal">Recepción segura de archivos base64</span>
                </label>
                <input
                  type="text"
                  placeholder="https://script.google.com/macros/s/.../exec"
                  value={endpointUrl}
                  onChange={(e) => setEndpointUrl(e.target.value)}
                  className="w-full bg-[#0a0f18] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  Copia y pega la URL de despliegue generada al implementar tu script en Google Apps Script (pestaña &quot;Código Apps Script&quot;).
                </p>
              </div>

              <div>
                <label className="block text-slate-200 font-semibold mb-1 flex items-center justify-between">
                  <span>Carpeta Raíz de Google Drive (ID o Enlace)</span>
                  <span className="text-[10px] text-sky-400 font-mono font-normal">Organización automática por proveedor</span>
                </label>
                <input
                  type="text"
                  placeholder="ej: 1A2b3C4d5E6f7G8h9 o https://drive.google.com/drive/folders/..."
                  value={driveFolderId}
                  onChange={(e) => setDriveFolderId(e.target.value)}
                  className="w-full bg-[#0a0f18] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                />
                <div className="p-3 rounded-xl bg-sky-950/20 border border-sky-500/20 text-[11px] text-sky-200/90 mt-2 space-y-1">
                  <div className="font-semibold text-sky-300 flex items-center gap-1.5">
                    <span>Proceso automático de guardado en Google Drive:</span>
                  </div>
                  <div className="text-slate-300">
                    1. Identifica el <strong>nombre del proveedor</strong> de la factura.
                  </div>
                  <div className="text-slate-300">
                    2. Comprueba si existe la carpeta del proveedor dentro de esta carpeta; si no existe, la crea dinámicamente.
                  </div>
                  <div className="text-slate-300">
                    3. Guarda el archivo con el nombre <strong>[ID Factura] [Fecha]</strong> (ej: <code className="text-sky-300 bg-slate-900/80 px-1 py-0.5 rounded font-mono">FAC-2026-001 2026-01-14.pdf</code>).
                  </div>
                  <div className="text-slate-300">
                    4. Registra el enlace directo permanente de Google Drive en la tabla <code className="text-emerald-300 bg-slate-900/80 px-1 py-0.5 rounded font-mono">facturas</code> de MySQL.
                  </div>
                </div>
              </div>

              {/* Botones de Comprobación y Sincronización en Tiempo Real */}
              <div className="pt-2 space-y-3">
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleVerificarConexion}
                    disabled={verificando || !endpointUrl}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 text-xs font-semibold transition-colors border border-slate-700"
                  >
                    {verificando ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                        <span>Verificando acceso a Google Drive...</span>
                      </>
                    ) : (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
                        <span>Verificar Permisos de Drive</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setTabActiva('script')}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 text-xs font-semibold transition-colors border border-sky-500/40"
                  >
                    <Code className="w-3.5 h-3.5 text-sky-400" />
                    <span>Ver Código Apps Script para Drive</span>
                  </button>

                  <button
                    type="button"
                    onClick={async () => {
                      if (onSyncFacturas) {
                        setSincronizando(true);
                        try {
                          await onSyncFacturas();
                          cargarEstadoMysql();
                        } finally {
                          setSincronizando(false);
                        }
                      }
                    }}
                    disabled={sincronizando}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 disabled:opacity-50 text-xs font-semibold transition-colors border border-emerald-500/40"
                  >
                    {sincronizando ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                        <span>Recargando desde MySQL...</span>
                      </>
                    ) : (
                      <>
                        <Database className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Recargar Datos desde MySQL</span>
                      </>
                    )}
                  </button>
                </div>

                {resultadoVerificacion && (
                  <div
                    className={`p-3.5 rounded-xl border text-xs leading-relaxed ${
                      resultadoVerificacion.code === 'VERSION_DESACTUALIZADA'
                        ? 'bg-amber-950/40 border-amber-500/40 text-amber-200'
                        : resultadoVerificacion.accessible
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {resultadoVerificacion.code === 'VERSION_DESACTUALIZADA' ? (
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      ) : resultadoVerificacion.accessible ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>
                        <div className="font-bold">
                          {resultadoVerificacion.code === 'VERSION_DESACTUALIZADA'
                            ? '⚠️ Versión antigua detectada en Apps Script'
                            : resultadoVerificacion.accessible
                            ? '¡Conexión Verificada con Éxito al Almacenamiento de Google Drive!'
                            : 'Acceso Denegado por Google (Falta permiso público)'}
                        </div>
                        <p className="mt-1 text-[11px] opacity-90">
                          {resultadoVerificacion.mensaje}
                        </p>
                        {resultadoVerificacion.code === 'VERSION_DESACTUALIZADA' && (
                          <div className="mt-2.5">
                            <button
                              type="button"
                              onClick={() => setTabActiva('script')}
                              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer"
                            >
                              <span>Ir a la pestaña &quot;Código Apps Script&quot; y actualizar</span>
                              <span>→</span>
                            </button>
                          </div>
                        )}
                        {!resultadoVerificacion.accessible && resultadoVerificacion.code !== 'VERSION_DESACTUALIZADA' && (
                          <div className="mt-2.5 p-2.5 rounded-lg bg-rose-900/40 border border-rose-500/30 text-[11px] text-rose-200">
                            <div className="font-semibold text-rose-100 mb-1">🛠️ Cómo solucionarlo en 30 segundos:</div>
                            <ol className="list-decimal pl-4 space-y-1 text-rose-200/90 text-[10.5px]">
                              <li>En tu editor de Google Apps Script, ve al botón azul superior <strong>&quot;Implementar&quot;</strong> &gt; <strong>&quot;Gestionar implementaciones&quot;</strong>.</li>
                              <li>Haz clic en el icono del lápiz ✏️ (<strong>Editar</strong>).</li>
                              <li>En el desplegable <strong>&quot;Quién tiene acceso&quot;</strong> (<em>Who has access</em>), selecciona <strong>&quot;Cualquier usuario&quot;</strong> (<em>Anyone</em>).</li>
                              <li>En <strong>&quot;Versión&quot;</strong>, selecciona <strong>&quot;Nueva versión&quot;</strong> y pulsa <strong>&quot;Implementar&quot;</strong>.</li>
                              <li>Vuelve aquí y pulsa nuevamente <strong>&quot;Verificar Permisos de Drive&quot;</strong>.</li>
                            </ol>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tabActiva === 'mysql' && (
            <div className="space-y-5" id="panel-gestion-mysql">
              {/* Tarjeta de estado de conexión */}
              <div
                className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                  mysqlStatus?.connected
                    ? 'bg-emerald-950/30 border-emerald-500/40'
                    : 'bg-slate-900/90 border-slate-800'
                }`}
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-3 h-3 rounded-full ${
                        mysqlStatus?.connected ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'
                      }`}
                    />
                    <span className="font-bold text-sm text-slate-100">
                      {mysqlStatus?.connected
                        ? 'MySQL / MariaDB Conectado y Activo'
                        : 'MySQL Desconectado o Inaccesible en este entorno'}
                    </span>
                    {mysqlStatus?.connected && mysqlStatus.latencyMs !== undefined && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                        {mysqlStatus.latencyMs}ms
                      </span>
                    )}
                  </div>
                  <p className="text-slate-400 text-[11px] leading-relaxed">
                    {mysqlStatus?.connected ? (
                      <>
                        Host:{' '}
                        <code className="text-emerald-300 font-mono">
                          {mysqlStatus.host}:{mysqlStatus.port}
                        </code>{' '}
                        • Base de datos:{' '}
                        <code className="text-emerald-300 font-mono">
                          {mysqlStatus.database}
                        </code>{' '}
                        • Registros actuales:{' '}
                        <strong>{mysqlStatus.facturasCount || 0} facturas</strong> y{' '}
                        <strong>{mysqlStatus.proveedoresCount || 0} proveedores</strong>.
                      </>
                    ) : (
                      <>
                        {mysqlStatus?.message ||
                          `No se puede conectar con MySQL en ${mysqlConfig.host}:${mysqlConfig.port}.`}
                      </>
                    )}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={cargarEstadoMysql}
                    className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                    <span>Verificar Estado</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDescargarSql}
                    disabled={descargandoSql}
                    className="px-3.5 py-2 rounded-xl bg-sky-600/20 hover:bg-sky-600/30 text-sky-300 border border-sky-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    title="Descargar script SQL completo para importar en phpMyAdmin"
                  >
                    {descargandoSql ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-sky-400" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    <span>{descargandoSql ? 'Generando .sql...' : 'Descargar .sql'}</span>
                  </button>
                </div>
              </div>

              {/* Mensaje explicativo sobre entorno Cloud vs XAMPP Local */}
              {!mysqlStatus?.connected && (
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2 leading-relaxed">
                  <div className="font-bold flex items-center gap-2 text-amber-300">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                    <span>¿Por qué no conecta a MySQL en 127.0.0.1:3306?</span>
                  </div>
                  <p className="text-[11.5px] text-slate-300">
                    Si estás ejecutando la aplicación desde el <strong>servidor de previsualización web en la nube</strong>, el contenedor no tiene acceso directo a la red privada de tu ordenador (donde está XAMPP en 127.0.0.1).
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1 text-[11px]">
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                      <strong className="text-slate-100">Opción 1: Ejecutar la app en local con XAMPP</strong>
                      <p className="text-slate-400">
                        Inicia MySQL en XAMPP y ejecuta <code>npm run dev</code> en tu terminal local. Todas las facturas y proveedores se gestionarán directamente en tu MySQL local como única fuente de verdad.
                      </p>
                    </div>
                    <div className="p-2.5 rounded-lg bg-slate-900/80 border border-slate-800 space-y-1">
                      <strong className="text-slate-100">Opción 2: Importar con 1 clic en phpMyAdmin</strong>
                      <p className="text-slate-400">
                        Pulsa <strong>&quot;Descargar .sql&quot;</strong> arriba, abre phpMyAdmin en <code>http://localhost/phpmyadmin</code> &gt; pestaña <em>Importar</em> &gt; selecciona el archivo. ¡Creará las tablas e insertará todas tus facturas al instante!
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Formulario de conexión */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <div className="flex items-center gap-2 text-rose-400 font-bold text-xs">
                    <Database className="w-4 h-4" />
                    <span>Parámetros de Conexión a MySQL / MariaDB</span>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono">finance_ai_db</span>
                </div>

                {/* Aviso para despliegues en Vercel / Nube */}
                <div className="p-3 rounded-xl bg-amber-950/20 border border-amber-800/40 text-[11px] space-y-1 text-slate-300">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>Conexión desde Vercel / Nube</span>
                  </div>
                  <p className="text-slate-400 leading-relaxed">
                    Si tu aplicación está desplegada en <strong>Vercel</strong>, recuerda que <code>127.0.0.1</code> y <code>localhost</code> no funcionan (apuntan al contenedor interno de Vercel). Introduce el <strong>dominio o IP pública</strong> de tu servidor MySQL (ej: <code>db.tudominio.com</code> o IP de tu hosting/VPS) y habilita el acceso externo al puerto <strong>3306</strong> en el cortafuegos / cPanel (<em>MySQL Remoto</em> &gt; permitir <code>%</code>).
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Host del Servidor
                    </label>
                    <input
                      type="text"
                      value={mysqlConfig.host}
                      onChange={(e) => setMysqlConfig({ ...mysqlConfig, host: e.target.value })}
                      placeholder="127.0.0.1 o localhost"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Puerto MySQL
                    </label>
                    <input
                      type="number"
                      value={mysqlConfig.port}
                      onChange={(e) =>
                        setMysqlConfig({ ...mysqlConfig, port: Number(e.target.value) || 3306 })
                      }
                      placeholder="3306"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Base de Datos
                    </label>
                    <input
                      type="text"
                      value={mysqlConfig.database}
                      onChange={(e) => setMysqlConfig({ ...mysqlConfig, database: e.target.value })}
                      placeholder="finance_ai_db"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Usuario MySQL
                    </label>
                    <input
                      type="text"
                      value={mysqlConfig.user}
                      onChange={(e) => setMysqlConfig({ ...mysqlConfig, user: e.target.value })}
                      placeholder="root"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                      Contraseña (Vacía en XAMPP por defecto)
                    </label>
                    <input
                      type="password"
                      value={mysqlConfig.password}
                      onChange={(e) => setMysqlConfig({ ...mysqlConfig, password: e.target.value })}
                      placeholder="(Vacía en XAMPP)"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleProbarGuardarMysql}
                      disabled={probandoMysql}
                      className="w-full px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 transition-colors"
                    >
                      {probandoMysql ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Conectando...</span>
                        </>
                      ) : guardadoExitosoMysql ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>¡Conectado!</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Guardar y Probar Conexión</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Acciones directas de replicación */}
                <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
                  <div className="text-[11px] text-slate-400">
                    Arquitectura DB-First: MySQL/MariaDB es la única fuente de verdad para todos los datos.
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleReplicarTodoMysql}
                      disabled={replicandoMysql}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 disabled:opacity-50 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-slate-700"
                    >
                      {replicandoMysql ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-400" />
                          <span>Insertando en MySQL...</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw className="w-3.5 h-3.5 text-rose-400" />
                          <span>Replicar Facturas Actuales a MySQL Ahora</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {resultadoReplicacionMysql && (
                  <div
                    className={`p-3 rounded-xl border text-xs leading-relaxed ${
                      resultadoReplicacionMysql.success
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {resultadoReplicacionMysql.success ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                      )}
                      <div>{resultadoReplicacionMysql.mensaje}</div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {tabActiva === 'script' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-bold text-slate-200">
                    Google Apps Script para Google Drive (Despliegue en 1 Minuto)
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Pega este código en script.google.com o Extensiones &gt; Apps Script para habilitar el archivado digital en Google Drive
                  </p>
                </div>
                <button
                  onClick={copiarScript}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-600/20 border border-rose-500/30 text-rose-300 hover:bg-rose-600/30 transition-colors"
                >
                  {copiado ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiado ? '¡Copiado!' : 'Copiar Código'}</span>
                </button>
              </div>

              <pre className="p-3.5 rounded-xl bg-[#0a0f18] border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto max-h-72">
                {appsScriptCode}
              </pre>

              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 text-xs space-y-2.5">
                <div className="font-bold flex items-center gap-1.5 text-amber-300">
                  <span>⚡ 3 PASOS PARA ACTIVAR EL ALMACENAMIENTO DE RECIBOS EN GOOGLE DRIVE:</span>
                </div>
                <ol className="list-decimal list-inside space-y-2 text-[11px] text-slate-300 leading-relaxed">
                  <li>
                    Abre <strong>script.google.com</strong> (o Extensiones &gt; Apps Script), borra todo lo que haya en el archivo y pega el código copiado arriba.
                  </li>
                  <li className="text-amber-200 font-semibold bg-amber-950/40 p-2 rounded-lg border border-amber-500/30">
                    <strong>Paso 1 (Permisos Drive):</strong> En la barra superior de Apps Script, selecciona la función <code className="text-white bg-slate-900 px-1.5 py-0.5 rounded">autorizarPermisosDrive</code> y pulsa <strong>Ejecutar (▶)</strong>. Concede los permisos de Google Drive que solicite Google (Revisar permisos &gt; Tu cuenta &gt; Avanzado &gt; Ir a proyecto &gt; Permitir).
                  </li>
                  <li className="text-emerald-200 font-semibold bg-emerald-950/40 p-2 rounded-lg border border-emerald-500/30">
                    <strong>Paso 2 (Implementación Web):</strong> En Apps Script arriba a la derecha, haz clic en <strong>Implementar &gt; Nueva implementación &gt; Tipo: Aplicación web &gt; Quién tiene acceso: Cualquier usuario (Anyone) &gt; Implementar</strong>.
                    <p className="font-normal text-[10px] text-emerald-300/80 mt-1">
                      ⚠️ <em>Nota importante: Copia la URL de la aplicación web generada (terminada en /exec).</em>
                    </p>
                  </li>
                  <li>
                    Pega la URL en la pestaña <strong>&quot;Google Drive (Recibos)&quot;</strong> de esta aplicación y pulsa <strong>&quot;Guardar Configuración&quot;</strong>.
                  </li>
                </ol>
                <div className="pt-2 border-t border-amber-500/20 text-[10px] text-amber-300/90 flex items-center gap-1.5">
                  <span>✨ <strong>Limpieza automática de Drive:</strong> Al eliminar una factura, si era la última de su carpeta y queda vacía, la carpeta del proveedor se elimina automáticamente de Google Drive para mantener tu nube limpia y organizada.</span>
                </div>
              </div>
            </div>
          )}

          {tabActiva === 'gemini' && (
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Seguridad de Claves de API (Server-Side Proxy)</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Siguiendo las directrices estrictas de seguridad, ninguna clave de API sensible se
                  expone en el navegador web del cliente.
                </p>
                <div className="space-y-1 text-[11px] text-slate-400">
                  <div>• Las llamadas a Gemini se canalizan a través de <code>/api/gemini/*</code> en el servidor Express.</div>
                  <div>• La clave se almacena de forma segura en la variable de entorno <code>GEMINI_API_KEY</code>.</div>
                  <div>• En caso de ausencia de clave, cuota agotada o fallo de lectura en un archivo, el sistema muestra una advertencia explícita y detiene el proceso sin inventar datos ni generar facturas simuladas.</div>
                </div>
              </div>

              <div className="pt-2">
                <button
                  onClick={onResetData}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
                >
                  Restablecer Datos de Demostración Originales ({negocio.nombre})
                </button>
              </div>
            </div>
          )}

          {tabActiva === 'apariencia' && (
            <div className="space-y-5">
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-rose-400 font-bold">
                  <Palette className="w-4 h-4" />
                  <span>Personalización del Tema Visual</span>
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Elige entre el tema oscuro de alta concentración o el tema claro de alto contraste. Tu selección se sincroniza de forma inmediata y se guarda automáticamente en tu navegador.
                </p>
              </div>

              {/* Selector de temas con tarjetas visuales */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Opción Modo Oscuro */}
                <div
                  onClick={() => onSetTheme && onSetTheme('dark')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    theme === 'dark'
                      ? 'border-rose-500 bg-[#0a0f18] shadow-lg shadow-rose-950/30'
                      : 'border-slate-800 bg-[#0a0f18]/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-700 flex items-center justify-center text-amber-400">
                        <Moon className="w-5 h-5 text-indigo-400" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200 text-sm">Modo Oscuro</div>
                        <div className="text-[11px] text-slate-400">Fintech Night Edition</div>
                      </div>
                    </div>
                    {theme === 'dark' && (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Mini preview oscuro */}
                  <div className="rounded-lg p-2.5 bg-[#080c14] border border-slate-800 flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Fondo Oscuro</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-800 text-rose-400 font-mono font-bold">
                      1.250,00 €
                    </span>
                  </div>
                </div>

                {/* Opción Modo Claro */}
                <div
                  onClick={() => onSetTheme && onSetTheme('light')}
                  className={`p-4 rounded-2xl border-2 transition-all cursor-pointer flex flex-col justify-between gap-3 ${
                    theme === 'light'
                      ? 'border-rose-500 bg-white/90 shadow-lg shadow-rose-950/10'
                      : 'border-slate-800 bg-[#0a0f18]/60 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
                        <Sun className="w-5 h-5 text-amber-500" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-200 text-sm">Modo Claro</div>
                        <div className="text-[11px] text-slate-400">Fintech Day Edition</div>
                      </div>
                    </div>
                    {theme === 'light' && (
                      <span className="w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-xs">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </span>
                    )}
                  </div>

                  {/* Mini preview claro */}
                  <div className="rounded-lg p-2.5 bg-slate-100 border border-slate-300 flex items-center justify-between text-[10px]">
                    <span className="text-slate-700 font-medium">Fondo Claro</span>
                    <span className="px-1.5 py-0.5 rounded bg-white text-rose-600 font-mono font-bold border border-slate-200">
                      1.250,00 €
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <span className="text-sm">💡</span>
                <span>También puedes alternar rápidamente el modo claro/oscuro en cualquier momento haciendo clic en el botón con icono de sol/luna ubicado en la cabecera superior y en la barra lateral.</span>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-800 bg-[#0d131f] flex items-center justify-between shrink-0">
          <div className="text-[11px] text-slate-500">
            Estado: {config.status === 'sincronizado' ? 'Conectado a Sheets' : 'Modo Demostración / Local'}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md shadow-rose-950/40 transition-colors"
            >
              Guardar Configuración
            </button>
          </div>
        </div>
      </div>

      {/* Gestor Modal de Categorías de Gasto */}
      <CategoriasGastoModal
        isOpen={isCategoriasModalOpen}
        onClose={() => setIsCategoriasModalOpen(false)}
      />
    </div>
  );
};
