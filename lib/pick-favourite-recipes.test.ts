import { partitionFavouritesByRecency, pickFavouriteRecipes } from "./pick-favourite-recipes";

const recipes = [
  { id: "1", title: "Tacos" },
  { id: "2", title: "Lasagne" },
  { id: "3", title: "Stir Fry" },
  { id: "4", title: "Fish Pie" }
];

describe("partitionFavouritesByRecency", () => {
  it("puts recently used titles in fallback", () => {
    const { preferred, fallback } = partitionFavouritesByRecency(recipes, ["Lasagne", "fish pie"]);
    expect(preferred.map((r) => r.id)).toEqual(["1", "3"]);
    expect(fallback.map((r) => r.id)).toEqual(["2", "4"]);
  });

  it("treats an empty history as all preferred", () => {
    const { preferred, fallback } = partitionFavouritesByRecency(recipes, []);
    expect(preferred).toHaveLength(4);
    expect(fallback).toHaveLength(0);
  });
});

describe("pickFavouriteRecipes", () => {
  const noShuffle = () => 0;

  it("returns an empty list for empty input or zero count", () => {
    expect(pickFavouriteRecipes([], 3, [], noShuffle)).toEqual([]);
    expect(pickFavouriteRecipes(recipes, 0, [], noShuffle)).toEqual([]);
  });

  it("prefers titles not used in the last 30 days", () => {
    const picked = pickFavouriteRecipes(recipes, 2, ["Lasagne", "Fish Pie"], noShuffle);
    expect(picked.map((r) => r.title)).toEqual(["Stir Fry", "Tacos"]);
  });

  it("fills from recently used titles when needed", () => {
    const picked = pickFavouriteRecipes(recipes, 3, ["Lasagne", "Fish Pie"], noShuffle);
    expect(picked).toHaveLength(3);
    expect(picked.map((r) => r.title)).toEqual(["Stir Fry", "Tacos", "Fish Pie"]);
  });

  it("does not exceed the available pool", () => {
    const picked = pickFavouriteRecipes(recipes, 10, [], noShuffle);
    expect(picked).toHaveLength(4);
  });
});
