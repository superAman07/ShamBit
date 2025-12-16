import { motion } from 'framer-motion';
import { Lock } from 'lucide-react';

export const Newsletter = () => {
    return (
        <section className="section-padding bg-gradient-to-br from-violet-100 via-fuchsia-50 to-pink-100 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div 
                    animate={{ 
                        rotate: 360,
                        scale: [1, 1.5, 1],
                    }}
                    transition={{ 
                        duration: 32,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -top-48 -right-48 w-96 h-96 bg-gradient-to-r from-violet-400/25 to-purple-400/25 rounded-full blur-3xl"
                />
                <motion.div 
                    animate={{ 
                        rotate: -360,
                        scale: [1.3, 1, 1.3],
                    }}
                    transition={{ 
                        duration: 40,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -bottom-48 -left-48 w-[28rem] h-[28rem] bg-gradient-to-r from-fuchsia-400/25 to-pink-400/25 rounded-full blur-3xl"
                />
                <motion.div 
                    animate={{ 
                        y: [-35, 35, -35],
                        x: [-18, 18, -18],
                    }}
                    transition={{ 
                        duration: 22,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute top-1/3 right-1/3 w-64 h-64 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-2xl"
                />
                <motion.div 
                    animate={{ 
                        y: [25, -25, 25],
                        x: [15, -15, 15],
                    }}
                    transition={{ 
                        duration: 26,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute bottom-1/4 left-1/4 w-48 h-48 bg-gradient-to-r from-orange-400/15 to-yellow-400/15 rounded-full blur-2xl"
                />
            </div>
            <div className="container-max relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center max-w-4xl mx-auto"
                >
                    {/* Main Content Card */}
                    <motion.div
                        whileHover={{ y: -5, scale: 1.01 }}
                        className="bg-gradient-to-br from-white/95 via-gray-50/95 to-white/95 backdrop-blur-sm rounded-3xl p-8 sm:p-12 shadow-2xl border-2 border-white/60 relative overflow-hidden mb-8"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-violet-100/30 via-transparent to-pink-100/30"></div>
                        <div className="relative z-10">
                            <motion.h2 
                                className="text-4xl md:text-6xl font-bold mb-8"
                                whileHover={{ scale: 1.02 }}
                                transition={{ type: "spring", stiffness: 300 }}
                            >
                                <span className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-400 bg-clip-text text-transparent">
                                    Sham
                                </span>
                                <span className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent">
                                    Bit
                                </span>
                                <span className="text-gray-800"> is </span>
                                <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
                                    launching soon!
                                </span>
                            </motion.h2>
                            
                            <motion.p 
                                className="text-xl text-gray-700 mb-12 font-semibold max-w-3xl mx-auto leading-relaxed"
                                whileHover={{ scale: 1.02 }}
                            >
                                Sign up to be the first to shop and sell in a marketplace built on 
                                <span className="bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent font-bold"> trust</span>, 
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent font-bold"> community</span>, and 
                                <span className="bg-gradient-to-r from-purple-600 to-violet-700 bg-clip-text text-transparent font-bold"> sustainability</span>.
                            </motion.p>
                            
                            {/* Enhanced Email Signup */}
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: 0.3 }}
                                viewport={{ once: true }}
                                className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto mb-8"
                            >
                                <motion.input
                                    whileFocus={{ scale: 1.02 }}
                                    type="email"
                                    placeholder="Your email address"
                                    className="flex-1 px-6 py-4 border-2 border-violet-200 rounded-2xl bg-white/90 backdrop-blur-sm text-gray-800 placeholder-gray-500 focus:outline-none focus:ring-4 focus:ring-violet-300/50 focus:border-violet-400 transition-all duration-300 font-medium shadow-lg text-lg"
                                />
                                <motion.button
                                    whileHover={{ 
                                        scale: 1.05, 
                                        y: -2,
                                        boxShadow: "0 15px 35px rgba(0,0,0,0.2)"
                                    }}
                                    whileTap={{ scale: 0.95 }}
                                    animate={{
                                        boxShadow: [
                                            "0 8px 25px rgba(139, 92, 246, 0.3)",
                                            "0 12px 35px rgba(139, 92, 246, 0.4)",
                                            "0 8px 25px rgba(139, 92, 246, 0.3)"
                                        ]
                                    }}
                                    transition={{ 
                                        boxShadow: { duration: 3, repeat: Infinity }
                                    }}
                                    className="px-8 py-4 bg-gradient-to-r from-violet-500 via-purple-500 to-fuchsia-500 text-white font-bold text-lg rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-300 whitespace-nowrap relative overflow-hidden border-2 border-white/30"
                                >
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-2 rounded-xl bg-gradient-to-r from-white/10 to-transparent"
                                    />
                                    <span className="relative z-10">Sign Me Up</span>
                                </motion.button>
                            </motion.div>
                            
                            {/* Security Badge */}
                            <motion.div 
                                initial={{ opacity: 0 }}
                                whileInView={{ opacity: 1 }}
                                transition={{ duration: 0.6, delay: 0.6 }}
                                viewport={{ once: true }}
                                whileHover={{ scale: 1.05 }}
                                className="inline-flex items-center gap-3 bg-gradient-to-r from-green-50 to-emerald-50 px-6 py-3 rounded-2xl border-2 border-green-200/50 shadow-lg"
                            >
                                <motion.div
                                    animate={{ rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity }}
                                    className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-600 rounded-full flex items-center justify-center shadow-lg"
                                >
                                    <Lock className="w-4 h-4 text-white" />
                                </motion.div>
                                <span className="text-green-700 font-semibold text-lg">Secure signup - We respect your privacy and won't spam</span>
                            </motion.div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};