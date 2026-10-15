# AGENTS.md — Developer & AI Agent Operations Manual
## Finance AI — Sistema Integral de Control Financiero Inteligente

> **Documento para Agentes Autónomos e Ingenieros de Software**  
> **Versión del Sistema:** 2.4.0  
> **Fecha de Actualización:** Octubre 2026  
> **Propósito:** Guía técnica canónica, invariantes de dominio contable/fiscal, mapa de componentes, especificación de APIs y directrices operativas para cualquier agente de IA o desarrollador que modifique este repositorio.

---

## 1. Visión del Producto y Principios Rectores

**Finance AI** es una plataforma web full-stack de control financiero empresarial, auditoría de costes de aprovisionamiento y liquidación fiscal española (AEAT).

### Principios Inquebrantables del Sistema
1. **DB-First como Única Fuente de Verdad:**
   - La base de datos relacional (**MySQL / MariaDB en puerto 3306**) es la fuente autoritativa.
   - Si MySQL no está disponible de inmediato (ej. XAMPP detenido), el backend cuenta con persistencia duradera en disco (`/tmp/enterprise_server_store.json`) y datos iniciales de contingencia en `src/data/mockData.ts`.
2. **Cero Tolerancia al Error Fiscal Español:**
   - Todo cálculo de facturación debe cuadrar al céntimo bajo la fórmula matemática oficial:
     $$\text{Total Líquido} = \text{Base Imponible} + \text{Cuota IVA} + \text{Cuota RE} - \text{Cuota IRPF}$$
   - Se admite una tolerancia de redondeo máxima de $\pm 0.02\ \text{€}$ para absorber discrepancias de software de terceros.
3. **Ingesta Inteligente Multimodal (IDP):**
   - Procesamiento de facturas y tickets mediante Gemini 2.5 Flash (`@google/genai`) con esquemas JSON estructurados tanto para documentos (PDF, PNG, JPG) como para fotos tomadas con webcam.
4. **Auditoría Proactiva y Lógica Protectora (Guardian Banner):**
   - Los filtros temporales nunca deben ocultar silenciosamente alertas críticas activas (impagos, vencimientos, sobrecostes no pactados).
5. **Observabilidad en Tiempo Real:**
   - Monitor continuo de latencia (`ping`) en milisegundos hacia MySQL con indicadores cromáticos y guía de resolución para errores como `ECONNREFUSED`.

---

## 2. Estructura del Repositorio y Mapa de Archivos

