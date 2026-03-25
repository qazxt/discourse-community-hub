# frozen_string_literal: true

module CommunityHub
  class Engine < ::Rails::Engine
    engine_name PLUGIN_NAME
    isolate_namespace CommunityHub
  end
end

