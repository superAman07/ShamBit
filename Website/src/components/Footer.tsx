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
            {/* App Download Section */}
            <div className="bg-gray-50 py-8">
                <div className="container-max">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-8">
                        {/* Download App Section */}
                        <div className="flex flex-col sm:flex-row items-center gap-6">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Download App
                            </h3>
                            <div className="flex gap-4">
                                <motion.a
                                    href="#"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="block"
                                >
                                    <div className="bg-black text-white px-6 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 transition-colors">
                                        <div className="text-2xl">📱</div>
                                        <div>
                                            <div className="text-xs text-gray-300">Download on the</div>
                                            <div className="text-sm font-semibold">App Store</div>
                                        </div>
                                    </div>
                                </motion.a>
                                <motion.a
                                    href="#"
                                    whileHover={{ scale: 1.05 }}
                                    whileTap={{ scale: 0.95 }}
                                    className="block"
                                >
                                    <div className="bg-black text-white px-6 py-3 rounded-lg flex items-center gap-3 hover:bg-gray-800 transition-colors">
                                        <div className="text-2xl">▶️</div>
                                        <div>
                                            <div className="text-xs text-gray-300">Get it on</div>
                                            <div className="text-sm font-semibold">Google Play</div>
                                        </div>
                                    </div>
                                </motion.a>
                            </div>
                        </div>

                        {/* Social Media Section */}
                        <div className="flex items-center gap-6">
                            <h3 className="text-lg font-semibold text-gray-800">
                                Follow Us
                            </h3>
                            <div className="flex gap-3">
                                <motion.a
                                    href="#"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-blue-600 transition-colors"
                                >
                                    <span className="text-sm font-bold">f</span>
                                </motion.a>
                                <motion.a
                                    href="#"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-black transition-colors"
                                >
                                    <span className="text-sm font-bold">𝕏</span>
                                </motion.a>
                                <motion.a
                                    href="#"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-pink-500 transition-colors"
                                >
                                    <span className="text-sm font-bold">📷</span>
                                </motion.a>
                                <motion.a
                                    href="#"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-10 h-10 bg-gray-800 text-white rounded-full flex items-center justify-center hover:bg-blue-700 transition-colors"
                                >
                                    <span className="text-sm font-bold">in</span>
                                </motion.a>
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