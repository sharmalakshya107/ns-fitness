const { Member } = require('../models');

/**
 * Update a single member's status based on their end_date
 * Called when payment is recorded or member is viewed
 */
async function updateMemberStatus(memberId) {
  try {
    // Fetch fresh member data to get latest end_date after payment update
    const member = await Member.findByPk(memberId);
    if (!member || !member.is_active) {
      return null;
    }

    // Don't auto-update frozen members - these are manually managed
    if (member.membership_status === 'frozen') {
      return member;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let newStatus = member.membership_status;
    let newPaymentStatus = member.payment_status;

    // If no end_date, member stays pending
    if (!member.end_date) {
      // Only set to pending if payment is also not paid
      if (member.payment_status !== 'paid') {
        newStatus = 'pending';
        newPaymentStatus = 'pending';
      } else {
        // Has payment but no end_date (should not happen, but handle it)
        console.warn(`Member ${member.id} has paid status but no end_date`);
        return member;
      }
    } else {
      // Has end_date - calculate membership status
      const endDate = new Date(member.end_date);
      endDate.setHours(0, 0, 0, 0);

      const daysUntilExpiry = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));

      // Determine new status based on days until expiry
      if (daysUntilExpiry < 0) {
        // Already expired
        newStatus = 'expired';
        newPaymentStatus = 'overdue';
      } else if (daysUntilExpiry <= 7) {
        // Expiring within 7 days
        newStatus = 'expiring_soon';
        // Keep payment status as paid if it is
        if (member.payment_status === 'paid') {
          newPaymentStatus = 'paid';
        }
      } else {
        // More than 7 days remaining
        if (member.payment_status === 'paid') {
          newStatus = 'active';
          newPaymentStatus = 'paid';
        } else {
          newStatus = 'pending';
        }
      }
    }

    // Only update if status changed
    if (newStatus !== member.membership_status || newPaymentStatus !== member.payment_status) {
      await member.update({ 
        membership_status: newStatus,
        payment_status: newPaymentStatus
      });
      console.log(`✅ Updated member ${member.name}: status=${newStatus}, payment=${newPaymentStatus}`);
    } else {
      console.log(`ℹ️  Member ${member.name}: No status change needed (${newStatus})`);
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

