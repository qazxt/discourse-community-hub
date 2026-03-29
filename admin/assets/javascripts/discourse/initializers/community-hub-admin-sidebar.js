import { withPluginApi } from "discourse/lib/plugin-api";

/**
 * 与 docker_manager 相同：在管理后台侧边栏（root 区）增加链接。
 */
export default {
  name: "community-hub-admin-sidebar",

  initialize() {
    withPluginApi((api) => {
      api.addAdminSidebarSectionLink("root", {
        name: "community_hub_config",
        route: "community-hub",
        label: "community_hub.title",
        icon: "sliders",
      });
    });
  },
};
