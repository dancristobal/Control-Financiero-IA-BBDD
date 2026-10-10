import { Factura, Proveedor, Alerta, AnalisisEjecutivo } from '../types';

export const INITIAL_PROVEEDORES: Proveedor[] = [
  {
    idProveedor: 'PROV-001',
    nombreProveedor: 'Harinas y Granos del Sur S.L.',
    productosSuministrados: 'Harina de fuerza 25 kg, Harina repostería W200, Salvado de trigo',
    importeMensual: 4620.00,
    frecuencia: 'Semanal',
    riesgoDependencia: 'Alto',
    tiempoMedioEntrega: '24-48h',
    cif: 'B-41892019',
    contacto: 'pedidos@harinasgranosur.es'
  },
  {
    idProveedor: 'PROV-002',
    nombreProveedor: 'Lácteos & Mantequillas Cantabria S.A.',
    productosSuministrados: 'Mantequilla artesanal 82% 5kg, Nata pura 35% 1L, Leche entera UHT',
    importeMensual: 3840.50,
    frecuencia: 'Quincenal',
    riesgoDependencia: 'Medio',
    tiempoMedioEntrega: '48h',
    cif: 'A-39012487',
    contacto: 'comercial@lacteoscantabria.es'
  },
  {
    idProveedor: 'PROV-003',
    nombreProveedor: 'Dulces e Ingredientes del Valle S.L.',
    productosSuministrados: 'Azúcar blanquilla 25kg, Azúcar glas micro 10kg, Cobertura chocolate 70%',
    importeMensual: 2950.00,
    frecuencia: 'Quincenal',
    riesgoDependencia: 'Medio',
    tiempoMedioEntrega: '48-72h',
    cif: 'B-28941032',
    contacto: 'ventas@ingredientesdelvalle.com'
  },
  {
    idProveedor: 'PROV-004',
    nombreProveedor: 'Envases & Packaging Gourmet S.L.',
    productosSuministrados: 'Cajas tarta kraft 25x25, Bolsas ventana microperforadas, Papel antigrasa',
    importeMensual: 1780.00,
    frecuencia: 'Mensual',
    riesgoDependencia: 'Bajo',
    tiempoMedioEntrega: '72h',
    cif: 'B-08341902',
    contacto: 'pedidos@packaginggourmet.es'
  },
  {
    idProveedor: 'PROV-005',
    nombreProveedor: 'Frutas Seleccionadas & Esencias Ibérica',
    productosSuministrados: 'Puré de frambuesa 1kg, Vainilla Bourbon Madagascar, Nueces pecanas 5kg',
    importeMensual: 1420.00,
    frecuencia: 'Mensual',
    riesgoDependencia: 'Bajo',
    tiempoMedioEntrega: '48h',
    cif: 'B-46901823',
    contacto: 'pedidos@frutasesencias.es'
  },
  {
    idProveedor: 'PROV-006',
    nombreProveedor: 'Iberdrola Clientes S.A.U.',
    productosSuministrados: 'Suministro eléctrico hornos industriales y cámaras de fermentación',
    importeMensual: 2150.00,
    frecuencia: 'Mensual',
    riesgoDependencia: 'Alto',
    tiempoMedioEntrega: 'Continuo',
    cif: 'A-95748392',
    contacto: 'empresas@iberdrola.es'
  },
  {
    idProveedor: 'PROV-007',
    nombreProveedor: 'Frío Express Logística Alimentaria',
    productosSuministrados: 'Transporte refrigerado entregas B2B obradores y eventos',
    importeMensual: 1350.00,
    frecuencia: 'Mensual',
    riesgoDependencia: 'Bajo',
    tiempoMedioEntrega: '24h',
    cif: 'B-50123984',
    contacto: 'operaciones@frioexpress.es'
  },
  {
    idProveedor: 'PROV-008',
    nombreProveedor: 'Molinos & Harinas del Ebro S.A.',
    productosSuministrados: 'Harina de fuerza 25 kg, Harina repostería W200, Salvado de trigo',
    importeMensual: 1420.00,
    frecuencia: 'Mensual',
    riesgoDependencia: 'Bajo',
    tiempoMedioEntrega: '48h',
    cif: 'A-50982314',
    contacto: 'pedidos@molinosebro.es'
  },
  {
    idProveedor: 'PROV-011',
    nombreProveedor: 'Asesoría Fiscal & Laboral Gómez & Asociados',
    productosSuministrados: 'Asesoría tributaria, contabilidad mercantil y laboral',
    importeMensual: 650.00,
    frecuencia: 'Mensual',
    riesgoDependencia: 'Bajo',
    tiempoMedioEntrega: 'Inmediato',
    cif: 'B-84729103',
    contacto: 'info@gomezasociadosfiscal.es'
  },
  {
    idProveedor: 'PROV-012',
    nombreProveedor: 'Inmobiliaria & Locales Comerciales Centro S.L.',
    productosSuministrados: 'Arrendamiento de nave obrador central y muelle logístico',
    importeMensual: 1800.00,
    frecuencia: 'Mensual',
    riesgoDependencia: 'Medio',
    tiempoMedioEntrega: 'Continuo',
    cif: 'B-28019482',
    contacto: 'patrimonio@inmobiliariacentro.es'
  }
];

