import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye,
  Phone,
  Mail,
  Calendar,
  MapPin,
  Users,
  Download,
  Snowflake,
  Play
} from 'lucide-react';
import toast from 'react-hot-toast';

const Members = () => {
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showFreezeModal, setShowFreezeModal] = useState(false);
  const [showUnfreezeModal, setShowUnfreezeModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterBatch, setFilterBatch] = useState('');
  const [batches, setBatches] = useState([]);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    address: '',
    batchId: '',
    membershipStatus: '',
    paymentStatus: '',
    notes: ''
  });

  const [freezeData, setFreezeData] = useState({
    reason: '',
    freezeStartDate: new Date().toISOString().split('T')[0],
    expectedDuration: ''
  });

  const [unfreezeData, setUnfreezeData] = useState({
    extendDays: 0
  });

  useEffect(() => {
    fetchMembers();
    fetchBatches();
  }, []);

  // Debounced search - waits 800ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMembers();
    }, 800);

    return () => clearTimeout(timer);
  }, [searchTerm, filterStatus, filterBatch]);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterStatus) params.append('status', filterStatus);
      if (filterBatch) params.append('batchId', filterBatch);

      const response = await fetch(`${API_URL}/api/members?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setMembers(data.data.members);
      }
    } catch (error) {
      console.error('Failed to fetch members:', error);
      toast.error('Failed to fetch members');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchBatches = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/batches`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setBatches(data.data.batches);
      }
    } catch (error) {
      console.error('Failed to fetch batches:', error);
    }
  };

  const handleSearch = () => {
    setIsLoading(true);
    fetchMembers();
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/members`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Member added successfully');
        setShowAddModal(false);
        resetForm();
        fetchMembers();
      } else {
        // Show validation errors if present
        if (data.errors && Array.isArray(data.errors)) {
          data.errors.forEach(error => {
            toast.error(error.msg || error.message);
          });
        } else {
          toast.error(data.message || 'Failed to add member');
        }
      }
    } catch (error) {
      console.error('Failed to add member:', error);
      toast.error('Failed to add member');
    }
  };

  const handleEditMember = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/members/${selectedMember.id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Member updated successfully');
        setShowEditModal(false);
        setSelectedMember(null);
        resetForm();
        fetchMembers();
      } else {
        toast.error(data.message || 'Failed to update member');
      }
    } catch (error) {
      console.error('Failed to update member:', error);
      toast.error('Failed to update member');
    }
  };

  const handleDeleteMember = async (memberId) => {
    if (!window.confirm('Are you sure you want to delete this member?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/members/${memberId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Member deleted successfully');
        fetchMembers();
      } else {
        toast.error(data.message || 'Failed to delete member');
      }
    } catch (error) {
      console.error('Failed to delete member:', error);
      toast.error('Failed to delete member');
    }
  };

  const handleFreezeMembership = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!freezeData.reason || freezeData.reason.trim() === '') {
      toast.error('Please select a reason for freezing');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/members/${selectedMember.id}/freeze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(freezeData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Membership frozen successfully');
        setShowFreezeModal(false);
        setFreezeData({ reason: '', freezeStartDate: new Date().toISOString().split('T')[0], expectedDuration: '' });
        fetchMembers();
      } else {
        toast.error(data.message || 'Failed to freeze membership');
      }
    } catch (error) {
      console.error('Failed to freeze membership:', error);
      toast.error('Failed to freeze membership');
    }
  };

  const handleUnfreezeMembership = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/members/${selectedMember.id}/unfreeze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(unfreezeData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`Membership unfrozen! New end date: ${data.data.newEndDate}`);
        setShowUnfreezeModal(false);
        setUnfreezeData({ extendDays: 0 });
        fetchMembers();
      } else {
        toast.error(data.message || 'Failed to unfreeze membership');
      }
    } catch (error) {
      console.error('Failed to unfreeze membership:', error);
      toast.error('Failed to unfreeze membership');
    }
  };

  const openFreezeModal = (member) => {
    setSelectedMember(member);
    setShowFreezeModal(true);
  };

  const openUnfreezeModal = (member) => {
    setSelectedMember(member);
    // Calculate days frozen for suggestion
    const freezeMatch = member.notes?.match(/\[FROZEN on ([\d-]+)\]/);
    if (freezeMatch) {
      const freezeDate = new Date(freezeMatch[1]);
      const daysFrozen = Math.ceil((new Date() - freezeDate) / (1000 * 60 * 60 * 24));
      setUnfreezeData({ extendDays: daysFrozen });
    }
    setShowUnfreezeModal(true);
  };

  const downloadMemberReport = async (member) => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch attendance history for this member (get all records, no pagination limit)
      const attendanceResponse = await fetch(`${API_URL}/api/attendance?memberId=${member.id}&limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      // Fetch payment history for this member (get all records, no pagination limit)
      const paymentsResponse = await fetch(`${API_URL}/api/payments?memberId=${member.id}&limit=1000`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const attendanceData = attendanceResponse.ok ? await attendanceResponse.json() : { data: { attendance: [] } };
      const paymentsData = paymentsResponse.ok ? await paymentsResponse.json() : { data: { payments: [] } };
      
      // Access the nested arrays correctly
      const attendanceRecords = attendanceData.data?.attendance || [];
      const paymentRecords = paymentsData.data?.payments || [];
      
      console.log('Attendance records:', attendanceRecords);
      console.log('Payment records:', paymentRecords);
      
      generateMemberReport(member, attendanceRecords, paymentRecords);
      
    } catch (error) {
      console.error('Failed to generate member report:', error);
      toast.error('Failed to generate member report');
    }
  };

  const generateMemberReport = (member, attendanceRecords, payments) => {
    const printWindow = window.open('', '', 'width=800,height=600');
    
    // Group attendance by date
    const attendanceByDate = {};
    attendanceRecords.forEach(record => {
      const date = new Date(record.date).toLocaleDateString('en-IN');
      if (!attendanceByDate[date]) {
        attendanceByDate[date] = [];
      }
      attendanceByDate[date].push(record);
    });
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Member Report - ${member.name}</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #333;
            padding-bottom: 15px;
          }
          .member-info {
            margin: 20px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 8px;
          }
          .member-info h3 {
            margin-top: 0;
            color: #2196F3;
          }
          .info-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin-top: 15px;
          }
          .info-item {
            padding: 10px;
            background: white;
            border-radius: 5px;
          }
          .info-label {
            font-size: 12px;
            color: #666;
            margin-bottom: 5px;
          }
          .info-value {
            font-size: 14px;
            font-weight: bold;
            color: #333;
          }
          .section-title {
            margin-top: 30px;
            margin-bottom: 15px;
            padding: 10px;
            background: #2196F3;
            color: white;
            border-radius: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 15px;
            margin-bottom: 30px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background-color: #4CAF50;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .status-present { color: #4CAF50; font-weight: bold; }
          .status-late { color: #ff9800; font-weight: bold; }
          .status-absent { color: #f44336; font-weight: bold; }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 2px solid #ddd;
            padding-top: 20px;
          }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>NS Fitness - Member Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</p>
        </div>
        
        <div class="member-info">
          <h3>Member Information</h3>
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">Name</div>
              <div class="info-value">${member.name}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Phone</div>
              <div class="info-value">${member.phone || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Email</div>
              <div class="info-value">${member.email || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Batch</div>
              <div class="info-value">${member.Batch?.name || member.batch?.name || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Membership Status</div>
              <div class="info-value">${member.membership_status?.replace('_', ' ').toUpperCase() || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Payment Status</div>
              <div class="info-value">${member.payment_status?.toUpperCase() || 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Membership End Date</div>
              <div class="info-value">${member.end_date ? new Date(member.end_date).toLocaleDateString('en-IN') : 'N/A'}</div>
            </div>
            <div class="info-item">
              <div class="info-label">Gender</div>
              <div class="info-value">${member.gender || 'N/A'}</div>
            </div>
          </div>
        </div>
        
        <h2 class="section-title">Payment History</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Receipt No.</th>
              <th>Amount</th>
              <th>Duration</th>
              <th>Payment Method</th>
              <th>Start Date</th>
              <th>End Date</th>
              <th>Processed By</th>
            </tr>
          </thead>
          <tbody>
            ${payments.length > 0 ? payments.map(payment => `
              <tr>
                <td>${payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-IN') : 'N/A'}</td>
                <td>${payment.receipt_number || payment.receiptNumber || 'N/A'}</td>
                <td>₹${payment.amount?.toLocaleString() || 0}</td>
                <td>${payment.duration || 0} month(s)</td>
                <td>${payment.payment_method || payment.paymentMethod || 'N/A'}</td>
                <td>${payment.start_date ? new Date(payment.start_date).toLocaleDateString('en-IN') : 'N/A'}</td>
                <td>${payment.end_date ? new Date(payment.end_date).toLocaleDateString('en-IN') : 'N/A'}</td>
                <td>${payment.processor?.full_name || payment.processor?.username || payment.processedByUser?.full_name || payment.processedByUser?.username || 'System'}</td>
              </tr>
            `).join('') : '<tr><td colspan="8" style="text-align:center;">No payment records found</td></tr>'}
          </tbody>
        </table>
        
        <h2 class="section-title">Attendance History</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Status</th>
              <th>Check-in Time</th>
              <th>Marked By</th>
            </tr>
          </thead>
          <tbody>
            ${attendanceRecords.length > 0 ? attendanceRecords
              .sort((a, b) => new Date(b.date) - new Date(a.date))
              .map(record => `
              <tr>
                <td>${new Date(record.date).toLocaleDateString('en-IN')}</td>
                <td class="status-${record.status}">${record.status?.toUpperCase()}</td>
                <td>${record.check_in_time ? new Date(record.check_in_time).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                  second: '2-digit'
                }) : 'N/A'}</td>
                <td>${record.marker?.full_name || record.marker?.username || record.markedByUser?.full_name || record.markedByUser?.username || 'System'}</td>
              </tr>
            `).join('') : '<tr><td colspan="4" style="text-align:center;">No attendance records found</td></tr>'}
          </tbody>
        </table>
        
        <div class="footer">
          <p><strong>NS Fitness Gym Management System</strong></p>
          <p>This is a computer-generated report for ${member.name}</p>
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer; font-size: 14px;">Print Report</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px; font-size: 14px;">Close</button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const resetForm = () => {
    setFormData({
      name: '',
      phone: '',
      email: '',
      dateOfBirth: '',
      gender: '',
      address: '',
      batchId: '',
      membershipStatus: '',
      paymentStatus: '',
      notes: ''
    });
  };

  const openEditModal = (member) => {
    setSelectedMember(member);
    
    // Format date of birth to YYYY-MM-DD for date input
    let formattedDOB = '';
    const dob = member.date_of_birth || member.dateOfBirth;
    if (dob) {
      try {
        const date = new Date(dob);
        if (!isNaN(date.getTime())) {
          // Format as YYYY-MM-DD
          formattedDOB = date.toISOString().split('T')[0];
        }
      } catch (e) {
        console.error('Error formatting DOB:', e);
      }
    }
    
    setFormData({
      name: member.name,
      phone: member.phone,
      email: member.email || '',
      dateOfBirth: formattedDOB,
      gender: member.gender || '',
      address: member.address || '',
      batchId: member.batch_id || member.batchId || '',
      membershipStatus: member.membership_status || member.membershipStatus || '',
      paymentStatus: member.payment_status || member.paymentStatus || '',
      notes: member.notes || ''
    });
    setShowEditModal(true);
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      active: { class: 'status-active', text: 'Active' },
      expiring_soon: { class: 'status-expiring', text: 'Expiring Soon' },
      expired: { class: 'status-expired', text: 'Expired' },
      frozen: { class: 'bg-blue-100 text-blue-800 px-2 inline-flex text-xs leading-5 font-semibold rounded-full', text: 'Frozen' },
      pending: { class: 'status-pending', text: 'Pending' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={config.class}>{config.text}</span>;
  };

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      paid: { class: 'status-active', text: 'Paid' },
      pending: { class: 'status-pending', text: 'Pending' },
      overdue: { class: 'status-expired', text: 'Overdue' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    return <span className={config.class}>{config.text}</span>;
  };

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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage gym members and their information
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Add Member
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                placeholder="Search by name, phone..."
              />
            </div>
          </div>
          <div>
            <label className="label">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="input-field"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="expiring_soon">Expiring Soon</option>
              <option value="expired">Expired</option>
              <option value="frozen">Frozen</option>
            </select>
          </div>
          <div>
            <label className="label">Batch</label>
            <select
              value={filterBatch}
              onChange={(e) => setFilterBatch(e.target.value)}
              className="input-field"
            >
              <option value="">All Batches</option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} ({batch.start_time} - {batch.end_time})
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleSearch}
              className="btn-primary w-full flex items-center justify-center"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </button>
          </div>
        </div>
      </div>

      {/* Members Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Batch
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiring On
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {members.map((member) => (
                <tr key={member.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-sm font-medium text-primary-600">
                          {member.name.charAt(0)}
                        </span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">
                          {member.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          ID: {member.id}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">{member.phone}</div>
                    {member.email && (
                      <div className="text-sm text-gray-500">{member.email}</div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {member.batch?.name || 'No Batch'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getStatusBadge(member.membership_status || member.membershipStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPaymentStatusBadge(member.payment_status || member.paymentStatus)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {member.end_date ? (
                      <div>
                        <div className="font-medium">
                          {new Date(member.end_date).toLocaleDateString('en-IN', { 
                            day: '2-digit', 
                            month: 'short', 
                            year: 'numeric' 
                          })}
                        </div>
                        <div className="text-xs text-gray-500">
                          {(() => {
                            const today = new Date();
                            const endDate = new Date(member.end_date);
                            const daysLeft = Math.ceil((endDate - today) / (1000 * 60 * 60 * 24));
                            if (daysLeft < 0) return `Expired ${Math.abs(daysLeft)} days ago`;
                            if (daysLeft === 0) return 'Expires today';
                            if (daysLeft <= 7) return `${daysLeft} days left`;
                            return `${daysLeft} days left`;
                          })()}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-400">Not set</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => openEditModal(member)}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => downloadMemberReport(member)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Download Member Report"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      {(member.membership_status === 'active' || member.membership_status === 'expiring_soon') && (
                        <button
                          onClick={() => openFreezeModal(member)}
                          className="text-blue-500 hover:text-blue-700"
                          title="Freeze Membership"
                        >
                          <Snowflake className="h-4 w-4" />
                        </button>
                      )}
                      {member.membership_status === 'frozen' && (
                        <button
                          onClick={() => openUnfreezeModal(member)}
                          className="text-green-500 hover:text-green-700"
                          title="Unfreeze Membership"
                        >
                          <Play className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Member Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add New Member</h3>
              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Batch</label>
                  <select
                    value={formData.batchId}
                    onChange={(e) => setFormData({...formData, batchId: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Batch</option>
                    {batches.map(batch => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} ({batch.start_time} - {batch.end_time})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="input-field"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="input-field"
                    rows="2"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Add Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Member Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Edit Member</h3>
              <form onSubmit={handleEditMember} className="space-y-4">
                <div>
                  <label className="label">Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Phone *</label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Email</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Date of Birth</label>
                  <input
                    type="date"
                    value={formData.dateOfBirth}
                    onChange={(e) => setFormData({...formData, dateOfBirth: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Gender</label>
                  <select
                    value={formData.gender}
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Batch</label>
                  <select
                    value={formData.batchId}
                    onChange={(e) => setFormData({...formData, batchId: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Batch</option>
                    {batches.map(batch => (
                      <option key={batch.id} value={batch.id}>
                        {batch.name} ({batch.start_time} - {batch.end_time})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Membership Status</label>
                  <select
                    value={formData.membershipStatus}
                    onChange={(e) => setFormData({...formData, membershipStatus: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Status</option>
                    <option value="active">Active</option>
                    <option value="expiring_soon">Expiring Soon</option>
                    <option value="expired">Expired</option>
                    <option value="frozen">Frozen</option>
                    <option value="pending">Pending</option>
                  </select>
                </div>
                <div>
                  <label className="label">Payment Status</label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({...formData, paymentStatus: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Status</option>
                    <option value="paid">Paid</option>
                    <option value="pending">Pending</option>
                    <option value="overdue">Overdue</option>
                  </select>
                </div>
                <div>
                  <label className="label">Address</label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="input-field"
                    rows="3"
                  />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="input-field"
                    rows="2"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowEditModal(false);
                      setSelectedMember(null);
                      resetForm();
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update Member
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Freeze Membership Modal */}
      {showFreezeModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Snowflake className="h-5 w-5 mr-2 text-blue-500" />
                Freeze Membership - {selectedMember?.name}
              </h2>
            </div>
            <div className="modal-body">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> Freezing will pause the membership. When unfrozen, the membership end date will be extended by the frozen duration.
                </p>
              </div>
              <form onSubmit={handleFreezeMembership} className="space-y-4">
                <div>
                  <label className="label">Reason for Freezing *</label>
                  <select
                    value={freezeData.reason}
                    onChange={(e) => setFreezeData({...freezeData, reason: e.target.value})}
                    className="input-field"
                    required
                  >
                    <option value="">Select Reason</option>
                    <option value="Medical/Injury">Medical/Injury</option>
                    <option value="Travel/Vacation">Travel/Vacation</option>
                    <option value="Personal">Personal Reasons</option>
                    <option value="Financial">Financial Constraints</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Freeze Start Date</label>
                  <input
                    type="date"
                    value={freezeData.freezeStartDate}
                    onChange={(e) => setFreezeData({...freezeData, freezeStartDate: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Expected Duration (days) - Optional</label>
                  <input
                    type="number"
                    value={freezeData.expectedDuration}
                    onChange={(e) => setFreezeData({...freezeData, expectedDuration: e.target.value})}
                    className="input-field"
                    placeholder="Leave empty if uncertain"
                    min="1"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowFreezeModal(false);
                      setFreezeData({ reason: '', freezeStartDate: new Date().toISOString().split('T')[0], expectedDuration: '' });
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary bg-blue-600 hover:bg-blue-700">
                    Freeze Membership
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Unfreeze Membership Modal */}
      {showUnfreezeModal && (
        <div className="modal-overlay">
          <div className="modal-content max-w-md">
            <div className="modal-header">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Play className="h-5 w-5 mr-2 text-green-500" />
                Unfreeze Membership - {selectedMember?.name}
              </h2>
            </div>
            <div className="modal-body">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800">
                  <strong>Resuming membership:</strong> The end date will be automatically extended by the frozen duration to ensure the member gets the full membership period.
                </p>
              </div>
              <form onSubmit={handleUnfreezeMembership} className="space-y-4">
                <div>
                  <label className="label">Additional Extension Days (Optional)</label>
                  <input
                    type="number"
                    value={unfreezeData.extendDays}
                    onChange={(e) => setUnfreezeData({...unfreezeData, extendDays: e.target.value})}
                    className="input-field"
                    placeholder="0"
                    min="0"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    By default, membership will be extended by the frozen duration. Add extra days if needed.
                  </p>
                </div>
                <div className="bg-gray-50 p-3 rounded">
                  <p className="text-sm text-gray-700">
                    <strong>Current End Date:</strong> {selectedMember?.end_date ? new Date(selectedMember.end_date).toLocaleDateString('en-IN') : 'N/A'}
                  </p>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowUnfreezeModal(false);
                      setUnfreezeData({ extendDays: 0 });
                    }}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary bg-green-600 hover:bg-green-700">
                    Unfreeze Membership
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Members;
