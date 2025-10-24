const { DataTypes } = require('sequelize');
const { sequelize } = require('../../config/database');

const Attendance = sequelize.define('Attendance', {
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
  batch_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'batches',
      key: 'id'
    }
  },
  date: {
    type: DataTypes.DATEONLY,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  check_in_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  check_out_time: {
    type: DataTypes.DATE,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('present', 'absent', 'late', 'excused'),
    allowNull: false,
    defaultValue: 'present'
  },
  notes: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  marked_by: {
    type: DataTypes.INTEGER,
    allowNull: true, // NULL = self-marked by member
    references: {
      model: 'users',
      key: 'id'
    }
  }
}, {
  tableName: 'attendance',
  indexes: [
    {
      unique: true,
      fields: ['member_id', 'date']
    }
  ]
});

// Virtual field to calculate duration
Attendance.prototype.getDuration = function() {
  if (this.check_in_time && this.check_out_time) {
    const duration = new Date(this.check_out_time) - new Date(this.check_in_time);
    return Math.round(duration / (1000 * 60)); // Duration in minutes
  }
  return null;
};

module.exports = Attendance;
