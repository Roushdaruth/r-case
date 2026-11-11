-- R-Case : correctifs de sécurité (audit du 1er novembre 2026)

-- 1. Les articles retirés du site ne sont plus lisibles par le public.
drop policy if exists "lecture publique" on public.products;
create policy "lecture publique" on public.products for select to anon, authenticated using (status <> 'cache');

-- 2. La gérante est reconnue par son compte confirmé, pas seulement par l'email écrit dans le jeton.
create or replace function public.is_admin()
returns boolean
language sql stable security definer
set search_path = public, auth
as $$
  select exists (
    select 1
    from public.admins a
    join auth.users u on lower(u.email) = lower(a.email)
    where u.id = auth.uid()
      and u.email_confirmed_at is not null
  );
$$;
revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

-- 3. Anti-spam : au plus 25 commandes du site par 10 minutes, et des noms d'articles valides.
create or replace function public.place_order(
  p_ref text, p_name text, p_place text, p_remise text, p_mode text, p_note text, p_items jsonb
) returns text
language plpgsql security definer
set search_path = public
as $$
declare o_id uuid; o_num text; it jsonb; pr public.products%rowtype; q int; cnt int := 0; recent int;
begin
  if p_ref is null or p_ref !~ '^RC-[0-9]{4}-[A-Z0-9]{3}$' then raise exception 'ref invalide'; end if;
  select num into o_num from public.orders where ref = p_ref;
  if o_num is not null then return o_num; end if;
  select count(*) into recent from public.orders where source = 'site' and created_at > now() - interval '10 minutes';
  if recent >= 25 then raise exception 'trop de commandes en peu de temps, réessaie dans quelques minutes'; end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 20 then raise exception 'articles invalides'; end if;
  insert into public.orders (ref, client_name, client_place, remise, mode, note, delivery)
  values (p_ref, left(coalesce(p_name,''), 80), left(coalesce(p_place,''), 120), left(coalesce(p_remise,''), 80),
          case when p_mode = 'commande' then 'commande' else 'reserve' end, left(coalesce(p_note,''), 400),
          left(concat_ws(' · ', nullif(p_place,''), nullif(p_remise,'')), 200))
  returning id, num into o_id, o_num;
  for it in select * from jsonb_array_elements(p_items) loop
    if jsonb_typeof(it) <> 'object' or coalesce(it ->> 'n', '') !~ '^[0-9]{1,6}$' then continue; end if;
    select * into pr from public.products where n = (it ->> 'n')::int and status = 'dispo';
    if not found then continue; end if;
    q := greatest(1, least(20, coalesce(nullif(regexp_replace(coalesce(it ->> 'qty',''), '[^0-9]', '', 'g'), '')::int, 1)));
    insert into public.order_items (order_id, n, name, model, qty, price)
    values (o_id, pr.n, pr.name, pr.model, q,
            case when pr.promo is not null and pr.promo > 0 and pr.promo < pr.price then pr.promo else pr.price end);
    cnt := cnt + 1;
  end loop;
  if cnt = 0 then delete from public.orders where id = o_id; raise exception 'aucun article'; end if;
  return o_num;
end;
$$;
revoke all on function public.place_order(text,text,text,text,text,text,jsonb) from public;
grant execute on function public.place_order(text,text,text,text,text,text,jsonb) to anon, authenticated;

-- 4. Photos : seulement des images, 3 Mo maximum.
update storage.buckets set file_size_limit = 3145728, allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'produits';

-- 5. Nouvelle adresse du site.
update public.settings set data = jsonb_set(data, '{siteUrl}', '"https://r-case.netlify.app/"') where id = 1;

-- Vérification
select
  (select count(*) from public.products where status = 'cache') as articles_retires,
  (select data->>'siteUrl' from public.settings where id = 1) as adresse,
  (select file_size_limit from storage.buckets where id = 'produits') as taille_max_photo,
  (select count(*) from public.admins a join auth.users u on lower(u.email) = lower(a.email) where u.email_confirmed_at is not null) as gerante_confirmee;
