const express = require('express');
const { body, validationResult } = require('express-validator');
const { Member, Batch, Trainer, Attendance } = require('../models');

const router = express.Router();

// Helper function to calculate distance between two coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

// Helper function to check if current time is within batch time
function getAttendanceStatus(batchStartTime, batchEndTime) {
  const now = new Date();
  const currentTime = now.toTimeString().split(' ')[0].substring(0, 5); // HH:MM format
  
  // If within batch time → present
  if (currentTime >= batchStartTime && currentTime <= batchEndTime) {
    return 'present';
  }
  // If after batch time → late
  return 'late';
}

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

// Public self check-in endpoint (member marks their own attendance)
router.post('/self-checkin', [
  body('phone').notEmpty().withMessage('Phone number is required'),
  body('email').notEmpty().withMessage('Email is required'),
  body('latitude').isFloat().withMessage('Valid latitude is required'),
  body('longitude').isFloat().withMessage('Valid longitude is required')
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

    const { phone, email, latitude, longitude } = req.body;

    // Step 1: Find member by phone and email
    const member = await Member.findOne({
      where: { 
        phone: phone,
        email: email,
        is_active: true
      },
      include: [{ model: Batch, as: 'batch' }]
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: 'Member not found. Please check your phone number and email.'
      });
    }

    // Step 2: Check if member has active membership
    if (member.membership_status === 'expired' || member.membership_status === 'pending') {
      return res.status(403).json({
        success: false,
        message: `Your membership is ${member.membership_status}. Please contact admin.`
      });
    }

    // Step 3: Verify geo-location (check if member is at gym)
    const gymLat = parseFloat(process.env.GYM_LATITUDE || 27.544129);
    const gymLon = parseFloat(process.env.GYM_LONGITUDE || 76.593373);
    const allowedRadius = parseFloat(process.env.GYM_RADIUS_METERS || 100);

    const distance = calculateDistance(gymLat, gymLon, latitude, longitude);

    if (distance > allowedRadius) {
      return res.status(403).json({
        success: false,
        message: `You must be at the gym to mark attendance. You are ${Math.round(distance)} meters away.`
      });
    }

    // Step 4: Check if member has batch assigned
    if (!member.batch_id) {
      return res.status(400).json({
        success: false,
        message: 'No batch assigned to you. Please contact admin.'
      });
    }

    // Step 5: Check if attendance already marked today
    const today = new Date().toISOString().split('T')[0];
    const existingAttendance = await Attendance.findOne({
      where: {
        member_id: member.id,
        date: today
      }
    });

    if (existingAttendance) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today!',
        data: {
          status: existingAttendance.status,
          markedAt: existingAttendance.check_in_time
        }
      });
    }

    // Step 6: Determine attendance status (present or late based on batch time)
    const status = getAttendanceStatus(member.batch.start_time, member.batch.end_time);

    // Step 7: Mark attendance
    const attendance = await Attendance.create({
      member_id: member.id,
      batch_id: member.batch_id,
      date: today,
      status: status,
      check_in_time: new Date().toTimeString().split(' ')[0].substring(0, 5), // HH:MM format
      marked_by: null, // NULL means self-marked by member
      notes: 'Self check-in via mobile'
    });

    console.log(`✅ Self check-in: ${member.name} marked ${status} at ${attendance.check_in_time}`);

    res.json({
      success: true,
      message: `Attendance marked as ${status.toUpperCase()}! Welcome to NS Fitness.`,
      data: {
        memberName: member.name,
        status: status,
        batchName: member.batch.name,
        batchTime: `${member.batch.start_time} - ${member.batch.end_time}`,
        checkInTime: attendance.check_in_time,
        distance: Math.round(distance)
      }
    });

  } catch (error) {
    console.error('Self check-in error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to mark attendance. Please try again or contact admin.'
    });
  }
});

module.exports = router;

