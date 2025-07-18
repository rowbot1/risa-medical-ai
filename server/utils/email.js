const nodemailer = require('nodemailer');

// Create reusable transporter
let transporter;

if (process.env.NODE_ENV === 'production') {
    // Production email configuration
    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT || 587,
        secure: process.env.SMTP_SECURE === 'true',
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    });
} else {
    // Development: Use Ethereal Email for testing
    // Create a test account if not in production
    nodemailer.createTestAccount().then(testAccount => {
        transporter = nodemailer.createTransport({
            host: 'smtp.ethereal.email',
            port: 587,
            secure: false,
            auth: {
                user: testAccount.user,
                pass: testAccount.pass
            }
        });
        console.log('Test email account created');
        console.log('Preview URL will be logged for each email sent');
    }).catch(err => {
        console.error('Error creating test email account:', err);
        // Create a simple console transporter for development
        transporter = {
            sendMail: async (mailOptions) => {
                console.log('Development Email:');
                console.log('To:', mailOptions.to);
                console.log('Subject:', mailOptions.subject);
                console.log('Preview: Email would be sent in production');
                return { messageId: 'dev-' + Date.now() };
            }
        };
    });
}

// Email template wrapper
const emailTemplate = (content) => `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Risa Medical</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            line-height: 1.6;
            color: #333;
            background-color: #f5f5f5;
            margin: 0;
            padding: 0;
        }
        .container {
            max-width: 600px;
            margin: 0 auto;
            background-color: #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .header {
            background-color: #2C5282;
            color: white;
            padding: 30px;
            text-align: center;
        }
        .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 300;
        }
        .content {
            padding: 40px 30px;
        }
        .footer {
            background-color: #f8f9fa;
            padding: 20px 30px;
            text-align: center;
            font-size: 14px;
            color: #666;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #2C5282;
            color: white;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
        }
        .button:hover {
            background-color: #1a365d;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Risa Medical</h1>
        </div>
        <div class="content">
            ${content}
        </div>
        <div class="footer">
            <p>Risa Medical - Private GP Practice</p>
            <p>123 Healthcare Street, Medical District, London HC1 2MD</p>
            <p>Phone: 020 7123 4567 | Email: info@risamedical.co.uk</p>
            <p>&copy; ${new Date().getFullYear()} Risa Medical. All rights reserved.</p>
        </div>
    </div>
</body>
</html>
`;

// Send email function
const sendEmail = async ({ to, subject, html, text }) => {
    try {
        // Wait a bit if transporter is not ready yet
        if (!transporter) {
            console.log('Waiting for email transporter to initialize...');
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // If still not ready, use console transporter
            if (!transporter) {
                transporter = {
                    sendMail: async (mailOptions) => {
                        console.log('Development Email (Fallback):');
                        console.log('To:', mailOptions.to);
                        console.log('Subject:', mailOptions.subject);
                        console.log('Preview: Email would be sent in production');
                        return { messageId: 'dev-' + Date.now() };
                    }
                };
            }
        }
        
        // Wrap content in template
        const fullHtml = emailTemplate(html);
        
        // Generate text version if not provided
        if (!text) {
            text = html.replace(/<[^>]*>/g, '').trim();
        }
        
        const mailOptions = {
            from: process.env.EMAIL_FROM || '"Risa Medical" <noreply@risamedical.co.uk>',
            to,
            subject,
            text,
            html: fullHtml
        };
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        
        // Log preview URL in development
        if (process.env.NODE_ENV !== 'production') {
            console.log('Email sent: %s', info.messageId);
            console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));
        }
        
        return info;
    } catch (error) {
        console.error('Email sending failed:', error);
        throw error;
    }
};

