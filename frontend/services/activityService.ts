import apiClient from './apiClient';
import { ActivityCase, CaseStatus } from '../types';

interface SuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface PaginationMeta {
  page: number;
  per_page: number;
  total: number;
  total_pages: number;
  has_next: boolean;
  has_prev: boolean;
}

interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: PaginationMeta;
}

export interface ActivityType {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  requires_approval: boolean;
  default_risk_level: string;
}

export interface ActivityListParams {
  status?: CaseStatus;
  creator_id?: string;
  search?: string;
  page?: number;
  per_page?: number;
}

export interface ActivityCreateRequest {
  title: string;
  description: string;
  activity_type_id: string;
  start_date: string;
  end_date: string;
  location: string;
  venue_details?: string;
  max_participants: number;
  risk_level?: string;
}

export interface ActivityUpdateRequest {
  title?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  location?: string;
  venue_details?: string;
  max_participants?: number;
}

interface ApiActivity {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: CaseStatus;
  risk_level: string;
  risk_assessment?: string | null;
  current_participants: number;
  created_at: string;
  updated_at: string;
  approved_by_id?: string | null;
  approved_at?: string | null;
  rejected_by_id?: string | null;
  rejected_at?: string | null;
  rejection_reason?: string | null;
  creator_id: string;
  activity_type: ActivityType;
  activity_type_id: string;
  start_date: string;
  end_date: string;
  location: string;
  venue_details?: string | null;
  max_participants: number;
}

const mapActivity = (activity: ApiActivity): ActivityCase => ({
  id: activity.id,
  caseNumber: activity.case_number,
  title: activity.title,
  description: activity.description,
  status: activity.status,
  rejectionReason: activity.rejection_reason || undefined,
  creatorId: activity.creator_id,
  activityTypeId: activity.activity_type_id,
  createdAt: activity.created_at,
  startTime: activity.start_date,
  endTime: activity.end_date,
  location: activity.location,
  riskLevel: activity.risk_level as ActivityCase['riskLevel'],
  members: [],
});

export const activityService = {
  async list(params?: ActivityListParams): Promise<{ items: ActivityCase[]; pagination: PaginationMeta }> {
    const response = await apiClient.get<PaginatedResponse<ApiActivity>>('/activities', { params });
    return {
      items: response.data.data.map(mapActivity),
      pagination: response.data.pagination,
    };
  },

  async get(id: string): Promise<ActivityCase> {
    const response = await apiClient.get<SuccessResponse<ApiActivity>>(`/activities/${id}`);
    return mapActivity(response.data.data);
  },

  async create(data: ActivityCreateRequest): Promise<ActivityCase> {
    const response = await apiClient.post<SuccessResponse<ApiActivity>>('/activities', data);
    return mapActivity(response.data.data);
  },

  async update(id: string, data: ActivityUpdateRequest): Promise<ActivityCase> {
    const response = await apiClient.put<SuccessResponse<ApiActivity>>(`/activities/${id}`, data);
    return mapActivity(response.data.data);
  },

  async submit(id: string): Promise<ActivityCase> {
    const response = await apiClient.post<SuccessResponse<ApiActivity>>(`/activities/${id}/submit`);
    return mapActivity(response.data.data);
  },

  async listTypes(): Promise<ActivityType[]> {
    const response = await apiClient.get<SuccessResponse<ActivityType[]>>('/activities/types');
    return response.data.data;
  },
};
