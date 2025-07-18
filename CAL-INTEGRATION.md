# Cal.com Integration Guide

## Current Status

The Risa Medical website is now integrated with Cal.com for appointment booking. The integration is complete but requires configuration of your Cal.com account.

## Setup Instructions

### 1. Create Your Cal.com Account

1. Go to [Cal.com](https://cal.com/signup)
2. Sign up for an account (use the business/enterprise option for HIPAA compliance)
3. Complete your profile setup

### 2. Configure Your Availability

1. Set your working hours
2. Add buffer times between appointments
3. Configure booking notice (e.g., require 24 hours notice)

### 3. Create Event Types

Create the following event types in Cal.com:

- **Initial Consultation** (60 minutes) - £150
- **Follow-up Appointment** (30 minutes) - £75
- **Extended Consultation** (90 minutes) - £225
- **Urgent Appointment** (30 minutes) - £100

### 4. Update the Website

1. Open `/booking-calcom.html`
2. Find line 481: `calLink: "YOUR-CAL-USERNAME/consultation"`
3. Replace with your actual Cal.com link, e.g.: `calLink: "dr-leanne-sheridan/initial-consultation"`

### 5. Enable HIPAA Compliance (Enterprise Only)

If you have Cal.com Enterprise:
1. Contact Cal.com support to enable HIPAA compliance
2. Sign the BAA (Business Associate Agreement)
3. Enable audit logs and data encryption

## Integration Points

### Public Website
- **Homepage** (`/index.html`) - "Book Online Now" button links to Cal.com booking page
- **Booking Page** (`/booking-calcom.html`) - Embedded Cal.com widget

### Patient Dashboard
- **Overview Section** - "Book New" button for quick access
- **Appointments Section** - "Book New Appointment" button
- **Empty States** - Direct links to booking when no appointments exist

## Features

- ✅ Real-time availability display
- ✅ Instant booking confirmation
- ✅ Email & SMS reminders (configured in Cal.com)
- ✅ Calendar sync (Google, Outlook, etc.)
- ✅ Payment processing (through Cal.com + Stripe)
- ✅ Mobile responsive
- ✅ GDPR compliant
- ✅ HIPAA compliant (with Enterprise plan)

## Archived Files

The following old booking system files have been moved to `/archived-booking-systems/`:
- `booking.html` - Old custom Stripe implementation
- `booking-embedded.html` - SimplyBook.me iframe version
- `booking-integrated.html` - SimplyBook.me widget version
- `booking-simple.html` - SimplyBook.me simple version
- `booking-test.html` - Test file

## Future Enhancements

1. **API Integration** - Use Cal.com API to display appointments directly in patient dashboard
2. **Webhook Integration** - Sync appointment updates with your database
3. **Custom Styling** - Further customize the Cal.com embed appearance
4. **Self-Hosting** - Deploy Cal.com on your own servers for complete control

## Support

- Cal.com Documentation: https://cal.com/docs
- Cal.com Support: support@cal.com
- Your website issues: consultations@risamedical.co.uk