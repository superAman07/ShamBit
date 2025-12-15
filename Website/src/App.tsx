import { useRef } from 'react';
import { Header } from './components/Header';
import { Hero } from './components/Hero';
import { CategoryPreview } from './components/CategoryPreview';
import { Features } from './components/Features';
import { TrustSection } from './components/TrustSection';
import { Footer } from './components/Footer';
import { SellerForm } from './components/Registration/SellerForm';

import { Statistics } from './components/Statistics';

function App() {
  const sellerFormRef = useRef<HTMLDivElement>(null);

  const scrollToSellerForm = () => {
    sellerFormRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <main className="min-h-screen font-sans selection:bg-[#FB6F92] selection:text-white flex flex-col overflow-x-hidden">
      <Header onJoinClick={scrollToSellerForm} />
      <Hero />
      <CategoryPreview />
      <Features />
      <Statistics />

      <div ref={sellerFormRef} className="scroll-mt-24">
        <SellerForm />
      </div>
      <TrustSection />
      <Footer />
    </main>
  );
}

export default App;
