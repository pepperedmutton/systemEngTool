# 等离子体探针系统工程工作台

面向等离子体探针及其后端电路的定制化制造项目，使用 React + Node.js (Express) 构建统一的系统工程工作台。在设计阶段即可同步功能分解、物理分解、系统/子系统需求以及物料清单（BOM），让工程、工艺与采购团队共享同一份实时数据。

## 功能概览

- **功能/物理分解**：记录每支探针、偏压控制、后电路、结构件等的分解树，说明关键活动与约束。
- **系统/子系统需求**：统一存放客户验收指标、后电路性能约束、维护性要求等，并为每条需求指定验证方式、责任团队与优先级。
- **BOM 视图**：列出探针杆、线束、PCB 等关键物料、数量、供应商与备注，为采购/制造做准备。
- **中英混合数据支持**：后端 API 仍使用 REST/JSON，前端界面完整中文化，方便面向国内客户的沟通。
- **AI 驱动**：本工具被设计为由上层 AI/自动化系统写入、维护数据，人工用户仅进行浏览与复核。为保证轨迹一致性，前端未提供手动新增/删除项目的入口，API 仅建议由可信的 AI 代理或集成脚本调用。
- **实时同步**：前端每 5 秒轮询一次 `/projects`，任何 JSON 或脚本的改动都会即时同步；再配合 Vite dev server 热重载，开发体验接近“所见即所得”。

> **设计理念**  
> - 项目信息（分解、需求、BOM）由 AI 生成并同步，避免人工手改导致失真。  
> - 工程师的主要操作是查看、导出和复核，不手动输入。  
> - 如确需导入旧项目，应通过自动化脚本一次性写入 JSON 或调用 API。

## 目录结构

```
backend/        Node.js (Express)，负责数据模型与接口
frontend/       Vite + React (TypeScript) 客户端
notes/          仍保留 NASA Handbook 学习笔记，供参考
```

## 后端运行

```bash
cd backend
npm install
node server.js --host 127.0.0.1 --port 8001
```

前端使用 Vite dev server：

```bash
cd frontend
npm install
VITE_API_BASE_URL=http://127.0.0.1:8001 npm run dev -- --host 127.0.0.1 --port 5173
```

界面会自动轮询 `/projects`，无需手动刷新即可看到最新 JSON 更改。若需要局域网访问，可把后端 `--host` 改为 `0.0.0.0`，但浏览器仍需输入 `http://localhost:<端口>` 或实际 IP。
- JSON 数据默认保存在 `backend/data/projects.json`。可直接编辑或换成数据库。
- 常用接口：
  - `GET /projects`：列出所有项目（含分解、需求、BOM）。
  - `GET /projects/{id}`：查看单个项目。
  - `POST /projects/{id}/requirements`：新增需求（`scope` 字段区分系统/子系统）。
  - `PUT /projects/{id}/requirements/{req_id}`、`DELETE ...`：维护需求。
- **禁用手工操作**：不建议人工直接调用 `POST /projects` 等接口增删项目；这些接口只供 AI 管道或自动化脚本批量写入。若需人工调整，请更新源 JSON 并通过脚本整体刷新。

## 启动脚本（Windows PowerShell）

```
.\start.ps1                                # 启动 Node 后端 + Vite dev server
.\start.ps1 -Port 9000 -FrontendPort 5200  # 自定义后端/前端端口
.\start.ps1 -BindHost 0.0.0.0 -NoWait      # 对外开放并后台运行
```

## 部署（SSH，默认后端端口 3002）

在本地 PowerShell 运行（需 npm 可用，服务器需 Node/npm 环境）：
```powershell
powershell -ExecutionPolicy Bypass -File .\deploy_syseng.ps1 `
  -ServerHost <你的服务器IP> `
  -ServerUser root `
  -ApiPort 3002
# 如需密码自动化：添加 -SshPass "你的密码"（本机需安装 sshpass）
```
脚本流程：本地前端 build → 打包上传到 `/www/wwwroot/SysEng` → 服务器 npm 安装 backend 依赖 → pm2 以 3002 端口运行 Node 服务。

脚本会设置 `VITE_API_BASE_URL=http://<BindHost>:<Port>` 后依次启动后端（`node backend/server.js`）和前端 dev server（默认 `http://127.0.0.1:5173`）。退出时两个进程都会被清理。由于界面自带轮询，因此只需更新 `backend/data/projects.json` 或调用 API，页面将在 5 秒内自动刷新数据。

## 下一步可扩展方向

1. 将 JSON 存储替换为数据库，并接入登录/权限，细分客户项目访问。
2. 在需求上挂接验证/测试报告的附件或链接，实现全流程溯源。
3. 根据制造状态自动生成批次化 BOM 和工艺指令，进一步打通 ERP。
