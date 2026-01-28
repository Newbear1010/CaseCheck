import apiClient from './apiClient';
import { ActivityCase } from '../types';

interface SuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

interface ApiActivity {
  id: string;
  case_number: string;
  title: string;
  description: string;
  status: ActivityCase['status'];
  risk_level: string;
  rejection_reason?: string | null;
  creator_id: string;
  activity_type_id: string;
  created_at: string;
  start_date: string;
  end_date: string;
  location: string;
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

export const approvalService = {
  async approve(id: string, comment?: string): Promise<ActivityCase> {
    const response = await apiClient.post<SuccessResponse<ApiActivity>>(`/activities/${id}/approve`, { comment });
    return mapActivity(response.data.data);
  },

  async reject(id: string, reason: string): Promise<ActivityCase> {
    const response = await apiClient.post<SuccessResponse<ApiActivity>>(`/activities/${id}/reject`, { reason });
    return mapActivity(response.data.data);
  },
};
