import Route from "@ember/routing/route";
import { service } from "@ember/service";

export default class CommunityHubRoute extends Route {
  @service router;

  activate() {
    super.activate();
    // eslint-disable-next-line no-console
    console.info(
      "[community-hub] route:",
      this.routeName,
      "router.currentURL:",
      this.router.currentURL
    );
  }
}
