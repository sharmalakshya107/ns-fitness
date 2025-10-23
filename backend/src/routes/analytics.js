const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Member, Payment, Batch, Attendance } = require('../models');
const { authenticateToken, requireSubAdminOrMain } = require('../middleware/auth');

const router = express.Router();

// Get gym statistics overview
router.get('/stats/overview', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);

    // Member statistics
    const totalMembers = await Member.count({ where: { isActive: true } });
    const activeMembers = await Member.count({ 
      where: { 
        isActive: true, 
        membershipStatus: 'active' 
      } 
    });
    const expiringSoon = await Member.count({ 
      where: { 
        isActive: true, 
        membershipStatus: 'expiring_soon' 
      } 
    });
    const expiredMembers = await Member.count({ 
      where: { 
        isActive: true, 
        membershipStatus: 'expired' 
      } 
    });

    // Payment statistics
    const totalSales = await Payment.sum('amount', { 
      where: { isActive: true } 
    }) || 0;

    const monthlySales = await Payment.sum('amount', {
      where: {
        isActive: true,
        paymentDate: {
          [Op.between]: [startOfMonth, endOfMonth]
        }
      }
    }) || 0;

    // Attendance statistics
    const todayAttendance = await Attendance.count({
      where: {
        date: today.toISOString().split('T')[0]
      }
    });

    const presentToday = await Attendance.count({
      where: {
        date: today.toISOString().split('T')[0],
        status: 'present'
      }
    });

    // Batch statistics
    const totalBatches = await Batch.count({ where: { isActive: true } });

    res.json({
      success: true,
      data: {
        members: {
          total: totalMembers,
          active: activeMembers,
          expiringSoon,
          expired: expiredMembers
        },
        sales: {
          total: totalSales,
          monthly: monthlySales
        },
        attendance: {
          today: todayAttendance,
          presentToday,
          attendanceRate: todayAttendance > 0 ? (presentToday / todayAttendance * 100).toFixed(2) : 0
        },
        batches: {
          total: totalBatches
        }
      }
    });
  } catch (error) {
    console.error('Get stats overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics'
    });
  }
});

// Get recent activities
router.get('/activities/recent', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    
    // Get recent payments
    const recentPayments = await Payment.findAll({
      limit: Math.ceil(limit / 2),
      order: [['createdAt', 'DESC']],
      include: [
        { model: Member, as: 'member', attributes: ['name', 'phone'] }
      ]
    });

    // Get recent members
    const recentMembers = await Member.findAll({
      limit: Math.ceil(limit / 2),
      order: [['createdAt', 'DESC']],
      attributes: ['id', 'name', 'phone', 'createdAt']
    });

    const activities = [
      ...recentPayments.map(payment => ({
        type: 'payment',
        message: `Payment of ₹${payment.amount} received from ${payment.member.name}`,
        timestamp: payment.createdAt,
        data: payment
      })),
      ...recentMembers.map(member => ({
        type: 'member',
        message: `New member ${member.name} registered`,
        timestamp: member.createdAt,
        data: member
      }))
    ].sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)).slice(0, limit);

    res.json({
      success: true,
      data: { activities }
    });
  } catch (error) {
    console.error('Get recent activities error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent activities'
    });
  }
});

// Get expiring memberships
router.get('/members/expiring', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const days = parseInt(req.query.days) || 7;
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + days);

    const expiringMembers = await Member.findAll({
      where: {
        isActive: true,
        endDate: {
          [Op.between]: [new Date(), futureDate]
        }
      },
      include: [
        { model: Batch, as: 'batch', attributes: ['name'] }
      ],
      order: [['endDate', 'ASC']]
    });

    res.json({
      success: true,
      data: { members: expiringMembers }
    });
  } catch (error) {
    console.error('Get expiring members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expiring members'
    });
  }
});

