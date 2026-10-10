import React, { useState, useEffect } from 'react';
import { Sidebar } from './components/Sidebar';
import { ResumenView } from './components/ResumenView';
import { FacturasView } from './components/FacturasView';
import { ProveedoresView } from './components/ProveedoresView';
import { EvolucionPreciosView } from './components/EvolucionPreciosView';
import { AlertasView } from './components/AlertasView';
import { IvaView } from './components/IvaView';
import { ModelosFiscalesView } from './components/ModelosFiscalesView';
import { AnalisisIAView } from './components/AnalisisIAView';
import { ChatFacturasModal } from './components/ChatFacturasModal';
import { InformePdfModal } from './components/InformePdfModal';
import { ConfiguracionModal } from './components/ConfiguracionModal';
import { MySQLStatusIndicator } from './components/MySQLStatusIndicator';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  INITIAL_FACTURAS,
  INITIAL_PROVEEDORES,
  INITIAL_ALERTAS,
  INITIAL_ANALISIS_EJECUTIVO,
} from './data/mockData';
import { Factura, Proveedor, Alerta, AnalisisEjecutivo, GoogleSheetsConfig, GlobalLoadingState, DatosNegocio, DEFAULT_DATOS_NEGOCIO } from './types';
import { GlobalLoadingBar } from './components/GlobalLoadingBar';
import {
  MessageSquare,
  Settings,
  Bell,
  Sparkles,
  Cloud,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  Sun,
  Moon,
  Menu,
} from 'lucide-react';
import { generarProveedoresDesdeFacturas, generarAlertasDesdeFacturas } from './utils/sheetDataSync';
import { obtenerConfiguracionAlertas } from './utils/alertasConfig';
import { obtenerCategoriasGasto, sincronizarCategoriasDesdeBD } from './utils/categoriasGasto';
import { cargarParametrosDesdeMySQL, obtenerParametrosSistema } from './utils/parametrosSistema';
import { ThemeMode, getInitialTheme, applyTheme } from './utils/theme';