```text
/
├── AGENTS.md                         # Este documento canónico de operaciones
├── Documentos/                       # Documentación funcional y PRDs
│   ├── PRD_FINANCE_AI_MASTER_PROMPT_V1.md
│   ├── PRD_FINANCE_AI_MASTER_PROMPT_V2.md
│   └── PRD_FINANCE_AI_MASTER_PROMPT_V3.md
├── api/                              # Rutas Serverless para Vercel
│   ├── index.ts
│   └── [...path].ts
├── public/                           # Activos estáticos públicos
├── server.ts                         # Servidor Express Full-Stack (Entry point dev & prod)
├── src/
│   ├── main.tsx                      # Punto de entrada React 19
│   ├── App.tsx                       # Orquestador raíz: estado DB-First, tema y modales
│   ├── db.ts                         # Conector MySQL/MariaDB (mysql2/promise) y consultas DDL/DML
│   ├── index.css                     # Directivas globales de Tailwind CSS v4 (@import "tailwindcss";)
│   ├── types.ts                      # Tipos e interfaces canónicas TypeScript
│   ├── api/
│   │   └── sync.ts                   # Helpers cliente para peticiones REST a /api/*
│   ├── components/                   # Vistas principales y componentes de UI
│   │   ├── ResumenView.tsx           # Cuadro de mando ejecutivo y previsión de tesorería
│   │   ├── FacturasView.tsx          # Gestor de facturas con ordenación dinámica y visor
│   │   ├── ProveedoresView.tsx       # Directorio y análisis de dependencia/concentración
│   │   ├── EvolucionPreciosView.tsx  # Histórico de precios de compra, inflación y sobrecoste
│   │   ├── AlertasView.tsx           # Centro de alertas con Banner Guardián protector
│   │   ├── IvaView.tsx               # Desglose trimestral de IVA, IGIC, IPSI y Recargos
│   │   ├── ModelosFiscalesView.tsx   # Simuladores oficiales AEAT (303, 130, 111, 115, 347)
│   │   ├── AnalisisIAView.tsx        # Diagnóstico de 5 líneas, 3 acciones y chat financiero
│   │   ├── Sidebar.tsx               # Barra de navegación lateral con contador de alertas
│   │   ├── MySQLStatusIndicator.tsx  # Píldora de estado de latencia de BD en cabecera
│   │   ├── FacturaDetalleModal.tsx   # Inspección completa de factura y líneas de producto
│   │   ├── FormularioFacturaModal.tsx# Formulario de alta/edición con verificación de cuadre
│   │   ├── CamaraFacturaModal.tsx    # Captura fotográfica con webcam para escaneo OCR
│   │   ├── VisorFacturaModal.tsx     # Visor split-screen (documento vs formulario)
│   │   ├── ConfiguracionModal.tsx    # Panel integral de configuración y descarga SQL
│   │   ├── ConfiguracionAlertasModal.tsx # Calibración de umbrales de alerta
│   │   ├── ConfiguracionFiscalTab.tsx    # Parámetros tributarios y ejercicio fiscal
│   │   ├── CategoriasGastoModal.tsx  # Editor de categorías de gasto y colores
│   │   ├── ChatFacturasModal.tsx     # Ventana emergente de chat contable con IA
│   │   ├── EliminarFacturaModal.tsx  # Modal de confirmación con borrado transaccional
│   │   ├── InformePdfModal.tsx       # Exportador formateado de informes ejecutivos
│   │   ├── TipoImpositivoModal.tsx   # Selector rápido de regímenes impositivos
│   │   ├── GlobalLoadingBar.tsx      # Barra de progreso superior reactiva
│   │   └── ErrorBoundary.tsx         # Protección contra caídas de renderizado
│   ├── data/
│   │   └── mockData.ts               # Facturas, proveedores y alertas base para contingencia
│   └── utils/
│       ├── fiscalidad.ts             # Motor de cálculo de impuestos, retenciones y recargos
│       ├── modelosFiscales.ts        # Fórmulas de liquidación de modelos de la AEAT
│       ├── alertasConfig.ts          # Evaluación de subidas de precio y persistencia de alertas
│       ├── parametrosSistema.ts      # Ejercicio fiscal activo, umbrales y tipos permitidos
│       ├── categoriasGasto.ts        # Catálogo predeterminado y persistencia de categorías
│       ├── sheetDataSync.ts          # Integración con Google Sheets / Apps Script
│       ├── sqlGenerator.ts           # Exportador DDL/DML para MariaDB/MySQL
│       ├── formatters.ts             # Formateo de moneda (€), porcentajes y fechas
│       └── theme.ts                  # Persistencia de tema Dark / Light
├── package.json                      # Scripts de compilación y dependencias
├── tsconfig.json                     # Configuración TypeScript estricta
├── vite.config.ts                    # Configuración de Vite 6 con Tailwind v4
└── vercel.json                       # Configuración de despliegue serverless
```

---

## 3. Stack Tecnológico y Comandos de Ejecución

### 3.1. Versiones y Tecnologías Clave
- **Frontend:** React 19.0.1, TypeScript 5.8.2, Vite 6.2.3, Tailwind CSS 4.1.14.
- **Visualización y Gráficos:** Recharts 3.10.1.
- **Iconografía:** Lucide React 0.546.0.
- **Backend / Runtime:** Node.js 22.x, Express 4.21.2, TypeScript con `tsx 4.21.0`.
- **Motor de Base de Datos:** `mysql2 3.24.5` (`mysql2/promise`) con soporte para MySQL 8+ y MariaDB 10.x.
- **IA Generativa:** `@google/genai 2.4.0` invocando Gemini 2.5 Flash con salida JSON estricta (`application/json`).

