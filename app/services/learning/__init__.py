from app.services.learning.performance_engine import compute_student_exam_performance
from app.services.learning.learning_path_service import (
    get_or_create_topic_mastery,
    record_topic_practice_result,
    get_student_subjects_detail,
    ensure_learning_recommendations,
    get_topic_mastery_matrix,
)
from app.services.learning.study_planner_engine import (
    get_or_create_student_study_settings,
    update_student_study_settings,
    get_or_create_daily_study_plan,
    get_weekly_study_plan,
    add_custom_study_plan_item,
    reschedule_study_plan_item,
)
from app.services.learning.practice_quiz_service import (
    generate_practice_session,
    evaluate_practice_session,
    get_student_mistakes,
    resolve_student_mistake,
)
from app.services.learning.concept_tutor_service import explain_curriculum_concept
