const form = document.querySelector("#address-form");
const addressInput = document.querySelector("#address");
const resultContent = document.querySelector("#result-content");
const status = document.querySelector("#status");
const results = document.querySelector("#results");
const button = form.querySelector("button");
const categoryNav = document.querySelector("#category-nav");
const shareButton = document.querySelector("#open-share");
const searchHistory = document.querySelector("#search-history");
const historyItems = document.querySelector("#history-items");
const currentLocationButton = document.querySelector("#current-location");
const citySelect = document.querySelector("#city-select");
const activeCityLabel = document.querySelector("#active-city-label");
const dataNote = document.querySelector("#data-note");
const shareKicker = document.querySelector("#share-kicker");
const shareDialog = document.querySelector("#share-dialog");
const shareCloseButton = document.querySelector("#share-close");
const nativeShareButton = document.querySelector("#native-share");
const copyShareButton = document.querySelector("#copy-share");
const saveImageButton = document.querySelector("#save-image");
const saveImageMobileButton = document.querySelector("#save-image-mobile");
const shareAddress = document.querySelector("#share-address");
const shareQr = document.querySelector("#share-qr");
const shareLink = document.querySelector("#share-link");
const shareFeedback = document.querySelector("#share-feedback");
const HISTORY_LIMIT = 5;
const HISTORY_VISIBLE_LIMIT = 2;
const CITIES = {
  shanghai: { name: "上海", region: "华东", geocodeName: "上海市", example: "人民公园", center: { latitude: 31.2304, longitude: 121.4737 } },
  beijing: { name: "北京", region: "华北", geocodeName: "北京市", example: "天安门", center: { latitude: 39.9042, longitude: 116.4074 } },
  hangzhou: { name: "杭州", region: "华东", geocodeName: "杭州市", example: "西湖", center: { latitude: 30.2741, longitude: 120.1551 } },
  guangzhou: { name: "广州", region: "华南", geocodeName: "广州市", example: "广州塔", center: { latitude: 23.1291, longitude: 113.2644 } },
  shenzhen: { name: "深圳", region: "华南", geocodeName: "深圳市", example: "深圳湾公园", center: { latitude: 22.5431, longitude: 114.0579 } },
  suzhou: { name: "苏州", region: "华东", geocodeName: "苏州市", example: "拙政园", center: { latitude: 31.2989, longitude: 120.5853 } },
  hefei: { name: "合肥", region: "华东", geocodeName: "合肥市", example: "包公园", center: { latitude: 31.8206, longitude: 117.2272 } },
  nanjing: { name: "南京", region: "华东", geocodeName: "南京市", example: "中山陵", center: { latitude: 32.0603, longitude: 118.7969 } },
  chengdu: { name: "成都", region: "西南", geocodeName: "成都市", example: "天府广场", center: { latitude: 30.5728, longitude: 104.0668 } },
  wuhu: { name: "芜湖", region: "华东", geocodeName: "芜湖市", example: "镜湖公园", center: { latitude: 31.3525, longitude: 118.4331 } },
  zhuhai: { name: "珠海", region: "华南", geocodeName: "珠海市", example: "珠海大剧院", center: { latitude: 22.2710, longitude: 113.5767 } },
};
const CITY_REGION_ORDER = ["华东", "华北", "华南", "西南", "华中", "西北", "东北"];
const MAJOR_GROUPS = [
  { key: "education", label: "教育", shortLabel: "教育", color: "#5857a6", categories: ["education.university", "education.school", "education.kindergarten"] },
  { key: "transport", label: "交通", shortLabel: "交通", color: "#009a74", categories: ["transit.metro_station", "transport.railway_station", "transport.airport"] },
  { key: "culture", label: "文化艺术", shortLabel: "文化艺术", color: "#ce3347", categories: ["library.all", "culture.museum", "culture.art_gallery", "culture.concert_hall"] },
  { key: "health", label: "医疗健康", shortLabel: "医疗健康", color: "#bd2d45", categories: ["medical.tertiary_a", "medical.other"] },
  { key: "environment", label: "环境休闲", shortLabel: "环境休闲", color: "#23834d", categories: ["park.major_city_park", "park.neighborhood_park"] },
  { key: "commerce", label: "商业购物", shortLabel: "商业购物", color: "#de6a18", categories: ["commerce.big_box_retail", "commerce.large_mall"] },
  { key: "public-service", label: "公共服务", shortLabel: "公共服务", color: "#00888f", categories: ["community.civic_service_center"] },
  { key: "landmark", label: "城市地标", shortLabel: "城市地标", color: "#715bba", categories: ["landmark.city_landmark"] },
];

