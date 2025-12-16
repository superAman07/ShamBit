import { motion } from 'framer-motion';

export const AppDownload = () => {
    return (
        <section className="bg-gradient-to-br from-slate-100 via-gray-50 to-blue-50 py-4 relative overflow-hidden">
            {/* Subtle background animation */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div 
                    animate={{ 
                        rotate: 360,
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ 
                        duration: 40,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-r from-blue-400/10 to-purple-400/10 rounded-full blur-2xl"
                />
                <motion.div 
                    animate={{ 
                        rotate: -360,
                        scale: [1.1, 1, 1.1],
                    }}
                    transition={{ 
                        duration: 35,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -bottom-20 -left-20 w-48 h-48 bg-gradient-to-r from-orange-400/10 to-pink-400/10 rounded-full blur-2xl"
                />
            </div>

            <div className="max-w-4xl mx-auto px-4 relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-white/50"
                >
                    <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
                        {/* Download App Section */}
                        <div className="flex flex-col sm:flex-row items-center gap-4">
                            <motion.h3 
                                className="text-lg font-bold bg-gradient-to-r from-gray-700 to-gray-800 bg-clip-text text-transparent"
                                whileHover={{ scale: 1.05 }}
                            >
                                Download App
                            </motion.h3>
                            <div className="flex gap-3">
                                <motion.a
                                    href="#"
                                    whileHover={{ 
                                        scale: 1.08, 
                                        y: -3,
                                        boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    className="block"
                                >
                                    <div className="bg-gradient-to-br from-indigo-500 to-purple-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg border border-indigo-400/30 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                                        <div className="text-lg relative z-10">📱</div>
                                        <div className="relative z-10">
                                            <div className="text-xs text-indigo-100">Download on the</div>
                                            <div className="text-sm font-bold">App Store</div>
                                        </div>
                                    </div>
                                </motion.a>
                                <motion.a
                                    href="#"
                                    whileHover={{ 
                                        scale: 1.08, 
                                        y: -3,
                                        boxShadow: "0 10px 25px rgba(0,0,0,0.15)"
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    className="block"
                                >
                                    <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 shadow-lg border border-emerald-400/30 relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-transparent"></div>
                                        <div className="text-lg relative z-10">▶️</div>
                                        <div className="relative z-10">
                                            <div className="text-xs text-emerald-100">Get it on</div>
                                            <div className="text-sm font-bold">Google Play</div>
                                        </div>
                                    </div>
                                </motion.a>
                            </div>
                        </div>

                        {/* Social Media Section */}
                        <div className="flex items-center gap-4">
                            <motion.h3 
                                className="text-lg font-bold bg-gradient-to-r from-gray-700 to-gray-800 bg-clip-text text-transparent"
                                whileHover={{ scale: 1.05 }}
                            >
                                Follow Us
                            </motion.h3>
                            <div className="flex gap-2">
                                <motion.a
                                    href="#"
                                    whileHover={{ 
                                        scale: 1.15, 
                                        y: -2,
                                        boxShadow: "0 8px 20px rgba(59, 89, 152, 0.4)"
                                    }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/20"></div>
                                    <span className="text-sm font-bold relative z-10">f</span>
                                </motion.a>
                                <motion.a
                                    href="#"
                                    whileHover={{ 
                                        scale: 1.15, 
                                        y: -2,
                                        boxShadow: "0 8px 20px rgba(71, 85, 105, 0.4)"
                                    }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-10 h-10 bg-gradient-to-br from-slate-600 to-slate-700 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-slate-800/20 to-white/20"></div>
                                    <span className="text-sm font-bold relative z-10">𝕏</span>
                                </motion.a>
                                <motion.a
                                    href="#"
                                    whileHover={{ 
                                        scale: 1.15, 
                                        y: -2,
                                        boxShadow: "0 8px 20px rgba(225, 48, 108, 0.4)"
                                    }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-10 h-10 bg-gradient-to-br from-pink-500 to-purple-600 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/20"></div>
                                    <span className="text-sm font-bold relative z-10">📷</span>
                                </motion.a>
                                <motion.a
                                    href="#"
                                    whileHover={{ 
                                        scale: 1.15, 
                                        y: -2,
                                        boxShadow: "0 8px 20px rgba(0, 119, 181, 0.4)"
                                    }}
                                    whileTap={{ scale: 0.9 }}
                                    className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full flex items-center justify-center shadow-lg border-2 border-white/30 relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-white/20"></div>
                                    <span className="text-sm font-bold relative z-10">in</span>
                                </motion.a>
                            </div>
                        </div>
                    </div>
                </motion.div>
            </div>
        </section>
    );
};