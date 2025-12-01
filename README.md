# Hybrid聊天应用

一个基于WebSocket的跨平台聊天应用，支持Web端和移动端（Android）。

## 项目功能

### 基础功能
- 用户身份认证（ID输入）
- 实时消息发送与接收
- 聊天记录显示
- 支持文本消息

### 进阶功能
- 音频录制与发送
- 视频录制与发送
- 文件上传与下载
- 聊天记录持久化存储
- 多客户端群聊
- 历史消息加载
- @提及功能
- 消息反应（Emoji）
- 消息撤回
- 在线用户显示
- 网络延迟检测

### 移动端功能
- WebView集成
- 原生方法调用（获取设备信息、权限检查）
- 音频/视频权限管理

## 技术栈

### 前端

- HTML5
- CSS3 (Flexbox, Grid, 响应式设计)
- JavaScript (ES6+)
- WebSocket API
- MediaRecorder API (音频/视频录制)

### 后端

- Node.js
- ws (WebSocket库)
- fs (文件系统)
- http (HTTP服务器)

### 移动端

- Android Studio
- Java
- WebView
- Android SDK

## 快速开始

### 1. 启动后端服务器

```bash
cd backend
npm install
npm start
```

服务器将运行在 `http://localhost:3000`，WebSocket服务运行在 `ws://localhost:3000`。

### 2. 运行Android App

1. 使用Android Studio打开项目根目录
2. 连接Android设备或启动模拟器
3. 点击运行按钮构建并安装应用
4. 应用将自动加载嵌入在assets目录中的前端页面

## 使用说明

### Web端
1. 输入用户ID，点击"进入聊天室"
2. 在输入框中输入消息，按回车键或点击"发送"按钮发送
3. 点击功能按钮可以发送音频、视频或文件
4. 聊天记录会自动保存到本地存储

### 移动端
1. 打开应用后，自动加载聊天界面
2. 功能与Web端相同
3. 应用会请求必要的权限（摄像头、麦克风、存储）
4. 可以通过JavaScript调用原生方法控制WebView

## 浏览器兼容性

- Chrome 60+
- Firefox 55+
- Safari 11+
- Edge 79+
