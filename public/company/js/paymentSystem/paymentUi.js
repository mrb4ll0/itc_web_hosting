// js/payment/paymentUI.js

import PayStackWebView from "./paystackWebView.js";
import { StudentCloudDB } from "../../../js/fireabase/StudentCloud.js";
import { getAuth } from "../../../js/config/firebaseInit.js";

export class PaymentUI {
    /**
     * Initialize payment for slots purchase
     */
    static async initializeSlotPurchase(amount, slots = 1) {
        const auth = getAuth();
        const user = auth.currentUser;
        
        if (!user) {
            throw new Error('User not authenticated');
        }

        // Get student info
        const studentCloudDB = new StudentCloudDB();
        const student = await studentCloudDB.getStudentById(user.uid);
        
        if (!student) {
            throw new Error('Student not found');
        }

        // Generate order ID
        const orderId = `SLOT_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        // Create payment webview
        const payment = new PayStackWebView({
            email: student.email,
            amount: amount,
            orderId: orderId,
            productName: `${slots} Application Slot${slots > 1 ? 's' : ''}`,
            fullName: student.fullName,
            phone: student.phoneNumber,
            onSuccess: (result) => {
                console.log('Payment successful:', result);
                this.showSuccessNotification(result);
            },
            onFailure: (error) => {
                console.error('Payment failed:', error);
                this.showErrorNotification(error);
            },
            onCancel: () => {
                console.log('Payment cancelled by user');
            }
        });

        return payment.open();
    }

    /**
     * Check if student can apply
     */
    static async checkCanApply(studentId) {
        const studentCloudDB = new StudentCloudDB();
        const canApply = await studentCloudDB.canStudentApply(studentId);
        
        if (!canApply) {
            // Show payment modal
            this.showInsufficientBalanceModal(studentId);
            return false;
        }
        
        return true;
    }

    /**
     * Show insufficient balance modal
     */
    static showInsufficientBalanceModal(studentId) {
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full">
                <div class="flex items-center mb-4">
                    <div class="w-12 h-12 text-yellow-500 mr-4">
                        <svg fill="currentColor" viewBox="0 0 20 20">
                            <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd"/>
                        </svg>
                    </div>
                    <div>
                        <h3 class="text-lg font-semibold text-gray-800">Insufficient Balance</h3>
                        <p class="text-sm text-gray-600">You need ₦500 to submit an application</p>
                    </div>
                </div>
                
                <div class="bg-blue-50 rounded-lg p-4 mb-6">
                    <h4 class="font-medium text-blue-800 mb-2">Purchase Application Slots</h4>
                    <div class="grid grid-cols-3 gap-2">
                        <button class="slot-option px-4 py-3 border border-blue-300 rounded-lg hover:bg-blue-50 text-center" data-amount="1000">
                            <div class="font-bold text-blue-600">2 Slots</div>
                            <div class="text-sm text-gray-600">₦1,000</div>
                        </button>
                        <button class="slot-option px-4 py-3 border border-blue-300 rounded-lg hover:bg-blue-50 text-center" data-amount="2000">
                            <div class="font-bold text-blue-600">4 Slots</div>
                            <div class="text-sm text-gray-600">₦2,000</div>
                        </button>
                        <button class="slot-option px-4 py-3 border border-blue-300 rounded-lg hover:bg-blue-50 text-center" data-amount="3000">
                            <div class="font-bold text-blue-600">6 Slots</div>
                            <div class="text-sm text-gray-600">₦3,000</div>
                        </button>
                    </div>
                </div>
                
                <div class="flex justify-end space-x-3">
                    <button id="cancel-purchase" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                        Cancel
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelectorAll('.slot-option').forEach(button => {
            button.addEventListener('click', async () => {
                const amount = parseFloat(button.dataset.amount);
                const slots = amount / 500;
                
                // Close modal
                document.body.removeChild(modal);
                
                // Initialize payment
                await this.initializeSlotPurchase(amount, slots);
            });
        });

        modal.querySelector('#cancel-purchase').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }

    /**
     * Show success notification
     */
    static showSuccessNotification(result) {
        // Create success toast
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 bg-green-100 text-green-700 border border-green-200';
        toast.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/>
                </svg>
                <div>
                    <div class="font-medium">Payment Successful!</div>
                    <div class="text-sm">₦${result.amount.toFixed(2)} added to your account</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 5000);
    }

    /**
     * Show error notification
     */
    static showErrorNotification(error) {
        const toast = document.createElement('div');
        toast.className = 'fixed top-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 bg-red-100 text-red-700 border border-red-200';
        toast.innerHTML = `
            <div class="flex items-center">
                <svg class="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/>
                </svg>
                <div>
                    <div class="font-medium">Payment Failed</div>
                    <div class="text-sm">${error.message || error}</div>
                </div>
            </div>
        `;
        
        document.body.appendChild(toast);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (toast.parentNode) {
                document.body.removeChild(toast);
            }
        }, 5000);
    }

    /**
     * Show student's balance info
     */
    static async showBalanceInfo(studentId) {
        const studentCloudDB = new StudentCloudDB();
        const balance = await studentCloudDB.getSlotBalance(studentId);
        const availableSlots = Math.floor(balance / 200);
        
        const modal = document.createElement('div');
        modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50';
        modal.innerHTML = `
            <div class="bg-white rounded-lg p-6 max-w-md w-full">
                <h3 class="text-lg font-semibold text-gray-800 mb-4">Your Balance</h3>
                
                <div class="bg-blue-50 rounded-lg p-4 mb-6">
                    <div class="text-center mb-4">
                        <div class="text-3xl font-bold text-blue-600">₦${balance.toFixed(2)}</div>
                        <div class="text-sm text-blue-500">Available Balance</div>
                    </div>
                    
                    <div class="grid grid-cols-2 gap-4">
                        <div class="bg-white rounded p-3 text-center border">
                            <div class="text-2xl font-bold text-green-600">${availableSlots}</div>
                            <div class="text-sm text-gray-600">Available Slots</div>
                        </div>
                        <div class="bg-white rounded p-3 text-center border">
                            <div class="text-2xl font-bold text-gray-600">₦500</div>
                            <div class="text-sm text-gray-600">Per Application</div>
                        </div>
                    </div>
                </div>
                
                <div class="flex justify-between">
                    <button id="add-funds" class="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                        Add Funds
                    </button>
                    <button id="close-balance" class="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
                        Close
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Add event listeners
        modal.querySelector('#add-funds').addEventListener('click', () => {
            document.body.removeChild(modal);
            this.showInsufficientBalanceModal(studentId);
        });

        modal.querySelector('#close-balance').addEventListener('click', () => {
            document.body.removeChild(modal);
        });
    }
}

export default PaymentUI;
