const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Payment, Member, User } = require('../models');
const { authenticateToken, requireSubAdminOrMain } = require('../middleware/auth');
const { updateMemberStatus } = require('../utils/update-member-status');
const { getISTDateTime, getISTDate } = require('../utils/timezone');

const router = express.Router();

// Get all payments with pagination and filters
router.get('/', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const { search, startDate, endDate, paymentMethod, duration, memberId } = req.query;
    
    let whereClause = { is_active: true };
    
    // Filter by specific member if memberId is provided
    if (memberId) {
      console.log('🔍 Filtering payments by memberId:', memberId);
      whereClause.member_id = memberId;
    } else {
      console.log('🔍 No memberId filter - returning all payments');
    }
    
    if (startDate && endDate) {
      whereClause.payment_date = {
        [Op.between]: [startDate, endDate]
      };
    }
    
    if (paymentMethod) {
      whereClause.payment_method = paymentMethod;
    }
    
    if (duration) {
      whereClause.duration = duration;
    }

    // Fetch all payments first
    let allPayments = await Payment.findAll({
      where: whereClause,
      include: [
        { 
          model: Member, 
          as: 'member',
          required: true
        },
        { model: User, as: 'processor' }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Filter by search term (receipt, name, or phone)
    if (search) {
      allPayments = allPayments.filter(payment => {
        const receiptMatch = payment.receipt_number && payment.receipt_number.toLowerCase().includes(search.toLowerCase());
        const nameMatch = payment.member && payment.member.name && payment.member.name.toLowerCase().includes(search.toLowerCase());
        const phoneMatch = payment.member && payment.member.phone && payment.member.phone.includes(search);
        
        return receiptMatch || nameMatch || phoneMatch;
      });
    }

    // Pagination after filtering
    const count = allPayments.length;
    const payments = allPayments.slice(offset, offset + limit);

    res.json({
      success: true,
      data: {
        payments,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payments'
    });
  }
});

// Get payment by ID
router.get('/:id', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [
        { model: Member, as: 'member' },
        { model: User, as: 'processor' }
      ]
    });

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: { payment }
    });
  } catch (error) {
    console.error('Get payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment'
    });
  }
});

// Create new payment
router.post('/', [
  authenticateToken,
  requireSubAdminOrMain,
  body('memberId').isInt().withMessage('Valid member ID is required'),
  body('amount').isDecimal().withMessage('Valid amount is required'),
  body('duration').isIn([1, 3, 6, 9, 12]).withMessage('Duration must be 1, 3, 6, 9, or 12 months'),
  body('paymentMethod').isIn(['cash', 'upi', 'card', 'bank_transfer', 'other']).withMessage('Invalid payment method')
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

    const { memberId, amount, duration, paymentMethod, startDate, notes } = req.body;

    // Check if member exists
    const member = await Member.findByPk(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Determine the start date for the new payment period
    let newStartDate;
    const currentDate = getISTDateTime(); // Use IST date
    
    // If member has an existing end_date and it's in the future, start from that date
    if (member.end_date) {
      const memberEndDate = new Date(member.end_date);
      if (memberEndDate > currentDate) {
        // Member is renewing before expiry - start from old expiry date
        newStartDate = memberEndDate;
      } else {
        // Member expired - start from today or provided startDate
        newStartDate = startDate ? new Date(startDate) : currentDate;
      }
    } else {
      // New member - use provided startDate or current date
      newStartDate = startDate ? new Date(startDate) : currentDate;
    }

    const paymentData = {
      member_id: memberId,
      amount,
      duration,
      payment_method: paymentMethod,
      start_date: newStartDate,
      notes,
      processed_by: req.user.id
    };

    const payment = await Payment.create(paymentData);

    console.log('Payment created:', payment.toJSON());
    console.log('Updating member payment status...');

    // Update member's payment status and dates
    await member.update({
      payment_status: 'paid',
      last_payment_date: payment.payment_date,
      start_date: member.start_date || payment.start_date,
      end_date: payment.end_date
    });

    // Update membership status based on dates (active/expiring_soon/expired)
    await updateMemberStatus(memberId);

    console.log('Member updated successfully');

    // Fetch payment with associations
    const newPayment = await Payment.findByPk(payment.id, {
      include: [
        { model: Member, as: 'member' },
        { model: User, as: 'processor' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: { payment: newPayment }
    });
  } catch (error) {
    console.error('Create payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record payment'
    });
  }
});

// Update payment
router.put('/:id', [
  authenticateToken,
  requireSubAdminOrMain,
  body('amount').optional().isDecimal().withMessage('Valid amount is required'),
  body('paymentMethod').optional().isIn(['cash', 'upi', 'card', 'bank_transfer', 'other']).withMessage('Invalid payment method')
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

    const payment = await Payment.findByPk(req.params.id);
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    await payment.update(req.body);

    // Fetch updated payment with associations
    const updatedPayment = await Payment.findByPk(payment.id, {
      include: [
        { model: Member, as: 'member' },
        { model: User, as: 'processor' }
      ]
    });

    res.json({
      success: true,
      message: 'Payment updated successfully',
      data: { payment: updatedPayment }
    });
  } catch (error) {
    console.error('Update payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update payment'
    });
  }
});

