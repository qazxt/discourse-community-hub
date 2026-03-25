# frozen_string_literal: true

class CreateHubNavItems < ActiveRecord::Migration[7.1]
  def change
    create_table :hub_nav_items do |t|
      t.string :label, null: false
      t.string :url, null: false
      t.string :icon_name
      t.boolean :is_external, null: false, default: false

      t.integer :sort_order, null: false, default: 0
      t.boolean :active, null: false, default: true

      t.timestamps
    end

    add_index :hub_nav_items, :active
    add_index :hub_nav_items, :sort_order
  end
end

