import apiClient from './apiClient';

interface SuccessResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface AttendanceRecord {
  id: string;
  activity_id: string;
  user_id: string;
  status: string;
  registered_at: string;
  checked_in_at?: string | null;
  checked_out_at?: string | null;
  qr_code_used?: string | null;
  check_in_method?: string | null;
  check_in_gate_id?: string | null;
  location_verified: boolean;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AttendanceStats {
  activity_id: string;
  total_registered: number;
  checked_in: number;
  checked_out: number;
  absent: number;
  attendance_rate: number;
}

export interface QRCodeResponse {
  id: string;
  activity_id: string;
  code: string;
  gate_id?: string | null;
  valid_from: string;
  valid_until: string;
  is_active: boolean;
  max_uses?: number | null;
  current_uses: number;
  code_type: string;
  generated_by_id: string;
  created_at: string;
}

export const attendanceService = {
  async register(activityId: string, notes?: string): Promise<AttendanceRecord> {
    const response = await apiClient.post<SuccessResponse<AttendanceRecord>>('/attendance/register', {
      activity_id: activityId,
      notes,
    });
    return response.data.data;
  },

  async checkIn(qrCode: string, notes?: string): Promise<AttendanceRecord> {
    const response = await apiClient.post<SuccessResponse<AttendanceRecord>>('/attendance/check-in', {
      qr_code: qrCode,
      notes,
    });
    return response.data.data;
  },

  async checkOut(qrCode: string, notes?: string): Promise<AttendanceRecord> {
    const response = await apiClient.post<SuccessResponse<AttendanceRecord>>('/attendance/check-out', {
      qr_code: qrCode,
      notes,
    });
    return response.data.data;
  },

  async getRecords(activityId: string): Promise<AttendanceRecord[]> {
    const response = await apiClient.get<SuccessResponse<AttendanceRecord[]>>(`/attendance/activity/${activityId}`);
    return response.data.data;
  },

  async getStats(activityId: string): Promise<AttendanceStats> {
    const response = await apiClient.get<SuccessResponse<AttendanceStats>>(`/attendance/activity/${activityId}/stats`);
    return response.data.data;
  },

  async generateQR(activityId: string, gateId: string, type: string = 'CHECK_IN', maxUses?: number): Promise<QRCodeResponse> {
    const response = await apiClient.post<SuccessResponse<QRCodeResponse>>('/attendance/qr-code', {
      activity_id: activityId,
      gate_id: gateId,
      code_type: type,
      max_uses: maxUses,
    });
    return response.data.data;
  },

  async validateQR(code: string): Promise<QRCodeResponse> {
    const response = await apiClient.get<SuccessResponse<QRCodeResponse>>(`/attendance/qr-code/${code}`);
    return response.data.data;
  },
};
