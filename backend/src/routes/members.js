const express = require('express');
const { body, validationResult } = require('express-validator');
const { Op } = require('sequelize');
const { Member, Batch, Payment } = require('../models');
const { authenticateToken, requireSubAdminOrMain } = require('../middleware/auth');
const { updateMemberStatus } = require('../utils/update-member-status');

const router = express.Router();

// Get all members with pagination and filters
router.get('/', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const { search, batchId, status, paymentStatus } = req.query;
    
    let whereClause = { is_active: true };
    
    if (search) {
      whereClause[Op.or] = [
        { name: { [Op.like]: `%${search}%` } },
        { phone: { [Op.like]: `%${search}%` } },
        { email: { [Op.like]: `%${search}%` } }
      ];
    }
    
    if (batchId) {
      whereClause.batch_id = batchId;
    }
    
    if (status) {
      whereClause.membership_status = status;
    }
    
    if (paymentStatus) {
      whereClause.payment_status = paymentStatus;
    }

    const { count, rows: members } = await Member.findAndCountAll({
      where: whereClause,
      include: [
        { model: Batch, as: 'batch' },
        { model: Payment, as: 'payments', limit: 1, order: [['createdAt', 'DESC']] }
      ],
      limit,
      offset,
      order: [['createdAt', 'DESC']]
    });

    // Update status for each member before sending
    for (const member of members) {
      await updateMemberStatus(member.id);
    }

    // Refetch to get updated statuses
    const updatedMembers = await Member.findAll({
      where: { id: members.map(m => m.id) },
      include: [
        { model: Batch, as: 'batch' },
        { model: Payment, as: 'payments', limit: 1, order: [['createdAt', 'DESC']] }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        members: updatedMembers,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch members'
    });
  }
});

// Get member by ID
router.get('/:id', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id, {
      include: [
        { model: Batch, as: 'batch' },
        { model: Payment, as: 'payments', order: [['createdAt', 'DESC']] }
      ]
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    res.json({
      success: true,
      data: { member }
    });
  } catch (error) {
    console.error('Get member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch member'
    });
  }
});

// Create new member
router.post('/', [
  authenticateToken,
  requireSubAdminOrMain,
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('batchId').optional().isInt().withMessage('Invalid batch ID')
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

    const memberData = {
      ...req.body,
      created_by: req.user.id
    };

    const member = await Member.create(memberData);

    // Fetch member with associations
    const newMember = await Member.findByPk(member.id, {
      include: [
        { model: Batch, as: 'batch' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Member created successfully',
      data: { member: newMember }
    });
  } catch (error) {
    console.error('Create member error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create member'
    });
  }
});

// Update member
router.put('/:id', [
  authenticateToken,
  requireSubAdminOrMain,
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Invalid email format')
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

    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Map camelCase to snake_case
    const updateData = {};
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.phone !== undefined) updateData.phone = req.body.phone;
    if (req.body.email !== undefined) updateData.email = req.body.email;
    if (req.body.dateOfBirth !== undefined) updateData.date_of_birth = req.body.dateOfBirth;
    if (req.body.gender !== undefined) updateData.gender = req.body.gender;
    if (req.body.address !== undefined) updateData.address = req.body.address;
    if (req.body.batchId !== undefined) updateData.batch_id = req.body.batchId;
    if (req.body.membershipStatus !== undefined) updateData.membership_status = req.body.membershipStatus;
    if (req.body.paymentStatus !== undefined) updateData.payment_status = req.body.paymentStatus;
    if (req.body.notes !== undefined) updateData.notes = req.body.notes;

    await member.update(updateData);

    // Fetch updated member with associations
    const updatedMember = await Member.findByPk(member.id, {
      include: [
        { model: Batch, as: 'batch' }
      ]
    });

    res.json({
      success: true,
      message: 'Member updated successfully',
      data: { member: updatedMember }
    });
  } catch (error) {
    console.error('Update member error:', error);
    console.error('Error details:', error.message);
    console.error('Error name:', error.name);
    
    // Handle specific errors
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists'
      });
    }
    
    if (error.name === 'SequelizeDatabaseError') {
      return res.status(400).json({
        success: false,
        message: `Database error: ${error.message}`
      });
    }
    
    res.status(500).json({
      success: false,
      message: 'Failed to update member',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
});

// Delete member (soft delete)
router.delete('/:id', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    await member.update({ is_active: false });

    res.json({
      success: true,
      message: 'Member deleted successfully'
    });
  } catch (error) {
    console.error('Delete member error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete member'
    });
  }
});