### 3.2. Scripts de Desarrollo (`package.json`)
```bash
# Iniciar entorno de desarrollo unificado (Express + Vite middlewares en puerto 3000)
npm run dev

# Compilar para producción (Frontend Vite + Bundle Express con esbuild)
npm run build

# Validar tipado y sintaxis en todo el proyecto
npm run lint

# Iniciar servidor en producción
npm run start
```

---

## 4. Invariantes de Dominio y Reglas Contables (España / AEAT)

Cualquier cambio de código realizado por un agente debe respetar estrictamente estas reglas contables:

### 4.1. Fórmula de Conciliación Matemática de Facturas
```typescript
Total = BaseImponible + CuotaIVA + CuotaRecargoEquivalencia - CuotaRetencionIRPF;
```
- **Tolerancia:** Si `|TotalCalculado - TotalDocumento| <= 0.02`, el sistema acepta la factura y ajusta por redondeo comercial.
- **Si la discrepancia supera $\pm 0.02\ \text{€}$:** Se bloquea el guardado automático y se marca en rojo avisando de descuadre impositivo.

### 4.2. Tipos Impositivos Oficiales
| Tipo de Impuesto | Porcentajes Válidos | Ámbito de Aplicación |
|---|---|---|
| **IVA General** | `21%` | Bienes y servicios estándar en Península y Baleares. |
| **IVA Reducido** | `10%` | Hostelería, alimentos elaborados, agua, transporte. |
| **IVA Superreducido** | `4%` (o temporal `0%` / `2%` / `7.5%`) | Alimentos básicos (pan, leche, huevos, fruta). |
| **IGIC Canario** | `0%`, `3%`, `7%` (general), `9.5%`, `15%` | Islas Canarias. |
| **IPSI** | `0.5%` a `10%` | Ceuta y Melilla. |
| **Recargo de Equivalencia** | `5.2%` (para 21%), `1.4%` (para 10%), `0.5%` (para 4%) | Minoristas en régimen especial de recargo. |
| **Retención IRPF** | `15%` (profesional), `7%` (nuevo autónomo), `19%` (alquiler) | Facturas recibidas de profesionales o locales alquilados. |

### 4.3. Modelos Tributarios de la AEAT
- **Modelo 303:** Autoliquidación periódica de IVA soportado deducible clasificado en operaciones interiores corrientes y bienes de inversión.
- **Modelo 130:** Estimación directa de IRPF para autónomos (cálculo del 20% del rendimiento neto trimestral).
- **Modelo 111:** Retenciones dinerarias practicadas a profesionales independientes y trabajadores.
- **Modelo 115:** Retenciones dinerarias sobre rentas procedentes del arrendamiento de inmuebles urbanos.
- **Modelo 347:** Declaración informativa de operaciones con terceras personas que superen de forma anual los **3.005,06 €**.

### 4.4. Regla de Concentración de Proveedores (Matriz ABC)
Si las facturas acumuladas de un único proveedor en el ejercicio superan el **30% del gasto global**, el sistema debe marcarlo automáticamente como `Riesgo de Dependencia: Alto` y emitir una alerta en el centro de avisos.

### 4.5. Auditoría de Precios e Inflación de Insumos
- **Umbral de Subida Moderada:** $\ge 8.00\%$ de incremento sobre la compra anterior del mismo artículo.
- **Umbral de Subida Crítica:** $\ge 15.00\%$ de incremento.
- Se debe calcular tanto el porcentaje de subida como el **impacto económico en euros** (`Sobrecoste = Cantidad * (PrecioNuevo - PrecioAnterior)`).

