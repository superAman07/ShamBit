import { motion } from 'framer-motion';
import { Star, Shield, CheckCircle, Award } from 'lucide-react';

export const SocialProof = () => {
    const qualityProcesses = [
        {
            icon: Shield,
            title: "Seller Identity Verification",
            description: "Every seller undergoes thorough identity and business verification before joining our platform",
            color: "text-blue-600"
        },
        {
            icon: CheckCircle,
            title: "Business & Product Audit",
            description: "Comprehensive review of business credentials and product authenticity documentation",
            color: "text-green-600"
        },
        {
            icon: Award,
            title: "Manual Approval Process",
            description: "Human reviewers manually approve each seller and product listing before going live",
            color: "text-purple-600"
        },
        {
            icon: Star,
            title: "Continuous Quality Checks",
            description: "Ongoing monitoring and quality assessments to maintain high standards across the platform",
            color: "text-orange-600"
        }
    ];

    return (
        <section className="section-padding bg-white">
            <div className="container-max">

                {/* How We Ensure Genuine Products */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center mb-8"
                >
                    <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-4">How We Ensure Genuine Products</h2>
                    <p className="text-base text-gray-700 max-w-3xl mx-auto mb-6 font-medium">
                        Our rigorous verification process ensures every seller and product meets our high standards for authenticity and quality
                    </p>
                </motion.div>

                {/* Quality Process Steps */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
                >
                    {qualityProcesses.map((process, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.4, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            whileHover={{ y: -3, scale: 1.02 }}
                            className="text-center p-4 bg-white rounded-xl shadow-lg border border-gray-100 hover:shadow-xl transition-all duration-300"
                        >
                            <div className="w-12 h-12 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
                                <process.icon className={`w-6 h-6 ${process.color}`} />
                            </div>
                            
                            <h3 className="text-sm font-bold text-gray-900 mb-2">
                                {process.title}
                            </h3>
                            
                            <p className="text-xs text-gray-700 leading-tight font-medium">
                                {process.description}
                            </p>
                        </motion.div>
                    ))}
                </motion.div>

                {/* Trust Guarantee */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    viewport={{ once: true }}
                    whileHover={{ scale: 1.01 }}
                    className="text-center bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-6"
                >
                    <div className="flex justify-center mb-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center">
                            <Shield className="w-6 h-6 text-white" />
                        </div>
                    </div>
                    
                    <h3 className="text-xl font-bold text-gray-900 mb-2">
                        100% Verified Marketplace
                    </h3>
                    
                    <p className="text-sm text-gray-700 max-w-2xl mx-auto font-medium">
                        Every seller is verified, every product is reviewed, and every transaction is protected. 
                        Shop with confidence knowing that quality and authenticity are guaranteed.
                    </p>
                </motion.div>
            </div>
        </section>
    );
};