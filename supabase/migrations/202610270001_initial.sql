begin;
create table public.profiles (id uuid primary key references auth.users on delete cascade, display_name text not null default '', created_at timestamptz not null default now());
create table public.bakeries (id uuid primary key default gen_random_uuid(), user_id uuid not null unique references auth.users on delete cascade, name text not null, owner text not null default '', whatsapp text not null default '', instagram text not null default '', city text not null default '', color text not null default '#9c4761' check(color ~ '^#[0-9a-fA-F]{6}$'), message text not null default '', payment text not null default '', validity_days integer not null default 7 check(validity_days between 1 and 365), logo_path text, created_at timestamptz not null default now(), updated_at timestamptz not null default now());
create table public.ingredients (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, name text not null check(length(trim(name))>0), price numeric not null check(price>=0), quantity numeric not null check(quantity>0), unit text not null check(unit in ('g','kg','ml','L','un')), notes text not null default '', created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id));
create table public.recipes (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, name text not null check(length(trim(name))>0), description text not null default '', category text not null default '', yield_quantity numeric not null check(yield_quantity>0), yield_unit text not null default 'un', packaging numeric not null default 0 check(packaging>=0), labor numeric not null default 0 check(labor>=0), other numeric not null default 0 check(other>=0), waste numeric not null default 0 check(waste>=0 and waste<100), items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items)>0), created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id));
create table public.recipe_ingredients (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, recipe_id uuid not null, ingredient_id uuid not null, quantity numeric not null check(quantity>0), unit text not null check(unit in ('g','kg','ml','L','un')), foreign key(recipe_id,user_id) references public.recipes(id,user_id) on delete cascade, foreign key(ingredient_id,user_id) references public.ingredients(id,user_id) on delete restrict, created_at timestamptz not null default now());
create table public.products (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, name text not null check(length(trim(name))>0), description text not null default '', category text not null default '', recipe_id uuid, recipe_quantity numeric not null default 1 check(recipe_quantity>0), manual_cost numeric not null default 0 check(manual_cost>=0), packaging numeric not null default 0 check(packaging>=0), price numeric(14,2) not null check(price>=0), unit text not null default 'unidade', active boolean not null default true, photo_path text, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id), foreign key(recipe_id,user_id) references public.recipes(id,user_id) on delete restrict);
create table public.quotes (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, customer text not null check(length(trim(customer))>0), whatsapp text not null default '', event_date text not null default '', delivery_date text not null default '', address text not null default '', status text not null default 'rascunho' check(status in ('rascunho','enviado','aprovado','recusado','expirado')), discount numeric not null default 0 check(discount>=0), discount_type text not null default 'fixed' check(discount_type in ('fixed','percent')), delivery numeric(14,2) not null default 0 check(delivery>=0), validity date not null, payment text not null default '', deposit numeric(14,2) not null default 0 check(deposit>=0), notes text not null default '', message text not null default '', template text not null default 'delicado' check(template in ('delicado','elegante','moderno')), items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items)>0), total numeric(14,2) not null default 0, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(id,user_id));
create table public.quote_items (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, quote_id uuid not null, name text not null, description text not null default '', quantity numeric not null check(quantity>0), price numeric(14,2) not null check(price>=0), subtotal numeric(14,2) generated always as (round(quantity*price,2)) stored, foreign key(quote_id,user_id) references public.quotes(id,user_id) on delete cascade, created_at timestamptz not null default now());
create table public.plans (id text primary key, name text not null, price_cents integer not null check(price_cents>=0), recurring boolean not null default false, available boolean not null default false);
insert into public.plans values ('fundadora','Plano Fundadora',4790,false,false),('mensal','Plano Mensal',1490,true,false);
create table public.entitlements (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, plan_id text not null references public.plans, expires_at timestamptz, active boolean not null default true, created_at timestamptz not null default now());
create table public.payment_orders (id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, plan_id text not null references public.plans, amount_cents integer not null check(amount_cents>0), status text not null default 'pending' check(status in ('pending','paid','cancelled','refunded')), external_id text unique, created_at timestamptz not null default now());

-- Parent JSON is the atomic editing representation; normalized child tables are derived,
-- never writable directly by clients. Composite FKs enforce ownership at database level.
create function public.validate_recipe() returns trigger language plpgsql set search_path='' as $$
declare item jsonb; purchase_unit text;
begin
  for item in select * from jsonb_array_elements(new.items) loop
    select unit into purchase_unit from public.ingredients where id=(item->>'ingredient_id')::uuid and user_id=new.user_id;
    if purchase_unit is null then raise exception 'Ingrediente inválido'; end if;
    if (case when purchase_unit in ('g','kg') then 'mass' when purchase_unit in ('ml','L') then 'volume' else 'count' end) <> (case when item->>'unit' in ('g','kg') then 'mass' when item->>'unit' in ('ml','L') then 'volume' when item->>'unit'='un' then 'count' else 'invalid' end) then raise exception 'Unidades incompatíveis'; end if;
    if (item->>'quantity')::numeric<=0 then raise exception 'Quantidade inválida'; end if;
  end loop;
  return new;
end $$;
create trigger validate_recipe before insert or update on public.recipes for each row execute function public.validate_recipe();
create function public.sync_recipe_items() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.recipe_ingredients where recipe_id=new.id;
 insert into public.recipe_ingredients(user_id,recipe_id,ingredient_id,quantity,unit) select new.user_id,new.id,(i->>'ingredient_id')::uuid,(i->>'quantity')::numeric,i->>'unit' from jsonb_array_elements(new.items) i;
 return new;
