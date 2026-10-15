Actúa como un Product Manager Senior con amplia experiencia en ingeniería de software. Quiero que generes un Documento de Requisitos de Producto (PRD) exhaustivo y pormenorizado de esta aplicacion. El objetivo de este PRD es documentar a la perfección el estado actual de la plataforma para que cualquier equipo de desarrollo pueda replicarla o trabajar sobre ella sin ambigüedades.
Para ello, estructúralo estrictamente bajo las siguientes secciones detalladas:
Información General del Producto: Visión, objetivos actuales, propuesta de valor y público objetivo.
Arquitectura y stack de Información: Estructura general y flujo del usuario.
Mapeo Detallado de Módulos y Funcionalidades (Épicas e Historias de Usuario): Desglosa cada módulo de la app. Para cada funcionalidad, incluye: Descripción, Criterios de Aceptación (en formato Gherkin: Dado que/Cuando/Entonces), Reglas de Negocio específicas y Casos de Esquina (Edge Cases).
Requisitos de Interfaz de Usuario (UI) y UX: Flujos principales, elementos críticos de la interfaz y comportamiento responsivo.
Requisitos No Funcionales (NFR): Seguridad, rendimiento esperado, escalabilidad y cumplimiento legal (ej. RGPD).
Modelado de Datos: Entidades principales y relaciones lógicas clave.
Para empezar, hazme las preguntas necesarias para recopilar la información que te falte sobre esta aplicacion, o indícame qué datos proporcionarte primero."



# Documento de Requisitos de Producto (PRD)
## Plataforma de Control de Facturas, Proveedores y Auditoría de Costes de Insumos

> **Versión:** 1.0.0-PROD  
> **Fecha de Publicación:** Octubre 2026  
> **Autor:** Senior Product Manager & Staff Software Engineer  
> **Estado:** Documentación Definitiva del Estado Actual (As-Built)  
> **Stack:** React 19 + TypeScript + Vite + Tailwind CSS v4 + Node.js (Express) + MySQL/MariaDB + Google GenAI SDK (`@google/genai`) + Google Sheets/Drive Sync  

---

## 1. Información General del Producto

### 1.1. Visión del Producto
Convertirse en el sistema operativo financiero y de auditoría de compras de referencia para pequeñas y medianas empresas (especialmente en sectores con alta rotación de inventario y volatilidad de precios como la hostelería, restauración, retail y servicios), automatizando la ingesta de documentos contables, la reconciliación impositiva y la detección temprana de sobrecostes ocultos mediante inteligencia artificial.

### 1.2. Objetivos Actuales
* **Digitalización Inmediata:** Eliminar el 90% de la carga manual en la digitalización, transcripción y registro de facturas mediante extracción OCR multimodal estructurada.
* **Protección de Márgenes:** Proteger los márgenes operativos del negocio a través del rastreo continuo del coste unitario de materias primas e insumos entre compras sucesivas y proveedores alternativos.
* **Rigor Fiscal Español:** Garantizar el cuadre contable y fiscal bajo la normativa española (bases imponibles, cuotas de IVA al 4%, 10% y 21%, recargo de equivalencia y retenciones de IRPF).
* **Control Proactivo de Fugas:** Prevenir fugas de capital detectando facturas vencidas, cargos duplicados e incrementos no autorizados en tarifas de proveedores mediante un motor de alertas reactivo con salvaguarda protectora (*Guardian Banner*).

### 1.3. Propuesta de Valor
A diferencia de los ERPs tradicionales (pesados, costosos y orientados a la contabilidad formal) o de las hojas de cálculo (propensas a errores y desarticuladas), esta plataforma ofrece una solución ágil, visual y automatizada, centrada en el control de costes a nivel de línea de producto y en la salud del flujo de caja a corto plazo.

### 1.4. Público Objetivo (User Personas)

* **Gerente / Propietario de Negocio (Hostelería / Retail / Pyme):**  
  Necesita vigilar semanalmente la cuenta de resultados, verificar que los proveedores no incrementen silenciosamente el precio del género y anticipar pagos antes de que venzan.
* **Responsable de Compras / Jefe de Cocina / Encargado de Almacén:**  
  Recibe los albaranes y facturas, necesita cotejar los precios pactados contra los facturados y validar unidades de medida (`kg`, `litros`, `cajas`, `unidades`).
* **Administrador / Asesor Contable:**  
  Exige rigurosidad en los desgloses de bases imponibles y cuotas de IVA para la presentación de los modelos tributarios (Modelo 303, 130, 111, 115, 347 de la AEAT) y la exportación ordenada a Excel/CSV.

