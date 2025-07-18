// Admin Dashboard JavaScript
document.addEventListener('DOMContentLoaded', async () => {
    // First check if we have a token in localStorage
    const authToken = localStorage.getItem('authToken');
    const userType = localStorage.getItem('userType');
    
    console.log('Checking localStorage auth:', {
        hasToken: !!authToken,
        userType: userType
    });
    
    // If no token or not admin, redirect to login
    if (!authToken || userType !== 'admin') {
        console.log('No admin token found, redirecting to login');
        window.location.href = '/admin-login.html';
        return;
    }
    
    // Check if admin is logged in by verifying with API
    try {
        console.log('Verifying admin authentication...');
        
        // Try to verify admin authentication with a simple endpoint first
        const authResult = await window.risaAPI.request('/auth/check');
        console.log('Admin authentication verified:', authResult);
        
        // Double check it's admin
        if (authResult.userType !== 'admin') {
            throw new Error('Not authenticated as admin');
        }
        
        // Admin info is already displayed in the HTML
        // We can update it if needed from the auth result
        const adminNameElement = document.querySelector('.admin-name');
        if (adminNameElement && authResult.user && authResult.user.name) {
            adminNameElement.textContent = authResult.user.name;
        }
        
        // Initialize dashboard
        await loadDashboardStats();
        setupEventListeners();
        
        // Set today's date
        const today = new Date();
        document.getElementById('todayDate').textContent = today.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        
        // Load initial data
        loadTodaySchedule();
        
    } catch (error) {
        console.error('Admin authentication failed:', error);
        // Clear any stale admin data
        localStorage.removeItem('adminEmail');
        localStorage.removeItem('adminName');
        localStorage.removeItem('adminRole');
        
        // Redirect to admin login
        window.location.href = '/admin-login.html';
        return;
    }
});

// Load dashboard statistics
async function loadDashboardStats() {
    try {
        const stats = await window.risaAPI.request('/admin/dashboard');
        
        // Update stats
        document.getElementById('todayCount').textContent = stats.todayAppointments.length;
        document.getElementById('patientCount').textContent = stats.activePatients;
        document.getElementById('weekCount').textContent = stats.upcomingAppointments;
        document.getElementById('messageCount').textContent = stats.unreadMessages;
    } catch (error) {
        console.error('Error loading dashboard stats:', error);
    }
}

// Load today's schedule
async function loadTodaySchedule() {
    try {
        const today = new Date().toISOString().split('T')[0];
        const appointments = await window.risaAPI.request(`/admin/appointments?date=${today}`);
        
        const tbody = document.getElementById('todaySchedule');
        
        if (appointments.appointments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align: center; color: #718096;">
                        No appointments scheduled for today
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = appointments.appointments
            .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))
            .map(apt => `
                <tr>
                    <td>${formatTime(apt.appointment_time)}</td>
                    <td>${apt.first_name} ${apt.last_name}</td>
                    <td>${apt.service_type}</td>
                    <td>
                        <span class="appointment-status status-${apt.status}">
                            ${apt.status}
                        </span>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="viewAppointment(${apt.id})">
                            View
                        </button>
                        ${apt.status === 'pending' ? `
                            <button class="btn btn-sm btn-secondary" onclick="updateAppointmentStatus(${apt.id}, 'confirmed')">
                                Confirm
                            </button>
                        ` : ''}
                    </td>
                </tr>
            `).join('');
    } catch (error) {
        console.error('Error loading today schedule:', error);
    }
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
    
    // Logout
    document.getElementById('adminLogoutBtn').addEventListener('click', async (e) => {
        e.preventDefault();
        try {
            await window.risaAPI.logout();
            window.location.href = '/';
        } catch (error) {
            console.error('Logout error:', error);
        }
    });
    
    // Appointment filters
    document.getElementById('appointmentDateFilter').addEventListener('change', loadAllAppointments);
    document.getElementById('appointmentStatusFilter').addEventListener('change', loadAllAppointments);
    
    // Patient search
    let searchTimeout;
    let isEntitySearchMode = false;
    
    document.getElementById('patientSearch').addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            if (isEntitySearchMode) {
                searchPatientsByEntity(e.target.value);
            } else {
                searchPatients(e.target.value);
            }
        }, 300);
    });
    
    // Entity type filter
    document.getElementById('entityTypeFilter').addEventListener('change', () => {
        const searchValue = document.getElementById('patientSearch').value;
        if (isEntitySearchMode && searchValue) {
            searchPatientsByEntity(searchValue);
        }
    });
    
    // Toggle search mode
    document.getElementById('toggleSearchMode').addEventListener('click', () => {
        isEntitySearchMode = !isEntitySearchMode;
        const btn = document.getElementById('toggleSearchMode');
        const info = document.getElementById('entitySearchInfo');
        const searchInput = document.getElementById('patientSearch');
        
        if (isEntitySearchMode) {
            btn.innerHTML = '<i class="fas fa-users"></i> Regular Search';
            btn.classList.remove('btn-secondary');
            btn.classList.add('btn-primary');
            info.style.display = 'block';
            searchInput.placeholder = 'Search by medical condition, medication, or anatomical term...';
        } else {
            btn.innerHTML = '<i class="fas fa-exchange-alt"></i> Entity Search';
            btn.classList.remove('btn-primary');
            btn.classList.add('btn-secondary');
            info.style.display = 'none';
            searchInput.placeholder = 'Search patients by name, email, phone, or medical entity...';
        }
        
        // Clear and refresh search
        searchInput.value = '';
        loadPatients();
    });
    
    // Session form
    document.getElementById('sessionForm').addEventListener('submit', createSession);
    
    // Week navigation
    let currentWeekOffset = 0;
    document.getElementById('prevWeek').addEventListener('click', () => {
        currentWeekOffset--;
        loadWeeklySchedule(currentWeekOffset);
    });
    
    document.getElementById('nextWeek').addEventListener('click', () => {
        currentWeekOffset++;
        loadWeeklySchedule(currentWeekOffset);
    });
}

