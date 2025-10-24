const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Attendance, Member, Batch, User } = require('../models');
const { authenticateToken, requireSubAdminOrMain } = require('../middleware/auth');
const { autoMarkAbsent } = require('../utils/auto-mark-absent');

const router = express.Router();

// Get attendance records with filters
router.get('/', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const { date, batchId, memberId, status } = req.query;
    
    let whereClause = {};
    
    if (date) {
      whereClause.date = date;
    }
    
    if (batchId) {
      whereClause.batch_id = batchId;
    }
    
    if (memberId) {
      whereClause.member_id = memberId;
    }
    
    if (status) {
      whereClause.status = status;
    }

    const { count, rows: attendance } = await Attendance.findAndCountAll({
      where: whereClause,
      include: [
        { model: Member, as: 'member' },
        { model: Batch, as: 'batch' },
        { model: User, as: 'marker' }
      ],
      limit,
      offset,
      order: [['date', 'DESC'], ['check_in_time', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        attendance,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance records'
    });
  }
});

// Mark attendance for multiple members
router.post('/mark', [
  authenticateToken,
  requireSubAdminOrMain,
  body('batchId').isInt().withMessage('Valid batch ID is required'),
  body('date').isISO8601().withMessage('Valid date is required'),
  body('attendance').isArray().withMessage('Attendance data is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { batchId, date, attendance } = req.body;

    // Check if batch exists
    const batch = await Batch.findByPk(batchId);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const attendanceRecords = [];

    for (const record of attendance) {
      const { memberId, status, checkInTime, checkOutTime, notes } = record;

      // Check if member exists
      const member = await Member.findByPk(memberId);
      if (!member) {
        continue; // Skip invalid members
      }

      // Check if member has active payment
      const hasActivePayment = member.payment_status === 'paid' && 
        (member.membership_status === 'active' || member.membership_status === 'expiring_soon');
      
      if (!hasActivePayment) {
        continue; // Skip members without active payment
      }

      // Check if attendance already exists for this member on this date
      const existingAttendance = await Attendance.findOne({
        where: {
          member_id: memberId,
          date
        }
      });

      if (existingAttendance) {
        // Update existing record
        await existingAttendance.update({
          status,
          check_in_time: checkInTime ? new Date(checkInTime) : null,
          check_out_time: checkOutTime ? new Date(checkOutTime) : null,
          notes,
          marked_by: req.user.id
        });
        attendanceRecords.push(existingAttendance);
      } else {
        // Create new record
        const newRecord = await Attendance.create({
          member_id: memberId,
          batch_id: batchId,
          date,
          status,
          check_in_time: checkInTime ? new Date(checkInTime) : null,
          check_out_time: checkOutTime ? new Date(checkOutTime) : null,
          notes,
          marked_by: req.user.id
        });
        attendanceRecords.push(newRecord);
      }
    }

    res.json({
      success: true,
      message: 'Attendance marked successfully',
      data: { attendance: attendanceRecords }
    });
  } catch (error) {
    console.error('Mark attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance'
    });
  }
});

// Get attendance statistics
router.get('/stats/overview', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const { startDate, endDate, batchId } = req.query;
    
    let whereClause = {};
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }
    if (batchId) {
      whereClause.batchId = batchId;
    }

    const totalRecords = await Attendance.count({ where: whereClause });
    const presentCount = await Attendance.count({ 
      where: { ...whereClause, status: 'present' } 
    });
    const absentCount = await Attendance.count({ 
      where: { ...whereClause, status: 'absent' } 
    });
    const lateCount = await Attendance.count({ 
      where: { ...whereClause, status: 'late' } 
    });

    // Get attendance by batch
    const attendanceByBatch = await Attendance.findAll({
      attributes: [
        'batchId',
        [Attendance.sequelize.fn('COUNT', Attendance.sequelize.col('id')), 'total'],
        [Attendance.sequelize.fn('SUM', 
          Attendance.sequelize.literal("CASE WHEN status = 'present' THEN 1 ELSE 0 END")
        ), 'present']
      ],
      where: whereClause,
      include: [
        { model: Batch, as: 'batch', attributes: ['name'] }
      ],
      group: ['batchId']
    });

    res.json({
      success: true,
      data: {
        totalRecords,
        presentCount,
        absentCount,
        lateCount,
        attendanceRate: totalRecords > 0 ? (presentCount / totalRecords * 100).toFixed(2) : 0,
        attendanceByBatch
      }
    });
  } catch (error) {
    console.error('Get attendance stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch attendance statistics'
    });
  }
});

// Export attendance data
router.get('/export', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const { startDate, endDate, batchId, format = 'json' } = req.query;
    
    let whereClause = {};
    if (startDate && endDate) {
      whereClause.date = {
        [Op.between]: [startDate, endDate]
      };
    }
    if (batchId) {
      whereClause.batchId = batchId;
    }

    const attendance = await Attendance.findAll({
      where: whereClause,
      include: [
        { model: Member, as: 'member', attributes: ['name', 'phone'] },
        { model: Batch, as: 'batch', attributes: ['name'] },
        { model: User, as: 'marker', attributes: ['fullName'] }
      ],
      order: [['date', 'DESC']]
    });

    if (format === 'csv') {
      // Convert to CSV format
      const csvData = [
        'Date,Member Name,Phone,Batch,Status,Check In,Check Out,Marked By'
      ];
      
      attendance.forEach(record => {
        csvData.push([
          record.date,
          record.member.name,
          record.member.phone,
          record.batch.name,
          record.status,
          record.checkInTime || '',
          record.checkOutTime || '',
          record.marker.fullName
        ].join(','));
      });

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=attendance.csv');
      res.send(csvData.join('\n'));
    } else {
      res.json({
        success: true,
        data: { attendance }
      });
    }
  } catch (error) {
    console.error('Export attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export attendance data'
    });
  }
});

// Admin endpoint to manually trigger auto-mark absent
router.post('/auto-mark-absent', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const result = await autoMarkAbsent();
    
    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: {
          markedAbsent: result.markedAbsent,
          memberNames: result.memberNames
        }
      });
    } else {
      res.status(500).json({
        success: false,
        message: 'Failed to auto-mark absent',
        error: result.error
      });
    }
  } catch (error) {
    console.error('Auto-mark absent endpoint error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to process auto-mark absent request'
    });
  }
});

module.exports = router;
