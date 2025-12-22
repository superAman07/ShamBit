import React, { useEffect } from 'react';
import { useParams } from 'react-router-dom';

const SellerProfileCompletion: React.FC = () => {
  const { section } = useParams<{ section: string }>();

  useEffect(() => {
    // Redirect to dashboard with the section parameter
    const targetSection = section || 'dashboard';
    window.location.href = `/seller/dashboard?section=${targetSection}`;
  }, [section]);

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6F61] mx-auto mb-4"></div>
        <p className="text-gray-600">Redirecting to dashboard...</p>
      </div>
    </div>
  );
};

export default SellerProfileCompletion;