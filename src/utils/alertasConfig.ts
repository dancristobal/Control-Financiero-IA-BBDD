import { Alerta, ConfiguracionAlertas, DEFAULT_CONFIGURACION_ALERTAS, Factura } from '../types';

let cacheConfiguracionAlertas: ConfiguracionAlertas = { ...DEFAULT_CONFIGURACION_ALERTAS };

/**
 * Obtiene la configuración de alertas guardada en memoria
 * o retorna la configuración predeterminada (8% moderada, 15% crítica)
 */
export function obtenerConfiguracionAlertas(): ConfiguracionAlertas {
  return cacheConfiguracionAlertas;
}

/**
 * Guarda las preferencias de alertas en memoria y emite un evento personalizado
 */
export function guardarConfiguracionAlertas(config: ConfiguracionAlertas): void {
  const configCompleta: ConfiguracionAlertas = {
    ...config,
    actualizadoEn: new Date().toISOString(),
  };
  cacheConfiguracionAlertas = configCompleta;
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('fa_alertas_config_updated', { detail: configCompleta })
    );
  }
}

/**
 * Restablece la configuración a los valores por defecto del sistema
 */
export function restablecerConfiguracionAlertas(): ConfiguracionAlertas {
  const config = { ...DEFAULT_CONFIGURACION_ALERTAS, actualizadoEn: new Date().toISOString() };
  guardarConfiguracionAlertas(config);
  return config;
}

/**
 * Evalúa las subidas de precio en el conjunto de facturas según el umbral configurado.
 * Detecta incrementos de precio unitario en un mismo producto entre compras consecutivas.
 */
export function evaluarSubidasPrecioDesdeFacturas(
  facturas: Factura[],
  config: ConfiguracionAlertas
): Alerta[] {
  if (!facturas || facturas.length === 0) return [];

  // Mapear todas las compras de productos ordenadas por fecha
  const comprasPorProducto: Record<
    string,
    Array<{
      idFactura: string;
      fecha: string;
      nombreProveedor: string;
      nombreProducto: string;
      precioUnitario: number;
      cantidad: number;
      unidad: string;
    }>
  > = {};

  facturas.forEach((fac) => {
    if (fac.lineas && fac.lineas.length > 0) {
      fac.lineas.forEach((lin) => {
        const prodKey = lin.nombreProducto.trim().toLowerCase();
        if (!comprasPorProducto[prodKey]) {
          comprasPorProducto[prodKey] = [];
        }
        comprasPorProducto[prodKey].push({
          idFactura: fac.idFactura,
          fecha: fac.fechaEmision,
          nombreProveedor: fac.nombreProveedor,
          nombreProducto: lin.nombreProducto.trim(),
          precioUnitario: lin.precioUnitario,
          cantidad: lin.cantidad,
          unidad: lin.unidad,
        });
      });
    }
  });

  const alertasSubida: Alerta[] = [];

  // Recorrer cada producto y comparar compras sucesivas
  Object.keys(comprasPorProducto).forEach((prodKey) => {
    const compras = comprasPorProducto[prodKey];
    // Ordenar de más antigua a más reciente
    compras.sort((a, b) => a.fecha.localeCompare(b.fecha));

    if (compras.length < 2) return;

    // Comparar cada compra con su compra anterior (o contra el precio de referencia inicial)
    for (let i = 1; i < compras.length; i++) {
      const actual = compras[i];
      const previa = compras[i - 1];

      if (previa.precioUnitario <= 0) continue;

      const varPct = ((actual.precioUnitario - previa.precioUnitario) / previa.precioUnitario) * 100;

      // Si la variación supera el umbral configurado por el usuario
      if (varPct >= config.umbralSubidaModeradaPct) {
        const esCritica = varPct >= config.umbralSubidaCriticaPct;
        alertasSubida.push({
          id: `ALT-PRICE-${actual.idFactura}-${actual.nombreProducto.replace(/\s+/g, '_')}-${i}`,
          tipo: 'SUBIDA DE PRECIO',
          nivel: esCritica ? 'critica' : 'alta',
          titulo: `Subida en ${actual.nombreProducto} (+${varPct.toFixed(1)}%)`,
          descripcion: `${actual.nombreProducto} subió de ${previa.precioUnitario.toFixed(2)} € a ${actual.precioUnitario.toFixed(2)} € (+${varPct.toFixed(1)}%) suministrado por ${actual.nombreProveedor}.`,
          fecha: actual.fecha,
          estado: 'activa',
          datosRelacionados: {
            proveedor: actual.nombreProveedor,
            producto: actual.nombreProducto,
            precioAnterior: previa.precioUnitario,
            precioNuevo: actual.precioUnitario,
            variacionPorcentaje: Number(varPct.toFixed(2)),
            idFactura: actual.idFactura,
          },
        });
      }
    }
  });

  // Ordenar por fecha descendente
  alertasSubida.sort((a, b) => b.fecha.localeCompare(a.fecha));

  return alertasSubida;
}
