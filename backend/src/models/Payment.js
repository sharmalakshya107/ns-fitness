const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Payment = sequelize.define('Payment', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  member_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'members',
      key: 'id'
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    comment: 'Duration in months (1, 3, 6, 9, or 12)'
  },
  payment_method: {
    type: DataTypes.ENUM('cash', 'upi', 'card', 'bank_transfer', 'other'),
    allowNull: false,
    defaultValue: 'cash'
  },
  payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true  // Allow null, will be set by beforeCreate hook
  },
  receipt_number: {
    type: DataTypes.STRING(50),
    allowNull: true,  // Allow null, will be set by beforeCreate hook
    unique: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  processed_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'payments',
  hooks: {
    beforeCreate: async (payment) => {
      // Generate receipt number
      if (!payment.receipt_number) {
        const date = new Date();
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        payment.receipt_number = `NSF${year}${month}${day}${random}`;
      }
      
      // Calculate end date - handle both snake_case and camelCase
      const startDate = payment.start_date || payment.startDate;
      const duration = parseInt(payment.duration, 10); // Convert to number!
      
      if (startDate && duration && !isNaN(duration)) {
        const start = new Date(startDate);
        const end = new Date(start);
        end.setMonth(end.getMonth() + duration);
        payment.end_date = end;
      }
      
      // Set payment_date to today if not provided
      if (!payment.payment_date) {
        payment.payment_date = new Date();
      }
    }
  }
});

module.exports = Payment;
