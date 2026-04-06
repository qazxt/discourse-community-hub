# frozen_string_literal: true

module CommunityHub
  module Admin
    class ConfigController < ::ApplicationController
      before_action :ensure_admin

      def index
        render json: {
          hero_banners: read_store("hero_banners", []),
          sidebar_widgets: read_store("sidebar_widgets", [])
        }
      end

      def save_hero_banners
        save_items_bucket!("hero_banners", :normalize_hero_banners)
      end

      def save_sidebar_widgets
        save_items_bucket!("sidebar_widgets", :normalize_sidebar_widgets)
      end

      def destroy_hero_banner
        id = params.require(:id).to_i
        items = read_store("hero_banners", []).reject { |x| x["id"].to_i == id }
        write_store("hero_banners", items)
        render json: { ok: true }
      end

      def destroy_sidebar_widget
        id = params.require(:id).to_i
        items = read_store("sidebar_widgets", []).reject { |x| x["id"].to_i == id }
        write_store("sidebar_widgets", items)
        render json: { ok: true }
      end

      private

      def save_items_bucket!(store_key, normalizer_method)
        items = normalize_items(parse_items_param)
        write_store(store_key, send(normalizer_method, items))
        render json: { ok: true }
      rescue ActionController::ParameterMissing => e
        render json: { ok: false, error: e.message }, status: :unprocessable_entity
      rescue ArgumentError, JSON::ParserError => e
        render json: { ok: false, error: e.message }, status: :unprocessable_entity
      end

      def parse_items_param
        raw = params[:items]
        raise ActionController::ParameterMissing.new(:items) if raw.nil?

        case raw
        when Array
          raw
        when String
          parsed = JSON.parse(raw)
          raise ArgumentError, "items must be a JSON array" unless parsed.is_a?(Array)
          parsed
        when ActionController::Parameters
          inner = raw.to_unsafe_h
          coalesce_items_collection(inner)
        when Hash
          coalesce_items_collection(raw)
        else
          raise ArgumentError, "unsupported items param type: #{raw.class.name}"
        end
      end

      def coalesce_items_collection(obj)
        return obj if obj.is_a?(Array)

        h = obj.stringify_keys
        if h.empty?
          []
        elsif h.keys.all? { |k| k.match?(/\A\d+\z/) }
          h.sort_by { |k, _| k.to_i }.map { |_, v| v }
        else
          raise ArgumentError, "items must be an array, got a hash with non-numeric keys"
        end
      end

      def bool_param(val)
        ActiveModel::Type::Boolean.new.cast(val)
      end

      def normalize_items(items)
        items.map do |x|
          h =
            case x
            when Hash
              x
            when ActionController::Parameters
              x.to_unsafe_h
            else
              x.respond_to?(:to_unsafe_h) ? x.to_unsafe_h : x.to_h
            end
          h.stringify_keys
        end
      end

      def write_store(key, value)
        PluginStore.set(CommunityHub::PLUGIN_NAME, key, value)
        Rails.cache.delete(CommunityHub::CACHE_KEY)
      end

      def read_store(key, default)
        PluginStore.get(CommunityHub::PLUGIN_NAME, key) || default
      end

      def normalize_hero_banners(items)
        items.each_with_index.map do |x, idx|
          h = x.stringify_keys
          {
            "id" => (h["id"].presence || Time.now.to_f * 1000 + idx).to_i,
            "title" => h["title"].to_s,
            "image_url" => h["image_url"].to_s,
            "link_url" => h["link_url"].to_s,
            "bg_color" => h["bg_color"].presence || "#f6ebe3",
            "sort_order" => h["sort_order"].to_i,
            "active" => true
          }
        end.sort_by { |x| x["sort_order"] }
      end

      def normalize_sidebar_widgets(items)
        items.each_with_index.map do |x, idx|
          h = x.stringify_keys
          {
            "id" => (h["id"].presence || Time.now.to_f * 1000 + idx).to_i,
            "title" => h["title"].to_s,
            "image_url" => h["image_url"].to_s,
            "link_url" => h["link_url"].to_s,
            "sort_order" => h["sort_order"].to_i,
            "active" => true
          }
        end.sort_by { |x| x["sort_order"] }
      end
    end
  end
end
