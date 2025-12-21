import React, { useState } from 'react';
import type { SellerBasicInfo } from '@shambit/shared';

interface DocumentVerificationFormProps {
  seller: SellerBasicInfo;
  onSubmit: (data: any, partialSave?: boolean) => Promise<void>;
  loading: boolean;
  error: string | null;
}

interface DocumentUpload {
  type: string;
  file: File | null;
  preview: string | null;
  uploaded: boolean;
  status: 'pending' | 'uploading' | 'uploaded' | 'verified' | 'rejected';
  rejectionReason?: string;
}

export const DocumentVerificationForm: React.FC<DocumentVerificationFormProps> = ({
  onSubmit,
  loading,
  error
}) => {
  const [documents, setDocuments] = useState<Record<string, DocumentUpload>>({
    pan_card: {
      type: 'pan_card',
      file: null,
      preview: null,
      uploaded: false,
      status: 'pending'
    },
    bank_proof: {
      type: 'bank_proof',
      file: null,
      preview: null,
      uploaded: false,
      status: 'pending'
    },
    gst_certificate: {
      type: 'gst_certificate',
      file: null,
      preview: null,
      uploaded: false,
      status: 'pending'
    },
    aadhaar: {
      type: 'aadhaar',
      file: null,
      preview: null,
      uploaded: false,
      status: 'pending'
    },
    business_certificate: {
      type: 'business_certificate',
      file: null,
      preview: null,
      uploaded: false,
      status: 'pending'
    }
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  const documentTypes = [
    {
      key: 'pan_card',
      title: 'PAN Card',
      description: 'Clear photo of your PAN card',
      required: true,
      icon: '📄',
      acceptedFormats: 'JPG, PNG, PDF (max 5MB)',
      tips: [
        'Ensure all text is clearly readable',
        'All four corners should be visible',
        'No shadows or glare on the document'
      ]
    },
    {
      key: 'bank_proof',
      title: 'Bank Account Proof',
      description: 'Cancelled cheque or bank statement',
      required: true,
      icon: '🏦',
      acceptedFormats: 'JPG, PNG, PDF (max 5MB)',
      tips: [
        'Account number and IFSC should be clearly visible',
        'For bank statement, use recent statement (within 3 months)',
        'For cancelled cheque, write "CANCELLED" across it'
      ]
    },
    {
      key: 'gst_certificate',
      title: 'GST Certificate',
      description: 'GST registration certificate (if applicable)',
      required: false,
      icon: '📋',
      acceptedFormats: 'JPG, PNG, PDF (max 5MB)',
      tips: [
        'Upload only if you have GST registration',
        'Certificate should show your GST number clearly',
        'Ensure the document is not expired'
      ]
    },
    {
      key: 'aadhaar',
      title: 'Aadhaar Card',
      description: 'Aadhaar card for identity verification',
      required: false,
      icon: '🆔',
      acceptedFormats: 'JPG, PNG, PDF (max 5MB)',
      tips: [
        'You can mask the middle 8 digits for privacy',
        'Ensure name and address are clearly visible',
        'Both front and back sides if needed'
      ]
    },
    {
      key: 'business_certificate',
      title: 'Business Registration',
      description: 'Business registration certificate (if applicable)',
      required: false,
      icon: '🏢',
      acceptedFormats: 'JPG, PNG, PDF (max 5MB)',
      tips: [
        'Required for registered businesses (LLP, Pvt Ltd, etc.)',
        'Certificate of incorporation or partnership deed',
        'Ensure all details are clearly readable'
      ]
    }
  ];

  const validateFile = (file: File) => {
    const maxSize = 5 * 1024 * 1024; // 5MB
    const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];

    if (!allowedTypes.includes(file.type)) {
      return 'Please upload JPG, PNG, or PDF files only';
    }

    if (file.size > maxSize) {
      return 'File size must be less than 5MB';
    }

    return null;
  };

  const handleFileUpload = (documentType: string, file: File) => {
    const error = validateFile(file);
    if (error) {
      setValidationErrors(prev => ({ ...prev, [documentType]: error }));
      return;
    }

    // Clear any previous errors
    setValidationErrors(prev => ({ ...prev, [documentType]: '' }));

    // Create preview for images
    let preview = null;
    if (file.type.startsWith('image/')) {
      preview = URL.createObjectURL(file);
    }

    setDocuments(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType],
        file,
        preview,
        status: 'uploaded'
      }
    }));
  };

  const handleFileRemove = (documentType: string) => {
    setDocuments(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType],
        file: null,
        preview: null,
        status: 'pending'
      }
    }));
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};

    // Check required documents
    const requiredDocs = documentTypes.filter(doc => doc.required);
    requiredDocs.forEach(doc => {
      if (!documents[doc.key].file) {
        errors[doc.key] = `${doc.title} is required`;
      }
    });

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    // Prepare form data with files
    const formData = new FormData();
    Object.entries(documents).forEach(([key, doc]) => {
      if (doc.file) {
        formData.append(key, doc.file);
      }
    });

    await onSubmit(formData, false);
  };

  const handlePartialSave = async () => {
    const formData = new FormData();
    Object.entries(documents).forEach(([key, doc]) => {
      if (doc.file) {
        formData.append(key, doc.file);
      }
    });

    await onSubmit(formData, true);
  };

  const getUploadedCount = () => {
    return Object.values(documents).filter(doc => doc.file).length;
  };

  const getRequiredCount = () => {
    return documentTypes.filter(doc => doc.required).length;
  };

  return (
    <div className="p-6">
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <div className="flex">
              <div className="text-red-500 mr-3">⚠️</div>
              <div className="text-red-800 text-sm">{error}</div>
            </div>
          </div>
        )}

        {/* Progress Summary */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-medium text-blue-900 mb-2">📄 Document Upload Progress</h3>
          <p className="text-sm text-blue-800 mb-2">
            Upload clear, readable documents for faster verification
          </p>
          <div className="text-sm text-blue-700">
            <strong>{getUploadedCount()}</strong> of <strong>{documentTypes.length}</strong> documents uploaded
            ({getRequiredCount()} required)
          </div>
        </div>

        {/* Document Upload Sections */}
        <div className="space-y-6">
          {documentTypes.map((docType) => (
            <div key={docType.key} className="border border-gray-200 rounded-lg p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center">
                  <span className="text-2xl mr-3">{docType.icon}</span>
                  <div>
                    <h4 className="font-medium text-gray-900">
                      {docType.title}
                      {docType.required && <span className="text-red-500 ml-1">*</span>}
                    </h4>
                    <p className="text-sm text-gray-600">{docType.description}</p>
                  </div>
                </div>
                
                {documents[docType.key].file && (
                  <div className="flex items-center text-green-600">
                    <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    <span className="text-sm font-medium">Uploaded</span>
                  </div>
                )}
              </div>

              {/* File Upload Area */}
              {!documents[docType.key].file ? (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#FF6F61] transition-colors">
                  <input
                    type="file"
                    id={`file-${docType.key}`}
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleFileUpload(docType.key, file);
                      }
                    }}
                    className="hidden"
                  />
                  <label
                    htmlFor={`file-${docType.key}`}
                    className="cursor-pointer"
                  >
                    <div className="text-gray-400 mb-2">
                      <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 48 48">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" />
                      </svg>
                    </div>
                    <div className="text-sm text-gray-600 mb-1">
                      <span className="text-[#FF6F61] font-medium">Click to upload</span> or drag and drop
                    </div>
                    <div className="text-xs text-gray-500">{docType.acceptedFormats}</div>
                  </label>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      {documents[docType.key].preview ? (
                        <img
                          src={documents[docType.key].preview!}
                          alt="Document preview"
                          className="w-16 h-16 object-cover rounded-lg mr-4"
                        />
                      ) : (
                        <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center mr-4">
                          <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                        </div>
                      )}
                      <div>
                        <div className="font-medium text-gray-900">{documents[docType.key].file!.name}</div>
                        <div className="text-sm text-gray-500">
                          {(documents[docType.key].file!.size / 1024 / 1024).toFixed(2)} MB
                        </div>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleFileRemove(docType.key)}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              )}

              {validationErrors[docType.key] && (
                <p className="mt-2 text-sm text-red-600">{validationErrors[docType.key]}</p>
              )}

              {/* Tips */}
              <div className="mt-4 bg-gray-50 rounded-lg p-3">
                <h5 className="text-sm font-medium text-gray-900 mb-2">💡 Upload Tips:</h5>
                <ul className="text-xs text-gray-600 space-y-1">
                  {docType.tips.map((tip, index) => (
                    <li key={index}>• {tip}</li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t">
          <button
            type="button"
            onClick={handlePartialSave}
            disabled={loading}
            className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Saving...' : 'Save & Continue Later'}
          </button>
          
          <button
            type="submit"
            disabled={loading}
            className="flex-1 px-6 py-3 bg-[#FF6F61] text-white rounded-lg hover:bg-[#E55A4F] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Uploading...' : 'Upload Documents'}
          </button>
        </div>
      </form>

      {/* Help Text */}
      <div className="mt-6 bg-gray-50 rounded-lg p-4">
        <h4 className="font-medium text-gray-900 mb-2">📄 Document Verification Tips</h4>
        <ul className="text-sm text-gray-600 space-y-1">
          <li>• Take photos in good lighting with all text clearly readable</li>
          <li>• Ensure all four corners of documents are visible</li>
          <li>• Avoid shadows, glare, or blurry images</li>
          <li>• Documents should be recent and not expired</li>
          <li>• Verification typically takes 24-48 hours during business days</li>
          <li>• You'll receive email/SMS notifications about verification status</li>
        </ul>
      </div>
    </div>
  );
};