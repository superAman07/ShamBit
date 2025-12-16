import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Shield, Leaf, Lock, Star, Heart, Zap, Award, Users, Globe, Truck, CreditCard, CheckCircle, Sparkles, Gift } from 'lucide-react';
import { useState, useEffect } from 'react';
import logo from '../assets/logo.png';

export const Hero = () => {
    // 15 ShamBit benefits organized in 3 groups of 5
    const benefitGroups = [
        [
            { icon: Lock, text: "Secure payments", color: "text-green-500" },
            { icon: Shield, text: "Buyer protection", color: "text-blue-500" },
            { icon: Leaf, text: "Eco-friendly", color: "text-green-500" },
            { icon: Star, text: "Premium quality", color: "text-yellow-500" },
            { icon: Heart, text: "Community driven", color: "text-pink-500" }
        ],
        [
            { icon: Zap, text: "Lightning fast", color: "text-orange-500" },
            { icon: Award, text: "Verified sellers", color: "text-purple-500" },
            { icon: Users, text: "Trusted community", color: "text-blue-500" },
            { icon: Globe, text: "Pan-India delivery", color: "text-green-500" },
            { icon: Truck, text: "Affordable shipping options", color: "text-orange-500" }
        ],
        [
            { icon: CreditCard, text: "Easy payments", color: "text-blue-500" },
            { icon: CheckCircle, text: "Quality assured", color: "text-green-500" },
            { icon: Sparkles, text: "Premium experience", color: "text-purple-500" },
            { icon: Gift, text: "Special rewards", color: "text-pink-500" },
            { icon: Heart, text: "Made with love", color: "text-red-500" }
        ]
    ];

    const [currentGroupIndex, setCurrentGroupIndex] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    useEffect(() => {
        const interval = setInterval(() => {
            setIsAnimating(true);
            setTimeout(() => {
                setCurrentGroupIndex((prev) => (prev + 1) % benefitGroups.length);
                setIsAnimating(false);
            }, 2000); // 2 seconds for complete transition
        }, 8000); // Change every 8 seconds - 6 seconds visible, 2 seconds transition

        return () => clearInterval(interval);
    }, []);

    const currentBenefits = benefitGroups[currentGroupIndex];

    // Sequential animation variants for each badge
    const getSequentialExitVariants = (index: number) => ({
        initial: { opacity: 1, scale: 1 },
        exit: {
            opacity: 0,
            scale: 0,
            transition: {
                duration: 0.8,
                ease: "easeInOut" as const,
                delay: index * 0.15 // Sequential delay: 0s, 0.15s, 0.3s, 0.45s, 0.6s
            }
        }
    });

    const getSequentialEnterVariants = (index: number) => ({
        initial: { opacity: 0, scale: 0.8, y: 20 },
        animate: {
            opacity: 1,
            scale: 1,
            y: 0,
            transition: {
                duration: 0.8,
                ease: "easeOut" as const,
                delay: 1.2 + (index * 0.1) // Wait for all to exit, then enter: 1.2s, 1.3s, 1.4s, 1.5s, 1.6s
            }
        }
    });

    return (
        <section className="gradient-hero min-h-[80vh] flex items-center py-8">
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
                            className="h-32 w-32 object-contain"
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
                        <div className="text-6xl md:text-7xl font-royal leading-none">
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
                        className="text-xl md:text-2xl font-semibold mb-4"
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
                        className="flex flex-wrap justify-center gap-3 py-4"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1 }}
                    >
                        <AnimatePresence mode="wait">
                            {currentBenefits.map((benefit, index) => {
                                const IconComponent = benefit.icon;
                                return (
                                    <motion.div
                                        key={`${currentGroupIndex}-${index}`}
                                        className="flex items-center gap-2 px-4 py-2 bg-white/90 rounded-full text-sm font-medium text-gray-700 shadow-lg backdrop-blur-sm border border-white/50"
                                        variants={isAnimating ? getSequentialExitVariants(index) : getSequentialEnterVariants(index)}
                                        initial="initial"
                                        animate="animate"
                                        exit="exit"
                                        whileHover={{ 
                                            scale: 1.05, 
                                            y: -2,
                                            boxShadow: "0 8px 25px rgba(0,0,0,0.15)"
                                        }}
                                        style={{
                                            background: isAnimating 
                                                ? 'linear-gradient(45deg, rgba(255,255,255,0.1), rgba(255,255,255,0.05))'
                                                : 'rgba(255,255,255,0.9)'
                                        }}
                                    >
                                        <motion.div
                                            animate={isAnimating ? {
                                                scale: [1, 0.8, 0.6, 0.4, 0.2, 0],
                                                rotate: [0, 90, 180, 270, 360, 450],
                                                opacity: [1, 0.8, 0.6, 0.4, 0.2, 0]
                                            } : {
                                                scale: [0, 0.2, 0.4, 0.6, 0.8, 1],
                                                rotate: [450, 360, 270, 180, 90, 0],
                                                opacity: [0, 0.2, 0.4, 0.6, 0.8, 1]
                                            }}
                                            transition={{ 
                                                duration: isAnimating ? 0.8 : 0.8,
                                                ease: "easeInOut",
                                                delay: isAnimating ? index * 0.15 : 1.2 + (index * 0.1),
                                                times: [0, 0.2, 0.4, 0.6, 0.8, 1]
                                            }}
                                        >
                                            <IconComponent className={`w-4 h-4 ${benefit.color}`} />
                                        </motion.div>
                                        
                                        <motion.span
                                            animate={isAnimating ? {
                                                opacity: [1, 0.8, 0.6, 0.4, 0.2, 0],
                                                x: [0, -3, -6, -9, -12, -15],
                                                filter: [
                                                    'blur(0px)', 
                                                    'blur(1px)', 
                                                    'blur(2px)', 
                                                    'blur(3px)', 
                                                    'blur(4px)', 
                                                    'blur(6px)'
                                                ]
                                            } : {
                                                opacity: [0, 0.2, 0.4, 0.6, 0.8, 1],
                                                x: [15, 12, 9, 6, 3, 0],
                                                filter: [
                                                    'blur(6px)', 
                                                    'blur(4px)', 
                                                    'blur(3px)', 
                                                    'blur(2px)', 
                                                    'blur(1px)', 
                                                    'blur(0px)'
                                                ]
                                            }}
                                            transition={{ 
                                                duration: isAnimating ? 0.8 : 0.8,
                                                ease: "easeInOut",
                                                delay: isAnimating ? index * 0.15 : 1.2 + (index * 0.1),
                                                times: [0, 0.2, 0.4, 0.6, 0.8, 1]
                                            }}
                                        >
                                            {benefit.text}
                                        </motion.span>
                                    </motion.div>
                                );
                            })}
                        </AnimatePresence>
                    </motion.div>

                    {/* Get the App Now - Beautiful Android App Download */}
                    <motion.div 
                        className="mt-6"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.6, delay: 1.2 }}
                    >
                        <div className="text-center">
                            <p className="text-sm text-gray-600 mb-3">Experience ShamBit on the go</p>
                            <motion.a
                                href="#"
                                className="inline-flex items-center gap-3 px-6 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-xl shadow-lg hover:shadow-xl transition-all group"
                                whileHover={{ scale: 1.05, y: -2 }}
                                whileTap={{ scale: 0.95 }}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Android Icon */}
                                    <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                                        <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                                            <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993.0001.5511-.4482.9997-.9993.9997m-11.046 0c-.5511 0-.9993-.4486-.9993-.9997s.4482-.9993.9993-.9993c.5511 0 .9993.4482.9993.9993 0 .5511-.4482.9997-.9993.9997m11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1518-.5972.416.416 0 00-.5972.1518l-2.0223 3.503C15.5902 8.2439 13.8533 7.8508 12 7.8508s-3.5902.3931-5.1333 1.0989L4.8442 5.4467a.4161.4161 0 00-.5972-.1518.416.416 0 00-.1518.5972L6.0952 9.321C3.7155 10.7605 2.25 13.1043 2.25 15.75h19.5c0-2.6457-1.4655-5.9895-3.8455-7.4295"/>
                                        </svg>
                                    </div>
                                    <div className="text-left">
                                        <div className="text-xs text-green-100">Get it on</div>
                                        <div className="text-sm font-bold">Google Play</div>
                                    </div>
                                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                                </div>
                            </motion.a>
                            
                            {/* App Features */}
                            <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                                    <span>Fast & Secure</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                                    <span>Easy Shopping</span>
                                </div>
                                <div className="flex items-center gap-1">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                                    <span>Instant Notifications</span>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};
