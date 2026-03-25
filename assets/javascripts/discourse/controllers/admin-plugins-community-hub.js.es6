export default Ember.Controller.extend({
  isLoading: true,

  navItems: [],
  heroBanners: [],
  sidebarWidgets: [],

  categories: [],

  modalOpen: false,
  modalType: null, // "nav" | "hero" | "sidebar"
  modalDraft: null,
  modalTarget: null, // 列表里的真实对象引用（用于写回）
  uploadError: null,

  isNavModal: Ember.computed("modalType", function () {
    return this.get("modalType") === "nav";
  }),

  isHeroModal: Ember.computed("modalType", function () {
    return this.get("modalType") === "hero";
  }),

  isSidebarModal: Ember.computed("modalType", function () {
    return this.get("modalType") === "sidebar";
  }),

  init() {
    this._super(...arguments);
    this.loadConfig();
  },

  csrfToken() {
    const el = document.querySelector('meta[name="csrf-token"]');
    return el ? el.content : null;
  },

  async loadConfig() {
    this.setProperties({ isLoading: true });

    const res = await fetch("/admin/plugins/community-hub/config", { credentials: "same-origin" });
    const data = await res.json();

    this.setProperties({
      navItems: data.nav_items || [],
      heroBanners: data.hero_banners || [],
      sidebarWidgets: data.sidebar_widgets || [],
      isLoading: false
    });

    // 分类列表仅用于“内部链接选择器”
    this.loadCategories();

    Ember.run.scheduleOnce("afterRender", this, this.attachDnDHandlers);
  },

  async loadCategories() {
    try {
      const res = await fetch("/categories.json", { credentials: "same-origin" });
      const data = await res.json();
      const cats = data?.category_list?.categories || data?.categories || data?.category_list || [];
      this.set("categories", Array.isArray(cats) ? cats : []);
    } catch (e) {
      // 不影响页面其他功能
      this.set("categories", []);
    }
  },

  sectionProp(type) {
    if (type === "nav") return "navItems";
    if (type === "hero") return "heroBanners";
    return "sidebarWidgets";
  },

  typeToApiKey(type) {
    if (type === "nav") return "nav_items";
    if (type === "hero") return "hero_banners";
    return "sidebar_widgets";
  },

  setCategoryLink(type, categoryId) {
    if (!this.modalDraft) return;
    const id = parseInt(categoryId, 10);
    if (Number.isNaN(id)) return;

    const cats = this.get("categories") || [];
    const cat = cats.find((c) => parseInt(c.id, 10) === id);
    if (!cat || !cat.slug) return;

    const linkUrl = `/c/${cat.slug}/${cat.id}`;
    this.set("modalDraft.link_url", linkUrl);
  },

  attachDnDHandlers() {
    const root = document.querySelector(".community-hub-admin");
    if (!root || root.dataset.dndAttached === "true") return;
    root.dataset.dndAttached = "true";

    // 用事件委托实现拖拽排序，避免依赖特定 Ember/Handlebars 对 drag/drop 事件的绑定方式。
    root.addEventListener("dragstart", (e) => {
      const li = e.target.closest(".community-hub-item");
      if (!li) return;
      const fromIndex = parseInt(li.dataset.index, 10);
      const section = li.dataset.section; // nav_items | hero_banners | sidebar_widgets

      if (Number.isNaN(fromIndex) || !section) return;

      this.dragState = { fromIndex, section };
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", "x");
    });

    root.addEventListener("dragover", (e) => {
      if (e.target.closest(".community-hub-item")) e.preventDefault();
    });

    root.addEventListener("drop", async (e) => {
      const li = e.target.closest(".community-hub-item");
      if (!li || !this.dragState) return;
      e.preventDefault();

      const toIndex = parseInt(li.dataset.index, 10);
      const toSection = li.dataset.section;
      const { fromIndex, section } = this.dragState;

      if (Number.isNaN(toIndex) || !toSection || toSection !== section) return;
      if (fromIndex === toIndex) return;

      const prop = (() => {
        if (section === "nav_items") return "navItems";
        if (section === "hero_banners") return "heroBanners";
        return "sidebarWidgets";
      })();

      const arr = this.get(prop) || [];
      const next = arr.slice();
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);

      // 更新排序字段（前端排序与后端 sort_order 一致）
      next.forEach((item, idx) => {
        item.sort_order = idx;
      });

      this.set(prop, next);

      // 拖拽结束后立即持久化排序，满足“拖拽排序后刷新 API 顺序正确”的目标。
      const saveType = (() => {
        if (section === "nav_items") return "nav";
        if (section === "hero_banners") return "hero";
        return "sidebar";
      })();
      this.saveCategory(saveType);
    });
  },

  openModal(type, item) {
    const defaults = (() => {
      if (type === "nav") {
        return { id: null, label: "", url: "", icon_name: "", is_external: false, sort_order: 0, active: true };
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
          sort_order: 0,
          active: true
        };
      }
      return {
        id: null,
        title: "",
        image_url: "",
        link_url: "",
        widget_type: "",
        sort_order: 0,
        active: true
      };
    })();

    const draft = item ? Ember.Object.create(item) : Ember.Object.create(defaults);

    this.setProperties({
      modalOpen: true,
      modalType: type,
      modalDraft: draft,
      modalTarget: item || null,
      uploadError: null
    });
  },

  closeModal() {
    this.setProperties({
      modalOpen: false,
      modalType: null,
      modalDraft: null,
      modalTarget: null,
      uploadError: null
    });
  },

  addNew(type) {
    // 先放入列表，sort_order 暂按末尾计算；最终以保存 API 后的刷新数据为准。
    const prop = this.sectionProp(type);
    const arr = this.get(prop) || [];
    const next = arr.slice();

    const newItem = (() => {
      if (type === "nav") return { id: null, label: "", url: "", icon_name: "", is_external: false, sort_order: next.length, active: true };
      if (type === "hero") {
        return {
          id: null,
          title: "",
          subtitle: "",
          image_url: "",
          link_url: "",
          bg_color: "#f6ebe3",
          style_type: "",
          sort_order: next.length,
          active: true
        };
      }
      return {
        id: null,
        title: "",
        image_url: "",
        link_url: "",
        widget_type: "",
        sort_order: next.length,
        active: true
      };
    })();

    next.push(newItem);
    next.forEach((item, idx) => (item.sort_order = idx));
    this.set(prop, next);

    this.openModal(type, newItem);
  },

  deleteItem(type, id) {
    if (!id) return;
    const api = (() => {
      if (type === "nav") return `/admin/plugins/community-hub/nav_items/${id}`;
      if (type === "hero") return `/admin/plugins/community-hub/hero_banners/${id}`;
      return `/admin/plugins/community-hub/sidebar_widgets/${id}`;
    })();

    fetch(api, {
      method: "DELETE",
      credentials: "same-origin",
      headers: {
        "X-CSRF-Token": this.csrfToken()
      }
    }).then(() => this.loadConfig());
  },

  async uploadModalImage() {
    const fileInput = document.getElementById("community-hub-upload-file");
    if (!fileInput || !fileInput.files || !fileInput.files.length) return;
    const file = fileInput.files[0];

    const type = this.modalType === "hero" ? "hub_hero_banner" : "hub_sidebar_widget";

    const formData = new FormData();
    formData.append("file", file);
    formData.append("type", type);
    formData.append("synchronous", "true");

    const res = await fetch("/uploads.json", {
      method: "POST",
      credentials: "same-origin",
      headers: {
        "X-CSRF-Token": this.csrfToken()
      },
      body: formData
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
      this.set("uploadError", "Upload failed: can not extract image URL");
      return;
    }

    // 先写回 draft，关闭/保存弹窗时再批量写回列表项。
    if (this.modalType === "hero") this.set("modalDraft.image_url", url);
    if (this.modalType === "sidebar") this.set("modalDraft.image_url", url);
  },

  saveCategory(type) {
    const api = (() => {
      if (type === "nav") return "/admin/plugins/community-hub/nav_items";
      if (type === "hero") return "/admin/plugins/community-hub/hero_banners";
      return "/admin/plugins/community-hub/sidebar_widgets";
    })();

    const prop = this.sectionProp(type);
    const items = (this.get(prop) || []).map((x) => {
      // Rails JSON 参数期望是数组 items=[{...}]
      return {
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
        widget_type: x.widget_type
      };
    });

    fetch(api, {
      method: "PUT",
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
        "X-CSRF-Token": this.csrfToken()
      },
      body: JSON.stringify({ items })
    }).then(() => this.loadConfig());
  },

  applyDraftToItemAndClose() {
    const target = this.modalTarget;
    const draft = this.modalDraft;
    if (!target || !draft) {
      this.closeModal();
      return;
    }

    // 将弹窗编辑结果写回列表对象
    Object.keys(draft.toJSON ? draft.toJSON() : draft).forEach((k) => {
      if (k === "sort_order") return;
      // eslint-disable-next-line no-param-reassign
      target[k] = draft.get ? draft.get(k) : draft[k];
    });

    // 保持 sort_order 与列表当前顺序一致（由拖拽/索引控制）
    target.sort_order = this.get(this.sectionProp(this.modalType)).indexOf(target);

    this.closeModal();
  },

  saveModalChanges() {
    this.applyDraftToItemAndClose();
    this.saveCategory(this.modalType);
  },

  actions: {
    openModal(type, item) {
      return this.openModal(type, item);
    },

    closeModal() {
      return this.closeModal();
    },

    addNew(type) {
      return this.addNew(type);
    },

    deleteItem(type, id) {
      return this.deleteItem(type, id);
    },

    uploadModalImage() {
      return this.uploadModalImage();
    },

    saveCategory(type) {
      return this.saveCategory(type);
    },

    setCategoryLink(type, categoryId) {
      return this.setCategoryLink(type, categoryId);
    },

    saveModalChanges() {
      return this.saveModalChanges();
    }
  }
});

