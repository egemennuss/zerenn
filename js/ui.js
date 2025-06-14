/**
 * UI management for LuxChat application
 */

import { formatTime, escapeHtml, getUserInitials, debounce, throttle, storage } from './utils.js';
import textChat from './chat.js';
import voiceChat from './voice.js';
import audioManager from './audio.js';

class UIManager {
    constructor() {
        this.elements = {};
        this.currentTheme = 'dark';
        this.notifications = [];
        this.maxNotifications = 5;
        
        // Settings
        this.settings = {
            notificationSounds: true,
            autoScroll: true,
            showTimestamps: true,
            compactMode: false
        };
        
        this.init();
    }
    
    init() {
        this.cacheElements();
        this.loadSettings();
        this.setupEventListeners();
        this.initializeTheme();
    }
    
    cacheElements() {
        // Main elements
        this.elements = {
            // Loading
            loadingScreen: document.getElementById('loading-screen'),
            app: document.getElementById('app'),
            
            // Header
            roomName: document.getElementById('room-name'),
            userCount: document.getElementById('user-count'),
            themeToggle: document.getElementById('theme-toggle'),
            settingsBtn: document.getElementById('settings-btn'),
            
            // Sidebar
            participantsList: document.getElementById('participants-list'),
            joinVoiceBtn: document.getElementById('join-voice-btn'),
            muteBtn: document.getElementById('mute-btn'),
            leaveVoiceBtn: document.getElementById('leave-voice-btn'),
            voiceStatus: document.getElementById('voice-status'),
            
            // Chat
            messagesContainer: document.getElementById('messages-container'),
            messageInput: document.getElementById('message-input'),
            sendBtn: document.getElementById('send-btn'),
            emojiBtn: document.getElementById('emoji-btn'),
            typingIndicator: document.getElementById('typing-indicator'),
            characterCount: document.getElementById('character-count'),
            
            // Modals
            usernameModal: document.getElementById('username-modal'),
            usernameInput: document.getElementById('username-input'),
            joinChatBtn: document.getElementById('join-chat-btn'),
            settingsModal: document.getElementById('settings-modal'),
            closeSettings: document.getElementById('close-settings'),
            
            // Settings
            microphoneSelect: document.getElementById('microphone-select'),
            volumeRange: document.getElementById('volume-range'),
            volumeDisplay: document.getElementById('volume-display'),
            notificationSounds: document.getElementById('notification-sounds'),
            autoScroll: document.getElementById('auto-scroll'),
            
            // Notifications
            notificationContainer: document.getElementById('notification-container')
        };
    }
    
