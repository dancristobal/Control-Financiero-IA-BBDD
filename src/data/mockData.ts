import { Factura, Proveedor, Alerta, AnalisisEjecutivo, Cliente, FacturaEmitida } from '../types';

export const INITIAL_CLIENTES: Cliente[] = [
  {
    idCliente: 'CLI-001',
    nombreCliente: 'Distribuciones Hosteleras del Levante S.L.',
    cif: 'B-46123456',
    contacto: 'Ana Belén Martínez',
    direccion: 'Av. del Cid 45, Valencia',
    volumenVentasAnual: 24500.00,
    email: 'pedidos@levantehosteleria.es',
    telefono: '+34 963 112 233'
  },
  {
    idCliente: 'CLI-002',
    nombreCliente: 'Restaurante El Gourmet Mediterráneo S.L.',
    cif: 'B-03987654',
    contacto: 'Carlos Sivera',
    direccion: 'Calle Mayor 12, Alicante',
    volumenVentasAnual: 18200.00,
    email: 'administracion@gourmetmed.com',
    telefono: '+34 965 443 322'
  },
  {
    idCliente: 'CLI-003',
    nombreCliente: 'Catering y Eventos Costa Blanca S.A.',
    cif: 'A-54332211',
    contacto: 'Sofía Valero',
    direccion: 'Polígono Industrial El Pla Nave 4, Elche',
    volumenVentasAnual: 31000.00,
    email: 'facturacion@costablancacatering.es',
    telefono: '+34 966 778 899'
  }
];

export const INITIAL_FACTURAS_EMITIDAS: FacturaEmitida[] = [
  {
    idFactura: 'FAC-2026-001',
    fechaEmision: '2026-01-15',
    idCliente: 'CLI-001',
    nombreCliente: 'Distribuciones Hosteleras del Levante S.L.',
    cifCliente: 'B-46123456',
    concepto: 'Suministro de productos de panadería y pastelería industrial - Lote 1',
    importe: 3500.00,
    fechaVencimiento: '2026-02-15',
    estado: 'Cobrada',
    fechaCobro: '2026-02-10',
    baseImponible: 3500.00,
    tiposIVA: '10%',
    cuotaIVA: 350.00, // IVA Repercutido
    aplicaRetencionIRPF: false,
    total: 3850.00,
    categoriaVenta: 'Venta de Productos',
    lineas: [
      { nombreProducto: 'Pan rústico congelado (caja 50 ud)', cantidad: 100, unidad: 'caja', precioUnitario: 25.00, subtotal: 2500.00 },
      { nombreProducto: 'Bollería surtida (caja 40 ud)', cantidad: 50, unidad: 'caja', precioUnitario: 20.00, subtotal: 1000.00 }
    ],
    verifactuHash: 'VF-A1B2C3D4E5F6G7H8I9J0'
  },
  {
    idFactura: 'FAC-2026-002',
    fechaEmision: '2026-02-01',
    idCliente: 'CLI-002',
    nombreCliente: 'Restaurante El Gourmet Mediterráneo S.L.',
    cifCliente: 'B-03987654',
    concepto: 'Servicios de catering y suministro especial para eventos',
    importe: 2400.00,
    fechaVencimiento: '2026-03-01',
    estado: 'Cobrada',
    fechaCobro: '2026-02-25',
    baseImponible: 2400.00,
    tiposIVA: '21%',
    cuotaIVA: 504.00,
    aplicaRetencionIRPF: true,
    tipoRetencionIRPF: '15% Profesional',
    porcentajeIRPF: 15,
    cuotaIRPF: 360.00,
    total: 2544.00,
    categoriaVenta: 'Servicios Profesionales',
    lineas: [
      { nombreProducto: 'Catering cóctel presentación', cantidad: 1, unidad: 'servicio', precioUnitario: 2400.00, subtotal: 2400.00 }
    ],
    verifactuHash: 'VF-K1L2M3N4O5P6Q7R8S9T0'
  },
  {
    idFactura: 'FAC-2026-003',
    fechaEmision: '2026-02-20',
    idCliente: 'CLI-003',
    nombreCliente: 'Catering y Eventos Costa Blanca S.A.',
    cifCliente: 'A-54332211',
    concepto: 'Suministro de materias primas elaboradas - Febrero',
    importe: 4100.00,
    fechaVencimiento: '2026-03-20',
    estado: 'Emitida',
    fechaCobro: 'Pendiente de cobrar',
    baseImponible: 4100.00,
    tiposIVA: '10%',
    cuotaIVA: 410.00,
    aplicaRetencionIRPF: false,
    total: 4510.00,
    categoriaVenta: 'Venta de Productos',
    lineas: [
      { nombreProducto: 'Masas elaboradas alta gama', cantidad: 82, unidad: 'pack', precioUnitario: 50.00, subtotal: 4100.00 }
    ],
    verifactuHash: 'VF-U1V2W3X4Y5Z6A7B8C9D0'
  }
];

export const INITIAL_PROVEEDORES: Proveedor[] = [];

export const INITIAL_FACTURAS: Factura[] = [];

export const INITIAL_ALERTAS: Alerta[] = [];

export const INITIAL_ANALISIS_EJECUTIVO: AnalisisEjecutivo = {
  id: 'ANALISIS-ACTUAL',
  fechaGeneracion: new Date().toISOString(),
  estadoGeneral:
    'No hay facturas registradas todavía. La plataforma está lista para procesar tus documentos y tickets para generar un análisis financiero personalizado.',
  principalesGastos: [
    'Aún no hay categorías de gasto con datos registrados.',
  ],
  cambiosImportantes: [
    'El historial de compras se actualizará conforme subas tus primeras facturas.',
  ],
  alertas: [
    'No existen alertas activas en el sistema.',
  ],
  oportunidadesAhorro: [
    'Registra tus facturas para que la IA identifique oportunidades de ahorro y optimización de costes.',
  ],
  tresAcciones: [],
  prioridadSemana:
    'Sube o escanea tu primera factura de compra para iniciar el control de costes y liquidación fiscal.',
};
