/**
 * LuxChat - Complete Application in Single File
 * A simple but elegant voice and text chat application
 */

class LuxChatApp {
    constructor() {
        this.currentUser = null;
        this.messages = [];
        this.participants = new Map();
        this.isVoiceConnected = false;
        this.isMuted = false;
        this.typingTimeout = null;
        
        // Load saved data
        this.loadFromStorage();
        
        this.init();
    }
    
    init() {
        console.log('🎉 LuxChat initializing...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }
    
    setupApp() {
        this.setupEventListeners();
        this.setupTheme();
        this.hideLoadingScreen();
        console.log('✅ LuxChat ready!');
    }
    
    setupEventListeners() {
        // Username modal
        const usernameInput = document.getElementById('username-input');
        const joinChatBtn = document.getElementById('join-chat-btn');
        
        if (usernameInput) {
            usernameInput.addEventListener('input', (e) => {
                this.validateUsername(e.target.value);
            });
            
            usernameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !joinChatBtn.disabled) {
                    this.joinChat();
                }
            });
        }
        
        if (joinChatBtn) {
            joinChatBtn.addEventListener('click', () => this.joinChat());
        }
        
        // Username suggestions
        document.querySelectorAll('.suggestion').forEach(suggestion => {
            suggestion.addEventListener('click', (e) => {
                const name = e.target.dataset.name;
                usernameInput.value = name;
                this.validateUsername(name);
            });
        });
        
        // Message input
        const messageInput = document.getElementById('message-input');
        const sendBtn = document.getElementById('send-btn');
        
