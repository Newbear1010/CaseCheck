# Phase 1: Database & Authentication Foundation

> **Status**: Not Started
> **Priority**: Critical
> **Dependencies**: None

---

## Overview

Phase 1 establishes the foundation for the entire MVP:
- Database schema creation via Alembic migrations
- Seed data for roles, permissions, and test users
- JWT-based authentication system
- Frontend-backend API integration

---

## Task 1.1: Database Setup

### 1.1.1 Configure Environment

**File**: `backend/.env`

```bash
# Copy from example and configure
cp backend/.env.example backend/.env
```

**Required Configuration**:
```env
DATABASE_URL=postgresql+asyncpg://postgres:password@localhost:5432/casecheck
SECRET_KEY=<generate-secure-random-key>
```

**Status**: [ ] Not Started

---

### 1.1.2 Generate Initial Migration

**Command**:
```bash
cd backend
alembic revision --autogenerate -m "initial schema"
```

**Expected Output**:
- New file in `backend/alembic/versions/`
- Contains CREATE TABLE statements for all 12 models

**Tables to be created**:
1. `users`
2. `roles`
3. `permissions`
4. `user_roles`
5. `role_permissions`
6. `activity_types`
7. `activity_cases`
8. `attendance_records`
9. `qr_codes`
10. `approval_workflows`
11. `audit_logs`
12. `policy_rules`

**Status**: [ ] Not Started

---

### 1.1.3 Apply Migration

**Command**:
```bash
cd backend
alembic upgrade head
```

**Verification**:
```bash
# Connect to PostgreSQL and verify tables
psql -U postgres -d casecheck -c "\dt"
```

**Status**: [ ] Not Started

---

### 1.1.4 Create Seed Data Script

**File to Create**: `backend/app/db/seed.py`

```python
"""
Seed script for initial data.
Run with: python -m app.db.seed
"""

import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.core.database import AsyncSessionLocal
from app.core.security import get_password_hash
from app.models import User, Role, Permission, ActivityType

async def seed_roles(db: AsyncSession):
    """Create default roles"""
    roles = [
        Role(name="ADMIN", description="Administrator with full access", is_system_role=True),
        Role(name="USER", description="Regular user", is_system_role=True),
        Role(name="GUEST", description="Guest with limited access", is_system_role=True),
    ]
    # Check if roles exist, create if not
    ...

async def seed_permissions(db: AsyncSession):
    """Create default permissions"""
    permissions = [
        Permission(name="activity:create", resource="activity", action="create"),
        Permission(name="activity:read", resource="activity", action="read"),
        Permission(name="activity:update", resource="activity", action="update"),
        Permission(name="activity:delete", resource="activity", action="delete"),
        Permission(name="activity:approve", resource="activity", action="approve"),
        Permission(name="activity:reject", resource="activity", action="reject"),
        Permission(name="user:read", resource="user", action="read"),
        Permission(name="user:manage", resource="user", action="manage"),
        Permission(name="attendance:checkin", resource="attendance", action="checkin"),
        Permission(name="attendance:checkout", resource="attendance", action="checkout"),
    ]
    ...

async def seed_activity_types(db: AsyncSession):
    """Create default activity types"""
    types = [
        ActivityType(name="Training", description="Training sessions", requires_approval=True),
        ActivityType(name="Meeting", description="Team meetings", requires_approval=False),
        ActivityType(name="Workshop", description="Workshops", requires_approval=True),
        ActivityType(name="Event", description="Events", requires_approval=True),
    ]
    ...

async def seed_admin_user(db: AsyncSession):
    """Create default admin user"""
    admin = User(
        username="admin",
        email="admin@casecheck.local",
        hashed_password=get_password_hash("Admin123!"),
        full_name="System Administrator",
        is_active=True,
        is_verified=True,
    )
    # Assign ADMIN role
    ...

async def main():
    async with AsyncSessionLocal() as db:
        await seed_roles(db)
        await seed_permissions(db)
        await seed_activity_types(db)
        await seed_admin_user(db)
        await db.commit()
        print("Seed data created successfully!")

if __name__ == "__main__":
    asyncio.run(main())
```

**Status**: [ ] Not Started

---

## Task 1.2: Authentication Dependencies

### 1.2.1 Create API Dependencies Module

**File to Create**: `backend/app/api/deps.py`

