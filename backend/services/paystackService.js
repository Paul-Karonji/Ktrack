const axios = require('axios');
const crypto = require('crypto');

/**
 * PaystackService
 * Handles communication with Paystack API and Webhook validation.
 */
class PaystackService {
    constructor() {
        this.secretKey = process.env.PAYSTACK_SECRET_KEY;
        this.baseUrl = 'https://api.paystack.co';
    }

    /**
     * Verifies a transaction with Paystack API using the reference.
     * @param {string} reference - The transaction reference from Paystack.
     * @returns {Promise<Object>} - Transaction data.
     */
    async verifyTransaction(reference) {
        try {
            const response = await axios.get(`${this.baseUrl}/transaction/verify/${reference}`, {
                headers: {
                    Authorization: `Bearer ${this.secretKey}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.data && response.data.status) {
                return response.data.data;
            }
            throw new Error(response.data.message || 'Verification failed');
        } catch (error) {
            console.error('Paystack Verification Error:', error.response?.data || error.message);
            throw error;
        }
    }

    /**
     * Validates Paystack Webhook signature.
     * @param {Object} payload - The request body.
     * @param {string} signature - The x-paystack-signature header.
     * @returns {boolean}
     */
    validateWebhook(payload, signature) {
        const hash = crypto
            .createHmac('sha512', this.secretKey)
            .update(JSON.stringify(payload))
            .digest('hex');
        return hash === signature;
    }
}

module.exports = new PaystackService();
