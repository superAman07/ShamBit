import React from 'react';
import SectionCard from '../components/SectionCard';
import InfoCard from '../components/InfoCard';
import type { BaseStepProps } from '../types';

const DocumentsStep: React.FC<BaseStepProps> = ({ seller, onSave, canEdit }) => {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Document Upload"
        description="Upload clear, readable documents for verification"
      >
        <InfoCard type="info" title="Coming Soon">
          Document upload interface will be implemented here with drag & drop functionality.
        </InfoCard>
      </SectionCard>
    </div>
  );
};

export default DocumentsStep;