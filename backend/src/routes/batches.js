const express = require('express');
const { body, validationResult } = require('express-validator');
const { Batch, Member, Trainer } = require('../models');
const { authenticateToken, requireSubAdminOrMain } = require('../middleware/auth');

const router = express.Router();

// Get all batches
router.get('/', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const batches = await Batch.findAll({
      where: { is_active: true },
      include: [
        { model: Trainer, as: 'trainer' },
        { 
          model: Member, 
          as: 'members',
          where: { is_active: true, membership_status: 'active' },
          required: false
        }
      ],
      order: [['start_time', 'ASC']]
    });

    // Add member count to each batch
    const batchesWithCount = await Promise.all(
      batches.map(async (batch) => {
        const memberCount = await batch.getCurrentMemberCount();
        return {
          ...batch.toJSON(),
          currentMemberCount: memberCount
        };
      })
    );

    res.json({
      success: true,
      data: { batches: batchesWithCount }
    });
  } catch (error) {
    console.error('Get batches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches'
    });
  }
});

// Get batch by ID
router.get('/:id', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const batch = await Batch.findByPk(req.params.id, {
      include: [
        { model: Trainer, as: 'trainer' },
        { 
          model: Member, 
          as: 'members',
          where: { is_active: true },
          required: false
        }
      ]
    });

    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const memberCount = await batch.getCurrentMemberCount();

    res.json({
      success: true,
      data: { 
        batch: {
          ...batch.toJSON(),
          currentMemberCount: memberCount
        }
      }
    });
  } catch (error) {
    console.error('Get batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch'
    });
  }
});

// Create new batch
router.post('/', [
  authenticateToken,
  requireSubAdminOrMain,
  body('name').notEmpty().withMessage('Batch name is required'),
  body('startTime').notEmpty().withMessage('Start time is required'),
  body('endTime').notEmpty().withMessage('End time is required'),
  body('capacity').isInt({ min: 1 }).withMessage('Capacity must be a positive integer')
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

    // Map camelCase to snake_case for database
    const batchData = {
      name: req.body.name,
      start_time: req.body.startTime || req.body.start_time,
      end_time: req.body.endTime || req.body.end_time,
      capacity: req.body.capacity || 30,
      description: req.body.description,
      trainer_id: req.body.trainerId || req.body.trainer_id
    };

    const batch = await Batch.create(batchData);

    // Fetch batch with associations
    const newBatch = await Batch.findByPk(batch.id, {
      include: [
        { model: Trainer, as: 'trainer' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'Batch created successfully',
      data: { batch: newBatch }
    });
  } catch (error) {
    console.error('Create batch error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Batch name already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create batch'
    });
  }
});

// Update batch
router.put('/:id', [
  authenticateToken,
  requireSubAdminOrMain,
  body('name').optional().notEmpty().withMessage('Batch name cannot be empty'),
  body('capacity').optional().isInt({ min: 1 }).withMessage('Capacity must be a positive integer')
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

    const batch = await Batch.findByPk(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    await batch.update(req.body);

    // Fetch updated batch with associations
    const updatedBatch = await Batch.findByPk(batch.id, {
      include: [
        { model: Trainer, as: 'trainer' }
      ]
    });

    res.json({
      success: true,
      message: 'Batch updated successfully',
      data: { batch: updatedBatch }
    });
  } catch (error) {
    console.error('Update batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update batch'
    });
  }
});

// Delete batch (soft delete)
router.delete('/:id', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const batch = await Batch.findByPk(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    // Check if batch has active members
    const memberCount = await batch.getCurrentMemberCount();
    if (memberCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete batch with active members'
      });
    }

    await batch.update({ is_active: false });

    res.json({
      success: true,
      message: 'Batch deleted successfully'
    });
  } catch (error) {
    console.error('Delete batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete batch'
    });
  }
});

// Get batch members
router.get('/:id/members', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const batch = await Batch.findByPk(req.params.id);
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const members = await Member.findAll({
      where: {
        batch_id: req.params.id,
        is_active: true
      },
      order: [['name', 'ASC']]
    });

    res.json({
      success: true,
      data: { members }
    });
  } catch (error) {
    console.error('Get batch members error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batch members'
    });
  }
});

// Assign member to batch
router.post('/:id/assign-member', [
  authenticateToken,
  requireSubAdminOrMain,
  body('memberId').isInt().withMessage('Valid member ID is required')
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

    const { memberId } = req.body;
    const batch = await Batch.findByPk(req.params.id);
    
    if (!batch) {
      return res.status(404).json({
        success: false,
        message: 'Batch not found'
      });
    }

    const member = await Member.findByPk(memberId);
    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found'
      });
    }

    // Check batch capacity
    const currentMemberCount = await batch.getCurrentMemberCount();
    if (currentMemberCount >= batch.capacity) {
      return res.status(400).json({
        success: false,
        message: 'Batch is at full capacity'
      });
    }

    await member.update({ batch_id: req.params.id });

    res.json({
      success: true,
      message: 'Member assigned to batch successfully'
    });
  } catch (error) {
    console.error('Assign member to batch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to assign member to batch'
    });
  }
});

module.exports = router;
