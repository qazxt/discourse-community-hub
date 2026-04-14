# frozen_string_literal: true

module CommunityHub
  class UploadBinding < ActiveRecord::Base
    self.table_name = "community_hub_upload_bindings"

    validates :kind, presence: true
    validates :item_id, presence: true, numericality: { only_integer: true }
  end
end
