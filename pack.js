import fs from 'fs';
import archiver from 'archiver';
import {execSync} from 'child_process';

// 1. 🧹 清理旧包函数
const cleanOldBuilds = () => {
    console.log("🧹 开始清理历史部署包...");
    const files = fs.readdirSync('.');
    let count = 0;

    files.forEach(file => {
        if (file.startsWith('translator_web_release_') && file.endsWith('.zip')) {
            try {
                fs.unlinkSync(file);
                console.log(`   🗑️ 已删除: ${file}`);
                count++;
            } catch (err) {
                console.error(`   ❌ 删除失败: ${file}`, err);
            }
        }
    });
    if (count === 0) console.log("   ✨ 目录很干净，没有发现旧包。\n");
    else console.log(`   ✅ 成功清理了 ${count} 个历史文件！\n`);
};

// 2. 🚀 核心构建与打包函数 (返回 Promise 以便串行执行)
const buildAndPack = (envName) => {
    return new Promise((resolve, reject) => {
        console.log(`\n=========================================`);
        console.log(`⚙️ 正在构建 [${envName}] 环境的前端代码...`);
        console.log(`=========================================`);

        try {
            // 💡 核心魔法：让 Vite 读取特定的 .env.[envName] 文件进行构建
            execSync(`npx tsc -b && npx vite build --mode ${envName}`, {stdio: 'inherit'});
        } catch (err) {
            console.error(`\n❌ 构建 [${envName}] 失败! 请检查代码是否有类型错误。`);
            return reject(err);
        }

        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const timestamp = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}`;
        const outputFileName = `translator_web_release_${envName}_${timestamp}.zip`;

        console.log(`\n📦 正在将 [${envName}] 产物压入 ${outputFileName}...`);

        const output = fs.createWriteStream(outputFileName);
        const archive = archiver('zip', {zlib: {level: 9}});

        output.on('close', () => {
            const sizeMB = (archive.pointer() / 1024 / 1024).toFixed(2);
            console.log(`✅ [${envName}] 打包彻底完成！(${sizeMB} MB)`);
            resolve();
        });

        archive.on('error', (err) => reject(err));
        archive.pipe(output);

        // 将构建好的 dist 和部署配置文件加入压缩包
        if (fs.existsSync('dist')) archive.directory('dist/', 'dist');
        if (fs.existsSync('Dockerfile')) archive.file('Dockerfile', {name: 'Dockerfile'});
        if (fs.existsSync('nginx.conf')) archive.file('nginx.conf', {name: 'nginx.conf'});

        archive.finalize();
    });
};

// 3. 🚦 自动化流水线编排
const runPipeline = async () => {
    cleanOldBuilds();
    try {
        // 串行执行，确保资源不冲突
        await buildAndPack('gemini');
        await buildAndPack('siliconflow');

        console.log(`\n🎉🎉 前端所有环境部署包已彻底打包完毕！请检查项目根目录。`);
    } catch (error) {
        console.error('\n🛑 打包流水线中断。', error);
        process.exit(1);
    }
};

runPipeline();