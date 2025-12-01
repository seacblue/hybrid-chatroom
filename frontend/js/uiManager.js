// UI管理类
class UIManager {
    constructor(chatApp) {
        this.chatApp = chatApp;
        
        // 连接状态相关
        this.connectionStatus = null;
        this.statusIndicator = null;
        this.statusText = null;
        this.latencyInfo = null;
        this.isLatencyVisible = false;
        
        // 在线用户相关
        this.onlineUserList = null;
        this.isUserListVisible = false;
        
        // 右键菜单相关
        this.contextMenu = null;
        this.currentMessage = null;
        
        // 初始化UI元素
        this.initUIElements();
    }
    
    // 初始化UI元素
    initUIElements() {
        // 连接状态相关
        this.connectionStatus = document.getElementById('connectionStatus');
        
        // 在线用户相关
        this.onlineCount = document.getElementById('onlineCount');
    }
    
    // 更新连接状态显示
    updateConnectionStatus(isConnected) {
        // 确保DOM元素存在
        if (!this.connectionStatus) {
            this.connectionStatus = document.getElementById('connectionStatus');
        }
        
        if (!this.statusIndicator) {
            this.statusIndicator = this.connectionStatus?.querySelector('.status-indicator');
        }
        
        if (!this.statusText) {
            this.statusText = this.connectionStatus?.querySelector('.status-text');
        }
        
        // 只有当DOM元素都存在时才更新状态
        if (this.statusIndicator && this.statusText) {
            if (isConnected) {
                this.statusIndicator.className = 'status-indicator online';
                this.statusText.textContent = '已连接';
                // 开始定期检测网络延迟
                this.chatApp.wsManager.startPingInterval();
            } else {
                this.statusIndicator.className = 'status-indicator offline';
                this.statusText.textContent = '未连接';
                // 停止定期检测网络延迟
                this.chatApp.wsManager.stopPingInterval();
            }
        }
    }
    
    // 创建网络延迟信息元素
    createLatencyInfo() {
        this.latencyInfo = document.createElement('div');
        this.latencyInfo.className = 'latency-info';
        this.latencyInfo.style.cssText = `
            position: absolute;
            top: 100%;
            background: white;
            color: #4a5568;
            padding: 0.5rem 1rem;
            border-radius: 8px;
            font-size: 0.8rem;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            margin-top: 0.25rem;
            z-index: 1000;
            white-space: nowrap;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease;
        `;
        
        // 将延迟信息添加到连接状态元素的父容器中
        this.connectionStatus.parentElement.style.position = 'relative';
        this.connectionStatus.parentElement.appendChild(this.latencyInfo);
        
        // 动态定位：基于connectionStatus按钮的坐标向右偏移32px
        this.updateLatencyPosition();
    }
    
    // 更新网络延迟信息位置
    updateLatencyPosition() {
        if (!this.latencyInfo || !this.connectionStatus) return;
        
        const connectionStatusRect = this.connectionStatus.getBoundingClientRect();
        const parentRect = this.connectionStatus.parentElement.getBoundingClientRect();
        
        // 计算相对于父容器的位置   
        const leftPosition = connectionStatusRect.left - parentRect.left;
        this.latencyInfo.style.left = `${leftPosition}px`;
        this.latencyInfo.style.transform = 'translateY(0)';
    }
    
    // 切换网络延迟信息显示
    toggleLatencyInfo() {
        if (!this.latencyInfo) {
            this.createLatencyInfo();
        }
        
        if (this.isLatencyVisible) {
            this.hideLatencyInfo();
        } else {
            this.showLatencyInfo();
        }
    }
    
    // 显示网络延迟信息
    showLatencyInfo() {
        if (!this.latencyInfo) return;
        
        // 更新延迟信息
        this.updateLatencyInfo();
        
        // 重新计算位置，确保对齐正确
        this.updateLatencyPosition();
        
        this.latencyInfo.style.opacity = '1';
        this.latencyInfo.style.visibility = 'visible';
        this.latencyInfo.style.transform = 'translateY(0)';
        this.isLatencyVisible = true;
    }
    
    // 隐藏网络延迟信息
    hideLatencyInfo() {
        if (!this.latencyInfo) return;
        
        this.latencyInfo.style.opacity = '0';
        this.latencyInfo.style.visibility = 'hidden';
        this.latencyInfo.style.transform = 'translateY(-10px)';
        this.isLatencyVisible = false;
    }
    
    // 更新网络延迟信息
    updateLatencyInfo() {
        if (!this.latencyInfo) return;
        
        let latencyText = '网络延迟: ';
        if (this.chatApp.wsManager.networkLatency > 0) {
            latencyText += `${this.chatApp.wsManager.networkLatency}ms`;
        } else {
            latencyText += '未知';
        }
        
        this.latencyInfo.textContent = latencyText;
    }
    
