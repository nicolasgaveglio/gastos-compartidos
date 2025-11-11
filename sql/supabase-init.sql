create extension if not exists "uuid-ossp";

create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  date date,
  concept text,
  amount numeric,
  category text,
  person text,
  created_at timestamptz default now()
);

alter table public.expenses disable row level security;
grant select, insert, update, delete on public.expenses to anon;
