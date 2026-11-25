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

export interface StudySession {
  id: string;
  student_id: string;
  plan_item_id: string;
  status: 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED';
  start_time: string;
  end_time: string | null;
  paused_at: string | null;
  accumulated_seconds: number;
  target_duration_seconds: number;
  notes: string | null;
  activity_title?: string | null;
  subject_name?: string | null;
  elapsed_seconds: number;
  remaining_seconds: number;
}

export interface StudyPlanItem {
  id: string;
  plan_id?: string | null;
  subject_name: string;
  topic_title: string;
  title?: string | null;
  description?: string | null;
  activity_type: string;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'SKIPPED';
  duration_minutes: number;
  is_completed: boolean;
  is_custom?: boolean;
  time_spent_seconds: number;
  order_index: number;
  start_time?: string | null;
  end_time?: string | null;
  notes?: string | null;
  recommended_resource_url?: string | null;
  exam_id?: string | null;
  is_rescheduled?: boolean;
  is_deleted?: boolean;
}

export interface CreateRoutineActivityPayload {
  subject_name: string;
  topic_title: string;
  title?: string;
  description?: string;
  activity_type: string;
  duration_minutes: number;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  start_time?: string;
  end_time?: string;
  notes?: string;
  recommended_resource_url?: string;
  target_date?: string;
}

export interface UpdateRoutineActivityPayload {
  subject_name?: string;
  topic_title?: string;
  title?: string;
  description?: string;
  activity_type?: string;
  duration_minutes?: number;
  priority?: 'HIGH' | 'MEDIUM' | 'LOW';
  status?: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'SKIPPED';
  is_completed?: boolean;
  start_time?: string;
  end_time?: string;
  notes?: string;
  recommended_resource_url?: string;
}

export interface UpdateActivityStatusPayload {
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'PAUSED' | 'SKIPPED';
  additional_seconds_spent?: number;
}

export interface DuplicateRoutinePayload {
  source_date: string;
  target_date: string;
  include_completed?: boolean;
}

export interface StartSessionPayload {
  plan_item_id: string;
  target_duration_seconds?: number;
}

export interface FinishSessionPayload {
  mark_activity_completed: boolean;
  notes?: string;
}

export interface StudentStudySettings {
  student_id: string;
  weekday_daily_minutes: number;
  weekend_daily_minutes: number;
  preferred_study_time: string;
  break_interval_minutes: number;
  notifications_enabled: boolean;
}

export interface WeeklyStudyPlan {
  week_start_date: string;
  total_planned_minutes: number;
  completed_minutes: number;
  daily_plans: DailyStudyPlan[];
  upcoming_exams_count: number;
  completion_percentage: number;
}

export interface TopicMasteryItem {
  topic_id: string;
  topic_title: string;
  chapter_title: string;
  subject_name: string;
  mastery_level: 'NOT_STARTED' | 'RECOMMENDED' | 'IN_PROGRESS' | 'NEEDS_PRACTICE' | 'IMPROVING' | 'MASTERED';
  accuracy_percentage: number;
  attempts_count: number;
  consecutive_correct: number;
  last_assessed_at: string | null;
}

export interface TopicMasteryMatrix {
  total_topics: number;
  mastered_count: number;
  in_progress_count: number;
  needs_practice_count: number;
  topics: TopicMasteryItem[];
}

export interface StudentMistake {
  id: string;
  topic_id: string | null;
  subject_name: string;
  topic_title: string;
  question_text: string;
  student_answer: string;
  correct_answer: string;
  misconception_explanation: string;
  is_resolved: boolean;
  created_at: string;
}

export interface ConceptTutorExplainResponse {
  subject_name: string;
  topic_title: string;
  explanation_markdown: string;
  worked_example: string | null;
  key_takeaways: string[];
  practice_prompt: string | null;
  attribution: string;
}

export interface DailyStudyPlan {
  id: string;
  student_id?: string | null;
  plan_date: string;
  total_planned_minutes: number;
  completed_minutes: number;
  remaining_minutes?: number;
  completion_percentage?: number;
  status: string;
  notes?: string | null;
  is_archived?: boolean;
  total_activities_count?: number;
  completed_activities_count?: number;
  pending_activities_count?: number;
  items: StudyPlanItem[];
  active_session?: StudySession | null;
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
