import { describe, expect, it } from "vitest";
import { arrowLengthForZoom } from "../model/windVisualization";

describe("arrowLengthForZoom", () => {
  it("rescales wind arrows with zoom while keeping legible bounds", () => {
    expect(arrowLengthForZoom(8, 8)).toBe(15);
    expect(arrowLengthForZoom(9, 8)).toBe(30);
    expect(arrowLengthForZoom(4, 8)).toBe(8);
    expect(arrowLengthForZoom(16, 8)).toBe(72);
  });
});
