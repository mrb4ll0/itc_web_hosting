// js/payment/paystack/PayStackWebView.js

import { getAuth } from "../../../js/config/firebaseInit.js";
import { StudentCloudDB } from "../../../js/fireabase/StudentCloud.js";
import PayStackPaymentService from "./paymentService.js";

export class PayStackWebView {
    constructor({
        email,
        amount,
        orderId,
        productName,
        fullName,
        phone,
        onSuccess,
        onFailure,
        onCancel
    }) {
        this.email = email;
        this.amount = amount;
        this.orderId = orderId;
        this.productName = productName;
        this.fullName = fullName;
        this.phone = phone;
        this.onSuccess = onSuccess;
        this.onFailure = onFailure;
        this.onCancel = onCancel;

        // State
        this.loading = true;
        this.paymentHandled = false;
        this.pollingTimer = null;
        this.pollingAttempts = 0;
        this.maxPollingAttempts = 36; // 3 minutes (36 * 5 seconds)

        // Payment data
        this.authorizationUrl = null;
        this.paymentReference = null;
        this.transactionId = null;
        this.error = null;

        // Create modal container
        this.createModal();
    }

    /**
     * Create and show the payment modal
     */
    createModal() {
        // Remove any existing payment modal
        const existingModal = document.getElementById('paystack-payment-modal');
        if (existingModal) {
            document.body.removeChild(existingModal);
        }

        // Create modal container
        this.modal = document.createElement('div');
        this.modal.id = 'paystack-payment-modal';
        this.modal.className = 'fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50';
        this.modal.innerHTML = `
            <div class="bg-white rounded-lg shadow-xl w-full max-w-4xl h-5/6 flex flex-col">
                <!-- Header -->
                <div class="flex items-center justify-between p-4 border-b">
                    <h2 class="text-xl font-semibold text-gray-800">Pay with Paystack</h2>
                    <div class="flex items-center space-x-4">
                        ${this.loading ? `
                            <div class="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                        ` : ''}
                        <button id="close-payment-modal" class="text-gray-500 hover:text-gray-700">
                            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <!-- Content -->
                <div id="payment-content" class="flex-1 overflow-hidden">
                    ${this.loading ? this.renderLoading() : 
                      this.error ? this.renderError() : 
                      this.renderPaymentView()}
                </div>
            </div>
        `;

        document.body.appendChild(this.modal);

        // Add event listeners
        this.modal.querySelector('#close-payment-modal').addEventListener('click', () => {
            this.close();
            if (this.onCancel) this.onCancel();
        });

        // Initialize payment
        this.initializePayment();
    }

    /**
     * Initialize payment process
     */
    async initializePayment() {
        try {
            const paymentData = await PayStackPaymentService.initializePayment({
                email: this.email,
                amount: this.amount,
                orderId: this.orderId,
                productName: this.productName,
                fullName: this.fullName,
                phone: this.phone
            });

            if (paymentData.status === PayStackPaymentService.PaymentStatus.SUCCESS) {
                this.paymentReference = paymentData.reference;
                this.transactionId = paymentData.transactionId;
                this.authorizationUrl = paymentData.authorizationUrl;
                this.loading = false;
                this.updateContent();
            } else {
                this.error = paymentData.errorMessage || 'Payment initialization failed';
                this.loading = false;
                this.updateContent();
            }
        } catch (error) {
            console.error('Payment initialization error:', error);
            this.error = error.toString();
            this.loading = false;
            this.updateContent();
        }
    }

    /**
     * Render loading state
     */
    renderLoading() {
        return `
            <div class="flex flex-col items-center justify-center h-full">
                <div class="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <p class="mt-4 text-gray-600">Initializing payment...</p>
            </div>
        `;
    }

    /**
     * Render error state
     */
    renderError() {
        return `
            <div class="flex flex-col items-center justify-center h-full p-8">
                <div class="w-16 h-16 text-red-500 mb-4">
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>
                    </svg>
                </div>
                <h3 class="text-lg font-semibold text-gray-800 mb-2">Payment Error</h3>
                <p class="text-gray-600 text-center mb-6">${this.error}</p>
                <div class="flex space-x-4">
                    <button id="retry-payment" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        Retry Payment
                    </button>
                    <button id="cancel-payment" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                        Go Back
                    </button>
                </div>
            </div>
        `;
    }

    /**
     * Render payment view with iframe
     */
    renderPaymentView() {
        return `
            <div class="h-full flex flex-col">
                <!-- Order summary -->
                <div class="bg-gray-50 p-4 border-b">
                    <div class="flex justify-between items-center">
                        <div>
                            <p class="text-sm text-gray-600">Order: ${this.orderId}</p>
                            <p class="text-lg font-bold text-green-600">₦${this.amount.toFixed(2)}</p>
                        </div>
                        <span class="px-3 py-1 bg-yellow-100 text-yellow-800 text-xs font-semibold rounded-full border border-yellow-300">
                            LIVE MODE
                        </span>
                    </div>
                </div>

                <!-- Polling status indicator -->
                ${this.pollingAttempts > 0 && !this.paymentHandled ? `
                    <div class="bg-blue-50 p-3 border-b">
                        <div class="flex items-center justify-center">
                            <div class="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
                            <span class="text-sm text-blue-600">
                                Verifying payment... (${this.pollingAttempts * 5}s)
                            </span>
                        </div>
                    </div>
                ` : ''}

                <!-- Payment iframe -->
                <div class="flex-1">
                    <iframe 
                        id="paystack-iframe" 
                        src="${this.authorizationUrl}"
                        class="w-full h-full border-0"
                        sandbox="allow-same-origin allow-scripts allow-popups allow-forms"
                        allow="payment"
                    ></iframe>
                </div>

                <!-- Processing dialog (hidden) -->
                <div id="processing-dialog" class="hidden">
                    <div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                        <div class="bg-white rounded-lg p-6 max-w-sm">
                            <div class="flex items-center mb-4">
                                <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                                <h3 class="text-lg font-semibold">Processing Payment...</h3>
                            </div>
                            <p class="text-gray-600">Please wait while we verify your payment. This may take a few seconds.</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    /**
     * Update modal content
     */
    updateContent() {
        const contentDiv = this.modal.querySelector('#payment-content');
        if (contentDiv) {
            contentDiv.innerHTML = this.loading ? this.renderLoading() : 
                                  this.error ? this.renderError() : 
                                  this.renderPaymentView();
            
            // Re-attach event listeners
            if (this.error) {
                this.modal.querySelector('#retry-payment')?.addEventListener('click', () => {
                    this.error = null;
                    this.loading = true;
                    this.paymentHandled = false;
                    this.pollingAttempts = 0;
                    this.updateContent();
                    this.initializePayment();
                });
                
                this.modal.querySelector('#cancel-payment')?.addEventListener('click', () => {
                    this.close();
                    if (this.onCancel) this.onCancel();
                });
            }

            // Setup iframe message listener
            if (this.authorizationUrl) {
                this.setupMessageListener();
            }
        }
    }

    /**
     * Setup message listener for iframe callbacks
     */
    setupMessageListener() {
    this.messageHandler = async (event) => {
        try {
            console.log('Message event received:', {
                origin: event.origin,
                data: event.data,
                type: typeof event.data
            });

            // Security: Only accept messages from PayStack domains
            const allowedOrigins = [
                'https://checkout.paystack.com',
                'https://paystack.com',
                'https://paystack.co',
                'https://standard.paystack.co'
            ];

            if (!allowedOrigins.includes(event.origin)) {
                console.warn('Blocked message from unauthorized origin:', event.origin);
                return;
            }

            // Handle different message formats
            let callbackUrl = null;
            
            if (typeof event.data === 'string') {
                // Direct URL string
                callbackUrl = event.data;
            } else if (event.data && typeof event.data === 'object') {
                // PayStack event object
                console.log('PayStack event:', event.data.event, event.data.data);
                
                // Check for callback URL in different possible locations
                if (event.data.url) {
                    callbackUrl = event.data.url;
                } else if (event.data.data && event.data.data.url) {
                    callbackUrl = event.data.data.url;
                } else if (event.data.callbackUrl) {
                    callbackUrl = event.data.callbackUrl;
                } else if (event.data.reference) {
                    // If we get a reference directly, construct the callback
                    const reference = event.data.reference;
                    console.log('Direct reference received:', reference);
                    
                    if (reference && !this.paymentHandled) {
                        this.showProcessingDialog();
                        this.startImmediateVerification(reference);
                        return;
                    }
                }
            }

            // Process the callback URL if we found one
            if (callbackUrl && typeof callbackUrl === 'string') {
                console.log('Processing callback URL:', callbackUrl);
                
                // Extract reference from URL
                let reference = null;
                
                try {
                    const urlObj = new URL(callbackUrl);
                    reference = urlObj.searchParams.get('reference') || 
                               urlObj.searchParams.get('trxref');
                } catch (e) {
                    // If URL parsing fails, try to extract reference directly
                    const refMatch = callbackUrl.match(/(?:reference|trxref)=([^&]+)/);
                    reference = refMatch ? refMatch[1] : null;
                }

                if (reference && !this.paymentHandled) {
                    console.log('Payment reference extracted:', reference);
                    this.showProcessingDialog();
                    this.startImmediateVerification(reference);
                }
            }
        } catch (error) {
            console.error('Error in message handler:', error);
        }
    };

    // Add the event listener
    window.addEventListener('message', this.messageHandler);
}
    /**
     * Show processing dialog
     */
    showProcessingDialog() {
        const dialog = document.createElement('div');
        dialog.id = 'payment-processing-dialog';
        dialog.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60';
        dialog.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-sm">
                <div class="flex items-center mb-4">
                    <div class="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    <h3 class="text-lg font-semibold">Processing Payment...</h3>
                </div>
                <p class="text-gray-600">Please wait while we verify your payment. This may take a few seconds.</p>
            </div>
        `;
        document.body.appendChild(dialog);
    }

    /**
     * Hide processing dialog
     */
    hideProcessingDialog() {
        const dialog = document.getElementById('payment-processing-dialog');
        if (dialog) {
            document.body.removeChild(dialog);
        }
    }

    /**
     * Start immediate verification
     */
    async startImmediateVerification(reference) {
        if (this.paymentHandled) return;

        try {
            const immediateResult = await PayStackPaymentService.verifyImmediate({
                reference: reference,
                transactionId: this.transactionId
            });

            if (immediateResult.status === PayStackPaymentService.PaymentStatus.SUCCESS) {
                await this.processSuccessfulPayment(immediateResult);
            } else if (immediateResult.status === PayStackPaymentService.PaymentStatus.PENDING) {
                this.startPollingVerification(reference);
            } else {
                this.showError('Payment verification failed');
            }
        } catch (error) {
            console.error('Immediate verification error:', error);
            this.startPollingVerification(reference);
        }
    }

    /**
     * Start polling verification
     */
    startPollingVerification(reference) {
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
        }

        this.pollingAttempts = 0;
        
        this.pollingTimer = setInterval(async () => {
            if (this.paymentHandled) {
                clearInterval(this.pollingTimer);
                return;
            }

            this.pollingAttempts++;
            this.updateContent(); // Update polling indicator

            if (this.pollingAttempts > this.maxPollingAttempts) {
                clearInterval(this.pollingTimer);
                this.showError('Payment verification timeout. Please check your payment status.');
                return;
            }

            console.log(`Polling attempt ${this.pollingAttempts} for reference: ${reference}`);

            try {
                const pollResult = await PayStackPaymentService.pollPaymentStatus({
                    reference: reference,
                    transactionId: this.transactionId
                });

                if (pollResult.status === PayStackPaymentService.PaymentStatus.SUCCESS) {
                    clearInterval(this.pollingTimer);
                    await this.processSuccessfulPayment(pollResult);
                } else if (pollResult.status === PayStackPaymentService.PaymentStatus.FAILED) {
                    clearInterval(this.pollingTimer);
                    this.showError(`Payment failed: ${pollResult.errorMessage}`);
                }
                // If still pending, continue polling
            } catch (error) {
                console.error('Polling error:', error);
            }
        }, 5000); // Poll every 5 seconds
    }

    /**
     * Process successful payment
     */
    async processSuccessfulPayment(result) {
        if (this.paymentHandled) return;
        this.paymentHandled = true;

        console.log('Processing successful payment:', result.reference);

        try {
            // Add slot balance to student
            const auth = getAuth();
            const studentCloudDB = new StudentCloudDB();
            await studentCloudDB.addSlotBalance(
                auth.currentUser.uid,
                result.amount || this.amount,
                result.transactionId || this.transactionId,
                result.reference || this.paymentReference,
                result.metadata || {}
            );

            // Hide processing dialog
            this.hideProcessingDialog();

            // Show success dialog
            this.showSuccessDialog(result);
        } catch (error) {
            console.error('Error processing payment:', error);
            this.showError('Payment successful but error updating records. Please contact support.');
        }
    }

    /**
     * Show success dialog
     */
    showSuccessDialog(result) {
        this.hideProcessingDialog();

        // Create success modal
        const successModal = document.createElement('div');
        successModal.id = 'payment-success-modal';
        successModal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-70';
        successModal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full">
                <!-- Header -->
                <div class="flex items-center mb-4">
                    <div class="w-8 h-8 text-green-500 mr-3">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <h3 class="text-xl font-semibold">Payment Successful!</h3>
                </div>

                <!-- Content -->
                <div class="space-y-3 mb-6">
                    <p class="text-gray-700">Your payment has been processed successfully!</p>
                    
                    ${result.reference ? `
                        <div class="flex">
                            <span class="font-medium w-24">Reference:</span>
                            <span class="text-gray-600">${result.reference}</span>
                        </div>
                    ` : ''}
                    
                    <div class="flex">
                        <span class="font-medium w-24">Amount:</span>
                        <span class="text-green-600 font-semibold">₦${this.amount.toFixed(2)}</span>
                    </div>
                    
                    <div class="flex">
                        <span class="font-medium w-24">Order ID:</span>
                        <span class="text-gray-600">${this.orderId}</span>
                    </div>
                    
                    <div class="flex">
                        <span class="font-medium w-24">Status:</span>
                        <span class="text-green-600 font-semibold">Success</span>
                    </div>
                    
                    ${result.paidAt ? `
                        <div class="flex">
                            <span class="font-medium w-24">Paid At:</span>
                            <span class="text-gray-600">${result.paidAt.toLocaleString()}</span>
                        </div>
                    ` : ''}
                    
                    <p class="text-sm text-gray-500 italic mt-2">
                        Your slot balance has been updated.
                    </p>
                </div>

                <!-- Actions -->
                <div class="flex justify-end">
                    <button id="continue-button" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        Continue
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(successModal);

        // Add event listener for continue button
        successModal.querySelector('#continue-button').addEventListener('click', () => {
            this.close();
            if (this.onSuccess) {
                this.onSuccess({
                    reference: result.reference,
                    amount: this.amount,
                    orderId: this.orderId,
                    transactionId: this.transactionId
                });
            }
        });
    }

    /**
     * Show error dialog
     */
    showError(message) {
        this.hideProcessingDialog();
        
        // Show toast notification
        this.showToast(message, 'error');
        
        // Close modal after delay
        setTimeout(() => {
            this.close();
            if (this.onFailure) {
                this.onFailure(message);
            }
        }, 3000);
    }

    /**
     * Show toast notification
     */
    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-60 ${
            type === 'error' ? 'bg-red-100 text-red-700 border border-red-200' :
            type === 'success' ? 'bg-green-100 text-green-700 border border-green-200' :
            'bg-blue-100 text-blue-700 border border-blue-200'
        }`;
        toast.innerHTML = `
            <div class="flex items-center">
                ${type === 'error' ? `
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                    </svg>
                ` : type === 'success' ? `
                    <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                        <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                    </svg>
                ` : ''}
                <span>${message}</span>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Remove toast after 3 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 3000);
    }

    /**
     * Close the payment modal
     */
    close() {
        // Clear polling timer
        if (this.pollingTimer) {
            clearInterval(this.pollingTimer);
        }

        // Remove modals
        const paymentModal = document.getElementById('paystack-payment-modal');
        const successModal = document.getElementById('payment-success-modal');
        const processingDialog = document.getElementById('payment-processing-dialog');

        if (paymentModal) document.body.removeChild(paymentModal);
        if (successModal) document.body.removeChild(successModal);
        if (processingDialog) document.body.removeChild(processingDialog);

        // Remove event listeners
        window.removeEventListener('message', this.messageListener);
    }

    /**
     * Open the payment modal
     */
    open() {
        // Modal is automatically shown when created
        return this;
    }
}

// Export for use in other modules
export default PayStackWebView;