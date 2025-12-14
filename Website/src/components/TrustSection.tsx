import { ShieldCheck } from 'lucide-react';
import { motion } from 'framer-motion';

export const TrustSection = () => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-lg mx-auto mt-[-50px] mb-20 relative z-10"
        >
            <div className="bg-white/70 backdrop-blur-sm border border-[#FB6F92]/20 rounded-2xl p-6 shadow-sm flex items-center justify-center gap-4 text-center">
                <div className="p-3 bg-[#FB6F92]/10 rounded-full">
                    <ShieldCheck className="w-6 h-6 text-[#FB6F92]" />
                </div>
                <p className="text-gray-700 font-medium text-lg">
                    All sellers on ShamBit are verified before they go live.
                </p>
            </div>
        </motion.div>
    );
};
