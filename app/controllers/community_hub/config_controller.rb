# frozen_string_literal: true

module CommunityHub
  class ConfigController < ::ApplicationController
    skip_before_action :check_xhr
    skip_before_action :verify_authenticity_token

    def show
      config = Rails.cache.fetch(CommunityHub::CACHE_KEY, expires_in: 1.hour) { build_hub_config }
      render json: config
    end

    private

    # 与 PLUGIN-INTERFACE.md 一致：仅返回 hero_banners、sidebar_widgets（主题忽略其余旧字段）
    def build_hub_config
      hero_banners = read_store("hero_banners", [])
      sidebar_widgets = read_store("sidebar_widgets", [])

      {
        "hero_banners" => hero_banners
          .select { |x| x.fetch("active", true) }
          .sort_by { |x| x.fetch("sort_order", 0).to_i }
          .map { |x| { "title" => x["title"], "image_url" => CommunityHub.resolve_image_url_for_hub(x["image_url"]), "bg_color" => x["bg_color"].presence || "#f6ebe3", "link_url" => x["link_url"] } },
        "sidebar_widgets" => sidebar_widgets
          .select { |x| x.fetch("active", true) }
          .sort_by { |x| x.fetch("sort_order", 0).to_i }
          .map { |x| { "title" => x["title"], "image_url" => CommunityHub.resolve_image_url_for_hub(x["image_url"]), "link_url" => x["link_url"] } }
      }
    end

    def read_store(key, default)
      PluginStore.get(CommunityHub::PLUGIN_NAME, key) || default
    end
  end
end
