const express = require('express');
const router = express.Router();
const db = require('../utils/database');
const stripeService = require('../utils/stripe');
const { verifyToken: authenticateToken } = require('../middleware/auth');
const { sendPaymentReceipt, sendAppointmentConfirmation } = require('../utils/email');
const stripeConfig = require('../config/stripe');

// Get Stripe configuration (public data only)
router.get('/config', (req, res) => {
  res.json({ 
    publishableKey: stripeConfig.publishableKey || process.env.STRIPE_PUBLISHABLE_KEY
  });
});

// Get service prices
router.get('/prices', (req, res) => {
  const prices = stripeService.getServicePrices();
  res.json({ prices });
});

// Create payment intent for appointment
router.post('/create-payment-intent', authenticateToken, async (req, res) => {
  const { appointmentId, serviceType } = req.body;
  
  try {
    // Get appointment details
    const appointment = await new Promise((resolve, reject) => {
      db.get(
        'SELECT a.*, p.email FROM appointments a JOIN patients p ON a.patient_id = p.id WHERE a.id = ?',
        [appointmentId],
        (err, row) => {
          if (err) reject(err);
          else resolve(row);
        }
      );
    });
    
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    // Create payment intent
    const paymentIntent = await stripeService.createPaymentIntent(
      serviceType,
      appointmentId,
      appointment.email
    );
    
    // Update appointment with payment info
    await new Promise((resolve, reject) => {
      db.run(
        'UPDATE appointments SET payment_intent_id = ?, payment_status = ? WHERE id = ?',
        [paymentIntent.paymentIntentId, 'pending', appointmentId],
        (err) => {
          if (err) reject(err);
          else resolve();
        }
      );
    });
    
    res.json(paymentIntent);
  } catch (error) {
    console.error('Payment intent error:', error);
    res.status(500).json({ error: 'Failed to create payment intent' });
  }
});

// Create checkout session for appointment booking
router.post('/create-checkout-session', async (req, res) => {
  const { appointmentId, serviceType, email } = req.body;
  
  try {
    const successUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/booking-success?appointment_id=${appointmentId}`;
    const cancelUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/booking-cancelled`;
    
    const session = await stripeService.createCheckoutSession(
      serviceType,
      appointmentId,
      email,
      successUrl,
      cancelUrl
    );
    
    res.json(session);
  } catch (error) {
    console.error('Checkout session error:', error);
    res.status(500).json({ error: 'Failed to create checkout session' });
  }
});

// Confirm payment status
router.post('/confirm-payment', authenticateToken, async (req, res) => {
  const { paymentIntentId } = req.body;
  
  try {
    const payment = await stripeService.confirmPayment(paymentIntentId);
    
    if (payment.paid) {
      // Update appointment payment status
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE appointments SET payment_status = ?, payment_amount = ? WHERE payment_intent_id = ?',
          ['paid', payment.amount, paymentIntentId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      // Get appointment details for email
      const appointmentDetails = await new Promise((resolve, reject) => {
        db.get(
          `SELECT a.*, p.email, p.first_name, p.last_name, p.phone 
           FROM appointments a 
           JOIN patients p ON a.patient_id = p.id 
           WHERE a.payment_intent_id = ?`,
          [paymentIntentId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (appointmentDetails) {
        // Send payment receipt
        try {
          await sendPaymentReceipt({
            amount: payment.amount,
            paymentIntentId: paymentIntentId,
            id: paymentIntentId
          }, appointmentDetails, {
            first_name: appointmentDetails.first_name,
            last_name: appointmentDetails.last_name,
            email: appointmentDetails.email
          });
          
          console.log('Payment receipt sent to:', appointmentDetails.email);
        } catch (emailError) {
          console.error('Failed to send payment receipt:', emailError);
        }
      }
    }
    
    res.json(payment);
  } catch (error) {
    console.error('Payment confirmation error:', error);
    res.status(500).json({ error: 'Failed to confirm payment' });
  }
});

// Stripe webhook endpoint
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const signature = req.headers['stripe-signature'];
  
  try {
    const event = await stripeService.handleWebhook(req.body, signature);
    
    if (event.type === 'payment_success' || event.type === 'checkout_completed') {
      // Update appointment as paid
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE appointments SET payment_status = ?, payment_amount = ? WHERE id = ?',
          ['paid', event.amount || 0, event.appointmentId],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      // Update appointment status to confirmed
      await new Promise((resolve, reject) => {
        db.run(
          'UPDATE appointments SET status = ? WHERE id = ? AND status = ?',
          ['confirmed', event.appointmentId, 'pending'],
          (err) => {
            if (err) reject(err);
            else resolve();
          }
        );
      });
      
      // Get appointment and patient details for email
      const appointmentDetails = await new Promise((resolve, reject) => {
        db.get(
          `SELECT a.*, p.email, p.first_name, p.last_name, p.phone 
           FROM appointments a 
           JOIN patients p ON a.patient_id = p.id 
           WHERE a.id = ?`,
          [event.appointmentId],
          (err, row) => {
            if (err) reject(err);
            else resolve(row);
          }
        );
      });
      
      if (appointmentDetails) {
        // Prepare payment information for receipt
        const paymentInfo = {
          amount: event.amount,
          paymentIntentId: event.paymentIntentId,
          id: event.paymentIntentId,
          last4: '****' // Stripe doesn't always provide this in webhooks
        };
        
        // Send payment receipt email
        try {
          await sendPaymentReceipt(paymentInfo, appointmentDetails, {
            first_name: appointmentDetails.first_name,
            last_name: appointmentDetails.last_name,
            email: appointmentDetails.email
          });
          
          console.log('Payment receipt sent to:', appointmentDetails.email);
        } catch (emailError) {
          console.error('Failed to send payment receipt:', emailError);
          // Don't fail the webhook if email fails
        }
        
        // Also send appointment confirmation with payment details
        try {
          await sendAppointmentConfirmation(appointmentDetails, {
            first_name: appointmentDetails.first_name,
            last_name: appointmentDetails.last_name,
            email: appointmentDetails.email
          }, true, paymentInfo);
          
          console.log('Appointment confirmation sent to:', appointmentDetails.email);
        } catch (emailError) {
          console.error('Failed to send appointment confirmation:', emailError);
          // Don't fail the webhook if email fails
        }
      }
    }
    
    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(400).json({ error: 'Webhook error' });
  }
});

module.exports = router;
