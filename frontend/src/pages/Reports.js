import React, { useState, useEffect } from 'react';
import { BarChart3, Download, Calendar, DollarSign, Users } from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';

const Reports = () => {
  const [salesData, setSalesData] = useState(null);
  const [memberData, setMemberData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRange, setDateRange] = useState({
    startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    fetchReportsData();
  }, [dateRange]);

  const fetchReportsData = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch dashboard data instead (has all the stats we need)
      const dashboardResponse = await fetch(`http://localhost:5000/api/reports/dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (dashboardResponse.ok) {
        const data = await dashboardResponse.json();
        
        setSalesData({
          totalRevenue: data.data.sales.total,
          avgPayment: data.data.sales.total / (data.data.members.total || 1),
          monthlyGrowth: data.data.sales.monthlyGrowth
        });
        
        setMemberData({
          total: data.data.members.total,
          newThisMonth: data.data.members.active,
          active: data.data.members.active,
          inactive: data.data.members.expired
        });
      }
    } catch (error) {
      console.error('Failed to fetch reports data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const exportReport = async (type) => {
    try {
      const token = localStorage.getItem('token');
      
      if (type === 'sales') {
        // Fetch all payments for export
        const response = await fetch('http://localhost:5000/api/payments?limit=10000', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Sales data:', data); // Debug log
          // Handle both data.data.payments and data.data structure
          const payments = data.data?.payments || data.data || [];
          generateSalesReport(payments);
        } else {
          console.error('Failed to fetch payments:', response.status);
          alert('Failed to fetch payment data');
        }
      } else if (type === 'members') {
        // Fetch all members for export
        const response = await fetch('http://localhost:5000/api/members?limit=10000', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('Members data:', data); // Debug log
          // Handle both data.data.members and data.data structure
          const members = data.data?.members || data.data || [];
          generateMembersReport(members);
        } else {
          console.error('Failed to fetch members:', response.status);
          alert('Failed to fetch members data');
        }
      }
    } catch (error) {
      console.error('Failed to export report:', error);
      alert('Failed to export report: ' + error.message);
    }
  };

  const generateSalesReport = (payments) => {
    if (!payments || payments.length === 0) {
      alert('No payment data available to export');
      return;
    }

    const printWindow = window.open('', '', 'width=800,height=600');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Sales Report - NS Fitness</title>
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
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #4CAF50;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>NS Fitness - Sales Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}</p>
        </div>
        
        <div class="summary">
          <h3>Summary</h3>
          <p><strong>Total Sales:</strong> ₹${payments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0).toLocaleString('en-IN')}</p>
          <p><strong>Total Payments:</strong> ${payments.length}</p>
          <p><strong>Period:</strong> All Time</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>Receipt No.</th>
              <th>Member</th>
              <th>Amount</th>
              <th>Duration</th>
              <th>Payment Method</th>
              <th>Payment Date</th>
              <th>Start Date</th>
              <th>End Date</th>
            </tr>
          </thead>
          <tbody>
            ${payments.map(payment => `
              <tr>
                <td>${payment.receipt_number || payment.receiptNumber || 'N/A'}</td>
                <td>${payment.Member?.name || payment.member?.name || 'N/A'}</td>
                <td>₹${parseFloat(payment.amount || 0).toLocaleString('en-IN')}</td>
                <td>${payment.duration || 0} month(s)</td>
                <td>${payment.payment_method || payment.paymentMethod || 'N/A'}</td>
                <td>${payment.payment_date ? new Date(payment.payment_date).toLocaleDateString('en-IN') : 'N/A'}</td>
                <td>${payment.start_date ? new Date(payment.start_date).toLocaleDateString('en-IN') : 'N/A'}</td>
                <td>${payment.end_date ? new Date(payment.end_date).toLocaleDateString('en-IN') : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>NS Fitness Gym Management System</p>
        </div>
        
        <div class="no-print" style="margin-top: 20px; text-align: center;">
          <button onclick="window.print()" style="padding: 10px 20px; background: #4CAF50; color: white; border: none; border-radius: 5px; cursor: pointer;">Print Report</button>
          <button onclick="window.close()" style="padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 5px; cursor: pointer; margin-left: 10px;">Close</button>
        </div>
      </body>
      </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
  };

  const generateMembersReport = (members) => {
    if (!members || members.length === 0) {
      alert('No member data available to export');
      return;
    }

    const printWindow = window.open('', '', 'width=800,height=600');
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Members Report - NS Fitness</title>
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
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 6px;
            text-align: left;
          }
          th {
            background-color: #2196F3;
            color: white;
          }
          tr:nth-child(even) {
            background-color: #f2f2f2;
          }
          .status {
            padding: 3px 8px;
            border-radius: 3px;
            font-size: 11px;
            font-weight: bold;
          }
          .status.active { background: #4CAF50; color: white; }
          .status.expired { background: #f44336; color: white; }
          .status.expiring_soon { background: #ff9800; color: white; }
          .footer {
            margin-top: 30px;
            text-align: center;
            font-size: 12px;
            color: #666;
          }
          @media print {
            .no-print {
              display: none;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>NS Fitness - Members Report</h1>
          <p>Generated on: ${new Date().toLocaleDateString('en-IN')} ${new Date().toLocaleTimeString('en-IN')}</p>
        </div>
        
        <div class="summary">
          <h3>Summary</h3>
          <p><strong>Total Members:</strong> ${members.length}</p>
          <p><strong>Active:</strong> ${members.filter(m => m.membership_status === 'active').length}</p>
          <p><strong>Expired:</strong> ${members.filter(m => m.membership_status === 'expired').length}</p>
          <p><strong>Expiring Soon:</strong> ${members.filter(m => m.membership_status === 'expiring_soon').length}</p>
        </div>
        
        <table>
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Email</th>
              <th>Batch</th>
              <th>Status</th>
              <th>Payment Status</th>
              <th>End Date</th>
            </tr>
          </thead>
          <tbody>
            ${members.map(member => `
              <tr>
                <td>${member.id}</td>
                <td>${member.name}</td>
                <td>${member.phone || 'N/A'}</td>
                <td>${member.email || 'N/A'}</td>
                <td>${member.Batch?.name || member.batch?.name || 'N/A'}</td>
                <td><span class="status ${member.membership_status}">${member.membership_status?.replace('_', ' ').toUpperCase()}</span></td>
                <td>${member.payment_status?.toUpperCase() || 'N/A'}</td>
                <td>${member.end_date ? new Date(member.end_date).toLocaleDateString('en-IN') : 'N/A'}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
        
        <div class="footer">
          <p>NS Fitness Gym Management System</p>
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
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="mt-1 text-sm text-gray-500">
            View detailed reports and analytics
          </p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => exportReport('sales')}
            className="btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Sales
          </button>
          <button
            onClick={() => exportReport('members')}
            className="btn-secondary flex items-center"
          >
            <Download className="h-4 w-4 mr-2" />
            Export Members
          </button>
        </div>
      </div>

      {/* Date Range Filter */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="label">Start Date</label>
            <input
              type="date"
              value={dateRange.startDate}
              onChange={(e) => setDateRange({...dateRange, startDate: e.target.value})}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">End Date</label>
            <input
              type="date"
              value={dateRange.endDate}
              onChange={(e) => setDateRange({...dateRange, endDate: e.target.value})}
              className="input-field"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={fetchReportsData}
              className="btn-primary w-full"
            >
              Update Reports
            </button>
          </div>
        </div>
      </div>

      {/* Sales Reports */}
      {salesData && salesData.salesByMethod && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sales by Payment Method</h3>
            <div className="h-64">
              <Doughnut
                data={{
                  labels: salesData.salesByMethod?.map(item => item.paymentMethod) || [],
                  datasets: [{
                    data: salesData.salesByMethod?.map(item => item.total) || [],
                    backgroundColor: [
                      'rgb(34, 197, 94)',
                      'rgb(59, 130, 246)',
                      'rgb(168, 85, 247)',
                      'rgb(245, 158, 11)',
                      'rgb(107, 114, 128)'
                    ]
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      position: 'bottom'
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Sales by Duration</h3>
            <div className="h-64">
              <Bar
                data={{
                  labels: salesData.salesByDuration?.map(item => `${item.duration} months`) || [],
                  datasets: [{
                    label: 'Amount',
                    data: salesData.salesByDuration?.map(item => item.total) || [],
                    backgroundColor: 'rgb(59, 130, 246)'
                  }]
                }}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      display: false
                    }
                  },
                  scales: {
                    y: {
                      beginAtZero: true,
                      ticks: {
                        callback: function(value) {
                          return '₹' + value.toLocaleString();
                        }
                      }
                    }
                  }
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Member Reports */}
      {memberData && memberData.memberGrowth && (
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Member Growth</h3>
          <div className="h-64">
            <Line
              data={{
                labels: memberData.memberGrowth?.map(item => item.month) || [],
                datasets: [
                  {
                    label: 'New Members',
                    data: memberData.memberGrowth?.map(item => item.newMembers) || [],
                    borderColor: 'rgb(34, 197, 94)',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    tension: 0.4
                  },
                  {
                    label: 'Total Members',
                    data: memberData.memberGrowth?.map(item => item.totalMembers) || [],
                    borderColor: 'rgb(59, 130, 246)',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    tension: 0.4
                  }
                ]
              }}
              options={{
                responsive: true,
                plugins: {
                  legend: {
                    position: 'top'
                  }
                },
                scales: {
                  y: {
                    beginAtZero: true
                  }
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-green-100 rounded-lg p-3">
              <DollarSign className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Revenue</p>
              <p className="text-2xl font-semibold text-gray-900">
                ₹{salesData?.totalRevenue?.toLocaleString() || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-blue-100 rounded-lg p-3">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total Members</p>
              <p className="text-2xl font-semibold text-gray-900">
                {memberData?.total || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-purple-100 rounded-lg p-3">
              <Calendar className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">New This Month</p>
              <p className="text-2xl font-semibold text-gray-900">
                {memberData?.newThisMonth || 0}
              </p>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="flex items-center">
            <div className="flex-shrink-0 bg-orange-100 rounded-lg p-3">
              <BarChart3 className="h-6 w-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg. Payment</p>
              <p className="text-2xl font-semibold text-gray-900">
                ₹{salesData?.avgPayment ? Math.round(salesData.avgPayment).toLocaleString() : 0}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
