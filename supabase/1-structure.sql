-- =========================================================
-- R-Case : structure de la base (à coller dans Supabase > SQL Editor > Run)
-- Script relançable sans risque.
-- =========================================================

-- La gérante : seule cette adresse email a accès à l'espace propriétaire.
create table if not exists public.admins (
  email text primary key
);

create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admins
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- Textes et réglages du site (une seule ligne)
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  data jsonb not null default '{}'::jsonb
);

create table if not exists public.categories (
  id text primary key,
  label text not null,
  position int not null default 0,
  main boolean not null default true
);

create table if not exists public.subcategories (
  cat_id text not null references public.categories(id) on update cascade on delete cascade,
  id text not null,
  label text not null,
  position int not null default 0,
  primary key (cat_id, id)
);

create table if not exists public.products (
  n serial primary key,
  name text not null,
  model text not null default 'Universel',
  cat text references public.categories(id) on update cascade on delete set null,
  sub text not null default '',
  price int not null check (price >= 0),
  promo int check (promo is null or promo >= 0),
  stock int not null default 1 check (stock >= 0),
  status text not null default 'dispo' check (status in ('dispo','reserve','epuise','cache')),
  is_new boolean not null default false,
  featured boolean not null default false,
  img text not null default '',
  descr text not null default '',
  created_at timestamptz not null default now()
);

-- Prix d'achat : visibles uniquement par la gérante
create table if not exists public.product_costs (
  n int primary key references public.products(n) on delete cascade,
  cost int not null default 0 check (cost >= 0)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  num text unique,
  ref text unique,
  created_at timestamptz not null default now(),
  client_name text not null default '' check (char_length(client_name) <= 80),
  client_place text not null default '' check (char_length(client_place) <= 120),
  remise text not null default '' check (char_length(remise) <= 80),
  mode text not null default 'reserve' check (mode in ('reserve','commande')),
  note text not null default '' check (char_length(note) <= 400),
  pay text not null default 'a_encaisser' check (pay in ('a_encaisser','paye')),
  status text not null default 'nouvelle' check (status in ('nouvelle','confirmee','livree','annulee')),
  delivery text not null default '',
  stock_applied boolean not null default false,
  source text not null default 'site'
);

create table if not exists public.order_items (
  id bigserial primary key,
  order_id uuid not null references public.orders(id) on delete cascade,
  n int,
  name text not null,
  model text not null default '',
  qty int not null check (qty between 1 and 50),
  price int not null check (price >= 0),
  cost int
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.expenses (
  id bigserial primary key,
  date date not null default current_date,
  label text not null,
  amount int not null check (amount >= 0)
);

-- Numéro de commande lisible : RC-2026-001, RC-2026-002...
create or replace function public.set_order_num()
returns trigger
language plpgsql security definer
set search_path = public
as $$
declare y text := to_char(coalesce(new.created_at, now()), 'YYYY'); k int;
begin
  if new.num is null or new.num = '' then
    perform pg_advisory_xact_lock(hashtext('rcase-order-num-' || y));
    select coalesce(max(substring(num from 9)::int), 0) + 1 into k
      from public.orders where num like 'RC-' || y || '-%' and substring(num from 9) ~ '^[0-9]+$';
    new.num := 'RC-' || y || '-' || lpad(k::text, 3, '0');
  end if;
  return new;
end;
$$;
drop trigger if exists orders_num on public.orders;
create trigger orders_num before insert on public.orders
  for each row execute function public.set_order_num();

-- Commande passée depuis le site : les prix sont relus dans la base (impossible de les trafiquer)
create or replace function public.place_order(
  p_ref text, p_name text, p_place text, p_remise text, p_mode text, p_note text, p_items jsonb
) returns text
language plpgsql security definer
set search_path = public
as $$
declare o_id uuid; o_num text; it jsonb; pr public.products%rowtype; q int; cnt int := 0;
begin
  if p_ref is null or p_ref !~ '^RC-[0-9]{4}-[A-Z0-9]{3}$' then raise exception 'ref invalide'; end if;
  select num into o_num from public.orders where ref = p_ref;
  if o_num is not null then return o_num; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'articles invalides'; end if;
  insert into public.orders (ref, client_name, client_place, remise, mode, note, delivery)
  values (p_ref, left(coalesce(p_name,''), 80), left(coalesce(p_place,''), 120), left(coalesce(p_remise,''), 80),
          case when p_mode = 'commande' then 'commande' else 'reserve' end, left(coalesce(p_note,''), 400),
          left(concat_ws(' · ', nullif(p_place,''), nullif(p_remise,'')), 200))
  returning id, num into o_id, o_num;
  for it in select * from jsonb_array_elements(p_items) loop
    select * into pr from public.products where n = (it ->> 'n')::int and status <> 'cache';
    if not found then continue; end if;
    q := greatest(1, least(20, coalesce((it ->> 'qty')::int, 1)));
    insert into public.order_items (order_id, n, name, model, qty, price)
    values (o_id, pr.n, pr.name, pr.model, q,
            case when pr.promo is not null and pr.promo > 0 and pr.promo < pr.price then pr.promo else pr.price end);
    cnt := cnt + 1;
  end loop;
  if cnt = 0 then delete from public.orders where id = o_id; raise exception 'aucun article'; end if;
  return o_num;
end;
$$;

-- ---------- Sécurité (Row Level Security) ----------
alter table public.admins enable row level security;
alter table public.settings enable row level security;
alter table public.categories enable row level security;
alter table public.subcategories enable row level security;
alter table public.products enable row level security;
alter table public.product_costs enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.expenses enable row level security;

do $$
declare t text;
begin
  -- Lecture publique : vitrine
  foreach t in array array['settings','categories','subcategories','products'] loop
    execute format('drop policy if exists "lecture publique" on public.%I', t);
    execute format('create policy "lecture publique" on public.%I for select to anon, authenticated using (true)', t);
  end loop;
  -- Écriture et données privées : gérante uniquement
  foreach t in array array['settings','categories','subcategories','products','product_costs','orders','order_items','expenses','admins'] loop
    execute format('drop policy if exists "gerante" on public.%I', t);
    execute format('create policy "gerante" on public.%I for all to authenticated using (public.is_admin()) with check (public.is_admin())', t);
  end loop;
end $$;

grant usage on schema public to anon, authenticated;
grant select on public.settings, public.categories, public.subcategories, public.products to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant usage, select on all sequences in schema public to authenticated;
revoke all on function public.place_order(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.place_order(text,text,text,text,text,text,jsonb) to anon, authenticated;
grant execute on function public.is_admin() to anon, authenticated;

-- ---------- Photos des articles ----------
insert into storage.buckets (id, name, public) values ('produits', 'produits', true)
on conflict (id) do nothing;
drop policy if exists "rcase photos ajout" on storage.objects;
drop policy if exists "rcase photos modif" on storage.objects;
drop policy if exists "rcase photos suppr" on storage.objects;
create policy "rcase photos ajout" on storage.objects for insert to authenticated with check (bucket_id = 'produits' and public.is_admin());
create policy "rcase photos modif" on storage.objects for update to authenticated using (bucket_id = 'produits' and public.is_admin());
create policy "rcase photos suppr" on storage.objects for delete to authenticated using (bucket_id = 'produits' and public.is_admin());
