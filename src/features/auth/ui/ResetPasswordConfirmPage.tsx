import { LockKeyhole, RotateCcwKey, ShieldCheck } from "lucide-react";
import { type FormEvent, useId, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { AuthError } from "../model/authTypes";
import { useAuth } from "../model/useAuth";
import { useLanguage } from "@/shared/providers";
import { AuthLayout } from "./AuthLayout";

export function ResetPasswordConfirmPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const confirmPasswordId = useId();
  const passwordId = useId();
  const { resetPassword } = useAuth();
  const { t } = useLanguage();
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [password, setPassword] = useState("");

  const uid = searchParams.get("uid")?.trim() ?? "";
  const token = searchParams.get("token")?.trim() ?? "";
  const hasValidLink = useMemo(() => uid.length > 0 && token.length > 0, [token, uid]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!hasValidLink) {
      setFormError(t("auth.passwordResetInvalidLink"));
      return;
    }

    if (password !== confirmPassword) {
      setFormError(t("auth.passwordMismatch"));
      return;
    }

    setFormError(null);
    setIsSubmitting(true);

    try {
      await resetPassword({ newPassword: password, token, uid });
      void navigate("/login", {
        replace: true,
        state: {
          resetCompleted: true,
        },
      });
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
          <h1>{t("auth.resetPasswordTitle")}</h1>
          <p>{t("auth.resetPasswordDescription")}</p>
        </>
      }
      title={null}
    >
      <form className="auth-card" onSubmit={(event) => void handleSubmit(event)}>
        <div className="auth-card__heading">
          <p className="nt-eyebrow">{t("auth.console")}</p>
          <h2>{t("auth.resetPasswordTitle")}</h2>
          <p>{t("auth.resetPasswordDescription")}</p>
        </div>

        {!hasValidLink ? (
          <div className="form-error" role="alert">
            {t("auth.passwordResetInvalidLink")}
          </div>
        ) : null}

        <div className="field-group">
          <label htmlFor={passwordId}>{t("auth.newPassword")}</label>
          <div className="input-shell">
            <LockKeyhole aria-hidden="true" size={18} strokeWidth={1.75} />
            <input
              autoComplete="new-password"
              id={passwordId}
              name="newPassword"
              onChange={(event) => setPassword(event.target.value)}
              placeholder={t("auth.newPasswordPlaceholder")}
              type="password"
              value={password}
            />
          </div>
        </div>

        <div className="field-group">
          <label htmlFor={confirmPasswordId}>{t("auth.confirmPassword")}</label>
          <div className="input-shell">
            <ShieldCheck aria-hidden="true" size={18} strokeWidth={1.75} />
            <input
              autoComplete="new-password"
              id={confirmPasswordId}
              name="confirmPassword"
              onChange={(event) => setConfirmPassword(event.target.value)}
              placeholder={t("auth.confirmPasswordPlaceholder")}
              type="password"
              value={confirmPassword}
            />
          </div>
        </div>

        {formError ? (
          <div className="form-error" role="alert">
            {formError}
          </div>
        ) : null}

        <button
          className="primary-button"
          disabled={!hasValidLink || isSubmitting || password.length === 0 || confirmPassword.length === 0}
          type="submit"
        >
          <RotateCcwKey aria-hidden="true" size={18} strokeWidth={1.75} />
          <span>{isSubmitting ? t("auth.submitLoading") : t("auth.resetPasswordSubmit")}</span>
        </button>

        <div className="auth-card__actions">
          <Link to="/login">{t("auth.backToLogin")}</Link>
        </div>
      </form>
    </AuthLayout>
  );
}
