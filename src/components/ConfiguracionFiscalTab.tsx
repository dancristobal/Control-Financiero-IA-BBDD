import React, { useState } from 'react';
import {
  Percent,
  Plus,
  RotateCcw,
  Search,
  Check,
  X,
  Edit2,
  Trash2,
  Sparkles,
  Info,
  ShieldCheck,
  Building2,
  Zap,
  Globe,
  Sliders,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
} from 'lucide-react';
import {
  ParametrosSistema,
  RegimenFiscalEmpresa,
  TipoImpositivoConfigurable,
  TipoImpuestoJurisdiccion,
  TIPOS_IMPOSITIVOS_PREDETERMINADOS,
  TipoRetencionIRPFConfigurable,
  ConceptoRetencionIRPF,
  TIPOS_RETENCION_IRPF_PREDETERMINADOS,
} from '../types';
import { aplicarPreajusteRegimen } from '../utils/fiscalidad';
import { TipoImpositivoModal } from './TipoImpositivoModal';

export interface ConfiguracionFiscalTabProps {
  parametros: ParametrosSistema;
  onUpdateParametros: (nuevosParametros: ParametrosSistema) => void;
}

export const ConfiguracionFiscalTab: React.FC<ConfiguracionFiscalTabProps> = ({
  parametros,
  onUpdateParametros,
}) => {
  const tiposLista = Array.isArray(parametros.tiposImpositivos) && parametros.tiposImpositivos.length > 0
    ? parametros.tiposImpositivos
    : TIPOS_IMPOSITIVOS_PREDETERMINADOS;

  const tiposIRPFLista = Array.isArray(parametros.tiposRetencionIRPF) && parametros.tiposRetencionIRPF.length > 0
    ? parametros.tiposRetencionIRPF
    : TIPOS_RETENCION_IRPF_PREDETERMINADOS;

  const [filtroJurisdiccion, setFiltroJurisdiccion] = useState<'TODOS' | TipoImpuestoJurisdiccion | 'PERSONALIZADOS'>('TODOS');
  const [filtroEstado, setFiltroEstado] = useState<'TODOS' | 'HABILITADOS' | 'DESHABILITADOS'>('TODOS');
  const [busqueda, setBusqueda] = useState('');

  // Modal de edición / creación
  const [modalAbierto, setModalAbierto] = useState(false);
  const [tipoEnEdicion, setTipoEnEdicion] = useState<TipoImpositivoConfigurable | null>(null);

  // Toast / Notificación
  const [notificacion, setNotificacion] = useState<{ tipo: 'ok' | 'info'; texto: string } | null>(null);

  const mostrarNotificacion = (texto: string, tipo: 'ok' | 'info' = 'ok') => {
    setNotificacion({ tipo, texto });
    setTimeout(() => setNotificacion(null), 3500);
  };

  const regimenActual: RegimenFiscalEmpresa = parametros.regimenFiscalEmpresa || 'IVA_PENINSULAR';

  // Manejar cambio de régimen y sugerir preajuste
  const handleCambiarRegimen = (nuevoRegimen: RegimenFiscalEmpresa) => {
    const nuevos = {
      ...parametros,
      regimenFiscalEmpresa: nuevoRegimen,
    };
    onUpdateParametros(nuevos);
    mostrarNotificacion(`Régimen fiscal establecido en: ${obtenerNombreRegimen(nuevoRegimen)}`);
  };

  // Aplicar preajuste recomendado completo para el régimen seleccionado
  const handleAplicarPreajuste = (regimen: RegimenFiscalEmpresa) => {
    const tiposAjustados = aplicarPreajusteRegimen(regimen, tiposLista);

    let defaultTipo = '21%';
    if (regimen === 'IGIC_CANARIAS') defaultTipo = 'IGIC 7%';
    else if (regimen === 'IPSI_CEUTA_MELILLA') defaultTipo = 'IPSI 4%';
    else if (regimen === 'EXENTO_FRANQUICIA') defaultTipo = '0% Exento';

    const aplicaRecargo = regimen === 'RECARGO_EQUIVALENCIA';

    const nuevos: ParametrosSistema = {
      ...parametros,
      regimenFiscalEmpresa: regimen,
      tipoIvaPredeterminado: defaultTipo,
      aplicaRecargoEquivalenciaDefecto: aplicaRecargo,
      tiposImpositivos: tiposAjustados,
    };

    onUpdateParametros(nuevos);
    mostrarNotificacion(`¡Preajuste recomendado aplicado para ${obtenerNombreRegimen(regimen)}!`, 'ok');
  };

  // Toggle rápido de habilitado/deshabilitado de un tipo
  const handleToggleHabilitado = (id: string) => {
    const actualizados = tiposLista.map((t) =>
      t.id === id ? { ...t, habilitado: !t.habilitado } : t
    );
    const tipoModificado = actualizados.find((t) => t.id === id);
    const nuevos: ParametrosSistema = {
      ...parametros,
      tiposImpositivos: actualizados,
    };
    onUpdateParametros(nuevos);
    mostrarNotificacion(
      `Tipo "${tipoModificado?.nombre || id}" ${tipoModificado?.habilitado ? 'habilitado' : 'deshabilitado'} globalmente.`
    );
  };

  // Toggle rápido de habilitado/deshabilitado de un tipo de retención IRPF
  const handleToggleHabilitadoIRPF = (id: string) => {
    const actualizados = tiposIRPFLista.map((t) =>
      t.id === id ? { ...t, habilitado: !t.habilitado } : t
    );
    const item = actualizados.find((t) => t.id === id);
    const nuevos: ParametrosSistema = {
      ...parametros,
      tiposRetencionIRPF: actualizados,
    };
    onUpdateParametros(nuevos);
    mostrarNotificacion(
      `Retención IRPF "${item?.nombre || id}" ${item?.habilitado ? 'habilitada' : 'deshabilitada'}.`
    );
  };

  // Guardar creación o edición
  const handleGuardarTipo = (tipo: TipoImpositivoConfigurable) => {
    let actualizados: TipoImpositivoConfigurable[];
    const existe = tiposLista.some((t) => t.id === tipo.id);
    if (existe) {
      actualizados = tiposLista.map((t) => (t.id === tipo.id ? tipo : t));
    } else {
      actualizados = [tipo, ...tiposLista];
    }
    const nuevos: ParametrosSistema = {
      ...parametros,
      tiposImpositivos: actualizados,
    };
    onUpdateParametros(nuevos);
    setModalAbierto(false);
    setTipoEnEdicion(null);
    mostrarNotificacion(`Tipo impositivo "${tipo.nombre}" guardado con éxito.`);
  };

  // Eliminar tipo personalizado
  const handleEliminarTipo = (id: string) => {
    const target = tiposLista.find((t) => t.id === id);
    if (!target) return;
    if (!target.esPersonalizado) {
      // Para tipos oficiales, sólo deshabilitamos
      handleToggleHabilitado(id);
      return;
    }
    const actualizados = tiposLista.filter((t) => t.id !== id);
    const nuevos: ParametrosSistema = {
      ...parametros,
      tiposImpositivos: actualizados,
    };
    onUpdateParametros(nuevos);
    mostrarNotificacion(`Tipo impositivo personalizado eliminado.`);
  };

  // Restablecer catálogo oficial
  const handleRestablecerOficiales = () => {
    if (window.confirm('¿Deseas restablecer el catálogo de tipos impositivos a los valores oficiales por defecto? Los tipos personalizados se conservarán.')) {
      const personalizados = tiposLista.filter((t) => t.esPersonalizado);
      const combinados = [...TIPOS_IMPOSITIVOS_PREDETERMINADOS, ...personalizados];
      const nuevos: ParametrosSistema = {
        ...parametros,
        tiposImpositivos: combinados,
      };
      onUpdateParametros(nuevos);
      mostrarNotificacion('Catálogo oficial restablecido correctamente.');
    }
  };

  // Filtrado de tipos
  const tiposFiltrados = tiposLista.filter((t) => {
    if (filtroJurisdiccion === 'PERSONALIZADOS') {
      if (!t.esPersonalizado) return false;
    } else if (filtroJurisdiccion !== 'TODOS') {
      if (t.tipoImpuesto !== filtroJurisdiccion) return false;
    }

    if (filtroEstado === 'HABILITADOS' && !t.habilitado) return false;
    if (filtroEstado === 'DESHABILITADOS' && t.habilitado) return false;

    if (busqueda.trim()) {
      const query = busqueda.toLowerCase().trim();
      const matchNombre = t.nombre.toLowerCase().includes(query);
      const matchValor = t.valor.toLowerCase().includes(query);
      const matchDesc = (t.descripcion || '').toLowerCase().includes(query);
      const matchEjemplos = (t.ejemplos || '').toLowerCase().includes(query);
      if (!matchNombre && !matchValor && !matchDesc && !matchEjemplos) return false;
    }

    return true;
  });

  const totalHabilitados = tiposLista.filter((t) => t.habilitado).length;

  return (
    <div className="space-y-6">
      {/* Notificación Flotante */}
      {notificacion && (
        <div
          className={`p-3 rounded-xl border flex items-center justify-between text-xs animate-in slide-in-from-top duration-200 shadow-lg ${
            notificacion.tipo === 'ok'
              ? 'bg-emerald-950/90 border-emerald-700/80 text-emerald-200'
              : 'bg-sky-950/90 border-sky-700/80 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="font-medium">{notificacion.texto}</span>
          </div>
          <button
            onClick={() => setNotificacion(null)}
            className="p-1 hover:bg-black/20 rounded-md text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* CABECERA EXPLICATIVA */}
      <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Percent className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <span>Configuración Fiscal y Tipos Impositivos Dinámicos</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono">
                  {totalHabilitados} tipos activos
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Define el régimen tributario de tu empresa y activa o personaliza los gravámenes (IVA, IGIC, IPSI, tipos temporales de alimentos y recargos) que se usarán en toda la aplicación.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              setTipoEnEdicion(null);
              setModalAbierto(true);
            }}
            className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors shadow-sm flex items-center gap-1.5 shrink-0 self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>Crear Tipo Impositivo</span>
          </button>
        </div>
      </div>

      {/* BLOQUE 1: RÉGIMEN FISCAL DE LA EMPRESA */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              1. Régimen Fiscal Principal de la Empresa
            </h4>
          </div>
          <span className="text-[11px] text-slate-400">
            Ajusta los tipos predeterminados y sugerencias automáticas
          </span>
        </div>

        {/* Tarjetas de Selección de Régimen */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
          <RegimenCard
            id="regimen-iva"
            titulo="Régimen General Peninsular (IVA)"
            bandera="🇪🇸"
            descripcion="Empresas en Península y Baleares. Sujetas a IVA 21%, 10%, 4% y tipos temporales."
            seleccionado={regimenActual === 'IVA_PENINSULAR'}
            onSelect={() => handleCambiarRegimen('IVA_PENINSULAR')}
          />
          <RegimenCard
            id="regimen-igic"
            titulo="Régimen Autonómico Canario (IGIC)"
            bandera="🏝️"
            descripcion="Empresas en Islas Canarias. Gravamen IGIC 7%, 3%, 0%, 9.5%, 15% y recargo minorista."
            seleccionado={regimenActual === 'IGIC_CANARIAS'}
            onSelect={() => handleCambiarRegimen('IGIC_CANARIAS')}
          />
          <RegimenCard
            id="regimen-ipsi"
            titulo="Régimen Especial Ceuta y Melilla (IPSI)"
            bandera="🏛️"
            descripcion="Empresas radicadas en Ceuta o Melilla. Sujetas a IPSI con gravámenes municipales."
            seleccionado={regimenActual === 'IPSI_CEUTA_MELILLA'}
            onSelect={() => handleCambiarRegimen('IPSI_CEUTA_MELILLA')}
          />
          <RegimenCard
            id="regimen-re"
            titulo="Recargo de Equivalencia (R.E.)"
            bandera="🛍️"
            descripcion="Comerciantes minoristas autónomos. Aplica cuota de recargo en las facturas de proveedores."
            seleccionado={regimenActual === 'RECARGO_EQUIVALENCIA'}
            onSelect={() => handleCambiarRegimen('RECARGO_EQUIVALENCIA')}
          />
          <RegimenCard
            id="regimen-multi"
            titulo="Multirégimen / Consolidado"
            bandera="🌐"
            descripcion="Opera con proveedores nacionales, canarios y comunitarios con desglose consolidado."
            seleccionado={regimenActual === 'MULTIRREGIMEN'}
            onSelect={() => handleCambiarRegimen('MULTIRREGIMEN')}
          />
          <RegimenCard
            id="regimen-exento"
            titulo="Franquicia / Operaciones Exentas"
            bandera="🛡️"
            descripcion="Actividades médicas, formativas o exentas de repercutir IVA según el art. 20 LIVA."
            seleccionado={regimenActual === 'EXENTO_FRANQUICIA'}
            onSelect={() => handleCambiarRegimen('EXENTO_FRANQUICIA')}
          />
        </div>

        {/* Botón de Aplicar Preajuste Inteligente */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-sky-300">⚡ Preajuste Recomendado: </span>
            <span>Configura y activa en 1 clic los tipos impositivos estándar idóneos para <strong>{obtenerNombreRegimen(regimenActual)}</strong>.</span>
          </div>
          <button
            onClick={() => handleAplicarPreajuste(regimenActual)}
            className="px-3.5 py-1.5 rounded-lg bg-sky-600/90 hover:bg-sky-500 text-white text-xs font-bold transition-colors flex items-center gap-1.5 shrink-0"
          >
            <Zap className="w-3.5 h-3.5 text-amber-300" />
            <span>Aplicar Preajuste para este Régimen</span>
          </button>
        </div>

        {/* Parámetros Generales Complementarios */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
          {/* Tipo de IVA predeterminado */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">
              Tipo Impositivo Predeterminado para Nuevas Facturas
            </label>
            <select
              value={parametros.tipoIvaPredeterminado || '21%'}
              onChange={(e) => {
                const nuevos = { ...parametros, tipoIvaPredeterminado: e.target.value };
                onUpdateParametros(nuevos);
                mostrarNotificacion(`Tipo predeterminado fijado a ${e.target.value}`);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 font-mono"
            >
              {tiposLista.filter((t) => t.habilitado).map((t) => (
                <option key={t.id} value={t.valor}>
                  {t.nombre} ({t.porcentaje}%{t.porcentajeRecargo > 0 ? ` + R.E. ${t.porcentajeRecargo}%` : ''})
                </option>
              ))}
            </select>
          </div>

          {/* Toggle de Recargo de Equivalencia por defecto */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer select-none p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700">
              <input
                type="checkbox"
                checked={Boolean(parametros.aplicaRecargoEquivalenciaDefecto)}
                onChange={(e) => {
                  const nuevos = { ...parametros, aplicaRecargoEquivalenciaDefecto: e.target.checked };
                  onUpdateParametros(nuevos);
                  mostrarNotificacion(`Recargo de equivalencia por defecto: ${e.target.checked ? 'Activado' : 'Desactivado'}`);
                }}
                className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-medium text-purple-300">Aplicar R.E. en compras por defecto</span>
                <p className="text-[10px] text-slate-400">Activa automáticamente el cálculo de recargo minorista</p>
              </div>
            </label>
          </div>

          {/* Toggle de soporte IPSI */}
          <div className="space-y-1.5 flex flex-col justify-end">
            <label className="flex items-center gap-2 cursor-pointer select-none p-2 rounded-xl bg-slate-950/80 border border-slate-800 hover:border-slate-700">
              <input
                type="checkbox"
                checked={Boolean(parametros.mostrarTiposIpsi)}
                onChange={(e) => {
                  const nuevos = { ...parametros, mostrarTiposIpsi: e.target.checked };
                  onUpdateParametros(nuevos);
                  mostrarNotificacion(`Soporte de tipos IPSI: ${e.target.checked ? 'Visible' : 'Oculto'}`);
                }}
                className="w-4 h-4 rounded border-slate-700 text-amber-600 focus:ring-amber-500 cursor-pointer"
              />
              <div className="text-xs">
                <span className="font-medium text-amber-300">Habilitar selección de IPSI</span>
                <p className="text-[10px] text-slate-400">Permite registrar operaciones de Ceuta y Melilla</p>
              </div>
            </label>
          </div>

          {/* Porcentaje de IRPF predeterminado */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-emerald-300 flex items-center justify-between">
              <span>Retención IRPF Predeterminada</span>
              <span className="text-[10px] text-slate-400 font-normal">Mod. 111 / 115</span>
            </label>
            <select
              value={parametros.porcentajeIrpfPredeterminado ?? 15}
              onChange={(e) => {
                const val = parseFloat(e.target.value) || 15;
                const nuevos = {
                  ...parametros,
                  porcentajeIrpfPredeterminado: val,
                  conceptoIrpfPredeterminado: (val === 19 ? 'ARRENDAMIENTO' : val === 2 ? 'AGRARIO' : 'PROFESIONAL') as ConceptoRetencionIRPF
                };
                onUpdateParametros(nuevos);
                mostrarNotificacion(`Retención IRPF predeterminada fijada en ${val}%`);
              }}
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-emerald-700/60 text-emerald-200 text-xs focus:outline-hidden focus:border-emerald-500 font-mono"
            >
              <option value="15">15% Profesional General (Mod. 111)</option>
              <option value="7">7% Nuevos Autónomos - Primeros 3 años (Mod. 111)</option>
              <option value="19">19% Arrendamiento Inmuebles / Locales (Mod. 115)</option>
              <option value="2">2% Actividades Agrícolas y Ganaderas (Mod. 111)</option>
              <option value="1">1% Módulos / Estimación Objetiva (Mod. 111)</option>
            </select>
          </div>
        </div>
      </div>

      {/* BLOQUE 2: CATÁLOGO DE TIPOS IMPOSITIVOS (CRUD & GESTIÓN) */}
      <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              2. Catálogo de Tipos Impositivos (IVA / IGIC / IPSI / Exentos)
            </h4>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleRestablecerOficiales}
              className="text-[11px] text-slate-400 hover:text-slate-200 flex items-center gap-1 px-2 py-1 rounded-md hover:bg-slate-800 transition-colors"
              title="Restaura los porcentajes oficiales de IVA, IGIC y tipos temporales"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Restablecer oficiales</span>
            </button>
          </div>
        </div>

        {/* Barra de Filtros y Búsqueda */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Filtros por Jurisdicción */}
          <div className="flex flex-wrap items-center gap-1.5">
            <FilterChip
              label="Todos"
              active={filtroJurisdiccion === 'TODOS'}
              onClick={() => setFiltroJurisdiccion('TODOS')}
            />
            <FilterChip
              label="IVA Península"
              active={filtroJurisdiccion === 'IVA'}
              onClick={() => setFiltroJurisdiccion('IVA')}
              badgeColor="sky"
            />
            <FilterChip
              label="IGIC Canarias"
              active={filtroJurisdiccion === 'IGIC'}
              onClick={() => setFiltroJurisdiccion('IGIC')}
              badgeColor="emerald"
            />
            <FilterChip
              label="IPSI Ceuta/Melilla"
              active={filtroJurisdiccion === 'IPSI'}
              onClick={() => setFiltroJurisdiccion('IPSI')}
              badgeColor="amber"
            />
            <FilterChip
              label="Exentos"
              active={filtroJurisdiccion === 'EXENTO'}
              onClick={() => setFiltroJurisdiccion('EXENTO')}
              badgeColor="slate"
            />
            <FilterChip
              label="Personalizados"
              active={filtroJurisdiccion === 'PERSONALIZADOS'}
              onClick={() => setFiltroJurisdiccion('PERSONALIZADOS')}
              badgeColor="purple"
            />
          </div>

          {/* Estado y Búsqueda */}
          <div className="flex items-center gap-2">
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value as any)}
              className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-hidden"
            >
              <option value="TODOS">Todos los estados</option>
              <option value="HABILITADOS">Solo habilitados</option>
              <option value="DESHABILITADOS">Solo deshabilitados</option>
            </select>

            <div className="relative w-44 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                value={busqueda}
                onChange={(e) => setBusqueda(e.target.value)}
                placeholder="Buscar tipo o %..."
                className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-700 text-slate-200 text-xs focus:outline-hidden focus:border-rose-500"
              />
              {busqueda && (
                <button
                  onClick={() => setBusqueda('')}
                  className="absolute right-2 top-2 text-slate-400 hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Grid de Tipos Impositivos */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {tiposFiltrados.map((tipo) => (
            <TipoImpositivoCard
              key={tipo.id}
              tipo={tipo}
              onToggle={() => handleToggleHabilitado(tipo.id)}
              onEdit={() => {
                setTipoEnEdicion(tipo);
                setModalAbierto(true);
              }}
              onDelete={() => handleEliminarTipo(tipo.id)}
            />
          ))}

          {tiposFiltrados.length === 0 && (
            <div className="col-span-full py-10 text-center rounded-2xl bg-slate-950/40 border border-slate-800/80">
              <Percent className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-300">
                No se encontraron tipos impositivos con los filtros aplicados
              </p>
              <p className="text-[11px] text-slate-500 mt-1">
                Prueba a limpiar la búsqueda o crea un nuevo tipo personalizado.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* BLOQUE 3: CATÁLOGO DE RETENCIONES DE IRPF (MODELOS 111 Y 115 AEAT) */}
      <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-[#091512] border border-emerald-800/50 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-emerald-900/40 pb-3">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              3. Catálogo de Retenciones de IRPF a Cuenta (Modelos 111 y 115)
            </h4>
          </div>
          <span className="text-[11px] text-emerald-400 font-mono">
            Hacienda Pública / AEAT
          </span>
        </div>

        <p className="text-xs text-slate-300 leading-relaxed">
          Configuración de los tipos de retención aplicados en facturas de proveedores profesionales, autónomos y alquileres. La retención minorará el total líquido pagado al proveedor y se liquidará periódicamente ante la Agencia Tributaria.
        </p>

        {/* Grid de Retenciones de IRPF Disponibles */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 pt-1">
          {tiposIRPFLista.map((irpf) => (
            <div
              key={irpf.id}
              className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
                irpf.habilitado
                  ? 'bg-slate-950/80 border-emerald-700/60 shadow-xs'
                  : 'bg-slate-950/40 border-slate-800 opacity-60'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    {irpf.modeloAEAT || (irpf as any).modeloAeat || '111'}
                  </span>

                  {/* Switch de Habilitación */}
                  <button
                    type="button"
                    onClick={() => handleToggleHabilitadoIRPF(irpf.id)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      irpf.habilitado ? 'bg-emerald-500' : 'bg-slate-700'
                    }`}
                    title={irpf.habilitado ? 'Habilitado (clic para desactivar)' : 'Deshabilitado (clic para activar)'}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        irpf.habilitado ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                <div className="flex items-baseline justify-between gap-2 mb-1.5">
                  <h5 className="text-xs font-bold text-slate-100 leading-tight">
                    {irpf.nombre}
                  </h5>
                  <span className="text-base font-black font-mono text-emerald-400 shrink-0">
                    -{irpf.porcentaje}%
                  </span>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed mb-2">
                  {irpf.descripcion}
                </p>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                <span>Concepto: {irpf.concepto}</span>
                <span className={irpf.habilitado ? 'text-emerald-400 font-semibold' : 'text-slate-500'}>
                  {irpf.habilitado ? 'Disponible en facturas' : 'Inactivo'}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal de Creación / Edición */}
      <TipoImpositivoModal
        isOpen={modalAbierto}
        onClose={() => {
          setModalAbierto(false);
          setTipoEnEdicion(null);
        }}
        tipoInicial={tipoEnEdicion}
        onSave={handleGuardarTipo}
      />
    </div>
  );
};

// Componente para tarjeta de selección de régimen
interface RegimenCardProps {
  id: string;
  titulo: string;
  bandera: string;
  descripcion: string;
  seleccionado: boolean;
  onSelect: () => void;
}

const RegimenCard: React.FC<RegimenCardProps> = ({
  id,
  titulo,
  bandera,
  descripcion,
  seleccionado,
  onSelect,
}) => {
  return (
    <button
      type="button"
      id={id}
      onClick={onSelect}
      className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
        seleccionado
          ? 'bg-rose-950/20 border-rose-500/80 shadow-md ring-1 ring-rose-500/30'
          : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
      }`}
    >
      <div>
        <div className="flex items-center justify-between gap-1.5 mb-1">
          <div className="flex items-center gap-1.5">
            <span className="text-base leading-none">{bandera}</span>
            <span className={`text-xs font-bold leading-tight ${seleccionado ? 'text-rose-300' : 'text-slate-200'}`}>
              {titulo}
            </span>
          </div>
          {seleccionado && (
            <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0"></span>
          )}
        </div>
        <p className="text-[10px] text-slate-400 leading-relaxed line-clamp-2">
          {descripcion}
        </p>
      </div>

      <div className="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[10px]">
        <span className={seleccionado ? 'text-rose-400 font-bold' : 'text-slate-500'}>
          {seleccionado ? '✓ Régimen Activo' : 'Seleccionar'}
        </span>
      </div>
    </button>
  );
};

// Componente para chip de filtro
interface FilterChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
  badgeColor?: 'sky' | 'emerald' | 'amber' | 'slate' | 'purple';
}

const FilterChip: React.FC<FilterChipProps> = ({ label, active, onClick, badgeColor }) => {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
        active
          ? 'bg-rose-500 text-white shadow-xs'
          : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
      }`}
    >
      {label}
    </button>
  );
};