export default function App() {
  // Theme State (Dark / Light Mode)
  const [theme, setTheme] = useState<ThemeMode>(getInitialTheme);

  // Apply theme class to <html> and <body> immediately
  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  const handleToggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Navigation State
  const [activeTab, setActiveTab] = useState<string>('resumen');

  // Estado de carga y sincronización DB-First (MySQL como única fuente de verdad)
  const [isDbDataLoaded, setIsDbDataLoaded] = useState<boolean>(false);
  const [isSyncingDb, setIsSyncingDb] = useState<boolean>(false);
  const [globalLoading, setGlobalLoading] = useState<GlobalLoadingState>({
    activo: false,
    mensaje: '',
  });
  const [syncToast, setSyncToast] = useState<{
    tipo: 'success' | 'info' | 'error';
    mensaje: string;
  } | null>(null);

  // Estados de datos de la aplicación (Persistidos directamente en MySQL / MariaDB)
  const [facturas, setFacturas] = useState<Factura[]>(INITIAL_FACTURAS);
  const [proveedores, setProveedores] = useState<Proveedor[]>(INITIAL_PROVEEDORES);
  const [alertas, setAlertas] = useState<Alerta[]>(INITIAL_ALERTAS);
  const [analisis, setAnalisis] = useState<AnalisisEjecutivo>(INITIAL_ANALISIS_EJECUTIVO);

  const [sheetsConfig, setSheetsConfig] = useState<GoogleSheetsConfig>({
    sheetId: '',
    sheetUrl: '',
    endpointUrl: '',
    driveFolderId: '',
    autoSync: true,
    status: 'sincronizado',
    lastSync: 'Auto',
  });

  const [datosNegocio, setDatosNegocio] = useState<DatosNegocio>(() => {
    try {
      const saved = localStorage.getItem('fa_datos_negocio_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.nombre) {
          return { ...DEFAULT_DATOS_NEGOCIO, ...parsed };
        }
      }
    } catch {}
    return DEFAULT_DATOS_NEGOCIO;
  });

  // Modals Visibility
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [configInitialTab, setConfigInitialTab] = useState<
    'negocio' | 'categorias' | 'fiscalidad' | 'parametros' | 'sheets' | 'mysql' | 'gemini' | 'script' | 'apariencia'
  >('negocio');
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isPdfReportOpen, setIsPdfReportOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleOpenConfig = (
    tab?: 'negocio' | 'categorias' | 'fiscalidad' | 'parametros' | 'sheets' | 'mysql' | 'gemini' | 'script' | 'apariencia'
  ) => {
    if (tab) {
      setConfigInitialTab(tab);
    }
    setIsConfigOpen(true);
  };

  // =========================================================================
  // ARQUITECTURA DB-FIRST: MySQL / MariaDB como Única Fuente de Verdad
  // (Eliminado el modelo Dual-Write y dependencia de localStorage)
  // =========================================================================

  // Función para sincronizar y consultar directamente la Base de Datos MySQL (Single Source of Truth)
  const sincronizarFacturasDesdeBD = async (
    forzarNotificacion = false
  ): Promise<{ success: boolean; count: number; message?: string }> => {
    setIsSyncingDb(true);
    setGlobalLoading({
      activo: true,
      mensaje: 'Consultando base de datos relacional MySQL...',
    });
    try {
      const response = await fetch('/api/facturas', {
        headers: { 'Content-Type': 'application/json' },
        signal: AbortSignal.timeout(15000),
      });
      const data = await response.json();

      if (data.success && Array.isArray(data.facturas) && data.facturas.length > 0) {
        setFacturas(data.facturas);
        const provsReales = generarProveedoresDesdeFacturas(data.facturas);
        setProveedores(provsReales);
        const alertsReales = generarAlertasDesdeFacturas(data.facturas);
        setAlertas(alertsReales);
        setIsDbDataLoaded(true);

        const msg = `Se han cargado ${data.facturas.length} facturas directamente de MySQL (${data.fuente === 'mysql' ? 'Motor Relacional' : 'Caché Servidor'}).`;
        if (forzarNotificacion) {
          setSyncToast({ tipo: 'success', mensaje: msg });
          setTimeout(() => setSyncToast(null), 5000);
        }
        return { success: true, count: data.facturas.length, message: msg };
      } else if (data.success) {
        setFacturas([]);
        setProveedores([]);
        setAlertas([]);
        setIsDbDataLoaded(true);

        const msg = `Base de datos conectada: tabla 'facturas' vacía (0 facturas). Panel actualizado.`;
        if (forzarNotificacion) {
          setSyncToast({ tipo: 'info', mensaje: msg });
          setTimeout(() => setSyncToast(null), 5000);
        }
        return { success: true, count: 0, message: msg };
      } else {
        const msg = data.error || 'Aviso al consultar la base de datos MySQL.';
        if (forzarNotificacion) {
          setSyncToast({ tipo: 'error', mensaje: msg });
          setTimeout(() => setSyncToast(null), 5000);
        }
        return { success: false, count: 0, message: msg };
      }
    } catch (e: any) {
      const msg = e?.name === 'TimeoutError'
        ? 'Tiempo de espera agotado al consultar la base de datos MySQL.'
        : (e?.message || 'Error de conexión con la base de datos MySQL.');
      if (forzarNotificacion) {
        setSyncToast({ tipo: 'error', mensaje: msg });
        setTimeout(() => setSyncToast(null), 5000);
      }
      return { success: false, count: 0, message: msg };
    } finally {
      setIsSyncingDb(false);
      setGlobalLoading({ activo: false, mensaje: '' });
    }
  };

  // Al arrancar: cargar automáticamente desde MySQL (Single Source of Truth)
  useEffect(() => {
    let montado = true;

    const cargarDatosDesdeMySQL = async () => {
      try {
        // 1. Cargar facturas persistidas en MySQL
        const facturasRes = await fetch('/api/facturas');
        const facturasData = await facturasRes.json();
        if (montado && facturasData.success && Array.isArray(facturasData.facturas) && facturasData.facturas.length > 0) {
          setFacturas(facturasData.facturas);
          const provs = generarProveedoresDesdeFacturas(facturasData.facturas);
          setProveedores(provs);
          const alrts = generarAlertasDesdeFacturas(facturasData.facturas);
          setAlertas(alrts);
          setIsDbDataLoaded(true);
        }

        // 2. Cargar configuración de almacenamiento Google Drive
        const driveRes = await fetch('/api/drive/config');
        const driveData = await driveRes.json();
        if (montado && driveData.success && driveData.config) {
          setSheetsConfig((prev) => ({
            ...prev,
            endpointUrl: driveData.config.endpointUrl || prev.endpointUrl,
            driveFolderId: driveData.config.driveFolderId || prev.driveFolderId,
            status: 'sincronizado',
          }));
        }

        // 3. Cargar datos de negocio de MySQL o servidor
        const negocioRes = await fetch('/api/datos-negocio');
        const negocioData = await negocioRes.json();
        if (montado && negocioData.success && negocioData.datos && negocioData.datos.nombre) {
          setDatosNegocio((prev) => {
            const merged = { ...DEFAULT_DATOS_NEGOCIO, ...prev, ...negocioData.datos };
            try {
              localStorage.setItem('fa_datos_negocio_v1', JSON.stringify(merged));
            } catch {}
            return merged;
          });
        }

        // 4. Sincronizar catálogo de categorías de gasto desde MySQL
        await sincronizarCategoriasDesdeBD();

        // 5. Cargar parámetros del sistema desde MySQL
        await cargarParametrosDesdeMySQL();

        // 6. Cargar análisis financiero IA desde MySQL
        const analisisRes = await fetch('/api/analisis-ejecutivo');
        const analisisData = await analisisRes.json();
        if (montado && analisisData.success && analisisData.analisis) {
          setAnalisis(analisisData.analisis);
        }

        // 7. Cargar alertas persistidas en MySQL (fuente de verdad para estados 'resuelta' e 'ignorada')
        const alertasRes = await fetch('/api/alertas');
        const alertasData = await alertasRes.json();
        if (montado && alertasData.success && Array.isArray(alertasData.alertas) && alertasData.alertas.length > 0) {
          setAlertas((prevAlertas) => {
            const dbMap = new Map<string, Alerta>(alertasData.alertas.map((a: Alerta) => [a.id, a]));
            const merged = prevAlertas.map((a) => {
              const enDb = dbMap.get(a.id);
              return enDb ? { ...a, ...enDb, estado: enDb.estado || a.estado } : a;
            });
            alertasData.alertas.forEach((a: Alerta) => {
              if (!merged.some((m) => m.id === a.id)) {
                merged.push(a);
              }
            });
            return merged.length > 0 ? merged : alertasData.alertas;
          });
        }

        // 8. Cargar proveedores persistidos en MySQL
        const provsRes = await fetch('/api/proveedores');
        const provsData = await provsRes.json();
        if (montado && provsData.success && Array.isArray(provsData.proveedores) && provsData.proveedores.length > 0) {
          setProveedores(provsData.proveedores);
        }
      } catch (err) {
        console.warn('Carga inicial desde MySQL:', err);
      }
    };

    cargarDatosDesdeMySQL();

    return () => {
      montado = false;
    };
  }, []);

  // Eliminar una factura de forma coordinada en MySQL y Google Drive
  const handleDeleteFactura = async (facturaOId: Factura | string): Promise<{ success: boolean; message: string }> => {
    const idFactura = typeof facturaOId === 'string' ? facturaOId : facturaOId.idFactura;
    const facturaObj = typeof facturaOId === 'object' ? facturaOId : facturas.find((f) => f.idFactura === idFactura);
    const normalizedTarget = String(idFactura).trim().toLowerCase();

    // 1. Actualizar estado de React en memoria
    let facturasRestantes: Factura[] = [];
    setFacturas((prevFacturas) => {
      facturasRestantes = prevFacturas.filter((f) => String(f.idFactura).trim().toLowerCase() !== normalizedTarget);
      return facturasRestantes;
    });

    setProveedores(() => generarProveedoresDesdeFacturas(facturasRestantes));
    setAlertas(() => generarAlertasDesdeFacturas(facturasRestantes));

    // 2. Notificar al backend para eliminar transaccionalmente en MySQL y archivo en Drive
    setGlobalLoading({
      activo: true,
      mensaje: `Eliminando factura ${idFactura} de MySQL y Google Drive...`,
    });
    try {
      const fileUrl = facturaObj?.driveFileUrl || (facturaObj as any)?.fileUrl || (facturaObj as any)?.archivoUrl || '';
      const res = await fetch(`/api/facturas/${encodeURIComponent(idFactura)}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idFactura,
          endpointUrl: sheetsConfig.endpointUrl,
          driveFolderId: sheetsConfig.driveFolderId,
          nombreProveedor: facturaObj?.nombreProveedor || facturaObj?.idProveedor || '',
          fileUrl: fileUrl,
        }),
      });
      const data = await res.json().catch(() => null);
      
      const mysqlOk = data?.mysqlDeleted;
      const driveOk = data?.driveDeleted;
      const folderOk = data?.folderDeleted;
      
      let msg = `Factura ${idFactura} eliminada correctamente de la Base de Datos MySQL`;
      if (driveOk) {
        msg += ' y de Google Drive';
        if (folderOk) {
          msg += ' (la carpeta del proveedor quedó vacía y también fue eliminada)';
        }
      }
      msg += '.';

      setSyncToast({ tipo: 'info', mensaje: msg });
      setTimeout(() => setSyncToast(null), 5000);
      return { success: true, message: msg };
    } catch (err) {
      console.warn('Error al eliminar en backend:', err);
      const msg = `Factura ${idFactura} eliminada de la aplicación local.`;
      setSyncToast({ tipo: 'info', mensaje: msg });
      setTimeout(() => setSyncToast(null), 5000);
      return { success: true, message: msg };
    } finally {
      setGlobalLoading({ activo: false, mensaje: '' });
    }
  };

  // Handler: Save newly processed invoice to MySQL and Google Drive
  const handleSaveFactura = async (
    nuevaFactura: Factura,
    archivoInfo?: { base64Data?: string; fileName?: string; mimeType?: string }
  ): Promise<{
    success: boolean;
    message?: string;
    facturaGuardada?: Factura;
    driveInfo?: any;
    driveGuardado?: boolean;
    driveError?: string;
  }> => {
    setGlobalLoading({
      activo: true,
      mensaje: `Guardando factura ${nuevaFactura.idFactura || ''} en MySQL y archivando en Google Drive...`,
    });
    try {
      const response = await fetch('/api/facturas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          factura: nuevaFactura,
          config: sheetsConfig,
          archivo: archivoInfo,
        }),
      });

      const resData = await response.json();
      const isDriveSaved = Boolean(resData.driveGuardado);
      const facturaFinal: Factura = {
        ...nuevaFactura,
        ...(resData.factura || {}),
        archivoBase64: nuevaFactura.archivoBase64 || resData.factura?.archivoBase64 || archivoInfo?.base64Data,
        archivoNombre: nuevaFactura.archivoNombre || resData.factura?.archivoNombre || archivoInfo?.fileName,
        driveFileName: resData.factura?.driveFileName || resData.driveInfo?.nombreArchivo || `${nuevaFactura.idFactura} ${nuevaFactura.fechaEmision}.pdf`,
        driveFolderName: resData.factura?.driveFolderName || resData.driveInfo?.carpetaProveedor || nuevaFactura.nombreProveedor,
        driveFileUrl: resData.factura?.driveFileUrl || resData.driveInfo?.fileUrl,
        driveFolderUrl: resData.factura?.driveFolderUrl || resData.driveInfo?.folderUrl,
        driveGuardado: isDriveSaved,
        driveError: resData.driveError,
      };

      // Append to memory state
      setFacturas((prev) => {
        const existe = prev.some((f) => f.idFactura === facturaFinal.idFactura);
        if (existe) {
          return prev.map((f) => (f.idFactura === facturaFinal.idFactura ? facturaFinal : f));
        }
        return [facturaFinal, ...prev];
      });
      setIsDbDataLoaded(true);

      // Automatically evaluate if this new invoice creates a price increase alert
      if (nuevaFactura.lineas && nuevaFactura.lineas.length > 0) {
        nuevaFactura.lineas.forEach((linea) => {
          // Check historical purchases of this same product
          const anteriores = facturas
            .flatMap((f) => f.lineas || [])
            .filter((l) => l.nombreProducto.toLowerCase() === linea.nombreProducto.toLowerCase());

          if (anteriores.length > 0) {
            const configAlertas = obtenerConfiguracionAlertas();
            const precioPrevio = anteriores[anteriores.length - 1].precioUnitario;
            const umbralRatio = 1 + configAlertas.umbralSubidaModeradaPct / 100;
            if (linea.precioUnitario > precioPrevio * umbralRatio) {
              const varPct = ((linea.precioUnitario - precioPrevio) / precioPrevio) * 100;
              const nuevaAlerta: Alerta = {
                id: `ALT-${Date.now()}-${Math.floor(Math.random() * 100)}`,
                tipo: 'SUBIDA DE PRECIO',
                nivel: varPct >= configAlertas.umbralSubidaCriticaPct ? 'critica' : 'alta',
                titulo: `Subida detectada en ${linea.nombreProducto} (+${varPct.toFixed(1)}%)`,
                descripcion: `El precio unitario subió de ${precioPrevio.toFixed(2)} € a ${linea.precioUnitario.toFixed(2)} € (+${varPct.toFixed(1)}%) en la factura ${nuevaFactura.idFactura}.`,
                fecha: nuevaFactura.fechaEmision,
                estado: 'activa',
                datosRelacionados: {
                  proveedor: nuevaFactura.nombreProveedor,
                  producto: linea.nombreProducto,
                  precioAnterior: precioPrevio,
                  precioNuevo: linea.precioUnitario,
                  variacionPorcentaje: varPct,
                },
              };
              setAlertas((prev) => [nuevaAlerta, ...prev]);
            }
          }
        });
      }

      return {
        success: true,
        message: resData.mensaje || 'Factura registrada con éxito',
        facturaGuardada: facturaFinal,
        driveInfo: resData.driveInfo,
        driveGuardado: isDriveSaved,
        driveError: resData.driveError,
      };
    } catch (err: any) {
      console.error('Error al guardar factura:', err);
      // Fallback local save
      setFacturas((prev) => [nuevaFactura, ...prev]);
      return { success: true, message: 'Guardada en memoria local' };
    } finally {
      setGlobalLoading({ activo: false, mensaje: '' });
    }
  };

  // Handler para subir a Google Drive a posteriori (o reintentar)
  const handleUploadToDrive = async (factura: Factura) => {
    if (!factura.archivoBase64) {
      alert('Esta factura no tiene el archivo digital en memoria para subir a Google Drive.');
      return { success: false, error: 'Sin archivo digital en memoria' };
    }
    setGlobalLoading({
      activo: true,
      mensaje: `Archivando ${factura.idFactura} en Google Drive...`,
    });
    try {
      const res = await fetch('/api/sheets/upload-to-drive', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idFactura: factura.idFactura,
          config: sheetsConfig,
          archivo: {
            base64Data: factura.archivoBase64,
            fileName: factura.archivoNombre || `${factura.idFactura} ${factura.fechaEmision}.pdf`,
            mimeType: factura.archivoNombre?.toLowerCase().endsWith('.png') ? 'image/png' : 'application/pdf',
          },
          nombreProveedor: factura.nombreProveedor,
          fechaEmision: factura.fechaEmision,
        }),
      });
      const data = await res.json();
      if (data.success && data.drive) {
        setFacturas((prev) =>
          prev.map((f) => {
            if (f.idFactura === factura.idFactura) {
              return {
                ...f,
                driveGuardado: true,
                driveFileUrl: data.drive.fileUrl,
                driveFolderUrl: data.drive.carpetaProveedorUrl,
                driveFileName: data.drive.fileName,
                driveFolderName: data.drive.carpetaProveedor,
                driveError: undefined,
              };
            }
            return f;
          })
        );
        setSyncToast({
          tipo: 'success',
          mensaje: `Factura ${factura.idFactura} archivada en Google Drive (Carpeta: ${data.drive.carpetaProveedor || factura.nombreProveedor})`,
        });
        return { success: true, drive: data.drive };
      } else {
        const err = data.error || 'Fallo al subir a Google Drive';
        setFacturas((prev) =>
          prev.map((f) => (f.idFactura === factura.idFactura ? { ...f, driveError: err } : f))
        );
        setSyncToast({
          tipo: 'error',
          mensaje: `Error al subir a Drive: ${err}`,
        });
        return { success: false, error: err };
      }
    } catch (e: any) {
      const msg = e?.message || 'Error de conexión con Google Drive';
      setSyncToast({ tipo: 'error', mensaje: msg });
      return { success: false, error: msg };
    } finally {
      setGlobalLoading({ activo: false, mensaje: '' });
    }
  };

  // Handlers for Alerts con persistencia directa en MariaDB/MySQL
  const handleCambiarEstadoAlerta = async (
    id: string,
    nuevoEstado: 'activa' | 'resuelta' | 'ignorada'
  ) => {
    let alertaActualizada: Alerta | undefined;

    // 1. Actualización optimista en React state y localStorage
    setAlertas((prev) => {
      const updated = prev.map((a) => {
        if (a.id === id) {
          alertaActualizada = { ...a, estado: nuevoEstado };
          return alertaActualizada;
        }
        return a;
      });
      try {
        localStorage.setItem('fa_alertas_v1', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // 2. Persistencia en la tabla alertas de MySQL
    try {
      const res = await fetch(`/api/alertas/${encodeURIComponent(id)}/estado`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          estado: nuevoEstado,
          alerta: alertaActualizada,
        }),
      });
      const data = await res.json();
      if (!data.success) {
        console.warn('Aviso al guardar estado de alerta en MySQL:', data.error);
      }
    } catch (err) {
      console.warn('Error al guardar estado de alerta en MySQL:', err);
    }
  };

  const handleResolverAlerta = (id: string) => {
    handleCambiarEstadoAlerta(id, 'resuelta');
    setSyncToast({ tipo: 'success', mensaje: 'Alerta marcada como resuelta y guardada en base de datos.' });
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleIgnorarAlerta = (id: string) => {
    handleCambiarEstadoAlerta(id, 'ignorada');
    setSyncToast({ tipo: 'info', mensaje: 'Alerta marcada como ignorada y guardada en base de datos.' });
    setTimeout(() => setSyncToast(null), 3000);
  };

  const handleReactivarAlerta = (id: string) => {
    handleCambiarEstadoAlerta(id, 'activa');
    setSyncToast({ tipo: 'info', mensaje: 'Alerta reactivada y guardada en base de datos.' });
    setTimeout(() => setSyncToast(null), 3000);
  };

  // Handler: Restablecer datos iniciales de trabajo
  const handleResetData = () => {
    setFacturas(INITIAL_FACTURAS);
    setProveedores(INITIAL_PROVEEDORES);
    setAlertas(INITIAL_ALERTAS);
    setAnalisis(INITIAL_ANALISIS_EJECUTIVO);
    setIsConfigOpen(false);
    setSyncToast({ tipo: 'info', mensaje: 'Se han cargado los datos iniciales de trabajo.' });
    setTimeout(() => setSyncToast(null), 4000);
  };

  // Handler: Guardar datos de negocio directamente en la base de datos MySQL (datos_negocio)
  const handleSaveDatosNegocio = async (nuevosDatos: DatosNegocio) => {
    setDatosNegocio(nuevosDatos);
    try {
      localStorage.setItem('fa_datos_negocio_v1', JSON.stringify(nuevosDatos));
    } catch {}
    try {
      await fetch('/api/datos-negocio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ datos: nuevosDatos }),
      });
    } catch (e) {
      console.warn('Aviso al guardar datos de negocio en MySQL:', e);
    }
  };

  // Handler: Guardar configuración de Google Drive directamente en MySQL (DB-First)
  const handleSaveConfig = async (newConfig: GoogleSheetsConfig) => {
    setSheetsConfig(newConfig);
    try {
      await fetch('/api/drive/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ config: newConfig }),
      });
    } catch (err) {
      console.warn('Aviso al guardar configuración de Drive en MySQL:', err);
    }
  };

  const alertasActivasCount = alertas.filter((a) => a.estado === 'activa').length;

  return (
    <div className="min-h-screen bg-[#080c14] text-slate-100 flex flex-col lg:flex-row antialiased">
      {/* Global Async Loading Bar & Floating Status Indicator */}
      <GlobalLoadingBar loading={globalLoading} />

      {/* Left Navigation Sidebar */}
      <Sidebar
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        alertasActivasCount={alertasActivasCount}
        facturasCount={facturas.length}
        sheetsConfig={sheetsConfig}
        onOpenConfig={() => setIsConfigOpen(true)}
        onOpenChat={() => setIsChatOpen(true)}
        isChatOpen={isChatOpen}
        theme={theme}
        onToggleTheme={handleToggleTheme}
        datosNegocio={datosNegocio}
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        {/* Top Header Bar */}
        <header className="h-16 px-4 sm:px-6 lg:px-8 border-b border-slate-800/80 bg-[#0a0f18]/90 backdrop-blur-md flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-3">
            {/* Hamburger Button for Mobile / Small Screens */}
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="lg:hidden p-2 -ml-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800/60 transition-colors cursor-pointer"
              aria-label="Abrir menú de navegación"
            >
              <Menu className="w-5 h-5" />
            </button>

            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest hidden sm:inline max-w-[200px] truncate" title={datosNegocio.nombre}>
              {datosNegocio.nombre}
            </span>
            <span className="text-slate-600 hidden sm:inline">•</span>
            <span className="text-xs font-semibold text-rose-400 capitalize">
              {activeTab === 'resumen'
                ? 'Panel de Control Financiero'
                : activeTab === 'facturas'
                ? 'Gestión Contable de Facturas'
                : activeTab === 'proveedores'
                ? 'Directorio de Proveedores'
                : activeTab === 'precios'
                ? 'Auditoría de Precios'
                : activeTab === 'alertas'
                ? 'Alertas de Riesgo'
                : activeTab === 'iva'
                ? 'Resumen Fiscal de IVA'
                : 'Análisis Ejecutivo Gemini'}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Selector de Modo Claro / Oscuro */}
            <button
              id="theme-toggle-header-btn"
              onClick={handleToggleTheme}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all cursor-pointer"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
              aria-label="Cambiar modo claro u oscuro"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span className="hidden md:inline">Modo Claro</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                  <span className="hidden md:inline">Modo Oscuro</span>
                </>
              )}
            </button>

            {/* Botón y Estado de Sincronización con la Base de Datos MySQL */}
            <button
              onClick={() => sincronizarFacturasDesdeBD(true)}
              disabled={isSyncingDb}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 text-slate-300 hover:text-white text-xs font-medium transition-all"
              title="Consultar facturas directamente desde la Base de Datos MySQL (Single Source of Truth)"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-indigo-400 ${isSyncingDb ? 'animate-spin' : ''}`} />
              <span className="hidden md:inline">{isSyncingDb ? 'Consultando...' : 'Sincronizar BD'}</span>
            </button>

            {/* Indicador de Modo DB-First */}
            <div
              className={`hidden sm:flex items-center gap-2 px-3 py-1 rounded-full border text-[11px] font-medium transition-colors ${
                isDbDataLoaded
                  ? 'bg-emerald-950/50 border-emerald-500/40 text-emerald-300'
                  : 'bg-indigo-950/50 border-indigo-500/30 text-indigo-300'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isDbDataLoaded ? 'bg-emerald-400 animate-pulse' : 'bg-indigo-400'}`}></span>
              <span>{`MySQL DB: ${facturas.length} facturas (Single Source of Truth)`}</span>
            </div>

            {/* Indicador de Estado de Conexión y Latencia con MySQL / MariaDB */}
            <MySQLStatusIndicator
              onOpenConfigMySQL={() => {
                setConfigInitialTab('mysql');
                setIsConfigOpen(true);
              }}
            />

            {/* Quick Chat with Gemini Button */}
            <button
              onClick={() => setIsChatOpen(!isChatOpen)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-950/40 hover:bg-indigo-900/60 border border-indigo-500/30 text-indigo-300 text-xs font-semibold transition-colors"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Pregunta a tus facturas</span>
            </button>

            {/* Alert Indicator */}
            {alertasActivasCount > 0 && (
              <button
                onClick={() => setActiveTab('alertas')}
                className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-400 relative transition-colors"
                title={`${alertasActivasCount} alertas activas`}
              >
                <Bell className="w-4 h-4" />
                <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1"></span>
              </button>
            )}

            {/* Settings Trigger */}
            <button
              onClick={() => setIsConfigOpen(true)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 transition-colors"
              title="Configuración"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Notificación Toast de Sincronización */}
        {syncToast && (
          <div
            className={`mx-4 sm:mx-6 lg:mx-8 mt-4 p-3.5 rounded-xl border flex items-center justify-between text-xs transition-all ${
              syncToast.tipo === 'success'
                ? 'bg-emerald-950/70 border-emerald-500/50 text-emerald-200'
                : syncToast.tipo === 'info'
                ? 'bg-blue-950/70 border-blue-500/50 text-blue-200'
                : 'bg-rose-950/70 border-rose-500/50 text-rose-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {syncToast.tipo === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : syncToast.tipo === 'info' ? (
                <FileSpreadsheet className="w-4 h-4 text-blue-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span className="font-medium leading-relaxed">{syncToast.mensaje}</span>
            </div>
            <button
              onClick={() => setSyncToast(null)}
              className="text-slate-400 hover:text-slate-200 ml-4 font-bold text-base leading-none"
            >
              &times;
            </button>
          </div>
        )}

        {/* View Component Rendering */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {activeTab === 'resumen' && (
            <ResumenView
              facturas={facturas}
              proveedores={proveedores}
              alertas={alertas}
              datosNegocio={datosNegocio}
              onNavigate={setActiveTab}
              onOpenUpload={() => setActiveTab('facturas')}
              onOpenAnalysis={() => setActiveTab('analisis-ia')}
              onOpenPdfReport={() => setIsPdfReportOpen(true)}
            />
          )}

          {activeTab === 'facturas' && (
            <FacturasView
              facturas={facturas}
              proveedores={proveedores}
              sheetsConfig={sheetsConfig}
              datosNegocio={datosNegocio}
              onSaveFactura={handleSaveFactura}
              onDeleteFactura={handleDeleteFactura}
              onOpenConfig={() => setIsConfigOpen(true)}
              onSetGlobalLoading={setGlobalLoading}
              isGlobalLoading={globalLoading.activo}
              onUploadToDrive={handleUploadToDrive}
            />
          )}

          {activeTab === 'proveedores' && (
            <ProveedoresView
              proveedores={proveedores}
              facturas={facturas}
              datosNegocio={datosNegocio}
              onUploadToDrive={handleUploadToDrive}
              onDeleteFactura={handleDeleteFactura}
            />
          )}

          {activeTab === 'precios' && (
            <EvolucionPreciosView
              facturas={facturas}
            />
          )}

          {activeTab === 'alertas' && (
            <AlertasView
              alertas={alertas}
              onResolverAlerta={handleResolverAlerta}
              onIgnorarAlerta={handleIgnorarAlerta}
              onReactivarAlerta={handleReactivarAlerta}
              onVerFactura={(id) => {
                setActiveTab('facturas');
              }}
              facturas={facturas}
              onActualizarAlertas={(nuevas) => {
                setAlertas(nuevas);
                fetch('/api/mysql/sync-alertas', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ alertas: nuevas }),
                }).catch(() => {});
              }}
            />
          )}

          {activeTab === 'iva' && (
            <ErrorBoundary fallbackTitle="Error al cargar el panel de IVA y Fiscalidad" onReset={() => setActiveTab('resumen')}>
              <IvaView
                facturas={facturas}
                onOpenConfiguracion={(tab) => handleOpenConfig((tab as any) || 'fiscalidad')}
                onNavigateToModelos={() => setActiveTab('modelos-fiscales')}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'modelos-fiscales' && (
            <ErrorBoundary fallbackTitle="Error al cargar los Modelos Fiscales AEAT" onReset={() => setActiveTab('resumen')}>
              <ModelosFiscalesView
                facturas={facturas}
                onOpenConfiguracion={() => handleOpenConfig('fiscalidad')}
              />
            </ErrorBoundary>
          )}

          {activeTab === 'analisis-ia' && (
            <AnalisisIAView
              analisis={analisis}
              facturas={facturas}
              proveedores={proveedores}
              alertas={alertas}
              datosNegocio={datosNegocio}
              onOpenPdfReport={() => setIsPdfReportOpen(true)}
              onUpdateAnalisis={setAnalisis}
            />
          )}
        </div>
      </main>

      {/* Natural Language Query Chat Assistant (Gemini) */}
      <ChatFacturasModal
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        facturas={facturas}
        proveedores={proveedores}
        alertas={alertas}
        datosNegocio={datosNegocio}
      />

      {/* 9-Page Printable Executive PDF Report */}
      <InformePdfModal
        isOpen={isPdfReportOpen}
        onClose={() => setIsPdfReportOpen(false)}
        facturas={facturas}
        proveedores={proveedores}
        alertas={alertas}
        analisis={analisis}
        datosNegocio={datosNegocio}
      />

      {/* Configuration & Google Drive / Server Connections Modal */}
      <ConfiguracionModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        initialTab={configInitialTab}
        config={sheetsConfig}
        onSaveConfig={handleSaveConfig}
        onResetData={handleResetData}
        onSyncFacturas={() => sincronizarFacturasDesdeBD(true)}
        theme={theme}
        onSetTheme={setTheme}
        datosNegocio={datosNegocio}
        onSaveDatosNegocio={handleSaveDatosNegocio}
      />
    </div>
  );
}
