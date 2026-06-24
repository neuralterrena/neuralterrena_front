import { Mail, Send } from "lucide-react";
import { type FormEvent, useId, useState } from "react";
import { Link } from "react-router-dom";
import { AuthError } from "../model/authTypes";
import { useAuth } from "../model/useAuth";
import { useLanguage } from "@/shared/providers";
import { AuthLayout } from "./AuthLayout";

export function ForgotPasswordPage() {
  const emailId = useId();
  const { requestPasswordReset } = useAuth();
  const { t } = useLanguage();
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      await requestPasswordReset({ email: email.trim() });
      setSuccessMessage(t("auth.passwordResetRequested"));
    } catch (error) {
      setFormError(error instanceof AuthError ? error.fallbackMessage ?? t(error.code) : t("auth.passwordResetFailed"));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout
      aside={
        <>
          <p className="nt-eyebrow">{t("auth.visualEyebrow")}</p>
          <h1>{t("auth.forgotPasswordTitle")}</h1>
          <p>{t("auth.forgotPasswordDescription")}</p>
        </>
      }
      title={null}
    >
      <form className="auth-card" onSubmit={(event) => void handleSubmit(event)}>
        <div className="auth-card__heading">
          <p className="nt-eyebrow">{t("auth.console")}</p>
          <h2>{t("auth.forgotPasswordTitle")}</h2>
          <p>{t("auth.forgotPasswordDescription")}</p>
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

        {formError ? (
          <div className="form-error" role="alert">
            {formError}
          </div>
        ) : null}

        {successMessage ? (
          <div className="form-success" role="status">
            {successMessage}
          </div>
        ) : null}

        <button className="primary-button" disabled={isSubmitting || email.trim().length === 0} type="submit">
          <Send aria-hidden="true" size={18} strokeWidth={1.75} />
          <span>{isSubmitting ? t("auth.submitLoading") : t("auth.passwordResetSubmit")}</span>
        </button>

        <div className="auth-card__actions">
          <Link to="/login">{t("auth.backToLogin")}</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
