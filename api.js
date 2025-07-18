// API Configuration
// Use relative URL in development to work with proxy or same-origin setup
const API_BASE_URL = window.location.hostname === 'localhost' && window.location.port === '8080' 
    ? '/api'  // This will work with proxy server
    : 'http://localhost:5000/api';  // Direct connection to backend (corrected port)

// Stripe public key - will be fetched from server
let STRIPE_PUBLIC_KEY = null;

// API Helper Functions
class RisaAPI {
    constructor() {
        this.baseURL = API_BASE_URL;
    }

    // Generic fetch wrapper with error handling
    async request(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        
        // Get token from localStorage if available
        const token = localStorage.getItem('authToken');
        
        const config = {
            ...options,
            headers: {
                ...(token && { 'Authorization': `Bearer ${token}` }), // Add token if available
                ...options.headers,
            },
            credentials: 'include' // Include cookies for authentication
        };
        
        // Only set Content-Type if not FormData
        if (!(options.body instanceof FormData)) {
            config.headers['Content-Type'] = 'application/json';
        }

        console.log('Making API request:', {
            url,
            hasToken: !!token,
            tokenPreview: token ? token.substring(0, 20) + '...' : 'No token'
        });

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                console.error('API Error Response:', {
                    status: response.status,
                    message: data.message
                });
                throw new Error(data.message || `HTTP error! status: ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication Methods
    async register(userData) {
        return this.request('/auth/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
    }

    async login(email, password) {
        const result = await this.request('/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        // Store authentication state in localStorage as backup
        if (result.user) {
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userType', 'patient');
            localStorage.setItem('userId', result.user.id);
            
            // Store token if returned (for cross-origin requests)
            if (result.token) {
                localStorage.setItem('authToken', result.token);
            }
        }
        
        return result;
    }

    async logout() {
        const result = await this.request('/auth/logout', {
            method: 'POST'
        });
        
        // Clear localStorage
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userType');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        localStorage.removeItem('authToken');
        
        return result;
    }

    async forgotPassword(email) {
        return this.request('/auth/forgot-password', {
            method: 'POST',
            body: JSON.stringify({ email })
        });
    }

    async resetPassword(token, password) {
        return this.request('/auth/reset-password', {
            method: 'POST',
            body: JSON.stringify({ token, password })
        });
    }

    // Appointment Methods
    async getAvailableSlots(date, serviceType) {
        const params = new URLSearchParams({ date });
        if (serviceType) params.append('serviceType', serviceType);
        
        return this.request(`/appointments/available-slots?${params}`);
    }

    async bookAppointment(appointmentData) {
        return this.request('/appointments/book', {
            method: 'POST',
            body: JSON.stringify(appointmentData)
        });
    }

    async getMyAppointments(status = null, upcoming = false) {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (upcoming) params.append('upcoming', 'true');
        
        return this.request(`/appointments/my-appointments?${params}`);
    }

    async getAppointment(appointmentId) {
        return this.request(`/appointments/${appointmentId}`);
    }

    async cancelAppointment(appointmentId, reason = '') {
        return this.request(`/appointments/${appointmentId}/cancel`, {
            method: 'PUT',
            body: JSON.stringify({ reason })
        });
    }

    async rescheduleAppointment(appointmentId, newDate, newTime) {
        return this.request(`/appointments/${appointmentId}/reschedule`, {
            method: 'PUT',
            body: JSON.stringify({ newDate, newTime })
        });
    }

    // Patient Methods
    async getProfile() {
        return this.request('/patients/profile');
    }

    async updateProfile(profileData) {
        return this.request('/patients/profile', {
            method: 'PUT',
            body: JSON.stringify(profileData)
        });
    }

    async updateMedicalInfo(medicalData) {
        return this.request('/patients/medical-info', {
            method: 'PUT',
            body: JSON.stringify(medicalData)
        });
    }

    async getMedicalRecords() {
        return this.request('/patients/medical-records');
    }

    async getMessages(unreadOnly = false) {
        const params = unreadOnly ? '?unreadOnly=true' : '';
        return this.request(`/patients/messages${params}`);
    }

    async sendMessage(subject, message) {
        return this.request('/patients/messages', {
            method: 'POST',
            body: JSON.stringify({ subject, message })
        });
    }

    async markMessageAsRead(messageId) {
        return this.request(`/patients/messages/${messageId}/read`, {
            method: 'PUT'
        });
    }

    async changePassword(currentPassword, newPassword) {
        return this.request('/patients/change-password', {
            method: 'PUT',
            body: JSON.stringify({ currentPassword, newPassword })
        });
    }

    async requestDataExport() {
        return this.request('/patients/data-export', {
            method: 'POST'
        });
    }

    async deleteAccount(password) {
        return this.request('/patients/delete-account', {
            method: 'POST',
            body: JSON.stringify({ password, confirmDeletion: 'true' })
        });
    }

    // Medical Entity Methods
    async getPatientEntities(patientId, entityType = null) {
        const params = entityType ? `?entityType=${entityType}` : '';
        return this.request(`/entities/patient/${patientId}${params}`);
    }

    async analyzeText(text, models = null) {
        return this.request('/entities/analyze', {
            method: 'POST',
            body: JSON.stringify({ text, models })
        });
    }

    async analyzeRecord(recordId) {
        return this.request(`/entities/analyze-record/${recordId}`, {
            method: 'POST'
        });
    }

    async searchPatientsByEntity(entityValue, entityType = null) {
        const params = new URLSearchParams({ entityValue });
        if (entityType) params.append('entityType', entityType);
        return this.request(`/entities/search?${params}`);
    }

    async getEntityStatistics(limit = 20) {
        return this.request(`/entities/statistics?limit=${limit}`);
    }

    async getAvailableModels() {
        return this.request('/entities/models');
    }

    async getPaymentHistory() {
        return this.request('/patients/payment-history');
    }

    // Payment Methods
    async getServicePrices() {
        return this.request('/payments/prices');
    }

    async createPaymentIntent(appointmentId, serviceType) {
        return this.request('/payments/create-payment-intent', {
            method: 'POST',
            body: JSON.stringify({ appointmentId, serviceType })
        });
    }

    async createCheckoutSession(appointmentId, serviceType, email) {
        return this.request('/payments/create-checkout-session', {
            method: 'POST',
            body: JSON.stringify({ appointmentId, serviceType, email })
        });
    }

    async confirmPayment(paymentIntentId) {
        return this.request('/payments/confirm-payment', {
            method: 'POST',
            body: JSON.stringify({ paymentIntentId })
        });
    }

    // Admin Methods (if needed for admin portal)
    async adminLogin(email, password) {
        const result = await this.request('/auth/admin/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
        
        // Store authentication state in localStorage
        if (result.user) {
            localStorage.setItem('isAuthenticated', 'true');
            localStorage.setItem('userType', 'admin');
            localStorage.setItem('adminId', result.user.id);
            
            // Store token if returned
            if (result.token) {
                localStorage.setItem('authToken', result.token);
            }
        }
        
        return result;
    }

    // Health check
    async checkHealth() {
        return this.request('/health');
    }

    // Payment configuration
    async getStripeConfig() {
        return this.request('/payments/config');
    }

    // Initialize Stripe
    async initializeStripe() {
        try {
            const config = await this.getStripeConfig();
            if (config.publishableKey) {
                STRIPE_PUBLIC_KEY = config.publishableKey;
                return STRIPE_PUBLIC_KEY;
            }
            throw new Error('Stripe publishable key not found');
        } catch (error) {
            console.error('Failed to fetch Stripe config:', error);
            throw error;
        }
    }

    // Medical files
    async uploadMedicalFiles(formData) {
        return this.request('/medical-files/upload', {
            method: 'POST',
            body: formData,
            // Don't set Content-Type header for FormData
            headers: {}
        });
    }

    async getMedicalFiles(category) {
        const query = category ? `?category=${category}` : '';
        return this.request(`/medical-files${query}`);
    }

    async deleteMedicalFile(fileId) {
        return this.request(`/medical-files/${fileId}`, {
            method: 'DELETE'
        });
    }
}

// Create and export API instance
try {
    const api = new RisaAPI();
    
    // Export for use in other files
    window.risaAPI = api;
    console.log('RisaAPI initialized successfully:', window.risaAPI);
} catch (error) {
    console.error('Error initializing RisaAPI:', error);
}
