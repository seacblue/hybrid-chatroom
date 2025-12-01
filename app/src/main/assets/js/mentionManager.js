// 艾特管理类
class MentionManager {
    constructor(chatApp) {
        this.chatApp = chatApp;
        this.mentionDropdown = null;
        this.isMentionDropdownVisible = false;
        this.mentionPrefix = '';
        
        // 初始化事件监听
        this.initEventListeners();
    }
    
    // 初始化事件监听
    initEventListeners() {
        // 输入框输入事件，用于检测@符号
        this.chatApp.messageInput.addEventListener('input', (e) => {
            this.handleMentionInput(e);
        });
        
        // 输入框按键事件，处理下拉列表的选择
        this.chatApp.messageInput.addEventListener('keydown', (e) => {
            this.handleMentionKeydown(e);
        });
        
        // 输入框点击事件，处理点击艾特标签内部的情况
        this.chatApp.messageInput.addEventListener('click', (e) => {
            this.handleMentionClick(e);
        });
        
        // 输入框选择事件，处理选择艾特标签内部的情况
        this.chatApp.messageInput.addEventListener('select', (e) => {
            this.handleMentionSelect(e);
        });
    }
    
    // 处理艾特输入
    handleMentionInput(e) {
        // 获取当前光标位置
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // 获取当前节点和偏移量
        const currentNode = range.startContainer;
        const currentOffset = range.startOffset;
        
        // 检查是否输入了@符号或换行符
        if (currentNode.nodeType === Node.TEXT_NODE) {
            const currentText = currentNode.textContent;
            
            // 检查是否刚输入了@符号
            if (currentOffset > 0 && currentText[currentOffset - 1] === '@') {
                // 刚输入了@符号，立即显示匹配界面
                this.mentionPrefix = '';
                this.updateMentionDropdown();
                this.showMentionDropdown();
                return;
            }
        }
        
        // 直接获取输入框的完整文本内容，包括换行符
        const fullText = this.chatApp.messageInput.textContent;
        
        // 计算光标在完整文本中的位置
        let fullCursorPos = 0;
        
        // 如果当前节点是文本节点，计算前面所有文本节点的长度
        if (currentNode.nodeType === Node.TEXT_NODE) {
            let node = this.chatApp.messageInput.firstChild;
            while (node && node !== currentNode) {
                if (node.nodeType === Node.TEXT_NODE) {
                    fullCursorPos += node.textContent.length;
                }
                node = node.nextSibling;
            }
            // 加上当前节点内的偏移量
            fullCursorPos += currentOffset;
        } else {
            // 如果当前节点不是文本节点，使用range.startOffset
            fullCursorPos = currentOffset;
        }
        
        // 查找最后一个@符号的位置
        const lastAtIndex = fullText.lastIndexOf('@', fullCursorPos - 1);
        
        if (lastAtIndex !== -1) {
            // 提取@符号后的文本作为前缀
            const mentionText = fullText.substring(lastAtIndex + 1, fullCursorPos);
            
            // 只要输入了@符号，就更新匹配功能
            this.mentionPrefix = mentionText;
            // 每次输入都重新更新匹配列表，确保实时反映在线用户变化
            this.updateMentionDropdown();
            // 显示匹配界面，无论是否有匹配项
            this.showMentionDropdown();
        } else {
            this.hideMentionDropdown();
        }
    }
    