// Show section
function showSection(sectionName) {
    // Hide all sections
    document.querySelectorAll('.admin-section').forEach(section => {
        section.style.display = 'none';
    });
    
    // Show selected section
    const section = document.getElementById(`${sectionName}-section`);
    if (section) {
        section.style.display = 'block';
        
        // Load section-specific data
        switch(sectionName) {
            case 'appointments':
                loadAllAppointments();
                break;
            case 'schedule':
                loadWeeklySchedule();
                break;
            case 'patients':
                loadPatients();
                break;
            case 'messages':
                loadAdminMessages();
                break;
            case 'reports':
                loadReports();
                break;
        }
    }
}

// Load all appointments
async function loadAllAppointments() {
    try {
        const date = document.getElementById('appointmentDateFilter').value;
        const status = document.getElementById('appointmentStatusFilter').value;
        
        let url = '/admin/appointments?';
        if (date) url += `date=${date}&`;
        if (status) url += `status=${status}&`;
        
        const appointments = await window.risaAPI.request(url);
        const tbody = document.getElementById('allAppointments');
        
        if (appointments.appointments.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: #718096;">
                        No appointments found
                    </td>
                </tr>
            `;
            return;
        }
        
        tbody.innerHTML = appointments.appointments.map(apt => `
            <tr>
                <td>${new Date(apt.appointment_date).toLocaleDateString()}</td>
                <td>${formatTime(apt.appointment_time)}</td>
                <td>${apt.first_name} ${apt.last_name}</td>
                <td>${apt.service_type}</td>
                <td>
                    <span class="appointment-status status-${apt.status}">
                        ${apt.status}
                    </span>
                </td>
                <td>
                    <select onchange="updateAppointmentStatus(${apt.id}, this.value)" 
                            class="form-select" style="width: auto; display: inline-block;">
                        <option value="">Update Status</option>
                        <option value="confirmed" ${apt.status === 'confirmed' ? 'disabled' : ''}>Confirm</option>
                        <option value="completed" ${apt.status === 'completed' ? 'disabled' : ''}>Complete</option>
                        <option value="no-show" ${apt.status === 'no-show' ? 'disabled' : ''}>No Show</option>
                        <option value="cancelled" ${apt.status === 'cancelled' ? 'disabled' : ''}>Cancel</option>
                    </select>
                    <button class="btn btn-sm btn-primary" onclick="viewPatient(${apt.patient_id})">
                        View Patient
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading appointments:', error);
    }
}

// Create session
async function createSession(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    
    try {
        // Here you would call an API to create doctor sessions
        // For now, we'll show a success message
        alert('Session created successfully!');
        e.target.reset();
        loadWeeklySchedule();
    } catch (error) {
        alert('Error creating session: ' + error.message);
    }
}

// Load weekly schedule
async function loadWeeklySchedule(weekOffset = 0) {
    const scheduleDiv = document.getElementById('weeklySchedule');
    
    // Calculate week dates
    const today = new Date();
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay() + (weekOffset * 7));
    
    const weekDays = [];
    for (let i = 0; i < 7; i++) {
        const date = new Date(startOfWeek);
        date.setDate(startOfWeek.getDate() + i);
        weekDays.push(date);
    }
    
    // Update week label
    const weekLabel = weekOffset === 0 ? 'This Week' : 
                     weekOffset === 1 ? 'Next Week' : 
                     weekOffset === -1 ? 'Last Week' : 
                     `Week of ${weekDays[0].toLocaleDateString()}`;
    document.getElementById('currentWeek').textContent = weekLabel;
    
    // Create schedule grid
    scheduleDiv.innerHTML = `
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 1rem;">
            ${weekDays.map(date => `
                <div style="text-align: center;">
                    <h4 style="margin-bottom: 0.5rem; color: ${date.toDateString() === today.toDateString() ? 'var(--primary-color)' : '#4A5568'};">
                        ${date.toLocaleDateString('en-US', { weekday: 'short' })}
                    </h4>
                    <p style="font-size: 1.25rem; font-weight: 600; margin-bottom: 1rem;">
                        ${date.getDate()}
                    </p>
                    <div id="day-${date.toISOString().split('T')[0]}" style="min-height: 100px;">
                        <small style="color: #CBD5E0;">Loading...</small>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Load appointments for each day
    weekDays.forEach(async date => {
        const dateStr = date.toISOString().split('T')[0];
        try {
            const appointments = await window.risaAPI.request(`/admin/appointments?date=${dateStr}`);
            const dayDiv = document.getElementById(`day-${dateStr}`);
            
            if (appointments.appointments.length === 0) {
                dayDiv.innerHTML = '<small style="color: #CBD5E0;">No appointments</small>';
            } else {
                dayDiv.innerHTML = appointments.appointments.map(apt => `
                    <div style="background: #EBF8FF; padding: 0.25rem; margin-bottom: 0.25rem; border-radius: 0.25rem; font-size: 0.75rem;">
                        ${formatTime(apt.appointment_time)}
                    </div>
                `).join('');
            }
        } catch (error) {
            console.error('Error loading day appointments:', error);
        }
    });
}