```python
"""
API Dependencies for authentication and authorization.
"""

from typing import Annotated, Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.database import get_db
from app.core.security import decode_token
from app.models import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/v1/auth/login")


async def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Annotated[AsyncSession, Depends(get_db)]
) -> User:
    """
    Validate JWT token and return current user.

    Raises:
        HTTPException 401: If token is invalid or user not found
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    payload = decode_token(token)
    if payload is None:
        raise credentials_exception

    # Check token type
    if payload.get("type") != "access":
        raise credentials_exception

    user_id: str = payload.get("sub")
    if user_id is None:
        raise credentials_exception

    # Fetch user with roles
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if user is None:
        raise credentials_exception

    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)]
) -> User:
    """
    Verify the current user is active.

    Raises:
        HTTPException 403: If user is inactive
    """
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Inactive user"
        )
    return current_user


def require_roles(allowed_roles: list[str]):
    """
    Dependency factory for role-based access control.

    Usage:
        @router.get("/admin-only")
        async def admin_endpoint(
            user: User = Depends(require_roles(["ADMIN"]))
        ):
            ...
    """
    async def role_checker(
        current_user: Annotated[User, Depends(get_current_active_user)]
    ) -> User:
        user_roles = [role.name for role in current_user.roles]
        if not any(role in allowed_roles for role in user_roles):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required roles: {allowed_roles}"
            )
        return current_user
    return role_checker


# Type aliases for cleaner endpoint signatures
CurrentUser = Annotated[User, Depends(get_current_user)]
ActiveUser = Annotated[User, Depends(get_current_active_user)]
AdminUser = Annotated[User, Depends(require_roles(["ADMIN"]))]
DbSession = Annotated[AsyncSession, Depends(get_db)]
```

**Status**: [ ] Not Started

---

## Task 1.3: Auth Endpoint Implementation

### 1.3.1 Implement Login Endpoint

**File**: `backend/app/api/v1/endpoints/auth.py`

**Endpoint**: `POST /v1/auth/login`

**Logic**:
1. Accept username/email and password (JSON)
2. Query user from database
3. Verify password using `verify_password()`
4. Generate access and refresh tokens
5. Return tokens in `SuccessResponseTokenResponse`

```python
@router.post("/login", response_model=SuccessResponseTokenResponse)
async def login(
    login_data: UserLogin,
    db: DbSession
) -> SuccessResponseTokenResponse:
    """Authenticate user and return JWT tokens."""
    # Query user by username or email
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(
            (User.username == login_data.username) |
            (User.email == login_data.username)
        )
    )
    user = result.scalar_one_or_none()

    if not user or not verify_password(login_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is disabled"
        )

    # Generate tokens (include primary role for OPA/PEP)
    primary_role = user.roles[0].name if user.roles else "USER"
    access_token = create_access_token(data={"sub": str(user.id), "role": primary_role})
    refresh_token = create_refresh_token(data={"sub": str(user.id), "role": primary_role})

    # Update last login
    user.last_login_at = datetime.utcnow()

    return SuccessResponseTokenResponse(
        success=True,
        data=TokenResponse(
            access_token=access_token,
            refresh_token=refresh_token,
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
        message="Login successful",
    )
```

**Status**: [ ] Not Started

---

### 1.3.2 Implement Register Endpoint

**Endpoint**: `POST /v1/auth/register`

**Logic**:
1. Validate input (username, email, password, full_name)
2. Check for existing user
3. Hash password
4. Create user with USER role
5. Return created user

```python
@router.post("/register", response_model=SuccessResponseUserResponse, status_code=201)
async def register(
    user_data: UserCreate,
    db: DbSession
) -> SuccessResponseUserResponse:
    """Register a new user."""
    # Check existing username
    existing = await db.execute(
        select(User).where(User.username == user_data.username)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Check existing email
    existing = await db.execute(
        select(User).where(User.email == user_data.email)
    )
    if existing.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    user = User(
        username=user_data.username,
        email=user_data.email,
        hashed_password=get_password_hash(user_data.password),
        full_name=user_data.full_name,
        is_active=True,
    )

    # Assign USER role
    user_role = await db.execute(select(Role).where(Role.name == "USER"))
    role = user_role.scalar_one()
    user.roles.append(role)

    db.add(user)
    await db.flush()
    await db.refresh(user)

    return SuccessResponseUserResponse(
        success=True,
        data=UserResponse.from_orm(user),
        message="User created",
    )
```

**Status**: [ ] Not Started

---

### 1.3.3 Implement Refresh Endpoint

**Endpoint**: `POST /v1/auth/refresh`

**Logic**:
1. Accept refresh token
2. Validate token type is "refresh"
3. Generate new access token
4. Return new access token

```python
@router.post("/refresh", response_model=SuccessResponseTokenResponse)
async def refresh_token(
    refresh_token: str = Body(..., embed=True),
    db: DbSession
) -> SuccessResponseTokenResponse:
    """Refresh access token using refresh token."""
    payload = decode_token(refresh_token)

    if not payload or payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token"
        )

    user_id = payload.get("sub")
    result = await db.execute(
        select(User).options(selectinload(User.roles)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive"
        )

    primary_role = user.roles[0].name if user.roles else "USER"
    new_access_token = create_access_token(data={"sub": str(user.id), "role": primary_role})

    return SuccessResponseTokenResponse(
        success=True,
        data=TokenResponse(
            access_token=new_access_token,
            refresh_token=refresh_token,  # Return same refresh token
            token_type="bearer",
            expires_in=ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        ),
        message="Token refreshed",
    )
```

