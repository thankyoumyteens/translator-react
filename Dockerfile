# 使用官方轻量级的 Nginx 镜像
FROM nginx:alpine

# 将本地打包好的 dist 目录下的静态文件，复制到 Nginx 的默认发布目录
COPY dist /usr/share/nginx/html

# 暴露 80 端口（HTTP 默认端口）
EXPOSE 80

# 启动 Nginx
CMD ["nginx", "-g", "daemon off;"]