// Load patients
async function loadPatients() {
    try {
        const patients = await window.risaAPI.request('/admin/patients');
        displayPatients(patients.patients);
    } catch (error) {
        console.error('Error loading patients:', error);
    }
}

// Search patients
async function searchPatients(query) {
    try {
        const patients = await window.risaAPI.request(`/admin/patients?search=${encodeURIComponent(query)}`);
        displayPatients(patients.patients);
    } catch (error) {
        console.error('Error searching patients:', error);
    }
}

// Search patients by medical entity
async function searchPatientsByEntity(query) {
    try {
        if (!query || query.trim().length < 2) {
            loadPatients(); // Load all patients if query is too short
            return;
        }
        
        const entityType = document.getElementById('entityTypeFilter').value;
        const response = await window.risaAPI.searchPatientsByEntity(query, entityType || null);
        
        if (response.patients && response.patients.length > 0) {
            // Add entity information to each patient for display
            const patientsWithEntities = response.patients.map(patient => ({
                ...patient,
                matchingEntities: patient.matching_entities
            }));
            displayPatientsWithEntities(patientsWithEntities);
        } else {
            const listDiv = document.getElementById('patientsList');
            listDiv.innerHTML = `
                <p style="text-align: center; color: #718096;">
                    No patients found with ${entityType || 'any'} entity matching "${query}"
                </p>
            `;
        }
    } catch (error) {
        console.error('Error searching patients by entity:', error);
        const listDiv = document.getElementById('patientsList');
        listDiv.innerHTML = '<p style="text-align: center; color: #E53E3E;">Error searching patients</p>';
    }
}