**Status**: [ ] Not Started

---

### 1.3.4 Implement Logout Endpoint

**Endpoint**: `POST /v1/auth/logout`

**Logic**:
- For stateless JWT, just return success
- Client is responsible for clearing tokens

```python
@router.post("/logout", response_model=SuccessResponseMessage)
async def logout(
    current_user: ActiveUser
) -> SuccessResponseMessage:
    """Logout current user (client should clear tokens)."""
    return SuccessResponseMessage(
        success=True,
        message="Successfully logged out"
    )
```

**Status**: [ ] Not Started

---

## Task 1.4: User Endpoint Implementation

### 1.4.1 Implement Get Current User

**File**: `backend/app/api/v1/endpoints/users.py`

**Endpoint**: `GET /v1/users/me`

```python
@router.get("/me", response_model=SuccessResponseUserResponse)
async def get_current_user_profile(
    current_user: ActiveUser
) -> SuccessResponseUserResponse:
    """Get current user profile."""
    return SuccessResponseUserResponse(
        success=True,
        data=UserResponse.from_orm(current_user),
    )
```

**Status**: [ ] Not Started

---

### 1.4.2 Implement Update Current User

**Endpoint**: `PUT /v1/users/me`

```python
@router.put("/me", response_model=SuccessResponseUserResponse)
async def update_current_user_profile(
    user_update: UserUpdate,
    current_user: ActiveUser,
    db: DbSession
) -> SuccessResponseUserResponse:
    """Update current user profile."""
    if user_update.full_name is not None:
        current_user.full_name = user_update.full_name
    if user_update.department is not None:
        current_user.department = user_update.department
    if user_update.profile_image_url is not None:
        current_user.profile_image_url = user_update.profile_image_url

    await db.flush()
    await db.refresh(current_user)

    return SuccessResponseUserResponse(
        success=True,
        data=UserResponse.from_orm(current_user),
        message="Profile updated",
    )
```

**Status**: [ ] Not Started

---

### 1.4.3 Implement List Users (Admin)

**Endpoint**: `GET /v1/users`

```python
@router.get("", response_model=PaginatedResponseUserResponse)
async def list_users(
    current_user: AdminUser,
    db: DbSession,
    page: int = Query(1, ge=1),
    per_page: int = Query(20, ge=1, le=100),
    search: Optional[str] = None,
    role: Optional[str] = None,
) -> PaginatedResponse[UserResponse]:
    """List all users (admin only)."""
    query = select(User).options(selectinload(User.roles))

    if search:
        query = query.where(
            (User.username.ilike(f"%{search}%")) |
            (User.email.ilike(f"%{search}%")) |
            (User.full_name.ilike(f"%{search}%"))
        )
    if role:
        query = query.join(User.roles).where(Role.name == role)

    # Count total
    count_query = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_query)).scalar()

    # Paginate
    query = query.offset((page - 1) * per_page).limit(per_page)
    result = await db.execute(query)
    users = result.scalars().all()

    return PaginatedResponseUserResponse(
        items=[UserResponse.from_orm(u) for u in users],
        meta=PaginationMeta(
            page=page,
            per_page=per_page,
            total=total,
            total_pages=(total + per_page - 1) // per_page,
        ),
    )
```

**Status**: [ ] Not Started

---

### 1.4.4 Implement Get User by ID (Admin)

**Endpoint**: `GET /v1/users/{user_id}`

```python
@router.get("/{user_id}", response_model=SuccessResponseUserResponse)
async def get_user(
    user_id: str,
    current_user: AdminUser,
    db: DbSession
) -> SuccessResponseUserResponse:
    """Get user by ID (admin only)."""
    result = await db.execute(
        select(User)
        .options(selectinload(User.roles))
        .where(User.id == user_id)
    )
    user = result.scalar_one_or_none()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )

    return SuccessResponseUserResponse(
        success=True,
        data=UserResponse.from_orm(user),
    )
```

**Status**: [ ] Not Started

---

## Task 1.5: Frontend API Integration

### 1.5.1 Create API Client

**File to Create**: `frontend/services/apiClient.ts`

