// WebSocket连接管理类
class WebSocketManager {
    constructor(chatApp) {
        this.chatApp = chatApp;
        this.ws = null;
        this.isConnected = false;
        this.pingInterval = null;
        this.networkLatency = 0;
    }
    
    // 连接WebSocket服务器
    connect() {
        // 先确保之前的连接已经关闭
        if (this.ws) {
            this.ws.close();
            this.ws = null;
        }
        
        try {
            // 打印当前URL和协议，用于调试
            console.log('当前URL:', window.location.href);
            console.log('当前协议:', window.location.protocol);
            console.log('当前主机:', window.location.host);
            
            // 智能选择WebSocket URL
            let wsUrl;
            
            // 1. 检测是否在Android模拟器中运行
            // 对于file:///协议（本地文件），尝试不同的WebSocket URL
            if (window.location.protocol === 'file:') {
                console.log('检测到本地文件协议，使用智能WebSocket URL选择');
                
                // 尝试顺序：
                // 1. ws://10.0.2.2:3000 (Android模拟器访问主机localhost)
                // 2. ws://localhost:3000 (本地开发)
                // 3. ws://192.168.1.100:3000 (典型的本地网络IP)
                
                // 首先尝试Android模拟器的特殊IP
                wsUrl = 'ws://10.0.2.2:3000';
                console.log('正在连接Android模拟器WebSocket服务器...');
            } else {
                // 2. 对于http://或https://协议，使用相同的主机和端口
                const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
                const host = window.location.host;
                wsUrl = `${protocol}//${host}`;
                console.log('正在连接相同主机的WebSocket服务器...');
            }
            
            console.log('WebSocket URL:', wsUrl);
            // 连接到WebSocket服务器
            this.ws = new WebSocket(wsUrl);
            
            this.ws.onopen = () => {
                console.log('WebSocket连接成功!');
                this.isConnected = true;
                this.chatApp.updateConnectionStatus(true);
                // 发送用户加入消息
                if (this.chatApp.userId) {
                    this.chatApp.sendSystemMessage(`${this.chatApp.userId} 加入了聊天室`);
                }
            };
            
            this.ws.onmessage = (event) => {
                try {
                    const message = JSON.parse(event.data);
                    console.log('收到消息:', message);
                    this.chatApp.handleMessage(message);
                } catch (error) {
                    console.error('解析WebSocket消息失败:', error);
                }
            };
            
            this.ws.onclose = (event) => {
                console.log('WebSocket连接关闭:', event.code, event.reason);
                this.isConnected = false;
                this.chatApp.updateConnectionStatus(false);
                
                // 只有异常关闭才重新连接
                // 关闭码1000: 正常关闭
                // 关闭码1005: 没有状态码的关闭（通常是正常关闭）
                if (event.code !== 1000 && event.code !== 1005) {
                    // 尝试重新连接
                    console.log('3秒后尝试重新连接...');
                    setTimeout(() => this.connect(), 3000);
                } else {
                    console.log('WebSocket正常关闭，不重新连接');
                }
            };
            
            this.ws.onerror = (error) => {
                console.error('WebSocket连接错误:', error);
                this.isConnected = false;
                this.chatApp.updateConnectionStatus(false);
            };
        } catch (error) {
            console.error('WebSocket连接异常:', error);
            this.isConnected = false;
            this.chatApp.updateConnectionStatus(false);
            setTimeout(() => this.connect(), 3000);
        }
    }
    
    // 关闭WebSocket连接
    close() {
        if (this.ws) {
            this.ws.close();
        }
    }
    
    // 发送消息
    send(message) {
        if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify(message));
        }
    }
    
    // 开始定期检测网络延迟
    startPingInterval() {
        // 清除之前的定时器
        this.stopPingInterval();
        
        // 每10秒检测一次网络延迟
        this.pingInterval = setInterval(() => {
            this.pingServer();
        }, 10000);
        
        // 立即检测一次
        this.pingServer();
    }
    
    // 停止定期检测网络延迟
    stopPingInterval() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
    }
    
    // 检测网络延迟
    pingServer() {
        if (!this.isConnected || !this.ws) return;
        
        const startTime = Date.now();
        
        // 使用WebSocket的ping/pong机制检测延迟
        this.ws.send(JSON.stringify({ type: 'ping', timestamp: startTime }));
        
        // 监听pong响应
        const handlePong = (event) => {
            try {
                const message = JSON.parse(event.data);
                if (message.type === 'pong' && message.timestamp === startTime) {
                    this.networkLatency = Date.now() - startTime;
                    // 如果延迟信息可见，更新显示
                    if (this.chatApp.isLatencyVisible) {
                        this.chatApp.updateLatencyInfo();
                    }
                    // 移除事件监听器
                    this.ws.removeEventListener('message', handlePong);
                }
            } catch (error) {
                // 忽略无效消息
            }
        };
        
        this.ws.addEventListener('message', handlePong);
        
        // 5秒后如果没有收到响应，移除事件监听器
        setTimeout(() => {
            this.ws.removeEventListener('message', handlePong);
        }, 5000);
    }
    
    // 获取WebSocket状态的文本描述
    getReadyStateText(state) {
        switch (state) {
            case WebSocket.CONNECTING:
                return 'CONNECTING (0)';
            case WebSocket.OPEN:
                return 'OPEN (1)';
            case WebSocket.CLOSING:
                return 'CLOSING (2)';
            case WebSocket.CLOSED:
                return 'CLOSED (3)';
            default:
                return `UNKNOWN (${state})`;
        }
    }
}
