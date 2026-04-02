import Controller from "@ember/controller";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { scheduleOnce } from "@ember/runloop";
import { ajax } from "discourse/lib/ajax";

export default class CommunityHubController extends Controller {
  @tracked isLoading = true;

  @tracked navItems = [];
  @tracked heroBanners = [];
  @tracked filterQuickTags = [];
  @tracked sidebarWidgets = [];

  @tracked sidebarSectionTitle = "";
  @tracked sidebarViewAll = { label: "", url: "", is_external: false };

  @tracked categories = [];

  @tracked modalOpen = false;
  @tracked modalType = null;
  @tracked modalDraft = null;
  @tracked modalTarget = null;
  @tracked uploadError = null;

  dragState = null;

  constructor() {
    super(...arguments);
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

  get isHeroCustomLink() {
    return this.modalDraft?._linkMode !== "category";
  }

  get isHeroCategoryLink() {
    return this.modalDraft?._linkMode === "category";
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

  itemsPayloadForSave(type) {
    const prop = this.sectionProp(type);
    const list = this[prop] || [];
    if (type === "nav") {
      return list.map((x) => ({
        id: x.id || null,
        label: x.label,
        url: x.url,
        bg_color: x.bg_color,
        is_external: x.is_external,
        sort_order: x.sort_order,
        active: true,
      }));
    }
    if (type === "filter") {
      return list.map((x) => ({
        id: x.id || null,
        label: x.label,
        url: x.url,
        is_external: x.is_external,
        sort_order: x.sort_order,
        active: true,
      }));
    }
    if (type === "hero") {
      return list.map((x) => ({
        id: x.id || null,
        title: x.title,
        image_url: x.image_url,
        link_url: x.link_url,
        bg_color: x.bg_color,
        sort_order: x.sort_order,
        active: true,
      }));
    }
    return list.map((x) => ({
      id: x.id || null,
      title: x.title,
      image_url: x.image_url,
      link_url: x.link_url,
      sort_order: x.sort_order,
      active: true,
    }));
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
      return {
        id: null,
        label: "",
        url: "",
        bg_color: "",
        is_external: false,
        sort_order: sortOrder,
        active: true,
      };
    }
    if (type === "filter") {
      return { id: null, label: "", url: "", is_external: false, sort_order: sortOrder, active: true };
    }
    if (type === "hero") {
      return {
        id: null,
        title: "",
        image_url: "",
        link_url: "",
        bg_color: "#f6ebe3",
        sort_order: sortOrder,
        active: true,
      };
    }
    return { id: null, title: "", image_url: "", link_url: "", sort_order: sortOrder, active: true };
  }

  normalizeDraftForOpen(type, item) {
    if (!item) return this.defaultDraft(type);
    const d = { ...item };
    if (type === "nav") {
      return {
        id: d.id ?? null,
        label: d.label ?? "",
        url: d.url ?? "",
        bg_color: d.bg_color ?? "",
        is_external: !!d.is_external,
        sort_order: d.sort_order ?? 0,
        active: true,
      };
    }
    if (type === "filter") {
      return {
        id: d.id ?? null,
        label: d.label ?? "",
        url: d.url ?? "",
        is_external: !!d.is_external,
        sort_order: d.sort_order ?? 0,
        active: true,
      };
    }
    if (type === "hero") {
      return {
        id: d.id ?? null,
        title: d.title ?? "",
        image_url: d.image_url ?? "",
        link_url: d.link_url ?? "",
        bg_color: d.bg_color ?? "#f6ebe3",
        _linkMode: "custom",
        sort_order: d.sort_order ?? 0,
        active: true,
      };
    }
    return {
      id: d.id ?? null,
      title: d.title ?? "",
      image_url: d.image_url ?? "",
      link_url: d.link_url ?? "",
      sort_order: d.sort_order ?? 0,
      active: true,
    };
  }

  @action
  openModal(type, item) {
    this.modalOpen = true;
    this.modalType = type;
    this.modalDraft = this.normalizeDraftForOpen(type, item);
    this.modalTarget = item || null;
    this.uploadError = null;
    document.body?.classList?.add("community-hub-modal-open");
  }

  @action
  closeModal() {
    this.modalOpen = false;
    this.modalType = null;
    this.modalDraft = null;
    this.modalTarget = null;
    this.uploadError = null;
    document.body?.classList?.remove("community-hub-modal-open");
  }

  @action
  stopPropagation(e) {
    e?.stopPropagation?.();
  }

  @action
  addNew(type) {
    const prop = this.sectionProp(type);
    const arr = this[prop] || [];
    const draft = this.defaultDraft(type, arr.length);
    this.openModal(type, null);
    this.modalDraft = draft;
    this.modalTarget = null;
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
  async onFileSelected(kind, event) {
    const file = event?.target?.files?.[0];
    if (!file) return;

    const uploadType = kind === "hero" ? "hub_hero_banner" : "hub_sidebar_widget";
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
    this.uploadError = null;
  }

  @action
  setLinkMode(mode) {
    if (!this.modalDraft) return;
    this.modalDraft = { ...this.modalDraft, _linkMode: mode };
  }

  @action
  setCategoryLink(_type, categoryId) {
    if (!this.modalDraft) return;
    const id = parseInt(categoryId, 10);
    if (Number.isNaN(id)) return;

    const cat = (this.categories || []).find((c) => parseInt(c.id, 10) === id);
    if (!cat?.slug) return;

    const linkUrl = `/c/${cat.slug}/${cat.id}`;
    this.modalDraft = { ...this.modalDraft, link_url: linkUrl, _linkMode: "category" };
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

    const items = this.itemsPayloadForSave(type);
    // 必须用 JSON 请求体：嵌套数组经表单序列化后 Rails 常得不到 Array，normalize_items 会对 String 调 map → 500
    await ajax(api, {
      type: "PUT",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify({ items }),
      processData: false,
    });
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
    const draft = this.modalDraft;
    const type = this.modalType;

    if (draft && type) {
      const prop = this.sectionProp(type);
      const list = (this[prop] || []).slice();

      if (this.modalTarget) {
        Object.assign(this.modalTarget, draft);
        this.modalTarget.sort_order = list.indexOf(this.modalTarget);
      } else {
        const newItem = { ...draft, id: draft.id || null };
        list.push(newItem);
        list.forEach((item, idx) => (item.sort_order = idx));
        this[prop] = list;
      }
    }

    this.closeModal();
    if (type) {
      await this.saveCategory(type);
    }
  }
}
