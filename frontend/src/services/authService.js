// Auth Service for authentication management
import apiService from './api';

class AuthService {
  constructor() {
    this.token = localStorage.getItem('token');
    this.user = JSON.parse(localStorage.getItem('user') || 'null');
  }

  // Login user
  async login(credentials) {
    try {
      const response = await apiService.login(credentials);
      this.setAuthData(response.token, response.user);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Register user
  async register(userData) {
    try {
      const response = await apiService.register(userData);
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Logout user
  async logout() {
    try {
      await apiService.logout();
      this.clearAuthData();
    } catch (error) {
      // Even if logout fails on server, clear local data
      this.clearAuthData();
    }
  }

  // Set authentication data
  setAuthData(token, user) {
    this.token = token;
    this.user = user;
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
    apiService.setToken(token);
  }

  // Clear authentication data
  clearAuthData() {
    this.token = null;
    this.user = null;
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    apiService.removeToken();
  }

  // Check if user is authenticated
  isAuthenticated() {
    return !!this.token;
  }

  // Get current user
  getCurrentUser() {
    return this.user;
  }

  // Get user token
  getToken() {
    return this.token;
  }

  // Check if user is main admin
  isMainAdmin() {
    return this.user?.role === 'main_admin';
  }

  // Check if user is sub admin
  isSubAdmin() {
    return this.user?.role === 'sub_admin';
  }

  // Check if user has permission for action
  hasPermission(action) {
    if (!this.user) return false;
    
    const permissions = {
      main_admin: ['all'],
      sub_admin: ['members', 'payments', 'attendance', 'batches', 'reports']
    };

    const userPermissions = permissions[this.user.role] || [];
    return userPermissions.includes('all') || userPermissions.includes(action);
  }
}

export default new AuthService();