let facilities = [];
let amapReady;
let latestShare;
let activeCity = initialCity();
let catalogueReady = loadCatalogue(activeCity);

function loadCatalogue(city) {
  const cityConfig = CITIES[city];
  facilities = [];
  categoryNav.hidden = true;
  shareButton.hidden = true;
  status.textContent = `正在加载${cityConfig.name}地点目录`;
  resultContent.className = "empty-state";
  resultContent.innerHTML = `<h3>正在准备${cityConfig.name}地点</h3><p>目录加载完成后即可搜索地址。</p>`;
  return fetch(`data/${city}.json`)
  .then((response) => {
    if (!response.ok) throw new Error("地点目录加载失败，请刷新页面重试。");
    return response.json();
  })
  .then((catalogue) => {
    facilities = catalogue.facilities ?? [];
    if (facilities.length === 0) throw new Error("地点目录为空。");
    status.textContent = `已加载 ${facilities.length.toLocaleString("zh-CN")} 处${cityConfig.name}地点`;
    resultContent.innerHTML = "<h3>输入地址开始查找</h3><p>按大组整理结果，每个细分类别显示最近三处地点。</p>";
  })
  .catch((error) => renderMessage(error instanceof Error ? error.message : "地点目录加载失败。", "error"));
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  searchNearby(addressInput.value.trim());
});

citySelect.addEventListener("change", () => switchCity(citySelect.value));

historyItems.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-address]");
  if (!target) return;
  const address = target.dataset.address;
  addressInput.value = address;
  searchNearby(address);
});

currentLocationButton.addEventListener("click", async () => {
  setLocationLoading(true);
  setLoading(true);
  try {
    await catalogueReady;
    const origin = await getCurrentLocation();
    const nearbyCity = selectNearbyCity(origin);
    if (nearbyCity !== activeCity) {
      switchCity(nearbyCity);
      await catalogueReady;
    }
    renderPlaces({ origin, majorGroups: findNearestByMajorGroup(facilities, origin) });
  } catch (error) {
    renderMessage(error instanceof Error ? error.message : "无法获取当前位置。", "error");
  } finally {
    setLoading(false);
    setLocationLoading(false);
  }
});

