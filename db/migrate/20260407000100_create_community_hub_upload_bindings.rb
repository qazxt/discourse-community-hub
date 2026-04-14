# frozen_string_literal: true

class CreateCommunityHubUploadBindings < ActiveRecord::Migration[7.0]
  def change
    create_table :community_hub_upload_bindings do |t|
      t.string :kind, null: false
      t.bigint :item_id, null: false
      t.timestamps null: false
    end

    add_index :community_hub_upload_bindings, %i[kind item_id], unique: true
  end
end
