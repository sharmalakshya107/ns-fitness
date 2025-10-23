const express = require('express');
const { Op } = require('sequelize');
const { Payment, Member, Attendance, Expense } = require('../models');
const { authenticateToken, requireMainAdmin } = require('../middleware/auth');

const router = express.Router();

// Get dashboard analytics
router.get('/dashboard', authenticateToken, async (req, res) => {
  try {
    console.log('Fetching dashboard data for user role:', req.user.role);
    
    const isMainAdmin = req.user.role === 'main_admin';
    // Safe check for permissions - handles users created before permissions system
    const userPermissions = req.user.permissions || {};
    const canViewFinancial = isMainAdmin || (userPermissions.view_financial_data === true);
    
    // Get member statistics (visible to all)
    const totalMembers = await Member.count({ where: { is_active: true } }).catch(err => { console.error('Error counting members:', err); return 0; });
    const activeMembers = await Member.count({ where: { is_active: true, membership_status: 'active' } }).catch(err => { console.error('Error counting active members:', err); return 0; });
    const expiringSoon = await Member.count({ where: { is_active: true, membership_status: 'expiring_soon' } }).catch(err => 0);
    const expiredMembers = await Member.count({ where: { is_active: true, membership_status: 'expired' } }).catch(err => 0);

    console.log('Member stats:', { totalMembers, activeMembers, expiringSoon, expiredMembers });

    // Get sales statistics
    const allPayments = await Payment.findAll({ 
      where: { is_active: true },
      attributes: ['amount', 'payment_date']
    }).catch(err => { console.error('Error fetching payments:', err); return []; });
    
    const totalSales = allPayments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0);
    
    // Get current month sales
    const currentDate = new Date();
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const monthlySalesData = await Payment.sum('amount', {
      where: {
        is_active: true,
        payment_date: {
          [Op.gte]: firstDayOfMonth
        }
      }
    }).catch(err => 0);
    const monthlySales = monthlySalesData || 0;
    
    // Calculate previous month for growth
    const firstDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
    const lastMonthSalesData = await Payment.sum('amount', {
      where: {
        is_active: true,
        payment_date: {
          [Op.between]: [firstDayOfLastMonth, lastDayOfLastMonth]
        }
      }
    }).catch(err => 0);
    const lastMonthSales = lastMonthSalesData || 0;
    const monthlyGrowth = lastMonthSales > 0 ? (((monthlySales - lastMonthSales) / lastMonthSales) * 100).toFixed(1) : 0;

    console.log('Sales stats:', { totalSales, monthlySales, monthlyGrowth });

    // Generate chart data for last 12 months
    const revenueChartData = [];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    
    for (let i = 11; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
      const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
      
      const monthRevenue = await Payment.sum('amount', {
        where: {
          is_active: true,
          payment_date: {
            [Op.between]: [monthStart, monthEnd]
          }
        }
      }).catch(err => 0);
      
      revenueChartData.push({
        month: monthNames[date.getMonth()],
        revenue: monthRevenue || 0
      });
    }

    // Get attendance statistics (with error handling)
    let attendanceRate = 0;
    try {
      const totalAttendanceRecords = await Attendance.count();
      const presentCount = await Attendance.count({ where: { status: 'present' } });
      attendanceRate = totalAttendanceRecords > 0 ? ((presentCount / totalAttendanceRecords) * 100).toFixed(1) : 0;
    } catch (err) {
      console.log('Attendance data not available:', err.message);
    }

    // Get expense statistics (with error handling)
    let totalExpenses = 0;
    try {
      totalExpenses = await Expense.sum('amount', { where: { is_active: true } }) || 0;
    } catch (err) {
      console.log('Expense data not available:', err.message);
    }
    
    const netProfit = totalSales - totalExpenses;

    console.log('Dashboard data prepared successfully');

    // Different response based on user role
    const responseData = {
      members: {
        total: totalMembers,
        active: activeMembers,
        expiringSoon,
        expired: expiredMembers
      },
      attendance: {
        totalRecords: 0,
        presentCount: 0,
        attendanceRate: parseFloat(attendanceRate)
      }
    };

    // Only include financial data for main admin or users with permission
    if (canViewFinancial) {
      responseData.sales = {
        total: totalSales,
        monthly: monthlySales,
        monthlyGrowth: parseFloat(monthlyGrowth)
      };
      responseData.revenueChart = revenueChartData;
      responseData.expenses = {
        total: totalExpenses,
        netProfit
      };
    } else {
      // Sub-admins see zero/hidden financial data
      responseData.sales = {
        total: 0,
        monthly: 0,
        monthlyGrowth: 0,
        hidden: true  // Flag to indicate data is hidden
      };
      responseData.revenueChart = [];
      responseData.expenses = {
        total: 0,
        netProfit: 0,
        hidden: true
      };
    }

    res.json({
      success: true,
      data: responseData
    });
  } catch (error) {
    console.error('Get dashboard analytics error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard analytics'
    });
  }
});

// Get sales report
router.get('/sales', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const { startDate, endDate, groupBy = 'month' } = req.query;
    
    let whereClause = { isActive: true };
    if (startDate && endDate) {
      whereClause.paymentDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    let groupByClause;
    switch (groupBy) {
      case 'day':
        groupByClause = [
          Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')),
          'paymentDate'
        ];
        break;
      case 'week':
        groupByClause = [
          Payment.sequelize.fn('YEARWEEK', Payment.sequelize.col('paymentDate')),
          'paymentDate'
        ];
        break;
      case 'month':
      default:
        groupByClause = [
          Payment.sequelize.fn('YEAR', Payment.sequelize.col('paymentDate')),
          Payment.sequelize.fn('MONTH', Payment.sequelize.col('paymentDate')),
          'paymentDate'
        ];
        break;
    }

    const salesData = await Payment.findAll({
      attributes: [
        groupByClause[0],
        [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count'],
        [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total'],
        [Payment.sequelize.fn('AVG', Payment.sequelize.col('amount')), 'average']
      ],
      where: whereClause,
      group: groupByClause,
      order: [[Payment.sequelize.fn('DATE', Payment.sequelize.col('paymentDate')), 'ASC']]
    });

    // Get sales by payment method
    const salesByMethod = await Payment.findAll({
      attributes: [
        'paymentMethod',
        [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count'],
        [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
      ],
      where: whereClause,
      group: ['paymentMethod']
    });

    // Get sales by duration
    const salesByDuration = await Payment.findAll({
      attributes: [
        'duration',
        [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count'],
        [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
      ],
      where: whereClause,
      group: ['duration']
    });

    res.json({
      success: true,
      data: {
        salesData,
        salesByMethod,
        salesByDuration
      }
    });
  } catch (error) {
    console.error('Get sales report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sales report'
    });
  }
});

// Get member growth report
router.get('/members', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Member growth over time
    const memberGrowth = [];
    for (let i = 11; i >= 0; i--) {
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

      memberGrowth.push({
        month: monthStart.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
        newMembers,
        totalMembers
      });
    }

    // Members by batch
    const membersByBatch = await Member.findAll({
      attributes: [
        'batchId',
        [Member.sequelize.fn('COUNT', Member.sequelize.col('id')), 'count']
      ],
      where: { isActive: true },
      include: [
        { model: require('../models').Batch, as: 'batch', attributes: ['name'] }
      ],
      group: ['batchId']
    });

    res.json({
      success: true,
      data: {
        memberGrowth,
        membersByBatch
      }
    });
  } catch (error) {
    console.error('Get member growth report error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch member growth report'
    });
  }
});

module.exports = router;
