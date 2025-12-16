import { useEffect } from 'react';

interface SEOHeadProps {
  title?: string;
  description?: string;
  keywords?: string;
  image?: string;
  url?: string;
  type?: string;
}

export const SEOHead = ({
  title = "ShamBit - Premium Food Marketplace | Fresh, Verified, Delivered with Care",
  description = "India's premier food marketplace connecting verified sellers with conscious buyers. Fresh groceries, organic produce, and artisanal foods delivered with care. Join 10,000+ satisfied customers.",
  keywords = "food marketplace India, verified food sellers, fresh groceries online, organic food delivery, artisanal foods, premium food marketplace, online grocery India, fresh produce delivery, food startup India, verified sellers marketplace",
  image = "https://shambit.com/shambit-og-image.png",
  url = "https://shambit.com",
  type = "website"
}: SEOHeadProps) => {
  
  useEffect(() => {
    // Update document title
    document.title = title;
    
    // Update meta tags
    const updateMetaTag = (name: string, content: string, property = false) => {
      const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
      let meta = document.querySelector(selector) as HTMLMetaElement;
      
      if (!meta) {
        meta = document.createElement('meta');
        if (property) {
          meta.setAttribute('property', name);
        } else {
          meta.setAttribute('name', name);
        }
        document.head.appendChild(meta);
      }
      
      meta.setAttribute('content', content);
    };
    
    // Update basic meta tags
    updateMetaTag('description', description);
    updateMetaTag('keywords', keywords);
    
    // Update Open Graph tags
    updateMetaTag('og:title', title, true);
    updateMetaTag('og:description', description, true);
    updateMetaTag('og:image', image, true);
    updateMetaTag('og:url', url, true);
    updateMetaTag('og:type', type, true);
    
    // Update Twitter Card tags
    updateMetaTag('twitter:title', title);
    updateMetaTag('twitter:description', description);
    updateMetaTag('twitter:image', image);
    
    // Update canonical URL
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', url);
    
  }, [title, description, keywords, image, url, type]);
  
  return null;
};

// Hook for dynamic SEO updates
export const useSEO = (seoData: SEOHeadProps) => {
  useEffect(() => {
    SEOHead(seoData);
    return () => {
      // Cleanup if needed
    };
  }, [seoData]);
};