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
            className="fixed top-0 left-0 right-0 z-[9999] w-full bg-gradient-to-r from-slate-800 via-blue-900 to-slate-900"
            style={{
                border: 'none',
                outline: 'none',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.3)',
                margin: 0,
                padding: 0
            }}
            role="banner"
            aria-label="Main navigation"
        >
            {/* Top Contact Bar */}
            <div className="bg-gradient-to-r from-teal-500 via-emerald-500 to-cyan-500 py-2">
                <div className="max-w-7xl mx-auto px-4">
                    <div className="flex items-center justify-center md:justify-between text-white text-sm font-medium">
                        {/* Contact Information */}
                        <div className="flex items-center space-x-6">
                            <div className="flex items-center space-x-1">
                                <Phone className="w-4 h-4 text-cyan-200" />
                                <span className="text-white">+91 [Phone Number]</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <MessageCircle className="w-4 h-4 text-cyan-200" />
                                <span className="text-white">WhatsApp: [WhatsApp Number]</span>
                            </div>
                            <div className="flex items-center space-x-1">
                                <Mail className="w-4 h-4 text-cyan-200" />
                                <span className="text-white">[email@shambit.com]</span>
                            </div>
                        </div>

                        {/* Welcome Message */}
                        <div className="hidden md:block text-sm text-white">
                            Welcome to <span className="bg-gradient-to-r from-orange-300 to-yellow-300 bg-clip-text text-transparent font-bold">Sham</span><span className="bg-gradient-to-r from-cyan-300 to-blue-300 bg-clip-text text-transparent font-bold">Bit</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Header */}
            <div className="container-max">
                <div className="flex items-center justify-between h-20">
                    {/* Logo Section */}
                    <motion.div
                        className="flex items-center gap-4"
                        whileHover={{ scale: 1.02 }}
                    >
                        <a href="/" className="flex items-center gap-4 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 rounded-lg" aria-label="ShamBit homepage">
                            <div className="flex items-center justify-center w-14 h-14 bg-white rounded-xl shadow-lg">
                                <img
                                    src={logo}
                                    alt="ShamBit Logo - Premium Food Marketplace"
                                    className="h-10 w-10 object-contain"
                                    loading="eager"
                                />
                            </div>
                            <div className="flex flex-col">
                                <div className="text-2xl font-royal leading-none">
                                    <span className="font-bold bg-gradient-to-r from-orange-300 via-yellow-300 to-amber-300 bg-clip-text text-transparent">Sham</span>
                                    <span className="font-bold bg-gradient-to-r from-cyan-300 via-blue-300 to-indigo-300 bg-clip-text text-transparent">Bit</span>
                                </div>
                                <div className="text-xs text-white font-medium">Commerce Platform</div>
                            </div>
                        </a>
                    </motion.div>

                    {/* Navigation */}
                    <nav className="hidden lg:flex items-center gap-8" role="navigation" aria-label="Main navigation">
                        <a
                            href="#categories"
                            className="text-white hover:text-orange-300 font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2 rounded px-2 py-1"
                            aria-label="Browse food categories"
                        >
                            Browse Categories
                        </a>

                        <motion.a
                            href="#sell"
                            className="relative px-4 py-2 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 group focus:outline-none focus:ring-2 focus:ring-orange-400 focus:ring-offset-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            aria-label="Start selling with ShamBit"
                        >
                            <span className="relative z-10">Sell With Us</span>
                            <div className="absolute inset-0 bg-gradient-to-r from-orange-600 to-yellow-600 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200"></div>
                            <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-400 rounded-full animate-pulse" aria-hidden="true"></div>
                        </motion.a>

                        <a
                            href="#about"
                            className="text-white hover:text-blue-300 font-medium transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 rounded px-2 py-1"
                            aria-label="Learn about ShamBit"
                        >
                            About
                        </a>
                        <a
                            href="#careers"
                            className="text-white hover:text-orange-300 font-semibold transition-all duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-offset-2 rounded px-2 py-1"
                            aria-label="View career opportunities"
                        >
                            Careers
                        </a>

                        <motion.a
                            href="https://marketplace.shambit.com"
                            className="relative px-6 py-3 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 group focus:outline-none focus:ring-2 focus:ring-pink-400 focus:ring-offset-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            aria-label="Visit ShamBit Marketplace"
                        >
                            <span className="relative z-10 flex items-center gap-2">
                                🛒 Visit Marketplace
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-pink-600 via-rose-600 to-orange-600 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-gradient-to-r from-yellow-300 to-amber-300 rounded-full animate-bounce shadow-md" aria-hidden="true">
                                <div className="w-2 h-2 bg-gradient-to-r from-yellow-400 to-amber-400 rounded-full absolute top-1 left-1"></div>
                            </div>
                        </motion.a>
                    </nav>

                    {/* Right Side */}
                    <div className="flex items-center gap-4">
                        <motion.button
                            className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-xl font-semibold shadow-md hover:shadow-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2"
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            aria-label="Login to your account"
                        >
                            Login
                        </motion.button>

                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className="lg:hidden p-3 text-cyan-100 hover:bg-slate-700 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:ring-offset-2"
                            aria-expanded={isMenuOpen}
                            aria-controls="mobile-menu"
                            aria-label={isMenuOpen ? "Close navigation menu" : "Open navigation menu"}
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="lg:hidden bg-gradient-to-b from-slate-800 to-slate-900"
                    style={{ border: 'none', outline: 'none' }}
                    id="mobile-menu"
                    role="navigation"
                    aria-label="Mobile navigation menu"
                >
                    <div className="container-max py-6">
                        <div className="space-y-4">
                            <a href="#categories" className="block py-3 px-4 text-cyan-100 hover:text-orange-300 hover:bg-slate-700 font-medium transition-all rounded-lg">
                                Browse Categories
                            </a>

                            <a href="#sell" className="block py-3 px-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white font-semibold rounded-lg shadow-md">
                                Sell With Us ⭐
                            </a>

                            <a href="#about" className="block py-3 px-4 text-cyan-100 hover:text-blue-300 hover:bg-slate-700 font-medium transition-all rounded-lg">
                                About
                            </a>
                            <a href="#careers" className="block py-3 px-4 text-blue-200 hover:text-orange-300 hover:bg-slate-700 font-semibold transition-all rounded-lg">
                                Careers
                            </a>

                            <a href="https://marketplace.shambit.com" className="block py-4 px-4 bg-gradient-to-r from-pink-500 via-rose-500 to-orange-500 text-white font-bold rounded-xl shadow-lg text-center">
                                🛒 Visit Marketplace
                            </a>

                            <div className="pt-4 space-y-2" style={{ borderTop: '1px solid #475569' }}>
                                <div className="flex items-center gap-2 text-sm text-cyan-200 px-4">
                                    <Phone className="w-4 h-4 text-cyan-300" />
                                    <span>+91 [Phone Number]</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-cyan-200 px-4">
                                    <MessageCircle className="w-4 h-4 text-cyan-300" />
                                    <span>WhatsApp: [WhatsApp Number]</span>
                                </div>
                                <div className="flex items-center gap-2 text-sm text-cyan-200 px-4">
                                    <Mail className="w-4 h-4 text-cyan-300" />
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