export interface GradingScale {
  id: string;
  name: string;
  min_percentage: number;
  max_percentage: number;
  grade: string;
  grade_point: number;
  description?: string | null;
  is_passing: boolean;
  status: string;
}

export interface Examination {
  id: string;
  name: string;
  exam_type: string;
  academic_year_id: string;
  academic_year_name?: string | null;
  term: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  status: 'DRAFT' | 'SCHEDULED' | 'ONGOING' | 'COMPLETED' | 'CANCELLED';
  grading_scale_name: string;
  total_schedules: number;
  published_results_count: number;
  created_at: string;
  updated_at: string;
}

export interface ExaminationSchedule {
  id: string;
  examination_id: string;
  exam_name?: string | null;
  grade_id: string;
  grade_name?: string | null;
  section_id: string;
  section_name?: string | null;
  subject_id: string;
  subject_name?: string | null;
  subject_code?: string | null;
  exam_date: string;
  start_time: string;
  end_time: string;
  max_marks: number;
  pass_marks: number;
  room_number?: string | null;
  instructions?: string | null;
  status: string;
  marks_entry_status: 'PENDING' | 'DRAFT' | 'SUBMITTED' | 'PUBLISHED';
  created_at: string;
}

export interface ExaminationDashboardMetrics {
  total_examinations: number;
  upcoming_examinations: number;
  ongoing_examinations: number;
  completed_examinations: number;
  results_pending: number;
  published_results: number;
  total_participating_students: number;
}

export interface StudentRosterMarkItem {
  student_id: string;
  student_name: string;
  enrollment_number?: string | null;
  roll_no: number;
  marks_obtained?: number | null;
  is_absent: boolean;
  grade?: string | null;
  is_passed?: boolean | null;
  remarks?: string | null;
  status: string;
}

export interface ScheduleRosterResponse {
  schedule_id: string;
  exam_name: string;
  exam_type: string;
  term: string;
  grade_name: string;
  section_name: string;
  subject_name: string;
  subject_code: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  max_marks: number;
  pass_marks: number;
  status: string;
  students: StudentRosterMarkItem[];
}

export interface MarksBulkSavePayload {
  marks: {
    student_id: string;
    marks_obtained?: number | null;
    is_absent: boolean;
    remarks?: string | null;
  }[];
  teacher_remarks?: string | null;
}

export interface CreateExaminationPayload {
  name: string;
  exam_type: string;
  academic_year_id: string;
  term: string;
  description?: string;
  start_date: string;
  end_date: string;
  grading_scale_name?: string;
}

export interface CreateSchedulePayload {
  examination_id: string;
  grade_id: string;
  section_id: string;
  subject_id: string;
  exam_date: string;
  start_time: string;
  end_time: string;
  max_marks: number;
  pass_marks: number;
  room_number?: string;
  instructions?: string;
}

export interface SubjectMarkDetail {
  subject_name: string;
  subject_code: string;
  exam_date: string;
  max_marks: number;
  pass_marks: number;
  marks_obtained?: number | null;
  is_absent: boolean;
  grade?: string | null;
  is_passed?: boolean | null;
  status: string;
}

export interface StudentResultResponse {
  id: string;
  examination_id: string;
  exam_name: string;
  exam_type: string;
  term: string;
  academic_year: string;
  student_id: string;
  student_name: string;
  enrollment_number?: string | null;
  roll_no?: number | null;
  grade_name: string;
  section_name: string;
  class_teacher_name?: string | null;
  total_max_marks: number;
  total_obtained_marks: number;
  percentage: number;
  overall_grade: string;
  overall_result: string;
  teacher_remarks?: string | null;
  status: string;
  published_at?: string | null;
  subject_marks: SubjectMarkDetail[];
}

