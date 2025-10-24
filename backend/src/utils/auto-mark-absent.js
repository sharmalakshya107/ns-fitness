const { Member, Attendance, Batch } = require('../models');
const { Op } = require('sequelize');
const { getISTDate } = require('./timezone');

/**
 * Automatically mark absent for members who haven't checked in today
 * This should be run at end of day (e.g., 11:59 PM IST)
 */
async function autoMarkAbsent() {
  try {
    const today = getISTDate(); // Use IST date
    console.log(`🤖 Auto-marking absent for date: ${today} (IST)`);

    // Get all active members with batches
    const activeMembers = await Member.findAll({
      where: {
        is_active: true,
        membership_status: { [Op.in]: ['active', 'expiring_soon'] }, // Only mark for active memberships
        batch_id: { [Op.not]: null } // Must have a batch assigned
      },
      include: [{ model: Batch, as: 'batch' }]
    });

    console.log(`📊 Found ${activeMembers.length} active members with batches`);

    // Get today's attendance records
    const todayAttendance = await Attendance.findAll({
      where: { date: today },
      attributes: ['member_id']
    });

    const markedMemberIds = new Set(todayAttendance.map(a => a.member_id));
    console.log(`✓ ${markedMemberIds.size} members already have attendance marked`);

    // Find members who haven't been marked
    const unmarkedMembers = activeMembers.filter(m => !markedMemberIds.has(m.id));
    console.log(`⏰ ${unmarkedMembers.length} members need to be marked absent`);

    if (unmarkedMembers.length === 0) {
      console.log('✅ All members already marked. Nothing to do.');
      return { success: true, markedAbsent: 0, message: 'All members already marked' };
    }

    // Create absent records for unmarked members
    const absentRecords = unmarkedMembers.map(member => ({
      member_id: member.id,
      batch_id: member.batch_id,
      date: today,
      status: 'absent',
      check_in_time: null,
      marked_by: null, // System auto-marked
      notes: 'Auto-marked absent (no check-in)'
    }));

    await Attendance.bulkCreate(absentRecords);

    console.log(`✅ Successfully auto-marked ${unmarkedMembers.length} members as absent`);
    
    return {
      success: true,
      markedAbsent: unmarkedMembers.length,
      message: `Auto-marked ${unmarkedMembers.length} members as absent`,
      memberNames: unmarkedMembers.map(m => m.name)
    };

  } catch (error) {
    console.error('❌ Auto-mark absent error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = { autoMarkAbsent };

