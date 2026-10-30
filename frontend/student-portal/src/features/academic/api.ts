import apiClient from '@/lib/axios';

export interface AttendanceRecord {
  id: string;
  date: string;
  status: 'present' | 'absent' | 'excused';
  notes?: string | null;
}

export interface AttendanceSummary {
  total_classes: number;
  attended_classes: number;
  percentage: number;
  excused_absences: number;
  records: AttendanceRecord[];
}

export interface StudentMark {
  id: string;
  subject: string;
  code: string;
  max_score: number;
  obtained_score: number;
  grade: string;
  status: string;
  term: string;
}

export interface FeeInvoice {
  id: string;
  invoice_number: string;
  description: string;
  amount: number;
  due_date: string;
  status: 'Paid' | 'Pending';
}

export const academicApi = {
  // Student self endpoints
  getMyAttendance: async (): Promise<AttendanceSummary> => {
    const res = await apiClient.get<AttendanceSummary>('/students/me/attendance');
    return res.data;
  },

  getMyMarks: async (): Promise<StudentMark[]> => {
    const res = await apiClient.get<StudentMark[]>('/students/me/marks');
    return res.data;
  },

  getMyFees: async (): Promise<FeeInvoice[]> => {
    const res = await apiClient.get<FeeInvoice[]>('/students/me/fees');
    return res.data;
  },

  // Parent child endpoints
  getChildAttendance: async (studentId: string): Promise<AttendanceSummary> => {
    const res = await apiClient.get<AttendanceSummary>(`/parents/me/children/${studentId}/attendance`);
    return res.data;
  },

  getChildMarks: async (studentId: string): Promise<StudentMark[]> => {
    const res = await apiClient.get<StudentMark[]>(`/parents/me/children/${studentId}/marks`);
    return res.data;
  },

  getChildFees: async (studentId: string): Promise<FeeInvoice[]> => {
    const res = await apiClient.get<FeeInvoice[]>(`/parents/me/children/${studentId}/fees`);
    return res.data;
  },
};
