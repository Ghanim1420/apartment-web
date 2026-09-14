-- شغّل هذا الكود في Supabase: من القائمة الجانبية اختر SQL Editor > New query > الصق والتشغيل

create extension if not exists "uuid-ossp";

create table apartments (
  id uuid primary key default uuid_generate_v4(),
  number text,
  tenant_name text,
  phone text,
  rent numeric,
  frequency text,
  start_date date,
  end_date date,
  payment_status text,
  notes text,
  created_at timestamp with time zone default now()
);

create table transactions (
  id uuid primary key default uuid_generate_v4(),
  date date,
  type text,
  apartment_id uuid references apartments(id) on delete set null,
  amount numeric,
  bank text,
  responsible text,
  notes text,
  created_at timestamp with time zone default now()
);

create table obligations (
  id uuid primary key default uuid_generate_v4(),
  beneficiary text,
  year text,
  amount_due numeric,
  due_date date,
  payment1 numeric,
  payment2 numeric,
  bank text,
  created_at timestamp with time zone default now()
);

-- تفعيل RLS مع سياسة مفتوحة مؤقتًا (أي شخص لديه رابط الموقع يقدر يقرأ ويعدّل)
-- هذا يكفي للاستخدام العائلي المغلق حاليًا، ويمكن لاحقًا تقييده بتسجيل دخول حقيقي (Supabase Auth)

alter table apartments enable row level security;
alter table transactions enable row level security;
alter table obligations enable row level security;

create policy "allow all - apartments" on apartments for all using (true) with check (true);
create policy "allow all - transactions" on transactions for all using (true) with check (true);
create policy "allow all - obligations" on obligations for all using (true) with check (true);
