# frozen_string_literal: true

require "rails_helper"

RSpec.describe "CommunityHub hub config API", type: :request do
  describe "GET /hub-config.json" do
    it "returns active items only, ordered by sort_order" do
      CommunityHub::HubNavItem.create!(
        label: "A",
        url: "/a",
        icon_name: nil,
        is_external: false,
        sort_order: 1,
        active: true
      )
      CommunityHub::HubNavItem.create!(
        label: "B",
        url: "/b",
        icon_name: nil,
        is_external: false,
        sort_order: 0,
        active: true
      )
      CommunityHub::HubNavItem.create!(
        label: "C",
        url: "/c",
        icon_name: nil,
        is_external: false,
        sort_order: 2,
        active: false
      )

      CommunityHub::HubHeroBanner.create!(
        title: "Hero1",
        subtitle: nil,
        image_url: "/uploads/x.png",
        link_url: "/c/user-guide",
        bg_color: "#f6ebe3",
        style_type: nil,
        sort_order: 0,
        active: true
      )
      CommunityHub::HubSidebarWidget.create!(
        title: "Side1",
        image_url: "/uploads/y.png",
        link_url: "/t/test",
        widget_type: nil,
        sort_order: 0,
        active: true
      )

      get "/hub-config.json"

      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)

      expect(json.keys).to contain_exactly("nav_items", "hero_banners", "sidebar_widgets")

      expect(json["nav_items"].map { |x| x["label"] }).to eq(["B", "A"])
      expect(json["nav_items"].first).to include("label", "url", "is_external")

      expect(json["hero_banners"].size).to eq(1)
      expect(json["hero_banners"].first).to include("title", "image_url", "bg_color", "link_url")

      expect(json["sidebar_widgets"].size).to eq(1)
      expect(json["sidebar_widgets"].first).to include("title", "image_url", "link_url")
    end

    it "clears cache after update/destroy" do
      Rails.cache.delete(CommunityHub::CACHE_KEY)

      nav_item = CommunityHub::HubNavItem.create!(
        label: "A",
        url: "/a",
        icon_name: nil,
        is_external: false,
        sort_order: 0,
        active: true
      )

      get "/hub-config.json"
      expect(Rails.cache.exist?(CommunityHub::CACHE_KEY)).to eq(true)

      nav_item.update!(sort_order: 10)
      expect(Rails.cache.exist?(CommunityHub::CACHE_KEY)).to eq(false)
    end
  end
end

