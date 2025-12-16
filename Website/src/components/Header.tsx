import { motion } from 'framer-motion';
import { Menu, X, Phone, MessageCircle, Mail } from 'lucide-react';
import { useState } from 'react';
import logo from '../assets/logo.png';

export const Header = () => {
    const [isMenuOpen, setIsMenuOpen] = useState(false);


    return (
        <motion.header
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-[9999] bg-white shadow-lg w-full border-0 outline-0"
            role="banner"
            aria-label="Main navigation"
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 9999,
                border: 'none',
                outline: 'none',
                marginTop: 0,
                borderTop: 'none'
            }}
        >
            {/* Top Contact Bar - Rewritten for proper single line display */}
            <div className="bg-gradient-to-r from-green-600 to-green-700 py-2">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-center md:justify-between text-white text-sm font-medium">
                        {/* Contact Information - Single Line */}
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-1">
                                <Phone className="w-4 h-4" />
                                <span>+91 [Phone Number]</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <MessageCircle className="w-4 h-4" />
                                <span>WhatsApp: [WhatsApp Number]</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Mail className="w-4 h-4" />
                                <span>[email@shambit.com]</span>
                            </div>
                        </div>
                        
                        {/* Welcome Message - Hidden on mobile */}
                        <div className="hidden md:block text-sm">
                            Welcome to <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent font-bold">Sham</span><span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent font-bold">Bit</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <div className="container-max">
                <div className="flex items-center justify-between h-20">
                    {/* Logo Section - Better Alignment */}
                    <motion.div 
                        className="flex items-center gap-4"
                        whileHover={{ scale: 1.02 }}
                    >
                        <a href="/" className="flex items-center gap-4 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 rounded-lg" aria-label="ShamBit homepage">
                            <div className="flex items-center justify-center w-14 h-14 bg-gradient-to-br from-orange-50 to-blue-50 rounded-xl shadow-sm">
                                <img 
                                    src={logo} 
                                    alt="ShamBit Logo - Premium Food Marketplace" 
                                    className="h-10 w-10 object-contain"
                                    loading="eager"
                                />
                            </div>
                            <div className="flex flex-col">
                                <div className="text-2xl font-royal leading-none">
                                    <span className="font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-500 bg-clip-text text-transparent">Sham</span>
                                    <span className="font-bold bg-gradient-to-r from-blue-700 via-blue-600 to-blue-500 bg-clip-text text-transparent">Bit</span>
                                </div>
                                <div className="text-xs text-gray-500 font-medium">Commerce Platform</div>
                            </div>
                        </a>
                    </motion.div>

                    {/* Navigation - Enhanced */}
                    <nav className="hidden lg:flex items-center gap-8" role="navigation" aria-label="Main navigation">
                        <a 
                            href="#categories" 
                            className="text-gray-700 hover:text-orange-600 font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 rounded px-2 py-1"
                            aria-label="Browse food categories"
                        >
                            Browse Categories
                        </a>
                        
                        {/* Enhanced Sell With Us */}
                        <motion.a 
                            href="#sell" 
                            className="relative px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2"
                            whileHover={{ scale: 1.05, y: -1 }}
                            whileTap={{ scale: 0.95 }}
                            aria-label="Start selling with ShamBit"
                        >
                            <span className="relative z-10">Sell With Us</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" aria-hidden="true"></div>
                        </motion.a>
                        
                        <a 
                            href="#about" 
                            className="text-gray-700 hover:text-blue-600 font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                            aria-label="Learn about ShamBit"
                        >
                            About
                        </a>
                        <a 
                            href="#careers" 
                            className="text-blue-600 hover:text-orange-600 font-semibold transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-2 py-1"
                            aria-label="View career opportunities"
                        >
                            Careers
                        </a>
                    </nav>

                    {/* Right Side - Enhanced */}
                    <div className="flex items-center gap-4">
                        {/* Enhanced Login Button */}
                        <motion.button
                            className="px-8 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                            whileHover={{ scale: 1.05, y: -1 }}
                            whileTap={{ scale: 0.95 }}
                            aria-label="Login to your account"
                        >
                            Login
                        </motion.button>

                        {/* Mobile menu button */}
                        <button 
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-3 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                            aria-expanded={isMenuOpen}
                            aria-controls="mobile-menu"
                            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Enhanced Mobile Menu */}
            {isMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="lg:hidden bg-white border-t border-gray-200 shadow-lg"
                    id="mobile-menu"
                    role="navigation"
                    aria-label="Mobile navigation menu"
                >
                    <div className="container-max py-6">
                        <div className="space-y-4">
                            <a href="#categories" className="block py-3 px-4 text-gray-700 hover:text-orange-600 hover:bg-orange-50 font-medium transition-all rounded-lg">
                                Browse Categories
                            </a>
                            
                            {/* Enhanced Mobile Sell With Us */}
                            <a href="#sell" className="block py-3 px-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-lg shadow-md">
                                Sell With Us ⭐
                            </a>
                            
                            <a href="#about" className="block py-3 px-4 text-gray-700 hover:text-blue-600 hover:bg-blue-50 font-medium transition-all rounded-lg">
                                About
                            </a>
                            <a href="#careers" className="block py-3 px-4 text-blue-600 hover:text-orange-600 hover:bg-blue-50 font-semibold transition-all rounded-lg">
                                Careers
                            </a>
                            
                            {/* Mobile Contact Info */}
                            <div className="pt-4 border-t border-gray-200 space-y-2">
                                <div className="flex items-center gap-2 text-sm text-gray-600 px-4">
                                    <Phone className="w-4 h-4" />
                                    <span>+91 [Phone Number]</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 px-4">
                                    <MessageCircle className="w-4 h-4" />
                                    <span>WhatsApp: [WhatsApp Number]</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-gray-600 px-4">
                                    <Mail className="w-4 h-4" />
                                    <span>[email@shambit.com]</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </motion.div>
            )}
        </motion.header>
    );
};
