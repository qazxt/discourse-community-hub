# frozen_string_literal: true

# name: community-hub
# about: Robotime Community Hub dynamic configuration backend.
# version: 0.1.0
# authors: Discourse Community Hub

require_relative "lib/community_hub"

enabled_site_setting :community_hub_enabled

after_initialize do
  CommunityHub::Engine.routes.draw do
    get "/hub-config.json" => "config#show"

    # Admin UI API (仅管理员可访问)
    get "/admin/plugins/community-hub/config.json" => "admin/config#index"
    put "/admin/plugins/community-hub/nav_items.json" => "admin/config#save_nav_items"
    put "/admin/plugins/community-hub/hero_banners.json" => "admin/config#save_hero_banners"
    put "/admin/plugins/community-hub/sidebar_widgets.json" => "admin/config#save_sidebar_widgets"

    delete "/admin/plugins/community-hub/nav_items/:id.json" => "admin/config#destroy_nav_item"
    delete "/admin/plugins/community-hub/hero_banners/:id.json" => "admin/config#destroy_hero_banner"
    delete "/admin/plugins/community-hub/sidebar_widgets/:id.json" => "admin/config#destroy_sidebar_widget"
  end

  Discourse::Application.routes.append do
    mount ::CommunityHub::Engine, at: "/"
  end
end

