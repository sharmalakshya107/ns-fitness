const express = require('express');
const { body, validationResult } = require('express-validator');
const { Member, Batch, Trainer, Attendance } = require('../models');
const { getISTDateTime, getISTDate, getISTTime } = require('../utils/timezone');

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
  const currentTime = getISTTime(); // Get current IST time (HH:MM format)
  
  console.log(`⏰ Current IST time: ${currentTime}, Batch: ${batchStartTime} - ${batchEndTime}`);
  
  // Handle batch times that cross midnight (e.g., 23:00:00 - 00:00:00)
  const start = batchStartTime.substring(0, 5); // HH:MM
  const end = batchEndTime.substring(0, 5); // HH:MM
  
  if (start > end) {
    // Batch crosses midnight (e.g., 23:00 - 00:00 or 23:00 - 01:00)
    // Member is present if: time >= start OR time <= end
    if (currentTime >= start || currentTime <= end) {
      console.log(`✅ PRESENT (batch crosses midnight, ${currentTime} is within ${start}-${end})`);
      return 'present';
    }
  } else {
    // Normal batch (e.g., 05:00 - 06:30)
    // Member is present if: time >= start AND time <= end
    if (currentTime >= start && currentTime <= end) {
      console.log(`✅ PRESENT (normal batch, ${currentTime} is within ${start}-${end})`);
      return 'present';
    }
  }
  
  console.log(`⏰ LATE (${currentTime} is outside ${start}-${end})`);
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
    // TEMP: Using home location for testing - https://www.google.com/maps?q=27.542603,76.596084
    const gymLat = parseFloat(process.env.GYM_LATITUDE || 27.542603);
    const gymLon = parseFloat(process.env.GYM_LONGITUDE || 76.596084);
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

    // Step 5: Check gym operating hours (based on first and last batch)
    const { Batch } = require('../models');
    const allBatches = await Batch.findAll({
      where: { is_active: true },
      attributes: ['start_time', 'end_time'],
      order: [['start_time', 'ASC']]
    });

    if (allBatches.length > 0) {
      const firstBatch = allBatches[0];
      const lastBatch = allBatches[allBatches.length - 1];
      
      const currentTime = getISTTime(); // Get current IST time (HH:MM)
      const gymOpenTime = firstBatch.start_time.substring(0, 5); // HH:MM
      const gymCloseTime = lastBatch.end_time.substring(0, 5); // HH:MM

      console.log(`🏋️ Gym Hours: ${gymOpenTime} - ${gymCloseTime}, Current: ${currentTime}`);

      // Check if gym is closed (handle midnight crossing)
      let isGymClosed = false;
      let errorMessage = '';

      if (gymOpenTime < gymCloseTime) {
        // Normal hours (e.g., 05:00 - 23:00)
        if (currentTime < gymOpenTime) {
          isGymClosed = true;
          errorMessage = `⏰ Too early! Gym opens at ${gymOpenTime}. Please come back later.`;
        } else if (currentTime > gymCloseTime) {
          isGymClosed = true;
          errorMessage = `🌙 Gym is closed! Last batch ended at ${gymCloseTime}. Opens tomorrow at ${gymOpenTime}.`;
        }
      } else {
        // Hours cross midnight (e.g., 05:00 - 01:00)
        // Gym is OPEN if: time >= open OR time <= close
        // Gym is CLOSED if: time > close AND time < open
        if (currentTime > gymCloseTime && currentTime < gymOpenTime) {
          isGymClosed = true;
          errorMessage = `🌙 Gym is closed! Last batch ended at ${gymCloseTime}. Opens at ${gymOpenTime}.`;
        }
      }

      if (isGymClosed) {
        console.log(`⛔ Gym closed: ${errorMessage}`);
        return res.status(403).json({
          success: false,
          message: errorMessage
        });
      }

      console.log(`✅ Gym is open, proceeding with check-in`);
    }

    // Step 6: Check if attendance already marked today
    const today = getISTDate(); // Get today's date in IST
    
    console.log(`🔍 Checking existing attendance for member ${member.id} on ${today}`);
    
    const existingAttendance = await Attendance.findOne({
      where: {
        member_id: member.id,
        date: today
      }
    });

    if (existingAttendance) {
      console.log(`⚠️ Attendance already exists: ${JSON.stringify(existingAttendance.dataValues)}`);
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for today!',
        data: {
          status: existingAttendance.status,
          markedAt: existingAttendance.check_in_time,
          markedBy: existingAttendance.marked_by ? 'Admin' : 'Self'
        }
      });
    }
    
    console.log(`✅ No existing attendance found, proceeding to mark...`);

    // Step 6: Determine attendance status (present or late based on batch time)
    const status = getAttendanceStatus(member.batch.start_time, member.batch.end_time);

    // Step 7: Mark attendance
    // Get current server time (UTC on Render) - will be stored as-is
    const checkInTime = new Date();
    
    let attendance;
    try {
      attendance = await Attendance.create({
        member_id: member.id,
        batch_id: member.batch_id,
        date: today,
        status: status,
        check_in_time: checkInTime, // Full DATE object, not just time string
        marked_by: null, // NULL means self-marked by member
        notes: 'Self check-in via mobile'
      });
      
      console.log(`✅ Self check-in: ${member.name} marked ${status} at ${attendance.check_in_time}`);
    } catch (createError) {
      // Handle unique constraint violation (attendance already exists)
      if (createError.name === 'SequelizeUniqueConstraintError') {
        console.error(`❌ Duplicate attendance attempt for member ${member.id} on ${today}`);
        return res.status(400).json({
          success: false,
          message: 'Attendance already marked for today! Please refresh and try again.'
        });
      }
      // Re-throw other errors
      throw createError;
    }

    // Prepare message based on status
    let message = '';
    let lateWarning = null;
    
    if (status === 'late') {
      message = `Attendance marked as LATE. Please be on time next time.`;
      lateWarning = {
        title: '⚠️ Late Check-in Warning',
        message: `Be on time! Continuous violations can lead to membership termination or trimming of your batch timing.\n\nYour Batch: ${member.batch.name}\nTiming: ${member.batch.start_time} - ${member.batch.end_time}\n\nFor batch change, contact:\nNagendra Sain (Bunty)`
      };
    } else {
      message = `Attendance marked as PRESENT! Welcome to NS Fitness.`;
    }

    // Format check-in time for display (use IST time)
    const istCheckInTime = getISTDateTime();
    const displayTime = istCheckInTime.toISOString().substring(11, 16); // HH:MM format
    const [hours, minutes] = displayTime.split(':');
    const hour12 = hours === '00' ? 12 : (hours > 12 ? hours - 12 : parseInt(hours));
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const formattedTime = `${hour12}:${minutes} ${ampm}`;

    // Check if today is member's birthday
    let birthdayMessage = null;
    if (member.date_of_birth) {
      const todayDate = new Date(today);
      const dob = new Date(member.date_of_birth);
      
      // Check if today's month and day match birthday month and day
      if (todayDate.getMonth() === dob.getMonth() && todayDate.getDate() === dob.getDate()) {
        const age = todayDate.getFullYear() - dob.getFullYear();
        birthdayMessage = {
          title: `🎉 Happy Birthday, ${member.name}! 🎂`,
          message: `Wishing you an amazing ${age}th year ahead!\nHave a great workout on your special day!`
        };
      }
    }

    res.json({
      success: true,
      message: message,
      data: {
        memberName: member.name,
        status: status,
        batchName: member.batch.name,
        batchTime: `${member.batch.start_time} - ${member.batch.end_time}`,
        checkInTime: formattedTime,
        distance: Math.round(distance), // Distance from gym (useful feedback for member)
        lateWarning: lateWarning,
        birthdayMessage: birthdayMessage
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

