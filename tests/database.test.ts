import { PGlite } from "@electric-sql/pglite";
import { readFileSync } from "node:fs";
import { beforeAll, afterAll, it, expect } from "vitest";
const db = new PGlite();
const a = "11111111-1111-4111-8111-111111111111",
  b = "22222222-2222-4222-8222-222222222222",
  i = "33333333-3333-4333-8333-333333333333",
  q = "44444444-4444-4444-8444-444444444444";
async function asUser(id: string) {
  await db.exec(
    `reset role;set role authenticated;select set_config('request.jwt.claim.sub','${id}',false);`,
  );
}
beforeAll(async () => {
  await db.exec(
    `create role authenticated;create role anon;create schema auth;create schema storage;create table auth.users(id uuid primary key);create function auth.uid() returns uuid language sql stable as $$select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid$$;create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);create table storage.objects(id uuid primary key default gen_random_uuid(),bucket_id text,name text);alter table storage.objects enable row level security;create function storage.foldername(text) returns text[] language sql immutable as $$select string_to_array($1,'/')$$;insert into auth.users values('${a}'),('${b}');`,
  );
  await db.exec(
    readFileSync("supabase/migrations/202610270001_initial.sql", "utf8"),
  );
  await db.exec(readFileSync("supabase/migrations/202610270002_authenticated_grants.sql", "utf8"));
  await db.exec(
    `grant usage on schema auth,storage to authenticated;grant select,insert,update,delete on all tables in schema storage to authenticated;grant execute on function auth.uid() to authenticated;`,
  );
});
afterAll(() => db.close());
it("aplica a migration e permite cadastro e edição da própria conta", async () => {
  await asUser(a);
  await db.query(
    `insert into public.ingredients(id,user_id,name,price,quantity,unit) values($1,$2,'Chocolate',32,1,'kg')`,
    [i, a],
  );
  await db.query(`update public.ingredients set price=40 where id=$1`, [i]);
  expect(
    (
      await db.query<{ price: string }>(
        `select price from public.ingredients where id=$1`,
        [i],
      )
    ).rows[0].price,
  ).toBe("40");
});
it("bloqueia leitura, alteração, exclusão e inserção para outra usuária", async () => {
  await asUser(b);
  expect(
    (await db.query("select * from public.ingredients")).rows,
  ).toHaveLength(0);
  await db.query(`update public.ingredients set price=1 where id=$1`, [i]);
  await db.query(`delete from public.ingredients where id=$1`, [i]);
  await expect(
    db.query(
      `insert into public.ingredients(user_id,name,price,quantity,unit) values($1,'Ataque',1,1,'g')`,
      [a],
    ),
  ).rejects.toThrow(/row-level security|permission denied/);
  await asUser(a);
  expect(
    (await db.query("select * from public.ingredients")).rows,
  ).toHaveLength(1);
});
it("bloqueia associação a ingredientes de outra conta por requisição direta", async () => {
  await asUser(b);
  await expect(
    db.query(
      `insert into public.recipes(user_id,name,yield_quantity,items) values($1,'Teste',1,$2)`,
      [b, JSON.stringify([{ ingredient_id: i, quantity: "1", unit: "kg" }])],
    ),
  ).rejects.toThrow(/inválido/);
});
it("mantém histórico, calcula total no servidor e bloqueia alterações após envio", async () => {
  await asUser(a);
  await db.query(
    `insert into public.quotes(id,user_id,customer,validity,items,total) values($1,$2,'Cliente','2026-12-31',$3,999)`,
    [
      q,
      a,
      JSON.stringify([
        {
          product_id: null,
          name: "Brigadeiro",
          description: "Tradicional",
          quantity: "3",
          price: "2.50",
        },
      ]),
    ],
  );
  expect(
    (await db.query<{ total: string }>("select total from public.quotes"))
      .rows[0].total,
  ).toBe("7.50");
  await db.query(`update public.quotes set status='enviado' where id=$1`, [q]);
  await expect(
    db.query(`update public.quotes set customer='Alterada' where id=$1`, [q]),
  ).rejects.toThrow(/imutável/);
  await expect(
    db.query(`update public.quotes set status='rascunho' where id=$1`, [q]),
  ).rejects.toThrow(/reabrir/);
  await expect(
    db.query(
      `update public.quote_items set price=1 where quote_id=$1 returning *`,
      [q],
    ),
  ).rejects.toThrow(/permission denied/);
});
it("isola itens, arquivos e bloqueia concessão de acesso premium", async () => {
  await asUser(b);
  expect(
    (await db.query("select * from public.quote_items")).rows,
  ).toHaveLength(0);
  await expect(
    db.query(
      `insert into public.entitlements(user_id,plan_id) values($1,'fundadora')`,
      [b],
    ),
  ).rejects.toThrow(/row-level security|permission denied/);
  await expect(
    db.query(
      `insert into storage.objects(bucket_id,name) values('brand-assets',$1)`,
      [a + "/logos/test.png"],
    ),
  ).rejects.toThrow(/row-level security|permission denied/);
  await db.query(
    `insert into storage.objects(bucket_id,name) values('brand-assets',$1)`,
    [b + "/logos/test.png"],
  );
  await asUser(a);
  expect((await db.query("select * from storage.objects")).rows).toHaveLength(
    0,
  );
});
it("preserva preço após edição do catálogo e isola produtos e orçamentos", async () => {
  await asUser(a);
  const p = "55555555-5555-4555-8555-555555555555",
    draft = "66666666-6666-4666-8666-666666666666";
  await db.query(
    `insert into public.products(id,user_id,name,price) values($1,$2,'Caixa de doces',15)`,
    [p, a],
  );
  await db.query(
    `insert into public.quotes(id,user_id,customer,validity,items) values($1,$2,'Histórico','2026-12-31',$3)`,
    [
      draft,
      a,
      JSON.stringify([
        { product_id: p, name: "Caixa de doces", quantity: 2, price: 15 },
      ]),
    ],
  );
  await db.query(
    `update public.quotes set customer='Cliente atualizado' where id=$1`,
    [draft],
  );
  await db.query(`update public.products set price=99 where id=$1`, [p]);
  expect(
    (
      await db.query<{ price: string }>(
        `select price from public.quote_items where quote_id=$1`,
        [draft],
      )
    ).rows[0].price,
  ).toBe("15.00");
  await asUser(b);
  expect((await db.query("select * from public.products")).rows).toHaveLength(
    0,
  );
  expect((await db.query("select * from public.quotes")).rows).toHaveLength(0);
  await expect(
    db.query(
      `insert into public.quotes(user_id,customer,validity,items) values($1,'Inválido','2026-12-31',$2)`,
      [
        b,
        JSON.stringify([
          { product_id: p, name: "Caixa", quantity: 1, price: 15 },
        ]),
      ],
    ),
  ).rejects.toThrow(/inválido/);
});
it("bloqueia transferência de propriedade e valores não finitos", async () => {
  await asUser(a);
  await expect(
    db.query(`update public.ingredients set user_id=$1 where id=$2`, [b, i]),
  ).rejects.toThrow(/row-level security|permission denied/);
  await expect(
    db.query(`update public.ingredients set price='NaN' where id=$1`, [i]),
  ).rejects.toThrow();
});
