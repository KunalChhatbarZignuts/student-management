from app.modules.ai.learning.engines.performance_engine import compute_student_exam_performance
from app.modules.ai.learning.engines.learning_path_service import (
    get_or_create_topic_mastery,
    record_topic_practice_result,
    get_student_subjects_detail,
    ensure_learning_recommendations,
    get_topic_mastery_matrix,
)
from app.modules.ai.learning.engines.study_planner_engine import (
    get_or_create_student_study_settings,
    update_student_study_settings,
    get_or_create_daily_study_plan,
    get_weekly_study_plan,
    add_custom_study_plan_item,
    reschedule_study_plan_item,
)
from app.modules.ai.learning.engines.practice_quiz_service import (
    generate_practice_session,
    evaluate_practice_session,
    get_student_mistakes,
    resolve_student_mistake,
)
from app.modules.ai.learning.engines.concept_tutor_service import explain_curriculum_concept
from app.modules.ai.learning.engines.study_routine_service import (
    get_daily_routine,
    create_routine_activity,
    update_routine_activity,
    update_activity_status,
    delete_routine_activity,
    duplicate_routine,
    reorder_routine_activities,
)
from app.modules.ai.learning.engines.study_session_service import (
    get_active_study_session,
    start_study_session,
    pause_study_session,
    resume_study_session,
    finish_study_session,
    cancel_study_session,
)
