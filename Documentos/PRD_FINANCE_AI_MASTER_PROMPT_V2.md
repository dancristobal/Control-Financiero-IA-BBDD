# PARTE 1: DOCUMENTO DE REQUISITOS DE PRODUCTO (PRD)

---

# Documento de Requisitos de Producto (PRD)
## Finance AI — Sistema Integral de Control Financiero, Fiscal y Facturación Inteligente

- **Versión:** 2.4.0  
- **Estado:** Aprobado para Producción / Regeneración  
- **Público objetivo:** Pymes, Autónomos, Obradores y Asesorías Financieras  
- **Stack tecnológico:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Node.js (Express) + MySQL/MariaDB + Google GenAI SDK (`@google/genai`) + Google Sheets/Drive Sync  

---

## 1. Visión del Producto y Objetivos Estratégicos

### 1.1 Declaración de Misión
**Finance AI** es una plataforma web full-stack de control financiero empresarial y gestión fiscal diseñada para transformar el flujo de trabajo de compras, gastos y facturación. Automatiza la captura documental mediante visión e inteligencia artificial multimodal (Gemini), elimina el riesgo de errores fiscales en IVA, Recargo de Equivalencia e IRPF, detecta de forma autónoma anomalías de costes y duplicidades, pre-cumplimenta los modelos oficiales de la Agencia Tributaria Española (AEAT: 303, 390, 130, 111, 347, 349) y sincroniza bidireccionalmente la información con bases de datos relacionales MySQL y hojas de Google Sheets/Drive.

### 1.2 Principios Rectores del Sistema
- **DB-First y Fuente Única de Verdad:** Los datos se estructuran de manera relacional en MySQL/MariaDB con soporte de persistencia local duradera de respaldo en disco del servidor.
- **Cero Tolerancia al Error Fiscal:** Tratamiento granular y exhaustivo de todos los regímenes tributarios españoles (IVA Peninsular, IGIC Canario, IPSI Ceuta y Melilla, Recargos de Equivalencia y Retenciones de IRPF por actividad o arrendamiento).
- **Automatización Multimodal:** Extracción de datos de facturas en PDF, escaneos o fotografías en vivo desde cámara web/móvil con inferencia JSON estructurada mediante Google Gemini.
- **Auditoría e Inteligencia Proactiva:** Detección en tiempo real de subidas de precio por producto, facturas vencidas, concentración de compras en proveedores y discrepancias contables.

---

## 2. Arquitectura Global del Sistema

```text
┌────────────────────────────────────────────────────────────────────────┐
│                   CAPA CLIENTE (REACT 19 SPA)                         │
│  - Sidebar & Router de Estados: Resumen, Facturas, Proveedores,         │
│    Evolución Precios, Alertas, IVA, Modelos AEAT, Análisis IA          │
│  - Modales: Detalle, Edición/Manual, Cámara OCR, Visor Split-Screen,   │
│    Categorías, Tipo Impositivo, Parámetros, Configuración, Chat RAG    │
│  - Recharts + Tailwind CSS v4 + Lucide Icons + Theme (Dark/Light)      │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │ HTTP / JSON REST APIs
┌───────────────────────────────────▼────────────────────────────────────┐
│                  CAPA SERVIDOR (EXPRESS + TSX/NODE)                    │
│  - Endpoints REST (/api/facturas, /api/proveedores, /api/alertas, etc.)│
│  - Gemini Engine (@google/genai): Extracción OCR, Asesor Chat, Report  │
│  - Google Workspace Relay: Google Sheets Sync + Drive Folders          │
│  - Generador de scripts DDL/DML SQL para exportación e inicialización  │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
          ┌─────────────────────────┴─────────────────────────┐
          ▼                                                   ▼
┌───────────────────────────────────┐       ┌──────────────────────────────────┐
│   BASE DE DATOS RELACIONAL        │       │  ALMACENAMIENTO DE SEGURIDAD     │
│   MySQL / MariaDB Connection Pool │       │  Persistencia no volátil en      │
│   (Tablas transaccionales)        │       │  disco del servidor + Mock Data  │
└───────────────────────────────────┘       └──────────────────────────────────┘
```

---

## 3. Modelo de Entidades y Esquema de Datos

