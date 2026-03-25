为自定义主题的前端展示打造一个“配置中心”，让管理员无需写代码即可管理所有动态内容。
1. 数据库设计 (Migration)
在 db/migrate 中创建三张表，分别对应三个可配置区域。为了灵活性，建议字段通用化。
表 1: hub_hero_banners (中间大轮播)
title (string): 标题 (e.g., "Official Events")
subtitle (string): 副标题/日期 (e.g., "10.20-12.20")
image_url (string): 背景图 URL
bg_color (string): 兜底背景色（默认 `#f6ebe3`）
link_url (string): 跳转链接 (分类路径或外部 URL)
style_type (string): 样式类型 (e.g., "gradient_blue", "image_cover") —— 预留扩展
sort_order (integer): 排序
active (boolean): 是否启用
表 2: hub_nav_items (顶部黑色导航栏)
label (string): 显示文字 (e.g., "Help", "Buy")
url (string): 链接地址
icon_name (string): 图标类名 (可选，如 "fas fa-star")
is_external (boolean): 是否新窗口打开
active (boolean): 是否启用
sort_order (integer): 排序
表 3: hub_sidebar_widgets (左侧小轮播/公告)
title (string): 标题 (e.g., "Sweet Shack")
image_url (string): 展示图片
link_url (string): 跳转链接
widget_type (string): 组件类型 (e.g., "carousel", "static_banner")
sort_order (integer): 排序
2. 后台管理界面 (Admin UI)
利用 Discourse 的 Admin 路由系统，在 /admin/plugins/community-hub 下构建界面。
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
  # 只查询 active=true 的数据，并按 sort_order 排序
  config = {
    nav_items: HubNavItem.active.order(:sort_order).as_json,
    hero_banners: HubHeroBanner.active.order(:sort_order).as_json,
    sidebar_widgets: HubSidebarWidget.active.order(:sort_order).as_json
  }
  render json: config
end
缓存: 务必使用 `Rails.cache.fetch("community-hub:hub_config", expires_in: 1.hour)`，避免每次刷新页面都查库。

## 安装与启用
1. 将本插件放入 Discourse 的 `plugins/` 目录，例如：`plugins/community-hub`
2. 重启 Discourse 后执行迁移：`bundle exec rake db:migrate`
3. 在 Discourse Admin 后台开启站点设置：`community_hub_enabled`

## 后台管理入口
- 管理页面：`/admin/plugins/community-hub`
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


