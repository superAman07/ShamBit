import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Loader2, Check } from 'lucide-react';

export const NotifyMe = () => {
    const [email, setEmail] = useState('');
    const [type, setType] = useState('buyer'); // 'buyer' | 'seller'
    const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'error'

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email) return;

        setStatus('loading');
        try {
            const res = await fetch('http://localhost:3000/api/notify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, type })
            });
            const data = await res.json();

            if (res.ok) {
                setStatus('success');
                setEmail('');
            } else {
                setStatus('error');
                console.error(data.error);
            }
        } catch (err) {
            setStatus('error');
            console.error(err);
        }
    };

    return (
        <section className="py-20 px-4 relative z-10">
            <div className="max-w-xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    className="bg-white/80 backdrop-blur-xl border border-white p-8 rounded-3xl shadow-xl"
                >
                    <h3 className="text-2xl font-bold text-[#333] mb-2">Be the first to know</h3>
                    <p className="text-gray-600 mb-6">Join our exclusive waitlist for early access.</p>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="flex bg-gray-100 p-1 rounded-full w-full">
                            <button
                                type="button"
                                onClick={() => setType('buyer')}
                                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${type === 'buyer' ? 'bg-white shadow text-[#FB6F92]' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                I'm a Buyer
                            </button>
                            <button
                                type="button"
                                onClick={() => setType('seller')}
                                className={`flex-1 py-2 rounded-full text-sm font-medium transition-all ${type === 'seller' ? 'bg-white shadow text-[#FB6F92]' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                I'm a Seller
                            </button>
                        </div>

                        <div className="relative">
                            <input
                                type="email"
                                placeholder="Enter your email address"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-6 py-4 rounded-full bg-white border border-gray-200 focus:outline-none focus:border-[#FB6F92] focus:ring-2 focus:ring-[#FB6F92]/20 transition-all font-medium placeholder:text-gray-400"
                            />
                            <button
                                type="submit"
                                disabled={status === 'loading' || status === 'success'}
                                className="absolute right-2 top-2 bottom-2 bg-[#FB6F92] text-white rounded-full px-6 flex items-center justify-center hover:bg-[#F43F6E] disabled:opacity-70 disabled:cursor-not-allowed transition-colors cursor-pointer"
                            >
                                <AnimatePresence mode='wait'>
                                    {status === 'loading' ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : status === 'success' ? (
                                        <Check className="w-5 h-5" />
                                    ) : (
                                        <ArrowRight className="w-5 h-5" />
                                    )}
                                </AnimatePresence>
                            </button>
                        </div>
                        {status === 'success' && <p className="text-green-600 text-sm font-medium">You're on the list! We'll be in touch.</p>}
                        {status === 'error' && <p className="text-red-500 text-sm font-medium">Something went wrong. Please try again.</p>}
                    </form>
                </motion.div>
            </div>
        </section>
    );
};