### 4.6. Lógica Protectora del Centro de Alertas (Guardian Banner)
- El selector de periodos de alertas (`AlertasView.tsx`) debe iniciar por defecto en **"Todas (Recomendado)"**.
- Si el usuario selecciona un rango temporal específico (ej. "7 días"), el sistema debe calcular si existen alertas activas de nivel **crítica** o **alta** fuera de ese rango.
- En caso afirmativo, se debe renderizar de manera obligatoria el **Banner Guardián** avisando al usuario de que hay alertas graves ocultas y ofreciendo un botón de 1 clic para restablecer la vista.

---

## 5. Esquema de Base de Datos (MySQL / MariaDB)

Para garantizar compatibilidad universal con distribuciones clásicas de **XAMPP (MariaDB 10.4+)** y **MySQL 8.x**, las estructuras dinámicas se persisten en campos de texto `LONGTEXT` serializados en JSON.

```sql
-- Identidad de la Empresa
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
);

-- Proveedores Homologados
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
  creado_en TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Facturas y Asignación Impositiva
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
  INDEX idx_factura_fecha (fecha_emision),
  INDEX idx_factura_proveedor (id_proveedor),
  INDEX idx_factura_estado (estado)
);

-- Artículos y Desglose de Líneas de Compra
CREATE TABLE IF NOT EXISTS lineas_factura (
  id INT PRIMARY KEY AUTO_INCREMENT,
  id_factura VARCHAR(100) NOT NULL,
  nombre_producto VARCHAR(255) NOT NULL,
  cantidad DECIMAL(10,2) NOT NULL DEFAULT 1.00,
  unidad VARCHAR(50) DEFAULT 'ud',
  precio_unitario DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  CONSTRAINT fk_lineas_factura FOREIGN KEY (id_factura) REFERENCES facturas (id_factura) ON DELETE CASCADE
);

-- Alertas y Registro de Anomalías
CREATE TABLE IF NOT EXISTS alertas (
  id VARCHAR(64) PRIMARY KEY,
  tipo VARCHAR(64) NOT NULL,
  nivel ENUM('critica', 'alta', 'media', 'informativa') DEFAULT 'media',
  titulo VARCHAR(255) NOT NULL,
  descripcion TEXT NOT NULL,
  fecha DATE NOT NULL,
  estado ENUM('activa', 'resuelta', 'ignorada') DEFAULT 'activa',
  datos_relacionados LONGTEXT
);

-- Registro Longitudinal de Precios
CREATE TABLE IF NOT EXISTS historico_precios (
  id INT PRIMARY KEY AUTO_INCREMENT,
  nombre_producto VARCHAR(255) NOT NULL,
  id_proveedor VARCHAR(64) NOT NULL,
  nombre_proveedor VARCHAR(255) NOT NULL,
  id_factura VARCHAR(100) NOT NULL,
  fecha DATE NOT NULL,
  precio_unitario DECIMAL(12,4) NOT NULL,
  unidad VARCHAR(50) DEFAULT 'ud'
);
```

---

## 6. Catálogo de Endpoints REST del Backend (`server.ts`)

