import React from 'react';
import SectionCard from '../components/SectionCard';
import InfoCard from '../components/InfoCard';
import type { BaseStepProps } from '../types';

const BankStep: React.FC<BaseStepProps> = ({ seller: _seller, onSave: _onSave, canEdit: _canEdit, isLoading: _isLoading }) => {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Bank Details"
        description="Add your bank account details for receiving payments"
      >
        <InfoCard type="info" title="Coming Soon">
          Bank details form will be implemented here with account verification.
        </InfoCard>
      </SectionCard>
    </div>
  );
};

export default BankStep;