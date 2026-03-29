为自定义主题的前端展示打造一个“配置中心”，让管理员无需写代码即可管理所有动态内容。
1. 存储方案（无需 Migration）
本插件使用 Discourse 的 `PluginStore` 持久化三类配置（导航 / Hero 轮播 / 侧栏小部件），因此**不需要**创建业务表，也无需执行插件相关的 `db:migrate`。

存储键（namespace 为 `community-hub`）：
- `nav_items`: 顶部导航栏（数组）
- `hero_banners`: Hero 轮播（数组）
- `filter_quick_tags`: 列表页预显标签（数组）
- `sidebar_section_title`: 侧栏活动区标题（字符串，可选）
- `sidebar_view_all`: 侧栏「查看全部」链接（对象，可选）
- `sidebar_widgets`: 侧栏小部件幻灯片（数组）

`GET /hub-config.json` 还会在未写入插件存储时，尝试从默认主题的 `robotime_*` 主题设置合并默认值（见 `PLUGIN-INTERFACE.md`）。
2. 后台管理界面 (Admin UI)
管理界面在 **`/admin/community-hub`**，并从管理后台**侧边栏**进入（与 `adminPlugins` 插件 Tab 解耦，避免新版插件页 outlet 白屏）。
技术栈: Ember.js (Discourse 原生前端框架)。
功能实现:
列表页: 展示当前所有配置项，支持拖拽排序。
编辑弹窗:
图片上传: 集成 Discourse 原生的 UploadManager，管理员可直接拖拽上传图片，自动获取 URL。
链接选择器: 提供一个下拉框，列出所有分类 (Categories)，方便直接选内部链接；也允许手动输入外部 URL。
实时预览 (可选): 如果精力允许，可以在后台右侧做一个小的 Preview 区域。
3. API 接口 (Controller)
创建一个聚合接口，供主题调用。
路由: GET /hub-config.json
逻辑:
ruby

编辑



def show
  # 从 PluginStore 读取，筛 active=true，并按 sort_order 排序
  # 返回字段严格对齐 PLUGIN-INTERFACE.md
end
缓存: 务必使用 `Rails.cache.fetch("community-hub:hub_config", expires_in: 1.hour)`，避免每次刷新页面都查库。

## 安装与启用
1. 将本插件放入 Discourse 的 `plugins/` 目录，例如：`plugins/community-hub`
2. 重启 Discourse
3. 在 Discourse Admin 后台开启站点设置：`community_hub_enabled`

## 后台管理入口
- 管理页面：`/admin/community-hub`（侧边栏「社区配置中心」）
- 功能要点：
  - 三个区块分别支持增删改
  - 支持拖拽排序（拖拽结束后会立刻保存到 `sort_order`，并清理接口缓存）

## API 示例响应
`GET /hub-config.json`（公开，游客也可访问；只返回 `active=true` 且按 `sort_order` 排序）：

```json
{
  "nav_items": [
    { "label": "Help", "url": "/help", "is_external": false }
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


