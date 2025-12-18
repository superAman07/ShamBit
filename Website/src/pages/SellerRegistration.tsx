import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  User, 
  Building, 
  MapPin, 
  CreditCard, 
  FileText, 
  CheckCircle,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowLeft,
  ArrowRight,
  Phone,
  Mail,
  Shield,
  Loader2,
  Upload,
  Calendar,
  Hash,
  Plus,
  Trash2,
  Info
} from 'lucide-react';
import { API_ENDPOINTS } from '../config/api';

interface WarehouseAddress {
  id?: string;
  isPrimary: boolean;
  sameAsRegistered: boolean;
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pinCode: string;
  contactPerson?: string;
  contactPhone?: string;
  operatingHours?: string;
  maxDeliveryRadius?: number;
}

interface FormData {
  // Part A: Personal Details
  fullName: string;
  dateOfBirth: string;
  gender: 'male' | 'female' | 'other';
  mobile: string;
  email: string;
  password: string;
  confirmPassword: string;
  
  // Part B: Business Information
  sellerType: 'individual' | 'business';
  businessType?: 'proprietorship' | 'partnership' | 'llp' | 'private_limited' | 'individual_seller';
  businessName?: string;
  natureOfBusiness?: string;
  primaryBusinessActivity?: string;
  yearOfEstablishment?: number;
  businessPhone?: string;
  businessEmail?: string;
  
  // Part C: Address Information
  registeredBusinessAddress: {
    addressLine1: string;
    addressLine2?: string;
    city: string;
    state: string;
    pinCode: string;
  };
  warehouseAddresses: WarehouseAddress[];
  
  // Part D: Tax & Compliance Details
  gstRegistered: boolean;
  gstNumber?: string;
  gstin?: string;
  panNumber: string;
  panHolderName: string;
  tdsApplicable: boolean;
  aadhaarNumber?: string;
  
  // Part E: Bank Account Details
  bankDetails: {
    accountHolderName: string;
    bankName: string;
    accountNumber: string;
    confirmAccountNumber: string;
    ifscCode: string;
    accountType: 'savings' | 'current';
    branchName?: string;
    branchAddress?: string;
  };
  
  // Operational Information
  primaryProductCategories: string;
  estimatedMonthlyOrderVolume: '0-50' | '51-200' | '201-500' | '500+';
  preferredPickupTimeSlots: string;
  maxOrderProcessingTime: number;
  
  // Verification Status
  mobileVerified: boolean;
  mobileOtp?: string;
  
  // Financial Terms & Agreements
  commissionRateAccepted: boolean;
  paymentSettlementTermsAccepted: boolean;
  
  // Legal Declarations & Agreements
  termsAndConditionsAccepted: boolean;
  returnPolicyAccepted: boolean;
  dataComplianceAccepted: boolean;
  privacyPolicyAccepted: boolean;
}

const initialFormData: FormData = {
  // Part A: Personal Details
  fullName: '',
  dateOfBirth: '',
  gender: 'male',
  mobile: '',
  email: '',
  password: '',
  confirmPassword: '',
  
  // Part B: Business Information
  sellerType: 'individual',
  businessType: undefined,
  businessName: '',
  natureOfBusiness: '',
  primaryBusinessActivity: '',
  yearOfEstablishment: undefined,
  businessPhone: '',
  businessEmail: '',
  
  // Part C: Address Information
  registeredBusinessAddress: {
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: ''
  },
  warehouseAddresses: [{
    isPrimary: true,
    sameAsRegistered: true,
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: '',
    pinCode: '',
    contactPerson: '',
    contactPhone: '',
    operatingHours: '9:00 AM - 6:00 PM',
    maxDeliveryRadius: 10
  }],
  
  // Part D: Tax & Compliance Details
  gstRegistered: false,
  gstNumber: '',
  gstin: '',
  panNumber: '',
  panHolderName: '',
  tdsApplicable: false,
  aadhaarNumber: '',
  
  // Part E: Bank Account Details
  bankDetails: {
    accountHolderName: '',
    bankName: '',
    accountNumber: '',
    confirmAccountNumber: '',
    ifscCode: '',
    accountType: 'savings',
    branchName: '',
    branchAddress: ''
  },
  
  // Operational Information
  primaryProductCategories: '',
  estimatedMonthlyOrderVolume: '0-50',
  preferredPickupTimeSlots: '',
  maxOrderProcessingTime: 2,
  
  // Verification Status
  mobileVerified: false,
  mobileOtp: '',
  
  // Financial Terms & Agreements
  commissionRateAccepted: false,
  paymentSettlementTermsAccepted: false,
  
  // Legal Declarations & Agreements
  termsAndConditionsAccepted: false,
  returnPolicyAccepted: false,
  dataComplianceAccepted: false,
  privacyPolicyAccepted: false
};

const steps = [
  { id: 1, title: 'Personal Details', icon: User, description: 'Basic information and account setup' },
  { id: 2, title: 'Business Info', icon: Building, description: 'Business details and type' },
  { id: 3, title: 'Address & Warehouses', icon: MapPin, description: 'Business and warehouse addresses' },
  { id: 4, title: 'Tax & Compliance', icon: Hash, description: 'GST, PAN and tax information' },
  { id: 5, title: 'Bank Details', icon: CreditCard, description: 'Payment and settlement details' },
  { id: 6, title: 'Mobile Verification', icon: Phone, description: 'Mobile number verification' },
  { id: 7, title: 'Documents', icon: FileText, description: 'Upload required documents' },
  { id: 8, title: 'Terms & Agreements', icon: Shield, description: 'Legal agreements and policies' }
];

