# 近邻

## 🚀 在线 Demo

### [👉 立即打开近邻，查询附近的公共设施](https://holynova.github.io/city-public-facilities/)

<p align="center">
  <a href="https://holynova.github.io/city-public-facilities/">
    <img src="assets/demo-qr.png" width="200" alt="扫码打开近邻在线 Demo" />
  </a>
  <br />
  <strong>手机扫码即可访问在线 Demo</strong>
</p>

![近邻移动端截图](assets/screenshot.png)

上海、北京、三河（燕郊）、杭州、广州、深圳、苏州、合肥、南京、成都、重庆、武汉、西安、芜湖、珠海公共地点近邻检索；选择城市帮助解析地址后，会在全部城市目录中按教育、交通、文化艺术、医疗健康、环境休闲、商业购物、公共服务和城市地标分组展示最近地点。

[GitHub Repo](https://github.com/holynova/city-public-facilities) · [GitHub Pages](https://holynova.github.io/city-public-facilities/)

## 数据说明

网站展示按需人工更新的公共设施数据快照。三河（燕郊）目录基于 [OpenStreetMap contributors](https://www.openstreetmap.org/copyright) 的公开地图数据整理并转换为 GCJ-02；其他城市沿用公开目录与高德地图地点数据。距离基于 GCJ-02 坐标计算，为两点间直线距离，不代表实际步行或驾车路线。

查询结果仅供出行初步筛选；场所开放状态、医院等级、学校属性和服务范围等信息，请以主管部门或场所官方渠道为准。

详细说明：[数据方法与使用边界](https://holynova.github.io/city-public-facilities/about.html#data-method)

## 网站发布

主站为 https://city-public-facilities.xiaosang.cc/，由独立的 Cloudflare Worker
`city-public-facilities` 托管。GitHub Pages 使用 `master:/docs`，保留为备用地址。
推送 `master` 只会更新 GitHub Pages，不会自动发布 Cloudflare。

两个渠道统一使用主分支已提交的 `docs/` 静态文件。Cloudflare 发布时从已提交
版本导出干净目录，避免上传本地设计预览、报告或其他未提交内容：

```sh
release_dir=$(mktemp -d)
git archive HEAD docs wrangler.jsonc | tar -x -C "$release_dir"
(cd "$release_dir" && npx wrangler@4.129.0 deploy)
```

发布后分别核对 Pages 构建提交、Worker 部署版本，以及两个域名的
`index.html`、`app.js`、`styles.css` 和城市目录。浏览器验证城市切换、查询等待状态、
每类默认三项以及展开/收起（最多十项）；不能仅凭 Git 推送成功就认为主站已更新。
