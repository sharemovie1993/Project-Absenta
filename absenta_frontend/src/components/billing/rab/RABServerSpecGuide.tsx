import React from 'react';
import { Cpu, Zap } from 'lucide-react';
import type { RABProductItem } from '@/components/billing/RABCalculatorModal';

interface RABServerSpecGuideProps {
  serverPlanObj?: RABProductItem;
  parsedSpecs?: any;
}

export const RABServerSpecGuide: React.FC<RABServerSpecGuideProps> = React.memo(({
  serverPlanObj,
  parsedSpecs,
}) => {
  return (
    <div className="space-y-6">
      {/* 1. SPESIFIKASI TEKNIS SERVER */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Cpu size={16} className="text-blue-500" />
          1. Spesifikasi Teknis Server Node Eksplisit ({serverPlanObj?.name || 'Server Lokal'})
        </h3>

        <div className="bg-slate-50 dark:bg-slate-950 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="bg-blue-500/10 border border-blue-500/30 p-3 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <Cpu size={18} className="text-blue-600 dark:text-blue-400 shrink-0" />
              <div>
                <span className="font-extrabold text-blue-900 dark:text-blue-200 block">
                  Kesesuaian Socket & Standar Perakitan Komponen (LGA / Chipset / RAM):
                </span>
                <span className="text-blue-700 dark:text-blue-300 font-semibold">
                  {parsedSpecs?.socket || 'Socket LGA1700 (Intel 14th Gen) / Socket Server Dedicated'}
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 rounded-lg font-bold text-[11px] shrink-0 border border-emerald-300 dark:border-emerald-800">
              ✓ Verified Socket Compatible
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-400 font-medium block">Tipe & Seri Server:</span>
              <span className="font-bold text-slate-900 dark:text-white text-sm">{serverPlanObj?.name || 'Server Rakitan Absenta Node'}</span>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Kondisi & Peruntukan:</span>
              <span className="font-bold text-blue-600 dark:text-blue-400">
                {serverPlanObj?.id?.includes('R730') ? '🔄 Refurbished Grade A (Ex-Data Center 2U)' : '✨ Unit Baru BNIB (Garansi Resmi/Vendor)'}
              </span>
            </div>
          </div>

          <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">Rincian Acuan Komponen Fisik Eksplisit (BOM Perakitan dari DB):</span>
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-200/70 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-[11px] uppercase">
                    <th className="p-2.5 text-left rounded-l-lg">Komponen</th>
                    <th className="p-2.5 text-left">Deskripsi Eksplisit Komponen</th>
                    <th className="p-2.5 text-left rounded-r-lg">Acuan Brand & Distributor Resmi ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 font-medium">
                  <tr className="bg-blue-50/30 dark:bg-blue-950/20">
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Socket & Platform</td>
                    <td className="p-2.5 font-extrabold text-blue-600 dark:text-blue-400">{parsedSpecs?.socket || 'Socket LGA1700 / Intel Server Platform'}</td>
                    <td className="p-2.5 text-slate-500 font-semibold">Standard Compatibility Match</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Form Factor / Sasis</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.sasis || 'Workstation Industrial Tower Case'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">DeepCool / Tecware Workstation Case</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Processor (CPU)</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.cpu || 'Intel Core i7-14700K 20-Core / 28-Thread (LGA1700)'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{parsedSpecs?.cpu_brand || 'Intel Box Resmi (Garansi 3 Thn)'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Motherboard</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.motherboard || 'ASUS TUF Gaming Z790-PLUS WIFI DDR5 (LGA1700)'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{parsedSpecs?.motherboard_brand || 'ASUS Indonesia / Synnex Metrodata'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">RAM Memory</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.ram || '64GB (2x32GB) DDR5 5600MHz Dual-Channel'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{parsedSpecs?.ram_brand || 'Kingston FURY Beast DDR5 64GB Kit'}</td>
                  </tr>
                  <tr>
                    <td className="p-2.5 font-bold text-slate-900 dark:text-white">Storage SSD (RAID-1)</td>
                    <td className="p-2.5 text-slate-600 dark:text-slate-300">{parsedSpecs?.storage || 'Dual 1TB M.2 NVMe PCIe 4.0 SSD (RAID-1 Mirroring)'}</td>
                    <td className="p-2.5 text-blue-600 dark:text-blue-400 font-semibold">{parsedSpecs?.storage_brand || '2x Samsung 980 PRO 1TB / Kingston KC3000'}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PANDUAN PERAKITAN RAM DUAL-CHANNEL */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
          <Zap size={16} className="text-amber-500" />
          2. Panduan Fitting Perakitan & Pemasangan RAM Dual-Channel
        </h3>

        <div className="bg-amber-50/50 dark:bg-amber-950/20 p-5 rounded-2xl border border-amber-200 dark:border-amber-900/40 space-y-4 text-xs">
          <div className="space-y-2">
            <div className="font-extrabold text-amber-900 dark:text-amber-200 text-xs flex items-center gap-1.5">
              <span className="w-5 h-5 bg-amber-500 text-white rounded-full flex items-center justify-center text-[10px] font-black">1</span>
              Aturan Pemasangan RAM Memory (Dual-Channel Slot Matching A2 + B2)
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed pl-6">
              Saat menggunakan 2 keping RAM (misal 2x16GB atau 2x32GB) pada motherboard 4-slot RAM, keping RAM <strong>WAJIB dipasang pada Slot 2 (DIMM_A2) dan Slot 4 (DIMM_B2)</strong> dihitung dari socket CPU.
            </p>

            <div className="pl-6 pt-1">
              <div className="bg-slate-900 text-white p-3.5 rounded-xl border border-slate-800 space-y-2">
                <div className="text-[11px] font-mono text-slate-400 flex justify-between items-center border-b border-slate-800 pb-1.5">
                  <span>[ SOCKET CPU ]</span>
                  <span className="text-amber-400 font-bold">DIMM SLOT SCHEMATIC (MOTHERBOARD 4-SLOT)</span>
                </div>
                <div className="grid grid-cols-4 gap-2 text-center font-mono text-[11px]">
                  <div className="bg-slate-800 p-2 rounded border border-slate-700 text-slate-400">
                    Slot 1 (DIMM_A1)<br/>
                    <span className="text-[10px] text-slate-500 font-sans">Kosong</span>
                  </div>
                  <div className="bg-emerald-950/90 text-emerald-300 p-2 rounded border border-emerald-500 font-bold shadow-sm">
                    Slot 2 (DIMM_A2)<br/>
                    <span className="text-[10px] text-emerald-400 font-sans">✓ RAM #1 (OK)</span>
                  </div>
                  <div className="bg-slate-800 p-2 rounded border border-slate-700 text-slate-400">
                    Slot 3 (DIMM_B1)<br/>
                    <span className="text-[10px] text-slate-500 font-sans">Kosong</span>
                  </div>
                  <div className="bg-emerald-950/90 text-emerald-300 p-2 rounded border border-emerald-500 font-bold shadow-sm">
                    Slot 4 (DIMM_B2)<br/>
                    <span className="text-[10px] text-emerald-400 font-sans">✓ RAM #2 (OK)</span>
                  </div>
                </div>
                <div className="text-[10px] text-amber-300/90 pt-1 font-sans">
                  ⚠️ <strong>Mengapa ini penting?</strong> Memasang RAM pada Slot A1+A2 (berdampingan) akan memotong bandwidth server hingga 50% (Single-Channel) dan berisiko memicu BSOD / Stuttering saat beban berat 24/7.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