---

## 2. Arquitectura y Stack de Información

### 2.1. Arquitectura Técnica
* **Modelo de Aplicación:** Single Page Application (SPA) cliente-pesado en React 19 + TypeScript, compilada y optimizada con Vite.
* **Motor de IA / Visión Multimodal:** `@google/genai` (Gemini 2.5 Flash) para procesamiento de documentos estructurados (PDFs, imágenes JPEG/PNG/WebP/HEIC y capturas de webcam) con extracción JSON guiada por esquema.
* **Motor de Visualización y Gráficos:** Recharts con soporte multivariable (líneas de tendencia, gráficos de dispersión/puntos, distribución Donut/Bar).
* **Estilizado y Sistema de Diseño:** Tailwind CSS v4 con paleta técnica Slate/Rose/Amber optimizada para entornos operativos oscuros (*Dark Mode First*), alto contraste visual y tipografías monoespaciadas para magnitudes numéricas.
* **Capa de Persistencia Híbrida:** 
  1. *Local-First Cache:* Sincronizado mediante bus de eventos del navegador (`CustomEvent`) para latencia cero.
  2. *Base de Datos Relacional:* MySQL / MariaDB (puerto 3306, compatible con XAMPP y servidores en la nube) con pool transaccional.
  3. *Google Sheets & Drive:* Sincronización dual de filas contables y almacenamiento en la nube de documentos adjuntos.

### 2.2. Mapa de Navegación y Flujo de Usuario

```text
┌────────────────────────────────────────────────────────────────────────┐
│                        INGESTA DE FACTURAS                            │
│     (Arrastrar PDF / Imagen / Foto Webcam o Formulario Manual)         │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│               PIPELINE OCR MULTIMODAL CON GEMINI 2.5                   │
│         Extracción estructurada JSON de Cabecera, Impuestos y Líneas   │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                   VALIDACIÓN MATEMÁTICA Y CUADRE                       │
│    (Base + IVA + Recargo - Retención IRPF vs Total | Margen ±0.02€)    │
└───────────────────────────────────┬────────────────────────────────────┘
                                    ▼
┌────────────────────────────────────────────────────────────────────────┐
│                       BANDEJA CENTRAL DE FACTURAS                      │
│               Sincronización Dual: MySQL/MariaDB + Google Sheets       │
└───────┬───────────────────┬───────────────────┬───────────────────┬────┘
        │                   │                   │                   │
        ▼                   ▼                   ▼                   ▼
┌───────────────┐   ┌───────────────┐   ┌───────────────┐   ┌───────────────┐
│  1. RESUMEN   │   │2. PROVEEDORES │   │ 3. EVOLUCIÓN  │   │  4. CENTRO DE │
│     KPIS      │   │  DIRECTORIO   │   │    COSTES     │   │    ALERTAS    │
│  - Gasto neto │   │- Fichas CIF   │   │- Histórico PU │   │- Vencimientos │
│  - Flujo caja │   │- Concentración│   │- Inflación %  │   │- Duplicados   │
│  - Impuestos  │   │- Condiciones  │   │- Umbrales     │   │- Guardián     │
└───────────────┘   └───────────────┘   └───────────────┘   └───────────────┘
```

---

## 3. Mapeo Detallado de Módulos y Funcionalidades (Épicas)

### ÉPICA 1: Ingesta Inteligente y Digitalización (OCR Multimodal)

#### 1.1. Carga y Procesamiento de Facturas
* **Descripción:** Permite a los usuarios cargar facturas en formatos PDF, PNG, JPEG o WebP, así como captura directa mediante webcam. El archivo se transmite al motor multimodal de Gemini para extraer de forma estructurada: emisor, CIF/NIF, número de factura, fecha de emisión, fecha de vencimiento, forma de pago, desglose impositivo y líneas de detalle de artículos.
* **Criterios de Aceptación (Gherkin):**

```gherkin
Escenario: Procesamiento exitoso de factura mediante arrastrar y soltar
  Dado que el usuario tiene un archivo PDF o imagen de factura emitido por un proveedor
  Cuando suelta el documento en la zona de subida o lo selecciona del explorador
  Entonces el sistema muestra un indicador de extracción inteligente
  Y en menos de 5 segundos rellena automáticamente los campos de cabecera, impuestos y tabla de líneas de productos
  Y abre el visor comparativo para su revisión humana.

Escenario: Detección de factura duplicada en la ingesta
  Dado que ya existe una factura en el sistema con CIF "B12345678" y número "FAC-2026-0042"
  Cuando el usuario sube un archivo con los mismos identificadores
  Entonces el sistema emite una alerta crítica de "Factura Duplicada"
  Y bloquea el guardado accidental hasta confirmación explícita del usuario.
```

