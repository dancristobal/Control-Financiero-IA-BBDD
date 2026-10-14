import React, { useState, useMemo } from 'react';
import {
  Building2,
  AlertTriangle,
  Clock,
  Package,
  TrendingUp,
  FileText,
  DollarSign,
  Search,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  X,
  Layers,
  Percent,
  Eye,
  Edit3,
  Save,
  Check
} from 'lucide-react';
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import { Proveedor, Factura, DatosNegocio } from '../types';
import { FacturaDetalleModal } from './FacturaDetalleModal';
import { VisorFacturaModal } from './VisorFacturaModal';

interface ProveedoresViewProps {
  proveedores: Proveedor[];
  facturas: Factura[];
  datosNegocio?: DatosNegocio;
  onUploadToDrive?: (factura: Factura) => Promise<any> | void;
  onDeleteFactura?: (factura: Factura) => void;
  onSaveProveedor?: (proveedor: Proveedor) => Promise<any> | void;
  onActualizarEstadoFactura?: (idFactura: string, nuevoEstado: 'Pagada' | 'Pendiente' | 'Vencida') => Promise<any> | void;
}

export const ProveedoresView: React.FC<ProveedoresViewProps> = ({
  proveedores,
  facturas,
  datosNegocio,
  onUploadToDrive,
  onDeleteFactura,
  onSaveProveedor,
  onActualizarEstadoFactura,
}) => {
  const [busqueda, setBusqueda] = useState('');
  const [filtroRiesgo, setFiltroRiesgo] = useState('TODOS');
  const [proveedorSeleccionado, setProveedorSeleccionado] = useState<Proveedor | null>(null);
  const [facturaSeleccionada, setFacturaSeleccionada] = useState<Factura | null>(null);
  const [facturaParaVisor, setFacturaParaVisor] = useState<Factura | null>(null);
  const [editandoProveedor, setEditandoProveedor] = useState(false);
  const [proveedorForm, setProveedorForm] = useState<Partial<Proveedor>>({});
  const [guardandoProv, setGuardandoProv] = useState(false);

  // Calculate aggregates for each supplier
  const proveedoresConMetricas = useMemo(() => {
    const totalGastoGlobal = facturas.reduce((acc, f) => acc + f.total, 0);

    return proveedores.map((prov) => {
      const facturasProv = facturas.filter((f) => 
        f.idProveedor === prov.idProveedor ||
        f.nombreProveedor?.trim().toLowerCase() === prov.nombreProveedor?.trim().toLowerCase()
      );
      const baseImponibleTotal = facturasProv.reduce((acc, f) => acc + (f.baseImponible || 0), 0);
      const ivaTotal = facturasProv.reduce((acc, f) => acc + (f.cuotaIVA || 0), 0);
      const recargoTotal = facturasProv.reduce((acc, f) => acc + (f.cuotaRecargoEquivalencia || 0), 0);
      const irpfTotal = facturasProv.reduce((acc, f) => acc + (f.cuotaIRPF || 0), 0);
      const gastoTotal = facturasProv.reduce((acc, f) => acc + f.total, 0);
      const gastoMedio = facturasProv.length > 0 ? gastoTotal / facturasProv.length : 0;
      const sortedByDate = [...facturasProv].sort((a, b) => b.fechaEmision.localeCompare(a.fechaEmision));
      const ultimaFactura = sortedByDate[0]?.fechaEmision || 'Sin facturas';
      const porcentajeSobreTotal = totalGastoGlobal > 0 ? (gastoTotal / totalGastoGlobal) * 100 : 0;

      // Monthly spending for bar chart (12 meses del año completo)
      const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const gastoPorMes = meses.map((m, idx) => {
        const sum = facturasProv
          .filter((f) => {
            if (!f.fechaEmision) return false;
            const partes = f.fechaEmision.split('-');
            if (partes.length >= 2) {
              const mesNum = parseInt(partes[1], 10) - 1;
              return mesNum === idx;
            }
            const d = new Date(f.fechaEmision);
            return !isNaN(d.getTime()) && d.getMonth() === idx;
          })
          .reduce((acc, f) => acc + (f.total || 0), 0);
        return { mes: m, total: Math.round(sum * 100) / 100 };
      });

      return {
        ...prov,
        facturasCount: facturasProv.length,
        facturas: facturasProv,
        baseImponibleTotal,
        ivaTotal,
        recargoTotal,
        irpfTotal,
        gastoTotal,
        gastoMedio,
        ultimaFactura,
        porcentajeSobreTotal,
        gastoPorMes,
      };
    });
  }, [proveedores, facturas]);

  // Global fiscal summary across all suppliers/facturas
  const resumenFiscalGlobal = useMemo(() => {
    return proveedoresConMetricas.reduce(
      (acc, p) => ({
        base: acc.base + p.baseImponibleTotal,
        iva: acc.iva + p.ivaTotal,
        recargo: acc.recargo + p.recargoTotal,
        irpf: acc.irpf + p.irpfTotal,
        total: acc.total + p.gastoTotal,
      }),
      { base: 0, iva: 0, recargo: 0, irpf: 0, total: 0 }
    );
  }, [proveedoresConMetricas]);

  // Filtered suppliers
  const filtrados = useMemo(() => {
    return proveedoresConMetricas.filter((p) => {
      if (busqueda.trim()) {
        const q = busqueda.toLowerCase();
        const match =
          p.nombreProveedor.toLowerCase().includes(q) ||
          p.idProveedor.toLowerCase().includes(q) ||
          p.productosSuministrados.toLowerCase().includes(q);
        if (!match) return false;
      }
      if (filtroRiesgo !== 'TODOS' && p.riesgoDependencia !== filtroRiesgo) {
        return false;
      }
      return true;
    });
  }, [proveedoresConMetricas, busqueda, filtroRiesgo]);

  const selectedSupplierDetails = useMemo(() => {
    if (!proveedorSeleccionado) return null;
    return proveedoresConMetricas.find((p) => p.idProveedor === proveedorSeleccionado.idProveedor) || null;
  }, [proveedorSeleccionado, proveedoresConMetricas]);

  return (
    <div className="space-y-6 pb-12 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 uppercase tracking-wider">
              Cadena de Suministro
            </span>
            <span className="text-xs text-slate-300">
              Maestro de Proveedores (MySQL)
            </span>
          </div>
          <h2 className="text-2xl lg:text-3xl font-extrabold text-slate-100 mt-1 tracking-tight">
            Directorio y Análisis de Proveedores
          </h2>
          <p className="text-sm text-slate-300 mt-0.5">
            Monitorización de dependencia crítica, tiempos de entrega y volumen económico recurrente
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="px-3 py-1.5 rounded-xl bg-[#0f172a] border border-slate-800">
            Total Proveedores: <strong className="text-slate-200">{proveedores.length}</strong>
          </span>
        </div>
      </div>

      {/* Global Fiscal Summary Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 p-4 rounded-2xl bg-[#101726] border border-slate-800 shadow-xl">
        <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80">
          <div className="text-[10px] uppercase font-semibold text-slate-400">Base Imponible Total</div>
          <div className="text-sm font-bold text-slate-100 font-mono mt-1">
            {resumenFiscalGlobal.base.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80">
          <div className="text-[10px] uppercase font-semibold text-blue-400">IVA / IGIC Soportado</div>
          <div className="text-sm font-bold text-blue-300 font-mono mt-1">
            {resumenFiscalGlobal.iva.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80">
          <div className="text-[10px] uppercase font-semibold text-amber-400">Recargo Equivalencia</div>
          <div className="text-sm font-bold text-amber-300 font-mono mt-1">
            {resumenFiscalGlobal.recargo.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80">
          <div className="text-[10px] uppercase font-semibold text-purple-400">Retención IRPF</div>
          <div className="text-sm font-bold text-purple-300 font-mono mt-1">
            {resumenFiscalGlobal.irpf.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>
        <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800/80 col-span-2 sm:col-span-1">
          <div className="text-[10px] uppercase font-semibold text-rose-400">Gasto Total Líquido</div>
          <div className="text-sm font-bold text-rose-300 font-mono mt-1">
            {resumenFiscalGlobal.total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Buscar por proveedor o producto..."
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            className="w-full bg-[#0a0f18] border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-rose-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-300 whitespace-nowrap">Riesgo:</span>
          <select
            value={filtroRiesgo}
            onChange={(e) => setFiltroRiesgo(e.target.value)}
            className="bg-[#0a0f18] border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none"
          >
            <option value="TODOS">Todos los niveles</option>
            <option value="Alto">Alto riesgo</option>
            <option value="Medio">Riesgo medio</option>
            <option value="Bajo">Bajo riesgo</option>
          </select>
        </div>
      </div>

      {/* Suppliers Grid / Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filtrados.map((prov) => (
          <div
            key={prov.idProveedor}
            onClick={() => setProveedorSeleccionado(prov)}
            className="p-5 rounded-2xl bg-[#101726] border border-slate-800/80 hover:border-slate-700 transition-all cursor-pointer flex flex-col justify-between group shadow-lg shadow-black/20"
          >
            <div>
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="text-[10px] font-mono font-bold text-slate-300">
                    {prov.idProveedor}
                  </span>
                  <h3 className="text-base font-bold text-slate-100 group-hover:text-rose-400 transition-colors line-clamp-1 mt-0.5">
                    {prov.nombreProveedor}
                  </h3>
                </div>

                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    prov.riesgoDependencia === 'Alto'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      : prov.riesgoDependencia === 'Medio'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  }`}
                >
                  Riesgo {prov.riesgoDependencia}
                </span>
              </div>

              {/* Supplied Products */}
              <div className="mt-3 p-2.5 rounded-xl bg-[#0a0f18] border border-slate-800/80 text-xs">
                <div className="text-[10px] text-slate-300 font-medium flex items-center gap-1 mb-1">
                  <Package className="w-3 h-3 text-slate-400" />
                  <span>Insumos suministrados:</span>
                </div>
                <p className="text-slate-300 line-clamp-2 leading-relaxed">
                  {prov.productosSuministrados}
                </p>
              </div>

              {/* Financial & Tax Metrics */}
              <div className="grid grid-cols-2 gap-2 mt-4 text-xs">
                <div className="p-2.5 rounded-xl bg-[#0d1422] border border-slate-800">
                  <div className="text-[10px] text-slate-400">Base Imponible</div>
                  <div className="text-xs font-bold text-slate-200 font-mono mt-0.5">
                    {prov.baseImponibleTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-[#0d1422] border border-slate-800">
                  <div className="text-[10px] text-blue-400">IVA Soportado</div>
                  <div className="text-xs font-bold text-blue-300 font-mono mt-0.5">
                    {prov.ivaTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                  </div>
                </div>

                {prov.recargoTotal > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#0d1422] border border-slate-800">
                    <div className="text-[10px] text-amber-400">Recargo Equivalencia</div>
                    <div className="text-xs font-bold text-amber-300 font-mono mt-0.5">
                      {prov.recargoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </div>
                  </div>
                )}

                {prov.irpfTotal > 0 && (
                  <div className="p-2.5 rounded-xl bg-[#0d1422] border border-slate-800">
                    <div className="text-[10px] text-purple-400">Retención IRPF</div>
                    <div className="text-xs font-bold text-purple-300 font-mono mt-0.5">
                      {prov.irpfTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                    </div>
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-[#0d1422] border border-slate-800 col-span-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[10px] text-rose-400 font-semibold">Gasto Total Líquido</div>
                      <div className="text-sm font-bold text-slate-100 font-mono mt-0.5">
                        {prov.gastoTotal.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-400">Mensual Ref.</div>
                      <div className="text-xs font-bold text-slate-300 font-mono mt-0.5">
                        {prov.importeMensual.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Meta */}
            <div className="pt-4 mt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-300">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                <span>Entrega: {prov.tiempoMedioEntrega}</span>
              </div>
              <div className="flex items-center gap-1 text-slate-300">
                <FileText className="w-3 h-3 text-slate-400" />
                <span>{prov.facturasCount} facturas</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Individual Supplier Detail Modal / Drawer */}
      {selectedSupplierDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-3xl bg-[#0f172a] border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-[#111c30]">
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
                  <Building2 className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-bold text-slate-400">
                      {selectedSupplierDetails.idProveedor}
                    </span>
                    <span
                      className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                        selectedSupplierDetails.riesgoDependencia === 'Alto'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : selectedSupplierDetails.riesgoDependencia === 'Medio'
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      Riesgo {selectedSupplierDetails.riesgoDependencia}
                    </span>
                    {onSaveProveedor && !editandoProveedor && (
                      <button
                        type="button"
                        onClick={() => {
                          setProveedorForm({
                            cif: selectedSupplierDetails.cif || '',
                            contacto: selectedSupplierDetails.contacto || '',
                            frecuencia: selectedSupplierDetails.frecuencia || 'Mensual',
                            tiempoMedioEntrega: selectedSupplierDetails.tiempoMedioEntrega || '48h',
                            riesgoDependencia: selectedSupplierDetails.riesgoDependencia || 'Medio',
                          });
                          setEditandoProveedor(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-[10px] font-semibold transition-colors cursor-pointer"
                        title="Modificar CIF, contacto y riesgo persistiendo en MySQL"
                      >
                        <Edit3 className="w-3 h-3" />
                        <span>Editar Ficha</span>
                      </button>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-slate-100 mt-1">
                    {selectedSupplierDetails.nombreProveedor}
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    CIF: <span className="font-mono text-slate-300 font-semibold">{selectedSupplierDetails.cif || 'Sin CIF'}</span> • Contacto:{' '}
                    <span className="text-slate-300">{selectedSupplierDetails.contacto || 'Sin contacto registrado'}</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Frecuencia: {selectedSupplierDetails.frecuencia} • Tiempo medio de entrega:{' '}
                    {selectedSupplierDetails.tiempoMedioEntrega}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setProveedorSeleccionado(null);
                  setEditandoProveedor(false);
                }}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Formulario de edición rápida persistente en MySQL */}
              {editandoProveedor && onSaveProveedor && (
                <div className="p-4 rounded-xl bg-[#090e18] border border-amber-500/40 space-y-3 animate-in fade-in">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <div className="flex items-center gap-2">
                      <Edit3 className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-bold text-slate-100">
                        Editar Datos del Proveedor (Persistencia en MySQL)
                      </span>
                    </div>
                    <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                      Tabla proveedores
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">CIF / NIF</label>
                      <input
                        type="text"
                        value={proveedorForm.cif || ''}
                        onChange={(e) => setProveedorForm((p) => ({ ...p, cif: e.target.value }))}
                        placeholder="Ej: B-12345678"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0f172a] border border-slate-700 text-slate-100 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Contacto / Email</label>
                      <input
                        type="text"
                        value={proveedorForm.contacto || ''}
                        onChange={(e) => setProveedorForm((p) => ({ ...p, contacto: e.target.value }))}
                        placeholder="pedidos@proveedor.es"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0f172a] border border-slate-700 text-slate-100 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Nivel de Riesgo</label>
                      <select
                        value={proveedorForm.riesgoDependencia || 'Medio'}
                        onChange={(e) =>
                          setProveedorForm((p) => ({
                            ...p,
                            riesgoDependencia: e.target.value as 'Bajo' | 'Medio' | 'Alto',
                          }))
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0f172a] border border-slate-700 text-slate-100 text-xs focus:border-amber-500 focus:outline-none"
                      >
                        <option value="Bajo">Bajo</option>
                        <option value="Medio">Medio</option>
                        <option value="Alto">Alto</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Tiempo de Entrega</label>
                      <input
                        type="text"
                        value={proveedorForm.tiempoMedioEntrega || ''}
                        onChange={(e) => setProveedorForm((p) => ({ ...p, tiempoMedioEntrega: e.target.value }))}
                        placeholder="Ej: 24-48h"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0f172a] border border-slate-700 text-slate-100 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1">Frecuencia Habitual</label>
                      <input
                        type="text"
                        value={proveedorForm.frecuencia || ''}
                        onChange={(e) => setProveedorForm((p) => ({ ...p, frecuencia: e.target.value }))}
                        placeholder="Ej: Quincenal, Semanal"
                        className="w-full px-2.5 py-1.5 rounded-lg bg-[#0f172a] border border-slate-700 text-slate-100 text-xs focus:border-amber-500 focus:outline-none"
                      />
                    </div>

                    <div className="flex items-end gap-2 pt-2 sm:pt-0">
                      <button
                        type="button"
                        disabled={guardandoProv}
                        onClick={async () => {
                          if (!selectedSupplierDetails) return;
                          setGuardandoProv(true);
                          try {
                            const actualizado: Proveedor = {
                              ...selectedSupplierDetails,
                              ...proveedorForm,
                              idProveedor: selectedSupplierDetails.idProveedor,
                              nombreProveedor: selectedSupplierDetails.nombreProveedor,
                              importeMensual: selectedSupplierDetails.importeMensual,
                            };
                            await onSaveProveedor(actualizado);
                            setProveedorSeleccionado(actualizado);
                            setEditandoProveedor(false);
                          } finally {
                            setGuardandoProv(false);
                          }
                        }}
                        className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>{guardandoProv ? 'Guardando...' : 'Guardar en MySQL'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditandoProveedor(false)}
                        className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors cursor-pointer"
                      >
                        Cancelar
                      </button>
                    </div>
                  </div>
                </div>
              )}
              {/* Aggregated Fiscal & Operational Metrics Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Base Imponible Total</span>
                  <div className="text-sm font-bold text-slate-100 font-mono mt-1">
                    {selectedSupplierDetails.baseImponibleTotal.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    €
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800">
                  <span className="text-blue-400 text-[11px]">IVA / IGIC Soportado</span>
                  <div className="text-sm font-bold text-blue-300 font-mono mt-1">
                    {selectedSupplierDetails.ivaTotal.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    €
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800">
                  <span className="text-amber-400 text-[11px]">Recargo Equivalencia</span>
                  <div className="text-sm font-bold text-amber-300 font-mono mt-1">
                    {selectedSupplierDetails.recargoTotal.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    €
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800">
                  <span className="text-purple-400 text-[11px]">Retención IRPF</span>
                  <div className="text-sm font-bold text-purple-300 font-mono mt-1">
                    {selectedSupplierDetails.irpfTotal.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    €
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800">
                  <span className="text-rose-400 text-[11px]">Gasto Total Líquido</span>
                  <div className="text-base font-bold text-slate-100 font-mono mt-1">
                    {selectedSupplierDetails.gastoTotal.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    €
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Gasto Medio Factura</span>
                  <div className="text-base font-bold text-slate-200 font-mono mt-1">
                    {selectedSupplierDetails.gastoMedio.toLocaleString('es-ES', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{' '}
                    €
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Peso Presupuestario</span>
                  <div className="text-base font-bold text-rose-400 font-mono mt-1">
                    {selectedSupplierDetails.porcentajeSobreTotal.toLocaleString('es-ES', {
                      minimumFractionDigits: 1,
                      maximumFractionDigits: 1,
                    })}%
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-[#0a0f18] border border-slate-800">
                  <span className="text-slate-400 text-[11px]">Última Factura</span>
                  <div className="text-xs font-semibold text-slate-300 mt-1">
                    {selectedSupplierDetails.ultimaFactura}
                  </div>
                </div>
              </div>

              {/* Monthly Spending History Chart */}
              <div className="p-4 rounded-xl bg-[#0a0f18] border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Evolución Mensual del Gasto (€)
                  </h4>
                  <span className="text-[11px] text-slate-400">Año 2026</span>
                </div>

                <div className="h-44 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={selectedSupplierDetails.gastoPorMes}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="mes" stroke="#64748b" tick={{ fontSize: 11 }} />
                      <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0f172a',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          color: '#f8fafc',
                          fontSize: '11px',
                        }}
                        formatter={(v: any) => [`${Number(v).toLocaleString('es-ES')} €`, 'Total']}
                      />
                      <Bar dataKey="total" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={18} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Invoices History Table */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                    Histórico de Facturas Emitidas ({selectedSupplierDetails.facturas.length})
                  </h4>
                  <span className="text-[11px] text-slate-400 italic">
                    Haz clic en una factura para ver su detalle completo
                  </span>
                </div>

                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#111827] text-slate-400 border-b border-slate-800 font-semibold">
                      <tr>
                        <th className="p-3">ID Factura</th>
                        <th className="p-3">Fecha</th>
                        <th className="p-3">Concepto</th>
                        <th className="p-3 text-right">Impuestos (IVA / RE / IRPF)</th>
                        <th className="p-3 text-right">Total Líquido</th>
                        <th className="p-3 text-center">Estado</th>
                        <th className="p-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60 bg-[#0a0f18]">
                      {selectedSupplierDetails.facturas.map((f) => (
                        <tr
                          key={f.idFactura}
                          onClick={() => setFacturaSeleccionada(f)}
                          className="hover:bg-slate-800/50 cursor-pointer transition-colors group"
                          title="Clic para abrir detalle de la factura"
                        >
                          <td className="p-3 font-mono font-bold text-slate-200 group-hover:text-rose-400 transition-colors">
                            {f.idFactura}
                          </td>
                          <td className="p-3 text-slate-400 font-mono">{f.fechaEmision}</td>
                          <td className="p-3 text-slate-300 max-w-[200px] truncate">{f.concepto}</td>
                          <td className="p-3 text-right font-mono text-[11px] whitespace-nowrap">
                            <span className="text-sky-400">IVA: +{(f.cuotaIVA ?? 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €</span>
                            {f.aplicaRecargoEquivalencia && (f.cuotaRecargoEquivalencia ?? 0) !== 0 && (
                              <div className="text-[10px] text-purple-400">
                                RE: +{(f.cuotaRecargoEquivalencia || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </div>
                            )}
                            {f.aplicaRetencionIRPF && (f.cuotaIRPF ?? 0) !== 0 && (
                              <div className="text-[10px] text-emerald-400">
                                IRPF: -{(f.cuotaIRPF || 0).toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-rose-400 whitespace-nowrap">
                            {f.total.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €
                          </td>
                          <td className="p-3 text-center">
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                f.estado === 'Pagada'
                                  ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                                  : f.estado === 'Vencida'
                                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                                  : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                              }`}
                            >
                              {f.estado}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setFacturaSeleccionada(f);
                              }}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 group-hover:bg-rose-600 text-slate-300 group-hover:text-white text-[11px] font-medium transition-all"
                              title="Ver detalle"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Ver</span>
                            </button>
                          </td>
                        </tr>
                      ))}
                      {selectedSupplierDetails.facturas.length === 0 && (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-xs text-slate-500">
                            No hay facturas emitidas por este proveedor todavía.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#0d131f] flex items-center justify-end">
              <button
                onClick={() => setProveedorSeleccionado(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold cursor-pointer"
              >
                Cerrar Ficha
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal when clicked from Proveedores */}
      <FacturaDetalleModal
        factura={facturaSeleccionada}
        onClose={() => setFacturaSeleccionada(null)}
        onDelete={
          onDeleteFactura
            ? (fac) => {
                setFacturaSeleccionada(null);
                onDeleteFactura(fac);
              }
            : undefined
        }
        onAbrirVisor={(fac) => {
          setFacturaSeleccionada(null);
          setFacturaParaVisor(fac);
        }}
        onUploadToDrive={onUploadToDrive}
        onActualizarEstado={
          onActualizarEstadoFactura
            ? async (fac, nuevoEstado) => {
                await onActualizarEstadoFactura(fac.idFactura, nuevoEstado);
                setFacturaSeleccionada((prev) =>
                  prev && prev.idFactura === fac.idFactura
                    ? {
                        ...prev,
                        estado: nuevoEstado,
                        fechaPago:
                          nuevoEstado === 'Pagada'
                            ? new Date().toISOString().split('T')[0]
                            : 'Pendiente',
                      }
                    : prev
                );
              }
            : undefined
        }
      />

      {/* Visor Factura Modal when opened from FacturaDetalleModal */}
      <VisorFacturaModal
        factura={facturaParaVisor}
        isOpen={Boolean(facturaParaVisor)}
        onClose={() => setFacturaParaVisor(null)}
        onVerDetallesCompletos={(fac) => {
          setFacturaParaVisor(null);
          setFacturaSeleccionada(fac);
        }}
        datosNegocio={datosNegocio}
      />
    </div>
  );
};
