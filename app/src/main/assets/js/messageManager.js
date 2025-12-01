// 消息管理类
class MessageManager {
    constructor(chatApp) {
        this.chatApp = chatApp;
        this.messages = [];
    }
    
    // 发送消息
    sendMessage() {
        // 获取纯文本内容
        const text = this.chatApp.messageInput.textContent.trim();
        if (!text) return;
        
        if (!this.chatApp.isConnected) {
            alert('正在连接服务器，请稍后再试...');
            return;
        }
        
        // 检测消息中包含的@用户
        const mentionRegex = /@(\w+)/g;
        const matches = text.match(mentionRegex);
        let mentionedUsers = matches ? matches.map(match => match.substring(1)) : [];
        
        // 验证并过滤mentionedUsers列表
        const validOnlineUsers = this.chatApp.onlineUsers.map(user => user.userId);
        mentionedUsers = mentionedUsers.filter(username => {
            // 只保留在线且非自己的用户
            return validOnlineUsers.includes(username) && username !== this.chatApp.userId;
        });
        
        // 去重，确保每个用户只被提及一次
        mentionedUsers = [...new Set(mentionedUsers)];
        
        const message = {
            type: 'text',
            sender: this.chatApp.userId,
            content: text,
            mentionedUsers: mentionedUsers,
            timestamp: new Date().toISOString()
        };
        
        // 发送到服务器
        this.chatApp.wsManager.send(message);
        
        // 清空输入框
        this.chatApp.messageInput.innerHTML = '';
    }
    
    // 发送系统消息
    sendSystemMessage(content) {
        if (!this.chatApp.userId) return;
        
        if (!this.chatApp.isConnected) {
            console.log('WebSocket连接尚未建立，无法发送系统消息');
            return;
        }
        
        const message = {
            type: 'system',
            sender: this.chatApp.userId,
            content: content,
            timestamp: new Date().toISOString()
        };
        
        this.chatApp.wsManager.send(message);
    }
    
