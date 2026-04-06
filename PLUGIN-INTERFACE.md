# 插件接口与配置分工 — Robotime Community Theme

> 本文档说明：**哪些能力必须依赖插件**、**哪些可在主题内配置**、**统一数据格式**、**主题如何取数**，以及 **插件侧实现与后台需求**。  
> 实现代码以仓库内 `javascripts/discourse/api-initializers/robotime-hub.js`、`settings.yml` 为准。  
> **视觉与交互稿**：`design-rule/` 下 JPG + `DESIGN-SPEC.md`（含 **设计资源索引 §零**、**固定顶栏/轮播收缩 §十**、**稿码差异 §十一**）；若与本文冲突，以 **本文 + 代码** 为数据源准绳，以 **DESIGN-SPEC** 为视觉准绳并推动设计改稿。

---

## 一、功能 × 数据源 × 配置入口（总表）

**约定（当前实现）**：**导航、预显标签、Logo、侧栏标题与「查看全部」** 一律以 **主题 Theme settings**（`settings.yml`）为准；`hub-config.json` **不再**用于这些字段（即使 JSON 里带了也会被忽略）。

| 功能 | 是否必须插件 | 配置位置 | 说明 |
|------|-------------|----------|------|
| 顶栏中间导航 | **否** | **主题**：`robotime_nav_links` | `标签\|URL` 逗号分隔，由 `robotime-hub.js` 解析。 |
| 列表预显标签 | **否** | **主题**：`robotime_filter_quick_tags` | JSON 数组字符串。 |
| 顶栏 Logo | **否** | **主题**：`robotime_logo_url` | 非空时用 `<img>` 替换默认 ROBOTIME 文字。 |
| 侧栏活动区标题 / 查看全部 | **否** | **主题**：`robotime_sidebar_section_title`、`robotime_sidebar_view_all_*` | 与侧栏 **图片轮播数据** 分离；见下栏。 |
| 顶栏下分类轮播 `hero_banners` | **视情况** | **`hub-config.json`**（或静态文件/代理） | 主题仅 **`robotime_carousel_enabled`** 控制是否展示；关则忽略 JSON 中的 `hero_banners`。 |
| 侧栏幻灯片 `sidebar_widgets` | **视情况** | **`hub-config.json`** | 标题条与「查看全部」仍用主题设置；`image_url` 须可访问（见 §9）。 |
| 侧栏菜单图标、话题卡片、布局 | **否** | 主题 SCSS + JS | 不读 JSON。 |
| `robotime_official_events_category` | **否** | 主题（预留） | 当前 JS **未**自动参与 hub 合并，仅供运营备注或后续扩展。 |

**结论简述**

- **无插件**：导航 / 标签 / Logo / 侧栏文案 **可完全可用**；轮播与侧栏图卡为空，直至提供最小 `hub-config.json`（可只含 `hero_banners` / `sidebar_widgets`）。  
- **仍建议插件**：维护 **多图轮播**、**侧栏 widget**、**上传 URL 规范化**（避免 `upload://` 直出）。

---

## 二、统一数据模型：`hub-config.json`

主题内 `applyHubConfig(config)` 按下列字段消费数据（**全部为可选**；缺省则对应区块不渲染或保持空）。

**请求**：`GET /hub-config.json`（`Content-Type: application/json`）  
**说明**：路径须与 `robotime-hub.js` 中 `fetch` 一致；若插件使用其他路径，需改主题或做路由别名。

```json
{
  "hero_banners": [
    {
      "title": "User Guide & Perks",
      "image_url": "/uploads/default/original/1/abc.png",
      "bg_color": "#f6ebe3",
      "link_url": "/c/user-guide-perks"
    }
  ],
  "sidebar_widgets": [
    {
      "title": "Sweet Shack",
      "image_url": "/uploads/default/original/events/sweet.png",
      "link_url": "/t/123"
    }
  ]
}
```

> **兼容说明**：旧版 JSON 若仍包含 `nav_items`、`filter_quick_tags`、`sidebar_section_title`、`sidebar_view_all`，**主题会忽略**，以免与 Theme settings 冲突。

