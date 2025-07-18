# SimplyBook.me Setup Guide for Risa Medical

This guide explains how to set up and configure SimplyBook.me for the Risa Medical booking system.

## Why SimplyBook.me?

SimplyBook.me was chosen as the booking and payment solution for Risa Medical because:

- **GDPR Compliant** - Essential for UK medical practices
- **HIPAA Compliance Option** - Available on Standard/Premium plans
- **UK-Based Pricing** - Starting from £7.50/month
- **Medical Features** - Encrypted SOAP notes and patient management
- **Integrated Payments** - Stripe and PayPal support
- **Easy Integration** - Simple widget embedding

## Account Setup

### 1. Create Your SimplyBook.me Account

1. Visit [SimplyBook.me](https://simplybook.me)
2. Click "Start Free Trial"
3. Choose "Healthcare & Medicine" as your industry
4. Select "Private Practice" as your business type

### 2. Basic Configuration

1. **Company Details**:
   - Business Name: Risa Medical
   - Contact: Dr. Leanne Sheridan
   - Email: consultations@risamedical.co.uk
   - Phone: 028 9335 2244
   - Address: 15 Main Street, Ballyclare, BT39 9AA

2. **Working Hours**:
   - Monday-Friday: 9:00 AM - 6:00 PM
   - Saturday: 9:00 AM - 1:00 PM
   - Sunday: Closed

### 3. Service Setup

Add the following services with their respective durations and prices:

1. **Initial Consultation**
   - Duration: 60 minutes
   - Price: £150
   - Description: Comprehensive health assessment with Dr. Sheridan

2. **Follow-up Consultation**
   - Duration: 30 minutes
   - Price: £75
   - Description: Follow-up appointment for existing patients

3. **Complete Health Assessment**
   - Duration: 90 minutes
   - Price: £250
   - Description: Full health screening including blood tests

4. **Women's Health Consultation**
   - Duration: 45 minutes
   - Price: £175
   - Description: Specialized women's health services

5. **Weight Management Program**
   - Duration: 45 minutes
   - Price: £200
   - Description: Initial weight management consultation

6. **Mental Wellbeing Consultation**
   - Duration: 60 minutes
   - Price: £150
   - Description: Mental health and wellbeing assessment

### 4. Payment Integration

1. Navigate to **Settings > Payment Settings**
2. Enable "Accept payments online"
3. Choose **Stripe** as payment provider
4. Connect your Stripe account (or create one)
5. Set payment timing to "Pay on booking"

### 5. Booking Widget Customization

1. Go to **Settings > Booking Website**
2. Select "Widget" tab
3. Customize the following:
   - **Theme**: Default
   - **Primary Color**: #2C5282 (Risa Medical blue)
   - **Show**: Service selection, calendar, time slots
   - **Hide**: Company logo (using custom header)

### 6. Email Notifications

Configure automatic emails under **Settings > Notifications**:

1. **Booking Confirmation**:
   - Enable for customers
   - Include: Service, date, time, price
   - Add custom message about arriving 10 minutes early

2. **Reminder Email**:
   - Send 24 hours before appointment
   - Include location and contact details

3. **SMS Reminders** (optional):
   - Enable if you have SMS credits
   - Send 2 hours before appointment

### 7. GDPR Compliance

1. Go to **Settings > GDPR**
2. Enable GDPR features:
   - Customer data export
   - Right to be forgotten
   - Cookie consent
   - Privacy policy link

3. Add custom privacy policy URL: `https://risamedical.co.uk/privacy-policy.html`

### 8. Medical Features (Standard/Premium Plan)

If using Standard or Premium plan:

1. Enable **HIPAA Compliance** mode
2. Activate **SOAP Notes** for patient records
3. Enable **Two-factor authentication** for staff

## Website Integration

The booking widget is already integrated into `booking-integrated.html`. The code looks like this:

```javascript
var widget = new SimplybookWidget({
    "widget_type": "iframe",
    "url": "https://risamedical.simplybook.me",
    "theme": "default",
    "theme_settings": {
        "sb_base_color": "#2C5282",
        // ... other settings
    }
});
```

### To Update the Widget URL:

1. Get your SimplyBook.me URL (e.g., `risamedical.simplybook.me`)
2. Replace the URL in the widget code in `booking-integrated.html`

## Testing the System

1. **Test Booking**:
   - Make a test booking through the widget
   - Verify email confirmation is received
   - Check that payment processes correctly

2. **Test Cancellation**:
   - Cancel the test booking
   - Verify cancellation email is sent

3. **Admin Access**:
   - Log into SimplyBook.me admin panel
   - Verify you can see and manage bookings

## Monthly Maintenance

1. **Review Analytics**:
   - Check booking statistics
   - Review no-show rates
   - Monitor popular time slots

2. **Update Availability**:
   - Block out holidays/vacation days
   - Adjust service times if needed

3. **Export Data**:
   - Monthly backup of customer data
   - Export financial reports for accounting

## Support

- **SimplyBook.me Support**: support@simplybook.me
- **Documentation**: https://help.simplybook.me
- **Live Chat**: Available in admin panel

## Upgrade Path

Start with the **Free Plan** (50 bookings/month) to test the system, then upgrade to:

- **Standard Plan** (£20.90/month) - Recommended for full features including HIPAA compliance
- **Premium Plan** (£41.90/month) - For multiple practitioners or high volume

## Important Notes

1. **Patient Data**: All patient data is stored on SimplyBook.me's secure servers
2. **Backups**: SimplyBook.me handles all backups automatically
3. **Updates**: The widget updates automatically with any changes made in admin panel
4. **Custom Domain**: Premium plan allows custom booking domain (e.g., book.risamedical.co.uk)