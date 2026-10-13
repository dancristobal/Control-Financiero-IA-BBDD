import React from 'react';
import {
  LayoutDashboard,
  FileText,
  Building2,
  TrendingUp,
  AlertTriangle,
  Receipt,
  Landmark,
  Sparkles,
  Settings,
  MessageSquare,
  CheckCircle2,
  RefreshCw,
  Cloud,
  ChevronRight,
  Sun,
  Moon,
  Database,
  HardDrive,
  X
} from 'lucide-react';
import { GoogleSheetsConfig, DatosNegocio, DEFAULT_DATOS_NEGOCIO } from '../types';
import { ThemeMode } from '../utils/theme';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alertasActivasCount: number;
  facturasCount: number;
  sheetsConfig: GoogleSheetsConfig;
  onOpenConfig: () => void;
  onOpenChat: () => void;
  isChatOpen: boolean;
  theme?: ThemeMode;
  onToggleTheme?: () => void;
  datosNegocio?: DatosNegocio;
  isOpenMobile?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  setActiveTab,
  alertasActivasCount,
  facturasCount,
  sheetsConfig,
  onOpenConfig,
  onOpenChat,
  isChatOpen,
  theme = 'dark',
  onToggleTheme,
  datosNegocio,
  isOpenMobile = false,
  onCloseMobile,
}) => {
  const nombreNegocio = datosNegocio?.nombre || DEFAULT_DATOS_NEGOCIO.nombre;
  const menuItems = [
    { id: 'resumen', label: 'Resumen', icon: LayoutDashboard },
    { id: 'facturas', label: 'Facturas', icon: FileText, badge: facturasCount },
    { id: 'proveedores', label: 'Proveedores', icon: Building2 },
    { id: 'precios', label: 'Evolución Precios', icon: TrendingUp },
    { id: 'alertas', label: 'Alertas', icon: AlertTriangle, badge: alertasActivasCount, badgeColor: 'bg-rose-500/20 text-rose-400 border border-rose-500/30' },
    { id: 'iva', label: 'IVA', icon: Receipt },
    { id: 'modelos-fiscales', label: 'Modelos AEAT', icon: Landmark },
    { id: 'analisis-ia', label: 'Análisis IA', icon: Sparkles, highlight: true },
  ];

  const handleSelectTab = (id: string) => {
    setActiveTab(id);
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  return (
    <>
      {/* Backdrop overlay for mobile */}
      {isOpenMobile && (
        <div
          onClick={onCloseMobile}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-30 lg:hidden transition-opacity duration-300"
          aria-hidden="true"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-40 w-64 bg-[#0d131f] border-r border-slate-800/80 flex flex-col justify-between shrink-0 select-none transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 lg:h-screen lg:sticky lg:top-0 ${
          isOpenMobile ? 'translate-x-0 shadow-2xl' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Brand Header */}
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-5 border-b border-slate-800/70 flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-rose-700 flex items-center justify-center text-white font-bold shadow-lg shadow-rose-900/30 shrink-0">
                <span className="tracking-tighter text-lg font-black">FA</span>
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-slate-100 tracking-wide leading-tight">
                  FINANCE AI
                </h1>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="text-xs font-semibold text-rose-400 tracking-wider truncate max-w-[120px]" title={nombreNegocio}>
                    {nombreNegocio}
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                </div>
              </div>
            </div>

            {/* Mobile Close Button */}
            {onCloseMobile && (
              <button
                onClick={onCloseMobile}
                className="lg:hidden p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/60 transition-colors ml-1"
                aria-label="Cerrar menú"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
          <div className="px-5 pt-2 pb-1">
            <p className="text-[11px] text-slate-400 leading-snug">
              Control financiero y auditoría de facturas con IA
            </p>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 space-y-1">
            <div className="px-3 py-1.5 text-[10px] font-bold text-slate-300 uppercase tracking-wider">
              Gestión Financiera
            </div>
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`sidebar-btn-${item.id}`}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30 shadow-sm shadow-rose-950/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon
                      className={`w-4 h-4 ${
                        isActive
                          ? 'text-rose-400'
                          : item.highlight
                          ? 'text-amber-400'
                          : 'text-slate-400'
                      }`}
                    />
                    <span>{item.label}</span>
                  </div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                        item.badgeColor || 'bg-slate-800 text-slate-300 border border-slate-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* AI Assistant Chat Trigger */}
          <div className="px-3 pt-2">
            <button
              id="sidebar-btn-chat"
              onClick={() => {
                onOpenChat();
                if (onCloseMobile) onCloseMobile();
              }}
              className={`w-full flex items-center justify-between p-2.5 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                isChatOpen
                  ? 'bg-slate-800/90 border-indigo-500/40 text-indigo-200 shadow-md shadow-indigo-950/50'
                  : 'bg-indigo-950/20 border-indigo-500/20 text-indigo-300 hover:bg-indigo-950/40 hover:border-indigo-500/30'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-300 shrink-0">
                  <MessageSquare className="w-3.5 h-3.5" />
                </div>
                <div className="text-left min-w-0">
                  <div className="font-bold text-indigo-200 truncate">Pregunta a tus facturas</div>
                  <div className="text-[10px] text-indigo-400/80 font-normal truncate">Chat directo con Gemini</div>
                </div>
              </div>
              <ChevronRight className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            </button>
          </div>
        </div>

        {/* Bottom Status & Settings */}
        <div id="sidebar-footer" className="p-3 border-t border-slate-800/80 bg-slate-950/40 space-y-2 shrink-0">
          {/* Enterprise Relational Database Indicator (Single Source of Truth) */}
          <div
            id="sidebar-mysql-card"
            onClick={() => {
              onOpenConfig();
              if (onCloseMobile) onCloseMobile();
            }}
            className="cursor-pointer p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/60 hover:border-indigo-500/40 transition-colors"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Database className="w-3.5 h-3.5 text-indigo-400" />
                <span className="text-[11px] font-medium text-slate-300">
                  MySQL / MariaDB
                </span>
              </div>
              <span
                className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              >
                Única Fuente
              </span>
            </div>
            <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
              <span className="truncate">DB-First & Drive</span>
              <span className="flex items-center gap-1">
                <HardDrive className={`w-2.5 h-2.5 ${sheetsConfig?.endpointUrl ? 'text-sky-400' : 'text-slate-500'}`} />
                <span className={sheetsConfig?.endpointUrl ? 'text-sky-300 font-medium' : 'text-slate-400'}>
                  {sheetsConfig?.endpointUrl ? 'Drive Activo' : `${facturasCount} reg`}
                </span>
              </span>
            </div>
          </div>

          {/* Configuration Button */}
          <button
            id="sidebar-btn-config"
            onClick={() => {
              onOpenConfig();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors cursor-pointer"
          >
            <div className="flex items-center gap-2.5">
              <Settings className="w-4 h-4 text-slate-400" />
              <span>Configuración</span>
            </div>
            <span className="text-[10px] text-slate-300">ID / Conexión</span>
          </button>

          {/* Theme Toggle Button */}
          {onToggleTheme && (
            <button
              id="sidebar-btn-theme"
              onClick={onToggleTheme}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/40 transition-colors cursor-pointer"
              title={theme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
            >
              <div className="flex items-center gap-2.5">
                {theme === 'dark' ? (
                  <Sun className="w-4 h-4 text-amber-400" />
                ) : (
                  <Moon className="w-4 h-4 text-indigo-500" />
                )}
                <span>{theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro'}</span>
              </div>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 font-medium capitalize">
                {theme === 'dark' ? 'Oscuro' : 'Claro'}
              </span>
            </button>
          )}

          {/* Disclaimer Notice */}
          <div className="px-2 pt-1">
            <p className="text-[9px] text-slate-400 leading-tight">
              *Resumen orientativo de gestión. No sustituye la labor de un asesor fiscal colegiado.
            </p>
          </div>
        </div>
      </aside>
    </>
  );
};
