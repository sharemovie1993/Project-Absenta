import React from 'react';
import { motion } from 'framer-motion';
import { WaliKelasDashboardContainer } from '../walas/WaliKelasDashboardContainer';

interface StaffWaliKelasTabProps {
  waliKelasNama?: string;
}

export const StaffWaliKelasTab: React.FC<StaffWaliKelasTabProps> = ({
  waliKelasNama,
}) => {
  return (
    <motion.div
      key="tab-binaan"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -8 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <WaliKelasDashboardContainer waliKelasNama={waliKelasNama} />
    </motion.div>
  );
};
