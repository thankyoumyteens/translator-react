# AI Translator Frontend (React + Vite)

这是一个基于 **React** 和 **Vite** 构建的高性能 AI 翻译器前端项目。
拥有极速的冷启动体验、响应式布局、优雅的磨砂玻璃 UI 设计，并完美对接了后端的语义缓存和历史记录功能。生产环境采用极轻量级的 *
*Nginx + Docker** 方案进行纯静态托管。

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

Vite 框架在打包时，会将环境变量“硬编码”烧录进静态 HTML/JS 文件中。因此，针对线上环境必须通过特定的 `.env.production`
文件进行配置。

### 第一步：配置生产环境变量

在项目根目录新建（或修改） `.env.production` 文件：

```ini
# 线上部署时调用的后端公网地址
VITE_API_BASE_URL=http://你的云服务器公网IP:7152
```

*(💡 Vite 在执行 `npm run build` 时，会自动读取 `.env.production`
里的值来替换代码中的 `import.meta.env.VITE_API_BASE_URL`)*

### 第二步：一键构建与打包 (Local)

确保你的 Node 版本正确（如 `nvm use v22.22.2`）。在本地终端运行打包命令，它会自动执行 Vite 构建，并将产物打包为干净的 `.zip`
文件：

```bash
npm run pack:zip
```

*(执行完毕后，项目根目录会生成类似 `translator_web_release_20260330.zip` 的压缩包，内部仅包含部署所需的 `dist`
产物、`Dockerfile` 及 Nginx 配置)*

### 第三步：清理旧环境与上传解压 (Server)

登录云服务器，进入你的前端部署目录（例如：`/app/translator-web`）。在上传新包之前，**必须先清理旧的容器和文件**，防止缓存或文件冲突：

```shell
# 1. 强制停止并删除正在运行的旧容器
docker rm -f translator-react

# 2. 清理旧的部署文件和旧的压缩包
rm -rf dist Dockerfile nginx.conf translator_web_release_*.zip

# 3. 此时将本地刚打包好的新 .zip 文件上传到此目录

# 4. 解压新上传的包
unzip translator_web_release_*.zip
```

### 第四步：构建与运行 Docker 容器

在服务器解压后的目录下，依次执行以下命令：

```shell
# 1. 构建最新的前端 Nginx 镜像
docker build -t translator-web .

# 2. 启动前端容器，并映射到宿主机的 7151 端口
docker run -d \
  --name translator-react \
  -p 7151:80 \
  --restart unless-stopped \
  translator-web
```

### 🎉 验证上线

打开浏览器，访问 `http://你的云服务器公网IP:7151`，即可体验丝滑的线上版本！如果你在部署后发现页面还是旧的，请在浏览器中按
`Ctrl + F5` (Windows) 或 `Cmd + Shift + R` (Mac) 强制刷新缓存。

