import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

interface TokenStorage {
  accessToken: string | null;
  refreshToken: string | null;
}

class ApiClient {
  private client: AxiosInstance;
  private isRefreshing = false;
  private failedQueue: Array<{
    resolve: (token: string) => void;
    reject: (error: Error) => void;
  }> = [];

  constructor() {
    this.client = axios.create({
      baseURL: `${API_BASE_URL}/v1`,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private getTokens(): TokenStorage {
    return {
      accessToken: localStorage.getItem('access_token'),
      refreshToken: localStorage.getItem('refresh_token'),
    };
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    localStorage.setItem('access_token', accessToken);
    localStorage.setItem('refresh_token', refreshToken);
  }

  private clearTokens(): void {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const { accessToken } = this.getTokens();
        if (accessToken && config.headers) {
          config.headers.Authorization = `Bearer ${accessToken}`;
        }
        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        if (error.response?.status === 401 && !originalRequest._retry) {
          if (this.isRefreshing) {
            return new Promise((resolve, reject) => {
              this.failedQueue.push({ resolve, reject });
            })
              .then((token) => {
                if (originalRequest.headers) {
                  originalRequest.headers.Authorization = `Bearer ${token}`;
                }
                return this.client(originalRequest);
              })
              .catch((err) => Promise.reject(err));
          }

          originalRequest._retry = true;
          this.isRefreshing = true;

          const { refreshToken } = this.getTokens();
          if (!refreshToken) {
            this.clearTokens();
            window.location.href = '/';
            return Promise.reject(error);
          }

          try {
            const response = await this.client.post('/auth/refresh', {
              refresh_token: refreshToken,
            });

            const tokenData = response.data?.data;
            const accessToken = tokenData?.access_token;
            const newRefreshToken = tokenData?.refresh_token;

            if (!accessToken || !newRefreshToken) {
              throw new Error('Invalid refresh response');
            }

            this.setTokens(accessToken, newRefreshToken);

            this.failedQueue.forEach(({ resolve }) => resolve(accessToken));
            this.failedQueue = [];

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${accessToken}`;
            }

            return this.client(originalRequest);
          } catch (refreshError) {
            this.failedQueue.forEach(({ reject }) => reject(refreshError as Error));
            this.failedQueue = [];
            this.clearTokens();
            window.location.href = '/';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  get<T>(url: string, config?: object) {
    return this.client.get<T>(url, config);
  }

  post<T>(url: string, data?: object, config?: object) {
    return this.client.post<T>(url, data, config);
  }

  put<T>(url: string, data?: object, config?: object) {
    return this.client.put<T>(url, data, config);
  }

  delete<T>(url: string, config?: object) {
    return this.client.delete<T>(url, config);
  }

  setAuthTokens(accessToken: string, refreshToken: string): void {
    this.setTokens(accessToken, refreshToken);
  }

  clearAuthTokens(): void {
    this.clearTokens();
  }
}

export const apiClient = new ApiClient();
export default apiClient;
