# DOCUMENTO DE REQUISITOS DE PRODUCTO (PRD) Y MASTER PROMPT
## Finance AI — Sistema Integral de Control Financiero Inteligente

> **Versión:** 2.4.0  
> **Fecha:** Octubre 2026  
> **Propósito:** Especificación funcional, técnica y prompt maestro autocontenido para la recreación completa e idéntica de la aplicación en cualquier entorno o motor de IA.

---

## 1. RESUMEN EJECUTIVO Y VISIÓN DEL PRODUCTO

**Finance AI** es una plataforma web full-stack de control y gestión financiera inteligente dirigida a pequeñas y medianas empresas (pymes), autónomos y directores financieros.

La plataforma resuelve la desconexión típica entre hojas de cálculo operativas, bases de datos relacionales y el cumplimiento tributario, ofreciendo:
1. **Arquitectura Híbrida Dual-Write:** Sincronización bidireccional en tiempo real entre **Google Sheets** (interfaz de usuario accesible para equipos no técnicos) y **MySQL / MariaDB** (persistencia relacional transaccional, ACID, consultas de alto rendimiento y compatibilidad con XAMPP o servidores locales/cloud).
2. **Procesamiento Inteligente de Facturas y Tickets (IDP):** Extracción automatizada de campos mediante **Gemini 2.5 Flash Multimodal** (OCR de facturas en PDF, PNG, JPG, WEBP y captura directa por webcam), desglose de líneas de artículos, bases imponibles, IVA, Recargo de Equivalencia y retenciones de IRPF.
3. **Control Fiscal Español (AEAT):** Liquidación trimestral de IVA/IGIC/IPSI y cálculo automático de los principales modelos tributarios de la Agencia Tributaria española (Modelo 303, Modelo 130, Modelo 111, Modelo 115 y Modelo 347).
4. **Inteligencia Financiera Predictiva y Detección de Anomalías:** Algoritmos heurísticos de detección de facturas duplicadas (exactas y difusas), monitorización de evolución de precios unitarios por producto con alertas de sobrecoste, ratios de dependencia de proveedores y proyección de tesorería a 30/60/90 días.
5. **Asesor Financiero IA y Chat Conversacional:** Diagnóstico ejecutivo automatizado de 5 líneas, priorización de 3 acciones estratégicas de alto impacto con datos cuantitativos, y asistente virtual con contexto financiero integral.
6. **Observabilidad en Tiempo Real:** Monitor visual de latencia de base de datos en milisegundos (`ping` continuo a MySQL/MariaDB) con diagnósticos guiados para resolución de errores (ej. `ECONNREFUSED` de XAMPP).

---

## 2. ARQUITECTURA TECNOLÓGICA Y STACK

### 2.1. Frontend
- **Framework:** React 19 (SPA funcional con Hooks)
- **Lenguaje:** TypeScript 5.8+ (tipado estricto en toda la aplicación)
- **Empaquetador y Dev Server:** Vite 6.x
- **Estilos y Diseño:** Tailwind CSS 4 con soporte para tema Claro y Oscuro (`dark` / `light`), paleta slate/emerald/rose/amber, tipografía legible y microanimaciones con CSS nativo y Lucide Icons.
- **Gráficos y Visualización:** Recharts 3.x (gráficos de áreas para flujo de caja, barras apiladas para gastos mensuales, tartas tipo donut para distribución por categoría y líneas para evolución de precios).
- **Iconografía:** Lucide React (más de 40 iconos contextuales).

### 2.2. Backend y Proxy
- **Servidor:** Node.js 22 con Express 4.x montado vía `tsx server.ts` en desarrollo y empaquetado con `esbuild` en producción.
- **Driver de Base de Datos:** `mysql2/promise` con pool de conexiones gestionado, reconexión automática y detección de fallos de red.
- **IA / LLM:** Google GenAI SDK (`@google/genai`) invocando Gemini 2.5 Flash con salida estrictamente estructurada en formato JSON (`responseMimeType: 'application/json'`).
- **Integraciones:** Google Sheets API REST / Web Apps de Google Apps Script y Google Drive API para almacenamiento de recibos y justificantes.

