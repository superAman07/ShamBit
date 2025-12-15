import { useState } from 'react';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, Store, User, MapPin } from 'lucide-react';
import { API_ENDPOINTS } from '../../config/api';

export const SellerForm = () => {
    const [step, setStep] = useState(1);
    const [status, setStatus] = useState('idle');
    const [formData, setFormData] = useState({
        businessName: '', businessType: 'grocery', gstin: '',
        ownerName: '', phone: '', email: '',
        city: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');
        try {
            const res = await fetch(API_ENDPOINTS.SELLERS.REGISTER, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            
            if (res.ok && data.success) {
                setStatus('success');
            } else {
                console.error('Registration failed:', data.message);
                setStatus('error');
            }
        } catch (error) {
            console.error('Registration error:', error);
            setStatus('error');
        }
    };

    const nextStep = () => setStep(s => s + 1);
    const prevStep = () => setStep(s => s - 1);

    if (status === 'success') {
        return (
            <div className="max-w-2xl mx-auto p-12 text-center bg-white/80 backdrop-blur-xl rounded-3xl shadow-xl border border-white/50 my-10">
                <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-gray-800">Welcome to ShamBit!</h2>
                <p className="text-gray-600 mt-2">Thank you for joining us as a founding seller. We'll review your application and get back to you within 24 hours.</p>
            </div>
        );
    }

    return (
        <section id="become-seller" className="py-20 px-4">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-10">
                    <span className="bg-[#FB6F92]/10 text-[#FB6F92] px-4 py-1 rounded-full text-sm font-bold uppercase tracking-wide">Be Among the First</span>
                    <h2 className="text-3xl md:text-4xl font-bold text-[#333] mt-3">Become a Founding Seller</h2>
                    <p className="text-gray-600 mt-2">Zero commission for the first 6 months. Be part of our launch journey.</p>
                </div>

                <div className="bg-white/90 backdrop-blur-xl border border-white rounded-3xl shadow-2xl overflow-hidden p-8">
                    {/* Progress Bar */}
                    <div className="flex gap-2 mb-8">
                        {[1, 2, 3].map(i => (
                            <div key={i} className={`h-1 flex-1 rounded-full transition-colors ${step >= i ? 'bg-[#FB6F92]' : 'bg-gray-200'}`} />
                        ))}
                    </div>

                    <form onSubmit={handleSubmit}>
                        <motion.div
                            key={step}
                            initial={{ x: 20, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -20, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {step === 1 && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2"><Store className="w-5 h-5 text-[#FB6F92]" /> Business Details</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                                        <input required name="businessName" value={formData.businessName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FB6F92] focus:ring-1 focus:ring-[#FB6F92] outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                                            <select name="businessType" value={formData.businessType} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 outline-none bg-white">
                                                <option value="grocery">Grocery & Staples</option>
                                                <option value="organic">Organic Produce</option>
                                                <option value="packaged">Packaged Food</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">GSTIN (Optional)</label>
                                            <input name="gstin" value={formData.gstin} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FB6F92] outline-none" placeholder="GST Number" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2"><User className="w-5 h-5 text-[#FB6F92]" /> Contact Info</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Owner Name</label>
                                        <input required name="ownerName" value={formData.ownerName} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FB6F92] outline-none" />
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                                            <input required type="tel" name="phone" value={formData.phone} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FB6F92] outline-none" />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                            <input required type="email" name="email" value={formData.email} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FB6F92] outline-none" />
                                        </div>
                                    </div>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-4">
                                    <h3 className="text-xl font-bold flex items-center gap-2"><MapPin className="w-5 h-5 text-[#FB6F92]" /> Operations</h3>
                                    <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-1">Operating City</label>
                                        <input required name="city" value={formData.city} onChange={handleChange} className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-[#FB6F92] outline-none" placeholder="e.g. Mumbai, Pune" />
                                    </div>
                                    <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-lg">
                                        By submitting, you agree to hear from our onboarding team regarding verification documents.
                                    </p>
                                </div>
                            )}
                        </motion.div>

                        <div className="flex justify-between mt-8 pt-6 border-t border-gray-100">
                            {step > 1 ? (
                                <button type="button" onClick={prevStep} className="px-6 py-2 text-gray-600 font-medium hover:text-[#333]">Back</button>
                            ) : <div></div>}

                            {step < 3 ? (
                                <button type="button" onClick={nextStep} className="px-8 py-3 bg-[#333] text-white rounded-full font-medium hover:bg-black transition-colors">Continue</button>
                            ) : (
                                <button type="submit" disabled={status === 'loading'} className="px-8 py-3 bg-[#FB6F92] text-white rounded-full font-bold hover:bg-[#F43F6E] transition-colors flex items-center gap-2 disabled:opacity-70">
                                    {status === 'loading' && <Loader2 className="w-4 h-4 animate-spin" />}
                                    Submit Registration
                                </button>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </section>
    );
};
