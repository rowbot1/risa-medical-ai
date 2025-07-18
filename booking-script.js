// Booking System JavaScript

// Initialize Stripe (will be done after fetching config)
let stripe;
let elements;
let cardElement;

// Booking state
let bookingState = {
    currentStep: 1,
    selectedService: null,
    selectedDate: null,
    selectedTime: null,
    patientDetails: {},
    paymentIntent: null,
    appointmentId: null
};

// Service prices (will be fetched from API)
let servicePrices = {};

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Booking script initialized');
    
    // Load service prices
    await loadServicePrices();
    
    // Initialize calendar
    initializeCalendar();
    
    // Initialize Stripe Elements for payment step
    initializeStripeElements();
    
    // Handle browser back button
    window.addEventListener('popstate', handleBrowserBack);
    
    // Mobile menu toggle
    const mobileToggle = document.querySelector('.mobile-toggle');
    const navMenu = document.querySelector('.nav-menu');
    
    if (mobileToggle && navMenu) {
        mobileToggle.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            mobileToggle.classList.toggle('active');
        });
    }
});

// Load service prices from API
async function loadServicePrices() {
    try {
        const response = await risaAPI.getServicePrices();
        servicePrices = response.prices;
        renderServices();
    } catch (error) {
        console.error('Error loading service prices:', error);
        showError('Failed to load services. Please refresh the page.');
    }
}

// Render service cards
function renderServices() {
    const container = document.getElementById('serviceCards');
    if (!container) return;
    
    container.innerHTML = '';
    
    for (const [key, service] of Object.entries(servicePrices)) {
        const card = document.createElement('div');
        card.className = 'service-card';
        card.dataset.service = key;
        
        card.innerHTML = `
            <div class="service-icon">
                <i class="${getServiceIcon(key)}"></i>
            </div>
            <h3>${service.name}</h3>
            <p class="service-description">${service.description}</p>
            <div class="service-details">
                <span class="duration"><i class="fas fa-clock"></i> ${service.duration}</span>
                <span class="price">£${service.price}</span>
            </div>
        `;
        
        card.addEventListener('click', () => selectService(key));
        container.appendChild(card);
    }
}

// Get appropriate icon for service
function getServiceIcon(serviceKey) {
    const icons = {
        initial_consultation: 'fas fa-user-md',
        follow_up: 'fas fa-calendar-check',
        health_assessment: 'fas fa-heartbeat',
        womens_health: 'fas fa-female',
        weight_management: 'fas fa-weight',
        mental_wellbeing: 'fas fa-brain'
    };
    return icons[serviceKey] || 'fas fa-stethoscope';
}

// Select service
function selectService(serviceKey) {
    // Remove previous selection
    document.querySelectorAll('.service-card').forEach(card => {
        card.classList.remove('selected');
    });
    
    // Add selection to clicked card
    const selectedCard = document.querySelector(`[data-service="${serviceKey}"]`);
    if (selectedCard) {
        selectedCard.classList.add('selected');
    }
    
    bookingState.selectedService = serviceKey;
    document.getElementById('step1Next').disabled = false;
}

// Calendar functionality
let currentDate = new Date();
let selectedDate = null;

function initializeCalendar() {
    renderCalendar();
}

