-- Read-only preflight before deciding whether to run migration 0009.
-- Expected before a fresh 0009 run: all listed table_exists values are false.
-- If some are true and others false, stop; the migration is partially applied.

with expected(table_name) as (
  values
    ('quiz_categories'), ('quizzes'), ('quiz_questions'), ('quiz_options'),
    ('quiz_attempts'), ('quiz_attempt_questions'), ('quiz_attempt_answers'),
    ('quiz_leaderboard_opt_ins'), ('quiz_admin_audit')
)
select e.table_name, to_regclass('public.' || e.table_name) is not null as table_exists
from expected e
order by e.table_name;

-- Also check 0009's dependency tables exist (from migrations 0001–0008).
select
  to_regclass('public.assessment_attempts') is not null as assessment_attempts_exists,
  to_regclass('public.student_opportunity_tracking') is not null as student_opportunity_tracking_exists,
  to_regclass('public.profiles') is not null as profiles_exists;
