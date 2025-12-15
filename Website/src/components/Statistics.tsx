import { motion } from 'framer-motion';
import { Users, Store, ShoppingBag, MapPin } from 'lucide-react';

const stats = [
    {
        icon: <Store className="w-8 h-8 text-[#FB6F92]" />,
        number: "New",
        label: "Platform Launch",
        description: "Fresh start with verified quality"
    },
    {
        icon: <Users className="w-8 h-8 text-blue-500" />,
        number: "100%",
        label: "Quality Focus",
        description: "Every seller personally verified"
    },
    {
        icon: <ShoppingBag className="w-8 h-8 text-green-500" />,
        number: "Fresh",
        label: "Daily Sourcing",
        description: "Direct from trusted growers"
    },
    {
        icon: <MapPin className="w-8 h-8 text-orange-500" />,
        number: "Local",
        label: "Community First",
        description: "Supporting local food vendors"
    }
];

export const Statistics = () => {
    return (
        <section className="py-20 px-4 bg-gradient-to-br from-gray-50 to-white relative overflow-hidden">
            {/* Background decoration */}
            <div className="absolute inset-0 opacity-50" style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23FB6F92' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='2'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`
            }}></div>
            
            <div className="max-w-6xl mx-auto relative z-10">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <span className="bg-[#FB6F92]/10 text-[#FB6F92] px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide">
                        Our Impact
                    </span>
                    <h2 className="text-4xl md:text-5xl font-bold text-[#333] mt-4 mb-4">
                        Building Trust from Day One
                    </h2>
                    <p className="text-xl text-gray-600 max-w-3xl mx-auto">
                        Starting fresh with a commitment to quality, verification, and community
                    </p>
                </motion.div>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
                    {stats.map((stat, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 30 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: index * 0.1 }}
                            whileHover={{ y: -5 }}
                            className="bg-white/80 backdrop-blur-lg border border-white/50 p-8 rounded-3xl shadow-lg hover:shadow-xl transition-all duration-300 text-center"
                        >
                            <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                                {stat.icon}
                            </div>
                            <div className="text-4xl font-bold text-[#333] mb-2">
                                {stat.number}
                            </div>
                            <h3 className="text-xl font-semibold text-[#333] mb-2">
                                {stat.label}
                            </h3>
                            <p className="text-gray-600 text-sm leading-relaxed">
                                {stat.description}
                            </p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
};