function renderCalendar() {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    
    // Update month display
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    document.getElementById('currentMonth').textContent = `${monthNames[month]} ${year}`;
    
    // Render day headers
    const daysContainer = document.getElementById('calendarDays');
    daysContainer.innerHTML = '';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        const dayHeader = document.createElement('div');
        dayHeader.className = 'calendar-day-header';
        dayHeader.textContent = day;
        daysContainer.appendChild(dayHeader);
    });
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    // Render dates
    const datesContainer = document.getElementById('calendarDates');
    datesContainer.innerHTML = '';
    
    // Add empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        const emptyDate = document.createElement('div');
        emptyDate.className = 'calendar-date empty';
        datesContainer.appendChild(emptyDate);
    }
    
    // Add days of the month
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    for (let day = 1; day <= daysInMonth; day++) {
        const dateCell = document.createElement('div');
        dateCell.className = 'calendar-date';
        dateCell.textContent = day;
        
        const cellDate = new Date(year, month, day);
        cellDate.setHours(0, 0, 0, 0);
        
        // Disable past dates and weekends
        if (cellDate < today || cellDate.getDay() === 0 || cellDate.getDay() === 6) {
            dateCell.classList.add('disabled');
        } else {
            dateCell.addEventListener('click', () => selectDate(year, month, day));
        }
        
        // Highlight selected date
        if (selectedDate && 
            selectedDate.getFullYear() === year && 
            selectedDate.getMonth() === month && 
            selectedDate.getDate() === day) {
            dateCell.classList.add('selected');
        }
        
        datesContainer.appendChild(dateCell);
    }
}

function changeMonth(direction) {
    currentDate.setMonth(currentDate.getMonth() + direction);
    renderCalendar();
}

async function selectDate(year, month, day) {
    selectedDate = new Date(year, month, day);
    bookingState.selectedDate = selectedDate.toISOString().split('T')[0];
    
    // Update calendar display
    renderCalendar();
    
    // Load available time slots
    await loadTimeSlots();
}

async function loadTimeSlots() {
    const timeSlotsContainer = document.getElementById('timeSlots');
    timeSlotsContainer.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Loading available times...</div>';
    
    try {
        const response = await risaAPI.getAvailableSlots(bookingState.selectedDate, bookingState.selectedService);
        const slots = response.slots;
        
        timeSlotsContainer.innerHTML = '';
        
        if (slots.length === 0) {
            timeSlotsContainer.innerHTML = '<p class="no-slots">No available slots for this date. Please select another date.</p>';
            return;
        }
        
        // Group slots by period (morning/afternoon)
        const morningSlots = slots.filter(slot => {
            const hour = parseInt(slot.split(':')[0]);
            return hour < 12;
        });
        
        const afternoonSlots = slots.filter(slot => {
            const hour = parseInt(slot.split(':')[0]);
            return hour >= 12;
        });
        
        // Render morning slots
        if (morningSlots.length > 0) {
            const morningSection = document.createElement('div');
            morningSection.className = 'time-period';
            morningSection.innerHTML = '<h4>Morning</h4>';
            const morningGrid = document.createElement('div');
            morningGrid.className = 'time-grid';
            
            morningSlots.forEach(slot => {
                const timeButton = createTimeSlotButton(slot);
                morningGrid.appendChild(timeButton);
            });
            
            morningSection.appendChild(morningGrid);
            timeSlotsContainer.appendChild(morningSection);
        }
        
        // Render afternoon slots
        if (afternoonSlots.length > 0) {
            const afternoonSection = document.createElement('div');
            afternoonSection.className = 'time-period';
            afternoonSection.innerHTML = '<h4>Afternoon</h4>';
            const afternoonGrid = document.createElement('div');
            afternoonGrid.className = 'time-grid';
            
            afternoonSlots.forEach(slot => {
                const timeButton = createTimeSlotButton(slot);
                afternoonGrid.appendChild(timeButton);
            });
            
            afternoonSection.appendChild(afternoonGrid);
            timeSlotsContainer.appendChild(afternoonSection);
        }
        
    } catch (error) {
        console.error('Error loading time slots:', error);
        timeSlotsContainer.innerHTML = '<p class="error">Failed to load available times. Please try again.</p>';
    }
}

function createTimeSlotButton(slot) {
    const button = document.createElement('button');
    button.className = 'time-slot';
    button.textContent = formatTime(slot);
    button.dataset.time = slot;
    
    if (bookingState.selectedTime === slot) {
        button.classList.add('selected');
    }
    
    button.addEventListener('click', () => selectTimeSlot(slot));
    return button;
}

function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

