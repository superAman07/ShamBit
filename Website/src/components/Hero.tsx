import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Shield, Leaf, Lock, Heart, Zap, Award, Users, Globe } from 'lucide-react';
import { useState, useEffect } from 'react';
import logo from '../assets/logo.png';

export const Hero = () => {
    // 8 key ShamBit benefits organized in 2 groups of 4
    const benefitGroups = [
        [
            { icon: Shield, text: "Verified sellers", color: "text-blue-500" },
            { icon: Lock, text: "Secure payments", color: "text-green-500" },
            { icon: Award, text: "Quality assured", color: "text-purple-500" },
            { icon: Leaf, text: "Eco-friendly", color: "text-green-500" }
        ],
        [
            { icon: Zap, text: "Lightning fast", color: "text-orange-500" },
            { icon: Users, text: "Trusted community", color: "text-blue-500" },
            { icon: Globe, text: "Pan-India delivery", color: "text-green-500" },
            { icon: Heart, text: "Community driven", color: "text-pink-500" }
        ]
    ];

    const [currentGroupIndex, setCurrentGroupIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentGroupIndex((prev) => (prev + 1) % benefitGroups.length);
        }, 4000); // Change every 4 seconds

        return () => clearInterval(interval);
    }, []);

    const currentBenefits = benefitGroups[currentGroupIndex];



    return (
        <section className="gradient-hero h-[80vh] flex items-center py-8 pt-12 md:pt-8">
            <div className="container-max">
                <div className="text-center max-w-4xl mx-auto space-y-6">
                    {/* Logo with glow animation */}
                    <motion.div 
                        className="flex justify-center mb-4"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 1.2, ease: "easeOut" }}
                    >
                        <motion.img 
                            src={logo} 
                            alt="ShamBit Logo" 
                            className="h-24 w-24 md:h-32 md:w-32 object-contain"
                            animate={{ 
                                filter: [
                                    'drop-shadow(0 0 20px rgba(255, 140, 0, 0.4))',
                                    'drop-shadow(0 0 30px rgba(30, 64, 175, 0.4))',
                                    'drop-shadow(0 0 25px rgba(255, 140, 0, 0.5))',
                                    'drop-shadow(0 0 35px rgba(30, 64, 175, 0.5))'
                                ]
                            }}
                            transition={{ 
                                duration: 4, 
                                repeat: Infinity, 
                                ease: "easeInOut" 
                            }}
                        />
                    </motion.div>
                    
                    {/* ShamBit name with king-like font and gradients */}
                    <motion.div 
                        className="mb-4"
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 0.3 }}
                    >
                        <div className="text-4xl md:text-6xl lg:text-7xl font-royal leading-none">
                            <motion.span 
                                className="bg-gradient-to-r from-orange-600 via-orange-500 to-yellow-400 bg-clip-text text-transparent"
                                animate={{ 
                                    backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                                }}
                                transition={{ 
                                    duration: 3, 
                                    repeat: Infinity, 
                                    ease: "easeInOut" 
                                }}
                                style={{ 
                                    backgroundSize: '300% 300%',
                                    filter: 'drop-shadow(0 0 10px rgba(255, 140, 0, 0.5))'
                                }}
                            >
                                Sham
                            </motion.span>
                            <motion.span 
                                className="bg-gradient-to-r from-blue-800 via-blue-600 to-blue-400 bg-clip-text text-transparent"
                                animate={{ 
                                    backgroundPosition: ['100% 50%', '0% 50%', '100% 50%']
                                }}
                                transition={{ 
                                    duration: 3, 
                                    repeat: Infinity, 
                                    ease: "easeInOut",
                                    delay: 0.5
                                }}
                                style={{ 
                                    backgroundSize: '300% 300%',
                                    filter: 'drop-shadow(0 0 10px rgba(30, 64, 175, 0.5))'
                                }}
                            >
                                Bit
                            </motion.span>
                        </div>
                    </motion.div>

                    {/* Your tagline with interesting styling */}
                    <motion.div 
                        className="text-lg md:text-xl lg:text-2xl font-semibold mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 0.6 }}
                    >
                        <span className="text-gray-600">"A </span>
                        <motion.span 
                            className="bg-gradient-to-r from-orange-500 to-yellow-400 bg-clip-text text-transparent font-bold"
                            animate={{ 
                                backgroundPosition: ['0% 50%', '100% 50%', '0% 50%']
                            }}
                            transition={{ 
                                duration: 2, 
                                repeat: Infinity, 
                                ease: "easeInOut" 
                            }}
                            style={{ backgroundSize: '200% 200%' }}
                        >
                            bit
                        </motion.span>
                        <span className="text-gray-600"> of </span>
                        <motion.span 
                            className="bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent font-bold"
                            animate={{ 
                                backgroundPosition: ['100% 50%', '0% 50%', '100% 50%']
                            }}
                            transition={{ 
                                duration: 2, 
                                repeat: Infinity, 
                                ease: "easeInOut",
                                delay: 0.3
                            }}
                            style={{ backgroundSize: '200% 200%' }}
                        >
                            goodness
                        </motion.span>
                        <span className="text-gray-600"> in every deal"</span>
                    </motion.div>



                    <motion.p 
                        className="text-base text-gray-700 max-w-2xl mx-auto leading-relaxed mb-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1 }}
                    >
                        Shop consciously and sell confidently on ShamBit. We connect people and planet through every transaction.
                    </motion.p>

                    {/* Animated Trust Badges with Cycling Benefits */}
                    <motion.div 
                        className="flex flex-wrap justify-center gap-3 py-4 min-h-[4rem] items-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1 }}
                    >
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentGroupIndex}
                                className="flex flex-wrap justify-center gap-3"
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                transition={{ duration: 0.4 }}
                            >
                                {currentBenefits.map((benefit, index) => {
                                    const IconComponent = benefit.icon;
                                    return (
                                        <motion.div
                                            key={index}
                                            className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium text-gray-700 shadow-lg backdrop-blur-sm border border-white/50"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ 
                                                opacity: 1, 
                                                scale: 1,
                                                transition: { 
                                                    duration: 0.4, 
                                                    delay: index * 0.1,
                                                    ease: "easeOut"
                                                }
                                            }}
                                            whileHover={{ 
                                                scale: 1.05, 
                                                y: -2,
                                                boxShadow: "0 8px 25px rgba(0,0,0,0.15)",
                                                transition: { duration: 0.2 }
                                            }}
                                        >
                                            <IconComponent className={`w-4 h-4 ${benefit.color}`} />
                                            <span>{benefit.text}</span>
                                        </motion.div>
                                    );
                                })}
                            </motion.div>
                        </AnimatePresence>
                    </motion.div>

                    {/* Call to Action Buttons */}
                    <motion.div 
                        className="mt-6 flex flex-col sm:flex-row gap-4 justify-center items-center"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1.2 }}
                    >
                        <motion.a
                            href="#categories"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-lg hover:shadow-xl transition-all group font-semibold"
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span>Start Shopping</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </motion.a>
                        
                        <motion.a
                            href="/seller/register"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-gradient-to-r from-orange-500 to-yellow-500 text-white rounded-xl shadow-lg hover:shadow-xl transition-all group font-semibold"
                            whileHover={{ scale: 1.05, y: -2 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <span>Start Selling</span>
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </motion.a>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
