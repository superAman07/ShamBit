import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { Categories } from './components/Categories';
import { WhyShamBit } from './components/WhyShamBit';
import { HowItWorks } from './components/HowItWorks';
import { SocialProof } from './components/SocialProof';
import { SellerCTA } from './components/SellerCTA';
import { Newsletter } from './components/Newsletter';
import { Footer } from './components/Footer';

function App() {
  return (
    <main className="min-h-screen font-sans selection:bg-[#FF6F61] selection:text-white flex flex-col overflow-x-hidden">
      <Header />
      <div> {/* Content wrapper */}
        <Hero />
        <WhyShamBit />
        <HowItWorks />
        <Categories />
        <SocialProof />
        <SellerCTA />
        <Newsletter />
        <Footer />
      </div>
    </main>
  );
}

export default App;
