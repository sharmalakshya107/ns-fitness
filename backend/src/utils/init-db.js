const { sequelize, testConnection, syncDatabase } = require('../../config/database');
const { User } = require('../models');

const initializeDatabase = async () => {
  try {
    console.log('🚀 Initializing NS Fitness Database...');
    
    // Test connection
    await testConnection();
    
    // Sync database
    await syncDatabase();
    
    // Create default admin user if it doesn't exist
    const adminExists = await User.findOne({
      where: { role: 'main_admin' }
    });
    
    if (!adminExists) {
      const defaultAdmin = await User.create({
        username: 'admin',
        email: 'admin@nsfitness.com',
        password: 'admin123',
        role: 'main_admin',
        full_name: 'Main Administrator',
        phone: '+91-9999999999'
      });
      
      console.log('✅ Default admin user created:');
      console.log('   Username: admin');
      console.log('   Password: admin123');
      console.log('   Email: admin@nsfitness.com');
    } else {
      console.log('✅ Admin user already exists');
    }
    
    console.log('🎉 Database initialization completed successfully!');
    
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    process.exit(1);
  }
};

// Run initialization
initializeDatabase().then(() => {
  process.exit(0);
});
