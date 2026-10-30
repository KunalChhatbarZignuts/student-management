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

export const teacherPortalApi = {
  getMyClasses: async (): Promise<{
    department: string;
    students: StudentInClass[];
    classes: TeacherClassSummary[];
  }> => {
    const res = await apiClient.get<TeacherClassesResponse>('/teachers/me/classes');
    const data = res.data;

    // Group students by class_name + section
    const classMap = new Map<string, StudentInClass[]>();
    for (const s of data.students || []) {
      const key = `${s.class_name}:::${s.section}`;
      const list = classMap.get(key) || [];
      list.push(s);
      classMap.set(key, list);
    }

    const classes: TeacherClassSummary[] = Array.from(classMap.entries()).map(([key, students]) => {
      const [class_name, section] = key.split(':::');
      return {
        class_name,
        section,
        student_count: students.length,
        students,
      };
    });

    return {
      department: data.department,
      students: data.students || [],
      classes,
    };
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


