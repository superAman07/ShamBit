import React, { useState } from 'react';

export const HelpSection: React.FC = () => {
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  const faqs = [
    {
      question: 'How long does verification take?',
      answer: 'Document verification typically takes 24-48 hours during business days. You\'ll receive email and SMS notifications about status updates.'
    },
    {
      question: 'What documents do I need?',
      answer: 'Required documents include PAN card, bank account proof (cancelled cheque or statement), and GST certificate (if applicable). Additional documents may be requested based on your business type.'
    },
    {
      question: 'When can I start listing products?',
      answer: 'You can start listing products once you complete basic profile information (60% completion) and your account is verified. Payment processing requires bank details verification.'
    },
    {
      question: 'How do I receive payments?',
      answer: 'Payments are processed to your verified bank account within 3-7 business days after order delivery confirmation. You can track all payouts in your dashboard.'
    },
    {
      question: 'What if my documents are rejected?',
      answer: 'If documents are rejected, you\'ll receive specific feedback on what needs to be corrected. Simply reupload the corrected documents and our team will review them again.'
    }
  ];

  const helpTopics = [
    {
      title: 'Getting Started Guide',
      description: 'Step-by-step guide to set up your seller account',
      icon: '📚',
      link: '#'
    },
    {
      title: 'Product Listing Help',
      description: 'Learn how to create effective product listings',
      icon: '📦',
      link: '#'
    },
    {
      title: 'Payment & Payouts',
      description: 'Understanding payments and payout schedules',
      icon: '💰',
      link: '#'
    },
    {
      title: 'Seller Policies',
      description: 'Important policies and guidelines for sellers',
      icon: '📋',
      link: '#'
    }
  ];

  const toggleFaq = (index: number) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  return (
    <div className="space-y-6">
      {/* Quick Help */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Help</h3>
        
        <div className="space-y-3">
          {helpTopics.map((topic) => (
            <a
              key={topic.title}
              href={topic.link}
              className="flex items-center p-3 rounded-lg border border-gray-200 hover:border-[#FF6F61] hover:bg-gray-50 transition-all duration-200"
            >
              <span className="text-lg mr-3">{topic.icon}</span>
              <div className="flex-1">
                <h4 className="font-medium text-gray-900 text-sm">{topic.title}</h4>
                <p className="text-xs text-gray-600">{topic.description}</p>
              </div>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </a>
          ))}
        </div>
      </div>

      {/* FAQ Section */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Frequently Asked Questions</h3>
        
        <div className="space-y-3">
          {faqs.map((faq, index) => (
            <div key={index} className="border border-gray-200 rounded-lg">
              <button
                onClick={() => toggleFaq(index)}
                className="w-full text-left p-4 flex items-center justify-between hover:bg-gray-50 transition-colors duration-200"
              >
                <span className="font-medium text-gray-900 text-sm">{faq.question}</span>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${
                    expandedFaq === index ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {expandedFaq === index && (
                <div className="px-4 pb-4">
                  <p className="text-sm text-gray-600">{faq.answer}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Contact Support */}
      <div className="bg-gradient-to-r from-[#FF6F61] to-[#E55A4F] rounded-lg p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Need More Help?</h3>
        <p className="text-sm opacity-90 mb-4">
          Our support team is here to help you succeed. Get personalized assistance with your seller journey.
        </p>
        
        <div className="space-y-3">
          <a
            href="mailto:seller-support@shambit.com"
            className="flex items-center text-sm hover:opacity-80 transition-opacity"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            seller-support@shambit.com
          </a>
          
          <a
            href="tel:+911800000000"
            className="flex items-center text-sm hover:opacity-80 transition-opacity"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            1800-123-456 (Toll Free)
          </a>
          
          <div className="text-xs opacity-80 mt-2">
            Support Hours: Monday - Saturday, 9 AM - 7 PM IST
          </div>
        </div>
      </div>

      {/* Tips & Best Practices */}
      <div className="bg-white rounded-lg shadow-sm p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">💡 Seller Tips</h3>
        
        <div className="space-y-3 text-sm text-gray-600">
          <div className="flex items-start">
            <div className="w-2 h-2 bg-[#FF6F61] rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <p>Complete your profile during business hours for faster verification</p>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-[#FF6F61] rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <p>Ensure document images are clear and all corners are visible</p>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-[#FF6F61] rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <p>Keep your contact information updated for important notifications</p>
          </div>
          <div className="flex items-start">
            <div className="w-2 h-2 bg-[#FF6F61] rounded-full mt-2 mr-3 flex-shrink-0"></div>
            <p>Review our seller policies to avoid common listing mistakes</p>
          </div>
        </div>
      </div>
    </div>
  );
};