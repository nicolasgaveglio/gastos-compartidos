-- =====================================================
-- GASTOS COMPARTIDOS - SCHEMA COMPLETO CON SEGURIDAD
-- Ejecutar en Supabase SQL Editor
-- =====================================================

-- 1. EXTENSIONES
create extension if not exists "uuid-ossp";

-- 2. ELIMINAR TABLAS EXISTENTES (si quieres empezar limpio)
-- ¡CUIDADO! Esto borra todos los datos
drop table if exists public.expenses cascade;
drop table if exists public.categories cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;

-- 3. TABLA: groups
-- Cada grupo representa una pareja/familia que comparte gastos
create table if not exists public.groups (
  id serial primary key,
  name text not null,
  user_ids uuid[] not null default '{}',
  created_at timestamptz default now()
);

-- 4. TABLA: group_members (relación muchos-a-muchos normalizada)
-- Alternativa al array user_ids para queries más eficientes
create table if not exists public.group_members (
  group_id integer references public.groups(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  joined_at timestamptz default now(),
  primary key (group_id, user_id)
);

-- 5. TABLA: expenses
create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  group_id integer not null references public.groups(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete set null,
  date text not null,  -- Formato: DD/MM/YYYY (como viene del Excel)
  concept text not null,
  amount numeric(10,2) not null,
  category text default 'Otro',
  person text not null,  -- 'Nicolás' o 'Connie'
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- 6. TABLA: categories
create table if not exists public.categories (
  group_id integer primary key references public.groups(id) on delete cascade,
  categories jsonb not null default '{}',
  updated_at timestamptz default now()
);

-- 7. ÍNDICES para mejor rendimiento
create index if not exists idx_expenses_group_id on public.expenses(group_id);
create index if not exists idx_expenses_user_id on public.expenses(user_id);
create index if not exists idx_expenses_date on public.expenses(date);
create index if not exists idx_group_members_user_id on public.group_members(user_id);

-- =====================================================
-- ROW LEVEL SECURITY (RLS) - SEGURIDAD
-- =====================================================

-- 8. HABILITAR RLS en todas las tablas
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.expenses enable row level security;
alter table public.categories enable row level security;

-- 9. POLÍTICAS PARA: groups
-- Los usuarios solo ven grupos donde están incluidos
drop policy if exists "Users can view their groups" on public.groups;
create policy "Users can view their groups" on public.groups
  for select using (auth.uid() = any(user_ids));

drop policy if exists "Users can create groups" on public.groups;
create policy "Users can create groups" on public.groups
  for insert with check (auth.uid() = any(user_ids));

drop policy if exists "Users can update their groups" on public.groups;
create policy "Users can update their groups" on public.groups
  for update using (auth.uid() = any(user_ids));

-- 10. POLÍTICAS PARA: group_members
drop policy if exists "Users can view their memberships" on public.group_members;
create policy "Users can view their memberships" on public.group_members
  for select using (user_id = auth.uid());

drop policy if exists "Users can join groups" on public.group_members;
create policy "Users can join groups" on public.group_members
  for insert with check (user_id = auth.uid());

-- 11. POLÍTICAS PARA: expenses
-- Los usuarios pueden ver/crear/editar/borrar gastos de sus grupos
drop policy if exists "Users can view expenses in their groups" on public.expenses;
create policy "Users can view expenses in their groups" on public.expenses
  for select using (
    exists (
      select 1 from public.groups 
      where groups.id = expenses.group_id 
      and auth.uid() = any(groups.user_ids)
    )
  );

drop policy if exists "Users can create expenses in their groups" on public.expenses;
create policy "Users can create expenses in their groups" on public.expenses
  for insert with check (
    exists (
      select 1 from public.groups 
      where groups.id = expenses.group_id 
      and auth.uid() = any(groups.user_ids)
    )
  );

drop policy if exists "Users can update expenses in their groups" on public.expenses;
create policy "Users can update expenses in their groups" on public.expenses
  for update using (
    exists (
      select 1 from public.groups 
      where groups.id = expenses.group_id 
      and auth.uid() = any(groups.user_ids)
    )
  );

drop policy if exists "Users can delete expenses in their groups" on public.expenses;
create policy "Users can delete expenses in their groups" on public.expenses
  for delete using (
    exists (
      select 1 from public.groups 
      where groups.id = expenses.group_id 
      and auth.uid() = any(groups.user_ids)
    )
  );

-- 12. POLÍTICAS PARA: categories
drop policy if exists "Users can view categories in their groups" on public.categories;
create policy "Users can view categories in their groups" on public.categories
  for select using (
    exists (
      select 1 from public.groups 
      where groups.id = categories.group_id 
      and auth.uid() = any(groups.user_ids)
    )
  );

drop policy if exists "Users can manage categories in their groups" on public.categories;
create policy "Users can manage categories in their groups" on public.categories
  for all using (
    exists (
      select 1 from public.groups 
      where groups.id = categories.group_id 
      and auth.uid() = any(groups.user_ids)
    )
  );

-- =====================================================
-- DATOS INICIALES (Tu grupo)
-- =====================================================

-- 13. Insertar tu grupo (si no existe)
-- NOTA: Reemplaza los UUIDs con los reales de tu Supabase Auth
insert into public.groups (id, name, user_ids) 
values (
  3, 
  'Nicolás & Connie', 
  array[
    '5893ed6a-d2a3-4bf2-a1da-4b303280fb05'::uuid,  -- Nicolás
    'a9f251c4-6943-430c-ac71-70bd70c9220e'::uuid   -- Connie
  ]
)
on conflict (id) do update set 
  user_ids = excluded.user_ids,
  name = excluded.name;

-- 14. Insertar en group_members (normalizado)
insert into public.group_members (group_id, user_id)
values 
  (3, '5893ed6a-d2a3-4bf2-a1da-4b303280fb05'),
  (3, 'a9f251c4-6943-430c-ac71-70bd70c9220e')
on conflict (group_id, user_id) do nothing;

-- 15. Resetear la secuencia del ID de groups
select setval('groups_id_seq', (select coalesce(max(id), 0) from groups) + 1, false);

-- =====================================================
-- FUNCIÓN: Actualizar updated_at automáticamente
-- =====================================================
create or replace function update_updated_at_column()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Trigger para expenses
drop trigger if exists update_expenses_updated_at on public.expenses;
create trigger update_expenses_updated_at
  before update on public.expenses
  for each row execute function update_updated_at_column();

-- Trigger para categories
drop trigger if exists update_categories_updated_at on public.categories;
create trigger update_categories_updated_at
  before update on public.categories
  for each row execute function update_updated_at_column();

-- =====================================================
-- VERIFICACIÓN
-- =====================================================
Ejecuta esto para verificar que todo está bien:
select * from public.groups;
select * from public.group_members;
select count(*) from public.expenses;