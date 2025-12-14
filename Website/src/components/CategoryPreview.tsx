import { motion } from 'framer-motion';

const categories = [
    { name: "Almonds", color: "bg-[#FFE8D6]", text: "text-[#8B5E3C]" },
    { name: "Millets", color: "bg-[#E2F0CB]", text: "text-[#5C7C29]" },
    { name: "Spices", color: "bg-[#FFD3B6]", text: "text-[#A65D29]" },
    { name: "Honey", color: "bg-[#FFF9C4]", text: "text-[#FBC02D]" },
    { name: "Ghee", color: "bg-[#FFF3E0]", text: "text-[#EF6C00]" },
];

export const CategoryPreview = () => {
    return (
        <section className="py-12 px-4 overflow-hidden">
            <div className="text-center mb-10">
                <p className="text-[#FB6F92] font-semibold tracking-wider text-sm uppercase">Coming to your kitchen</p>
                <h2 className="text-3xl font-bold text-[#333] mt-2">Pure Goodness Awaits</h2>
            </div>

            <div className="max-w-6xl mx-auto flex flex-wrap justify-center gap-4">
                {categories.map((cat, index) => (
                    <motion.div
                        key={index}
                        initial={{ opacity: 0, scale: 0.9 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        viewport={{ once: true }}
                        transition={{ delay: index * 0.1 }}
                        whileHover={{ scale: 1.1, rotate: index % 2 === 0 ? 2 : -2 }}
                        className={`${cat.color} ${cat.text} px-8 py-4 rounded-full font-bold text-lg cursor-default shadow-sm border border-white/50`}
                    >
                        {cat.name}
                    </motion.div>
                ))}
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ delay: 0.6 }}
                    className="px-8 py-4 rounded-full bg-gray-100 text-gray-400 font-medium border border-dashed border-gray-300"
                >
                    + Much More
                </motion.div>
            </div>
        </section>
    );
};
