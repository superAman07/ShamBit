import { useState, useEffect } from 'react';
import { sellerApi, errorUtils } from '../../../utils/api';
import type { SellerProfile, SectionStatus } from '../types';

export interface UseSellerProfileReturn {
  seller: SellerProfile | null;
  sectionStatus: SectionStatus;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateSectionStatus: (section: keyof SectionStatus, completed: boolean) => void;
}

export const useSellerProfile = (): UseSellerProfileReturn => {
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>({
    business: false,
    tax: false,
    bank: false,
    documents: false
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadSellerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const token = localStorage.getItem('accessToken');
      if (!token) {
        window.location.href = '/seller/login';
        return;
      }

      // Fetch seller profile from API
      const response = await sellerApi.getProfile() as { success: boolean; data: { seller: SellerProfile } };
      setSeller(response.data.seller);
      
      // Calculate section completion status
      const status: SectionStatus = {
        business: !!response.data.seller.businessDetails,
        tax: !!response.data.seller.taxCompliance,
        bank: !!response.data.seller.bankDetails,
        documents: !!(response.data.seller.documents && response.data.seller.documents.length > 0)
      };
      setSectionStatus(status);
      
    } catch (error) {
      console.error('Error loading seller data:', error);
      setError(errorUtils.getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const updateSectionStatus = (section: keyof SectionStatus, completed: boolean) => {
    setSectionStatus(prev => ({ ...prev, [section]: completed }));
  };

  useEffect(() => {
    loadSellerData();
  }, []);

  return {
    seller,
    sectionStatus,
    loading,
    error,
    refetch: loadSellerData,
    updateSectionStatus
  };
};