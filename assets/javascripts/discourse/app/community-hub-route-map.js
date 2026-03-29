/**
 * 挂在 admin 根下（/admin/community-hub），避免 adminPlugins 新版「插件详情」outlet 不渲染子模板导致白屏。
 * 入口：管理后台侧边栏链接（见 initializers/community-hub-admin-sidebar.js）
 */
export default {
  resource: "admin",
  map() {
    this.route("community-hub", { path: "/community-hub" });
  },
};
