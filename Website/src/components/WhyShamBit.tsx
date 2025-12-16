import { motion } from 'framer-motion';
import { Package, Shield, Leaf, Users } from 'lucide-react';

export const WhyShamBit = () => {
    const benefits = [
        {
            icon: Shield,
            title: "No Hidden Charges",
            description: "Transparent pricing with no surprise penalties. What you see is what you pay - always."
        },
        {
            icon: Package,
            title: "Very Low Commissions",
            description: "Affordable onboarding fees and competitive commission rates designed for small sellers to thrive."
        },
        {
            icon: Users,
            title: "Simple Dashboard",
            description: "Built specifically for first-time online sellers. Easy to use, no technical expertise required."
        },
        {
            icon: Leaf,
            title: "Human Support",
            description: "Real people, not just automated tickets. Get help when you need it from our dedicated support team."
        }
    ];

    return (
        <section className="section-padding bg-gradient-to-br from-purple-100 via-pink-50 to-orange-100 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div 
                    animate={{ 
                        rotate: 360,
                        scale: [1, 1.2, 1],
                    }}
                    transition={{ 
                        duration: 20,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -top-20 -left-20 w-40 h-40 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-xl"
                />
                <motion.div 
                    animate={{ 
                        rotate: -360,
                        scale: [1.2, 1, 1.2],
                    }}
                    transition={{ 
                        duration: 25,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -bottom-20 -right-20 w-60 h-60 bg-gradient-to-r from-orange-400/20 to-pink-400/20 rounded-full blur-xl"
                />
                <motion.div 
                    animate={{ 
                        y: [-20, 20, -20],
                        x: [-10, 10, -10],
                    }}
                    transition={{ 
                        duration: 15,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute top-1/2 left-1/4 w-32 h-32 bg-gradient-to-r from-green-400/15 to-blue-400/15 rounded-full blur-2xl"
                />
            </div>
            <div className="container-max relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <motion.h2 
                        className="text-3xl md:text-4xl font-bold mb-6 text-gray-800"
                        whileHover={{ scale: 1.05 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        Why Sellers Choose <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent animate-pulse">Sham</span><span className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent animate-pulse">Bit</span>
                    </motion.h2>
                    <motion.p 
                        className="text-lg bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-clip-text text-transparent max-w-3xl mx-auto font-semibold"
                        whileHover={{ scale: 1.02 }}
                    >
                        Every seller verified before going live. Join thousands of successful sellers who trust us with their business.
                    </motion.p>
                </motion.div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {benefits.map((benefit, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -4, scale: 1.01 }}
                            className="group cursor-pointer"
                        >
                            <div className={`
                                relative p-3 rounded-xl h-full
                                ${index === 0 ? 'bg-gradient-to-br from-green-50/90 via-emerald-50/90 to-teal-50/90' :
                                  index === 1 ? 'bg-gradient-to-br from-orange-50/90 via-yellow-50/90 to-amber-50/90' :
                                  index === 2 ? 'bg-gradient-to-br from-blue-50/90 via-indigo-50/90 to-cyan-50/90' :
                                  'bg-gradient-to-br from-purple-50/90 via-pink-50/90 to-rose-50/90'
                                } backdrop-blur-sm
                                shadow-xl ${index === 0 ? 'shadow-green-200/50' :
                                           index === 1 ? 'shadow-orange-200/50' :
                                           index === 2 ? 'shadow-blue-200/50' :
                                           'shadow-purple-200/50'
                                } border-2 ${index === 0 ? 'border-green-200/60' :
                                            index === 1 ? 'border-orange-200/60' :
                                            index === 2 ? 'border-blue-200/60' :
                                            'border-purple-200/60'
                                }
                                hover:shadow-2xl hover:${index === 0 ? 'shadow-green-300/60' :
                                                       index === 1 ? 'shadow-orange-300/60' :
                                                       index === 2 ? 'shadow-blue-300/60' :
                                                       'shadow-purple-300/60'
                                }
                                hover:border-${index === 0 ? 'green-300/80' :
                                              index === 1 ? 'orange-300/80' :
                                              index === 2 ? 'blue-300/80' :
                                              'purple-300/80'
                                }
                                transition-all duration-500 transform-gpu
                                text-center
                                before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl
                                before:bg-gradient-to-br before:from-white/60 before:via-white/30 before:to-transparent
                                before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
                                after:absolute after:inset-0 after:rounded-2xl sm:after:rounded-3xl
                                after:bg-gradient-to-t after:from-${index === 0 ? 'green' :
                                                                  index === 1 ? 'orange' :
                                                                  index === 2 ? 'blue' :
                                                                  'purple'
                                }-100/20 after:to-transparent
                                overflow-hidden group-hover:animate-pulse
                            `}>
                                <motion.div 
                                    whileHover={{ 
                                        scale: 1.15, 
                                        rotate: [0, -5, 5, -5, 0],
                                        y: -5
                                    }}
                                    animate={{
                                        boxShadow: [
                                            "0 10px 30px rgba(0,0,0,0.1)",
                                            "0 15px 40px rgba(0,0,0,0.15)",
                                            "0 10px 30px rgba(0,0,0,0.1)"
                                        ]
                                    }}
                                    transition={{ 
                                        boxShadow: { duration: 3, repeat: Infinity },
                                        hover: { type: "spring", stiffness: 400, damping: 10 }
                                    }}
                                    className={`w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-2 
                                        shadow-2xl border-2 border-white/40
                                        group-hover:shadow-3xl
                                        transition-all duration-500 transform-gpu
                                        relative overflow-hidden z-10
                                        ${index === 0 ? 'bg-gradient-to-br from-green-300 via-emerald-400 to-teal-500 shadow-green-400/40 group-hover:shadow-green-500/60' :
                                          index === 1 ? 'bg-gradient-to-br from-orange-300 via-amber-400 to-yellow-500 shadow-orange-400/40 group-hover:shadow-orange-500/60' :
                                          index === 2 ? 'bg-gradient-to-br from-blue-300 via-indigo-400 to-cyan-500 shadow-blue-400/40 group-hover:shadow-blue-500/60' :
                                          'bg-gradient-to-br from-purple-300 via-pink-400 to-rose-500 shadow-purple-400/40 group-hover:shadow-purple-500/60'
                                        }
                                        before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/5 before:to-transparent
                                        after:absolute after:inset-0 after:bg-gradient-to-br after:from-white/30 after:via-transparent after:to-transparent
                                    `}
                                >
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-2 rounded-full bg-gradient-to-r from-white/20 to-transparent"
                                    />
                                    <benefit.icon className="w-6 h-6 text-white drop-shadow-lg relative z-10" />
                                </motion.div>
                                
                                <motion.h3 
                                    className={`text-sm font-bold mb-1 relative z-10 text-center ${
                                        index === 0 ? 'bg-gradient-to-r from-green-700 to-emerald-800 bg-clip-text text-transparent' :
                                        index === 1 ? 'bg-gradient-to-r from-orange-700 to-amber-800 bg-clip-text text-transparent' :
                                        index === 2 ? 'bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent' :
                                        'bg-gradient-to-r from-purple-700 to-pink-800 bg-clip-text text-transparent'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    {benefit.title}
                                </motion.h3>
                                
                                <motion.p 
                                    className="text-xs text-gray-600 leading-tight font-medium relative z-10 text-center"
                                    whileHover={{ scale: 1.01 }}
                                >
                                    {benefit.description}
                                </motion.p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};