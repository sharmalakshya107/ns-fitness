const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Batch = sequelize.define('Batch', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true
  },
  name: {
    type: DataTypes.STRING(50),
    allowNull: false,
    unique: true
  },
  start_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  end_time: {
    type: DataTypes.TIME,
    allowNull: false
  },
  capacity: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 30
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  is_active: {
    type: DataTypes.BOOLEAN,
    defaultValue: true
  },
  trainer_id: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'trainers',
      key: 'id'
    }
  }
}, {
  tableName: 'batches'
});

// Virtual field to get current member count
Batch.prototype.getCurrentMemberCount = async function() {
  const Member = require('./Member');
  return await Member.count({
    where: {
      batch_id: this.id,
      is_active: true,
      membership_status: 'active'
    }
  });
};

module.exports = Batch;