function selectTimeSlot(time) {
    // Remove previous selection
    document.querySelectorAll('.time-slot').forEach(slot => {
        slot.classList.remove('selected');
    });
    
    // Add selection to clicked slot
    const selectedSlot = document.querySelector(`[data-time="${time}"]`);
    if (selectedSlot) {
        selectedSlot.classList.add('selected');
    }
    
    bookingState.selectedTime = time;
    document.getElementById('step2Next').disabled = false;
}

// Initialize Stripe Elements
function initializeStripeElements() {
    // Create an instance of Elements
    elements = stripe.elements();
    
    // Custom styling for card element
    const style = {
        base: {
            color: '#32325d',
            fontFamily: '"Inter", sans-serif',
            fontSmoothing: 'antialiased',
            fontSize: '16px',
            '::placeholder': {
                color: '#aab7c4'
            }
        },
        invalid: {
            color: '#fa755a',
            iconColor: '#fa755a'
        }
    };
    
    // Create card element
    cardElement = elements.create('card', { style: style });
    
    // Mount will happen when user reaches payment step
}

// Navigation functions
function nextStep() {
    if (validateCurrentStep()) {
        bookingState.currentStep++;
        updateProgressBar();
        showStep(bookingState.currentStep);
        
        // Mount Stripe card element when reaching payment step
        if (bookingState.currentStep === 4) {
            mountCardElement();
            displayBookingSummary();
        }
    }
}

function previousStep() {
    bookingState.currentStep--;
    updateProgressBar();
    showStep(bookingState.currentStep);
}

function validateCurrentStep() {
    switch (bookingState.currentStep) {
        case 1:
            return bookingState.selectedService !== null;
        case 2:
            return bookingState.selectedDate !== null && bookingState.selectedTime !== null;
        case 3:
            return validateDetailsForm();
        default:
            return true;
    }
}

function validateDetailsForm() {
    const form = document.getElementById('detailsForm');
    let isValid = true;
    
    // Clear previous errors
    form.querySelectorAll('.form-group').forEach(group => {
        group.classList.remove('has-error', 'has-success');
    });
    
    // Validate each field
    const fields = form.querySelectorAll('input[required], select[required], textarea[required]');
    fields.forEach(field => {
        const formGroup = field.closest('.form-group');
        const value = field.value.trim();
        
        if (!value) {
            isValid = false;
            formGroup.classList.add('has-error');
            showFieldError(formGroup, `${field.labels[0].textContent.replace('*', '').trim()} is required`);
        } else {
            // Additional validation based on field type
            if (field.type === 'email' && !isValidEmail(value)) {
                isValid = false;
                formGroup.classList.add('has-error');
                showFieldError(formGroup, 'Please enter a valid email address');
            } else if (field.type === 'tel' && !isValidPhone(value)) {
                isValid = false;
                formGroup.classList.add('has-error');
                showFieldError(formGroup, 'Please enter a valid phone number');
            } else if (field.type === 'date' && !isValidDate(value)) {
                isValid = false;
                formGroup.classList.add('has-error');
                showFieldError(formGroup, 'Please enter a valid date');
            } else {
                formGroup.classList.add('has-success');
            }
        }
    });
    
    // Check consent checkbox
    const consentCheckbox = form.querySelector('#consent');
    if (!consentCheckbox.checked) {
        isValid = false;
        const formGroup = consentCheckbox.closest('.form-group');
        formGroup.classList.add('has-error');
        showFieldError(formGroup, 'You must consent to data processing');
    }
    
    if (!isValid) {
        showError('Please fill in all required fields correctly');
    }
    
    return isValid;
}

// Validation helper functions
function isValidEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

function isValidPhone(phone) {
    // Remove spaces and check if it's a valid UK phone number
    const cleanPhone = phone.replace(/\s/g, '');
    const phoneRegex = /^(\+44|0)[0-9]{10,11}$/;
    return phoneRegex.test(cleanPhone);
}

