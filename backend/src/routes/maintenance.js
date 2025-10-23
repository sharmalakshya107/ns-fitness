const express = require('express');
const fs = require('fs');
const path = require('path');
const { Op } = require('sequelize');
const { sequelize, User, Member, Payment, Batch, Attendance, Trainer, Expense } = require('../models');
const { authenticateToken, requireMainAdmin } = require('../middleware/auth');

const router = express.Router();

// Create database backup
router.post('/backup/create', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupData = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      data: {
        users: await User.findAll({ raw: true }),
        members: await Member.findAll({ raw: true }),
        payments: await Payment.findAll({ raw: true }),
        batches: await Batch.findAll({ raw: true }),
        attendance: await Attendance.findAll({ raw: true }),
        trainers: await Trainer.findAll({ raw: true }),
        expenses: await Expense.findAll({ raw: true })
      }
    };

    const backupDir = path.join(__dirname, '../../backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);
    fs.writeFileSync(backupFile, JSON.stringify(backupData, null, 2));

    res.json({
      success: true,
      message: 'Backup created successfully',
      data: {
        filename: `backup-${timestamp}.json`,
        timestamp: backupData.timestamp,
        records: {
          users: backupData.data.users.length,
          members: backupData.data.members.length,
          payments: backupData.data.payments.length,
          batches: backupData.data.batches.length,
          attendance: backupData.data.attendance.length,
          trainers: backupData.data.trainers.length,
          expenses: backupData.data.expenses.length
        }
      }
    });
  } catch (error) {
    console.error('Create backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create backup'
    });
  }
});

// List available backups
router.get('/backup/list', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    
    if (!fs.existsSync(backupDir)) {
      return res.json({
        success: true,
        data: { backups: [] }
      });
    }

    const files = fs.readdirSync(backupDir)
      .filter(file => file.startsWith('backup-') && file.endsWith('.json'))
      .map(file => {
        const stats = fs.statSync(path.join(backupDir, file));
        return {
          filename: file,
          size: stats.size,
          created: stats.birthtime,
          modified: stats.mtime
        };
      })
      .sort((a, b) => new Date(b.created) - new Date(a.created));

    res.json({
      success: true,
      data: { backups: files }
    });
  } catch (error) {
    console.error('List backups error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list backups'
    });
  }
});

// Restore from backup
router.post('/backup/restore', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const { filename } = req.body;
    
    if (!filename) {
      return res.status(400).json({
        success: false,
        message: 'Backup filename is required'
      });
    }

    const backupFile = path.join(__dirname, '../../backups', filename);
    
    if (!fs.existsSync(backupFile)) {
      return res.status(404).json({
        success: false,
        message: 'Backup file not found'
      });
    }

    const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf8'));

    // Clear existing data
    await Expense.destroy({ where: {} });
    await Attendance.destroy({ where: {} });
    await Payment.destroy({ where: {} });
    await Member.destroy({ where: {} });
    await Batch.destroy({ where: {} });
    await Trainer.destroy({ where: {} });
    await User.destroy({ where: {} });

    // Restore data
    await User.bulkCreate(backupData.data.users);
    await Trainer.bulkCreate(backupData.data.trainers);
    await Batch.bulkCreate(backupData.data.batches);
    await Member.bulkCreate(backupData.data.members);
    await Payment.bulkCreate(backupData.data.payments);
    await Attendance.bulkCreate(backupData.data.attendance);
    await Expense.bulkCreate(backupData.data.expenses);

    res.json({
      success: true,
      message: 'Database restored successfully',
      data: {
        restoredAt: new Date().toISOString(),
        backupTimestamp: backupData.timestamp,
        records: {
          users: backupData.data.users.length,
          members: backupData.data.members.length,
          payments: backupData.data.payments.length,
          batches: backupData.data.batches.length,
          attendance: backupData.data.attendance.length,
          trainers: backupData.data.trainers.length,
          expenses: backupData.data.expenses.length
        }
      }
    });
  } catch (error) {
    console.error('Restore backup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to restore backup'
    });
  }
});

// Get system health status
router.get('/health', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    // Test database connection
    await sequelize.authenticate();
    
    // Get database statistics
    const stats = {
      users: await User.count(),
      members: await Member.count(),
      payments: await Payment.count(),
      batches: await Batch.count(),
      attendance: await Attendance.count(),
      trainers: await Trainer.count(),
      expenses: await Expense.count()
    };

    // Check disk space (if possible)
    const diskSpace = process.platform !== 'win32' ? 
      require('child_process').execSync('df -h /').toString() : 
      'Windows - disk space check not available';

    res.json({
      success: true,
      data: {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        database: {
          connected: true,
          stats
        },
        system: {
          nodeVersion: process.version,
          platform: process.platform,
          uptime: process.uptime(),
          memory: process.memoryUsage()
        },
        diskSpace: diskSpace
      }
    });
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json({
      success: false,
      message: 'Health check failed',
      error: error.message
    });
  }
});

// Clean up old data
router.post('/cleanup', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const { days = 365 } = req.body;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    // Clean up old attendance records
    const deletedAttendance = await Attendance.destroy({
      where: {
        date: {
          [Op.lt]: cutoffDate
        }
      }
    });

    // Clean up old backups
    const backupDir = path.join(__dirname, '../../backups');
    if (fs.existsSync(backupDir)) {
      const files = fs.readdirSync(backupDir)
        .filter(file => file.startsWith('backup-') && file.endsWith('.json'));
      
      let deletedBackups = 0;
      files.forEach(file => {
        const filePath = path.join(backupDir, file);
        const stats = fs.statSync(filePath);
        if (stats.birthtime < cutoffDate) {
          fs.unlinkSync(filePath);
          deletedBackups++;
        }
      });
    }

    res.json({
      success: true,
      message: 'Cleanup completed successfully',
      data: {
        deletedAttendance,
        cutoffDate: cutoffDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Cleanup error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to perform cleanup'
    });
  }
});

// Export all data
router.get('/export/all', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const format = req.query.format || 'json';
    
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      data: {
        users: await User.findAll({ raw: true }),
        members: await Member.findAll({ raw: true }),
        payments: await Payment.findAll({ raw: true }),
        batches: await Batch.findAll({ raw: true }),
        attendance: await Attendance.findAll({ raw: true }),
        trainers: await Trainer.findAll({ raw: true }),
        expenses: await Expense.findAll({ raw: true })
      }
    };

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = convertToCSV(exportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=ns-fitness-export.csv');
      res.send(csvData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', 'attachment; filename=ns-fitness-export.json');
      res.json(exportData);
    }
  } catch (error) {
    console.error('Export data error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export data'
    });
  }
});

// Helper function to convert data to CSV
function convertToCSV(data) {
  const csvRows = [];
  
  // Add headers
  csvRows.push('Table,ID,Data');
  
  // Convert each table to CSV
  Object.keys(data.data).forEach(tableName => {
    data.data[tableName].forEach(record => {
      csvRows.push(`${tableName},${record.id},"${JSON.stringify(record).replace(/"/g, '""')}"`);
    });
  });
  
  return csvRows.join('\n');
}

module.exports = router;