### 2.1 字段说明（摘要）

| 字段 | 类型 | 主题行为 |
|------|------|----------|
| `hero_banners` | `array<{title,image_url,bg_color?,link_url}>` | 写入 `#carousel-track`（且 `robotime_carousel_enabled` 为 true 时） |
| `sidebar_widgets` | `array<{title,image_url,link_url}>` | 侧栏轮播/单卡；多条时约 5s 切换 |
| ~~`nav_items`~~ 等 | — | **不消费**；请用主题设置 |

详细 UI 行为、样式约定仍以本文档后续章节及 `design-rule/` 设计稿为准。

---

## 三、主题 `settings.yml`（权威项）

管理员路径：**Admin → Customize → Themes → [本主题] → Theme settings**。

| 设置 key | 类型 | 用途 |
|----------|------|------|
| `robotime_logo_url` | string | 顶栏 Logo 图片；空则显示默认 `ROBOTIME` 文字 |
| `robotime_nav_links` | string | 顶栏 + 移动菜单导航，`Label\|URL`，逗号分隔 |
| `robotime_carousel_enabled` | bool | 是否显示顶栏轮播并渲染 `hero_banners` |
| `robotime_sidebar_section_title` | string | 侧栏 widget 区块标题（有 `sidebar_widgets` 时显示） |
| `robotime_sidebar_view_all_label` | string | 「查看全部」文案 |
| `robotime_sidebar_view_all_url` | string | 「查看全部」链接；**空则不渲染该链接** |
| `robotime_filter_quick_tags` | string | 话题列表预显标签，JSON 数组 |
| `robotime_official_events_category` | string | 预留，当前不参与合并 |

主题编译时 Discourse 会注入全局 **`settings`** 对象；`robotime-hub.js` 通过 `getThemeSettings()` 读取上述键。

---

## 四、主题侧：数据流（实现现状）

| 步骤 | 说明 |
|------|------|
| 入口 | `robotime-hub.js` → `api.onPageChange` |
| 主题配置 | `buildRobotimeThemeConfig()` 从 **`settings`**（`settings.yml`）解析导航、标签、侧栏文案、轮播开关 |
| 首次渲染 | `applyHubConfig(mergeHubWithTheme({}, themeCfg))` — **不等待网络** 即可显示导航/标签/Logo 等 |
| 远程 JSON | `fetch("/hub-config.json")` 成功后 `applyHubConfig(mergeHubWithTheme(remote, themeCfg))` |
| 合并规则 | `mergeHubWithTheme`：**仅**采用远程的 `hero_banners`、`sidebar_widgets`；其余 UI 字段始终来自主题 |

| 失败 | `catch` 时 `console.warn`；页面已用主题配置渲染，仅轮播/widget 为空 |

---

## 五、插件职责清单（需求文档）

### 5.1 必须（若需要轮播 / 侧栏图卡）

1. **提供公开 JSON 端点**  
   - 路径：`GET /hub-config.json`（与主题一致）。  
   - **最少**可只返回 `hero_banners` 与/或 `sidebar_widgets`（数组可空）。  
   - **不必**再返回 `nav_items`、`filter_quick_tags`、`sidebar_section_title`、`sidebar_view_all`（主题已忽略）。

### 5.2 可选

2. **简化后台**：插件 Admin 仅需维护 **轮播卡片** 与 **侧栏 widget**；导航与文案引导管理员改 **主题设置**。  
3. **`image_url` 规范化**（见 §9）。  
4. **缓存与版本**：可按需 `ETag` / 短缓存。  
5. 从分类、话题、标签 **动态生成** `hero_banners` / `sidebar_widgets`（可选）。  
6. 权限：配置接口只读公开；写操作仅在 Admin。

---

## 六、插件 Admin 页面（产品需求）

建议在 **Admin → Plugins → [社区 Hub]**（名称自定）**聚焦媒体与链接数据**；导航与文案请到 **Admin → Customize → Themes → Theme settings**。

| 模块 | 能力 | 持久化字段 |
|------|------|------------|
| 顶栏轮播 | 增删改、排序；上传或选择图片；标题、链接、背景色 | `hero_banners` |
| 侧栏幻灯片 | 多图 widget（标题/图/链接）、排序 | `sidebar_widgets` |

