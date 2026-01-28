import apiClient from './apiClient';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
  phone?: string;
  department?: string;
}

export interface SuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
}

export interface ApiRole {
  id: string;
  name: string;
  description?: string;
  is_system: boolean;
}

export interface ApiUser {
  id: string;
  username: string;
  email: string;
  full_name: string;
  phone?: string | null;
  department?: string | null;
  is_active: boolean;
  is_verified: boolean;
  last_login_at?: string | null;
  profile_image_url?: string | null;
  created_at: string;
  updated_at: string;
  roles: ApiRole[];
}

export const authService = {
  async login(credentials: LoginRequest): Promise<TokenResponse> {
    const response = await apiClient.post<SuccessResponse<TokenResponse>>(
      '/auth/login',
      credentials
    );

    const { access_token, refresh_token } = response.data.data;
    apiClient.setAuthTokens(access_token, refresh_token);

    return response.data.data;
  },

  async register(data: RegisterRequest): Promise<ApiUser> {
    const response = await apiClient.post<SuccessResponse<ApiUser>>('/auth/register', data);
    return response.data.data;
  },

  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await apiClient.post<SuccessResponse<TokenResponse>>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data.data;
  },

  async logout(): Promise<void> {
    try {
      await apiClient.post('/auth/logout');
    } finally {
      apiClient.clearAuthTokens();
    }
  },

  async getCurrentUser(): Promise<ApiUser> {
    const response = await apiClient.get<SuccessResponse<ApiUser>>('/users/me');
    return response.data.data;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },
};

export default authService;