end $$;
create trigger sync_recipe after insert or update of items on public.recipes for each row execute function public.sync_recipe_items();
create function public.validate_quote() returns trigger language plpgsql set search_path='' as $$
declare item jsonb; subtotal numeric:=0; disc numeric;
begin
 if tg_op='UPDATE' and old.status<>'rascunho' and new.status='rascunho' then raise exception 'Não é possível reabrir um orçamento enviado'; end if;
 if tg_op='UPDATE' and old.status<>'rascunho' and (to_jsonb(new)-'status'-'updated_at') is distinct from (to_jsonb(old)-'status'-'updated_at') then raise exception 'Orçamento enviado é imutável. Duplique para alterar.'; end if;
 for item in select * from jsonb_array_elements(new.items) loop
   if trim(coalesce(item->>'name',''))='' or (item->>'quantity')::numeric<=0 or (item->>'price')::numeric<0 or item->>'quantity' is null or item->>'price' is null then raise exception 'Item inválido'; end if;
   if nullif(item->>'product_id','') is not null and not exists(select 1 from public.products where id=(item->>'product_id')::uuid and user_id=new.user_id) then raise exception 'Produto inválido'; end if;
   subtotal:=subtotal+round((item->>'quantity')::numeric * round((item->>'price')::numeric,2),2);
 end loop;
 if new.discount_type='percent' and new.discount>100 then raise exception 'Desconto inválido'; end if;
 disc:=case when new.discount_type='percent' then round(subtotal*new.discount/100,2) else round(new.discount,2) end;
 if disc>subtotal then raise exception 'Desconto maior que subtotal'; end if;
 new.total:=subtotal-disc+new.delivery;
 if new.deposit>new.total then raise exception 'Entrada maior que total'; end if;
 return new;
end $$;
create trigger validate_quote before insert or update on public.quotes for each row execute function public.validate_quote();
create function public.sync_quote_items() returns trigger language plpgsql security definer set search_path='' as $$
begin
 delete from public.quote_items where quote_id=new.id;
 insert into public.quote_items(user_id,quote_id,name,description,quantity,price) select new.user_id,new.id,i->>'name',coalesce(i->>'description',''),(i->>'quantity')::numeric,round((i->>'price')::numeric,2) from jsonb_array_elements(new.items) i;
 return new;
end $$;
create trigger sync_quote after insert or update of items on public.quotes for each row execute function public.sync_quote_items();
create function public.touch_updated() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
do $$ declare t text; begin
 foreach t in array array['bakeries','ingredients','recipes','products','quotes'] loop
 execute format('create trigger touch_updated before update on public.%I for each row execute function public.touch_updated()',t);
 end loop;
 foreach t in array array['bakeries','ingredients','recipes','products','quotes','recipe_ingredients','quote_items','entitlements','payment_orders'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('create index on public.%I(user_id)',t);
 execute format('create policy own_select on public.%I for select to authenticated using (user_id=(select auth.uid()))',t);
 if t in ('bakeries','ingredients','recipes','products','quotes') then
 execute format('create policy own_insert on public.%I for insert to authenticated with check(user_id=(select auth.uid()))',t);
 execute format('create policy own_update on public.%I for update to authenticated using(user_id=(select auth.uid())) with check(user_id=(select auth.uid()))',t);
 execute format('create policy own_delete on public.%I for delete to authenticated using(user_id=(select auth.uid()))',t);
 end if;
 end loop;
end $$;
alter table public.profiles enable row level security;
create policy own_profile_select on public.profiles for select to authenticated using(id=(select auth.uid()));
create policy own_profile_insert on public.profiles for insert to authenticated with check(id=(select auth.uid()));
create policy own_profile_update on public.profiles for update to authenticated using(id=(select auth.uid())) with check(id=(select auth.uid()));
create policy own_profile_delete on public.profiles for delete to authenticated using(id=(select auth.uid()));
alter table public.plans enable row level security;
create policy read_plans on public.plans for select to authenticated using(true);
-- No client mutation policies for plans, entitlements or payment orders.
revoke all on function public.sync_recipe_items() from public;
revoke all on function public.sync_quote_items() from public;
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values ('brand-assets','brand-assets',false,2097152,array['image/png','image/jpeg','image/webp']);
create policy asset_select on storage.objects for select to authenticated using(bucket_id='brand-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy asset_insert on storage.objects for insert to authenticated with check(bucket_id='brand-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy asset_update on storage.objects for update to authenticated using(bucket_id='brand-assets' and (storage.foldername(name))[1]=(select auth.uid())::text) with check(bucket_id='brand-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy asset_delete on storage.objects for delete to authenticated using(bucket_id='brand-assets' and (storage.foldername(name))[1]=(select auth.uid())::text);
create function public.protect_ingredient_unit() returns trigger language plpgsql set search_path='' as $$
begin
 if new.unit<>old.unit and exists(select 1 from public.recipe_ingredients ri where ri.ingredient_id=old.id and (case when ri.unit in ('g','kg') then 1 when ri.unit in ('ml','L') then 2 else 3 end)<>(case when new.unit in ('g','kg') then 1 when new.unit in ('ml','L') then 2 else 3 end)) then raise exception 'Unidade incompatível com receitas existentes'; end if;
 return new;
end $$;
create trigger protect_ingredient_unit before update of unit on public.ingredients for each row execute function public.protect_ingredient_unit();
-- PostgreSQL numeric accepts special values; exclude non-finite amounts explicitly.
do $$ declare t text; col text; begin
 foreach t in array array['ingredients','recipes','products','quotes','recipe_ingredients','quote_items'] loop
 for col in select column_name from information_schema.columns where table_schema='public' and table_name=t and data_type='numeric' loop
 execute format('alter table public.%I add check (%I > ''-Infinity''::numeric and %I < ''Infinity''::numeric)',t,col,col);
 end loop;
 end loop;
end $$;
commit;
