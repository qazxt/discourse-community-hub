# 插件接口规范 — Plugin Interface Specification

> 本文档定义了 Robotime Community Theme 与 Discourse 插件之间的数据约定。
> 主题中所有动态内容（导航链接、轮播卡片、侧栏小部件）完全依赖插件通过 API 接口提供。

---

## 一、接口概览

| 接口 | 方法 | 路径 | 用途 |
|------|------|------|------|
| Hub Config | GET | `/hub-config.json` | 返回所有动态配置（导航/轮播/侧栏） |

主题在页面加载时调用 `fetch('/hub-config.json')`，获取全部配置后分发渲染。

---

## 二、响应格式

```json
{
  "nav_items": [...],
  "hero_banners": [...],
  "sidebar_widgets": [...]
}
```

---

## 三、各字段详细定义

### 3.1 `nav_items` — 顶部导航栏链接

**位置**: Header 黑色导航栏中间区域（Logo 右侧、用户区左侧）

```json
{
  "nav_items": [
    {
      "label": "Help",
      "url": "/help",
      "is_external": false
    },
    {
      "label": "Buy",
      "url": "https://www.robotime.com",
      "is_external": true
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `label` | string | ✅ | 显示文字 |
| `url` | string | ✅ | 链接地址（相对路径或完整 URL） |
| `is_external` | boolean | ✅ | `true` 时添加 `target="_blank" rel="noopener"` |

**渲染位置**: `.robotime-header__nav` 容器内，移动端同步渲染到 `.robotime-mobile-nav`

---

### 3.2 `hero_banners` — 导航栏下方轮播卡片

**位置**: Header 下方的水平滚动卡片区

```json
{
  "hero_banners": [
    {
      "title": "User Guide & Perks",
      "image_url": "/uploads/default/original/carousel/user-guide.png",
      "bg_color": "#f6ebe3",
      "link_url": "/c/user-guide-perks"
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 卡片底部文字标签（左对齐，白色，14px bold） |
| `image_url` | string | ✅ | 卡片背景图片 URL（cover 填充，建议比例 ~2.2:1） |
| `bg_color` | string | 可选 | 图片未加载时的兜底背景色（默认 `#f6ebe3`） |
| `link_url` | string | ✅ | 点击跳转地址 |

**卡片样式**: 统一 Type C (全幅照片背景)
- 尺寸: `148×66px` (10px 圆角)
- 图片 `background-size: cover; background-position: center`
- 底部 60% 区域有 `linear-gradient(to top, rgba(0,0,0,0.5), transparent)` 渐变遮罩
- 文字白色 + `text-shadow`，确保可读性

**动画**:
- Hover: `scale(1.12)`，`0.35s cubic-bezier(0.34, 1.56, 0.64, 1)` 弹性缓动
- 阴影: `0 8px 24px rgba(0,0,0,0.18)`
- 点击按下: `scale(0.96)`，`0.1s` 快速缩小反馈
- 左右箭头: 每次滚动 2 张卡片宽度

**图片建议**:
- 推荐尺寸: `490×218px` (2x 视网膜) 或 `245×109px` (1x)
- 格式: WebP 优先，PNG/JPG 兼容
- 图片应有丰富的视觉内容，底部区域会被渐变遮罩覆盖

---

### 3.3 `sidebar_widgets` — 左侧栏底部小部件轮播

**位置**: 左侧边栏菜单下方的 `.robotime-sidebar-widget-slot` 插槽

```json
{
  "sidebar_widgets": [
    {
      "title": "Sweet Shack",
      "image_url": "/uploads/default/original/events/sweet-shack.png",
      "link_url": "/t/sweet-shack-event/123"
    },
    {
      "title": "Winter Campaign",
      "image_url": "/uploads/default/original/events/winter.png",
      "link_url": "/t/winter-campaign/456"
    }
  ]
}
```

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 小部件标题（图片下方） |
| `image_url` | string | ✅ | 小部件图片 URL（max-height: 160px，cover 裁剪） |
| `link_url` | string | ✅ | 点击跳转地址 |

**行为**:
- 单条数据: 静态展示
- 多条数据: 自动轮播（5 秒间隔），底部圆点指示器
- 卡片样式: `border: 1px solid #eee; border-radius: 12px`

---

## 四、插件后端实现参考

### 4.1 Rails 控制器

```ruby
# plugin.rb
after_initialize do
  module ::CommunityHub
    PLUGIN_NAME = "community-hub"
    
    class Engine < ::Rails::Engine
      engine_name PLUGIN_NAME
      isolate_namespace CommunityHub
    end
  end

  CommunityHub::Engine.routes.draw do
    get "/hub-config" => "config#show"
  end

  Discourse::Application.routes.append do
    mount ::CommunityHub::Engine, at: "/"
  end

  class CommunityHub::ConfigController < ::ApplicationController
    skip_before_action :check_xhr
    skip_before_action :verify_authenticity_token

    def show
      config = {
        nav_items: PluginStore.get(CommunityHub::PLUGIN_NAME, "nav_items") || default_nav,
        hero_banners: PluginStore.get(CommunityHub::PLUGIN_NAME, "hero_banners") || [],
        sidebar_widgets: PluginStore.get(CommunityHub::PLUGIN_NAME, "sidebar_widgets") || []
      }
      render json: config
    end

    private

    def default_nav
      [
        { label: "Help", url: "/help", is_external: false },
        { label: "Community Perks", url: "/community-perks", is_external: false },
        { label: "About", url: "/about", is_external: false }
      ]
    end
  end
end
```

### 4.2 Admin 管理界面

插件应在 Discourse Admin 后台提供管理页面：

- **导航管理**: 增删改 `nav_items`（拖拽排序）
- **轮播管理**: 增删改 `hero_banners`（上传图片、设置标题/链接/背景色）
- **小部件管理**: 增删改 `sidebar_widgets`（上传图片、设置标题/链接）

---

## 五、主题端文件对照

| 主题文件 | 数据来源 | 渲染内容 |
|----------|----------|----------|
| `common/header.html` | `nav_items` | 导航链接（桌面端 + 移动端） |
| `common/after_header.html` | `hero_banners` | 轮播卡片容器 |
| `common/head_tag.html` | 全部 | JS: fetch → render 全部模块 |
| `common/common.scss` | — | 纯样式，不含数据 |

---

## 六、降级策略

当插件未安装或接口不可用时：
- 导航栏: 显示空（仅 Logo + 用户区）
- 轮播区: 显示空容器
- 侧栏小部件: 不渲染
- 控制台输出: `[Robotime Theme] hub-config.json not available — plugin may be disabled.`

---

## 七、图片 CDN 说明

- Discourse 上传的图片自动走 CDN
- 插件保存 `image_url` 时直接存相对路径（如 `/uploads/default/original/...`）
- 前端渲染时 Discourse 自动补全域名
- 轮播图建议限制最大尺寸 `1920×600`，防止大图拖慢加载

---

## 八、权限说明

- `/hub-config.json` 接口默认**公开**（游客也需要看到导航和轮播）
- Admin 管理页面限定**管理员**权限
- 如链接指向仅限会员内容，Discourse 原生权限系统自动拦截