### 3.1 Entidad Factura
- **`idFactura`** (`string`, PK): Identificador o código oficial de la factura emitida por el emisor.
- **`fechaEmision`** (`ISO date string`): Fecha de devengo de la operación.
- **`fechaVencimiento`** (`ISO date string`): Fecha acordada para el cobro/pago.
- **`fechaPago`** (`ISO date string | null`): Fecha efectiva de abono.
- **`estado`** (`'Pagada' | 'Pendiente' | 'Vencida'`): Estado de tesorería.
- **`idProveedor`** (`string`, FK): Código o NIF del proveedor.
- **`nombreProveedor`** (`string`): Razón social o denominación comercial.
- **`concepto`** (`string`): Resumen o descripción de la compra/servicio.
- **`baseImponible`** (`number`): Base imponible dineraria antes de tributos.
- **`tiposIVA`** (`string`): Régimen aplicado (`'21%'`, `'10%'`, `'4%'`, `'0%'`, `'2%'`, `'5%'`, `'7.5%'`, `'IGIC 7%'`, `'Exento'`, etc.).
- **`cuotaIVA`** (`number`): Importe resultante de la aplicación de la tasa impositiva.
- **`regimenFiscal`** (`string`): Régimen aplicable (`'Régimen General Peninsular'`, `'IGIC Canario'`, `'Recargo de Equivalencia'`, `'Exento'`, etc.).
- **`tipoImpuestoNombre`** (`'IVA' | 'IGIC' | 'IPSI' | 'Exento'`).
- **`aplicaRecargoEquivalencia`** (`boolean`): Flag de recargo para comerciantes minoristas.
- **`tipoRecargoEquivalencia`** (`string | null`): `'5.2%'`, `'1.4%'`, `'0.5%'`, `'0.62%'`, `'0.7%'`.
- **`cuotaRecargoEquivalencia`** (`number`): Base * Tasa RE.
- **`aplicaRetencionIRPF`** (`boolean`): Flag de retención a cuenta en origen.
- **`tipoRetencionIRPF`** (`string | null`): `'15% Profesional'`, `'7% Nuevo Autónomo'`, `'19% Arrendamiento'`, `'2% Agrario'`.
- **`porcentajeIRPF`** (`number`): Valor porcentual (ej. 15).
- **`cuotaIRPF`** (`number`): Base * (porcentaje / 100).
- **`conceptoRetencionIRPF`** (`'PROFESIONAL' | 'ARRENDAMIENTO' | 'AGRARIO' | null`).
- **`total`** (`number`): Total Líquido a Pagar = `Base + Cuota Impuesto + Cuota RE - Cuota IRPF`.
- **`categoriaGasto`** (`string`): Asignación a categoría de coste operativa.
- **`categoriaGastoJustificacion`** (`string`): Justificación generada por el motor de categorización.
- **`lineas`** (`Array<ProductoLinea>`): Desglose de partidas (`nombreProducto`, `cantidad`, `unidad`, `precioUnitario`, `subtotal`).
- **`notas`** (`string | null`): Observaciones contables internas.
- **`archivoNombre` / `archivoBase64` / `archivoRuta`**: Referencia al documento digital soporte.
- **`driveFileUrl` / `driveFolderUrl`**: Enlaces directos a Google Drive.
- **`sincronizadoSheets`** (`boolean`): Bandera de exportación a Google Sheets.

### 3.2 Entidad Proveedor
- **`idProveedor`** (`string`, PK): NIF/CIF o identificador del proveedor.
- **`nombreProveedor`** (`string`): Razón social.
- **`productosSuministrados`** (`string`): Catálogo de partidas suministradas habitualmente.
- **`importeMensual`** (`number`): Volumen económico mensual medio.
- **`frecuencia`** (`'Semanal' | 'Quincenal' | 'Mensual' | 'Bimestral' | string`).
- **`riesgoDependencia`** (`'Bajo' | 'Medio' | 'Alto'`): Cálculo automático basado en volumen relativo sobre el gasto global de la empresa.
- **`tiempoMedioEntrega`** (`string`): Plazo promedio de suministro.
- **`cif`** (`string`): NIF/CIF fiscal.
- **`contacto`** (`string`): Correo, teléfono o interlocutor.

