import apiClient from '@/lib/axios';

export interface StudentInClass {
  id: string;
  student_code: string;
  first_name: string;
  last_name: string;
  class_name: string;
  section: string;
  department: string;
  status: string;
}

export interface TeacherClassesResponse {
  department: string;
  students: StudentInClass[];
}

export interface TeacherClassSummary {
  class_name: string;
  section: string;
  student_count: number;
  students: StudentInClass[];
}

export interface TeacherAssignment {
  id: string;
  teacher_id: string;
  class_id: string;
  subject_id: string;
  is_class_teacher: boolean;
  academic_year: string;
  status: string;
  created_at: string;
  class_name?: string;
  section?: string;
  subject_name?: string;
  subject_code?: string;
}

export interface StudentRosterItem {
  id: string;
  student_code: string;
  name: string;
  status: string;
}

export interface ClassRosterResponse {
  class_id: string;
  class_name: string;
  section: string;
  items: StudentRosterItem[];
  total: number;
  page: number;
  size: number;
}

export interface AttendanceRecordPayload {
  student_id: string;
  status: 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';
  remark?: string;
}

export interface AttendanceBulkCreatePayload {
  class_id: string;
  subject_id: string;
  date: string;
  period: number;
  records: AttendanceRecordPayload[];
}

export interface AttendanceRecordResponse {
  id: string;
  session_id: string;
  student_id: string;
  status: string;
  remark?: string;
  student_name?: string;
  student_code?: string;
}

export interface AttendanceSessionResponse {
  id: string;
  class_id: string;
  subject_id: string;
  date: string;
  period: number;
  taken_by_teacher_id?: string;
  locked_at?: string;
  class_name?: string;
  section?: string;
  subject_name?: string;
  records: AttendanceRecordResponse[];
}

export interface StudentAttendanceSummaryItem {
  student_id: string;
  student_code: string;
  name: string;
  total_sessions: number;
  present_count: number;
  absent_count: number;
  late_count: number;
  excused_count: number;
  percentage: number;
}

export interface ClassAttendanceSummaryResponse {
  class_id: string;
  class_name: string;
  section: string;
  from_date: string;
  to_date: string;
  total_sessions: number;
  items: StudentAttendanceSummaryItem[];
}

export const teacherPortalApi = {
  getAssignedClasses: async (): Promise<TeacherAssignment[]> => {
    const res = await apiClient.get<TeacherAssignment[]>('/teacher/classes');
    return res.data;
  },

  getClassRoster: async (
    classId: string,
    params?: { page?: number; size?: number; search?: string }
  ): Promise<ClassRosterResponse> => {
    const res = await apiClient.get<ClassRosterResponse>(`/teacher/classes/${classId}/students`, {
      params,
    });
    return res.data;
  },

  markAttendance: async (payload: AttendanceBulkCreatePayload): Promise<AttendanceSessionResponse> => {
    const res = await apiClient.post<AttendanceSessionResponse>('/teacher/attendance', payload);
    return res.data;
  },

  getAttendanceSessions: async (classId: string, date?: string): Promise<AttendanceSessionResponse[]> => {
    const res = await apiClient.get<AttendanceSessionResponse[]>('/teacher/attendance', {
      params: { class_id: classId, date: date || undefined },
    });
    return res.data;
  },

  updateAttendanceSession: async (
    sessionId: string,
    records: AttendanceRecordPayload[]
  ): Promise<AttendanceSessionResponse> => {
    const res = await apiClient.patch<AttendanceSessionResponse>(`/teacher/attendance/${sessionId}`, {
      records,
    });
    return res.data;
  },

  getAttendanceSummary: async (
    classId: string,
    fromDate: string,
    toDate: string
  ): Promise<ClassAttendanceSummaryResponse> => {
    const res = await apiClient.get<ClassAttendanceSummaryResponse>('/teacher/attendance/summary', {
      params: { class_id: classId, from: fromDate, to: toDate },
    });
    return res.data;
  },

  getMyClasses: async (): Promise<{
    department: string;
    students: StudentInClass[];
    classes: TeacherClassSummary[];
    assignments: TeacherAssignment[];
  }> => {
    try {
      const res = await apiClient.get<TeacherAssignment[]>('/teacher/classes');
      const assignments = res.data || [];
      const classes: TeacherClassSummary[] = assignments.map((a) => ({
        class_name: a.class_name || 'Class',
        section: a.section || '',
        student_count: 0,
        students: [],
      }));
      return {
        department: '',
        students: [],
        classes,
        assignments,
      };
    } catch {
      return {
        department: '',
        students: [],
        classes: [],
        assignments: [],
      };
    }
  },

  reportMissingStudent: async (payload: {
    student_name: string;
    class_name: string;
    section: string;
    notes?: string;
  }) => {
    const res = await apiClient.post('/teachers/missing-student-request', payload);
    return res.data;
  },
};


