import { motion } from 'framer-motion';
import { ArrowRight, CheckCircle, Users, FileText, Shield } from 'lucide-react';

export const SellerCTA = () => {
    return (
        <section className="section-padding bg-gradient-to-br from-emerald-100 via-teal-50 to-cyan-100 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div 
                    animate={{ 
                        rotate: 360,
                        scale: [1, 1.4, 1],
                    }}
                    transition={{ 
                        duration: 28,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -top-40 -left-40 w-80 h-80 bg-gradient-to-r from-emerald-400/20 to-teal-400/20 rounded-full blur-3xl"
                />
                <motion.div 
                    animate={{ 
                        rotate: -360,
                        scale: [1.2, 1, 1.2],
                    }}
                    transition={{ 
                        duration: 35,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -bottom-40 -right-40 w-96 h-96 bg-gradient-to-r from-cyan-400/20 to-blue-400/20 rounded-full blur-3xl"
                />
                <motion.div 
                    animate={{ 
                        y: [-25, 25, -25],
                        x: [-12, 12, -12],
                    }}
                    transition={{ 
                        duration: 18,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute top-1/4 left-1/3 w-56 h-56 bg-gradient-to-r from-orange-400/15 to-yellow-400/15 rounded-full blur-2xl"
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
                    <motion.h2 
                        className="text-3xl md:text-5xl font-bold mb-6"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <span className="bg-gradient-to-r from-gray-800 to-gray-700 bg-clip-text text-transparent">
                            Start Selling with
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent animate-pulse">
                            Confidence
                        </span>
                    </motion.h2>
                    
                    <motion.p 
                        className="text-xl text-gray-700 mb-10 max-w-3xl mx-auto font-semibold"
                        whileHover={{ scale: 1.02 }}
                    >
                        Join thousands of successful sellers who trust ShamBit with their business growth
                    </motion.p>
                    
                    {/* Main CTA Button */}
                    <motion.button
                        whileHover={{ 
                            scale: 1.08, 
                            y: -5,
                            boxShadow: "0 20px 40px rgba(0,0,0,0.2)"
                        }}
                        whileTap={{ scale: 0.95 }}
                        animate={{
                            boxShadow: [
                                "0 10px 30px rgba(251, 146, 60, 0.3)",
                                "0 15px 40px rgba(251, 146, 60, 0.4)",
                                "0 10px 30px rgba(251, 146, 60, 0.3)"
                            ]
                        }}
                        transition={{ 
                            boxShadow: { duration: 3, repeat: Infinity },
                            hover: { type: "spring", stiffness: 400, damping: 10 }
                        }}
                        className="inline-flex items-center gap-4 px-10 py-5 bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white font-bold text-xl rounded-2xl shadow-2xl hover:shadow-3xl transition-all duration-300 mb-12 relative overflow-hidden border-2 border-white/30"
                    >
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                            className="absolute inset-2 rounded-xl bg-gradient-to-r from-white/10 to-transparent"
                        />
                        <span className="relative z-10">Sell With Us</span>
                        <motion.div
                            whileHover={{ x: 5 }}
                            className="relative z-10"
                        >
                            <ArrowRight className="w-7 h-7" />
                        </motion.div>
                    </motion.button>
                    
                    {/* Feature Cards */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                        {[
                            {
                                icon: CheckCircle,
                                title: "Zero Complex Paperwork",
                                description: "Simple registration process with minimal documentation required",
                                color: "green"
                            },
                            {
                                icon: FileText,
                                title: "Affordable Onboarding",
                                description: "Much lower fees than big platforms - perfect for small businesses",
                                color: "blue"
                            },
                            {
                                icon: Users,
                                title: "Open to Everyone",
                                description: "Small shops, home sellers, growing brands - all welcome",
                                color: "purple"
                            },
                            {
                                icon: Shield,
                                title: "Quality Assured",
                                description: "Every seller audited & approved for quality assurance",
                                color: "orange"
                            }
                        ].map((feature, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.4, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                whileHover={{ y: -8, scale: 1.03 }}
                                className="group cursor-pointer"
                            >
                                <div className={`
                                    relative p-4 rounded-2xl h-full
                                    ${feature.color === 'green' ? 'bg-gradient-to-br from-green-50/95 via-emerald-50/95 to-teal-50/95' :
                                      feature.color === 'blue' ? 'bg-gradient-to-br from-blue-50/95 via-indigo-50/95 to-cyan-50/95' :
                                      feature.color === 'purple' ? 'bg-gradient-to-br from-purple-50/95 via-violet-50/95 to-fuchsia-50/95' :
                                      'bg-gradient-to-br from-orange-50/95 via-amber-50/95 to-yellow-50/95'
                                    } backdrop-blur-sm
                                    shadow-xl ${feature.color === 'green' ? 'shadow-green-200/40' :
                                               feature.color === 'blue' ? 'shadow-blue-200/40' :
                                               feature.color === 'purple' ? 'shadow-purple-200/40' :
                                               'shadow-orange-200/40'
                                    } border-2 ${feature.color === 'green' ? 'border-green-200/50' :
                                                feature.color === 'blue' ? 'border-blue-200/50' :
                                                feature.color === 'purple' ? 'border-purple-200/50' :
                                                'border-orange-200/50'
                                    }
                                    hover:shadow-2xl hover:${feature.color === 'green' ? 'shadow-green-300/60' :
                                                           feature.color === 'blue' ? 'shadow-blue-300/60' :
                                                           feature.color === 'purple' ? 'shadow-purple-300/60' :
                                                           'shadow-orange-300/60'
                                    }
                                    hover:border-${feature.color === 'green' ? 'green-300/70' :
                                                  feature.color === 'blue' ? 'blue-300/70' :
                                                  feature.color === 'purple' ? 'purple-300/70' :
                                                  'orange-300/70'
                                    }
                                    transition-all duration-500 transform-gpu
                                    text-center
                                    before:absolute before:inset-0 before:rounded-2xl
                                    before:bg-gradient-to-br before:from-white/50 before:via-white/20 before:to-transparent
                                    before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
                                    overflow-hidden
                                `}>
                                    <motion.div 
                                        whileHover={{ 
                                            scale: 1.15, 
                                            rotate: [0, -8, 8, -4, 0],
                                        }}
                                        className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 
                                            shadow-lg border-2 border-white/40
                                            transition-all duration-300 transform-gpu
                                            relative overflow-hidden z-10
                                            ${feature.color === 'green' ? 'bg-gradient-to-br from-green-400 to-emerald-600 shadow-green-400/50' :
                                              feature.color === 'blue' ? 'bg-gradient-to-br from-blue-400 to-indigo-600 shadow-blue-400/50' :
                                              feature.color === 'purple' ? 'bg-gradient-to-br from-purple-400 to-fuchsia-600 shadow-purple-400/50' :
                                              'bg-gradient-to-br from-orange-400 to-yellow-600 shadow-orange-400/50'
                                            }
                                        `}
                                    >
                                        <feature.icon className="w-6 h-6 text-white drop-shadow-lg relative z-10" />
                                    </motion.div>
                                    
                                    <h3 className={`text-lg font-bold mb-2 relative z-10 ${
                                        feature.color === 'green' ? 'bg-gradient-to-r from-green-700 to-emerald-800 bg-clip-text text-transparent' :
                                        feature.color === 'blue' ? 'bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent' :
                                        feature.color === 'purple' ? 'bg-gradient-to-r from-purple-700 to-fuchsia-800 bg-clip-text text-transparent' :
                                        'bg-gradient-to-r from-orange-700 to-amber-800 bg-clip-text text-transparent'
                                    }`}>
                                        {feature.title}
                                    </h3>
                                    
                                    <p className="text-sm text-gray-600 leading-relaxed font-medium relative z-10">
                                        {feature.description}
                                    </p>
                                </div>
                            </motion.div>
                        ))}
                    </div>

                    {/* Key Message Card */}
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        viewport={{ once: true }}
                        whileHover={{ scale: 1.02, y: -3 }}
                        className="bg-gradient-to-br from-white/90 via-gray-50/90 to-white/90 backdrop-blur-sm rounded-3xl p-8 shadow-2xl border-2 border-white/60 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-100/20 via-transparent to-orange-100/20"></div>
                        <div className="relative z-10 text-center">
                            <motion.p 
                                className="text-xl font-bold"
                                whileHover={{ scale: 1.05 }}
                            >
                                <span className="bg-gradient-to-r from-green-600 to-emerald-700 bg-clip-text text-transparent">Anyone can register</span>
                                <span className="text-gray-400 mx-3">•</span>
                                <span className="bg-gradient-to-r from-blue-600 to-indigo-700 bg-clip-text text-transparent">Not restricted</span>
                                <span className="text-gray-400 mx-3">•</span>
                                <span className="bg-gradient-to-r from-orange-600 to-red-700 bg-clip-text text-transparent">But verified & controlled</span>
                            </motion.p>
                        </div>
                    </motion.div>
                    
                    {/* Additional Trust Elements */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                        viewport={{ once: true }}
                        className="flex justify-center gap-8 mt-6 text-xs text-gray-500"
                    >
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Quick Setup</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>24/7 Support</span>
                        </div>
                        <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                            <span>Verified Community</span>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </section>
    );
};