# frozen_string_literal: true

module CommunityHub
  class HubSidebarWidget < ::ActiveRecord::Base
    self.table_name = "hub_sidebar_widgets"

    scope :active, -> { where(active: true) }

    validates :title, presence: true
    validates :image_url, presence: true
    validates :link_url, presence: true
    validates :sort_order, presence: true, numericality: { only_integer: true }
    validates :active, inclusion: { in: [true, false] }

    after_commit :invalidate_hub_config_cache

    private

    def invalidate_hub_config_cache
      Rails.cache.delete(CommunityHub::CACHE_KEY)
    end
  end
end

