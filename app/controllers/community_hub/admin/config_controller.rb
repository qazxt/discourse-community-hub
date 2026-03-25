# frozen_string_literal: true

module CommunityHub
  module Admin
    class ConfigController < ::ApplicationController
      before_action :ensure_admin

      def index
        render json: {
          nav_items: CommunityHub::HubNavItem.order(:sort_order).map { |x| serialize_nav_item(x) },
          hero_banners: CommunityHub::HubHeroBanner.order(:sort_order).map { |x| serialize_hero_banner(x) },
          sidebar_widgets: CommunityHub::HubSidebarWidget.order(:sort_order).map { |x| serialize_sidebar_widget(x) }
        }
      end

      def save_nav_items
        items = params.require(:items)
        CommunityHub::HubNavItem.transaction do
          items.each do |attrs|
            upsert_nav_item(attrs)
          end
        end

        render json: { ok: true }
      rescue ActionController::ParameterMissing, ActiveRecord::RecordInvalid => e
        render json: { ok: false, error: e.message }, status: :unprocessable_entity
      end

      def save_hero_banners
        items = params.require(:items)
        CommunityHub::HubHeroBanner.transaction do
          items.each do |attrs|
            upsert_hero_banner(attrs)
          end
        end

        render json: { ok: true }
      rescue ActionController::ParameterMissing, ActiveRecord::RecordInvalid => e
        render json: { ok: false, error: e.message }, status: :unprocessable_entity
      end

      def save_sidebar_widgets
        items = params.require(:items)
        CommunityHub::HubSidebarWidget.transaction do
          items.each do |attrs|
            upsert_sidebar_widget(attrs)
          end
        end

        render json: { ok: true }
      rescue ActionController::ParameterMissing, ActiveRecord::RecordInvalid => e
        render json: { ok: false, error: e.message }, status: :unprocessable_entity
      end

      def destroy_nav_item
        CommunityHub::HubNavItem.find(params.require(:id)).destroy!
        render json: { ok: true }
      rescue ActiveRecord::RecordNotFound => e
        render json: { ok: false, error: e.message }, status: :not_found
      end

      def destroy_hero_banner
        CommunityHub::HubHeroBanner.find(params.require(:id)).destroy!
        render json: { ok: true }
      rescue ActiveRecord::RecordNotFound => e
        render json: { ok: false, error: e.message }, status: :not_found
      end

      def destroy_sidebar_widget
        CommunityHub::HubSidebarWidget.find(params.require(:id)).destroy!
        render json: { ok: true }
      rescue ActiveRecord::RecordNotFound => e
        render json: { ok: false, error: e.message }, status: :not_found
      end

      private

      def bool_param(val)
        ActiveModel::Type::Boolean.new.cast(val)
      end

      def upsert_nav_item(attrs)
        id = attrs[:id].presence
        record = id ? CommunityHub::HubNavItem.find(id) : CommunityHub::HubNavItem.new

        record.assign_attributes(
          label: attrs[:label],
          url: attrs[:url],
          icon_name: attrs[:icon_name],
          is_external: bool_param(attrs[:is_external]),
          sort_order: attrs[:sort_order].to_i,
          active: attrs.key?(:active) ? bool_param(attrs[:active]) : true
        )

        record.save!
      end

      def upsert_hero_banner(attrs)
        id = attrs[:id].presence
        record = id ? CommunityHub::HubHeroBanner.find(id) : CommunityHub::HubHeroBanner.new

        record.assign_attributes(
          title: attrs[:title],
          subtitle: attrs[:subtitle],
          image_url: attrs[:image_url],
          link_url: attrs[:link_url],
          bg_color: attrs[:bg_color] || "#f6ebe3",
          style_type: attrs[:style_type],
          sort_order: attrs[:sort_order].to_i,
          active: attrs.key?(:active) ? bool_param(attrs[:active]) : true
        )

        record.save!
      end

      def upsert_sidebar_widget(attrs)
        id = attrs[:id].presence
        record = id ? CommunityHub::HubSidebarWidget.find(id) : CommunityHub::HubSidebarWidget.new

        record.assign_attributes(
          title: attrs[:title],
          image_url: attrs[:image_url],
          link_url: attrs[:link_url],
          widget_type: attrs[:widget_type],
          sort_order: attrs[:sort_order].to_i,
          active: attrs.key?(:active) ? bool_param(attrs[:active]) : true
        )

        record.save!
      end

      def serialize_nav_item(x)
        {
          id: x.id,
          label: x.label,
          url: x.url,
          icon_name: x.icon_name,
          is_external: x.is_external,
          sort_order: x.sort_order,
          active: x.active
        }
      end

      def serialize_hero_banner(x)
        {
          id: x.id,
          title: x.title,
          subtitle: x.subtitle,
          image_url: x.image_url,
          link_url: x.link_url,
          bg_color: x.bg_color,
          style_type: x.style_type,
          sort_order: x.sort_order,
          active: x.active
        }
      end

      def serialize_sidebar_widget(x)
        {
          id: x.id,
          title: x.title,
          image_url: x.image_url,
          link_url: x.link_url,
          widget_type: x.widget_type,
          sort_order: x.sort_order,
          active: x.active
        }
      end
    end
  end
end

