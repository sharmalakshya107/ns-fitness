import React, { useState, useEffect } from 'react';
import { API_URL } from '../config';
import { 
  Plus, 
  Search, 
  Filter, 
  Eye,
  Download,
  Trash2,
  CreditCard,
  Calendar,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';

const Payments = () => {
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterDuration, setFilterDuration] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formData, setFormData] = useState({
    memberId: '',
    amount: '',
    duration: '',
    paymentMethod: 'cash',
    startDate: new Date().toISOString().split('T')[0],
    notes: ''
  });

  useEffect(() => {
    fetchPayments();
    fetchMembers();
  }, []);

  // Debounced search - waits 800ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPayments();
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Fetch when filters change (no debounce for filters)
  useEffect(() => {
    fetchPayments();
  }, [filterMethod, filterDuration, startDate, endDate]);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterMethod) params.append('paymentMethod', filterMethod);
      if (filterDuration) params.append('duration', filterDuration);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(`${API_URL}/api/payments?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data.data.payments);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/members`, {
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

  const handleClearFilters = () => {
    setSearchTerm('');
    setFilterMethod('');
    setFilterDuration('');
    setStartDate('');
    setEndDate('');
    setIsLoading(true);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      if (data.success) {
        toast.success('Payment recorded successfully');
        setShowAddModal(false);
        resetForm();
        fetchPayments();
      } else {
        toast.error(data.message || 'Failed to record payment');
      }
    } catch (error) {
      console.error('Failed to record payment:', error);
      toast.error('Failed to record payment');
    }
  };

  const resetForm = () => {
    setFormData({
      memberId: '',
      amount: '',
      duration: '',
      paymentMethod: 'cash',
      startDate: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const getPaymentMethodBadge = (method) => {
    const methodConfig = {
      cash: { class: 'bg-green-100 text-green-800', text: 'Cash' },
      upi: { class: 'bg-blue-100 text-blue-800', text: 'UPI' },
      card: { class: 'bg-purple-100 text-purple-800', text: 'Card' },
      bank_transfer: { class: 'bg-orange-100 text-orange-800', text: 'Bank Transfer' },
      other: { class: 'bg-gray-100 text-gray-800', text: 'Other' }
    };
    
    const config = methodConfig[method] || methodConfig.other;
    return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.class}`}>
      {config.text}
    </span>;
  };

  const handleDeletePayment = async (paymentId) => {
    if (!window.confirm('Are you sure you want to delete this payment? This action cannot be undone.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/api/payments/${paymentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        toast.error(errorData.message || 'Failed to delete payment');
        return;
      }

      const data = await response.json();
      if (data.success) {
        toast.success('Payment deleted successfully');
        fetchPayments();
      } else {
        toast.error(data.message || 'Failed to delete payment');
      }
    } catch (error) {
      console.error('Failed to delete payment:', error);
      toast.error('Failed to delete payment: ' + error.message);
    }
  };

  const generateReceipt = (payment) => {
    try {
      // Create a simple HTML receipt for printing
      const receiptWindow = window.open('', '_blank');
      const receiptHTML = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Payment Receipt - ${payment.receipt_number || payment.receiptNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              max-width: 800px;
              margin: 40px auto;
              padding: 20px;
              background: #f5f5f5;
            }
            .receipt {
              background: white;
              padding: 40px;
              border-radius: 8px;
              box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            }
            .header {
              text-align: center;
              border-bottom: 3px solid #4CAF50;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .header h1 {
              margin: 0;
              color: #4CAF50;
              font-size: 32px;
            }
            .header p {
              margin: 5px 0;
              color: #666;
            }
            .receipt-no {
              background: #4CAF50;
              color: white;
              padding: 10px 20px;
              border-radius: 4px;
              display: inline-block;
              margin: 20px 0;
              font-size: 18px;
              font-weight: bold;
            }
            .details {
              margin: 30px 0;
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              padding: 15px 0;
              border-bottom: 1px solid #eee;
            }
            .detail-label {
              font-weight: bold;
              color: #555;
            }
            .detail-value {
              color: #333;
            }
            .amount-section {
              background: #f9f9f9;
              padding: 20px;
              margin: 30px 0;
              border-radius: 4px;
              text-align: right;
            }
            .amount-section h2 {
              margin: 0;
              color: #4CAF50;
              font-size: 36px;
            }
            .footer {
              text-align: center;
              margin-top: 40px;
              padding-top: 20px;
              border-top: 2px solid #eee;
              color: #888;
              font-size: 14px;
            }
            .print-button {
              background: #4CAF50;
              color: white;
              border: none;
              padding: 15px 30px;
              border-radius: 4px;
              cursor: pointer;
              font-size: 16px;
              margin: 20px 0;
              display: block;
              width: 100%;
            }
            .print-button:hover {
              background: #45a049;
            }
            @media print {
              body {
                background: white;
                margin: 0;
              }
              .receipt {
                box-shadow: none;
                padding: 20px;
              }
              .print-button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <div class="header">
              <h1>🏋️ NS FITNESS</h1>
              <p>Gym Management System</p>
              <p>Payment Receipt</p>
              <div class="receipt-no">
                Receipt #: ${payment.receipt_number || payment.receiptNumber || 'N/A'}
              </div>
            </div>
            
            <div class="details">
              <div class="detail-row">
                <span class="detail-label">Member Name:</span>
                <span class="detail-value">${payment.member?.name || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Phone:</span>
                <span class="detail-value">${payment.member?.phone || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment Date:</span>
                <span class="detail-value">${payment.payment_date || payment.paymentDate ? new Date(payment.payment_date || payment.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }) : 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Duration:</span>
                <span class="detail-value">${payment.duration} ${payment.duration === 1 ? 'Month' : 'Months'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Membership Period:</span>
                <span class="detail-value">${payment.start_date || payment.startDate || 'N/A'} to ${payment.end_date || payment.endDate || 'N/A'}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Payment Method:</span>
                <span class="detail-value">${(payment.payment_method || payment.paymentMethod || 'N/A').toUpperCase()}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Processed By:</span>
                <span class="detail-value">${payment.processor?.full_name || payment.processor?.username || 'N/A'} (${payment.processor?.role === 'main_admin' ? 'Main Admin' : 'Sub Admin'})</span>
              </div>
            </div>
            
            <div class="amount-section">
              <p style="margin: 0; color: #666;">Total Amount Paid</p>
              <h2>₹${payment.amount ? payment.amount.toLocaleString('en-IN') : '0'}</h2>
            </div>
            
            <div class="footer">
              <p><strong>Thank you for your payment!</strong></p>
              <p>This is a computer-generated receipt.</p>
              <p>For any queries, please contact gym administration.</p>
              <p style="margin-top: 20px;">Generated on: ${new Date().toLocaleString('en-IN')}</p>
            </div>
            
            <button class="print-button" onclick="window.print()">🖨️ Print Receipt</button>
          </div>
        </body>
        </html>
      `;
      
      receiptWindow.document.write(receiptHTML);
      receiptWindow.document.close();
      
      toast.success('Receipt opened in new tab!');
    } catch (error) {
      console.error('Receipt generation error:', error);
      toast.error('Failed to generate receipt');
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage member payments and receipts
          </p>
        </div>
        <button
          onClick={() => setShowAddModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="h-5 w-5 mr-2" />
          Record Payment
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
          <div>
            <label className="label">Search</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input-field pl-10"
                placeholder="Type to search..."
              />
            </div>
          </div>
          <div>
            <label className="label">Payment Method</label>
            <select
              value={filterMethod}
              onChange={(e) => setFilterMethod(e.target.value)}
              className="input-field"
            >
              <option value="">All Methods</option>
              <option value="cash">Cash</option>
              <option value="upi">UPI</option>
              <option value="card">Card</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="label">Duration</label>
            <select
              value={filterDuration}
              onChange={(e) => setFilterDuration(e.target.value)}
              className="input-field"
            >
              <option value="">All Durations</option>
              <option value="1">1 Month</option>
              <option value="3">3 Months</option>
              <option value="6">6 Months</option>
              <option value="9">9 Months</option>
              <option value="12">12 Months</option>
            </select>
          </div>
          <div>
            <label className="label">Start Date</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div>
            <label className="label">End Date</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="input-field"
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleClearFilters}
              className="btn-secondary w-full flex items-center justify-center"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Receipt No
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Member
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Duration
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Method
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Processed By
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {payment.receipt_number || payment.receiptNumber}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {payment.member?.name}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.member?.phone}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      ₹{payment.amount.toLocaleString()}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {payment.duration} {payment.duration === 1 ? 'month' : 'months'}
                    </div>
                    <div className="text-sm text-gray-500">
                      {payment.start_date || payment.startDate} to {payment.end_date || payment.endDate}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {getPaymentMethodBadge(payment.payment_method || payment.paymentMethod)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {payment.payment_date || payment.paymentDate ? 
                        new Date(payment.payment_date || payment.paymentDate).toLocaleDateString() : 
                        'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900">
                      {payment.processor?.full_name || payment.processor?.username || 'N/A'}
                    </div>
                    <div className="text-xs text-gray-500">
                      {payment.processor?.role === 'main_admin' ? 'Main Admin' : 'Sub Admin'}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => generateReceipt(payment)}
                        className="text-primary-600 hover:text-primary-900"
                        title="Generate Receipt"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePayment(payment.id)}
                        className="text-red-600 hover:text-red-900"
                        title="Delete Payment"
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

      {/* Add Payment Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Record Payment</h3>
              <form onSubmit={handleAddPayment} className="space-y-4">
                <div>
                  <label className="label">Member *</label>
                  <select
                    required
                    value={formData.memberId}
                    onChange={(e) => setFormData({...formData, memberId: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Member</option>
                    {members.map(member => (
                      <option key={member.id} value={member.id}>
                        {member.name} - {member.phone}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label">Amount (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    value={formData.amount}
                    onChange={(e) => setFormData({...formData, amount: e.target.value})}
                    className="input-field"
                    placeholder="Enter amount"
                  />
                </div>
                <div>
                  <label className="label">Duration *</label>
                  <select
                    required
                    value={formData.duration}
                    onChange={(e) => setFormData({...formData, duration: e.target.value})}
                    className="input-field"
                  >
                    <option value="">Select Duration</option>
                    <option value="1">1 Month</option>
                    <option value="3">3 Months</option>
                    <option value="6">6 Months</option>
                    <option value="9">9 Months</option>
                    <option value="12">12 Months</option>
                  </select>
                </div>
                <div>
                  <label className="label">Payment Method *</label>
                  <select
                    required
                    value={formData.paymentMethod}
                    onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                    className="input-field"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="card">Card</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="label">Start Date *</label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({...formData, startDate: e.target.value})}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData({...formData, notes: e.target.value})}
                    className="input-field"
                    rows="3"
                    placeholder="Additional notes..."
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
                    Record Payment
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

export default Payments;
