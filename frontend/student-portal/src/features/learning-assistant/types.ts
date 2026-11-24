export interface SubjectPerformanceSummary {
  subject_id: string | null;
  subject_name: string;
  subject_code: string | null;
  average_marks: number;
  total_exams: number;
  status: 'EXCELLING' | 'STRONG' | 'NEEDS_IMPROVEMENT' | 'CRITICAL_ATTENTION';
  trend: 'IMPROVING' | 'DECLINING' | 'STABLE';
}

export interface RecommendationsSummary {
  total_recommendations: number;
  completed_count: number;
  in_progress_count: number;
  completion_percentage: number;
}

export interface TodayPlanSummary {
  total_minutes: number;
  completed_minutes: number;
  items_count: number;
  completed_items: number;
}

export interface DataAttribution {
  exam_source: string;
  practice_source: string;
  confidence: string;
  data_availability: string;
}

export interface LearningOverview {
  student_id: string;
  student_name: string;
  grade_name: string;
  section_name: string;
  academic_year: string;
  overall_exam_average: number;
  strong_subjects: SubjectPerformanceSummary[];
  weak_subjects: SubjectPerformanceSummary[];
  recommendations_summary: RecommendationsSummary;
  top_recommendation: {
    id: string;
    subject_name: string;
    topic_title: string;
    reason: string;
    priority: string;
    estimated_minutes: number;
    status: string;
  } | null;
  today_plan_summary: TodayPlanSummary;
  data_attribution: DataAttribution;
  historical_improvement: Array<{
    exam_name: string;
    percentage: number;
    grade: string;
    date: string;
  }>;
}

export interface TopicDetail {
  id: string;
  title: string;
  learning_objective: string | null;
  difficulty_level: string;
  estimated_minutes: number;
  order_index: number;
  diagnostic_accuracy: number | null;
  is_mastered: boolean;
}

export interface ChapterDetail {
  id: string;
  chapter_number: number;
  title: string;
  description: string | null;
  order_index: number;
  topics: TopicDetail[];
  diagnostic_accuracy: number | null;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
}

export interface SubjectLearningDetail {
  subject_id: string;
  subject_name: string;
  subject_code: string;
  official_exam_average: number | null;
  total_chapters: number;
  completed_chapters: number;
  diagnostic_accuracy: number | null;
  status: string;
  chapters: ChapterDetail[];
}

export interface Recommendation {
  id: string;
  subject_name: string;
  topic_title: string;
  reason: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  estimated_minutes: number;
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'NEED_PRACTICE';
  order_index: number;
  created_at: string;
}

export interface StudyPlanItem {
  id: string;
  subject_name: string;
  topic_title: string;
  activity_type: string;
  duration_minutes: number;
  is_completed: boolean;
  time_spent_seconds: number;
  order_index: number;
}

export interface DailyStudyPlan {
  id: string;
  plan_date: string;
  total_planned_minutes: number;
  completed_minutes: number;
  status: string;
  items: StudyPlanItem[];
}

export interface PracticeQuestion {
  id: string;
  question_number: number;
  question_text: string;
  options: string[];
  hint: string | null;
}

export interface PracticeSession {
  session_id: string;
  subject_name: string;
  chapter_title: string;
  difficulty: string;
  total_questions: number;
  questions: PracticeQuestion[];
}

export interface QuestionEvaluation {
  question_id: string;
  question_text: string;
  selected_option_index: number | null;
  correct_option_index: number;
  is_correct: boolean;
  explanation: string;
  hint: string | null;
}

export interface PracticeEvaluation {
  session_id: string;
  subject_name: string;
  chapter_title: string;
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  results: QuestionEvaluation[];
  learning_impact: string;
}

export interface ChatActionSuggestion {
  label: string;
  action_type: string;
  target_id?: string | null;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  suggested_actions?: ChatActionSuggestion[];
  timestamp: string;
}