        if (messageInput) {
            messageInput.addEventListener('input', (e) => {
                this.updateCharacterCount(e.target.value);
                this.handleTyping();
            });
            
            messageInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendMessage();
                }
            });
        }
        
        if (sendBtn) {
            sendBtn.addEventListener('click', () => this.sendMessage());
        }
        
        // Voice controls
        const joinVoiceBtn = document.getElementById('join-voice-btn');
        const muteBtn = document.getElementById('mute-btn');
        const leaveVoiceBtn = document.getElementById('leave-voice-btn');
        
        if (joinVoiceBtn) {
            joinVoiceBtn.addEventListener('click', () => this.joinVoiceChat());
        }
        
        if (muteBtn) {
            muteBtn.addEventListener('click', () => this.toggleMute());
        }
        
        if (leaveVoiceBtn) {
            leaveVoiceBtn.addEventListener('click', () => this.leaveVoiceChat());
        }
        
        // Theme toggle
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
        }
        
        // Settings
        const settingsBtn = document.getElementById('settings-btn');
        const closeSettings = document.getElementById('close-settings');
        const settingsModal = document.getElementById('settings-modal');
        
        if (settingsBtn) {
            settingsBtn.addEventListener('click', () => this.showSettings());
        }
        
        if (closeSettings) {
            closeSettings.addEventListener('click', () => this.hideSettings());
        }
        
        if (settingsModal) {
            settingsModal.addEventListener('click', (e) => {
                if (e.target === settingsModal) {
                    this.hideSettings();
                }
            });
        }
    }
    
    setupTheme() {
        const savedTheme = localStorage.getItem('luxchat_theme') || 'dark';
        this.setTheme(savedTheme);
    }
    
    setTheme(theme) {
        document.body.className = theme === 'dark' ? 'dark-theme' : 'light-theme';
        
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
        
        localStorage.setItem('luxchat_theme', theme);
    }
    
    toggleTheme() {
        const currentTheme = document.body.classList.contains('dark-theme') ? 'dark' : 'light';
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        this.setTheme(newTheme);
    }
    
    hideLoadingScreen() {
        const loadingScreen = document.getElementById('loading-screen');
        const app = document.getElementById('app');
        
        setTimeout(() => {
            if (loadingScreen) {
                loadingScreen.classList.add('hidden');
                setTimeout(() => {
                    loadingScreen.style.display = 'none';
                    if (app) {
                        app.style.display = 'flex';
                    }
                }, 500);
            }
        }, 1500);
    }
    
    validateUsername(username) {
        const trimmed = username.trim();
        const isValid = trimmed.length >= 2 && trimmed.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
        
        const joinChatBtn = document.getElementById('join-chat-btn');
        if (joinChatBtn) {
            joinChatBtn.disabled = !isValid;
        }
        
        return isValid;
    }
    
    joinChat() {
        const usernameInput = document.getElementById('username-input');
        const username = usernameInput.value.trim();
        
        if (!this.validateUsername(username)) {
            this.showNotification('Please enter a valid username (2-20 characters, letters/numbers only)', 'error');
            return;
        }
        
        this.currentUser = username;
        
        // Add user to participants
        this.participants.set(username, {
            username,
            joinedAt: Date.now(),
            isOnline: true,
            messageCount: 0
        });
        
        // Hide username modal
        const usernameModal = document.getElementById('username-modal');
        if (usernameModal) {
            usernameModal.style.display = 'none';
        }
        
        // Add welcome message
        this.addSystemMessage(`${username} joined the chat`);
        
        // Update UI
        this.updateParticipantsList();
        this.updateUserCount();
        
        this.showNotification(`Welcome to LuxChat, ${username}!`, 'success');
        this.saveToStorage();
    }
    
    sendMessage() {
        if (!this.currentUser) {
            this.showNotification('Please join the chat first', 'warning');
            return;
        }
        
        const messageInput = document.getElementById('message-input');
        const text = messageInput.value.trim();
        
        if (!text) return;
        
        if (text.length > 500) {
            this.showNotification('Message too long (max 500 characters)', 'error');
            return;
        }
        
        const message = {
            id: this.generateId(),
            type: 'message',
            author: this.currentUser,
            text: text,
            timestamp: Date.now()
        };
        
        this.messages.push(message);
        this.addMessageToUI(message);
        
        // Update participant message count
        const participant = this.participants.get(this.currentUser);
        if (participant) {
            participant.messageCount++;
        }
        
        // Clear input
        messageInput.value = '';
        this.updateCharacterCount('');
        
        // Save and play sound
        this.saveToStorage();
        this.playSound('message');
    }
    
    addSystemMessage(text) {
        const message = {
            id: this.generateId(),
            type: 'system',
            text: text,
            timestamp: Date.now()
        };
        
        this.messages.push(message);
        this.addMessageToUI(message);
        this.saveToStorage();
    }
    
    addMessageToUI(message) {
        const messagesContainer = document.getElementById('messages-container');
        if (!messagesContainer) return;
        
        // Remove welcome message if it exists
        const welcomeMessage = messagesContainer.querySelector('.welcome-message');
        if (welcomeMessage) {
            welcomeMessage.remove();
        }
        
        const messageElement = this.createMessageElement(message);
        messagesContainer.appendChild(messageElement);
        
        // Auto-scroll to bottom
        messagesContainer.scrollTop = messagesContainer.scrollHeight;
    }
    
    createMessageElement(message) {
        const messageElement = document.createElement('div');
        
        if (message.type === 'system') {
            messageElement.className = 'system-message';
            messageElement.innerHTML = `
                <i class="fas fa-info-circle"></i>
                ${this.escapeHtml(message.text)}
                <span class="message-time">${this.formatTime(message.timestamp)}</span>
            `;
        } else {
            messageElement.className = `message ${message.author === this.currentUser ? 'own' : ''}`;
            
            const avatar = document.createElement('div');
            avatar.className = 'message-avatar';
            avatar.textContent = this.getInitials(message.author);
            avatar.style.background = this.getAvatarColor(message.author);
            
            const content = document.createElement('div');
            content.className = 'message-content';
            
            const header = document.createElement('div');
            header.className = 'message-header';
            header.innerHTML = `
                <span class="message-author">${this.escapeHtml(message.author)}</span>
                <span class="message-time">${this.formatTime(message.timestamp)}</span>
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
    
    updateCharacterCount(text) {
        const characterCount = document.getElementById('character-count');
        if (characterCount) {
            characterCount.textContent = `${text.length}/500`;
        }
    }
    
    handleTyping() {
        // Simple typing indicator simulation
        clearTimeout(this.typingTimeout);
        this.typingTimeout = setTimeout(() => {
            // Stop typing after 1 second of no input
        }, 1000);
    }
    
    async joinVoiceChat() {
        if (!this.currentUser) {
            this.showNotification('Please join the chat first', 'warning');
            return;
        }
        
        try {
            // Request microphone permission
            await navigator.mediaDevices.getUserMedia({ audio: true });
            
            this.isVoiceConnected = true;
            this.updateVoiceControls();
            this.addSystemMessage(`${this.currentUser} joined voice chat`);
            this.showNotification('Joined voice chat', 'success');
            this.playSound('join');
            
            // Simulate other users in voice chat
            setTimeout(() => {
                this.simulateVoiceParticipant('DemoUser1');
            }, 2000);
            
        } catch (error) {
            this.showNotification('Could not access microphone', 'error');
            console.error('Microphone access denied:', error);
        }
    }
    
    leaveVoiceChat() {
        this.isVoiceConnected = false;
        this.isMuted = false;
        this.updateVoiceControls();
        this.addSystemMessage(`${this.currentUser} left voice chat`);
        this.showNotification('Left voice chat', 'info');
        this.playSound('leave');
    }
    
    toggleMute() {
        if (!this.isVoiceConnected) return;
        
        this.isMuted = !this.isMuted;
        this.updateMuteButton();
        
        const status = this.isMuted ? 'Muted' : 'Unmuted';
        this.showNotification(status, 'info');
    }
    
    updateVoiceControls() {
        const joinVoiceBtn = document.getElementById('join-voice-btn');
        const muteBtn = document.getElementById('mute-btn');
        const leaveVoiceBtn = document.getElementById('leave-voice-btn');
        const voiceStatus = document.getElementById('voice-status');
        
        if (joinVoiceBtn) joinVoiceBtn.disabled = this.isVoiceConnected;
        if (muteBtn) muteBtn.disabled = !this.isVoiceConnected;
        if (leaveVoiceBtn) leaveVoiceBtn.disabled = !this.isVoiceConnected;
        
        if (voiceStatus) {
            const statusText = voiceStatus.querySelector('span');
            const statusIndicator = voiceStatus.querySelector('.status-indicator');
            
            if (statusText && statusIndicator) {
                if (this.isVoiceConnected) {
                    statusText.textContent = 'Connected to voice';
                    statusIndicator.style.background = 'var(--success)';
                } else {
                    statusText.textContent = 'Voice chat ready';
                    statusIndicator.style.background = 'var(--text-muted)';
                }
            }
        }
    }
    
    updateMuteButton() {
        const muteBtn = document.getElementById('mute-btn');
        if (!muteBtn) return;
        
        const icon = muteBtn.querySelector('i');
        const text = muteBtn.querySelector('span');
        
        if (this.isMuted) {
            muteBtn.classList.add('muted');
            if (icon) icon.className = 'fas fa-microphone-slash';
            if (text) text.textContent = 'Unmute';
        } else {
            muteBtn.classList.remove('muted');
            if (icon) icon.className = 'fas fa-microphone';
            if (text) text.textContent = 'Mute';
        }
    }
    
    simulateVoiceParticipant(username) {
        // Add simulated participant for demo
        this.participants.set(username, {
            username,
            joinedAt: Date.now(),
            isOnline: true,
            messageCount: 0,
            inVoice: true
        });
        
        this.updateParticipantsList();
        this.addSystemMessage(`${username} joined voice chat`);
    }
    
    updateParticipantsList() {
        const participantsList = document.getElementById('participants-list');
        if (!participantsList) return;
        
        participantsList.innerHTML = '';
        
        for (const [username, participant] of this.participants) {
            const element = this.createParticipantElement(participant);
            participantsList.appendChild(element);
        }
        
        this.updateUserCount();
    }
    
    createParticipantElement(participant) {
        const element = document.createElement('div');
        element.className = 'participant';
        
        const avatar = document.createElement('div');
        avatar.className = 'participant-avatar';
        avatar.textContent = this.getInitials(participant.username);
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
        element.appendChild(avatar);
        element.appendChild(info);
        
        // Add voice indicator if in voice chat
        if (participant.inVoice || (participant.username === this.currentUser && this.isVoiceConnected)) {
            const voiceIndicator = document.createElement('div');
            voiceIndicator.className = 'participant-voice-indicator';
            element.appendChild(voiceIndicator);
        }
        
        return element;
    }
    
    updateUserCount() {
        const userCount = document.getElementById('user-count');
        if (userCount) {
            const count = this.participants.size;
            userCount.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
        }
    }
    
    showSettings() {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.style.display = 'flex';
        }
    }
    
    hideSettings() {
        const settingsModal = document.getElementById('settings-modal');
        if (settingsModal) {
            settingsModal.style.display = 'none';
        }
    }
    
    showNotification(message, type = 'info') {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
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
                <span class="notification-text">${this.escapeHtml(message)}</span>
            </div>
        `;
        
        container.appendChild(notification);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                notification.style.transform = 'translateX(100%)';
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
        
        // Play notification sound
        if (type !== 'info') {
            this.playSound('notification');
        }
    }
    
    playSound(type) {
        // Create simple audio feedback using Web Audio API
        try {
            const audioContext = new (window.AudioContext || window.webkitAudioContext)();
            const oscillator = audioContext.createOscillator();
            const gainNode = audioContext.createGain();
            
            oscillator.connect(gainNode);
            gainNode.connect(audioContext.destination);
            
            const frequencies = {
                message: 1000,
                join: 800,
                leave: 400,
                notification: 1200
            };
            
            oscillator.frequency.value = frequencies[type] || 1000;
            oscillator.type = 'sine';
            
            gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.1);
            
            oscillator.start(audioContext.currentTime);
            oscillator.stop(audioContext.currentTime + 0.1);
            
        } catch (error) {
            // Audio context not supported or blocked
            console.log('Audio feedback not available');
        }
    }
    
    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const diffInMinutes = Math.floor((now - date) / (1000 * 60));
        
        if (diffInMinutes < 1) {
            return 'now';
        } else if (diffInMinutes < 60) {
            return `${diffInMinutes}m ago`;
        } else if (diffInMinutes < 1440) {
            const hours = Math.floor(diffInMinutes / 60);
            return `${hours}h ago`;
        } else {
            return date.toLocaleDateString();
        }
    }
    
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
    
    getInitials(username) {
        if (!username) return '?';
        const words = username.split(' ');
        if (words.length >= 2) {
            return (words[0][0] + words[1][0]).toUpperCase();
        }
        return username.slice(0, 2).toUpperCase();
    }
    
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
    
    // Storage functions
    saveToStorage() {
        try {
            localStorage.setItem('luxchat_messages', JSON.stringify(this.messages.slice(-1000)));
            localStorage.setItem('luxchat_participants', JSON.stringify(Array.from(this.participants.entries())));
        } catch (error) {
            console.warn('Could not save to localStorage:', error);
        }
    }
    
    loadFromStorage() {
        try {
            const savedMessages = localStorage.getItem('luxchat_messages');
            if (savedMessages) {
                this.messages = JSON.parse(savedMessages);
            }
            
            const savedParticipants = localStorage.getItem('luxchat_participants');
            if (savedParticipants) {
                this.participants = new Map(JSON.parse(savedParticipants));
            }
        } catch (error) {
            console.warn('Could not load from localStorage:', error);
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.luxChat = new LuxChatApp();
});

// Global access for debugging
window.LuxChatApp = LuxChatApp;
