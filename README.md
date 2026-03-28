新建 .env.production (用于生产打包环境)。Vite 在执行 npm run build 时，会自动读取 .env.production 里的值。

```shell
# 线上部署时调用的后端公网地址
VITE_API_BASE_URL=http://你的云服务器公网IP:端口
```

打包

```shell
npm run build
```

执行完毕后，项目根目录下会生成一个包含所有静态文件的 dist 文件夹。

把刚才生成的 dist 文件夹 和 Dockerfile 上传到云服务器的一个新目录里（比如 /app/translator-web）。

在服务器的该目录下，依次执行：

```shell
docker build -t translator-web .

docker run -d \
  --name translator-react \
  -p 80:80 \
  --restart unless-stopped \
  translator-web
```