import { Factura, Proveedor, Alerta, ConfiguracionAlertas } from '../types';
import { obtenerConfiguracionAlertas, evaluarSubidasPrecioDesdeFacturas } from './alertasConfig';
import { obtenerParametrosSistema } from './parametrosSistema';

/**
 * Genera la lista consolidada de proveedores a partir de las facturas registradas en el sistema
 */
export function generarProveedoresDesdeFacturas(facturas: Factura[]): Proveedor[] {
  if (!facturas || facturas.length === 0) return [];

  const mapProveedores = new Map<
    string,
    {
      id: string;
      nombre: string;
      total: number;
      count: number;
      conceptos: Set<string>;
      categorias: Set<string>;
      ultimaFecha: string;
    }
  >();

  facturas.forEach((f) => {
    const idProv = f.idProveedor || 'PROV-GEN';
    const nombreProv = (f.nombreProveedor || (idProv.startsWith('PROV-') ? `Proveedor ${idProv}` : idProv)).trim();
    // Normalizar clave de proveedor por nombre para fusionar facturas del mismo emisor
    const normNombre = nombreProv
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]/g, '');
    const key = normNombre.length >= 3 ? normNombre : idProv.trim().toLowerCase();

    const entry = mapProveedores.get(key) || {
      id: idProv,
      nombre: nombreProv,
      total: 0,
      count: 0,
      conceptos: new Set<string>(),
      categorias: new Set<string>(),
      ultimaFecha: f.fechaEmision || '',
    };

    // Preferir un ID más específico o NIF/CIF si está disponible
    if (idProv && !idProv.startsWith('PROV-') && (!entry.id || entry.id.startsWith('PROV-'))) {
      entry.id = idProv;
    }

    entry.total += f.total;
    entry.count += 1;
    if (f.concepto) entry.conceptos.add(f.concepto);
    if (f.categoriaGasto) entry.categorias.add(f.categoriaGasto);
    if (f.fechaEmision && f.fechaEmision > entry.ultimaFecha) {
      entry.ultimaFecha = f.fechaEmision;
    }
    mapProveedores.set(key, entry);
  });

  const totalGastoGlobal = facturas.reduce((sum, f) => sum + f.total, 0) || 1;
  const params = obtenerParametrosSistema();
  const umbralAlto = (params.umbralDependenciaAltaPct || 35) / 100;
  const umbralMedio = (params.umbralDependenciaMediaPct || 18) / 100;
  const minFacturas =
    typeof params.minimoFacturasParaConcentracion === 'number' && params.minimoFacturasParaConcentracion >= 1
      ? params.minimoFacturasParaConcentracion
      : 3;
  const puedeEvaluarConcentracion = facturas.length >= minFacturas && mapProveedores.size > 1;

  return Array.from(mapProveedores.values()).map((p, idx) => {
    const share = p.total / totalGastoGlobal;
    const riesgo: 'Bajo' | 'Medio' | 'Alto' =
      puedeEvaluarConcentracion
        ? share > umbralAlto
          ? 'Alto'
          : share > umbralMedio
          ? 'Medio'
          : 'Bajo'
        : 'Bajo';
    const frecuencia = p.count >= 8 ? 'Semanal' : p.count >= 4 ? 'Quincenal' : 'Mensual';
    const productos =
      Array.from(p.conceptos).slice(0, 3).join(', ') ||
      Array.from(p.categorias).join(', ') ||
      'Suministros diversos';

    return {
      idProveedor: p.id,
      nombreProveedor: p.nombre,
      productosSuministrados: productos,
      importeMensual: Math.round((p.total / Math.max(1, Math.min(6, p.count))) * 100) / 100,
      frecuencia,
      riesgoDependencia: riesgo,
      tiempoMedioEntrega: '24-48h',
      cif: `B-${(10000000 + (idx + 1) * 739).toString().substring(0, 8)}`,
      contacto: `pedidos@${p.nombre
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]/g, '')}.com`,
    };
  });
}

/**
 * Genera alertas analíticas automáticas basadas estrictamente en las facturas reales
 */
