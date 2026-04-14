# frozen_string_literal: true

module CommunityHub
  module Admin
    class ConfigController < ::ApplicationController
      before_action :ensure_admin

      def index
        render json: {
          hero_banners: with_resolved_image_urls(read_store("hero_banners", [])),
          sidebar_widgets: with_resolved_image_urls(read_store("sidebar_widgets", []))
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
        sync_upload_references!("hero_banners", items)
        render json: { ok: true }
      end

      def destroy_sidebar_widget
        id = params.require(:id).to_i
        items = read_store("sidebar_widgets", []).reject { |x| x["id"].to_i == id }
        write_store("sidebar_widgets", items)
        sync_upload_references!("sidebar_widgets", items)
        render json: { ok: true }
      end

      private

      def save_items_bucket!(store_key, normalizer_method)
        items = normalize_items(parse_items_param)
        normalized = send(normalizer_method, items)
        write_store(store_key, normalized)
        sync_upload_references!(store_key, normalized)
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

      def sync_upload_references!(kind, items)
        normalized_items = normalize_items(items)
        keep_ids = normalized_items.map { |x| x["id"].to_i }.select(&:positive?)

        stale_bindings = CommunityHub::UploadBinding.where(kind: kind)
        stale_bindings = stale_bindings.where.not(item_id: keep_ids) if keep_ids.any?
        stale_bindings.each do |binding|
          UploadReference.where(target_type: binding.class.name, target_id: binding.id).delete_all
        end
        stale_bindings.delete_all

        normalized_items.each do |item|
          item_id = item["id"].to_i
          next unless item_id.positive?

          binding = CommunityHub::UploadBinding.find_or_create_by!(kind: kind, item_id: item_id)
          UploadReference.where(target_type: binding.class.name, target_id: binding.id).delete_all

          upload = CommunityHub.find_upload_by_url(item["image_url"])
          next if upload.blank?

          UploadReference.create!(
            upload_id: upload.id,
            target_type: binding.class.name,
            target_id: binding.id
          )
        end
      end

      def with_resolved_image_urls(items)
        items.map do |x|
          h = x.stringify_keys
          h["image_url"] = CommunityHub.resolve_image_url_for_hub(h["image_url"])
          h
        end
      end

      def normalize_hero_banners(items)
        items.each_with_index.map do |x, idx|
          h = x.stringify_keys
          {
            "id" => (h["id"].presence || Time.now.to_f * 1000 + idx).to_i,
            "title" => h["title"].to_s,
            "image_url" => CommunityHub.resolve_image_url_for_hub(h["image_url"]),
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
            "image_url" => CommunityHub.resolve_image_url_for_hub(h["image_url"]),
            "link_url" => h["link_url"].to_s,
            "sort_order" => h["sort_order"].to_i,
            "active" => true
          }
        end.sort_by { |x| x["sort_order"] }
      end
    end
  end
end
