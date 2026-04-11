import Controller from "@ember/controller";
import { action } from "@ember/object";
import { tracked } from "@glimmer/tracking";
import { scheduleOnce } from "@ember/runloop";
import { ajax } from "discourse/lib/ajax";

/** 选用浏览器可直接请求的 URL，避免 upload:// 短链（主题里 img 无法直接使用）。 */
function pickImageUrlFromUploadResponse(data) {
  const candidates = [
    data?.url,
    data?.upload?.url,
    data?.files?.[0]?.url,
    data?.location,
    data?.short_url,
    data?.files?.[0]?.short_url,
    data?.upload?.short_url,
  ].filter((x) => x != null && String(x).trim() !== "");

  for (const c of candidates) {
    const s = String(c).trim();
    if (s.startsWith("upload://")) {
      continue;
    }
    return s;
  }

  return candidates.length ? String(candidates[0]).trim() : null;
}

export default class CommunityHubController extends Controller {
  @tracked isLoading = true;

  @tracked heroBanners = [];
  @tracked sidebarWidgets = [];

  @tracked categories = [];

  @tracked modalOpen = false;
  @tracked modalType = null; // "hero" | "sidebar"
  @tracked modalDraft = null;
  @tracked modalTarget = null;
  @tracked uploadError = null;

  dragState = null;

  constructor() {
    super(...arguments);
    this.loadConfig();
  }

  get isHeroModal() {
    return this.modalType === "hero";
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

  get isSidebarCustomLink() {
    return this.modalDraft?._linkMode !== "category";
  }

  get isSidebarCategoryLink() {
    return this.modalDraft?._linkMode === "category";
  }

  csrfToken() {
    const el = document.querySelector('meta[name="csrf-token"]');
    return el ? el.content : null;
  }

  listProp(type) {
    return type === "hero" ? "heroBanners" : "sidebarWidgets";
  }

  itemsPayloadForSave(type) {
    const prop = this.listProp(type);
    const list = this[prop] || [];
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

      this.heroBanners = data.hero_banners || [];
      this.sidebarWidgets = data.sidebar_widgets || [];

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
        hero_banners: "heroBanners",
        sidebar_widgets: "sidebarWidgets",
      };
      const saveTypeMap = {
        hero_banners: "hero",
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
    if (type === "hero") {
      return {
        id: null,
        title: "",
        image_url: "",
        link_url: "",
        bg_color: "#f6ebe3",
        _linkMode: "custom",
        sort_order: sortOrder,
        active: true,
      };
    }
    return {
      id: null,
      title: "",
      image_url: "",
      link_url: "",
      _linkMode: "custom",
      sort_order: sortOrder,
      active: true,
    };
  }

  normalizeDraftForOpen(type, item) {
    if (!item) return this.defaultDraft(type);
    const d = { ...item };
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
      _linkMode: "custom",
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
    const prop = this.listProp(type);
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
      type === "hero"
        ? `/admin/plugins/community-hub/hero_banners/${id}.json`
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
    const url = pickImageUrlFromUploadResponse(data);

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
      type === "hero"
        ? "/admin/plugins/community-hub/hero_banners.json"
        : "/admin/plugins/community-hub/sidebar_widgets.json";

    const items = this.itemsPayloadForSave(type);
    await ajax(api, {
      type: "PUT",
      contentType: "application/json; charset=UTF-8",
      data: JSON.stringify({ items }),
      processData: false,
    });
    await this.loadConfig();
  }

  @action
  async saveModalChanges() {
    const draft = this.modalDraft;
    const type = this.modalType;

    if (draft && type) {
      const prop = this.listProp(type);
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
