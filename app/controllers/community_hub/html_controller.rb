# frozen_string_literal: true

# 为 /admin/community-hub 提供 HTML 外壳：直连 Rails、硬刷新时须命中 Rails 路由，否则 Routing Error。
# 与 demo/rt-lucky-spin 的 LuckySpinHtmlController 同一模式。
module CommunityHub
  class HtmlController < ::ApplicationController
    requires_plugin CommunityHub::PLUGIN_NAME

    skip_before_action :check_xhr, only: %i[admin]

    before_action :ensure_hub_enabled
    before_action :ensure_logged_in
    before_action :ensure_admin

    def admin
      respond_to do |format|
        format.html { render html: "", layout: application_layout }
      end
    end

    private

    def ensure_hub_enabled
      raise Discourse::NotFound unless SiteSetting.community_hub_enabled
    end
  end
end
