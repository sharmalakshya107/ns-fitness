const twilio = require('twilio');

class WhatsAppService {
  constructor() {
    this.client = null;
    this.isConfigured = false;
    this.init();
  }

  init() {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const whatsappNumber = process.env.TWILIO_WHATSAPP_NUMBER;

    // Check if credentials are properly configured (not placeholders)
    const isValidConfig = accountSid && 
                         authToken && 
                         whatsappNumber && 
                         accountSid.startsWith('AC') && 
                         !accountSid.includes('your_');

    if (isValidConfig) {
      try {
        this.client = twilio(accountSid, authToken);
        this.whatsappNumber = whatsappNumber;
        this.isConfigured = true;
        console.log('✅ WhatsApp service initialized successfully');
      } catch (error) {
        console.error('❌ WhatsApp service initialization failed:', error.message);
        this.isConfigured = false;
      }
    } else {
      // Silently disable if not configured (no warning in development)
      this.isConfigured = false;
    }
  }

  // Send payment confirmation message
  async sendPaymentConfirmation(memberData, paymentData) {
    if (!this.isConfigured) {
      console.log('WhatsApp not configured, skipping payment confirmation');
      return { success: false, message: 'WhatsApp not configured' };
    }

    try {
      const message = `🎉 *Payment Confirmed!*

Hello ${memberData.name},

Your membership payment has been received successfully.

📋 *Payment Details:*
• Amount: ₹${paymentData.amount}
• Duration: ${paymentData.duration} months
• Start Date: ${new Date(paymentData.start_date).toLocaleDateString()}
• End Date: ${new Date(paymentData.end_date).toLocaleDateString()}
• Receipt No: ${paymentData.receipt_number}

Welcome to NS Fitness! 💪

For any queries, contact us at ${process.env.GYM_PHONE || '+91-XXXXXXXXXX'}`;

      const result = await this.sendMessage(memberData.phone, message);
      return result;
    } catch (error) {
      console.error('Error sending payment confirmation:', error);
      return { success: false, message: error.message };
    }
  }

  // Send renewal reminder
  async sendRenewalReminder(memberData) {
    if (!this.isConfigured) {
      console.log('WhatsApp not configured, skipping renewal reminder');
      return { success: false, message: 'WhatsApp not configured' };
    }

    try {
      const message = `⏰ *Membership Renewal Reminder*

Hello ${memberData.name},

Your membership is expiring soon!

📅 *Expiry Date:* ${new Date(memberData.end_date).toLocaleDateString()}

Please renew your membership to continue enjoying our services.

Contact us at ${process.env.GYM_PHONE || '+91-XXXXXXXXXX'} to renew.

Thank you for being a valued member of NS Fitness! 💪`;

      const result = await this.sendMessage(memberData.phone, message);
      return result;
    } catch (error) {
      console.error('Error sending renewal reminder:', error);
      return { success: false, message: error.message };
    }
  }

  // Send expiry notification
  async sendExpiryNotification(memberData) {
    if (!this.isConfigured) {
      console.log('WhatsApp not configured, skipping expiry notification');
      return { success: false, message: 'WhatsApp not configured' };
    }

    try {
      const message = `⚠️ *Membership Expired*

Hello ${memberData.name},

Your membership has expired on ${new Date(memberData.end_date).toLocaleDateString()}.

Please renew your membership to continue using our facilities.

Contact us at ${process.env.GYM_PHONE || '+91-XXXXXXXXXX'} to renew.

We look forward to welcoming you back to NS Fitness! 💪`;

      const result = await this.sendMessage(memberData.phone, message);
      return result;
    } catch (error) {
      console.error('Error sending expiry notification:', error);
      return { success: false, message: error.message };
    }
  }

  // Send daily summary to admin
  async sendDailySummary(summaryData) {
    if (!this.isConfigured) {
      console.log('WhatsApp not configured, skipping daily summary');
      return { success: false, message: 'WhatsApp not configured' };
    }

    try {
      const message = `📊 *Daily Summary - ${new Date().toLocaleDateString()}*

🏋️‍♂️ *NS Fitness Gym Management*

📈 *Today's Stats:*
• New Members: ${summaryData.newMembers || 0}
• Payments Received: ${summaryData.paymentsReceived || 0}
• Total Collection: ₹${summaryData.totalCollection || 0}
• Members Expiring Soon: ${summaryData.expiringSoon || 0}
• Expired Members: ${summaryData.expiredMembers || 0}

💪 Keep up the great work!`;

      // Send to admin phone (you might want to add admin phone to env)
      const adminPhone = process.env.ADMIN_PHONE || process.env.GYM_PHONE;
      if (adminPhone) {
        const result = await this.sendMessage(adminPhone, message);
        return result;
      } else {
        console.log('Admin phone not configured for daily summary');
        return { success: false, message: 'Admin phone not configured' };
      }
    } catch (error) {
      console.error('Error sending daily summary:', error);
      return { success: false, message: error.message };
    }
  }

  // Send birthday message
  async sendBirthdayMessage(memberData) {
    if (!this.isConfigured) {
      console.log('WhatsApp not configured, skipping birthday message');
      return { success: false, message: 'WhatsApp not configured' };
    }

    try {
      const message = `🎂 *Happy Birthday!*

Dear ${memberData.name},

Wishing you a very Happy Birthday! 🎉

May this new year of life bring you strength, health, and happiness!

Enjoy your special day and keep up the great work at NS Fitness! 💪

Best regards,
NS Fitness Team`;

      const result = await this.sendMessage(memberData.phone, message);
      return result;
    } catch (error) {
      console.error('Error sending birthday message:', error);
      return { success: false, message: error.message };
    }
  }

  // Send custom message
  async sendCustomMessage(phone, message) {
    if (!this.isConfigured) {
      return { success: false, message: 'WhatsApp not configured' };
    }

    try {
      const result = await this.sendMessage(phone, message);
      return result;
    } catch (error) {
      console.error('Error sending custom message:', error);
      return { success: false, message: error.message };
    }
  }

  // Private method to send message
  async sendMessage(to, message) {
    try {
      // Format phone number (add country code if not present)
      let formattedPhone = to;
      if (!formattedPhone.startsWith('+')) {
        if (formattedPhone.startsWith('91')) {
          formattedPhone = '+' + formattedPhone;
        } else {
          formattedPhone = '+91' + formattedPhone;
        }
      }

      // Add whatsapp: prefix for Twilio
      const whatsappTo = `whatsapp:${formattedPhone}`;
      const whatsappFrom = `whatsapp:${this.whatsappNumber}`;

      const result = await this.client.messages.create({
        body: message,
        from: whatsappFrom,
        to: whatsappTo
      });

      console.log(`WhatsApp message sent successfully. SID: ${result.sid}`);
      return { 
        success: true, 
        message: 'Message sent successfully',
        sid: result.sid 
      };
    } catch (error) {
      console.error('Twilio API error:', error);
      return { 
        success: false, 
        message: `Failed to send message: ${error.message}` 
      };
    }
  }

  // Check if service is configured
  isServiceConfigured() {
    return this.isConfigured;
  }

  // Get service status
  getServiceStatus() {
    return {
      configured: this.isConfigured,
      whatsappNumber: this.whatsappNumber,
      message: this.isConfigured ? 'Service ready' : 'Service not configured'
    };
  }
}

module.exports = new WhatsAppService();

