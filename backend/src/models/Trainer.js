const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Trainer = sequelize.define('Trainer', {
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
  specialization: {
    type: DataTypes.STRING(200),
    allowNull: true
  },
  experience: {
    type: DataTypes.INTEGER,
    allowNull: true,
    comment: 'Experience in years'
  },
  salary: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: true
  },
  salary_type: {
    type: DataTypes.ENUM('monthly', 'fixed'),
    allowNull: false,
    defaultValue: 'monthly'
  },
  join_date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  }
}, {
  tableName: 'trainers'
});

module.exports = Trainer;
