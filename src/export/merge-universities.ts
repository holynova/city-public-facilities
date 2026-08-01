import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AmapCollectedFacilityRecord } from "../domain/facility.js";

type WebFacility = {
  address: string;
  category: string;
  district: string;
  latitude: number;
  longitude: number;
  name: string;
};

type WebCatalogue = {
  city: string;
  coordinateSystem: string;
  facilities: WebFacility[];
};

export async function mergeUniversitiesIntoWebCatalogue(options: {
  citySlug: string;
  snapshot: string;
}): Promise<{ previousCount: number; universityCount: number; totalCount: number }> {
  const source = join("data", "interim", options.snapshot, `${options.citySlug}-universities.json`);
  const target = join("docs", "data", `${options.citySlug}.json`);
  const [records, catalogue] = await Promise.all([
    readJson<AmapCollectedFacilityRecord[]>(source),
    readJson<WebCatalogue>(target),
  ]);
  const previous = catalogue.facilities.filter((facility) => facility.category !== "education.university");
  const universities = records.map(toWebFacility).filter((facility) => (
    Number.isFinite(facility.latitude) && Number.isFinite(facility.longitude)
  ));
  catalogue.facilities = [...previous, ...universities].sort((left, right) => (
    left.category.localeCompare(right.category, "zh-CN")
    || left.name.localeCompare(right.name, "zh-CN")
  ));
  await writeFile(target, `${JSON.stringify(catalogue)}\n`, "utf8");
  return {
    previousCount: previous.length,
    universityCount: universities.length,
    totalCount: catalogue.facilities.length,
  };
}

function toWebFacility(record: AmapCollectedFacilityRecord): WebFacility {
  const [longitude, latitude] = record.amap.location.split(",").map(Number);
  return {
    address: record.address,
    category: record.category,
    district: record.district,
    latitude,
    longitude,
    name: record.name,
  };
}

async function readJson<T>(file: string): Promise<T> {
  return JSON.parse(await readFile(file, "utf8")) as T;
}