    // 自动高亮已完成的艾特标签
    autoHighlightMention(startIndex, endIndex, text) {
        // 检查当前位置是否已经是高亮的艾特标签
        // 获取当前输入框的所有子节点
        const inputNode = this.chatApp.messageInput;
        let isAlreadyMention = false;
        let currentTextLength = 0;
        
        // 遍历所有子节点，检查当前@符号位置是否在已有的mention-group中
        for (let i = 0; i < inputNode.childNodes.length; i++) {
            const node = inputNode.childNodes[i];
            
            if (node.nodeType === Node.TEXT_NODE) {
                // 文本节点，检查@符号位置是否在这个节点中
                const nodeLength = node.textContent.length;
                if (startIndex >= currentTextLength && startIndex < currentTextLength + nodeLength) {
                    // @符号在这个文本节点中，检查是否已经是高亮标签
                    // 检查前后是否有mention-group节点
                    if ((i > 0 && inputNode.childNodes[i-1].classList && inputNode.childNodes[i-1].classList.contains('mention-group')) ||
                        (i < inputNode.childNodes.length - 1 && inputNode.childNodes[i+1].classList && inputNode.childNodes[i+1].classList.contains('mention-group'))) {
                        isAlreadyMention = true;
                        break;
                    }
                }
                currentTextLength += nodeLength;
            } else if (node.classList && node.classList.contains('mention-group')) {
                // 已经是高亮的艾特标签，检查@符号位置是否在这个标签中
                // mention-group包含@用户名和一个空格，所以长度是用户名长度+2
                const mentionText = node.textContent;
                if (startIndex >= currentTextLength && startIndex < currentTextLength + mentionText.length) {
                    isAlreadyMention = true;
                    break;
                }
                currentTextLength += mentionText.length;
            }
        }
        
        // 如果已经是高亮的艾特标签，跳过自动匹配
        if (isAlreadyMention) {
            return;
        }
    }
    
    // 创建艾特下拉列表
    createMentionDropdown() {
        this.mentionDropdown = document.createElement('div');
        this.mentionDropdown.className = 'mention-dropdown';
        this.mentionDropdown.style.cssText = `
            position: absolute;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
            padding: 0;
            min-width: 150px;
            z-index: 10000;
            display: none;
            max-height: 200px;
            overflow-y: auto;
        `;
        
        // 添加到文档
        document.body.appendChild(this.mentionDropdown);
    }
    
    // 显示艾特下拉列表
    showMentionDropdown() {
        if (!this.mentionDropdown) {
            this.createMentionDropdown();
            
            // 添加事件监听器，确保点击dropdown时事件不会穿透到输入框
            this.mentionDropdown.addEventListener('click', (e) => {
                // 阻止事件冒泡，避免触发输入框的点击事件
                e.stopPropagation();
            });
        }
        
        // 更新下拉列表内容
        this.updateMentionDropdown();
        
        // 定位下拉列表
        const inputRect = this.chatApp.messageInput.getBoundingClientRect();
        this.mentionDropdown.style.left = `${inputRect.left}px`;
        this.mentionDropdown.style.top = `${inputRect.bottom + 5}px`;
        this.mentionDropdown.style.display = 'block';
        this.isMentionDropdownVisible = true;
    }
    
    // 隐藏艾特下拉列表
    hideMentionDropdown() {
        if (this.mentionDropdown) {
            this.mentionDropdown.style.display = 'none';
        }
        this.isMentionDropdownVisible = false;
        this.mentionPrefix = '';
    }
    
    // 处理艾特标签点击事件
    handleMentionClick(e) {
        // 检查点击目标是否是mention-dropdown或其子元素，如果是则不处理
        let target = e.target;
        while (target && target !== this.chatApp.messageInput) {
            if (target.classList && target.classList.contains('mention-dropdown')) {
                // 点击了艾特下拉列表，不处理
                return;
            } else if (target.classList && target.classList.contains('mention-item')) {
                // 点击了艾特下拉列表项，不处理
                return;
            }
            target = target.parentNode;
        }
        
        // 重新检查点击目标是否在艾特标签内部
        target = e.target;
        while (target && target !== this.chatApp.messageInput) {
            if (target.classList && target.classList.contains('mention-group')) {
                // 点击了艾特标签内部，根据点击位置决定光标移动方向
                e.preventDefault();
                this.handleMentionClickPosition(e, target);
                return;
            } else if (target.classList && target.classList.contains('mention-highlight')) {
                // 点击了艾特高亮文本，根据点击位置决定光标移动方向
                e.preventDefault();
                this.handleMentionClickPosition(e, target.parentNode);
                return;
            }
            target = target.parentNode;
        }
    }
    
    // 根据点击位置处理艾特标签点击
    handleMentionClickPosition(e, mentionGroup) {
        // 获取艾特标签的位置和尺寸
        const rect = mentionGroup.getBoundingClientRect();
        // 获取点击位置相对于艾特标签的水平偏移量
        const clickOffset = e.clientX - rect.left;
        
        // 如果点击位置在标签左侧16px内，将光标移动到标签左边
        // 否则移动到标签右边
        if (clickOffset < 16) {
            this.moveCursorBeforeMention(mentionGroup);
        } else {
            this.moveCursorAfterMention(mentionGroup);
        }
    }
    
