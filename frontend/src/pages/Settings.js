import React, { useState, useEffect } from 'react';
import { User, Shield, Bell, Database, Users, Plus, Trash2, Edit } from 'lucide-react';
import toast from 'react-hot-toast';

const Settings = () => {
  const [activeTab, setActiveTab] = useState('profile');
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    username: ''
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  // Sub-admin management state
  const [subAdmins, setSubAdmins] = useState([]);
  const [showAddSubAdmin, setShowAddSubAdmin] = useState(false);
  const [showEditSubAdmin, setShowEditSubAdmin] = useState(false);
  const [editingSubAdmin, setEditingSubAdmin] = useState(null);
  const [newSubAdmin, setNewSubAdmin] = useState({
    username: '',
    email: '',
    fullName: '',
    phone: '',
    password: '',
    dashboardAccess: 'partial',
    viewFinancialData: false
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  useEffect(() => {
    if (user?.role === 'main_admin') {
      fetchSubAdmins();
    }
  }, [user?.role]);

  const fetchUserData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/me', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUser(data.data.user);
        setProfileData({
          fullName: data.data.user.full_name || data.data.user.fullName,
          email: data.data.user.email,
          phone: data.data.user.phone || '',
          username: data.data.user.username
        });
      }
    } catch (error) {
      console.error('Failed to fetch user data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      console.log('Updating profile with data:', profileData);
      
      const response = await fetch('http://localhost:5000/api/auth/me', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(profileData)
      });

      const data = await response.json();
      console.log('Profile update response:', data);
      
      if (data.success) {
        toast.success('Profile updated successfully');
        localStorage.setItem('user', JSON.stringify(data.data.user));
        fetchUserData(); // Refresh user data
      } else {
        toast.error(data.message || 'Failed to update profile');
        if (data.error) {
          console.error('Server error:', data.error);
        }
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      toast.error('Failed to update profile');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/auth/change-password', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Password changed successfully');
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
      } else {
        toast.error(data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Failed to change password:', error);
      toast.error('Failed to change password');
    }
  };

  // Sub-admin management functions
  const fetchSubAdmins = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/sub-admins', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setSubAdmins(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch sub-admins:', error);
    }
  };

  const handleAddSubAdmin = async (e) => {
    e.preventDefault();
    
    // Frontend validation
    if (!newSubAdmin.username || !newSubAdmin.email || !newSubAdmin.password) {
      toast.error('Please fill in all required fields (Username, Email, Password)');
      return;
    }
    
    if (newSubAdmin.password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/admin/sub-admins', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(newSubAdmin)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Sub-admin created successfully');
        setShowAddSubAdmin(false);
        setNewSubAdmin({
          username: '',
          email: '',
          fullName: '',
          phone: '',
          password: '',
          dashboardAccess: 'partial',
          viewFinancialData: false
        });
        fetchSubAdmins();
      } else {
        // Show detailed validation errors if available
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach(err => toast.error(err.msg));
        } else {
          toast.error(data.message || 'Failed to create sub-admin');
        }
      }
    } catch (error) {
      console.error('Failed to create sub-admin:', error);
      toast.error('Failed to create sub-admin');
    }
  };

  const handleEditSubAdmin = (subAdmin) => {
    setEditingSubAdmin({
      id: subAdmin.id,
      username: subAdmin.username,
      email: subAdmin.email,
      fullName: subAdmin.full_name,
      phone: subAdmin.phone || '',
      password: '', // Leave empty, only update if changed
      dashboardAccess: subAdmin.permissions?.dashboard_access || 'partial',
      viewFinancialData: subAdmin.permissions?.view_financial_data || false
    });
    setShowEditSubAdmin(true);
  };

  const handleUpdateSubAdmin = async (e) => {
    e.preventDefault();
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/sub-admins/${editingSubAdmin.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editingSubAdmin)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Sub-admin updated successfully');
        setShowEditSubAdmin(false);
        setEditingSubAdmin(null);
        fetchSubAdmins();
      } else {
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach(err => toast.error(err.msg));
        } else {
          toast.error(data.message || 'Failed to update sub-admin');
        }
      }
    } catch (error) {
      console.error('Failed to update sub-admin:', error);
      toast.error('Failed to update sub-admin');
    }
  };

  const handleDeleteSubAdmin = async (id) => {
    if (!window.confirm('Are you sure you want to delete this sub-admin?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`http://localhost:5000/api/admin/sub-admins/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Sub-admin deleted successfully');
        fetchSubAdmins();
      } else {
        toast.error(data.message || 'Failed to delete sub-admin');
      }
    } catch (error) {
      console.error('Failed to delete sub-admin:', error);
      toast.error('Failed to delete sub-admin');
    }
  };

  const tabs = [
    { id: 'profile', name: 'Profile', icon: User },
    { id: 'security', name: 'Security', icon: Shield },
    { id: 'notifications', name: 'Notifications', icon: Bell },
    { id: 'system', name: 'System', icon: Database }
  ];

  // Add sub-admin management tab for main admin OR sub-admin with manage_settings permission
  const canManageSubAdmins = user?.role === 'main_admin' || 
    (user?.role === 'sub_admin' && user?.permissions?.manage_settings === true);
  
  if (canManageSubAdmins) {
    tabs.push({ id: 'sub-admins', name: 'Sub-Admins', icon: Users });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your account settings and preferences
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar */}
        <div className="lg:col-span-1">
          <nav className="space-y-1">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700'
                      : 'text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {tab.name}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Content */}
        <div className="lg:col-span-3">
          <div className="card">
            {/* Profile Tab */}
            {activeTab === 'profile' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">Profile Information</h3>
                <form onSubmit={handleProfileUpdate} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="label">Full Name</label>
                      <input
                        type="text"
                        value={profileData.fullName}
                        onChange={(e) => setProfileData({...profileData, fullName: e.target.value})}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label">Username</label>
                      <input
                        type="text"
                        value={profileData.username}
                        onChange={(e) => setProfileData({...profileData, username: e.target.value})}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label">Email</label>
                      <input
                        type="email"
                        value={profileData.email}
                        onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                        className="input-field"
                      />
                    </div>
                    <div>
                      <label className="label">Phone</label>
                      <input
                        type="tel"
                        value={profileData.phone}
                        onChange={(e) => setProfileData({...profileData, phone: e.target.value})}
                        className="input-field"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="btn-primary">
                      Update Profile
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">Change Password</h3>
                <form onSubmit={handlePasswordChange} className="space-y-6">
                  <div>
                    <label className="label">Current Password</label>
                    <input
                      type="password"
                      value={passwordData.currentPassword}
                      onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">New Password</label>
                    <input
                      type="password"
                      value={passwordData.newPassword}
                      onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="label">Confirm New Password</label>
                    <input
                      type="password"
                      value={passwordData.confirmPassword}
                      onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                      className="input-field"
                    />
                  </div>
                  <div className="flex justify-end">
                    <button type="submit" className="btn-primary">
                      Change Password
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">Notification Preferences</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Email Notifications</h4>
                      <p className="text-sm text-gray-500">Receive notifications via email</p>
                    </div>
                    <input type="checkbox" className="h-4 w-4 text-primary-600" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">WhatsApp Notifications</h4>
                      <p className="text-sm text-gray-500">Receive notifications via WhatsApp</p>
                    </div>
                    <input type="checkbox" className="h-4 w-4 text-primary-600" defaultChecked />
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">Payment Reminders</h4>
                      <p className="text-sm text-gray-500">Get reminders for pending payments</p>
                    </div>
                    <input type="checkbox" className="h-4 w-4 text-primary-600" defaultChecked />
                  </div>
                </div>
              </div>
            )}

            {/* Sub-Admins Tab - For Main Admin or Sub-Admin with manage_settings */}
            {activeTab === 'sub-admins' && canManageSubAdmins && (
              <div>
                <div className="flex justify-between items-center mb-6">
                  <h3 className="text-lg font-medium text-gray-900">Sub-Admin Management</h3>
                  <button
                    onClick={() => setShowAddSubAdmin(true)}
                    className="btn-primary flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Sub-Admin
                  </button>
                </div>

                {/* Sub-Admins List */}
                <div className="space-y-4">
                  {subAdmins.map((subAdmin) => (
                    <div key={subAdmin.id} className="bg-gray-50 rounded-lg p-4 flex justify-between items-center">
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">{subAdmin.full_name}</h4>
                        <p className="text-sm text-gray-600">{subAdmin.email}</p>
                        <p className="text-xs text-gray-500">Username: {subAdmin.username}</p>
                      </div>
                      <div className="flex space-x-2">
                        <button 
                          onClick={() => handleEditSubAdmin(subAdmin)}
                          className="text-blue-600 hover:text-blue-800"
                          title="Edit Sub-Admin"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button 
                          onClick={() => handleDeleteSubAdmin(subAdmin.id)}
                          className="text-red-600 hover:text-red-800"
                          title="Delete Sub-Admin"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Add Sub-Admin Modal */}
                {showAddSubAdmin && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Add New Sub-Admin</h4>
                      <form onSubmit={handleAddSubAdmin} className="space-y-4">
                        <div>
                          <label className="label">Full Name</label>
                          <input
                            type="text"
                            value={newSubAdmin.fullName}
                            onChange={(e) => setNewSubAdmin({...newSubAdmin, fullName: e.target.value})}
                            className="input-field"
                            required
                          />
                        </div>
                        <div>
                          <label className="label">Username</label>
                          <input
                            type="text"
                            value={newSubAdmin.username}
                            onChange={(e) => setNewSubAdmin({...newSubAdmin, username: e.target.value})}
                            className="input-field"
                            required
                          />
                        </div>
                        <div>
                          <label className="label">Email</label>
                          <input
                            type="email"
                            value={newSubAdmin.email}
                            onChange={(e) => setNewSubAdmin({...newSubAdmin, email: e.target.value})}
                            className="input-field"
                            required
                          />
                        </div>
                        <div>
                          <label className="label">Phone</label>
                          <input
                            type="tel"
                            value={newSubAdmin.phone}
                            onChange={(e) => setNewSubAdmin({...newSubAdmin, phone: e.target.value})}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">Password</label>
                          <input
                            type="password"
                            value={newSubAdmin.password}
                            onChange={(e) => setNewSubAdmin({...newSubAdmin, password: e.target.value})}
                            className="input-field"
                            required
                          />
                        </div>

                        {/* Permissions Section */}
                        <div className="border-t pt-4 mt-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Permissions</h4>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="label">Dashboard Access</label>
                              <select
                                value={newSubAdmin.dashboardAccess}
                                onChange={(e) => setNewSubAdmin({
                                  ...newSubAdmin, 
                                  dashboardAccess: e.target.value,
                                  viewFinancialData: e.target.value === 'full'
                                })}
                                className="input-field"
                              >
                                <option value="partial">Partial (Hide Financial Data)</option>
                                <option value="full">Full (Show All Data)</option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                {newSubAdmin.dashboardAccess === 'full' 
                                  ? '✅ Full access: Can see all financial data' 
                                  : 'Partial: Hides sales, revenue, and expense data'}
                              </p>
                            </div>

                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="viewFinancialData"
                                checked={newSubAdmin.viewFinancialData}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setNewSubAdmin({
                                    ...newSubAdmin, 
                                    viewFinancialData: checked, 
                                    dashboardAccess: checked ? 'full' : 'partial',
                                    manage_settings: checked  // Add ability to manage sub-admins
                                  });
                                }}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <label htmlFor="viewFinancialData" className="ml-2 block text-sm text-gray-900">
                                🔐 Give Complete Admin Privileges
                              </label>
                            </div>
                            <p className="text-xs text-gray-500 ml-6">
                              ✅ Full access to all financial data, sales reports, and revenue<br/>
                              ✅ Can manage and create other sub-admins<br/>
                              ✅ Same powers as Main Admin (except can't be deleted)
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => setShowAddSubAdmin(false)}
                            className="btn-secondary"
                          >
                            Cancel
                          </button>
                          <button type="submit" className="btn-primary">
                            Create Sub-Admin
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}

                {/* Edit Sub-Admin Modal */}
                {showEditSubAdmin && editingSubAdmin && (
                  <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                      <h4 className="text-lg font-medium text-gray-900 mb-4">Edit Sub-Admin</h4>
                      <form onSubmit={handleUpdateSubAdmin} className="space-y-4">
                        <div>
                          <label className="label">Full Name</label>
                          <input
                            type="text"
                            value={editingSubAdmin.fullName}
                            onChange={(e) => setEditingSubAdmin({...editingSubAdmin, fullName: e.target.value})}
                            className="input-field"
                            required
                          />
                        </div>
                        <div>
                          <label className="label">Username</label>
                          <input
                            type="text"
                            value={editingSubAdmin.username}
                            onChange={(e) => setEditingSubAdmin({...editingSubAdmin, username: e.target.value})}
                            className="input-field"
                            required
                          />
                        </div>
                        <div>
                          <label className="label">Email</label>
                          <input
                            type="email"
                            value={editingSubAdmin.email}
                            onChange={(e) => setEditingSubAdmin({...editingSubAdmin, email: e.target.value})}
                            className="input-field"
                            required
                          />
                        </div>
                        <div>
                          <label className="label">Phone</label>
                          <input
                            type="tel"
                            value={editingSubAdmin.phone}
                            onChange={(e) => setEditingSubAdmin({...editingSubAdmin, phone: e.target.value})}
                            className="input-field"
                          />
                        </div>
                        <div>
                          <label className="label">Password (leave blank to keep current)</label>
                          <input
                            type="password"
                            value={editingSubAdmin.password}
                            onChange={(e) => setEditingSubAdmin({...editingSubAdmin, password: e.target.value})}
                            className="input-field"
                            placeholder="Leave blank to keep current password"
                          />
                        </div>

                        {/* Permissions Section */}
                        <div className="border-t pt-4 mt-4">
                          <h4 className="text-sm font-medium text-gray-900 mb-3">Permissions</h4>
                          
                          <div className="space-y-3">
                            <div>
                              <label className="label">Dashboard Access</label>
                              <select
                                value={editingSubAdmin.dashboardAccess}
                                onChange={(e) => setEditingSubAdmin({
                                  ...editingSubAdmin, 
                                  dashboardAccess: e.target.value,
                                  viewFinancialData: e.target.value === 'full'
                                })}
                                className="input-field"
                              >
                                <option value="partial">Partial (Hide Financial Data)</option>
                                <option value="full">Full (Show All Data)</option>
                              </select>
                              <p className="text-xs text-gray-500 mt-1">
                                {editingSubAdmin.dashboardAccess === 'full' 
                                  ? '✅ Full access: Can see all financial data' 
                                  : 'Partial: Hides sales, revenue, and expense data'}
                              </p>
                            </div>

                            <div className="flex items-center">
                              <input
                                type="checkbox"
                                id="editViewFinancialData"
                                checked={editingSubAdmin.viewFinancialData}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  setEditingSubAdmin({
                                    ...editingSubAdmin, 
                                    viewFinancialData: checked, 
                                    dashboardAccess: checked ? 'full' : 'partial',
                                    manage_settings: checked  // Add ability to manage sub-admins
                                  });
                                }}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                              />
                              <label htmlFor="editViewFinancialData" className="ml-2 block text-sm text-gray-900">
                                🔐 Give Complete Admin Privileges
                              </label>
                            </div>
                            <p className="text-xs text-gray-500 ml-6">
                              ✅ Full access to all financial data, sales reports, and revenue<br/>
                              ✅ Can manage and create other sub-admins<br/>
                              ✅ Same powers as Main Admin (except can't be deleted)
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-end space-x-3">
                          <button
                            type="button"
                            onClick={() => {
                              setShowEditSubAdmin(false);
                              setEditingSubAdmin(null);
                            }}
                            className="btn-secondary"
                          >
                            Cancel
                          </button>
                          <button type="submit" className="btn-primary">
                            Update Sub-Admin
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* System Tab */}
            {activeTab === 'system' && (
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-6">System Information</h3>
                <div className="space-y-4">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Application Version</h4>
                    <p className="text-sm text-gray-600">NS Fitness v1.0.0</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Database Status</h4>
                    <p className="text-sm text-green-600">Connected</p>
                  </div>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Last Backup</h4>
                    <p className="text-sm text-gray-600">Today at 2:00 AM</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;
