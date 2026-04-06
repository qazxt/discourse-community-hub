# frozen_string_literal: true

module CommunityHub
  PLUGIN_NAME = "community-hub"
  CACHE_KEY = "community-hub:hub_config"

  # PLUGIN-INTERFACE.md §9：主题用 <img>/background-image 不能直接用 upload://；落库与公开 JSON 使用 Upload#url
  def self.resolve_image_url_for_hub(raw)
    s = raw.to_s.strip
    return s if s.blank?
    return s unless s.start_with?("upload://")

    sha1 = Upload.sha1_from_short_url(s)
    return s if sha1.blank?

    Upload.find_by(sha1: sha1)&.url.presence || s
  end
end

require_relative "community_hub/engine"