### 3.3 Entidad Alerta
- **`id`** (`string`, PK): Identificador UUID.
- **`tipo`**: `'POSIBLE DUPLICADO' | 'SUBIDA DE PRECIO' | 'GASTO INUSUAL' | 'NUEVO PROVEEDOR' | 'FACTURA VENCIDA' | 'CONCENTRACIÓN DE PROVEEDOR' | 'DISCREPANCIA RESUMEN'`.
- **`nivel`**: `'critica' | 'alta' | 'media' | 'informativa'`.
- **`titulo`** (`string`): Encabezado escueto de la alerta.
- **`descripcion`** (`string`): Detalle explicativo con importes y variaciones porcentuales.
- **`fecha`** (`ISO date string`): Fecha de detección.
- **`estado`**: `'activa' | 'resuelta' | 'ignorada'`.
- **`datosRelacionados`** (`objeto JSON`): Claves específicas (`idFactura`, `precioAnterior`, `precioNuevo`, `variacionPorcentaje`, etc.).

### 3.4 Entidades de Soporte
- **`CategoriaGastoDef`**: `id`, `nombre`, `descripcion`, `color` (hex), `esPredeterminada`.
- **`ParametrosSistema`**: Umbrales de precios (moderado 8%, crítico 15%), tolerancia de vencimiento, paginación por defecto, año fiscal de referencia, IVA predeterminado y retenciones activas.
- **`DatosNegocio`**: Nombre fiscal, NIF, domicilio social, actividad, sector, contexto operativo, email y teléfono.
- **`DeclaracionAeat`**: Historial de liquidaciones con casillas tributarias persistidas para Modelos 303, 390, 130, 111, 347 y 349.

---

## 4. Módulos Funcionales Detallados

### 4.1 Módulo Resumen (Dashboard Ejecutivo)
- **Filtros Temporales Universales:**
  - `7 días`, `30 días`, `Trimestre actual`, `Año 2026` (o año fiscal activo), `Rango de fechas manual` y `Todas`.
- **Tarjetas KPI Superiores:**
  - Gasto Total Bruto y Neto.
  - Total Facturas contabilizadas.
  - Proveedores con facturación activa en el intervalo.
  - Facturas Pendientes de Pago y Vencidas.
  - Ticket medio por factura.
  - IVA Soportado Deducible total.
- **Componentes Gráficos (Recharts):**
  - Donut Chart interactivo de distribución por Categoría de Gasto con paleta cromática dinámica.
  - Gráfico de barras mensual de evolución de gasto del ejercicio.
  - Ranking Top 5 Proveedores por volumen.
- **Módulo de Detección de Discrepancias:**
  - Verificación reactiva automática entre facturas en BD y las filtradas en pantalla, activando alerta inmediata si se detecta desfase.

### 4.2 Módulo Facturas (Gestión y Procesamiento OCR)
- **Tabla Interactiva de Alta Densidad:**
  - Columnas sortables con clic en encabezado: *ID Factura*, *Fecha*, *Proveedor*, *Concepto*, *Base Imp.*, *Impuestos / RE / IRPF*, *Total Líquido*, *Categoría*.
  - Indicadores visuales de ordenación reactivos: flecha ascendente (`ArrowUp`) o descendente (`ArrowDown`) coloreada en la columna activa; `ArrowUpDown` atenuado en columnas inactivas.
  - Paginación dinámica (10, 25, 50, 100 registros por página).
  - Filtros combinados en vivo: buscador de texto libre, selector de proveedor, selector de estado y selector de categoría.
- **Procesamiento de Documentos e IA:**
  - Drag-and-drop de archivos múltiples (PDF, PNG, JPG, WEBP).
  - Integración nativa de cámara web/móvil para digitalización de tickets físicos en tiempo real.
  - Extracción OCR multimodal mediante endpoint `/api/gemini/extract-invoice` que ejecuta el modelo Gemini con schema tipado estricto (recuperando base, tipo IVA, cuotas, retención IRPF, recargo de equivalencia, líneas de producto y categorización automática basada en el contexto del negocio).
  - Detección inmediata de duplicados en la cola de subida antes de guardar.
- **Visor y Auditoría:**
  - Modal de detalle completo con desglose línea a línea de impuestos.
  - Modal de visor de documento en pantalla dividida (side-by-side) para cotejar el PDF/imagen contra los datos extraídos por la IA.
  - Modal de edición manual con selector de tipos impositivos estándar y especiales.

### 4.3 Módulo Proveedores
- Directorio completo de proveedores con tarjeta de métricas por entidad.
- Conteo dinámico sincronizado `Total Proveedores: X (de Y)` según los filtros de tiempo, búsqueda y nivel de riesgo.
- Métricas por proveedor: Total facturado, número de facturas, media de entrega, desglose de impuestos soportados y clasificación de riesgo operativo (Bajo/Medio/Alto).

