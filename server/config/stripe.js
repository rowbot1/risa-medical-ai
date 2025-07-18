// Stripe configuration
// DO NOT commit actual API keys to version control

module.exports = {
  // Use environment variables for production
  secretKey: process.env.STRIPE_SECRET_KEY,
  publishableKey: process.env.STRIPE_PUBLISHABLE_KEY,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  
  // Service prices in pence (GBP)
  prices: {
    'initial-consultation': {
      amount: 15000, // £150.00
      name: 'Initial Consultation (60 min)',
      duration: 60
    },
    'follow-up': {
      amount: 7500, // £75.00
      name: 'Follow-up Appointment (30 min)',
      duration: 30
    },
    'extended-consultation': {
      amount: 22500, // £225.00
      name: 'Extended Consultation (90 min)',
      duration: 90
    },
    'urgent-appointment': {
      amount: 10000, // £100.00
      name: 'Urgent Appointment (30 min)',
      duration: 30
    }
  }
};