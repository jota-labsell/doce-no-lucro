import { Brand } from "../components/Brand";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { requireClient, supabase } from "../lib/supabase";
import { Field, ErrorBox, errorText, Notice } from "../components/ui";
export function Auth({ recovery = false }: { recovery?: boolean }) {
  const [mode, setMode] = useState<"login" | "signup" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <main className="auth-page">
      <Link to="/" className="brand">
        <Brand />
      </Link>
      <section className="panel auth-card">
        <p className="eyebrow">UM PASSO PARA O SEU NEGÓCIO</p>
        <h1>
          {recovery
            ? "Sua nova senha"
            : mode === "login"
              ? "Que bom ter você aqui."
              : mode === "signup"
                ? "Vamos adoçar seus planos?"
                : "Recuperar acesso"}
        </h1>
        <p>Mais clareza nas contas. Mais cuidado com o seu trabalho.</p>
        {!supabase && (
          <Notice>
            Configure as variáveis do Supabase para acessar sua conta.
          </Notice>
        )}
        <ErrorBox error={error} />
        {message && <Notice>{message}</Notice>}
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setError("");
            setMessage("");
            try {
              const c = requireClient();
              if (recovery) {
                const { error } = await c.auth.updateUser({ password });
                if (error) throw error;
                navigate("/app");
              } else if (mode === "login") {
                const { error } = await c.auth.signInWithPassword({
                  email,
                  password,
                });
                if (error) throw error;
                navigate("/app");
              } else if (mode === "signup") {
                const { data, error } = await c.auth.signUp({
                  email,
                  password,
                  options: { emailRedirectTo: location.origin + "/app" },
                });
                if (error) throw error;
                if (data.session) navigate("/app");
                else
                  setMessage("Confira seu e-mail para confirmar o cadastro.");
              } else {
                const { error } = await c.auth.resetPasswordForEmail(email, {
                  redirectTo: location.origin + "/nova-senha",
                });
                if (error) throw error;
                setMessage(
                  "Se o e-mail estiver cadastrado, você receberá as instruções.",
                );
              }
            } catch (e) {
              setError(errorText(e));
            } finally {
              setBusy(false);
            }
          }}
        >
          {!recovery && (
            <Field label="E-mail">
              <input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
          )}
          {(recovery || mode !== "reset") && (
            <Field label="Senha (mínimo 8 caracteres)">
              <input
                type="password"
                autoComplete={
                  mode === "login" ? "current-password" : "new-password"
                }
                minLength={8}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
          )}
          <button disabled={busy || !supabase}>
            {busy
              ? "Aguarde…"
              : recovery
                ? "Salvar senha"
                : mode === "login"
                  ? "Entrar"
                  : mode === "signup"
                    ? "Criar conta"
                    : "Enviar instruções"}
          </button>
        </form>
        {!recovery && (
          <div className="auth-links">
            <button
              className="text-button"
              onClick={() => {
                setMode(mode === "login" ? "signup" : "login");
                setError("");
                setMessage("");
              }}
            >
              {mode === "login"
                ? "Ainda não tem conta? Cadastre-se"
                : "Já tenho uma conta"}
            </button>
            <button className="text-button" onClick={() => setMode("reset")}>
              Esqueci minha senha
            </button>
          </div>
        )}
      </section>
    </main>
  );
}
