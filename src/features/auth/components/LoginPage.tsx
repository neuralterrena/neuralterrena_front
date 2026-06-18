import { Eye, EyeOff, LockKeyhole, LogIn, Server, UserRound } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { useAuth } from "../../../app/providers/useAuth";
import { AuthError } from "../services/authTypes";

export function LoginPage() {
  const passwordId = useId();
  const usernameId = useId();
  const { isAuthenticating, login } = useAuth();
  const [formError, setFormError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [username, setUsername] = useState("");

  const canSubmit = username.trim().length > 0 && password.length > 0 && !isAuthenticating;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      await login({ password, username: username.trim() });
    } catch (error) {
      setFormError(error instanceof AuthError ? error.message : "No se pudo validar la sesión.");
    }
  };

  return (
    <main className="login-screen">
      <section aria-label="Contexto operativo" className="login-visual">
        <div className="login-visual__top">
          <img
            alt="neural terrena"
            className="login-visual__logo"
            height="62"
            src="/brand/NT-logo-color-horizontal.png"
            width="360"
          />
        </div>

        <div aria-hidden="true" className="terrain-panel">
          <div className="terrain-panel__grid" />
          <div className="terrain-panel__line terrain-panel__line--one" />
          <div className="terrain-panel__line terrain-panel__line--two" />
          <div className="terrain-panel__node terrain-panel__node--one" />
          <div className="terrain-panel__node terrain-panel__node--two" />
          <div className="terrain-panel__node terrain-panel__node--three" />
          <div className="terrain-panel__bands">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="login-visual__copy">
          <p className="nt-eyebrow">Terrain Intelligence</p>
          <h1>Acceso operativo</h1>
          <p>Una capa sincronizada para terreno, luz, visibilidad y tiempo.</p>
        </div>
      </section>

      <section aria-labelledby="login-title" className="login-auth">
        <form className="auth-card" onSubmit={(event) => void handleSubmit(event)}>
          <div className="auth-card__brand">
            <img alt="neural terrena" height="46" src="/brand/NT-logo-color-horizontal.png" width="266" />
          </div>

          <div className="auth-card__heading">
            <p className="nt-eyebrow">Consola</p>
            <h2 id="login-title">Iniciar sesión</h2>
            <p>Acceso a la superficie operativa de Neural Terrena.</p>
          </div>

          <div className="field-group">
            <label htmlFor={usernameId}>Usuario</label>
            <div className="input-shell">
              <UserRound aria-hidden="true" size={18} strokeWidth={1.75} />
              <input
                autoComplete="username"
                id={usernameId}
                name="username"
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
                type="text"
                value={username}
              />
            </div>
          </div>

          <div className="field-group">
            <label htmlFor={passwordId}>Clave</label>
            <div className="input-shell">
              <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.75} />
              <input
                autoComplete="current-password"
                id={passwordId}
                name="password"
                onChange={(event) => setPassword(event.target.value)}
                placeholder="admin"
                type={passwordVisible ? "text" : "password"}
                value={password}
              />
              <button
                aria-label={passwordVisible ? "Ocultar clave" : "Mostrar clave"}
                className="icon-button"
                onClick={() => setPasswordVisible((visible) => !visible)}
                title={passwordVisible ? "Ocultar clave" : "Mostrar clave"}
                type="button"
              >
                {passwordVisible ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          {formError ? (
            <div className="form-error" role="alert">
              {formError}
            </div>
          ) : null}

          <button className="primary-button" disabled={!canSubmit} type="submit">
            <LogIn aria-hidden="true" size={18} strokeWidth={1.75} />
            <span>{isAuthenticating ? "Validando" : "Entrar"}</span>
          </button>

          <div className="auth-card__meta" aria-label="Estado de autenticación">
            <span>
              <Server aria-hidden="true" size={16} strokeWidth={1.75} />
              API ready
            </span>
          </div>
        </form>
      </section>
    </main>
  );
}
