import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { AmapClient } from "./client.js";
import type { AmapPoi } from "../domain/amap.js";
import type { AmapCollectedFacilityRecord } from "../domain/facility.js";

export const UNIVERSITY_TYPE_CODE = "141201";
const UNIVERSITY_KEYWORDS = ["大学", "学院"] as const;
const EXCLUDED_NAME_PARTS = /附属|医院|幼儿园|小学|中学|培训|地铁|公交|停车|宿舍|食堂|餐厅|超市|便利店|校门|[东南西北]门|门诊|体育馆|图书馆|银行|ATM|快递|驿站|家属区|住宅区|科技园|派出所|社区/i;
const INSTITUTION_OR_CAMPUS_NAME = /(?:大学|学院)(?:[（(][^）)]*(?:校区|校园)[）)]|[-·]?[^（）()]{0,12}(?:校区|校园|分校)|[-·]?(?:[东西南北]区|医学部))?$/;
const FORMAL_COLLEGE_PREFIX = /^(?:中国|中央|国家|北京|上海|天津|重庆|河北|河南|山西|山东|辽宁|吉林|黑龙江|江苏|浙江|安徽|福建|江西|湖北|湖南|广东|广西|海南|四川|贵州|云南|陕西|甘肃|青海|宁夏|新疆|内蒙古|西藏|香港|澳门|华北|华东|华南|华中|西北|西南|东北|杭州|广州|深圳|苏州|合肥|南京|成都)/;
const NON_DEGREE_INSTITUTION = /老干部大学|老龄大学|业余大学|社会主义学院|行政学院|中华文化学院|技师学院|研修学院|专修学院|佛学院|神学院|干部学院|教育学院/;
const DEGREE_COLLEGE_SIGNAL = /职业|师范|医学|医科|艺术|美术|音乐|体育|警察|警官|政法|城市|工程|科技|财经|财贸|工商|商业|经济|农业|农林|外国语|航空|航海|信息|传媒|旅游|铁道|交通|水利|电力|电子|电影|戏剧|服装|印刷|舞蹈|卫生|药|工学院/;

export function isUniversityName(name: string): boolean {
  if (!INSTITUTION_OR_CAMPUS_NAME.test(name) || EXCLUDED_NAME_PARTS.test(name)) return false;
  if (/老年大学|公益大学/.test(name) || NON_DEGREE_INSTITUTION.test(name)) return false;
  const universityCount = name.match(/大学/g)?.length ?? 0;
  const collegeCount = name.match(/学院/g)?.length ?? 0;
  if (universityCount > 0) {
    if (universityCount !== 1 || name.split("大学")[0].length > 10) return false;
    if (/大学.*学院/.test(name) && !/大学(?:上海)?医学院(?:[（(][^）)]*(?:校区|校园)[）)]|校区)?$/.test(name)) return false;
    return true;
  }
  return collegeCount === 1 && FORMAL_COLLEGE_PREFIX.test(name) && DEGREE_COLLEGE_SIGNAL.test(name);
}

export function isUniversityPoi(poi: AmapPoi): boolean {
  const hasUniversityType = poi.typecode
    .split("|")
    .some((code) => code.startsWith(UNIVERSITY_TYPE_CODE));
  return Boolean(
    poi.id
    && poi.location
    && hasUniversityType
    && isUniversityName(poi.name),
  );
}

export async function collectUniversities(
  snapshot: string,
  city: string,
  citySlug: string,
): Promise<AmapCollectedFacilityRecord[]> {
  const directory = join("data", "interim", snapshot);
  const output = join(directory, `${citySlug}-universities.json`);
  const records = new Map(
    (await load(output))
      .filter((record) => isUniversityName(record.name))
      .map((record) => [record.sourceId, record]),
  );
  const client = new AmapClient();

  for (const keywords of UNIVERSITY_KEYWORDS) {
    if ([...records.values()].some((record) => record.searchEvidence.includes(keywords))) continue;
    console.error(`Amap ${city} universities: ${keywords}`);
    const result = await client.searchAllText({
      city,
      cityLimit: true,
      keywords,
      types: UNIVERSITY_TYPE_CODE,
    });
    console.error(`Amap ${city} universities: ${keywords} returned ${result.count} POIs`);
    for (const poi of result.pois.filter(isUniversityPoi)) {
      const incoming = toRecord(poi, keywords);
      const present = records.get(incoming.sourceId);
      records.set(incoming.sourceId, present ? mergeEvidence(present, incoming) : incoming);
    }
    await persist(directory, output, records);
  }

  const cleaned = deduplicate([...records.values()]);
  await persist(directory, output, new Map(cleaned.map((record) => [record.sourceId, record])));
  return cleaned;
}

function toRecord(poi: AmapPoi, keywords: string): AmapCollectedFacilityRecord {
  return {
    address: poi.address,
    amap: { location: poi.location, poiId: poi.id, type: poi.type, typeCode: poi.typecode },
    category: "education.university",
    classificationStatus: "inferred",
    district: poi.adname,
    name: poi.name,
    searchEvidence: [keywords],
    sourceId: `amap:${poi.id}`,
    sourceUrl: `https://www.amap.com/place/${poi.id}`,
  };
}

function mergeEvidence(
  present: AmapCollectedFacilityRecord,
  incoming: AmapCollectedFacilityRecord,
): AmapCollectedFacilityRecord {
  return {
    ...present,
    searchEvidence: [...new Set([...present.searchEvidence, ...incoming.searchEvidence])].sort(),
  };
}

function deduplicate(records: AmapCollectedFacilityRecord[]): AmapCollectedFacilityRecord[] {
  const ordered = records.sort((left, right) => left.name.localeCompare(right.name, "zh-CN"));
  const kept: AmapCollectedFacilityRecord[] = [];
  for (const record of ordered) {
    const duplicate = kept.some((existing) => (
      normalizeName(existing.name) === normalizeName(record.name)
      && distanceMeters(existing.amap.location, record.amap.location) <= 100
    ));
    if (!duplicate) kept.push(record);
  }
  return kept;
}

function normalizeName(name: string): string {
  return name.replace(/[（）()\s·]/g, "").toLowerCase();
}

function distanceMeters(leftLocation: string, rightLocation: string): number {
  const [leftLongitude, leftLatitude] = leftLocation.split(",").map(Number);
  const [rightLongitude, rightLatitude] = rightLocation.split(",").map(Number);
  const radians = (degrees: number): number => degrees * Math.PI / 180;
  const latitudeDelta = radians(rightLatitude - leftLatitude);
  const longitudeDelta = radians(rightLongitude - leftLongitude);
  const value = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(leftLatitude)) * Math.cos(radians(rightLatitude))
    * Math.sin(longitudeDelta / 2) ** 2;
  return 6_371_000 * 2 * Math.atan2(Math.sqrt(value), Math.sqrt(1 - value));
}

async function load(file: string): Promise<AmapCollectedFacilityRecord[]> {
  try {
    return JSON.parse(await readFile(file, "utf8")) as AmapCollectedFacilityRecord[];
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }
}

async function persist(
  directory: string,
  file: string,
  records: Map<string, AmapCollectedFacilityRecord>,
): Promise<void> {
  await mkdir(directory, { recursive: true });
  await writeFile(file, `${JSON.stringify(deduplicate([...records.values()]), null, 2)}\n`, "utf8");
}
