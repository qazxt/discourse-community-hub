import Controller from "@ember/controller";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { scheduleOnce } from "@ember/runloop";
import { ajax } from "discourse/lib/ajax";

export default class AdminCommunityHubController extends Controller {
  @tracked isLoading = true;

  @tracked navItems = [];
  @tracked heroBanners = [];
  @tracked filterQuickTags = [];
  @tracked sidebarWidgets = [];

  @tracked sidebarSectionTitle = "";
  @tracked sidebarViewAll = { label: "", url: "", is_external: false };

  @tracked categories = [];

  @tracked modalOpen = false;
  @tracked modalType = null; // "nav" | "hero" | "filter" | "sidebar"
  @tracked modalDraft = null;
  @tracked modalTarget = null;
  @tracked uploadError = null;

  dragState = null;

  constructor() {
    super(...arguments);
    // eslint-disable-next-line no-console
    console.info("[community-hub] AdminCommunityHubController constructed");
    this.loadConfig();
  }

  get isNavModal() {
    return this.modalType === "nav";
  }

  get isHeroModal() {
    return this.modalType === "hero";
  }

  get isFilterModal() {
    return this.modalType === "filter";
  }

  get isSidebarModal() {
    return this.modalType === "sidebar";
  }

  csrfToken() {
    const el = document.querySelector('meta[name="csrf-token"]');
    return el ? el.content : null;
  }

  sectionProp(type) {
    if (type === "nav") return "navItems";
    if (type === "hero") return "heroBanners";
    if (type === "filter") return "filterQuickTags";
    return "sidebarWidgets";
  }

  async loadConfig() {
    this.isLoading = true;

    try {
      const data = await ajax("/admin/plugins/community-hub/config.json");

      this.navItems = data.nav_items || [];
      this.heroBanners = data.hero_banners || [];
      this.filterQuickTags = data.filter_quick_tags || [];
      this.sidebarWidgets = data.sidebar_widgets || [];

      this.sidebarSectionTitle = data.sidebar_section_title || "";
      const va = data.sidebar_view_all;
      this.sidebarViewAll = va
        ? {
            label: va.label || "",
            url: va.url || "",
            is_external: !!va.is_external,
          }
        : { label: "", url: "", is_external: false };

      this.loadCategories();
      scheduleOnce("afterRender", this, this.attachDnDHandlers);
    } catch (e) {
      // eslint-disable-next-line no-console
      console.error("[community-hub] loadConfig failed:", e);
    } finally {
      this.isLoading = false;
    }
  }

  async loadCategories() {
    try {
      const data = await ajax("/categories.json");
      const cats = data?.category_list?.categories || data?.categories || [];
      this.categories = Array.isArray(cats) ? cats : [];
    } catch {
      this.categories = [];
    }
  }

  attachDnDHandlers() {
    const root = document.querySelector(".community-hub-admin");
    if (!root || root.dataset.dndAttached === "true") return;
    root.dataset.dndAttached = "true";

    root.addEventListener("dragstart", (e) => {
      const li = e.target.closest(".community-hub-item");
      if (!li) return;
      const fromIndex = parseInt(li.dataset.index, 10);
      const section = li.dataset.section;
      if (Number.isNaN(fromIndex) || !section) return;

      this.dragState = { fromIndex, section };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "x");
    });

    root.addEventListener("dragover", (e) => {
      if (e.target.closest(".community-hub-item")) e.preventDefault();
    });

