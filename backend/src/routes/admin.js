const express = require('express');
const { body, validationResult } = require('express-validator');
const { User, Trainer, Expense } = require('../models');
const { authenticateToken, requireMainAdmin, requireSubAdminOrMain } = require('../middleware/auth');

const router = express.Router();

// Get all users (admin management)
router.get('/users', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const users = await User.findAll({
      where: { is_active: true },
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: { users }
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch users'
    });
  }
});

// Get sub-admins only
router.get('/sub-admins', authenticateToken, async (req, res) => {
  // Allow main admin OR sub-admin with manage_settings permission
  if (req.user.role !== 'main_admin' && (!req.user.permissions || !req.user.permissions.manage_settings)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
  try {
    const subAdmins = await User.findAll({
      where: { 
        is_active: true,
        role: 'sub_admin'
      },
      attributes: { exclude: ['password'] },
      order: [['created_at', 'DESC']]
    });

    res.json({
      success: true,
      data: subAdmins
    });
  } catch (error) {
    console.error('Get sub-admins error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch sub-admins'
    });
  }
});

// Create new sub-admin
router.post('/sub-admins', [
  authenticateToken,
  // Allow main admin OR sub-admin with manage_settings permission
  (req, res, next) => {
    if (req.user.role !== 'main_admin' && (!req.user.permissions || !req.user.permissions.manage_settings)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  },
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  // fullName is optional, can come as fullName or full_name
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

    // Set default permissions or use provided ones
    const defaultPermissions = {
      dashboard_access: req.body.dashboard_access || req.body.dashboardAccess || 'partial',
      view_financial_data: req.body.view_financial_data || req.body.viewFinancialData || false,
      manage_members: req.body.manage_members !== undefined ? req.body.manage_members : true,
      manage_payments: req.body.manage_payments !== undefined ? req.body.manage_payments : true,
      manage_attendance: req.body.manage_attendance !== undefined ? req.body.manage_attendance : true,
      manage_batches: req.body.manage_batches !== undefined ? req.body.manage_batches : true,
      view_reports: req.body.view_reports !== undefined ? req.body.view_reports : true,
      manage_settings: req.body.manage_settings || false
    };

    const userData = {
      username: req.body.username,
      email: req.body.email,
      password: req.body.password,
      full_name: req.body.fullName || req.body.full_name,
      phone: req.body.phone,
      role: 'sub_admin',
      created_by: req.user.id,
      permissions: defaultPermissions
    };

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: 'Sub-admin created successfully',
      data: { user: user.toJSON() }
    });
  } catch (error) {
    console.error('Create sub-admin error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create sub-admin'
    });
  }
});

// Update sub-admin
router.put('/sub-admins/:id', [
  authenticateToken,
  // Allow main admin OR sub-admin with manage_settings permission
  (req, res, next) => {
    if (req.user.role !== 'main_admin' && (!req.user.permissions || !req.user.permissions.manage_settings)) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }
    next();
  },
  body('email').optional().isEmail().withMessage('Valid email is required')
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

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Sub-admin not found'
      });
    }

    if (user.role !== 'sub_admin') {
      return res.status(400).json({
        success: false,
        message: 'Can only edit sub-admins'
      });
    }

    // Prepare update data
    const updateData = {
      username: req.body.username,
      email: req.body.email,
      full_name: req.body.fullName || req.body.full_name,
      phone: req.body.phone
    };

    // Update password if provided
    if (req.body.password) {
      updateData.password = req.body.password;
    }

    // Update permissions if provided
    if (req.body.dashboardAccess || req.body.viewFinancialData !== undefined) {
      updateData.permissions = {
        dashboard_access: req.body.dashboardAccess || req.body.dashboard_access || user.permissions?.dashboard_access || 'partial',
        view_financial_data: req.body.viewFinancialData !== undefined ? req.body.viewFinancialData : (user.permissions?.view_financial_data || false),
        manage_members: req.body.manage_members !== undefined ? req.body.manage_members : (user.permissions?.manage_members !== undefined ? user.permissions.manage_members : true),
        manage_payments: req.body.manage_payments !== undefined ? req.body.manage_payments : (user.permissions?.manage_payments !== undefined ? user.permissions.manage_payments : true),
        manage_attendance: req.body.manage_attendance !== undefined ? req.body.manage_attendance : (user.permissions?.manage_attendance !== undefined ? user.permissions.manage_attendance : true),
        manage_batches: req.body.manage_batches !== undefined ? req.body.manage_batches : (user.permissions?.manage_batches !== undefined ? user.permissions.manage_batches : true),
        view_reports: req.body.view_reports !== undefined ? req.body.view_reports : (user.permissions?.view_reports !== undefined ? user.permissions.view_reports : true),
        manage_settings: req.body.manage_settings || (user.permissions?.manage_settings || false)
      };
    }

    await user.update(updateData);

    res.json({
      success: true,
      message: 'Sub-admin updated successfully',
      data: { user: user.toJSON() }
    });
  } catch (error) {
    console.error('Update sub-admin error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to update sub-admin'
    });
  }
});

