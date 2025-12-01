// 聊天应用主类
class ChatApp {
    constructor() {
        this.userId = null;
        this.isConnected = false;
        this.messages = [];
        
        // DOM元素
        this.userSetup = document.getElementById('userSetup');
        this.chatMain = document.getElementById('chatMain');
        this.userIdInput = document.getElementById('userIdInput');
        this.enterChatBtn = document.getElementById('enterChatBtn');
        this.exitChatBtn = document.getElementById('exitChatBtn');
        this.currentUserId = document.getElementById('currentUserId');
        this.chatMessages = document.getElementById('chatMessages');
        this.messageInput = document.getElementById('messageInput');
        this.sendBtn = document.getElementById('sendBtn');
        this.fileBtn = document.getElementById('fileBtn');
        this.onlineCount = document.getElementById('onlineCount');
        
        // 用户进入时间
        this.enterTime = null;
        
        // 在线用户相关
        this.onlineUsers = [];
        
        // 艾特功能相关
        this.mentionManager = null;
        
        // 初始化各个管理器
        this.wsManager = new WebSocketManager(this);
        this.messageManager = new MessageManager(this);
        this.uiManager = new UIManager(this);
        
        // 初始化事件监听
        this.initEventListeners();
        
        // 应用启动后立即连接到后端服务器
        this.wsManager.connect();
    }
    