categoryNav.addEventListener("click", (event) => {
  const target = event.target.closest("button[data-filter]");
  if (!target) return;
  const filter = target.dataset.filter;
  categoryNav.querySelectorAll("button[data-filter]").forEach((item) => {
    item.setAttribute("aria-pressed", String(item === target));
  });
  resultContent.querySelectorAll(".major-group").forEach((group) => {
    group.hidden = filter !== "all" && group.dataset.group !== filter;
  });
  if (filter !== "all") document.querySelector(`#major-${filter}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
});

shareButton.addEventListener("click", openShareDialog);

shareCloseButton.addEventListener("click", () => shareDialog.close());
shareDialog.addEventListener("click", (event) => {
  if (event.target === shareDialog) shareDialog.close();
});
nativeShareButton.addEventListener("click", shareCurrentResult);
copyShareButton.addEventListener("click", copyProjectLink);
saveImageButton.addEventListener("click", () => saveResultImage("desktop"));
saveImageMobileButton.addEventListener("click", () => saveResultImage("mobile"));

function initialCity() {
  const value = new URLSearchParams(window.location.search).get("city");
  return Object.hasOwn(CITIES, value) ? value : "shanghai";
}

function switchCity(city) {
  if (!Object.hasOwn(CITIES, city)) return;
  activeCity = city;
  const url = new URL(window.location.href);
  url.searchParams.set("city", city);
  window.history.replaceState({}, "", url);
  applyCityUi(city);
  catalogueReady = loadCatalogue(city);
  renderSearchHistory();
}

function applyCityUi(city) {
  const cityConfig = CITIES[city];
  addressInput.value = "";
  addressInput.placeholder = `例如：${cityConfig.example}`;
  dataNote.textContent = `${cityConfig.name}数据目录：GCJ-02 坐标 · 距离为直线距离，仅供出行初筛`;
  shareKicker.textContent = `${cityConfig.name}公共设施近邻检索`;
  citySelect.value = city;
  activeCityLabel.textContent = cityConfig.name;
}

function renderCityOptions() {
  const regions = new Map(CITY_REGION_ORDER.map((region) => [region, []]));
  Object.entries(CITIES).forEach(([slug, city]) => {
    const cities = regions.get(city.region) ?? [];
    cities.push({ slug, ...city });
    regions.set(city.region, cities);
  });
  citySelect.innerHTML = [...regions.entries()]
    .filter(([, cities]) => cities.length > 0)
    .map(([region, cities]) => `<optgroup label="${escapeHtml(region)}">${cities.map((city) => `<option value="${city.slug}">${escapeHtml(city.name)}</option>`).join("")}</optgroup>`)
    .join("");
}

async function searchNearby(address) {
  if (address.length < 2) {
    renderMessage("请输入更完整的地址。", "error");
    addressInput.focus();
    return;
  }

  setLoading(true);
  try {
    await catalogueReady;
    const origin = await geocodeAddress(address);
    saveSearchHistory(address);
    renderPlaces({ origin, majorGroups: findNearestByMajorGroup(facilities, origin) });
  } catch (error) {
    renderMessage(error instanceof Error ? error.message : "查询失败，请稍后重试。", "error");
  } finally {
    setLoading(false);
  }
}

function setLoading(loading) {
  results.setAttribute("aria-busy", String(loading));
  button.disabled = loading;
  button.setAttribute("aria-label", loading ? "正在定位" : "开始查询");
  if (loading) {
    status.textContent = "正在定位并计算各分组最近地点";
    categoryNav.hidden = true;
    shareButton.hidden = true;
    resultContent.className = "loading-state";
    resultContent.innerHTML = "<span></span><span></span><span></span><p>正在查询高德地图</p>";
  }
}

function setLocationLoading(loading) {
  currentLocationButton.disabled = loading;
  currentLocationButton.querySelector("span").textContent = loading ? "正在定位" : "使用当前位置";
}

function geocodeAddress(address) {
  return loadAmap().then(() => new Promise((resolve, reject) => {
    let settled = false;
    const timeout = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error("高德地址解析超时，请检查网络或域名白名单。"));
    }, 12_000);
    const geocoder = new window.AMap.Geocoder({ city: CITIES[activeCity].geocodeName });
    geocoder.getLocation(address, (status, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      const place = result?.geocodes?.[0];
      if (status !== "complete" || result?.info !== "OK" || !place?.location) {
        reject(new Error("没有找到这个地址，请补充区、路名或门牌号。"));
        return;
      }
      resolve({
        formattedAddress: place.formattedAddress || address,
        latitude: Number(place.location.lat),
        longitude: Number(place.location.lng),
      });
    });
  }));
}

function getCurrentLocation() {
  return loadAmapPlugin("AMap.Geolocation", "Geolocation").then(() => new Promise((resolve, reject) => {
    const geolocation = new window.AMap.Geolocation({ enableHighAccuracy: true, timeout: 10_000, convert: true });
    geolocation.getCurrentPosition((status, result) => {
      if (status !== "complete" || !result?.position) {
        reject(new Error("定位失败，请允许浏览器访问位置后重试。"));
        return;
      }
      resolve({
        city: typeof result.addressComponent?.city === "string" ? result.addressComponent.city : "",
        formattedAddress: result.formattedAddress || "当前位置",
        latitude: Number(result.position.lat),
        longitude: Number(result.position.lng),
      });
    });
  }));
}

function selectNearbyCity(origin) {
  const reportedCity = String(origin.city || "").replace(/市$/, "");
  const exactCity = Object.entries(CITIES).find(([, city]) => city.name === reportedCity)?.[0];
  if (exactCity) return exactCity;
  const [nearestCity, distance] = Object.entries(CITIES)
    .map(([city, config]) => [city, haversineMeters(origin, config.center)])
    .sort(([, left], [, right]) => left - right)[0];
  return distance <= 100_000 ? nearestCity : activeCity;
}

function loadAmap() {
  if (amapReady) return amapReady;
  const config = window.AMAP_CONFIG;
  if (!config?.key || !config?.securityJsCode) return Promise.reject(new Error("高德地图配置缺失。"));
  window._AMapSecurityConfig = { securityJsCode: config.securityJsCode };
  amapReady = new Promise((resolve, reject) => {
    let finished = false;
    const complete = () => {
      if (finished || !window.AMap?.Geocoder) return;
      finished = true;
      clearInterval(checkReady);
      clearTimeout(timeout);
      resolve();
    };
    const fail = (message) => {
      if (finished) return;
      finished = true;
      clearInterval(checkReady);
      clearTimeout(timeout);
      reject(new Error(message));
    };
    const checkReady = setInterval(complete, 100);
    const timeout = setTimeout(() => fail("高德地图初始化超时，请检查网络或域名白名单。"), 12_000);
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(config.key)}&plugin=AMap.Geocoder`;
    script.async = true;
    script.onload = complete;
    script.onerror = () => fail("无法连接高德地图，请检查网络或域名白名单。");
    document.head.append(script);
  });
  return amapReady;
}

