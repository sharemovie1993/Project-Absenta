import React from 'react';
import { motion } from 'framer-motion';
import { PiketOperations } from '../../piket/PiketOperations';
import { PiketPrintSlip } from '../../piket/PiketPrintSlip';

interface StaffPiketOperasionalTabProps {
  dailyPermits: any[];
  refetchPermits: () => void;
  printedPermit: any;
  setPrintedPermit: (permit: any) => void;
  printPaperSize: string;
  setPrintPaperSize: (size: string) => void;
  tenantInfo: any;
}

export const StaffPiketOperasionalTab: React.FC<StaffPiketOperasionalTabProps> = ({
  dailyPermits,
  refetchPermits,
  printedPermit,
  setPrintedPermit,
  printPaperSize,
  setPrintPaperSize,
  tenantInfo,
}) => {
  return (
    <motion.div
      key="tab-kelola"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div className="p-5 sm:p-7 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-6">
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white tracking-tight">
            Operasional Guru Piket Harian &amp; Izin Keluar Siswa
          </h2>
          <p className="text-xs font-medium text-slate-500 dark:text-slate-400">
            Kelola penerbitan surat izin keluar sementara, dispensasi, dan penanganan piket harian sekolah.
          </p>
        </div>

        <PiketOperations
          dailyPermits={dailyPermits}
          refetchPermits={refetchPermits}
          onPrintPermit={(permit) => setPrintedPermit(permit)}
        />
      </div>

      {/* Slip Cetak Surat Izin Piket */}
      {printedPermit && (
        <PiketPrintSlip
          permit={printedPermit}
          paperSize={printPaperSize}
          onPaperSizeChange={setPrintPaperSize}
          onClose={() => setPrintedPermit(null)}
          tenantInfo={tenantInfo}
        />
      )}
    </motion.div>
  );
};