    // 发送文件
    sendFile() {
        // 创建文件输入框
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.accept = '*/*';
        
        fileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFileSend(file);
            }
        };
        
        fileInput.click();
    }
    
    // 处理文件发送
    handleFileSend(file) {
        if (!this.chatApp.isConnected) return;
        
        // 简单实现：发送文件信息，实际项目中会处理文件上传
        const message = {
            type: 'file',
            sender: this.chatApp.userId,
            content: {
                name: file.name,
                size: file.size,
                type: file.type,
                url: URL.createObjectURL(file) // 本地文件URL
            },
            timestamp: new Date().toISOString()
        };
        
        this.chatApp.wsManager.send(message);
    }
    
    // 显示消息
    displayMessage(message) {
        // 检查消息是否@当前用户
        const isMentioned = message.mentionedUsers && message.mentionedUsers.includes(this.chatApp.userId);
        
        const messageDiv = document.createElement('div');
        messageDiv.className = `message ${message.sender === this.chatApp.userId ? 'own' : ''}`;
        
        let messageContent = '';
        
        if (message.type === 'system') {
            // 系统消息 - 优化样式，用户名显示为蓝色
            messageDiv.className = 'message system';
            
            // 解析系统消息内容，提取用户名
            const systemText = this.escapeHtml(message.content);
            let formattedText = systemText;
            
            // 匹配用户名模式，如 "XX加入了聊天室" 或 "XX退出了聊天室"
            const userPattern = /^(\S+)\s+(加入|退出)了聊天室$/;
            const match = systemText.match(userPattern);
            if (match) {
                const username = match[1];
                const action = match[2];
                formattedText = `<span class="system-username">${username}</span>${action}了聊天室`;
            }
            
            messageContent = `
                <div class="message-content">
                    <div class="message-text">${formattedText}</div>
                </div>
            `;
        } else if (message.type === 'recall') {
            // 消息撤回提示
            messageDiv.className = 'message recall';
            messageContent = `
                <div class="message-content">
                    <div class="message-text">
                        <span class="recall-username">${this.escapeHtml(message.sender)}</span>撤回了一条消息
                    </div>
                </div>
            `;
        } else {
            // 普通消息
            messageContent = `
                <div class="message-content">
                    <div class="message-header">
                        <span class="message-sender">${this.escapeHtml(message.sender)}</span>
                        <span class="message-time">${this.formatTime(message.timestamp)}</span>
                    </div>
            `;
            
            // 根据消息类型显示不同内容
            switch (message.type) {
                case 'text':
                    // 显示文本内容
                    let formattedContent = this.escapeHtml(message.content);
                    // 高亮显示@用户，根据不同情况应用样式
                    formattedContent = formattedContent.replace(/@(\w+)/g, (match, username) => {
                        // 检查说话人是否艾特了自己
                        const isSpeakerSelfMention = username === message.sender;
                        // 检查说话人是否艾特了当前用户
                        const isMentionedMe = username === this.chatApp.userId;
                        // 检查用户是否在线
                        const isOnline = this.chatApp.onlineUsers.some(user => user.userId === username);
                        
                        if (isSpeakerSelfMention) {
                            // 说话人艾特了自己，不显示样式
                            return `@${username}`;
                        } else if (isMentionedMe || isOnline) {
                            // 说话人艾特了当前用户，或者用户在线，显示样式
                            return `<span class="mention-highlight">@${username}</span>`;
                        } else {
                            // 其他情况，不显示样式
                            return `@${username}`;
                        }
                    });
                    messageContent += `<div class="message-text">${formattedContent}</div>`;
                    break;
                case 'file':
                    // 根据文件类型自动识别并展示
                    messageContent += this.renderFileMessage(message.content);
                    break;
            }
            
            messageContent += `</div>`;
        }
        
        messageDiv.innerHTML = messageContent;
        messageDiv.dataset.timestamp = message.timestamp;
        messageDiv.dataset.sender = message.sender;
        
        // 添加右键菜单事件监听
        messageDiv.addEventListener('contextmenu', (e) => {
            e.preventDefault();
            this.chatApp.showContextMenu(e, message);
        });
        
        // 添加emoji反应显示
        this.renderReactions(messageDiv, message);
        
        // 如果消息@了当前用户，创建带有左侧提示条的容器
        if (isMentioned) {
            const mentionContainer = document.createElement('div');
            mentionContainer.className = 'mention-container';
            mentionContainer.style.cssText = `
                display: flex;
                align-items: flex-start;
                margin-bottom: 0.5rem;
            `;
            
            // 创建左侧提示条
            const mentionIndicator = document.createElement('div');
            mentionIndicator.className = 'mention-indicator';
            mentionIndicator.style.cssText = `
                width: 8px;
                height: 100%;
                background-color: #e6f2ff;
                border-radius: 0 4px 4px 0;
                margin-right: 10px;
                flex-shrink: 0;
            `;
            
            // 将提示条和消息添加到容器
            mentionContainer.appendChild(mentionIndicator);
            mentionContainer.appendChild(messageDiv);
            
            // 将容器添加到聊天记录
            this.chatApp.chatMessages.appendChild(mentionContainer);
        } else {
            // 普通消息直接添加
            this.chatApp.chatMessages.appendChild(messageDiv);
        }
    }
    
    // 渲染文件消息 - 根据文件类型自动识别并展示
    renderFileMessage(fileData) {
        const fileName = this.escapeHtml(fileData.name);
        const fileUrl = fileData.url;
        const fileSize = this.formatFileSize(fileData.size);
        
        // 获取文件扩展名
        const fileExt = fileName.split('.').pop().toLowerCase();
        
        // 音频文件类型
        const audioExts = ['mp3', 'wav', 'ogg', 'm4a', 'aac'];
        // 视频文件类型
        const videoExts = ['mp4', 'webm', 'ogg', 'mov', 'avi'];
        
        // 根据文件类型渲染不同的内容
        if (audioExts.includes(fileExt)) {
            // 音频文件 - 显示音频播放器
            return `
                <div class="message-audio">
                    <audio controls src="${fileUrl}" style="width: 100%;">
                        您的浏览器不支持音频播放
                    </audio>
                    <div class="file-info" style="margin-top: 0.5rem;">
                        <div class="file-name">${fileName}</div>
                        <div class="file-size">${fileSize}</div>
                    </div>
                </div>
            `;
        } else if (videoExts.includes(fileExt)) {
            // 视频文件 - 显示视频播放器
            return `
                <div class="message-video">
                    <video controls width="200" src="${fileUrl}" style="max-width: 100%;">
                        您的浏览器不支持视频播放
                    </video>
                    <div class="file-info" style="margin-top: 0.5rem;">
                        <div class="file-name">${fileName}</div>
                        <div class="file-size">${fileSize}</div>
                    </div>
                </div>
            `;
        } else {
            // 其他文件 - 显示标准文件格式
            return `
                <div class="message-file">
                    <div class="file-info">
                        <div class="file-name">${fileName}</div>
                        <div class="file-size">${fileSize}</div>
                    </div>
                    <a href="${fileUrl}" target="_blank" class="download-btn" download="${fileName}">下载</a>
                </div>
            `;
        }
    }
    
    // 渲染emoji反应
    renderReactions(messageElement, message) {
        // 查找消息内容容器
        const contentContainer = messageElement.querySelector('.message-content');
        if (!contentContainer) return;
        
        // 移除已有的反应容器（如果存在）
        let reactionsContainer = contentContainer.querySelector('.reactions-container');
        if (reactionsContainer) {
            reactionsContainer.remove();
        }
        
        // 如果没有反应，直接返回
        if (!message.reactions || message.reactions.length === 0) {
            return;
        }
        
        // 创建反应容器
        reactionsContainer = document.createElement('div');
        reactionsContainer.className = 'reactions-container';
        
        // 设置容器样式
        const isOwnMessage = message.sender === this.chatApp.userId;
        reactionsContainer.style.cssText = `
            display: flex;
            gap: 0.5rem;
            margin-top: 0.5rem;
            ${isOwnMessage ? 'justify-content: flex-end;' : 'justify-content: flex-start;'}
            flex-wrap: wrap;
        `;
        
        // 遍历每个反应
        message.reactions.forEach(reaction => {
            const reactionBtn = document.createElement('button');
            
            // 检查当前用户是否已经添加了该反应
            const isUserReacted = reaction.users.includes(this.chatApp.userId);
            
            // 设置按钮类名
            reactionBtn.className = `reaction-btn ${isUserReacted ? 'user-reacted' : ''}`;
            
            // 设置按钮内容
            reactionBtn.innerHTML = `
                <span class="reaction-emoji">${reaction.emoji}</span>
                <span class="reaction-count">${reaction.users.length}</span>
            `;
            
            // 添加点击事件监听
            reactionBtn.addEventListener('click', () => {
                this.chatApp.addReaction(message.timestamp, reaction.emoji);
            });
            
            // 添加淡入效果
            reactionBtn.style.opacity = '0';
            reactionBtn.style.transform = 'translateY(5px)';
            
            // 添加到反应容器
            reactionsContainer.appendChild(reactionBtn);
            
            // 触发淡入动画
            setTimeout(() => {
                reactionBtn.style.transition = 'all 0.3s ease';
                reactionBtn.style.opacity = '1';
                reactionBtn.style.transform = 'translateY(0)';
            }, 10);
        });
        
        // 添加到消息内容容器
        contentContainer.appendChild(reactionsContainer);
    }
    
    // 撤回消息
    recallMessage(timestamp) {
        if (!this.chatApp.isConnected || !this.chatApp.userId) return;
        
        // 发送撤回消息请求
        const recallMessage = {
            type: 'recall',
            sender: this.chatApp.userId,
            recallId: timestamp,
            timestamp: new Date().toISOString()
        };
        
        this.chatApp.wsManager.send(recallMessage);
    }
    
    // 添加emoji反应
    addReaction(targetId, emoji) {
        if (!this.chatApp.isConnected || !this.chatApp.userId) return;
        
        // 发送emoji反应消息
        const reactionMessage = {
            type: 'reaction',
            sender: this.chatApp.userId,
            targetId: targetId,
            emoji: emoji,
            timestamp: new Date().toISOString()
        };
        
        this.chatApp.wsManager.send(reactionMessage);
    }
    
    // 复制消息内容
    copyMessage(message) {
        let textToCopy = '';
        
        switch (message.type) {
            case 'text':
                textToCopy = message.content;
                break;
            case 'file':
                textToCopy = message.content.name;
                break;
            case 'system':
            case 'recall':
                textToCopy = message.content;
                break;
        }
        
        // 使用Clipboard API复制文本
        navigator.clipboard.writeText(textToCopy).then(() => {
            // 可以添加一个短暂的提示
            console.log('消息已复制到剪贴板');
        }).catch(err => {
            console.error('复制失败:', err);
        });
    }
    
    // 保存聊天记录到本地存储
    saveChatHistory() {
        // 只保存最近100条消息
        const recentMessages = this.messages.slice(-100);
        localStorage.setItem('chatMessages', JSON.stringify(recentMessages));
    }
    
    // 加载聊天记录
    loadChatHistory() {
        const savedMessages = localStorage.getItem('chatMessages');
        if (savedMessages) {
            try {
                const allMessages = JSON.parse(savedMessages);
                // 只加载用户进入后的消息
                const enterTime = new Date(this.chatApp.enterTime);
                this.messages = allMessages.filter(msg => {
                    const msgTime = new Date(msg.timestamp);
                    return msgTime >= enterTime;
                });
                
                // 显示过滤后的消息
                this.messages.forEach(message => this.displayMessage(message));
                this.chatApp.scrollToBottom();
            } catch (error) {
                console.error('加载聊天记录失败:', error);
            }
        }
    }
    
    // HTML转义
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    // 格式化时间
    formatTime(timestamp) {
        const date = new Date(timestamp);
        return date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    }
    
    // 格式化文件大小
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}
