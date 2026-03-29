/**
 * 必须放在 admin/assets/javascripts/discourse/（与 docker_manager 一致），
 * 否则会打进主站包而非 Admin 包，表现为主内容区白屏。
 */
export default {
  resource: "admin",
  map() {
    this.route("community-hub", { path: "/community-hub", resetNamespace: true });
  },
};
