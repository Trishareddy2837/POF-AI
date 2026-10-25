-- POF-AI profile form: store prior qualification marks and both education percentages.
-- Apply after the core profile schema (0001); the app's recommended order is after 0008.
alter table public.education_records
  add column if not exists pre_degree_type text check (pre_degree_type is null or pre_degree_type in ('Intermediate','Diploma')),
  add column if not exists pre_degree_institution text check (pre_degree_institution is null or char_length(pre_degree_institution) <= 160),
  add column if not exists pre_degree_marks text check (pre_degree_marks is null or char_length(pre_degree_marks) <= 40),
  add column if not exists pre_degree_percentage numeric(5,2) check (pre_degree_percentage is null or pre_degree_percentage between 0 and 100),
  add column if not exists btech_marks text check (btech_marks is null or char_length(btech_marks) <= 40),
  add column if not exists btech_percentage numeric(5,2) check (btech_percentage is null or btech_percentage between 0 and 100);
