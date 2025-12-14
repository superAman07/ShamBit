import { motion } from 'framer-motion';
import { ArrowRight, Sparkles } from 'lucide-react';

export const Hero = () => {
    return (
        <section className="relative min-h-[90vh] flex flex-col items-center justify-center px-4 overflow-hidden pt-20">
            {/* Background Organic Blobs - More vibrant and moving */}
            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    rotate: [0, 90, 0],
                }}
                transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                className="absolute top-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#FB6F92]/10 rounded-full blur-[100px] -z-10"
            />
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    x: [0, 50, 0],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#FBC02D]/10 rounded-full blur-[80px] -z-10"
            />

            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, delay: 0.2 }}
                className="text-center max-w-4xl mx-auto space-y-8 relative z-10"
            >
                <motion.div
                    whileHover={{ scale: 1.05 }}
                    className="inline-flex items-center gap-2 px-6 py-2 rounded-full bg-white/80 backdrop-blur-md border border-[#FB6F92]/20 shadow-sm mb-4"
                >
                    <Sparkles className="w-4 h-4 text-[#FB6F92]" />
                    <span className="text-sm font-medium text-gray-600">Launching Soon in MVP</span>
                </motion.div>

                <h1 className="text-6xl md:text-8xl font-bold tracking-tight text-[#333] leading-[1.1] drop-shadow-sm">
                    A bit of <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FB6F92] to-[#F43F6E]">goodness</span> <br />
                    in every deal...
                </h1>

                <p className="text-xl md:text-2xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
                    A trusted marketplace for verified food sellers. <br />
                    <span className="font-medium text-[#FB6F92]">Fresh. Verified. Reliable.</span>
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8">
                    <motion.button
                        whileHover={{ scale: 1.05, boxShadow: "0 20px 25px -5px rgb(251 111 146 / 0.3)" }}
                        whileTap={{ scale: 0.95 }}
                        className="group px-8 py-4 rounded-full bg-[#FB6F92] text-white font-semibold text-lg shadow-xl hover:shadow-2xl transition-all flex items-center gap-2 cursor-pointer"
                    >
                        Notify Me
                        <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.05, borderColor: "#FB6F92", backgroundColor: "rgba(255,255,255,0.8)" }}
                        whileTap={{ scale: 0.95 }}
                        className="px-8 py-4 rounded-full border-2 border-gray-200 text-gray-600 font-semibold text-lg hover:text-[#FB6F92] transition-all cursor-pointer backdrop-blur-sm"
                    >
                        Learn More
                    </motion.button>
                </div>
            </motion.div>
        </section>
    );
};
