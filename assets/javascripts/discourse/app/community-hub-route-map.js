/**
 * 与 docker_manager 一致：admin 下使用 resetNamespace，否则子路由模板进不了新版管理后台主内容 outlet（URL 对、Router 对，但仍白屏）。
 * URL 仍为 /admin/community-hub；Ember 路由名为 community-hub（非 admin.community-hub）。
 */
export default {
  resource: "admin",
  map() {
    this.route("community-hub", { path: "/community-hub", resetNamespace: true });
  },
};
