import React from 'react';
import SectionCard from '../components/SectionCard';
import InfoCard from '../components/InfoCard';
import type { BaseStepProps } from '../types';

interface ReviewStepProps extends BaseStepProps {
  onSubmitApplication: () => Promise<void>;
  canSubmit: boolean;
  submitting: boolean;
}

const ReviewStep: React.FC<ReviewStepProps> = ({ 
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
          {canSubmit && (
            <button
              onClick={onSubmitApplication}
              disabled={submitting}
              className="mt-3 px-4 py-2 bg-[#FF6F61] text-white rounded-lg hover:bg-[#E55A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit Application'}
            </button>
          )}
        </InfoCard>
      </SectionCard>
    </div>
  );
};

export default ReviewStep;