### 4.4 Módulo Evolución de Precios
- Monitorización de precios unitarios por producto a lo largo del tiempo.
- Gráfico de líneas temporales para detectar subidas de coste en insumos clave (ej. harinas, mantequillas, cajas de embalaje, energía).
- Alertas visuales con badges de variación porcentual (`+X%`) comparando el último precio pagado frente a la media o compra previa.

### 4.5 Módulo de Alertas Inteligentes
- Bandeja de alertas clasificadas por severidad (`crítica`, `alta`, `media`, `informativa`).
- 7 Tipologías activas con resolución y descarte interactivo:
  1. **Posible Duplicado:** Mismo número de factura o coincidencia de proveedor + importe en fechas próximas.
  2. **Subida de Precio:** Incremento unitario superior al umbral configurado (moderado o crítico).
  3. **Gasto Inusual:** Importe que supera en más de 2 desviaciones la media del proveedor o categoría.
  4. **Nuevo Proveedor:** Primera factura emitida por un NIF no catalogado.
  5. **Factura Vencida:** Vencimiento superado sin fecha de pago registrada.
  6. **Concentración de Proveedor:** Cuando un único proveedor aglutina más del 30% del volumen de compras.
  7. **Discrepancia Resumen:** Desincronización entre la tabla física de facturas y los contadores del resumen.
- Modal de configuración de umbrales y tolerancias en tiempo de ejecución.

### 4.6 Módulo de Fiscalidad e IVA
- Cuadro de liquidación de impuestos segregado por trimestres (T1, T2, T3, T4) y acumulado Anual.
- Soporte nativo para:
  - IVA Peninsular (21%, 10%, 4%, tipos temporales 0%, 2%, 5%, 7.5%).
  - Recargo de Equivalencia (5.2%, 1.4%, 0.5%, 0.62%, 0.7%).
  - Retenciones de IRPF (15% profesional, 7% nuevos profesionales, 19% arrendamientos, 2% agrario).
  - IGIC Canario e IPSI Ceuta y Melilla.

### 4.7 Módulo de Modelos Fiscales Oficiales (AEAT)
- Cálculo automático de casillas y generación de liquidaciones para:
  - **Modelo 303:** Autoliquidación periódica de IVA (bases, cuotas devengadas/deducibles, resultado).
  - **Modelo 390:** Resumen anual de IVA.
  - **Modelo 130:** IRPF para empresarios y profesionales en estimación directa (pagos fraccionados del 20%).
  - **Modelo 111:** Retenciones del trabajo y actividades económicas.
  - **Modelo 347:** Declaración anual con terceras personas para proveedores con volumen acumulado superior a 3.005,06 €.
  - **Modelo 349:** Declaración de operaciones intracomunitarias.
- Entrada de datos complementarios editables (ingresos brutos de ventas, nóminas, cuotas de trimestres anteriores) con persistencia en MySQL.

### 4.8 Asistente Financiero AI & Análisis Ejecutivo
- **Análisis Ejecutivo Automático:** Generación de diagnósticos con resumen del estado financiero en 5 líneas, identificación de anomalías, oportunidades de ahorro cuantificadas y 3 acciones de impacto prioritario. Exportable a PDF.
- **Chatbot RAG Financiero:** Asistente conversacional flotante alimentado con el contexto íntegro de las facturas, proveedores y métricas del negocio en tiempo real. Admite preguntas como *"¿Cuánto he pagado en luz este trimestre?", "¿Qué proveedor ha subido más sus precios?" o "¿Qué retención debo declarar en el Modelo 111?"*.

### 4.9 Configuración Global y Sincronización
- **Datos del Negocio:** Personalización del nombre comercial, CIF, dirección y contexto del negocio.
- **Categorías de Gasto:** Creación, edición y eliminación de categorías con selector de color hexadecimal.
- **Google Sheets & Drive:** Configuración de ID de hoja, webhook y carpeta de Drive para archivo automático ordenado por proveedor.
- **MySQL Database:** Monitor de estado de conexión en vivo con ping reactivo, configuración de credenciales (host, user, password, port, database) y generador de script SQL completo DDL/DML para exportación manual.
- **Apariencia:** Conmutador global Dark Mode / Light Mode.

---