// Componente para tarjeta individual de tipo impositivo
interface TipoImpositivoCardProps {
  tipo: TipoImpositivoConfigurable;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

const TipoImpositivoCard: React.FC<TipoImpositivoCardProps> = ({
  tipo,
  onToggle,
  onEdit,
  onDelete,
}) => {
  const getJurisdiccionBadge = (jur: TipoImpuestoJurisdiccion) => {
    switch (jur) {
      case 'IVA':
        return <span className="px-1.5 py-0.5 rounded-md bg-sky-500/10 text-sky-400 border border-sky-500/20 text-[10px] font-bold">IVA</span>;
      case 'IGIC':
        return <span className="px-1.5 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-bold">IGIC Canario</span>;
      case 'IPSI':
        return <span className="px-1.5 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20 text-[10px] font-bold">IPSI Ceuta/Melilla</span>;
      case 'EXENTO':
        return <span className="px-1.5 py-0.5 rounded-md bg-slate-500/10 text-slate-400 border border-slate-500/20 text-[10px] font-bold">Exento (0%)</span>;
      default:
        return <span className="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[10px] font-bold">Especial</span>;
    }
  };

  return (
    <div
      className={`p-3.5 rounded-xl border transition-all flex flex-col justify-between ${
        tipo.habilitado
          ? 'bg-slate-950/80 border-slate-700/80 hover:border-slate-600'
          : 'bg-slate-950/30 border-slate-800/60 opacity-60 hover:opacity-80'
      }`}
    >
      <div>
        {/* Header de la tarjeta */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1.5">
            {getJurisdiccionBadge(tipo.tipoImpuesto)}
            {tipo.esTemporal && (
              <span className="px-1.5 py-0.5 rounded-md bg-rose-500/10 text-rose-400 border border-rose-500/20 text-[9px] font-semibold">
                Temporal
              </span>
            )}
            {tipo.esPersonalizado && (
              <span className="px-1.5 py-0.5 rounded-md bg-purple-500/10 text-purple-400 border border-purple-500/20 text-[9px] font-semibold">
                Personalizado
              </span>
            )}
          </div>

          {/* Switch de Habilitación */}
          <button
            type="button"
            onClick={onToggle}
            className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
              tipo.habilitado ? 'bg-emerald-500' : 'bg-slate-700'
            }`}
            title={tipo.habilitado ? 'Habilitado (clic para desactivar)' : 'Deshabilitado (clic para activar)'}
          >
            <span
              className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                tipo.habilitado ? 'translate-x-4' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Nombre y Porcentajes */}
        <div className="mb-2">
          <div className="flex items-baseline justify-between gap-2">
            <h5 className="text-xs font-bold text-slate-100 leading-tight">
              {tipo.nombre}
            </h5>
            <span className="text-sm font-black font-mono text-sky-400 shrink-0">
              {tipo.porcentaje}%
            </span>
          </div>

          {tipo.porcentajeRecargo > 0 && (
            <div className="mt-1 flex items-center gap-1 text-[11px] text-purple-300 font-mono">
              <span>Recargo asociado:</span>
              <strong className="text-purple-200 font-bold">+{tipo.porcentajeRecargo}%</strong>
              {tipo.aplicaRecargoDefecto && (
                <span className="text-[9px] text-purple-400 font-sans">(por defecto)</span>
              )}
            </div>
          )}
        </div>

        {/* Descripción o Ejemplos */}
        {(tipo.descripcion || tipo.ejemplos) && (
          <div className="space-y-1 mb-2 pt-1 border-t border-slate-800/80">
            {tipo.descripcion && (
              <p className="text-[11px] text-slate-400 leading-tight">
                {tipo.descripcion}
              </p>
            )}
            {tipo.ejemplos && (
              <p className="text-[10px] text-slate-500 italic leading-tight">
                {tipo.ejemplos}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Botones de acción */}
      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
        <div className="text-[10px] text-slate-500 font-mono">
          {tipo.valor}
        </div>

        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={onEdit}
            className="p-1 rounded-md text-slate-400 hover:text-sky-300 hover:bg-slate-800 transition-colors"
            title="Editar este tipo impositivo"
          >
            <Edit2 className="w-3.5 h-3.5" />
          </button>
          {tipo.esPersonalizado && (
            <button
              type="button"
              onClick={onDelete}
              className="p-1 rounded-md text-slate-400 hover:text-red-400 hover:bg-slate-800 transition-colors"
              title="Eliminar este tipo personalizado"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

function obtenerNombreRegimen(regimen: RegimenFiscalEmpresa): string {
  switch (regimen) {
    case 'IVA_PENINSULAR':
      return 'Régimen General Peninsular (IVA)';
    case 'IGIC_CANARIAS':
      return 'Régimen Autonómico Canario (IGIC)';
    case 'IPSI_CEUTA_MELILLA':
      return 'Régimen Especial Ceuta y Melilla (IPSI)';
    case 'RECARGO_EQUIVALENCIA':
      return 'Recargo de Equivalencia (R.E.)';
    case 'MULTIRREGIMEN':
      return 'Multirégimen / Consolidado';
    case 'EXENTO_FRANQUICIA':
      return 'Franquicia / Operaciones Exentas';
    default:
      return 'Régimen General';
  }
}
