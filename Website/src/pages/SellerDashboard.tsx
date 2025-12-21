import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { SellerDashboardComponent } from '../components/Dashboard/SellerDashboard';
import type { ProfileCompletionStatus, SellerBasicInfo, ServiceLevelAgreements } from '@shambit/shared';
import { API_ENDPOINTS } from '../config/api';

const SellerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [seller, setSeller] = useState<SellerBasicInfo | null>(null);
  const [completionStatus, setCompletionStatus] = useState<ProfileCompletionStatus | null>(null);
  const [slaTimelines, setSlaTimelines] = useState<ServiceLevelAgreements | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const token = localStorage.getItem('accessToken');
        if (!token) {
          navigate('/seller/login');
          return;
        }

        // Fetch seller profile and completion status
        const [profileResponse, statusResponse] = await Promise.all([
          fetch(`${API_ENDPOINTS.SELLER_REGISTRATION.PROFILE_STATUS}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          }),
          fetch(`${API_ENDPOINTS.SELLER_REGISTRATION.PROFILE_STATUS}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          })
        ]);

        if (!profileResponse.ok || !statusResponse.ok) {
          throw new Error('Failed to fetch dashboard data');
        }

        const profileData = await profileResponse.json();
        const statusData = await statusResponse.json();

        if (profileData.success && statusData.success) {
          setSeller(profileData.data.seller);
          setCompletionStatus(statusData.data.progress);
          setSlaTimelines(statusData.data.slaTimelines);
        } else {
          throw new Error('Invalid response from server');
        }
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        setError('Failed to load dashboard data');
        // If token is invalid, redirect to login
        if (err instanceof Error && err.message.includes('401')) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          navigate('/seller/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [navigate]);

  const handleNavigateToSection = (section: string) => {
    navigate(`/seller/profile/${section}`);
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    navigate('/seller/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#FF6F61] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !seller || !completionStatus) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-gray-600 mb-4">{error || 'Failed to load dashboard'}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[#FF6F61] text-white px-4 py-2 rounded-lg hover:bg-[#E55A4F] transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <SellerDashboardComponent
        seller={seller}
        completionProgress={completionStatus}
        onNavigateToSection={handleNavigateToSection}
        onLogout={handleLogout}
        welcomeMessage={true}
        onboardingGuide={true}
        slaTimelines={slaTimelines}
      />
    </div>
  );
};

export default SellerDashboard;