function loadAmapPlugin(pluginName, className) {
  return loadAmap().then(() => {
    if (window.AMap?.[className]) return undefined;
    return new Promise((resolve, reject) => {
      window.AMap.plugin(pluginName, () => window.AMap?.[className] ? resolve() : reject(new Error("高德定位插件初始化失败。")));
    });
  });
}

function findNearestByCategory(catalogue, origin) {
  const groups = new Map();
  for (const facility of catalogue) {
    const category = displayCategoryFor(facility.category);
    const items = groups.get(category) ?? [];
    items.push(facility);
    groups.set(category, items);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => categorySortOrder(left) - categorySortOrder(right))
    .map(([category, items]) => {
      const ranked = items.map((place) => ({ ...place, distanceMeters: nearestDistance(origin, place) }))
        .sort((left, right) => left.distanceMeters - right.distanceMeters);
      const seenNames = new Set();
      const unique = category === "education.university"
        ? ranked.filter((place) => {
          const key = place.name.replace(/[（）()\s·]/g, "").toLowerCase();
          if (seenNames.has(key)) return false;
          seenNames.add(key);
          return true;
        })
        : ranked;
      return { category, places: unique.slice(0, 3) };
    });
}

function findNearestByMajorGroup(catalogue, origin) {
  const categoryGroups = new Map(findNearestByCategory(catalogue, origin).map((group) => [group.category, group]));
  return MAJOR_GROUPS.map((major) => {
    const subgroups = major.categories.map((category) => categoryGroups.get(category)).filter(Boolean);
    return { ...major, subgroups };
  }).filter((major) => major.subgroups.length > 0);
}

function nearestDistance(origin, place) {
  const locations = place.sourceLocations ?? place.stationLocations ?? [place];
  return Math.round(Math.min(...locations.map((location) => haversineMeters(origin, location))));
}

