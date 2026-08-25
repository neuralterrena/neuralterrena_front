import { Check, X } from "lucide-react";
import type { ButtonHTMLAttributes, PropsWithChildren, ReactNode } from "react";

/**
 * The map-control primitives from the Neural Terrena Design System
 * (`ui_kits/product/map-controls.css`). Styling lives entirely in
 * `src/styles/map-controls.scss`; these components only bind markup,
 * accessibility and state to the canon's class names.
 */

interface MapButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "type"> {
  /** Renders the toggled-on state — institutional blue, per the canon. */
  active?: boolean;
  label: string;
}

export function MapButton({ active = false, label, ...rest }: MapButtonProps) {
  return (
    <button
      {...rest}
      aria-label={label}
      className={active ? "nt-mapbtn nt-mapbtn--active" : "nt-mapbtn"}
      title={label}
      type="button"
    >
      {rest.children}
    </button>
  );
}

export function MapGroup({ children, label, row = false }: PropsWithChildren<{ label: string; row?: boolean }>) {
  return (
    <div aria-label={label} className={row ? "nt-mapgroup nt-mapgroup--row" : "nt-mapgroup"} role="group">
      {children}
    </div>
  );
}

export function MapGroupDivider() {
  return <span aria-hidden="true" className="nt-mapgroup__divider" />;
}

interface MapPanelProps {
  closeLabel: string;
  onClose: () => void;
  title: string;
  wide?: boolean;
}

export function MapPanel({ children, closeLabel, onClose, title, wide = false }: PropsWithChildren<MapPanelProps>) {
  return (
    <section aria-label={title} className={wide ? "nt-mappanel nt-mappanel--wide" : "nt-mappanel"}>
      <header className="nt-mappanel__head">
        <span className="nt-mappanel__title">{title}</span>
        <button aria-label={closeLabel} className="nt-mappanel__close" onClick={onClose} title={closeLabel} type="button">
          <X aria-hidden="true" strokeWidth={1.5} />
        </button>
      </header>
      <div className="nt-mappanel__body">{children}</div>
    </section>
  );
}

interface MapRowProps {
  checked: boolean;
  control: "check" | "radio";
  label: ReactNode;
  onToggle: () => void;
  role: "checkbox" | "radio";
  sub?: ReactNode;
  swatch?: string;
}

/**
 * A selectable row inside a panel. It is a real button so it is reachable and
 * operable from the keyboard; `role` overrides the button semantics with the
 * checkbox/radio semantics the state actually has.
 */
export function MapRow({ checked, control, label, onToggle, role, sub, swatch }: MapRowProps) {
  return (
    <button aria-checked={checked} className="nt-maprow" onClick={onToggle} role={role} type="button">
      {control === "check" ? (
        <span aria-hidden="true" className="nt-check">
          <Check strokeWidth={2.5} />
        </span>
      ) : (
        <span aria-hidden="true" className="nt-radio" />
      )}
      {swatch ? <span aria-hidden="true" className="nt-maprow__swatch" style={{ background: swatch }} /> : null}
      <span className="nt-maprow__label">
        {label}
        {sub ? <span className="nt-maprow__sub">{sub}</span> : null}
      </span>
    </button>
  );
}

export interface SegmentedOption<T extends string> {
  icon?: ReactNode;
  label: string;
  value: T;
}

interface SegmentedProps<T extends string> {
  label: string;
  onChange: (value: T) => void;
  options: readonly SegmentedOption<T>[];
  value: T;
}

export function Segmented<T extends string>({ label, onChange, options, value }: SegmentedProps<T>) {
  return (
    <div aria-label={label} className="nt-seg" role="group">
      {options.map((option) => (
        <button
          aria-pressed={option.value === value}
          className={option.value === value ? "nt-seg__btn nt-seg__btn--active" : "nt-seg__btn"}
          key={option.value}
          onClick={() => onChange(option.value)}
          type="button"
        >
          {option.icon}
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function MapPill({ children, label }: PropsWithChildren<{ label: string }>) {
  return (
    <span className="nt-mappill">
      <span className="nt-mappill__key">{label}</span>
      {children}
    </span>
  );
}