    root.addEventListener("drop", (e) => {
      const li = e.target.closest(".community-hub-item");
      if (!li || !this.dragState) return;
      e.preventDefault();

      const toIndex = parseInt(li.dataset.index, 10);
      const toSection = li.dataset.section;
      const { fromIndex, section } = this.dragState;

      if (Number.isNaN(toIndex) || !toSection || toSection !== section) return;
      if (fromIndex === toIndex) return;

      const propMap = {
        nav_items: "navItems",
        hero_banners: "heroBanners",
        filter_quick_tags: "filterQuickTags",
        sidebar_widgets: "sidebarWidgets",
      };
      const saveTypeMap = {
        nav_items: "nav",
        hero_banners: "hero",
        filter_quick_tags: "filter",
        sidebar_widgets: "sidebar",
      };

      const prop = propMap[section];
      const arr = this[prop] || [];
      const next = arr.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      next.forEach((item, idx) => {
        item.sort_order = idx;
      });
      this[prop] = next;

      this.saveCategory(saveTypeMap[section]);
    });
  }

  defaultDraft(type, sortOrder = 0) {
    if (type === "nav") {
      return { id: null, label: "", url: "", icon_name: "", is_external: false, sort_order: sortOrder, active: true };
    }
    if (type === "filter") {
      return { id: null, label: "", url: "", is_external: false, sort_order: sortOrder, active: true };
    }
    if (type === "hero") {
      return {
        id: null,
        title: "",
        subtitle: "",
        image_url: "",
        link_url: "",
        bg_color: "#f6ebe3",
        style_type: "",
        sort_order: sortOrder,
        active: true,
      };
    }
    return { id: null, title: "", image_url: "", link_url: "", widget_type: "", sort_order: sortOrder, active: true };
  }

  @action
  openModal(type, item) {
    const draft = item ? { ...item } : this.defaultDraft(type);
    this.modalOpen = true;
    this.modalType = type;
    this.modalDraft = draft;
    this.modalTarget = item || null;
    this.uploadError = null;
  }

  @action
  closeModal() {
    this.modalOpen = false;
    this.modalType = null;
    this.modalDraft = null;
    this.modalTarget = null;
    this.uploadError = null;
  }

  @action
  addNew(type) {
    const prop = this.sectionProp(type);
    const arr = (this[prop] || []).slice();
    const newItem = this.defaultDraft(type, arr.length);
    arr.push(newItem);
    arr.forEach((item, idx) => (item.sort_order = idx));
    this[prop] = arr;
    this.openModal(type, newItem);
  }

  @action
  async deleteItem(type, id) {
    if (!id) return;
    const api =
      type === "nav"
        ? `/admin/plugins/community-hub/nav_items/${id}.json`
        : type === "hero"
          ? `/admin/plugins/community-hub/hero_banners/${id}.json`
          : type === "filter"
            ? `/admin/plugins/community-hub/filter_quick_tags/${id}.json`
            : `/admin/plugins/community-hub/sidebar_widgets/${id}.json`;

    await ajax(api, { type: "DELETE" });
    await this.loadConfig();
  }

  @action
  async uploadModalImage() {
    const fileInput = document.getElementById("community-hub-upload-file");
    if (!fileInput?.files?.length) return;
    const file = fileInput.files[0];

    const uploadType = this.modalType === "hero" ? "hub_hero_banner" : "hub_sidebar_widget";
    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", uploadType);
    formData.append("synchronous", "true");

    const res = await fetch("/uploads.json", {
      method: "POST",
      credentials: "same-origin",
      headers: { "X-CSRF-Token": this.csrfToken() },
      body: formData,
    });

    const data = await res.json();
    const url =
      data?.short_url ||
      data?.url ||
      data?.files?.[0]?.url ||
      data?.files?.[0]?.short_url ||
      data?.location ||
      data?.upload?.short_url ||
      data?.upload?.url;

    if (!url) {
      this.uploadError = "Upload failed: can not extract image URL";
      return;
    }

    this.modalDraft = { ...this.modalDraft, image_url: url };
  }

  @action
  setCategoryLink(_type, categoryId) {
    if (!this.modalDraft) return;
    const id = parseInt(categoryId, 10);
    if (Number.isNaN(id)) return;

    const cat = (this.categories || []).find((c) => parseInt(c.id, 10) === id);
    if (!cat?.slug) return;

    const linkUrl = `/c/${cat.slug}/${cat.id}`;
    this.modalDraft = { ...this.modalDraft, link_url: linkUrl };
  }

  @action
  async saveCategory(type) {
    const api =
      type === "nav"
        ? "/admin/plugins/community-hub/nav_items.json"
        : type === "hero"
          ? "/admin/plugins/community-hub/hero_banners.json"
          : type === "filter"
            ? "/admin/plugins/community-hub/filter_quick_tags.json"
            : "/admin/plugins/community-hub/sidebar_widgets.json";

    const prop = this.sectionProp(type);
    const items = (this[prop] || []).map((x) => ({
      id: x.id || null,
      label: x.label,
      url: x.url,
      icon_name: x.icon_name,
      is_external: x.is_external,
      sort_order: x.sort_order,
      active: x.active,

      title: x.title,
      subtitle: x.subtitle,
      image_url: x.image_url,
      link_url: x.link_url,
      bg_color: x.bg_color,
      style_type: x.style_type,
      widget_type: x.widget_type,
    }));

    await ajax(api, { type: "PUT", data: { items } });

    await this.loadConfig();
  }

  @action
  async saveSidebarExtras() {
    await ajax("/admin/plugins/community-hub/sidebar_extras.json", {
      type: "PUT",
      data: {
        sidebar_section_title: this.sidebarSectionTitle,
        sidebar_view_all: this.sidebarViewAll,
      },
    });
    await this.loadConfig();
  }

  @action
  async saveModalChanges() {
    const target = this.modalTarget;
    const draft = this.modalDraft;
    if (target && draft) {
      Object.assign(target, draft);
      const prop = this.sectionProp(this.modalType);
      const list = this[prop] || [];
      target.sort_order = list.indexOf(target);
    }

    const type = this.modalType;
    this.closeModal();
    if (type) {
      await this.saveCategory(type);
    }
  }
}
