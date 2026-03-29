import Route from "@ember/routing/route";

/**
 * 模板必须与 controller 同级命名空间：admin-plugins/community-hub
 * （放在 templates/admin/plugins/ 时解析器会得到 admin/plugins/community-hub，与 route 默认解析不一致，导致白屏）
 */
export default class AdminPluginsCommunityHubRoute extends Route {
  templateName = "admin-plugins/community-hub";
}
