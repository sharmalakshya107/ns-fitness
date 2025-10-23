const User = require('./User');
const Member = require('./Member');
const Payment = require('./Payment');
const Batch = require('./Batch');
const Attendance = require('./Attendance');
const Trainer = require('./Trainer');
const Expense = require('./Expense');

// User associations
User.hasMany(Member, { foreignKey: 'created_by', as: 'createdMembers' });
User.hasMany(Payment, { foreignKey: 'processed_by', as: 'processedPayments' });
User.hasMany(Attendance, { foreignKey: 'marked_by', as: 'markedAttendance' });
User.hasMany(Expense, { foreignKey: 'recorded_by', as: 'recordedExpenses' });

// Member associations
Member.belongsTo(User, { foreignKey: 'created_by', as: 'creator' });
Member.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });
Member.hasMany(Payment, { foreignKey: 'member_id', as: 'payments' });
Member.hasMany(Attendance, { foreignKey: 'member_id', as: 'attendance' });

// Payment associations
Payment.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });
Payment.belongsTo(User, { foreignKey: 'processed_by', as: 'processor' });

// Batch associations
Batch.hasMany(Member, { foreignKey: 'batch_id', as: 'members' });
Batch.hasMany(Attendance, { foreignKey: 'batch_id', as: 'attendance' });
Batch.belongsTo(Trainer, { foreignKey: 'trainer_id', as: 'trainer' });

// Attendance associations
Attendance.belongsTo(Member, { foreignKey: 'member_id', as: 'member' });
Attendance.belongsTo(Batch, { foreignKey: 'batch_id', as: 'batch' });
Attendance.belongsTo(User, { foreignKey: 'marked_by', as: 'marker' });

// Trainer associations
Trainer.hasMany(Batch, { foreignKey: 'trainer_id', as: 'batches' });

// Expense associations
Expense.belongsTo(User, { foreignKey: 'recorded_by', as: 'recorder' });

module.exports = {
  User,
  Member,
  Payment,
  Batch,
  Attendance,
  Trainer,
  Expense
};
