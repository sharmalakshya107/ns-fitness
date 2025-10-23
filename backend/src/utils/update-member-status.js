const { Member } = require('../models');

/**
 * Update a single member's status based on their end_date
 * Called when payment is recorded or member is viewed
 */
async function updateMemberStatus(memberId) {
  try {
    const member = await Member.findByPk(memberId);
    if (!member || !member.is_active) {
      return null;
    }

    // Don't auto-update frozen or pending members - these are manually managed
    if (member.membership_status === 'frozen' || member.membership_status === 'pending') {
      return member;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStatus = member.membership_status;
    let newPaymentStatus = member.payment_status;

    // If no end_date, keep current status
    if (!member.end_date) {
      return member;
    }

    const endDate = new Date(member.end_date);
    endDate.setHours(0, 0, 0, 0);

    const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

    // Determine new status
    if (daysUntilExpiry < 0) {
      // Already expired
      newStatus = 'expired';
      newPaymentStatus = 'overdue';
    } else if (daysUntilExpiry <= 7) {
      // Expiring within 7 days
      newStatus = 'expiring_soon';
    } else if (member.payment_status === 'paid') {
      // More than 7 days remaining and paid
      newStatus = 'active';
    }

    // Only update if status changed
    if (newStatus !== member.membership_status || newPaymentStatus !== member.payment_status) {
      await member.update({ 
        membership_status: newStatus,
        payment_status: newPaymentStatus
      });
      console.log(`Updated member ${member.name}: ${newStatus}`);
    }

    return member;

  } catch (error) {
    console.error('Error updating member status:', error);
    return null;
  }
}

module.exports = {
  updateMemberStatus
};

