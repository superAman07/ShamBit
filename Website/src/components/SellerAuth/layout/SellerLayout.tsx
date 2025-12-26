import React from 'react';
import logo from '../../../assets/logo.png';

interface SellerLayoutProps {
  children: React.ReactNode;
  showHeader?: boolean;
}

const SellerLayout: React.FC<SellerLayoutProps> = ({ children, showHeader = true }) => {
  return (
    <div className="min-h-screen bg-white">
      {showHeader && (
        <header className="sticky top-0 z-50 bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              {/* Left - Logo and Title */}
              <div className="flex items-center space-x-4">
                <a href="/" className="flex items-center gap-3 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 rounded-lg">
                  <div className="flex items-center justify-center w-10 h-10 bg-white rounded-xl shadow-sm border border-gray-100">
                    <img
                      src={logo}
                      alt="ShamBit Logo"
                      className="h-6 w-6 object-contain"
                    />
                  </div>
                  <div className="flex flex-col">
                    <div className="text-lg font-bold leading-none">
                      <span className="bg-gradient-to-r from-orange-500 via-yellow-500 to-amber-500 bg-clip-text text-transparent">Sham</span>
                      <span className="bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent">Bit</span>
                    </div>
                    <div className="text-xs text-gray-500 font-medium">Seller Hub</div>
                  </div>
                </a>
              </div>

              {/* Right - Navigation */}
              <nav className="hidden md:flex items-center space-x-8">
                <a href="#why-sell" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  Why Sell
                </a>
                <a href="#how-it-works" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  How It Works
                </a>
                <a href="#requirements" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  Requirements
                </a>
                <a href="/seller/login" className="text-gray-600 hover:text-gray-900 font-medium transition-colors">
                  Login
                </a>
                <a 
                  href="/seller/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
                >
                  Register as Seller
                </a>
              </nav>

              {/* Mobile menu button */}
              <div className="md:hidden">
                <a 
                  href="/seller/register"
                  className="bg-blue-600 text-white px-4 py-2 rounded font-medium hover:bg-blue-700 transition-colors"
                >
                  Register
                </a>
              </div>
            </div>
          </div>
        </header>
      )}
      
      <main>
        {children}
      </main>
    </div>
  );
};

export default SellerLayout;