```typescript
import axios, { AxiosInstance, AxiosError, InternalAxiosRequestConfig } from 'axios';

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
    // Request interceptor - add auth header
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

    // Response interceptor - handle 401 and refresh token
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
            window.location.href = '/login';
            return Promise.reject(error);
          }

          try {
            const response = await this.client.post('/auth/refresh', {
              refresh_token: refreshToken,
            });

            const { access_token, refresh_token } = response.data;
            this.setTokens(access_token, refresh_token);

            this.failedQueue.forEach(({ resolve }) => resolve(access_token));
            this.failedQueue = [];

            if (originalRequest.headers) {
              originalRequest.headers.Authorization = `Bearer ${access_token}`;
            }

            return this.client(originalRequest);
          } catch (refreshError) {
            this.failedQueue.forEach(({ reject }) => reject(refreshError as Error));
            this.failedQueue = [];
            this.clearTokens();
            window.location.href = '/login';
            return Promise.reject(refreshError);
          } finally {
            this.isRefreshing = false;
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // HTTP methods
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

  // Token management
  setAuthTokens(accessToken: string, refreshToken: string): void {
    this.setTokens(accessToken, refreshToken);
  }

  clearAuthTokens(): void {
    this.clearTokens();
  }
}

export const apiClient = new ApiClient();
export default apiClient;
```

**Status**: [ ] Not Started

---

### 1.5.2 Create Auth Service

**File to Create**: `frontend/services/authService.ts`

```typescript
import apiClient from './apiClient';
import { User } from '../types';

export interface LoginRequest {
  username: string;
  password: string;
}

export interface RegisterRequest {
  username: string;
  email: string;
  password: string;
  full_name: string;
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

  async register(data: RegisterRequest): Promise<User> {
    const response = await apiClient.post<SuccessResponse<User>>('/auth/register', data);
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

  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<SuccessResponse<User>>('/users/me');
    return response.data.data;
  },

  isAuthenticated(): boolean {
    return !!localStorage.getItem('access_token');
  },
};

export default authService;
```

**Status**: [ ] Not Started

---

### 1.5.3 Update AuthContext

**File to Modify**: `frontend/context/AuthContext.tsx`

**Changes**:
1. Replace mock users with real API calls
2. Add loading states
3. Handle token refresh
4. Persist user across page reloads

```typescript
// Key changes to implement:

// 1. Replace mock login
const login = async (username: string, password: string) => {
  setLoading(true);
  try {
    await authService.login({ username, password });
    const user = await authService.getCurrentUser();
    setUser(user);
    return { success: true };
  } catch (error) {
    return { success: false, error: 'Invalid credentials' };
  } finally {
    setLoading(false);
  }
};

// 2. Add useEffect to check auth on mount
useEffect(() => {
  const checkAuth = async () => {
    if (authService.isAuthenticated()) {
      try {
        const user = await authService.getCurrentUser();
        setUser(user);
      } catch {
        authService.logout();
      }
    }
    setLoading(false);
  };
  checkAuth();
}, []);

// 3. Replace mock logout
const logout = async () => {
  await authService.logout();
  setUser(null);
};
```

**Status**: [ ] Not Started

---

## Verification Checklist

### Database Setup
- [ ] PostgreSQL running and accessible
- [ ] Database `casecheck` created
- [ ] `.env` file configured
- [ ] Migration generated successfully
- [ ] Migration applied successfully
- [ ] All 12 tables exist in database
- [ ] Seed data script runs without errors
- [ ] Default admin user created

### Authentication Endpoints
- [ ] `POST /v1/auth/register` creates new user
- [ ] `POST /v1/auth/login` returns tokens for valid credentials
- [ ] `POST /v1/auth/login` returns 401 for invalid credentials
- [ ] `POST /v1/auth/refresh` returns new access token
- [ ] `POST /v1/auth/logout` returns success

### User Endpoints
- [ ] `GET /v1/users/me` returns current user
- [ ] `PUT /v1/users/me` updates user profile
- [ ] `GET /v1/users` returns user list (admin only)
- [ ] `GET /v1/users` returns 403 for non-admin
- [ ] `GET /v1/users/{id}` returns specific user (admin only)

### Frontend Integration
- [ ] API client created with JWT interceptor
- [ ] Login form connects to backend
- [ ] Registration form connects to backend
- [ ] Token stored in localStorage
- [ ] Token refresh works on 401
- [ ] User persisted after page reload
- [ ] Logout clears tokens and redirects

---

## Commands Reference

```bash
# Backend setup
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Database migration
alembic revision --autogenerate -m "initial schema"
alembic upgrade head

# Run seed
python -m app.db.seed

# Start backend
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Frontend setup
cd frontend
npm install

# Start frontend
npm run dev
```

---

## Completion Criteria

Phase 1 is complete when:

1. All database tables exist
2. Seed data is loaded (roles, permissions, admin user)
3. All auth endpoints return correct responses
4. All user endpoints return correct responses
5. Frontend can register new users
6. Frontend can login and receive tokens
7. Protected pages require authentication
8. Token refresh works automatically
