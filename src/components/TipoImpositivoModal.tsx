import React, { useState, useEffect } from 'react';
import { X, Percent, ShieldCheck, Tag, Info, Check, Sparkles } from 'lucide-react';
import {
  TipoImpositivoConfigurable,
  TipoImpuestoJurisdiccion,
} from '../types';

export interface TipoImpositivoModalProps {
  isOpen: boolean;
  onClose: () => void;
  tipoInicial?: TipoImpositivoConfigurable | null;
  onSave: (tipo: TipoImpositivoConfigurable) => void;
}

export const TipoImpositivoModal: React.FC<TipoImpositivoModalProps> = ({
  isOpen,
  onClose,
  tipoInicial,
  onSave,
}) => {
  const [nombre, setNombre] = useState('');
  const [tipoImpuesto, setTipoImpuesto] = useState<TipoImpuestoJurisdiccion>('IVA');
  const [porcentaje, setPorcentaje] = useState<number>(21);
  const [porcentajeRecargo, setPorcentajeRecargo] = useState<number>(5.2);
  const [aplicaRecargoDefecto, setAplicaRecargoDefecto] = useState<boolean>(false);
  const [habilitado, setHabilitado] = useState<boolean>(true);
  const [esTemporal, setEsTemporal] = useState<boolean>(false);
  const [descripcion, setDescripcion] = useState('');
  const [ejemplos, setEjemplos] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tipoInicial) {
      setNombre(tipoInicial.nombre || '');
      setTipoImpuesto(tipoInicial.tipoImpuesto || 'IVA');
      setPorcentaje(tipoInicial.porcentaje !== undefined ? tipoInicial.porcentaje : 21);
      setPorcentajeRecargo(tipoInicial.porcentajeRecargo !== undefined ? tipoInicial.porcentajeRecargo : 0);
      setAplicaRecargoDefecto(Boolean(tipoInicial.aplicaRecargoDefecto));
      setHabilitado(tipoInicial.habilitado !== undefined ? tipoInicial.habilitado : true);
      setEsTemporal(Boolean(tipoInicial.esTemporal));
      setDescripcion(tipoInicial.descripcion || '');
      setEjemplos(tipoInicial.ejemplos || '');
      setError(null);
    } else {
      setNombre('');
      setTipoImpuesto('IVA');
      setPorcentaje(21);
      setPorcentajeRecargo(5.2);
      setAplicaRecargoDefecto(false);
      setHabilitado(true);
      setEsTemporal(false);
      setDescripcion('');
      setEjemplos('');
      setError(null);
    }
  }, [tipoInicial, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setError('Debes especificar un nombre para el tipo impositivo.');
      return;
    }
    if (isNaN(porcentaje) || porcentaje < 0 || porcentaje > 100) {
      setError('El porcentaje de gravamen debe estar entre 0% y 100%.');
      return;
    }
    if (isNaN(porcentajeRecargo) || porcentajeRecargo < 0 || porcentajeRecargo > 100) {
      setError('El porcentaje de recargo debe estar entre 0% y 100%.');
      return;
    }

    let valorCalculado = `${porcentaje}%`;
    if (tipoImpuesto === 'IGIC') {
      valorCalculado = `IGIC ${porcentaje}%`;
    } else if (tipoImpuesto === 'IPSI') {
      valorCalculado = `IPSI ${porcentaje}%`;
    } else if (tipoImpuesto === 'EXENTO' || porcentaje === 0) {
      valorCalculado = '0% Exento';
    } else if (esTemporal) {
      valorCalculado = `${porcentaje}% (Temporal)`;
    }

    const idGenerado = tipoInicial?.id || `tipo-custom-${Date.now()}`;
    const codigoGenerado = tipoInicial?.codigo || `${tipoImpuesto}_${porcentaje.toString().replace('.', '_')}_CUSTOM`;

    const nuevoTipo: TipoImpositivoConfigurable = {
      id: idGenerado,
      codigo: codigoGenerado,
      nombre: nombre.trim(),
      valor: valorCalculado,
      tipoImpuesto,
      porcentaje: Number(porcentaje),
      porcentajeRecargo: Number(porcentajeRecargo),
      aplicaRecargoDefecto,
      habilitado,
      esPersonalizado: tipoInicial ? tipoInicial.esPersonalizado : true,
      esTemporal,
      descripcion: descripcion.trim() || undefined,
      ejemplos: ejemplos.trim() || undefined,
    };

    onSave(nuevoTipo);
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg bg-[#0d1525] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-[#111c30] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center shrink-0">
              <Percent className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">
                {tipoInicial ? 'Editar Tipo Impositivo' : 'Crear Nuevo Tipo Impositivo'}
              </h3>
              <p className="text-[11px] text-slate-400">
                {tipoInicial ? 'Modifica los porcentajes y parámetros tributarios' : 'Define un tipo para IVA, IGIC, IPSI o régimen especial'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulario */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center gap-2">
              <Info className="w-4 h-4 text-red-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Nombre */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Nombre o Denominación del Tipo <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={nombre}
              onChange={(e) => setNombre(e.target.value)}
              placeholder="Ej: 21% - IVA General Peninsular o IPSI 4% Servicios"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500"
              required
            />
          </div>

          {/* Jurisdicción e Impuesto */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Jurisdicción Tributaria
              </label>
              <select
                value={tipoImpuesto}
                onChange={(e) => {
                  const jur = e.target.value as TipoImpuestoJurisdiccion;
                  setTipoImpuesto(jur);
                  if (jur === 'IGIC') {
                    if (porcentaje === 21) setPorcentaje(7);
                    setPorcentajeRecargo(0.7);
                  } else if (jur === 'IPSI') {
                    if (porcentaje === 21) setPorcentaje(4);
                    setPorcentajeRecargo(0);
                  } else if (jur === 'EXENTO') {
                    setPorcentaje(0);
                    setPorcentajeRecargo(0);
                  } else if (jur === 'IVA') {
                    if (porcentaje === 7 || porcentaje === 4) setPorcentaje(21);
                    setPorcentajeRecargo(5.2);
                  }
                }}
                className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 font-mono"
              >
                <option value="IVA">IVA (Península y Baleares)</option>
                <option value="IGIC">IGIC (Islas Canarias)</option>
                <option value="IPSI">IPSI (Ceuta y Melilla)</option>
                <option value="EXENTO">Exento / No Sujeto</option>
                <option value="OTRO">Otro Gravamen Especial</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Porcentaje de Gravamen (%) <span className="text-rose-400">*</span>
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={porcentaje}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setPorcentaje(val);
                    // Sugerir recargo automático si es IVA estándar
                    if (tipoImpuesto === 'IVA') {
                      if (val === 21) setPorcentajeRecargo(5.2);
                      else if (val === 10) setPorcentajeRecargo(1.4);
                      else if (val === 4) setPorcentajeRecargo(0.5);
                      else if (val === 5) setPorcentajeRecargo(0.62);
                      else if (val === 2) setPorcentajeRecargo(0.26);
                      else if (val === 0) setPorcentajeRecargo(0);
                    } else if (tipoImpuesto === 'IGIC') {
                      if (val === 7) setPorcentajeRecargo(0.7);
                      else if (val === 3) setPorcentajeRecargo(0.3);
                    }
                  }}
                  className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500 font-mono font-bold"
                  required
                />
                <span className="absolute right-3 top-2.5 text-xs text-slate-400 font-mono">%</span>
              </div>
            </div>
          </div>

          {/* Recargo Asociado (Recargo de Equivalencia / Minorista) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Recargo Asociado (%)
              </label>
              <div className="relative">
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={porcentajeRecargo}
                  onChange={(e) => setPorcentajeRecargo(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 pr-8 rounded-xl bg-slate-950 border border-slate-700 text-purple-300 text-xs focus:outline-hidden focus:border-purple-500 font-mono"
                />
                <span className="absolute right-3 top-2.5 text-xs text-purple-400 font-mono">%</span>
              </div>
              <p className="text-[10px] text-slate-400">
                {tipoImpuesto === 'IGIC' ? 'Recargo minorista canario (0,7% o 0,3%).' : tipoImpuesto === 'IPSI' ? 'En Ceuta/Melilla suele ser 0%.' : 'Recargo de Equivalencia oficial (5,2%, 1,4%, 0,5%).'}
              </p>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-200">
                Opciones y Estado
              </label>
              <div className="space-y-2 pt-0.5">
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={habilitado}
                    onChange={(e) => setHabilitado(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-rose-600 focus:ring-rose-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">
                    Tipo impositivo <strong className="text-emerald-400">Habilitado</strong> en la app
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={aplicaRecargoDefecto}
                    onChange={(e) => setAplicaRecargoDefecto(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-purple-600 focus:ring-purple-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">
                    Sugerir recargo por defecto al seleccionarlo
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={esTemporal}
                    onChange={(e) => setEsTemporal(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-700 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                  <span className="text-xs text-slate-300">
                    Tipo temporal reducido (Alimentos/Energía)
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Descripción o Ámbito de Aplicación (Opcional)
            </label>
            <input
              type="text"
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
              placeholder="Ej: Tipo general para suministros y reformas en Ceuta"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500"
            />
          </div>

          {/* Ejemplos */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-200">
              Ejemplos de Bienes o Servicios (Opcional)
            </label>
            <input
              type="text"
              value={ejemplos}
              onChange={(e) => setEjemplos(e.target.value)}
              placeholder="Ej: Harinas panificables, envases, servicios profesionales"
              className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-700 text-slate-100 text-xs focus:outline-hidden focus:border-rose-500"
            />
          </div>

          {/* Footer botones */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-xl bg-rose-600 text-white text-xs font-bold hover:bg-rose-500 transition-colors shadow-sm flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{tipoInicial ? 'Guardar Cambios' : 'Crear Tipo Impositivo'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