# PARTE 2: PROMPT MAESTRO REUTILIZABLE (COPY-PASTE READY)

> **Instrucciones:** Copia íntegramente el bloque de texto delimitado a continuación y pégalo como primer mensaje en un proyecto nuevo de **Google AI Studio Build** o en cualquier asistente de desarrollo de software para recrear esta aplicación completa desde cero.

````markdown
Actúa como un Ingeniero de Software Full-Stack Senior y Arquitecto de Sistemas. Construye una aplicación web completa, profesional, funcional y de nivel de producción llamada "Finance AI — Control Financiero".

La aplicación es un sistema integral de control financiero empresarial, procesamiento inteligente de facturas mediante IA/OCR, auditoría de precios de proveedores, control exhaustivo de fiscalidad española (IVA, Recargo de Equivalencia, Retenciones IRPF) y liquidación de Modelos de la AEAT (303, 390, 130, 111, 347, 349), con arquitectura Full-Stack en React 19 + TypeScript + Vite + Tailwind CSS v4 + Node.js/Express + MySQL relacional.

================================================================================
1. ESPECIFICACIONES TÉCNICAS Y REQUISITOS DE ENTORNO
================================================================================
- Frontend: React 19, TypeScript (~5.8), Vite 6, Tailwind CSS v4 (importado mediante `@import "tailwindcss";` en src/index.css), Lucide React (iconografía), Recharts (gráficos), Motion / Framer Motion (animaciones sutiles).
- Backend: Servidor Express montado en server.ts ejecutándose con tsx en desarrollo ("dev": "tsx server.ts") escuchando en el puerto 3000 con soporte de middlewares de Vite montados para SPA y soporte de bodyParser seguro para subidas en base64 de hasta 50MB.
- IA Multimodal: Integración oficial con @google/genai (Google GenAI TypeScript SDK) usando modelo 'gemini-2.5-flash' para extracción estructurada de facturas (OCR) y análisis financiero. El cliente debe inicializarse con process.env.GEMINI_API_KEY y la cabecera HTTP {'User-Agent': 'aistudio-build'}.
- Base de Datos y Persistencia: Capa DB-First en src/db.ts utilizando 'mysql2/promise' con Connection Pool. Si MySQL no está configurado o no responde, el servidor debe hacer fallback elegante a persistencia no volátil en disco (JSON en storage/) y datos mock ricos de pastelería/obrador artesanal ("Dulce Capricho S.L.", NIF B-82910394).
- Estilo Visual: Dashboard moderno de nivel corporativo en paleta Dark Slate profunda (#0a0f18, #0d131f, #101726) con acentos en Rose (#f43f5e) e indicadores esmeralda/ámbar/azul, tipografía limpia, microinteracciones, bordes sutiles (border-slate-800/80) y soporte alternable a Light Mode.

================================================================================
2. ESTRUCTURA DE ARCHIVOS REQUERIDA
================================================================================
- package.json (con express, @google/genai, mysql2, recharts, lucide-react, motion, tailwindcss v4, vite, tsx)
- server.ts (servidor Express con todas las rutas /api/* y proxy Vite)
- metadata.json (nombre, descripción, requestFramePermissions: ["camera"], majorCapabilities: ["MAJOR_CAPABILITY_SERVER_SIDE_GEMINI_API"])
- src/
  ├── types.ts (todas las interfaces TypeScript completas sin "any")
  ├── db.ts (pool MySQL, creación de tablas DDL, consultas DML, exportador SQL)
  ├── data/mockData.ts (al menos 15 proveedores realistas y más de 30 facturas con desglose fiscal completo y líneas de productos)
  ├── utils/
  │   ├── fiscalidad.ts (cálculos de IVA peninsular, IGIC, IPSI, Recargo de Equivalencia e IRPF)
  │   ├── modelosFiscales.ts (lógica de liquidación y asignación de casillas para modelos 303, 390, 130, 111, 347 y 349)
  │   ├── alertasConfig.ts (motor de evaluación de duplicados, subidas de precios, anomalías y discrepancias)
  │   ├── categoriasGasto.ts (gestión de categorías de gasto y colores)
  │   ├── parametrosSistema.ts (umbrales, preferencias de paginación y tolerancias)
  │   ├── sheetDataSync.ts (transformación de datos para Google Sheets/Drive)
  │   ├── formatters.ts (formato de moneda euro es-ES, fechas dd/mm/yyyy y porcentajes)
  │   └── theme.ts (gestión del tema dark/light)
  ├── components/
  │   ├── Sidebar.tsx (navegación vertical colapsable en móvil con badges de facturas y alertas)
  │   ├── ResumenView.tsx (dashboard de métricas clave, filtros de periodo, gráficos Recharts y aviso de discrepancias)
  │   ├── FacturasView.tsx (tabla de facturas paginada y ordenable por columnas con iconos ArrowUp/ArrowDown, filtros combinados, carga de archivos y cámara)
  │   ├── ProveedoresView.tsx (directorio de proveedores con métricas de riesgo y contador dinámico según filtros)
  │   ├── EvolucionPreciosView.tsx (gráfico histórico de precios unitarios por producto y avisos de incremento)
  │   ├── AlertasView.tsx (centro de alertas con 7 tipologías, resolución y filtrado por nivel)
  │   ├── IvaView.tsx (tabla trimestral y anual de desglose de IVA, RE e IRPF)
  │   ├── ModelosFiscalesView.tsx (simulador y liquidador oficial de Modelos AEAT con inputs de datos adicionales)
  │   ├── AnalisisIAView.tsx (análisis ejecutivo con recomendaciones y exportación a informe PDF)
  │   ├── ChatFacturasModal.tsx (chat interactivo con IA que responde preguntas sobre las facturas cargadas)
  │   ├── FacturaDetalleModal.tsx (modal con desglose exhaustivo de impuestos y líneas de la factura)
  │   ├── FormularioFacturaModal.tsx (creación y edición manual de facturas con cálculo en vivo de totales)
  │   ├── VisorFacturaModal.tsx (visor de PDF/imagen en pantalla dividida contra datos extraídos)
  │   ├── CamaraFacturaModal.tsx (captura en tiempo real con webcam/móvil para OCR inmediato)
  │   ├── ConfiguracionModal.tsx (modal multi-pestaña para Negocio, Categorías, Fiscalidad, Parámetros, Sheets/Drive, MySQL y Script SQL)
  │   ├── ConfiguracionAlertasModal.tsx (ajuste de umbrales porcentuales de subida y concentración)
  │   ├── CategoriasGastoModal.tsx (gestor CRUD de categorías de gasto con paleta de color)
  │   ├── TipoImpositivoModal.tsx (configuración de tipos de IVA y retenciones)
  │   ├── InformePdfModal.tsx (visualizador e impresor de reporte financiero formal)
  │   ├── MySQLStatusIndicator.tsx (badge interactivo de estado de base de datos con test de ping)
  │   └── GlobalLoadingBar.tsx (barra de progreso superior para operaciones en background)
  ├── App.tsx (componente raíz con estado centralizado, toast notifications y sincronización DB-First)
  └── main.tsx & index.css

================================================================================
3. REGLAS ESPECÍFICAS DE DOMINIO Y LÓGICA DE NEGOCIO
================================================================================
1. FISCALIDAD ESPAÑOLA RIGUROSA:
   - Toda factura calcula: Total Líquido = Base Imponible + Cuota Impuesto (IVA/IGIC/IPSI) + Cuota Recargo Equivalencia (si aplica) - Cuota Retención IRPF (si aplica).
   - Tipos de IVA admitidos: General (21%), Reducido (10%), Superreducido (4%), Tipos temporales/alimentación (0%, 2%, 5%, 7.5%), Exento (0%), IGIC Canario (7%, 3%, 9.5%, 15%), IPSI Ceuta/Melilla (0.5%, 1%, 2%, 4%, 8%, 10%).
   - Recargo de Equivalencia configurable: 5.2% (para el 21%), 1.4% (para el 10%), 0.5% (para el 4%), 0.62% o 0.7%.
   - Retenciones de IRPF: 15% (Profesional general), 7% (Nuevos autónomos), 19% (Arrendamiento de inmuebles urbanos), 2% (Actividades agrícolas/ganaderas).

2. MODELOS TRIBUTARIOS AEAT (src/utils/modelosFiscales.ts & ModelosFiscalesView.tsx):
   - Modelo 303: Debe totalizar con precisión las casillas de IVA devengado (si hay ingresos introducidos) y deducible soportado por operaciones interiores corrientes, desglosado por tipos impositivos, cuotas de recargo de equivalencia y resultado de la autoliquidación.
   - Modelo 390: Declaración resumen anual que consolida los cuatro trimestres.
   - Modelo 130: Cálculo del pago fraccionado del 20% del rendimiento neto de la actividad (Ingresos acumulados - Gastos deducibles) minorado por retenciones y pagos de trimestres anteriores.
   - Modelo 111: Retenciones a cuenta de profesionales (número de perceptores, bases de retención y cuotas retenidas acumuladas).
   - Modelo 347: Filtrado automático de todos los proveedores cuya suma total anual de facturas supere los 3.005,06 € (con desglose por trimestres T1, T2, T3, T4 para cada declarado).
   - Modelo 349: Detección y resumen de adquisiciones intracomunitarias exentas en destino.
   - Permitir guardar datos complementarios (ingresos brutos, nóminas, pagos de trimestres previos) en MySQL o localStorage para que las liquidaciones sean 100% exactas.

3. MOTOR OCR CON GEMINI (@google/genai):
   - Endpoint backend POST /api/gemini/extract-invoice recibe el archivo en base64 (PDF o imagen).
   - Utiliza Gemini con schema JSON estricto (`Type.OBJECT`) para extraer: idFactura, fechaEmision, fechaVencimiento, nombreProveedor, cif, concepto, baseImponible, tiposIVA, cuotaIVA, aplicaRecargoEquivalencia, tipoRecargoEquivalencia, cuotaRecargoEquivalencia, aplicaRetencionIRPF, tipoRetencionIRPF, porcentajeIRPF, cuotaIRPF, conceptoRetencionIRPF, total, categoriaGasto recomendada y array de líneas de productos (nombreProducto, cantidad, unidad, precioUnitario, subtotal).
   - Categorización contextual: la IA debe asignar la categoría de gasto basándose en el sector del negocio (obrador/pastelería) y en las categorías registradas en el sistema.

4. TABLA DE FACTURAS Y ORDENACIÓN DINÁMICA (FacturasView.tsx):
   - Permitir ordenar haciendo clic en los encabezados: ID Factura, Fecha, Proveedor, Concepto, Base Imp., Impuestos / RE / IRPF, Total Líquido y Categoría.
   - Indicador visual obligatorio: cuando una columna está ordenada, debe mostrar 'ArrowUp' (si es ascendente) o 'ArrowDown' (si es descendente) en color destacado (text-rose-400). Las columnas no activas deben mostrar 'ArrowUpDown' en tono discreto (text-slate-600).
   - Paginación dinámica ajustable por el usuario (10, 25, 50, 100) y filtros combinables en tiempo real sin recargar.

5. SINCRONIZACIÓN DE FILTROS EN RESUMEN Y PROVEEDORES:
   - ProveedoresView debe contar con el mismo selector de periodos que ResumenView (7 días, 30 días, Trimestre, Año 2026, Rango de fechas, Todas).
   - El badge de "Total Proveedores" en ProveedoresView debe actualizarse reactivamente para reflejar el número de proveedores activos con compras en el periodo seleccionado (ej. "3 (de 15)").

6. DETECCIÓN AUTOMÁTICA DE DISCREPANCIAS Y ALERTAS:
   - El módulo de alertas debe incluir 7 tipos: 'POSIBLE DUPLICADO', 'SUBIDA DE PRECIO', 'GASTO INUSUAL', 'NUEVO PROVEEDOR', 'FACTURA VENCIDA', 'CONCENTRACIÓN DE PROVEEDOR' y 'DISCREPANCIA RESUMEN'.
   - Si existe discrepancia entre el total de facturas de la base de datos y las procesadas o contabilizadas en el panel de resumen, debe generarse una alerta visual de nivel crítico/alto avisando de la desincronización.

7. PERSISTENCIA DB-FIRST Y BACKEND:
   - src/db.ts debe gestionar tablas relacionales: 'facturas', 'lineas_factura', 'proveedores', 'alertas', 'categorias_gasto', 'datos_negocio', 'configuracion_parametros', 'declaraciones_aeat', 'historico_precios' e 'historial_chat'.
   - El backend debe proporcionar endpoints para sincronizar todo, consultar ping, exportar el esquema DDL y un script SQL completo con inserts para que el usuario pueda migrar su base de datos a cualquier servidor MySQL externo.

Entrega el código íntegro, limpio, completamente tipado en TypeScript, sin snippets truncados ni comentarios de "TODO: implementar aquí", listo para compilar con `npm run build` y ejecutarse en vivo.
````