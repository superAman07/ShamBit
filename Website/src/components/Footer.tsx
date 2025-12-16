import { motion } from 'framer-motion';

export const Footer = () => {
    return (
        <motion.footer
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="bg-[#142E60] text-[#F5F5F5]"
        >
            {/* Modern Mobile App Section */}
            <div className="bg-gradient-to-r from-slate-100 to-blue-100 py-8 border-b border-gray-200">
                <div className="container-max">
                    <div className="bg-white rounded-2xl shadow-lg p-6 border border-gray-100">
                        {/* Compact Header */}
                        <div className="text-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900 mb-1">
                                Experience ShamBit on Mobile
                            </h3>
                            <p className="text-gray-600 text-sm">
                                Shop and sell on the go with our mobile app
                            </p>
                        </div>
                        
                        {/* Single Row Layout */}
                        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                            {/* App Store Buttons */}
                            <div className="flex gap-3">
                                <motion.a
                                    href="#"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="block"
                                >
                                    <div className="bg-black text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 min-w-[130px]">
                                        <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
                                            <span className="text-sm">📱</span>
                                        </div>
                                        <div className="text-left">
                                            <div className="text-xs text-gray-300 leading-tight">Download on the</div>
                                            <div className="text-sm font-semibold leading-tight">App Store</div>
                                        </div>
                                    </div>
                                </motion.a>
                                
                                <motion.a
                                    href="#"
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    className="block"
                                >
                                    <div className="bg-black text-white px-4 py-2.5 rounded-lg flex items-center gap-2 shadow-md hover:shadow-lg transition-all duration-200 min-w-[130px]">
                                        <div className="w-6 h-6 bg-white/10 rounded flex items-center justify-center">
                                            <span className="text-sm">▶️</span>
                                        </div>
                                        <div className="text-left">
                                            <div className="text-xs text-gray-300 leading-tight">Get it on</div>
                                            <div className="text-sm font-semibold leading-tight">Google Play</div>
                                        </div>
                                    </div>
                                </motion.a>
                            </div>
                            
                            {/* Features - Inline */}
                            <div className="flex flex-wrap justify-center gap-4 lg:gap-6">
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span className="text-gray-700 text-sm font-medium">Fast & Secure Shopping</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span className="text-gray-700 text-sm font-medium">Easy Selling Tools</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    <span className="text-gray-700 text-sm font-medium">Instant Notifications</span>
                                </div>
                            </div>

                            {/* Social Media */}
                            <div className="flex items-center gap-3">
                                <span className="text-gray-900 font-semibold text-sm">Follow Us</span>
                                <div className="flex gap-2">
                                    <motion.a
                                        href="#"
                                        whileHover={{ scale: 1.1, y: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md hover:bg-blue-700 transition-all duration-200"
                                    >
                                        <span className="text-xs font-bold">f</span>
                                    </motion.a>
                                    <motion.a
                                        href="#"
                                        whileHover={{ scale: 1.1, y: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="w-8 h-8 bg-gray-900 text-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md hover:bg-black transition-all duration-200"
                                    >
                                        <span className="text-xs font-bold">𝕏</span>
                                    </motion.a>
                                    <motion.a
                                        href="#"
                                        whileHover={{ scale: 1.1, y: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="w-8 h-8 bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md transition-all duration-200"
                                    >
                                        <span className="text-xs">📷</span>
                                    </motion.a>
                                    <motion.a
                                        href="#"
                                        whileHover={{ scale: 1.1, y: -1 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="w-8 h-8 bg-blue-700 text-white rounded-full flex items-center justify-center shadow-sm hover:shadow-md hover:bg-blue-800 transition-all duration-200"
                                    >
                                        <span className="text-xs font-bold">in</span>
                                    </motion.a>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="container-max py-8">
                <div className="grid md:grid-cols-4 gap-6 mb-6">
                    {/* About ShamBit Column - Blueprint exact copy */}
                    <div>
                        <h3 className="text-lg font-bold text-white mb-4">About ShamBit</h3>
                        <p className="text-sm leading-relaxed">
                            ShamBit Commerce unites global buyers and sellers in an eco-friendly marketplace. We're committed to trust, fairness, and positive impact.
                        </p>
                    </div>
                    
                    {/* Links Column - Blueprint specs */}
                    <div>
                        <h4 className="font-bold text-white mb-4">Links</h4>
                        <ul className="space-y-3 text-sm">
                            <li><a href="#home" className="hover:underline transition-colors">Home</a></li>
                            <li><a href="#how-it-works" className="hover:underline transition-colors">How It Works</a></li>
                            <li><a href="#privacy" className="hover:underline transition-colors">Privacy</a></li>
                            <li><a href="#terms" className="hover:underline transition-colors">Terms</a></li>
                            <li><a href="#faq" className="hover:underline transition-colors">FAQ</a></li>
                        </ul>
                    </div>
                    
                    {/* Careers Column - Blueprint: explicit mention with hyperlink */}
                    <div>
                        <h4 className="font-bold text-white mb-4">Careers</h4>
                        <p className="text-sm mb-3">
                            Join our team! See Careers for open positions.
                        </p>
                        <a href="#careers" className="text-sm font-medium hover:underline transition-colors">
                            View Open Positions →
                        </a>
                    </div>
                    
                    {/* Support & Assistance Column */}
                    <div>
                        <h4 className="font-bold text-white mb-4">Support & Assistance</h4>
                        <div className="space-y-3 text-sm">
                            <div>
                                <div className="text-white/90 font-medium mb-1">Email:</div>
                                <a href="mailto:support@shambit.com" className="text-orange-300 hover:text-orange-200 hover:underline transition-colors block">
                                    support@shambit.com
                                </a>
                            </div>
                            
                            <div className="flex items-center gap-2 text-white/90">
                                <span>💬</span>
                                <span>WhatsApp support available</span>
                            </div>
                            
                            <div className="flex items-center gap-2 text-white/90">
                                <span>⏱️</span>
                                <span>Response time: Within 24 working hours</span>
                            </div>
                            
                            {/* Trust badges */}
                            <div className="space-y-2 pt-3 border-t border-white/20">
                                <div className="flex items-center gap-2 text-xs text-white/80">
                                    <span>🔒</span>
                                    <span>SSL Secured</span>
                                </div>
                                <div className="flex items-center gap-2 text-xs text-white/80">
                                    <span>💳</span>
                                    <span>Secure Payments</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                {/* Confidence Building Message */}
                <div className="border-t border-white/20 pt-6 pb-4 text-center">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="bg-gradient-to-r from-orange-500/10 to-blue-500/10 rounded-xl p-6 mb-6"
                    >
                        <p className="text-lg font-semibold text-white/95 italic">
                            "We believe real support builds real businesses."
                        </p>
                    </motion.div>
                </div>

                {/* Bottom Bar with ownership */}
                <div className="text-center">
                    <div className="flex flex-col items-center gap-4">
                        {/* ShamBit Commerce ownership */}
                        <div className="text-center">
                            <div className="text-lg font-bold mb-2">
                                <span className="bg-gradient-to-r from-orange-400 to-yellow-400 bg-clip-text text-transparent">Sham</span>
                                <span className="bg-gradient-to-r from-blue-400 to-blue-300 bg-clip-text text-transparent">Bit</span>
                                <span className="text-white/90 ml-2">Commerce</span>
                            </div>
                            <p className="text-sm text-[#F5F5F5]/80 mb-2">
                                ShamBit Commerce is the parent company of ShamBit
                            </p>
                        </div>
                        
                        {/* Legal Disclaimer */}
                        <div className="text-xs text-[#F5F5F5]/60 max-w-4xl mx-auto mb-4 leading-relaxed">
                            <p className="mb-2">
                                <strong>Verification Disclaimer:</strong> Verification is based on submitted documents and internal review processes. 
                                While we strive for accuracy, ShamBit cannot guarantee the completeness or accuracy of all seller information. 
                                Users are encouraged to exercise due diligence when making purchases.
                            </p>
                        </div>
                        
                        {/* Copyright */}
                        <p className="text-xs text-[#F5F5F5]/70">
                            © 2025 ShamBit Commerce. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </motion.footer>
    );
};