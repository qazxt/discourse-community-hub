为自定义主题的前端展示打造一个“配置中心”，让管理员无需写代码即可管理所有动态内容。
1. 数据库设计 (Migration)
在 db/migrate 中创建三张表，分别对应三个可配置区域。为了灵活性，建议字段通用化。
表 1: hub_hero_banners (中间大轮播)
title (string): 标题 (e.g., "Official Events")
subtitle (string): 副标题/日期 (e.g., "10.20-12.20")
image_url (string): 背景图 URL
target_link (string): 跳转链接 (分类路径或外部 URL)
style_type (string): 样式类型 (e.g., "gradient_blue", "image_cover") —— 预留扩展
sort_order (integer): 排序
active (boolean): 是否启用
表 2: hub_nav_items (顶部黑色导航栏)
label (string): 显示文字 (e.g., "Help", "Buy")
url (string): 链接地址
icon_name (string): 图标类名 (可选，如 "fas fa-star")
is_external (boolean): 是否新窗口打开
sort_order (integer): 排序
表 3: hub_sidebar_widgets (左侧小轮播/公告)
title (string): 标题 (e.g., "Sweet Shack")
image_url (string): 展示图片
target_link (string): 跳转链接
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
缓存: 务必使用 Rails.cache.fetch("hub_config", expires_in: 1.hour)，避免每次刷新页面都查库。


