/**
 * Utilidades de formato numérico conforme al estándar contable español/europeo:
 * - Separador de miles: punto (.)
 * - Separador decimal: coma (,)
 */

/**
 * Formatea un importe numérico con dos decimales y separador de miles:
 * Ejemplo: 12345.6 -> "12.345,60"
 */
export const formatMoneda = (valor: number | undefined | null): string => {
  const num = typeof valor === 'number' && !isNaN(valor) ? valor : 0;
  return num.toLocaleString('es-ES', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

/**
 * Formatea un número entero con separador de miles si corresponde:
 * Ejemplo: 1500 -> "1.500"
 */
export const formatEntero = (valor: number | undefined | null): string => {
  const num = typeof valor === 'number' && !isNaN(valor) ? Math.round(valor) : 0;
  return num.toLocaleString('es-ES');
};

/**
 * Formatea un porcentaje con separador decimal en coma:
 * Ejemplo: 14.2 -> "14,2"
 */
export const formatPorcentaje = (valor: number | undefined | null, decimales = 1): string => {
  const num = typeof valor === 'number' && !isNaN(valor) ? valor : 0;
  return num.toLocaleString('es-ES', {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  });
};