function isValidDate(date) {
    const selectedDate = new Date(date);
    const today = new Date();
    const minAge = new Date();
    minAge.setFullYear(minAge.getFullYear() - 18);
    
    // Check if date is valid and person is at least 18
    return selectedDate < today && selectedDate <= minAge;
}

function showFieldError(formGroup, message) {
    // Remove existing error
    let errorElement = formGroup.querySelector('.field-error');
    if (!errorElement) {
        errorElement = document.createElement('div');
        errorElement.className = 'field-error';
        formGroup.appendChild(errorElement);
    }
    errorElement.textContent = message;
}

// Real-time validation
document.addEventListener('DOMContentLoaded', function() {
    const detailsForm = document.getElementById('detailsForm');
    if (detailsForm) {
        // Add real-time validation to form fields
        detailsForm.querySelectorAll('input, select, textarea').forEach(field => {
            field.addEventListener('blur', function() {
                validateField(this);
            });
            
            field.addEventListener('input', function() {
                const formGroup = this.closest('.form-group');
                if (formGroup.classList.contains('has-error')) {
                    validateField(this);
                }
            });
        });
    }
});

function validateField(field) {
    const formGroup = field.closest('.form-group');
    const value = field.value.trim();
    
    formGroup.classList.remove('has-error', 'has-success');
    const errorElement = formGroup.querySelector('.field-error');
    if (errorElement) {
        errorElement.remove();
    }
    
    if (field.hasAttribute('required') && !value) {
        formGroup.classList.add('has-error');
        showFieldError(formGroup, `${field.labels[0].textContent.replace('*', '').trim()} is required`);
    } else if (value) {
        // Additional validation based on field type
        if (field.type === 'email' && !isValidEmail(value)) {
            formGroup.classList.add('has-error');
            showFieldError(formGroup, 'Please enter a valid email address');
        } else if (field.type === 'tel' && !isValidPhone(value)) {
            formGroup.classList.add('has-error');
            showFieldError(formGroup, 'Please enter a valid phone number');
        } else if (field.type === 'date' && !isValidDate(value)) {
            formGroup.classList.add('has-error');
            showFieldError(formGroup, 'Must be 18 or older');
        } else {
            formGroup.classList.add('has-success');
        }
    }
}

function updateProgressBar() {
    document.querySelectorAll('.progress-step').forEach((step, index) => {
        if (index < bookingState.currentStep) {
            step.classList.add('completed');
            step.classList.remove('active');
        } else if (index === bookingState.currentStep - 1) {
            step.classList.add('active');
            step.classList.remove('completed');
        } else {
            step.classList.remove('active', 'completed');
        }
    });
}

function showStep(stepNumber) {
    document.querySelectorAll('.booking-step').forEach(step => {
        step.classList.remove('active');
    });
    
    document.getElementById(`step-${stepNumber}`).classList.add('active');
    
    // Scroll to top of booking container
    document.querySelector('.booking-container').scrollIntoView({ behavior: 'smooth' });
}

// Proceed to payment (from step 3)
async function proceedToPayment() {
    if (!validateDetailsForm()) {
        return;
    }
    
    // Collect form data
    const form = document.getElementById('detailsForm');
    const formData = new FormData(form);
    
    bookingState.patientDetails = {
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        email: formData.get('email'),
        phone: formData.get('phone'),
        dateOfBirth: formData.get('dateOfBirth'),
        gender: formData.get('gender'),
        medicalConcerns: formData.get('medicalConcerns'),
        newPatient: formData.get('newPatient') === 'on',
        consent: formData.get('consent') === 'on',
        marketing: formData.get('marketing') === 'on'
    };
    
    // Create appointment and payment intent
    try {
        showLoadingOverlay('Creating your appointment...');
        
        // First, create the appointment
        const appointmentData = {
            ...bookingState.patientDetails,
            serviceType: bookingState.selectedService,
            appointmentDate: bookingState.selectedDate,
            appointmentTime: bookingState.selectedTime,
            notes: bookingState.patientDetails.medicalConcerns
        };
        
        const appointmentResponse = await risaAPI.createAppointment(appointmentData);
        bookingState.appointmentId = appointmentResponse.appointmentId;
        
        // Create payment intent
        const paymentResponse = await risaAPI.createPaymentIntent(
            bookingState.appointmentId,
            bookingState.selectedService
        );
        
        bookingState.paymentIntent = paymentResponse;
        
        hideLoadingOverlay();
        nextStep();
        
    } catch (error) {
        hideLoadingOverlay();
        console.error('Error creating appointment:', error);
        showError('Failed to create appointment. Please try again.');
    }
}

