import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ProfileCompletionForm } from '../components/Profile/ProfileCompletionForm';
import type { ProfileCompletionStatus, SellerBasicInfo } from '@shambit/shared';
import { API_ENDPOINTS } from '../config/api';

const SellerProfileCompletion: React.FC = () => {
  const { section } = useParams<{ section: string }>();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<SellerBasicInfo | null>(null);
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          navigate('/seller/login');
          return;
        }

        const response = await fetch(`${API_ENDPOINTS.SELLER_REGISTRATION.PROFILE_STATUS}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Failed to fetch profile data');
        }

        const data = await response.json();
        if (data.success) {
          setSeller(data.data.seller);
          setCompletionStatus(data.data.progress);
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (err) {
        console.error('Profile data fetch error:', err);
        setError('Failed to load profile data');
        if (err instanceof Error && err.message.includes('401')) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          navigate('/seller/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, [navigate]);

  const handleSectionComplete = async (sectionData: any, partialSave: boolean = false) => {
    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        navigate('/seller/login');
        return;
      }

      const response = await fetch(`${API_ENDPOINTS.SELLER_REGISTRATION.PROFILE_UPDATE}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          section: section,
          data: sectionData,
          partialSave: partialSave
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update profile');
      }

      const data = await response.json();
      if (data.success) {
        setCompletionStatus(data.data.completionStatus);
        
        if (!partialSave) {
          // Navigate back to dashboard after successful completion
          navigate('/seller/dashboard');
        }
      } else {
        throw new Error(data.error?.message || 'Failed to update profile');
      }
    } catch (err) {
      console.error('Profile update error:', err);
      setError('Failed to update profile');
    }
  };

  const handleBackToDashboard = () => {
    navigate('/seller/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6F61] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !seller || !completionStatus || !section) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error || 'Invalid profile section'}</p>
          <button
            onClick={handleBackToDashboard}
            className="bg-[#FF6F61] text-white px-4 py-2 rounded-lg hover:bg-[#E55A4F] transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <ProfileCompletionForm
        section={section}
        seller={seller}
        completionStatus={completionStatus}
        onSectionComplete={handleSectionComplete}
        onBackToDashboard={handleBackToDashboard}
      />
    </div>
  );
};

export default SellerProfileCompletion;