// Display patients
function displayPatients(patients) {
    const listDiv = document.getElementById('patientsList');
    
    if (patients.length === 0) {
        listDiv.innerHTML = '<p style="text-align: center; color: #718096;">No patients found</p>';
        return;
    }
    
    listDiv.innerHTML = patients.map(patient => {
        const initials = patient.first_name.charAt(0) + patient.last_name.charAt(0);
        return `
            <div class="patient-card">
                <div class="patient-avatar">${initials}</div>
                <div class="patient-info">
                    <div class="patient-name">${patient.first_name} ${patient.last_name}</div>
                    <div class="patient-details">
                        ${patient.email} • ${patient.phone}
                    </div>
                </div>
                <div class="patient-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewPatientDetails(${patient.id})">
                        View Details
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="newAppointmentForPatient(${patient.id})">
                        Book Appointment
                    </button>
                    <button class="btn btn-sm btn-success" onclick="addMedicalRecord(${patient.id}, '${patient.first_name} ${patient.last_name}')">
                        <i class="fas fa-file-medical"></i> Add Record
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Display patients with entity matches highlighted
function displayPatientsWithEntities(patients) {
    const listDiv = document.getElementById('patientsList');
    
    if (patients.length === 0) {
        listDiv.innerHTML = '<p style="text-align: center; color: #718096;">No patients found</p>';
        return;
    }
    
    listDiv.innerHTML = patients.map(patient => {
        const initials = patient.first_name.charAt(0) + patient.last_name.charAt(0);
        return `
            <div class="patient-card">
                <div class="patient-avatar">${initials}</div>
                <div class="patient-info">
                    <div class="patient-name">${patient.first_name} ${patient.last_name}</div>
                    <div class="patient-details">
                        ${patient.email} • ${patient.phone}
                    </div>
                    ${patient.matchingEntities ? `
                        <div style="margin-top: 0.5rem;">
                            <small style="color: #4A90E2; font-weight: 500;">
                                <i class="fas fa-tags"></i> Matching entities: ${patient.matchingEntities}
                            </small>
                        </div>
                    ` : ''}
                </div>
                <div class="patient-actions">
                    <button class="btn btn-sm btn-primary" onclick="viewPatientDetails(${patient.id})">
                        View Details
                    </button>
                    <button class="btn btn-sm btn-secondary" onclick="newAppointmentForPatient(${patient.id})">
                        Book Appointment
                    </button>
                    <button class="btn btn-sm btn-success" onclick="addMedicalRecord(${patient.id}, '${patient.first_name} ${patient.last_name}')">
                        <i class="fas fa-file-medical"></i> Add Record
                    </button>
                </div>
            </div>
        `;
    }).join('');
}

// Load admin messages
async function loadAdminMessages() {
    try {
        const messages = await window.risaAPI.request('/admin/messages');
        const listDiv = document.getElementById('adminMessagesList');
        
        if (messages.messages.length === 0) {
            listDiv.innerHTML = '<p style="text-align: center; color: #718096;">No messages</p>';
            return;
        }
        
        listDiv.innerHTML = messages.messages.map(msg => `
            <div class="patient-card ${!msg.is_read && msg.sender_type === 'patient' ? 'unread' : ''}">
                <div class="patient-info">
                    <div class="patient-name">${msg.subject}</div>
                    <div class="patient-details">
                        From: ${msg.first_name} ${msg.last_name} (${msg.patient_email})
                    </div>
                    <p style="margin-top: 0.5rem;">${msg.message}</p>
                    <small style="color: #718096;">
                        ${new Date(msg.created_at).toLocaleString()}
                    </small>
                </div>
                <div class="patient-actions">
                    <button class="btn btn-sm btn-primary" onclick="replyToMessage(${msg.id})">
                        Reply
                    </button>
                </div>
            </div>
        `).join('');
    } catch (error) {
        console.error('Error loading messages:', error);
    }
}

// Load reports
async function loadReports() {
    console.log('Loading reports...');
    
    // Load entity statistics
    try {
        const stats = await window.risaAPI.getEntityStatistics(30);
        displayEntityStatistics(stats.statistics);
    } catch (error) {
        console.error('Error loading entity statistics:', error);
        document.getElementById('entityStatistics').innerHTML = 
            '<p style="text-align: center; color: #E53E3E;">Error loading entity statistics</p>';
    }
}

// Display entity statistics
function displayEntityStatistics(statistics) {
    const container = document.getElementById('entityStatistics');
    
    if (!statistics || statistics.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: #718096;">No entity data available yet</p>';
        return;
    }
    
    // Group statistics by entity type
    const grouped = statistics.reduce((acc, stat) => {
        if (!acc[stat.entity_type]) {
            acc[stat.entity_type] = [];
        }
        acc[stat.entity_type].push(stat);
        return acc;
    }, {});
    
    // Define entity type styling
    const entityTypeInfo = {
        'anatomy': { icon: 'fa-user-injured', label: 'Anatomy', color: '#4a90e2' },
        'medication': { icon: 'fa-pills', label: 'Medications', color: '#7b68ee' },
        'condition': { icon: 'fa-stethoscope', label: 'Medical Conditions', color: '#e74c3c' },
        'oncology': { icon: 'fa-ribbon', label: 'Oncology', color: '#ff6b9d' },
        'protein': { icon: 'fa-dna', label: 'Proteins', color: '#00b894' },
        'genome': { icon: 'fa-microscope', label: 'Genomic', color: '#fdcb6e' }
    };
    
    container.innerHTML = Object.entries(grouped).map(([type, entities]) => {
        const info = entityTypeInfo[type] || { icon: 'fa-tag', label: type, color: '#95a5a6' };
        
        return `
            <div style="margin-bottom: 2rem;">
                <h4 style="color: ${info.color}; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                    <i class="fas ${info.icon}"></i> ${info.label}
                </h4>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 0.75rem;">
                    ${entities.slice(0, 10).map(entity => `
                        <div style="
                            background: ${info.color}10;
                            border: 1px solid ${info.color}30;
                            padding: 0.75rem;
                            border-radius: 0.5rem;
                            display: flex;
                            justify-content: space-between;
                            align-items: center;
                        ">
                            <span style="color: ${info.color}; font-weight: 500; font-size: 0.875rem;">
                                ${entity.entity_value}
                            </span>
                            <span style="background: ${info.color}; color: white; padding: 0.25rem 0.5rem; border-radius: 1rem; font-size: 0.75rem;">
                                ${entity.patient_count} patients
                            </span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }).join('');
}

// Update appointment status
async function updateAppointmentStatus(appointmentId, status) {
    if (!status) return;
    
    try {
        await window.risaAPI.request(`/admin/appointments/${appointmentId}/status`, {
            method: 'PUT',
            body: JSON.stringify({ status })
        });
        
        alert('Appointment status updated successfully!');
        loadAllAppointments();
        loadDashboardStats();
    } catch (error) {
        alert('Error updating appointment: ' + error.message);
    }
}

// View appointment details
function viewAppointment(appointmentId) {
    // In a real implementation, this would show appointment details
    alert(`View appointment ${appointmentId} details`);
}

// View patient details
async function viewPatientDetails(patientId) {
    try {
        const patient = await window.risaAPI.request(`/admin/patients/${patientId}`);
        
        // Create a modal or navigate to patient details page
        const details = `
            Patient: ${patient.patient.first_name} ${patient.patient.last_name}
            Email: ${patient.patient.email}
            Phone: ${patient.patient.phone}
            Total Appointments: ${patient.appointments.length}
            Medical Records: ${patient.medicalRecords.length}
        `;
        
        alert(details);
    } catch (error) {
        alert('Error loading patient details: ' + error.message);
    }
}

// Reply to message
function replyToMessage(messageId) {
    const subject = prompt('Subject:');
    const message = prompt('Message:');
    
    if (subject && message) {
        window.risaAPI.request(`/admin/messages/${messageId}/reply`, {
            method: 'POST',
            body: JSON.stringify({ subject, message })
        }).then(() => {
            alert('Reply sent successfully!');
            loadAdminMessages();
        }).catch(error => {
            alert('Error sending reply: ' + error.message);
        });
    }
}

// Export functions
function exportReport(type) {
    alert(`Export ${type} report functionality would be implemented here`);
}

function exportAuditLog() {
    alert('Export audit log functionality would be implemented here');
}

// Format time helper
function formatTime(time24) {
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
}

// Add styles
const style = document.createElement('style');
style.textContent = `
    .form-control {
        padding: 0.5rem 1rem;
        border: 1px solid #E2E8F0;
        border-radius: 0.375rem;
        font-size: 1rem;
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
    
    .appointment-status {
        padding: 0.25rem 0.75rem;
        border-radius: 9999px;
        font-size: 0.75rem;
        font-weight: 600;
        text-transform: uppercase;
        display: inline-block;
    }
    
    .status-pending {
        background-color: #FEEBC8;
        color: #744210;
    }
    
    .status-confirmed {
        background-color: #C6F6D5;
        color: #22543D;
    }
    
    .status-completed {
        background-color: #E0E7FF;
        color: #3730A3;
    }
    
    .status-cancelled {
        background-color: #FED7D7;
        color: #742A2A;
    }
    
    .status-no-show {
        background-color: #E2E8F0;
        color: #4A5568;
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
    
    .patient-card.unread {
        background-color: #F0F8FF;
        border-color: #2B6CB0;
    }
`;
document.head.appendChild(style);

// Medical Record Functions
function addMedicalRecord(patientId, patientName) {
    document.getElementById('recordPatientId').value = patientId;
    document.getElementById('recordPatientName').value = patientName;
    document.getElementById('recordType').value = '';
    document.getElementById('recordTitle').value = '';
    document.getElementById('recordContent').value = '';
    document.getElementById('uploadedFileName').textContent = '';
    document.getElementById('analyzeImmediately').checked = true;
    document.getElementById('medicalRecordModal').style.display = 'flex';
}

function closeMedicalRecordModal() {
    document.getElementById('medicalRecordModal').style.display = 'none';
}

// Load markdown file content
async function loadMarkdownFile(input) {
    const file = input.files[0];
    if (file) {
        if (file.size > 10 * 1024 * 1024) {
            alert('File size must be less than 10MB');
            input.value = '';
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(e) {
            document.getElementById('recordContent').value = e.target.result;
            document.getElementById('uploadedFileName').textContent = file.name;
            
            // Auto-fill title if empty
            if (!document.getElementById('recordTitle').value) {
                const titleFromFilename = file.name.replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]/g, ' ');
                document.getElementById('recordTitle').value = titleFromFilename;
            }
        };
        reader.onerror = function() {
            alert('Error reading file');
        };
        reader.readAsText(file);
    }
}

// Setup medical record form submission
const medicalRecordForm = document.getElementById('medicalRecordForm');
if (medicalRecordForm) {
    medicalRecordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const patientId = document.getElementById('recordPatientId').value;
        const recordType = document.getElementById('recordType').value;
        const title = document.getElementById('recordTitle').value;
        const content = document.getElementById('recordContent').value;
        const analyzeImmediately = document.getElementById('analyzeImmediately').checked;
        
        try {
            // Create medical record
            const response = await window.risaAPI.request(`/admin/patients/${patientId}/medical-records`, {
                method: 'POST',
                body: JSON.stringify({
                    recordType,
                    title,
                    content
                })
            });
            
            if (response.recordId && analyzeImmediately) {
                // Analyze the record with NER
                try {
                    await window.risaAPI.analyzeRecord(response.recordId);
                    alert('Medical record created and analyzed successfully!');
                } catch (nerError) {
                    console.error('NER analysis error:', nerError);
                    alert('Medical record created successfully, but analysis failed. You can analyze it later.');
                }
            } else {
                alert('Medical record created successfully!');
            }
            
            closeMedicalRecordModal();
            
            // Refresh patient list if we're on that page
            if (document.getElementById('patients-section').style.display !== 'none') {
                loadPatients();
            }
        } catch (error) {
            alert('Error creating medical record: ' + error.message);
        }
    });
}

// Make functions available globally
window.addMedicalRecord = addMedicalRecord;
window.closeMedicalRecordModal = closeMedicalRecordModal;
window.loadMarkdownFile = loadMarkdownFile;
