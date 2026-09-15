-- CORUJA LINKS: schema and policies. Contains no credentials.
begin;
create table if not exists public.links (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
 code text not null unique,page_type text not null,internal_name text not null,
 title text,main_text text,description text,image_url text,attachment_url text,
 status text not null default 'active' check(status in ('active','inactive')),
 access_count bigint not null default 0,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.links enable row level security;
do $$begin
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='links' and policyname='Users can view their own links') then create policy "Users can view their own links" on public.links for select to authenticated using(auth.uid()=owner_id);end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='links' and policyname='Users can create their own links') then create policy "Users can create their own links" on public.links for insert to authenticated with check(auth.uid()=owner_id);end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='links' and policyname='Users can update their own links') then create policy "Users can update their own links" on public.links for update to authenticated using(auth.uid()=owner_id) with check(auth.uid()=owner_id);end if;
 if not exists(select 1 from pg_policies where schemaname='public' and tablename='links' and policyname='Users can delete their own links') then create policy "Users can delete their own links" on public.links for delete to authenticated using(auth.uid()=owner_id);end if;
end$$;
create or replace function public.open_link(p_code text) returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
 if p_code is null or p_code !~ '^[A-Z0-9]{6,16}$' then return null; end if;
 update public.links set access_count = access_count + 1 where code=p_code and status='active'
 returning jsonb_build_object('code',code,'page_type',page_type,'title',title,'main_text',main_text,'description',description,'image_url',case when auth.uid()=owner_id then image_url else null end,'created_at',created_at) into result;
 return result;
end; $$;
revoke all on function public.open_link(text) from public;
grant execute on function public.open_link(text) to anon, authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('link-images','link-images',false,5242880,array['image/jpeg','image/png','image/webp']) on conflict(id) do nothing;
do $$begin
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Owners upload link images') then create policy "Owners upload link images" on storage.objects for insert to authenticated with check(bucket_id='link-images' and (storage.foldername(name))[1]=(select auth.uid())::text);end if;
 if not exists(select 1 from pg_policies where schemaname='storage' and tablename='objects' and policyname='Owners read image metadata') then create policy "Owners read image metadata" on storage.objects for select to authenticated using(bucket_id='link-images' and (storage.foldername(name))[1]=(select auth.uid())::text);end if;
end$$;

create table if not exists public.ai_usage (owner_id uuid primary key references auth.users(id) on delete cascade, day date not null default current_date, requests integer not null default 0, last_request timestamptz not null default now());
alter table public.ai_usage enable row level security;
revoke all on public.ai_usage from anon,authenticated;
create or replace function public.consume_ai_quota(p_user uuid) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 insert into public.ai_usage(owner_id,day,requests,last_request) values(p_user,current_date,1,now())
 on conflict(owner_id) do update set day=current_date,requests=case when ai_usage.day=current_date then ai_usage.requests+1 else 1 end,last_request=now()
 where (ai_usage.day<>current_date or ai_usage.requests<30) and ai_usage.last_request<now()-interval '10 seconds'
 returning requests into n;
 return n is not null;
end;$$;
revoke all on function public.consume_ai_quota(uuid) from public,anon,authenticated;
grant execute on function public.consume_ai_quota(uuid) to service_role;
commit;
