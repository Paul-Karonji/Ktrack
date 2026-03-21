import { useState } from 'react';
import { api } from '../services/api';

export const useTaskPayment = ({ task, user, onPaymentSuccess }) => {
    const [isInitializing, setIsInitializing] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [expectedKesAmount, setExpectedKesAmount] = useState(0);

    const startPayment = async () => {
        if (!task?.id || !task?.current_due_phase) return;

        setIsInitializing(true);

        try {
            const intentRes = await api.post('/payments/initialize', {
                taskId: task.id,
                phase: task.current_due_phase
            });

            if (!intentRes.data?.success) {
                alert('Could not start payment. Please try again.');
                return;
            }

            const { nonce, amountKes, expectedAmountKes, exchangeRate } = intentRes.data;
            setExpectedKesAmount(expectedAmountKes || 0);

            const PaystackPop = window.PaystackPop;
            if (!PaystackPop) {
                alert('Paystack not loaded. Please refresh.');
                return;
            }

            const handler = PaystackPop.setup({
                key: import.meta.env.VITE_PAYSTACK_PUBLIC_KEY,
                email: user.email,
                amount: amountKes,
                currency: 'KES',
                channels: ['card', 'mobile_money'],
                metadata: {
                    nonce,
                    task_id: task.id,
                    task_name: task.task_name,
                    phase: task.current_due_phase,
                    payment_scope: 'single',
                    exchange_rate: exchangeRate
                },
                onSuccess: async (response) => {
                    setIsVerifying(true);
                    try {
                        const apiResponse = await api.post('/payments/verify', {
                            reference: response.reference,
                            taskId: task.id,
                            nonce
                        });

                        if (apiResponse.data?.success) {
                            onPaymentSuccess?.(task.id);
                        }
                    } catch (error) {
                        console.error('Payment verification failed:', error);
                        alert('Payment was successful, but updating failed. Contact support.');
                    } finally {
                        setIsVerifying(false);
                    }
                },
                onCancel: () => { }
            });

            handler.openIframe();
        } catch (error) {
            console.error('Payment initialization failed:', error);
            alert('Could not start payment. Please try again.');
        } finally {
            setIsInitializing(false);
        }
    };

    return {
        expectedKesAmount,
        isInitializing,
        isVerifying,
        startPayment
    };
};

export default useTaskPayment;
