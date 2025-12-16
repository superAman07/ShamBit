import { motion } from 'framer-motion';
import { Smartphone, Shirt, Home, Book, Gamepad2, Heart } from 'lucide-react';

export const Categories = () => {
    const categories = [
        {
            icon: Smartphone,
            name: "Electronics",
            description: "Certified sellers & genuine products"
        },
        {
            icon: Shirt,
            name: "Fashion",
            description: "Trending styles & quality brands"
        },
        {
            icon: Home,
            name: "Home & Living",
            description: "Everything for your perfect home"
        },
        {
            icon: Book,
            name: "Books & Media",
            description: "Knowledge & entertainment delivered"
        },
        {
            icon: Gamepad2,
            name: "Sports & Gaming",
            description: "Gear up for your passions"
        },
        {
            icon: Heart,
            name: "Health & Beauty",
            description: "Wellness products you can trust"
        }
    ];

    return (
        <section className="section-padding bg-gradient-to-br from-indigo-100 via-purple-50 to-pink-100 relative overflow-hidden">
            {/* Animated background elements */}
            <div className="absolute inset-0 overflow-hidden">
                <motion.div 
                    animate={{ 
                        rotate: 360,
                        scale: [1, 1.3, 1],
                    }}
                    transition={{ 
                        duration: 25,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -top-32 -right-32 w-64 h-64 bg-gradient-to-r from-purple-400/15 to-pink-400/15 rounded-full blur-3xl"
                />
                <motion.div 
                    animate={{ 
                        rotate: -360,
                        scale: [1.1, 1, 1.1],
                    }}
                    transition={{ 
                        duration: 30,
                        repeat: Infinity,
                        ease: "linear"
                    }}
                    className="absolute -bottom-32 -left-32 w-80 h-80 bg-gradient-to-r from-indigo-400/15 to-blue-400/15 rounded-full blur-3xl"
                />
                <motion.div 
                    animate={{ 
                        y: [-30, 30, -30],
                        x: [-15, 15, -15],
                    }}
                    transition={{ 
                        duration: 20,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                    className="absolute top-1/3 right-1/4 w-48 h-48 bg-gradient-to-r from-cyan-400/10 to-teal-400/10 rounded-full blur-2xl"
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
                        className="text-3xl md:text-4xl font-bold mb-6"
                        whileHover={{ scale: 1.02 }}
                        transition={{ type: "spring", stiffness: 300 }}
                    >
                        <span className="bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                            Carefully Selected Categories
                        </span>
                        <br />
                        <span className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
                            from Verified Sellers
                        </span>
                    </motion.h2>
                    <motion.p 
                        className="text-lg bg-gradient-to-r from-gray-700 via-gray-600 to-gray-700 bg-clip-text text-transparent max-w-3xl mx-auto font-semibold"
                        whileHover={{ scale: 1.02 }}
                    >
                        Every category features only audited sellers and authenticated products. Quality over quantity, always.
                    </motion.p>
                </motion.div>

                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                    {categories.map((category, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -4, scale: 1.02 }}
                            className="group cursor-pointer"
                        >
                            <div className={`
                                relative p-3 rounded-xl h-full
                                ${index === 0 ? 'bg-gradient-to-br from-blue-50/95 via-indigo-50/95 to-purple-50/95' :
                                  index === 1 ? 'bg-gradient-to-br from-pink-50/95 via-rose-50/95 to-red-50/95' :
                                  index === 2 ? 'bg-gradient-to-br from-green-50/95 via-emerald-50/95 to-teal-50/95' :
                                  index === 3 ? 'bg-gradient-to-br from-amber-50/95 via-orange-50/95 to-yellow-50/95' :
                                  index === 4 ? 'bg-gradient-to-br from-violet-50/95 via-purple-50/95 to-fuchsia-50/95' :
                                  'bg-gradient-to-br from-cyan-50/95 via-sky-50/95 to-blue-50/95'
                                } backdrop-blur-sm
                                shadow-xl ${index === 0 ? 'shadow-blue-200/40' :
                                           index === 1 ? 'shadow-pink-200/40' :
                                           index === 2 ? 'shadow-green-200/40' :
                                           index === 3 ? 'shadow-orange-200/40' :
                                           index === 4 ? 'shadow-purple-200/40' :
                                           'shadow-cyan-200/40'
                                } border-2 ${index === 0 ? 'border-blue-200/50' :
                                            index === 1 ? 'border-pink-200/50' :
                                            index === 2 ? 'border-green-200/50' :
                                            index === 3 ? 'border-orange-200/50' :
                                            index === 4 ? 'border-purple-200/50' :
                                            'border-cyan-200/50'
                                }
                                hover:shadow-2xl hover:${index === 0 ? 'shadow-blue-300/60' :
                                                       index === 1 ? 'shadow-pink-300/60' :
                                                       index === 2 ? 'shadow-green-300/60' :
                                                       index === 3 ? 'shadow-orange-300/60' :
                                                       index === 4 ? 'shadow-purple-300/60' :
                                                       'shadow-cyan-300/60'
                                }
                                hover:border-${index === 0 ? 'blue-300/70' :
                                              index === 1 ? 'pink-300/70' :
                                              index === 2 ? 'green-300/70' :
                                              index === 3 ? 'orange-300/70' :
                                              index === 4 ? 'purple-300/70' :
                                              'cyan-300/70'
                                }
                                transition-all duration-500 transform-gpu
                                before:absolute before:inset-0 before:rounded-2xl sm:before:rounded-3xl
                                before:bg-gradient-to-br before:from-white/50 before:via-white/20 before:to-transparent
                                before:opacity-0 hover:before:opacity-100 before:transition-opacity before:duration-300
                                after:absolute after:inset-0 after:rounded-2xl sm:after:rounded-3xl
                                after:bg-gradient-to-t after:from-${index === 0 ? 'blue' :
                                                                  index === 1 ? 'pink' :
                                                                  index === 2 ? 'green' :
                                                                  index === 3 ? 'orange' :
                                                                  index === 4 ? 'purple' :
                                                                  'cyan'
                                }-100/15 after:to-transparent
                                overflow-hidden group-hover:animate-pulse
                            `}>
                                <motion.div 
                                    whileHover={{ 
                                        scale: 1.2, 
                                        rotate: [0, -10, 10, -5, 0],
                                        y: -3
                                    }}
                                    animate={{
                                        boxShadow: [
                                            "0 8px 25px rgba(0,0,0,0.1)",
                                            "0 12px 35px rgba(0,0,0,0.15)",
                                            "0 8px 25px rgba(0,0,0,0.1)"
                                        ]
                                    }}
                                    transition={{ 
                                        boxShadow: { duration: 4, repeat: Infinity },
                                        type: "spring", stiffness: 400, damping: 10
                                    }}
                                    className={`w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-2 
                                        shadow-xl border-2 border-white/40
                                        group-hover:shadow-2xl
                                        transition-all duration-500 transform-gpu
                                        relative overflow-hidden z-10
                                        ${index === 0 ? 'bg-gradient-to-br from-blue-400 via-indigo-500 to-purple-600 shadow-blue-400/50 group-hover:shadow-blue-500/70' :
                                          index === 1 ? 'bg-gradient-to-br from-pink-400 via-rose-500 to-red-600 shadow-pink-400/50 group-hover:shadow-pink-500/70' :
                                          index === 2 ? 'bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600 shadow-green-400/50 group-hover:shadow-green-500/70' :
                                          index === 3 ? 'bg-gradient-to-br from-amber-400 via-orange-500 to-yellow-600 shadow-orange-400/50 group-hover:shadow-orange-500/70' :
                                          index === 4 ? 'bg-gradient-to-br from-violet-400 via-purple-500 to-fuchsia-600 shadow-purple-400/50 group-hover:shadow-purple-500/70' :
                                          'bg-gradient-to-br from-cyan-400 via-sky-500 to-blue-600 shadow-cyan-400/50 group-hover:shadow-cyan-500/70'
                                        }
                                        before:absolute before:inset-0 before:bg-gradient-to-t before:from-black/5 before:to-transparent
                                        after:absolute after:inset-0 after:bg-gradient-to-br after:from-white/30 after:via-transparent after:to-transparent
                                    `}
                                >
                                    <motion.div
                                        animate={{ rotate: 360 }}
                                        transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
                                        className="absolute inset-2 rounded-full bg-gradient-to-r from-white/20 to-transparent"
                                    />
                                    <category.icon className="w-5 h-5 text-white drop-shadow-lg relative z-10" />
                                </motion.div>
                                
                                <motion.h3 
                                    className={`text-sm font-bold mb-1 relative z-10 text-center ${
                                        index === 0 ? 'bg-gradient-to-r from-blue-700 to-indigo-800 bg-clip-text text-transparent' :
                                        index === 1 ? 'bg-gradient-to-r from-pink-700 to-rose-800 bg-clip-text text-transparent' :
                                        index === 2 ? 'bg-gradient-to-r from-green-700 to-emerald-800 bg-clip-text text-transparent' :
                                        index === 3 ? 'bg-gradient-to-r from-orange-700 to-amber-800 bg-clip-text text-transparent' :
                                        index === 4 ? 'bg-gradient-to-r from-purple-700 to-fuchsia-800 bg-clip-text text-transparent' :
                                        'bg-gradient-to-r from-cyan-700 to-sky-800 bg-clip-text text-transparent'
                                    }`}
                                    whileHover={{ scale: 1.05 }}
                                >
                                    {category.name}
                                </motion.h3>
                                
                                <motion.p 
                                    className="text-xs text-gray-600 leading-tight font-medium relative z-10 text-center"
                                    whileHover={{ scale: 1.02 }}
                                >
                                    {category.description}
                                </motion.p>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};