# frozen_string_literal: true

module CommunityHub
  class HubNavItem < ::ActiveRecord::Base
    self.table_name = "hub_nav_items"

    scope :active, -> { where(active: true) }

    validates :label, presence: true
    validates :url, presence: true
    validates :sort_order, presence: true, numericality: { only_integer: true }
    validates :is_external, inclusion: { in: [true, false] }

    after_commit :invalidate_hub_config_cache

    private

    def invalidate_hub_config_cache
      Rails.cache.delete(CommunityHub::CACHE_KEY)
    end
  end
end

