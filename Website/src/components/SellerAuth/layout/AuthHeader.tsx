import React from 'react';

const AuthHeader: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-[#FF6F61] to-[#E55A4F] px-6 py-8 text-center">
      {/* Logo */}
      <div className="flex items-center justify-center mb-4">
        <div className="text-3xl font-bold leading-none">
          <span className="bg-gradient-to-r from-orange-200 via-yellow-200 to-amber-200 bg-clip-text text-transparent">
            Sham
          </span>
          <span className="bg-gradient-to-r from-cyan-200 via-blue-200 to-indigo-200 bg-clip-text text-transparent">
            Bit
          </span>
        </div>
      </div>
      
      {/* Tagline */}
      <div className="text-orange-100 text-sm font-medium">
        Seller Portal
      </div>
    </div>
  );
};

export default AuthHeader;