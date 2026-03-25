import Route from "@ember/routing/route";

export default class AdminPluginsCommunityHubRoute extends Route {
  beforeModel() {
    // 仅用于调试：确认路由真正命中（页面空白时很有用）
    // eslint-disable-next-line no-console
    console.info("[community-hub] admin route entered:", this.routeName);
  }
}

