import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { TypographyProvider } from "./TypographyProvider";
import { useTypography } from "./useTypography";

function TypographyControl() {
  const { fontScaleLarge, setFontScaleLarge } = useTypography();

  return (
    <button onClick={() => setFontScaleLarge(!fontScaleLarge)} type="button">
      {fontScaleLarge ? "Reducir" : "Ampliar"}
    </button>
  );
}

afterEach(() => {
  document.documentElement.removeAttribute("style");
  localStorage.clear();
});

describe("TypographyProvider", () => {
  it("applies all typography tokens across the document and persists the preference", () => {
    render(
      <TypographyProvider>
        <TypographyControl />
      </TypographyProvider>,
    );

    fireEvent.click(screen.getByRole("button", { name: "Ampliar" }));

    expect(document.documentElement.style.getPropertyValue("--nt-text-base")).toBe("18.4px");
    expect(document.documentElement.style.getPropertyValue("--nt-text-xl")).toBe("23px");
    expect(document.documentElement.style.getPropertyValue("--nt-text-4xl")).toBe("46px");
    expect(localStorage.getItem("nt.typography.large")).toBe("true");
  });
});
