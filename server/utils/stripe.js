const stripeConfig = require('../config/stripe');

if (!stripeConfig.secretKey) {
  console.error('WARNING: Stripe secret key not found in environment variables');
  console.error('Set STRIPE_SECRET_KEY in your .env file');
}

const stripe = require('stripe')(stripeConfig.secretKey);

// Service pricing configuration
const SERVICE_PRICES = {
  'initial_consultation': {
    name: 'Initial Consultation (60 min)',
    amount: 15000, // £150.00 in pence
    currency: 'gbp',
    description: 'Comprehensive 60-minute initial health assessment with Dr. Sheridan'
  },
  'follow_up': {
    name: 'Follow-up Consultation (30 min)',
    amount: 7500, // £75.00 in pence
    currency: 'gbp',
    description: '30-minute follow-up consultation'
  },
  'health_assessment': {
    name: 'Complete Health Assessment',
    amount: 25000, // £250.00 in pence
    currency: 'gbp',
    description: 'Comprehensive health screening including blood tests'
  },
  'womens_health': {
    name: "Women's Health Consultation",
    amount: 17500, // £175.00 in pence
    currency: 'gbp',
    description: 'Specialized women\'s health consultation and assessment'
  },
  'weight_management': {
    name: 'Weight Management Program',
    amount: 20000, // £200.00 in pence
    currency: 'gbp',
    description: 'Initial weight management consultation and program setup'
  },
  'mental_wellbeing': {
    name: 'Mental Wellbeing Consultation',
    amount: 15000, // £150.00 in pence
    currency: 'gbp',
    description: 'Mental health and wellbeing assessment'
  }
};

class StripeService {
  async createPaymentIntent(serviceType, appointmentId, patientEmail) {
    const service = SERVICE_PRICES[serviceType] || SERVICE_PRICES['initial_consultation'];
    
    try {
      const paymentIntent = await stripe.paymentIntents.create({
        amount: service.amount,
        currency: service.currency,
        description: service.description,
        receipt_email: patientEmail,
        metadata: {
          appointmentId: appointmentId,
          serviceType: serviceType,
          serviceName: service.name
        }
      });

      return {
        clientSecret: paymentIntent.client_secret,
        paymentIntentId: paymentIntent.id,
        amount: service.amount,
        currency: service.currency,
        serviceName: service.name
      };
    } catch (error) {
      console.error('Stripe payment intent error:', error);
      throw new Error('Failed to create payment intent');
    }
  }

  async confirmPayment(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
      return {
        status: paymentIntent.status,
        amount: paymentIntent.amount,
        currency: paymentIntent.currency,
        paid: paymentIntent.status === 'succeeded'
      };
    } catch (error) {
      console.error('Stripe payment confirmation error:', error);
      throw new Error('Failed to confirm payment');
    }
  }

  async createCheckoutSession(serviceType, appointmentId, patientEmail, successUrl, cancelUrl) {
    const service = SERVICE_PRICES[serviceType] || SERVICE_PRICES['initial_consultation'];
    
    try {
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [{
          price_data: {
            currency: service.currency,
            product_data: {
              name: service.name,
              description: service.description,
            },
            unit_amount: service.amount,
          },
          quantity: 1,
        }],
        mode: 'payment',
        success_url: successUrl,
        cancel_url: cancelUrl,
        customer_email: patientEmail,
        metadata: {
          appointmentId: appointmentId,
          serviceType: serviceType
        }
      });

      return {
        sessionId: session.id,
        url: session.url
      };
    } catch (error) {
      console.error('Stripe checkout session error:', error);
      throw new Error('Failed to create checkout session');
    }
  }

  async handleWebhook(payload, signature) {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    
    try {
      const event = stripe.webhooks.constructEvent(payload, signature, webhookSecret);
      
      switch (event.type) {
        case 'payment_intent.succeeded':
          return {
            type: 'payment_success',
            paymentIntentId: event.data.object.id,
            appointmentId: event.data.object.metadata.appointmentId,
            amount: event.data.object.amount
          };
          
        case 'payment_intent.payment_failed':
          return {
            type: 'payment_failed',
            paymentIntentId: event.data.object.id,
            appointmentId: event.data.object.metadata.appointmentId
          };
          
        case 'checkout.session.completed':
          return {
            type: 'checkout_completed',
            sessionId: event.data.object.id,
            appointmentId: event.data.object.metadata.appointmentId,
            paymentIntentId: event.data.object.payment_intent
          };
          
        default:
          return { type: 'unhandled', eventType: event.type };
      }
    } catch (error) {
      console.error('Webhook error:', error);
      throw new Error('Webhook signature verification failed');
    }
  }

  getServicePrices() {
    return SERVICE_PRICES;
  }
}

module.exports = new StripeService();
