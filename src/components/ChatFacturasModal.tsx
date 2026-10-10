import React, { useState, useRef, useEffect } from 'react';
import {
  MessageSquare,
  Send,
  Sparkles,
  X,
  Bot,
  User,
  HelpCircle,
  Clock,
  RefreshCw,
  Maximize2,
  Minimize2,
  Trash2,
  Database
} from 'lucide-react';
import { MensajeChat, Factura, Proveedor, Alerta, DatosNegocio, DEFAULT_DATOS_NEGOCIO } from '../types';

interface ChatFacturasModalProps {
  isOpen: boolean;
  onClose: () => void;
  facturas: Factura[];
  proveedores: Proveedor[];
  alertas: Alerta[];
  datosNegocio?: DatosNegocio;
}

const PREGUNTAS_SUGERIDAS = [
  '¿En qué estoy gastando más?',
  '¿Qué proveedores han aumentado precios?',
  '¿Qué productos se han encarecido?',
  '¿Cuál es mi proveedor más importante?',
  '¿Qué anomalías encuentras?',
  '¿Qué debería revisar esta semana?',
];

export const ChatFacturasModal: React.FC<ChatFacturasModalProps> = ({
  isOpen,
  onClose,
  facturas,
  proveedores,
  alertas,
  datosNegocio,
}) => {
  const resolvedDatosNegocio: DatosNegocio = {
    ...DEFAULT_DATOS_NEGOCIO,
    ...datosNegocio,
    sector: datosNegocio?.sector || DEFAULT_DATOS_NEGOCIO.sector,
    contextoOperativo: datosNegocio?.contextoOperativo || DEFAULT_DATOS_NEGOCIO.contextoOperativo,
  };
  const nombreNegocio = resolvedDatosNegocio.nombre;
  const sectorNegocio = resolvedDatosNegocio.sector || DEFAULT_DATOS_NEGOCIO.sector;

  const [mensajes, setMensajes] = useState<MensajeChat[]>(() => [
    {
      id: 'm-initial',
      emisor: 'asistente',
      texto: `¡Hola! Soy **Finance AI**, tu analista financiero en **${nombreNegocio}** (${sectorNegocio}). Puedo resolver cualquier duda sobre tus facturas, variaciones de precios, proveedores y gastos registrados.\n\n¿En qué puedo ayudarte hoy?`,
      timestamp: new Date().toISOString(),
    },
  ]);

  // Cargar historial de chat persistente desde MySQL
  useEffect(() => {
    if (isOpen) {
      fetch('/api/chat/historial')
        .then((r) => r.json())
        .then((data) => {
          if (data.success && Array.isArray(data.historial) && data.historial.length > 0) {
            setMensajes(
              data.historial.map((m: any) => ({
                id: m.id,
                emisor: m.emisor === 'usuario' ? 'usuario' : 'asistente',
                texto: m.texto,
                timestamp: m.fecha || new Date().toISOString(),
                sugerencias: m.sugerencias,
              }))
            );
          }
        })
        .catch((err) => console.warn('Aviso al leer historial de chat de MySQL:', err));
    }
  }, [isOpen]);

  const vaciarHistorial = async () => {
    try {
      await fetch('/api/chat/historial', { method: 'DELETE' });
      setMensajes([
        {
          id: 'm-initial',
          emisor: 'asistente',
          texto: `¡Historial borrado de la base de datos! Soy **Finance AI**, tu analista en **${nombreNegocio}**. ¿En qué puedo ayudarte?`,
          timestamp: new Date().toISOString(),
        },
      ]);
    } catch (e) {
      console.warn('Error al vaciar chat:', e);
    }
  };

  // Actualizar mensaje de bienvenida si cambia el nombre del negocio y solo hay 1 mensaje
  useEffect(() => {
    setMensajes((prev) => {
      if (prev.length === 1 && prev[0].id === 'm-initial') {
        return [
          {
            ...prev[0],
            texto: `¡Hola! Soy **Finance AI**, tu analista financiero en **${nombreNegocio}** (${sectorNegocio}). Puedo resolver cualquier duda sobre tus facturas, variaciones de precios, proveedores y gastos registrados.\n\n¿En qué puedo ayudarte hoy?`,
          },
        ];
      }
      return prev;
    });
  }, [nombreNegocio, sectorNegocio]);

  const [inputTexto, setInputTexto] = useState('');
  const [cargando, setCargando] = useState(false);
  const [expandido, setExpandido] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [mensajes, isOpen]);

  if (!isOpen) return null;

  const enviarMensaje = async (texto: string) => {
    const textoLimpio = texto.trim();
    if (!textoLimpio || cargando) return;

    const userMsg: MensajeChat = {
      id: `u-${Date.now()}`,
      emisor: 'usuario',
      texto: textoLimpio,
      timestamp: new Date().toISOString(),
    };

    setMensajes((prev) => [...prev, userMsg]);
    setInputTexto('');
    setCargando(true);

    try {
      const response = await fetch('/api/gemini/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mensaje: textoLimpio,
          historial: mensajes,
          nombreNegocio,
          datosNegocio: resolvedDatosNegocio,
          sector: sectorNegocio,
          contextoOperativo: resolvedDatosNegocio.contextoOperativo,
          facturas,
          proveedores,
          alertas,
          resumenIVA: {
            totalGasto: facturas.reduce((sum, f) => sum + f.total, 0),
            cuotaIVA: facturas.reduce((sum, f) => sum + f.cuotaIVA, 0),
          },
        }),
      });

      const data = await response.json();
      const botMsg: MensajeChat = {
        id: `b-${Date.now()}`,
        emisor: 'asistente',
        texto: data.respuesta || 'No he podido generar una respuesta.',
        timestamp: new Date().toISOString(),
      };

      setMensajes((prev) => [...prev, botMsg]);
    } catch (err: any) {
      console.error('Error al consultar chat:', err);
      setMensajes((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          emisor: 'asistente',
          texto:
            'Disculpa, ha ocurrido un error al consultar a Gemini. Por favor inténtalo de nuevo.',
          timestamp: new Date().toISOString(),
        },
      ]);
    } finally {
      setCargando(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end animate-in fade-in slide-in-from-bottom-6">
      <div
        className={`bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col transition-all duration-300 ${
          expandido
            ? 'w-[95vw] sm:w-[650px] h-[85vh]'
            : 'w-[95vw] sm:w-[460px] h-[580px]'
        }`}
      >
        {/* Chat Header */}
        <div className="p-4 border-b border-slate-800 bg-gradient-to-r from-[#111a2e] to-[#0c1322] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
                <span>Pregunta a tus facturas</span>
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              </h3>
              <p className="text-[10px] text-slate-400">
                Gemini • Anclado a tus {facturas.length} facturas registradas
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <button
              onClick={vaciarHistorial}
              className="p-1.5 rounded-lg hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
              title="Borrar historial persistente de la base de datos"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setExpandido(!expandido)}
              className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
              title={expandido ? 'Minimizar tamaño' : 'Maximizar tamaño'}
            >
              {expandido ? (
                <Minimize2 className="w-4 h-4" />
              ) : (
                <Maximize2 className="w-4 h-4" />
              )}
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:text-white hover:bg-slate-800 transition-colors"
              title="Cerrar chat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Suggested Quick Questions Chips */}
        <div className="p-2.5 bg-[#0a0f18] border-b border-slate-800/80 overflow-x-auto flex items-center gap-1.5 scrollbar-none">
          <span className="text-[10px] font-bold text-indigo-400 shrink-0 uppercase tracking-wider pl-1">
            Sugerencias:
          </span>
          {PREGUNTAS_SUGERIDAS.map((pregunta, idx) => (
            <button
              key={idx}
              onClick={() => enviarMensaje(pregunta)}
              disabled={cargando}
              className="shrink-0 px-2.5 py-1 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-indigo-500/40 text-[11px] text-slate-300 hover:text-indigo-200 transition-colors"
            >
              {pregunta}
            </button>
          ))}
        </div>

        {/* Messages List */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-[#0b101b]">
          {mensajes.map((msg) => {
            const isUser = msg.emisor === 'usuario';
            return (
              <div
                key={msg.id}
                className={`flex gap-2.5 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-indigo-300 shrink-0 mt-0.5">
                    <Bot className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs leading-relaxed ${
                    isUser
                      ? 'bg-rose-600 text-white rounded-tr-none'
                      : 'bg-[#121c2e] text-slate-200 border border-slate-800 rounded-tl-none shadow-sm'
                  }`}
                >
                  <div className="whitespace-pre-wrap">{msg.texto}</div>
                  <div
                    className={`text-[9px] mt-1.5 font-mono ${
                      isUser ? 'text-rose-200 text-right' : 'text-slate-400'
                    }`}
                  >
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-rose-600/30 border border-rose-500/40 flex items-center justify-center text-rose-300 shrink-0 mt-0.5">
                    <User className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {cargando && (
            <div className="flex gap-2.5 items-center text-xs text-slate-400 p-2">
              <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-400" />
              <span>Consultando datos contables con Gemini...</span>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            enviarMensaje(inputTexto);
          }}
          className="p-3 bg-[#0a0f18] border-t border-slate-800 flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Pregunta algo sobre tus facturas o proveedores..."
            value={inputTexto}
            onChange={(e) => setInputTexto(e.target.value)}
            disabled={cargando}
            className="flex-1 bg-[#101726] border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
          />
          <button
            type="submit"
            disabled={cargando || !inputTexto.trim()}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-800 disabled:text-slate-600 text-white transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
