# frozen_string_literal: true

module CommunityHub
  PLUGIN_NAME = "community-hub"
  CACHE_KEY = "community-hub:hub_config"

  # 主题用 <img>/background-image 不能直接用 upload://；落库与公开 JSON 使用 Upload#url
  def self.resolve_image_url_for_hub(raw)
    s = raw.to_s.strip
    return s if s.blank?
    upload = find_upload_by_url(s)
    upload&.url.presence || s
  end

  def self.find_upload_by_url(raw)
    s = raw.to_s.strip
    return nil if s.blank?

    sha1 = Upload.sha1_from_short_url(s) || Upload.sha1_from_short_path(s) || Upload.sha1_from_long_url(s)
    return Upload.find_by(sha1: sha1) if sha1.present?

    Upload.get_from_url(s)
  rescue URI::InvalidURIError
    nil
  end
end

require_relative "community_hub/engine"

