# Plan Integral: Facturación Order-to-Cash, Fiscalidad AEAT y Analítica Financiera Ejecutiva (P&L, EBITDA y Tesorería)

Este plan detalla la arquitectura, experiencia de usuario y modelo de datos relacional para transformar el sistema actual de gestión de gastos y proveedores en una solución financiera empresarial completa que abarca el ciclo integral de ingresos (Order-to-Cash), cumplimiento fiscal normativo oficial (AEAT) y cuadro de mando directivo para toma de decisiones ejecutivas.

---

## Decisiones Críticas y Confirmaciones del Usuario

> [!IMPORTANT]
> **Decisiones confirmadas por el usuario en la fase de clarificación:**
> 1. **Módulo Order-to-Cash**: Se implementará soporte dual para creación manual ágil y extracción OCR inteligente mediante Gemini de facturas emitidas, con gestión completa de cartera de clientes y control del ciclo de cobros y conciliación.
> 2. **Fiscalidad y Cumplimiento Normativo**: Automatización completa de la liquidación de IVA (IVA Repercutido de clientes vs. IVA Soportado de proveedores), confección y cálculo automático de los Modelos Tributarios Oficiales de la AEAT (303, 130, 111, 115, 347) y generación del Libro Oficial de Registro de Facturas Expedidas y Recibidas según normativa española.
> 3. **Cuadro de Mando Directivo**: Métricas ejecutivas de alto impacto integrando Estado de Pérdidas y Ganancias (P&L completo), Margen Neto %, EBITDA operativo y Previsión de Tesorería (Cash Flow Forecast a 30, 60 y 90 días) para alertar sobre tensiones de liquidez.

---

## 1. Visión General y Concepto Central

### Qué Resuelve
Actualmente, el sistema gestiona con alta precisión las facturas de compra/gastos y proveedores (Procure-to-Pay). Sin embargo, un negocio real requiere visibilidad bidireccional: tanto lo que gasta como lo que ingresa y cobra. Al integrar el flujo de **Ingresos y Clientes (Order-to-Cash)**, la aplicación permite:
- Conocer la rentabilidad neta real (Ingresos vs Gastos).
- Automatizar la liquidación de IVA real (IVA Repercutido en ventas menos IVA Soportado en compras).
- Confeccionar declaraciones fiscales oficiales de la Agencia Tributaria (Modelos 303 e IRPF Modelo 130) sin errores manuales.
- Proyectar la liquidez operativa (cobros pendientes de clientes vs pagos pendientes a proveedores) mediante un motor de tesorería a 30, 60 y 90 días.

### Audiencia Objetivo
Dirección general, directores financieros (CFOs), controllers de gestión, administradores y autónomos/pymes societarias que necesitan control riguroso de su facturación, cumplimiento tributario oficial en España y dashboards directivos claros sin fricción técnica.

---

## 2. Experiencia de Usuario y Diseño Visual

### Flujos Clave de Usuario
1. **Emisión y Registro de Facturas a Clientes (Order-to-Cash)**:
   - El usuario puede subir una factura emitida (PDF o imagen escaneada) para que Gemini extraiga automáticamente cliente, NIF, líneas de venta, base, IVA repercutido y retención, o bien utilizar el nuevo formulario de alta rápida de factura de venta.
   - El ciclo de cobro permite marcar cobros parciales o totales, asociar fecha real de ingreso bancario y monitorear vencimientos de cobro con alertas preventivas.
2. **Liquidación Fiscal y Libros Oficiales AEAT**:
   - Pestaña unificada de **Fiscalidad e Impuestos**: visualización clara del IVA Repercutido (ventas) frente al IVA Soportado (compras), arrojando el resultado de liquidación del periodo (a ingresar o a compensar).
   - Panel de **Modelos Tributarios**: cálculo automático de casillas de los Modelos 303 (IVA), 130 (IRPF estimación directa), 111 (Retenciones personal/profesionales), 115 (Arrendamientos) y 347 (Declaración anual de operaciones con terceros > 3.005,06 € clasificadas por clientes y proveedores).
   - Generador y exportador del **Libro Registro Oficial de Facturas Expedidas y Recibidas** en formato normativo (Real Decreto 1619/2012) listo para inspecciones o auditorías contables.
