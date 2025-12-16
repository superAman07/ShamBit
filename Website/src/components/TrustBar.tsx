import { motion } from 'framer-motion';
import { Lock, Shield, Zap, Package } from 'lucide-react';

export const TrustBar = () => {
    const trustSignals = [
        {
            icon: Shield,
            text: "100% Verified Marketplace"
        },
        {
            icon: Lock,
            text: "No Fake Sellers"
        },
        {
            icon: Package,
            text: "Verified Products Only"
        },
        {
            icon: Zap,
            text: "Easy Returns with Real Support"
        }
    ];

    return (
        <section className="bg-[#F6F8FA] py-6">
            <div className="container-max">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-wrap justify-center items-center gap-8 lg:gap-16"
                >
                    {trustSignals.map((signal, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            className="flex items-center gap-3"
                        >
                            <signal.icon className="w-5 h-5 text-[#0FA3B1]" />
                            <span className="text-sm font-medium text-[#334155]">
                                {signal.text}
                            </span>
                        </motion.div>
                    ))}
                </motion.div>
            </div>
        </section>
    );
};