* **Reglas de Negocio:**
  - Si la fecha de vencimiento no viene explícita en la factura, el sistema calcula: `Fecha Emisión + Días Crédito Habituales del Proveedor` (por defecto 30 días si no está tipificado).
  - Si el documento contiene múltiples tipos de IVA (ej. 4% en leche y 21% en menaje), cada base imponible y cuota debe asociarse a su tramo correspondiente.
* **Casos de Esquina (Edge Cases):**
  - **Facturas manuscritas o albaranes arrugados:** Si la confianza del OCR es baja, el sistema precarga los campos detectados y resalta en amarillo los valores que requieren verificación manual.
  - **Imágenes giradas u orientadas incorrectamente:** El visor dispone de control de rotación de 90°/180°/270° y zoom para facilitar el cotejo.

---

### ÉPICA 2: Gestión y Auditoría de Facturas

#### 2.1. Tabla Interactiva y Reconciliación Fiscal
* **Descripción:** Listado exhaustivo de todas las facturas registradas con ordenación dinámica por encabezados de columna (ID Factura, Fecha, Proveedor, Concepto, Base Imponible, Impuestos, Total Líquido, Categoría) con iconos visuales reactivos `ArrowUp` y `ArrowDown`. Filtrado en tiempo real por estado de pago (pendiente, pagada, vencida), proveedor, rango de fechas y texto libre.
* **Criterios de Aceptación (Gherkin):**

```gherkin
Escenario: Cambio de estado de pago de una factura
  Dado que una factura tiene estado "pendiente" y fecha de vencimiento superada
  Cuando el usuario pulsa sobre la acción "Marcar como Pagada"
  Entonces el estado se actualiza a "pagada"
  Y la alerta de "Factura Vencida" asociada se resuelve automáticamente.

Escenario: Validación del cuadre contable al editar líneas
  Dado que el usuario modifica la cantidad o precio unitario de una línea de compra
  Cuando el sumatorio de bases imponibles más cuotas de IVA no coincide con el total por más de ±0.02€
  Entonces el sistema resalta el descuadre con advertencia de error de redondeo
  Y sugiere el ajuste exacto de la base o la cuota.
```

* **Reglas de Negocio:**
  - **Tolerancia de redondeo:** Se admite una divergencia máxima de ±0.02 € entre el sumatorio de líneas de detalle y el total de la factura, debido a discrepancias en el redondeo intermedio de céntimos en software de facturación comercial.
  - **Exportación tributaria:** Los ficheros generados para Excel deben utilizar delimitador `;` y codificación UTF-8 con BOM para garantizar compatibilidad con hojas de cálculo en castellano y evitar desconfiguración de caracteres especiales (tildes, ñ, €).
* **Casos de Esquina:**
  - **Facturas rectificativas o notas de abono con importes negativos:** El sistema admite importes y bases negativas reflejando la minoración del gasto y del IVA soportado deducible.

---

### ÉPICA 3: Directorio de Proveedores y Concentración de Compras

#### 3.1. Gestión de Proveedores y Evaluación de Riesgo ABC
* **Descripción:** Vista centralizada con las fichas de todos los suministradores, su volumen anual facturado, condiciones contractuales y métricas de dependencia. Incluye el selector de periodos temporal unificado (`7 días`, `30 días`, `Trimestre`, `Año`, `Rango`, `Todas`) y recálculo reactivo del indicador *Total Proveedores*.
* **Criterios de Aceptación (Gherkin):**

```gherkin
Escenario: Alerta de riesgo por concentración excesiva de suministro
  Dado que el gasto total de la empresa en el año es de 100.000 €
  Cuando un único proveedor acumula una facturación superior a 30.000 € (≥ 30% del gasto global)
  Entonces la ficha del proveedor muestra la insignia "Concentración Alta"
  Y se genera una alerta informativa en el centro de control recomendando diversificar fuentes de aprovisionamiento.
```

* **Reglas de Negocio:**
  - Los proveedores no se pueden eliminar si cuentan con facturas históricas vinculadas (para mantener integridad referencial).
  - Cada nuevo CIF/NIF validado se asocia automáticamente a las facturas históricas que compartan dicha razón social.
  - El contador de *Total Proveedores* se actualiza en tiempo real reflejando cuántos proveedores tienen compras activas en el periodo seleccionado.