export const INITIAL_FACTURAS: Factura[] = [
  {
    idFactura: 'FAC-2026-001',
    fechaEmision: '2026-01-14',
    idProveedor: 'PROV-001',
    nombreProveedor: 'Harinas y Granos del Sur S.L.',
    concepto: 'Suministro harinas especiales lote Enero-1',
    importe: 1110.00,
    fechaVencimiento: '2026-02-14',
    estado: 'Pagada',
    fechaPago: '2026-02-10',
    baseImponible: 1110.00,
    tiposIVA: '4%',
    cuotaIVA: 44.40,
    total: 1154.40,
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Harina de fuerza 25 kg', cantidad: 40, unidad: 'sacos', precioUnitario: 18.50, subtotal: 740.00 },
      { nombreProducto: 'Harina repostería W200', cantidad: 20, unidad: 'sacos', precioUnitario: 16.00, subtotal: 320.00 },
      { nombreProducto: 'Salvado de trigo', cantidad: 5, unidad: 'sacos', precioUnitario: 10.00, subtotal: 50.00 }
    ],
    archivoNombre: 'FAC-2026-001_HarinasDelSur.pdf',
    sincronizadoSheets: true,
    driveGuardado: true,
    driveFolderName: 'Harinas y Granos del Sur S.L.',
    driveFileName: 'FAC-2026-001 2026-01-15.pdf',
    driveFileUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview'
  },
  {
    idFactura: 'FAC-2026-004',
    fechaEmision: '2026-01-20',
    idProveedor: 'PROV-002',
    nombreProveedor: 'Lácteos & Mantequillas Cantabria S.A.',
    concepto: 'Mantequilla artesanal y nata montada obrador',
    importe: 1820.00,
    fechaVencimiento: '2026-02-20',
    estado: 'Pagada',
    fechaPago: '2026-02-18',
    baseImponible: 1820.00,
    tiposIVA: '10%',
    cuotaIVA: 182.00,
    total: 2002.00,
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Mantequilla artesanal 82% 5kg', cantidad: 35, unidad: 'bloques', precioUnitario: 32.00, subtotal: 1120.00 },
      { nombreProducto: 'Nata pura 35% 1L', cantidad: 200, unidad: 'litros', precioUnitario: 3.50, subtotal: 700.00 }
    ],
    archivoNombre: 'FAC-2026-004_LacteosCantabria.pdf',
    sincronizadoSheets: true,
    driveGuardado: true,
    driveFolderName: 'Lácteos & Mantequillas Cantabria S.A.',
    driveFileName: 'FAC-2026-004 2026-01-20.pdf',
    driveFileUrl: 'https://drive.google.com/file/d/1u_b43yK5_wVbK7QY4L4zTjE9sZ5c8e2A/preview'
  },
  {
    idFactura: 'FAC-2026-009',
    fechaEmision: '2026-01-31',
    idProveedor: 'PROV-006',
    nombreProveedor: 'Iberdrola Clientes S.A.U.',
    concepto: 'Factura eléctrica periodo Enero 2026 hornos y cámaras',
    importe: 2190.00,
    fechaVencimiento: '2026-02-15',
    estado: 'Pagada',
    fechaPago: '2026-02-12',
    baseImponible: 2190.00,
    tiposIVA: '21%',
    cuotaIVA: 459.90,
    total: 2649.90,
    categoriaGasto: 'Suministros y Energía',
    lineas: [
      { nombreProducto: 'Consumo energía activa P1-P6', cantidad: 1, unidad: 'periodo', precioUnitario: 1840.00, subtotal: 1840.00 },
      { nombreProducto: 'Término de potencia contratada', cantidad: 1, unidad: 'mes', precioUnitario: 350.00, subtotal: 350.00 }
    ],
    archivoNombre: 'FAC-2026-009_Iberdrola_Ene.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-015',
    fechaEmision: '2026-02-12',
    idProveedor: 'PROV-001',
    nombreProveedor: 'Harinas y Granos del Sur S.L.',
    concepto: 'Suministro harinas quincena Febrero',
    importe: 1150.00,
    fechaVencimiento: '2026-03-12',
    estado: 'Pagada',
    fechaPago: '2026-03-08',
    baseImponible: 1150.00,
    tiposIVA: '4%',
    cuotaIVA: 46.00,
    total: 1196.00,
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Harina de fuerza 25 kg', cantidad: 40, unidad: 'sacos', precioUnitario: 19.10, subtotal: 764.00 },
      { nombreProducto: 'Harina repostería W200', cantidad: 22, unidad: 'sacos', precioUnitario: 16.50, subtotal: 363.00 },
      { nombreProducto: 'Salvado de trigo', cantidad: 2, unidad: 'sacos', precioUnitario: 11.50, subtotal: 23.00 }
    ],
    archivoNombre: 'FAC-2026-015_HarinasSur_Feb.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-022',
    fechaEmision: '2026-02-18',
    idProveedor: 'PROV-004',
    nombreProveedor: 'Envases & Packaging Gourmet S.L.',
    concepto: 'Cajas tarta kraft y bolsas para San Valentín y campaña invierno',
    importe: 1720.00,
    fechaVencimiento: '2026-03-20',
    estado: 'Pagada',
    fechaPago: '2026-03-15',
    baseImponible: 1720.00,
    tiposIVA: '21%',
    cuotaIVA: 361.20,
    total: 2081.20,
    categoriaGasto: 'Envases y Embalajes',
    lineas: [
      { nombreProducto: 'Cajas tarta kraft 25x25', cantidad: 2000, unidad: 'unidades', precioUnitario: 0.45, subtotal: 900.00 },
      { nombreProducto: 'Bolsas ventana microperforadas', cantidad: 1500, unidad: 'unidades', precioUnitario: 0.38, subtotal: 570.00 },
      { nombreProducto: 'Papel antigrasa personalizado', cantidad: 10, unidad: 'bobinas', precioUnitario: 25.00, subtotal: 250.00 }
    ],
    archivoNombre: 'FAC-2026-022_Packaging_Feb.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-028',
    fechaEmision: '2026-03-05',
    idProveedor: 'PROV-008',
    nombreProveedor: 'Molinos & Harinas del Ebro S.A.',
    concepto: 'Remesa de prueba harinas panificables y repostería',
    importe: 982.00,
    fechaVencimiento: '2026-04-05',
    estado: 'Pagada',
    fechaPago: '2026-03-28',
    baseImponible: 982.00,
    tiposIVA: '4%',
    cuotaIVA: 39.28,
    total: 1021.28,
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Harina de fuerza 25 kg', cantidad: 35, unidad: 'sacos', precioUnitario: 18.80, subtotal: 658.00 },
      { nombreProducto: 'Harina repostería W200', cantidad: 20, unidad: 'sacos', precioUnitario: 16.20, subtotal: 324.00 }
    ],
    archivoNombre: 'FAC-2026-028_MolinosEbro_Mar.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-031',
    fechaEmision: '2026-03-10',
    idProveedor: 'PROV-003',
    nombreProveedor: 'Dulces e Ingredientes del Valle S.L.',
    concepto: 'Lote coberturas de chocolate, cacao puro y azúcares',
    importe: 2680.00,
    fechaVencimiento: '2026-04-10',
    estado: 'Pagada',
    fechaPago: '2026-04-05',
    baseImponible: 2680.00,
    tiposIVA: '10%',
    cuotaIVA: 268.00,
    total: 2948.00,
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Azúcar blanquilla 25kg', cantidad: 30, unidad: 'sacos', precioUnitario: 22.00, subtotal: 660.00 },
      { nombreProducto: 'Azúcar glas micro 10kg', cantidad: 20, unidad: 'sacos', precioUnitario: 17.50, subtotal: 350.00 },
      { nombreProducto: 'Cobertura chocolate 70%', cantidad: 100, unidad: 'kg', precioUnitario: 16.70, subtotal: 1670.00 }
    ],
    archivoNombre: 'FAC-2026-031_IngredientesValle_Mar.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-045',
    fechaEmision: '2026-04-15',
    idProveedor: 'PROV-001',
    nombreProveedor: 'Harinas y Granos del Sur S.L.',
    concepto: 'Harinas panificables y masa madre seca Abril',
    importe: 1220.00,
    fechaVencimiento: '2026-05-15',
    estado: 'Pagada',
    fechaPago: '2026-05-10',
    baseImponible: 1220.00,
    tiposIVA: '4%',
    cuotaIVA: 48.80,
    total: 1268.80,
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Harina de fuerza 25 kg', cantidad: 40, unidad: 'sacos', precioUnitario: 20.00, subtotal: 800.00 },
      { nombreProducto: 'Harina repostería W200', cantidad: 24, unidad: 'sacos', precioUnitario: 17.50, subtotal: 420.00 }
    ],
    archivoNombre: 'FAC-2026-045_HarinasAbril.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-052',
    fechaEmision: '2026-05-08',
    idProveedor: 'PROV-002',
    nombreProveedor: 'Lácteos & Mantequillas Cantabria S.A.',
    concepto: 'Mantequilla 82% especial hojaldre y nata',
    importe: 2135.00,
    fechaVencimiento: '2026-06-08',
    estado: 'Pagada',
    fechaPago: '2026-06-02',
    baseImponible: 2135.00,
    tiposIVA: '10%',
    cuotaIVA: 213.50,
    total: 2348.50,
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Mantequilla artesanal 82% 5kg', cantidad: 35, unidad: 'bloques', precioUnitario: 35.00, subtotal: 1225.00 },
      { nombreProducto: 'Nata pura 35% 1L', cantidad: 260, unidad: 'litros', precioUnitario: 3.50, subtotal: 910.00 }
    ],
    archivoNombre: 'FAC-2026-052_LacteosMayo.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-058',
    fechaEmision: '2026-05-18',
    idProveedor: 'PROV-008',
    nombreProveedor: 'Molinos & Harinas del Ebro S.A.',
    concepto: 'Suministro harinas de fuerza y repostería campaña primavera',
    importe: 1112.00,
    fechaVencimiento: '2026-06-18',
    estado: 'Pagada',
    fechaPago: '2026-06-12',
    baseImponible: 1112.00,
    tiposIVA: '4%',
    cuotaIVA: 44.48,
    total: 1156.48,
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Harina de fuerza 25 kg', cantidad: 40, unidad: 'sacos', precioUnitario: 19.40, subtotal: 776.00 },
      { nombreProducto: 'Harina repostería W200', cantidad: 20, unidad: 'sacos', precioUnitario: 16.80, subtotal: 336.00 }
    ],
    archivoNombre: 'FAC-2026-058_MolinosEbro_May.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-064',
    fechaEmision: '2026-06-02',
    idProveedor: 'PROV-007',
    nombreProveedor: 'Frío Express Logística Alimentaria',
    concepto: 'Envíos refrigerados pedidos bodas y eventos especiales Junio',
    importe: 1480.00,
    fechaVencimiento: '2026-07-02',
    estado: 'Vencida',
    fechaPago: 'Pendiente de confirmar',
    baseImponible: 1480.00,
    tiposIVA: '21%',
    cuotaIVA: 310.80,
    total: 1790.80,
    categoriaGasto: 'Logística y Transporte',
    lineas: [
      { nombreProducto: 'Ruta refrigerada provincial (12 servicios)', cantidad: 12, unidad: 'rutas', precioUnitario: 95.00, subtotal: 1140.00 },
      { nombreProducto: 'Suplemento fin de semana y festivos', cantidad: 4, unidad: 'servicios', precioUnitario: 85.00, subtotal: 340.00 }
    ],
    archivoNombre: 'FAC-2026-064_FrioExpress_Jun.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-073',
    fechaEmision: '2026-07-15',
    idProveedor: 'PROV-004',
    nombreProveedor: 'Envases & Packaging Gourmet S.L.',
    concepto: 'Nueva remesa de cajas pasteleras kraft con incremento papel',
    importe: 2128.00,
    fechaVencimiento: '2026-08-15',
    estado: 'Pagada',
    fechaPago: '2026-08-10',
    baseImponible: 2128.00,
    tiposIVA: '21%',
    cuotaIVA: 446.88,
    total: 2574.88,
    categoriaGasto: 'Envases y Embalajes',
    lineas: [
      { nombreProducto: 'Cajas tarta kraft 25x25', cantidad: 2500, unidad: 'unidades', precioUnitario: 0.56, subtotal: 1400.00 },
      { nombreProducto: 'Bolsas ventana microperforadas', cantidad: 1600, unidad: 'unidades', precioUnitario: 0.455, subtotal: 728.00 }
    ],
    archivoNombre: 'FAC-2026-073_PackagingJulio.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-081',
    fechaEmision: '2026-08-10',
    idProveedor: 'PROV-001',
    nombreProveedor: 'Harinas y Granos del Sur S.L.',
    concepto: 'Pedido intensivo campaña de verano harinas especiales',
    importe: 1445.00,
    fechaVencimiento: '2026-09-10',
    estado: 'Pendiente',
    fechaPago: 'Pendiente de confirmar',
    baseImponible: 1445.00,
    tiposIVA: '4%',
    cuotaIVA: 57.80,
    total: 1502.80,
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Harina de fuerza 25 kg', cantidad: 50, unidad: 'sacos', precioUnitario: 21.80, subtotal: 1090.00 },
      { nombreProducto: 'Harina repostería W200', cantidad: 20, unidad: 'sacos', precioUnitario: 17.75, subtotal: 355.00 }
    ],
    archivoNombre: 'FAC-2026-081_HarinasAgosto.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-085',
    fechaEmision: '2026-08-18',
    idProveedor: 'PROV-008',
    nombreProveedor: 'Molinos & Harinas del Ebro S.A.',
    concepto: 'Suministro harinas para fin de temporada estival',
    importe: 1334.50,
    fechaVencimiento: '2026-09-18',
    estado: 'Pendiente',
    fechaPago: 'Pendiente de confirmar',
    baseImponible: 1334.50,
    tiposIVA: '4%',
    cuotaIVA: 53.38,
    total: 1387.88,
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Harina de fuerza 25 kg', cantidad: 45, unidad: 'sacos', precioUnitario: 20.10, subtotal: 904.50 },
      { nombreProducto: 'Harina repostería W200', cantidad: 25, unidad: 'sacos', precioUnitario: 17.20, subtotal: 430.00 }
    ],
    archivoNombre: 'FAC-2026-085_MolinosEbro_Ago.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-089',
    fechaEmision: '2026-08-22',
    idProveedor: 'PROV-002',
    nombreProveedor: 'Lácteos & Mantequillas Cantabria S.A.',
    concepto: 'Mantequillas gourmet de importación y lácteos',
    importe: 2285.00,
    fechaVencimiento: '2026-09-22',
    estado: 'Pendiente',
    fechaPago: 'Pendiente de confirmar',
    baseImponible: 2285.00,
    tiposIVA: '10%',
    cuotaIVA: 228.50,
    total: 2513.50,
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Mantequilla artesanal 82% 5kg', cantidad: 40, unidad: 'bloques', precioUnitario: 38.50, subtotal: 1540.00 },
      { nombreProducto: 'Nata pura 35% 1L', cantidad: 200, unidad: 'litros', precioUnitario: 3.725, subtotal: 745.00 }
    ],
    archivoNombre: 'FAC-2026-089_LacteosAgosto.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-092',
    fechaEmision: '2026-08-28',
    idProveedor: 'PROV-005',
    nombreProveedor: 'Frutas Seleccionadas & Esencias Ibérica',
    concepto: 'Vainilla bourbon en rama y purés de frutas para glaseados',
    importe: 1560.00,
    fechaVencimiento: '2026-09-28',
    estado: 'Pendiente',
    fechaPago: 'Pendiente de confirmar',
    baseImponible: 1560.00,
    tiposIVA: '10%',
    cuotaIVA: 156.00,
    total: 1716.00,
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Vainilla Bourbon Madagascar', cantidad: 2, unidad: 'kg', precioUnitario: 390.00, subtotal: 780.00 },
      { nombreProducto: 'Puré de frambuesa 1kg', cantidad: 30, unidad: 'kg', precioUnitario: 16.00, subtotal: 480.00 },
      { nombreProducto: 'Nueces pecanas 5kg', cantidad: 5, unidad: 'cajas', precioUnitario: 60.00, subtotal: 300.00 }
    ],
    archivoNombre: 'FAC-2026-092_EsenciasAgosto.pdf',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-095',
    fechaEmision: '2026-09-02',
    idProveedor: 'PROV-007',
    nombreProveedor: 'Cooperativa Oleícola Sierra de Cazorla',
    concepto: 'Aceite de oliva virgen extra cosecha temprana obrador (Tipo temporal 0%)',
    importe: 980.00,
    fechaVencimiento: '2026-10-02',
    estado: 'Pagada',
    fechaPago: '2026-09-05',
    baseImponible: 980.00,
    tiposIVA: '0% (Temporal)',
    cuotaIVA: 0.00,
    total: 980.00,
    regimenFiscal: 'Tipos Temporales / Alimentos',
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Aceite de Oliva Virgen Extra 5L garrafa', cantidad: 20, unidad: 'garrafas', precioUnitario: 49.00, subtotal: 980.00 }
    ],
    notas: 'Aplicación del tipo superreducido temporal al 0% para aceite de oliva (RDL 4/2024)',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-098',
    fechaEmision: '2026-09-08',
    idProveedor: 'PROV-008',
    nombreProveedor: 'Pastas & Harinas Especiales Mediterráneo S.L.',
    concepto: 'Pastas alimenticias secas y sémolas panificables (Tipo temporal 5%)',
    importe: 650.00,
    fechaVencimiento: '2026-10-08',
    estado: 'Pagada',
    fechaPago: '2026-09-12',
    baseImponible: 650.00,
    tiposIVA: '5% (Temporal)',
    cuotaIVA: 32.50,
    total: 682.50,
    regimenFiscal: 'Tipos Temporales / Alimentos',
    categoriaGasto: 'Materias Primas',
    lineas: [
      { nombreProducto: 'Sémola de trigo duro especial 25kg', cantidad: 10, unidad: 'sacos', precioUnitario: 35.00, subtotal: 350.00 },
      { nombreProducto: 'Pasta artesanal hojaldrada base', cantidad: 15, unidad: 'cajas', precioUnitario: 20.00, subtotal: 300.00 }
    ],
    notas: 'Tipo impositivo temporal reducido del 5% aplicable a pastas y derivados.',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-102',
    fechaEmision: '2026-09-14',
    idProveedor: 'PROV-009',
    nombreProveedor: 'Envases & Embalajes del Atlántico S.L. (Tenerife)',
    concepto: 'Cajas kraft microcanal personalizadas despacho Canarias (IGIC 7%)',
    importe: 1420.00,
    fechaVencimiento: '2026-10-14',
    estado: 'Pendiente',
    fechaPago: 'Pendiente de confirmar',
    baseImponible: 1420.00,
    tiposIVA: 'IGIC 7%',
    cuotaIVA: 99.40,
    total: 1519.40,
    regimenFiscal: 'IGIC Canario',
    tipoImpuestoNombre: 'IGIC',
    categoriaGasto: 'Envases y Embalajes',
    lineas: [
      { nombreProducto: 'Cajas pastelería kraft 30x30 con ventana', cantidad: 1000, unidad: 'ud', precioUnitario: 0.95, subtotal: 950.00 },
      { nombreProducto: 'Bolsas take-away asa plana reforzadas', cantidad: 1000, unidad: 'ud', precioUnitario: 0.47, subtotal: 470.00 }
    ],
    notas: 'Suministro con régimen fiscal canario: Impuesto General Indirecto Canario (IGIC General 7%)',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-105',
    fechaEmision: '2026-09-17',
    idProveedor: 'PROV-010',
    nombreProveedor: 'Distribuciones Gourmet & Utillaje S.L.',
    concepto: 'Utillaje de repostería y bandejas inox (IVA 21% + R.E. 5,2%)',
    importe: 1200.00,
    fechaVencimiento: '2026-10-17',
    estado: 'Pendiente',
    fechaPago: 'Pendiente de confirmar',
    baseImponible: 1200.00,
    tiposIVA: '21% + 5.2% RE',
    cuotaIVA: 252.00,
    aplicaRecargoEquivalencia: true,
    tipoRecargoEquivalencia: '5.2%',
    cuotaRecargoEquivalencia: 62.40,
    total: 1514.40,
    regimenFiscal: 'Recargo de Equivalencia',
    categoriaGasto: 'Mantenimiento y Maquinaria',
    lineas: [
      { nombreProducto: 'Bandejas pasteleras inox 60x40', cantidad: 20, unidad: 'ud', precioUnitario: 35.00, subtotal: 700.00 },
      { nombreProducto: 'Mangas pasteleras y boquillas profesionales', cantidad: 10, unidad: 'packs', precioUnitario: 50.00, subtotal: 500.00 }
    ],
    notas: 'Factura con desglose de IVA (21% = 252,00 €) y Recargo de Equivalencia para comercio minorista (5,2% = 62,40 €). Total: 1.514,40 €',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-108',
    fechaEmision: '2026-09-20',
    idProveedor: 'PROV-011',
    nombreProveedor: 'Asesoría Fiscal & Laboral Gómez & Asociados',
    concepto: 'Servicios de asesoramiento contable, fiscal y liquidación tributaria T3 2026',
    importe: 650.00,
    fechaVencimiento: '2026-10-20',
    estado: 'Pagada',
    fechaPago: '2026-09-22',
    baseImponible: 650.00,
    tiposIVA: '21%',
    cuotaIVA: 136.50,
    aplicaRetencionIRPF: true,
    tipoRetencionIRPF: '15% Profesional',
    porcentajeIRPF: 15,
    cuotaIRPF: 97.50,
    conceptoRetencionIRPF: 'PROFESIONAL',
    total: 689.00,
    regimenFiscal: 'Régimen General Peninsular',
    categoriaGasto: 'Servicios y Gestión',
    archivoNombre: 'factura_autonomo_irpf.pdf',
    archivoBase64: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0KPg==',
    driveFileUrl: 'https://drive.google.com/file/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs/preview',
    driveGuardado: true,
    lineas: [
      { nombreProducto: 'Honorarios asesoría tributaria y contable mensual', cantidad: 1, unidad: 'mes', precioUnitario: 450.00, subtotal: 450.00 },
      { nombreProducto: 'Gestión laboral y tramitación seguros sociales', cantidad: 1, unidad: 'mes', precioUnitario: 200.00, subtotal: 200.00 }
    ],
    notas: 'Retención de IRPF aplicada al 15% (97,50 €) para Modelo 111 de la AEAT. Líquido: 689,00 €',
    sincronizadoSheets: true
  },
  {
    idFactura: 'FAC-2026-112',
    fechaEmision: '2026-09-23',
    idProveedor: 'PROV-012',
    nombreProveedor: 'Inmobiliaria & Locales Comerciales Centro S.L.',
    concepto: 'Alquiler mensual obrador principal y almacén logístico Septiembre 2026',
    importe: 1800.00,
    fechaVencimiento: '2026-10-05',
    estado: 'Pendiente',
    fechaPago: 'Pendiente de confirmar',
    baseImponible: 1800.00,
    tiposIVA: '21%',
    cuotaIVA: 378.00,
    aplicaRetencionIRPF: true,
    tipoRetencionIRPF: '19% Arrendamiento',
    porcentajeIRPF: 19,
    cuotaIRPF: 342.00,
    conceptoRetencionIRPF: 'ARRENDAMIENTO',
    total: 1836.00,
    regimenFiscal: 'Régimen General Peninsular',
    categoriaGasto: 'Suministros y Energía',
    archivoNombre: 'factura_ejemplo.pdf',
    archivoBase64: 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0KPg==',
    driveFileUrl: 'https://drive.google.com/file/d/1u_b43yK5_wVbK7QY4L4zTjE9sZ5c8e2A/preview',
    driveGuardado: true,
    lineas: [
      { nombreProducto: 'Renta arrendamiento nave obrador central (350m2)', cantidad: 1, unidad: 'mes', precioUnitario: 1500.00, subtotal: 1500.00 },
      { nombreProducto: 'Cuota garaje y muelle de carga refrigerado', cantidad: 1, unidad: 'mes', precioUnitario: 300.00, subtotal: 300.00 }
    ],
    notas: 'Retención sobre arrendamiento de inmueble urbano al 19% (342,00 €) para Modelo 115 AEAT. Líquido a pagar: 1.836,00 €',
    sincronizadoSheets: true
  }
];