---

## 3. MODELO DE DATOS Y DEFINICIÓN DE TIPOS (TYPESCRIPT)

```typescript
// Línea individual de artículo dentro de una factura
export interface ProductoLinea {
  nombreProducto: string;
  cantidad: number;
  unidad: string; // 'kg', 'ud', 'litro', 'horas', 'mes', etc.
  precioUnitario: number;
  subtotal: number;
}

// Categorías de gasto configurables
export interface CategoriaGastoDef {
  id: string;
  nombre: string;
  descripcion?: string;
  color: string; // ej: '#f43f5e'
  esPredeterminada?: boolean;
}

// Factura comercial o ticket de gasto
export interface Factura {
  idFactura: string;
  fechaEmision: string; // YYYY-MM-DD
  idProveedor: string;
  nombreProveedor: string;
  concepto: string;
  importe: number; // Base imponible principal
  fechaVencimiento: string;
  estado: 'Pagada' | 'Pendiente' | 'Vencida';
  fechaPago: string;
  baseImponible: number;
  tiposIVA: string; // '21%', '10%', '4%', '0%', 'IGIC 7%', etc.
  cuotaIVA: number;
  regimenFiscal?: string;
  tipoImpuestoNombre?: string; // 'IVA' | 'IGIC' | 'IPSI' | 'Exento'
  aplicaRecargoEquivalencia?: boolean;
  tipoRecargoEquivalencia?: string; // '5.2%', '1.4%', '0.5%'
  cuotaRecargoEquivalencia?: number;
  aplicaRetencionIRPF?: boolean;
  tipoRetencionIRPF?: string; // '15% Profesional', '7% Nuevo Autónomo', '19% Arrendamiento'
  porcentajeIRPF?: number;
  cuotaIRPF?: number;
  total: number; // Total = Base + IVA + RE - IRPF
  categoriaGasto: string;
  categoriaGastoJustificacion?: string;
  categoriaGastoSugerida?: boolean;
  lineas?: ProductoLinea[];
  notas?: string;
  archivoNombre?: string;
  archivoBase64?: string;
  sincronizadoSheets?: boolean;
  driveFileUrl?: string;
  driveFolderUrl?: string;
  driveFileName?: string;
  driveFolderName?: string;
  driveGuardado?: boolean;
  driveError?: string;
}

// Ficha de proveedor y análisis de suministro
export interface Proveedor {
  idProveedor: string;
  nombreProveedor: string;
  productosSuministrados: string;
  importeMensual: number;
  frecuencia: 'Semanal' | 'Quincenal' | 'Mensual' | 'Bimestral' | string;
  riesgoDependencia: 'Bajo' | 'Medio' | 'Alto';
  tiempoMedioEntrega: string;
  cif?: string;
  contacto?: string;
}

// Alertas y anomalías detectadas
export type AlertaTipo =
  | 'POSIBLE DUPLICADO'
  | 'SUBIDA DE PRECIO'
  | 'GASTO INUSUAL'
  | 'NUEVO PROVEEDOR'
  | 'FACTURA VENCIDA'
  | 'CONCENTRACIÓN DE PROVEEDOR';

export type AlertaNivel = 'critica' | 'alta' | 'media' | 'informativa';

export interface Alerta {
  id: string;
  tipo: AlertaTipo;
  nivel: AlertaNivel;
  titulo: string;
  descripcion: string;
  fecha: string;
  estado: 'activa' | 'resuelta' | 'ignorada';
  datosRelacionados?: {
    idFactura?: string;
    facturaExistente?: string;
    archivoNuevo?: string;
    proveedor?: string;
    producto?: string;
    importe?: number;
    variacionPorcentaje?: number;
    precioAnterior?: number;
    precioNuevo?: number;
  };
}

// Datos de identidad fiscal y contexto de negocio
export interface DatosNegocio {
  nombre: string;
  nif: string;
  direccion: string;
  actividad: string;
  sector: string;
  contextoOperativo: string;
  email: string;
  telefono: string;
}
```