---

### ÉPICA 4: Evolución de Precios y Auditoría de Insumos

#### 4.1. Seguimiento Temporal de Costes Unitarios y Detección de Inflación
* **Descripción:** Monitorización longitudinal del precio unitario pagado por cada insumo (ej. Solomillo de Ternera kg, Aceite de Oliva Virgen Extra 5L). Permite comparar entre distintos distribuidores y detectar incrementos porcentuales frente a la última compra o frente a la media ponderada del periodo.
* **Criterios de Aceptación (Gherkin):**

```gherkin
Escenario: Detección automática de subida de precio no pactada
  Dado que el precio anterior del "Aceite de Oliva 5L" fue de 30.00 €/unidad
  Cuando se registra una nueva factura donde el mismo artículo figura a 33.60 €/unidad (+12.00%)
  Y el umbral de subida moderada del sistema está configurado en el 8.00%
  Entonces el artículo se resalta con badge ámbar (+12.00%)
  Y se genera automáticamente una alerta de "SUBIDA DE PRECIO" indicando el impacto económico total de la compra.
```

* **Reglas de Negocio:**
  - **Selector de Periodos Temporal:** Cuenta con selector sincronizado (`7 días`, `30 días`, `Trimestre`, `Año Fiscal`, `Rango personalizado`, `Todas`). Al cambiar el periodo:
    - El gráfico interactivo de líneas reescala sus ejes X (fechas) e Y (precios).
    - El cálculo de la variación porcentual se realiza contra la compra cronológicamente anterior dentro del alcance temporal.
  - **Estado Vacío Amigable:** Si un artículo no tiene compras en el periodo seleccionado (ej. últimos 7 días), el sistema lo notifica e invita a restablecer a "Todas las fechas".

---

### ÉPICA 5: Centro de Alertas y Sistema Guardián Protector

#### 5.1. Detección Reactiva de Anomalías y Filtros con Salvaguarda
* **Descripción:** Tablero de auditoría que clasifica y prioriza riesgos: Facturas Vencidas, Duplicados, Descuadres Contables, Concentración y Subidas de Precios.
* **Criterios de Aceptación (Gherkin):**

```gherkin
Escenario: Activación del Banner Guardián al aplicar filtros temporales
  Dado que existen 3 alertas críticas activas correspondientes a facturas del mes anterior
  Cuando el usuario activa el filtro de auditoría a "Últimos 7 días"
  Entonces el listado principal muestra únicamente las alertas de los últimos 7 días
  Y aparece de forma prominente el Banner Guardián Ámbar/Rojo advirtiendo que existen 3 alertas críticas fuera de rango
  Y ofrece el botón "Ver todas las activas" para restablecer la vista con un solo clic.

Escenario: Resolución de alertas al actualizar la factura origen
  Dado que existe una alerta activa por "Factura Vencida"
  Cuando la factura asociada se marca como pagada en FacturasView o en el modal de detalle
  Entonces la alerta pasa a estado "resuelta" con marca temporal de resolución.
```

* **Reglas de Negocio:**
  - El selector de periodos de alertas inicia por defecto en **"Todas (Recomendado)"** para evitar que omisiones temporales generen impagos o recargos de apremio.
  - **Umbrales por defecto:** Subida moderada (≥8%), Subida crítica (≥15%). Modificables en cualquier momento con recálculo dinámico en caliente.

---

### ÉPICA 6: Parámetros del Sistema y Configuración Fiscal

#### 6.1. Calibración Global de Reglas de Negocio
* **Descripción:** Panel de administración donde el usuario ajusta el ejercicio contable de referencia, los tipos impositivos vigentes, los días habituales de pago y los umbrales de sensibilidad de los algoritmos.
* **Criterios de Aceptación (Gherkin):**

```gherkin
Escenario: Modificación del año fiscal de referencia
  Dado que el año fiscal estaba establecido en 2025
  Cuando el usuario lo actualiza a 2026 en los parámetros del sistema
  Entonces todos los selectores de "Año" en Resumen, Proveedores, Precios y Alertas se actualizan a "Año 2026"
  Y los acumulados de gasto anual se recalculan en tiempo real sin recargar la página.
```

---

## 4. Requisitos de Interfaz de Usuario (UI) y UX

