import { Eye, EyeOff, LockKeyhole, LogIn, Mail } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthError } from "../model/authTypes";
import { useAuth } from "../model/useAuth";
import { useLanguage } from "@/shared/providers";
import { AuthLayout } from "./AuthLayout";

const getRedirectPath = (state: unknown) => {
  if (typeof state !== "object" || state === null || !("from" in state)) {
    return "/";
  }

  const from = state.from;

  if (typeof from !== "object" || from === null || !("pathname" in from) || typeof from.pathname !== "string") {
    return "/";
  }

  return from.pathname;
};

const hasResetCompleted = (state: unknown) =>
  typeof state === "object" && state !== null && "resetCompleted" in state && state.resetCompleted === true;

export function LoginPage() {
  const emailId = useId();
  const location = useLocation();
  const navigate = useNavigate();
  const passwordId = useId();
  const { isAuthenticating, login } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);

  const canSubmit = email.trim().length > 0 && password.length > 0 && !isAuthenticating;

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);

    try {
      await login({ email: email.trim(), password });
      void navigate(getRedirectPath(location.state), { replace: true });
    } catch (error) {
      setFormError(
        error instanceof AuthError ? error.fallbackMessage ?? t(error.code) : t("auth.sessionValidationFailed"),
      );
    }
  };

  return (
    <AuthLayout
      aside={
        <>
          <p className="nt-eyebrow">{t("auth.visualEyebrow")}</p>
          <h1>{t("auth.title")}</h1>
          <p>{t("auth.visualDescription")}</p>
        </>
      }
      title={null}
    >
      <form className="auth-card" onSubmit={(event) => void handleSubmit(event)}>
        <div className="auth-card__brand">
          <img
            alt="neural terrena"
            height="46"
            src="/brand/NT-logo-white-horizontal.png"
            width="266"
          />
        </div>

        <div className="auth-card__heading">
          <p className="nt-eyebrow">{t("auth.console")}</p>
          <h2 id="login-title">{t("auth.loginTitle")}</h2>
          <p>{t("auth.loginSubtitle")}</p>
        </div>

        <div className="field-group">
          <label htmlFor={emailId}>{t("auth.email")}</label>
          <div className="input-shell">
            <Mail aria-hidden="true" size={18} strokeWidth={1.75} />
            <input
              autoComplete="email"
              id={emailId}
              name="email"
              onChange={(event) => setEmail(event.target.value)}
              placeholder={t("auth.emailPlaceholder")}
              type="email"
              value={email}
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor={passwordId}>{t("auth.password")}</label>
          <div className="input-shell">
            <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.75} />
            <input
              autoComplete="current-password"
              id={passwordId}
              name="password"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.passwordPlaceholder")}
              type={passwordVisible ? "text" : "password"}
              value={password}
            />
            <button
              aria-label={passwordVisible ? t("auth.passwordHide") : t("auth.passwordShow")}
              className="icon-button"
              onClick={() => setPasswordVisible((visible) => !visible)}
              title={passwordVisible ? t("auth.passwordHide") : t("auth.passwordShow")}
              type="button"
            >
              {passwordVisible ? <EyeOff aria-hidden="true" size={18} strokeWidth={1.75} /> : <Eye aria-hidden="true" size={18} strokeWidth={1.75} />}
            </button>
          </div>
        </div>

        {formError ? (
          <div className="form-error" role="alert">
            {formError}
          </div>
        ) : null}

        {hasResetCompleted(location.state) ? (
          <div className="form-success" role="status">
            {t("auth.resetPasswordCompleted")}
          </div>
        ) : null}

        <button className="primary-button" disabled={!canSubmit} type="submit">
          <LogIn aria-hidden="true" size={18} strokeWidth={1.75} />
          <span>{isAuthenticating ? t("auth.submitLoading") : t("auth.enter")}</span>
        </button>

        <div className="auth-card__actions">
          <Link to="/forgot-password">{t("auth.forgotPassword")}</Link>
        </div>

      </form>
    </AuthLayout>
  );
}