// Send appointment reminder (can be used by a cron job)
const sendAppointmentReminder = async (appointment, patient) => {
    const subject = 'Appointment Reminder - Risa Medical';
    const html = `
        <h2>Appointment Reminder</h2>
        <p>Dear ${patient.first_name} ${patient.last_name},</p>
        <p>This is a reminder of your upcoming appointment:</p>
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #2C5282;">
            <p><strong>Date:</strong> ${appointment.appointment_date}</p>
            <p><strong>Time:</strong> ${appointment.appointment_time}</p>
            <p><strong>Service:</strong> ${appointment.service_type}</p>
        </div>
        <p>Please arrive 10 minutes early to complete any necessary paperwork.</p>
        <p>If you need to cancel or reschedule, please contact us at least 24 hours in advance.</p>
        <p>We look forward to seeing you.</p>
        <p>Best regards,<br>Dr. Leanne Sheridan<br>Risa Medical</p>
    `;
    
    return sendEmail({
        to: patient.email,
        subject,
        html
    });
};

// Send payment receipt email
const sendPaymentReceipt = async (payment, appointment, patient) => {
    const subject = 'Payment Receipt - Risa Medical';
    const receiptNumber = `REC-${Date.now()}`;
    const paymentDate = new Date().toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    
    const html = `
        <h2>Payment Receipt</h2>
        <p>Dear ${patient.first_name} ${patient.last_name},</p>
        <p>Thank you for your payment. This email serves as your official receipt.</p>
        
        <div style="background-color: #f9f9f9; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #2C5282;">Receipt Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Receipt Number:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${receiptNumber}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Payment Date:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${paymentDate}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Patient Name:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${patient.first_name} ${patient.last_name}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee;"><strong>Email:</strong></td>
                    <td style="padding: 8px 0; border-bottom: 1px solid #eee; text-align: right;">${patient.email}</td>
                </tr>
            </table>
        </div>
        
        <div style="background-color: #f0f7ff; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #2C5282;">Appointment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0;"><strong>Service:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">${payment.serviceName || appointment.service_type}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;"><strong>Date:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">${appointment.appointment_date}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;"><strong>Time:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">${appointment.appointment_time}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0;"><strong>With:</strong></td>
                    <td style="padding: 8px 0; text-align: right;">Dr. Leanne Sheridan</td>
                </tr>
            </table>
        </div>
        
        <div style="background-color: #e8f5e9; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #2C5282;">Payment Summary</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 12px 0; font-size: 18px;"><strong>Total Paid:</strong></td>
                    <td style="padding: 12px 0; text-align: right; font-size: 18px; color: #2C5282;"><strong>£${(payment.amount / 100).toFixed(2)}</strong></td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #666;">Payment Method:</td>
                    <td style="padding: 8px 0; text-align: right; font-size: 14px; color: #666;">Card ending in ${payment.last4 || '****'}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; font-size: 14px; color: #666;">Transaction ID:</td>
                    <td style="padding: 8px 0; text-align: right; font-size: 14px; color: #666;">${payment.paymentIntentId || payment.id}</td>
                </tr>
            </table>
        </div>
        
        <div style="margin: 30px 0;">
            <h3 style="color: #2C5282;">Important Information</h3>
            <ul style="color: #666;">
                <li>Please arrive 10 minutes before your appointment time</li>
                <li>Bring any relevant medical records or test results</li>
                <li>If you need to cancel or reschedule, please give us at least 24 hours notice</li>
                <li>This receipt is for your records - no action is required</li>
            </ul>
        </div>
        
        <div style="background-color: #f5f5f5; padding: 15px; margin: 20px 0; border-left: 4px solid #2C5282;">
            <p style="margin: 0;"><strong>Need help?</strong> Contact us at:</p>
            <p style="margin: 5px 0;">Phone: 028 9335 2244</p>
            <p style="margin: 5px 0;">Email: consultations@risamedical.co.uk</p>
        </div>
        
        <p>Thank you for choosing Risa Medical for your healthcare needs.</p>
        <p>Best regards,<br>Dr. Leanne Sheridan<br>Risa Medical</p>
    `;
    
    const text = `
Payment Receipt - Risa Medical

Receipt Number: ${receiptNumber}
Payment Date: ${paymentDate}

Dear ${patient.first_name} ${patient.last_name},

Thank you for your payment. This email serves as your official receipt.

APPOINTMENT DETAILS:
Service: ${payment.serviceName || appointment.service_type}
Date: ${appointment.appointment_date}
Time: ${appointment.appointment_time}
With: Dr. Leanne Sheridan

PAYMENT SUMMARY:
Total Paid: £${(payment.amount / 100).toFixed(2)}
Payment Method: Card ending in ${payment.last4 || '****'}
Transaction ID: ${payment.paymentIntentId || payment.id}

Important Information:
- Please arrive 10 minutes before your appointment time
- Bring any relevant medical records or test results
- If you need to cancel or reschedule, please give us at least 24 hours notice

Need help? Contact us at:
Phone: 028 9335 2244
Email: consultations@risamedical.co.uk

Thank you for choosing Risa Medical for your healthcare needs.

Best regards,
Dr. Leanne Sheridan
Risa Medical
    `;
    
    return sendEmail({
        to: patient.email,
        subject,
        html,
        text
    });
};