后台表单校验：`image_url` 可请求、URL 格式；可选 JSON 导入导出。

**说明**：若历史版本插件仍存 `nav_items` / `filter_quick_tags` / 侧栏文案字段，可弃用或仅作迁移备份；**当前主题不会读取**。

---

## 七、插件后端实现参考（Rails）

以下仅为示例：**路由名必须与主题 fetch 的路径一致**（示例用 `/hub-config.json`）。

```ruby
# config/routes.rb 或 engine routes
get "/hub-config.json" => "robotime_hub/config#show", :defaults => { format: :json }

# app/controllers/robotime_hub/config_controller.rb
class RobotimeHub::ConfigController < ApplicationController
  skip_before_action :check_xhr, raise: false
  skip_before_action :verify_authenticity_token, raise: false

  def show
    theme = resolve_robotime_theme # 站点当前使用的主题或组件
    render json: build_config(theme)
  end

  private

  def build_config(_theme)
    {
      hero_banners: PluginStore.get("robotime_hub", "hero_banners") || [],
      sidebar_widgets: PluginStore.get("robotime_hub", "sidebar_widgets") || []
    }
  end
end
```

导航与预显标签等 **不必** 再写入 JSON；`PluginStore` 键名与团队约定一致即可。

---

## 八、降级与无插件

| 场景 | 行为 |
|------|------|
| `fetch` 失败或 404 | **导航 / Logo / 预显标签 / 侧栏文案** 仍来自主题设置；**轮播与侧栏图卡** 为空；控制台 `console.warn` |
| 仅静态 JSON | 提供最小 `hub-config.json`（仅 `hero_banners` / `sidebar_widgets`）即可补全媒体区 |
| 仅主题、无 JSON | 可用；仅无顶栏轮播与侧栏 widget 内容 |

---

## 九、图片与 `image_url`

- 浏览器中 `<img src>` 与 CSS `background-image` **无法**直接使用 Discourse 内部的 `upload://...` 短引用；需 **完整 URL** 或 **`/uploads/...` 站点相对路径**。  
- 插件或服务端在写入 `hero_banners` / `sidebar_widgets` 时应落库 **可请求地址**。  
- 走 Discourse 上传时，建议存 **`/uploads/default/original/...`**，由站点根路径自动补全域名。

---

## 十、权限与安全

- `GET /hub-config.json` 建议 **匿名可读**（导航与轮播对游客可见）。  
- 插件 Admin 写操作仅限 **管理员**。  
- 若链接指向受限分类，由 Discourse **分类权限** 在目标页拦截。

---

## 十一、主题文件对照（数据流）

| 主题文件 | 作用 |
|----------|------|
| `javascripts/discourse/api-initializers/robotime-hub.js` | `settings` → 主题配置；`fetch('/hub-config.json')` → 合并后 `applyHubConfig`；侧栏图标、话题缩略图、顶栏 offset 等 |
| `javascripts/robotime/connectors/above-site-header/robotime-header.hbs` | 顶栏 DOM 壳；导航由 JS 注入 |
| `javascripts/robotime/connectors/below-site-header/robotime-carousel.hbs` | 轮播轨道壳；卡片由 JS 注入 |
| `javascripts/discourse/connectors/after-sidebar-sections/robotime-sidebar-slot.hbs` | 侧栏 hub 插槽 |
| `settings.yml` | 主题设置 **声明**；导航/标签/Logo/侧栏文案 **权威来源**（§三） |
| `common/common.scss` 等 | 纯样式，不含业务 JSON |

---

## 十二、修订记录（文档级）

- **导航、预显标签、Logo、侧栏标题/查看全部** 改为 **仅 Theme settings**；`hub-config.json` **只负责** `hero_banners` 与 `sidebar_widgets`。  
- 主题 JS：`buildRobotimeThemeConfig` + `mergeHubWithTheme` + 首屏先 `applyHubConfig` 再 `fetch`。  
- 插件 Admin 与示例 Rails 响应 **删减** 与主题重复的字段说明。
