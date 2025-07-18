// Dashboard JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    // Check if user is logged in - always verify with API
    console.log('Verifying authentication with API...');
    
    try {
        // Try to get profile - this will verify if the user is actually authenticated
        const profile = await window.risaAPI.getProfile();
        console.log('API verification successful, user is authenticated');
        
        // Update localStorage to keep in sync
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('userId', profile.patient.id.toString());
        localStorage.setItem('userEmail', profile.patient.email);
        localStorage.setItem('userName', `${profile.patient.first_name} ${profile.patient.last_name}`);
        
        // Initialize dashboard with the profile data
        window.userData = profile.patient;
        
        // Load dashboard components
        await loadUserInfo();
        await loadDashboardData();
        setupEventListeners();
        
        // Set active section based on URL hash
        const hash = window.location.hash.slice(1) || 'overview';
        showSection(hash);
        
    } catch (error) {
        console.error('Authentication verification failed:', error);
        
        // Clear any stale authentication data
        localStorage.removeItem('isAuthenticated');
        localStorage.removeItem('userId');
        localStorage.removeItem('userEmail');
        localStorage.removeItem('userName');
        
        // Redirect to login
        console.log('Redirecting to login page...');
        window.location.href = '/patient-portal.html';
    }
});

// Load user information
async function loadUserInfo() {
    try {
        // Use already loaded userData if available
        const patient = window.userData || (await window.risaAPI.getProfile()).patient;
        
        // Update user info in sidebar
        document.getElementById('userName').textContent = `${patient.first_name} ${patient.last_name}`;
        document.getElementById('userEmail').textContent = patient.email;
        document.getElementById('welcomeName').textContent = patient.first_name;
        
        // Set avatar initials
        const initials = patient.first_name.charAt(0) + patient.last_name.charAt(0);
        document.getElementById('userAvatar').textContent = initials;
        
        // Store user data for later use
        window.userData = patient;
    } catch (error) {
        console.error('Error loading user info:', error);
        // Don't redirect here, let the main auth check handle it
    }
}

// Load dashboard data
async function loadDashboardData() {
    try {
        // Load appointments
        const appointments = await window.risaAPI.getMyAppointments();
        updateAppointmentStats(appointments.appointments);
        displayUpcomingAppointments(appointments.appointments);
        
        // Load unread messages count
        const messages = await window.risaAPI.getMessages(true);
        document.getElementById('unreadMessages').textContent = messages.messages.length;
    } catch (error) {
        console.error('Error loading dashboard data:', error);
    }
}

// Update appointment statistics
function updateAppointmentStats(appointments) {
    const total = appointments.length;
    const upcoming = appointments.filter(apt => 
        new Date(`${apt.appointment_date} ${apt.appointment_time}`) > new Date() && 
        apt.status !== 'cancelled'
    ).length;
    const completed = appointments.filter(apt => apt.status === 'completed').length;
    
    document.getElementById('totalAppointments').textContent = total;
    document.getElementById('upcomingAppointments').textContent = upcoming;
    document.getElementById('completedAppointments').textContent = completed;
}

// Display upcoming appointments
function displayUpcomingAppointments(appointments) {
    const upcomingList = document.getElementById('upcomingList');
    const upcoming = appointments
        .filter(apt => 
            new Date(`${apt.appointment_date} ${apt.appointment_time}`) > new Date() && 
            apt.status !== 'cancelled'
        )
        .sort((a, b) => new Date(`${a.appointment_date} ${a.appointment_time}`) - 
                       new Date(`${b.appointment_date} ${b.appointment_time}`))
        .slice(0, 3); // Show only next 3
    
    if (upcoming.length === 0) {
        return; // Keep empty state
    }
    
    upcomingList.innerHTML = upcoming.map(apt => createAppointmentHTML(apt)).join('');
}

