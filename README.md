# 宠物同行资源（微信小程序）

基于 **uni-app（Vue3 + TS）** 与 **微信云开发** 的宠物行业同行资源信息小程序，支持资源发布/浏览、会员充值、订单查询、个人中心等功能。

## 功能概览

- 首页资源列表：搜索、分类筛选、分页加载（每次 20 条，上拉加载更多）
- 资源发布：发布需求/介绍等信息
- 会员充值：微信支付下单、充值协议勾选与弹窗阅读（滚动到底才可同意）
- 个人中心：头像/昵称编辑、会员状态展示
- 我的订单：展示订单列表

## 技术栈

- 前端：uni-app、Vue 3、TypeScript、UnoCSS
- 云能力：微信云开发（云函数/云数据库/云存储）
- 工程化：Vite
- 测试：Vitest（部分核心逻辑单测）

## 本地运行

安装依赖：

```bash
npm install
```

启动微信小程序开发：

```bash
npm run dev:mp-weixin
```

在 **微信开发者工具** 中导入编译产物目录：

```text
dist/dev/mp-weixin
```

## 云函数部署

在微信开发者工具中，进入 `cloudfunctions/` 目录，对新增/修改的云函数右键：

- **上传并部署：云端安装依赖**

常用云函数：

- `login`：获取用户 openid
- `createOrder` / `payCallback`：支付下单与回调
- `getNextUserId`：生成自增用户编号
- `getNextResourceId`：生成自增资源编号
- `getAgreement`：协议热更新（从 `agreements` 集合读取）
- `secCheck`：内容安全检测（昵称等）

## 数据库与权限建议

- `users` / `orders` / `resources` / `counters` / `agreements` 等集合需按业务创建
- 云存储 `avatars/` 如用于公开头像展示，建议设置为“所有用户可读，仅创建者可写”，否则可能出现 403

## 测试

运行单元测试：

```bash
npm run test:run
```

