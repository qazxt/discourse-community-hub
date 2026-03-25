# frozen_string_literal: true

class CreateHubSidebarWidgets < ActiveRecord::Migration[7.1]
  def change
    create_table :hub_sidebar_widgets do |t|
      t.string :title, null: false
      t.string :image_url, null: false
      t.string :link_url, null: false

      # 预留扩展字段（文档提到过 carousel/static 等）
      t.string :widget_type

      t.integer :sort_order, null: false, default: 0
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :hub_sidebar_widgets, :active
    add_index :hub_sidebar_widgets, :sort_order
  end
end

