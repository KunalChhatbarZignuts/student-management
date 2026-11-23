export interface ActionLink {
  label: string;
  url: string;
}

export interface ChatMessage {
  id: string;
  sender: 'STUDENT' | 'ASSISTANT' | 'SYSTEM';
  content: string;
  tools_used?: string[];
  action_links?: ActionLink[];
  created_at: string;
}

export interface ConversationSummary {
  id: string;
  title: string;
  last_message_preview?: string | null;
  message_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationDetail {
  id: string;
  title: string;
  messages: ChatMessage[];
  created_at: string;
}

export interface SuggestionCard {
  id: string;
  label: string;
  prompt: string;
  category: string;
  icon?: string | null;
}

export interface ChatQueryResponse {
  conversation_id: string;
  message_id: string;
  content: string;
  tools_used: string[];
  action_links: ActionLink[];
  created_at: string;
}

// ===========================================================================
// Release 2: Academic Intelligence Types
// ===========================================================================

export interface QuizQuestionItem {
  id: string;
  question_text: string;
  question_type: string;
  options: string[];
  hint?: string | null;
}

export interface QuizGenerationResponse {
  quiz_id: string;
  subject_name: string;
  chapter_title?: string | null;
  difficulty: string;
  questions: QuizQuestionItem[];
}

export interface QuizAnswerItem {
  question_id: string;
  selected_option_index?: number | null;
  text_answer?: string | null;
}

export interface QuestionFeedbackItem {
  question_id: string;
  question_text: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
}

export interface QuizEvaluationResponse {
  quiz_id: string;
  total_questions: number;
  correct_count: number;
  score_percentage: number;
  feedback: QuestionFeedbackItem[];
  recommendation: string;
}

export interface FlashcardItem {
  id: string;
  front: string;
  back: string;
  hint?: string | null;
  subject: string;
  chapter?: string | null;
}

export interface FlashcardDeckResponse {
  subject_name: string;
  chapter_title?: string | null;
  cards: FlashcardItem[];
}

export interface ExamRevisionChecklistItem {
  day_number: number;
  date_str: string;
  topic_name: string;
  study_duration_minutes: number;
  focus_area: string;
  is_completed?: boolean;
}

export interface ExamPrepPlanResponse {
  exam_name: string;
  exam_date: string;
  days_remaining: number;
  total_topics: number;
  checklist: ExamRevisionChecklistItem[];
  key_tips: string[];
}

export interface ImageQuestionResponse {
  filename: string;
  detected_subject: string;
  extracted_text: string;
  step_by_step_solution: string[];
  final_answer: string;
  advice: string;
}

export interface DocumentSummaryResponse {
  filename: string;
  document_type: string;
  summary: string;
  key_definitions: { term: string; definition: string }[];
  revision_questions: string[];
  source_citations: { topic: string; reference: string }[];
}

// ---------------------------------------------------------------------------
// Release 3: Interactive AI Types
// ---------------------------------------------------------------------------

export interface GrammarCorrectionItem {
  error_phrase: string;
  corrected_phrase: string;
  rule_explanation: string;
}

export interface GrammarEvaluationResponse {
  original_text: string;
  corrected_text: string;
  overall_score: number;
  cefr_level: string;
  corrections: GrammarCorrectionItem[];
  vocabulary_enhancements: { simple: string; advanced: string; context: string }[];
  encouragement: string;
}

export interface DebateScorecard {
  logic_score: number;
  evidence_score: number;
  clarity_score: number;
  total_score: number;
  strengths: string[];
  areas_for_growth: string[];
  verdict_summary: string;
}

export interface DebateRoundResponse {
  topic: string;
  stance: string;
  current_round: number;
  max_rounds: number;
  ai_counter_argument: string;
  student_argument_critique: string;
  suggested_rebuttal_points: string[];
  is_concluded: boolean;
  rubric_scorecard?: DebateScorecard | null;
}

export interface ConceptMapNode {
  id: string;
  label: string;
  definition: string;
  category: 'root' | 'primary' | 'secondary' | 'detail';
  x: number;
  y: number;
}

export interface ConceptMapEdge {
  source: string;
  target: string;
  relationship: string;
}

export interface ConceptMapResponse {
  root_topic: string;
  subject: string;
  grade_level: string;
  nodes: ConceptMapNode[];
  edges: ConceptMapEdge[];
  key_takeaway: string;
}

export interface ClassTopicNotesResponse {
  subject_name: string;
  topic_name: string;
  teacher_name?: string | null;
  date_str: string;
  core_concepts: string[];
  formulas_or_rules: string[];
  homework_or_followup: string[];
  summary_markdown: string;
}

// ---------------------------------------------------------------------------
// Release 4: Proactive AI Types
// ---------------------------------------------------------------------------

export interface MorningBriefingResponse {
  student_name: string;
  date_str: string;
  day_name: string;
  classes_count: number;
  next_class_summary?: string | null;
  nearest_exam_name?: string | null;
  nearest_exam_days?: number | null;
  pending_fee_balance: number;
  calendar_notice?: string | null;
  inspirational_quote: string;
  proactive_recommendation: string;
}

export interface DailyChallengeResponse {
  challenge_id: string;
  date_str: string;
  subject: string;
  topic: string;
  question_text: string;
  options: string[];
  correct_option_index: number;
  hint: string;
  explanation: string;
}

export interface CareerPathwayItem {
  title: string;
  match_score: number;
  description: string;
  primary_subjects: string[];
  university_degrees: string[];
  key_skills: string[];
}

export interface CareerDiscoveryResponse {
  student_grade: string;
  top_subjects: string[];
  career_pathways: CareerPathwayItem[];
  advice: string;
}


