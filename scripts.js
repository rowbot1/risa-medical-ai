// RISA MEDICAL - PROFESSIONAL JAVASCRIPT

document.addEventListener('DOMContentLoaded', () => {
    
    // Smooth Scrolling for Navigation Links
    const initSmoothScroll = () => {
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', function (e) {
                e.preventDefault();
                const target = document.querySelector(this.getAttribute('href'));
                if (target) {
                    const headerOffset = 80;
                    const elementPosition = target.getBoundingClientRect().top;
                    const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                    window.scrollTo({
                        top: offsetPosition,
                        behavior: 'smooth'
                    });
                }
            });
        });
    };

    // Sticky Navigation Effect
    const initStickyNav = () => {
        const header = document.querySelector('.header');
        let lastScroll = 0;

        window.addEventListener('scroll', () => {
            const currentScroll = window.pageYOffset;
            
            if (currentScroll > 100) {
                header.style.boxShadow = '0 2px 10px rgba(0,0,0,0.1)';
            } else {
                header.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
            }

            lastScroll = currentScroll;
        });
    };

    // Mobile Menu Toggle
    const initMobileMenu = () => {
        const mobileToggle = document.querySelector('.mobile-toggle');
        const navMenu = document.querySelector('.nav-menu');
        
        if (mobileToggle) {
            mobileToggle.addEventListener('click', () => {
                navMenu.classList.toggle('active');
                mobileToggle.classList.toggle('active');
            });

            // Close menu when clicking on a link
            document.querySelectorAll('.nav-link').forEach(link => {
                link.addEventListener('click', () => {
                    navMenu.classList.remove('active');
                    mobileToggle.classList.remove('active');
                });
            });
        }
    };

    // Form Handling
    const initFormHandling = () => {
        const form = document.getElementById('bookingForm');
        
        if (form) {
            // Add date picker constraints (no past dates, no weekends)
            const dateInput = form.querySelector('input[name="date"]');
            if (dateInput) {
                const today = new Date().toISOString().split('T')[0];
                dateInput.min = today;
                
                // Update available times when date changes
                dateInput.addEventListener('change', async () => {
                    if (window.risaAPI && window.updateAvailableTimes) {
                        await window.updateAvailableTimes(dateInput.value);
                    }
                });
            }
            
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                
                // Get form data
                const formData = new FormData(form);
                const data = Object.fromEntries(formData);
                
                // Show loading state
                const submitBtn = form.querySelector('button[type="submit"]');
                const originalText = submitBtn.innerHTML;
                submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Processing...';
                submitBtn.disabled = true;
                
                try {
                    // Check if API is loaded
                    if (!window.risaAPI) {
                        throw new Error('API not loaded. Please refresh the page and try again.');
                    }
                    
                    // Format data for appointment booking
                    const appointmentData = {
                        appointmentDate: data.date,
                        appointmentTime: data.time || '10:00', // Default time if not selected
                        serviceType: data.service || 'General Consultation',
                        notes: data.message || ''
                    };
                    
                    // First, register the patient if not logged in
                    if (!isLoggedIn()) {
                        // For demo purposes, create a simple registration
                        const registrationData = {
                            email: data.email,
                            password: generateTempPassword(), // Generate temporary password
                            firstName: data.name.split(' ')[0] || data.name,
                            lastName: data.name.split(' ')[1] || '',
                            phone: data.phone,
                            dateOfBirth: '1990-01-01', // Placeholder
                            gdprConsent: true,
                            marketingConsent: false
                        };
                        
                        try {
                            await window.risaAPI.register(registrationData);
                            // Registration successful, now book appointment
                            const result = await window.risaAPI.bookAppointment(appointmentData);
                            
                            // Show success with login details
                            showSuccessMessage(form, {
                                showLoginDetails: true,
                                email: data.email,
                                tempPassword: registrationData.password
                            });
                        } catch (regError) {
                            if (regError.message.includes('already registered')) {
                                // User exists, prompt to login
                                showErrorMessage(form, 'This email is already registered. Please log in to book an appointment.');
                            } else {
                                throw regError;
                            }
                        }
                    } else {
                        // User is logged in, just book the appointment
                        const result = await window.risaAPI.bookAppointment(appointmentData);
                        showSuccessMessage(form);
                    }
                    
                    // Reset form
                    form.reset();
                } catch (error) {
                    console.error('Booking error:', error);
                    console.error('Error details:', error.stack);
                    showErrorMessage(form, error.message || 'Failed to book appointment. Please try again.');
                } finally {
                    // Reset button
                    submitBtn.innerHTML = originalText;
                    submitBtn.disabled = false;
                }
            });
        }
    };
    
    // Helper function to generate temporary password
    const generateTempPassword = () => {
        return 'Temp' + Math.random().toString(36).slice(-8) + '!';
    };
    
    // Check if user is logged in
    const isLoggedIn = () => {
        // Check for auth token in cookies
        return document.cookie.includes('token=');
    };
    
    // Move updateAvailableTimes outside to make it globally accessible
    window.updateAvailableTimes = async (date) => {
        const timeSelect = document.querySelector('select[name="time"]');
        if (!timeSelect || !date || !window.risaAPI) return;
        
        try {
            const result = await window.risaAPI.getAvailableSlots(date);
            
            // Clear existing options
            timeSelect.innerHTML = '<option value="">Select a time</option>';
            
            // Add available slots
            result.availableSlots.forEach(slot => {
                const option = document.createElement('option');
                option.value = slot;
                option.textContent = formatTime(slot);
                timeSelect.appendChild(option);
            });
            
            timeSelect.disabled = false;
        } catch (error) {
            console.error('Error fetching available times:', error);
            timeSelect.innerHTML = '<option value="">No times available</option>';
            timeSelect.disabled = true;
        }
    };
    
    // Format time for display
    const formatTime = (time24) => {
        const [hours, minutes] = time24.split(':');
        const hour = parseInt(hours);
        const ampm = hour >= 12 ? 'PM' : 'AM';
        const hour12 = hour % 12 || 12;
        return `${hour12}:${minutes} ${ampm}`;
    };

    const showSuccessMessage = (form, options = {}) => {
        const successDiv = document.createElement('div');
        successDiv.className = 'form-success';
        
        if (options.showLoginDetails) {
            successDiv.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <h4>Appointment Booked Successfully!</h4>
                <p>We've created an account for you and booked your appointment.</p>
                <div class="login-details">
                    <p><strong>Your login details:</strong></p>
                    <p>Email: ${options.email}</p>
                    <p>Temporary Password: ${options.tempPassword}</p>
                    <p class="small">Please save these details and change your password after logging in.</p>
                </div>
            `;
        } else {
            successDiv.innerHTML = `
                <i class="fas fa-check-circle"></i>
                <h4>Appointment Booked Successfully!</h4>
                <p>You'll receive a confirmation email shortly.</p>
            `;
        }
        
        form.appendChild(successDiv);
        
        // Remove success message after 10 seconds for login details, 5 for normal
        const timeout = options.showLoginDetails ? 10000 : 5000;
        setTimeout(() => {
            successDiv.style.opacity = '0';
            setTimeout(() => successDiv.remove(), 300);
        }, timeout);
    };
    
    const showErrorMessage = (form, message) => {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'form-error';
        errorDiv.innerHTML = `
            <i class="fas fa-exclamation-circle"></i>
            <h4>Booking Failed</h4>
            <p>${message}</p>
        `;
        
        form.appendChild(errorDiv);
        
        // Remove error message after 5 seconds
        setTimeout(() => {
            errorDiv.style.opacity = '0';
            setTimeout(() => errorDiv.remove(), 300);
        }, 5000);
    };

    // Intersection Observer for Animation
    const initScrollAnimations = () => {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -100px 0px'
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('visible');
                    
                    // Animate counters if they exist
                    if (entry.target.classList.contains('trust-item')) {
                        animateCounter(entry.target);
                    }
                }
            });
        }, observerOptions);

        // Observe elements
        document.querySelectorAll('.service-card, .testimonial-card, .process-step, .trust-item').forEach(el => {
            el.classList.add('fade-in');
            observer.observe(el);
        });

        // Observe sections
        document.querySelectorAll('section').forEach(section => {
            section.classList.add('section-fade');
            observer.observe(section);
        });
    };

    // Counter Animation
    const animateCounter = (element) => {
        const counter = element.querySelector('h3');
        if (!counter || counter.dataset.animated) return;
        
        const text = counter.textContent;
        const number = parseInt(text.match(/\d+/)?.[0] || 0);
        
        if (number) {
            counter.dataset.animated = 'true';
            const duration = 2000;
            const steps = 50;
            const stepValue = number / steps;
            const stepDuration = duration / steps;
            
            let current = 0;
            const timer = setInterval(() => {
                current += stepValue;
                if (current >= number) {
                    current = number;
                    clearInterval(timer);
                }
                counter.textContent = text.replace(/\d+/, Math.floor(current));
            }, stepDuration);
        }
    };

    // Add Loading State to Links
    const initLinkStates = () => {
        document.querySelectorAll('.btn').forEach(btn => {
            btn.addEventListener('click', function(e) {
                if (!this.href || this.href.includes('#')) return;
                
                this.classList.add('loading');
                this.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading...';
            });
        });
    };

    // Initialize all functions
    initSmoothScroll();
    initStickyNav();
    initMobileMenu();
    initFormHandling();
    initScrollAnimations();
    initLinkStates();

    // Add CSS for animations
    const style = document.createElement('style');
    style.textContent = `
        /* Mobile Menu Styles */
        @media (max-width: 768px) {
            .nav-menu {
                position: fixed;
                top: 70px;
                left: 0;
                right: 0;
                background: white;
                flex-direction: column;
                padding: 2rem;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                transform: translateY(-120%);
                transition: transform 0.3s ease;
            }
            
            .nav-menu.active {
                transform: translateY(0);
            }
            
            .mobile-toggle.active span:nth-child(1) {
                transform: rotate(45deg) translate(5px, 5px);
            }
            
            .mobile-toggle.active span:nth-child(2) {
                opacity: 0;
            }
            
            .mobile-toggle.active span:nth-child(3) {
                transform: rotate(-45deg) translate(5px, -5px);
            }
        }
        
        /* Form Success Message */
        .form-success {
            background-color: #48BB78;
            color: white;
            padding: 1.5rem;
            border-radius: 0.5rem;
            text-align: center;
            margin-top: 1.5rem;
            transition: opacity 0.3s ease;
        }
        
        .form-success i {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            display: block;
        }
        
        .form-success h4 {
            margin-bottom: 0.5rem;
            color: white;
        }
        
        .form-success p {
            margin: 0;
            opacity: 0.9;
        }
        
        .form-success .login-details {
            background-color: rgba(255, 255, 255, 0.2);
            padding: 1rem;
            border-radius: 0.25rem;
            margin-top: 1rem;
        }
        
        .form-success .login-details p {
            margin: 0.25rem 0;
        }
        
        .form-success .login-details p.small {
            font-size: 0.875rem;
            font-style: italic;
        }
        
        /* Form Error Message */
        .form-error {
            background-color: #E53E3E;
            color: white;
            padding: 1.5rem;
            border-radius: 0.5rem;
            text-align: center;
            margin-top: 1.5rem;
            transition: opacity 0.3s ease;
        }
        
        .form-error i {
            font-size: 2rem;
            margin-bottom: 0.5rem;
            display: block;
        }
        
        .form-error h4 {
            margin-bottom: 0.5rem;
            color: white;
        }
        
        .form-error p {
            margin: 0;
            opacity: 0.9;
        }
        
        /* Fade In Animations */
        .fade-in {
            opacity: 0;
            transform: translateY(30px);
            transition: all 0.6s ease;
        }
        
        .fade-in.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        .section-fade {
            opacity: 0;
            transition: opacity 0.8s ease;
        }
        
        .section-fade.visible {
            opacity: 1;
        }
        
        /* Stagger Animation for Cards */
        .service-card {
            transition-delay: 0.1s;
        }
        
        .service-card:nth-child(2) {
            transition-delay: 0.2s;
        }
        
        .service-card:nth-child(3) {
            transition-delay: 0.3s;
        }
        
        .service-card:nth-child(4) {
            transition-delay: 0.4s;
        }
        
        .service-card:nth-child(5) {
            transition-delay: 0.5s;
        }
        
        .service-card:nth-child(6) {
            transition-delay: 0.6s;
        }
        
        /* Button Loading State */
        .btn.loading {
            pointer-events: none;
            opacity: 0.7;
        }
        
        /* Hover Effects */
        .service-card,
        .testimonial-card,
        .contact-method {
            transition: all 0.3s ease;
        }
        
        /* Process Timeline Animation */
        .process-step {
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.5s ease;
        }
        
        .process-step.visible {
            opacity: 1;
            transform: translateY(0);
        }
        
        .process-step:nth-child(1) { transition-delay: 0.1s; }
        .process-step:nth-child(2) { transition-delay: 0.2s; }
        .process-step:nth-child(3) { transition-delay: 0.3s; }
        .process-step:nth-child(4) { transition-delay: 0.4s; }
        
        /* Smooth Header Transition */
        .header {
            transition: box-shadow 0.3s ease;
        }
    `;
    document.head.appendChild(style);
});

// Add subtle parallax effect to hero image
window.addEventListener('scroll', () => {
    const scrolled = window.pageYOffset;
    const heroImage = document.querySelector('.hero-image');
    
    if (heroImage && scrolled < 800) {
        heroImage.style.transform = `translateY(${scrolled * 0.3}px)`;
    }
});