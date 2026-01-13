// API Configuration - Empty base URL means same-origin requests to Next.js API routes
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

// Types
interface ApiResponse<T = any> {
  [key: string]: T;
}

interface LoginResponse {
  message: string;
  user: any;
  token: string;
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

// API Client class
class ApiClient {
  private baseURL: string;
  private token: string | null;
  
  constructor() {
    this.baseURL = API_BASE_URL;
    this.token = null;
    
    // Load token from localStorage if available
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('safezonebup-token');
    }
  }

  // Set authentication token
  setToken(token: string | null): void {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('safezonebup-token', token);
      } else {
        localStorage.removeItem('safezonebup-token');
      }
    }
  }

  // Get authentication headers
  getHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  // Generic request method
  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;
    
    const config: RequestInit = {
      headers: this.getHeaders(),
      ...options,
    };

    try {
      const response = await fetch(url, config);
      
      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  // GET request
  async get<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const query = new URLSearchParams(params).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;
    
    return this.request<T>(url, {
      method: 'GET',
    });
  }

  // POST request
  async post<T = any>(endpoint: string, data: any = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // PUT request
  async put<T = any>(endpoint: string, data: any = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  // DELETE request
  async delete<T = any>(endpoint: string, data: any = {}): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
      body: JSON.stringify(data),
    });
  }

  // Authentication methods
  async login(email: string, password: string): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>('/api/auth/login', {
      email,
      password,
    });

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async register(userData: any): Promise<LoginResponse> {
    const response = await this.post<LoginResponse>('/api/auth/register', userData);

    if (response.token) {
      this.setToken(response.token);
    }

    return response;
  }

  async logout(): Promise<void> {
    try {
      await this.post('/api/auth/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      this.setToken(null);
    }
  }

  async getCurrentUser(): Promise<ApiResponse> {
    return this.get('/api/auth/me');
  }

  async updateProfile(profileData: any): Promise<ApiResponse> {
    return this.put('/api/auth/profile', profileData);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return this.put('/api/auth/change-password', {
      currentPassword,
      newPassword,
    });
  }
  // Emergency methods
  async createEmergencyReport(reportData: any): Promise<ApiResponse> {
    return this.post('/api/emergency/report', reportData);
  }

  async getEmergencyReports(params: Record<string, any> = {}): Promise<ApiResponse> {
    return this.get('/api/emergency/reports', params);
  }

  async getMyEmergencyReports(): Promise<ApiResponse> {
    return this.get('/api/emergency/my-reports');
  }

  async getEmergencyReport(id: string | number): Promise<ApiResponse> {
    return this.get(`/api/emergency/reports/${id}`);
  }

  async updateEmergencyStatus(id: string | number, statusData: any): Promise<ApiResponse> {
    return this.put(`/api/emergency/reports/${id}/status`, statusData);
  }

  async getEmergencyStats(): Promise<ApiResponse> {
    return this.get('/api/emergency/stats');
  }

  // Complaint methods
  async createComplaint(complaintData: any): Promise<ApiResponse> {
    return this.post('/api/complaint/report', complaintData);
  }

  async getComplaints(params: Record<string, any> = {}): Promise<ApiResponse> {
    return this.get('/api/complaint/reports', params);
  }

  async getMyComplaints(): Promise<ApiResponse> {
    return this.get('/api/complaint/my-reports');
  }

  async getComplaint(id: string | number): Promise<ApiResponse> {
    return this.get(`/api/complaint/reports/${id}`);
  }

  async updateComplaintStatus(id: string | number, statusData: any): Promise<ApiResponse> {
    return this.put(`/api/complaint/reports/${id}/status`, statusData);
  }

  async getComplaintCategories(): Promise<ApiResponse> {
    return this.get('/api/complaint/categories');
  }

  async getComplaintStats(): Promise<ApiResponse> {
    return this.get('/api/complaint/stats');
  }

  // User methods
  async getNotifications(params: Record<string, any> = {}): Promise<ApiResponse> {
    return this.get('/api/user/notifications', params);
  }

  async markNotificationRead(id: string | number): Promise<ApiResponse> {
    return this.put(`/api/user/notifications/${id}/read`);
  }

  async markAllNotificationsRead(): Promise<ApiResponse> {
    return this.put('/api/user/notifications/read-all');
  }

  async getDashboardData(): Promise<ApiResponse> {
    return this.get('/api/user/dashboard');
  }

  async submitVerification(documents: any): Promise<ApiResponse> {
    return this.post('/api/user/verification', documents);
  }

  async getEmergencyContacts(): Promise<ApiResponse> {
    return this.get('/api/user/emergency-contacts');
  }

  async getUserActivity(params: Record<string, any> = {}): Promise<ApiResponse> {
    return this.get('/api/user/activity', params);
  }

  async deleteAccount(reason: string): Promise<ApiResponse> {
    return this.delete('/api/user/account', { reason });
  }

  // Admin methods
  async getAdminDashboard(): Promise<ApiResponse> {
    return this.get('/api/admin/dashboard');
  }

  async getUsers(params: Record<string, any> = {}): Promise<ApiResponse> {
    return this.get('/api/admin/users', params);
  }

  async getUser(id: string | number): Promise<ApiResponse> {
    return this.get(`/api/admin/users/${id}`);
  }

  async verifyUser(id: string | number, verified: boolean, notes?: string): Promise<ApiResponse> {
    return this.put(`/api/admin/users/${id}/verify`, { verified, notes });
  }

  async createAdmin(adminData: any): Promise<ApiResponse> {
    return this.post('/api/admin/users/admin', adminData);
  }

  async getSystemSettings(): Promise<ApiResponse> {
    return this.get('/api/admin/settings');
  }

  async updateSystemSetting(key: string, value: any): Promise<ApiResponse> {
    return this.put(`/api/admin/settings/${key}`, { value });
  }

  async getAuditLogs(params: Record<string, any> = {}): Promise<ApiResponse> {
    return this.get('/api/admin/audit-logs', params);
  }

  async getAdminEmergencyContacts(): Promise<ApiResponse> {
    return this.get('/api/admin/emergency-contacts');
  }

  async updateEmergencyContact(id: string | number, contactData: any): Promise<ApiResponse> {
    return this.put(`/api/admin/emergency-contacts/${id}`, contactData);
  }

  // Health check
  async healthCheck(): Promise<ApiResponse> {
    return this.get('/api/health');
  }
}

// Create and export a singleton instance
const apiClient = new ApiClient();

export default apiClient;