### 4.1. Principios de Diseño
* **Claridad Financiera:** Las cifras monetarias utilizan tipografía monoespaciada (`font-mono`) con separador de miles por punto (`.`) y decimales por coma (`,`), seguidos del símbolo monetario (`€`).
* **Código Cromático Semántico:**
  - 🔴 **Rojo/Rose** (`text-rose-400`, `bg-rose-500/20`): Alertas críticas, facturas vencidas, aumentos severos de precio, gastos mayores.
  - 🟡 **Ámbar** (`text-amber-400`, `bg-amber-500/20`): Avisos moderados, facturas pendientes próximas a vencer, advertencias del Banner Guardián.
  - 🟢 **Verde/Emerald** (`text-emerald-400`, `bg-emerald-500/20`): Facturas pagadas, reducciones de precio en insumos, estados contables conciliados.
  - 🔵 **Azul/Sky** (`text-sky-400`, `bg-sky-500/20`): Tipos impositivos, información neutral, insumos estables.

### 4.2. Requisitos de Responsividad
* **Dispositivos Móviles (< 768px):** Menú lateral colapsable, tarjetas de factura apiladas verticalmente con información de emisor, importe y estado en primera vista. Botón de acción flotante (FAB) para subida rápida de fotos de tickets.
* **Tablets y Portátiles (768px - 1280px):** Diseño en cuadrícula de 2 columnas para dashboards y paneles divididos.
* **Monitores de Escritorio (> 1280px):** Visualización dual simultánea (pantalla partida) que permite inspeccionar el documento original a la izquierda y el formulario de líneas a la derecha sin solapamientos.

---

## 5. Requisitos No Funcionales (NFR)

### 5.1. Rendimiento y Eficiencia
* **Tiempo de Carga Inicial (FCP / LCP):** FCP < 0.8s, LCP < 1.5s gracias a la arquitectura cliente Vite y exclusión de frameworks pesados de servidor.
* **Latencia del OCR Multimodal:** Menos de 4.5 segundos para la extracción completa de un documento de hasta 3 páginas o imagen de alta resolución (4K).
* **Reactividad de Filtros:** Filtrado y ordenación de más de 2.000 facturas y 10.000 líneas de producto en menos de 16 milisegundos (60 FPS) mediante memorización (`useMemo`).

### 5.2. Privacidad y Seguridad (RGPD)
* **Arquitectura Local-First:** Los datos fiscales, nombres de proveedores, importes y cuentas bancarias no se almacenan en servidores externos de terceros ni bases de datos no autorizadas; residen en el almacenamiento cifrado del navegador del cliente, en el MySQL/MariaDB controlado por el usuario y en el Google Drive corporativo propio.
* **Tratamiento OCR Ético:** Las solicitudes a la API de Gemini procesan la imagen en memoria exclusivamente durante la llamada de inferencia, sin entrenamiento con datos sensibles de facturación del cliente.

### 5.3. Fiabilidad y Recuperación
* **Respaldo Automático:** Exportación íntegra de la base de datos en formato JSON descargable en 1 clic e importación con validación de esquema para migraciones entre ordenadores.

---

## 6. Modelado de Datos

### 6.1. Entidades Principales y Atributos (TypeScript)

