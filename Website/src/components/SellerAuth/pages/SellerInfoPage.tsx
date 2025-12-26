import React from 'react';
import SellerLayout from '../layout/SellerLayout';

const SellerInfoPage: React.FC = () => {
  return (
    <SellerLayout>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        
        {/* HERO SECTION */}
        <section className="text-center mb-16">
          <h1 className="text-4xl font-semibold text-gray-900 mb-4">
            Sell Online with Confidence on ShamBit
          </h1>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Reach customers across India with a secure, compliant, and easy-to-use marketplace.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a 
              href="/seller/register"
              className="bg-blue-600 text-white px-8 py-3 rounded font-medium hover:bg-blue-700 transition-colors"
            >
              Register as Seller
            </a>
            <a 
              href="/seller/login"
              className="border border-gray-300 text-gray-700 px-8 py-3 rounded font-medium hover:bg-gray-50 transition-colors"
            >
              Login
            </a>
          </div>
        </section>

        {/* WHY SELL ON SHAMBIT */}
        <section id="why-sell" className="mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
            Why Sell on ShamBit
          </h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-3xl mx-auto">
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Pan-India customer reach</h3>
                <p className="text-gray-600">Connect with millions of customers across all states and cities in India.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Easy onboarding process</h3>
                <p className="text-gray-600">Get started quickly with our streamlined seller registration and verification.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Secure and timely payments</h3>
                <p className="text-gray-600">Receive guaranteed payments with transparent settlement cycles.</p>
              </div>
            </div>
            <div className="space-y-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Transparent policies</h3>
                <p className="text-gray-600">Clear guidelines and fair policies that protect both sellers and customers.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Dedicated seller support</h3>
                <p className="text-gray-600">Get help when you need it with our dedicated seller support team.</p>
              </div>
            </div>
          </div>
        </section>

        {/* HOW IT WORKS */}
        <section id="how-it-works" className="mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
            How It Works
          </h2>
          <div className="max-w-2xl mx-auto">
            <div className="space-y-8">
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  1
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Create your seller account</h3>
                  <p className="text-gray-600">Register with your basic information and verify your mobile number.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  2
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Verify your business details</h3>
                  <p className="text-gray-600">Submit required documents including GST registration and bank details.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  3
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Add products and pricing</h3>
                  <p className="text-gray-600">List your products with competitive pricing and detailed descriptions.</p>
                </div>
              </div>
              
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-semibold">
                  4
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 mb-1">Start receiving orders</h3>
                  <p className="text-gray-600">Begin selling and manage orders through your seller dashboard.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* REQUIREMENTS */}
        <section id="requirements" className="mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
            Requirements
          </h2>
          <div className="max-w-2xl mx-auto">
            <div className="bg-gray-50 rounded-lg p-6">
              <p className="text-gray-600 mb-4">To sell on ShamBit, you will need:</p>
              <ul className="space-y-3">
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  GST registration
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  PAN card
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  Bank account
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  Business address
                </li>
                <li className="flex items-center text-gray-700">
                  <span className="w-2 h-2 bg-gray-400 rounded-full mr-3"></span>
                  Category-specific approvals (if applicable)
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* TRUST & COMPLIANCE */}
        <section className="mb-16">
          <h2 className="text-2xl font-semibold text-gray-900 mb-8 text-center">
            Trust & Compliance
          </h2>
          <div className="max-w-2xl mx-auto text-center">
            <div className="grid md:grid-cols-3 gap-6">
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Secure data handling</h3>
                <p className="text-gray-600 text-sm">Your information is protected with industry-standard security measures.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">OTP-based verification</h3>
                <p className="text-gray-600 text-sm">Multi-factor authentication ensures account security.</p>
              </div>
              <div>
                <h3 className="font-semibold text-gray-900 mb-2">Compliance with Indian regulations</h3>
                <p className="text-gray-600 text-sm">Full adherence to GST and other applicable laws.</p>
              </div>
            </div>
          </div>
        </section>

        {/* FINAL CALL TO ACTION */}
        <section className="text-center">
          <div className="bg-gray-50 rounded-lg py-12 px-6">
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">
              Ready to start selling?
            </h2>
            <p className="text-gray-600 mb-6">
              Join thousands of successful sellers on ShamBit today.
            </p>
            <a 
              href="/seller/register"
              className="bg-blue-600 text-white px-8 py-3 rounded font-medium hover:bg-blue-700 transition-colors inline-block"
            >
              Register as Seller
            </a>
          </div>
        </section>

      </div>
    </SellerLayout>
  );
};

export default SellerInfoPage;