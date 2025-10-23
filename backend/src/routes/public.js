const express = require('express');
const { body, validationResult } = require('express-validator');
const { Member, Batch, Trainer } = require('../models');

const router = express.Router();

// Public endpoint to get active batches (for registration form)
router.get('/batches', async (req, res) => {
  try {
    const batches = await Batch.findAll({
      where: { is_active: true },
      include: [
        { model: Trainer, as: 'trainer', attributes: ['id', 'name'] }
      ],
      attributes: ['id', 'name', 'start_time', 'end_time', 'capacity', 'description'],
      order: [['start_time', 'ASC']]
    });

    res.json({
      success: true,
      data: { batches }
    });
  } catch (error) {
    console.error('Get public batches error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch batches'
    });
  }
});

// Public member registration (self-registration)
router.post('/register-member', [
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('email').optional().isEmail().withMessage('Invalid email format'),
  body('dateOfBirth').optional().isISO8601().withMessage('Invalid date format'),
  body('gender').optional().isIn(['male', 'female', 'other']).withMessage('Invalid gender')
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
    const memberData = {
      name: req.body.name,
      phone: req.body.phone,
      email: req.body.email,
      date_of_birth: req.body.dateOfBirth,
      gender: req.body.gender,
      address: req.body.address,
      batch_id: req.body.batchId || null, // Optional batch selection
      start_date: new Date().toISOString().split('T')[0], // Set start date
      notes: 'Self-registered member - pending admin verification',
      membership_status: 'pending', // Pending until admin approves and records payment
      payment_status: 'pending',
      is_active: true, // Set active so they show up in member list
      created_by: 1 // Default admin user
    };

    const member = await Member.create(memberData);

    res.status(201).json({
      success: true,
      message: 'Registration successful! An admin will contact you soon.',
      data: { 
        memberId: member.id,
        name: member.name,
        phone: member.phone
      }
    });
  } catch (error) {
    console.error('Public member registration error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'This phone number is already registered'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Registration failed. Please try again.'
    });
  }
});

module.exports = router;

