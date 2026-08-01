import { describe, expect, it } from "vitest";
import { findNearestFacilitiesByCategory, type Facility } from "./facility-index.js";

function university(name: string, longitude: number): Facility {
  return {
    address: "测试地址",
    category: "education.university",
    district: "测试区",
    latitude: 31.23,
    longitude,
    name,
  };
}

describe("university proximity groups", () => {
  it("returns the three nearest unique university names", () => {
    const facilities = [
      university("测试大学", 121.4701),
      university("测试大学", 121.4702),
      university("第二大学", 121.4703),
      university("第三大学", 121.4704),
      university("第四大学", 121.4705),
    ];
    const group = findNearestFacilitiesByCategory(
      facilities,
      { latitude: 31.23, longitude: 121.47 },
    ).find((item) => item.category === "education.university");

    expect(group?.places.map((place) => place.name)).toEqual(["测试大学", "第二大学", "第三大学"]);
  });
});