// Delete sub-admin
router.delete('/sub-admins/:id', authenticateToken, async (req, res) => {
  // Allow main admin OR sub-admin with manage_settings permission
  if (req.user.role !== 'main_admin' && (!req.user.permissions || !req.user.permissions.manage_settings)) {
    return res.status(403).json({
      success: false,
      message: 'Admin access required'
    });
  }
  
  try {
    const { id } = req.params;

    // Don't allow deleting main admin
    if (parseInt(id) === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Sub-admin not found'
      });
    }

    if (user.role !== 'sub_admin') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete sub-admins'
      });
    }

    await user.update({ is_active: false });

    res.json({
      success: true,
      message: 'Sub-admin deleted successfully'
    });
  } catch (error) {
    console.error('Delete sub-admin error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete sub-admin'
    });
  }
});

// Create new user (admin)
router.post('/users', [
  authenticateToken,
  requireMainAdmin,
  body('username').notEmpty().withMessage('Username is required'),
  body('email').isEmail().withMessage('Valid email is required'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('fullName').notEmpty().withMessage('Full name is required'),
  body('role').isIn(['main_admin', 'sub_admin']).withMessage('Invalid role')
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

    const userData = {
      ...req.body,
      createdBy: req.user.id
    };

    const user = await User.create(userData);

    res.status(201).json({
      success: true,
      message: 'User created successfully',
      data: { user: user.toJSON() }
    });
  } catch (error) {
    console.error('Create user error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create user'
    });
  }
});

// Update user
router.put('/users/:id', [
  authenticateToken,
  requireMainAdmin,
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('role').optional().isIn(['main_admin', 'sub_admin']).withMessage('Invalid role')
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

    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    await user.update(req.body);

    res.json({
      success: true,
      message: 'User updated successfully',
      data: { user: user.toJSON() }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user'
    });
  }
});

// Delete user (soft delete)
router.delete('/users/:id', authenticateToken, requireMainAdmin, async (req, res) => {
  try {
    const user = await User.findByPk(req.params.id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent self-deletion
    if (user.id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete your own account'
      });
    }

    await user.update({ isActive: false });

    res.json({
      success: true,
      message: 'User deleted successfully'
    });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete user'
    });
  }
});

// Trainer management
router.get('/trainers', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const trainers = await Trainer.findAll({
      where: { isActive: true },
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      data: { trainers }
    });
  } catch (error) {
    console.error('Get trainers error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch trainers'
    });
  }
});

// Create trainer
router.post('/trainers', [
  authenticateToken,
  requireSubAdminOrMain,
  body('name').notEmpty().withMessage('Name is required'),
  body('phone').notEmpty().withMessage('Phone is required'),
  body('email').optional().isEmail().withMessage('Valid email is required')
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

    const trainer = await Trainer.create(req.body);

    res.status(201).json({
      success: true,
      message: 'Trainer created successfully',
      data: { trainer }
    });
  } catch (error) {
    console.error('Create trainer error:', error);
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(400).json({
        success: false,
        message: 'Phone number already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to create trainer'
    });
  }
});

// Update trainer
router.put('/trainers/:id', [
  authenticateToken,
  requireSubAdminOrMain,
  body('name').optional().notEmpty().withMessage('Name cannot be empty'),
  body('email').optional().isEmail().withMessage('Valid email is required')
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

    const trainer = await Trainer.findByPk(req.params.id);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    await trainer.update(req.body);

    res.json({
      success: true,
      message: 'Trainer updated successfully',
      data: { trainer }
    });
  } catch (error) {
    console.error('Update trainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update trainer'
    });
  }
});

// Delete trainer
router.delete('/trainers/:id', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const trainer = await Trainer.findByPk(req.params.id);
    if (!trainer) {
      return res.status(404).json({
        success: false,
        message: 'Trainer not found'
      });
    }

    await trainer.update({ isActive: false });

    res.json({
      success: true,
      message: 'Trainer deleted successfully'
    });
  } catch (error) {
    console.error('Delete trainer error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete trainer'
    });
  }
});

// Expense management
router.get('/expenses', authenticateToken, requireSubAdminOrMain, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    
    const { category, startDate, endDate } = req.query;
    
    let whereClause = {};
    
    if (category) {
      whereClause.category = category;
    }
    
    if (startDate && endDate) {
      whereClause.expenseDate = {
        [Op.between]: [startDate, endDate]
      };
    }

    const { count, rows: expenses } = await Expense.findAndCountAll({
      where: whereClause,
      include: [
        { model: User, as: 'recorder', attributes: ['fullName'] }
      ],
      limit,
      offset,
      order: [['expenseDate', 'DESC']]
    });

    res.json({
      success: true,
      data: {
        expenses,
        pagination: {
          currentPage: page,
          totalPages: Math.ceil(count / limit),
          totalItems: count,
          itemsPerPage: limit
        }
      }
    });
  } catch (error) {
    console.error('Get expenses error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch expenses'
    });
  }
});

// Create expense
router.post('/expenses', [
  authenticateToken,
  requireSubAdminOrMain,
  body('category').isIn(['rent', 'equipment', 'maintenance', 'salary', 'utilities', 'marketing', 'other']).withMessage('Invalid category'),
  body('amount').isDecimal().withMessage('Valid amount is required'),
  body('description').notEmpty().withMessage('Description is required'),
  body('expenseDate').isISO8601().withMessage('Valid date is required')
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

    const expenseData = {
      ...req.body,
      recordedBy: req.user.id
    };

    const expense = await Expense.create(expenseData);

    res.status(201).json({
      success: true,
      message: 'Expense recorded successfully',
      data: { expense }
    });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to record expense'
    });
  }
});

module.exports = router;
