import {StrictMode} from 'react'
import {createRoot} from 'react-dom/client'
import './index.css'
import App from './App.tsx'

// 🚀 监听 Vite 按需加载模块失败的事件 (通常是因为后端刚发版部署)
window.addEventListener('vite:preloadError', (event) => {
    console.warn('检测到系统版本更新，正在自动刷新页面加载最新资源...');
    // 阻止默认报错
    event.preventDefault();
    // 强制从服务器重新加载页面
    window.location.reload();
});

createRoot(document.getElementById('root')!).render(
    <StrictMode>
        <App/>
    </StrictMode>,
)
