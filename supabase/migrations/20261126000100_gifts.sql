create extension if not exists pgcrypto with schema extensions;

create table public.gifts (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  data jsonb not null,
  token text unique check (token ~ '^[A-Za-z0-9_-]{43}$'),
  revoked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index gifts_owner_updated_idx on public.gifts(user_id, updated_at desc);

create table public.gift_publications (
  gift_id uuid primary key references public.gifts(id) on delete cascade,
  data jsonb not null,
  scheduled_at timestamptz,
  expires_at timestamptz,
  access_pin_hash text,
  pin_window_start timestamptz,
  pin_failures integer not null default 0,
  published_at timestamptz not null default now(),
  check (expires_at is null or scheduled_at is null or expires_at > scheduled_at)
);

alter table public.gifts enable row level security;
alter table public.gift_publications enable row level security;
revoke all on public.gifts, public.gift_publications from anon, authenticated;
grant select on public.gifts to authenticated;
create policy read_own_gifts on public.gifts for select to authenticated using (user_id = (select auth.uid()));
grant select(gift_id,scheduled_at,expires_at) on public.gift_publications to authenticated;
create policy read_own_delivery_dates on public.gift_publications for select to authenticated
using (exists(select 1 from public.gifts where id=gift_id and user_id=(select auth.uid())));

insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('letter-photos','letter-photos',false,5242880,array['image/jpeg','image/png','image/webp']);

create policy upload_own_letter_photo on storage.objects for insert to authenticated
with check (bucket_id='letter-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy read_own_letter_photo on storage.objects for select to authenticated
using (bucket_id='letter-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy delete_own_letter_photo on storage.objects for delete to authenticated
using (bucket_id='letter-photos' and (storage.foldername(name))[1]=(select auth.uid())::text);

create function public.save_gift(gift_id uuid, payload jsonb, publish boolean, new_pin text default null, clear_pin boolean default false)
returns text language plpgsql security definer set search_path = '' as $$
declare
  owner_id uuid := auth.uid();
  stem jsonb;
  field text;
  photo_path text;
  available_from timestamptz;
  expires_on timestamptz;
  result_token text;
begin
  if owner_id is null then raise exception 'Sign in required'; end if;
  if gift_id is null or jsonb_typeof(payload) is distinct from 'object'
      or octet_length(payload::text)>54000 then raise exception 'Invalid gift'; end if;
  foreach field in array array['wrap','ribbon','arrangement','recipient','sender','title','body','theme','font','align','color','date','photo','scheduled','expires']
  loop
    if jsonb_typeof(payload->field) is distinct from 'string' then raise exception 'Invalid gift field'; end if;
  end loop;
  if char_length(payload->>'recipient')>100 or char_length(payload->>'sender')>100
      or char_length(payload->>'title')>140 or char_length(payload->>'body')>10000
      or payload->>'wrap' not in ('Classic cream','Blush pink','Kraft paper','Sage green','Vintage floral')
      or payload->>'ribbon' not in ('Pink','Burgundy','White','Lavender','Sage')
      or payload->>'arrangement' not in ('Classic rounded','Wildflower','Elegant vertical','Romantic mixed')
      or payload->>'theme' not in ('Classic handwritten','Vintage parchment','Minimalist love letter','Floral stationery','Romantic pink')
      or payload->>'font' not in ('Caveat','Cormorant Garamond','DM Sans')
      or payload->>'align' not in ('left','center','right')
      or payload->>'color' not in ('#40312d','#773749','#344d38')
      or jsonb_typeof(payload->'decoration') is distinct from 'boolean'
      or jsonb_typeof(payload->'size') is distinct from 'number'
      or (payload->>'size') !~ '^(1[6-9]|2[0-9]|3[0-6])$'
      or (payload->>'date' <> '' and (payload->>'date') !~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}$')
      then raise exception 'Invalid letter settings'; end if;
  if jsonb_typeof(payload->'flowers') is distinct from 'array' then raise exception 'Invalid bouquet'; end if;
  if jsonb_array_length(payload->'flowers')>24 then raise exception 'Too many stems'; end if;
  for stem in select value from jsonb_array_elements(payload->'flowers')
  loop
    if jsonb_typeof(stem->'type') is distinct from 'number' or (stem->>'type') !~ '^[0-7]$'
        or jsonb_typeof(stem->'note') is distinct from 'string' or char_length(stem->>'note')>200
        then raise exception 'Invalid stem'; end if;
  end loop;
  photo_path := payload->>'photo';
  if photo_path <> '' and (
      photo_path !~ ('^'||owner_id::text||'/'||gift_id::text||'/[0-9a-f-]{36}$')
      or not exists(select 1 from storage.objects where bucket_id='letter-photos' and name=photo_path)
  ) then raise exception 'Invalid photograph'; end if;
  available_from := nullif(payload->>'scheduled','')::timestamptz;
  expires_on := nullif(payload->>'expires','')::timestamptz;
  if new_pin is not null and new_pin !~ '^[0-9]{6,12}$' then raise exception 'Invalid access PIN'; end if;
  if publish and (jsonb_array_length(payload->'flowers')=0
      or btrim(payload->>'recipient')='' or btrim(payload->>'title')='' or btrim(payload->>'body')=''
      or (expires_on is not null and expires_on <= greatest(now(), available_from)))
      then raise exception 'Incomplete gift or invalid delivery dates'; end if;
  -- Keep a whitelist of fields in both snapshots.
  payload := payload - array(select key from jsonb_object_keys(payload) as keys(key) where key not in
    ('flowers','wrap','ribbon','arrangement','recipient','sender','title','body','theme','font','size','align','color','decoration','date','photo','scheduled','expires'));
  payload := jsonb_set(payload,'{flowers}',coalesce((
    select jsonb_agg(jsonb_build_object('type',value->'type','note',value->'note') order by ordinality)
    from jsonb_array_elements(payload->'flowers') with ordinality
  ),'[]'::jsonb));
  insert into public.gifts as existing (id,user_id,data,token)
  values (gift_id,owner_id,payload,case when publish then translate(encode(extensions.gen_random_bytes(32),'base64'),'+/=','-_') end)
  on conflict (id) do update set data=excluded.data,updated_at=now(),
    token=coalesce(existing.token,excluded.token)
  where existing.user_id=owner_id
  returning token into result_token;
  if not found then raise exception 'Gift unavailable'; end if;
  if publish then
    insert into public.gift_publications as existing(gift_id,data,scheduled_at,expires_at,access_pin_hash)
    values (save_gift.gift_id,payload,available_from,expires_on,extensions.crypt(new_pin,extensions.gen_salt('bf',10)))
    on conflict on constraint gift_publications_pkey do update set data=excluded.data,
      scheduled_at=excluded.scheduled_at,expires_at=excluded.expires_at,published_at=now(),
      access_pin_hash=case when clear_pin then null else coalesce(excluded.access_pin_hash,existing.access_pin_hash) end,
      pin_window_start=case when clear_pin or new_pin is not null then null else existing.pin_window_start end,
      pin_failures=case when clear_pin or new_pin is not null then 0 else existing.pin_failures end;
  end if;
  return result_token;
end;
$$;

create function public.manage_gift(gift_id uuid, action text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if action='delete' then
    delete from public.gifts where id=gift_id and user_id=auth.uid();
  elsif action in ('revoke','restore') then
    update public.gifts set revoked=(action='revoke'),updated_at=now()
      where id=gift_id and user_id=auth.uid() and token is not null;
  else
    raise exception 'Unknown gift action';
  end if;
  if not found then raise exception 'Gift unavailable'; end if;
end;
$$;

create function public.read_gift(gift_token text, access_pin text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare
  publication public.gift_publications%rowtype;
  attempts integer;
begin
  select published.* into publication
  from public.gifts gift join public.gift_publications published on published.gift_id=gift.id
  where gift.token=gift_token and not gift.revoked
    and (published.scheduled_at is null or published.scheduled_at <= now())
    and (published.expires_at is null or published.expires_at > now())
  for update of published;
  if not found then return null; end if;
  if publication.access_pin_hash is not null then
    if access_pin is null or access_pin !~ '^[0-9]{6,12}$' then
      return jsonb_build_object('pinRequired',true);
    end if;
    attempts := case when publication.pin_window_start > now()-interval '10 minutes' then publication.pin_failures else 0 end;
    if attempts >= 8 then return jsonb_build_object('pinRequired',true,'locked',true); end if;
    if extensions.crypt(access_pin,publication.access_pin_hash) <> publication.access_pin_hash then
      update public.gift_publications
      set pin_failures=attempts+1,pin_window_start=case when attempts=0 then now() else publication.pin_window_start end
      where gift_id=publication.gift_id;
      return jsonb_build_object('pinRequired',true,'incorrect',true);
    end if;
  end if;
  return jsonb_build_object('gift',publication.data - array['photo','scheduled','expires'], 'photo',publication.data->>'photo');
end;
$$;

revoke all on function public.save_gift(uuid,jsonb,boolean,text,boolean) from public, anon, authenticated;
revoke all on function public.manage_gift(uuid,text) from public, anon, authenticated;
revoke all on function public.read_gift(text,text) from public, anon, authenticated;
grant execute on function public.save_gift(uuid,jsonb,boolean,text,boolean), public.manage_gift(uuid,text) to authenticated;
grant execute on function public.read_gift(text,text) to service_role;
