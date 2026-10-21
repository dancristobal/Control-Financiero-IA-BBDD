# Plan de Transformación a ERP Financiero e Impositivo Completo (Finance AI Enterprise)

Este documento detalla la arquitectura, el alcance funcional y el plan de implementación paso a paso para evolucionar Finance AI hacia un **ERP Financiero, Contable y Fiscal integral para empresas y autónomos en España**, incorporando el ciclo completo Order-to-Cash (Ingresos, Clientes, Facturación Emitida y Cobros), la conciliación fiscal de IVA Repercutido vs Soportado y la Cuenta de Resultados (P&L / EBITDA).

---

## 1. Arquitectura de Datos DB-First (Nuevas Tablas en MySQL / MariaDB)

Para soportar de manera relacional el ciclo completo de ingresos y tesorería sin perder la robustez DB-First, se ampliará el esquema relacional con tablas normalizadas:

1. **`clientes` (Directorio de Clientes / Receptores):**
   - `id_cliente` (VARCHAR 64, PK)
   - `nombre_cliente` (VARCHAR 255)
   - `cif` (VARCHAR 50)
   - `contacto` (VARCHAR 255)
   - `direccion` (TEXT)
   - `volumen_ventas_anual` (DECIMAL 12,2)
2. **`facturas_emitidas` (Facturación de Ingresos - Ventas):**
   - `id_factura` (VARCHAR 100, PK)
   - `fecha_emision` (DATE)
   - `id_cliente` (VARCHAR 64)
   - `nombre_cliente` (VARCHAR 255)
   - `concepto` (TEXT)
   - `base_imponible` (DECIMAL 12,2)
   - `tipos_iva` (VARCHAR 50) -- e.g., '21%', '10%', '4%', '0%'
   - `cuota_iva` (DECIMAL 12,2) -- IVA Repercutido
   - `aplica_retencion_irpf` (BOOLEAN)
   - `tipo_retencion_irpf` (VARCHAR 50)
   - `cuota_irpf` (DECIMAL 12,2)
   - `total` (DECIMAL 12,2)
   - `estado` (ENUM: 'Emitida', 'Cobrada', 'Vencida', 'Anulada')
   - `fecha_cobro` (VARCHAR 50)
   - `verifactu_hash` (VARCHAR 255) -- Hash encadenado para cumplimiento reglamento facturación digital AEAT
3. **`lineas_factura_emitida` (Desglose de Artículos / Servicios de Venta):**
   - `id` (INT, PK, AUTO_INCREMENT)
   - `id_factura` (VARCHAR 100, FK)
   - `nombre_producto` (VARCHAR 255)
   - `cantidad` (DECIMAL 10,2)
   - `precio_unitario` (DECIMAL 12,4)
   - `subtotal` (DECIMAL 12,2)
4. **`movimientos_bancarios` (Conciliación Bancaria):**
   - `id_movimiento` (VARCHAR 100, PK)
   - `fecha` (DATE)
   - `concepto` (TEXT)
   - `importe` (DECIMAL 12,2)
   - `tipo` (ENUM: 'Ingreso', 'Gasto')
   - `estado_conciliacion` (ENUM: 'Pendiente', 'Conciliado')
   - `id_factura_asociada` (VARCHAR 100) -- Enlace con factura emitida o recibida

---

## 2. Módulos Funcionales a Desarrollar

### Módulo 1: Facturación de Ingresos y Cobros (Order-to-Cash)
- **Gestión de Clientes:** Altas, edición, NIF/CIF, volumen de ventas y riesgo de impago.
- **Facturas Emitidas:** Editor de facturas de venta con cálculo automático de IVA Repercutido, retenciones IRPF a clientes, numeración por series y previsualizador PDF.
- **Seguimiento de Cobros:** Control de cobros pendientes, vencidos y cobrados con notificaciones y marcas de fecha de cobro.

### Módulo 2: Impuestos, Contabilidad y Liquidación Fiscal (AEAT)
- **Modelo 303 (IVA):** Cuadro de liquidación neta donde se contrasta el **IVA Soportado** (gastos) frente al **IVA Repercutido** (ingresos), calculando la cuota a ingresar o a devolver a la AEAT.
- **Modelo 130 / 111 / 115:** Cuadro de rendimiento neto (Ingresos - Gastos deducibles) para el IRPF trimestral de autónomos.
- **Modelo 347:** Declaración anual de operaciones con terceros que superen los 3.005,06 € (tanto proveedores como clientes).

### Módulo 3: Analítica Financiera y Cuenta de Resultados (P&L / EBITDA)
- **Cuenta de Pérdidas y Ganancias (P&L):** Ingresos Brutos de Explotación menos Gastos Operativos de Aprovisionamiento y Estructura, obteniendo el **Margen Bruto**, **EBITDA** y **Resultado Neto**.
- **Dashboard Directivo de Tesorería:** Flujo de caja neto (Cobros - Pagos), ratio de rotación de clientes/proveedores y previsión de liquidez a 30, 60 y 90 días.

---

## 3. Plan de Ejecución por Fases (Ficheros y Componentes)

1. **Fase 1: Tipos y Base de Datos (Backend y Tipado)**
   - Actualizar `src/types.ts` con interfaces para Clientes y Facturas Emitidas.
   - Ampliar `src/db.ts` con las tablas relacionales `clientes`, `facturas_emitidas`, `lineas_factura_emitida` y `movimientos_bancarios`.
   - Añadir endpoints REST en `server.ts` para CRUD de clientes y facturas emitidas.
2. **Fase 2: Vistas de Frontend**
   - Crear `src/components/ClientesView.tsx` (Directorio de clientes).
   - Crear `src/components/IngresosView.tsx` (Gestor de facturas de venta y cobros).
   - Crear `src/components/FormularioFacturaEmitidaModal.tsx` (Alta/Edición de ingresos).
   - Actualizar `src/components/IvaView.tsx` y `src/components/ModelosFiscalesView.tsx` para integrar IVA Repercutido y balance fiscal real.
   - Crear `src/components/CuentaResultadosView.tsx` (P&L / EBITDA).
3. **Fase 3: Integración en Barra Lateral y Resumen Ejecutivo**
   - Actualizar `src/components/Sidebar.tsx` con accesos a Ingresos/Ventas y Cuenta de Resultados.
   - Actualizar `src/components/ResumenView.tsx` para mostrar Ingresos vs Gastos y Tesorería Neta.
   - Validar compilación (`compile_applet`) y tipado (`lint_applet`).
