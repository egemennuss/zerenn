/**
 * Zeren Full Version - Complete Multi-User Application
 * Real-time voice and text chat with WebRTC peer-to-peer connections
 */

class ZerenFull {
    constructor() {
        this.currentUser = null;
        this.messages = [];
        this.roomManager = null;
        this.isVoiceConnected = false;
        this.isMuted = false;
        this.typingTimeout = null;
        this.settings = {
            theme: 'dark',
            notificationSounds: true,
            autoScroll: true,
            showTimestamps: true
        };
        
        // Load saved data
        this.loadSettings();
        this.loadMessageHistory();
        
        this.init();
    }
    
    init() {
        console.log('🎉 Zeren Full Version initializing...');
        
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApp());
        } else {
            this.setupApp();
        }
    }
    
    setupApp() {
        this.initializeRoomManager();
        this.setupEventListeners();
        this.setupTheme();
        this.checkForRoomInUrl();
        this.hideLoadingScreen();
        
        // Setup global chat for domain-wide communication
        this.setupGlobalChat();
        
        // Check if user is already logged in
        this.restoreUserSession();
        
        // Show username modal first, then room selection
        setTimeout(() => {
            if (!this.currentUser) {
                this.showUsernameModal();
            } else {
                this.showRoomSelectionModal();
                this.showGlobalRoomOption();
            }
        }, 2000);
        
        console.log('✅ Zeren Full Version ready!');
    }
    
    restoreUserSession() {
        const savedUser = localStorage.getItem('zeren_current_user');
        if (savedUser && savedUser.trim()) {
            this.currentUser = savedUser.trim();
            console.log(`🔄 Restored user session: ${this.currentUser}`);
        }
    }
    
    initializeRoomManager() {
        this.roomManager = new RoomManager();
        
        // Set up room event handlers
        this.roomManager.onRoomJoined = (roomData) => {
            this.onRoomJoined(roomData);
        };
        
        this.roomManager.onRoomLeft = (roomData) => {
            this.onRoomLeft(roomData);
        };
        
        this.roomManager.onParticipantJoined = (participant) => {
            this.onParticipantJoined(participant);
        };
        
        this.roomManager.onParticipantLeft = (participant) => {
            this.onParticipantLeft(participant);
        };
        
        this.roomManager.onRoomError = (error) => {
            this.showNotification(error, 'error');
        };
    }
    
    checkForRoomInUrl() {
        const roomCode = this.roomManager.parseRoomFromUrl();
        if (roomCode) {
            // Show room join modal instead of username modal
            this.showRoomJoinModal(roomCode);
        }
    }
      setupEventListeners() {
        // Room modal event listeners
        this.setupRoomModalEventListeners();
        
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
        
        // Add room management buttons
        this.setupRoomControls();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to toggle voice chat
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (this.isVoiceConnected) {
                    this.leaveVoiceChat();
                } else {
                    this.joinVoiceChat();
                }
            }
            
            // Ctrl/Cmd + M to toggle mute
            if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                this.toggleMute();
            }
        });
    }
    
    setupRoomModalEventListeners() {
        // Tab switching
        const tabBtns = document.querySelectorAll('.tab-btn');
        const tabContents = document.querySelectorAll('.tab-content');
        
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabId = e.target.dataset.tab;
                
                // Update active tab button
                tabBtns.forEach(b => b.classList.remove('active'));
                e.target.classList.add('active');
                
                // Update active tab content
                tabContents.forEach(content => {
                    content.classList.remove('active');
                    if (content.id === `${tabId}-tab`) {
                        content.classList.add('active');
                    }
                });
            });
        });
        
        // Join room
        const joinRoomBtn = document.getElementById('join-room-btn');
        const roomCodeInput = document.getElementById('room-code-input');
        
        if (joinRoomBtn) {
            joinRoomBtn.addEventListener('click', () => {
                const roomCode = roomCodeInput?.value.trim().toUpperCase();
                if (roomCode) {
                    this.joinRoom(roomCode);
                }
            });
        }
        
        if (roomCodeInput) {
            roomCodeInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const roomCode = e.target.value.trim().toUpperCase();
                    if (roomCode) {
                        this.joinRoom(roomCode);
                    }
                }
            });
            
            roomCodeInput.addEventListener('input', (e) => {
                // Convert to uppercase and limit length
                e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
            });
        }
        
        // Create room
        const createRoomBtn = document.getElementById('create-room-btn');
        const roomNameInput = document.getElementById('room-name-input');
        
        if (createRoomBtn) {
            createRoomBtn.addEventListener('click', () => {
                const roomName = roomNameInput?.value.trim() || 'New Room';
                this.createRoom(roomName);
            });
        }
        
        if (roomNameInput) {
            roomNameInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    const roomName = e.target.value.trim() || 'New Room';
                    this.createRoom(roomName);
                }
            });
        }
    }
    
    async joinRoom(roomCode) {
        console.log(`🏠 Attempting to join room: ${roomCode}`);
        console.log(`👤 Current user: ${this.currentUser}`);
        
        if (!this.currentUser) {
            // Try to restore user from localStorage
            this.restoreUserSession();
            
            if (!this.currentUser) {
                this.showNotification('Please enter your username first', 'error');
                this.hideRoomSelectionModal();
                this.showUsernameModal();
                return;
            }
        }
        
        try {
            this.showNotification('Joining room...', 'info');
            const success = await this.roomManager.joinRoom(roomCode, this.currentUser);
            
            if (success) {
                this.hideRoomSelectionModal();
                this.updateRoomInfo();
                this.updateParticipants();
                this.addSystemMessage(`${this.currentUser} joined the room`);
                this.showNotification(`Successfully joined room ${roomCode}!`, 'success');
            } else {
                this.showNotification('Failed to join room. Room may not exist.', 'error');
            }
        } catch (error) {
            console.error('Error joining room:', error);
            this.showNotification('Error joining room: ' + error.message, 'error');
        }
    }
    
    async createRoom(roomName) {
        console.log(`🏗️ Attempting to create room: ${roomName}`);
        console.log(`👤 Current user: ${this.currentUser}`);
        
        if (!this.currentUser) {
            // Try to restore user from localStorage
            this.restoreUserSession();
            
            if (!this.currentUser) {
                this.showNotification('Please enter your username first', 'error');
                this.hideRoomSelectionModal();
                this.showUsernameModal();
                return;
            }
        }
        
        try {
            this.showNotification('Creating room...', 'info');
            const roomData = await this.roomManager.createRoom(this.currentUser, roomName);
            
            if (roomData) {
                this.hideRoomSelectionModal();
                this.updateRoomInfo();
                this.updateParticipants();
                this.addSystemMessage(`${this.currentUser} created room ${roomData.code}`);
                this.showNotification(`Room created! Code: ${roomData.code}`, 'success');
            } else {
                this.showNotification('Failed to create room', 'error');
            }
        } catch (error) {
            console.error('Error creating room:', error);
            this.showNotification('Error creating room: ' + error.message, 'error');
        }
    }
    
    showUsernameModal() {
        const usernameModal = document.getElementById('username-modal');
        if (usernameModal) {
            usernameModal.style.display = 'flex';
        }
    }
    
    hideUsernameModal() {
        const usernameModal = document.getElementById('username-modal');
        if (usernameModal) {
            usernameModal.style.display = 'none';
        }
    }
    
    showRoomSelectionModal() {
        const roomModal = document.getElementById('room-modal');
        if (roomModal) {
            roomModal.style.display = 'flex';
        }
    }
    
    hideRoomSelectionModal() {
        const roomModal = document.getElementById('room-modal');
        if (roomModal) {
            roomModal.style.display = 'none';
        }
    }
    
    checkForRoomInUrl() {
        const roomCode = this.roomManager.parseRoomFromUrl();
        if (roomCode) {
            // Show room join modal instead of username modal
            this.showRoomJoinModal(roomCode);
        }
    }
    
    setupEventListeners() {
        // Room modal event listeners
        this.setupRoomModalEventListeners();
        
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
        
        // Add room management buttons
        this.setupRoomControls();
        
        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            // Ctrl/Cmd + Enter to toggle voice chat
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                if (this.isVoiceConnected) {
                    this.leaveVoiceChat();
                } else {
                    this.joinVoiceChat();
                }
            }
            
            // Ctrl/Cmd + M to toggle mute
            if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
                e.preventDefault();
                this.toggleMute();
            }
        });
    }
    
    setupRoomControls() {
        // Add room controls to header
        const headerRight = document.querySelector('.header-right');
        if (headerRight) {
            // Create room button
            const createRoomBtn = document.createElement('button');
            createRoomBtn.id = 'create-room-btn';
            createRoomBtn.className = 'create-room-btn';
            createRoomBtn.title = 'Create Room';
            createRoomBtn.innerHTML = '<i class="fas fa-plus"></i>';
            createRoomBtn.addEventListener('click', () => this.showCreateRoomModal());
            
            // Join room button
            const joinRoomBtn = document.createElement('button');
            joinRoomBtn.id = 'join-room-btn';
            joinRoomBtn.className = 'join-room-btn';
            joinRoomBtn.title = 'Join Room';
            joinRoomBtn.innerHTML = '<i class="fas fa-door-open"></i>';
            joinRoomBtn.addEventListener('click', () => this.showJoinRoomModal());
            
            // Copy room link button
            const copyLinkBtn = document.createElement('button');
            copyLinkBtn.id = 'copy-link-btn';
            copyLinkBtn.className = 'copy-link-btn';
            copyLinkBtn.title = 'Copy Room Link';
            copyLinkBtn.innerHTML = '<i class="fas fa-link"></i>';
            copyLinkBtn.style.display = 'none';
            copyLinkBtn.addEventListener('click', () => this.copyRoomLink());
            
            headerRight.insertBefore(createRoomBtn, headerRight.firstChild);
            headerRight.insertBefore(joinRoomBtn, headerRight.firstChild);
            headerRight.insertBefore(copyLinkBtn, headerRight.firstChild);
        }
    }
    
    showCreateRoomModal() {
        const modal = this.createModal('Create Room', `
            <div class="room-form">
                <label for="room-name-input">Room Name (optional):</label>
                <input type="text" id="room-name-input" placeholder="My Awesome Room" maxlength="50">
                <div class="room-options">
                    <label>
                        <input type="checkbox" id="room-public" checked>
                        Make room discoverable
                    </label>
                </div>
            </div>
        `, [
            {
                text: 'Cancel',
                class: 'secondary-btn',
                action: () => this.closeModal()
            },
            {
                text: 'Create Room',
                class: 'primary-btn',
                action: () => this.createRoom()
            }
        ]);
        
        this.showModal(modal);
    }
    
    showJoinRoomModal() {
        const modal = this.createModal('Join Room', `
            <div class="room-form">
                <label for="room-code-input">Room Code:</label>
                <input type="text" id="room-code-input" placeholder="ABC123" maxlength="6" style="text-transform: uppercase;">
                <div class="room-history">
                    <h4>Recent Rooms:</h4>
                    <div id="room-history-list"></div>
                </div>
            </div>
        `, [
            {
                text: 'Cancel',
                class: 'secondary-btn',
                action: () => this.closeModal()
            },
            {
                text: 'Join Room',
                class: 'primary-btn',
                action: () => this.joinRoomWithCode()
            }
        ]);
        
        this.showModal(modal);
        this.populateRoomHistory();
    }
    
    showRoomJoinModal(roomCode) {
        const modal = this.createModal('Join Room', `
            <div class="room-form">
                <p>You've been invited to join room: <strong>${roomCode}</strong></p>
                <label for="join-username-input">Enter your username:</label>
                <input type="text" id="join-username-input" placeholder="Your username" maxlength="20">
            </div>
        `, [
            {
                text: 'Cancel',
                class: 'secondary-btn',
                action: () => {
                    this.closeModal();
                    // Clear URL parameter
                    window.history.replaceState({}, document.title, window.location.pathname);
                }
            },
            {
                text: 'Join Room',
                class: 'primary-btn',
                action: () => this.joinRoomFromUrl(roomCode)
            }
        ]);
        
        this.showModal(modal);
    }
    
    async createRoom() {
        if (!this.currentUser) {
            this.showNotification('Please enter your username first', 'warning');
            return;
        }
        
        const roomNameInput = document.getElementById('room-name-input');
        const roomName = roomNameInput ? roomNameInput.value.trim() : '';
        
        try {
            const roomData = await this.roomManager.createRoom(this.currentUser, roomName);
            this.closeModal();
            this.showNotification(`Room created: ${roomData.code}`, 'success');
            this.addSystemMessage(`Created room: ${roomData.code}`);
            this.updateRoomUI();
        } catch (error) {
            this.showNotification('Failed to create room: ' + error.message, 'error');
        }
    }
    
    async joinRoomWithCode() {
        if (!this.currentUser) {
            this.showNotification('Please enter your username first', 'warning');
            return;
        }
        
        const roomCodeInput = document.getElementById('room-code-input');
        const roomCode = roomCodeInput ? roomCodeInput.value.trim().toUpperCase() : '';
        
        if (!roomCode) {
            this.showNotification('Please enter a room code', 'warning');
            return;
        }
        
        try {
            await this.roomManager.joinRoom(roomCode, this.currentUser);
            this.closeModal();
            this.showNotification(`Joined room: ${roomCode}`, 'success');
            this.addSystemMessage(`Joined room: ${roomCode}`);
            this.updateRoomUI();
        } catch (error) {
            this.showNotification('Failed to join room: ' + error.message, 'error');
        }
    }
    
    async joinRoomFromUrl(roomCode) {
        const usernameInput = document.getElementById('join-username-input');
        const username = usernameInput ? usernameInput.value.trim() : '';
        
        if (!this.validateUsername(username)) {
            this.showNotification('Please enter a valid username', 'warning');
            return;
        }
        
        this.currentUser = username;
        
        try {
            await this.roomManager.joinRoom(roomCode, username);
            this.closeModal();
            
            // Hide username modal
            const usernameModal = document.getElementById('username-modal');
            if (usernameModal) {
                usernameModal.style.display = 'none';
            }
            
            this.showNotification(`Joined room: ${roomCode}`, 'success');
            this.addSystemMessage(`${username} joined room: ${roomCode}`);
            this.updateRoomUI();
            
            // Clear URL parameter
            window.history.replaceState({}, document.title, window.location.pathname);
        } catch (error) {
            this.showNotification('Failed to join room: ' + error.message, 'error');
        }
    }
    
    copyRoomLink() {
        const roomLink = this.roomManager.generateRoomLink();
        if (!roomLink) return;
        
        if (navigator.clipboard) {
            navigator.clipboard.writeText(roomLink).then(() => {
                this.showNotification('Room link copied to clipboard!', 'success');
            });
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = roomLink;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            this.showNotification('Room link copied to clipboard!', 'success');
        }
    }
    
    populateRoomHistory() {
        const historyList = document.getElementById('room-history-list');
        if (!historyList) return;
        
        const history = this.roomManager.getRoomHistory();
        
        if (history.length === 0) {
            historyList.innerHTML = '<p class="no-history">No recent rooms</p>';
            return;
        }
        
        historyList.innerHTML = history.map(room => `
            <div class="history-item" data-room-code="${room.code}">
                <div class="room-info">
                    <strong>${room.code}</strong>
                    <span>${room.name}</span>
                </div>
                <button class="join-history-btn" onclick="document.getElementById('room-code-input').value='${room.code}'">
                    Join
                </button>
            </div>
        `).join('');
    }
    
    updateRoomUI() {
        const currentRoom = this.roomManager.getCurrentRoom();
        const roomName = document.getElementById('room-name');
        const copyLinkBtn = document.getElementById('copy-link-btn');
        
        if (currentRoom && roomName) {
            roomName.textContent = `${currentRoom.name} (${currentRoom.code})`;
        }
        
        if (copyLinkBtn) {
            copyLinkBtn.style.display = currentRoom ? 'block' : 'none';
        }
        
        this.updateParticipantsList();
    }
    
    updateRoomInfo() {
        const roomNameEl = document.getElementById('room-name');
        const roomCodeEl = document.getElementById('room-code');
        const roomCodeDisplay = document.getElementById('room-code-display');
        const userCountEl = document.getElementById('user-count');
        
        if (this.roomManager.currentRoom) {
            const room = this.roomManager.currentRoom;
            
            if (roomNameEl) {
                roomNameEl.textContent = room.name || `Room ${room.id}`;
            }
            
            if (roomCodeEl && roomCodeDisplay) {
                roomCodeDisplay.textContent = room.id;
                roomCodeEl.style.display = 'inline';
            }
            
            if (userCountEl) {
                const count = this.roomManager.participants.size;
                userCountEl.textContent = `${count} user${count !== 1 ? 's' : ''} online`;
            }
        }
    }
    
    updateParticipants() {
        const participantsList = document.getElementById('participants-list');
        if (!participantsList) return;
        
        participantsList.innerHTML = '';
        
        this.roomManager.participants.forEach((participant, id) => {
            const participantEl = document.createElement('div');
            participantEl.className = 'participant';
            participantEl.innerHTML = `
                <div class="participant-avatar">
                    <i class="fas fa-user"></i>
                </div>
                <div class="participant-info">
                    <span class="participant-name">${participant.username || 'Anonymous'}</span>
                    <span class="participant-status">${participant.isVoiceConnected ? 'In voice' : 'Online'}</span>
                </div>
                <div class="participant-controls">
                    ${participant.isVoiceConnected && !participant.isMuted ? 
                        '<i class="fas fa-microphone voice-indicator"></i>' : 
                        '<i class="fas fa-microphone-slash voice-indicator muted"></i>'
                    }
                </div>
            `;
            
            participantsList.appendChild(participantEl);
        });
    }
    
    addSystemMessage(message) {
        const messageObj = {
            id: Date.now(),
            type: 'system',
            text: message,
            timestamp: new Date(),
            isSystem: true
        };
        
        this.messages.push(messageObj);
        this.displayMessage(messageObj);
    }
    
    async joinChat() {
        const usernameInput = document.getElementById('username-input');
        const username = usernameInput.value.trim();
        
        if (!this.validateUsername(username)) {
            this.showNotification('Please enter a valid username (2-20 characters, letters/numbers only)', 'error');
            return;
        }
        
        try {
            // Set user and save to localStorage for persistence
            this.currentUser = username;
            localStorage.setItem('zeren_current_user', username);
            
            // Hide username modal
            this.hideUsernameModal();
            
            // Show room selection modal
            this.showRoomSelectionModal();
            this.showGlobalRoomOption();
            
            this.showNotification(`Welcome ${username}! Please select or join a room.`, 'success');
            
        } catch (error) {
            console.error('Error setting username:', error);
            this.showNotification('Failed to set username', 'error');
        }
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
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            text: text,
            sender: this.currentUser,
            timestamp: Date.now(),
            type: 'text',
            userId: this.roomManager?.webrtc?.userId,
            roomCode: this.roomManager?.currentRoom?.code
        };
        
        // Add to our own chat
        this.addMessage(message);
        
        // Clear input
        messageInput.value = '';
        this.updateCharacterCount('');
        
        // Send via WebRTC data channels
        if (this.roomManager?.webrtc) {
            this.roomManager.webrtc.sendMessage(message);
        }
        
        // Also broadcast via localStorage for GitHub Pages
        this.broadcastMessage(message);
        
        // Save to message history
        this.saveMessageHistory();
        
        // Play send sound
        this.playSound('send');
    }
    
    broadcastMessage(message) {
        // Use localStorage for cross-tab communication
        const storageKey = `zeren_message_${message.roomCode}_${Date.now()}`;
        const broadcastData = {
            ...message,
            storageKey: storageKey
        };
        
        localStorage.setItem(storageKey, JSON.stringify(broadcastData));
        
        // Also use BroadcastChannel if available
        if (this.messageChannel) {
            this.messageChannel.postMessage(broadcastData);        }
        
        // Clean up after 10 seconds
        setTimeout(() => {
            localStorage.removeItem(storageKey);
        }, 10000);    }
    
    addMessage(message) {
        // Add message to our messages array
        this.messages.push(message);
        
        // Add to UI
        this.addMessageToUI(message);
        
        // Auto-scroll if enabled
        if (this.settings.autoScroll) {
            this.scrollToBottom();
        }
        
        // Play notification sound
        if (message.sender !== this.currentUser) {
            this.playSound('message');
        }
    }
    
    addSystemMessage(text) {
        const message = {
            id: this.generateId(),
            type: 'system',
            text: text,
            timestamp: Date.now()
        };
        
        this.addMessageToUI(message);
        this.saveMessageHistory();
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
        
        // Auto-scroll to bottom if enabled
        if (this.settings.autoScroll) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
        
        // Keep only recent messages in DOM
        const messages = messagesContainer.querySelectorAll('.message, .system-message');
        if (messages.length > 100) {
            messages[0].remove();
        }
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
        
        if (!this.roomManager.isInRoom()) {
            this.showNotification('Please join a room first', 'warning');
            return;
        }
        
        try {
            await this.roomManager.startVoiceChat();
            this.isVoiceConnected = true;
            this.updateVoiceControls();
            this.addSystemMessage(`${this.currentUser} joined voice chat`);
            this.showNotification('Joined voice chat', 'success');
            this.playSound('join');
        } catch (error) {
            this.showNotification('Could not access microphone: ' + error.message, 'error');
            console.error('Microphone access denied:', error);
        }
    }
    
    leaveVoiceChat() {
        this.roomManager.stopVoiceChat();
        this.isVoiceConnected = false;
        this.isMuted = false;
        this.updateVoiceControls();
        this.addSystemMessage(`${this.currentUser} left voice chat`);
        this.showNotification('Left voice chat', 'info');
        this.playSound('leave');
    }
    
    toggleMute() {
        if (!this.isVoiceConnected) return;
        
        this.isMuted = this.roomManager.toggleMute();
        this.updateMuteButton();
        
        const status = this.isMuted ? 'Muted' : 'Unmuted';
        this.showNotification(status, 'info');
    }
    
    updateVoiceControls() {
        const joinVoiceBtn = document.getElementById('join-voice-btn');
        const muteBtn = document.getElementById('mute-btn');
        const leaveVoiceBtn = document.getElementById('leave-voice-btn');
        const voiceStatus = document.getElementById('voice-status');
        
        if (joinVoiceBtn) joinVoiceBtn.disabled = this.isVoiceConnected || !this.roomManager.isInRoom();
        if (muteBtn) muteBtn.disabled = !this.isVoiceConnected;
        if (leaveVoiceBtn) leaveVoiceBtn.disabled = !this.isVoiceConnected;
        
        if (voiceStatus) {
            const statusText = voiceStatus.querySelector('span');
            const statusIndicator = voiceStatus.querySelector('.status-indicator');
            
            if (statusText && statusIndicator) {
                if (this.isVoiceConnected) {
                    statusText.textContent = 'Connected to voice';
                    statusIndicator.style.background = 'var(--success)';
                } else if (this.roomManager.isInRoom()) {
                    statusText.textContent = 'Voice chat ready';
                    statusIndicator.style.background = 'var(--info)';
                } else {
                    statusText.textContent = 'Join a room for voice';
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
    
    updateParticipantsList() {
        const participantsList = document.getElementById('participants-list');
        if (!participantsList) return;
        
        participantsList.innerHTML = '';
        
        if (this.roomManager.isInRoom()) {
            const participants = this.roomManager.getParticipants();
            participants.forEach(participant => {
                const element = this.createParticipantElement(participant);
                participantsList.appendChild(element);
            });
            
            this.updateUserCount(participants.length);
        } else {
            // Show only current user if not in room
            if (this.currentUser) {
                const element = this.createParticipantElement({
                    username: this.currentUser,
                    isHost: false,
                    connectionState: 'local'
                });
                participantsList.appendChild(element);
                this.updateUserCount(1);
            }
        }
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
        if (participant.isHost) {
            name.innerHTML += ' <i class="fas fa-crown" title="Host"></i>';
        }
        
        const status = document.createElement('div');
        status.className = 'participant-status';
        status.textContent = this.getConnectionStatusText(participant.connectionState);
        
        info.appendChild(name);
        info.appendChild(status);
        element.appendChild(avatar);
        element.appendChild(info);
        
        // Add voice indicator if connected to voice
        if (participant.voiceStream || (participant.username === this.currentUser && this.isVoiceConnected)) {
            const voiceIndicator = document.createElement('div');
            voiceIndicator.className = 'participant-voice-indicator';
            element.appendChild(voiceIndicator);
        }
        
        return element;
    }
    
    getConnectionStatusText(state) {
        switch (state) {
            case 'connected': return 'Connected';
            case 'connecting': return 'Connecting...';
            case 'disconnected': return 'Disconnected';
            case 'local': return 'Local';
            default: return 'Unknown';
        }
    }
    
    updateUserCount(count = null) {
        const userCount = document.getElementById('user-count');
        if (userCount) {
            const actualCount = count !== null ? count : (this.roomManager.isInRoom() ? this.roomManager.getParticipantCount() : 1);
            userCount.textContent = `${actualCount} user${actualCount !== 1 ? 's' : ''} ${this.roomManager.isInRoom() ? 'in room' : 'online'}`;
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
    
    showRoomSelectionModal() {
        const roomModal = document.getElementById('room-modal');
        if (roomModal) {
            roomModal.style.display = 'flex';
        }
    }
    
    hideRoomSelectionModal() {
        const roomModal = document.getElementById('room-modal');
        if (roomModal) {
            roomModal.style.display = 'none';
        }
    }
    
    // Theme management
    setupTheme() {
        this.loadSettings();
        this.applyTheme(this.settings.theme);
        
        // Detect system theme preference
        if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
            if (!localStorage.getItem('zeren_settings')) {
                this.settings.theme = 'dark';
                this.applyTheme('dark');
            }
        }
        
        // Listen for system theme changes
        if (window.matchMedia) {
            window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
                if (!localStorage.getItem('zeren_theme_manual')) {
                    this.settings.theme = e.matches ? 'dark' : 'light';
                    this.applyTheme(this.settings.theme);
                }
            });
        }
    }
    
    toggleTheme() {
        this.settings.theme = this.settings.theme === 'dark' ? 'light' : 'dark';
        this.applyTheme(this.settings.theme);
        this.saveSettings();
        
        // Mark as manually set
        localStorage.setItem('zeren_theme_manual', 'true');
        
        this.showNotification(`Switched to ${this.settings.theme} theme`, 'info');
    }
    
    applyTheme(theme) {
        document.body.className = `${theme}-theme`;
        
        // Update theme toggle icon
        const themeToggle = document.getElementById('theme-toggle');
        if (themeToggle) {
            const icon = themeToggle.querySelector('i');
            if (icon) {
                icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
            }
        }
        
        // Update meta theme color for mobile browsers
        let metaThemeColor = document.querySelector('meta[name=theme-color]');
        if (!metaThemeColor) {
            metaThemeColor = document.createElement('meta');            metaThemeColor.name = 'theme-color';
            document.head.appendChild(metaThemeColor);
        }
        metaThemeColor.content = theme === 'dark' ? '#1a1a1a' : '#ffffff';
    }
    
    // Room event handlers
    onRoomJoined(roomData) {
        console.log('Room joined:', roomData);
        this.updateRoomInfo();
        this.updateParticipants();
        
        // Setup message broadcasting for the room
        this.setupMessageBroadcasting();
        
        // Show welcome message
        this.addSystemMessage(`Welcome to ${roomData.name || roomData.code}!`);
        
        this.showNotification(`Joined room successfully!`, 'success');
    }
    
    onRoomLeft(roomData) {
        console.log('Room left:', roomData);
        this.updateRoomInfo();
        this.updateParticipants();
        this.showNotification('Left room', 'info');
    }
    
    onParticipantJoined(participant) {
        console.log('Participant joined:', participant);
        this.updateParticipants();
        this.addSystemMessage(`${participant.username} joined the room`);
        this.playSound('join');
    }
    
    onParticipantLeft(participant) {
        console.log('Participant left:', participant);
        this.updateParticipants();
        this.addSystemMessage(`${participant.username} left the room`);
        this.playSound('leave');
    }
    
    // Message display
    displayMessage(message) {
        this.addMessageToUI(message);
    }
    
    // Notification and Sound Methods
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
        
        // Add show animation
        setTimeout(() => {
            notification.classList.add('show');
        }, 10);
        
        // Remove after 5 seconds
        setTimeout(() => {
            if (notification.parentNode) {
                notification.classList.remove('show');
                notification.classList.add('hide');
                setTimeout(() => {
                    if (notification.parentNode) {
                        notification.parentNode.removeChild(notification);
                    }
                }, 300);
            }
        }, 5000);
        
        // Play notification sound
        if (this.settings.notificationSounds && type !== 'info') {
            this.playSound('notification');
        }
    }
    
    playSound(type) {
        if (!this.settings.notificationSounds) return;
        
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
            console.log('Audio feedback not available');
        }
    }
    
    // Validation methods
    validateUsername(username) {
        const trimmed = username.trim();
        const isValid = trimmed.length >= 2 && trimmed.length <= 20 && /^[a-zA-Z0-9_-]+$/.test(trimmed);
        
        const joinChatBtn = document.getElementById('join-chat-btn');
        if (joinChatBtn) {
            joinChatBtn.disabled = !isValid;
        }
        
        return isValid;
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
    
    // Debug and utility methods
    clearUserSession() {
        this.currentUser = null;
        localStorage.removeItem('zeren_current_user');
        console.log('🧹 User session cleared');
    }
    
    debugRoomInfo() {
        console.log('🔍 Debug Info:');
        console.log(`Current User: ${this.currentUser}`);
        console.log(`Room Manager: ${this.roomManager ? 'initialized' : 'not initialized'}`);
        console.log(`Current Room: ${this.roomManager?.currentRoom?.code || 'none'}`);
          // Check global room
        const globalRoomKey = `zeren_global_${window.location.hostname}`;
        const globalRoom = localStorage.getItem(globalRoomKey);
        if (globalRoom) {
            const roomData = JSON.parse(globalRoom);
            console.log(`Global Room: ${roomData.id} (${roomData.name})`);
        }
    }

    // Enhanced message broadcasting for GitHub Pages
    setupMessageBroadcasting() {
        // Listen for messages from other tabs/windows
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith('zeren_message_')) {
                this.handleBroadcastMessage(e.newValue);
            }
        });
        
        // Set up BroadcastChannel for same-origin communication
        if ('BroadcastChannel' in window && this.roomManager?.currentRoom) {
            this.messageChannel = new BroadcastChannel(`zeren_messages_${this.roomManager.currentRoom.code}`);
            this.messageChannel.onmessage = (event) => {
                this.handleBroadcastMessage(JSON.stringify(event.data));
            };
        }
    }
    
    handleBroadcastMessage(messageData) {
        if (!messageData) return;
        
        try {
            const message = JSON.parse(messageData);
            
            // Don't show our own messages
            if (message.userId === this.roomManager?.webrtc?.userId) return;
            
            // Only show messages from our current room
            if (message.roomCode !== this.roomManager?.currentRoom?.code) return;
            
            // Add the message to the chat
            this.addMessage({
                id: message.id || Date.now(),
                text: message.text,
                sender: message.sender,
                timestamp: message.timestamp,
                type: 'text'
            });
            
            // Clean up the broadcast message after a short delay
            setTimeout(() => {
                if (message.storageKey) {
                    localStorage.removeItem(message.storageKey);
                }
            }, 5000);
            
        } catch (error) {
            console.warn('Error handling broadcast message:', error);
        }
    }
    
    // Utility functions
    generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    }
    
    scrollToBottom() {
        const messagesContainer = document.getElementById('messages-container');
        if (messagesContainer) {
            messagesContainer.scrollTop = messagesContainer.scrollHeight;
        }
    }
    
    // Utility methods
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
    saveSettings() {
        try {
            localStorage.setItem('zeren_settings', JSON.stringify(this.settings));
        } catch (error) {
            console.warn('Could not save settings:', error);
        }
    }
    
    loadSettings() {
        try {
            const saved = localStorage.getItem('zeren_settings');
            if (saved) {
                this.settings = { ...this.settings, ...JSON.parse(saved) };
            }
        } catch (error) {
            console.warn('Could not load settings:', error);
        }
    }
    
    saveMessageHistory() {
        try {
            // Keep only last 100 messages in storage
            const messagesToSave = this.messages.slice(-100);
            localStorage.setItem('zeren_message_history', JSON.stringify(messagesToSave));
        } catch (error) {
            console.warn('Could not save message history:', error);
        }
    }
    
    loadMessageHistory() {
        try {
            const saved = localStorage.getItem('zeren_message_history');
            if (saved) {
                this.messages = JSON.parse(saved);
                // Display recent messages
                this.messages.slice(-20).forEach(message => {
                    this.addMessageToUI(message);
                });
            }
        } catch (error) {            console.warn('Could not load message history:', error);
        }
    }
    
    // Global room functionality for domain-wide chat    
    setupGlobalChat() {
        // Check if there's a default global room
        var globalRoomKey = `zeren_global_${window.location.hostname}`;
        var globalRoom = localStorage.getItem(globalRoomKey);
        
        if (!globalRoom) {
            // Create a default global room for the domain
            var globalRoomCode = this.generateGlobalRoomCode();
            localStorage.setItem(globalRoomKey, JSON.stringify({
                id: globalRoomCode,
                name: `${window.location.hostname} Chat`,
                isGlobal: true,
                created: Date.now()
            }));
            console.log(`🌐 Created global room for domain: ${globalRoomCode}`);
        }
    }
    
    generateGlobalRoomCode() {
        // Generate a consistent room code based on domain
        var domain = window.location.hostname;
        var hash = 0;
        for (let i = 0; i < domain.length; i++) {
            const char = domain.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        
        // Convert to base36 and ensure it's exactly 6 characters and alphanumeric
        const baseCode = Math.abs(hash).toString(36).toUpperCase();
        let code = baseCode.padStart(6, '0');
          // Ensure only valid characters (A-Z, 0-9) and exactly 6 chars
        code = code.replace(/[^A-Z0-9]/g, '0').substring(0, 6);
        
        return code;
    }
    
    showGlobalRoomOption() {
        var globalRoomKey = `zeren_global_${window.location.hostname}`;
        var globalRoom = localStorage.getItem(globalRoomKey);
        
        if (globalRoom) {
            let roomData;
            try {
                roomData = JSON.parse(globalRoom);
            } catch (error) {
                console.warn('🔧 Corrupted global room data, recreating...', error);
                // Clear corrupted data and recreate
                localStorage.removeItem(globalRoomKey);
                this.setupGlobalChat();
                return;
            }
            
            // Add global room option to the room modal
            setTimeout(() => {
                const joinTab = document.getElementById('join-tab');
                if (joinTab) {
                    const globalOption = document.createElement('div');
                    globalOption.className = 'global-room-option';
                    globalOption.innerHTML = `
                        <div class="global-room-banner">
                            <i class="fas fa-globe"></i>
                            <div>
                                <h4>Join ${roomData.name}</h4>
                                <p>Connect with everyone on this domain (max 6 users)</p>
                            </div>
                        </div>
                        <button class="primary-btn global-join-btn" data-room-code="${roomData.id}">
                            <i class="fas fa-users"></i>
                            Join Global Chat
                        </button>
                    `;
                    
                    // Add event listener for the global join button
                    const globalJoinBtn = globalOption.querySelector('.global-join-btn');
                    globalJoinBtn.addEventListener('click', () => {
                        this.joinGlobalRoom(roomData.id);
                    });
                    
                    joinTab.insertBefore(globalOption, joinTab.firstChild);
                }            }, 100);
        }
    }
    
    async joinGlobalRoom(roomCode) {
        console.log(`🌐 Attempting to join global room: ${roomCode}`);
        console.log(`👤 Current user: ${this.currentUser}`);
        
        if (!this.currentUser) {
            // Try to restore user from localStorage
            this.restoreUserSession();
            
            if (!this.currentUser) {
                this.showNotification('Please enter your username first', 'error');
                this.hideRoomSelectionModal();
                this.showUsernameModal();
                return;
            }
        }
        
        try {
            this.showNotification('Joining global chat...', 'info');
            const success = await this.roomManager.joinRoom(roomCode, this.currentUser);
            
            if (success) {
                this.hideRoomSelectionModal();
                this.updateRoomInfo();
                this.updateParticipants();
                this.addSystemMessage(`${this.currentUser} joined the global chat`);
                this.showNotification('Joined global chat! Say hello to everyone 👋', 'success');
            } else {
                this.showNotification('Failed to join global chat', 'error');
            }
        } catch (error) {
            console.error('Error joining global room:', error);
            this.showNotification('Error joining global chat: ' + error.message, 'error');
        }
    }
    
    // Cleanup
    destroy() {
        if (this.roomManager) {
            this.roomManager.destroy();
        }
          this.saveSettings();
        this.saveMessageHistory();
    }
    
    // Utility method to format timestamps
    formatTime(timestamp) {
        const date = new Date(timestamp);
        const now = new Date();
        const isToday = date.toDateString() === now.toDateString();
        
        if (isToday) {
            // Just show time for today's messages
            return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        } else {
            // Show date and time for older messages
            const options = { 
                month: 'short', 
                day: 'numeric', 
                hour: '2-digit', 
                minute: '2-digit' 
            };
            return date.toLocaleDateString([], options);
        }
    }
}

// Initialize the app when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    window.zerenChat = new ZerenFull();
});

// Handle page unload
window.addEventListener('beforeunload', () => {
    if (window.zerenChat) {
        window.zerenChat.destroy();
    }
});

// Global access for debugging
window.ZerenFull = ZerenFull;
