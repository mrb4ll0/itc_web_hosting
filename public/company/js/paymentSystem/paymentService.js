// js/payment/paystack/PayStackPaymentService.js

import { 
    getAuth, 
    updateDoc, 
    doc, 
    addDoc, 
    collection, 
    getDocs, 
    query, 
    where, 
    orderBy, 
    limit,
    serverTimestamp ,
    setDoc,
    db
} from "../../../js/config/firebaseInit.js";

export class PayStackPaymentService {
    static BASE_URL = "https://us-central1-itconnectweb-eea87.cloudfunctions.net/api";

    // Payment status enum
    static PaymentStatus = {
        SUCCESS: 'success',
        FAILED: 'failed',
        PENDING: 'pending',
        PROCESSING: 'processing',
        INITIALIZE: 'initialize',
        WAITING_WEBHOOK: 'waiting_webhook'
    };

    /**
     * Initialize payment and create transaction record
     */
    static async initializePayment({
        email,
        amount,
        orderId,
        productName,
        fullName,
        phone
    }) {
        try {
            const auth = getAuth();
            const user = auth.currentUser;
            
            if (!user) {
                return {
                    status: this.PaymentStatus.FAILED,
                    errorMessage: "User not authenticated"
                };
            }

            // Generate transaction ID
            const transactionId = this._generateTransactionId();
            
            // Create device transaction record
            const deviceTransaction = {
                transactionId: transactionId,
                userId: user.uid,
                email: email,
                amount: amount,
                orderId: orderId,
                productName: productName,
                fullName: fullName || "",
                phone: phone || "",
                status: 'pending',
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            };

            // Save to device_transactions collection
            const deviceTransactionRef = doc(db, "device_transactions", transactionId);
            await setDoc(deviceTransactionRef, deviceTransaction);

            // Call cloud function
            const response = await fetch(`${this.BASE_URL}/paystack/initialize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    email: email,
                    amount: amount,
                    orderId: orderId,
                    productName: productName,
                    userId: user.uid,
                    metadata: {
                        fullName: fullName,
                        phone: phone,
                        userId: user.uid,
                        orderId: orderId,
                        productName: productName
                    }
                })
            });

            if (response.ok) {
                const data = await response.json();
                return {
                    status: this.PaymentStatus.SUCCESS,
                    transactionId: data.transactionId || transactionId,
                    authorizationUrl: data.authorization_url,
                    reference: data.reference,
                    errorMessage: null
                };
            } else {
                // Update transaction as failed
                await updateDoc(deviceTransactionRef, {
                    status: 'failed',
                    errorMessage: 'Initialization failed',
                    updatedAt: serverTimestamp()
                });

                return {
                    status: this.PaymentStatus.FAILED,
                    errorMessage: 'Payment initialization failed'
                };
            }
        } catch (error) {
            console.error('Initialize payment error:', error);
            return {
                status: this.PaymentStatus.FAILED,
                errorMessage: error.toString()
            };
        }
    }

    /**
     * Verify payment status
     */
    static async verifyPayment(reference) {
        try {
            const response = await fetch(`${this.BASE_URL}/paystack/verify/${reference}`);
            
            if (response.ok) {
                const data = await response.json();
                const paymentData = data.data;
                return this._parsePaymentResult(paymentData);
            } else {
                return {
                    status: this.PaymentStatus.FAILED,
                    errorMessage: 'Verification failed'
                };
            }
        } catch (error) {
            console.error('Verify payment error:', error);
            return {
                status: this.PaymentStatus.FAILED,
                errorMessage: error.toString()
            };
        }
    }

    /**
     * Check transaction status (for app restart/recovery)
     */
    static async checkTransactionStatus(transactionId) {
        try {
            const response = await fetch(`${this.BASE_URL}/paystack/check-transaction/${transactionId}`);
            
            if (response.ok) {
                const data = await response.json();
                return {
                    status: data.status || 'unknown',
                    message: data.message,
                    transaction: data.transaction,
                    source: data.source
                };
            } else if (response.status === 404) {
                return {
                    status: 'not_found',
                    message: 'Transaction not found'
                };
            } else {
                return {
                    status: 'error',
                    message: 'Failed to check transaction'
                };
            }
        } catch (error) {
            console.error('Check transaction error:', error);
            return {
                status: 'error',
                message: error.toString()
            };
        }
    }

    /**
     * Immediate verification - call right after payment completes
     */
    static async verifyImmediate({ reference, transactionId }) {
        try {
            const response = await fetch(`${this.BASE_URL}/paystack/verify-immediate`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    reference: reference,
                    transactionId: transactionId
                })
            });

            const data = await response.json();
            console.log('Immediate verification response:', data);

            if (data.status === 'verified' || data.status === 'found') {
                return this._parsePaymentResult(data.data);
            } else if (data.status === 'pending') {
                return {
                    status: this.PaymentStatus.PENDING,
                    transactionId: transactionId,
                    reference: reference,
                    errorMessage: data.message || 'Payment pending'
                };
            } else if (data.status === 'waiting_webhook') {
                return {
                    status: this.PaymentStatus.WAITING_WEBHOOK,
                    transactionId: transactionId,
                    reference: reference,
                    errorMessage: data.message || 'Waiting for webhook confirmation'
                };
            } else {
                return {
                    status: this.PaymentStatus.FAILED,
                    errorMessage: data.errorMessage || 'Verification failed'
                };
            }
        } catch (error) {
            console.error('Immediate verification error:', error);
            return {
                status: this.PaymentStatus.PENDING,
                transactionId: transactionId,
                reference: reference,
                errorMessage: 'Waiting for confirmation'
            };
        }
    }

    /**
     * Polling verification - for continuous checking
     */
    static async pollPaymentStatus({ reference, transactionId }) {
        try {
            const response = await fetch(`${this.BASE_URL}/paystack/poll-status/${reference}`);
            const data = await response.json();
            console.log('Poll status response:', data);

            if (data.status === 'verified' || data.status === 'found') {
                return this._parsePaymentResult(data.data);
            } else if (data.status === 'pending') {
                return {
                    status: this.PaymentStatus.PENDING,
                    transactionId: transactionId,
                    reference: reference,
                    errorMessage: data.message || 'Payment pending'
                };
            } else if (data.status === 'processing') {
                return {
                    status: this.PaymentStatus.PROCESSING,
                    transactionId: transactionId,
                    reference: reference,
                    errorMessage: data.message || 'Payment processing'
                };
            } else if (data.status === 'not_found') {
                return {
                    status: this.PaymentStatus.FAILED,
                    transactionId: transactionId,
                    reference: reference,
                    errorMessage: data.message || 'Transaction not found'
                };
            } else {
                return {
                    status: this.PaymentStatus.FAILED,
                    transactionId: transactionId,
                    reference: reference,
                    errorMessage: data.message || 'Polling failed'
                };
            }
        } catch (error) {
            console.error('Poll status error:', error);
            return {
                status: this.PaymentStatus.PENDING,
                transactionId: transactionId,
                reference: reference,
                errorMessage: 'Checking status...'
            };
        }
    }

    /**
     * Get user's pending transactions
     */
    static async getPendingTransactions() {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) return [];

        try {
            const q = query(
                collection(db, "device_transactions"),
                where("userId", "==", user.uid),
                where("status", "==", "pending"),
                orderBy("createdAt", "desc"),
                limit(5)
            );

            const snapshot = await getDocs(q);
            return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        } catch (error) {
            console.error('Get pending transactions error:', error);
            return [];
        }
    }

    /**
     * Resolve pending transactions (call on app startup)
     */
    static async resolvePendingTransactions() {
        const pendingTransactions = await this.getPendingTransactions();

        for (const transaction of pendingTransactions) {
            const status = await this.checkTransactionStatus(transaction.transactionId);

            if (status.status === 'found_in_cloud' || 
                status.status === 'verified_from_paystack') {
                
                // Update local record
                const transactionRef = doc(db, "device_transactions", transaction.id);
                await updateDoc(transactionRef, {
                    status: status.transaction?.status || 'unknown',
                    updatedAt: serverTimestamp()
                });

                // Process the payment if successful
                if (status.transaction?.status === 'success') {
                    await this._processCompletedPayment(status.transaction);
                }
            }
        }
    }

    /**
     * Process completed payment
     */
    static async _processCompletedPayment(transaction) {
        try {
            const userId = transaction.userId;
            const amount = transaction.amount;
            const transactionId = transaction.transactionId;
            const reference = transaction.reference;
            const metadata = transaction.metadata || {};

            // Add slot balance to student
            const studentRef = doc(db, "users", "students", "students", userId);
            await updateDoc(studentRef, {
                slotBalance: amount
            });

            // Record in student purchases
            await addDoc(collection(db, "student_purchases"), {
                userId: userId,
                transactionId: transactionId,
                reference: reference,
                amount: amount,
                metadata: metadata,
                purchasedAt: serverTimestamp(),
                status: 'completed'
            });

            // Update device transaction status
            const deviceTransactionRef = doc(db, "device_transactions", transactionId);
            await updateDoc(deviceTransactionRef, {
                status: 'success',
                updatedAt: serverTimestamp()
            });

            console.log('Payment processed successfully for transaction:', transactionId);
        } catch (error) {
            console.error('Process completed payment error:', error);
            throw error;
        }
    }

    /**
     * Parse payment result from API response
     */
    static _parsePaymentResult(json) {
        const statusStr = json?.status?.toString().toLowerCase() || '';
        const isSuccess = statusStr === 'success' || 
                         json?.transactionStatus?.toString().toLowerCase() === 'success';

        // Extract amount from either location
        let amount = 0;
        if (json?.amount != null) {
            amount = typeof json.amount === 'number' ? json.amount / 100 : 0;
        } else if (json?.amountInKobo != null) {
            amount = json.amountInKobo / 100;
        }

        // Parse paidAt date
        let paidAt = null;
        if (json?.paidAt) {
            paidAt = new Date(json.paidAt);
        } else if (json?.paid_at) {
            paidAt = new Date(json.paid_at);
        }

        return {
            status: isSuccess ? this.PaymentStatus.SUCCESS : this.PaymentStatus.FAILED,
            transactionId: json?.transactionId || json?.metadata?.transactionId,
            reference: json?.reference,
            amount: amount,
            errorMessage: json?.errorMessage,
            metadata: json?.metadata || {},
            paidAt: paidAt
        };
    }

    /**
     * Generate unique transaction ID
     */
    static _generateTransactionId() {
        const timestamp = Date.now();
        const randomString = Math.random().toString(36).substring(2, 10);
        return `TRX_${timestamp}_${randomString}`;
    }
}

export default PayStackPaymentService;