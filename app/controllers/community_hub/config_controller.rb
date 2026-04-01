# frozen_string_literal: true

module CommunityHub
  class ConfigController < ::ApplicationController
    # 主题前端会直接 fetch 公共数据；该接口不需要登录也不做 CSRF 校验。
    skip_before_action :check_xhr
    skip_before_action :verify_authenticity_token

    def show
      config = Rails.cache.fetch(CommunityHub::CACHE_KEY, expires_in: 1.hour) { build_hub_config }
      render json: config
    end

    private

    def build_hub_config
      theme = default_robotime_theme

      nav_items = read_store("nav_items", default_nav_items)
      hero_banners = read_store("hero_banners", [])
      sidebar_widgets = read_store("sidebar_widgets", [])

      filter_quick_tags = merged_filter_quick_tags(theme)
      sidebar_section_title = merged_sidebar_section_title(theme)
      sidebar_view_all = merged_sidebar_view_all(theme)

      {
        "nav_items" => nav_items
          .select { |x| x.fetch("active", true) }
          .sort_by { |x| x.fetch("sort_order", 0).to_i }
          .map do |x|
            h = { "label" => x["label"], "url" => x["url"], "is_external" => x.fetch("is_external", false) }
            bg = x["bg_color"].to_s.presence
            h["bg_color"] = bg if bg
            h
          end,
        "hero_banners" => hero_banners
          .select { |x| x.fetch("active", true) }
          .sort_by { |x| x.fetch("sort_order", 0).to_i }
          .map { |x| { "title" => x["title"], "image_url" => x["image_url"], "bg_color" => x["bg_color"].presence || "#f6ebe3", "link_url" => x["link_url"] } },
        "filter_quick_tags" => filter_quick_tags,
        "sidebar_section_title" => sidebar_section_title,
        "sidebar_view_all" => sidebar_view_all,
        "sidebar_widgets" => sidebar_widgets
          .select { |x| x.fetch("active", true) }
          .sort_by { |x| x.fetch("sort_order", 0).to_i }
          .map { |x| { "title" => x["title"], "image_url" => x["image_url"], "link_url" => x["link_url"] } }
      }
    end

    def read_store(key, default)
      PluginStore.get(CommunityHub::PLUGIN_NAME, key) || default
    end

    def default_nav_items
      [
        { "label" => "Help", "url" => "/help", "is_external" => false, "sort_order" => 0, "active" => true },
        { "label" => "Community Perks", "url" => "/community-perks", "is_external" => false, "sort_order" => 1, "active" => true },
        { "label" => "About", "url" => "/about", "is_external" => false, "sort_order" => 2, "active" => true }
      ]
    end

    def default_robotime_theme
      tid = SiteSetting.default_theme_id if SiteSetting.respond_to?(:default_theme_id)
      return nil if tid.blank?
      Theme.find_by(id: tid)
    rescue StandardError
      nil
    end

    def theme_setting(theme, name)
      return nil unless theme
      theme.get_setting(name)
    rescue Discourse::NotFound
      nil
    end

    def merged_filter_quick_tags(theme)
      v = PluginStore.get(CommunityHub::PLUGIN_NAME, "filter_quick_tags")
      unless v.nil?
        return [] unless v.is_a?(Array)
        return v
          .select { |x| x.is_a?(Hash) && x.stringify_keys.fetch("active", true) }
          .sort_by { |x| x.stringify_keys.fetch("sort_order", 0).to_i }
          .map { |x| filter_quick_tag_public(x) }
      end

      raw = theme_setting(theme, "robotime_filter_quick_tags")
      return [] if raw.blank?
      arr = JSON.parse(raw.to_s)
      return [] unless arr.is_a?(Array)

      arr.filter_map do |x|
        next unless x.is_a?(Hash)
        h = x.stringify_keys
        label = h["label"].to_s
        url = h["url"].to_s
        next if label.blank? || url.blank?
        {
          "label" => label,
          "url" => url,
          "is_external" => ActiveModel::Type::Boolean.new.cast(h["is_external"])
        }
      end
    rescue JSON::ParserError
      []
    end

    def filter_quick_tag_public(x)
      h = x.is_a?(Hash) ? x.stringify_keys : {}
      {
        "label" => h["label"].to_s,
        "url" => h["url"].to_s,
        "is_external" => ActiveModel::Type::Boolean.new.cast(h.fetch("is_external", false))
      }
    end

    def merged_sidebar_section_title(theme)
      v = PluginStore.get(CommunityHub::PLUGIN_NAME, "sidebar_section_title")
      return v.presence unless v.nil?
      theme_setting(theme, "robotime_sidebar_section_title").presence
    end

    def merged_sidebar_view_all(theme)
      v = PluginStore.get(CommunityHub::PLUGIN_NAME, "sidebar_view_all")
      unless v.nil?
        return nil unless v.is_a?(Hash)
        return sidebar_view_all_public(v)
      end

      url = theme_setting(theme, "robotime_sidebar_view_all_url").to_s
      return nil if url.blank?
      label = theme_setting(theme, "robotime_sidebar_view_all_label").presence
      {
        "label" => label,
        "url" => url,
        "is_external" => false
      }
    end

    def sidebar_view_all_public(h)
      hh = h.stringify_keys
      url = hh["url"].to_s
      return nil if url.blank?
      {
        "label" => hh["label"].presence,
        "url" => url,
        "is_external" => ActiveModel::Type::Boolean.new.cast(hh.fetch("is_external", false))
      }
    end
  end
end
