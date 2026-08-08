import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { AmapCollectedFacilityRecord } from "../domain/facility.js";

type ExportRecord = {
  address: string;
  category: string;
  classification_status: string;
  coordinate_system: "GCJ-02";
  district: string;
  latitude: string;
  longitude: string;
  match_confidence: string;
  name: string;
  source_id: string;
  source_url: string;
  verification_note: string;
};

export async function exportCityCatalogue(options: { citySlug: string; snapshot: string }): Promise<{ records: ExportRecord[]; report: object }> {
  const directory = join("data", "interim", options.snapshot);
  const [catalogue, metro] = await Promise.all([
    readJson<AmapCollectedFacilityRecord[]>(join(directory, "amap-city-catalogue.json")),
    readJson<AmapCollectedFacilityRecord[]>(join(directory, "amap-metro-lines.json")),
  ]);
  const records = dedupeCityLandmarks([...catalogue.filter((record) => shouldExportCatalogueRecord(record, options.citySlug)), ...metro.filter((record) => shouldExportMetroRecord(record, options.citySlug))]).map(toExport).sort((left, right) => left.category.localeCompare(right.category, "zh-CN") || left.name.localeCompare(right.name, "zh-CN"));
  const byCategory = Object.fromEntries(Object.entries(Object.groupBy(records, (record) => record.category)).map(([category, group]) => [category, group?.length ?? 0]));
  const report = { generatedAt: new Date().toISOString(), city: options.citySlug, totalRecords: records.length, byCategory, caveats: ["Coordinates are GCJ-02 as returned by Amap.", "Hospital grades are Amap keyword candidates and need official-source verification before being treated as authoritative.", "Catalogue categories are Amap-derived and may include omissions or stale POIs."] };
  const output = join("outputs", options.snapshot);
  await mkdir(output, { recursive: true });
  await writeFile(join(output, `${options.citySlug}-public-facilities.csv`), toCsv(records), "utf8");
  await writeFile(join(output, `${options.citySlug}-quality-report.json`), `${JSON.stringify(report, null, 2)}\n`, "utf8");
  return { records, report };
}

function toExport(record: AmapCollectedFacilityRecord): ExportRecord {
  const [longitude = "", latitude = ""] = record.amap.location.split(",");
  return { address: record.address, category: record.category, classification_status: record.classificationStatus, coordinate_system: "GCJ-02", district: record.district, latitude, longitude, match_confidence: "", name: record.name, source_id: record.sourceId, source_url: record.sourceUrl, verification_note: `Amap POI ${record.amap.poiId}; query: ${record.searchEvidence.join(" | ")}` };
}