3. **Analítica Financiera y Dashboards Directivos (P&L, EBITDA, Cash Flow)**:
   - Panel directivo con selector de ejercicio y rango temporal:
     - **P&L Estructurado**: Ingresos Operativos $\rightarrow$ Costes Directos / Consumo $\rightarrow$ Margen Bruto $\rightarrow$ Gastos de Explotación (OPEX) $\rightarrow$ **EBITDA** $\rightarrow$ Amortizaciones $\rightarrow$ EBIT $\rightarrow$ Impuestos $\rightarrow$ **Beneficio y Margen Neto %**.
     - **Previsión de Tesorería a 30, 60 y 90 días**: Comparativa gráfica de entradas esperadas vs salidas comprometidas, con detección proactiva de descalces de caja y días críticos de tesorería.

### Identidad Visual y Sistema de Diseño (Directrices SaaS Enterprise)
- **Filosofía**: Diseño limpio y funcional siguiendo la disciplina *Zero-Pill* y tipografía tabular para métricas financieras (`font-mono tabular-nums`). Cero micro-etiquetas decorativas artificiales y jerarquía tipográfica rigurosa.
- **Paleta de Colores y Modo Oscuro/Claro**:
  - Fondo Canvas: `#080c14` (dark) / `#f8fafc` (light).
  - Superficies y Paneles: `#0d131f` (dark) / `#ffffff` (light) con sutiles bordes de 1px (`border-slate-800/80` o `border-slate-200`).
  - Semántica Financiera:
    - Verde Esmeralda (`#10b981` / `#059669`): Ingresos, Cobros completados, Saldos positivos y Margen neto favorable.
    - Rosa/Carmesí (`#f43f5e` / `#e11d48`): Gastos, Proveedores, Pagos vencidos y Riesgo de liquidez.
    - Azul Índigo (`#6366f1` / `#4f46e5`): IVA, Impuestos e indicadores de EBITDA operativo.
    - Ámbar (`#f59e0b`): Facturas pendientes de cobro/pago próximas a vencer.
- **Tipografía**: `Plus Jakarta Sans` para titulares y navegación ejecutiva; `Inter` o sans-serif neutral para cuerpo; y `JetBrains Mono` / `font-mono tabular-nums` para importes numéricos, bases imponibles y casillas oficiales tributarias.

---

## 3. Decisiones de Producto y Arquitectura

### Decisión 1: Unificación del Modelo de Facturas (Ingresos vs Gastos) con Tipología Nativa
- **Enfoque Adoptado**: Ampliar la tabla relacional `facturas` en MySQL y la interfaz `Factura` en TypeScript con el atributo `tipo_factura: 'gasto' | 'ingreso'` (por defecto `'gasto'` para garantizar compatibilidad retroactiva total con las facturas existentes).
- **Razón**: Permite compartir el motor de almacenamiento relacional, historial de cambios, líneas de producto y análisis OCR de Gemini, simplificando la sincronización y habilitando comparativas inmediatas de Ingresos vs Gastos en una sola consulta SQL optimizada.
- **Alternativa Descartada**: Crear una tabla y módulo totalmente aislados (`facturas_ingreso`), lo cual duplicaría el 90% del código de tablas, validaciones, modal de edición y exportación a PDF.

### Decisión 2: Creación de Directorio Relacional de Clientes
- **Enfoque Adoptado**: Introducir la tabla `clientes` (análoga a `proveedores`) con campos: `id_cliente`, `nombre_cliente`, `cif`, `email`, `telefono`, `direccion`, `dias_pago_habituales`, `volumen_facturado` y `riesgo_morosidad`.
- **Razón**: Permite vincular de forma relacional cada factura emitida con su cliente, calcular concentración de ventas y plazos medios de cobro (DSO - Days Sales Outstanding).

### Decisión 3: Motor de Tesorería Basado en Vencimientos y Estados Reales
- **Enfoque Adoptado**: El cálculo de la Previsión de Tesorería se alimenta de:
  - Saldo de tesorería inicial configurable (en datos del negocio).
  - Entradas proyectadas: Facturas de ingreso en estado `'Pendiente'` agrupadas por su `fecha_vencimiento`.
  - Salidas proyectadas: Facturas de gasto en estado `'Pendiente'` agrupadas por su `fecha_vencimiento`.
  - Simulación temporal a 30, 60 y 90 días con proyección acumulada de liquidez y aviso de descubierto.

