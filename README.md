# Finance AI — Sistema Integral de Control Financiero Inteligente

Plataforma empresarial full-stack para el control financiero, conciliación contable, auditoría de precios de compra, liquidación de impuestos españoles (AEAT) y digitalización inteligente de facturas mediante IA multimodal.

---

## 📋 Tabla de Contenidos

- [Características Principales](#-características-principales)
- [Arquitectura y Tecnologías](#-arquitectura-y-tecnologías)
- [Requisitos Previos](#-requisitos-previos)
- [Instalación y Configuración](#-instalación-y-configuración)
  - [1. Clonar e Instalar Dependencias](#1-clonar-e-instalar-dependencias)
  - [2. Configuración del Entorno (.env)](#2-configuración-del-entorno-env)
  - [3. Configuración de Base de Datos (MySQL / MariaDB)](#3-configuración-de-base-de-datos-mysql--mariadb)
- [Puesta en Marcha](#-puesta-en-marcha)
  - [Modo Desarrollo](#modo-desarrollo)
  - [Compilación y Producción](#compilación-y-producción)
- [Esquema de Base de Datos](#-esquema-de-base-de-datos)
- [Reglas Contables y Fiscales](#-reglas-contables-y-fiscales)
- [Módulos del Sistema](#-módulos-del-sistema)
- [Sincronización con Google Sheets y Drive](#-sincronización-con-google-sheets-y-drive)
- [Scripts Disponibles](#-scripts-disponibles)
- [Estructura del Proyecto](#-estructura-del-proyecto)

---

## 🚀 Características Principales

1. **Ingesta Inteligente de Facturas (IDP con Gemini 3.8 Flash):**
   - Procesamiento OCR inmediato de facturas y tickets en PDF, PNG, JPG o capturas directas desde la webcam (con failover a Gemini 3.1 Flash-Lite).
   - Extracción estructurada: proveedor, NIF/CIF, desglose de bases imponibles, tipos de IVA, retenciones IRPF, recargos de equivalencia y líneas individuales de productos.

2. **Cálculo y Validación Fiscal Española (AEAT):**
   - Fórmula matemática exacta: `Total = Base + IVA + Recargo Equivalencia - Retención IRPF` (tolerancia máxima de redondeo comercial: $\pm 0.02\text{ €}$).
   - Validación en tiempo real del formato oficial de NIF / NIE / CIF con algoritmo de dígitos de control.
   - Simuladores de modelos tributarios oficiales: **Modelo 303** (IVA), **Modelo 130** (IRPF), **Modelo 111** (Retenciones profesionales/nóminas), **Modelo 115** (Arrendamientos) y **Modelo 347** (Terceras personas $> 3.005,06\text{ €}$).

3. **Arquitectura DB-First y Persistencia Relacional Completa (12 Tablas):**
   - Base de datos relacional **MySQL / MariaDB** como fuente canónica de la verdad, eliminando la dependencia exclusiva de `localStorage` y de variables volátiles en memoria RAM para parámetros, categorías, historial de chat, análisis de IA, declaraciones fiscales e integraciones.
   - Esquema consolidado utilizando exclusivamente la tabla `lineas_factura` para el detalle de artículos con clave foránea e integridad referencial en cascada.
   - Persistencia de contingencia automática en disco (`/tmp/enterprise_server_store.json`) si la base de datos externa no se encuentra en línea de inmediato.
   - Monitor continuo de latencia (`ping` en ms) con diagnóstico y guía de resolución en cabecera.

4. **Auditoría de Proveedores y Control de Inflación:**
   - Matriz de concentración ABC: Detección automática de dependencia si un proveedor supera el 30% del gasto total.
   - Histórico de precios por insumo: Detección de subidas de precios ($\ge 8\%$ moderada, $\ge 15\%$ crítica) con cálculo del sobrecoste en euros.

5. **Centro de Alertas con Guardian Banner:**
   - Avisos proactivos de facturas vencidas, descuadres fiscales e incrementos en precios.
   - Lógica de protección: Los filtros temporales no ocultan alertas críticas activas sin advertir al usuario mediante el Banner Guardián.

---

## 🛠️ Arquitectura y Tecnologías

- **Frontend:** React 19, TypeScript, Vite 6, Tailwind CSS v4, Lucide Icons, Recharts.
- **Backend:** Node.js 22, Express 4, `tsx` (desarrollo), `esbuild` (empaquetado de producción).
- **Base de Datos:** MySQL 8+ / MariaDB 10.4+ (`mysql2/promise`).
- **Inteligencia Artificial:** `@google/genai` (Gemini 3.8 Flash como motor principal y Gemini 3.1 Flash-Lite como contingencia, con salida JSON estructurada).

---

## 📦 Requisitos Previos

- **Node.js:** Versión 20.x o 22.x instalada ([descargar Node.js](https://nodejs.org/)).
- **NPM** o gestor de paquetes compatible.
- **MySQL / MariaDB:** Servidor MySQL local (ej. XAMPP, WampServer, Docker o servicio en la nube).
- **Gemini API Key:** Clave de Google AI Studio para las funcionalidades de extracción OCR y análisis financiero con IA ([obtener clave](https://aistudio.google.com/)).

---

## ⚙️ Instalación y Configuración

### 1. Clonar e Instalar Dependencias

```bash
# Navegar al directorio del proyecto
cd finance-ai

# Instalar todas las dependencias
npm install
```

### 2. Configuración del Entorno (.env)

Copia el archivo de plantilla `.env.example` como `.env`:

```bash
cp .env.example .env
```

Edita `.env` con tus credenciales:

```env
# Clave de Gemini AI (requerida para escaneo de facturas y chat contable)
GEMINI_API_KEY="AIzaSy..."

# Parámetros de Conexión MySQL / MariaDB (ej. XAMPP local)
DB_HOST="127.0.0.1"
DB_PORT="3306"
DB_USER="root"
DB_PASSWORD=""
DB_NAME="finance_ai_db"

# Opcional: Integración Google Sheets / Drive
GOOGLE_SHEETS_ID=""
GOOGLE_SHEETS_ENDPOINT_URL=""
GOOGLE_DRIVE_FOLDER_ID=""
```

### 3. Configuración de Base de Datos (MySQL / MariaDB)

1. Inicia tu servicio de MySQL (por ejemplo, desde el panel de control de **XAMPP** pulsando "Start" en MySQL).
2. Crea la base de datos `finance_ai_db`:
   ```sql
   CREATE DATABASE IF NOT EXISTS finance_ai_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. El servidor crea automáticamente las **12 tablas relacionales** requeridas al iniciar (`datos_negocio`, `categorias_gasto`, `proveedores`, `facturas`, `lineas_factura`, `alertas`, `historico_precios`, `configuracion_parametros`, `analisis_financieros_ia`, `historial_chat_ia`, `declaraciones_aeat`, `integraciones_google`).
4. Si prefieres importar el esquema manualmente, puedes descargar el script SQL completo desde la sección **Configuración > Base de Datos > Descargar Script SQL** de la aplicación.

---

## 🚦 Puesta en Marcha

### Modo Desarrollo

Ejecuta el servidor unificado (Express + Vite Middleware en puerto 3000):

```bash
npm run dev
```

Abre tu navegador en:  
👉 **http://localhost:3000**

### Compilación y Producción

Para compilar la aplicación y el bundle de backend:

```bash
# Compilar cliente Vite y servidor Express empaquetado
npm run build

# Iniciar servidor de producción
npm run start
```

---

## 🗄️ Esquema de Base de Datos Relacional Completo (12 Tablas)

La aplicación utiliza un esquema relacional optimizado con claves foráneas e integridad referencial en **MySQL / MariaDB**, eliminando la dependencia exclusiva de `localStorage` y de variables volátiles en memoria RAM:

- **`datos_negocio`**: Perfil de la empresa, NIF, actividad comercial y contexto contable operativo.
- **`categorias_gasto`**: Catálogo de clasificación de gastos con colores distintivos, justificación contable y marcas de predeterminado.
- **`proveedores`**: Directorio de proveedores homologados, CIF, condiciones y nivel de riesgo de concentración (Matriz ABC).
- **`facturas`**: Facturas recibidas/emitidas, bases imponibles, tipos impositivos y estado de cobro/pago.
- **`lineas_factura`**: Detalle individualizado de los productos y servicios adquiridos en cada factura:
  ```sql
  CREATE TABLE IF NOT EXISTS lineas_factura (
    id INT PRIMARY KEY AUTO_INCREMENT,
    id_factura VARCHAR(100) NOT NULL,
    nombre_producto VARCHAR(255) NOT NULL,
    cantidad DECIMAL(10,2) NOT NULL DEFAULT 1.00,
    unidad VARCHAR(50) DEFAULT 'ud',
    precio_unitario DECIMAL(12,4) NOT NULL DEFAULT 0.0000,
    subtotal DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    CONSTRAINT fk_lineas_factura FOREIGN KEY (id_factura) 
      REFERENCES facturas (id_factura) ON DELETE CASCADE
  );
  ```
  *(Nota: Se utiliza exclusivamente `lineas_factura`; la antigua nomenclatura `facturas_lineas` ha sido eliminada por completo).*
- **`alertas`**: Registro de advertencias contables, discrepancias y sobrecostes de insumos.
- **`historico_precios`**: Registro histórico de precios de compra para seguimiento de inflación.
- **`configuracion_parametros`**: Umbrales de subida moderada (8%) y crítica (15%), concentración de proveedores (30%) y días de anticipación de vencimiento.
- **`analisis_financieros_ia`**: Persistencia de diagnósticos ejecutivos (5 líneas, 3 acciones estratégicas y oportunidades de ahorro).
- **`historial_chat_ia`**: Historial conversacional continuo del asistente contable inteligente con sugerencias interactivas.
- **`declaraciones_aeat`**: Registro oficial de modelos fiscales (303, 130, 111, 115, 347) en estados Borrador, Calculado y Presentado con justificante CSV.
- **`integraciones_google`**: Configuración y credenciales de sincronización bidireccional con Google Sheets y Google Drive.

---

## 📐 Reglas Contables y Fiscales

- **Fórmula de Conciliación:**
  $$\text{Total} = \text{Base Imponible} + \text{Cuota IVA} + \text{Cuota Recargo de Equivalencia} - \text{Cuota Retención IRPF}$$
- **Tolerancia:** Si el descuadre es $\le \pm 0.02\text{ €}$, se ajusta por redondeo legal. Descuadres mayores bloquean el guardado automático avisando en rojo.
- **Tipos de IVA soportados:** General (21%), Reducido (10%), Superreducido (4%, 2%, 0%), además de IGIC canario (0%, 3%, 7%, 9.5%, 15%) e IPSI.
- **Recargos de Equivalencia:** 5.2% (para 21%), 1.4% (para 10%) y 0.5% (para 4%).
- **Retenciones IRPF:** 15% (general profesional), 7% (nuevos autónomos) y 19% (alquiler de inmuebles urbanos).

---

## 🧩 Módulos del Sistema

| Módulo | Descripción |
|---|---|
| **Resumen Ejecutivo** | Visión global de ingresos, gastos, tesorería proyectada a 30/60/90 días y métricas principales. |
| **Facturas** | Listado interactivo con ordenación por columnas, filtros temporales, visor split-screen y carga manual o por OCR. |
| **Vencimientos** | Dashboard con calendario interactivo mensual, previsión de liquidez por tramos y lista cronológica de pagos pendientes. |
| **Proveedores** | Matriz ABC de suministradores, volumen de compra anual y porcentaje de concentración de riesgo. |
| **Evolución de Precios** | Gráfico de tendencias por insumo, comparativa de precios entre proveedores y cálculo de sobrecoste acumulado. |
| **Alertas** | Centro de control de anomalías financieras con protección de visibilidad (Guardian Banner). |
| **IVA e Impuestos** | Desglose por trimestres de IVA soportado deducible, recargos y compensaciones. |
| **Modelos Fiscales** | Generación y simulación de los modelos tributarios de la AEAT (303, 130, 111, 115 y 347). |
| **Análisis con IA** | Diagnóstico ejecutivo en 5 líneas, 3 acciones estratégicas cuantificadas y chat contable asistido. |
| **Configuración** | Gestión del NIF del negocio, ejercicio fiscal activo, umbrales de alerta y conexión a MySQL. |

---

## ☁️ Sincronización con Google Sheets y Drive

1. En el panel **Configuración > Google Sheets**:
   - Ingresa la URL o ID de tu hoja de cálculo de Google.
   - Introduce la URL del script de Google Apps Script (`GOOGLE_SHEETS_ENDPOINT_URL`).
   - Introduce el ID de la carpeta de Google Drive donde almacenar los justificantes.
2. Cada factura registrada puede enviarse automáticamente a la pestaña `Facturas` de Google Sheets y archivar su PDF o imagen en Google Drive.

---

## 📜 Scripts Disponibles

| Comando | Función |
|---|---|
| `npm run dev` | Inicia el entorno de desarrollo unificado (servidor Express + frontend Vite en `:3000`). |
| `npm run build` | Compila el frontend Vite y empaqueta el servidor Node en `server.js` y `dist/server.cjs`. |
| `npm run start` | Arranca el servidor Express compilado para producción. |
| `npm run lint` | Comprueba tipos e integridad en todo el proyecto (`tsc --noEmit`). |
| `npm run clean` | Elimina las carpetas y archivos generados en compilación (`dist/`, `server.js`). |

---

## 📁 Estructura del Proyecto

```text
├── AGENTS.md                 # Manual canónico de desarrollo e invariantes
├── README.md                 # Este documento con instrucciones
├── server.ts                 # Servidor backend Express (APIs y middlewares)
├── src/
│   ├── main.tsx              # Entrada React
│   ├── App.tsx               # Componente principal y gestión de estado
│   ├── db.ts                 # Capa de acceso a datos MySQL / MariaDB
│   ├── types.ts              # Definiciones TypeScript de Factura, Líneas, etc.
│   ├── components/           # Vistas y modales de la interfaz de usuario
│   ├── data/                 # Datos mock de contingencia
│   └── utils/                # Lógica contable, fiscalidad AEAT y validaciones
├── public/                   # Recursos estáticos
├── package.json              # Dependencias y scripts
└── tsconfig.json             # Configuración TypeScript estricta
```

---

## 🛡️ Licencia y Uso

Sistema desarrollado para control financiero empresarial y gestión fiscal privada. Todos los derechos reservados.
