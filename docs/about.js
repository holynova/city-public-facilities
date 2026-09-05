const CITIES = [
  ["shanghai", "上海"],
  ["beijing", "北京"],
  ["sanhe", "三河（燕郊）"],
  ["hangzhou", "杭州"],
  ["guangzhou", "广州"],
  ["shenzhen", "深圳"],
  ["suzhou", "苏州"],
  ["hefei", "合肥"],
  ["nanjing", "南京"],
  ["chengdu", "成都"],
  ["chongqing", "重庆"],
  ["wuhan", "武汉"],
  ["xian", "西安"],
  ["wuhu", "芜湖"],
  ["zhuhai", "珠海"],
];

const cityBoard = document.querySelector("#city-board");
const cityTotal = document.querySelector("#city-total");
const facilityTotal = document.querySelector("#facility-total");

cityTotal.textContent = CITIES.length.toLocaleString("zh-CN");

Promise.all(CITIES.map(async ([slug, name]) => {
  const response = await fetch(`data/${slug}.json`);
  if (!response.ok) throw new Error(`${name}数据加载失败`);
  const catalogue = await response.json();
  return { name, count: Array.isArray(catalogue.facilities) ? catalogue.facilities.length : 0 };
}))
  .then((cities) => {
    facilityTotal.textContent = cities.reduce((total, city) => total + city.count, 0).toLocaleString("zh-CN");
    cityBoard.innerHTML = cities.map((city, index) => `
      <li class="city-row">
        <span class="city-index">${String(index + 1).padStart(2, "0")}</span>
        <span class="city-name">${city.name}</span>
        <span class="city-count">${city.count.toLocaleString("zh-CN")}<small>条</small></span>
      </li>
    `).join("");
  })
  .catch(() => {
    facilityTotal.textContent = "读取失败";
    cityBoard.innerHTML = '<li class="city-row"><span class="city-index">--</span><span class="city-name">城市数据暂时无法读取</span><span class="city-count"><small>请刷新</small></span></li>';
  });