// Create appointment HTML
function createAppointmentHTML(appointment) {
    const date = new Date(appointment.appointment_date);
    const day = date.getDate();
    const month = date.toLocaleDateString('en-US', { month: 'short' });
    const time = formatTime(appointment.appointment_time);
    const statusClass = `status-${appointment.status}`;
    
    return `
        <div class="appointment-item">
            <div class="appointment-date">
                <span class="day">${day}</span>
                <span class="month">${month}</span>
            </div>
            <div class="appointment-details">
                <h4>${appointment.service_type}</h4>
                <p><i class="fas fa-clock"></i> ${time}</p>
                ${appointment.notes ? `<p><i class="fas fa-notes-medical"></i> ${appointment.notes}</p>` : ''}
            </div>
            <div>
                <span class="appointment-status ${statusClass}">${appointment.status}</span>
                ${appointment.status === 'pending' || appointment.status === 'confirmed' ? `
                    <div style="margin-top: 0.5rem;">
                        <button class="btn btn-sm btn-primary" onclick="rescheduleAppointment(${appointment.id})">
                            <i class="fas fa-calendar-alt"></i> Reschedule
                        </button>
                        <button class="btn btn-sm btn-secondary" onclick="cancelAppointment(${appointment.id})">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    </div>
                ` : ''}
            </div>
        </div>
    `;
}

// Format time
function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Setup event listeners
function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            showSection(section);
            
            // Update active state
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
    
    // Quick action buttons
    document.querySelectorAll('.action-btn[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            const action = btn.dataset.action;
            showSection(action);
            
            // Update sidebar active state
            document.querySelectorAll('.sidebar-link').forEach(l => l.classList.remove('active'));
            document.querySelector(`.sidebar-link[data-section="${action}"]`).classList.add('active');
        });
    });
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await window.risaAPI.logout();
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
        }
    });
    
    // Form submissions
    setupFormHandlers();
    
    // Appointment filter
    document.getElementById('appointmentFilter').addEventListener('change', (e) => {
        loadAppointments(e.target.value);
    });
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
        section.style.display = 'block';
        
        // Load section-specific data
        switch(sectionName) {
            case 'appointments':
                loadAppointments();
                break;
            case 'medical-records':
                loadMedicalRecords();
                loadUploadedFiles();
                break;
            case 'messages':
                loadMessages();
                break;
            case 'payment-history':
                loadPaymentHistory();
                break;
            case 'profile':
                loadProfile();
                break;
        }
    }
    
    // Update URL
    window.location.hash = sectionName;
}

