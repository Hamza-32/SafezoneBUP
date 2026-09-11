// Browser-side API client.
//
// Authentication rides on the httpOnly `safezone-token` cookie that the login
// and register endpoints set. The token is deliberately NOT kept in
// localStorage: anything stored there is readable by injected script, so an
// XSS bug would hand over a working session. Because the cookie is sent
// automatically with same-origin requests, nothing here has to attach it.

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || '';

interface ApiResponse<T = any> {
  [key: string]: T;
}

interface LoginResponse {
  message: string;
  user: any;
  token: string;
  data?: { user: any; token: string };
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
}

/** Error carrying the HTTP status, so callers can tell 401 from 500. */
export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

class ApiClient {
  private baseURL: string;

  constructor() {
    this.baseURL = API_BASE_URL;
  }

  async request<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
    const url = `${this.baseURL}${endpoint}`;

    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      // Send the session cookie. This is the default for same-origin
      // requests, but stating it keeps the intent obvious.
      credentials: 'same-origin',
    });

    const payload = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new ApiError(
        payload.error || `Request failed with status ${response.status}`,
        response.status,
        payload.details
      );
    }

    return payload as T;
  }

  async get<T = any>(endpoint: string, params: Record<string, any> = {}): Promise<T> {
    const filtered = Object.entries(params).filter(
      ([, value]) => value !== undefined && value !== null && value !== ''
    );
    const query = new URLSearchParams(filtered as [string, string][]).toString();
    const url = query ? `${endpoint}?${query}` : endpoint;

    return this.request<T>(url, { method: 'GET' });
  }

  async post<T = any>(endpoint: string, data: any = {}): Promise<T> {
    return this.request<T>(endpoint, { method: 'POST', body: JSON.stringify(data) });
  }

  async put<T = any>(endpoint: string, data: any = {}): Promise<T> {
    return this.request<T>(endpoint, { method: 'PUT', body: JSON.stringify(data) });
  }

  async delete<T = any>(endpoint: string, data: any = {}): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE', body: JSON.stringify(data) });
  }

  // -------------------------------------------------------------------------
  // Authentication
  // -------------------------------------------------------------------------

  async login(email: string, password: string): Promise<LoginResponse> {
    // The response also sets the session cookie, which is what actually
    // authenticates subsequent requests.
    return this.post<LoginResponse>('/api/auth/login', { email, password });
  }

  async register(userData: any): Promise<LoginResponse> {
    return this.post<LoginResponse>('/api/auth/register', userData);
  }

  async logout(): Promise<void> {
    await this.post('/api/auth/logout');
  }

  async getCurrentUser(): Promise<ApiResponse> {
    return this.get('/api/auth/me');
  }

  async updateProfile(profileData: any): Promise<ApiResponse> {
    return this.put('/api/auth/profile', profileData);
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse> {
    return this.put('/api/auth/change-password', { currentPassword, newPassword });
  }

  // -------------------------------------------------------------------------
  // Emergency and complaints
  // -------------------------------------------------------------------------

  async createEmergencyReport(reportData: any): Promise<ApiResponse> {
    return this.post('/api/emergency/report', reportData);
  }

  async getEmergencyReports(params: Record<string, any> = {}): Promise<ApiResponse> {
    return this.get('/api/emergency/reports', params);
  }

  async getMyEmergencyReports(): Promise<ApiResponse> {
    return this.get('/api/emergency/my-reports');
  }

  async createComplaint(complaintData: any): Promise<ApiResponse> {
    return this.post('/api/complaint/report', complaintData);
  }

  async getComplaints(params: Record<string, any> = {}): Promise<ApiResponse> {
    return this.get('/api/complaint/reports', params);
  }

  // -------------------------------------------------------------------------
  // Safety features
  // -------------------------------------------------------------------------

  async getCheckins(): Promise<ApiResponse> {
    return this.get('/api/checkin');
  }

  async createCheckin(checkin: any): Promise<ApiResponse> {
    return this.post('/api/checkin', checkin);
  }

  async updateCheckin(id: number, status: string, sosTriggered = false): Promise<ApiResponse> {
    return this.put('/api/checkin', { id, status, sosTriggered });
  }

  async getEmergencyContacts(): Promise<ApiResponse> {
    return this.get('/api/contacts');
  }

  async getSafetyResources(params: Record<string, any> = {}): Promise<ApiResponse> {
    return this.get('/api/safety/resources', params);
  }

  async getDiscussionCategories(): Promise<ApiResponse> {
    return this.get('/api/discussion/categories');
  }

  async getDiscussionPosts(params: Record<string, any> = {}): Promise<ApiResponse> {
    return this.get('/api/discussion/posts', params);
  }

  async createDiscussionPost(post: any): Promise<ApiResponse> {
    return this.post('/api/discussion/posts', post);
  }

  async getLostAndFound(params: Record<string, any> = {}): Promise<ApiResponse> {
    return this.get('/api/lost-and-found', params);
  }

  async createLostAndFoundItem(item: any): Promise<ApiResponse> {
    return this.post('/api/lost-and-found', item);
  }

  async updateLostAndFoundItem(id: number, status: string): Promise<ApiResponse> {
    return this.put('/api/lost-and-found', { id, status });
  }

  async getBadges(userId?: number): Promise<ApiResponse> {
    return this.get('/api/badges', userId ? { userId } : {});
  }

  // -------------------------------------------------------------------------
  // Admin
  // -------------------------------------------------------------------------

  async getAdminDashboard(): Promise<ApiResponse> {
    return this.get('/api/admin/dashboard');
  }

  async getModerationQueue(params: Record<string, any> = {}): Promise<ApiResponse> {
    return this.get('/api/admin/moderation', params);
  }

  async healthCheck(): Promise<ApiResponse> {
    return this.get('/api/health');
  }
}

const apiClient = new ApiClient();

export default apiClient;