// Freeze membership
router.post('/:id/freeze', [
  authenticateToken,
  requireSubAdminOrMain,
  body('reason').trim().notEmpty().withMessage('Freeze reason is required'),
  body('freezeStartDate').optional().isISO8601().withMessage('Valid freeze start date required'),
  body('expectedDuration').optional().isInt({ min: 1 }).withMessage('Expected duration must be positive')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      console.error('Freeze validation errors:', errors.array());
      return res.status(400).json({
        success: false,
        message: errors.array()[0].msg || 'Validation failed',
        errors: errors.array()
      });
    }

    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Can only freeze active or expiring_soon memberships
    if (member.membership_status !== 'active' && member.membership_status !== 'expiring_soon') {
      return res.status(400).json({
        success: false,
        message: 'Can only freeze active memberships'
      });
    }

    const { getISTDate } = require('../utils/timezone');
    const freezeStartDate = req.body.freezeStartDate || getISTDate();
    const currentEndDate = member.end_date;
    const expectedDuration = req.body.expectedDuration || null; // Duration in days
    
    // Calculate expected freeze end date if duration provided
    let freezeEndDate = null;
    if (expectedDuration) {
      const startDate = new Date(freezeStartDate);
      startDate.setDate(startDate.getDate() + parseInt(expectedDuration));
      freezeEndDate = startDate.toISOString().split('T')[0];
    }
    
    // Store freeze information in dedicated fields
    const freezeNote = `\n[FROZEN on ${freezeStartDate}] Reason: ${req.body.reason}. Previous status: ${member.membership_status}. Original end date: ${currentEndDate}.`;
    
    console.log('Freezing member:', member.id, 'Current status:', member.membership_status);
    
    await member.update({
      membership_status: 'frozen',
      freeze_start_date: freezeStartDate,
      freeze_end_date: freezeEndDate,
      freeze_reason: req.body.reason,
      notes: (member.notes || '') + freezeNote
    });

    console.log('Member frozen successfully. New status:', member.membership_status);

    // Fetch updated member to ensure we return latest data
    const updatedMember = await Member.findByPk(member.id, {
      include: [{ model: Batch, as: 'batch' }]
    });

    res.json({
      success: true,
      message: 'Membership frozen successfully',
      data: { member: updatedMember }
    });
  } catch (error) {
    console.error('Freeze membership error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to freeze membership'
    });
  }
});

// Unfreeze membership
router.post('/:id/unfreeze', [
  authenticateToken,
  requireSubAdminOrMain,
  body('extendDays').optional().isInt({ min: 0 }).withMessage('Extension days must be non-negative')
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

    const member = await Member.findByPk(req.params.id);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    if (member.membership_status !== 'frozen') {
      return res.status(400).json({
        success: false,
        message: 'Member is not frozen'
      });
    }

    const { getISTDate } = require('../utils/timezone');
    const today = getISTDate();
    
    // Use freeze_start_date from database, fallback to notes
    let freezeStartDate = member.freeze_start_date;
    if (!freezeStartDate) {
      const freezeMatch = member.notes?.match(/\[FROZEN on ([\d-]+)\]/);
      freezeStartDate = freezeMatch ? freezeMatch[1] : today;
    }
    
    // Set freeze_end_date to today (actual unfreeze date)
    const freezeEndDate = today;
    
    // Calculate days frozen
    const daysFrozen = Math.ceil((new Date(freezeEndDate) - new Date(freezeStartDate)) / (1000 * 60 * 60 * 24));
    
    // Parse original end date from notes
    const endDateMatch = member.notes?.match(/Original end date: ([\d-]+)/);
    const originalEndDate = endDateMatch ? endDateMatch[1] : member.end_date;
    
    // Extend end date by days frozen + any additional extension
    const extendDays = daysFrozen + (parseInt(req.body.extendDays) || 0);
    const newEndDate = new Date(originalEndDate);
    newEndDate.setDate(newEndDate.getDate() + extendDays);
    const newEndDateStr = newEndDate.toISOString().split('T')[0];

    // Determine new status based on end date
    let newStatus = 'active';
    const daysUntilExpiry = Math.ceil((newEndDate - new Date()) / (1000 * 60 * 60 * 24));
    if (daysUntilExpiry <= 0) {
      newStatus = 'expired';
    } else if (daysUntilExpiry <= 7) {
      newStatus = 'expiring_soon';
    }

    const unfreezeNote = `\n[UNFROZEN on ${today}] Days frozen: ${daysFrozen}. New end date: ${newEndDateStr}. Status: ${newStatus}.`;
    
    // Update freeze_end_date but DON'T clear freeze_start_date or freeze_reason (keep historical data)
    await member.update({
      membership_status: newStatus,
      end_date: newEndDateStr,
      freeze_end_date: freezeEndDate, // Set actual unfreeze date
      notes: (member.notes || '') + unfreezeNote
    });

    res.json({
      success: true,
      message: 'Membership unfrozen successfully',
      data: { 
        member,
        newEndDate,
        newStatus
      }
    });
  } catch (error) {
    console.error('Unfreeze membership error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to unfreeze membership'
    });
  }
});

// Get member statistics
router.get('/stats/overview', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const totalMembers = await Member.count({ where: { is_active: true } });
    const activeMembers = await Member.count({ 
      where: { 
        is_active: true, 
        membership_status: 'active' 
      } 
    });
    const expiringSoon = await Member.count({ 
      where: { 
        is_active: true, 
        membership_status: 'expiring_soon' 
      } 
    });
    const expiredMembers = await Member.count({ 
      where: { 
        is_active: true, 
        membership_status: 'expired' 
      } 
    });
    const frozenMembers = await Member.count({ 
      where: { 
        is_active: true, 
        membership_status: 'frozen' 
      } 
    });

    res.json({
      success: true,
      data: {
        totalMembers,
        activeMembers,
        expiringSoon,
        expiredMembers,
        frozenMembers
      }
    });
  } catch (error) {
    console.error('Get member stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch member statistics'
    });
  }
});

module.exports = router;