// Get overdue payments
router.get('/payments/overdue', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const overdueMembers = await Member.findAll({
      where: {
        isActive: true,
        paymentStatus: 'overdue'
      },
      include: [
        { model: Batch, as: 'batch', attributes: ['name'] },
        { 
          model: Payment, 
          as: 'payments', 
          limit: 1, 
          order: [['createdAt', 'DESC']] 
        }
      ],
      order: [['lastPaymentDate', 'ASC']]
    });

    res.json({
      success: true,
      data: { members: overdueMembers }
    });
  } catch (error) {
    console.error('Get overdue payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch overdue payments'
    });
  }
});

// Get batch capacity status
router.get('/batches/capacity', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const batches = await Batch.findAll({
      where: { isActive: true },
      order: [['startTime', 'ASC']]
    });

    const batchCapacity = await Promise.all(
      batches.map(async (batch) => {
        const currentMembers = await Member.count({
          where: {
            batchId: batch.id,
            isActive: true,
            membershipStatus: 'active'
          }
        });

        return {
          ...batch.toJSON(),
          currentMembers,
          capacityPercentage: (currentMembers / batch.capacity * 100).toFixed(2),
          isFull: currentMembers >= batch.capacity
        };
      })
    );

    res.json({
      success: true,
      data: { batches: batchCapacity }
    });
  } catch (error) {
    console.error('Get batch capacity error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch capacity'
    });
  }
});

// Get monthly revenue trend
router.get('/revenue/trend', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const revenueData = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const revenue = await Payment.sum('amount', {
        where: {
          isActive: true,
          paymentDate: {
            [Op.between]: [monthStart, monthEnd]
          }
        }
      }) || 0;

      const paymentCount = await Payment.count({
        where: {
          isActive: true,
          paymentDate: {
            [Op.between]: [monthStart, monthEnd]
          }
        }
      });

      revenueData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        revenue,
        paymentCount,
        averagePayment: paymentCount > 0 ? (revenue / paymentCount).toFixed(2) : 0
      });
    }

    res.json({
      success: true,
      data: { revenueData }
    });
  } catch (error) {
    console.error('Get revenue trend error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch revenue trend'
    });
  }
});

// Get member growth trend
router.get('/members/growth', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const months = parseInt(req.query.months) || 12;
    const growthData = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthStart = new Date();
      monthStart.setMonth(monthStart.getMonth() - i);
      monthStart.setDate(1);
      
      const monthEnd = new Date(monthStart);
      monthEnd.setMonth(monthEnd.getMonth() + 1);
      monthEnd.setDate(0);

      const newMembers = await Member.count({
        where: {
          isActive: true,
          createdAt: {
            [Op.between]: [monthStart, monthEnd]
          }
        }
      });

      const totalMembers = await Member.count({
        where: {
          isActive: true,
          createdAt: {
            [Op.lte]: monthEnd
          }
        }
      });

      growthData.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        newMembers,
        totalMembers
      });
    }

    res.json({
      success: true,
      data: { growthData }
    });
  } catch (error) {
    console.error('Get member growth error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch member growth'
    });
  }
});

// Search members with advanced filters
router.get('/search/members', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const { 
      query, 
      batchId, 
      status, 
      paymentStatus, 
      startDate, 
      endDate,
      limit = 20,
      offset = 0 
    } = req.query;

    let whereClause = { isActive: true };

    if (query) {
      whereClause[Op.or] = [
        { name: { [Op.iLike]: `%${query}%` } },
        { phone: { [Op.iLike]: `%${query}%` } },
        { email: { [Op.iLike]: `%${query}%` } }
      ];
    }

    if (batchId) whereClause.batchId = batchId;
    if (status) whereClause.membershipStatus = status;
    if (paymentStatus) whereClause.paymentStatus = paymentStatus;

    if (startDate && endDate) {
      whereClause.createdAt = {
        [Op.between]: [startDate, endDate]
      };
    }

    const { count, rows: members } = await Member.findAndCountAll({
      where: whereClause,
      include: [
        { model: Batch, as: 'batch', attributes: ['name'] }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        members,
        pagination: {
          total: count,
          limit: parseInt(limit),
          offset: parseInt(offset),
          hasMore: count > parseInt(offset) + parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Search members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to search members'
    });
  }
});

module.exports = router;
