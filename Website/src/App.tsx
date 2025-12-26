import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Categories } from './components/Categories';
import { HowItWorks } from './components/HowItWorks';
import { SocialProof } from './components/SocialProof';
import { SellerCTA } from './components/SellerCTA';
import { Newsletter } from './components/Newsletter';
import { Footer } from './components/Footer';
import SellerInfo from './pages/SellerInfo';
import SellerRegistration from './pages/SellerRegistration';
import SellerLogin from './pages/SellerLogin';
import SellerForgotPassword from './pages/SellerForgotPassword';
import SellerResetPassword from './pages/SellerResetPassword';
import SellerResetPasswordOTP from './pages/SellerResetPasswordOTP';
import SellerDashboard from './pages/SellerDashboard';
import SellerProfileCompletion from './pages/SellerProfileCompletion';

// Home Page Component
const HomePage = () => (
  <>
    <Hero />
    <HowItWorks />
    <Categories />
    <SocialProof />
    <SellerCTA />
    <Newsletter />
  </>
);

// Component to manage body classes based on route
const BodyClassManager = () => {
  const location = useLocation();
  
  useEffect(() => {
    // Remove any existing body classes
    document.body.classList.remove('has-fixed-header');
    
    // Add appropriate class based on route
    if (location.pathname === '/') {
      document.body.classList.add('has-fixed-header');
    }
  }, [location.pathname]);
  
  return null;
};

function App() {
  return (
    <Router>
      <BodyClassManager />
      <Routes>
        {/* Home Page */}
        <Route path="/" element={
          <main className="min-h-screen font-sans selection:bg-[#FF6F61] selection:text-white flex flex-col overflow-x-hidden">
            <Header />
            <HomePage />
            <Footer />
          </main>
        } />
        
        {/* Seller Pages - Full screen without main wrapper for clean auth experience */}
        <Route path="/seller" element={
          <div className="font-sans selection:bg-[#FF6F61] selection:text-white" style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
            <SellerInfo />
          </div>
        } />
        <Route path="/seller/register" element={
          <div className="font-sans selection:bg-[#FF6F61] selection:text-white" style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
            <SellerRegistration />
          </div>
        } />
        <Route path="/seller/login" element={
          <div className="font-sans selection:bg-[#FF6F61] selection:text-white" style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
            <SellerLogin />
          </div>
        } />
        <Route path="/seller/forgot-password" element={
          <div className="font-sans selection:bg-[#FF6F61] selection:text-white" style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
            <SellerForgotPassword />
          </div>
        } />
        <Route path="/seller/reset-password" element={
          <div className="font-sans selection:bg-[#FF6F61] selection:text-white" style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
            <SellerResetPassword />
          </div>
        } />
        <Route path="/seller/reset-password-otp" element={
          <div className="font-sans selection:bg-[#FF6F61] selection:text-white" style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
            <SellerResetPasswordOTP />
          </div>
        } />
        <Route path="/seller/dashboard" element={
          <div className="font-sans selection:bg-[#FF6F61] selection:text-white" style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
            <SellerDashboard />
          </div>
        } />
        <Route path="/seller/profile/:section" element={
          <div className="font-sans selection:bg-[#FF6F61] selection:text-white" style={{ margin: 0, padding: 0, minHeight: '100vh' }}>
            <SellerProfileCompletion />
          </div>
        } />
      </Routes>
    </Router>
  );
}

export default App;