export function generarAlertasDesdeFacturas(
  facturas: Factura[],
  configPersonalizada?: ConfiguracionAlertas
): Alerta[] {
  if (!facturas || facturas.length === 0) return [];

  const config = configPersonalizada || obtenerConfiguracionAlertas();
  const params = obtenerParametrosSistema();
  const alertas: Alerta[] = [];
  const hoy = new Date().toISOString().split('T')[0];

  // 1. Subidas de precio según umbrales configurados
  const alertasSubida = evaluarSubidasPrecioDesdeFacturas(facturas, config);
  alertas.push(...alertasSubida);

  // 2. Facturas vencidas o pendientes pasadas de fecha
  const vencidas = facturas.filter(
    (f) =>
      f.estado === 'Vencida' ||
      (f.estado === 'Pendiente' && f.fechaVencimiento && f.fechaVencimiento < hoy)
  );
  const facturasVencidasProcesadas = new Set<string>();
  vencidas.forEach((f) => {
    const cleanId = String(f.idFactura || '').trim();
    if (!cleanId || facturasVencidasProcesadas.has(cleanId)) return;
    facturasVencidasProcesadas.add(cleanId);

    alertas.push({
      id: `ALT-VENC-${cleanId}`,
      tipo: 'FACTURA VENCIDA',
      nivel: 'critica',
      titulo: `Factura vencida: ${cleanId} (${f.nombreProveedor})`,
      descripcion: `La factura por importe de ${f.total.toLocaleString('es-ES', {
        style: 'currency',
        currency: 'EUR',
      })} venció el ${f.fechaVencimiento || 'fecha sin definir'} y consta como pendiente de pago.`,
      fecha: f.fechaVencimiento || f.fechaEmision,
      estado: 'activa',
      datosRelacionados: {
        proveedor: f.nombreProveedor,
        importe: f.total,
      },
    });
  });

  // 3. Posibles identificadores duplicados
  const idCounts = new Map<string, number>();
  facturas.forEach((f) => {
    idCounts.set(f.idFactura, (idCounts.get(f.idFactura) || 0) + 1);
  });
  idCounts.forEach((count, id) => {
    if (count > 1) {
      alertas.push({
        id: `ALT-DUP-${id}`,
        tipo: 'POSIBLE DUPLICADO',
        nivel: 'critica',
        titulo: `ID Duplicado en Base de Datos: ${id}`,
        descripcion: `Existen ${count} registros con el mismo identificador de factura en la base de datos relacional.`,
        fecha: hoy,
        estado: 'activa',
      });
    }
  });

  // 4. Concentración de proveedor (> umbral configurado o 30%)
  // Solo se evalúa cuando hay al menos el número mínimo de facturas configurado en el sistema (por defecto >= 3 facturas)
  // y más de 1 proveedor (> 1) para evitar falsas alertas al inicio del ejercicio o con pocas facturas registradas.
  const totalGasto = facturas.reduce((s, f) => s + f.total, 0);
  const proveedorSpend = new Map<string, { nombre: string; total: number }>();
  facturas.forEach((f) => {
    const entry = proveedorSpend.get(f.idProveedor) || { nombre: f.nombreProveedor, total: 0 };
    entry.total += f.total;
    proveedorSpend.set(f.idProveedor, entry);
  });

  const notificarConcentracion =
    config.notificarConcentracionProveedor !== false &&
    params.notificarConcentracionProveedor !== false;
  const umbralRatio = (config.umbralConcentracionPct ?? params.umbralConcentracionProveedorPct ?? 30) / 100;
  const minFacturas =
    typeof params.minimoFacturasParaConcentracion === 'number' && params.minimoFacturasParaConcentracion >= 1
      ? params.minimoFacturasParaConcentracion
      : 3;

  if (notificarConcentracion && facturas.length >= minFacturas && proveedorSpend.size > 1 && totalGasto > 0) {
    proveedorSpend.forEach((data, idProv) => {
      if (data.total / totalGasto > umbralRatio) {
        const pct = Math.round((data.total / totalGasto) * 100);
        alertas.push({
          id: `ALT-CONC-${idProv}`,
          tipo: 'CONCENTRACIÓN DE PROVEEDOR',
          nivel: 'alta',
          titulo: `Concentración en ${data.nombre} (${pct}%)`,
          descripcion: `Este proveedor concentra el ${pct}% del total de gasto de la empresa (${data.total.toLocaleString(
            'es-ES',
            { style: 'currency', currency: 'EUR' }
          )}), superando el umbral de concentración configurado (${Math.round(umbralRatio * 100)}%).`,
          fecha: hoy,
          estado: 'activa',
          datosRelacionados: {
            proveedor: data.nombre,
            importe: data.total,
            variacionPorcentaje: pct,
          },
        });
      }
    });
  }

  return alertas;
}
