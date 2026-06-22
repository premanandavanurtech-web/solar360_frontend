import { isPointInsideFootprint } from "./ThreeDDesign";

describe("isPointInsideFootprint", () => {
  const circularFootprint = Array.from({ length: 20 }, (_, index) => {
    const angle = (Math.PI * 2 * index) / 20;
    return {
      x: Math.cos(angle) * 12,
      z: Math.sin(angle) * 12,
    };
  });

  test("handles a complex roof outline without getting stuck", () => {
    expect(isPointInsideFootprint({ x: 0, z: 0 }, circularFootprint)).toBe(true);
    expect(isPointInsideFootprint({ x: 20, z: 20 }, circularFootprint)).toBe(false);
  });
});
