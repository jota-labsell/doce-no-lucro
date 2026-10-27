import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  Navigate,
  Link,
  useLocation,
} from "react-router-dom";
import type { Session } from "@supabase/supabase-js";
import {
  LayoutDashboard,
  Wheat,
  BookOpen,
  Calculator,
  Package,
  FileText,
  Store,
  Settings as SettingsIcon,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import { loadData } from "./lib/data";
import type { Data } from "./lib/data";
import { ErrorBox, errorText } from "./components/ui";
import { Landing, Legal } from "./pages/Landing";
import { Auth } from "./pages/Auth";
import { Ingredients, Recipes, Products, Pricing } from "./pages/Workshop";
import { Quotes } from "./pages/Quotes";
import { Dashboard, BakeryPage, Settings } from "./pages/Account";
const nav = [
  ["", "Visão geral", LayoutDashboard],
  ["ingredientes", "Ingredientes", Wheat],
  ["receitas", "Receitas", BookOpen],
  ["precificacao", "Precificação", Calculator],
  ["produtos", "Meus produtos", Package],
  ["orcamentos", "Orçamentos", FileText],
  ["confeitaria", "Minha confeitaria", Store],
  ["configuracoes", "Configurações", SettingsIcon],
] as const;
function Workspace({ session }: { session: Session | null }) {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const location = useLocation();
  useEffect(() => setMenu(false), [location.pathname]);
  async function refresh() {
    setData(await loadData());
    setError("");
  }
  useEffect(() => {
    if (session)
      loadData()
        .then(setData)
        .catch((e) => setError(errorText(e)));
  }, [session]);
  if (!session) return <Navigate to="/entrar" replace />;
  const props = data ? { data, refresh } : null;
  return (
    <div className="workspace">
      <aside className={menu ? "sidebar open" : "sidebar"}>
        <Link to="/app" className="brand">
          ✿ Doce no Lucro
        </Link>
        <p className="sidebar-caption">CUIDE DO SEU NEGÓCIO</p>
        <nav>
          {nav.map(([path, label, Icon]) => (
            <NavLink
              key={path}
              end={path === ""}
              to={"/app" + (path ? "/" + path : "")}
            >
              <Icon size={19} />
              {label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <span className="badge">FEITO COM CARINHO</span>
          <p>
            Seu talento merece
            <br />
            um negócio que floresce.
          </p>
          <button
            className="text-button"
            onClick={async () => {
              const { error } = await supabase!.auth.signOut();
              if (error) setError(error.message);
            }}
          >
            <LogOut size={16} /> Sair da conta
          </button>
        </div>
      </aside>
      {menu && (
        <button
          className="menu-backdrop"
          aria-label="Fechar menu"
          onClick={() => setMenu(false)}
        />
      )}
      <div className="workspace-main">
        <div className="topbar">
          <button
            className="mobile-menu secondary"
            aria-label={menu ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenu(!menu)}
          >
            {menu ? <X /> : <Menu />}
          </button>
          <span>Organização que dá gosto.</span>
          <div className="user-chip">
            <span>{session.user.email?.slice(0, 1).toUpperCase()}</span>
            <small>{data?.bakery.name || "Minha confeitaria"}</small>
          </div>
        </div>
        <main className="content">
          <ErrorBox error={error} />
          {error && (
            <button
              className="secondary"
              onClick={() => refresh().catch((e) => setError(errorText(e)))}
            >
              Tentar carregar novamente
            </button>
          )}
          {!props && !error && <p role="status">Carregando sua confeitaria…</p>}
          {props && (
            <Routes>
              <Route index element={<Dashboard {...props} />} />
              <Route path="ingredientes" element={<Ingredients {...props} />} />
              <Route path="receitas" element={<Recipes {...props} />} />
              <Route path="precificacao" element={<Pricing {...props} />} />
              <Route path="produtos" element={<Products {...props} />} />
              <Route path="orcamentos" element={<Quotes {...props} />} />
              <Route path="confeitaria" element={<BakeryPage {...props} />} />
              <Route path="configuracoes" element={<Settings {...props} />} />
              <Route path="*" element={<Navigate to="/app" replace />} />
            </Routes>
          )}
        </main>
      </div>
    </div>
  );
}
export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setSession(data.session);
        setLoading(false);
      })
      .catch((e) => {
        setError(errorText(e));
        setLoading(false);
      });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, next) => setSession(next));
    return () => subscription.unsubscribe();
  }, []);
  if (loading) return <p className="loading">Preparando seu espaço…</p>;
  return (
    <BrowserRouter>
      {error && <ErrorBox error={error} />}
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/entrar" element={<Auth />} />
        <Route path="/nova-senha" element={<Auth recovery />} />
        <Route
          path="/app/*"
          element={<Workspace key={session?.user.id} session={session} />}
        />
        {["privacidade", "termos", "contato"].map((kind) => (
          <Route key={kind} path={"/" + kind} element={<Legal kind={kind} />} />
        ))}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
