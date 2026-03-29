# frozen_string_literal: true

# name: community-hub
# about: Robotime Community Hub dynamic configuration backend.
# version: 0.1.0
# authors: Discourse Community Hub

require_relative "lib/community_hub"

enabled_site_setting :community_hub_enabled

after_initialize do
  # 管理 UI 入口改为 /admin/community-hub + 侧边栏链接（见 community-hub-admin-sidebar initializer）
  # 不再使用 add_admin_route：Discourse 新版「已安装插件」页的 outlet 与 adminPlugins.* 子路由不兼容，易导致白屏。

  # 公开 API
  Discourse::Application.routes.append do
    get "/hub-config.json" => "community_hub/config#show"

    # Admin UI API (仅管理员可访问)
    get "/admin/plugins/community-hub/config.json" => "community_hub/admin/config#index"
    put "/admin/plugins/community-hub/nav_items.json" => "community_hub/admin/config#save_nav_items"
    put "/admin/plugins/community-hub/hero_banners.json" => "community_hub/admin/config#save_hero_banners"
    put "/admin/plugins/community-hub/sidebar_widgets.json" => "community_hub/admin/config#save_sidebar_widgets"
    put "/admin/plugins/community-hub/filter_quick_tags.json" => "community_hub/admin/config#save_filter_quick_tags"
    put "/admin/plugins/community-hub/sidebar_extras.json" => "community_hub/admin/config#save_sidebar_extras"

    delete "/admin/plugins/community-hub/nav_items/:id.json" => "community_hub/admin/config#destroy_nav_item"
    delete "/admin/plugins/community-hub/hero_banners/:id.json" => "community_hub/admin/config#destroy_hero_banner"
    delete "/admin/plugins/community-hub/filter_quick_tags/:id.json" => "community_hub/admin/config#destroy_filter_quick_tag"
    delete "/admin/plugins/community-hub/sidebar_widgets/:id.json" => "community_hub/admin/config#destroy_sidebar_widget"
  end
end

