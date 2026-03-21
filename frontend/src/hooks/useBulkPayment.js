import { useCallback, useState } from 'react';
import { api } from '../services/api';

export const useBulkPayment = ({ user, onPaymentSuccess }) => {
    const [isLoadingSummary, setIsLoadingSummary] = useState(false);
    const [isInitializing, setIsInitializing] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [summary, setSummary] = useState({
        totalDue: 0,
        payableTaskCount: 0,
        tasks: []
    });

    const loadSummary = useCallback(async () => {
        setIsLoadingSummary(true);
        try {
            const response = await api.get('/payments/outstanding-summary');
            setSummary(response.data?.data || {
                totalDue: 0,
                payableTaskCount: 0,
                tasks: []
            });
        } catch (error) {
            console.error('Failed to load outstanding summary:', error);
        } finally {
            setIsLoadingSummary(false);
        }
    }, []);

    const startBulkPayment = async () => {
        setIsInitializing(true);
        try {
            const intentResponse = await api.post('/payments/initialize-bulk');
            if (!intentResponse.data?.success) {
                alert('Could not start payment. Please try again.');
                return;
            }

            const {
                nonce,
                totalAmountKes,
                totalAmountKesDisplay,
                exchangeRate,
                payableTaskCount
            } = intentResponse.data;

            const PaystackPop = window.PaystackPop;
            if (!PaystackPop) {
                alert('Paystack not loaded. Please refresh.');
                return;
            }

            const handler = PaystackPop.setup({
                key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: totalAmountKes,
                currency: 'KES',
                channels: ['card', 'mobile_money'],
                metadata: {
                    nonce,
                    payment_scope: 'bulk',
                    exchange_rate: exchangeRate,
                    payable_task_count: payableTaskCount
                },
                onSuccess: async (response) => {
                    setIsVerifying(true);
                    try {
                        const verifyResponse = await api.post('/payments/verify-bulk', {
                            reference: response.reference,
                            nonce
                        });

                        if (verifyResponse.data?.success) {
                            await loadSummary();
                            onPaymentSuccess?.();
                        }
                    } catch (error) {
                        console.error('Bulk payment verification failed:', error);
                        alert('Payment was successful, but updating failed. Contact support.');
                    } finally {
                        setIsVerifying(false);
                    }
                },
                onCancel: () => { }
            });

            setSummary((current) => ({
                ...current,
                approxKesTotal: totalAmountKesDisplay
            }));

            handler.openIframe();
        } catch (error) {
            console.error('Bulk payment initialization failed:', error);
            alert(error.response?.data?.message || 'Could not start bulk payment. Please try again.');
        } finally {
            setIsInitializing(false);
        }
    };

    return {
        summary,
        isLoadingSummary,
        isInitializing,
        isVerifying,
        loadSummary,
        startBulkPayment
    };
};

export default useBulkPayment;