    // 处理艾特标签选择事件
    handleMentionSelect(e) {
        // 检查选择范围是否在艾特标签内部
        const selection = window.getSelection();
        if (selection.rangeCount > 0) {
            const range = selection.getRangeAt(0);
            let startNode = range.startContainer;
            let endNode = range.endContainer;
            
            // 检查起始节点是否在艾特标签内部
            while (startNode && startNode !== this.chatApp.messageInput) {
                if (startNode.classList && (startNode.classList.contains('mention-group') || startNode.classList.contains('mention-highlight'))) {
                    // 选择范围在艾特标签内部，将光标移动到标签右边
                    this.moveCursorAfterMention(startNode.classList.contains('mention-group') ? startNode : startNode.parentNode);
                    return;
                }
                startNode = startNode.parentNode;
            }
            
            // 检查结束节点是否在艾特标签内部
            while (endNode && endNode !== this.chatApp.messageInput) {
                if (endNode.classList && (endNode.classList.contains('mention-group') || endNode.classList.contains('mention-highlight'))) {
                    // 选择范围在艾特标签内部，将光标移动到标签右边
                    this.moveCursorAfterMention(endNode.classList.contains('mention-group') ? endNode : endNode.parentNode);
                    return;
                }
                endNode = endNode.parentNode;
            }
        }
    }
    
