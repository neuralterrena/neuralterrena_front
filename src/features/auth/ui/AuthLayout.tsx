import type { PropsWithChildren, ReactNode } from "react";
import { LanguageSwitcher, ThemeSwitcher } from "@/shared/ui";

interface AuthLayoutProps extends PropsWithChildren {
  aside: ReactNode;
  title: ReactNode;
}

export function AuthLayout({ aside, children, title }: AuthLayoutProps) {
  return (
    <main className="login-screen">
      <section aria-label="Operational context" className="login-visual">
        <div className="login-visual__top">
          <img
            alt="neural terrena"
            className="login-visual__logo"
            height="62"
            src="/brand/NT-logo-white-horizontal.png"
            width="360"
          />
          <div className="toolbar-switchers">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
        </div>

        <div aria-hidden="true" className="auth-visual-panel">
          <div className="auth-visual-panel__grid" />
          <div className="auth-visual-panel__line auth-visual-panel__line--one" />
          <div className="auth-visual-panel__line auth-visual-panel__line--two" />
          <div className="auth-visual-panel__node auth-visual-panel__node--one" />
          <div className="auth-visual-panel__node auth-visual-panel__node--two" />
          <div className="auth-visual-panel__node auth-visual-panel__node--three" />
          <div className="auth-visual-panel__bands">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>

        <div className="login-visual__copy">
          {title}
          {aside}
        </div>
      </section>

      <section className="login-auth">{children}</section>
    </main>
  );
}
