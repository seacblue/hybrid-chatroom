const WebSocket = require('ws');
const http = require('http');
const path = require('path');
const fs = require('fs');

// 创建HTTP服务器（用于提供静态文件）
const server = http.createServer((req, res) => {
    // 允许跨域
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    
    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }
    
    // 提供前端静态文件
    let filePath = path.join(__dirname, '..', 'frontend', req.url === '/' ? 'index.html' : req.url);
    
    // 检查文件是否存在
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404);
            res.end();
            return;
        }
        
        // 确定文件类型
        const extname = path.extname(filePath);
        let contentType = 'text/html';
        
        switch (extname) {
            case '.js':
                contentType = 'text/javascript';
                break;
            case '.css':
                contentType = 'text/css';
                break;
            case '.json':
                contentType = 'application/json';
                break;
            case '.png':
                contentType = 'image/png';
                break;
            case '.jpg':
                contentType = 'image/jpg';
                break;
            case '.gif':
                contentType = 'image/gif';
                break;
            case '.svg':
                contentType = 'image/svg+xml';
                break;
        }
        
        // 读取并返回文件
        fs.readFile(filePath, (err, content) => {
            if (err) {
                res.writeHead(500);
                res.end(`服务器错误: ${err.code}`);
                return;
            }
            
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        });
    });
});

// 创建WebSocket服务器，添加CORS配置
const wss = new WebSocket.Server({ 
    server,
    // 配置WebSocket CORS
    verifyClient: (info, done) => {
        // 允许所有来源的WebSocket连接
        console.log('WebSocket连接请求来自:', info.origin);
        done(true);
    }
});

// 客户端连接列表 (WebSocket -> 用户信息)
const clients = new Map();

// 聊天历史记录
const chatHistory = [];
const MAX_HISTORY = 100;

// 在线用户信息 (用户ID -> { lastActive: timestamp })
const onlineUsers = new Map();

// 保存聊天记录到文件
function saveHistory() {
    const historyPath = path.join(__dirname, 'chat_history.json');
    fs.writeFileSync(historyPath, JSON.stringify(chatHistory, null, 2));
}

// 从文件加载聊天记录
function loadHistory() {
    const historyPath = path.join(__dirname, 'chat_history.json');
    try {
        if (fs.existsSync(historyPath)) {
            const data = fs.readFileSync(historyPath, 'utf8');
            const history = JSON.parse(data);
            chatHistory.push(...history);
            // 只保留最近的MAX_HISTORY条记录
            if (chatHistory.length > MAX_HISTORY) {
                chatHistory.splice(0, chatHistory.length - MAX_HISTORY);
            }
        }
    } catch (error) {
        console.error('加载聊天记录失败:', error);
    }
}

// 广播消息给所有客户端
function broadcast(message) {
    for (const client of clients) {
        if (client[0].readyState === WebSocket.OPEN) {
            client[0].send(JSON.stringify(message));
        }
    }
}

// 广播在线用户信息
function broadcastOnlineUsers() {
    // 构建在线用户列表
    const onlineUsersList = [];
    for (const [userId, info] of onlineUsers) {
        onlineUsersList.push({
            userId: userId,
            lastActive: info.lastActive
        });
    }
    
    // 发送在线用户信息
    const onlineMessage = {
        type: 'onlineUsers',
        count: onlineUsersList.length,
        users: onlineUsersList,
        timestamp: new Date().toISOString()
    };
    
    broadcast(onlineMessage);
}

