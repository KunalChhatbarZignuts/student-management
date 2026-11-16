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
  marks_entry_status: string;
  created_at: string;
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

