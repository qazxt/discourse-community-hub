import Route from "@ember/routing/route";

export default class AdminCommunityHubRoute extends Route {
  templateName = "admin/community-hub";

  activate() {
    super.activate();
    // eslint-disable-next-line no-console
    console.info("[community-hub] route activated:", this.routeName, "→", window.location.pathname);
  }
}
