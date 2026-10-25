-- Store the expanded 20-career recommendation set while keeping the existing table and RLS.
alter table public.career_recommendations drop constraint if exists career_recommendations_rank_check;
alter table public.career_recommendations add constraint career_recommendations_rank_check check (rank between 1 and 20);
