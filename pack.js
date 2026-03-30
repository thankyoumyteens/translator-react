import fs from 'fs';
import archiver from 'archiver';

// 1. 生成带时间戳的文件名
const now = new Date();
const pad = (n) => String(n).padStart(2, '0');
const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
const outputFileName = `translator_web_release_${timestamp}.zip`;

// 2. 创建文件输出流
const output = fs.createWriteStream(outputFileName);
const archive = archiver('zip', {
    zlib: {level: 9} // 设置最高压缩级别
});

// 3. 监听完成事件
output.on('close', () => {
    const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
    console.log(`\n🎉 打包彻底完成！`);
    console.log(`📦 生成文件: ${outputFileName} (${sizeMB} MB)`);
    console.log(`👉 下一步: 请将此压缩包上传到云服务器并解压构建镜像。\n`);
});

archive.on('error', (err) => {
    console.error('❌ 打包过程中发生错误:', err);
    process.exit(1);
});

// 将压缩流与输出文件绑定
archive.pipe(output);

console.log("🚀 正在将部署文件加入压缩包...");

// 4. 将需要上云的文件加入压缩包
if (fs.existsSync('dist')) {
    archive.directory('dist/', 'dist');
    console.log('  ➕ 加入 -> dist/ 文件夹');
} else {
    console.error('❌ 找不到 dist 目录，请先执行 npm run build');
    process.exit(1);
}

if (fs.existsSync('Dockerfile')) {
    archive.file('Dockerfile', {name: 'Dockerfile'});
    console.log('  ➕ 加入 -> Dockerfile');
}

if (fs.existsSync('nginx.conf')) {
    archive.file('nginx.conf', {name: 'nginx.conf'});
    console.log('  ➕ 加入 -> nginx.conf');
}

// 5. 完成并生成文件
archive.finalize();