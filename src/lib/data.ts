import { requireClient } from "./supabase";
import type { Ingredient, Recipe, Product, Quote, Bakery } from "./types";
export interface Data {
  ingredients: Ingredient[];
  recipes: Recipe[];
  products: Product[];
  quotes: Quote[];
  bakery: Bakery;
}
export const emptyBakery: Bakery = {
  name: "",
  owner: "",
  whatsapp: "",
  instagram: "",
  city: "",
  color: "#9c4761",
  message: "Obrigada por deixar a sua comemoração mais doce com a gente!",
  payment: "",
  validity_days: 7,
  logo_path: null,
};
export async function loadData(): Promise<Data> {
  const c = requireClient();
  const results = await Promise.all(
    ["ingredients", "recipes", "products", "quotes", "bakeries"].map((t) =>
      c.from(t).select("*").order("created_at", { ascending: false }),
    ),
  );
  for (const r of results) if (r.error) throw r.error;
  const [i, r, p, q, b] = results;
  return {
    ingredients: i.data as Ingredient[],
    recipes: r.data as Recipe[],
    products: p.data as Product[],
    quotes: q.data as Quote[],
    bakery: (b.data?.[0] as Bakery) || emptyBakery,
  };
}
export async function saveRecord(table: string, record: object) {
  const c = requireClient();
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user) throw new Error("Entre novamente para salvar.");
  const { error } = await c.from(table).upsert({ ...record, user_id: user.id });
  if (error) throw error;
}
export async function removeRecord(table: string, id: string) {
  const { error } = await requireClient().from(table).delete().eq("id", id);
  if (error) throw error;
}
export async function uploadImage(file: File, folder: "logos" | "products") {
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type))
    throw new Error("Use PNG, JPG ou WebP.");
  if (file.size > 2 * 1024 * 1024)
    throw new Error("A imagem deve ter até 2 MB.");
  const c = requireClient();
  const {
    data: { user },
  } = await c.auth.getUser();
  if (!user) throw new Error("Sessão expirada.");
  const path = `${user.id}/${folder}/${crypto.randomUUID()}.${file.type.split("/")[1]}`;
  const { error } = await c.storage
    .from("brand-assets")
    .upload(path, file, { contentType: file.type });
  if (error) throw error;
  return path;
}
export async function imageUrl(path: string) {
  const { data, error } = await requireClient()
    .storage.from("brand-assets")
    .createSignedUrl(path, 300);
  if (error) throw error;
  return data.signedUrl;
}
export async function changeQuoteStatus(id: string, status: string) {
  const { error } = await requireClient()
    .from("quotes")
    .update({ status })
    .eq("id", id);
  if (error) throw error;
}