export const INITIAL_ALERTAS: Alerta[] = [
  {
    id: 'ALT-001',
    tipo: 'SUBIDA DE PRECIO',
    nivel: 'critica',
    titulo: 'Subida acusada en Harina de fuerza 25 kg (+17.8%)',
    descripcion: 'Harina de fuerza 25 kg ha aumentado de 18.50 € a 21.80 € (+17.8%) suministrada por Harinas y Granos del Sur S.L.',
    fecha: '2026-08-10',
    estado: 'activa',
    datosRelacionados: {
      proveedor: 'Harinas y Granos del Sur S.L.',
      producto: 'Harina de fuerza 25 kg',
      precioAnterior: 18.50,
      precioNuevo: 21.80,
      variacionPorcentaje: 17.84
    }
  },
  {
    id: 'ALT-002',
    tipo: 'SUBIDA DE PRECIO',
    nivel: 'critica',
    titulo: 'Subida pronunciada en Mantequilla artesanal 82% 5kg (+20.3%)',
    descripcion: 'Mantequilla artesanal 82% 5kg ha subido de 32.00 € a 38.50 € (+20.3%) en las últimas 3 remesas de Lácteos & Mantequillas Cantabria.',
    fecha: '2026-08-22',
    estado: 'activa',
    datosRelacionados: {
      proveedor: 'Lácteos & Mantequillas Cantabria S.A.',
      producto: 'Mantequilla artesanal 82% 5kg',
      precioAnterior: 32.00,
      precioNuevo: 38.50,
      variacionPorcentaje: 20.31
    }
  },
  {
    id: 'ALT-003',
    tipo: 'FACTURA VENCIDA',
    nivel: 'alta',
    titulo: 'Factura vencida no conciliada: FAC-2026-064 (1.790,80 €)',
    descripcion: 'La factura de Frío Express Logística Alimentaria venció el 02/07/2026 y figura en estado Vencida pendiente de pago.',
    fecha: '2026-07-03',
    estado: 'activa',
    datosRelacionados: {
      idFactura: 'FAC-2026-064',
      proveedor: 'Frío Express Logística Alimentaria',
      importe: 1790.80
    }
  },
  {
    id: 'ALT-004',
    tipo: 'CONCENTRACIÓN DE PROVEEDOR',
    nivel: 'alta',
    titulo: 'Alta concentración en materias primas: Harinas del Sur (41.8%)',
    descripcion: 'Harinas y Granos del Sur representa el 41.8% del gasto total acumulado en la categoría de Materias Primas del negocio.',
    fecha: '2026-08-28',
    estado: 'activa',
    datosRelacionados: {
      proveedor: 'Harinas y Granos del Sur S.L.',
      variacionPorcentaje: 41.8
    }
  },
  {
    id: 'ALT-005',
    tipo: 'SUBIDA DE PRECIO',
    nivel: 'media',
    titulo: 'Aumento en packaging de cartón kraft (+24.4%)',
    descripcion: 'Cajas tarta kraft 25x25 subieron de 0.45 € a 0.56 € unitarios en Envases & Packaging Gourmet.',
    fecha: '2026-07-15',
    estado: 'activa',
    datosRelacionados: {
      proveedor: 'Envases & Packaging Gourmet S.L.',
      producto: 'Cajas tarta kraft 25x25',
      precioAnterior: 0.45,
      precioNuevo: 0.56,
      variacionPorcentaje: 24.44
    }
  },
  {
    id: 'ALT-006',
    tipo: 'GASTO INUSUAL',
    nivel: 'informativa',
    titulo: 'Incremento estacional en climatización y hornos (+18%)',
    descripcion: 'El consumo energético en obrador aumentó en julio y agosto debido al uso intensivo de cámaras frigoríficas por altas temperaturas.',
    fecha: '2026-08-01',
    estado: 'activa',
    datosRelacionados: {
      proveedor: 'Iberdrola Clientes S.A.U.',
      importe: 2649.90
    }
  }
];