function shouldExportCatalogueRecord(record: AmapCollectedFacilityRecord, citySlug: string): boolean {
  if (citySlug === "wuhu" && record.category === "transport.airport") return record.name === "芜湖宣州机场";
  if (citySlug === "wuhu" && record.category === "hospital.secondary_a") {
    return /医院$/.test(record.name) && !/妇产科|体检科|住院部/.test(record.name);
  }
  if (citySlug === "wuhu" && record.category === "landmark.city_landmark") {
    return ["鸠兹古镇", "芜湖古城", "芜湖方特乐园", "芜湖方特梦幻王国", "芜湖方特东方神画", "芜湖方特水上乐园", "中山路步行街", "广济寺", "天门山景区", "天门山公园"].includes(record.name);
  }
  if (citySlug === "zhuhai" && record.category === "transport.airport") return record.name === "珠海金湾机场";
  if (citySlug === "zhuhai" && record.category === "hospital.secondary_a") {
    return /医院$/.test(record.name) && !/妇产科|体检科|住院部/.test(record.name);
  }
  if (citySlug === "zhuhai" && record.category === "landmark.city_landmark") {
    return ["珠海日月贝", "情侣路", "港珠澳大桥", "港珠澳大桥(珠海段)", "长隆海洋王国", "圆明新园", "横琴金融岛中央公园"].includes(record.name);
  }
  if (citySlug === "beijing" && record.category === "landmark.city_landmark" && record.searchEvidence.includes("国贸CBD")) return false;
  if (citySlug === "beijing" && record.category === "transport.airport") return ["北京首都国际机场", "北京大兴国际机场"].includes(record.name);
  if (citySlug === "beijing" && record.category === "landmark.city_landmark") {
    return ["天安门", "故宫博物院", "天坛公园", "颐和园", "国家体育场", "国家游泳中心", "北京环球度假区", "什刹海", "北京坊", "中国国际贸易中心", "国贸商城"].includes(record.name);
  }
  if (citySlug === "hangzhou" && record.category === "transport.airport") return record.name === "杭州萧山国际机场";
  if (citySlug === "hangzhou" && record.category === "landmark.city_landmark") {
    return ["西湖", "灵隐寺", "雷峰塔景区", "雷峰塔景区雷峰塔", "六和塔文化公园", "钱江新城", "清河坊历史文化特色街区", "良渚古城遗址公园"].includes(record.name);
  }
  if (citySlug === "guangzhou" && record.category === "transport.airport") return record.name === "广州白云国际机场";
  if (citySlug === "guangzhou" && record.category === "landmark.city_landmark") {
    return ["广州塔", "陈家祠", "陈家祠堂", "沙面", "沙面岛", "北京路步行街", "永庆坊", "白云山风景名胜区"].includes(record.name);
  }
  if (citySlug === "shenzhen" && record.category === "transport.airport") return record.name === "深圳宝安国际机场";
  if (citySlug === "shenzhen" && record.category === "landmark.city_landmark") {
    return ["平安金融中心", "世界之窗", "锦绣中华民俗村", "东门老街", "大梅沙海滨公园", "深圳湾"].includes(record.name);
  }
  if (citySlug === "suzhou" && record.category === "transport.airport") return record.name === "苏南硕放国际机场";
  if (citySlug === "suzhou" && record.category === "landmark.city_landmark") {
    return ["拙政园", "苏州博物馆", "虎丘山风景名胜区", "平江路历史街区", "金鸡湖"].includes(record.name);
  }
  if (citySlug === "hefei" && record.category === "transport.airport") return record.name === "合肥新桥国际机场";
  if (citySlug === "hefei" && record.category === "landmark.city_landmark") {
    return ["包公园", "逍遥津公园", "李鸿章故居", "三河古镇", "安徽博物院", "天鹅湖"].includes(record.name);
  }
  if (citySlug === "nanjing" && record.category === "transport.airport") return record.name === "南京禄口国际机场";
  if (citySlug === "nanjing" && record.category === "landmark.city_landmark") {
    return ["中山陵", "中山陵景区", "夫子庙", "总统府", "总统府景区", "南京总统府", "南京总统府景区", "明孝陵", "明孝陵景区", "玄武湖"].includes(record.name);
  }
  if (citySlug === "chengdu" && record.category === "transport.airport") {
    return ["成都双流国际机场", "成都天府国际机场"].includes(record.name);
  }
  if (citySlug === "chengdu" && record.category === "landmark.city_landmark") {
    return ["天府广场", "成都大熊猫繁育研究基地", "武侯祠", "成都武侯祠", "成都武侯祠博物馆", "杜甫草堂", "成都杜甫草堂", "成都杜甫草堂博物馆", "宽窄巷子", "宽窄巷子景区", "春熙路"].includes(record.name);
  }
  if (citySlug === "chongqing" && record.category === "transport.airport") return record.name === "重庆江北国际机场";
  if (citySlug === "chongqing" && record.category === "landmark.city_landmark") {
    return ["解放碑", "洪崖洞", "磁器口古镇", "朝天门", "重庆人民大礼堂", "人民大礼堂", "长江索道", "重庆动物园"].includes(record.name);
  }
  if (citySlug === "wuhan" && record.category === "transport.airport") return record.name === "武汉天河国际机场";
  if (citySlug === "wuhan" && record.category === "landmark.city_landmark") {
    return ["黄鹤楼", "东湖风景区", "户部巷", "武汉长江大桥", "楚河汉街", "湖北省博物馆", "江汉路步行街"].includes(record.name);
  }
  if (citySlug === "xian" && record.category === "transport.airport") return record.name === "西安咸阳国际机场";
  if (citySlug === "xian" && record.category === "landmark.city_landmark") {
    return ["大雁塔", "西安城墙", "钟楼", "西安钟楼", "大唐不夜城", "大明宫国家遗址公园", "陕西历史博物馆", "回民街", "西安回民街"].includes(record.name);
  }
  return true;
}
function shouldExportMetroRecord(record: AmapCollectedFacilityRecord, citySlug: string): boolean {
  return citySlug !== "guangzhou" || record.searchEvidence.some((line) => !line.startsWith("佛山地铁"));
}
function dedupeCityLandmarks(records: AmapCollectedFacilityRecord[]): AmapCollectedFacilityRecord[] {
  const names = new Set<string>();
  return records.filter((record) => {
    if (record.category !== "landmark.city_landmark") return true;
    if (names.has(record.name)) return false;
    names.add(record.name);
    return true;
  });
}
async function readJson<T>(file: string): Promise<T> { return JSON.parse(await readFile(file, "utf8")) as T; }
function toCsv(records: ExportRecord[]): string {
  const headers = Object.keys(records[0] ?? {}) as Array<keyof ExportRecord>;
  return `${headers.join(",")}\n${records.map((record) => headers.map((header) => `"${record[header].replaceAll('"', '""')}"`).join(",")).join("\n")}\n`;
}