    // 切换在线用户列表显示
    toggleOnlineUserList() {
        if (this.isUserListVisible) {
            this.hideOnlineUserList();
        } else {
            this.showOnlineUserList();
        }
    }
    
    // 显示在线用户列表
    showOnlineUserList() {
        if (!this.onlineUserList) {
            this.createOnlineUserList();
        }
        this.updateOnlineUserList();
        // 重新计算位置，确保对齐正确
        this.updateOnlineUserListPosition();
        this.onlineUserList.style.opacity = '1';
        this.onlineUserList.style.visibility = 'visible';
        this.onlineUserList.style.transform = 'translateY(0)';
        this.isUserListVisible = true;
    }
    
    // 隐藏在线用户列表
    hideOnlineUserList() {
        if (this.onlineUserList) {
            this.onlineUserList.style.opacity = '0';
            this.onlineUserList.style.visibility = 'hidden';
            this.onlineUserList.style.transform = 'translateY(-10px)';
        }
        this.isUserListVisible = false;
    }
    
    // 创建在线用户列表元素
    createOnlineUserList() {
        this.onlineUserList = document.createElement('div');
        this.onlineUserList.className = 'online-user-list';
        this.onlineUserList.style.cssText = `
            position: absolute;
            top: 100%;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 0.25rem 0;
            margin-top: 0.25rem;
            min-width: 200px;
            z-index: 1000;
            max-height: 200px;
            overflow-y: auto;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.3s ease, visibility 0.3s ease, transform 0.3s ease;
        `;
        
        // 将用户列表添加到在线人数显示元素的父容器中
        this.onlineCount.parentElement.style.position = 'relative';
        this.onlineCount.parentElement.appendChild(this.onlineUserList);
        
        this.updateOnlineUserListPosition();
    }
    
    // 更新在线用户列表位置
    updateOnlineUserListPosition() {
        if (!this.onlineUserList || !this.onlineCount) return;
        
        const onlineCountRect = this.onlineCount.getBoundingClientRect();
        const parentRect = this.onlineCount.parentElement.getBoundingClientRect();
        
        const leftPosition = onlineCountRect.left - parentRect.left;
        this.onlineUserList.style.left = `${leftPosition}px`;
        this.onlineUserList.style.transform = 'translateY(0)';
    }
    