export const INITIAL_ANALISIS_EJECUTIVO: AnalisisEjecutivo = {
  id: 'ANALISIS-ACTUAL',
  fechaGeneracion: '2026-08-28T10:30:00Z',
  estadoGeneral:
    'La empresa presenta un volumen de gasto consolidado según las facturas registradas en el sistema. La estructura de costes se distribuye entre las partidas operativas y suministros clave, requiriendo supervisión continua sobre las condiciones comerciales y los plazos de vencimiento.',
  principalesGastos: [
    'Materias Primas y Aprovisionamientos: Principal partida del gasto total registrado.',
    'Suministros y Energía: Consumo operativo regular.',
    'Envases y Embalajes: Material de packaging y distribución.',
    'Logística y Servicios: Gestión operativa y portes.'
  ],
  cambiosImportantes: [
    'Seguimiento de variaciones en precios unitarios en suministradores frecuentes.',
    'Monitoreo de costes de aprovisionamiento según el volumen contratado.'
  ],
  alertas: [
    'Control de facturas con vencimiento próximo o superado.',
    'Seguimiento de la concentración de compras en proveedores principales.'
  ],
  oportunidadesAhorro: [
    'Negociar acuerdos de rappel o descuento por volumen con los proveedores de mayor facturación.',
    'Optimizar la agrupación de pedidos y la periodicidad de aprovisionamiento.'
  ],
  tresAcciones: [
    {
      accion: 'Conciliar facturas pendientes y vencidas en contabilidad',
      motivo: 'Garantizar la continuidad del servicio y evitar recargos o demoras comerciales.',
      datos: 'Facturas registradas en el sistema.',
      impacto: 'Inmediato'
    },
    {
      accion: 'Revisar condiciones y contratos marco con proveedores estratégicos',
      motivo: 'Asegurar precios competitivos en las partidas de mayor peso presupuestario.',
      datos: 'Concentración de gasto en proveedores principales.',
      impacto: 'Alto'
    },
    {
      accion: 'Auditar costes unitarios y referencias frecuentes',
      motivo: 'Proteger los márgenes operativos frente a oscilaciones de mercado.',
      datos: 'Líneas de facturas registradas.',
      impacto: 'Medio'
    }
  ],
  prioridadSemana:
    'Revisar las facturas pendientes de pago y consolidar acuerdos comerciales con los suministradores de mayor volumen.'
};
