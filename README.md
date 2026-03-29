# AI Translator Frontend (React + Vite)

这是一个基于 **React** 和 **Vite** 构建的高性能 AI 翻译器前端项目。
拥有极速的冷启动体验、响应式布局、优雅的磨砂玻璃 UI 设计，并完美对接了后端的语义缓存和历史记录功能。生产环境采用极轻量级的 **Nginx + Docker** 方案进行纯静态托管。

## 🛠 技术栈

* **核心框架:** React + TypeScript
* **构建工具:** Vite
* **网络请求:** Axios (支持统一拦截与环境变量按需注入)
* **生产部署:** Nginx (Alpine) + Docker

---

## 💻 本地开发指南

### 1. 安装依赖
确保本地已安装 Node.js (推荐 v22+)，在项目根目录执行：
```bash
npm install
```

### 2. 配置本地环境变量
在项目根目录新建 `.env` 文件，配置本地后端服务的访问地址：
```ini
# 本地开发时调用的后端地址 (Vite 规定必须以 VITE_ 开头)
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### 3. 启动开发服务器
```bash
npm run dev
```
启动后，Vite 会在终端输出本地访问地址（通常为 `http://localhost:5173`）。

---

## 🚀 生产环境打包与部署

Vite 框架在打包时，会将环境变量“硬编码”烧录进静态 HTML/JS 文件中。因此，针对线上环境必须通过特定的 `.env.production` 文件进行配置。

### 第一步：配置生产环境变量
在项目根目录新建（或修改） `.env.production` 文件：
```ini
# 线上部署时调用的后端公网地址
VITE_API_BASE_URL=http://你的云服务器公网IP:7152
```
*(💡 Vite 在执行 `npm run build` 时，会自动读取 `.env.production` 里的值来替换代码中的 `import.meta.env.VITE_API_BASE_URL`)*

### 第二步：执行生产环境构建
在本地终端执行打包命令：
```bash
npm run build
```
执行完毕后，项目根目录下会生成一个包含所有压缩、混淆后静态文件的 **`dist`** 文件夹。

### 第三步：上传文件至服务器
把刚刚生成的 **`dist` 文件夹** 和项目根目录下的 **`Dockerfile`**（内含 Nginx 配置）上传到云服务器上的一个新目录里（例如：`/app/translator-web`）。

### 第四步：构建与运行 Docker 容器
登录云服务器，进入刚才上传文件的目录，依次执行以下命令：

```shell
# 1. 构建前端 Nginx 镜像
docker build -t translator-web .

# 2. 启动前端容器，并映射到宿主机的 7151 端口
docker run -d \
  --name translator-react \
  -p 7151:80 \
  --restart unless-stopped \
  translator-web
```

### 🎉 验证上线
打开浏览器，访问 `http://你的云服务器公网IP:7151`，即可体验丝滑的线上版本！
