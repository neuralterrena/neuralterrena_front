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
            src="/brand/NT-logo-color-horizontal.png"
            width="360"
          />
          <div className="toolbar-switchers">
            <ThemeSwitcher />
            <LanguageSwitcher />
          </div>
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
          {title}
          {aside}
        </div>
      </section>

      <section className="login-auth">{children}</section>
    </main>
  );
}
