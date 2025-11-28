# 等离子体探针系统工程前端（React + TS + Vite）

前端包含项目选择、需求/BOM/接口管理，以及基于 Mermaid 绘制的系统图。Mermaid 依赖已安装为项目依赖（`mermaid`），并通过自定义组件封装。

## 开发与构建
- 安装依赖：`npm install`
- 本地开发：`npm run dev`
- 构建产物：`npm run build`

## 系统图（Mermaid）使用方式
- 组件位置：`src/components/MermaidChart.tsx`  
  - 使用 `mermaid.render`（异步 v10 API）、`startOnLoad: false`、`theme: 'dark'`。  
  - 每次渲染前会清空容器 `innerHTML`，避免重复叠加。
- 页面使用：`src/App.tsx` 顶部区域的系统图面板。
  ```tsx
  import MermaidChart from './components/MermaidChart'

  const rpaDiagram = `...Mermaid graph LR...`

  <MermaidChart chartCode={rpaDiagram} />
  ```
- 当前系统图代码：`src/App.tsx` 内的 `rpaDiagram` 字符串。核心要点：
  - 图类型：`graph LR`
  - 分层：Host、Power、RPABox、Vacuum、Motion；高压扫描电源是外部实验仪器（独立于供电层）
  - RPA 电控箱拆分前端接口（对接 RPA/穿舱/内部仪器）与后端接口（对接上位机 USB 与市电 AC）；新增“外部仪器控制接口”由后端内部配线引出，统一控制二维位移机构与外置高压扫描电源；内部元件（屏蔽栅偏压源、跨阻计）通过接口与外界沟通
  - 外置高压扫描电源（ExtPS）直接接穿舱线束到探头，不经过电控箱；信号与偏压在电控箱内均通过接口转接
  - 上位机与电控箱 USB 为单根双向线，既发送控制也回读测量数据；运动控制（USB-232）经电控箱后端接口转发，而非上位机直连
  - 颜色/样式通过 `classDef` 与 `linkStyle` 定义（USB 蓝色、信号绿色、高压红色、虚线框灰色、接口浅灰、AC 橙色）
  - 采用 `<br/>` 分行，便于显示中文/英文双语标签
  - 可用 `~~~` 进行隐式连接微调层级

### 更新或新增系统图步骤
1) 修改或新增 Mermaid 字符串：
   - 复制现有 `rpaDiagram`，调整节点/连线/样式。保持 `graph LR` 和类定义一致，以便颜色规范。
2) 渲染：
   - 将字符串传入 `<MermaidChart chartCode={yourCode} />`。
   - 若需多处复用，可将字符串提取到独立模块并在不同页面/组件引入。
3) 调试提示：
   - 渲染失败时组件会显示 “Mermaid 渲染失败” 提示，同时在控制台输出错误。
   - 需要正交线条时，可在 `%%{init: { "flowchart": { "curve": "stepAfter" }}}%%` 内设置 `curve` 或通过 `linkStyle` 控制线宽/颜色。

## 目录速览
- `src/App.tsx`：主界面，包含系统图面板和业务模块（需求、接口、BOM 等）。
- `src/App.css`：页面样式，包含系统图面板的样式定义。
- `src/components/MermaidChart.tsx`：通用 Mermaid 渲染组件。
