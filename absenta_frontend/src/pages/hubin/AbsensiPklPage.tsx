import React from 'react';
import { AbsensiPklView, type UniversalAbsensiPklViewProps } from '@/components/hubin/absensi/AbsensiPklView';

export { AbsensiPklView, type UniversalAbsensiPklViewProps };

export const AbsensiPklSection: React.FC<{ hideLayout?: boolean }> = React.memo(({ hideLayout = false }) => (
  <AbsensiPklView hideLayout={hideLayout} />
));

const AbsensiPklPage: React.FC = React.memo(() => <AbsensiPklView hideLayout={false} />);

export default AbsensiPklPage;
