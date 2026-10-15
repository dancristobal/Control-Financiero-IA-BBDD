import { Factura, Proveedor, Alerta, AnalisisEjecutivo } from '../types';

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
