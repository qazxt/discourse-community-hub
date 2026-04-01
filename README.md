为自定义主题的前端展示打造一个“配置中心”，让管理员无需写代码即可管理所有动态内容。

## 功能概览

### 1) 存储方案（无需 Migration）

本插件使用 Discourse 的 `PluginStore` 持久化配置，因此**不需要**创建业务表，也无需执行插件相关的 `db:migrate`。

存储键（namespace 为 `community-hub`）：
- `nav_items`: 顶部导航栏（数组）
- `hero_banners`: Hero 轮播（数组）
- `filter_quick_tags`: 列表页预显标签（数组）
- `sidebar_section_title`: 侧栏活动区标题（字符串，可选）
- `sidebar_view_all`: 侧栏「查看全部」链接（对象，可选）
- `sidebar_widgets`: 侧栏小部件幻灯片（数组）

`GET /hub-config.json` 还会在未写入插件存储时，尝试从默认主题的 `robotime_*` 主题设置合并默认值（见 `PLUGIN-INTERFACE.md`）。

### 2) 后台管理界面 (Admin UI)

- **入口**：`/admin/community-hub`（管理后台侧边栏「社区配置中心」）
- **技术栈**：Ember.js（Discourse Admin 前端）
- **能力**：
  - 列表页：展示各配置项，支持拖拽排序
  - 编辑弹窗：增删改配置
  - 图片上传：使用 Discourse 原生 `/uploads.json` 上传后写入 `image_url`
  - 内部链接：下拉选择分类（Categories）自动生成 `/c/:slug/:id`，也可手填外链

### 3) API 接口（给主题前台调用）

- **聚合接口**：`GET /hub-config.json`（公开，游客也可访问）
- **返回**：只返回 `active=true` 且按 `sort_order` 排序后的数据，字段严格对齐 `PLUGIN-INTERFACE.md`
- **缓存**：`Rails.cache.fetch("community-hub:hub_config", expires_in: 1.hour)`（管理员保存/删除会自动失效）

## 安装与启用

### 安装（本地开发 / Docker）

1. 将本插件目录放入 Discourse 的 `plugins/` 目录，目录名建议为 `community-hub`：
   - 例如：`/var/discourse/shared/standalone/plugins/community-hub`
2. 重建并重启 Discourse（确保插件 Ruby 与前端资源被加载）：
   - 例如：`./launcher rebuild app`
3. 进入管理后台开启站点设置：
   - `Admin -> Settings` 搜索并开启：`community_hub_enabled`

### 安装（源码运行）

1. 将本插件放到 Discourse 源码的 `plugins/community-hub`
2. 启动或重启 Discourse（开发环境需要重新编译前端资源）
3. 在管理后台开启 `community_hub_enabled`

## 后台管理入口
- 管理页面：`/admin/community-hub`（侧边栏「社区配置中心」）
- 配置说明：
  - **Navigation Items**：顶部导航（支持 `bg_color` 可选背景色、外链开关、启用/禁用）
  - **Hero Banners**：轮播卡片（支持 `bg_color`、图片上传、内部分类链接或外链）
  - **Filter Quick Tags**：列表页快速标签（可选）
  - **Sidebar Section / View All / Widgets**：侧栏活动区标题、查看全部链接、幻灯片
  - **排序**：拖拽后会更新 `sort_order`，并自动清理 `hub-config.json` 缓存

## API 示例响应
`GET /hub-config.json`（公开，游客也可访问；只返回 `active=true` 且按 `sort_order` 排序）：

```json
{
  "nav_items": [
    { "label": "Help", "url": "/help", "is_external": false, "bg_color": "#f6ebe3" }
  ],
  "hero_banners": [
    {
      "title": "User Guide & Perks",
      "image_url": "/uploads/default/original/carousel/user-guide.png",
      "bg_color": "#f6ebe3",
      "link_url": "/c/user-guide-perks"
    }
  ],
  "filter_quick_tags": [
    { "label": "Diy", "url": "/tag/diy", "is_external": false }
  ],
  "sidebar_section_title": "Official Events",
  "sidebar_view_all": {
    "label": "View All Events",
    "url": "/c/official-events",
    "is_external": false
  },
  "sidebar_widgets": [
    {
      "title": "Sweet Shack",
      "image_url": "/uploads/default/original/events/sweet-shack.png",
      "link_url": "/t/sweet-shack-event/123"
    }
  ]
}
```

## 手工验证（建议）
1. Admin 后台分别新增一条 `nav_items` / `hero_banners` / `sidebar_widgets`，并设置 `active=true`
2. 在 Admin 页面拖拽排序后，确认页面刷新时顺序保持不变
3. 在浏览器访问 `GET /hub-config.json`，确认：
   - 不包含 `active=false` 的数据
   - 三类数据均按 `sort_order` 顺序返回
4. 修改某条记录（例如调整 `sort_order` 或 `link_url`），再次访问 `GET /hub-config.json`，确认变更会生效（缓存已被清理）