// Delete payment (soft delete)
router.delete('/:id', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const payment = await Payment.findByPk(req.params.id, {
      include: [{ model: Member, as: 'member' }]
    });
    
    if (!payment) {
      return res.status(404).json({
        success: false,
        message: 'Payment not found'
      });
    }

    const memberId = payment.member_id;

    // Soft delete the payment
    await payment.update({ is_active: false });

    console.log(`💳 Payment deleted for member ${memberId}, recalculating membership...`);

    // Recalculate member's end_date based on remaining active payments
    const remainingPayments = await Payment.findAll({
      where: {
        member_id: memberId,
        is_active: true
      },
      order: [['payment_date', 'ASC']]
    });

    const member = await Member.findByPk(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    if (remainingPayments.length === 0) {
      // No payments left - set to pending
      console.log(`⚠️ No active payments remaining for member ${member.name}`);
      await member.update({
        end_date: null,
        membership_status: 'pending',
        payment_status: 'pending'
      });
    } else {
      // Recalculate end_date from remaining payments
      // Start from the earliest payment date
      const firstPayment = remainingPayments[0];
      let currentEndDate = new Date(firstPayment.start_date || firstPayment.payment_date);
      
      // Add all payment durations
      let totalMonths = 0;
      remainingPayments.forEach(p => {
        totalMonths += parseInt(p.duration) || 0;
      });

      // Calculate new end date
      currentEndDate.setMonth(currentEndDate.getMonth() + totalMonths);
      const newEndDate = currentEndDate.toISOString().split('T')[0];

      console.log(`✅ Recalculated end_date for ${member.name}: ${newEndDate} (${totalMonths} months from ${remainingPayments.length} payments)`);

      await member.update({
        end_date: newEndDate
      });

      // Update membership status based on new end_date
      await updateMemberStatus(memberId);
    }

    res.json({
      success: true,
      message: 'Payment deleted and membership recalculated successfully'
    });
  } catch (error) {
    console.error('Delete payment error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete payment'
    });
  }
});

// Get payment statistics
router.get('/stats/overview', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    let whereClause = { is_active: true };
    if (startDate && endDate) {
      whereClause.payment_date = {
        [Op.between]: [startDate, endDate]
      };
    }

    const totalPayments = await Payment.count({ where: whereClause });
    const totalAmount = await Payment.sum('amount', { where: whereClause });
    
    // Get payments by method
    const paymentsByMethod = await Payment.findAll({
      attributes: [
        'payment_method',
        [Payment.sequelize.fn('COUNT', Payment.sequelize.col('id')), 'count'],
        [Payment.sequelize.fn('SUM', Payment.sequelize.col('amount')), 'total']
      ],
      where: whereClause,
      group: ['payment_method']
    });

    // Get payments by duration
    const paymentsByDuration = await Payment.findAll({
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
        totalPayments,
        totalAmount: totalAmount || 0,
        paymentsByMethod,
        paymentsByDuration
      }
    });
  } catch (error) {
    console.error('Get payment stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch payment statistics'
    });
  }
});

module.exports = router;
