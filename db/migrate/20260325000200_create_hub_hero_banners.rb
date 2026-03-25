# frozen_string_literal: true

class CreateHubHeroBanners < ActiveRecord::Migration[7.1]
  def change
    create_table :hub_hero_banners do |t|
      t.string :title, null: false
      t.string :subtitle

      t.string :image_url, null: false
      t.string :link_url, null: false

      # 兜底背景色（前端接口字段：hero_banners.bg_color）
      t.string :bg_color, null: false, default: "#f6ebe3"

      # 预留扩展字段（未来可用于不同样式类型）
      t.string :style_type

      t.integer :sort_order, null: false, default: 0
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :hub_hero_banners, :active
    add_index :hub_hero_banners, :sort_order
  end
end