    // 更新在线用户列表内容
    updateOnlineUserList() {
        if (!this.onlineUserList) return;
        
        // 清空列表
        this.onlineUserList.innerHTML = '';
        
        // 按最后活跃时间排序（最新的在前）
        const sortedUsers = [...this.chatApp.onlineUsers].sort((a, b) => {
            return new Date(b.lastActive) - new Date(a.lastActive);
        });
        
        // 添加列表项
        sortedUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'online-user-item';
            userItem.style.cssText = `
                padding: 0.2rem 1rem;
                display: flex;
                justify-content: space-between;
                align-items: center;
                cursor: pointer;
                transition: background-color 0.2s ease;
            `;
            
            userItem.onmouseenter = () => {
                userItem.style.backgroundColor = '#f7fafc';
            };
            
            userItem.onmouseleave = () => {
                userItem.style.backgroundColor = 'transparent';
            };
            
            // 格式化最后活跃时间
            const lastActive = this.chatApp.messageManager.formatTime(user.lastActive);
            
            // 检查是否为当前用户
            const isCurrentUser = user.userId === this.chatApp.userId;
            const usernameDisplay = isCurrentUser 
                ? `${this.chatApp.messageManager.escapeHtml(user.userId)} <span style="color: #718096; font-weight: normal;">(你)</span>`
                : this.chatApp.messageManager.escapeHtml(user.userId);
            
            userItem.innerHTML = `
                <span style="font-weight: 600; color: #4a5568;">${usernameDisplay}</span>
                <span style="font-size: 0.8rem; color: #718096;">${lastActive}</span>
            `;
            
            this.onlineUserList.appendChild(userItem);
        });
    }
    
    // 显示右键菜单
    showContextMenu(e, message) {
        if (!this.contextMenu) {
            this.createContextMenu();
        }
        
        // 保存当前消息
        this.currentMessage = message;
        
        // 更新菜单选项
        this.updateContextMenu(message);
        
        // 定位菜单
        this.contextMenu.style.left = `${e.clientX}px`;
        this.contextMenu.style.top = `${e.clientY}px`;
        
        // 显示菜单，使用淡入效果
        this.contextMenu.style.visibility = 'visible';
        this.contextMenu.style.opacity = '1';
    }
    
    // 隐藏右键菜单
    hideContextMenu() {
        if (this.contextMenu) {
            // 隐藏菜单，使用淡出效果
            this.contextMenu.style.opacity = '0';
            this.contextMenu.style.visibility = 'hidden';
        }
        this.currentMessage = null;
    }
    
    // 创建右键菜单
    createContextMenu() {
        this.contextMenu = document.createElement('div');
        this.contextMenu.className = 'context-menu';
        this.contextMenu.style.cssText = `
            position: fixed;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 0.5rem 0;
            min-width: 120px;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: opacity 0.2s ease, visibility 0.2s ease;
        `;
        
        // 添加菜单选项
        const copyOption = document.createElement('div');
        copyOption.className = 'context-menu-option';
        copyOption.textContent = '复制';
        copyOption.dataset.action = 'copy';
        copyOption.style.cssText = `
            padding: 0.2rem 1rem;
            cursor: pointer;
            transition: background-color 0.2s ease;
            font-size: 0.9rem;
        `;
        
        const recallOption = document.createElement('div');
        recallOption.className = 'context-menu-option';
        recallOption.textContent = '撤回';
        recallOption.dataset.action = 'recall';
        recallOption.style.cssText = `
            padding: 0.2rem 1rem;
            cursor: pointer;
            transition: background-color 0.2s ease;
            font-size: 0.9rem;
        `;
        
        // 添加emoji反应选项分隔线
        const emojiDivider = document.createElement('div');
        emojiDivider.style.cssText = `
            height: 1px;
            background-color: #e2e8f0;
            margin: 0.25rem 0;
        `;
        
        // 添加emoji反应选项
        const emojiOptions = document.createElement('div');
        emojiOptions.className = 'emoji-options';
        emojiOptions.style.cssText = `
            display: flex;
            flex-wrap: wrap;
            gap: 0.25rem;
            padding: 0.25rem 0.5rem;
        `;
        
        // 预设emoji列表
        this.emojis = ['👍', '❤️', '😂', '😮', '😢'];
        
        // 创建emoji按钮
        this.emojis.forEach(emoji => {
            const emojiBtn = document.createElement('button');
            emojiBtn.className = 'emoji-btn';
            emojiBtn.textContent = emoji;
            emojiBtn.dataset.action = 'react';
            emojiBtn.dataset.emoji = emoji;
            emojiBtn.style.cssText = `
                background: none;
                border: 1px solid #e2e8f0;
                border-radius: 4px;
                padding: 0.25rem 0.5rem;
                font-size: 1rem;
                cursor: pointer;
                transition: all 0.2s ease;
            `;
            
            emojiBtn.onmouseenter = () => {
                emojiBtn.style.backgroundColor = '#f7fafc';
                emojiBtn.style.borderColor = '#cbd5e0';
            };
            
            emojiBtn.onmouseleave = () => {
                emojiBtn.style.backgroundColor = 'transparent';
                emojiBtn.style.borderColor = '#e2e8f0';
            };
            
            emojiOptions.appendChild(emojiBtn);
        });
        
        // 添加悬停效果
        [copyOption, recallOption].forEach(option => {
            option.onmouseenter = () => {
                option.style.backgroundColor = '#f7fafc';
            };
            
            option.onmouseleave = () => {
                option.style.backgroundColor = 'transparent';
            };
        });
        
        // 添加点击事件监听
        this.contextMenu.addEventListener('click', (e) => {
            this.handleContextMenuClick(e);
        });
        
        // 添加菜单项
        this.contextMenu.appendChild(copyOption);
        this.contextMenu.appendChild(recallOption);
        this.contextMenu.appendChild(emojiDivider);
        this.contextMenu.appendChild(emojiOptions);
        
        // 添加到文档
        document.body.appendChild(this.contextMenu);
    }
    
    // 更新右键菜单选项
    updateContextMenu(message) {
        const copyOption = this.contextMenu.querySelector('[data-action="copy"]');
        const recallOption = this.contextMenu.querySelector('[data-action="recall"]');
        
        // 复制选项始终显示
        copyOption.style.display = 'block';
        
        // 撤回选项仅对自己发送的消息显示
        if (message.sender === this.chatApp.userId && message.type !== 'system' && message.type !== 'recall') {
            recallOption.style.display = 'block';
        } else {
            recallOption.style.display = 'none';
        }
    }
    
    // 处理右键菜单点击
    handleContextMenuClick(e) {
        const action = e.target.dataset.action;
        if (!action || !this.currentMessage) return;
        
        switch (action) {
            case 'copy':
                this.chatApp.messageManager.copyMessage(this.currentMessage);
                break;
            case 'recall':
                this.chatApp.messageManager.recallMessage(this.currentMessage.timestamp);
                break;
            case 'react':
                const emoji = e.target.dataset.emoji;
                this.chatApp.messageManager.addReaction(this.currentMessage.timestamp, emoji);
                break;
        }
        
        // 关闭菜单
        this.hideContextMenu();
    }
    
    // 滚动到底部
    scrollToBottom() {
        requestAnimationFrame(() => {
            try {
                const chatMessages = this.chatApp.chatMessages;
                if (chatMessages) {
                    // 平滑滚动到底部
                    chatMessages.scrollTo({
                        top: chatMessages.scrollHeight,
                        behavior: 'smooth'
                    });
                }
            } catch (error) {
                console.error('滚动到底部失败:', error);
            }
        });
    }
}