// 处理新连接
wss.on('connection', (ws) => {
    console.log('新客户端连接');
    
    // 添加到客户端列表，初始用户ID为null
    clients.set(ws, null);
    
    // 发送历史消息给新客户端
    ws.send(JSON.stringify({
        type: 'history',
        content: chatHistory
    }));
    
    // 立即发送当前在线用户信息给新客户端
    const onlineUsersList = [];
    for (const [userId, info] of onlineUsers) {
        onlineUsersList.push({
            userId: userId,
            lastActive: info.lastActive
        });
    }
    
    const onlineMessage = {
        type: 'onlineUsers',
        count: onlineUsersList.length,
        users: onlineUsersList,
        timestamp: new Date().toISOString()
    };
    
    ws.send(JSON.stringify(onlineMessage));
    
    // 处理收到的消息
    ws.on('message', (message) => {
        try {
            const parsedMessage = JSON.parse(message);
            console.log('收到消息:', parsedMessage);
            
            // 处理ping消息，返回pong消息
            if (parsedMessage.type === 'ping') {
                const pongMessage = {
                    type: 'pong',
                    timestamp: parsedMessage.timestamp
                };
                ws.send(JSON.stringify(pongMessage));
                return;
            }
            
            // 处理历史消息请求
            if (parsedMessage.type === 'history_request') {
                // 发送历史消息给请求客户端
                ws.send(JSON.stringify({
                    type: 'history',
                    content: chatHistory
                }));
                return;
            }
            
            // 处理用户加入消息，关联用户ID和WebSocket连接
            if (parsedMessage.type === 'system' && parsedMessage.content.includes('加入了聊天室')) {
                // 提取用户名
                const userId = parsedMessage.sender;
                clients.set(ws, userId);
                // 更新在线用户列表
                onlineUsers.set(userId, { lastActive: parsedMessage.timestamp });
                // 广播在线用户更新消息
            broadcastOnlineUsers();
            } 
            // 处理普通消息，更新用户最后活跃时间
            else if (parsedMessage.type !== 'recall') {
                const userId = parsedMessage.sender;
                if (userId) {
                    onlineUsers.set(userId, { lastActive: parsedMessage.timestamp });
                    // 广播在线用户更新消息
                    broadcastOnlineUsers();
                }
            }
            
            // 处理消息撤回
            if (parsedMessage.type === 'recall') {
                // 从聊天历史中移除被撤回的消息
                const index = chatHistory.findIndex(m => m.timestamp === parsedMessage.recallId);
                if (index !== -1) {
                    chatHistory.splice(index, 1);
                    // 保存更新后的历史记录
                    saveHistory();
                }
            } else if (parsedMessage.type === 'reaction') {
                // 处理emoji反应消息
                // 查找目标消息
                const targetIndex = chatHistory.findIndex(m => m.timestamp === parsedMessage.targetId);
                if (targetIndex !== -1) {
                    const targetMessage = chatHistory[targetIndex];
                    // 初始化reactions数组（如果不存在）
                    if (!targetMessage.reactions) {
                        targetMessage.reactions = [];
                    }
                    
                    // 查找是否已经有该emoji的反应
                    const reactionIndex = targetMessage.reactions.findIndex(r => r.emoji === parsedMessage.emoji);
                    
                    if (reactionIndex !== -1) {
                        // 查找当前用户是否已经添加了该反应
                        const userIndex = targetMessage.reactions[reactionIndex].users.indexOf(parsedMessage.sender);
                        
                        if (userIndex !== -1) {
                            // 取消反应：移除用户
                            targetMessage.reactions[reactionIndex].users.splice(userIndex, 1);
                            
                            // 如果该emoji没有用户了，移除整个反应
                            if (targetMessage.reactions[reactionIndex].users.length === 0) {
                                targetMessage.reactions.splice(reactionIndex, 1);
                            }
                        } else {
                            targetMessage.reactions[reactionIndex].users.push(parsedMessage.sender);
                        }
                    } else {
                        // 新的emoji反应
                        targetMessage.reactions.push({
                            emoji: parsedMessage.emoji,
                            users: [parsedMessage.sender]
                        });
                    }
                    
                    saveHistory();
                }
            } else {
                // 添加到聊天历史
                chatHistory.push(parsedMessage);
                if (chatHistory.length > MAX_HISTORY) {
                    chatHistory.shift();
                    }
                // 保存历史记录
                saveHistory();
            }
            
            broadcast(parsedMessage);
        } catch (error) {
            console.error('消息处理错误:', error);
        }
    });
    
    // 处理连接关闭
    ws.on('close', () => {
        console.log('客户端断开连接');
        // 获取断开连接的用户ID
        const userId = clients.get(ws);
        if (userId) {
            // 发送用户离开系统消息
            const leaveMessage = {
                type: 'system',
                sender: userId,
                content: `${userId} 退出了聊天室`,
                timestamp: new Date().toISOString()
            };
            // 添加到聊天历史
            chatHistory.push(leaveMessage);
            if (chatHistory.length > MAX_HISTORY) {
                chatHistory.shift();
            }
            // 保存历史记录
            saveHistory();
            // 广播消息给所有客户端
            broadcast(leaveMessage);
            
            // 从在线用户列表中移除
            onlineUsers.delete(userId);
            // 广播在线用户更新消息
            broadcastOnlineUsers();
        }
        // 从客户端列表中移除
        clients.delete(ws);
    });
    
    // 处理错误
    ws.on('error', (error) => {
        console.error('WebSocket错误:', error);
        // 获取出错的用户ID
        const userId = clients.get(ws);
        if (userId) {
            // 发送用户离开系统消息
            const leaveMessage = {
                type: 'system',
                sender: userId,
                content: `${userId} 退出了聊天室`,
                timestamp: new Date().toISOString()
            };
            // 添加到聊天历史
            chatHistory.push(leaveMessage);
            if (chatHistory.length > MAX_HISTORY) {
                chatHistory.shift();
            }
            // 保存历史记录
            saveHistory();
            // 广播消息给所有客户端
            broadcast(leaveMessage);
            
            // 从在线用户列表中移除
            onlineUsers.delete(userId);
            // 广播在线用户更新消息
            broadcastOnlineUsers();
        }
        // 从客户端列表中移除
        clients.delete(ws);
    });
});

// 加载历史记录
loadHistory();

// 启动服务器
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在 http://localhost:${PORT}`);
    console.log(`WebSocket服务运行在 ws://localhost:${PORT}`);
});

// 处理进程终止，保存历史记录
process.on('SIGINT', () => {
    saveHistory();
    console.log('\n服务器已关闭，聊天记录已保存');
    process.exit(0);
});

process.on('SIGTERM', () => {
    saveHistory();
    console.log('\n服务器已关闭，聊天记录已保存');
    process.exit(0);
});