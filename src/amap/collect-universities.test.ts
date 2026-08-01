import { describe, expect, it } from "vitest";
import type { AmapPoi } from "../domain/amap.js";
import { isUniversityName, isUniversityPoi } from "./collect-universities.js";

function poi(name: string, typecode = "141201"): AmapPoi {
  return {
    address: "测试地址",
    adcode: "310000",
    adname: "测试区",
    id: "test-id",
    location: "121.5,31.2",
    name,
    type: "科教文化服务;学校;高等院校",
    typecode,
  };
}

describe("isUniversityPoi", () => {
  it("accepts universities and named campuses", () => {
    expect(isUniversityPoi(poi("复旦大学(邯郸校区)"))).toBe(true);
    expect(isUniversityPoi(poi("中国美术学院(南山校区)"))).toBe(true);
  });

  it("rejects adjacent facilities and other education types", () => {
    expect(isUniversityPoi(poi("复旦大学附属医院"))).toBe(false);
    expect(isUniversityPoi(poi("北京大学东门"))).toBe(false);
    expect(isUniversityPoi(poi("某职业学院", "141202"))).toBe(false);
  });

  it("keeps institutions and campuses but rejects internal departments", () => {
    expect(isUniversityName("广东第二师范学院(花都校区)")).toBe(true);
    expect(isUniversityName("北京城市学院航天城校区")).toBe(true);
    expect(isUniversityName("北京大学光华管理学院")).toBe(false);
    expect(isUniversityName("安徽大学江淮学院学生会办公室")).toBe(false);
    expect(isUniversityName("登云科技职业学院实训车间")).toBe(false);
    expect(isUniversityName("环境与化学工程学院")).toBe(false);
    expect(isUniversityName("浙江传媒学院钱塘校区播音主持艺术学院")).toBe(false);
    expect(isUniversityName("北京市东城区社会主义学院")).toBe(false);
    expect(isUniversityName("香港活石学院")).toBe(false);
  });
});
