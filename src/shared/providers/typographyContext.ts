import { createContext } from "react";

export interface TypographyContextValue {
  fontScaleLarge: boolean;
  setFontScaleLarge: (fontScaleLarge: boolean) => void;
}

export const TypographyContext = createContext<TypographyContextValue | null>(null);