    // 将光标移动到艾特标签右边
    moveCursorAfterMention(mentionGroup) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStartAfter(mentionGroup);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        this.chatApp.messageInput.focus();
    }
    
    // 处理艾特下拉列表的键盘导航和箭头键导航
    handleMentionKeydown(e) {
        // 先处理箭头键导航，确保不会卡在艾特标签内部
        if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
            this.handleArrowNavigation(e);
        }
        
        if (e.key === ' ') {
            // 检查当前是否正在输入@符号
            const selection = window.getSelection();
            if (selection.rangeCount > 0) {
                const range = selection.getRangeAt(0);
                const currentNode = range.startContainer;
                
                // 获取完整文本和光标位置
                let fullText = '';
                let fullCursorPos = 0;
                
                const walk = document.createTreeWalker(this.chatApp.messageInput, NodeFilter.SHOW_TEXT);
                let node;
                while (node = walk.nextNode()) {
                    if (node === currentNode) {
                        fullText += node.textContent;
                        fullCursorPos += range.startOffset;
                        break;
                    } else {
                        fullText += node.textContent;
                        fullCursorPos += node.textContent.length;
                    }
                }
                
                if (!fullText) {
                    fullText = this.chatApp.messageInput.textContent;
                    fullCursorPos = range.startOffset;
                }
                
                // 查找最后一个@符号的位置
                const lastAtIndex = fullText.lastIndexOf('@', fullCursorPos - 1);
                
                if (lastAtIndex !== -1) {
                    // 提取@符号后的文本作为前缀
                    const mentionText = fullText.substring(lastAtIndex + 1, fullCursorPos);
                    
                    // 如果@符号后面有文本或没有文本，都显示下拉列表并匹配
                    if (!mentionText.includes(' ') && !mentionText.includes('\n') && !mentionText.includes('\r')) {
                        // 如果下拉列表不可见，先显示它
                        if (!this.isMentionDropdownVisible) {
                            this.mentionPrefix = mentionText;
                            this.showMentionDropdown();
                        }
                        
                        const items = this.mentionDropdown.querySelectorAll('.mention-item');
                        if (items.length > 0) {
                            e.preventDefault();
                            // 默认选择第一个匹配项
                            this.selectMention(items[0].textContent);
                            return;
                        }
                    }
                }
            }
        }
        
        // 如果下拉列表可见，处理下拉列表的键盘导航
        if (!this.isMentionDropdownVisible) return;
        
        const items = this.mentionDropdown.querySelectorAll('.mention-item');
        if (items.length === 0) return;
        
        let selectedIndex = Array.from(items).findIndex(item => 
            item.classList.contains('selected')
        );
        
        switch (e.key) {
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = selectedIndex > 0 ? selectedIndex - 1 : items.length - 1;
                break;
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = selectedIndex < items.length - 1 ? selectedIndex + 1 : 0;
                break;
            case ' ':
                e.preventDefault();
                if (selectedIndex >= 0) {
                    this.selectMention(items[selectedIndex].textContent);
                } else if (items.length > 0) {
                    // 如果没有选中项，默认选择第一个
                    this.selectMention(items[0].textContent);
                }
                break;
            case 'Escape':
                this.hideMentionDropdown();
                break;
        }
        
        // 更新选中状态
        items.forEach((item, index) => {
            if (index === selectedIndex) {
                item.classList.add('selected');
                item.style.backgroundColor = '#edf2f7';
            } else {
                item.classList.remove('selected');
                item.style.backgroundColor = 'transparent';
            }
        });
    }
    
    // 处理箭头键导航，确保不会卡在艾特标签内部
    handleArrowNavigation(e) {
        const selection = window.getSelection();
        if (selection.rangeCount === 0) return;
        
        const range = selection.getRangeAt(0);
        const currentNode = range.startContainer;
        
        // 检查当前节点是否在艾特标签内部
        let parentNode = currentNode;
        while (parentNode && parentNode !== this.chatApp.messageInput) {
            if (parentNode.classList && parentNode.classList.contains('mention-group')) {
                // 当前在艾特标签内部，处理箭头键导航
                e.preventDefault();
                
                if (e.key === 'ArrowLeft') {
                    // 按左键，将光标移动到标签左边
                    this.moveCursorBeforeMention(parentNode);
                } else if (e.key === 'ArrowRight') {
                    // 按右键，将光标移动到标签右边
                    this.moveCursorAfterMention(parentNode);
                }
                return;
            }
            parentNode = parentNode.parentNode;
        }
        
        // 检查当前光标位置是否紧挨着艾特标签
        if (e.key === 'ArrowLeft') {
            // 按左键，检查是否紧挨着艾特标签右边
            const previousSibling = currentNode.previousSibling;
            if (previousSibling && previousSibling.classList && previousSibling.classList.contains('mention-group')) {
                // 紧挨着艾特标签右边，按左键将光标移动到标签左边
                e.preventDefault();
                this.moveCursorBeforeMention(previousSibling);
            }
        } else if (e.key === 'ArrowRight') {
            // 按右键，检查是否紧挨着艾特标签左边
            const nextSibling = currentNode.nextSibling;
            if (nextSibling && nextSibling.classList && nextSibling.classList.contains('mention-group')) {
                // 紧挨着艾特标签左边，按右键将光标移动到标签右边
                e.preventDefault();
                this.moveCursorAfterMention(nextSibling);
            }
        }
    }
    
    // 将光标移动到艾特标签左边
    moveCursorBeforeMention(mentionGroup) {
        const selection = window.getSelection();
        const range = document.createRange();
        range.setStartBefore(mentionGroup);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
        this.chatApp.messageInput.focus();
    }
    
    // 应用艾特样式
    applyMentionStyle(startIndex, endIndex, mentionText) {
        // 获取当前光标位置
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // 创建艾特组合元素
        const mentionGroup = document.createElement('span');
        mentionGroup.className = 'mention-group';
        mentionGroup.setAttribute('contenteditable', 'false');
        
        // 插入带有样式的@符号和用户名
        const mentionSpan = document.createElement('span');
        mentionSpan.className = 'mention-highlight';
        mentionSpan.textContent = mentionText;
        mentionGroup.appendChild(mentionSpan);
        
        // 插入受保护的空格
        mentionGroup.appendChild(document.createTextNode(' '));
        
        // 获取当前光标所在的文本节点
        const currentNode = range.startContainer;
        
        // 如果当前节点是文本节点
        if (currentNode.nodeType === Node.TEXT_NODE) {
            // 从当前光标位置向前查找@符号
            const currentText = currentNode.textContent;
            const currentOffset = range.startOffset;
            
            // 查找当前节点中最后一个@符号的位置
            let atIndex = -1;
            for (let i = currentOffset - 1; i >= 0; i--) {
                if (currentText[i] === '@') {
                    atIndex = i;
                    break;
                }
            }
            
            if (atIndex !== -1) {
                // 创建一个新的范围，用于删除@符号到光标位置的文本
                const newRange = document.createRange();
                newRange.setStart(currentNode, atIndex);
                newRange.setEnd(currentNode, currentOffset);
                
                // 删除@符号到光标位置的文本
                newRange.deleteContents();
                
                // 在删除位置插入艾特组合元素
                newRange.insertNode(mentionGroup);
            }
        }
        
        this.chatApp.messageInput.focus();
        
        // 隐藏艾特下拉列表
        this.hideMentionDropdown();
    }
    
    // 选择艾特用户
    selectMention(username) {
        // 获取当前光标位置
        const selection = window.getSelection();
        const range = selection.getRangeAt(0);
        
        // 获取当前光标所在的文本节点
        const currentNode = range.startContainer;
        const currentOffset = range.startOffset;
        
        // 如果当前节点是文本节点
        if (currentNode.nodeType === Node.TEXT_NODE) {
            // 从当前光标位置向前查找@符号
            const currentText = currentNode.textContent;
            
            // 查找当前节点中最后一个@符号的位置
            let atIndex = -1;
            for (let i = currentOffset - 1; i >= 0; i--) {
                if (currentText[i] === '@') {
                    atIndex = i;
                    break;
                }
            }
            
            if (atIndex !== -1) {
                // 构建完整的艾特文本
                const mentionText = '@' + username;
                
                // 创建艾特组合元素
                const mentionGroup = document.createElement('span');
                mentionGroup.className = 'mention-group';
                mentionGroup.setAttribute('contenteditable', 'false');
                
                // 插入带有样式的@符号和用户名
                const mentionSpan = document.createElement('span');
                
                // 验证用户是否在线且不是自己
                const isOnline = this.chatApp.onlineUsers.some(user => user.userId === username);
                const isSelf = username === this.chatApp.userId;
                
                if (isOnline && !isSelf) {
                    // 只有在线且非自己的用户才应用样式
                    mentionSpan.className = 'mention-highlight';
                } else {
                    // 不应用样式，保持默认文本样式
                    mentionSpan.className = '';
                }
                
                mentionSpan.textContent = mentionText;
                mentionGroup.appendChild(mentionSpan);
                
                // 插入受保护的空格
                mentionGroup.appendChild(document.createTextNode(' '));
                
                // 创建一个新的范围，用于删除@符号到光标位置的文本
                const newRange = document.createRange();
                newRange.setStart(currentNode, atIndex);
                newRange.setEnd(currentNode, currentOffset);
                
                // 删除@符号到光标位置的文本
                newRange.deleteContents();
                
                // 在删除位置插入艾特组合元素
                newRange.insertNode(mentionGroup);
                
                // 设置光标位置到艾特组合元素右侧
                const finalRange = document.createRange();
                finalRange.setStartAfter(mentionGroup);
                finalRange.collapse(true);
                selection.removeAllRanges();
                selection.addRange(finalRange);
            }
        }
        
        this.chatApp.messageInput.focus();
        this.hideMentionDropdown();
    }
    
    // 更新艾特下拉列表内容
    updateMentionDropdown() {
        if (!this.mentionDropdown) return;
        
        // 清空列表
        this.mentionDropdown.innerHTML = '';
        
        // 过滤匹配的用户，排除当前用户自己
        const filteredUsers = this.chatApp.onlineUsers.filter(user => {
            // 排除当前用户自己
            return user.userId !== this.chatApp.userId && user.userId.toLowerCase().includes(this.mentionPrefix.toLowerCase());
        });
        
        // 添加列表项
        filteredUsers.forEach(user => {
            const userItem = document.createElement('div');
            userItem.className = 'mention-item';
            userItem.textContent = user.userId;
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
            
            userItem.onclick = (e) => {
                // 阻止事件冒泡，避免触发输入框的点击事件
                e.stopPropagation();
                this.selectMention(user.userId);
            };
            
            this.mentionDropdown.appendChild(userItem);
        });
    }
    
    // 在线用户变化时调用的方法
    onOnlineUsersChange() {
        // 当在线用户变化时，更新艾特下拉列表
        if (this.isMentionDropdownVisible) {
            this.updateMentionDropdown();
        }
    }
}

// 导出艾特管理器类
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MentionManager;
} else {
    window.MentionManager = MentionManager;
}