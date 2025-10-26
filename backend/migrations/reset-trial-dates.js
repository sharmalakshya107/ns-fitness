/**
 * Migration: Reset Trial Dates for Gym Official Opening
 * 
 * This script resets the trial start date (createdAt) for all PENDING members
 * to TODAY, giving them a fresh 3-day trial from the official opening date.
 * 
 * RUN THIS ONLY ONCE on official opening day!
 */

const { sequelize } = require('../config/database');
const Member = require('../src/models/Member');

async function resetTrialDates() {
  try {
    console.log('🎉 Starting migration: Resetting trial dates for official gym opening...\n');
    
    // Get current date in IST (India Standard Time)
    const today = new Date();
    const istOffset = 5.5 * 60 * 60 * 1000; // IST is UTC+5:30
    const istDate = new Date(today.getTime() + istOffset);
    
    console.log(`📅 Official Opening Date: ${istDate.toISOString().split('T')[0]}`);
    console.log(`🕐 IST Time: ${istDate.toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}\n`);
    
    // Find all members with 'pending' status (not paid yet)
    const pendingMembers = await Member.findAll({
      where: {
        membership_status: 'pending'
      },
      attributes: ['id', 'name', 'phone', 'createdAt', 'membership_status']
    });
    
    if (pendingMembers.length === 0) {
      console.log('ℹ️  No pending members found. Nothing to reset.');
      console.log('✅ Migration completed!\n');
      process.exit(0);
    }
    
    console.log(`📊 Found ${pendingMembers.length} pending members:\n`);
    
    // Show members before reset
    pendingMembers.forEach((member, index) => {
      const oldDate = new Date(member.createdAt).toLocaleDateString('en-IN');
      console.log(`${index + 1}. ${member.name} (${member.phone}) - Old Trial Start: ${oldDate}`);
    });
    
    console.log('\n🔄 Resetting trial dates to TODAY...\n');
    
    // Reset created_at (column name in PostgreSQL) for all pending members to today
    const [updatedCount] = await sequelize.query(`
      UPDATE members 
      SET created_at = NOW() 
      WHERE membership_status = 'pending'
    `);
    
    console.log(`✅ Successfully reset trial dates for ${pendingMembers.length} members!\n`);
    
    // Show members after reset
    console.log('📋 Updated Members (Fresh 3-day trial starting TODAY):\n');
    
    const updatedMembers = await Member.findAll({
      where: {
        membership_status: 'pending'
      },
      attributes: ['id', 'name', 'phone', 'createdAt']
    });
    
    updatedMembers.forEach((member, index) => {
      const newDate = new Date(member.createdAt).toLocaleDateString('en-IN');
      console.log(`${index + 1}. ${member.name} (${member.phone}) - NEW Trial Start: ${newDate}`);
    });
    
    console.log('\n' + '='.repeat(60));
    console.log('🎉 TRIAL RESET COMPLETE!');
    console.log('='.repeat(60));
    console.log('📝 Summary:');
    console.log(`   - Pending Members: ${pendingMembers.length}`);
    console.log(`   - Reset Date: ${istDate.toLocaleDateString('en-IN')}`);
    console.log(`   - Trial Period: 3 days from today`);
    console.log(`   - Trial Ends: ${new Date(istDate.getTime() + 3 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}`);
    console.log('='.repeat(60));
    console.log('\n✅ All pending members now have a fresh 3-day trial!');
    console.log('🏋️ Gym Official Opening - Good Luck! 💪\n');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run migration
resetTrialDates();

