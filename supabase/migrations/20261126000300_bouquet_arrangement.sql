create or replace function public.save_gift(gift_id uuid, payload jsonb, publish boolean, new_pin text default null, clear_pin boolean default false)
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
      or payload->>'wrap' not in ('Classic cream','Blush pink','Kraft paper','Sage green','Vintage floral','Lavender gingham','Midnight stars','Botanical vellum','Rose polka dots')
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
  if (payload ? 'noteMode' and (jsonb_typeof(payload->'noteMode') <> 'string' or payload->>'noteMode' not in ('flowers','bouquet')))
     or (payload ? 'bouquetNote' and (jsonb_typeof(payload->'bouquetNote') <> 'string' or char_length(payload->>'bouquetNote') > 1000))
     then raise exception 'Invalid bouquet note'; end if;
  if payload ? 'fold' and (jsonb_typeof(payload->'fold') <> 'string' or payload->>'fold' not in ('Classic fold','Layered fan','Scalloped sleeve','Open cone'))
    then raise exception 'Invalid wrapper shape'; end if;
  if jsonb_typeof(payload->'flowers') is distinct from 'array' then raise exception 'Invalid bouquet'; end if;
  if jsonb_array_length(payload->'flowers')>24 then raise exception 'Too many stems'; end if;
  for stem in select value from jsonb_array_elements(payload->'flowers')
  loop
    if jsonb_typeof(stem->'type') is distinct from 'number' or (stem->>'type') !~ '^[0-7]$'
        or jsonb_typeof(stem->'note') is distinct from 'string' or char_length(stem->>'note')>200
        then raise exception 'Invalid stem'; end if;
    if stem ? 'position' then
      if jsonb_typeof(stem->'position') is distinct from 'object'
        or jsonb_typeof(stem->'position'->'x') is distinct from 'number'
        or jsonb_typeof(stem->'position'->'y') is distinct from 'number'
        or (stem->'position'->>'x') !~ '^[0-9]{1,3}$'
        or (stem->'position'->>'y') !~ '^[0-9]{1,3}$'
        then raise exception 'Invalid flower position'; end if;
      if (stem->'position'->>'x')::int not between 34 and 326
        or (stem->'position'->>'y')::int not between 38 and 181
        then raise exception 'Invalid flower position'; end if;
    end if;
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
    ('flowers','noteMode','bouquetNote','fold','wrap','ribbon','arrangement','recipient','sender','title','body','theme','font','size','align','color','decoration','date','photo','scheduled','expires'));
  payload := jsonb_set(payload,'{flowers}',coalesce((
    select jsonb_agg(jsonb_build_object('type',value->'type','note',value->'note') || case when value ? 'position' then jsonb_build_object('position',jsonb_build_object('x',value->'position'->'x','y',value->'position'->'y')) else '{}'::jsonb end order by ordinality)
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
    values (save_gift.gift_id,
      case when payload->>'noteMode'='bouquet'
        then jsonb_set(payload,'{flowers}',coalesce((select jsonb_agg(value || '{"note":""}'::jsonb order by ordinality) from jsonb_array_elements(payload->'flowers') with ordinality),'[]'::jsonb))
        else payload - 'bouquetNote' end,
      available_from,expires_on,extensions.crypt(new_pin,extensions.gen_salt('bf',10)))
    on conflict on constraint gift_publications_pkey do update set data=excluded.data,
      scheduled_at=excluded.scheduled_at,expires_at=excluded.expires_at,published_at=now(),
      access_pin_hash=case when clear_pin then null else coalesce(excluded.access_pin_hash,existing.access_pin_hash) end,
      pin_window_start=case when clear_pin or new_pin is not null then null else existing.pin_window_start end,
      pin_failures=case when clear_pin or new_pin is not null then 0 else existing.pin_failures end;
  end if;
  return result_token;
end;
$$;

