begin;
-- Explicit privileges: do not depend on project-specific default grants.
revoke all on table public.profiles, public.bakeries, public.ingredients,
  public.recipes, public.recipe_ingredients, public.products, public.quotes,
  public.quote_items, public.plans, public.entitlements, public.payment_orders
  from anon, authenticated;
grant usage on schema public to authenticated;
grant select, insert, update, delete on table public.profiles, public.bakeries,
  public.ingredients, public.recipes, public.products, public.quotes
  to authenticated;
-- Child rows are maintained by triggers. Commercial access is server-managed.
grant select on table public.recipe_ingredients, public.quote_items,
  public.plans, public.entitlements, public.payment_orders to authenticated;
commit;