---

## 4. Arquitectura Técnica y Estrategia de Datos

### Diagrama de Arquitectura de la Solución

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                             FRONTEND (React SPA)                           │
│                                                                             │
│  ┌───────────────────────┐  ┌───────────────────────┐  ┌─────────────────┐ │
│  │   Order-to-Cash       │  │   Fiscalidad & AEAT   │  │  Dashboard CFO  │ │
│  │  - Facturas Emitidas  │  │  - IVA Reper. vs Sop. │  │  - P&L Dinámico │ │
│  │  - Directorio Clientes│  │  - Mod. 303/130/111.. │  │  - EBITDA Calc  │ │
│  │  - Control de Cobros  │  │  - Libro Registro Ofic│  │  - Tesorería 90d │ │
│  └───────────┬───────────┘  └───────────┬───────────┘  └────────┬────────┘ │
│              │                          │                       │          │
│              └──────────────────────────┼───────────────────────┘          │
│                                         │                                  │
│                               ▼ REST API Endpoints                         │
├─────────────────────────────────────────────────────────────────────────────┤
│                          BACKEND (Node.js / Express)                        │
│                                                                             │
│  • /api/facturas (GET/POST/DELETE) [Filtro tipo: gasto | ingreso]           │
│  • /api/facturas/:id/cobro (PATCH para registrar cobro y fecha)             │
│  • /api/clientes (GET/POST/DELETE)                                          │
│  • /api/fiscalidad/liquidacion-iva (GET cálculo en vivo repercutido vs sop) │
│  • /api/fiscalidad/libro-oficial (GET expedidas / recibidas)                │
│  • /api/analytics/pnl (GET estado de pérdidas y ganancias con EBITDA)       │
│  • /api/analytics/cashflow-forecast (GET proyección tesorería 30/60/90 días)│
│  • /api/gemini/procesar-factura-emitida (OCR multimodal para facturas venta)│
│                                         │                                  │
│                                         ▼                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                         MOTOR RELACIONAL (MySQL)                            │
│                                                                             │
│  ┌─────────────────────────┐  ┌──────────────────────────────────────────┐  │
│  │  facturas (ampliada)    │  │  clientes (nueva tabla relacional)       │  │
│  │  - tipo_factura (ENUM)  │  │  - id_cliente, nombre, cif, contacto...  │  │
│  │  - id_cliente / nombre  │  └──────────────────────────────────────────┘  │
│  │  - estado_cobro         │  ┌──────────────────────────────────────────┐  │
│  │  - fecha_cobro          │  │  declaraciones_aeat (existente)          │  │
│  │  - metodo_cobro_pago    │  │  - modelos 303, 130, 111, 115, 347       │  │
│  └─────────────────────────┘  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Componentes Nuevos y Actualizaciones en el Frontend
1. **`IngresosView.tsx`**: Vista especializada de facturación emitida (ventas a clientes), listado con filtros de estado de cobro (Cobrada, Pendiente, Vencida), exportación y estadísticas rápidas de facturación del periodo.
2. **`ClientesView.tsx`**: Directorio de clientes con cálculo en tiempo real de volumen emitido, cobros pendientes y plazo medio de cobro.
3. **`CobroModal.tsx`**: Modal ágil para registrar cobros totales o parciales, fecha bancaria y medio de pago.
4. **`IvaView.tsx` (Actualizado)**: Liquidación bidireccional completa (IVA Repercutido vs IVA Soportado) con desglose por tramos impositivos (21%, 10%, 4%, RE) y cálculo del resultado neto a ingresar o a devolver.
5. **`LibroOficialView.tsx`**: Visualizador y exportador normativo de los Libros de Registro Oficial de Facturas Expedidas y Recibidas según especificaciones de la Agencia Tributaria.
6. **`DirectivoDashboardView.tsx`**: Panel ejecutivo para gerencia con Estado de Pérdidas y Ganancias (P&L), EBITDA, Margen Neto y gráfico interactivo de Previsión de Tesorería a 30, 60 y 90 días.
7. **`Sidebar.tsx` & `App.tsx`**: Actualización de la navegación para organizar de manera intuitiva los tres pilares (Ingresos, Gastos, Fiscalidad/Modelos, y Dashboard Directivo).
