/**
 * Migration: Remove 'postion' column from members table
 * This column was added for drag-and-drop feature which has been removed
 * Run this once to clean up the database
 */

const { sequelize } = require('../config/database');

async function removePositionColumn() {
  try {
    console.log('🔧 Starting migration: Removing position column from members table...');
    
    // Check if column exists before dropping
    const [results] = await sequelize.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'members' 
      AND column_name = 'postion';
    `);
    
    if (results.length > 0) {
      // Column exists, drop it
      await sequelize.query('ALTER TABLE members DROP COLUMN IF EXISTS postion;');
      console.log('✅ Successfully removed "postion" column from members table');
    } else {
      console.log('ℹ️  Column "postion" does not exist. Nothing to remove.');
    }
    
    console.log('✅ Migration completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Full error:', error);
    process.exit(1);
  }
}

// Run migration
removePositionColumn();

