import React, { useState, useEffect } from 'react';
import {
  X,
  Tag,
  Plus,
  Edit2,
  Trash2,
  Check,
  RotateCcw,
  Sparkles,
  Layers,
  AlertCircle,
  HelpCircle,
  FolderPlus
} from 'lucide-react';
import { CategoriaGastoDef } from '../types';
import {
  obtenerCategoriasGasto,
  guardarCategoriasGasto,
  agregarCategoriaGasto,
  actualizarCategoriaGasto,
  eliminarCategoriaGasto,
  restablecerCategoriasGasto,
  PALETA_COLORES_SUGERIDOS,
} from '../utils/categoriasGasto';

interface CategoriasGastoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCategoriaCreadaOActualizada?: (categoria: CategoriaGastoDef) => void;
}

export const CategoriasGastoModal: React.FC<CategoriasGastoModalProps> = ({
  isOpen,
  onClose,
  onCategoriaCreadaOActualizada,
}) => {
  const [categorias, setCategorias] = useState<CategoriaGastoDef[]>(() => obtenerCategoriasGasto());
  const [modoEdicion, setModoEdicion] = useState<boolean>(false);
  const [categoriaEditandoId, setCategoriaEditandoId] = useState<string | null>(null);

  // Form states
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [color, setColor] = useState('#0ea5e9');
  const [errorValidacion, setErrorValidacion] = useState<string | null>(null);
  const [categoriaAEliminar, setCategoriaAEliminar] = useState<CategoriaGastoDef | null>(null);

  useEffect(() => {
    if (isOpen) {
      setCategorias(obtenerCategoriasGasto());
      setModoEdicion(false);
      setCategoriaEditandoId(null);
      setErrorValidacion(null);
      setCategoriaAEliminar(null);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const iniciarCreacion = () => {
    setCategoriaEditandoId(null);
    setNombre('');
    setDescripcion('');
    // Elegir un color sugerido no repetido si es posible
    const coloresUsados = new Set(categorias.map((c) => c.color.toLowerCase()));
    const libre = PALETA_COLORES_SUGERIDOS.find((p) => !coloresUsados.has(p.hex.toLowerCase()));
    setColor(libre ? libre.hex : '#0ea5e9');
    setErrorValidacion(null);
    setModoEdicion(true);
  };

  const iniciarEdicion = (cat: CategoriaGastoDef) => {
    setCategoriaEditandoId(cat.id);
    setNombre(cat.nombre);
    setDescripcion(cat.descripcion || '');
    setColor(cat.color);
    setErrorValidacion(null);
    setModoEdicion(true);
  };

  const cancelarFormulario = () => {
    setModoEdicion(false);
    setCategoriaEditandoId(null);
    setErrorValidacion(null);
  };

  const handleGuardar = (e: React.FormEvent) => {
    e.preventDefault();
    const nombreLimpio = nombre.trim();
    if (!nombreLimpio) {
      setErrorValidacion('Por favor indica un nombre para la categoría.');
      return;
    }

    // Comprobar duplicidad de nombres
    const duplicado = categorias.some(
      (c) =>
        c.nombre.toLowerCase().trim() === nombreLimpio.toLowerCase() &&
        c.id !== categoriaEditandoId
    );
    if (duplicado) {
      setErrorValidacion('Ya existe una categoría con este mismo nombre.');
      return;
    }

    let resultado: CategoriaGastoDef | null = null;
    if (categoriaEditandoId) {
      resultado = actualizarCategoriaGasto(categoriaEditandoId, {
        nombre: nombreLimpio,
        descripcion: descripcion.trim(),
        color,
      });
    } else {
      resultado = agregarCategoriaGasto({
        nombre: nombreLimpio,
        descripcion: descripcion.trim(),
        color,
      });
    }

    const actualizadas = obtenerCategoriasGasto();
    setCategorias(actualizadas);
    setModoEdicion(false);
    setCategoriaEditandoId(null);
    setErrorValidacion(null);

    if (resultado && onCategoriaCreadaOActualizada) {
      onCategoriaCreadaOActualizada(resultado);
    }
  };

  const confirmarEliminar = (cat: CategoriaGastoDef) => {
    setCategoriaAEliminar(cat);
  };

  const ejecutarEliminacion = () => {
    if (!categoriaAEliminar) return;
    eliminarCategoriaGasto(categoriaAEliminar.id);
    setCategorias(obtenerCategoriasGasto());
    setCategoriaAEliminar(null);
    if (categoriaEditandoId === categoriaAEliminar.id) {
      cancelarFormulario();
    }
  };

  const handleRestablecer = () => {
    if (
      window.confirm(
        '¿Deseas restablecer el catálogo a las 6 categorías predeterminadas del sistema?'
      )
    ) {
      const rest = restablecerCategoriasGasto();
      setCategorias(rest);
      setModoEdicion(false);
      setCategoriaEditandoId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-3xl max-h-[90vh] bg-[#0c1422] border border-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between bg-[#0f172a]/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
              <Tag className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-100">
                  Catálogo de Categorías de Gasto
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                  {categorias.length} categorías
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                Personaliza y organiza las partidas de costes adaptadas al sector de tu negocio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 transition-colors cursor-pointer"
            title="Cerrar ventana"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Action Toolbar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80">
            <div className="text-xs text-slate-300">
              Las categorías personalizadas se sincronizan con los gráficos, filtros de facturas y el asistente Gemini IA.
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleRestablecer}
                className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700/60 flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Restablecer a las 6 categorías fijas iniciales"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Restablecer</span>
              </button>

              {!modoEdicion && (
                <button
                  type="button"
                  onClick={iniciarCreacion}
                  className="px-3.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer shadow-sm shadow-rose-950"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Nueva Categoría</span>
                </button>
              )}
            </div>
          </div>

          {/* Formulario de Alta / Edición */}
          {modoEdicion && (
            <form
              onSubmit={handleGuardar}
              className="p-5 rounded-xl bg-gradient-to-br from-[#121d30] to-[#0c1422] border-2 border-rose-500/40 space-y-4 animate-in fade-in duration-150"
            >
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3.5 h-3.5 rounded-full shadow-sm"
                    style={{ backgroundColor: color }}
                  />
                  <h3 className="text-sm font-bold text-slate-100">
                    {categoriaEditandoId ? 'Editar Categoría de Gasto' : 'Crear Nueva Categoría'}
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  {categoriaEditandoId ? 'Modificando partida' : 'Partida personalizada'}
                </span>
              </div>

              {errorValidacion && (
                <div className="p-3 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorValidacion}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Nombre */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Nombre de la Categoría *
                  </label>
                  <input
                    type="text"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    placeholder="Ej: Frutas y Lácteos Especiales, Publicidad, Alquiler..."
                    className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    autoFocus
                  />
                </div>

                {/* Vista previa en vivo */}
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-300">
                    Vista previa de Etiqueta
                  </label>
                  <div className="h-[34px] flex items-center px-3 rounded-lg bg-slate-900/80 border border-slate-800">
                    <span
                      className="px-2.5 py-0.5 rounded-full text-xs font-bold flex items-center gap-1.5"
                      style={{
                        backgroundColor: `${color}25`,
                        color: color,
                        border: `1px solid ${color}40`,
                      }}
                    >
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
                      <span>{nombre.trim() || 'Nombre de Categoría'}</span>
                    </span>
                  </div>
                </div>
              </div>

              {/* Descripción */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-300">
                  Descripción u observaciones (guía para ti y para Gemini IA)
                </label>
                <textarea
                  rows={2}
                  value={descripcion}
                  onChange={(e) => setDescripcion(e.target.value)}
                  placeholder="Ej: Compras específicas de harinas de fuerza, levaduras y materias base del obrador..."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-rose-500 resize-none"
                />
              </div>

              {/* Selector de Color */}
              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between">
                  <span>Color representativo en gráficos e insignias</span>
                  <span className="font-mono text-[11px] text-slate-400">{color}</span>
                </label>

                {/* Paleta sugerida */}
                <div className="flex flex-wrap items-center gap-2">
                  {PALETA_COLORES_SUGERIDOS.map((p) => {
                    const isSelected = color.toLowerCase() === p.hex.toLowerCase();
                    return (
                      <button
                        key={p.hex}
                        type="button"
                        onClick={() => setColor(p.hex)}
                        className={`w-7 h-7 rounded-lg transition-transform flex items-center justify-center cursor-pointer ${
                          isSelected ? 'scale-110 ring-2 ring-white ring-offset-2 ring-offset-slate-950' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: p.hex }}
                        title={`${p.nombre} (${p.hex})`}
                      >
                        {isSelected && <Check className="w-3.5 h-3.5 text-white drop-shadow-sm" />}
                      </button>
                    );
                  })}

                  {/* Custom color input */}
                  <div className="flex items-center gap-1.5 ml-2 pl-2 border-l border-slate-700">
                    <input
                      type="color"
                      value={color}
                      onChange={(e) => setColor(e.target.value)}
                      className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
                      title="Elegir color personalizado"
                    />
                    <span className="text-[11px] text-slate-400">Personalizado</span>
                  </div>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={cancelarFormulario}
                  className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition-colors cursor-pointer flex items-center gap-1.5 shadow-sm shadow-rose-950"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{categoriaEditandoId ? 'Guardar Cambios' : 'Añadir Categoría'}</span>
                </button>
              </div>
            </form>
          )}

          {/* Diálogo de Confirmación de Eliminación */}
          {categoriaAEliminar && (
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/40 space-y-3 animate-in fade-in">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-300">
                    ¿Eliminar la categoría "{categoriaAEliminar.nombre}"?
                  </h4>
                  <p className="text-xs text-slate-300">
                    Las facturas que tengan asignada esta categoría no se borrarán, pero dejará de estar disponible en los nuevos formularios y listas rápidas.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCategoriaAEliminar(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={ejecutarEliminacion}
                  className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold cursor-pointer"
                >
                  Sí, eliminar categoría
                </button>
              </div>
            </div>
          )}

          {/* Lista de Categorías */}
          <div className="space-y-2.5">
            <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider px-1">
              Categorías Activas ({categorias.length})
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {categorias.map((cat) => {
                const esPredeterminada = Boolean(cat.esPredeterminada);
                return (
                  <div
                    key={cat.id}
                    className="p-4 rounded-xl bg-[#101726] border border-slate-800/80 hover:border-slate-700 flex flex-col justify-between group transition-all"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                            style={{ backgroundColor: cat.color }}
                          />
                          <span className="text-xs font-bold text-slate-100">
                            {cat.nombre}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          {esPredeterminada ? (
                            <span className="px-2 py-0.5 rounded-full bg-slate-800/80 text-[10px] text-slate-400 border border-slate-700/60 font-medium">
                              Predeterminada
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-sky-500/15 text-[10px] text-sky-400 border border-sky-500/30 font-medium">
                              Personalizada
                            </span>
                          )}
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 min-h-[32px]">
                        {cat.descripcion || 'Sin descripción específica configurada.'}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-3 mt-2 border-t border-slate-800/60">
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ backgroundColor: cat.color }} />
                        <span>{cat.color}</span>
                      </div>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => iniciarEdicion(cat)}
                          className="p-1.5 rounded-lg bg-slate-800/60 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors cursor-pointer"
                          title="Editar categoría"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => confirmarEliminar(cat)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            esPredeterminada
                              ? 'text-slate-600 hover:text-rose-400 hover:bg-rose-500/10'
                              : 'bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20'
                          }`}
                          title={
                            esPredeterminada
                              ? 'Eliminar categoría predeterminada (puedes restaurarla en cualquier momento)'
                              : 'Eliminar categoría personalizada'
                          }
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-[#0f172a]/80 flex items-center justify-between">
          <span className="text-xs text-slate-400">
            Consejo: Añade partidas exactas de tu sector (ej. Harinas, Embalajes Take-Away, Combustibles) para análisis más certeros.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-colors cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
};
