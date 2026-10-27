export type Unit = "g" | "kg" | "ml" | "L" | "un";
export interface Ingredient {
  id: string;
  name: string;
  price: string;
  quantity: string;
  unit: Unit;
  notes: string;
}
export interface RecipeItem {
  ingredient_id: string;
  quantity: string;
  unit: Unit;
}
export interface Recipe {
  id: string;
  name: string;
  description: string;
  category: string;
  yield_quantity: string;
  yield_unit: string;
  packaging: string;
  labor: string;
  other: string;
  waste: string;
  items: RecipeItem[];
}
export interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  recipe_id: string | null;
  recipe_quantity: string;
  manual_cost: string;
  packaging: string;
  price: string;
  unit: string;
  active: boolean;
  photo_path: string | null;
}
export type QuoteStatus =
  "rascunho" | "enviado" | "aprovado" | "recusado" | "expirado";
export interface QuoteItem {
  product_id: string | null;
  name: string;
  description: string;
  quantity: string;
  price: string;
}
export interface Quote {
  id: string;
  created_at?: string;
  customer: string;
  whatsapp: string;
  event_date: string;
  delivery_date: string;
  address: string;
  status: QuoteStatus;
  discount: string;
  discount_type: "fixed" | "percent";
  delivery: string;
  validity: string;
  payment: string;
  deposit: string;
  notes: string;
  message: string;
  template: "delicado" | "elegante" | "moderno";
  items: QuoteItem[];
  total?: string;
}
export interface Bakery {
  id?: string;
  name: string;
  owner: string;
  whatsapp: string;
  instagram: string;
  city: string;
  color: string;
  message: string;
  payment: string;
  validity_days: number;
  logo_path: string | null;
}
