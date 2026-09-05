alter table public.task_completions
  add column if not exists child_note text
  check (child_note is null or char_length(trim(child_note)) <= 280);
