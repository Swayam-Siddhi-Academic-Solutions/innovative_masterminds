-- Class 10 paper shop. Public clients use the Edge Function; tables stay private.
create table public.im_paper_products (
 id text primary key,
 name text not null,
 marks integer not null check (marks in (30,80)),
 amount integer not null check (amount in (9,29)),
 minutes integer not null,
 question_count integer not null,
 subject text not null default 'Mathematics Standard',
 grade integer not null default 10,
 language text not null default 'English',
 set_name text not null default 'Set A',
 version integer not null default 1,
 sample_questions jsonb not null default '[]',
 active boolean not null default false
);
create table public.im_paper_content (
 product_id text primary key references public.im_paper_products(id),
 content jsonb not null,
 updated_at timestamptz not null default now()
);
create table public.im_paper_settings (
 id boolean primary key default true check(id),
 accepting_orders boolean not null default false
);
create table public.im_paper_admins (
 user_id uuid primary key references auth.users(id),
 created_at timestamptz not null default now()
);
create table public.im_paper_orders (
 id text primary key,
 product_id text not null references public.im_paper_products(id),
 product_version integer not null,
 amount integer not null check(amount in (9,29)),
 student text not null check(char_length(student) between 2 and 90),
 email text not null check(char_length(email) between 5 and 150),
 token_hash text not null unique check(token_hash ~ '^[a-f0-9]{64}$'),
 status text not null default 'AWAITING_PAYMENT' check(status in
  ('AWAITING_PAYMENT','PAYMENT_REVIEW','PAYMENT_ISSUE','VERIFIED','PAPER_SENT','ANSWERS_RECEIVED','RESULTS_SENT','TEST_COMPLETED')),
 payer text,
 utr text unique check(utr is null or utr ~ '^[A-Z0-9]{6,70}$'),
 payment_submitted_at timestamptz,
 paper_due_at timestamptz,
 bank_verified_at timestamptz,
 paper_sent_at timestamptz,
 answers_received_at timestamptz,
 results_due_at timestamptz,
 results_sent_at timestamptz,
 staff_notes text not null default '',
 history jsonb not null default '[]',
 version integer not null default 1,
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 check((paper_due_at is null) = (payment_submitted_at is null)),
 check(paper_due_at is null or paper_due_at = payment_submitted_at + interval '1 hour'),
 check(paper_sent_at is null or bank_verified_at is not null),
 check(answers_received_at is null or (paper_sent_at is not null and answers_received_at >= paper_sent_at)),
 check((results_due_at is null) = (answers_received_at is null)),
 check(results_due_at is null or results_due_at = answers_received_at + interval '6 hours'),
 check(results_sent_at is null or answers_received_at is not null)
);
create index im_paper_orders_created_idx on public.im_paper_orders(created_at desc);
create index im_paper_orders_email_created_idx on public.im_paper_orders(email,created_at desc);
create index im_paper_orders_product_idx on public.im_paper_orders(product_id);

alter table public.im_paper_products enable row level security;
alter table public.im_paper_content enable row level security;
alter table public.im_paper_settings enable row level security;
alter table public.im_paper_admins enable row level security;
alter table public.im_paper_orders enable row level security;
revoke all on public.im_paper_products,public.im_paper_content,public.im_paper_settings,public.im_paper_admins,public.im_paper_orders from public,anon,authenticated;
grant all on public.im_paper_products,public.im_paper_content,public.im_paper_settings,public.im_paper_admins,public.im_paper_orders to service_role;
create policy im_paper_products_server_only on public.im_paper_products for all to service_role using(true) with check(true);
create policy im_paper_content_server_only on public.im_paper_content for all to service_role using(true) with check(true);
create policy im_paper_settings_server_only on public.im_paper_settings for all to service_role using(true) with check(true);
create policy im_paper_admins_server_only on public.im_paper_admins for all to service_role using(true) with check(true);
create policy im_paper_orders_server_only on public.im_paper_orders for all to service_role using(true) with check(true);

insert into public.im_paper_settings(id,accepting_orders) values(true,false);
insert into public.im_paper_admins(user_id)
 select id from auth.users where lower(email)='im.abhilash.ssas@gmail.com' and email_confirmed_at is not null;
