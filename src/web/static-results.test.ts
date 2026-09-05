import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import { describe, expect, it } from "vitest";

const source = readFileSync(new URL("../../docs/app.js", import.meta.url), "utf8");
// Exercise the shipped classic-script functions without its browser startup.
function declaration(name: string) {
  const start = source.indexOf(`function ${name}(`);
  const end = source.indexOf("\nfunction ", start + 1);
  return source.slice(start, end);
}
const api = runInNewContext([
  ...source.matchAll(/^const (?:DEFAULT|MAX)_RESULT_LIMIT = .*;$/gm),
].map((match) => match[0]).join("\n") + "\n" + [
  "findNearestByCategory", "nearestDistance", "haversineMeters", "renderSubgroup",
].map(declaration).join("\n") + "\n" + source.match(/^function escapeHtml.*$/m)![0] +
  "\n({ findNearestByCategory, renderSubgroup });", {
  displayCategoryFor: (category: string) => category,
  categorySortOrder: () => 0,
  categoryMeta: () => ({ label: "公园", color: "#23834d" }),
  renderAlternateNames: () => "",
  formatDistance: (meters: number) => `${meters} m`,
  activeCity: "shanghai",
  CITIES: { shanghai: { name: "上海" } },
});
const origin = { latitude: 31.23, longitude: 121.47 };
const place = (index: number, category = "park.major_city_park") => ({
  name: `地点${index}`, category, latitude: 31.23, longitude: 121.47 + index / 1000,
});

describe("static site expandable results", () => {
  it("keeps the ten closest candidates in distance order", () => {
    const group = api.findNearestByCategory(Array.from({ length: 14 }, (_, i) => place(14 - i)), origin)[0];
    expect(group.places.map((p: { name: string }) => p.name)).toEqual(Array.from({ length: 10 }, (_, i) => `地点${i + 1}`));
  });
  it("keeps fewer than ten candidates without padding", () => {
    expect(api.findNearestByCategory([place(2), place(1)], origin)[0].places).toHaveLength(2);
  });
  it("deduplicates university names before applying the limit", () => {
    const items = Array.from({ length: 12 }, (_, i) => place(i, "education.university"));
    items[1].name = items[0].name;
    const places = api.findNearestByCategory(items, origin)[0].places;
    expect(places).toHaveLength(10);
    expect(new Set(places.map((p: { name: string }) => p.name)).size).toBe(10);
  });
  it("renders three visible rows with seven controlled hidden rows", () => {
    const html = api.renderSubgroup({ category: "park.major_city_park", places: Array.from({ length: 12 }, (_, i) => place(i)) });
    expect(html.match(/<article /g)).toHaveLength(10);
    expect(html.match(/data-extra-place hidden/g)).toHaveLength(7);
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain("再显示 7 处");
    expect(html).toContain('aria-controls="place-park.major_city_park-3');
  });
  it("offers only the available extras, and no toggle for three or fewer", () => {
    for (const count of [0, 1, 3, 4, 7]) {
      const html = api.renderSubgroup({ category: "park.major_city_park", places: Array.from({ length: count }, (_, i) => place(i)) });
      expect(html.includes("data-more-results")).toBe(count > 3);
      if (count > 3) expect(html).toContain(`再显示 ${count - 3} 处`);
    }
  });
});
