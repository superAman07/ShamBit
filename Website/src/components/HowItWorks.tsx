import { motion } from 'framer-motion';
import { Search, ShoppingCart, MessageCircle, Store, TrendingUp, DollarSign } from 'lucide-react';

export const HowItWorks = () => {
    const buyerSteps = [
        {
            icon: Search,
            title: "Discover",
            description: "Browse thousands of curated items (new & secondhand)"
        },
        {
            icon: ShoppingCart,
            title: "Buy with Confidence",
            description: "Secure checkout & purchase protection"
        },
        {
            icon: MessageCircle,
            title: "Connect & Support",
            description: "Chat with sellers and get great deals that give back"
        }
    ];

    const sellerSteps = [
        {
            icon: Store,
            title: "Start Selling",
            description: "Create your shop in minutes"
        },
        {
            icon: TrendingUp,
            title: "Grow Your Reach",
            description: "Access a community that values your products"
        },
        {
            icon: DollarSign,
            title: "Get Paid Safely",
            description: "Reliable payouts and seller support every step"
        }
    ];

    return (
        <section className="section-padding bg-gradient-to-br from-cyan-100 via-blue-50 to-indigo-100 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div 
                    animate={{ 
                        rotate: 360,
                        scale: [1, 1.3, 1],
                    }}
                    transition={{ 
                        duration: 30,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-r from-cyan-400/15 to-blue-400/15 rounded-full blur-3xl"
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
                    className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-r from-indigo-400/15 to-purple-400/15 rounded-full blur-3xl"
                />
            </div>
            <div className="container-max relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center mb-12"
                >
                    <motion.h2 
                        className="text-3xl md:text-4xl font-bold mb-6 bg-gradient-to-r from-cyan-700 via-blue-700 to-indigo-700 bg-clip-text text-transparent"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        How It Works
                    </motion.h2>
                    <motion.p 
                        className="text-lg text-gray-700 max-w-3xl mx-auto font-semibold"
                        whileHover={{ scale: 1.02 }}
                    >
                        Whether you're shopping or selling, ShamBit makes it easy to connect with people who care
                    </motion.p>
                </motion.div>

                <div className="grid lg:grid-cols-2 gap-8">
                    {/* For Buyers */}
                    <motion.div
                        initial={{ opacity: 0, x: -30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        whileHover={{ y: -5, scale: 1.01 }}
                        className="bg-gradient-to-br from-white/95 via-orange-50/95 to-red-50/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-orange-200/50 hover:shadow-2xl hover:shadow-orange-300/60 transition-all duration-500 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-100/30 via-transparent to-red-100/30"></div>
                        <div className="text-center mb-6 relative z-10">
                            <motion.div 
                                whileHover={{ scale: 1.1, rotate: 5 }}
                                className="w-14 h-14 bg-gradient-to-br from-orange-400 to-red-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg border-2 border-white/40"
                            >
                                <ShoppingCart className="w-7 h-7 text-white drop-shadow-lg" />
                            </motion.div>
                            <h3 className="text-xl font-bold bg-gradient-to-r from-orange-700 to-red-800 bg-clip-text text-transparent mb-2">For Buyers</h3>
                            <p className="text-sm text-gray-700 font-semibold">We protect buyers so you can shop worry-free</p>
                        </div>

                        <div className="space-y-4 relative z-10">
                            {buyerSteps.map((step, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                    whileHover={{ x: 5 }}
                                    className="flex items-start gap-3"
                                >
                                    <motion.div 
                                        whileHover={{ scale: 1.1 }}
                                        className="w-8 h-8 bg-gradient-to-br from-orange-400 to-red-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md border border-white/30"
                                    >
                                        <step.icon className="w-4 h-4 text-white drop-shadow-sm" />
                                    </motion.div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 mb-1">
                                            {index + 1}. {step.title}
                                        </h4>
                                        <p className="text-xs text-gray-600 font-medium leading-tight">{step.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>

                    {/* For Sellers */}
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        viewport={{ once: true }}
                        whileHover={{ y: -5, scale: 1.01 }}
                        className="bg-gradient-to-br from-white/95 via-green-50/95 to-emerald-50/95 backdrop-blur-sm rounded-2xl p-6 shadow-xl border-2 border-green-200/50 hover:shadow-2xl hover:shadow-green-300/60 transition-all duration-500 relative overflow-hidden"
                    >
                        <div className="absolute inset-0 bg-gradient-to-br from-green-100/30 via-transparent to-emerald-100/30"></div>
                        <div className="text-center mb-6 relative z-10">
                            <motion.div 
                                whileHover={{ scale: 1.1, rotate: -5 }}
                                className="w-14 h-14 bg-gradient-to-br from-green-400 to-emerald-500 rounded-2xl flex items-center justify-center mx-auto mb-3 shadow-lg border-2 border-white/40"
                            >
                                <Store className="w-7 h-7 text-white drop-shadow-lg" />
                            </motion.div>
                            <h3 className="text-xl font-bold bg-gradient-to-r from-green-700 to-emerald-800 bg-clip-text text-transparent mb-2">For Sellers</h3>
                            <p className="text-sm text-gray-700 font-semibold">We make selling easy so you can focus on your passion</p>
                        </div>

                        <div className="space-y-4 relative z-10">
                            {sellerSteps.map((step, index) => (
                                <motion.div
                                    key={index}
                                    initial={{ opacity: 0, y: 20 }}
                                    whileInView={{ opacity: 1, y: 0 }}
                                    transition={{ duration: 0.4, delay: index * 0.1 + 0.2 }}
                                    viewport={{ once: true }}
                                    whileHover={{ x: 5 }}
                                    className="flex items-start gap-3"
                                >
                                    <motion.div 
                                        whileHover={{ scale: 1.1 }}
                                        className="w-8 h-8 bg-gradient-to-br from-green-400 to-emerald-500 rounded-lg flex items-center justify-center flex-shrink-0 shadow-md border border-white/30"
                                    >
                                        <step.icon className="w-4 h-4 text-white drop-shadow-sm" />
                                    </motion.div>
                                    <div>
                                        <h4 className="text-sm font-bold text-gray-800 mb-1">
                                            {index + 1}. {step.title}
                                        </h4>
                                        <p className="text-xs text-gray-600 font-medium leading-tight">{step.description}</p>
                                    </div>
                                </motion.div>
                            ))}
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
};