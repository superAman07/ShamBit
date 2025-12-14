import { motion } from 'framer-motion';
import { Leaf, CheckCircle2, Truck } from 'lucide-react';

const features = [
    {
        icon: <Leaf className="w-8 h-8 text-green-500" />,
        title: "Farm Fresh",
        description: "Sourced directly from verified growers who care about quality.",
        color: "bg-green-50"
    },
    {
        icon: <CheckCircle2 className="w-8 h-8 text-[#FB6F92]" />,
        title: "Quality Checked",
        description: "Every item passes a strict quality test before it reaches you.",
        color: "bg-pink-50"
    },
    {
        icon: <Truck className="w-8 h-8 text-blue-500" />,
        title: "Swift Delivery",
        description: "Goodness delivered to your doorstep with care and speed.",
        color: "bg-blue-50"
    }
];

export const Features = () => {
    return (
        <section className="py-20 px-4 relative z-20">
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="grid md:grid-cols-3 gap-8"
                >
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            whileHover={{ y: -5 }}
                            className="bg-white/60 backdrop-blur-lg border border-white/50 p-8 rounded-3xl shadow-sm hover:shadow-xl transition-all duration-300"
                        >
                            <div className={`w-16 h-16 ${feature.color} rounded-2xl flex items-center justify-center mb-6`}>
                                {feature.icon}
                            </div>
                            <h3 className="text-xl font-bold text-[#333] mb-3">{feature.title}</h3>
                            <p className="text-gray-600 leading-relaxed">
                                {feature.description}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};
