import React from 'react';
import { MessageCircle } from 'lucide-react';

const WhatsAppButton = ({ phoneNumber = "+12342743672", message = "Hello! I need help with K-Track" }) => {
    // Format phone number for WhatsApp (remove spaces, dashes, parentheses)
    const formattedNumber = phoneNumber.replace(/[\s\-()]/g, '');

    // Encode message for URL
    const encodedMessage = encodeURIComponent(message);

    // Create WhatsApp URL
    const whatsappUrl = `https://wa.me/${formattedNumber}?text=${encodedMessage}`;

    return (
        <a
            href={whatsappUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="fixed bottom-6 right-6 bg-[#25D366] hover:bg-[#20BA5A] text-white p-5 rounded-full shadow-2xl transition-all duration-300 hover:scale-110 z-50 group animate-bounce-subtle"
            title="Chat on WhatsApp"
            aria-label="Contact us on WhatsApp"
        >
            <div className="relative flex items-center justify-center">
                {/* WhatsApp Icon with better sizing */}
                <MessageCircle className="w-8 h-8 fill-white stroke-white" strokeWidth={1.5} />

                {/* Animated pulse ring */}
                <span className="absolute -inset-2 rounded-full">
                    <span className="animate-ping absolute inset-0 rounded-full bg-[#25D366] opacity-40"></span>
                    <span className="absolute inset-0 rounded-full bg-[#25D366] opacity-20 animate-pulse"></span>
                </span>

                {/* Online indicator dot */}
                <span className="absolute -top-1 -right-1 flex h-4 w-4">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-300 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-4 w-4 bg-green-400 border-2 border-white"></span>
                </span>
            </div>

            {/* Enhanced Tooltip */}
            <div className="absolute right-full mr-4 top-1/2 -translate-y-1/2 bg-gray-900 text-white px-4 py-3 rounded-xl text-sm font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-all duration-300 pointer-events-none shadow-xl group-hover:mr-5">
                <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span>Need Help? Chat with us!</span>
                </div>
                {/* Arrow pointing to button */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-full">
                    <div className="border-8 border-transparent border-l-gray-900"></div>
                </div>
            </div>
        </a>
    );
};

export default WhatsAppButton;