// Mount Stripe card element
function mountCardElement() {
    const cardContainer = document.getElementById('card-element');
    if (cardContainer && !cardContainer.hasChildNodes()) {
        cardElement.mount('#card-element');
        
        // Handle card errors
        cardElement.on('change', function(event) {
            const displayError = document.getElementById('card-errors');
            if (event.error) {
                displayError.textContent = event.error.message;
            } else {
                displayError.textContent = '';
            }
        });
    }
}

// Display booking summary
function displayBookingSummary() {
    const summary = document.getElementById('bookingSummary');
    const service = servicePrices[bookingState.selectedService];
    
    const summaryHTML = `
        <div class="summary-item">
            <span class="summary-label">Service:</span>
            <span class="summary-value">${service.name}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Date:</span>
            <span class="summary-value">${formatDate(bookingState.selectedDate)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Time:</span>
            <span class="summary-value">${formatTime(bookingState.selectedTime)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Duration:</span>
            <span class="summary-value">${service.duration}</span>
        </div>
        <div class="summary-item">
            <span class="summary-label">Patient:</span>
            <span class="summary-value">${bookingState.patientDetails.firstName} ${bookingState.patientDetails.lastName}</span>
        </div>
        <div class="summary-item total">
            <span class="summary-label">Total:</span>
            <span class="summary-value">£${service.price}</span>
        </div>
    `;
    
    summary.innerHTML = summaryHTML;
}

// Complete booking
async function completeBooking() {
    const button = document.getElementById('completeBookingBtn');
    const btnText = button.querySelector('.btn-text');
    const btnLoading = button.querySelector('.btn-loading');
    const paymentProcessing = document.getElementById('paymentProcessing');
    const errorElement = document.getElementById('card-errors');
    
    // Clear any previous errors
    errorElement.textContent = '';
    errorElement.innerHTML = '';
    
    // Check if card is complete
    if (!cardElement._complete) {
        errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Please complete your card details';
        return;
    }
    
    // Disable button and show loading
    button.disabled = true;
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-block';
    paymentProcessing.classList.add('active');
    
    try {
        // Confirm payment with Stripe
        const { error, paymentIntent } = await stripe.confirmCardPayment(
            bookingState.paymentIntent.clientSecret,
            {
                payment_method: {
                    card: cardElement,
                    billing_details: {
                        name: `${bookingState.patientDetails.firstName} ${bookingState.patientDetails.lastName}`,
                        email: bookingState.patientDetails.email,
                        phone: bookingState.patientDetails.phone
                    }
                }
            }
        );
        
        if (error) {
            // Show error to customer
            errorElement.innerHTML = `<i class="fas fa-exclamation-circle"></i> ${error.message}`;
            
            // Show specific error messages for common issues
            if (error.code === 'card_declined') {
                errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Your card was declined. Please try a different card.';
            } else if (error.code === 'insufficient_funds') {
                errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Your card has insufficient funds.';
            } else if (error.code === 'expired_card') {
                errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Your card has expired.';
            }
            
            // Re-enable button
            button.disabled = false;
            btnText.style.display = 'inline-block';
            btnLoading.style.display = 'none';
            paymentProcessing.classList.remove('active');
            
        } else if (paymentIntent.status === 'succeeded') {
            // Update processing message
            const processingContent = paymentProcessing.querySelector('p');
            processingContent.textContent = 'Payment successful! Confirming booking...';
            
            // Payment successful, confirm with backend
            await risaAPI.confirmPayment(paymentIntent.id);
            
            // Show success message
            showSuccessStep();
            paymentProcessing.classList.remove('active');
        }
        
    } catch (error) {
        console.error('Payment error:', error);
        errorElement.innerHTML = '<i class="fas fa-exclamation-circle"></i> Payment failed. Please try again or contact support.';
        
        // Re-enable button
        button.disabled = false;
        btnText.style.display = 'inline-block';
        btnLoading.style.display = 'none';
        paymentProcessing.classList.remove('active');
    }
}