    setupEventListeners() {
        // Theme toggle
        this.elements.themeToggle?.addEventListener('click', () => {
            this.toggleTheme();
        });
        
        // Settings
        this.elements.settingsBtn?.addEventListener('click', () => {
            this.showSettingsModal();
        });
        
        this.elements.closeSettings?.addEventListener('click', () => {
            this.hideSettingsModal();
        });
        
        // Username modal
        this.elements.usernameInput?.addEventListener('input', (e) => {
            this.validateUsernameInput(e.target.value);
        });
        
        this.elements.usernameInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !this.elements.joinChatBtn.disabled) {
                this.joinChat();
            }
        });
        
        this.elements.joinChatBtn?.addEventListener('click', () => {
            this.joinChat();
        });
        
        // Username suggestions
        document.querySelectorAll('.suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', (e) => {
                const name = e.target.dataset.name;
                this.elements.usernameInput.value = name;
                this.validateUsernameInput(name);
            });
        });
        
        // Message input
        this.elements.messageInput?.addEventListener('input', debounce((e) => {
            this.updateCharacterCount(e.target.value);
            this.handleTyping();
        }, 100));
        
        this.elements.messageInput?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.sendMessage();
            }
        });
        
        this.elements.sendBtn?.addEventListener('click', () => {
            this.sendMessage();
        });
        
        // Voice controls
        this.elements.joinVoiceBtn?.addEventListener('click', () => {
            this.joinVoiceChat();
        });
        
        this.elements.muteBtn?.addEventListener('click', () => {
            this.toggleMute();
        });
        
        this.elements.leaveVoiceBtn?.addEventListener('click', () => {
            this.leaveVoiceChat();
        });
        
        // Settings controls
        this.elements.volumeRange?.addEventListener('input', (e) => {
            this.updateVolume(e.target.value);
        });
        
        this.elements.notificationSounds?.addEventListener('change', (e) => {
            this.settings.notificationSounds = e.target.checked;
            this.saveSettings();
        });
        
        this.elements.autoScroll?.addEventListener('change', (e) => {
            this.settings.autoScroll = e.target.checked;
            this.saveSettings();
        });
        
        // Modal clicks
        this.elements.usernameModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.usernameModal) {
                // Don't allow closing username modal by clicking outside
            }
        });
        
        this.elements.settingsModal?.addEventListener('click', (e) => {
            if (e.target === this.elements.settingsModal) {
                this.hideSettingsModal();
            }
        });
        
        // Window events
        window.addEventListener('beforeunload', () => {
            this.cleanup();
        });
        
        // Responsive sidebar toggle for mobile
        if (window.innerWidth <= 768) {
            this.setupMobileNavigation();
        }
        
        window.addEventListener('resize', debounce(() => {
            this.handleResize();
        }, 250));
    }
    
    setupMobileNavigation() {
        // Add mobile menu button
        const mobileMenuBtn = document.createElement('button');
        mobileMenuBtn.className = 'mobile-menu-btn';
        mobileMenuBtn.innerHTML = '<i class="fas fa-bars"></i>';
        mobileMenuBtn.addEventListener('click', () => {
            this.toggleMobileSidebar();
        });
        
        const headerLeft = document.querySelector('.header-left');
        if (headerLeft) {
            headerLeft.appendChild(mobileMenuBtn);
        }
    }
    
    toggleMobileSidebar() {
        const sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('open');
        }
    }
    
    handleResize() {
        if (window.innerWidth > 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.classList.remove('open');
            }
        }
    }
    
    // Theme management
    initializeTheme() {
        const savedTheme = storage.get('theme', 'dark');
        this.setTheme(savedTheme);
    }
    
    toggleTheme() {
        const newTheme = this.currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
    
    setTheme(theme) {
        this.currentTheme = theme;
        document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
        
        if (this.elements.themeToggle) {
            const icon = this.elements.themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
        
        storage.set('theme', theme);
    }
    
    // Settings management
    loadSettings() {
        const savedSettings = storage.get('settings', {});
        this.settings = { ...this.settings, ...savedSettings };
        
        // Apply settings to UI
        if (this.elements.notificationSounds) {
            this.elements.notificationSounds.checked = this.settings.notificationSounds;
        }
        
        if (this.elements.autoScroll) {
            this.elements.autoScroll.checked = this.settings.autoScroll;
        }
    }
    
    saveSettings() {
        storage.set('settings', this.settings);
    }
    
    showSettingsModal() {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.style.display = 'flex';
            this.updateAudioDevices();
        }
    }
    
    hideSettingsModal() {
        if (this.elements.settingsModal) {
            this.elements.settingsModal.style.display = 'none';
        }
    }
    
    async updateAudioDevices() {
        if (!this.elements.microphoneSelect) return;
        
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioInputs = devices.filter(device => device.kind === 'audioinput');
            
            this.elements.microphoneSelect.innerHTML = '<option value="">Default</option>';
            
            audioInputs.forEach(device => {
                const option = document.createElement('option');
                option.value = device.deviceId;
                option.textContent = device.label || `Microphone ${device.deviceId.substring(0, 5)}`;
                this.elements.microphoneSelect.appendChild(option);
            });
        } catch (error) {
            console.warn('Could not enumerate audio devices:', error);
        }
    }
    
    updateVolume(value) {
        const volume = parseInt(value);
        if (this.elements.volumeDisplay) {
            this.elements.volumeDisplay.textContent = `${volume}%`;
        }
        
        audioManager.setVolume(volume / 100);
    }
    
    // Chat UI management
    validateUsernameInput(value) {
        const trimmed = value.trim();
        const isValid = trimmed.length >= 2 && trimmed.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
        
        if (this.elements.joinChatBtn) {
            this.elements.joinChatBtn.disabled = !isValid;
        }
    }
    
    async joinChat() {
        const username = this.elements.usernameInput?.value.trim();
        if (!username) return;
        
        try {
            // Join text chat
            textChat.joinChat(username);
            
            // Hide username modal
            if (this.elements.usernameModal) {
                this.elements.usernameModal.style.display = 'none';
            }
            
            // Show notification
            this.showNotification('Welcome to LuxChat!', 'success');
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    sendMessage() {
        const text = this.elements.messageInput?.value.trim();
        if (!text) return;
        
        try {
            textChat.sendMessage(text);
            this.elements.messageInput.value = '';
            this.updateCharacterCount('');
            
            if (this.settings.notificationSounds) {
                audioManager.playSound('message');
            }
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    updateCharacterCount(text) {
        if (this.elements.characterCount) {
            this.elements.characterCount.textContent = `${text.length}/500`;
        }
    }
    
    handleTyping() {
        textChat.startTyping();
        
        // Auto-stop typing after user stops typing
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            textChat.stopTyping();
        }, 1000);
    }
    
    // Voice chat UI management
    async joinVoiceChat() {
        try {
            const username = textChat.currentUser;
            if (!username) {
                this.showNotification('Please join the chat first', 'warning');
                return;
            }
            
            await voiceChat.joinVoiceChat(username);
            this.updateVoiceControls(true);
            this.showNotification('Joined voice chat', 'success');
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    async leaveVoiceChat() {
        try {
            await voiceChat.leaveVoiceChat();
            this.updateVoiceControls(false);
            this.showNotification('Left voice chat', 'info');
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    toggleMute() {
        try {
            const isMuted = voiceChat.toggleMute();
            this.updateMuteButton(isMuted);
            
            const status = isMuted ? 'Muted' : 'Unmuted';
            this.showNotification(status, 'info');
            
        } catch (error) {
            this.showNotification(error.message, 'error');
        }
    }
    
    updateVoiceControls(inVoiceChat) {
        if (this.elements.joinVoiceBtn) {
            this.elements.joinVoiceBtn.disabled = inVoiceChat;
        }
        
        if (this.elements.muteBtn) {
            this.elements.muteBtn.disabled = !inVoiceChat;
        }
        
        if (this.elements.leaveVoiceBtn) {
            this.elements.leaveVoiceBtn.disabled = !inVoiceChat;
        }
        
        if (this.elements.voiceStatus) {
            const statusText = this.elements.voiceStatus.querySelector('span');
            const statusIndicator = this.elements.voiceStatus.querySelector('.status-indicator');
            
            if (statusText && statusIndicator) {
                if (inVoiceChat) {
                    statusText.textContent = 'Connected to voice';
                    statusIndicator.style.background = 'var(--success)';
                } else {
                    statusText.textContent = 'Voice chat ready';
                    statusIndicator.style.background = 'var(--text-muted)';
                }
            }
        }
    }
    
    updateMuteButton(isMuted) {
        if (!this.elements.muteBtn) return;
        
        const icon = this.elements.muteBtn.querySelector('i');
        const text = this.elements.muteBtn.querySelector('span');
        
        if (isMuted) {
            this.elements.muteBtn.classList.add('muted');
            if (icon) icon.className = 'fas fa-microphone-slash';
            if (text) text.textContent = 'Unmute';
        } else {
            this.elements.muteBtn.classList.remove('muted');
            if (icon) icon.className = 'fas fa-microphone';
            if (text) text.textContent = 'Mute';
        }
    }
    
    // Message rendering
    renderMessage(message) {
        const messageElement = document.createElement('div');
        messageElement.className = `message ${message.author === textChat.currentUser ? 'own' : ''}`;
        messageElement.dataset.messageId = message.id;
        
        if (message.type === 'system') {
            messageElement.className = 'system-message';
            messageElement.innerHTML = `
                <i class="fas fa-info-circle"></i>
                ${escapeHtml(message.text)}
                <span class="message-time">${formatTime(message.timestamp)}</span>
            `;
        } else {
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = getUserInitials(message.author);
            avatar.style.background = this.getAvatarColor(message.author);
            
            const content = document.createElement('div');
            content.className = 'message-content';
            
            const header = document.createElement('div');
            header.className = 'message-header';
            header.innerHTML = `
                <span class="message-author">${escapeHtml(message.author)}</span>
                <span class="message-time">${formatTime(message.timestamp)}</span>
                ${message.edited ? '<span class="edited-indicator">(edited)</span>' : ''}
            `;
            
            const text = document.createElement('div');
            text.className = 'message-text';
            text.textContent = message.text;
            
            content.appendChild(header);
            content.appendChild(text);
            messageElement.appendChild(avatar);
            messageElement.appendChild(content);
        }
        
        return messageElement;
    }
    
    addMessageToUI(message) {
        const messageElement = this.renderMessage(message);
        
        if (this.elements.messagesContainer) {
            // Remove welcome message if it exists
            const welcomeMessage = this.elements.messagesContainer.querySelector('.welcome-message');
            if (welcomeMessage) {
                welcomeMessage.remove();
            }
            
            this.elements.messagesContainer.appendChild(messageElement);
            
            if (this.settings.autoScroll) {
                this.scrollToBottom();
            }
        }
    }
    
    scrollToBottom() {
        if (this.elements.messagesContainer) {
            this.elements.messagesContainer.scrollTop = this.elements.messagesContainer.scrollHeight;
        }
    }
    
    // Participant rendering
    renderParticipant(participant) {
        const participantElement = document.createElement('div');
        participantElement.className = 'participant';
        participantElement.dataset.username = participant.username;
        
        const avatar = document.createElement('div');
        avatar.className = 'participant-avatar';
        avatar.textContent = getUserInitials(participant.username);
        avatar.style.background = this.getAvatarColor(participant.username);
        
        const info = document.createElement('div');
        info.className = 'participant-info';
        
        const name = document.createElement('div');
        name.className = 'participant-name';
        name.textContent = participant.username;
        
        const status = document.createElement('div');
        status.className = 'participant-status';
        status.textContent = participant.isOnline ? 'Online' : 'Offline';
        
        info.appendChild(name);
        info.appendChild(status);
        participantElement.appendChild(avatar);
        participantElement.appendChild(info);
        
        // Add voice indicator if in voice chat
        if (voiceChat.getParticipant(participant.username)) {
            const voiceIndicator = document.createElement('div');
            voiceIndicator.className = 'participant-voice-indicator';
            participantElement.appendChild(voiceIndicator);
        }
        
        return participantElement;
    }
    
    updateParticipantsList() {
        if (!this.elements.participantsList) return;
        
        this.elements.participantsList.innerHTML = '';
        
        const participants = textChat.getParticipants();
        participants.forEach(participant => {
            const element = this.renderParticipant(participant);
            this.elements.participantsList.appendChild(element);
        });
        
        // Update user count
        this.updateUserCount();
    }
    
    updateUserCount() {
        if (this.elements.userCount) {
            const count = textChat.getOnlineCount();
            this.elements.userCount.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
        }
    }
    
    // Notifications
    showNotification(message, type = 'info', duration = 5000) {
        const notification = this.createNotificationElement(message, type);
        
        if (this.elements.notificationContainer) {
            this.elements.notificationContainer.appendChild(notification);
        }
        
        // Remove after duration
        setTimeout(() => {
            this.removeNotification(notification);
        }, duration);
        
        // Keep only max notifications
        this.cleanupNotifications();
        
        // Play sound if enabled
        if (this.settings.notificationSounds && type !== 'info') {
            audioManager.playSound('notification');
        }
    }
    
    createNotificationElement(message, type) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="notification-icon ${icons[type] || icons.info}"></i>
                <span class="notification-text">${escapeHtml(message)}</span>
            </div>
        `;
        
        // Add click to dismiss
        notification.addEventListener('click', () => {
            this.removeNotification(notification);
        });
        
        return notification;
    }
    
    removeNotification(notification) {
        if (notification && notification.parentNode) {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        }
    }
    
    cleanupNotifications() {
        if (!this.elements.notificationContainer) return;
        
        const notifications = this.elements.notificationContainer.querySelectorAll('.notification');
        
        if (notifications.length > this.maxNotifications) {
            const excess = notifications.length - this.maxNotifications;
            for (let i = 0; i < excess; i++) {
                this.removeNotification(notifications[i]);
            }
        }
    }
    
    // Utility methods
    getAvatarColor(username) {
        const colors = [
            '#667eea', '#764ba2', '#f093fb', '#f5576c',
            '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
            '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
        ];
        
        let hash = 0;
        for (let i = 0; i < username.length; i++) {
            hash = username.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    }
    
    showLoadingScreen() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.style.display = 'flex';
        }
    }
    
    hideLoadingScreen() {
        if (this.elements.loadingScreen) {
            this.elements.loadingScreen.classList.add('hidden');
            
            setTimeout(() => {
                this.elements.loadingScreen.style.display = 'none';
                
                if (this.elements.app) {
                    this.elements.app.style.display = 'flex';
                }
            }, 500);
        }
    }
    
    // Cleanup
    cleanup() {
        // Save any pending data
        this.saveSettings();
        
        // Clean up timeouts
        clearTimeout(this.typingTimeout);
    }
}

// Export singleton instance
export default new UIManager();
