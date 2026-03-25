# frozen_string_literal: true

module CommunityHub
  class ConfigController < ::ApplicationController
    # 主题前端会直接 fetch 公共数据；该接口不需要登录也不做 CSRF 校验。
    skip_before_action :check_xhr
    skip_before_action :verify_authenticity_token

    def show
      config = Rails.cache.fetch(CommunityHub::CACHE_KEY, expires_in: 1.hour) do
        {
          nav_items: CommunityHub::HubNavItem.active.order(:sort_order).map do |x|
            {
              label: x.label,
              url: x.url,
              is_external: x.is_external
            }
          end,
          hero_banners: CommunityHub::HubHeroBanner.active.order(:sort_order).map do |x|
            {
              title: x.title,
              image_url: x.image_url,
              bg_color: x.bg_color,
              link_url: x.link_url
            }
          end,
          sidebar_widgets: CommunityHub::HubSidebarWidget.active.order(:sort_order).map do |x|
            {
              title: x.title,
              image_url: x.image_url,
              link_url: x.link_url
            }
          end
        }
      end

      render json: config
    end
  end
end

