# Community Hub（Discourse 插件）

为 Robotime 等主题提供 **`GET /hub-config.json`** 中的**顶栏轮播**（`hero_banners`）与**侧栏幻灯片**（`sidebar_widgets`）数据。导航、预显标签、Logo、侧栏标题与「查看全部」等由**主题的 Theme settings** 配置，不由本插件后台维护。

## 功能

- **持久化**：配置项使用 `PluginStore`；并使用一张轻量表维护上传引用，避免图片被判定为孤儿上传清理。
- **管理后台**：在 `/admin/community-hub` 维护轮播与侧栏条目；支持增删改、拖拽排序、图片上传（Discourse `/uploads.json`），并可按分类快捷生成链接。
- **公开 JSON**：`GET /hub-config.json` 仅返回 `hero_banners` 与 `sidebar_widgets`（按 `sort_order`、`active` 过滤）。
- **缓存**：响应经 `Rails.cache`（约 1 小时）；保存或删除条目时会失效缓存。

## 诊断（图片 / 孤儿引用）

在 **Discourse 根目录**执行（路径按你的插件目录名调整）：

```bash
./d/rails runner plugins/community-hub/script/diagnose_community_hub_images.rb
```

脚本会读取 `PluginStore` 中的 `hero_banners` / `sidebar_widgets`，检查 `image_url` 是否能解析到 `Upload`、是否存在 `UploadReference`、以及 `community_hub_upload_bindings` 表是否已迁移。

按 **upload id** 查看引用明细（适合排障单张图）：

```bash
./d/rails runner plugins/community-hub/script/diagnose_upload_by_id.rb 81
```

## 安装与启用

1. 将本仓库置于 Discourse 的 `plugins/` 下（目录名可与仓库一致，例如 `community-hub`）。
2. 按站点方式重建或编译前端并重启（Docker 环境常见为 `./launcher rebuild app`）。
   - 开发环境若非整站重建，请在 Discourse 根目录执行 `./d/rake db:migrate` 以创建插件上传引用表。
3. 在 **Admin → Settings → Plugins**（或站点设置搜索）中确认 **`community_hub_enabled`** 已开启（默认 true，可按需关闭整站 hub 能力）。

## 后台配置（插件）

| 项目 | 说明 |
|------|------|
| 入口 | 浏览器打开 **`/admin/community-hub`**（管理侧栏会显示对应文案，随 locale） |
| 顶栏轮播 | 对应存储键 `hero_banners` |
| 侧栏幻灯片 | 对应存储键 `sidebar_widgets` |
| 图片 | 通过 Discourse 上传接口生成可访问的 `image_url` |

运营在后台改动的内容，会反映在 **`/hub-config.json`** 中（仅上述两类数据）。

## 主题侧配置（非本插件后台）

在 **Admin → Customize → Themes → [目标主题] → Theme settings** 中配置，例如：

| 设置项 | 用途 |
|--------|------|
| `robotime_logo_url` | 顶栏 Logo；空则显示默认文字 |
| `robotime_nav_links` | 顶栏 / 移动菜单导航，`标签\|URL`，逗号分隔 |
| `robotime_carousel_enabled` | 是否展示顶栏轮播并消费 JSON 中的 `hero_banners` |
| `robotime_sidebar_section_title` | 侧栏 widget 区块标题 |
| `robotime_sidebar_view_all_label` / `robotime_sidebar_view_all_url` | 「查看全部」文案与链接（链接为空则不渲染） |
| `robotime_filter_quick_tags` | 话题列表预显标签（JSON 数组字符串） |
| `robotime_official_events_category` | 预留，当前不参与 hub 合并 |

主题应请求 **`GET /hub-config.json`**，并只采用其中的 **`hero_banners`** 与 **`sidebar_widgets`**；其余 UI 字段以主题设置为准。

## `GET /hub-config.json` 数据形状

以下为对外字段约定（与主题消费一致）：

**`hero_banners`**：`{ title, image_url, bg_color?, title_color?, text_color?, link_url }[]`  
**`sidebar_widgets`**：`{ title, image_url, link_url }[]`

示例：

```json
{
  "hero_banners": [
    {
      "title": "User Guide & Perks",
      "image_url": "/uploads/default/original/1/abc.png",
      "bg_color": "#f6ebe3",
      "title_color": "#111111",
      "text_color": "#111111",
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

若 JSON 中仍带有历史字段（如 `nav_items` 等），**主题侧应忽略**，以免与 Theme settings 冲突。
