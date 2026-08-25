import type { PropsWithChildren, ReactNode } from "react";

export interface MobileTab<T extends string> {
  icon: ReactNode;
  label: string;
  value: T;
}

interface MobileBarProps<T extends string> {
  label: string;
  /** Tapping the active tab closes its sheet, per the canon's rail behaviour. */
  onSelect: (value: T | null) => void;
  selected: T | null;
  tabs: readonly MobileTab<T>[];
}

export function MobileBar<T extends string>({ label, onSelect, selected, tabs }: MobileBarProps<T>) {
  return (
    <nav aria-label={label} className="nt-map__bottombar">
      {tabs.map((tab) => (
        <button
          aria-pressed={tab.value === selected}
          className={tab.value === selected ? "nt-tabbtn nt-tabbtn--active" : "nt-tabbtn"}
          key={tab.value}
          onClick={() => onSelect(tab.value === selected ? null : tab.value)}
          type="button"
        >
          {tab.icon}
          {tab.label}
        </button>
      ))}
    </nav>
  );
}

/**
 * Bottom-anchored panel for compact viewports. It replaces the floating panel
 * rather than shrinking it — on a phone a 248px card pinned to a corner is
 * unreachable with one hand.
 */
export function MapSheet({ children, label }: PropsWithChildren<{ label: string }>) {
  return (
    <section aria-label={label} className="nt-map__sheet">
      <span aria-hidden="true" className="nt-map__sheet-grip" />
      {children}
    </section>
  );
}