const SellerRegistration: React.FC = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [sellerId, setSellerId] = useState<string>('');
  const [otpSending, setOtpSending] = useState(false);

  // Fix body padding and overflow for this page
  React.useEffect(() => {
    // Store original styles
    const originalBodyPadding = document.body.style.paddingTop;
    const originalBodyMargin = document.body.style.marginTop;
    const originalBodyOverflow = document.body.style.overflow;
    
    // Apply fixes
    document.body.style.paddingTop = '0px';
    document.body.style.marginTop = '0px';
    document.body.style.overflow = 'hidden';
    
    return () => {
      // Restore original styles
      document.body.style.paddingTop = originalBodyPadding || '120px';
      document.body.style.marginTop = originalBodyMargin || '';
      document.body.style.overflow = originalBodyOverflow || '';
    };
  }, []);

  const updateFormData = (field: string, value: any) => {
    // Apply formatters based on field type
    let formattedValue = value;
    
    if (field === 'panNumber') formattedValue = formatters.pan(value);
    else if (field === 'mobile' || field === 'businessPhone') formattedValue = formatters.mobile(value);
    else if (field === 'aadhaarNumber') formattedValue = formatters.aadhaar(value);
    else if (field === 'gstNumber' || field === 'gstin') formattedValue = formatters.gst(value);
    else if (field === 'email' || field === 'businessEmail') formattedValue = formatters.email(value);
    else if (field === 'fullName' || field === 'panHolderName') formattedValue = formatters.name(value);
    
    setFormData(prev => ({
      ...prev,
      [field]: formattedValue
    }));
    
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const updateNestedFormData = (parent: string, field: string, value: any) => {
    // Apply formatters for nested fields
    let formattedValue = value;
    
    if (parent === 'bankDetails') {
      if (field === 'accountNumber' || field === 'confirmAccountNumber') {
        formattedValue = formatters.accountNumber(value);
      } else if (field === 'ifscCode') {
        formattedValue = formatters.ifsc(value);
      } else if (field === 'accountHolderName') {
        formattedValue = formatters.name(value);
      }
    } else if (parent === 'registeredBusinessAddress') {
      if (field === 'pinCode') {
        formattedValue = formatters.pinCode(value);
      } else if (field === 'city' || field === 'state') {
        formattedValue = formatters.name(value);
      }
    }
    
    setFormData(prev => ({
      ...prev,
      [parent]: {
        ...prev[parent as keyof FormData] as any,
        [field]: formattedValue
      }
    }));
  };

  // Validation regex patterns
  const validationPatterns = {
    // Name: Only letters, spaces, dots, hyphens (Indian names)
    name: /^[a-zA-Z\s\.\-]{2,50}$/,
    // Mobile: Indian format starting with 6-9
    mobile: /^[6-9]\d{9}$/,
    // Email: Standard email format
    email: /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/,
    // PAN: 5 letters, 4 digits, 1 letter (ABCDE1234F)
    pan: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/,
    // Aadhaar: 12 digits
    aadhaar: /^\d{12}$/,
    // GST: 15 characters (2 digits + 10 PAN + 1 digit + 1 letter + 1 digit/letter)
    gst: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
    // IFSC: 4 letters + 0 + 6 alphanumeric
    ifsc: /^[A-Z]{4}0[A-Z0-9]{6}$/,
    // Account Number: 9-18 digits
    accountNumber: /^\d{9,18}$/,
    // Password: At least 8 chars, 1 uppercase, 1 lowercase, 1 digit, 1 special char
    password: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    // PIN Code: 6 digits
    pinCode: /^\d{6}$/
  };

  // Age validation function
  const calculateAge = (dateOfBirth: string): number => {
    const today = new Date();
    const birthDate = new Date(dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    return age;
  };

  // Input formatters for real-time validation
  const formatters = {
    // Format PAN: Convert to uppercase, allow only alphanumeric
    pan: (value: string) => value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 10),
    
    // Format mobile: Allow only digits, limit to 10
    mobile: (value: string) => value.replace(/\D/g, '').slice(0, 10),
    
    // Format Aadhaar: Allow only digits, limit to 12
    aadhaar: (value: string) => value.replace(/\D/g, '').slice(0, 12),
    
    // Format GST: Convert to uppercase, allow only alphanumeric
    gst: (value: string) => value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 15),
    
    // Format IFSC: Convert to uppercase, allow only alphanumeric
    ifsc: (value: string) => value.replace(/[^A-Za-z0-9]/g, '').toUpperCase().slice(0, 11),
    
    // Format account number: Allow only digits
    accountNumber: (value: string) => value.replace(/\D/g, '').slice(0, 18),
    
    // Format PIN code: Allow only digits, limit to 6
    pinCode: (value: string) => value.replace(/\D/g, '').slice(0, 6),
    
    // Format name: Allow only letters, spaces, dots, hyphens
    name: (value: string) => value.replace(/[^a-zA-Z\s\.\-]/g, '').slice(0, 50),
    
    // Format email: Convert to lowercase, remove spaces
    email: (value: string) => value.toLowerCase().replace(/\s/g, '').slice(0, 100)
  };

  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    if (step === 1) {
      // Personal Details validation
      if (!formData.fullName.trim()) {
        newErrors.fullName = 'Full name is required';
      } else if (!validationPatterns.name.test(formData.fullName.trim())) {
        newErrors.fullName = 'Name can only contain letters, spaces, dots and hyphens (2-50 characters)';
      }

      if (!formData.dateOfBirth) {
        newErrors.dateOfBirth = 'Date of birth is required';
      } else {
        const age = calculateAge(formData.dateOfBirth);
        if (age < 14) {
          newErrors.dateOfBirth = 'You must be at least 14 years old to register as a seller';
        } else if (age > 100) {
          newErrors.dateOfBirth = 'Please enter a valid date of birth';
        }
      }

      if (!formData.mobile.trim()) {
        newErrors.mobile = 'Mobile number is required';
      } else if (!validationPatterns.mobile.test(formData.mobile.trim())) {
        newErrors.mobile = 'Enter a valid 10-digit Indian mobile number (starting with 6-9)';
      }

      if (!formData.email.trim()) {
        newErrors.email = 'Email address is required';
      } else if (!validationPatterns.email.test(formData.email.trim())) {
        newErrors.email = 'Enter a valid email address (e.g., user@example.com)';
      }

      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (!validationPatterns.password.test(formData.password)) {
        newErrors.password = 'Password must be 8+ characters with uppercase, lowercase, digit & special character';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    if (step === 2) {
      // Business Information validation
      if (formData.sellerType === 'business') {
        if (!formData.businessName?.trim()) {
          newErrors.businessName = 'Business name is required';
        } else if (formData.businessName.trim().length < 2 || formData.businessName.trim().length > 100) {
          newErrors.businessName = 'Business name must be 2-100 characters long';
        } else if (!/^[a-zA-Z0-9\s\.\-&()]+$/.test(formData.businessName.trim())) {
          newErrors.businessName = 'Business name can only contain letters, numbers, spaces and basic punctuation';
        }

        if (!formData.businessType) {
          newErrors.businessType = 'Business type is required';
        }

        if (!formData.natureOfBusiness?.trim()) {
          newErrors.natureOfBusiness = 'Nature of business is required';
        } else if (formData.natureOfBusiness.trim().length < 10) {
          newErrors.natureOfBusiness = 'Nature of business must be at least 10 characters';
        } else if (formData.natureOfBusiness.trim().length > 500) {
          newErrors.natureOfBusiness = 'Nature of business cannot exceed 500 characters';
        }

        if (formData.businessPhone && !validationPatterns.mobile.test(formData.businessPhone.trim())) {
          newErrors.businessPhone = 'Enter a valid 10-digit business phone number';
        }

        if (formData.businessEmail && !validationPatterns.email.test(formData.businessEmail.trim())) {
          newErrors.businessEmail = 'Enter a valid business email address';
        }

        if (formData.yearOfEstablishment) {
          const currentYear = new Date().getFullYear();
          if (formData.yearOfEstablishment < 1800 || formData.yearOfEstablishment > currentYear) {
            newErrors.yearOfEstablishment = `Year of establishment must be between 1800 and ${currentYear}`;
          }
        }
      }

      if (!formData.primaryProductCategories.trim()) {
        newErrors.primaryProductCategories = 'Primary product categories are required';
      } else if (formData.primaryProductCategories.trim().length < 10) {
        newErrors.primaryProductCategories = 'Primary product categories must be at least 10 characters';
      } else if (formData.primaryProductCategories.trim().length > 500) {
        newErrors.primaryProductCategories = 'Primary product categories cannot exceed 500 characters';
      }
    }

    if (step === 3) {
      // Address validation
      if (!formData.registeredBusinessAddress.addressLine1.trim()) {
        newErrors['registeredBusinessAddress.addressLine1'] = 'Address line 1 is required';
      } else if (formData.registeredBusinessAddress.addressLine1.trim().length < 5) {
        newErrors['registeredBusinessAddress.addressLine1'] = 'Address must be at least 5 characters';
      } else if (formData.registeredBusinessAddress.addressLine1.trim().length > 100) {
        newErrors['registeredBusinessAddress.addressLine1'] = 'Address cannot exceed 100 characters';
      }

      if (!formData.registeredBusinessAddress.city.trim()) {
        newErrors['registeredBusinessAddress.city'] = 'City is required';
      } else if (!/^[a-zA-Z\s\.\-]{2,50}$/.test(formData.registeredBusinessAddress.city.trim())) {
        newErrors['registeredBusinessAddress.city'] = 'City name can only contain letters, spaces, dots and hyphens';
      }

      if (!formData.registeredBusinessAddress.state.trim()) {
        newErrors['registeredBusinessAddress.state'] = 'State is required';
      } else if (!/^[a-zA-Z\s\.\-]{2,50}$/.test(formData.registeredBusinessAddress.state.trim())) {
        newErrors['registeredBusinessAddress.state'] = 'State name can only contain letters, spaces, dots and hyphens';
      }

      if (!formData.registeredBusinessAddress.pinCode.trim()) {
        newErrors['registeredBusinessAddress.pinCode'] = 'PIN code is required';
      } else if (!validationPatterns.pinCode.test(formData.registeredBusinessAddress.pinCode.trim())) {
        newErrors['registeredBusinessAddress.pinCode'] = 'Enter a valid 6-digit PIN code';
      }

      // Validate warehouse addresses
      formData.warehouseAddresses.forEach((warehouse, index) => {
        if (!warehouse.sameAsRegistered) {
          if (!warehouse.addressLine1.trim()) {
            newErrors[`warehouse.${index}.addressLine1`] = `Warehouse ${index + 1} address is required`;
          }
          if (!warehouse.city.trim()) {
            newErrors[`warehouse.${index}.city`] = `Warehouse ${index + 1} city is required`;
          } else if (!/^[a-zA-Z\s\.\-]{2,50}$/.test(warehouse.city.trim())) {
            newErrors[`warehouse.${index}.city`] = `Warehouse ${index + 1} city name is invalid`;
          }
          if (!warehouse.state.trim()) {
            newErrors[`warehouse.${index}.state`] = `Warehouse ${index + 1} state is required`;
          } else if (!/^[a-zA-Z\s\.\-]{2,50}$/.test(warehouse.state.trim())) {
            newErrors[`warehouse.${index}.state`] = `Warehouse ${index + 1} state name is invalid`;
          }
          if (!warehouse.pinCode.trim()) {
            newErrors[`warehouse.${index}.pinCode`] = `Warehouse ${index + 1} PIN code is required`;
          } else if (!validationPatterns.pinCode.test(warehouse.pinCode.trim())) {
            newErrors[`warehouse.${index}.pinCode`] = `Warehouse ${index + 1} PIN code is invalid`;
          }
        }
        
        if (warehouse.contactPhone && !validationPatterns.mobile.test(warehouse.contactPhone.trim())) {
          newErrors[`warehouse.${index}.contactPhone`] = `Warehouse ${index + 1} contact phone is invalid`;
        }
      });
    }

    if (step === 4) {
      // Tax & Compliance validation
      if (!formData.panNumber.trim()) {
        newErrors.panNumber = 'PAN number is required';
      } else if (!validationPatterns.pan.test(formData.panNumber.trim().toUpperCase())) {
        newErrors.panNumber = 'Invalid PAN format. Must be 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)';
      }

      if (!formData.panHolderName.trim()) {
        newErrors.panHolderName = 'PAN holder name is required';
      } else if (!validationPatterns.name.test(formData.panHolderName.trim())) {
        newErrors.panHolderName = 'PAN holder name can only contain letters, spaces, dots and hyphens';
      }

      if (formData.aadhaarNumber && formData.aadhaarNumber.trim()) {
        if (!validationPatterns.aadhaar.test(formData.aadhaarNumber.trim())) {
          newErrors.aadhaarNumber = 'Aadhaar number must be exactly 12 digits';
        }
      }
      
      if (formData.gstRegistered) {
        if (!formData.gstNumber?.trim() && !formData.gstin?.trim()) {
          newErrors.gstNumber = 'GST Number is required when GST registered';
        } else if (formData.gstNumber && !validationPatterns.gst.test(formData.gstNumber.trim().toUpperCase())) {
          newErrors.gstNumber = 'Invalid GST Number format (15 characters: 2 digits + PAN + check digits)';
        }

        // Validate that GST contains the PAN number
        if (formData.gstNumber && formData.panNumber) {
          const panInGst = formData.gstNumber.substring(2, 12).toUpperCase();
          if (panInGst !== formData.panNumber.toUpperCase()) {
            newErrors.gstNumber = 'GST Number must contain your PAN number (characters 3-12)';
          }
        }
      }
    }

    if (step === 5) {
      // Bank Details validation
      if (!formData.bankDetails.accountHolderName.trim()) {
        newErrors['bankDetails.accountHolderName'] = 'Account holder name is required';
      } else if (!validationPatterns.name.test(formData.bankDetails.accountHolderName.trim())) {
        newErrors['bankDetails.accountHolderName'] = 'Account holder name can only contain letters, spaces, dots and hyphens';
      }

      if (!formData.bankDetails.bankName.trim()) {
        newErrors['bankDetails.bankName'] = 'Bank name is required';
      } else if (formData.bankDetails.bankName.trim().length < 2 || formData.bankDetails.bankName.trim().length > 100) {
        newErrors['bankDetails.bankName'] = 'Bank name must be 2-100 characters long';
      }

      if (!formData.bankDetails.accountNumber.trim()) {
        newErrors['bankDetails.accountNumber'] = 'Account number is required';
      } else if (!validationPatterns.accountNumber.test(formData.bankDetails.accountNumber.trim())) {
        newErrors['bankDetails.accountNumber'] = 'Account number must be 9-18 digits';
      }

      if (!formData.bankDetails.confirmAccountNumber.trim()) {
        newErrors['bankDetails.confirmAccountNumber'] = 'Please confirm your account number';
      } else if (formData.bankDetails.accountNumber !== formData.bankDetails.confirmAccountNumber) {
        newErrors['bankDetails.confirmAccountNumber'] = 'Account numbers do not match';
      }

      if (!formData.bankDetails.ifscCode.trim()) {
        newErrors['bankDetails.ifscCode'] = 'IFSC code is required';
      } else if (!validationPatterns.ifsc.test(formData.bankDetails.ifscCode.trim().toUpperCase())) {
        newErrors['bankDetails.ifscCode'] = 'Invalid IFSC code format (e.g., SBIN0001234)';
      }

      if (formData.bankDetails.branchName && formData.bankDetails.branchName.trim().length > 100) {
        newErrors['bankDetails.branchName'] = 'Branch name cannot exceed 100 characters';
      }
    }

    if (step === 8) {
      // Terms validation
      if (!formData.termsAndConditionsAccepted) {
        newErrors.termsAndConditionsAccepted = 'You must accept the terms and conditions';
      }
      if (!formData.returnPolicyAccepted) {
        newErrors.returnPolicyAccepted = 'You must accept the return policy';
      }
      if (!formData.dataComplianceAccepted) {
        newErrors.dataComplianceAccepted = 'You must accept the data compliance policy';
      }
      if (!formData.privacyPolicyAccepted) {
        newErrors.privacyPolicyAccepted = 'You must accept the privacy policy';
      }
      if (!formData.commissionRateAccepted) {
        newErrors.commissionRateAccepted = 'You must accept the commission rate terms';
      }
      if (!formData.paymentSettlementTermsAccepted) {
        newErrors.paymentSettlementTermsAccepted = 'You must accept the payment settlement terms';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length));
      // Scroll to top of form
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    // Scroll to top of form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const sendMobileOtp = async () => {
    if (!formData.mobile || !/^[6-9]\d{9}$/.test(formData.mobile)) {
      setErrors({ mobile: 'Valid mobile number is required' });
      return;
    }

    setOtpSending(true);
    try {
      const response = await fetch(API_ENDPOINTS.SELLERS.VERIFY_MOBILE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: formData.mobile }),
      });

      if (response.ok) {
        alert('OTP sent to your mobile number');
      } else {
        const result = await response.json();
        setErrors({ mobile: result.message || 'Failed to send OTP' });
      }
    } catch (error) {
      setErrors({ mobile: 'Network error. Please try again.' });
    } finally {
      setOtpSending(false);
    }
  };

  const verifyMobileOtp = async () => {
    if (!formData.mobileOtp || formData.mobileOtp.length !== 6) {
      setErrors({ mobileOtp: 'Valid 6-digit OTP is required' });
      return;
    }

    try {
      const response = await fetch(API_ENDPOINTS.SELLERS.VERIFY_MOBILE_OTP, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mobile: formData.mobile, otp: formData.mobileOtp }),
      });

      if (response.ok) {
        updateFormData('mobileVerified', true);
        alert('Mobile number verified successfully!');
      } else {
        const result = await response.json();
        setErrors({ mobileOtp: result.message || 'Invalid OTP' });
      }
    } catch (error) {
      setErrors({ mobileOtp: 'Network error. Please try again.' });
    }
  };



  const addWarehouse = () => {
    const newWarehouse: WarehouseAddress = {
      isPrimary: false,
      sameAsRegistered: false,
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pinCode: '',
      contactPerson: '',
      contactPhone: '',
      operatingHours: '9:00 AM - 6:00 PM',
      maxDeliveryRadius: 10
    };
    
    updateFormData('warehouseAddresses', [...formData.warehouseAddresses, newWarehouse]);
  };

  const removeWarehouse = (index: number) => {
    if (formData.warehouseAddresses.length > 1) {
      const updated = formData.warehouseAddresses.filter((_, i) => i !== index);
      updateFormData('warehouseAddresses', updated);
    }
  };

  const updateWarehouse = (index: number, field: string, value: any) => {
    // Apply formatters for warehouse fields
    let formattedValue = value;
    
    if (field === 'pinCode') {
      formattedValue = formatters.pinCode(value);
    } else if (field === 'city' || field === 'state' || field === 'contactPerson') {
      formattedValue = formatters.name(value);
    } else if (field === 'contactPhone') {
      formattedValue = formatters.mobile(value);
    }
    
    const updated = [...formData.warehouseAddresses];
    updated[index] = { ...updated[index], [field]: formattedValue };
    updateFormData('warehouseAddresses', updated);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    // Check if mobile is verified
    if (!formData.mobileVerified) {
      setErrors({ 
        verification: 'Please verify your mobile number before submitting registration' 
      });
      return;
    }

    setIsSubmitting(true);
    try {
      // Prepare the data according to the API schema
      const registrationData = {
        // Part A: Personal Details
        fullName: formData.fullName,
        dateOfBirth: formData.dateOfBirth,
        gender: formData.gender,
        mobile: formData.mobile,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        
        // Part B: Business Information
        sellerType: formData.sellerType,
        businessType: formData.businessType,
        businessName: formData.businessName,
        natureOfBusiness: formData.natureOfBusiness,
        primaryBusinessActivity: formData.primaryBusinessActivity,
        yearOfEstablishment: formData.yearOfEstablishment,
        businessPhone: formData.businessPhone,
        businessEmail: formData.businessEmail,
        
        // Part C: Address Information
        registeredBusinessAddress: formData.registeredBusinessAddress,
        warehouseAddresses: formData.warehouseAddresses,
        
        // Part D: Tax & Compliance Details
        gstRegistered: formData.gstRegistered,
        gstNumber: formData.gstNumber,
        gstin: formData.gstin,
        panNumber: formData.panNumber,
        panHolderName: formData.panHolderName,
        tdsApplicable: formData.tdsApplicable,
        aadhaarNumber: formData.aadhaarNumber,
        
        // Part E: Bank Account Details
        bankDetails: formData.bankDetails,
        
        // Operational Information
        primaryProductCategories: formData.primaryProductCategories,
        estimatedMonthlyOrderVolume: formData.estimatedMonthlyOrderVolume,
        preferredPickupTimeSlots: formData.preferredPickupTimeSlots,
        maxOrderProcessingTime: formData.maxOrderProcessingTime,
        
        // Verification Status
        mobileVerified: formData.mobileVerified,
        
        // Financial Terms & Agreements
        commissionRateAccepted: formData.commissionRateAccepted,
        paymentSettlementTermsAccepted: formData.paymentSettlementTermsAccepted,
        
        // Legal Declarations & Agreements
        termsAndConditionsAccepted: formData.termsAndConditionsAccepted,
        returnPolicyAccepted: formData.returnPolicyAccepted,
        dataComplianceAccepted: formData.dataComplianceAccepted,
        privacyPolicyAccepted: formData.privacyPolicyAccepted
      };

      const response = await fetch(API_ENDPOINTS.SELLERS.REGISTER, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      const result = await response.json();

      if (response.ok) {
        setSellerId(result.data?.sellerId || '');
        setSubmitSuccess(true);
      } else {
        setErrors({ submit: result.message || 'Registration failed' });
      }
    } catch (error) {
      setErrors({ submit: 'Network error. Please try again.' });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitSuccess) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-white rounded-2xl shadow-xl p-8 max-w-2xl w-full text-center"
        >
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Successful!</h2>
          <p className="text-gray-600 mb-6">
            Your comprehensive seller registration has been submitted successfully. Here's what happens next:
          </p>
          
          <div className="text-left mb-6 space-y-3">
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-blue-600 text-sm font-medium">1</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Document Upload</p>
                <p className="text-sm text-gray-600">Upload required documents from your seller dashboard</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-blue-600 text-sm font-medium">2</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Verification Process</p>
                <p className="text-sm text-gray-600">Our team will verify your information and documents</p>
              </div>
            </div>
            
            <div className="flex items-start">
              <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center mr-3 mt-0.5">
                <span className="text-blue-600 text-sm font-medium">3</span>
              </div>
              <div>
                <p className="font-medium text-gray-900">Approval & Credentials</p>
                <p className="text-sm text-gray-600">Receive login credentials within 24-48 hours if approved</p>
              </div>
            </div>
          </div>

          {sellerId && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
              <p className="text-blue-800 text-sm">
                <strong>Registration ID:</strong> {sellerId}
              </p>
              <p className="text-blue-700 text-xs mt-1">
                Please save this ID for future reference
              </p>
            </div>
          )}
          
          <div className="space-y-3">
            <button
              onClick={() => window.location.href = '/seller/login'}
              className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Go to Seller Login
            </button>
            <button
              onClick={() => window.location.href = '/'}
              className="w-full bg-gray-200 text-gray-700 py-3 px-4 rounded-lg hover:bg-gray-300 transition-colors"
            >
              Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div 
      className="fixed inset-0 bg-gradient-to-br from-blue-50 to-indigo-100 overflow-y-auto"
      style={{ 
        backgroundColor: '#f8fafc',
        top: '0',
        left: '0',
        right: '0',
        bottom: '0',
        zIndex: 1000
      }}
    >
      {/* Header Section */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-2">
              Become a{' '}
              <span 
                className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-400 bg-clip-text text-transparent"
                style={{ 
                  backgroundSize: '300% 300%',
                  filter: 'drop-shadow(0 0 10px rgba(255, 140, 0, 0.3))'
                }}
              >
                Sham
              </span>
              <span 
                className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent"
                style={{ 
                  backgroundSize: '300% 300%',
                  filter: 'drop-shadow(0 0 10px rgba(30, 64, 175, 0.3))'
                }}
              >
                Bit
              </span>
              {' '}Seller
            </h1>
            <p className="text-gray-600 text-lg">Join thousands of sellers and grow your business</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8 px-4">
        <div className="max-w-6xl mx-auto">
          {/* Progress Steps */}
          <div className="mb-8">
            {/* Desktop Progress Bar */}
            <div className="hidden md:block">
              <div className="flex items-center justify-between mb-6">
                {steps.map((step, index) => (
                  <div key={step.id} className="flex items-center flex-1">
                    <div className="flex flex-col items-center">
                      <div className={`flex items-center justify-center w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                        currentStep >= step.id 
                          ? 'bg-blue-600 border-blue-600 text-white shadow-lg' 
                          : 'bg-white border-gray-300 text-gray-400'
                      }`}>
                        {currentStep > step.id ? (
                          <CheckCircle className="w-6 h-6" />
                        ) : (
                          <step.icon className="w-6 h-6" />
                        )}
                      </div>
                      <div className="mt-2 text-center">
                        <p className={`text-sm font-medium ${
                          currentStep >= step.id ? 'text-blue-600' : 'text-gray-500'
                        }`}>
                          {step.title}
                        </p>
                      </div>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`flex-1 h-1 mx-4 transition-all duration-300 ${
                        currentStep > step.id ? 'bg-blue-600' : 'bg-gray-300'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Mobile Progress Indicator */}
            <div className="md:hidden mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                    'bg-blue-600 text-white'
                  }`}>
                    {React.createElement(steps[currentStep - 1]?.icon, { className: "w-4 h-4" })}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      Step {currentStep} of {steps.length}
                    </p>
                    <p className="text-xs text-gray-500">
                      {steps[currentStep - 1]?.title}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="w-24 bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${(currentStep / steps.length) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
            
            {/* Current Step Info */}
            <div className="text-center bg-white rounded-lg p-4 shadow-sm border-l-4 border-blue-600">
              <h3 className="text-xl font-semibold text-gray-900 mb-1">
                {steps[currentStep - 1]?.title}
              </h3>
              <p className="text-gray-600 mb-2">
                {steps[currentStep - 1]?.description}
              </p>
              <div className="flex items-center justify-center space-x-2 text-sm text-gray-500">
                <span>Step {currentStep} of {steps.length}</span>
                <span>•</span>
                <span>{Math.round((currentStep / steps.length) * 100)}% Complete</span>
              </div>
            </div>
          </div>

          {/* Form Container */}
          <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
            <div className="p-6 md:p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="min-h-[500px]"
                >
                  {/* Step 1: Personal Details */}
                  {currentStep === 1 && (
                    <div className="space-y-8">
                      <div className="border-b border-gray-200 pb-4">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Personal Details</h2>
                        <p className="text-gray-600">Provide your personal information as per official documents</p>
                      </div>
                      
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Full Name (as per Aadhaar) *</label>
                      <input
                        type="text"
                        value={formData.fullName}
                        onChange={(e) => updateFormData('fullName', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.fullName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter your full name"
                      />
                      {errors.fullName && <p className="text-red-500 text-sm mt-1">{errors.fullName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Date of Birth *</label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                          type="date"
                          value={formData.dateOfBirth}
                          onChange={(e) => updateFormData('dateOfBirth', e.target.value)}
                          className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.dateOfBirth ? 'border-red-500' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      {errors.dateOfBirth && <p className="text-red-500 text-sm mt-1">{errors.dateOfBirth}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Gender *</label>
                      <select
                        value={formData.gender}
                        onChange={(e) => updateFormData('gender', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="other">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Seller Type *</label>
                      <select
                        value={formData.sellerType}
                        onChange={(e) => updateFormData('sellerType', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="individual">Individual</option>
                        <option value="business">Business/Company</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                          type="tel"
                          value={formData.mobile}
                          onChange={(e) => updateFormData('mobile', e.target.value)}
                          className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.mobile ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="10-digit mobile number"
                        />
                      </div>
                      {errors.mobile && <p className="text-red-500 text-sm mt-1">{errors.mobile}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email Address *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
                        <input
                          type="email"
                          value={formData.email}
                          onChange={(e) => updateFormData('email', e.target.value)}
                          className={`w-full pl-12 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.email ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Enter your email"
                        />
                      </div>
                      {errors.email && <p className="text-red-500 text-sm mt-1">{errors.email}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Password *</label>
                      <div className="relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={formData.password}
                          onChange={(e) => updateFormData('password', e.target.value)}
                          className={`w-full px-4 py-3 pr-12 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors.password ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Create a password"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">Must contain uppercase, lowercase, and number</p>
                      {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Password *</label>
                      <input
                        type="password"
                        value={formData.confirmPassword}
                        onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Confirm your password"
                      />
                      {errors.confirmPassword && <p className="text-red-500 text-sm mt-1">{errors.confirmPassword}</p>}
                    </div>
                  </div>
                </div>
              )}

                  {/* Step 2: Business Information */}
                  {currentStep === 2 && (
                    <div className="space-y-8">
                      <div className="border-b border-gray-200 pb-4">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Business Information</h2>
                        <p className="text-gray-600">Tell us about your business and products</p>
                      </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {formData.sellerType === 'business' && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Business Type *</label>
                          <select
                            value={formData.businessType || ''}
                            onChange={(e) => updateFormData('businessType', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors.businessType ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">Select business type</option>
                            <option value="proprietorship">Proprietorship</option>
                            <option value="partnership">Partnership</option>
                            <option value="llp">LLP</option>
                            <option value="private_limited">Private Limited</option>
                          </select>
                          {errors.businessType && <p className="text-red-500 text-sm mt-1">{errors.businessType}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Business Name *</label>
                          <input
                            type="text"
                            value={formData.businessName || ''}
                            onChange={(e) => updateFormData('businessName', e.target.value)}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors.businessName ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Enter business name"
                          />
                          {errors.businessName && <p className="text-red-500 text-sm mt-1">{errors.businessName}</p>}
                        </div>

                        <div className="md:col-span-2">
                          <label className="block text-sm font-medium text-gray-700 mb-2">Nature of Business *</label>
                          <textarea
                            value={formData.natureOfBusiness || ''}
                            onChange={(e) => updateFormData('natureOfBusiness', e.target.value)}
                            rows={3}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors.natureOfBusiness ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="Describe your business nature (minimum 10 characters)"
                          />
                          {errors.natureOfBusiness && <p className="text-red-500 text-sm mt-1">{errors.natureOfBusiness}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Primary Business Activity</label>
                          <input
                            type="text"
                            value={formData.primaryBusinessActivity || ''}
                            onChange={(e) => updateFormData('primaryBusinessActivity', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Main business activity"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Year of Establishment</label>
                          <input
                            type="number"
                            min="1900"
                            max={new Date().getFullYear()}
                            value={formData.yearOfEstablishment || ''}
                            onChange={(e) => updateFormData('yearOfEstablishment', parseInt(e.target.value))}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="YYYY"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Business Phone</label>
                          <input
                            type="tel"
                            value={formData.businessPhone || ''}
                            onChange={(e) => updateFormData('businessPhone', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Business phone number"
                          />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">Business Email</label>
                          <input
                            type="email"
                            value={formData.businessEmail || ''}
                            onChange={(e) => updateFormData('businessEmail', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="Business email address"
                          />
                        </div>
                      </>
                    )}

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Primary Product Categories *</label>
                      <textarea
                        value={formData.primaryProductCategories}
                        onChange={(e) => updateFormData('primaryProductCategories', e.target.value)}
                        rows={3}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.primaryProductCategories ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Describe your primary product categories (minimum 10 characters)"
                      />
                      {errors.primaryProductCategories && <p className="text-red-500 text-sm mt-1">{errors.primaryProductCategories}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Estimated Monthly Order Volume *</label>
                      <select
                        value={formData.estimatedMonthlyOrderVolume}
                        onChange={(e) => updateFormData('estimatedMonthlyOrderVolume', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="0-50">0-50 orders</option>
                        <option value="51-200">51-200 orders</option>
                        <option value="201-500">201-500 orders</option>
                        <option value="500+">500+ orders</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Max Order Processing Time (days) *</label>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        value={formData.maxOrderProcessingTime}
                        onChange={(e) => updateFormData('maxOrderProcessingTime', parseInt(e.target.value))}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Maximum days to process orders"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Preferred Pickup Time Slots *</label>
                      <input
                        type="text"
                        value={formData.preferredPickupTimeSlots}
                        onChange={(e) => updateFormData('preferredPickupTimeSlots', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="e.g., 9:00 AM - 6:00 PM, Monday to Saturday"
                      />
                    </div>
                  </div>
                </div>
              )}

                  {/* Step 3: Address & Warehouses */}
                  {currentStep === 3 && (
                    <div className="space-y-8">
                      <div className="border-b border-gray-200 pb-4">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Address & Warehouses</h2>
                        <p className="text-gray-600">Provide your business address and warehouse/pickup locations</p>
                      </div>

                  {/* Registered Business Address */}
                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">Registered Business Address</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
                        <input
                          type="text"
                          value={formData.registeredBusinessAddress.addressLine1}
                          onChange={(e) => updateNestedFormData('registeredBusinessAddress', 'addressLine1', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors['registeredBusinessAddress.addressLine1'] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="Building, street, area"
                        />
                        {errors['registeredBusinessAddress.addressLine1'] && (
                          <p className="text-red-500 text-sm mt-1">{errors['registeredBusinessAddress.addressLine1']}</p>
                        )}
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 2</label>
                        <input
                          type="text"
                          value={formData.registeredBusinessAddress.addressLine2 || ''}
                          onChange={(e) => updateNestedFormData('registeredBusinessAddress', 'addressLine2', e.target.value)}
                          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                          placeholder="Landmark, nearby area (optional)"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                        <input
                          type="text"
                          value={formData.registeredBusinessAddress.city}
                          onChange={(e) => updateNestedFormData('registeredBusinessAddress', 'city', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors['registeredBusinessAddress.city'] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="City"
                        />
                        {errors['registeredBusinessAddress.city'] && (
                          <p className="text-red-500 text-sm mt-1">{errors['registeredBusinessAddress.city']}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                        <input
                          type="text"
                          value={formData.registeredBusinessAddress.state}
                          onChange={(e) => updateNestedFormData('registeredBusinessAddress', 'state', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors['registeredBusinessAddress.state'] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="State"
                        />
                        {errors['registeredBusinessAddress.state'] && (
                          <p className="text-red-500 text-sm mt-1">{errors['registeredBusinessAddress.state']}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code *</label>
                        <input
                          type="text"
                          value={formData.registeredBusinessAddress.pinCode}
                          onChange={(e) => updateNestedFormData('registeredBusinessAddress', 'pinCode', e.target.value)}
                          className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                            errors['registeredBusinessAddress.pinCode'] ? 'border-red-500' : 'border-gray-300'
                          }`}
                          placeholder="6-digit PIN code"
                        />
                        {errors['registeredBusinessAddress.pinCode'] && (
                          <p className="text-red-500 text-sm mt-1">{errors['registeredBusinessAddress.pinCode']}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Warehouse Addresses */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-medium text-gray-900">Warehouse/Pickup Addresses</h3>
                      <button
                        type="button"
                        onClick={addWarehouse}
                        className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                      >
                        <Plus className="w-4 h-4 mr-2" />
                        Add Warehouse
                      </button>
                    </div>

                    {formData.warehouseAddresses.map((warehouse, index) => (
                      <div key={index} className="bg-gray-50 p-6 rounded-lg mb-4">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="text-md font-medium text-gray-800">
                            Warehouse {index + 1} {warehouse.isPrimary && '(Primary)'}
                          </h4>
                          {formData.warehouseAddresses.length > 1 && (
                            <button
                              type="button"
                              onClick={() => removeWarehouse(index)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="flex items-center space-x-4">
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={warehouse.isPrimary}
                                onChange={(e) => updateWarehouse(index, 'isPrimary', e.target.checked)}
                                className="mr-2"
                              />
                              Primary Warehouse
                            </label>
                            <label className="flex items-center">
                              <input
                                type="checkbox"
                                checked={warehouse.sameAsRegistered}
                                onChange={(e) => updateWarehouse(index, 'sameAsRegistered', e.target.checked)}
                                className="mr-2"
                              />
                              Same as registered address
                            </label>
                          </div>

                          <div></div>

                          {!warehouse.sameAsRegistered && (
                            <>
                              <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 mb-2">Address Line 1 *</label>
                                <input
                                  type="text"
                                  value={warehouse.addressLine1}
                                  onChange={(e) => updateWarehouse(index, 'addressLine1', e.target.value)}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="Warehouse address"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">City *</label>
                                <input
                                  type="text"
                                  value={warehouse.city}
                                  onChange={(e) => updateWarehouse(index, 'city', e.target.value)}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="City"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">State *</label>
                                <input
                                  type="text"
                                  value={warehouse.state}
                                  onChange={(e) => updateWarehouse(index, 'state', e.target.value)}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="State"
                                />
                              </div>

                              <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">PIN Code *</label>
                                <input
                                  type="text"
                                  value={warehouse.pinCode}
                                  onChange={(e) => updateWarehouse(index, 'pinCode', e.target.value)}
                                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                                  placeholder="6-digit PIN code"
                                />
                              </div>
                            </>
                          )}

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Person</label>
                            <input
                              type="text"
                              value={warehouse.contactPerson || ''}
                              onChange={(e) => updateWarehouse(index, 'contactPerson', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Contact person name"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Contact Phone</label>
                            <input
                              type="tel"
                              value={warehouse.contactPhone || ''}
                              onChange={(e) => updateWarehouse(index, 'contactPhone', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Contact phone number"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Operating Hours</label>
                            <input
                              type="text"
                              value={warehouse.operatingHours || ''}
                              onChange={(e) => updateWarehouse(index, 'operatingHours', e.target.value)}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="e.g., 9:00 AM - 6:00 PM"
                            />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">Max Delivery Radius (km)</label>
                            <input
                              type="number"
                              min="1"
                              max="50"
                              value={warehouse.maxDeliveryRadius || ''}
                              onChange={(e) => updateWarehouse(index, 'maxDeliveryRadius', parseInt(e.target.value))}
                              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                              placeholder="Delivery radius in kilometers"
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                  {/* Step 4: Tax & Compliance */}
                  {currentStep === 4 && (
                    <div className="space-y-8">
                      <div className="border-b border-gray-200 pb-4">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Tax & Compliance Details</h2>
                        <p className="text-gray-600">Provide your tax registration and compliance information</p>
                      </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PAN Number *</label>
                      <input
                        type="text"
                        value={formData.panNumber}
                        onChange={(e) => updateFormData('panNumber', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono tracking-wider ${
                          errors.panNumber ? 'border-red-500 bg-red-50' : 'border-gray-300'
                        }`}
                        placeholder="ABCDE1234F"
                        maxLength={10}
                        pattern="[A-Z]{5}[0-9]{4}[A-Z]{1}"
                        title="PAN format: 5 letters, 4 digits, 1 letter (e.g., ABCDE1234F)"
                        autoComplete="off"
                      />
                      <p className="text-xs text-gray-500 mt-1">Format: 5 letters + 4 digits + 1 letter (e.g., ABCDE1234F)</p>
                      {errors.panNumber && <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                        <AlertCircle className="w-4 h-4" />
                        {errors.panNumber}
                      </p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">PAN Holder Name *</label>
                      <input
                        type="text"
                        value={formData.panHolderName}
                        onChange={(e) => updateFormData('panHolderName', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors.panHolderName ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Name as per PAN card"
                      />
                      {errors.panHolderName && <p className="text-red-500 text-sm mt-1">{errors.panHolderName}</p>}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Aadhaar Number</label>
                      <input
                        type="text"
                        value={formData.aadhaarNumber || ''}
                        onChange={(e) => updateFormData('aadhaarNumber', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="12-digit Aadhaar number (optional)"
                        maxLength={12}
                      />
                    </div>

                    <div className="flex items-center space-x-4">
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.gstRegistered}
                          onChange={(e) => updateFormData('gstRegistered', e.target.checked)}
                          className="mr-2"
                        />
                        GST Registered
                      </label>
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.tdsApplicable}
                          onChange={(e) => updateFormData('tdsApplicable', e.target.checked)}
                          className="mr-2"
                        />
                        TDS Applicable
                      </label>
                    </div>

                    {formData.gstRegistered && (
                      <>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">GST Number *</label>
                          <input
                            type="text"
                            value={formData.gstNumber || ''}
                            onChange={(e) => updateFormData('gstNumber', e.target.value.toUpperCase())}
                            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                              errors.gstNumber ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="15-digit GST number"
                            maxLength={15}
                          />
                          {errors.gstNumber && <p className="text-red-500 text-sm mt-1">{errors.gstNumber}</p>}
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">GSTIN</label>
                          <input
                            type="text"
                            value={formData.gstin || ''}
                            onChange={(e) => updateFormData('gstin', e.target.value.toUpperCase())}
                            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                            placeholder="GSTIN (if different from GST number)"
                            maxLength={15}
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

                  {/* Step 5: Bank Details */}
                  {currentStep === 5 && (
                    <div className="space-y-8">
                      <div className="border-b border-gray-200 pb-4">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Bank Account Details</h2>
                        <p className="text-gray-600">Provide your bank account information for payments</p>
                      </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Holder Name *</label>
                      <input
                        type="text"
                        value={formData.bankDetails.accountHolderName}
                        onChange={(e) => updateNestedFormData('bankDetails', 'accountHolderName', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors['bankDetails.accountHolderName'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Account holder name"
                      />
                      {errors['bankDetails.accountHolderName'] && (
                        <p className="text-red-500 text-sm mt-1">{errors['bankDetails.accountHolderName']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Bank Name *</label>
                      <input
                        type="text"
                        value={formData.bankDetails.bankName}
                        onChange={(e) => updateNestedFormData('bankDetails', 'bankName', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors['bankDetails.bankName'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Bank name"
                      />
                      {errors['bankDetails.bankName'] && (
                        <p className="text-red-500 text-sm mt-1">{errors['bankDetails.bankName']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Number *</label>
                      <input
                        type="password"
                        value={formData.bankDetails.accountNumber}
                        onChange={(e) => updateNestedFormData('bankDetails', 'accountNumber', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono ${
                          errors['bankDetails.accountNumber'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Enter your bank account number"
                        autoComplete="off"
                      />
                      <p className="text-xs text-gray-500 mt-1">Account number will be hidden for security</p>
                      {errors['bankDetails.accountNumber'] && (
                        <p className="text-red-500 text-sm mt-1">{errors['bankDetails.accountNumber']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Confirm Account Number *</label>
                      <input
                        type="text"
                        value={formData.bankDetails.confirmAccountNumber}
                        onChange={(e) => updateNestedFormData('bankDetails', 'confirmAccountNumber', e.target.value)}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 font-mono ${
                          errors['bankDetails.confirmAccountNumber'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="Re-enter account number to confirm"
                        autoComplete="off"
                      />
                      <p className="text-xs text-gray-500 mt-1">Visible for verification - must match above</p>
                      {errors['bankDetails.confirmAccountNumber'] && (
                        <p className="text-red-500 text-sm mt-1">{errors['bankDetails.confirmAccountNumber']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">IFSC Code *</label>
                      <input
                        type="text"
                        value={formData.bankDetails.ifscCode}
                        onChange={(e) => updateNestedFormData('bankDetails', 'ifscCode', e.target.value.toUpperCase())}
                        className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 ${
                          errors['bankDetails.ifscCode'] ? 'border-red-500' : 'border-gray-300'
                        }`}
                        placeholder="IFSC code (e.g., SBIN0001234)"
                        maxLength={11}
                      />
                      {errors['bankDetails.ifscCode'] && (
                        <p className="text-red-500 text-sm mt-1">{errors['bankDetails.ifscCode']}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Account Type *</label>
                      <select
                        value={formData.bankDetails.accountType}
                        onChange={(e) => updateNestedFormData('bankDetails', 'accountType', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="savings">Savings</option>
                        <option value="current">Current</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Branch Name</label>
                      <input
                        type="text"
                        value={formData.bankDetails.branchName || ''}
                        onChange={(e) => updateNestedFormData('bankDetails', 'branchName', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Branch name"
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Branch Address</label>
                      <textarea
                        value={formData.bankDetails.branchAddress || ''}
                        onChange={(e) => updateNestedFormData('bankDetails', 'branchAddress', e.target.value)}
                        rows={2}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="Branch address"
                      />
                    </div>
                  </div>
                </div>
              )}

                  {/* Step 6: Mobile Verification */}
                  {currentStep === 6 && (
                    <div className="space-y-8">
                      <div className="border-b border-gray-200 pb-4">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Mobile Verification</h2>
                        <p className="text-gray-600">Verify your mobile number to secure your account</p>
                      </div>

                      <div className="max-w-md mx-auto">
                        <div className="bg-blue-50 p-6 rounded-lg">
                          <div className="text-center mb-6">
                            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                              <Phone className="w-8 h-8 text-blue-600" />
                            </div>
                            <h3 className="text-lg font-medium text-gray-900 mb-2">Verify Mobile Number</h3>
                            <p className="text-gray-600 text-sm">We'll send an OTP to your registered mobile number</p>
                          </div>

                          <div className="space-y-4">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">Mobile Number</label>
                              <input
                                type="tel"
                                value={formData.mobile}
                                readOnly
                                className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-gray-100 text-center font-mono"
                              />
                            </div>
                            
                            {!formData.mobileVerified ? (
                              <>
                                <button
                                  type="button"
                                  onClick={sendMobileOtp}
                                  disabled={otpSending}
                                  className="w-full bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 px-4 rounded-lg hover:from-blue-700 hover:to-blue-800 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center shadow-lg"
                                >
                                  {otpSending ? (
                                    <>
                                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                                      <span className="font-medium">Sending OTP...</span>
                                    </>
                                  ) : (
                                    <>
                                      <Phone className="w-5 h-5 mr-2" />
                                      <span className="font-medium">Send OTP</span>
                                    </>
                                  )}
                                </button>

                                <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP</label>
                                  <div className="flex space-x-2">
                                    <input
                                      type="text"
                                      value={formData.mobileOtp || ''}
                                      onChange={(e) => updateFormData('mobileOtp', e.target.value)}
                                      className={`flex-1 px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 text-center text-lg font-mono tracking-wider ${
                                        errors.mobileOtp ? 'border-red-500 bg-red-50' : 'border-gray-300'
                                      }`}
                                      placeholder="000000"
                                      maxLength={6}
                                    />
                                    <button
                                      type="button"
                                      onClick={verifyMobileOtp}
                                      className="px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-lg hover:from-green-700 hover:to-green-800 transition-all duration-200 shadow-lg"
                                    >
                                      <span className="font-medium">Verify</span>
                                    </button>
                                  </div>
                                  {errors.mobileOtp && <p className="text-red-500 text-sm mt-1 flex items-center gap-1">
                                    <AlertCircle className="w-4 h-4" />
                                    {errors.mobileOtp}
                                  </p>}
                                </div>
                              </>
                            ) : (
                              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                                <div className="flex items-center justify-center text-green-600">
                                  <CheckCircle className="w-6 h-6 mr-2" />
                                  <span className="font-medium">Mobile number verified successfully!</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 7: Documents */}
                  {currentStep === 7 && (
                    <div className="space-y-8">
                      <div className="border-b border-gray-200 pb-4">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Document Upload</h2>
                        <p className="text-gray-600">Upload required documents for verification</p>
                      </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                    <div className="flex items-start">
                      <Info className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                      <div>
                        <p className="text-yellow-800 font-medium">Document Upload Notice</p>
                        <p className="text-yellow-700 text-sm mt-1">
                          Document upload functionality will be available after registration. You can complete your registration now and upload documents later from your seller dashboard.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[
                      { key: 'panCard', label: 'PAN Card', required: true },
                      { key: 'aadhaarCard', label: 'Aadhaar Card', required: true },
                      { key: 'addressProof', label: 'Address Proof', required: true },
                      { key: 'photograph', label: 'Passport Size Photograph', required: true },
                      { key: 'cancelledCheque', label: 'Cancelled Cheque', required: true },
                      ...(formData.sellerType === 'business' ? [{ key: 'businessCertificate', label: 'Business Certificate', required: true }] : []),
                      ...(formData.gstRegistered ? [{ key: 'gstCertificate', label: 'GST Certificate', required: true }] : [])
                    ].map((doc) => (
                      <div key={doc.key} className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-gray-900">{doc.label}</h3>
                          {doc.required && <span className="text-red-500 text-sm">Required</span>}
                        </div>
                        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                          <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-500 text-sm">Upload after registration</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

                  {/* Step 8: Terms & Agreements */}
                  {currentStep === 8 && (
                    <div className="space-y-8">
                      <div className="border-b border-gray-200 pb-4">
                        <h2 className="text-2xl font-semibold text-gray-900 mb-2">Terms & Agreements</h2>
                        <p className="text-gray-600">Please read and accept all terms and policies</p>
                      </div>

                  <div className="space-y-4">
                    {[
                      { key: 'termsAndConditionsAccepted', label: 'Terms and Conditions', required: true },
                      { key: 'returnPolicyAccepted', label: 'Return Policy', required: true },
                      { key: 'dataComplianceAccepted', label: 'Data Compliance Policy', required: true },
                      { key: 'privacyPolicyAccepted', label: 'Privacy Policy', required: true },
                      { key: 'commissionRateAccepted', label: 'Commission Rate Terms', required: true },
                      { key: 'paymentSettlementTermsAccepted', label: 'Payment Settlement Terms', required: true }
                    ].map((term) => (
                      <div key={term.key} className="bg-gray-50 p-4 rounded-lg">
                        <label className="flex items-start">
                          <input
                            type="checkbox"
                            checked={formData[term.key as keyof FormData] as boolean}
                            onChange={(e) => updateFormData(term.key, e.target.checked)}
                            className={`mt-1 mr-3 ${errors[term.key] ? 'border-red-500' : ''}`}
                          />
                          <div>
                            <span className="font-medium text-gray-900">
                              I accept the {term.label}
                              {term.required && <span className="text-red-500 ml-1">*</span>}
                            </span>
                            <p className="text-sm text-gray-600 mt-1">
                              Please read our {term.label.toLowerCase()} carefully before accepting.
                            </p>
                          </div>
                        </label>
                        {errors[term.key] && <p className="text-red-500 text-sm mt-2 ml-6">{errors[term.key]}</p>}
                      </div>
                    ))}
                  </div>

                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <div className="flex items-start">
                      <Info className="w-5 h-5 text-blue-600 mr-2 mt-0.5" />
                      <div>
                        <p className="text-blue-800 font-medium">What happens next?</p>
                        <ul className="text-blue-700 text-sm mt-1 space-y-1">
                          <li>• Your registration will be submitted for review</li>
                          <li>• Our team will verify your information and documents</li>
                          <li>• You'll receive login credentials within 24-48 hours if approved</li>
                          <li>• You can then access your seller dashboard and start listing products</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* Error Messages */}
              {(errors.submit || errors.verification) && (
                <div className="mt-8 bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-red-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-red-800 font-medium">Registration Error</p>
                      <p className="text-red-700 text-sm mt-1">
                        {errors.submit || errors.verification}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex flex-col sm:flex-row justify-between gap-4 mt-8 pt-6 border-t border-gray-200">
                <button
                  onClick={prevStep}
                  disabled={currentStep === 1}
                  className={`flex items-center justify-center px-6 py-3 rounded-lg transition-colors w-full sm:w-auto ${
                    currentStep === 1
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <ArrowLeft className="w-5 h-5 mr-2" />
                  Previous
                </button>

                {currentStep < steps.length ? (
                  <button
                    onClick={nextStep}
                    className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors w-full sm:w-auto"
                  >
                    Next
                    <ArrowRight className="w-5 h-5 ml-2" />
                  </button>
                ) : (
                  <button
                    onClick={handleSubmit}
                    disabled={isSubmitting || !formData.mobileVerified}
                    className="flex items-center justify-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 w-full sm:w-auto"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Submitting Registration...
                      </>
                    ) : (
                      <>
                        Submit Registration
                        <CheckCircle className="w-5 h-5 ml-2" />
                      </>
                    )}
                  </button>
                )}
          </div>

              {/* Verification Status Warning */}
              {currentStep === steps.length && !formData.mobileVerified && (
                <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-yellow-600 mr-2 mt-0.5" />
                    <div>
                      <p className="text-yellow-800 font-medium">Mobile Verification Required</p>
                      <p className="text-yellow-700 text-sm mt-1">
                        Please complete mobile number verification before submitting your registration.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SellerRegistration;