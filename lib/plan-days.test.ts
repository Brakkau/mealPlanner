import { sundayDayNumber, weekdayLabelForDayNumber } from "./plan-days";
import { buildSundayRoastRecipe } from "./sunday-roast";

describe("plan days", () => {
  it("puts Sunday on day 7 when the week starts Monday", () => {
    expect(sundayDayNumber(7)).toBe(7);
    expect(weekdayLabelForDayNumber(1)).toBe("Monday");
    expect(weekdayLabelForDayNumber(7)).toBe("Sunday");
  });

  it("returns null when Sunday is not in the plan", () => {
    expect(sundayDayNumber(5)).toBeNull();
  });
});

describe("sunday roast recipe", () => {
  it("builds a locked Sunday roast from meat and veg", () => {
    const recipe = buildSundayRoastRecipe({
      meat: "chicken",
      veg: "carrots, broccoli",
      people: 4
    });
    expect(recipe.isLocked).toBe(true);
    expect(recipe.title).toContain("chicken");
    expect(recipe.title).toContain("carrots");
    expect(Array.isArray(recipe.ingredients)).toBe(true);
  });
});
