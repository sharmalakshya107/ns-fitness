import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { API_URL } from '../config';
import { 
  Users, 
  CreditCard, 
  Clock, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  DollarSign,
  Lock
} from 'lucide-react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import toast from 'react-hot-toast';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

const Dashboard = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState(null);
  const [recentMembers, setRecentMembers] = useState([]);
  const [recentPayments, setRecentPayments] = useState([]);
  const [expiringMembers, setExpiringMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentActivity();
    fetchExpiringMembers();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${API_URL}/api/reports/dashboard', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setDashboardData(data.data);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Fetch recent members
      const membersResponse = await fetch('${API_URL}/api/members?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (membersResponse.ok) {
        const membersData = await membersResponse.json();
        setRecentMembers(membersData.data.members || []);
      }

      // Fetch recent payments
      const paymentsResponse = await fetch('${API_URL}/api/payments?limit=5', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (paymentsResponse.ok) {
        const paymentsData = await paymentsResponse.json();
        setRecentPayments(paymentsData.data.payments || []);
      }
    } catch (error) {
      console.error('Failed to fetch recent activity:', error);
    }
  };

  const fetchExpiringMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('${API_URL}/api/members?status=expiring_soon', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setExpiringMembers(data.data.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch expiring members:', error);
    }
  };

  const formatTimeAgo = (date) => {
    const seconds = Math.floor((new Date() - new Date(date)) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? 's' : ''} ago`;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Failed to load dashboard data</p>
      </div>
    );
  }

  const stats = [
    {
      name: 'Total Members',
      value: dashboardData.members.total,
      icon: Users,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100'
    },
    {
      name: 'Active Members',
      value: dashboardData.members.active,
      icon: Users,
      color: 'text-green-600',
      bgColor: 'bg-green-100'
    },
    {
      name: 'Expiring Soon',
      value: dashboardData.members.expiringSoon,
      icon: AlertTriangle,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100'
    },
    {
      name: 'Expired',
      value: dashboardData.members.expired,
      icon: Clock,
      color: 'text-red-600',
      bgColor: 'bg-red-100'
    },
    {
      name: 'Total Sales',
      value: dashboardData.sales.hidden ? 'Private' : `₹${dashboardData.sales.total.toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100',
      hidden: dashboardData.sales.hidden
    },
    {
      name: 'Monthly Sales',
      value: dashboardData.sales.hidden ? 'Private' : `₹${dashboardData.sales.monthly.toLocaleString()}`,
      icon: CreditCard,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100',
      hidden: dashboardData.sales.hidden
    },
    {
      name: 'Monthly Growth',
      value: dashboardData.sales.hidden ? 'Private' : `${dashboardData.sales.monthlyGrowth}%`,
      icon: dashboardData.sales.monthlyGrowth >= 0 ? TrendingUp : TrendingDown,
      color: dashboardData.sales.monthlyGrowth >= 0 ? 'text-green-600' : 'text-red-600',
      bgColor: dashboardData.sales.monthlyGrowth >= 0 ? 'bg-green-100' : 'bg-red-100',
      hidden: dashboardData.sales.hidden
    },
    {
      name: 'Attendance Rate',
      value: `${dashboardData.attendance.attendanceRate}%`,
      icon: Calendar,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100'
    }
  ];

  const revenueChartData = {
    labels: dashboardData.revenueChart.map(item => item.month),
    datasets: [
      {
        label: 'Revenue',
        data: dashboardData.revenueChart.map(item => item.revenue),
        borderColor: 'rgb(59, 130, 246)',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        tension: 0.4
      }
    ]
  };

  const revenueChartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Monthly Revenue Trend'
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
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Welcome to NS Fitness Management System
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.name} className="card">
              <div className="flex items-center">
                <div className={`flex-shrink-0 ${stat.bgColor} rounded-lg p-3`}>
                  <Icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div className="ml-4 flex-1">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-500">{stat.name}</p>
                    {stat.hidden && <Lock className="h-4 w-4 text-gray-400" title="Private - Main Admin Only" />}
                  </div>
                  <p className={`text-2xl font-semibold ${stat.hidden ? 'text-gray-400' : 'text-gray-900'}`}>
                    {stat.value}
                  </p>
                  {stat.hidden && (
                    <p className="text-xs text-gray-400 mt-1">Main Admin Only</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart - Only for Main Admin */}
        {!dashboardData.sales.hidden ? (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Revenue Trend</h3>
            <div className="h-64">
              <Line data={revenueChartData} options={revenueChartOptions} />
            </div>
          </div>
        ) : (
          <div className="card">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Lock className="h-5 w-5 text-gray-400 mr-2" />
              Revenue Trend
            </h3>
            <div className="h-64 flex items-center justify-center bg-gray-50 rounded-lg">
              <div className="text-center">
                <Lock className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Private Information</p>
                <p className="text-sm text-gray-400 mt-1">Only visible to Main Administrator</p>
              </div>
            </div>
          </div>
        )}

        {/* Member Status Chart */}
        <div className="card">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Member Status</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="w-64 h-64">
              <Doughnut
              data={{
                labels: ['Active', 'Expiring Soon', 'Expired'],
                datasets: [
                  {
                    data: [
                      dashboardData.members.active,
                      dashboardData.members.expiringSoon,
                      dashboardData.members.expired
                    ],
                    backgroundColor: [
                      'rgb(34, 197, 94)',
                      'rgb(245, 158, 11)',
                      'rgb(239, 68, 68)'
                    ]
                  }
                ]
              }}
              options={{
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                  legend: {
                    position: 'bottom'
                  }
                }
              }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Expiring Soon Members Card */}
      {expiringMembers.length > 0 && (
        <div className="card bg-yellow-50 border-l-4 border-yellow-500">
          <div className="flex items-center mb-4">
            <AlertTriangle className="h-6 w-6 text-yellow-600 mr-2" />
            <h3 className="text-lg font-medium text-gray-900">Memberships Expiring Soon</h3>
          </div>
          <div className="space-y-3">
            {expiringMembers.slice(0, 5).map(member => (
              <div key={member.id} className="flex items-center justify-between py-2 bg-white rounded px-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{member.name}</p>
                  <p className="text-xs text-gray-500">{member.phone}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-yellow-600 font-medium">
                    Expires: {member.end_date ? new Date(member.end_date).toLocaleDateString() : 'N/A'}
                  </p>
                  <button 
                    onClick={() => navigate('/payments')}
                    className="text-xs text-primary-600 hover:text-primary-800"
                  >
                    Renew →
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <button 
            onClick={() => navigate('/members')}
            className="btn-primary"
          >
            <Users className="h-5 w-5 mr-2" />
            Add Member
          </button>
          <button 
            onClick={() => navigate('/payments')}
            className="btn-success"
          >
            <CreditCard className="h-5 w-5 mr-2" />
            Record Payment
          </button>
          <button 
            onClick={() => navigate('/attendance')}
            className="btn-secondary"
          >
            <Calendar className="h-5 w-5 mr-2" />
            Mark Attendance
          </button>
          <button 
            onClick={() => navigate('/batches')}
            className="btn-secondary"
          >
            <Clock className="h-5 w-5 mr-2" />
            Manage Batches
          </button>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="card">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Activity</h3>
        <div className="flex items-center justify-end mb-2">
          <div className="flex items-center space-x-4 text-xs">
            <div className="flex items-center">
              <div className="h-2 w-2 bg-green-400 rounded-full mr-1"></div>
              <span className="text-gray-600">Active</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 bg-yellow-400 rounded-full mr-1"></div>
              <span className="text-gray-600">Expiring Soon</span>
            </div>
            <div className="flex items-center">
              <div className="h-2 w-2 bg-red-400 rounded-full mr-1"></div>
              <span className="text-gray-600">Expired</span>
            </div>
          </div>
        </div>
        <div className="space-y-3">
          {/* Recent Members */}
          {recentMembers.slice(0, 3).map(member => (
            <div key={`member-${member.id}`} className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center">
                <div className={`h-2 w-2 rounded-full mr-3 ${
                  member.membership_status === 'active' ? 'bg-green-400' :
                  member.membership_status === 'expiring_soon' ? 'bg-yellow-400' : 'bg-red-400'
                }`}></div>
                <span className="text-sm text-gray-600">
                  New member registered: <span className="font-medium">{member.name}</span>
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {formatTimeAgo(member.created_at || member.createdAt)}
              </span>
            </div>
          ))}
          
          {/* Recent Payments */}
          {recentPayments.slice(0, 2).map(payment => (
            <div key={`payment-${payment.id}`} className="flex items-center justify-between py-2 border-b border-gray-100">
              <div className="flex items-center">
                <div className="h-2 w-2 bg-blue-400 rounded-full mr-3"></div>
                <span className="text-sm text-gray-600">
                  Payment received: <span className="font-medium">₹{payment.amount}</span> from {payment.member?.name || 'Unknown'}
                </span>
              </div>
              <span className="text-xs text-gray-400">
                {formatTimeAgo(payment.created_at || payment.createdAt)}
              </span>
            </div>
          ))}

          {recentMembers.length === 0 && recentPayments.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <p>No recent activity yet</p>
              <p className="text-sm mt-2">Start by adding members and recording payments!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