// Send appointment confirmation with payment details
const sendAppointmentConfirmation = async (appointment, patient, includePaymentDetails = false, paymentInfo = null) => {
    const subject = 'Appointment Confirmed - Risa Medical';
    let paymentSection = '';
    
    if (includePaymentDetails && paymentInfo) {
        paymentSection = `
        <div style="background-color: #e8f5e9; padding: 15px; margin: 20px 0; border-radius: 8px;">
            <p style="margin: 0;"><strong>Payment Status:</strong> <span style="color: #4caf50;">✓ Paid</span></p>
            <p style="margin: 5px 0 0 0;"><strong>Amount:</strong> £${(paymentInfo.amount / 100).toFixed(2)}</p>
        </div>
        `;
    }
    
    const html = `
        <h2>Appointment Confirmed</h2>
        <p>Dear ${patient.first_name} ${patient.last_name},</p>
        <p>Your appointment has been successfully booked.</p>
        
        <div style="background-color: #f0f7ff; padding: 20px; margin: 20px 0; border-radius: 8px;">
            <h3 style="margin-top: 0; color: #2C5282;">Appointment Details</h3>
            <p><strong>Date:</strong> ${appointment.appointment_date}</p>
            <p><strong>Time:</strong> ${appointment.appointment_time}</p>
            <p><strong>Service:</strong> ${appointment.service_type}</p>
            <p><strong>With:</strong> Dr. Leanne Sheridan</p>
            <p><strong>Location:</strong> Risa Medical, 123 Healthcare Street, Medical District, London HC1 2MD</p>
        </div>
        
        ${paymentSection}
        
        <div style="margin: 30px 0;">
            <h3 style="color: #2C5282;">What to Bring</h3>
            <ul>
                <li>Photo ID (passport or driving license)</li>
                <li>List of current medications</li>
                <li>Any relevant medical records or test results</li>
                <li>Insurance details (if applicable)</li>
            </ul>
        </div>
        
        <div style="background-color: #fff3cd; padding: 15px; margin: 20px 0; border-left: 4px solid #ffc107;">
            <p style="margin: 0;"><strong>Important:</strong> Please arrive 10 minutes early to complete any necessary paperwork.</p>
        </div>
        
        <p>If you need to cancel or reschedule your appointment, please contact us at least 24 hours in advance.</p>
        
        <a href="${process.env.FRONTEND_URL}/patient-portal.html" class="button">Access Patient Portal</a>
        
        <p>We look forward to seeing you!</p>
        <p>Best regards,<br>Dr. Leanne Sheridan<br>Risa Medical</p>
    `;
    
    return sendEmail({
        to: patient.email,
        subject,
        html
    });
};

module.exports = {
    sendEmail,
    sendAppointmentReminder,
    sendPaymentReceipt,
    sendAppointmentConfirmation
};