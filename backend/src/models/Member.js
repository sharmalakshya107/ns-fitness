const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Member = sequelize.define('Member', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(100),
    allowNull: false
  },
  phone: {
    type: DataTypes.STRING(15),
    allowNull: false,
    unique: true
  },
  email: {
    type: DataTypes.STRING(100),
    allowNull: true,
    validate: {
      isEmail: true
    }
  },
  date_of_birth: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'date_of_birth'
  },
  gender: {
    type: DataTypes.ENUM('male', 'female', 'other'),
    allowNull: true
  },
  address: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'batches',
      key: 'id'
    }
  },
  start_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  membership_status: {
    type: DataTypes.ENUM('active', 'expiring_soon', 'expired', 'frozen', 'pending'),
    defaultValue: 'pending'  // Default to pending until first payment is made
  },
  payment_status: {
    type: DataTypes.ENUM('paid', 'pending', 'overdue'),
    defaultValue: 'pending'
  },
  last_payment_date: {
    type: DataTypes.DATEONLY,
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  freeze_start_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'freeze_start_date'
  },
  freeze_end_date: {
    type: DataTypes.DATEONLY,
    allowNull: true,
    field: 'freeze_end_date'
  },
  freeze_reason: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'freeze_reason'
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  created_by: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'members'
});

// Virtual fields
Member.prototype.getAge = function() {
  if (this.dateOfBirth) {
    const today = new Date();
    const birthDate = new Date(this.dateOfBirth);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }
  return null;
};

Member.prototype.getDaysUntilExpiry = function() {
  if (this.endDate) {
    const today = new Date();
    const expiryDate = new Date(this.endDate);
    const diffTime = expiryDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }
  return null;
};

module.exports = Member;
