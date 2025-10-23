// API Service for backend communication
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

class ApiService {
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = localStorage.getItem('token');
  }

  // Set authentication token
  setToken(token) {
    this.token = token;
    localStorage.setItem('token', token);
  }

  // Remove authentication token
  removeToken() {
    this.token = null;
    localStorage.removeItem('token');
  }

  // Generic request method
  async request(endpoint, options = {}) {
    const url = `${this.baseURL}${endpoint}`;
    const config = {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    };

    if (this.token) {
      config.headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Something went wrong');
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  // GET request
  async get(endpoint) {
    return this.request(endpoint, { method: 'GET' });
  }

  // POST request
  async post(endpoint, data) {
    return this.request(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put(endpoint, data) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  // Auth endpoints
  async login(credentials) {
    return this.post('/auth/login', credentials);
  }

  async register(userData) {
    return this.post('/auth/register', userData);
  }

  async logout() {
    this.removeToken();
    return this.post('/auth/logout');
  }

  // Member endpoints
  async getMembers() {
    return this.get('/members');
  }

  async getMember(id) {
    return this.get(`/members/${id}`);
  }

  async createMember(memberData) {
    return this.post('/members', memberData);
  }

  async updateMember(id, memberData) {
    return this.put(`/members/${id}`, memberData);
  }

  async deleteMember(id) {
    return this.delete(`/members/${id}`);
  }

  // Payment endpoints
  async getPayments() {
    return this.get('/payments');
  }

  async getPayment(id) {
    return this.get(`/payments/${id}`);
  }

  async createPayment(paymentData) {
    return this.post('/payments', paymentData);
  }

  async updatePayment(id, paymentData) {
    return this.put(`/payments/${id}`, paymentData);
  }

  async deletePayment(id) {
    return this.delete(`/payments/${id}`);
  }

  // Batch endpoints
  async getBatches() {
    return this.get('/batches');
  }

  async createBatch(batchData) {
    return this.post('/batches', batchData);
  }

  async updateBatch(id, batchData) {
    return this.put(`/batches/${id}`, batchData);
  }

  async deleteBatch(id) {
    return this.delete(`/batches/${id}`);
  }

  // Attendance endpoints
  async getAttendance(date) {
    return this.get(`/attendance?date=${date}`);
  }

  async markAttendance(attendanceData) {
    return this.post('/attendance', attendanceData);
  }

  async updateAttendance(id, attendanceData) {
    return this.put(`/attendance/${id}`, attendanceData);
  }

  // Reports endpoints
  async getReports(type, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    return this.get(`/reports/${type}?${queryString}`);
  }

  // Analytics endpoints
  async getAnalytics() {
    return this.get('/analytics');
  }

  // WhatsApp endpoints
  async sendWhatsAppMessage(phone, message) {
    return this.post('/whatsapp/send', { phone, message });
  }
}

export default new ApiService();

