import { ParametrosSistema, DEFAULT_PARAMETROS_SISTEMA, ConfiguracionAlertas } from '../types';

let cacheParametrosSistema: ParametrosSistema = { ...DEFAULT_PARAMETROS_SISTEMA };

/**
 * Obtiene los parámetros del sistema guardados en memoria o valores predeterminados.
 */
export function obtenerParametrosSistema(): ParametrosSistema {
  return cacheParametrosSistema;
}

export function establecerParametrosEnMemoria(params: ParametrosSistema): void {
  cacheParametrosSistema = { ...params };
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('fa_parametros_sistema_updated', { detail: params })
    );
  }
}

/**
 * Guarda los parámetros en memoria y sincroniza directamente con la base de datos MySQL (configuracion_parametros).
 */
export function guardarParametrosSistema(params: ParametrosSistema): void {
  const paramsCompletos: ParametrosSistema = {
    ...params,
    actualizadoEn: new Date().toISOString(),
  };
  cacheParametrosSistema = paramsCompletos;

  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('fa_parametros_sistema_updated', { detail: paramsCompletos })
    );
  }

  // ⚡ Persistir directamente en MySQL
  fetch('/api/parametros-sistema', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ parametros: paramsCompletos }),
  }).catch((err) => console.warn('Aviso al persistir parámetros en MySQL:', err));
}

/**
 * Carga los parámetros del sistema directamente desde la base de datos MySQL.
 */
export async function cargarParametrosDesdeMySQL(): Promise<ParametrosSistema | null> {
  if (typeof window === 'undefined') return null;
  try {
    const res = await fetch('/api/parametros-sistema');
    const data = await res.json();
    if (data.success && data.parametros) {
      const merged: ParametrosSistema = {
        ...DEFAULT_PARAMETROS_SISTEMA,
        ...data.parametros,
      };
      cacheParametrosSistema = merged;
      window.dispatchEvent(
        new CustomEvent('fa_parametros_sistema_updated', { detail: merged })
      );
      return merged;
    }
  } catch (err) {
    console.warn('Aviso al cargar parámetros desde MySQL:', err);
  }
  return null;
}

/**
 * Restablece los parámetros del sistema a los valores predeterminados de fábrica.
 */
export function restablecerParametrosSistema(): ParametrosSistema {
  const config = { ...DEFAULT_PARAMETROS_SISTEMA, actualizadoEn: new Date().toISOString() };
  guardarParametrosSistema(config);
  return config;
}
