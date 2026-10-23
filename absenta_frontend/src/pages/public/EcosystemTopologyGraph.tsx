import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Workflow,
  Network,
  Share2,
  ExternalLink,
  Search,
  Filter,
  CheckCircle2,
  ArrowRight,
  Layers,
  ChevronRight,
  Building2,
  FileText,
  BookOpen,
  Users,
  Briefcase,
  HeartHandshake,
  ShoppingCart,
  Crown,
  Database,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  Copy,
  Check,
  Compass,
  Eye,
  SlidersHorizontal,
  Info
} from 'lucide-react';
import { TOPOLOGY_NODES, DATA_FLOW_EDGES, RouteTopologyNode, DataFlowEdge } from './ecosystemTopologyData';
import { DivisionType, RolePOV, StageId } from './EcosystemWorkflowShowcase';

interface EcosystemTopologyGraphProps {
  onSelectNode?: (node: RouteTopologyNode) => void;
  initialRole?: RolePOV;
}

export const EcosystemTopologyGraph: React.FC<EcosystemTopologyGraphProps> = ({
  initialRole = 'all'
}) => {
  const [selectedDivision, setSelectedDivision] = useState<DivisionType | 'executive' | 'all'>('all');
  const [selectedRole, setSelectedRole] = useState<RolePOV>(initialRole);
  const [selectedStage, setSelectedStage] = useState<StageId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNode, setSelectedNode] = useState<RouteTopologyNode | null>(TOPOLOGY_NODES[0]);
  const [activeEdgeId, setActiveEdgeId] = useState<string | null>(null);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'cluster' | 'pipeline'>('cluster');

  // Copy URL path helper
  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(window.location.origin + path);
    setCopiedPath(path);
    setTimeout(() => setCopiedPath(null), 2000);
  };

  // Division Cluster Styling
  const getDivisionMeta = (div: DivisionType | 'executive') => {
    switch (div) {
      case 'tu':
        return {
          name: 'Tata Usaha & Keuangan',
          icon: FileText,
          color: 'text-emerald-400',
          border: 'border-emerald-500/30',
          bg: 'bg-emerald-500/10',
          ring: 'ring-emerald-500/40',
          badgeBg: 'bg-emerald-950/60 text-emerald-300 border-emerald-800/80',
          gradient: 'from-emerald-500/20 via-slate-900 to-slate-950',
        };
      case 'kurikulum':
        return {
          name: 'Kurikulum & KBM',
          icon: BookOpen,
          color: 'text-sky-400',
          border: 'border-sky-500/30',
          bg: 'bg-sky-500/10',
          ring: 'ring-sky-500/40',
          badgeBg: 'bg-sky-950/60 text-sky-300 border-sky-800/80',
          gradient: 'from-sky-500/20 via-slate-900 to-slate-950',
        };
      case 'kesiswaan':
        return {
          name: 'Kesiswaan & Karakter',
          icon: Users,
          color: 'text-amber-400',
          border: 'border-amber-500/30',
          bg: 'bg-amber-500/10',
          ring: 'ring-amber-500/40',
          badgeBg: 'bg-amber-950/60 text-amber-300 border-amber-800/80',
          gradient: 'from-amber-500/20 via-slate-900 to-slate-950',
        };
      case 'hubin':
        return {
          name: 'Hubungan Industri & BKK',
          icon: Briefcase,
          color: 'text-indigo-400',
          border: 'border-indigo-500/30',
          bg: 'bg-indigo-500/10',
          ring: 'ring-indigo-500/40',
          badgeBg: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/80',
          gradient: 'from-indigo-500/20 via-slate-900 to-slate-950',
        };
      case 'konseling':
        return {
          name: 'Bimbingan Konseling (BK)',
          icon: HeartHandshake,
          color: 'text-rose-400',
          border: 'border-rose-500/30',
          bg: 'bg-rose-500/10',
          ring: 'ring-rose-500/40',
          badgeBg: 'bg-rose-950/60 text-rose-300 border-rose-800/80',
          gradient: 'from-rose-500/20 via-slate-900 to-slate-950',
        };
      case 'sarpras':
        return {
          name: 'Sarana & Prasarana',
          icon: Building2,
          color: 'text-orange-400',
          border: 'border-orange-500/30',
          bg: 'bg-orange-500/10',
          ring: 'ring-orange-500/40',
          badgeBg: 'bg-orange-950/60 text-orange-300 border-orange-800/80',
          gradient: 'from-orange-500/20 via-slate-900 to-slate-950',
        };
      case 'koperasi':
        return {
          name: 'Koperasi & Toko Sekolah',
          icon: ShoppingCart,
          color: 'text-teal-400',
          border: 'border-teal-500/30',
          bg: 'bg-teal-500/10',
          ring: 'ring-teal-500/40',
          badgeBg: 'bg-teal-950/60 text-teal-300 border-teal-800/80',
          gradient: 'from-teal-500/20 via-slate-900 to-slate-950',
        };
      case 'executive':
      default:
        return {
          name: 'Executive Governance',
          icon: Crown,
          color: 'text-purple-400',
          border: 'border-purple-500/30',
          bg: 'bg-purple-500/10',
          ring: 'ring-purple-500/40',
          badgeBg: 'bg-purple-950/60 text-purple-300 border-purple-800/80',
          gradient: 'from-purple-500/20 via-slate-900 to-slate-950',
        };
    }
  };

  // Filtered nodes
  const filteredNodes = useMemo(() => {
    let result = TOPOLOGY_NODES;

    if (selectedDivision !== 'all') {
      result = result.filter(n => n.division === selectedDivision);
    }

    if (selectedRole !== 'all') {
      result = result.filter(n => n.roles.includes(selectedRole));
    }

    if (selectedStage !== 'all') {
      result = result.filter(n => n.stage.includes(selectedStage));
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n =>
        n.name.toLowerCase().includes(q) ||
        n.path.toLowerCase().includes(q) ||
        n.category.toLowerCase().includes(q) ||
        n.description.toLowerCase().includes(q)
      );
    }

    return result;
  }, [selectedDivision, selectedRole, selectedStage, searchQuery]);

  // Group nodes by division
  const clusteredNodes = useMemo(() => {
    const map: Record<string, RouteTopologyNode[]> = {};
    filteredNodes.forEach(node => {
      if (!map[node.division]) map[node.division] = [];
      map[node.division].push(node);
    });
    return map;
  }, [filteredNodes]);

  // Active Flow Edge details
  const activeEdge = useMemo(() => {
    if (!activeEdgeId) return null;
    return DATA_FLOW_EDGES.find(e => e.id === activeEdgeId);
  }, [activeEdgeId]);

  return (
    <div className="space-y-6">
      {/* TOPOLOGY CONTROL BAR */}
      <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Network className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                Topologi Jaringan Terintegrasi
              </span>
              <span className="text-xs text-slate-400 font-medium">
                {filteredNodes.length} dari {TOPOLOGY_NODES.length} Node Aktif
              </span>
            </div>
            <h3 className="text-sm font-extrabold text-white">
              Peta Relasi Rute & Alur Data Antar-Divisi
            </h3>
          </div>
        </div>

        {/* View Mode & Filter Tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setViewMode('cluster')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'cluster'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" /> Kluster Divisi
            </button>
            <button
              onClick={() => setViewMode('pipeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                viewMode === 'pipeline'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Share2 className="w-3.5 h-3.5" /> Alur Data (20 Pipeline)
            </button>
          </div>

          {/* Quick Search */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Cari rute path / modul..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-cyan-500 w-44 sm:w-56"
            />
          </div>
        </div>
      </div>

      {/* FILTER PILLS */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin text-xs">
        <span className="text-slate-500 font-semibold text-[11px] whitespace-nowrap pl-1">
          Filter Kluster:
        </span>
        <button
          onClick={() => setSelectedDivision('all')}
          className={`px-3 py-1 rounded-full text-xs font-bold transition-all border whitespace-nowrap ${
            selectedDivision === 'all'
              ? 'bg-white text-slate-950 border-white shadow-md'
              : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700'
          }`}
        >
          Semua ({TOPOLOGY_NODES.length})
        </button>

        {(['tu', 'kurikulum', 'kesiswaan', 'hubin', 'konseling', 'sarpras', 'koperasi', 'executive'] as const).map(div => {
          const meta = getDivisionMeta(div);
          const count = TOPOLOGY_NODES.filter(n => n.division === div).length;
          const isSelected = selectedDivision === div;

          return (
            <button
              key={div}
              onClick={() => setSelectedDivision(div)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all border whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? `${meta.bg} ${meta.color} ${meta.border} ring-1 ${meta.ring}`
                  : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:border-slate-700'
              }`}
            >
              <meta.icon className="w-3 h-3" />
              <span>{meta.name}</span>
              <span className="text-[10px] opacity-70">({count})</span>
            </button>
          );
        })}
      </div>

      {/* MAIN TOPOLOGY VIEW AREA */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* LEFT / CENTER: GRAPH CANVAS OR PIPELINE LIST (8 Cols) */}
        <div className="lg:col-span-7 xl:col-span-8 space-y-6">

          {/* CENTRAL UNIFIED BUS BANNER */}
          <div className="relative rounded-2xl p-4 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-slate-800/80 shadow-lg overflow-hidden flex items-center justify-between">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(56,189,248,0.08)_0,transparent_70%)] pointer-events-none" />
            <div className="flex items-center gap-3 relative z-10">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 text-slate-950 font-black shadow-lg shadow-cyan-500/20">
                <Database className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-cyan-400 tracking-wider">
                  Absenta Unified Data Engine
                </span>
                <h4 className="text-sm font-extrabold text-white">
                  Satu Sumber Data Terpadu (Single Source of Truth)
                </h4>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-1 text-[11px] text-slate-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Sync</span>
            </div>
          </div>

          {/* VIEW MODE 1: CLUSTERED NODE MATRIX */}
          {viewMode === 'cluster' && (
            <div className="space-y-6">
              {Object.entries(clusteredNodes).map(([divKey, nodes]) => {
                const meta = getDivisionMeta(divKey as DivisionType | 'executive');
                const Icon = meta.icon;

                return (
                  <div
                    key={divKey}
                    className="rounded-2xl p-5 bg-slate-900/40 border border-slate-800/80 backdrop-blur-sm shadow-xl space-y-4"
                  >
                    {/* Cluster Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-800/60">
                      <div className="flex items-center gap-2.5">
                        <div className={`p-2 rounded-lg ${meta.bg} ${meta.color} border ${meta.border}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <h4 className={`text-sm font-black tracking-wide ${meta.color}`}>
                            {meta.name.toUpperCase()}
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            {nodes.length} Modul & Rute Terhubung
                          </span>
                        </div>
                      </div>

                      <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800/80 text-slate-300 border border-slate-700 font-semibold">
                        Divisi Hub
                      </span>
                    </div>

                    {/* Nodes in this Cluster */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {nodes.map(node => {
                        const isSelected = selectedNode?.id === node.id;
                        const isFlowSource = activeEdge?.from === node.id;
                        const isFlowTarget = activeEdge?.to === node.id;

                        return (
                          <div
                            key={node.id}
                            onClick={() => setSelectedNode(node)}
                            className={`group cursor-pointer rounded-xl p-3.5 transition-all duration-200 border flex flex-col justify-between ${
                              isSelected
                                ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg scale-[1.02]'
                                : isFlowSource
                                ? 'bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/40'
                                : isFlowTarget
                                ? 'bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/40'
                                : 'bg-slate-950/60 border-slate-800/70 hover:border-slate-700 hover:bg-slate-900/80'
                            }`}
                          >
                            <div>
                              <div className="flex items-center justify-between gap-1 mb-1.5">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                                  {node.category}
                                </span>
                                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-900 text-cyan-400 border border-slate-800 truncate max-w-[120px]">
                                  {node.path}
                                </span>
                              </div>

                              <h5 className="text-xs sm:text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                                {node.name}
                              </h5>
                              <p className="mt-1 text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                                {node.description}
                              </p>
                            </div>

                            {/* Node Footer Actions */}
                            <div className="mt-3 pt-2.5 border-t border-slate-800/60 flex items-center justify-between">
                              <span className="text-[10px] text-slate-500 flex items-center gap-1 font-medium">
                                <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                {node.stage.length} Fase Siswa
                              </span>

                              <div className="flex items-center gap-1.5">
                                <Link
                                  to={node.path}
                                  onClick={e => e.stopPropagation()}
                                  className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-500/10 hover:bg-cyan-500 text-cyan-300 hover:text-slate-950 border border-cyan-500/20 transition-all flex items-center gap-1"
                                >
                                  Buka <ExternalLink className="w-2.5 h-2.5" />
                                </Link>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* VIEW MODE 2: DATA FLOW PIPELINE LIST */}
          {viewMode === 'pipeline' && (
            <div className="rounded-2xl p-6 bg-slate-900/50 border border-slate-800/80 shadow-xl space-y-4">
              <div className="border-b border-slate-800 pb-3 flex items-center justify-between">
                <div>
                  <h4 className="text-base font-extrabold text-white flex items-center gap-2">
                    <Share2 className="w-4 h-4 text-cyan-400" />
                    Pipa Alur Integrasi Antar-Divisi (20 Data Flow Pipelines)
                  </h4>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Klik salah satu pipa aliran di bawah untuk menyorot perpindahan data antar divisi secara visual.
                  </p>
                </div>
              </div>

              <div className="space-y-3">
                {DATA_FLOW_EDGES.map(edge => {
                  const sourceNode = TOPOLOGY_NODES.find(n => n.id === edge.from);
                  const targetNode = TOPOLOGY_NODES.find(n => n.id === edge.to);
                  const isEdgeActive = activeEdgeId === edge.id;

                  if (!sourceNode || !targetNode) return null;

                  const sourceMeta = getDivisionMeta(sourceNode.division);
                  const targetMeta = getDivisionMeta(targetNode.division);

                  return (
                    <div
                      key={edge.id}
                      onClick={() => {
                        setActiveEdgeId(isEdgeActive ? null : edge.id);
                        setSelectedNode(targetNode);
                      }}
                      className={`cursor-pointer rounded-xl p-4 transition-all duration-200 border flex flex-col md:flex-row md:items-center justify-between gap-3 ${
                        isEdgeActive
                          ? 'bg-slate-900 border-cyan-400 ring-2 ring-cyan-500/30 shadow-lg'
                          : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${sourceMeta.badgeBg}`}>
                            {sourceMeta.name.split(' ')[0]}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-cyan-400" />
                          <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${targetMeta.badgeBg}`}>
                            {targetMeta.name.split(' ')[0]}
                          </span>
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                            {edge.type}
                          </span>
                        </div>
                        <h5 className="text-xs sm:text-sm font-extrabold text-white">
                          {edge.label}
                        </h5>
                      </div>

                      <div className="flex items-center gap-2 text-xs text-slate-400 shrink-0">
                        <div className="text-right hidden sm:block">
                          <div className="text-[11px] text-slate-300 font-semibold">{sourceNode.name}</div>
                          <div className="text-[10px] text-slate-500">menuju {targetNode.name}</div>
                        </div>
                        <ChevronRight className={`w-4 h-4 transition-transform ${isEdgeActive ? 'rotate-90 text-cyan-400' : 'text-slate-600'}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>

        {/* RIGHT: INSPECTOR PANEL / NODE DETAIL SIDEBAR (4-5 Cols) */}
        <div className="lg:col-span-5 xl:col-span-4 sticky top-24 space-y-4">
          <div className="rounded-2xl p-5 bg-slate-900/90 border border-slate-800 shadow-2xl backdrop-blur-md">
            {selectedNode ? (
              <div className="space-y-4">
                {/* Node Header */}
                <div className="border-b border-slate-800 pb-3 flex items-start justify-between gap-2">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${getDivisionMeta(selectedNode.division).badgeBg}`}>
                        {getDivisionMeta(selectedNode.division).name}
                      </span>
                      <span className="text-[10px] uppercase font-semibold text-slate-400">
                        {selectedNode.category}
                      </span>
                    </div>
                    <h4 className="text-base font-black text-white leading-tight">
                      {selectedNode.name}
                    </h4>
                  </div>
                  
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 ring-4 ring-emerald-500/20 shrink-0 mt-1" />
                </div>

                {/* URL Path Box with Copy Button */}
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 space-y-1.5">
                  <div className="flex items-center justify-between text-[10px] uppercase font-bold text-slate-400">
                    <span>URL Path Sistem Riil:</span>
                    <button
                      onClick={() => handleCopyPath(selectedNode.path)}
                      className="hover:text-cyan-400 transition-colors flex items-center gap-1"
                    >
                      {copiedPath === selectedNode.path ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span className="text-emerald-400">Tersalin</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span>Salin Path</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="font-mono text-xs font-bold text-cyan-300 break-all bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                    {selectedNode.path}
                  </div>
                </div>

                {/* Description */}
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1">
                    Fungsi & Peran Modul:
                  </span>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedNode.description}
                  </p>
                </div>

                {/* Killer Pitch Value */}
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] uppercase font-bold text-emerald-400 tracking-wider flex items-center gap-1 mb-1">
                    <Sparkles className="w-3.5 h-3.5" /> Nilai Solusi Sekolah:
                  </span>
                  <p className="text-xs text-slate-200 leading-relaxed">
                    {selectedNode.impact}
                  </p>
                </div>

                {/* Stage Relevance */}
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1.5">
                    Fase Hidup Siswa Terkait:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.stage.map(st => (
                      <span key={st} className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {st.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Role Access */}
                <div>
                  <span className="text-[11px] uppercase font-bold text-slate-400 block mb-1.5">
                    Wewenang & Hak Akses Pengguna:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedNode.roles.map(r => (
                      <span key={r} className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-500/10 text-blue-300 border border-blue-500/20">
                        POV: {r.toUpperCase()}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Direct Action Button */}
                <div className="pt-2">
                  <Link
                    to={selectedNode.path}
                    className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 font-black text-xs transition-all shadow-lg shadow-cyan-500/20 flex items-center justify-center gap-2 group"
                  >
                    <span>Buka Halaman Langsung di Absenta</span>
                    <ExternalLink className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-slate-500">
                <Info className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-xs">Pilih salah satu node pada topologi untuk melihat detail inspeksi dan membuka halamannya.</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default EcosystemTopologyGraph;