function haversineMeters(first, second) {
  const toRadians = (degrees) => degrees * Math.PI / 180;
  const dLat = toRadians(second.latitude - first.latitude);
  const dLng = toRadians(second.longitude - first.longitude);
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(toRadians(first.latitude)) * Math.cos(toRadians(second.latitude)) * Math.sin(dLng / 2) ** 2;
  return 6_371_008.8 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function renderPlaces(payload) {
  const { origin, majorGroups } = payload;
  const groups = majorGroups.flatMap((major) => major.subgroups.map((group) => ({ ...group, majorKey: major.key, majorLabel: major.label })));
  latestShare = { address: origin.formattedAddress, majorGroups, groups };
  status.textContent = origin.formattedAddress;
  shareButton.hidden = false;
  categoryNav.hidden = false;
  categoryNav.innerHTML = [
    `<button type="button" data-filter="all" aria-pressed="true" title="显示全部分组"><span>全部</span><b>${majorGroups.length}</b></button>`,
    ...majorGroups.map((major) => `<button type="button" data-filter="${major.key}" style="--route:${major.color}" aria-pressed="false" aria-label="筛选${escapeHtml(major.label)}" title="筛选${escapeHtml(major.label)}"><span>${escapeHtml(major.shortLabel)}</span><b>${major.subgroups.length}</b></button>`),
  ].join("");
  resultContent.className = "place-list";
  resultContent.innerHTML = majorGroups.map((major) => {
    const count = major.subgroups.reduce((total, group) => total + group.places.length, 0);
    return `<section class="major-group" id="${majorGroupId(major.key)}" data-group="${major.key}" style="--route:${major.color}" aria-label="${escapeHtml(major.label)}"><header class="major-heading"><div><p>结果分组</p><h3>${escapeHtml(major.label)}</h3></div><strong>${count} 个结果</strong></header>${major.subgroups.map((group) => renderSubgroup(group)).join("")}</section>`;
  }).join("");
}

function renderSubgroup(group) {
  const meta = categoryMeta(group.category);
  return `<section class="category-group subgroup" style="--route:${meta.color}" aria-label="${escapeHtml(meta.label)}"><header class="category-heading"><p>${escapeHtml(meta.label)}</p><span>${group.places.length} 处</span></header>${group.places.map((place) => `<article class="place"><div class="place-main"><h3>${escapeHtml(place.name)}</h3>${renderAlternateNames(place)}${place.metroLines?.length ? `<p class="metro-lines">${escapeHtml(place.metroLines.join(" · "))}</p>` : ""}<p class="address">${escapeHtml(place.district || CITIES[activeCity].name)}${place.address ? " · " + escapeHtml(place.address) : ""}</p></div><div class="distance"><strong>${formatDistance(place.distanceMeters)}</strong><span>直线距离</span></div></article>`).join("")}</section>`;
}

function projectUrl() {
  const url = new URL("./", window.location.href);
  url.searchParams.set("city", activeCity);
  return url.href;
}

function shareText() {
  return `${latestShare.address}附近公共设施结果，共${latestShare.majorGroups.length}个分组。`;
}

function openShareDialog() {
  if (!latestShare) return;
  const url = projectUrl();
  shareAddress.textContent = latestShare.address;
  shareLink.href = url;
  shareLink.textContent = url.replace(/^https?:\/\//, "");
  shareQr.crossOrigin = "anonymous";
  shareQr.src = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(url)}`;
  shareFeedback.textContent = "";
  shareDialog.showModal();
}

async function saveResultImage(variant) {
  if (!latestShare?.groups?.length) return;
  saveImageButton.disabled = true;
  saveImageMobileButton.disabled = true;
  const isMobile = variant === "mobile";
  shareFeedback.textContent = `正在生成${isMobile ? "手机版" : "桌面版"}长图…`;
  try {
    const blob = await (isMobile ? createMobileShareImage : createShareImage)(latestShare);
    const filename = `近邻-${CITIES[activeCity].name}-${isMobile ? "手机版" : "桌面版"}结果.png`;
    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = filename;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    shareFeedback.textContent = `${isMobile ? "手机版" : "桌面版"}长图已下载。`;
  } catch (error) {
    if (error?.name !== "AbortError") shareFeedback.textContent = "长图生成失败，请稍后重试。";
  } finally {
    saveImageButton.disabled = false;
    saveImageMobileButton.disabled = false;
  }
}

async function createShareImage(share) {
  return createShareImageVariant(share, {
    width: 1080,
    margin: 56,
    groupGap: 28,
    columns: 2,
    headerHeight: 248,
    footerHeight: 136,
    qrFrame: 156,
    tileStyle: {
      firstRowOffset: 82,
      rowStep: 69,
      bottomSpace: 60,
      headingSize: 23,
      countSize: 17,
      numberSize: 16,
      nameSize: 20,
      distanceSize: 18,
      detailSize: 16,
      tilePadding: 30,
      detailOffset: 30,
    },
    headerStyle: { logoSize: 58, titleSize: 32, addressSize: 24, metaSize: 19 },
    footerStyle: { labelSize: 19, linkSize: 19 },
  });
}

async function createMobileShareImage(share) {
  return createShareImageVariant(share, {
    width: 750,
    margin: 42,
    groupGap: 24,
    columns: 1,
    headerHeight: 300,
    footerHeight: 178,
    qrFrame: 148,
    tileStyle: {
      firstRowOffset: 96,
      rowStep: 76,
      bottomSpace: 64,
      headingSize: 28,
      countSize: 21,
      numberSize: 19,
      nameSize: 27,
      distanceSize: 23,
      detailSize: 20,
      tilePadding: 34,
      detailOffset: 34,
    },
    headerStyle: { logoSize: 56, titleSize: 34, addressSize: 27, metaSize: 21 },
    footerStyle: { labelSize: 21, linkSize: 21 },
  });
}

async function createShareImageVariant(share, options) {
  const { width, margin, groupGap, columns, headerHeight, footerHeight, qrFrame, tileStyle, headerStyle, footerStyle } = options;
  const tileWidth = (width - margin * 2 - groupGap * (columns - 1)) / columns;
  const tileHeights = share.groups.map((group) => shareTileHeight(group, tileStyle));
  const rowCount = Math.ceil(share.groups.length / columns);
  const rowHeights = Array.from({ length: rowCount }, (_, row) => Math.max(...tileHeights.slice(row * columns, row * columns + columns)));
  const bodyHeight = rowHeights.reduce((sum, height) => sum + height, 0) + Math.max(0, rowCount - 1) * groupGap;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = headerHeight + bodyHeight + footerHeight;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas is unavailable.");
  const qrImage = await Promise.race([
    loadShareQrImage(projectUrl()),
    new Promise((resolve) => window.setTimeout(() => resolve(null), 3500)),
  ]);
  context.fillStyle = "#f7f5ef";
  context.fillRect(0, 0, canvas.width, canvas.height);
  drawShareHeader(context, share, { width, margin, headerHeight, qrFrame, qrImage, ...headerStyle });

  let rowY = headerHeight;
  share.groups.forEach((group, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    if (column === 0 && index > 0) rowY += rowHeights[row - 1] + groupGap;
    const x = margin + column * (tileWidth + groupGap);
    drawShareTile(context, group, x, rowY, tileWidth, rowHeights[row], tileStyle);
  });

  drawShareFooter(context, canvas.height - footerHeight, { width, margin, ...footerStyle });
  return canvasToBlob(canvas);
}

function drawShareHeader(context, share, options) {
  const { width, margin, headerHeight, qrFrame, qrImage, logoSize, titleSize, addressSize, metaSize } = options;
  const logoY = 34;
  const titleX = margin + logoSize + 20;
  const qrReserve = qrImage ? qrFrame + 18 : 0;
  const titleMaxWidth = width - titleX - margin - qrReserve;
  const textMaxWidth = width - margin * 2 - qrReserve;
  context.fillStyle = "#10223c";
  context.fillRect(0, 0, width, headerHeight);
  context.fillStyle = "#e94335";
  context.fillRect(margin, logoY, logoSize, logoSize);
  context.fillStyle = "#ffffff";
  context.font = `700 ${Math.round(logoSize * .58)}px "Noto Sans SC", sans-serif`;
  context.textAlign = "center";
  context.fillText("近", margin + logoSize / 2, logoY + logoSize * .69);
  context.textAlign = "left";
  context.font = `700 ${titleSize}px "Noto Sans SC", sans-serif`;
  drawTrimmedText(context, `${CITIES[activeCity].name}公共设施近邻`, titleX, logoY + logoSize * .67, titleMaxWidth);
  context.font = `500 ${addressSize}px "Noto Sans SC", sans-serif`;
  drawTrimmedText(context, share.address, margin, headerHeight - 104, textMaxWidth);
  context.fillStyle = "#b9c4cb";
  context.font = `400 ${metaSize}px "Noto Sans SC", sans-serif`;
  const majorCount = share.majorGroups?.length ?? share.groups.length;
  context.fillText(`${majorCount} 个分组 · ${share.groups.length} 个细分类别 · 每类最多 3 个结果 · 直线距离`, margin, headerHeight - 58);
  if (qrImage) {
    const frameX = width - margin - qrFrame;
    context.fillStyle = "#ffffff";
    context.fillRect(frameX, 30, qrFrame, qrFrame);
    context.drawImage(qrImage, frameX + 8, 38, qrFrame - 16, qrFrame - 16);
  }
}

function drawShareFooter(context, footerY, options) {
  const { width, margin, labelSize, linkSize } = options;
  context.strokeStyle = "#cdd0cf";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(margin, footerY + 16);
  context.lineTo(width - margin, footerY + 16);
  context.stroke();
  context.fillStyle = "#61707a";
  context.font = `400 ${labelSize}px "Noto Sans SC", sans-serif`;
  context.fillText("打开项目查看实时查询", margin, footerY + 62);
  context.fillStyle = "#10223c";
  context.font = `600 ${linkSize}px "Noto Sans SC", sans-serif`;
  drawTrimmedText(context, projectUrl(), margin, footerY + 104, width - margin * 2);
}

function shareTileHeight(group, style) {
  return style.firstRowOffset + Math.max(0, group.places.length - 1) * style.rowStep + style.bottomSpace;
}

function drawShareTile(context, group, x, y, width, height, style) {
  const meta = categoryMeta(group.category);
  context.fillStyle = "#ffffff";
  context.fillRect(x, y, width, height);
  context.fillStyle = meta.color;
  context.fillRect(x, y, width, 8);
  context.fillStyle = "#18252c";
  context.font = `700 ${style.headingSize}px "Noto Sans SC", sans-serif`;
  drawTrimmedText(context, group.majorLabel ? `${group.majorLabel} · ${meta.label}` : meta.label, x + style.tilePadding, y + 44, width - style.tilePadding * 2 - 110);
  context.fillStyle = "#61707a";
  context.font = `400 ${style.countSize}px "Noto Sans SC", sans-serif`;
  context.textAlign = "right";
  context.fillText(`${group.places.length} 个`, x + width - style.tilePadding, y + 44);
  context.textAlign = "left";
  group.places.forEach((place, index) => {
    const rowY = y + style.firstRowOffset + index * style.rowStep;
    context.strokeStyle = "#e2e3df";
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(x + style.tilePadding, rowY - 25);
    context.lineTo(x + width - style.tilePadding, rowY - 25);
    context.stroke();
    context.fillStyle = "#7a858b";
    context.font = `600 ${style.numberSize}px system-ui, sans-serif`;
    context.fillText(String(index + 1).padStart(2, "0"), x + style.tilePadding, rowY + 6);
    context.fillStyle = "#18252c";
    context.font = `600 ${style.nameSize}px "Noto Sans SC", sans-serif`;
    const textX = x + style.tilePadding + 40;
    drawTrimmedText(context, place.name, textX, rowY + 5, width - style.tilePadding * 2 - 160);
    context.fillStyle = meta.color;
    context.font = `700 ${style.distanceSize}px system-ui, sans-serif`;
    context.textAlign = "right";
    context.fillText(formatDistance(place.distanceMeters), x + width - style.tilePadding, rowY + 5);
    context.textAlign = "left";
    context.fillStyle = "#61707a";
    context.font = `400 ${style.detailSize}px "Noto Sans SC", sans-serif`;
    const detail = [place.metroLines?.join(" · "), place.district, place.address].filter(Boolean).join(" · ");
    drawTrimmedText(context, detail || "地址待补充", textX, rowY + style.detailOffset, width - style.tilePadding * 2 - 40);
  });
}

function drawTrimmedText(context, text, x, y, maxWidth) {
  let value = String(text || "");
  while (value.length > 1 && context.measureText(value).width > maxWidth) value = `${value.slice(0, -2)}…`;
  context.fillText(value, x, y);
}

function loadShareQrImage(url) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4500);
  return fetch(`https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(url)}`, { mode: "cors", signal: controller.signal })
    .then((response) => {
      if (!response.ok) throw new Error("QR request failed");
      return response.blob();
    })
    .then((blob) => new Promise((resolve, reject) => {
      const image = new Image();
      const objectUrl = URL.createObjectURL(blob);
      const imageTimeout = window.setTimeout(() => {
        URL.revokeObjectURL(objectUrl);
        reject(new Error("QR image timeout"));
      }, 1500);
      image.onload = () => { window.clearTimeout(imageTimeout); URL.revokeObjectURL(objectUrl); resolve(image); };
      image.onerror = () => { window.clearTimeout(imageTimeout); URL.revokeObjectURL(objectUrl); reject(new Error("QR image failed")); };
      image.src = objectUrl;
    }))
    .catch(() => null)
    .finally(() => window.clearTimeout(timeout));
}

function canvasToBlob(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("Image export failed")), "image/png");
  });
}

async function shareCurrentResult() {
  if (!latestShare) return;
  if (!navigator.share) {
    await copyProjectLink();
    return;
  }
  try {
    await navigator.share({ title: `近邻｜${CITIES[activeCity].name}公共设施`, text: shareText(), url: projectUrl() });
    shareFeedback.textContent = "已打开系统分享。";
  } catch (error) {
    if (error?.name !== "AbortError") shareFeedback.textContent = "系统分享暂不可用，可复制项目链接。";
  }
}

async function copyProjectLink() {
  try {
    await navigator.clipboard.writeText(projectUrl());
    shareFeedback.textContent = "项目链接已复制。";
  } catch {
    shareFeedback.textContent = "复制失败，请长按链接手动复制。";
  }
}

function renderAlternateNames(place) {
  const alternateNames = (place.alternateNames || []).filter((name) => name !== place.name);
  return alternateNames.length ? `<p class="merged-names">同址/近邻服务点 · ${escapeHtml(alternateNames.join(" · "))}</p>` : "";
}

function renderMessage(message, type) {
  categoryNav.hidden = true;
  shareButton.hidden = true;
  status.textContent = type === "error" ? "无法完成定位" : "输入地址后开始检索";
  resultContent.className = `empty-state ${type}`;
  resultContent.innerHTML = `<h3>${escapeHtml(message)}</h3><p>请补充区、路名或门牌号后重试。</p>`;
}

function saveSearchHistory(address) {
  const history = [address, ...getSearchHistory().filter((item) => item !== address)].slice(0, HISTORY_LIMIT);
  localStorage.setItem(historyStorageKey(), JSON.stringify(history));
  renderSearchHistory(history);
}

function getSearchHistory() {
  try {
    const saved = JSON.parse(localStorage.getItem(historyStorageKey()) || "[]");
    return Array.isArray(saved) ? saved.filter((item) => typeof item === "string" && item.length > 0).slice(0, HISTORY_LIMIT) : [];
  } catch { return []; }
}

function historyStorageKey() { return `public-facilities-search-history:${activeCity}`; }

function renderSearchHistory(history = getSearchHistory()) {
  searchHistory.hidden = history.length === 0;
  historyItems.innerHTML = history.slice(0, HISTORY_VISIBLE_LIMIT).map((address) => `<button type="button" data-address="${escapeHtml(address)}" title="${escapeHtml(address)}">${escapeHtml(address)}</button>`).join("");
}

function displayCategoryFor(category) {
  if (category.startsWith("library.")) return "library.all";
  if (category === "hospital.tertiary_a") return "medical.tertiary_a";
  if (category === "hospital.secondary_a" || category.startsWith("primary_care.")) return "medical.other";
  return category;
}

function categorySortOrder(category) {
  return ["transit.metro_station", "transport.railway_station", "transport.airport", "medical.tertiary_a", "medical.other", "education.university", "education.school", "education.kindergarten", "community.civic_service_center", "library.all", "culture.museum", "culture.art_gallery", "culture.concert_hall", "park.major_city_park", "park.neighborhood_park", "commerce.big_box_retail", "commerce.large_mall", "landmark.city_landmark"].indexOf(category);
}

function categoryMeta(category) {
  const categories = {
    "education.university": { label: "大学", shortLabel: "大学", color: "#5857a6" }, "education.school": { label: "中小学", shortLabel: "中小学", color: "#4c6fae" }, "education.kindergarten": { label: "幼儿园", shortLabel: "幼儿园", color: "#e0843a" },
    "culture.art_gallery": { label: "美术馆", shortLabel: "美术馆", color: "#e54b3f" }, "culture.concert_hall": { label: "音乐厅", shortLabel: "音乐厅", color: "#9a4f9e" }, "culture.museum": { label: "博物馆", shortLabel: "博物馆", color: "#ce3347" }, "commerce.big_box_retail": { label: "大型仓储零售", shortLabel: "仓储零售", color: "#c78c00" }, "commerce.large_mall": { label: "大型商场", shortLabel: "大型商场", color: "#de6a18" }, "community.civic_service_center": { label: "社区文化与党群服务中心", shortLabel: "社区中心", color: "#00888f" }, "landmark.city_landmark": { label: "城市地标", shortLabel: "城市地标", color: "#715bba" }, "library.all": { label: "图书馆", shortLabel: "图书馆", color: "#3474b9" }, "medical.tertiary_a": { label: "三级甲等医院", shortLabel: "三甲医院", color: "#bd2d45" }, "medical.other": { label: "其他医疗机构", shortLabel: "其他医疗", color: "#de6a79" }, "park.major_city_park": { label: "大型市级公园", shortLabel: "市级公园", color: "#23834d" }, "park.neighborhood_park": { label: "街区与口袋公园", shortLabel: "口袋公园", color: "#68a52b" }, "transit.metro_station": { label: "地铁站", shortLabel: "地铁站", color: "#009a74" }, "transport.airport": { label: "机场", shortLabel: "机场", color: "#3c87b9" }, "transport.railway_station": { label: "火车站", shortLabel: "火车站", color: "#df831e" },
  };
  return categories[category] || { label: category, shortLabel: category, color: "#617077" };
}

function formatDistance(meters) { return meters < 1000 ? `${meters} m` : `${(meters / 1000).toFixed(1)} km`; }
function formatCoordinate(latitude, longitude) { return `${latitude.toFixed(5)}°N, ${longitude.toFixed(5)}°E`; }
function majorGroupId(key) { return `major-${key}`; }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", '"': "&quot;" }[character])); }

renderCityOptions();
applyCityUi(activeCity);
renderSearchHistory();
