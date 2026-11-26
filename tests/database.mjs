import assert from 'node:assert/strict'
import {readFile} from 'node:fs/promises'
import {PGlite} from '@electric-sql/pglite'
import {pgcrypto} from '@electric-sql/pglite/contrib/pgcrypto'

const db = new PGlite({extensions:{pgcrypto}})
await db.exec(`
  create schema auth;
  create schema storage;
  create schema extensions;
  create role anon;
  create role authenticated;
  create role service_role;
  create table auth.users(id uuid primary key);
  create function auth.uid() returns uuid language sql stable
    as $$ select nullif(current_setting('test.user_id',true),'')::uuid $$;
  grant usage on schema auth to authenticated;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit int,allowed_mime_types text[]);
  create table storage.objects(bucket_id text,name text);
  create function storage.foldername(text) returns text[] language sql immutable as $$ select string_to_array($1,'/') $$;
`)
await db.exec(await readFile(new URL('../supabase/migrations/20261126000100_gifts.sql',import.meta.url),'utf8'))
await db.exec(await readFile(new URL('../supabase/migrations/20261126000200_bouquet_notes.sql',import.meta.url),'utf8'))

const owner='a0000000-0000-4000-8000-000000000001'
const other='a0000000-0000-4000-8000-000000000002'
const giftId='b0000000-0000-4000-8000-000000000001'
const anotherId='b0000000-0000-4000-8000-000000000002'
await db.query('insert into auth.users values ($1),($2)',[owner,other])
async function act(role,user=''){
  await db.exec('reset role')
  await db.query("select set_config('test.user_id',$1,false)",[user])
  await db.exec('set role '+role)
}
const gift={
  flowers:[{type:0,note:'My favorite memory',extra:'discard this'},{type:6,note:''}],
  wrap:'Vintage floral',ribbon:'Lavender',arrangement:'Wildflower',recipient:'Lina',sender:'Jamie',
  title:'For you',body:'First line\nSecond line',theme:'Floral stationery',font:'Caveat',
  size:26,align:'left',color:'#40312d',decoration:true,date:'',photo:'',scheduled:'',expires:''
}
const save=async(payload,publish=false,id=giftId,pin=null,clearPin=false)=>(await db.query('select public.save_gift($1,$2,$3,$4,$5) as token',[id,JSON.stringify(payload),publish,pin,clearPin])).rows[0].token
const read=async(token,pin=null)=>(await db.query('select public.read_gift($1,$2) as result',[token,pin])).rows[0].result
const manage=async(action)=>db.query('select public.manage_gift($1,$2)',[giftId,action])
await act('authenticated',owner)
assert.equal(await save(gift),null)
assert.equal((await db.query('select data from public.gifts')).rows[0].data.body,gift.body)
await assert.rejects(save({...gift,flowers:[]},true))
await assert.rejects(save({...gift,flowers:[{type:8,note:''}]},true))
await assert.rejects(save({...gift,photo:other+'/'+giftId+'/'+giftId},true))
const token=await save({...gift,private:'discard this'},true)
const distinctToken=await save(gift,true,anotherId,'831729')
assert.match(token,/^[A-Za-z0-9_-]{43}$/)
assert.notEqual(token,distinctToken)
assert.equal((await db.query('select gift_id from public.gift_publications')).rows.length,2)
await assert.rejects(db.query('select access_pin_hash from public.gift_publications'))
await save({...gift,body:'This is an unpublished edit'})
await act('service_role')
assert.deepEqual(await read(distinctToken),{pinRequired:true})
assert.equal((await read(distinctToken,'831729')).gift.body,gift.body)
for(let i=0;i<8;i++)assert.equal((await read(distinctToken,'000000')).incorrect,true)
assert.deepEqual(await read(distinctToken,'831729'),{pinRequired:true,locked:true})
await act('authenticated',owner)
await save(gift,true,anotherId,null,true)
await act('service_role')
assert.equal((await read(distinctToken)).gift.body,gift.body)
const published=await read(token)
assert.equal(published.gift.body,gift.body)
assert.equal(published.gift.wrap,'Vintage floral')
assert.equal(published.gift.flowers[0].note,'My favorite memory')
assert.equal(published.gift.flowers[0].extra,undefined)
assert.equal(published.gift.private,undefined)
await act('authenticated',owner)
const bouquetGift={...gift,noteMode:'bouquet',bouquetNote:'For all our mornings together.'}
await assert.rejects(save({...bouquetGift,noteMode:'invalid'},true))
await assert.rejects(save({...bouquetGift,bouquetNote:'x'.repeat(1001)},true))
await save(bouquetGift,true)
assert.equal((await db.query('select data from public.gifts where id=$1',[giftId])).rows[0].data.flowers[0].note,'My favorite memory')
await act('service_role')
assert.equal((await read(token)).gift.bouquetNote,bouquetGift.bouquetNote)
assert.equal((await read(token)).gift.flowers[0].note,'')
await act('authenticated',owner)
await save({...bouquetGift,noteMode:'flowers'},true)
await act('service_role')
assert.equal((await read(token)).gift.bouquetNote,undefined)
assert.equal((await read(token)).gift.flowers[0].note,'My favorite memory')
await act('anon')
await assert.rejects(read(token))
await assert.rejects(db.query('select * from public.gifts'))
await assert.rejects(save(gift,true))
await act('authenticated',other)
assert.equal((await db.query('select id from public.gifts')).rows.length,0)
assert.equal((await db.query('select gift_id from public.gift_publications')).rows.length,0)
await assert.rejects(save(gift,true))
await assert.rejects(manage('revoke'))
await act('authenticated',owner)
await manage('revoke')
await act('service_role')
assert.equal(await read(token),null)
await act('authenticated',owner)
await manage('restore')
await act('service_role')
assert.equal((await read(token)).gift.recipient,gift.recipient)
await act('authenticated',owner)
await save({...gift,scheduled:new Date(Date.now()+86400000).toISOString()},true)
await act('service_role')
assert.equal(await read(token),null)
await act('authenticated',owner)
await assert.rejects(save({...gift,expires:new Date(Date.now()-86400000).toISOString()},true))
await save(gift,true)
await db.exec('reset role')
await db.query("update public.gift_publications set expires_at=now()-interval '1 second' where gift_id=$1",[giftId])
await act('service_role')
assert.equal(await read(token),null)
await act('authenticated',owner)
await manage('delete')
await act('service_role')
assert.equal(await read(token),null)
await db.close()
console.log('Database checks passed: validation, snapshots, token generation, RLS, PIN hashing and throttling, revocation, restore, scheduling, expiration, deletion.')