---

## 4. ESQUEMA DE BASE DE DATOS RELACIONAL (MARIADB / MYSQL)

Para garantizar compatibilidad universal con **MariaDB 10.x+ (incluidos entornos XAMPP tradicionales)** y **MySQL 8.x**, los campos que almacenan estructuras complejas o colecciones dinámicas se definen como `LONGTEXT` y se gestionan como JSON serializado:

```sql
-- 1. Identidad del Negocio
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

-- 2. Catálogo de Categorías de Gasto
CREATE TABLE IF NOT EXISTS categorias_gasto (
  id VARCHAR(64) PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  descripcion TEXT,
  color VARCHAR(20) DEFAULT '#0ea5e9',
  es_predeterminada BOOLEAN DEFAULT FALSE,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. Directorio de Proveedores
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

-- 4. Facturas y Desglose Impositivo Completo
CREATE TABLE IF NOT EXISTS facturas (
  id_factura VARCHAR(100) PRIMARY KEY,
  fecha_emision DATE NOT NULL,
  id_proveedor VARCHAR(64) NOT NULL,
  nombre_proveedor VARCHAR(255) NOT NULL,
  concepto VARCHAR(500) NOT NULL,
  importe DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  fecha_vencimiento DATE,
  estado ENUM('Pagada', 'Pendiente', 'Vencida') DEFAULT 'Pendiente',
  fecha_pago DATE,
  base_imponible DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  tipos_iva VARCHAR(50) DEFAULT '21%',
  cuota_iva DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  regimen_fiscal VARCHAR(100),
  tipo_impuesto_nombre VARCHAR(50) DEFAULT 'IVA',
  aplica_recargo_equivalencia BOOLEAN DEFAULT FALSE,
  tipo_recargo_equivalencia VARCHAR(50),
  cuota_recargo_equivalencia DECIMAL(12,2) DEFAULT 0.00,
  aplica_retencion_irpf BOOLEAN DEFAULT FALSE,
  tipo_retencion_irpf VARCHAR(100),
  porcentaje_irpf DECIMAL(5,2) DEFAULT 0.00,
  cuota_irpf DECIMAL(12,2) DEFAULT 0.00,
  total DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  categoria_gasto VARCHAR(100) NOT NULL DEFAULT 'Servicios',
  categoria_gasto_justificacion TEXT,
  notas TEXT,
  archivo_nombre VARCHAR(255),
  sincronizado_sheets BOOLEAN DEFAULT FALSE,
  drive_file_url TEXT,
  drive_folder_url TEXT,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_factura_fecha (fecha_emision),
  INDEX idx_factura_proveedor (id_proveedor),
  INDEX idx_factura_estado (estado),
  INDEX idx_factura_categoria (categoria_gasto)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. Líneas de Artículos de Factura
CREATE TABLE IF NOT EXISTS lineas_factura (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_factura VARCHAR(100) NOT NULL,
  nombre_producto VARCHAR(255) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  unidad VARCHAR(50) DEFAULT 'ud',
  precio_unitario DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_lineas_factura (id_factura),
  INDEX idx_lineas_producto (nombre_producto),
  CONSTRAINT fk_lineas_factura FOREIGN KEY (id_factura) REFERENCES facturas (id_factura) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. Centro de Alertas y Anomalías
CREATE TABLE IF NOT EXISTS alertas (
  id VARCHAR(64) PRIMARY KEY,
  tipo VARCHAR(64) NOT NULL,
  nivel ENUM('critica', 'alta', 'media', 'informativa') DEFAULT 'media',
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha DATE NOT NULL,
  estado ENUM('activa', 'resuelta', 'ignorada') DEFAULT 'activa',
  datos_relacionados LONGTEXT, -- Formato JSON serializado compatible con MariaDB/MySQL
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_alertas_tipo (tipo),
  INDEX idx_alertas_estado (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. Histórico de Precios de Insumos
CREATE TABLE IF NOT EXISTS historico_precios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre_producto VARCHAR(255) NOT NULL,
  id_proveedor VARCHAR(64) NOT NULL,
  nombre_proveedor VARCHAR(255) NOT NULL,
  id_factura VARCHAR(100) NOT NULL,
  fecha DATE NOT NULL,
  precio_unitario DECIMAL(12,4) NOT NULL,
  unidad VARCHAR(50) DEFAULT 'ud',
  INDEX idx_hist_producto (nombre_producto),
  INDEX idx_hist_proveedor (id_proveedor),
  INDEX idx_hist_fecha (fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

---

## 5. MÓDULOS Y VISTAS DE LA APLICACIÓN

### 5.1. Barra Lateral (Sidebar) y Cabecera Superior
- **Navegación:**
  - 📊 **Resumen:** Cuadro de mando ejecutivo.
  - 📄 **Facturas:** Gestor maestro con contador dinámico de facturas registradas.
  - 🏢 **Proveedores:** Directorio y análisis de dependencia.
  - 📈 **Evolución Precios:** Monitor de variaciones y sobrecostes.
  - ⚠️ **Alertas:** Centro de avisos con contador dinámico en tiempo real y color diferenciado.
  - 🧾 **IVA:** Control trimestral de bases y cuotas impositivas.
  - 🏛️ **Modelos AEAT:** Módulo fiscal de liquidaciones tributarias (303, 130, 111, 115, 347).
  - ✨ **Análisis IA:** Diagnóstico ejecutivo y recomendaciones estratégicas.
- **Cabecera Superior:**
  - Selector de modo Claro / Oscuro con persistencia en `localStorage`.
  - Píldora de estado de **Google Sheets** (Conectado / Modo Local / Demo).
  - Píldora interactiva de estado de **MySQL / MariaDB** (`MySQLStatusIndicator`):
    - Conectado y óptimo: punto verde con pulso y etiqueta de latencia en ms (ej. `14ms`).
    - Latencia alta: punto amarillo/naranja con valor (ej. `185ms`).
    - Desconectado: punto rojo con texto "MySQL Desconectado" y popover con explicación diagnóstica (ej. avisando de iniciar XAMPP o comprobar puerto 3306).
    - Menú flotante con botón "Probar Ping Ahora", métricas de tablas y enlace a Configuración.
  - Botón de **Acceso a Documentación PRD / Master Prompt** con opciones de copia, descarga e impresión en PDF.
  - Botón "Sincronizar Facturas Ahora" con animación de giro e indicador de progreso.

### 5.2. Vista 1: Resumen (Dashboard Ejecutivo)
- **KPIs Principales:**
  - Gasto Total del Periodo (Base Imponible y Total con Impuestos).
  - Facturas Pendientes de Pago y Vencidas (con desglose de importe en riesgo).
  - IVA Soportado Trimestral acumulado a compensar o liquidar.
  - Total de Proveedores Activos y Concentración del Top 3.
- **Gráficos Recharts:**
  - **Evolución Temporal de Gastos:** Gráfico de áreas y barras apiladas por meses.
  - **Distribución por Categorías de Gasto:** Donut chart interactivo con porcentajes y colores por categoría.
  - **Previsión de Tesorería a 30 / 60 / 90 días:** Simulación de pagos previstos según fecha de vencimiento.
- **Módulos de Alertas Inmediatas:** Top 3 alertas críticas no resueltas con botón de resolución rápida.

### 5.3. Vista 2: Facturas (Gestión Integral y Procesamiento IDP)
- **Filtros Avanzados:** Por rango de fechas, proveedor, estado (Pagada, Pendiente, Vencida), categoría de gasto, tipo de IVA o búsqueda por concepto.
- **Importación y Escaneo Multimodal:**
  - **Subida de Archivos:** Drag & drop de archivos PDF, PNG, JPG y TIFF.
  - **Cámara Web Integrada:** Disparo fotográfico de tickets o facturas físicas en papel con previsualización y recorte automático.
  - **Extracción OCR con Gemini:** Identificación de Proveedor, CIF, Fecha, Número de Factura, Concepto, Base Imponible, Tipo impositivo, Cuotas y Desglose de Líneas de Artículos.
  - **Detección Automática de Duplicados:** Comprobación antes de guardar contra número de factura existente, mismo proveedor con mismo importe en fechas cercanas, o coincidencia hash de archivo.
  - **Sugerencia Inteligente de Categoría:** Clasificación del gasto con justificación contextual de 1 frase.
- **Acciones por Factura:** Ver detalle, abrir visor de documento original, editar campos, marcar pagada, eliminar (con sincronización dual en Sheets y MySQL).
- **Exportación:** Exportar lista a CSV, Excel y PDF formateado.

### 5.4. Vista 3: Proveedores (Directorio y Riesgo)
- Listado de proveedores con desglose de gasto acumulado, periodicidad media y días de entrega.
- Cálculo de **Índice de Concentración:** Alerta automática si un único proveedor representa más del 30% del volumen total de compras.
- Vista detallada de cada proveedor con el histórico de todas sus facturas asociadas y evolución de precios de sus artículos.

### 5.5. Vista 4: Evolución de Precios (Control de Sobrecoste)
- Selector de producto o materia prima.
- Gráfico lineal temporal que muestra el precio unitario pagado a lo largo del tiempo.
- Detección de subidas de precio superiores al umbral configurable (ej. +5% o +10% respecto a la última compra).
- Cálculo monetario del sobrecoste acumulado atribuible a incrementos de precio.

### 5.6. Vista 5: Alertas y Anomalías
- Clasificación por criticidad: Crítica (rojo), Alta (ámbar), Media (amarillo), Informativa (azul).
- Tipologías detectadas:
  - Posible duplicado de factura.
  - Subida imprevista de precio unitario en un artículo frecuente.
  - Gasto inusualmente elevado para una categoría o proveedor.
  - Factura con fecha de vencimiento sobrepasada sin pagar.
  - Facturación procedente de un nuevo proveedor no homologado.
- Estados de alerta: Activa, Resuelta o Ignorada con trazabilidad.

### 5.7. Vista 6: Control de IVA e Impuestos
- Resumen trimestral (T1: Ene-Mar, T2: Abr-Jun, T3: Jul-Sep, T4: Oct-Dic) y anual consolidado.
- Desglose por tipos impositivos: 21% (general), 10% (reducido), 4% (superreducido), 0% / exento, y regímenes especiales (IGIC Canario, IPSI, Recargo de Equivalencia).
- Cuota soportada deducible vs estimación de liquidación.

### 5.8. Vista 7: Modelos Fiscales Oficiales (AEAT)
- **Modelo 303:** Autoliquidación periódica del Impuesto sobre el Valor Añadido (casillas de IVA deducible en operaciones interiores corrientes y bienes de inversión).
- **Modelo 130:** Pago fraccionado del IRPF para autónomos en estimación directa (cálculo del 20% del rendimiento neto trimestral con deducciones aplicables).
- **Modelo 111:** Retenciones aplicadas a profesionales independientes y nóminas (cálculo de bases retenidas al 15% o 7%).
- **Modelo 115:** Retenciones aplicadas en arrendamientos de inmuebles urbanos (retención típica del 19%).
- **Modelo 347:** Declaración anual de operaciones con terceras personas que superen los 3.005,06 € anuales por cliente/proveedor con desglose trimestral.

### 5.9. Vista 8: Asesor Financiero IA y Chat Conversacional
- **Análisis Ejecutivo Automatizado:**
  - Diagnóstico conciso en 5 líneas sobre la salud financiera del negocio.
  - 3 Acciones Recomendadas de Alto Impacto con datos cuantitativos concretos (ej. "Renegociar con Proveedor X para ahorrar Y € al mes").
  - Identificación de riesgos de liquidez y oportunidades de optimización de tesorería.
- **Chat Financiero Integrado:**
  - Conversación libre sobre cualquier duda contable o analítica.
  - Inyección de contexto dinámico: facturas del periodo, facturas vencidas, proveedores con mayor gasto y desgloses fiscales.

---

## 6. ESPECIFICACIÓN DE ENDPOINTS DEL BACKEND (EXPRESS)

| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/health` | Comprobación de salud básica del servidor. |
| `GET` | `/api/mysql/ping` | Medición rápida de latencia (`SELECT 1`) con tiempo en ms. |
| `GET` | `/api/mysql/status` | Estado de conexión, latencia, tablas y recuento de registros en MySQL. |
| `POST` | `/api/mysql/config` | Actualización dinámica de parámetros de conexión a MySQL. |
| `GET` | `/api/mysql/export-sql` | Descarga del script DDL SQL completo compatible con MariaDB/MySQL. |
| `POST` | `/api/gemini/extract-invoice` | Extracción OCR inteligente de factura vía Gemini 2.5 Flash con payload base64. |
| `POST` | `/api/gemini/analisis-ejecutivo` | Generación del diagnóstico financiero de 5 líneas y 3 acciones de alto impacto. |
| `POST` | `/api/gemini/chat` | Asistente de chat financiero con contexto del estado contable. |
| `POST` | `/api/sheets/save-invoice` | Guardado dual de factura en Google Sheets y réplica directa en MySQL. |
| `POST` | `/api/sheets/delete-invoice` | Eliminación dual de factura en Google Sheets y en MySQL. |
| `POST` | `/api/sheets/sync-to-mysql` | Sincronización masiva de todas las facturas de Sheets hacia MySQL. |
| `POST` | `/api/mysql/sync-alertas` | Replicación y persistencia de alertas en la tabla `alertas` de MySQL. |
| `POST` | `/api/sheets/upload-to-drive` | Subida de justificantes de factura a carpetas organizadas en Google Drive. |
| `GET` | `/api/proveedores` | Obtención agregada del directorio de proveedores y condiciones. |
| `GET` | `/api/categorias-gasto` | Obtención de categorías de gasto activas. |
| `POST` | `/api/categorias-gasto` | Creación/actualización de categorías de gasto. |
| `GET` | `/api/prd/download` | Descarga de este documento de especificación y prompt maestro. |