```typescript
// 1. Factura Comercial o Ticket
export interface Factura {
  idFactura: string;               // Identificador único interno (UUID o código oficial)
  numeroFactura?: string;          // Número legal emitido por el proveedor
  idProveedor: string;             // CIF/NIF o ID del proveedor
  nombreProveedor: string;         // Razón social del emisor
  concepto: string;                // Descripción del gasto o servicio
  fechaEmision: string;            // Formato ISO: YYYY-MM-DD
  fechaVencimiento: string;        // Formato ISO: YYYY-MM-DD
  fechaPago: string;               // Fecha efectiva de liquidación
  estado: 'Pagada' | 'Pendiente' | 'Vencida';
  baseImponible: number;           // Importe neto antes de tributos
  tiposIVA: string;                // '21%', '10%', '4%', '0%', 'Exento'
  cuotaIVA: number;                // Cuota total de IVA
  regimenFiscal?: string;          // 'General', 'Recargo de Equivalencia', 'Canario'
  tipoImpuestoNombre?: string;     // 'IVA' | 'IGIC' | 'IPSI' | 'Exento'
  aplicaRecargoEquivalencia?: boolean;
  tipoRecargoEquivalencia?: string;// '5.2%', '1.4%', '0.5%'
  cuotaRecargoEquivalencia?: number;
  aplicaRetencionIRPF?: boolean;
  tipoRetencionIRPF?: string;      // '15% Profesional', '7% Nuevo Autónomo', '19% Alquiler'
  porcentajeIRPF?: number;
  cuotaIRPF?: number;
  total: number;                   // Base + IVA + RE - IRPF
  categoriaGasto: string;          // Categoría asignada
  categoriaGastoJustificacion?: string;
  lineas?: ProductoLinea[];        // Desglose de artículos adquiridos
  archivoNombre?: string;
  driveFileUrl?: string;
  driveFolderUrl?: string;
  notas?: string;
}

// 2. Línea Individual de Artículo (Insumo)
export interface ProductoLinea {
  nombreProducto: string;          // Nombre del producto o servicio
  cantidad: number;                // Volumen adquirido
  unidad: string;                  // 'kg', 'litro', 'ud', 'caja', 'pack'
  precioUnitario: number;          // Precio de compra sin impuestos por unidad
  subtotal: number;                // Subtotal monetario de la línea
}

// 3. Ficha de Proveedor
export interface Proveedor {
  idProveedor: string;             // CIF o identificador canónico
  nombreProveedor: string;         // Razón social
  cif?: string;                    // CIF/NIF validado
  contacto?: string;               // Teléfono / email / persona de contacto
  productosSuministrados: string;  // Resumen de artículos que provee
  importeMensual: number;          // Gasto mensual acumulado
  frecuencia: 'Semanal' | 'Quincenal' | 'Mensual' | 'Bimestral' | string;
  riesgoDependencia: 'Bajo' | 'Medio' | 'Alto';
  tiempoMedioEntrega: string;      // Días medios de entrega
}

// 4. Alerta del Sistema
export interface Alerta {
  id: string;                      // Identificador único
  tipo:
    | 'POSIBLE DUPLICADO'
    | 'SUBIDA DE PRECIO'
    | 'GASTO INUSUAL'
    | 'NUEVO PROVEEDOR'
    | 'FACTURA VENCIDA'
    | 'CONCENTRACIÓN DE PROVEEDOR'
    | 'DISCREPANCIA CONTABLE';
  nivel: 'informativa' | 'media' | 'alta' | 'critica';
  titulo: string;
  descripcion: string;
  fecha: string;                   // Fecha de generación (ISO: YYYY-MM-DD)
  estado: 'activa' | 'resuelta' | 'ignorada';
  datosRelacionados?: {
    idFactura?: string;
    facturaExistente?: string;
    proveedor?: string;
    producto?: string;
    precioAnterior?: number;
    precioNuevo?: number;
    variacionPorcentaje?: number;
    importe?: number;
  };
}

// 5. Parámetros Globales del Sistema
export interface ParametrosSistema {
  anoFiscalReferencia: number;     // Ej: 2026
  tiposIvaPermitidos: number[];    // [4, 10, 21]
  retencionIrpfPorDefecto: number; // 0, 15 (%)
  diasVencimientoDefecto: number;  // 30
  toleranciaDescuadreEuros: number;// 0.02 €
}

// 6. Configuración de Alertas y Sensibilidad
export interface ConfiguracionAlertas {
  umbralSubidaModeradaPct: number; // 8%
  umbralSubidaCriticaPct: number;  // 15%
  diasAvisoVencimiento: number;    // 7 días
  porcentajeAlertaConcentracion: number; // 30%
}
```

---

## 7. Preguntas de Alineación Estratégica (Roadmap v2.0)

Habiendo documentado con exhaustividad el 100% del estado actual del sistema, para continuar con la evolución del producto hacia versiones posteriores, se plantean las siguientes líneas de desarrollo:

1. **Normativa Veri\*factu / Factura Electrónica B2B (Ley Crea y Crece):**  
   ¿Deseas que preparemos la arquitectura de exportación para formatos oficiales estructurados (Facturae 3.2.x XML o encadenamiento criptográfico con código QR de la AEAT)?
2. **Modelo de Autenticación y Multi-Tenancy:**  
   Actualmente el producto funciona en modo LocalFirst + MySQL/Sheets. ¿Se prevé la incorporación de perfiles de usuario con control de acceso RBAC (Administrador, Contable, Revisor de Compras) respaldado por Firebase Auth / PostgreSQL?
3. **Integración con Sistemas Bancarios o ERPs:**  
   ¿Te interesaría definir las historias de usuario para conciliación bancaria automática vía PSD2 / Open Banking (Nordigen/GoCardless) o integración con ERPs contables (A3, Holded, Sage)?