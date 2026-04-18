# frozen_string_literal: true

# 在 Discourse 根目录执行：
#   ./d/rails runner plugins/community-hub/script/diagnose_community_hub_images.rb
#
# 检查 PluginStore 中 hero_banners / sidebar_widgets：
# - image_url 是否为空
# - 是否能解析到 Upload
# - Upload 是否有 UploadReference（无引用易被孤儿清理命中）
# - community_hub_upload_bindings 表是否存在（migration 是否已跑）

plugin = "community-hub"

def item_label(kind, item)
  id = item["id"]
  title = item["title"].to_s.strip
  parts = []
  parts << "id=#{id}" if id.present?
  parts << %(title="#{title.truncate(60)}") if title.present?
  parts << "kind=#{kind}"
  parts.join(" ")
end

def analyze_item(kind, item)
  problems = []
  raw_url = item["image_url"].to_s.strip

  if raw_url.blank?
    problems << "image_url 为空"
    return problems
  end

  upload =
    begin
      CommunityHub.find_upload_by_url(raw_url) if defined?(CommunityHub)
    rescue StandardError => e
      problems << "解析 Upload 异常: #{e.class}: #{e.message}"
      nil
    end

  if upload.nil?
    problems << "无法从 image_url 解析到 Upload（可能死链、外链或非本站上传路径）"
    return problems
  end

  problems << "Upload##{upload.id} 的 url 为空（异常记录）" if upload.url.blank?

  begin
    ref_count = UploadReference.where(upload_id: upload.id).count
    if ref_count <= 0
      problems << "Upload##{upload.id} 无 UploadReference（易被孤儿清理命中，需在插件后台保存一次以建立引用）"
    end
  rescue StandardError => e
    problems << "查询 UploadReference 失败: #{e.class}: #{e.message}"
  end

  problems
end

puts "== community-hub 图片诊断 =="
puts "Rails.env=#{Rails.env}"
puts "时间(UTC)=#{Time.now.utc}"
puts

unless defined?(CommunityHub)
  puts "错误: 未加载 CommunityHub 模块（插件 community-hub 是否已安装并启用？）"
  exit 2
end

bindings_ok =
  begin
    ActiveRecord::Base.connection.table_exists?("community_hub_upload_bindings")
  rescue StandardError
    false
  end

puts "表 community_hub_upload_bindings: #{bindings_ok ? '存在' : '缺失（需执行 db:migrate）'}"
puts

hero = PluginStore.get(plugin, "hero_banners") || []
side = PluginStore.get(plugin, "sidebar_widgets") || []

puts "条目数量: hero_banners=#{hero.size}, sidebar_widgets=#{side.size}"
puts

issues = 0

[ ["hero_banners", hero], ["sidebar_widgets", side] ].each do |kind, list|
  list.each do |item|
    next unless item.is_a?(Hash)

    probs = analyze_item(kind, item.stringify_keys)
    next if probs.empty?

    issues += 1
    puts "[问题] #{item_label(kind, item)}"
    probs.each { |p| puts "  - #{p}" }
    puts
  end
end

if issues.zero?
  puts "结论: 未发现明显问题（空 URL / 解析不到 Upload / 无引用）。"
else
  puts "结论: 发现 #{issues} 条条目存在风险或配置问题，请按上述提示处理。"
end