---

## 7. PROMPT MAESTRO REUTILIZABLE (COPY-PASTE READY)

> **Instrucciones de uso:** Copia y pega el siguiente bloque textual dentro de un nuevo proyecto en Google AI Studio o en un asistente de código para regenerar esta aplicación completa desde cero.

```text
Actúa como un Ingeniero de Software Full-Stack Senior y Especialista en Finanzas Corporativas. Tu objetivo es construir desde cero una aplicación completa, funcional y lista para producción llamada "Finance AI — Control Financiero Inteligente".

A continuación tienes todos los requisitos técnicos, de diseño, funcionales y de arquitectura:

1. STACK TECNOLÓGICO:
- Frontend: React 19 (SPA funcional con TypeScript), Vite 6, Tailwind CSS 4 con modo Oscuro/Claro, Recharts para cuadros de mando financieros, y Lucide React para iconografía.
- Backend: Servidor Node.js 22 con Express montado en server.ts ejecutado con tsx.
- Bases de Datos y Almacenamiento: Arquitectura Dual-Write híbrida que sincroniza bidireccionalmente entre Google Sheets (para usuarios de oficina) y MySQL/MariaDB (vía driver mysql2/promise, 100% compatible con XAMPP en localhost:3306 usando campos LONGTEXT para estructuras JSON).
- IA y OCR: Integración con @google/genai usando Gemini 2.5 Flash para extracción de datos de facturas (OCR multimodal de PDF, PNG, JPG y fotos de cámara web), análisis ejecutivo de tesorería y chat contable interactivo.

2. PANTALLAS Y MÓDULOS OBLIGATORIOS:
- 1. Resumen (Dashboard): KPIs ejecutivos (Total gastado, pendientes, vencidas, IVA soportado), gráficos Recharts de flujo de caja, distribución por categorías de gasto y previsión de liquidez a 30/60/90 días.
- 2. Facturas: Listado paginado con filtros avanzados, badges de estado (Pagada, Pendiente, Vencida), subida masiva de archivos con escáner OCR automático, captura directa con webcam, detección de duplicados, visor integrado de documento adjunto y exportación a CSV/Excel/PDF.
- 3. Proveedores: Directorio completo con CIF, volumen mensual acumulado, tiempos de entrega y alerta de concentración si un proveedor supera el 30% del gasto.
- 4. Evolución de Precios: Gráfico comparativo de precios unitarios por artículo a lo largo del tiempo con detección de subidas superiores al umbral y cálculo de sobrecoste acumulado.
- 5. Alertas: Detección heurística de facturas duplicadas, picos inusuales de gasto, facturas vencidas y sobrecostes no pactados.
- 6. Control de IVA: Liquidación trimestral (T1, T2, T3, T4) con desglose por tramos impositivos (21%, 10%, 4%, 0%, IGIC, Recargo de Equivalencia).
- 7. Modelos Fiscales AEAT: Cálculo automático y simuladores de Modelo 303 (IVA), Modelo 130 (IRPF), Modelo 111 (Retenciones profesionales), Modelo 115 (Arrendamientos) y Modelo 347 (Terceros >3.005,06 €).
- 8. Análisis IA y Chat: Diagnóstico ejecutivo en 5 líneas generado por Gemini, 3 acciones recomendadas de alto impacto cuantificadas y chat interactivo con contexto de todas las facturas del negocio.

3. COMPONENTES CLAVE Y OBSERVABILIDAD:
- Indicador visual de latencia de base de datos en la cabecera (MySQLStatusIndicator) con ping en tiempo real (<150ms verde, 150-300ms amarillo, >300ms rojo y diagnóstico amigable ante ECONNREFUSED indicando cómo iniciar XAMPP).
- Modal de configuración integral (ConfiguracionModal) con pestañas para Google Sheets (Spreadsheet ID, Sheet Name), Google Drive (Folder ID), Configuración MySQL/MariaDB (Host, Puerto, Usuario, Password, Base de datos, test de latencia y descarga de script SQL DDL), Categorías de gasto personalizadas con colores, y Configuración Fiscal.
- Modal de documentación y prompt maestro (PrdMasterPromptModal) que permite consultar esta especificación, copiar el prompt con 1 clic, descargarlo en .txt o .md e imprimirlo como PDF formateado.

Entrega código limpio, tipado con TypeScript sin tipos 'any' superfluos, modular, con manejo robusto de excepciones de red y fallbacks fluidos cuando las bases de datos externas no estén disponibles en local.
```

---

## 8. INSTRUCCIONES DE DESPLIEGUE Y PUESTA EN MARCHA LOCAL

1. **Instalación de Dependencias:**
   ```bash
   npm install
   ```
2. **Variables de Entorno (`.env`):**
   ```env
   PORT=3000
   GEMINI_API_KEY=tu_clave_gemini
   MYSQL_HOST=127.0.0.1
   MYSQL_PORT=3306
   MYSQL_USER=root
   MYSQL_PASSWORD=
   MYSQL_DATABASE=finance_ai_db
   GOOGLE_SHEETS_ID=tu_spreadsheet_id
   GOOGLE_DRIVE_FOLDER_ID=tu_folder_id
   ```
3. **Puesta en Marcha de MySQL (XAMPP o Docker):**
   - Inicia el servicio MySQL desde el panel de control de XAMPP.
   - El sistema crea automáticamente la base de datos `finance_ai_db` y todas sus tablas relacionales en el primer arranque si no existen.
4. **Ejecución en Desarrollo:**
   ```bash
   npm run dev
   ```
   Accede a `http://localhost:3000`.
