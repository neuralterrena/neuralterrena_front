import { useContext } from "react";
import { TypographyContext } from "./typographyContext";

export function useTypography() {
  const context = useContext(TypographyContext);

  if (!context) {
    throw new Error("useTypography must be used within TypographyProvider");
  }

  return context;
}
