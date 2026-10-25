-- The analysis now returns up to 8 careers (was 5). Migration 0006 expands this to 20.
alter table public.career_recommendations drop constraint if exists career_recommendations_rank_check;
alter table public.career_recommendations add constraint career_recommendations_rank_check check (rank between 1 and 10);
