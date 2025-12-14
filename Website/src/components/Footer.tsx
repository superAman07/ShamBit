import { Instagram, Twitter, Facebook, Mail } from 'lucide-react';

export const Footer = () => {
    return (
        <footer className="w-full py-8 mt-auto border-t border-gray-200 bg-white/50 backdrop-blur-sm">
            <div className="max-w-6xl mx-auto px-4 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} ShamBit. All rights reserved.
                </div>

                <div className="flex items-center gap-6">
                    <a href="#" className="text-gray-400 hover:text-[#FB6F92] transition-colors"><Instagram className="w-5 h-5" /></a>
                    <a href="#" className="text-gray-400 hover:text-[#FB6F92] transition-colors"><Twitter className="w-5 h-5" /></a>
                    <a href="#" className="text-gray-400 hover:text-[#FB6F92] transition-colors"><Facebook className="w-5 h-5" /></a>
                    <a href="#" className="text-gray-400 hover:text-[#FB6F92] transition-colors"><Mail className="w-5 h-5" /></a>
                </div>
            </div>
        </footer>
    );
};