// Show success step
function showSuccessStep() {
    // Hide all steps
    document.querySelectorAll('.booking-step').forEach(step => {
        step.classList.remove('active');
    });
    
    // Show success step
    document.getElementById('step-success').classList.add('active');
    
    // Display confirmation details
    const service = servicePrices[bookingState.selectedService];
    const confirmationDetails = document.getElementById('confirmationDetails');
    
    confirmationDetails.innerHTML = `
        <div class="confirmation-item">
            <i class="fas fa-calendar"></i>
            <div>
                <strong>Appointment Date:</strong><br>
                ${formatDate(bookingState.selectedDate)} at ${formatTime(bookingState.selectedTime)}
            </div>
        </div>
        <div class="confirmation-item">
            <i class="fas fa-user-md"></i>
            <div>
                <strong>Service:</strong><br>
                ${service.name} with Dr. Leanne Sheridan
            </div>
        </div>
        <div class="confirmation-item">
            <i class="fas fa-envelope"></i>
            <div>
                <strong>Confirmation Email:</strong><br>
                Sent to ${bookingState.patientDetails.email}
            </div>
        </div>
        <div class="confirmation-item">
            <i class="fas fa-info-circle"></i>
            <div>
                <strong>What's Next:</strong><br>
                Check your email for appointment details and patient portal login credentials.
            </div>
        </div>
    `;
    
    // Update progress bar to show completion
    document.querySelectorAll('.progress-step').forEach(step => {
        step.classList.add('completed');
        step.classList.remove('active');
    });
}

// Utility functions
function formatDate(dateString) {
    const date = new Date(dateString + 'T00:00:00');
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('en-GB', options);
}

function showError(message) {
    // Create toast notification
    const toast = document.createElement('div');
    toast.className = 'toast toast-error';
    toast.innerHTML = `
        <i class="fas fa-exclamation-circle"></i>
        <span>${message}</span>
    `;
    
    document.body.appendChild(toast);
    
    // Remove after 5 seconds
    setTimeout(() => {
        toast.remove();
    }, 5000);
}

function showLoadingOverlay(message = 'Loading...') {
    const overlay = document.createElement('div');
    overlay.className = 'loading-overlay';
    overlay.id = 'loadingOverlay';
    overlay.innerHTML = `
        <div class="loading-content">
            <i class="fas fa-spinner fa-spin"></i>
            <p>${message}</p>
        </div>
    `;
    
    document.body.appendChild(overlay);
}

function hideLoadingOverlay() {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) {
        overlay.remove();
    }
}

function handleBrowserBack(event) {
    // Handle browser back button during booking process
    if (bookingState.currentStep > 1) {
        event.preventDefault();
        previousStep();
    }
}

// Add CSS for toast notifications and loading overlay
const style = document.createElement('style');
style.textContent = `
    .toast {
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: #333;
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        gap: 12px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        animation: slideIn 0.3s ease-out;
        z-index: 1000;
    }
    
    .toast-error {
        background: #dc3545;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(100%);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    .loading-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
    }
    
    .loading-content {
        background: white;
        padding: 32px;
        border-radius: 12px;
        text-align: center;
    }
    
    .loading-content i {
        font-size: 48px;
        color: #007bff;
        margin-bottom: 16px;
    }
    
    .loading-content p {
        margin: 0;
        font-size: 18px;
        color: #333;
    }
`;
document.head.appendChild(style);