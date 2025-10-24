import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { Calendar, Users, CheckCircle, XCircle, Clock, Download } from 'lucide-react';
import toast from 'react-hot-toast';
import { getISTDate } from '../utils/timezone';

const Attendance = () => {
  const [attendance, setAttendance] = useState([]);
  const [batches, setBatches] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(getISTDate());
  const [selectedBatch, setSelectedBatch] = useState('');

  useEffect(() => {
    fetchBatches();
    fetchMembers();
    fetchAttendance();
  }, [selectedDate, selectedBatch]);

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

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('limit', '1000'); // Get all members for attendance
      if (selectedBatch) params.append('batchId', selectedBatch);

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
    }
  };

  const fetchAttendance = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      params.append('date', selectedDate);
      if (selectedBatch) params.append('batchId', selectedBatch);

      const response = await fetch(`${API_URL}/api/attendance?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setAttendance(data.data.attendance);
      }
    } catch (error) {
      console.error('Failed to fetch attendance:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const markAttendance = async (memberId, status) => {
    // Check if batch is selected
    if (!selectedBatch) {
      toast.error('Please select a batch first');
      return;
    }

    // Prevent marking attendance for future dates
    const today = getISTDate();
    if (selectedDate > today) {
      toast.error('Cannot mark attendance for future dates!');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const now = new Date();
      const attendanceData = [{
        memberId,
        status,
        checkInTime: status === 'present' || status === 'late' ? now.toISOString() : null,
        checkOutTime: null
      }];

      const response = await fetch(`${API_URL}/api/attendance/mark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batchId: parseInt(selectedBatch, 10),
          date: selectedDate,
          attendance: attendanceData
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Attendance marked successfully');
        fetchAttendance();
      } else {
        toast.error(data.message || 'Failed to mark attendance');
        if (data.errors) {
          console.error('Validation errors:', data.errors);
        }
      }
    } catch (error) {
      console.error('Failed to mark attendance:', error);
      toast.error('Failed to mark attendance');
    }
  };

  const getAttendanceStatus = (memberId) => {
    const record = attendance.find(a => 
      (a.member_id || a.memberId) === memberId
    );
    return record ? record.status : null;
  };

  const getAttendanceRecord = (memberId) => {
    return attendance.find(a => 
      (a.member_id || a.memberId) === memberId
    );
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const autoMarkAllAbsent = async () => {
    // Prevent marking attendance for future dates
    const today = getISTDate();
    if (selectedDate > today) {
      toast.error('Cannot mark attendance for future dates!');
      return;
    }

    if (!window.confirm('This will auto-mark ALL unmarked active members (across all batches) as absent for today. Continue?')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/attendance/auto-mark-absent`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`✅ ${data.data.markedAbsent} members marked as absent`);
        fetchAttendance();
      } else {
        toast.error(data.message || 'Failed to auto-mark absent');
      }
    } catch (error) {
      console.error('Failed to auto-mark absent:', error);
      toast.error('Failed to auto-mark absent');
    }
  };

  const markAllAbsent = async () => {
    if (!selectedBatch) {
      toast.error('Please select a batch first');
      return;
    }

    // Prevent marking attendance for future dates
    const today = getISTDate();
    if (selectedDate > today) {
      toast.error('Cannot mark attendance for future dates!');
      return;
    }

    // Find members who are not marked yet
    const unmarkedMembers = members.filter(member => {
      const status = getAttendanceStatus(member.id);
      return !status; // Not marked
    });

    if (unmarkedMembers.length === 0) {
      toast.info('All members already marked');
      return;
    }

    if (!window.confirm(`Mark ${unmarkedMembers.length} unmarked members as Absent?`)) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const attendanceData = unmarkedMembers.map(member => ({
        memberId: member.id,
        status: 'absent',
        checkInTime: null,
        checkOutTime: null
      }));

      const response = await fetch(`${API_URL}/api/attendance/mark`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          batchId: parseInt(selectedBatch, 10),
          date: selectedDate,
          attendance: attendanceData
        })
      });

      const data = await response.json();
      if (data.success) {
        toast.success(`${unmarkedMembers.length} members marked as Absent`);
        fetchAttendance();
      } else {
        toast.error(data.message || 'Failed to mark attendance');
      }
    } catch (error) {
      console.error('Failed to mark all absent:', error);
      toast.error('Failed to mark attendance');
    }
  };

  const downloadAttendanceReport = () => {
    const printWindow = window.open('', '', 'width=800,height=600');
    
    const checkins = attendance.filter(a => a.status === 'present' || a.status === 'late')
      .sort((a, b) => {
        const timeA = new Date(a.check_in_time || a.checkInTime);
        const timeB = new Date(b.check_in_time || b.checkInTime);
        return timeA - timeB;
      });
    
    const selectedBatchName = batches.find(b => b.id == selectedBatch)?.name || 'All Batches';
    const isToday = selectedDate === new Date().toISOString().split('T')[0];
    const displayDate = new Date(selectedDate).toLocaleDateString('en-IN', { 
      day: '2-digit', month: 'long', year: 'numeric' 
    });
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Attendance Report - NS Fitness</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            padding: 20px;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .summary {
            margin: 20px 0;
            padding: 15px;
            background: #f5f5f5;
            border-radius: 5px;
          }
          .summary-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin-top: 10px;
          }
          .summary-item {
            text-align: center;
            padding: 10px;
            background: white;
            border-radius: 5px;
          }
          .summary-item h4 {
            margin: 0;
            font-size: 24px;
            color: #333;
          }
          .summary-item p {
            margin: 5px 0 0 0;
            font-size: 12px;
            color: #666;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 10px;
            text-align: left;
          }
          th {
            background-color: #2196F3;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f9f9f9;
          }
          .status-present {
            color: #4CAF50;
            font-weight: bold;
          }
          .status-late {
            color: #ff9800;
            font-weight: bold;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          @media print {
            .no-print { display: none; }
            body { margin: 0; padding: 20px; }
            .header { page-break-after: avoid; }
            .summary { page-break-inside: avoid; }
            table { page-break-inside: auto; }
            tr { page-break-inside: avoid; page-break-after: auto; }
            th { page-break-after: avoid; }
            .footer { page-break-before: avoid; margin-top: 20px; font-size: 11px; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>NS Fitness - ${isToday ? "Today's Attendance (Digital Diary)" : "Attendance Report"}</h1>
          <p><strong>Date:</strong> ${displayDate}</p>
          <p><strong>Batch:</strong> ${selectedBatchName}</p>
          <p>Generated on: ${new Date().toLocaleDateString('en-IN')} at ${new Date().toLocaleTimeString('en-IN')}</p>
        </div>
        
        <div class="summary">
          <h3>Attendance Summary</h3>
          <div class="summary-grid">
            <div class="summary-item">
              <h4>${members.length}</h4>
              <p>Total Members</p>
            </div>
            <div class="summary-item">
              <h4 style="color: #4CAF50;">${attendance.filter(a => a.status === 'present').length}</h4>
              <p>Present</p>
            </div>
            <div class="summary-item">
              <h4 style="color: #f44336;">${attendance.filter(a => a.status === 'absent').length}</h4>
              <p>Absent</p>
            </div>
            <div class="summary-item">
              <h4 style="color: #ff9800;">${attendance.filter(a => a.status === 'late').length}</h4>
              <p>Late</p>
            </div>
          </div>
        </div>
        
        <h3>Check-in Details</h3>
        <table>
          <thead>
            <tr>
              <th>S.No.</th>
              <th>Member Name</th>
              <th>Batch</th>
              <th>Status</th>
              <th>Check-in Time</th>
              <th>Marked By</th>
            </tr>
          </thead>
          <tbody>
            ${checkins.length > 0 ? checkins.map((record, index) => {
              const member = members.find(m => m.id === (record.member_id || record.memberId));
              const checkInTime = record.check_in_time || record.checkInTime;
              const markedBy = record.marker?.full_name || record.marker?.username || record.markedByUser?.full_name || record.markedByUser?.username || 'System';
              
              return `
                <tr>
                  <td>${index + 1}</td>
                  <td>${member?.name || 'Unknown'}</td>
                  <td>${member?.Batch?.name || member?.batch?.name || 'N/A'}</td>
                  <td class="status-${record.status}">${record.status.toUpperCase()}</td>
                  <td>${checkInTime ? new Date(checkInTime).toLocaleTimeString('en-IN', { 
                    hour: '2-digit', 
                    minute: '2-digit',
                    second: '2-digit'
                  }) : 'N/A'}</td>
                  <td>${markedBy}</td>
                </tr>
              `;
            }).join('') : '<tr><td colspan="6" style="text-align:center;">No check-ins recorded</td></tr>'}
          </tbody>
        </table>
        
        <div class="footer">
          <p>NS Fitness Gym Management System - Digital Attendance Diary</p>
          <p>${isToday ? '' : 'Historical Record'}</p>
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #2196F3; color: white; border: none; border-radius: 5px; cursor: pointer;">Print Report</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'absent':
        return <XCircle className="h-5 w-5 text-red-500" />;
      case 'late':
        return <Clock className="h-5 w-5 text-yellow-500" />;
      default:
        return null;
    }
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
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Attendance</h1>
        <p className="mt-1 text-sm text-gray-500">
          Mark and track member attendance
        </p>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">Batch</label>
            <select
              value={selectedBatch}
              onChange={(e) => setSelectedBatch(e.target.value)}
              className="input-field"
            >
              <option value="">All Batches</option>
              {batches.map(batch => (
                <option key={batch.id} value={batch.id}>{batch.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Digital Diary - Works for any date */}
      {attendance.length > 0 && (
        <div className="card bg-gradient-to-r from-blue-50 to-indigo-50 border-l-4 border-blue-500">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <Calendar className="h-6 w-6 text-blue-600 mr-2" />
              <h3 className="text-lg font-bold text-gray-900">
                {selectedDate === getISTDate() 
                  ? "Today's Check-ins (Digital Diary)" 
                  : `Check-ins on ${new Date(selectedDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })} (Digital Diary)`
                }
              </h3>
            </div>
            <button
              onClick={downloadAttendanceReport}
              className="btn-secondary flex items-center"
            >
              <Download className="h-4 w-4 mr-2" />
              Download Report
            </button>
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {attendance
              .filter(a => a.status === 'present' || a.status === 'late')
              .sort((a, b) => {
                const timeA = new Date(a.check_in_time || a.checkInTime);
                const timeB = new Date(b.check_in_time || b.checkInTime);
                return timeA - timeB;
              })
              .map((record, idx) => {
                const checkInTime = record.check_in_time || record.checkInTime;
                return (
                  <div key={idx} className="flex items-center justify-between bg-white rounded-lg p-3 shadow-sm">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-100 text-blue-700 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {record.member?.name || 'Unknown Member'}
                        </p>
                        <p className="text-xs text-gray-500">
                          {record.member?.phone || ''}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-blue-600">
                        {formatTime(checkInTime)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {record.status === 'late' ? '🟡 Late' : '🟢 On Time'}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {record.marker 
                          ? `Marked by: ${record.marker.full_name || record.marker.username}`
                          : `✓ Self Check-in`}
                      </p>
                    </div>
                  </div>
                );
              })
            }
          </div>
          {attendance.filter(a => a.status === 'present' || a.status === 'late').length === 0 && (
            <p className="text-center text-gray-500 py-4">
              {selectedDate === getISTDate() 
                ? 'No check-ins yet today' 
                : 'No one came on this date'}
            </p>
          )}
          {selectedDate !== getISTDate() && attendance.filter(a => a.status === 'present' || a.status === 'late').length > 0 && (
            <div className="mt-3 p-2 bg-blue-100 rounded text-center">
              <p className="text-xs text-blue-700">
                📅 Historical Record - {attendance.filter(a => a.status === 'present' || a.status === 'late').length} members attended
              </p>
            </div>
          )}
        </div>
      )}

      {/* Attendance Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card bg-green-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Present</p>
              <p className="text-2xl font-bold text-green-600">
                {attendance.filter(a => a.status === 'present').length}
              </p>
            </div>
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
        </div>
        <div className="card bg-red-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Absent</p>
              <p className="text-2xl font-bold text-red-600">
                {attendance.filter(a => a.status === 'absent').length}
              </p>
            </div>
            <XCircle className="h-10 w-10 text-red-600" />
          </div>
        </div>
        <div className="card bg-yellow-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Late</p>
              <p className="text-2xl font-bold text-yellow-600">
                {attendance.filter(a => a.status === 'late').length}
              </p>
            </div>
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
        </div>
        <div className="card bg-blue-50">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Members</p>
              <p className="text-2xl font-bold text-blue-600">
                {members.length}
              </p>
            </div>
            <Users className="h-10 w-10 text-blue-600" />
          </div>
        </div>
      </div>

      {/* Attendance List */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">
            Attendance for {new Date(selectedDate).toLocaleDateString()}
            {selectedBatch && ` - ${batches.find(b => b.id == selectedBatch)?.name || 'Selected Batch'}`}
          </h3>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-gray-500">
              Attendance Rate: {members.length > 0 ? Math.round((attendance.filter(a => a.status === 'present').length / members.length) * 100) : 0}%
            </div>
            {members.filter(m => !getAttendanceStatus(m.id)).length > 0 && selectedDate <= getISTDate() && (
              <>
                <button
                  onClick={markAllAbsent}
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-lg hover:bg-red-700 flex items-center"
                >
                  <XCircle className="h-4 w-4 mr-2" />
                  Mark {members.filter(m => !getAttendanceStatus(m.id)).length} as Absent
                </button>
                <button
                  onClick={autoMarkAllAbsent}
                  className="px-4 py-2 bg-orange-600 text-white text-sm font-medium rounded-lg hover:bg-orange-700 flex items-center"
                  title="Auto-mark all unmarked active members as absent"
                >
                  <Clock className="h-4 w-4 mr-2" />
                  Auto Mark Absent (All Batches)
                </button>
              </>
            )}
            {selectedDate > getISTDate() && (
              <div className="text-sm text-orange-600 font-medium">
                ⚠️ Future date - View only
              </div>
            )}
          </div>
        </div>
        
        {members.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Users className="h-12 w-12 mx-auto mb-4 text-gray-400" />
            <p>No members found. Please select a batch.</p>
          </div>
        ) : (
          <div className="space-y-3">
          {members.map((member) => {
            const status = getAttendanceStatus(member.id);
            const record = getAttendanceRecord(member.id);
            const checkInTime = record?.check_in_time || record?.checkInTime;
            const isFutureDate = selectedDate > getISTDate();
            
            return (
              <div key={member.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                <div className="flex items-center flex-1">
                  <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center mr-4">
                    <span className="text-sm font-medium text-primary-600">
                      {member.name.charAt(0)}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900">{member.name}</div>
                    <div className="text-sm text-gray-500">{member.phone}</div>
                  </div>
                </div>
                
                <div className="flex items-center space-x-4 flex-1 justify-center">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(status)}
                    <div>
                      <span className="text-sm font-medium text-gray-900">
                        {status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Not Marked'}
                      </span>
                      {checkInTime && (
                        <div className="text-xs text-gray-500 flex items-center mt-1">
                          <Clock className="h-3 w-3 mr-1" />
                          Check-in: {formatTime(checkInTime)}
                        </div>
                      )}
                      {record && (
                        <div className="text-xs text-blue-600 mt-1">
                          {record.marker 
                            ? `Marked by: ${record.marker.full_name || record.marker.username}`
                            : `✓ Self Check-in by ${member.name}`}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  {isFutureDate ? (
                    <div className="text-xs text-gray-400 italic px-3 py-1">
                      Future date - Cannot mark
                    </div>
                  ) : member.membership_status === 'expired' || member.membership_status === 'frozen' ? (
                    <div className="text-xs text-red-500 italic px-3 py-1 flex items-center gap-1">
                      <XCircle className="h-3 w-3" />
                      {member.membership_status === 'expired' ? 'Membership Expired' : 'Membership Frozen'}
                    </div>
                  ) : (
                    <>
                      <button
                        onClick={() => markAttendance(member.id, 'present')}
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          status === 'present' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-600 hover:bg-green-100 hover:text-green-800'
                        }`}
                      >
                        Present
                      </button>
                      <button
                        onClick={() => markAttendance(member.id, 'absent')}
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          status === 'absent' 
                            ? 'bg-red-100 text-red-800' 
                            : 'bg-gray-100 text-gray-600 hover:bg-red-100 hover:text-red-800'
                        }`}
                      >
                        Absent
                      </button>
                      <button
                        onClick={() => markAttendance(member.id, 'late')}
                        className={`px-3 py-1 text-xs font-medium rounded-full ${
                          status === 'late' 
                            ? 'bg-yellow-100 text-yellow-800' 
                            : 'bg-gray-100 text-gray-600 hover:bg-yellow-100 hover:text-yellow-800'
                        }`}
                      >
                        Late
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;
