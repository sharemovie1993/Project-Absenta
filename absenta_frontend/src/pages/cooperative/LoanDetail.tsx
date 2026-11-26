import React from 'react';
import { useParams } from 'react-router-dom';
import {
  LoanDetailView,
  type UniversalLoanDetailViewProps,
} from '../../components/cooperative/loans/LoanDetailView';

export type LoanDetailProps = UniversalLoanDetailViewProps;

const LoanDetail: React.FC<LoanDetailProps> = ({
  loanId,
  isModal,
  hideLayout,
  readOnly,
  onClose,
}) => {
  const params = useParams<{ id: string }>();
  return (
    <LoanDetailView
      loanId={loanId || params.id}
      isModal={isModal}
      hideLayout={hideLayout}
      readOnly={readOnly}
      onClose={onClose}
    />
  );
};

export default LoanDetail;