// Load appointments
async function loadAppointments(filter = 'all') {
    try {
        const appointments = await window.risaAPI.getMyAppointments();
        let filtered = appointments.appointments;
        
        if (filter !== 'all') {
            filtered = filtered.filter(apt => apt.status === filter);
        }
        
        const listElement = document.getElementById('allAppointmentsList');
        
        if (filtered.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-calendar"></i>
                    <p>No appointments found</p>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = filtered
            .sort((a, b) => new Date(`${b.appointment_date} ${b.appointment_time}`) - 
                           new Date(`${a.appointment_date} ${a.appointment_time}`))
            .map(apt => createAppointmentHTML(apt))
            .join('');
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Load medical records
async function loadMedicalRecords() {
    try {
        const records = await window.risaAPI.getMedicalRecords();
        const listElement = document.getElementById('medicalRecordsList');
        
        if (records.records.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-file-medical"></i>
                    <p>No medical records available</p>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = records.records.map(record => `
            <div class="appointment-item">
                <div class="appointment-details">
                    <h4>${record.title}</h4>
                    <p><i class="fas fa-folder"></i> ${record.record_type}</p>
                    <p><i class="fas fa-calendar"></i> ${new Date(record.created_at).toLocaleDateString()}</p>
                    ${record.content ? `<p style="margin-top: 0.5rem;">${record.content}</p>` : ''}
                </div>
                <div>
                    <button class="btn btn-sm btn-secondary" onclick="downloadRecord(${record.id})">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="analyzeRecord(${record.id})" title="Analyze with AI">
                        <i class="fas fa-robot"></i> Analyze
                    </button>
                </div>
            </div>
        `).join('');
        
        // Export records button
        document.getElementById('exportRecords').addEventListener('click', exportAllRecords);
        
        // Also load medical entities
        await loadMedicalEntities();
    } catch (error) {
        console.error('Error loading medical records:', error);
    }
}

// Load messages
async function loadMessages() {
    try {
        const messages = await window.risaAPI.getMessages();
        const listElement = document.getElementById('messagesList');
        
        if (messages.messages.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-inbox"></i>
                    <p>No messages yet</p>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = messages.messages.map(message => `
            <div class="appointment-item ${!message.is_read ? 'unread' : ''}">
                <div class="appointment-details">
                    <h4>${message.subject}</h4>
                    <p><i class="fas fa-user"></i> ${message.sender_type === 'patient' ? 'You' : 'Dr. Sheridan'}</p>
                    <p><i class="fas fa-calendar"></i> ${new Date(message.created_at).toLocaleString()}</p>
                    <p style="margin-top: 0.5rem;">${message.message}</p>
                </div>
                ${!message.is_read && message.sender_type === 'admin' ? `
                    <div>
                        <button class="btn btn-sm btn-primary" onclick="markAsRead(${message.id})">
                            <i class="fas fa-check"></i> Mark Read
                        </button>
                    </div>
                ` : ''}
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Load payment history
async function loadPaymentHistory() {
    try {
        const response = await window.risaAPI.getPaymentHistory();
        const { payments, summary } = response;
        
        // Update summary stats
        document.getElementById('totalPayments').textContent = `£${(summary.totalPaid / 100).toFixed(2)}`;
        document.getElementById('paymentCount').textContent = summary.paymentCount;
        document.getElementById('lastPaymentDate').textContent = summary.lastPaymentDate || '-';
        
        // Filter functionality
        const filterElement = document.getElementById('paymentFilter');
        filterElement.addEventListener('change', () => {
            displayPayments(payments, filterElement.value);
        });
        
        // Display payments
        displayPayments(payments, 'all');
    } catch (error) {
        console.error('Error loading payment history:', error);
        document.getElementById('paymentHistoryList').innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-circle"></i>
                <p>Error loading payment history</p>
            </div>
        `;
    }
}

// Display filtered payments
function displayPayments(payments, filter) {
    let filtered = payments;
    
    if (filter !== 'all') {
        filtered = payments.filter(p => p.payment_status === filter);
    }
    
    const listElement = document.getElementById('paymentHistoryList');
    
    if (filtered.length === 0) {
        listElement.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-receipt"></i>
                <p>No payments found</p>
            </div>
        `;
        return;
    }
    
    // Get service prices for display
    const servicePrices = window.risaAPI.getServicePrices ? {} : {};
    
    listElement.innerHTML = filtered.map(payment => {
        const date = new Date(payment.transaction_date || payment.appointment_created);
        const formattedDate = date.toLocaleDateString('en-GB');
        const formattedTime = formatTime(payment.appointment_time);
        
        return `
            <div class="payment-item">
                <div class="payment-icon">
                    <i class="fas fa-credit-card"></i>
                </div>
                <div class="payment-details">
                    <h4>${payment.service_type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</h4>
                    <p><i class="fas fa-calendar"></i> ${payment.appointment_date} at ${formattedTime}</p>
                    <p><i class="fas fa-clock"></i> Paid on ${formattedDate}</p>
                </div>
                <div class="payment-amount">
                    £${(payment.payment_amount / 100).toFixed(2)}
                </div>
                <div>
                    <span class="payment-status status-${payment.payment_status}">${payment.payment_status}</span>
                    ${payment.payment_status === 'paid' ? `
                        <button class="receipt-btn" onclick="viewReceipt('${payment.payment_intent_id}', '${payment.appointment_id}')" style="margin-left: 0.5rem;">
                            <i class="fas fa-file-invoice"></i> Receipt
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// View payment receipt
async function viewReceipt(paymentIntentId, appointmentId) {
    try {
        // In a real implementation, this would open a receipt modal or download PDF
        alert(`Receipt for Payment ID: ${paymentIntentId}\n\nIn a production environment, this would display or download a detailed receipt.`);
        
        // You could also implement a modal here to show receipt details
        // or trigger a download of a PDF receipt from the server
    } catch (error) {
        alert('Error viewing receipt: ' + error.message);
    }
}

// Load profile
async function loadProfile() {
    if (window.userData) {
        // Personal info form
        const profileForm = document.getElementById('profileForm');
        profileForm.firstName.value = window.userData.first_name || '';
        profileForm.lastName.value = window.userData.last_name || '';
        profileForm.email.value = window.userData.email || '';
        profileForm.phone.value = window.userData.phone || '';
        profileForm.address.value = window.userData.address || '';
        profileForm.city.value = window.userData.city || '';
        profileForm.postcode.value = window.userData.postcode || '';
        
        // Medical info form
        const medicalForm = document.getElementById('medicalForm');
        medicalForm.medicalConditions.value = window.userData.medical_conditions || '';
        medicalForm.medications.value = window.userData.medications || '';
        medicalForm.allergies.value = window.userData.allergies || '';
    }
}

// Setup form handlers
function setupFormHandlers() {
    // Message form
    document.getElementById('messageForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        try {
            await window.risaAPI.sendMessage(formData.get('subject'), formData.get('message'));
            alert('Message sent successfully!');
            e.target.reset();
            loadMessages();
        } catch (error) {
            alert('Error sending message: ' + error.message);
        }
    });
    
    // File upload form
    const fileUploadForm = document.getElementById('fileUploadForm');
    if (fileUploadForm) {
        fileUploadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const fileInput = document.getElementById('medicalFiles');
            const category = document.getElementById('fileCategory').value;
            const description = document.getElementById('fileDescription').value;
            
            if (fileInput.files.length === 0) {
                alert('Please select at least one file');
                return;
            }
            
            const formData = new FormData();
            for (let i = 0; i < fileInput.files.length; i++) {
                formData.append('files', fileInput.files[i]);
            }
            formData.append('category', category);
            formData.append('description', description);
            
            try {
                console.log('Uploading files:', {
                    fileCount: fileInput.files.length,
                    category: category,
                    description: description,
                    authToken: localStorage.getItem('authToken') ? 'Present' : 'Missing'
                });
                
                const response = await window.risaAPI.uploadMedicalFiles(formData);
                alert('Files uploaded successfully!');
                
                // Reset form
                fileUploadForm.reset();
                
                // Reload files list
                await loadUploadedFiles();
            } catch (error) {
                console.error('Upload error details:', error);
                alert('Error uploading files: ' + error.message);
            }
        });
    }
    
    // Profile form
    document.getElementById('profileForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        try {
            await window.risaAPI.updateProfile(data);
            alert('Profile updated successfully!');
        } catch (error) {
            alert('Error updating profile: ' + error.message);
        }
    });
    
    // Medical form
    document.getElementById('medicalForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData);
        
        try {
            await window.risaAPI.updateMedicalInfo(data);
            alert('Medical information updated successfully!');
        } catch (error) {
            alert('Error updating medical info: ' + error.message);
        }
    });
    
    // Password form
    document.getElementById('passwordForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(e.target);
        
        if (formData.get('newPassword') !== formData.get('confirmPassword')) {
            alert('New passwords do not match!');
            return;
        }
        
        try {
            await window.risaAPI.changePassword(
                formData.get('currentPassword'),
                formData.get('newPassword')
            );
            alert('Password changed successfully!');
            e.target.reset();
        } catch (error) {
            alert('Error changing password: ' + error.message);
        }
    });
    
    // Export data
    document.getElementById('exportData').addEventListener('click', async () => {
        try {
            const data = await window.risaAPI.requestDataExport();
            const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `risa-medical-data-${new Date().toISOString().split('T')[0]}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (error) {
            alert('Error exporting data: ' + error.message);
        }
    });
    
    // Delete account
    document.getElementById('deleteAccount').addEventListener('click', async () => {
        const confirmed = confirm('Are you sure you want to delete your account? This action cannot be undone.');
        
        if (confirmed) {
            const password = prompt('Please enter your password to confirm:');
            if (password) {
                try {
                    await window.risaAPI.deleteAccount(password);
                    alert('Account deleted successfully.');
                    window.location.href = '/';
                } catch (error) {
                    alert('Error deleting account: ' + error.message);
                }
            }
        }
    });
}

// Cancel appointment
async function cancelAppointment(appointmentId) {
    const confirmed = confirm('Are you sure you want to cancel this appointment?');
    
    if (confirmed) {
        const reason = prompt('Please provide a reason for cancellation (optional):');
        
        try {
            await window.risaAPI.cancelAppointment(appointmentId, reason || '');
            alert('Appointment cancelled successfully!');
            await loadDashboardData();
            loadAppointments();
        } catch (error) {
            alert('Error cancelling appointment: ' + error.message);
        }
    }
}

// Reschedule appointment
async function rescheduleAppointment(appointmentId) {
    const newDate = prompt('Enter new date (YYYY-MM-DD):');
    if (!newDate) return;
    
    const newTime = prompt('Enter new time (HH:MM):');
    if (!newTime) return;
    
    try {
        await window.risaAPI.rescheduleAppointment(appointmentId, newDate, newTime);
        alert('Appointment rescheduled successfully!');
        await loadDashboardData();
        loadAppointments();
    } catch (error) {
        alert('Error rescheduling appointment: ' + (error.message || 'Time slot not available'));
    }
}

// Mark message as read
async function markAsRead(messageId) {
    try {
        await window.risaAPI.markMessageAsRead(messageId);
        await loadDashboardData();
        loadMessages();
    } catch (error) {
        console.error('Error marking message as read:', error);
    }
}

// Download record
function downloadRecord(recordId) {
    // In a real implementation, this would download the actual file
    alert('Record download feature would be implemented here.');
}

// Export all records
async function exportAllRecords() {
    try {
        const data = await window.risaAPI.requestDataExport();
        const records = data.data.medicalRecords;
        const blob = new Blob([JSON.stringify(records, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `medical-records-${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
    } catch (error) {
        alert('Error exporting records: ' + error.message);
    }
}

// Load uploaded files
async function loadUploadedFiles() {
    try {
        const response = await window.risaAPI.getMedicalFiles();
        const listElement = document.getElementById('uploadedFilesList');
        
        if (!response.files || response.files.length === 0) {
            listElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-folder-open"></i>
                    <p>No documents uploaded yet</p>
                </div>
            `;
            return;
        }
        
        listElement.innerHTML = response.files.map(file => `
            <div class="appointment-item">
                <div class="appointment-date">
                    <i class="fas fa-file-${getFileIcon(file.mimetype)}" style="font-size: 2rem;"></i>
                </div>
                <div class="appointment-details">
                    <h4>${file.original_name}</h4>
                    <p><i class="fas fa-folder"></i> ${formatCategory(file.category)}</p>
                    <p><i class="fas fa-calendar"></i> ${new Date(file.upload_date).toLocaleDateString()}</p>
                    ${file.description ? `<p><i class="fas fa-info-circle"></i> ${file.description}</p>` : ''}
                    <p><i class="fas fa-database"></i> ${formatFileSize(file.size)}</p>
                </div>
                <div>
                    <button class="btn btn-sm btn-primary" onclick="downloadFile(${file.id})">
                        <i class="fas fa-download"></i> Download
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="deleteFile(${file.id})">
                        <i class="fas fa-trash"></i> Delete
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading uploaded files:', error);
    }
}

// Helper function to get file icon based on mime type
function getFileIcon(mimetype) {
    if (mimetype.includes('pdf')) return 'pdf';
    if (mimetype.includes('image')) return 'image';
    if (mimetype.includes('word') || mimetype.includes('document')) return 'word';
    return 'alt';
}

// Helper function to format category
function formatCategory(category) {
    const categories = {
        'general': 'General Documents',
        'lab-results': 'Lab Results',
        'imaging': 'Imaging/Scans',
        'prescriptions': 'Prescriptions',
        'referrals': 'Referral Letters',
        'insurance': 'Insurance Documents',
        'other': 'Other'
    };
    return categories[category] || category;
}

// Helper function to format file size
function formatFileSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Download file
async function downloadFile(fileId) {
    try {
        window.location.href = `/api/medical-files/${fileId}/download`;
    } catch (error) {
        alert('Error downloading file: ' + error.message);
    }
}

// Delete file
async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) return;
    
    try {
        await window.risaAPI.deleteMedicalFile(fileId);
        alert('File deleted successfully');
        await loadUploadedFiles();
    } catch (error) {
        alert('Error deleting file: ' + error.message);
    }
}

// Load medical entities
async function loadMedicalEntities() {
    try {
        if (!window.userData || !window.userData.id) {
            console.error('Patient ID not available');
            return;
        }
        
        const entitiesData = await window.risaAPI.getPatientEntities(window.userData.id);
        
        // Check if we have an entities section
        let entitiesSection = document.getElementById('medicalEntitiesSection');
        if (!entitiesSection) {
            // Create entities section if it doesn't exist
            const recordsSection = document.querySelector('#medical-records-section');
            entitiesSection = document.createElement('div');
            entitiesSection.id = 'medicalEntitiesSection';
            entitiesSection.className = 'section-card';
            entitiesSection.style.marginTop = '2rem';
            entitiesSection.innerHTML = `
                <div class="section-header">
                    <h2 class="section-title">Extracted Medical Information</h2>
                    <span class="text-muted" style="font-size: 0.875rem;">
                        <i class="fas fa-info-circle"></i> AI-extracted entities from your records
                    </span>
                </div>
                <div id="entitiesList" class="entities-container" style="padding: 1.5rem;">
                    <!-- Entities will be displayed here -->
                </div>
            `;
            // Insert before file upload section
            const fileUploadSection = recordsSection.querySelector('.section-card:last-child');
            recordsSection.insertBefore(entitiesSection, fileUploadSection);
        }
        
        const entitiesList = document.getElementById('entitiesList');
        
        if (!entitiesData.entities || entitiesData.entities.length === 0) {
            entitiesList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-microscope"></i>
                    <p>No medical entities extracted yet</p>
                    <p class="text-muted" style="font-size: 0.875rem;">Entities will appear here after your records are analyzed</p>
                </div>
            `;
            return;
        }
        
        // Group entities by type
        const groupedEntities = entitiesData.entities.reduce((acc, entity) => {
            if (!acc[entity.entity_type]) {
                acc[entity.entity_type] = [];
            }
            acc[entity.entity_type].push(entity);
            return acc;
        }, {});
        
        // Define entity type icons and labels
        const entityTypeInfo = {
            'anatomy': { icon: 'fa-user-injured', label: 'Anatomy', color: '#4a90e2' },
            'medication': { icon: 'fa-pills', label: 'Medications', color: '#7b68ee' },
            'condition': { icon: 'fa-stethoscope', label: 'Conditions', color: '#e74c3c' },
            'oncology': { icon: 'fa-ribbon', label: 'Oncology', color: '#ff6b9d' },
            'protein': { icon: 'fa-dna', label: 'Proteins', color: '#00b894' },
            'genome': { icon: 'fa-microscope', label: 'Genomic', color: '#fdcb6e' }
        };
        
        entitiesList.innerHTML = Object.entries(groupedEntities).map(([type, entities]) => {
            const info = entityTypeInfo[type] || { icon: 'fa-tag', label: type, color: '#95a5a6' };
            return `
                <div class="entity-group" style="margin-bottom: 1.5rem;">
                    <h4 style="color: ${info.color}; margin-bottom: 0.75rem;">
                        <i class="fas ${info.icon}"></i> ${info.label}
                    </h4>
                    <div class="entity-tags" style="display: flex; flex-wrap: wrap; gap: 0.5rem;">
                        ${entities.map(entity => `
                            <span class="entity-tag" style="
                                background-color: ${info.color}20;
                                color: ${info.color};
                                padding: 0.25rem 0.75rem;
                                border-radius: 1rem;
                                font-size: 0.875rem;
                                border: 1px solid ${info.color}40;
                                display: inline-flex;
                                align-items: center;
                                gap: 0.25rem;
                            ">
                                ${entity.entity_value}
                                <span style="opacity: 0.7; font-size: 0.75rem;">
                                    (${entity.occurrence_count}x)
                                </span>
                            </span>
                        `).join('')}
                    </div>
                </div>
            `;
        }).join('');
        
    } catch (error) {
        console.error('Error loading medical entities:', error);
    }
}

// Analyze a medical record with NER
async function analyzeRecord(recordId) {
    try {
        const btn = event.target.closest('button');
        const originalHTML = btn.innerHTML;
        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Analyzing...';
        btn.disabled = true;
        
        await window.risaAPI.analyzeRecord(recordId);
        
        btn.innerHTML = '<i class="fas fa-check"></i> Analyzed';
        
        // Reload entities after a short delay
        setTimeout(async () => {
            await loadMedicalEntities();
            btn.innerHTML = originalHTML;
            btn.disabled = false;
        }, 2000);
        
    } catch (error) {
        console.error('Error analyzing record:', error);
        alert('Error analyzing record: ' + error.message);
        const btn = event.target.closest('button');
        btn.innerHTML = '<i class="fas fa-robot"></i> Analyze';
        btn.disabled = false;
    }
}

// Make functions available globally
window.viewReceipt = viewReceipt;
window.analyzeRecord = analyzeRecord;

// Add styles for form controls
const style = document.createElement('style');
style.textContent = `
    .form-control {
        width: 100%;
        padding: 0.75rem 1rem;
        border: 1px solid #E2E8F0;
        border-radius: 0.375rem;
        font-size: 1rem;
        transition: all 0.2s ease;
    }
    
    .form-control:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: 0 0 0 3px rgba(44, 82, 130, 0.1);
    }
    
    .form-select {
        padding: 0.5rem 1rem;
        border: 1px solid #E2E8F0;
        border-radius: 0.375rem;
        background-color: white;
        cursor: pointer;
    }
    
    .form-row {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 1rem;
        margin-bottom: 1rem;
    }
    
    .form-group {
        margin-bottom: 1rem;
    }
    
    .form-group label {
        display: block;
        color: #4A5568;
        font-weight: 500;
        margin-bottom: 0.5rem;
    }
    
    .btn-sm {
        padding: 0.375rem 0.75rem;
        font-size: 0.875rem;
    }
    
    .btn-secondary {
        background-color: #718096;
        color: white;
    }
    
    .btn-secondary:hover {
        background-color: #4A5568;
    }
    
    .btn-danger {
        background-color: #E53E3E;
        color: white;
    }
    
    .btn-danger:hover {
        background-color: #C53030;
    }
    
    .appointment-item.unread {
        background-color: #F0F8FF;
        border-color: #2B6CB0;
    }
    
    @media (max-width: 768px) {
        .form-row {
            grid-template-columns: 1fr;
        }
    }
`;
document.head.appendChild(style);