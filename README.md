为 Robotime 主题提供 **`GET /hub-config.json`** 中的**顶栏轮播**与**侧栏幻灯片**数据；导航、预显标签、侧栏标题与「查看全部」等由 **主题 Theme settings** 配置（见仓库内 `PLUGIN-INTERFACE.md` §三）。

## 功能概览

### 1) 存储（无需 Migration）

使用 Discourse `PluginStore`（namespace `community-hub`）：

- `hero_banners`：顶栏轮播
- `sidebar_widgets`：侧栏幻灯片

### 2) 后台管理

- **入口**：`/admin/community-hub`（侧边栏对应 locale 文案）
- **能力**：轮播 / 侧栏 widget 的增删改、拖拽排序、图片上传（`/uploads.json`）、可选分类快捷生成 `link_url`

### 3) 公开 API

- **`GET /hub-config.json`**：仅返回 `hero_banners` 与 `sidebar_widgets`（按 `sort_order`、`active` 过滤），字段与 `PLUGIN-INTERFACE.md` §二 一致
- **缓存**：`Rails.cache.fetch("community-hub:hub_config", expires_in: 1.hour)`，保存/删除会失效

## 安装与启用

### Docker

1. 将插件放到 `plugins/community-hub`（或你的挂载路径）
2. `./launcher rebuild app`（或等价重建）
3. **Admin → Settings** 开启 `community_hub_enabled`

### 源码

1. `plugins/community-hub`
2. 编译前端并重启
3. 开启 `community_hub_enabled`

## 主题侧配置（不在插件后台）

请到 **Admin → Customize → Themes → [主题] → Theme settings** 配置，例如：

- `robotime_nav_links`、`robotime_filter_quick_tags`、`robotime_logo_url`
- `robotime_sidebar_section_title`、`robotime_sidebar_view_all_*`
- `robotime_carousel_enabled` 等

## `GET /hub-config.json` 示例

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

## 手工验证

1. 在后台添加轮播与侧栏条目并保存，确认 `GET /hub-config.json` 与后台一致
2. 拖拽排序后刷新，顺序应保持
3. 删除后 JSON 中应不再出现该项
