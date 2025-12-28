import React from 'react';
import SectionCard from '../components/SectionCard';
import InfoCard from '../components/InfoCard';
import type { BaseStepProps } from '../types';

const TaxStep: React.FC<BaseStepProps> = () => {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Tax Information"
        description="Provide your tax compliance details for verification"
      >
        <InfoCard type="info" title="Coming Soon">
          Tax information form will be implemented here with PAN, GST, and Aadhaar validation.
        </InfoCard>
      </SectionCard>
    </div>
  );
};

export default TaxStep;