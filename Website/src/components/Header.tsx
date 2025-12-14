import { motion } from 'framer-motion';

interface HeaderProps {
    onJoinClick?: () => void;
}

export const Header = ({ onJoinClick }: HeaderProps) => {
    return (
        <motion.header
            initial={{ y: -100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
            className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-white/50 backdrop-blur-md border-b border-white/20 shadow-sm"
        >
            <div className="flex items-center gap-2">
                <img src="/logo.png" alt="ShambIt Logo" className="h-10 w-auto object-contain" />
                <span className="text-xl font-bold tracking-tight text-[#333]">ShamBit</span>
            </div>

            <motion.button
                whileHover={{ scale: 1.05, backgroundColor: "#F43F6E" }}
                whileTap={{ scale: 0.95 }}
                className="px-6 py-2.5 rounded-full bg-[#FB6F92] text-white font-medium text-sm shadow-lg hover:shadow-xl transition-all cursor-pointer"
                onClick={onJoinClick}
            >
                Become a Seller
            </motion.button>
        </motion.header>
    );
};
