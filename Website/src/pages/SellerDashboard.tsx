import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  User, 
  Building, 
  FileText, 
  CreditCard, 
  Settings,
  LogOut,
  Bell,
  CheckCircle,
  Clock,
  AlertTriangle,
  Upload,
  XCircle,
  Info
} from 'lucide-react';
import type { 
  SellerBasicInfo, 
  BusinessDetails, 
  TaxCompliance, 
  BankDetails, 
  Document,
  AddressInfo
} from '@shambit/shared';
import { sellerApi, errorUtils, validation, fileUtils } from '../utils/api';

// Application status types
type ApplicationStatus = 'incomplete' | 'submitted' | 'clarification_needed' | 'approved' | 'rejected';

// Section completion status
interface SectionStatus {
  business: boolean;
  tax: boolean;
  bank: boolean;
  documents: boolean;
}

// Complete seller profile with application status
interface SellerProfile extends SellerBasicInfo {
  applicationStatus: ApplicationStatus;
  rejectionReason?: string;
  clarificationRequests?: string[];
  businessDetails?: BusinessDetails;
  taxCompliance?: TaxCompliance;
  bankDetails?: BankDetails;
  documents?: Document[];
  addressInfo?: AddressInfo;
}

const SellerDashboard: React.FC = () => {
  const [seller, setSeller] = useState<SellerProfile | null>(null);
  const [sectionStatus, setSectionStatus] = useState<SectionStatus>({
    business: false,
    tax: false,
    bank: false,
    documents: false
  });
  const [activeSection, setActiveSection] = useState<string>('dashboard');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadSellerData();
  }, []);

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
      const response = await sellerApi.getProfile() as { seller: SellerProfile };
      setSeller(response.seller);
      
      // Calculate section completion status
      const status: SectionStatus = {
        business: !!response.seller.businessDetails,
        tax: !!response.seller.taxCompliance,
        bank: !!response.seller.bankDetails,
        documents: !!(response.seller.documents && response.seller.documents.length > 0)
      };
      setSectionStatus(status);
      
    } catch (error) {
      console.error('Error loading seller data:', error);
      setError(errorUtils.getErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const calculateProgress = (): number => {
    const completedSections = Object.values(sectionStatus).filter(Boolean).length;
    return (completedSections / 4) * 100;
  };

  const canSubmitApplication = (): boolean => {
    return Object.values(sectionStatus).every(Boolean);
  };

  const handleSectionSave = async (section: string, data: any) => {
    try {
      setError(null);
      
      // Call appropriate API based on section
      switch (section) {
        case 'business':
          await sellerApi.updateBusinessDetails(data);
          break;
        case 'tax':
          await sellerApi.updateTaxInformation(data);
          break;
        case 'bank':
          await sellerApi.updateBankDetails(data);
          break;
        case 'documents':
          // Document upload is handled separately in the documents form
          break;
        default:
          throw new Error(`Unknown section: ${section}`);
      }

      // Update section status
      setSectionStatus(prev => ({ ...prev, [section]: true }));
      
      // Reload seller data to get updated info
      await loadSellerData();
      
      // Navigate back to dashboard
      setActiveSection('dashboard');
      
    } catch (error) {
      console.error(`Error saving ${section}:`, error);
      setError(errorUtils.getErrorMessage(error));
      throw error;
    }
  };

  const handleApplicationSubmit = async () => {
    if (!canSubmitApplication()) {
      setError('Please complete all sections before submitting');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      await sellerApi.submitApplication();
      
      // Reload seller data to get updated status
      await loadSellerData();
      
    } catch (error) {
      console.error('Error submitting application:', error);
      setError(errorUtils.getErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    window.location.href = '/seller/login';
  };

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: User },
    { id: 'business', label: 'Business Details', icon: Building },
    { id: 'tax', label: 'Tax Information', icon: FileText },
    { id: 'bank', label: 'Bank Details', icon: CreditCard },
    { id: 'documents', label: 'Documents', icon: Upload },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const getStatusIcon = (section: string) => {
    if (section === 'dashboard' || section === 'settings') return null;
    
    const isCompleted = sectionStatus[section as keyof SectionStatus];
    
    if (seller?.applicationStatus === 'rejected' && !isCompleted) {
      return <XCircle className="w-4 h-4 text-red-500" />;
    }
    
    if (isCompleted) {
      return <CheckCircle className="w-4 h-4 text-green-500" />;
    }
    
    return <Clock className="w-4 h-4 text-gray-400" />;
  };

  const canEditSection = (_section: string): boolean => {
    if (!seller) return false;
    
    // Can edit if application is incomplete, rejected, or needs clarification
    return ['incomplete', 'rejected', 'clarification_needed'].includes(seller.applicationStatus);
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

  if (error || !seller) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">{error || 'Failed to load dashboard'}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-[#FF6F61] text-white rounded-lg hover:bg-[#E55A4F]"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0`}>
        <div className="flex items-center justify-center h-16 px-4 bg-gradient-to-r from-[#FF6F61] to-[#E55A4F]">
          <div className="text-xl font-bold leading-none">
            <span className="bg-gradient-to-r from-orange-200 via-yellow-200 to-amber-200 bg-clip-text text-transparent">Sham</span>
            <span className="bg-gradient-to-r from-cyan-200 via-blue-200 to-indigo-200 bg-clip-text text-transparent">Bit</span>
            <span className="text-white ml-2 text-lg">Seller</span>
          </div>
        </div>
        
        <nav className="mt-8">
          {sidebarItems.map((item) => {
            const canEdit = canEditSection(item.id);
            const isDisabled = !canEdit && item.id !== 'dashboard' && item.id !== 'settings';
            
            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!isDisabled) {
                    setActiveSection(item.id);
                    setSidebarOpen(false);
                  }
                }}
                disabled={isDisabled}
                className={`w-full flex items-center px-6 py-3 text-left transition-colors ${
                  isDisabled 
                    ? 'text-gray-400 cursor-not-allowed' 
                    : 'hover:bg-gray-50 text-gray-700'
                } ${
                  activeSection === item.id ? 'bg-orange-50 border-r-4 border-[#FF6F61] text-[#FF6F61]' : ''
                }`}
              >
                <item.icon className="w-5 h-5 mr-3" />
                {item.label}
                <div className="ml-auto">
                  {getStatusIcon(item.id)}
                </div>
              </button>
            );
          })}
        </nav>

        <div className="absolute bottom-0 w-full p-4 border-t">
          <button
            onClick={handleLogout}
            className="w-full flex items-center px-4 py-2 text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
          >
            <LogOut className="w-5 h-5 mr-3" />
            Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 lg:ml-0">
        {/* Header */}
        <header className="bg-white shadow-sm border-b">
          <div className="flex items-center justify-between px-4 py-4">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h2 className="ml-2 text-xl font-semibold text-gray-900">
                {sidebarItems.find(item => item.id === activeSection)?.label || 'Dashboard'}
              </h2>
            </div>
            
            <div className="flex items-center space-x-4">
              <button className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg">
                <Bell className="w-5 h-5" />
              </button>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-[#FF6F61] rounded-full flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {seller.fullName.charAt(0).toUpperCase()}
                  </span>
                </div>
                <span className="text-sm font-medium text-gray-900 hidden sm:block">
                  {seller.fullName}
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="p-4 lg:p-6">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {activeSection === 'dashboard' && (
              <DashboardOverview 
                seller={seller}
                sectionStatus={sectionStatus}
                progress={calculateProgress()}
                onNavigateToSection={setActiveSection}
                onSubmitApplication={handleApplicationSubmit}
                canSubmit={canSubmitApplication()}
                submitting={submitting}
              />
            )}

            {activeSection === 'business' && (
              <BusinessDetailsForm
                seller={seller}
                onSave={(data) => handleSectionSave('business', data)}
                canEdit={canEditSection('business')}
              />
            )}

            {activeSection === 'tax' && (
              <TaxInformationForm
                seller={seller}
                onSave={(data) => handleSectionSave('tax', data)}
                canEdit={canEditSection('tax')}
              />
            )}

            {activeSection === 'bank' && (
              <BankDetailsForm
                seller={seller}
                onSave={(data) => handleSectionSave('bank', data)}
                canEdit={canEditSection('bank')}
              />
            )}

            {activeSection === 'documents' && (
              <DocumentsSection
                seller={seller}
                onSave={(data) => handleSectionSave('documents', data)}
                canEdit={canEditSection('documents')}
              />
            )}

            {activeSection === 'settings' && (
              <SettingsSection seller={seller} />
            )}
          </motion.div>
        </main>
      </div>

      {/* Overlay for mobile sidebar */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default SellerDashboard;

// Dashboard Overview Component
interface DashboardOverviewProps {
  seller: SellerProfile;
  sectionStatus: SectionStatus;
  progress: number;
  onNavigateToSection: (section: string) => void;
  onSubmitApplication: () => void;
  canSubmit: boolean;
  submitting: boolean;
}

const DashboardOverview: React.FC<DashboardOverviewProps> = ({
  seller,
  sectionStatus,
  progress,
  onNavigateToSection,
  onSubmitApplication,
  canSubmit,
  submitting
}) => {
  const getStatusMessage = () => {
    switch (seller.applicationStatus) {
      case 'incomplete':
        return {
          type: 'info',
          title: 'Complete Your Profile',
          message: 'Complete all sections to submit your seller application.',
          icon: <Info className="w-5 h-5" />
        };
      case 'submitted':
        return {
          type: 'info',
          title: 'Application Under Review',
          message: 'Your application is being reviewed. We\'ll notify you within 24-48 hours.',
          icon: <Clock className="w-5 h-5" />
        };
      case 'clarification_needed':
        return {
          type: 'warning',
          title: 'Clarification Required',
          message: 'Please provide additional information as requested below.',
          icon: <AlertTriangle className="w-5 h-5" />
        };
      case 'approved':
        return {
          type: 'success',
          title: 'Application Approved!',
          message: 'Congratulations! You can now start listing products and selling.',
          icon: <CheckCircle className="w-5 h-5" />
        };
      case 'rejected':
        return {
          type: 'error',
          title: 'Application Rejected',
          message: 'Please review the feedback below and resubmit your application.',
          icon: <XCircle className="w-5 h-5" />
        };
      default:
        return {
          type: 'info',
          title: 'Welcome to ShamBit Seller Portal',
          message: 'Complete your profile to start selling.',
          icon: <Info className="w-5 h-5" />
        };
    }
  };

  const statusMessage = getStatusMessage();
  const statusColors: Record<string, string> = {
    info: 'bg-blue-50 border-blue-200 text-blue-800',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    success: 'bg-green-50 border-green-200 text-green-800',
    error: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <div className="space-y-6">
      {/* Status Banner */}
      <div className={`border rounded-lg p-4 ${statusColors[statusMessage.type]}`}>
        <div className="flex items-start">
          <div className="mr-3 mt-0.5">{statusMessage.icon}</div>
          <div>
            <h3 className="font-medium">{statusMessage.title}</h3>
            <p className="text-sm mt-1">{statusMessage.message}</p>
          </div>
        </div>
      </div>

      {/* Progress Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4">Profile Completion</h2>
        
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-[#FF6F61] h-2 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {Object.entries(sectionStatus).map(([section, completed]) => {
            const sectionLabels = {
              business: 'Business Details',
              tax: 'Tax Information',
              bank: 'Bank Details',
              documents: 'Documents'
            };

            return (
              <button
                key={section}
                onClick={() => onNavigateToSection(section)}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors text-left"
              >
                <span className="font-medium text-gray-900">
                  {sectionLabels[section as keyof typeof sectionLabels]}
                </span>
                {completed ? (
                  <CheckCircle className="w-5 h-5 text-green-500" />
                ) : (
                  <Clock className="w-5 h-5 text-gray-400" />
                )}
              </button>
            );
          })}
        </div>

        {/* Submit Application Button */}
        {seller.applicationStatus === 'incomplete' && (
          <div className="mt-6 pt-6 border-t">
            <button
              onClick={onSubmitApplication}
              disabled={!canSubmit || submitting}
              className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                canSubmit && !submitting
                  ? 'bg-[#FF6F61] text-white hover:bg-[#E55A4F]'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {submitting ? 'Submitting...' : 'Submit Application for Review'}
            </button>
            {!canSubmit && (
              <p className="text-sm text-gray-600 mt-2 text-center">
                Complete all sections to submit your application
              </p>
            )}
          </div>
        )}
      </div>

      {/* Rejection Feedback */}
      {seller.applicationStatus === 'rejected' && seller.rejectionReason && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Feedback</h3>
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800">{seller.rejectionReason}</p>
          </div>
        </div>
      )}

      {/* Clarification Requests */}
      {seller.applicationStatus === 'clarification_needed' && seller.clarificationRequests && (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Clarification Required</h3>
          <div className="space-y-3">
            {seller.clarificationRequests.map((request, index) => (
              <div key={index} className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <p className="text-yellow-800">{request}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Placeholder components for forms - these will be implemented next
const BusinessDetailsForm: React.FC<{
  seller: SellerProfile;
  onSave: (data: any) => Promise<void>;
  canEdit: boolean;
}> = ({ seller, onSave, canEdit }) => {
  const [formData, setFormData] = useState({
    businessName: seller.businessDetails?.businessName || '',
    businessType: seller.businessDetails?.businessType || '',
    natureOfBusiness: seller.businessDetails?.natureOfBusiness || '',
    yearOfEstablishment: seller.businessDetails?.yearOfEstablishment || '',
    primaryProductCategories: seller.businessDetails?.primaryProductCategories || '',
    registeredAddress: {
      line1: seller.addressInfo?.registeredAddress?.line1 || '',
      line2: seller.addressInfo?.registeredAddress?.line2 || '',
      city: seller.addressInfo?.registeredAddress?.city || '',
      state: seller.addressInfo?.registeredAddress?.state || '',
      pincode: seller.addressInfo?.registeredAddress?.pincode || '',
      country: 'India' as const
    }
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.businessName.trim()) {
      newErrors.businessName = 'Business name is required';
    }

    if (!formData.businessType) {
      newErrors.businessType = 'Business type is required';
    }

    if (!formData.natureOfBusiness.trim()) {
      newErrors.natureOfBusiness = 'Nature of business is required';
    }

    if (!formData.registeredAddress.line1.trim()) {
      newErrors.addressLine1 = 'Address line 1 is required';
    }

    if (!formData.registeredAddress.city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!formData.registeredAddress.state.trim()) {
      newErrors.state = 'State is required';
    }

    if (!formData.registeredAddress.pincode.trim()) {
      newErrors.pincode = 'PIN code is required';
    } else if (!/^[1-9][0-9]{5}$/.test(formData.registeredAddress.pincode)) {
      newErrors.pincode = 'Please enter a valid 6-digit PIN code';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    if (field.startsWith('address.')) {
      const addressField = field.replace('address.', '');
      setFormData(prev => ({
        ...prev,
        registeredAddress: {
          ...prev.registeredAddress,
          [addressField]: value
        }
      }));
    } else {
      setFormData(prev => ({ ...prev, [field]: value }));
    }

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleSave = async (saveAsDraft = false) => {
    if (!saveAsDraft && !validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setIsDraft(saveAsDraft);
      await onSave(formData);
    } catch (error) {
      console.error('Error saving business details:', error);
    } finally {
      setSaving(false);
      setIsDraft(false);
    }
  };

  const businessTypes = [
    { value: 'individual', label: 'Individual/Proprietorship' },
    { value: 'partnership', label: 'Partnership' },
    { value: 'llp', label: 'Limited Liability Partnership (LLP)' },
    { value: 'private_limited', label: 'Private Limited Company' },
    { value: 'public_limited', label: 'Public Limited Company' },
    { value: 'trust', label: 'Trust' },
    { value: 'society', label: 'Society' },
    { value: 'ngo', label: 'NGO' }
  ];

  const indianStates = [
    'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh',
    'Goa', 'Gujarat', 'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka',
    'Kerala', 'Madhya Pradesh', 'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram',
    'Nagaland', 'Odisha', 'Punjab', 'Rajasthan', 'Sikkim', 'Tamil Nadu',
    'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal',
    'Andaman and Nicobar Islands', 'Chandigarh', 'Dadra and Nagar Haveli and Daman and Diu',
    'Delhi', 'Jammu and Kashmir', 'Ladakh', 'Lakshadweep', 'Puducherry'
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Business Details</h2>
        <p className="text-sm text-gray-600 mt-1">
          Provide your business information for verification and compliance.
        </p>
      </div>

      <form className="space-y-6">
        {/* Business Information */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900">Business Information</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-2">
                Business Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="businessName"
                value={formData.businessName}
                onChange={(e) => handleInputChange('businessName', e.target.value)}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                  errors.businessName ? 'border-red-300' : 'border-gray-300'
                } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                placeholder="Enter your business name"
              />
              {errors.businessName && (
                <p className="mt-1 text-sm text-red-600">{errors.businessName}</p>
              )}
            </div>

            <div>
              <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
                Business Type <span className="text-red-500">*</span>
              </label>
              <select
                id="businessType"
                value={formData.businessType}
                onChange={(e) => handleInputChange('businessType', e.target.value)}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                  errors.businessType ? 'border-red-300' : 'border-gray-300'
                } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              >
                <option value="">Select business type</option>
                {businessTypes.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
              {errors.businessType && (
                <p className="mt-1 text-sm text-red-600">{errors.businessType}</p>
              )}
            </div>
          </div>

          <div>
            <label htmlFor="natureOfBusiness" className="block text-sm font-medium text-gray-700 mb-2">
              Nature of Business <span className="text-red-500">*</span>
            </label>
            <textarea
              id="natureOfBusiness"
              value={formData.natureOfBusiness}
              onChange={(e) => handleInputChange('natureOfBusiness', e.target.value)}
              disabled={!canEdit}
              rows={3}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                errors.natureOfBusiness ? 'border-red-300' : 'border-gray-300'
              } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="Describe your business activities (e.g., Manufacturing and selling electronics, Retail clothing, etc.)"
            />
            {errors.natureOfBusiness && (
              <p className="mt-1 text-sm text-red-600">{errors.natureOfBusiness}</p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="yearOfEstablishment" className="block text-sm font-medium text-gray-700 mb-2">
                Year of Establishment
              </label>
              <input
                type="number"
                id="yearOfEstablishment"
                value={formData.yearOfEstablishment}
                onChange={(e) => handleInputChange('yearOfEstablishment', e.target.value)}
                disabled={!canEdit}
                min="1900"
                max={new Date().getFullYear()}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent border-gray-300 ${
                  !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
                }`}
                placeholder="YYYY"
              />
            </div>
          </div>
        </div>

        {/* Registered Address */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900">Registered Address</h3>
          
          <div>
            <label htmlFor="addressLine1" className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 1 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="addressLine1"
              value={formData.registeredAddress.line1}
              onChange={(e) => handleInputChange('address.line1', e.target.value)}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                errors.addressLine1 ? 'border-red-300' : 'border-gray-300'
              } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="Building name, street name"
            />
            {errors.addressLine1 && (
              <p className="mt-1 text-sm text-red-600">{errors.addressLine1}</p>
            )}
          </div>

          <div>
            <label htmlFor="addressLine2" className="block text-sm font-medium text-gray-700 mb-2">
              Address Line 2
            </label>
            <input
              type="text"
              id="addressLine2"
              value={formData.registeredAddress.line2}
              onChange={(e) => handleInputChange('address.line2', e.target.value)}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent border-gray-300 ${
                !canEdit ? 'bg-gray-50 cursor-not-allowed' : ''
              }`}
              placeholder="Area, landmark (optional)"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                City <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="city"
                value={formData.registeredAddress.city}
                onChange={(e) => handleInputChange('address.city', e.target.value)}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                  errors.city ? 'border-red-300' : 'border-gray-300'
                } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                placeholder="Enter city"
              />
              {errors.city && (
                <p className="mt-1 text-sm text-red-600">{errors.city}</p>
              )}
            </div>

            <div>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700 mb-2">
                State <span className="text-red-500">*</span>
              </label>
              <select
                id="state"
                value={formData.registeredAddress.state}
                onChange={(e) => handleInputChange('address.state', e.target.value)}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                  errors.state ? 'border-red-300' : 'border-gray-300'
                } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              >
                <option value="">Select state</option>
                {indianStates.map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
              {errors.state && (
                <p className="mt-1 text-sm text-red-600">{errors.state}</p>
              )}
            </div>

            <div>
              <label htmlFor="pincode" className="block text-sm font-medium text-gray-700 mb-2">
                PIN Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="pincode"
                value={formData.registeredAddress.pincode}
                onChange={(e) => handleInputChange('address.pincode', e.target.value.replace(/\D/g, '').slice(0, 6))}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                  errors.pincode ? 'border-red-300' : 'border-gray-300'
                } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                placeholder="6-digit PIN code"
                maxLength={6}
              />
              {errors.pincode && (
                <p className="mt-1 text-sm text-red-600">{errors.pincode}</p>
              )}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && isDraft ? 'Saving Draft...' : 'Save as Draft'}
            </button>
            
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#FF6F61] text-white rounded-lg hover:bg-[#E55A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && !isDraft ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        )}

        {!canEdit && (
          <div className="pt-6 border-t">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                Business details have been submitted and are under review. You cannot edit them at this time.
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

const TaxInformationForm: React.FC<{
  seller: SellerProfile;
  onSave: (data: any) => Promise<void>;
  canEdit: boolean;
}> = ({ seller, onSave, canEdit }) => {
  const [formData, setFormData] = useState({
    panNumber: seller.taxCompliance?.panNumber || '',
    panHolderName: seller.taxCompliance?.panHolderName || '',
    gstRegistered: seller.taxCompliance?.gstRegistered || false,
    gstNumber: seller.taxCompliance?.gstNumber || '',
    aadhaarNumber: seller.taxCompliance?.aadhaarNumber || '',
    gstExempt: seller.taxCompliance?.gstExempt || false,
    exemptionReason: seller.taxCompliance?.exemptionReason || '',
    turnoverDeclaration: seller.taxCompliance?.turnoverDeclaration || ''
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isDraft, setIsDraft] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    // PAN validation
    if (!formData.panNumber.trim()) {
      newErrors.panNumber = 'PAN number is required';
    } else if (!validation.validatePAN(formData.panNumber)) {
      newErrors.panNumber = 'Please enter a valid PAN number (e.g., ABCDE1234F)';
    }

    if (!formData.panHolderName.trim()) {
      newErrors.panHolderName = 'PAN holder name is required';
    }

    // GST validation (if registered)
    if (formData.gstRegistered) {
      if (!formData.gstNumber.trim()) {
        newErrors.gstNumber = 'GST number is required';
      } else if (!validation.validateGST(formData.gstNumber)) {
        newErrors.gstNumber = 'Please enter a valid GST number';
      } else {
        // Check if GST contains the same PAN
        const panInGst = formData.gstNumber.substring(2, 12);
        if (panInGst !== formData.panNumber.toUpperCase()) {
          newErrors.gstNumber = 'GST number must contain the same PAN number';
        }
      }
    }

    // GST exemption validation
    if (formData.gstExempt && !formData.exemptionReason) {
      newErrors.exemptionReason = 'Please select exemption reason';
    }

    if (formData.exemptionReason === 'turnover_below_threshold' && !formData.turnoverDeclaration) {
      newErrors.turnoverDeclaration = 'Please declare your annual turnover';
    }

    // Aadhaar validation
    if (!formData.aadhaarNumber.trim()) {
      newErrors.aadhaarNumber = 'Aadhaar number is required';
    } else if (!validation.validateAadhaar(formData.aadhaarNumber)) {
      newErrors.aadhaarNumber = 'Please enter a valid 12-digit Aadhaar number';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string | boolean | number) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Handle GST registration toggle
    if (field === 'gstRegistered' && !value) {
      setFormData(prev => ({ ...prev, gstNumber: '' }));
      setErrors(prev => ({ ...prev, gstNumber: '' }));
    }

    // Handle GST exemption toggle
    if (field === 'gstExempt' && !value) {
      setFormData(prev => ({ 
        ...prev, 
        exemptionReason: '',
        turnoverDeclaration: ''
      }));
      setErrors(prev => ({ 
        ...prev, 
        exemptionReason: '',
        turnoverDeclaration: ''
      }));
    }
  };

  const handleSave = async (saveAsDraft = false) => {
    if (!saveAsDraft && !validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setIsDraft(saveAsDraft);
      await onSave(formData);
    } catch (error) {
      console.error('Error saving tax information:', error);
    } finally {
      setSaving(false);
      setIsDraft(false);
    }
  };

  const exemptionReasons = [
    { value: 'turnover_below_threshold', label: 'Annual turnover below ₹40 lakhs' },
    { value: 'exempt_goods', label: 'Dealing in GST-exempt goods/services' },
    { value: 'composition_scheme', label: 'Registered under Composition Scheme' }
  ];

  const turnoverRanges = [
    { value: '0-500000', label: 'Up to ₹5 lakhs' },
    { value: '500000-1000000', label: '₹5 lakhs - ₹10 lakhs' },
    { value: '1000000-2000000', label: '₹10 lakhs - ₹20 lakhs' },
    { value: '2000000-4000000', label: '₹20 lakhs - ₹40 lakhs' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Tax Information</h2>
        <p className="text-sm text-gray-600 mt-1">
          Provide your tax compliance details for verification.
        </p>
      </div>

      <form className="space-y-6">
        {/* PAN Details */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900">PAN Details</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="panNumber" className="block text-sm font-medium text-gray-700 mb-2">
                PAN Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="panNumber"
                value={formData.panNumber}
                onChange={(e) => handleInputChange('panNumber', e.target.value.toUpperCase())}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                  errors.panNumber ? 'border-red-300' : 'border-gray-300'
                } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                placeholder="ABCDE1234F"
                maxLength={10}
              />
              {errors.panNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.panNumber}</p>
              )}
              <p className="mt-1 text-xs text-gray-500">
                Format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)
              </p>
            </div>

            <div>
              <label htmlFor="panHolderName" className="block text-sm font-medium text-gray-700 mb-2">
                PAN Holder Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="panHolderName"
                value={formData.panHolderName}
                onChange={(e) => handleInputChange('panHolderName', e.target.value)}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                  errors.panHolderName ? 'border-red-300' : 'border-gray-300'
                } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                placeholder="Name as per PAN card"
              />
              {errors.panHolderName && (
                <p className="mt-1 text-sm text-red-600">{errors.panHolderName}</p>
              )}
            </div>
          </div>
        </div>

        {/* GST Details */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900">GST Details</h3>
          
          <div className="space-y-4">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="gstRegistered"
                checked={formData.gstRegistered}
                onChange={(e) => handleInputChange('gstRegistered', e.target.checked)}
                disabled={!canEdit}
                className="h-4 w-4 text-[#FF6F61] focus:ring-[#FF6F61] border-gray-300 rounded"
              />
              <label htmlFor="gstRegistered" className="ml-2 text-sm text-gray-700">
                I have GST registration
              </label>
            </div>

            {formData.gstRegistered && (
              <div>
                <label htmlFor="gstNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  GST Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="gstNumber"
                  value={formData.gstNumber}
                  onChange={(e) => handleInputChange('gstNumber', e.target.value.toUpperCase())}
                  disabled={!canEdit}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                    errors.gstNumber ? 'border-red-300' : 'border-gray-300'
                  } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                  placeholder="22ABCDE1234F1Z5"
                  maxLength={15}
                />
                {errors.gstNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.gstNumber}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  15-character GST number (must contain your PAN number)
                </p>
              </div>
            )}

            {!formData.gstRegistered && (
              <div className="space-y-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="gstExempt"
                    checked={formData.gstExempt}
                    onChange={(e) => handleInputChange('gstExempt', e.target.checked)}
                    disabled={!canEdit}
                    className="h-4 w-4 text-[#FF6F61] focus:ring-[#FF6F61] border-gray-300 rounded"
                  />
                  <label htmlFor="gstExempt" className="ml-2 text-sm text-gray-700">
                    I am exempt from GST registration
                  </label>
                </div>

                {formData.gstExempt && (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="exemptionReason" className="block text-sm font-medium text-gray-700 mb-2">
                        Exemption Reason <span className="text-red-500">*</span>
                      </label>
                      <select
                        id="exemptionReason"
                        value={formData.exemptionReason}
                        onChange={(e) => handleInputChange('exemptionReason', e.target.value)}
                        disabled={!canEdit}
                        className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                          errors.exemptionReason ? 'border-red-300' : 'border-gray-300'
                        } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                      >
                        <option value="">Select exemption reason</option>
                        {exemptionReasons.map((reason) => (
                          <option key={reason.value} value={reason.value}>
                            {reason.label}
                          </option>
                        ))}
                      </select>
                      {errors.exemptionReason && (
                        <p className="mt-1 text-sm text-red-600">{errors.exemptionReason}</p>
                      )}
                    </div>

                    {formData.exemptionReason === 'turnover_below_threshold' && (
                      <div>
                        <label htmlFor="turnoverDeclaration" className="block text-sm font-medium text-gray-700 mb-2">
                          Annual Turnover <span className="text-red-500">*</span>
                        </label>
                        <select
                          id="turnoverDeclaration"
                          value={formData.turnoverDeclaration}
                          onChange={(e) => handleInputChange('turnoverDeclaration', e.target.value)}
                          disabled={!canEdit}
                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                            errors.turnoverDeclaration ? 'border-red-300' : 'border-gray-300'
                          } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                        >
                          <option value="">Select turnover range</option>
                          {turnoverRanges.map((range) => (
                            <option key={range.value} value={range.value}>
                              {range.label}
                            </option>
                          ))}
                        </select>
                        {errors.turnoverDeclaration && (
                          <p className="mt-1 text-sm text-red-600">{errors.turnoverDeclaration}</p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Aadhaar Details */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900">Identity Verification</h3>
          
          <div>
            <label htmlFor="aadhaarNumber" className="block text-sm font-medium text-gray-700 mb-2">
              Aadhaar Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="aadhaarNumber"
              value={formData.aadhaarNumber}
              onChange={(e) => handleInputChange('aadhaarNumber', e.target.value.replace(/\D/g, '').slice(0, 12))}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                errors.aadhaarNumber ? 'border-red-300' : 'border-gray-300'
              } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="123456789012"
              maxLength={12}
            />
            {errors.aadhaarNumber && (
              <p className="mt-1 text-sm text-red-600">{errors.aadhaarNumber}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              12-digit Aadhaar number (numbers only)
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && isDraft ? 'Saving Draft...' : 'Save as Draft'}
            </button>
            
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving}
              className="flex-1 px-4 py-2 bg-[#FF6F61] text-white rounded-lg hover:bg-[#E55A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && !isDraft ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        )}

        {!canEdit && (
          <div className="pt-6 border-t">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                Tax information has been submitted and is under review. You cannot edit it at this time.
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

const BankDetailsForm: React.FC<{
  seller: SellerProfile;
  onSave: (data: any) => Promise<void>;
  canEdit: boolean;
}> = ({ seller, onSave, canEdit }) => {
  const [formData, setFormData] = useState({
    accountHolderName: seller.bankDetails?.accountHolderName || '',
    bankName: seller.bankDetails?.bankName || '',
    accountNumber: seller.bankDetails?.accountNumber || '',
    confirmAccountNumber: seller.bankDetails?.accountNumber || '',
    ifscCode: seller.bankDetails?.ifscCode || '',
    accountType: seller.bankDetails?.accountType || 'savings'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  const [verifyingBank, setVerifyingBank] = useState(false);
  const [bankVerified, setBankVerified] = useState(seller.bankDetails?.verificationStatus === 'verified');

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.accountHolderName.trim()) {
      newErrors.accountHolderName = 'Account holder name is required';
    }

    if (!formData.bankName.trim()) {
      newErrors.bankName = 'Bank name is required';
    }

    if (!formData.accountNumber.trim()) {
      newErrors.accountNumber = 'Account number is required';
    } else if (formData.accountNumber.length < 9 || formData.accountNumber.length > 18) {
      newErrors.accountNumber = 'Account number must be between 9-18 digits';
    }

    if (!formData.confirmAccountNumber.trim()) {
      newErrors.confirmAccountNumber = 'Please confirm account number';
    } else if (formData.accountNumber !== formData.confirmAccountNumber) {
      newErrors.confirmAccountNumber = 'Account numbers do not match';
    }

    if (!formData.ifscCode.trim()) {
      newErrors.ifscCode = 'IFSC code is required';
    } else if (!validation.validateIFSC(formData.ifscCode)) {
      newErrors.ifscCode = 'Please enter a valid IFSC code (e.g., SBIN0001234)';
    }

    if (!formData.accountType) {
      newErrors.accountType = 'Account type is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }

    // Auto-fetch bank name from IFSC
    if (field === 'ifscCode' && value.length === 11 && validation.validateIFSC(value)) {
      fetchBankName(value);
    }
  };

  const fetchBankName = async (ifscCode: string) => {
    try {
      // This would typically call a bank API or IFSC lookup service
      // For now, we'll extract bank code and provide common bank names
      const bankCode = ifscCode.substring(0, 4);
      const bankNames: Record<string, string> = {
        'SBIN': 'State Bank of India',
        'HDFC': 'HDFC Bank',
        'ICIC': 'ICICI Bank',
        'AXIS': 'Axis Bank',
        'PUNB': 'Punjab National Bank',
        'UBIN': 'Union Bank of India',
        'CNRB': 'Canara Bank',
        'BARB': 'Bank of Baroda',
        'IOBA': 'Indian Overseas Bank',
        'BKID': 'Bank of India'
      };

      if (bankNames[bankCode]) {
        setFormData(prev => ({ ...prev, bankName: bankNames[bankCode] }));
      }
    } catch (error) {
      console.error('Error fetching bank name:', error);
    }
  };

  const handleBankVerification = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setVerifyingBank(true);
      
      // Call bank verification API (₹3 cost)
      const response = await fetch('/api/seller/bank/verify', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('accessToken')}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountNumber: formData.accountNumber,
          ifscCode: formData.ifscCode,
          accountHolderName: formData.accountHolderName
        })
      });

      const result = await response.json();
      
      if (result.success && result.verified) {
        setBankVerified(true);
        setErrors({});
      } else {
        setErrors({ 
          accountNumber: result.message || 'Bank account verification failed. Please check your details.' 
        });
      }
    } catch (error) {
      console.error('Bank verification error:', error);
      setErrors({ 
        accountNumber: 'Unable to verify bank account. Please try again.' 
      });
    } finally {
      setVerifyingBank(false);
    }
  };

  const handleSave = async (saveAsDraft = false) => {
    if (!saveAsDraft && !validateForm()) {
      return;
    }

    if (!saveAsDraft && !bankVerified) {
      setErrors({ 
        accountNumber: 'Please verify your bank account before saving.' 
      });
      return;
    }

    try {
      setSaving(true);
      setIsDraft(saveAsDraft);
      await onSave({
        ...formData,
        verificationStatus: bankVerified ? 'verified' : 'pending'
      });
    } catch (error) {
      console.error('Error saving bank details:', error);
    } finally {
      setSaving(false);
      setIsDraft(false);
    }
  };

  const accountTypes = [
    { value: 'savings', label: 'Savings Account' },
    { value: 'current', label: 'Current Account' }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Bank Details</h2>
        <p className="text-sm text-gray-600 mt-1">
          Add your bank account details for receiving payments. We'll verify your account with a small charge (₹3).
        </p>
      </div>

      <form className="space-y-6">
        {/* Account Holder Information */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900">Account Information</h3>
          
          <div>
            <label htmlFor="accountHolderName" className="block text-sm font-medium text-gray-700 mb-2">
              Account Holder Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="accountHolderName"
              value={formData.accountHolderName}
              onChange={(e) => handleInputChange('accountHolderName', e.target.value)}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                errors.accountHolderName ? 'border-red-300' : 'border-gray-300'
              } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="Name as per bank account"
            />
            {errors.accountHolderName && (
              <p className="mt-1 text-sm text-red-600">{errors.accountHolderName}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Must match the name on your bank account exactly
            </p>
          </div>

          <div>
            <label htmlFor="accountType" className="block text-sm font-medium text-gray-700 mb-2">
              Account Type <span className="text-red-500">*</span>
            </label>
            <select
              id="accountType"
              value={formData.accountType}
              onChange={(e) => handleInputChange('accountType', e.target.value)}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                errors.accountType ? 'border-red-300' : 'border-gray-300'
              } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
            >
              {accountTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
            {errors.accountType && (
              <p className="mt-1 text-sm text-red-600">{errors.accountType}</p>
            )}
          </div>
        </div>

        {/* Bank Information */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900">Bank Information</h3>
          
          <div>
            <label htmlFor="ifscCode" className="block text-sm font-medium text-gray-700 mb-2">
              IFSC Code <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="ifscCode"
              value={formData.ifscCode}
              onChange={(e) => handleInputChange('ifscCode', e.target.value.toUpperCase())}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                errors.ifscCode ? 'border-red-300' : 'border-gray-300'
              } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="SBIN0001234"
              maxLength={11}
            />
            {errors.ifscCode && (
              <p className="mt-1 text-sm text-red-600">{errors.ifscCode}</p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              11-character IFSC code (4 letters + 0 + 6 characters)
            </p>
          </div>

          <div>
            <label htmlFor="bankName" className="block text-sm font-medium text-gray-700 mb-2">
              Bank Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              id="bankName"
              value={formData.bankName}
              onChange={(e) => handleInputChange('bankName', e.target.value)}
              disabled={!canEdit}
              className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                errors.bankName ? 'border-red-300' : 'border-gray-300'
              } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
              placeholder="Bank name (auto-filled from IFSC)"
            />
            {errors.bankName && (
              <p className="mt-1 text-sm text-red-600">{errors.bankName}</p>
            )}
          </div>
        </div>

        {/* Account Number */}
        <div className="space-y-4">
          <h3 className="text-md font-medium text-gray-900">Account Number</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="accountNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="accountNumber"
                value={formData.accountNumber}
                onChange={(e) => handleInputChange('accountNumber', e.target.value.replace(/\D/g, ''))}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                  errors.accountNumber ? 'border-red-300' : 'border-gray-300'
                } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                placeholder="Enter account number"
                maxLength={18}
              />
              {errors.accountNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.accountNumber}</p>
              )}
            </div>

            <div>
              <label htmlFor="confirmAccountNumber" className="block text-sm font-medium text-gray-700 mb-2">
                Confirm Account Number <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="confirmAccountNumber"
                value={formData.confirmAccountNumber}
                onChange={(e) => handleInputChange('confirmAccountNumber', e.target.value.replace(/\D/g, ''))}
                disabled={!canEdit}
                className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#FF6F61] focus:border-transparent ${
                  errors.confirmAccountNumber ? 'border-red-300' : 'border-gray-300'
                } ${!canEdit ? 'bg-gray-50 cursor-not-allowed' : ''}`}
                placeholder="Re-enter account number"
                maxLength={18}
              />
              {errors.confirmAccountNumber && (
                <p className="mt-1 text-sm text-red-600">{errors.confirmAccountNumber}</p>
              )}
            </div>
          </div>
        </div>

        {/* Bank Verification */}
        {canEdit && (
          <div className="space-y-4">
            <div className="border-t pt-4">
              <h3 className="text-md font-medium text-gray-900 mb-2">Account Verification</h3>
              
              {!bankVerified ? (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 mr-3" />
                    <div className="flex-1">
                      <p className="text-yellow-800 text-sm">
                        Your bank account needs to be verified before you can receive payments.
                      </p>
                      <p className="text-yellow-700 text-xs mt-1">
                        Verification charge: ₹3 (will be refunded to your account)
                      </p>
                      <button
                        type="button"
                        onClick={handleBankVerification}
                        disabled={verifyingBank || !formData.accountNumber || !formData.ifscCode || !formData.accountHolderName}
                        className="mt-3 px-4 py-2 bg-yellow-600 text-white text-sm rounded-lg hover:bg-yellow-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {verifyingBank ? 'Verifying...' : 'Verify Account (₹3)'}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
                    <div>
                      <p className="text-green-800 text-sm font-medium">
                        Bank account verified successfully!
                      </p>
                      <p className="text-green-700 text-xs mt-1">
                        You can now receive payments to this account.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={() => handleSave(true)}
              disabled={saving}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && isDraft ? 'Saving Draft...' : 'Save as Draft'}
            </button>
            
            <button
              type="button"
              onClick={() => handleSave(false)}
              disabled={saving || !bankVerified}
              className="flex-1 px-4 py-2 bg-[#FF6F61] text-white rounded-lg hover:bg-[#E55A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving && !isDraft ? 'Saving...' : 'Save & Continue'}
            </button>
          </div>
        )}

        {!canEdit && (
          <div className="pt-6 border-t">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-blue-800 text-sm">
                Bank details have been submitted and are under review. You cannot edit them at this time.
              </p>
            </div>
          </div>
        )}
      </form>
    </div>
  );
};

const DocumentsSection: React.FC<{
  seller: SellerProfile;
  onSave: (data: any) => Promise<void>;
  canEdit: boolean;
}> = ({ seller, onSave, canEdit }) => {
  const [documents, setDocuments] = useState<Record<string, File | null>>({});
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [uploadedDocs, setUploadedDocs] = useState<Record<string, any>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  // Initialize uploaded documents from seller data
  useEffect(() => {
    if (seller.documents) {
      const docsMap: Record<string, any> = {};
      seller.documents.forEach(doc => {
        docsMap[doc.type] = doc;
      });
      setUploadedDocs(docsMap);
    }
  }, [seller.documents]);

  const requiredDocuments = [
    {
      type: 'pan_card',
      label: 'PAN Card',
      description: 'Clear photo of PAN card (front side)',
      required: true
    },
    {
      type: 'aadhaar',
      label: 'Aadhaar Card',
      description: 'Clear photos of Aadhaar card (front and back)',
      required: true
    },
    {
      type: 'bank_proof',
      label: 'Bank Account Proof',
      description: 'Cancelled cheque or bank statement (first page)',
      required: true
    },
    {
      type: 'gst_certificate',
      label: 'GST Certificate',
      description: 'GST registration certificate (if applicable)',
      required: false
    },
    {
      type: 'business_certificate',
      label: 'Business Registration',
      description: 'Business registration certificate (if applicable)',
      required: false
    },
    {
      type: 'address_proof',
      label: 'Address Proof',
      description: 'Utility bill, rent agreement, or property documents',
      required: false
    }
  ];

  const validateFile = (file: File): string | null => {
    // Check file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      return 'Only JPG, PNG, and PDF files are allowed';
    }

    // Check file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }

    return null;
  };

  const handleFileSelect = (docType: string, file: File | null) => {
    if (!file) {
      setDocuments(prev => ({ ...prev, [docType]: null }));
      setErrors(prev => ({ ...prev, [docType]: '' }));
      return;
    }

    const error = validateFile(file);
    if (error) {
      setErrors(prev => ({ ...prev, [docType]: error }));
      return;
    }

    setDocuments(prev => ({ ...prev, [docType]: file }));
    setErrors(prev => ({ ...prev, [docType]: '' }));
  };

  const uploadDocument = async (docType: string, file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('type', docType);

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();

      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded / event.total) * 100);
          setUploadProgress(prev => ({ ...prev, [docType]: progress }));
        }
      });

      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          const response = JSON.parse(xhr.responseText);
          resolve(response);
        } else {
          reject(new Error('Upload failed'));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed'));
      });

      xhr.open('POST', '/api/seller/documents/upload');
      xhr.setRequestHeader('Authorization', `Bearer ${localStorage.getItem('accessToken')}`);
      xhr.send(formData);
    });
  };

  const handleUploadAll = async () => {
    const filesToUpload = Object.entries(documents).filter(([_, file]) => file !== null);
    
    if (filesToUpload.length === 0) {
      setErrors({ general: 'Please select at least one document to upload' });
      return;
    }

    try {
      setSaving(true);
      setErrors({});

      const uploadPromises = filesToUpload.map(async ([docType, file]) => {
        if (!file) return null;
        
        try {
          const result = await uploadDocument(docType, file);
          setUploadedDocs(prev => ({ ...prev, [docType]: result.document }));
          return result;
        } catch (error) {
          setErrors(prev => ({ ...prev, [docType]: 'Upload failed. Please try again.' }));
          throw error;
        }
      });

      await Promise.all(uploadPromises);
      
      // Clear selected files after successful upload
      setDocuments({});
      setUploadProgress({});
      
      // Call onSave to update the parent component
      await onSave({ documentsUploaded: true });
      
    } catch (error) {
      console.error('Error uploading documents:', error);
    } finally {
      setSaving(false);
    }
  };

  const getDocumentStatus = (docType: string) => {
    const uploaded = uploadedDocs[docType];
    if (!uploaded) return 'not_uploaded';
    
    switch (uploaded.verificationStatus) {
      case 'verified':
        return 'verified';
      case 'rejected':
        return 'rejected';
      case 'processing':
      case 'pending':
      default:
        return 'pending';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'pending':
        return <Clock className="w-5 h-5 text-yellow-500" />;
      default:
        return <Upload className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'verified':
        return 'Verified';
      case 'rejected':
        return 'Rejected';
      case 'pending':
        return 'Under Review';
      default:
        return 'Not Uploaded';
    }
  };

  const hasRequiredDocuments = () => {
    return requiredDocuments
      .filter(doc => doc.required)
      .every(doc => uploadedDocs[doc.type] || documents[doc.type]);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <div className="mb-6">
        <h2 className="text-lg font-medium text-gray-900">Document Upload</h2>
        <p className="text-sm text-gray-600 mt-1">
          Upload clear, readable documents for verification. All required documents must be uploaded.
        </p>
      </div>

      <div className="space-y-6">
        {/* Upload Guidelines */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">Upload Guidelines</h3>
          <ul className="text-sm text-blue-800 space-y-1">
            <li>• Accepted formats: JPG, PNG, PDF</li>
            <li>• Maximum file size: 5MB per document</li>
            <li>• Ensure documents are clear and readable</li>
            <li>• All text and details should be visible</li>
            <li>• Avoid blurry or cropped images</li>
          </ul>
        </div>

        {/* Document Upload Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {requiredDocuments.map((docInfo) => {
            const status = getDocumentStatus(docInfo.type);
            const hasFile = documents[docInfo.type] !== null;
            const uploadingProgress = uploadProgress[docInfo.type];
            const uploaded = uploadedDocs[docInfo.type];

            return (
              <div key={docInfo.type} className="border rounded-lg p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <h3 className="text-sm font-medium text-gray-900">
                      {docInfo.label}
                      {docInfo.required && <span className="text-red-500 ml-1">*</span>}
                    </h3>
                    <p className="text-xs text-gray-600 mt-1">{docInfo.description}</p>
                  </div>
                  <div className="flex items-center ml-3">
                    {getStatusIcon(status)}
                    <span className="text-xs text-gray-600 ml-1">
                      {getStatusText(status)}
                    </span>
                  </div>
                </div>

                {/* File Upload */}
                {canEdit && status !== 'verified' && (
                  <div className="space-y-3">
                    <input
                      type="file"
                      id={`file-${docInfo.type}`}
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={(e) => handleFileSelect(docInfo.type, e.target.files?.[0] || null)}
                      className="hidden"
                    />
                    
                    <label
                      htmlFor={`file-${docInfo.type}`}
                      className={`block w-full p-3 border-2 border-dashed rounded-lg text-center cursor-pointer transition-colors ${
                        hasFile 
                          ? 'border-green-300 bg-green-50' 
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {hasFile ? (
                        <div className="text-green-700">
                          <Upload className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-sm font-medium">
                            {documents[docInfo.type]?.name}
                          </span>
                          <p className="text-xs mt-1">
                            {fileUtils.formatFileSize(documents[docInfo.type]?.size || 0)}
                          </p>
                        </div>
                      ) : (
                        <div className="text-gray-600">
                          <Upload className="w-5 h-5 mx-auto mb-1" />
                          <span className="text-sm">Click to select file</span>
                        </div>
                      )}
                    </label>

                    {/* Upload Progress */}
                    {uploadingProgress !== undefined && uploadingProgress < 100 && (
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-[#FF6F61] h-2 rounded-full transition-all duration-300"
                          style={{ width: `${uploadingProgress}%` }}
                        />
                      </div>
                    )}

                    {/* Error Message */}
                    {errors[docInfo.type] && (
                      <p className="text-sm text-red-600">{errors[docInfo.type]}</p>
                    )}
                  </div>
                )}

                {/* Uploaded Document Info */}
                {uploaded && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {uploaded.fileName}
                        </p>
                        <p className="text-xs text-gray-600">
                          Uploaded on {new Date(uploaded.uploadedAt).toLocaleDateString()}
                        </p>
                      </div>
                      {uploaded.verificationStatus === 'rejected' && (
                        <button
                          type="button"
                          className="text-xs text-[#FF6F61] hover:text-[#E55A4F]"
                          onClick={() => {/* Handle reupload */}}
                        >
                          Re-upload
                        </button>
                      )}
                    </div>
                    
                    {uploaded.rejectionReason && (
                      <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                        <p className="text-xs text-red-800">
                          <strong>Rejection Reason:</strong> {uploaded.rejectionReason}
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {!canEdit && !uploaded && (
                  <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-600">
                      Document upload is disabled while application is under review.
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* General Error */}
        {errors.general && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-red-800 text-sm">{errors.general}</p>
          </div>
        )}

        {/* Action Buttons */}
        {canEdit && (
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t">
            <button
              type="button"
              onClick={handleUploadAll}
              disabled={saving || Object.keys(documents).length === 0}
              className="flex-1 px-4 py-2 bg-[#FF6F61] text-white rounded-lg hover:bg-[#E55A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Uploading...' : 'Upload Selected Documents'}
            </button>
          </div>
        )}

        {/* Completion Status */}
        <div className="pt-6 border-t">
          <div className={`rounded-lg p-4 ${
            hasRequiredDocuments() 
              ? 'bg-green-50 border border-green-200' 
              : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <div className="flex items-center">
              {hasRequiredDocuments() ? (
                <CheckCircle className="w-5 h-5 text-green-600 mr-3" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-yellow-600 mr-3" />
              )}
              <div>
                <p className={`text-sm font-medium ${
                  hasRequiredDocuments() ? 'text-green-800' : 'text-yellow-800'
                }`}>
                  {hasRequiredDocuments() 
                    ? 'All required documents uploaded' 
                    : 'Required documents pending'
                  }
                </p>
                <p className={`text-xs mt-1 ${
                  hasRequiredDocuments() ? 'text-green-700' : 'text-yellow-700'
                }`}>
                  {hasRequiredDocuments()
                    ? 'You can now submit your application for review'
                    : 'Please upload all required documents to proceed'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const SettingsSection: React.FC<{
  seller: SellerProfile;
}> = ({ seller }) => {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <h2 className="text-lg font-medium text-gray-900 mb-4">Account Settings</h2>
      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Email Verification</h4>
            <p className="text-sm text-gray-600">{seller.email}</p>
          </div>
          <div className="flex items-center">
            {seller.emailVerified ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <button className="text-[#FF6F61] hover:text-[#E55A4F] text-sm font-medium">
                Verify
              </button>
            )}
          </div>
        </div>
        
        <div className="flex items-center justify-between p-4 border rounded-lg">
          <div>
            <h4 className="font-medium text-gray-900">Mobile Verification</h4>
            <p className="text-sm text-gray-600">{seller.mobile}</p>
          </div>
          <div className="flex items-center">
            {seller.mobileVerified ? (
              <CheckCircle className="w-5 h-5 text-green-500" />
            ) : (
              <button className="text-[#FF6F61] hover:text-[#E55A4F] text-sm font-medium">
                Verify
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};