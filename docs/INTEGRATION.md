# 前後端整合文檔 (Frontend-Backend Integration)

> **版本**: v1.0
> **更新日期**: 2026-01-09

---

## 目錄

1. [概述](#1-概述)
2. [開發環境設置](#2-開發環境設置)
3. [API 客戶端配置](#3-api-客戶端配置)
4. [認證流程](#4-認證流程)
5. [狀態管理](#5-狀態管理)
6. [錯誤處理](#6-錯誤處理)
7. [型別共享](#7-型別共享)
8. [開發工作流](#8-開發工作流)

---

## 1. 概述

### 1.1 架構模式

```
┌─────────────────────────────────────┐
│  前端 (React SPA)                    │
│  - Cloudflare Pages                 │
│  - https://casecheck.pages.dev      │
└──────────────┬──────────────────────┘
               │ HTTPS + CORS
               ↓
┌─────────────────────────────────────┐
│  API Gateway / Reverse Proxy        │
│  - Nginx / Traefik                  │
│  - https://api.caseflow.com         │
└──────────────┬──────────────────────┘
               │
               ↓
┌─────────────────────────────────────┐
│  後端 API (FastAPI)                  │
│  - Python 3.11+                     │
│  - PostgreSQL                       │
│  - OPA (Policy Engine)              │
└─────────────────────────────────────┘
```

### 1.2 通訊協定

- **協定**: HTTPS
- **格式**: JSON
- **認證**: Bearer Token (JWT)
- **CORS**: 配置允許前端域名

---

## 2. 開發環境設置

### 2.1 前端環境變數

創建 `.env.development` 和 `.env.production`:

```bash
# .env.development
VITE_API_URL=http://localhost:5000/api/v1
VITE_WS_URL=ws://localhost:5000
VITE_ENV=development
```

```bash
# .env.production
VITE_API_URL=https://api.caseflow.com/v1
VITE_WS_URL=wss://api.caseflow.com
VITE_ENV=production
```

**在代碼中使用**:
```typescript
const API_URL = import.meta.env.VITE_API_URL;
```

---

### 2.2 後端環境變數

```bash
# backend/.env
DATABASE_URL=postgresql://user:pass@localhost:5432/caseflow
REDIS_URL=redis://localhost:6379/0
SECRET_KEY=your-secret-key-here
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=15
REFRESH_TOKEN_EXPIRE_DAYS=7

# CORS
CORS_ORIGINS=["http://localhost:3000", "https://casecheck.pages.dev"]

# OPA
OPA_URL=http://localhost:8181/v1/data/caseflow

# MinIO / S3
MINIO_ENDPOINT=localhost:9000
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=activity-files
```

---

### 2.3 啟動開發環境

**後端**:
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt

# 啟動資料庫遷移
alembic upgrade head

# 啟動開發伺服器
uvicorn app.main:app --reload --host 0.0.0.0 --port 5000
```

**前端**:
```bash
cd frontend
npm install
npm run dev  # http://localhost:3000
```

---

## 3. API 客戶端配置

### 3.1 Axios 客戶端

創建 `src/api/client.ts`:

```typescript
import axios, { AxiosError, AxiosRequestConfig, AxiosResponse } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api/v1';

// 創建 Axios 實例
export const apiClient = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request 攔截器 - 添加 Token
apiClient.interceptors.request.use(
  (config: AxiosRequestConfig) => {
    const token = localStorage.getItem('access_token');
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response 攔截器 - 處理錯誤
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    // 提取 data 欄位（統一回應格式）
    return response.data;
  },
  async (error: AxiosError) => {
    const originalRequest = error.config as AxiosRequestConfig & { _retry?: boolean };

    // Token 過期，自動刷新
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem('refresh_token');
        if (refreshToken) {
          const response = await axios.post(`${API_URL}/auth/refresh`, {
            refresh_token: refreshToken,
          });

          const { access_token, refresh_token: newRefreshToken } = response.data.data;

          // 更新 Token
          localStorage.setItem('access_token', access_token);
          localStorage.setItem('refresh_token', newRefreshToken);

          // 重試原始請求
          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${access_token}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshError) {
        // Refresh 失敗，清除 Token 並跳轉登入
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);
```

---

### 3.2 API 封裝

創建各資源的 API 封裝：

```typescript
// src/api/auth.api.ts

import { apiClient } from './client';
import { User } from '../types';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export const authApi = {
  // 登入
  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/login', data);
    return response.data;
  },

  // 登出
  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  // 獲取當前用戶
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // 刷新 Token
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await apiClient.post('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data;
  },
};
```

---

```typescript
// src/api/activity.api.ts

import { apiClient } from './client';
import { ActivityCase, CaseStatus } from '../types';

export interface ActivityListParams {
  status?: CaseStatus;
  page?: number;
  limit?: number;
  sort?: string;
}

export interface ActivityListResponse {
  items: ActivityCase[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

export interface CreateActivityRequest {
  title: string;
  description: string;
  location: string;
  start_time: string;
  end_time: string;
  member_ids?: string[];
}

export const activityApi = {
  // 獲取列表
  getList: async (params?: ActivityListParams): Promise<ActivityListResponse> => {
    const response = await apiClient.get('/activities', { params });
    return response.data;
  },

  // 獲取詳情
  getById: async (id: string): Promise<ActivityCase> => {
    const response = await apiClient.get(`/activities/${id}`);
    return response.data;
  },

  // 創建活動
  create: async (data: CreateActivityRequest): Promise<ActivityCase> => {
    const response = await apiClient.post('/activities', data);
    return response.data;
  },

  // 更新活動
  update: async (id: string, data: Partial<ActivityCase>): Promise<ActivityCase> => {
    const response = await apiClient.patch(`/activities/${id}`, data);
    return response.data;
  },

  // 刪除活動
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/activities/${id}`);
  },

  // 提交審批
  submit: async (id: string): Promise<ActivityCase> => {
    const response = await apiClient.post(`/activities/${id}/submit`);
    return response.data;
  },

  // 批准活動
  approve: async (id: string, comment?: string): Promise<ActivityCase> => {
    const response = await apiClient.post(`/activities/${id}/approve`, { comment });
    return response.data;
  },

  // 拒絕活動
  reject: async (id: string, reason: string): Promise<ActivityCase> => {
    const response = await apiClient.post(`/activities/${id}/reject`, { reason });
    return response.data;
  },
};
```

---

## 4. 認證流程

### 4.1 登入流程

```typescript
// context/AuthContext.tsx

import React, { createContext, useContext, useState, useEffect } from 'react';
import { authApi } from '../api/auth.api';
import { User, Role } from '../types';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 初始化：檢查 Token 並載入用戶資訊
  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userData = await authApi.getCurrentUser();
          setUser(userData);
        } catch (error) {
          // Token 無效，清除
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });

      // 儲存 Token
      localStorage.setItem('access_token', response.access_token);
      localStorage.setItem('refresh_token', response.refresh_token);

      // 設定用戶
      setUser(response.user);
    } catch (error) {
      console.error('Login failed:', error);
      throw error;
    }
  };

  const logout = () => {
    // 清除 Token
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');

    // 清除用戶
    setUser(null);

    // 調用後端登出（可選）
    authApi.logout().catch(() => {});
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
```

---

### 4.2 登入頁面範例

```typescript
// pages/Login.tsx

import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await login(email, password);
      // 登入成功，AuthContext 會自動更新
    } catch (err: any) {
      setError(err.response?.data?.error?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-page">
      <form onSubmit={handleSubmit}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
        />
        {error && <div className="error">{error}</div>}
        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Logging in...' : 'Login'}
        </button>
      </form>
    </div>
  );
};
```

---

### 4.3 Protected Route

```typescript
// components/ProtectedRoute.tsx

import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: Role;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requiredRole,
}) => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (requiredRole && user.role !== requiredRole) {
    return <Navigate to="/unauthorized" />;
  }

  return <>{children}</>;
};
```

---

## 5. 狀態管理

### 5.1 使用 React Query (推薦)

安裝:
```bash
npm install @tanstack/react-query
```

配置:
```typescript
// App.tsx

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 分鐘
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* Your App */}
      </AuthProvider>
    </QueryClientProvider>
  );
}
```

---

### 5.2 使用 React Query 進行資料獲取

```typescript
// hooks/useActivities.ts

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { activityApi, ActivityListParams } from '../api/activity.api';

// 獲取活動列表
export const useActivities = (params?: ActivityListParams) => {
  return useQuery({
    queryKey: ['activities', params],
    queryFn: () => activityApi.getList(params),
  });
};

// 獲取活動詳情
export const useActivity = (id: string) => {
  return useQuery({
    queryKey: ['activities', id],
    queryFn: () => activityApi.getById(id),
    enabled: !!id,
  });
};

// 創建活動
export const useCreateActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: activityApi.create,
    onSuccess: () => {
      // 使列表快取失效
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
};

// 更新活動
export const useUpdateActivity = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<ActivityCase> }) =>
      activityApi.update(id, data),
    onSuccess: (_, variables) => {
      // 使詳情快取失效
      queryClient.invalidateQueries({ queryKey: ['activities', variables.id] });
      queryClient.invalidateQueries({ queryKey: ['activities'] });
    },
  });
};
```

---

### 5.3 在組件中使用

```typescript
// pages/ActivityList.tsx

import React from 'react';
import { useActivities } from '../hooks/useActivities';

export const ActivityList: React.FC = () => {
  const { data, isLoading, error } = useActivities({ page: 1, limit: 20 });

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <h1>Activities</h1>
      {data?.items.map((activity) => (
        <div key={activity.id}>
          <h3>{activity.title}</h3>
          <p>{activity.status}</p>
        </div>
      ))}
    </div>
  );
};
```

---

## 6. 錯誤處理

### 6.1 統一錯誤處理

```typescript
// utils/errorHandler.ts

import { AxiosError } from 'axios';

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export const handleApiError = (error: unknown): ApiError => {
  if (error instanceof AxiosError) {
    const data = error.response?.data;

    if (data?.error) {
      return {
        code: data.error.code,
        message: data.error.message,
        details: data.error.details,
      };
    }

    // Fallback
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message || 'An unexpected error occurred',
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'An unexpected error occurred',
  };
};

export const getErrorMessage = (error: unknown): string => {
  const apiError = handleApiError(error);
  return apiError.message;
};
```

---

### 6.2 錯誤通知組件

```typescript
// components/ErrorBoundary.tsx

import React, { Component, ReactNode } from 'react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Error caught by boundary:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h1>Something went wrong</h1>
          <p>{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
```

---

### 6.3 Toast 通知

```typescript
// hooks/useToast.ts

import { useState } from 'react';

interface Toast {
  id: string;
  type: 'success' | 'error' | 'info';
  message: string;
}

export const useToast = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const showToast = (type: Toast['type'], message: string) => {
    const id = Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev, { id, type, message }]);

    // 3 秒後自動移除
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 3000);
  };

  return {
    toasts,
    success: (message: string) => showToast('success', message),
    error: (message: string) => showToast('error', message),
    info: (message: string) => showToast('info', message),
  };
};
```

---

## 7. 型別共享

### 7.1 前端型別定義

確保前端的 `types.ts` 與後端的 Pydantic Schema 一致。

```typescript
// types.ts

export enum Role {
  ADMIN = 'ADMIN',
  USER = 'USER',
  GUEST = 'GUEST'
}

export enum CaseStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ONGOING = 'ONGOING',
  CLOSED = 'CLOSED'
}

export interface User {
  id: string;
  email: string;
  name: string;
  role: Role;
  department: string;
  clearance_level: number;
  allowed_locations?: string[];
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface ActivityCase {
  id: string;
  parent_id?: string;
  title: string;
  description: string;
  status: CaseStatus;
  rejection_reason?: string;
  creator_id: string;
  location: string;
  start_time: string;
  end_time: string;
  risk_level?: 'LOW' | 'MEDIUM' | 'HIGH';
  created_at: string;
  updated_at: string;
}

// ... 其他型別
```

---

### 7.2 型別同步策略

**選項 1: 手動同步**
- 前端手動維護 TypeScript 型別
- 後端 Pydantic Schema 變更時需同步更新

**選項 2: 自動生成 (推薦)**
- 使用 FastAPI 的 OpenAPI Schema 生成 TypeScript 型別
- 工具: `openapi-typescript` 或 `swagger-typescript-api`

```bash
# 安裝工具
npm install -D openapi-typescript

# 生成型別
npx openapi-typescript http://localhost:5000/openapi.json -o src/types/api.ts
```

---

## 8. 開發工作流

### 8.1 本地開發流程

1. **啟動後端**
```bash
cd backend
source venv/bin/activate
uvicorn app.main:app --reload --port 5000
```

2. **啟動前端**
```bash
cd frontend
npm run dev
```

3. **訪問**
- 前端: http://localhost:3000
- 後端 API: http://localhost:5000
- API 文檔: http://localhost:5000/docs

---

### 8.2 CORS 配置

**後端 (FastAPI)**:
```python
# app/main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://casecheck.pages.dev"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

### 8.3 環境切換

**前端根據環境自動切換 API URL**:
```typescript
const API_URL =
  import.meta.env.MODE === 'production'
    ? 'https://api.caseflow.com/v1'
    : 'http://localhost:5000/api/v1';
```

---

### 8.4 部署檢查清單

- [ ] 前端環境變數設定正確 (`VITE_API_URL`)
- [ ] 後端 CORS 配置包含前端域名
- [ ] JWT Secret Key 使用強隨機字串
- [ ] 資料庫連線字串正確
- [ ] API 速率限制啟用
- [ ] HTTPS 啟用（生產環境）
- [ ] 錯誤追蹤工具配置（Sentry 等）

---

## 附錄

### A. 常見問題

**Q: CORS 錯誤如何解決？**
A: 確保後端 CORS 中間件配置包含前端域名，並且 `allow_credentials=True`。

**Q: Token 過期如何處理？**
A: Axios 攔截器會自動刷新 Token，見 3.1 節。

**Q: 如何處理並發請求？**
A: React Query 自動處理請求去重與快取。

### B. 參考資源

- [FastAPI CORS 文檔](https://fastapi.tiangolo.com/tutorial/cors/)
- [Axios 文檔](https://axios-http.com/)
- [React Query 文檔](https://tanstack.com/query/latest)

---

**文檔維護者**: CaseFlow 開發團隊
**最後更新**: 2026-01-09