    // 初始化事件监听
    initEventListeners() {
        // 进入聊天室按钮
        this.enterChatBtn.addEventListener('click', () => this.enterChat());
        
        // 退出聊天室按钮
        this.exitChatBtn.addEventListener('click', () => this.exitChat());
        
        // 发送消息按钮
        this.sendBtn.addEventListener('click', () => this.messageManager.sendMessage());
        
        this.messageInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                this.messageManager.sendMessage();
            }
        });
        
        // 文件按钮
        this.fileBtn.addEventListener('click', () => this.messageManager.sendFile());
        
        // 在线人数显示点击事件
        this.onlineCount.addEventListener('click', () => this.uiManager.toggleOnlineUserList());
        
        // 连接状态点击事件，显示/隐藏网络延迟
        this.uiManager.connectionStatus.addEventListener('click', () => this.uiManager.toggleLatencyInfo());
        
        // 用户ID输入框回车
        this.userIdInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.enterChat();
            }
        });
        
        // 点击页面其他区域关闭在线用户列表和右键菜单
        document.addEventListener('click', (e) => {
            if (this.uiManager.isUserListVisible && !this.onlineCount.contains(e.target) && !this.uiManager.onlineUserList?.contains(e.target)) {
                this.uiManager.hideOnlineUserList();
            }
            // 关闭右键菜单
            this.uiManager.hideContextMenu();
            // 关闭艾特下拉列表
            if (this.mentionManager) {
                this.mentionManager.hideMentionDropdown();
            }
        });
    }
    
    // 进入聊天室
    enterChat() {
        const userId = this.userIdInput.value.trim();
        if (!userId) {
            alert('请输入有效的用户ID');
            return;
        }
        
        // 检查用户ID是否包含空格
        if (userId.includes(' ')) {
            alert('用户ID不能包含空格');
            return;
        }
        
        this.userId = userId;
        localStorage.setItem('chatUserId', userId);
        
        // 记录用户进入时间
        this.enterTime = new Date().toISOString();
        
        // 显示聊天主界面
        this.userSetup.style.display = 'none';
        this.chatMain.style.display = 'flex';
        
        // 初始化艾特管理器
        this.mentionManager = new MentionManager(this);
        
        // 连接WebSocket服务器
        this.wsManager.connect();
        
        // 加载聊天记录
        this.messageManager.loadChatHistory();
    }
    
    // 退出聊天室
    exitChat() {
        // 关闭WebSocket连接
        this.wsManager.close();
        
        // 清除用户ID
        this.userId = null;
        localStorage.removeItem('chatUserId');
        
        // 显示用户设置界面
        this.chatMain.style.display = 'none';
        this.userSetup.style.display = 'flex';
        this.userIdInput.value = '';
        
        // 清空聊天记录
        this.messages = [];
        this.chatMessages.innerHTML = '';
    }
    
    // 处理接收到的消息
    handleMessage(message) {
        // 过滤掉ping/pong类型的消息，不显示
        if (message.type === 'ping' || message.type === 'pong') {
            return;
        }
        
        // 处理在线用户信息
        if (message.type === 'onlineUsers') {
            this.updateOnlineUsers(message);
            return;
        }
        
        // 处理emoji反应消息
        if (message.type === 'reaction') {
            // 请求服务器发送最新的消息历史，因为服务器已经更新了目标消息的反应
            this.wsManager.send({ type: 'history_request' });
            return;
        }
        
        // 处理历史消息
        if (message.type === 'history') {
            // 只添加用户进入后的历史消息
            const enterTime = new Date(this.enterTime);
            const newMessages = [];
            
            message.content.forEach(historyMsg => {
                const msgTime = new Date(historyMsg.timestamp);
                if (msgTime >= enterTime) {
                    newMessages.push(historyMsg);
                }
            });
            
            // 检查是否是更新反应的情况
            const isReactionUpdate = this.messages.length > 0 && newMessages.length === this.messages.length;
            
            if (isReactionUpdate) {
                // 只更新有变化的消息的反应
                newMessages.forEach(newMsg => {
                    const oldMsg = this.messages.find(m => m.timestamp === newMsg.timestamp);
                    if (oldMsg) {
                        // 更新本地消息的反应
                        oldMsg.reactions = newMsg.reactions;
                        
                        // 找到对应的DOM元素并更新反应
                        const messageElement = document.querySelector(`[data-timestamp="${newMsg.timestamp}"]`);
                        if (messageElement) {
                            this.messageManager.renderReactions(messageElement, newMsg);
                        }
                    }
                });
            } else {
                // 正常加载历史消息
                this.messages = [];
                this.chatMessages.innerHTML = '';
                
                newMessages.forEach(historyMsg => {
                    this.messages.push(historyMsg);
                    this.messageManager.displayMessage(historyMsg);
                });
                
                // 滚动到底部
                this.uiManager.scrollToBottom();
            }
            return;
        }
        
        // 检查消息是否在用户进入后发送
        const messageTime = new Date(message.timestamp);
        const enterTime = new Date(this.enterTime);
        
        // 只处理用户进入后的消息
        if (messageTime >= enterTime || message.type === 'recall') {
            // 处理消息撤回
            if (message.type === 'recall') {
                // 从消息列表中移除被撤回的消息
                const index = this.messages.findIndex(m => m.timestamp === message.recallId);
                if (index !== -1) {
                    this.messages.splice(index, 1);
                    
                    // 从DOM中移除被撤回的消息
                    const messageElement = document.querySelector(`[data-timestamp="${message.recallId}"]`);
                    if (messageElement) {
                        messageElement.remove();
                    }
                }
                
                // 显示撤回通知消息
                this.messages.push(message);
                this.messageManager.displayMessage(message);
                this.uiManager.scrollToBottom();
            } else {
                // 添加到消息列表
                this.messages.push(message);
                
                // 保存到本地存储
                this.messageManager.saveChatHistory();
                
                // 显示消息
                this.messageManager.displayMessage(message);
                
                // 滚动到底部
                this.uiManager.scrollToBottom();
            }
        }
    }
    
    // 更新在线用户信息
    updateOnlineUsers(message) {
        this.onlineUsers = message.users;
        // 更新在线人数显示
        this.onlineCount.textContent = `${message.count}人在线`;
        
        // 如果用户列表当前可见，更新列表内容
        if (this.uiManager.isUserListVisible) {
            this.uiManager.updateOnlineUserList();
        }
        if (this.mentionManager) {
            this.mentionManager.onOnlineUsersChange();
        }
    }
    
    // 从服务器重新加载聊天历史
    loadChatHistoryFromServer() {
        if (!this.isConnected) return;
        
        // 请求服务器发送最新的历史消息
        this.wsManager.send({ type: 'history_request' });
    }

    updateConnectionStatus(isConnected) {
        this.isConnected = isConnected;
        this.uiManager.updateConnectionStatus(isConnected);
    }
    sendSystemMessage(content) {
        this.messageManager.sendSystemMessage(content);
    }
    recallMessage(timestamp) {
        this.messageManager.recallMessage(timestamp);
    }
    addReaction(targetId, emoji) {
        this.messageManager.addReaction(targetId, emoji);
    }
    showContextMenu(e, message) {
        this.uiManager.showContextMenu(e, message);
    }
    scrollToBottom() {
        this.uiManager.scrollToBottom();
    }
}

let chatApp;
document.addEventListener('DOMContentLoaded', () => {
    chatApp = new ChatApp();
});
