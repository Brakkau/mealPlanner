import {
  DEFAULT_AI_TYPE,
  FAVOURITES_TYPE,
  formatPlanTypeLabel,
  getAllowedFocuses,
  isFavouritesType,
  isFocusAllowed,
  isVegetarianStyle,
  parsePlanType,
  resolveFocus
} from "./meal-types";

describe("isFocusAllowed", () => {
  it("allows empty focus", () => {
    expect(isFocusAllowed("Family Friendly", null)).toBe(true);
  });

  it("rejects the same value as the primary type", () => {
    expect(isFocusAllowed("Quick", "Quick")).toBe(false);
  });

  it("rejects Vegetarian + Meat and Meat + Vegetarian", () => {
    expect(isFocusAllowed("Vegetarian", "Meat")).toBe(false);
    expect(isFocusAllowed("Meat", "Vegetarian")).toBe(false);
  });

  it("allows Family Friendly with Meat, Vegetarian, Quick, or Pasta", () => {
    expect(getAllowedFocuses("Family Friendly")).toEqual([
      "Quick",
      "Meat",
      "Vegetarian",
      "Pasta"
    ]);
  });
});

describe("resolveFocus", () => {
  it("returns null for None or invalid pairs", () => {
    expect(resolveFocus("Meat", "None")).toBeNull();
    expect(resolveFocus("Meat", "Vegetarian")).toBeNull();
  });

  it("returns a valid focus", () => {
    expect(resolveFocus("Family Friendly", "Pasta")).toBe("Pasta");
  });
});

describe("formatPlanTypeLabel and parsePlanType", () => {
  it("formats AI types with and without focus", () => {
    expect(formatPlanTypeLabel({ type: "Family Friendly" })).toBe("Family Friendly");
    expect(formatPlanTypeLabel({ type: "Family Friendly", focus: "Meat" })).toBe(
      "Family Friendly · Meat"
    );
  });

  it("formats favourites-only and hybrid labels", () => {
    expect(formatPlanTypeLabel({ type: DEFAULT_AI_TYPE, isFavourites: true })).toBe(
      FAVOURITES_TYPE
    );
    expect(
      formatPlanTypeLabel({
        type: DEFAULT_AI_TYPE,
        isFavourites: true,
        fillWithAi: true
      })
    ).toBe("Favourites · Family Friendly");
    expect(
      formatPlanTypeLabel({
        type: DEFAULT_AI_TYPE,
        focus: "Meat",
        isFavourites: true,
        fillWithAi: true
      })
    ).toBe("Favourites · Family Friendly · Meat");
  });

  it("parses stored labels back into style and focus", () => {
    expect(parsePlanType("Family Friendly · Meat")).toEqual({
      isFavourites: false,
      styleType: "Family Friendly",
      focus: "Meat"
    });
    expect(parsePlanType("Favourites · Family Friendly · Pasta")).toEqual({
      isFavourites: true,
      styleType: "Family Friendly",
      focus: "Pasta"
    });
    expect(parsePlanType("Favourites")).toEqual({
      isFavourites: true,
      styleType: DEFAULT_AI_TYPE,
      focus: null
    });
  });
});

describe("isFavouritesType and isVegetarianStyle", () => {
  it("recognises favourites labels", () => {
    expect(isFavouritesType("Favourites")).toBe(true);
    expect(isFavouritesType("Favourites Only")).toBe(true);
    expect(isFavouritesType("Family Friendly")).toBe(false);
  });

  it("treats vegetarian primary or focus as vegetarian", () => {
    expect(isVegetarianStyle("Vegetarian", null)).toBe(true);
    expect(isVegetarianStyle("Family Friendly", "Vegetarian")).toBe(true);
    expect(isVegetarianStyle("Meat", "Quick")).toBe(false);
  });
});