| Método | Endpoint | Parámetros / Body | Descripción |
|---|---|---|---|
| `GET` | `/api/health` | - | Estado del servidor, configuración de Gemini y Sheets. |
| `GET` | `/api/mysql/ping` | - | Latencia en milisegundos (`SELECT 1`). |
| `GET` | `/api/mysql/status` | - | Conectividad, latencia, tablas y recuento de registros. |
| `POST` | `/api/mysql/config` | `{ host, port, user, password, database }` | Actualiza la conexión a MySQL en caliente. |
| `GET` | `/api/mysql/export-sql` | - | Descarga el script SQL DDL completo compatible con MariaDB/MySQL. |
| `GET` | `/api/facturas` | - | Lista todas las facturas directamente desde MySQL. |
| `POST` | `/api/facturas` | `Factura` | Inserta o actualiza una factura con sus líneas transaccionalmente. |
| `DELETE` | `/api/facturas/:id` | - | Elimina factura y líneas en cascada. |
| `PATCH` | `/api/facturas/:id/estado` | `{ estado: 'Pagada' \| 'Pendiente' \| 'Vencida' }` | Modifica estado de pago de la factura. |
| `GET` | `/api/proveedores` | - | Directorio consolidado de suministradores. |
| `GET` | `/api/alertas` | - | Listado de alertas registradas en base de datos. |
| `PATCH` | `/api/alertas/:id/estado` | `{ estado: 'activa' \| 'resuelta' \| 'ignorada' }` | Actualiza el estado de una alerta. |
| `POST` | `/api/gemini/extract-invoice` | `{ imageBase64, mimeType }` | Extracción OCR inteligente mediante Gemini 2.5 Flash. |
| `POST` | `/api/gemini/analisis-ejecutivo` | `{ facturas, datosNegocio }` | Diagnóstico de 5 líneas y 3 acciones estratégicas cuantificadas. |
| `POST` | `/api/gemini/chat` | `{ message, history, facturasContext }` | Asistente de conversación financiera con contexto contable. |
| `GET` | `/api/parametros-sistema` | - | Recupera el ejercicio fiscal y umbrales vigentes. |
| `POST` | `/api/parametros-sistema` | `ParametrosSistema` | Actualiza parámetros y emite eventos de sincronización. |
| `POST` | `/api/sheets/save-invoice` | `Factura` | Sincronización dual en Google Sheets y réplica en MySQL. |
| `POST` | `/api/sheets/upload-to-drive` | `{ fileName, base64, folderId }` | Almacenamiento del archivo de justificante en Google Drive. |

---

## 7. Directrices Operativas para Agentes de Código

Cuando implementes cambios o nuevas funcionalidades en este repositorio, cumple con las siguientes directrices:

### 7.1. Reglas de Modificación de Código
1. **No romper la reactividad de eventos del navegador:**
   - La aplicación sincroniza vistas cruzadas mediante `CustomEvent`:
     ```typescript
     window.dispatchEvent(new CustomEvent('facturasActualizadas', { detail: { facturas } }));
     window.dispatchEvent(new CustomEvent('parametrosSistemaActualizados', { detail: nuevosParametros }));
     window.dispatchEvent(new CustomEvent('categoriasGastoActualizadas', { detail: nuevasCategorias }));
     ```
   - Si creas o editas componentes que muten facturas o parámetros, debes disparar y escuchar estos eventos para mantener la paridad entre pestañas sin recargar.
2. **Selector de Periodos Sincronizado:**
   - Si agregas una vista con desglose temporal, debe implementar las mismas 6 opciones canónicas:
     `'7d'` (7 días), `'30d'` (30 días), `'trim'` (Trimestre), `'ano'` (Año Fiscal parametrizado), `'custom'` (Rango) y `'todos'` / `'todas'`.
3. **Ordenación en Tablas:**
   - Los encabezados de tabla deben utilizar indicadores dinámicos `ArrowUp` (ascendente) o `ArrowDown` (descendente) de Lucide React, en lugar de iconos genéricos estáticos.
4. **Diseño y Estilo (Tailwind CSS v4):**
   - La aplicación utiliza una base temática oscura (*Dark Mode First* con soporte claro).
   - Los importes monetarios deben formatearse con clase `font-mono` y función `formatearMoneda(valor)`.
   - No usar estilos en línea (`style={{...}}`) salvo para coordenadas absolutas dinámicas de gráficos.
5. **Tipado Estricto:**
   - No usar `any` superfluo. Todas las entidades deben importar y extender las definiciones de `src/types.ts`.
6. **Verificación Posterior a Cambios:**
   - Antes de dar por finalizada una tarea, el agente debe ejecutar `compile_applet` o `lint_applet` para garantizar que la compilación de Vite y el tipado de TypeScript se mantengan limpios sin errores.
