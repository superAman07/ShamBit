import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Categories } from './components/Categories';
import { HowItWorks } from './components/HowItWorks';
import { SocialProof } from './components/SocialProof';
import { SellerCTA } from './components/SellerCTA';
import { Newsletter } from './components/Newsletter';
import { Footer } from './components/Footer';
import SellerRegistration from './pages/SellerRegistration';
import SellerLogin from './pages/SellerLogin';
import SellerForgotPassword from './pages/SellerForgotPassword';

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

function App() {
  return (
    <Router>
      <main className="min-h-screen font-sans selection:bg-[#FF6F61] selection:text-white flex flex-col overflow-x-hidden">
        <Routes>
          {/* Home Page */}
          <Route path="/" element={
            <>
              <Header />
              <HomePage />
              <Footer />
            </>
          } />
          
          {/* Seller Pages - No Header/Footer for clean auth experience */}
          <Route path="/seller/register" element={<SellerRegistration />} />
          <Route path="/seller/login" element={<SellerLogin />} />
          <Route path="/seller/forgot-password" element={<SellerForgotPassword />} />
        </Routes>
      </main>
    </Router>
  );
}

export default App;
