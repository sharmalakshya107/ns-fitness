import React, { useState, useEffect, useCallback } from 'react';
import { API_URL } from '../config';
import { getISTDate } from '../utils/timezone';
import { 
  Plus, 
  Search, 
  Download,
  Trash2
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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalPayments, setTotalPayments] = useState(0);

  const [formData, setFormData] = useState({
    memberId: '',
    amount: '',
    duration: '',
    paymentMethod: 'cash',
    startDate: getISTDate(),
    notes: ''
  });

  const fetchPayments = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterMethod) params.append('paymentMethod', filterMethod);
      if (filterDuration) params.append('duration', filterDuration);
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);
      params.append('page', currentPage);
      params.append('limit', '10');

      const response = await fetch(`${API_URL}/api/payments?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setPayments(data.data.payments);
        setTotalPages(data.data.pagination?.totalPages || 1);
        setTotalPayments(data.data.pagination?.totalItems || 0);
      }
    } catch (error) {
      console.error('Failed to fetch payments:', error);
      toast.error('Failed to fetch payments');
    } finally {
      setIsLoading(false);
    }
  }, [searchTerm, filterMethod, filterDuration, startDate, endDate, currentPage]);

  useEffect(() => {
    fetchPayments();
    fetchMembers();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Debounced search - waits 800ms after user stops typing
  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1); // Reset to page 1 when searching
      fetchPayments();
    }, 800); // Wait 800ms after user stops typing

    return () => clearTimeout(timer);
  }, [searchTerm, fetchPayments]);

  // Fetch when filters change (no debounce for filters)
  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when filters change
    fetchPayments();
  }, [filterMethod, filterDuration, startDate, endDate, fetchPayments]);

  // Fetch when page changes
  useEffect(() => {
    fetchPayments();
  }, [currentPage, fetchPayments]);

  const fetchMembers = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch all members without pagination limit for payment dropdown
      const response = await fetch(`${API_URL}/api/members?limit=10000`, {
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
      startDate: getISTDate(),
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
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              max-width: 850px;
              margin: 0 auto;
              padding: 20px 15px;
              background: #f8f9fa;
              color: #000;
            }
            .receipt {
              background: #ffffff;
              padding: 30px;
              box-shadow: 0 0 20px rgba(0,0,0,0.08);
              border: 1px solid #e0e0e0;
            }
            
            /* Header Section with Space for Address */
            .header {
              text-align: center;
              padding: 20px 0 15px 0;
              border-bottom: 2px solid #4CAF50;
              margin-bottom: 20px;
            }
            .header-logo {
              width: 65px;
              height: 65px;
              margin: 0 auto 10px;
              display: block;
            }
            .header h1 {
              font-size: 28px;
              font-weight: 700;
              color: #000;
              margin: 0 0 6px 0;
              letter-spacing: 0.5px;
            }
            .gym-info {
              margin: 10px 0 0 0;
              padding: 10px 0 0 0;
              border-top: 1px solid #e0e0e0;
            }
            .gym-info p {
              font-size: 12px;
              color: #666;
              margin: 3px 0;
              line-height: 1.5;
            }
            .receipt-no {
              display: inline-block;
              background: #4CAF50;
              color: #ffffff;
              padding: 8px 16px;
              border-radius: 5px;
              font-size: 14px;
              font-weight: 700;
              margin: 15px 0 0 0;
              letter-spacing: 0.5px;
            }
            
            /* Member Details Box */
            .details {
              background: #fafafa;
              border: 1px solid #e0e0e0;
              border-radius: 6px;
              padding: 15px;
              margin: 18px 0;
              box-shadow: 0 2px 4px rgba(0,0,0,0.04);
            }
            .detail-row {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 9px 0;
              border-bottom: 1px solid #e8e8e8;
            }
            .detail-row:last-child {
              border-bottom: none;
            }
            .detail-label {
              font-weight: 600;
              color: #333;
              font-size: 13px;
              letter-spacing: 0.3px;
            }
            .detail-value {
              color: #000;
              font-size: 13px;
              font-weight: 500;
              text-align: right;
            }
            
            /* Total Amount Section */
            .amount-section {
              background: #f0f9f0;
              border: 2px solid #4CAF50;
              border-radius: 8px;
              padding: 18px 25px;
              margin: 20px 0;
              text-align: center;
              box-shadow: 0 3px 8px rgba(76, 175, 80, 0.15);
            }
            .amount-section p {
              font-size: 13px;
              color: #555;
              font-weight: 600;
              margin: 0 0 8px 0;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .amount-section h2 {
              font-size: 38px;
              font-weight: 800;
              color: #4CAF50;
              margin: 0;
              letter-spacing: 1px;
            }
            
            /* Terms & Signature Section */
            .signature-section {
              margin-top: 20px;
              display: flex;
              gap: 15px;
              align-items: stretch;
            }
            .terms-section {
              flex: 0 0 260px;
              background: #fafafa;
              border: 1px solid #e0e0e0;
              border-radius: 6px;
              padding: 14px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.04);
            }
            .terms-section strong {
              display: block;
              font-size: 12px;
              font-weight: 700;
              color: #000;
              margin: 0 0 8px 0;
              text-transform: uppercase;
              letter-spacing: 0.5px;
            }
            .terms-section p {
              font-size: 10px;
              color: #555;
              line-height: 1.6;
              margin: 5px 0;
            }
            .signature-box {
              flex: 1;
              background: #fafafa;
              border: 1px solid #e0e0e0;
              border-radius: 6px;
              padding: 15px;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              box-shadow: 0 2px 4px rgba(0,0,0,0.04);
            }
            .signature-image {
              width: 100%;
              max-width: 340px;
              height: 120px;
              margin: 0 auto 12px;
              background: url('/signature.png') center center no-repeat;
              background-size: contain;
            }
            .signature-line {
              width: 100%;
              max-width: 320px;
              border-top: 2px solid #333;
              padding-top: 8px;
              text-align: center;
              font-size: 12px;
              font-weight: 700;
              color: #000;
              margin: 4px 0;
            }
            .signature-label {
              font-size: 11px;
              color: #666;
              font-weight: 600;
              margin-top: 4px;
            }
            
            /* Footer */
            .footer {
              text-align: center;
              margin-top: 20px;
              padding-top: 15px;
              border-top: 1px solid #e0e0e0;
            }
            .footer p {
              font-size: 10px;
              color: #888;
              line-height: 1.5;
              margin: 3px 0;
            }
            .footer p:first-child {
              font-weight: 600;
              color: #666;
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
            
            /* Print Styles - One Page Fit */
            @media print {
              body {
                background: white !important;
                margin: 0;
                padding: 6mm 8mm;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .receipt {
                box-shadow: none !important;
                border: none !important;
                padding: 0 !important;
                page-break-inside: avoid;
              }
              .print-button {
                display: none !important;
              }
              .header {
                padding: 10px 0 8px 0 !important;
                margin-bottom: 12px !important;
                border-bottom: 2px solid #000 !important;
              }
              .header-logo {
                width: 50px !important;
                height: 50px !important;
                margin: 0 auto 6px !important;
                filter: contrast(1.2) !important;
              }
              .header h1 {
                font-size: 22px !important;
                margin: 0 0 4px 0 !important;
                color: #000 !important;
              }
              .gym-info {
                margin: 6px 0 0 0 !important;
                padding: 6px 0 0 0 !important;
              }
              .gym-info p {
                font-size: 10px !important;
                margin: 2px 0 !important;
                color: #333 !important;
                line-height: 1.3 !important;
              }
              .receipt-no {
                background: #000 !important;
                color: #fff !important;
                padding: 6px 14px !important;
                font-size: 12px !important;
                margin: 10px 0 0 0 !important;
                border: none !important;
              }
              .details {
                background: #fafafa !important;
                border: 1px solid #d0d0d0 !important;
                padding: 12px !important;
                margin: 12px 0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .detail-row {
                padding: 7px 0 !important;
                border-bottom: 1px solid #ddd !important;
              }
              .detail-label,
              .detail-value {
                font-size: 11px !important;
                color: #000 !important;
              }
              .amount-section {
                background: #f5f5f5 !important;
                border: 2px solid #000 !important;
                padding: 14px 20px !important;
                margin: 14px 0 !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .amount-section p {
                font-size: 11px !important;
                margin: 0 0 6px 0 !important;
                color: #333 !important;
              }
              .amount-section h2 {
                font-size: 30px !important;
                color: #000 !important;
              }
              .signature-section {
                margin-top: 14px !important;
                gap: 12px !important;
              }
              .terms-section {
                flex: 0 0 240px !important;
                background: #fafafa !important;
                border: 1px solid #d0d0d0 !important;
                padding: 10px !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .terms-section strong {
                font-size: 10px !important;
                margin: 0 0 6px 0 !important;
                color: #000 !important;
              }
              .terms-section p {
                font-size: 9px !important;
                margin: 4px 0 !important;
                color: #333 !important;
                line-height: 1.4 !important;
              }
              .signature-box {
                background: #fafafa !important;
                border: 1px solid #d0d0d0 !important;
                padding: 12px !important;
                -webkit-print-color-adjust: exact;
                print-color-adjust: exact;
              }
              .signature-image {
                height: 100px !important;
                max-width: 300px !important;
                margin: 0 auto 10px !important;
                filter: contrast(1.25) brightness(0.95) !important;
              }
              .signature-line {
                font-size: 11px !important;
                color: #000 !important;
                padding-top: 6px !important;
                max-width: 280px !important;
              }
              .signature-label {
                font-size: 10px !important;
                color: #555 !important;
                margin-top: 3px !important;
              }
              .footer {
                margin-top: 12px !important;
                padding-top: 10px !important;
                border-top: 1px solid #ccc !important;
              }
              .footer p {
                font-size: 9px !important;
                margin: 2px 0 !important;
                color: #666 !important;
                line-height: 1.3 !important;
              }
            }
          </style>
        </head>
        <body>
          <div class="receipt">
            <!-- Header with Logo and Space for Address -->
            <div class="header">
              <img src="/logo.png" alt="NS Fitness Logo" class="header-logo" />
              <h1>NS FITNESS</h1>
              
              <!-- Gym Address and Contact Info -->
              <div class="gym-info">
                <p>📍 2nd Floor, Madhav's Tower, Jaipur Road, Alwar</p>
                <p>📞 Phone: +91-7737326829</p>
                <p style="margin-top: 8px; font-weight: 600;">Payment Receipt</p>
              </div>
              
              <div class="receipt-no">
                Receipt #: ${payment.receipt_number || payment.receiptNumber || 'N/A'}
              </div>
            </div>
            
            <!-- Member Details Section -->
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
                <span class="detail-value">${payment.processor?.full_name || payment.processor?.username || 'N/A'}</span>
              </div>
            </div>
            
            <!-- Total Amount Section (Highlighted) -->
            <div class="amount-section">
              <p>Total Amount Paid</p>
              <h2>₹${payment.amount ? payment.amount.toLocaleString('en-IN') : '0'}</h2>
            </div>
            
            <!-- Terms & Signature Section -->
            <div class="signature-section">
              <div class="terms-section">
                <strong>Terms & Conditions:</strong>
                <p>• Membership is non-transferable and valid only for the specified period.</p>
                <p>• All payments are non-refundable once processed.</p>
                <p>• Please bring this receipt for any queries or disputes.</p>
                <p>• Management reserves the right to revoke membership for misconduct.</p>
                <p>• Lost receipts will not be reissued.</p>
              </div>
              <div class="signature-box">
                <div class="signature-image"></div>
                <div class="signature-line">Authorized Signatory</div>
                <div class="signature-label">NS Fitness</div>
              </div>
            </div>
            
            <!-- Footer -->
            <div class="footer">
              <p>Thank you for your payment!</p>
              <p>This is a computer-generated receipt. For any queries, please contact gym administration.</p>
              <p>Generated: ${new Date().toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
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

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
            <div className="text-sm text-gray-700">
              Showing page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{totalPages}</span>
              {' '}({totalPayments} total payments)
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  currentPage === 1
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                ← Previous
              </button>
              
              {/* Page Numbers */}
              <div className="flex gap-1">
                {[...Array(totalPages)].map((_, index) => {
                  const pageNum = index + 1;
                  // Show first page, last page, current page, and pages around current
                  if (
                    pageNum === 1 ||
                    pageNum === totalPages ||
                    (pageNum >= currentPage - 1 && pageNum <= currentPage + 1)
                  ) {
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setCurrentPage(pageNum)}
                        className={`px-4 py-2 text-sm font-medium rounded-lg ${
                          currentPage === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  } else if (
                    pageNum === currentPage - 2 ||
                    pageNum === currentPage + 2
                  ) {
                    return <span key={pageNum} className="px-2 py-2 text-gray-500">...</span>;
                  }
                  return null;
                })}
              </div>

              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className={`px-4 py-2 text-sm font-medium rounded-lg ${
                  currentPage === totalPages
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                Next →
              </button>
            </div>
          </div>
        )}
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
