import React from 'react';
import SectionCard from '../components/SectionCard';
import InfoCard from '../components/InfoCard';
import type { BaseStepProps } from '../types';

interface ReviewStepProps extends BaseStepProps {
  onSubmitApplication: () => void;
  canSubmit: boolean;
  submitting: boolean;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ 
  seller, 
  onSave, 
  canEdit, 
  onSubmitApplication,
  canSubmit,
  submitting
}) => {
  return (
    <div className="space-y-6">
      <SectionCard
        title="Review & Submit"
        description="Review your information and submit your seller application"
      >
        <InfoCard type="info" title="Coming Soon">
          Review interface will be implemented here with application summary and submission.
        </InfoCard>
      </SectionCard>
    </div>
  );
};

export default ReviewStep;