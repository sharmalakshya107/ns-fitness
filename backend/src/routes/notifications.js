const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Member, Payment, User } = require('../models');
const { authenticateToken, requireSubAdminOrMain } = require('../middleware/auth');

const router = express.Router();

// Send bulk notifications
router.post('/send/bulk', [
  authenticateToken,
  requireSubAdminOrMain,
  body('type').isIn(['renewal_reminder', 'payment_reminder', 'custom']).withMessage('Invalid notification type'),
  body('message').optional().isString().withMessage('Message must be a string'),
  body('memberIds').optional().isArray().withMessage('Member IDs must be an array')
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

    const { type, message, memberIds } = req.body;
    let targetMembers = [];

    if (memberIds && memberIds.length > 0) {
      // Send to specific members
      targetMembers = await Member.findAll({
        where: {
          id: { [Op.in]: memberIds },
          isActive: true
        }
      });
    } else {
      // Send based on type
      switch (type) {
        case 'renewal_reminder':
          const expiringDate = new Date();
          expiringDate.setDate(expiringDate.getDate() + 7);
          
          targetMembers = await Member.findAll({
            where: {
              isActive: true,
              endDate: {
                [Op.between]: [new Date(), expiringDate]
              }
            }
          });
          break;
          
        case 'payment_reminder':
          targetMembers = await Member.findAll({
            where: {
              isActive: true,
              paymentStatus: 'overdue'
            }
          });
          break;
          
        default:
          targetMembers = await Member.findAll({
            where: { isActive: true }
          });
      }
    }

    const results = [];
    const defaultMessages = {
      renewal_reminder: '⏰ Your membership expires soon. Please renew to continue your fitness journey!',
      payment_reminder: '💰 Payment reminder: Please complete your pending payment.',
      custom: message || '📱 Message from NS Fitness'
    };

    for (const member of targetMembers) {
      try {
        const notificationMessage = type === 'custom' ? message : defaultMessages[type];
        
        // Here you would integrate with your notification service
        // For now, we'll just log it
        console.log(`Sending ${type} notification to ${member.name} (${member.phone}): ${notificationMessage}`);
        
        results.push({
          memberId: member.id,
          memberName: member.name,
          phone: member.phone,
          status: 'sent',
          message: notificationMessage
        });
      } catch (error) {
        results.push({
          memberId: member.id,
          memberName: member.name,
          phone: member.phone,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Bulk notification sent to ${results.length} members`,
      data: { results }
    });
  } catch (error) {
    console.error('Send bulk notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send bulk notifications'
    });
  }
});

// Get notification history
router.get('/history', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    // This would typically come from a notifications table
    // For now, we'll return a mock response
    const notifications = [
      {
        id: 1,
        type: 'renewal_reminder',
        message: 'Renewal reminder sent to expiring members',
        sentAt: new Date().toISOString(),
        sentBy: req.user.fullName,
        recipients: 15,
        status: 'completed'
      },
      {
        id: 2,
        type: 'payment_reminder',
        message: 'Payment reminder sent to overdue members',
        sentAt: new Date(Date.now() - 86400000).toISOString(),
        sentBy: req.user.fullName,
        recipients: 8,
        status: 'completed'
      }
    ];

    res.json({
      success: true,
      data: {
        notifications: notifications.slice(offset, offset + limit),
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(notifications.length / limit),
          totalItems: notifications.length,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get notification history error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification history'
    });
  }
});

// Send birthday wishes
router.post('/send/birthday', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const today = new Date();
    const todayStr = `${today.getMonth() + 1}-${today.getDate()}`;

    const birthdayMembers = await Member.findAll({
      where: {
        isActive: true,
        dateOfBirth: {
          [Op.like]: `%-${todayStr}`
        }
      }
    });

    const results = [];
    const birthdayMessage = '🎉 Happy Birthday! Wishing you another year of health and fitness! 🎂💪';

    for (const member of birthdayMembers) {
      try {
        console.log(`Sending birthday wish to ${member.name} (${member.phone}): ${birthdayMessage}`);
        
        results.push({
          memberId: member.id,
          memberName: member.name,
          phone: member.phone,
          status: 'sent',
          message: birthdayMessage
        });
      } catch (error) {
        results.push({
          memberId: member.id,
          memberName: member.name,
          phone: member.phone,
          status: 'failed',
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: `Birthday wishes sent to ${results.length} members`,
      data: { results }
    });
  } catch (error) {
    console.error('Send birthday wishes error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send birthday wishes'
    });
  }
});

// Get upcoming birthdays
router.get('/birthdays/upcoming', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 30;
    const upcomingBirthdays = [];

    for (let i = 1; i <= days; i++) {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + i);
      const dateStr = `${futureDate.getMonth() + 1}-${futureDate.getDate()}`;

      const members = await Member.findAll({
        where: {
          isActive: true,
          dateOfBirth: {
            [Op.like]: `%-${dateStr}`
          }
        },
        attributes: ['id', 'name', 'phone', 'dateOfBirth']
      });

      if (members.length > 0) {
        upcomingBirthdays.push({
          date: futureDate.toISOString().split('T')[0],
          members: members.map(member => ({
            id: member.id,
            name: member.name,
            phone: member.phone,
            age: member.getAge ? member.getAge() : null
          }))
        });
      }
    }

    res.json({
      success: true,
      data: { upcomingBirthdays }
    });
  } catch (error) {
    console.error('Get upcoming birthdays error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch upcoming birthdays'
    });
  }
});

// Send custom notification to specific member
router.post('/send/custom', [
  authenticateToken,
  requireSubAdminOrMain,
  body('memberId').isInt().withMessage('Valid member ID is required'),
  body('message').notEmpty().withMessage('Message is required')
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

    const { memberId, message } = req.body;

    const member = await Member.findByPk(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    try {
      console.log(`Sending custom message to ${member.name} (${member.phone}): ${message}`);
      
      res.json({
        success: true,
        message: 'Custom notification sent successfully',
        data: {
          memberId: member.id,
          memberName: member.name,
          phone: member.phone,
          message,
          sentAt: new Date().toISOString()
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Failed to send custom notification',
        error: error.message
      });
    }
  } catch (error) {
    console.error('Send custom notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to send custom notification'
    });
  }
});

// Get notification statistics
router.get('/stats', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const today = new Date();
    const thisMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const lastMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);

    // Mock statistics - in a real app, these would come from a notifications table
    const stats = {
      totalSent: 1250,
      thisMonth: 150,
      lastMonth: 120,
      byType: {
        renewal_reminder: 45,
        payment_reminder: 30,
        birthday_wish: 25,
        custom: 50
      },
      successRate: 98.5,
      pendingNotifications: 5
    };

    res.json({
      success: true,
      data: { stats }
    });
  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch notification statistics'
    });
  }
});

module.exports = router;
