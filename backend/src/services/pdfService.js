const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class PDFService {
  constructor() {
    this.fontsPath = path.join(__dirname, '../../fonts');
    this.ensureFontsDirectory();
  }

  ensureFontsDirectory() {
    if (!fs.existsSync(this.fontsPath)) {
      fs.mkdirSync(this.fontsPath, { recursive: true });
    }
  }

  // Generate payment receipt
  async generatePaymentReceipt(paymentData, memberData, gymData) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header
        doc.fontSize(20).text(gymData.name || 'NS Fitness', { align: 'center' });
        doc.fontSize(12).text(gymData.address || 'Gym Address', { align: 'center' });
        doc.fontSize(10).text(`Phone: ${gymData.phone || '+91-XXXXXXXXXX'}`, { align: 'center' });
        doc.fontSize(10).text(`Email: ${gymData.email || 'info@nsfitness.com'}`, { align: 'center' });
        
        doc.moveDown(2);
        
        // Title
        doc.fontSize(16).text('PAYMENT RECEIPT', { align: 'center' });
        doc.moveDown(1);
        
        // Receipt details
        const receiptDate = new Date().toLocaleDateString();
        const receiptTime = new Date().toLocaleTimeString();
        
        doc.fontSize(10);
        doc.text(`Receipt No: ${paymentData.receipt_number}`, 50, doc.y);
        doc.text(`Date: ${receiptDate}`, 50, doc.y + 15);
        doc.text(`Time: ${receiptTime}`, 50, doc.y + 30);
        
        doc.moveDown(2);
        
        // Member details
        doc.fontSize(12).text('Member Details:', { underline: true });
        doc.fontSize(10);
        doc.text(`Name: ${memberData.name}`, 50, doc.y + 10);
        doc.text(`Phone: ${memberData.phone}`, 50, doc.y + 25);
        doc.text(`Email: ${memberData.email || 'N/A'}`, 50, doc.y + 40);
        doc.text(`Batch: ${memberData.batch?.name || 'N/A'}`, 50, doc.y + 55);
        
        doc.moveDown(2);
        
        // Payment details
        doc.fontSize(12).text('Payment Details:', { underline: true });
        doc.fontSize(10);
        doc.text(`Amount: ₹${paymentData.amount}`, 50, doc.y + 10);
        doc.text(`Duration: ${paymentData.duration} months`, 50, doc.y + 25);
        doc.text(`Payment Method: ${paymentData.payment_method}`, 50, doc.y + 40);
        doc.text(`Start Date: ${new Date(paymentData.start_date).toLocaleDateString()}`, 50, doc.y + 55);
        doc.text(`End Date: ${new Date(paymentData.end_date).toLocaleDateString()}`, 50, doc.y + 70);
        
        doc.moveDown(2);
        
        // Total
        doc.fontSize(12).text(`Total Amount: ₹${paymentData.amount}`, { align: 'right' });
        
        doc.moveDown(3);
        
        // Footer
        doc.fontSize(8).text('Thank you for choosing NS Fitness!', { align: 'center' });
        doc.text('This is a computer generated receipt.', { align: 'center' });
        
        // Signature area
        doc.moveDown(2);
        doc.text('Authorized Signature: _________________', 50, doc.y);
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate member report
  async generateMemberReport(members, filters = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header
        doc.fontSize(20).text('NS Fitness - Member Report', { align: 'center' });
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
        
        if (filters.start_date && filters.end_date) {
          doc.fontSize(10).text(`Period: ${filters.start_date} to ${filters.end_date}`, { align: 'center' });
        }
        
        doc.moveDown(2);
        
        // Summary
        doc.fontSize(12).text('Summary:', { underline: true });
        doc.fontSize(10);
        doc.text(`Total Members: ${members.length}`, 50, doc.y + 10);
        
        const activeMembers = members.filter(m => m.membership_status === 'active').length;
        const expiredMembers = members.filter(m => m.membership_status === 'expired').length;
        
        doc.text(`Active Members: ${activeMembers}`, 50, doc.y + 25);
        doc.text(`Expired Members: ${expiredMembers}`, 50, doc.y + 40);
        
        doc.moveDown(2);
        
        // Member table
        doc.fontSize(12).text('Member Details:', { underline: true });
        doc.moveDown(0.5);
        
        // Table headers
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 150;
        const col3 = 250;
        const col4 = 350;
        const col5 = 450;
        
        doc.fontSize(8);
        doc.text('Name', col1, tableTop);
        doc.text('Phone', col2, tableTop);
        doc.text('Batch', col3, tableTop);
        doc.text('Status', col4, tableTop);
        doc.text('End Date', col5, tableTop);
        
        // Draw line under headers
        doc.moveTo(col1, tableTop + 15).lineTo(col5 + 100, tableTop + 15).stroke();
        
        let currentY = tableTop + 20;
        
        // Member rows
        members.forEach((member, index) => {
          if (currentY > 700) { // New page if needed
            doc.addPage();
            currentY = 50;
          }
          
          doc.text(member.name || 'N/A', col1, currentY);
          doc.text(member.phone || 'N/A', col2, currentY);
          doc.text(member.batch?.name || 'N/A', col3, currentY);
          doc.text(member.membership_status || 'N/A', col4, currentY);
          doc.text(member.end_date ? new Date(member.end_date).toLocaleDateString() : 'N/A', col5, currentY);
          
          currentY += 15;
        });
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate attendance report
  async generateAttendanceReport(attendanceData, filters = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header
        doc.fontSize(20).text('NS Fitness - Attendance Report', { align: 'center' });
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
        
        if (filters.start_date && filters.end_date) {
          doc.fontSize(10).text(`Period: ${filters.start_date} to ${filters.end_date}`, { align: 'center' });
        }
        
        doc.moveDown(2);
        
        // Summary
        doc.fontSize(12).text('Summary:', { underline: true });
        doc.fontSize(10);
        doc.text(`Total Records: ${attendanceData.length}`, 50, doc.y + 10);
        
        const presentCount = attendanceData.filter(a => a.status === 'present').length;
        const absentCount = attendanceData.filter(a => a.status === 'absent').length;
        
        doc.text(`Present: ${presentCount}`, 50, doc.y + 25);
        doc.text(`Absent: ${absentCount}`, 50, doc.y + 40);
        
        doc.moveDown(2);
        
        // Attendance table
        doc.fontSize(12).text('Attendance Details:', { underline: true });
        doc.moveDown(0.5);
        
        // Table headers
        const tableTop = doc.y;
        const col1 = 50;
        const col2 = 150;
        const col3 = 250;
        const col4 = 350;
        const col5 = 450;
        
        doc.fontSize(8);
        doc.text('Date', col1, tableTop);
        doc.text('Member', col2, tableTop);
        doc.text('Batch', col3, tableTop);
        doc.text('Status', col4, tableTop);
        doc.text('Time', col5, tableTop);
        
        // Draw line under headers
        doc.moveTo(col1, tableTop + 15).lineTo(col5 + 100, tableTop + 15).stroke();
        
        let currentY = tableTop + 20;
        
        // Attendance rows
        attendanceData.forEach((attendance, index) => {
          if (currentY > 700) { // New page if needed
            doc.addPage();
            currentY = 50;
          }
          
          doc.text(attendance.date ? new Date(attendance.date).toLocaleDateString() : 'N/A', col1, currentY);
          doc.text(attendance.member?.name || 'N/A', col2, currentY);
          doc.text(attendance.batch?.name || 'N/A', col3, currentY);
          doc.text(attendance.status || 'N/A', col4, currentY);
          doc.text(attendance.check_in_time ? new Date(attendance.check_in_time).toLocaleTimeString() : 'N/A', col5, currentY);
          
          currentY += 15;
        });
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  // Generate financial report
  async generateFinancialReport(paymentData, expenseData, filters = {}) {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const buffers = [];
        
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
          const pdfData = Buffer.concat(buffers);
          resolve(pdfData);
        });

        // Header
        doc.fontSize(20).text('NS Fitness - Financial Report', { align: 'center' });
        doc.fontSize(12).text(`Generated on: ${new Date().toLocaleDateString()}`, { align: 'center' });
        
        if (filters.start_date && filters.end_date) {
          doc.fontSize(10).text(`Period: ${filters.start_date} to ${filters.end_date}`, { align: 'center' });
        }
        
        doc.moveDown(2);
        
        // Financial summary
        doc.fontSize(12).text('Financial Summary:', { underline: true });
        doc.fontSize(10);
        
        const totalRevenue = paymentData.reduce((sum, payment) => sum + parseFloat(payment.amount), 0);
        const totalExpenses = expenseData.reduce((sum, expense) => sum + parseFloat(expense.amount), 0);
        const netProfit = totalRevenue - totalExpenses;
        
        doc.text(`Total Revenue: ₹${totalRevenue.toFixed(2)}`, 50, doc.y + 10);
        doc.text(`Total Expenses: ₹${totalExpenses.toFixed(2)}`, 50, doc.y + 25);
        doc.text(`Net Profit: ₹${netProfit.toFixed(2)}`, 50, doc.y + 40);
        
        doc.moveDown(2);
        
        // Revenue breakdown
        doc.fontSize(12).text('Revenue by Payment Method:', { underline: true });
        doc.moveDown(0.5);
        
        const revenueByMethod = {};
        paymentData.forEach(payment => {
          const method = payment.payment_method || 'Unknown';
          revenueByMethod[method] = (revenueByMethod[method] || 0) + parseFloat(payment.amount);
        });
        
        Object.entries(revenueByMethod).forEach(([method, amount]) => {
          doc.text(`${method}: ₹${amount.toFixed(2)}`, 50, doc.y + 10);
        });
        
        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }
}

module.exports = new PDFService();

