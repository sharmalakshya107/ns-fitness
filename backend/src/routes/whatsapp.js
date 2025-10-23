const express = require('express');
const { body, validationResult } = require('express-validator');
const twilio = require('twilio');
const { Member, Payment } = require('../models');
const { authenticateToken, requireSubAdminOrMain } = require('../middleware/auth');

const router = express.Router();

// Initialize Twilio client (only if credentials are available)
let client = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  try {
    client = twilio(
      process.env.TWILIO_ACCOUNT_SID,
      process.env.TWILIO_AUTH_TOKEN
    );
  } catch (error) {
    console.log('Twilio initialization failed:', error.message);
  }
}

// Send WhatsApp message
const sendWhatsAppMessage = async (to, message) => {
  try {
    if (!client || !process.env.TWILIO_ACCOUNT_SID || !process.env.TWILIO_AUTH_TOKEN) {
      console.log('Twilio credentials not configured, skipping WhatsApp message');
      return { success: false, message: 'WhatsApp not configured' };
    }

    const result = await client.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${to}`
    });

    console.log(`WhatsApp message sent: ${result.sid}`);
    return { success: true, messageId: result.sid };
  } catch (error) {
    console.error('WhatsApp send error:', error);
    return { success: false, error: error.message };
  }
};

// Send payment confirmation
router.post('/payment-confirmation', [
  authenticateToken,
  requireSubAdminOrMain,
  body('memberId').isInt().withMessage('Valid member ID is required'),
  body('paymentId').isInt().withMessage('Valid payment ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { memberId, paymentId } = req.body;

    const member = await Member.findByPk(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const message = `🎉 Welcome to NS Fitness!

Your membership has been activated:
📅 Start Date: ${payment.startDate}
📅 End Date: ${payment.endDate}
💰 Amount Paid: ₹${payment.amount}
📋 Duration: ${payment.duration} months
🧾 Receipt No: ${payment.receiptNumber}

Thank you for choosing NS Fitness! 💪

For any queries, contact us at: ${process.env.GYM_PHONE || '+91-XXXXXXXXXX'}`;

    const result = await sendWhatsAppMessage(member.phone, message);

    res.json({
      success: true,
      message: 'WhatsApp message sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send payment confirmation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send WhatsApp message'
    });
  }
});

// Send renewal reminder
router.post('/renewal-reminder', [
  authenticateToken,
  requireSubAdminOrMain,
  body('memberId').isInt().withMessage('Valid member ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { memberId } = req.body;

    const member = await Member.findByPk(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const daysUntilExpiry = member.getDaysUntilExpiry();

    const message = `⏰ Renewal Reminder - NS Fitness

Hi ${member.name},

Your membership expires in ${daysUntilExpiry} days (${member.endDate}).

To continue your fitness journey with us, please renew your membership at the earliest.

Contact us for renewal: ${process.env.GYM_PHONE || '+91-XXXXXXXXXX'}

Stay fit! 💪`;

    const result = await sendWhatsAppMessage(member.phone, message);

    res.json({
      success: true,
      message: 'Renewal reminder sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send renewal reminder error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send renewal reminder'
    });
  }
});

// Send expiry notification
router.post('/expiry-notification', [
  authenticateToken,
  requireSubAdminOrMain,
  body('memberId').isInt().withMessage('Valid member ID is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { memberId } = req.body;

    const member = await Member.findByPk(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const message = `🔔 Membership Expired - NS Fitness

Hi ${member.name},

Your membership has expired on ${member.endDate}.

To continue your fitness journey, please renew your membership.

Contact us for renewal: ${process.env.GYM_PHONE || '+91-XXXXXXXXXX'}

We miss you! Come back soon! 💪`;

    const result = await sendWhatsAppMessage(member.phone, message);

    res.json({
      success: true,
      message: 'Expiry notification sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send expiry notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send expiry notification'
    });
  }
});

// Send custom message
router.post('/custom-message', [
  authenticateToken,
  requireSubAdminOrMain,
  body('memberId').isInt().withMessage('Valid member ID is required'),
  body('message').notEmpty().withMessage('Message is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { memberId, message } = req.body;

    const member = await Member.findByPk(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    const customMessage = `📱 NS Fitness Message

Hi ${member.name},

${message}

Best regards,
NS Fitness Team
${process.env.GYM_PHONE || '+91-XXXXXXXXXX'}`;

    const result = await sendWhatsAppMessage(member.phone, customMessage);

    res.json({
      success: true,
      message: 'Custom message sent successfully',
      data: result
    });
  } catch (error) {
    console.error('Send custom message error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send custom message'
    });
  }
});

// Send bulk renewal reminders
router.post('/bulk-renewal-reminders', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const expiringMembers = await Member.findAll({
      where: {
        isActive: true,
        membershipStatus: 'expiring_soon'
      }
    });

    const results = [];
    
    for (const member of expiringMembers) {
      const daysUntilExpiry = member.getDaysUntilExpiry();
      
      const message = `⏰ Renewal Reminder - NS Fitness

Hi ${member.name},

Your membership expires in ${daysUntilExpiry} days (${member.endDate}).

To continue your fitness journey with us, please renew your membership at the earliest.

Contact us for renewal: ${process.env.GYM_PHONE || '+91-XXXXXXXXXX'}

Stay fit! 💪`;

      const result = await sendWhatsAppMessage(member.phone, message);
      results.push({
        memberId: member.id,
        memberName: member.name,
        phone: member.phone,
        result
      });
    }

    res.json({
      success: true,
      message: `Bulk renewal reminders sent to ${results.length} members`,
      data: { results }
    });
  } catch (error) {
    console.error('Send bulk renewal reminders error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk renewal reminders'
    });
  }
});

module.exports = router;
