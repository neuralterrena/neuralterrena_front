## 2024-05-14 - Tooltips and ARIA-hidden for Icon-Only Buttons
**Learning:** Icon-only buttons need more than just `aria-label`. They also require `title` attributes for sighted users using mice to see native tooltips. More importantly, the internal SVG icons *must* have `aria-hidden="true"` so screen readers ignore the meaningless vector shapes and correctly vocalize only the button's `aria-label`.
**Action:** When adding or reviewing icon-only buttons in the design system, always ensure they have three attributes: `aria-label` (for screen readers), `title` (for sighted users), and `aria-hidden="true"` on the icon itself.
## 2024-05-14 - AutoFocus in Single-Purpose Pages
**Learning:** Adding `autoFocus` to the primary input of a single-purpose page (like login or password reset) is a safe and high-impact micro-UX win that saves users a click immediately upon page load.
**Action:** When creating or reviewing single-purpose forms, consider whether the user's primary intent is immediately known and if `autoFocus` can reduce friction without harming accessibility.
