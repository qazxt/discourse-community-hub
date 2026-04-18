# frozen_string_literal: true

# 在 Discourse 根目录执行：
#   ./d/rails runner plugins/community-hub/script/diagnose_upload_by_id.rb 81
#
# 输出指定 upload_id 的基础信息，以及所有 UploadReference（被什么引用）。

def usage!
  warn "用法: ./d/rails runner plugins/community-hub/script/diagnose_upload_by_id.rb <upload_id>"
  exit 1
end

upload_id = ARGV[0].to_i
usage! if upload_id <= 0

upload = Upload.find_by(id: upload_id)
unless upload
  warn "未找到 Upload id=#{upload_id}"
  exit 2
end

puts "== Upload ##{upload.id} =="
puts "sha1=#{upload.sha1}"
puts "url=#{upload.url.inspect}"
puts "original_filename=#{upload.original_filename.inspect}"
puts "created_at=#{upload.created_at&.utc}"
puts "retain_hours=#{upload.retain_hours.inspect}"
puts "secure=#{upload.secure?} access_control_post_id=#{upload.access_control_post_id.inspect}"
puts

refs = UploadReference.where(upload_id: upload.id).order(:id)
puts "== UploadReference 共 #{refs.count} 条 =="
if refs.empty?
  puts "（无）——从 UploadReference 视角看，这条上传当前是“无引用/孤儿候选”（是否会被清理还取决于 grace、站点设置等）。"
  exit 0
end

refs.each do |r|
  line = +"ref##{r.id} target=#{r.target_type}##{r.target_id}"

  case r.target_type
  when "Post"
    p = Post.with_deleted.find_by(id: r.target_id)
    if p
      line << " post: topic_id=#{p.topic_id} post_number=#{p.post_number} deleted=#{p.deleted_at.present?}"
    else
      line << " post: (记录不存在)"
    end
  when "Topic"
    t = Topic.with_deleted.find_by(id: r.target_id)
    if t
      line << " topic: slug=#{t.slug.inspect} deleted=#{t.deleted_at.present?}"
    else
      line << " topic: (记录不存在)"
    end
  when "CommunityHub::UploadBinding"
    b = CommunityHub::UploadBinding.find_by(id: r.target_id) if defined?(CommunityHub::UploadBinding)
    if b
      line << " community_hub: kind=#{b.kind.inspect} item_id=#{b.item_id}"
    else
      line << " community_hub: UploadBinding 缺失（引用残留？）"
    end
  end

  puts line
end
