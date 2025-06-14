/**
 * WebRTC Manager for LuxChat - GitHub Pages Compatible
 * Enhanced peer-to-peer connections with multiple discovery mechanisms
 */

class WebRTCManager {
    constructor() {
        this.localStream = null;
        this.peerConnections = new Map();
        this.dataChannels = new Map();
        this.isInitialized = false;
        this.userId = this.generateUserId();
        this.roomId = null;
        this.broadcastChannel = null;
        this.discoveryInterval = null;
        this.heartbeatInterval = null;
        
        // Configuration for WebRTC
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' },
                { urls: 'stun:stun3.l.google.com:19302' },
                { urls: 'stun:stun4.l.google.com:19302' }
            ]
        };
        
        // Event callbacks
        this.onPeerJoined = null;
        this.onPeerLeft = null;
        this.onMessage = null;
        this.onVoiceStream = null;
        this.onConnectionStateChange = null;
        
        this.init();
    }
    
    init() {
        // Check WebRTC support
        if (!this.isWebRTCSupported()) {
            console.warn('WebRTC not supported, falling back to simulation mode');
            return;
        }
        
        this.isInitialized = true;
        console.log('🔗 WebRTC Manager initialized');
    }
    
    isWebRTCSupported() {
        return !!(window.RTCPeerConnection && 
                  navigator.mediaDevices && 
                  navigator.mediaDevices.getUserMedia);
    }
    
    generateUserId() {
        return 'user_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    async joinRoom(roomId, username) {
        this.roomId = roomId;
        this.username = username;
        
        if (!this.isInitialized) {
            throw new Error('WebRTC not supported');
        }
        
        console.log(`🔗 Joining room ${roomId} as ${username}`);
        
        // Enhanced peer discovery for GitHub Pages
        await this.initializeRoomWithDiscovery(roomId);
        
        return true;
    }
    
    async initializeRoomWithDiscovery(roomId) {
        // Store our presence in the room
        const roomInfo = {
            roomId,
            userId: this.userId,
            username: this.username,
            timestamp: Date.now(),
            isOnline: true
        };
        
        // Create a room-specific key for better isolation
        const participantKey = `luxchat_participant_${roomId}_${this.userId}`;
        
        // Store our participant info
        localStorage.setItem(participantKey, JSON.stringify(roomInfo));
        
        // Get existing participants using the new discovery method
        const existingParticipants = this.getRoomParticipants(roomId);
        console.log(`👥 Found ${Object.keys(existingParticipants).length} existing participants`);
        
        // Set up multiple discovery mechanisms
        this.setupBroadcastChannel(roomId);
        this.setupStorageListener(roomId);
        this.setupPeriodicDiscovery(roomId);
        
        // Announce our presence
        this.announcePresence(roomId);
        
        // Start heartbeat to maintain presence
        this.startHeartbeat(roomId);
        
        // Clean up old participants
        this.cleanupOldParticipants(roomId);
        
        // Try to connect to existing participants
        for (const participantId of Object.keys(existingParticipants)) {
            const participantInfo = existingParticipants[participantId];
            if (participantId !== this.userId && participantInfo.isOnline) {
                console.log(`🤝 Attempting to connect to ${participantInfo.username}`);
                await this.connectToPeer(participantId, participantInfo);
            }
        }
    }
    
    getRoomParticipants(roomId) {
        const participants = {};
        
        // Scan localStorage for participant keys
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`luxchat_participant_${roomId}_`)) {
                try {
                    const participantData = JSON.parse(localStorage.getItem(key));
                    const participantId = key.split('_').pop();
                    
                    // Only include recent participants (within last 2 minutes)
                    if (Date.now() - participantData.timestamp < 120000) {
                        participants[participantId] = participantData;
                    } else {
                        // Clean up old entries
                        localStorage.removeItem(key);
                    }
                } catch (error) {
                    console.warn('Error parsing participant data:', error);
                    localStorage.removeItem(key);
                }
            }
        }
        
        return participants;
    }
    
    setupBroadcastChannel(roomId) {
        // Use BroadcastChannel for same-origin communication
        if ('BroadcastChannel' in window) {
            this.broadcastChannel = new BroadcastChannel(`luxchat_${roomId}`);
            this.broadcastChannel.onmessage = (event) => {
                this.handleBroadcastMessage(event.data);
            };
            console.log(`📡 BroadcastChannel setup for room ${roomId}`);
        }
    }
    
    setupStorageListener(roomId) {
        // Listen for storage changes (other tabs/windows joining)
        window.addEventListener('storage', (e) => {
            if (e.key && e.key.startsWith(`luxchat_participant_${roomId}_`)) {
                this.handleStorageUpdate(e);
            }
        });
    }
    
    setupPeriodicDiscovery(roomId) {
        // Periodically check for new participants
        this.discoveryInterval = setInterval(() => {
            const participants = this.getRoomParticipants(roomId);
            for (const participantId of Object.keys(participants)) {
                const participantInfo = participants[participantId];
                if (participantId !== this.userId && 
                    !this.peerConnections.has(participantId) && 
                    participantInfo.isOnline &&
                    Date.now() - participantInfo.timestamp < 60000) {
                    
                    console.log(`🔍 Discovered new participant: ${participantInfo.username}`);
                    this.connectToPeer(participantId, participantInfo);
                }
            }
        }, 5000); // Check every 5 seconds
    }
    
    announcePresence(roomId) {
        const announcement = {
            type: 'user_joined',
            userId: this.userId,
            username: this.username,
            roomId: roomId,
            timestamp: Date.now()
        };
        
        // Broadcast via BroadcastChannel
        if (this.broadcastChannel) {
            this.broadcastChannel.postMessage(announcement);
        }
        
        // Also use temporary localStorage for cross-window discovery
        const announcementKey = `luxchat_announcement_${roomId}_${Date.now()}`;
        localStorage.setItem(announcementKey, JSON.stringify(announcement));
        
        // Clean up announcement after 30 seconds
        setTimeout(() => {
            localStorage.removeItem(announcementKey);
        }, 30000);
    }
    
    handleBroadcastMessage(data) {
        if (data.type === 'user_joined' && data.userId !== this.userId && data.roomId === this.roomId) {
            console.log(`📢 User ${data.username} joined room via broadcast`);
            // Attempt to connect to this user
            this.connectToPeer(data.userId, {
                userId: data.userId,
                username: data.username,
                timestamp: data.timestamp,
                isOnline: true
            });
        }
    }
    
    handleStorageUpdate(event) {
        if (event.newValue) {
            try {
                const participantData = JSON.parse(event.newValue);
                if (participantData.userId !== this.userId && !this.peerConnections.has(participantData.userId)) {
                    console.log(`💾 New participant detected via storage: ${participantData.username}`);
                    this.connectToPeer(participantData.userId, participantData);
                }
            } catch (error) {
                console.warn('Error parsing storage update:', error);
            }
        }
    }
    
    async connectToPeer(peerId, peerInfo) {
        if (this.peerConnections.has(peerId)) {
            console.log(`Already connected to ${peerId}`);
            return;
        }
        
        console.log(`🔗 Connecting to peer ${peerInfo.username} (${peerId})`);
        
        const peerConnection = new RTCPeerConnection(this.configuration);
        this.peerConnections.set(peerId, peerConnection);
        
        // Set up peer connection event handlers
        this.setupPeerConnectionHandlers(peerConnection, peerId, peerInfo);
        
        // Create data channel for messaging
        const dataChannel = peerConnection.createDataChannel('messages');
        this.setupDataChannelHandlers(dataChannel, peerId);
        this.dataChannels.set(peerId, dataChannel);
        
        // Add local stream if we have one
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                peerConnection.addTrack(track, this.localStream);
            });
        }
        
        // Simplified connection process for GitHub Pages
        // In a real implementation, this would use a signaling server
        console.log(`✨ Simulating connection to ${peerInfo.username}`);
        
        // Simulate successful connection
        setTimeout(() => {
            if (this.onPeerJoined) {
                this.onPeerJoined(peerInfo);
            }
        }, 1000);
    }
    
    setupPeerConnectionHandlers(peerConnection, peerId, peerInfo) {
        peerConnection.onicecandidate = (event) => {
            if (event.candidate) {
                console.log(`🧊 ICE candidate for ${peerId}`);
                // In a real implementation, send this to signaling server
            }
        };
        
        peerConnection.ontrack = (event) => {
            console.log(`🎵 Received remote stream from ${peerInfo.username}`);
            if (this.onVoiceStream) {
                this.onVoiceStream(peerId, event.streams[0]);
            }
        };
        
        peerConnection.onconnectionstatechange = () => {
            const state = peerConnection.connectionState;
            console.log(`🔗 Connection state with ${peerInfo.username}: ${state}`);
            
            if (this.onConnectionStateChange) {
                this.onConnectionStateChange(peerId, state);
            }
            
            if (state === 'disconnected' || state === 'failed' || state === 'closed') {
                this.handlePeerDisconnection(peerId);
            }
        };
        
        peerConnection.ondatachannel = (event) => {
            const channel = event.channel;
            this.setupDataChannelHandlers(channel, peerId);
        };
    }
    
    setupDataChannelHandlers(dataChannel, peerId) {
        dataChannel.onopen = () => {
            console.log(`💬 Data channel opened with ${peerId}`);
        };
        
        dataChannel.onmessage = (event) => {
            if (this.onMessage) {
                this.onMessage(peerId, JSON.parse(event.data));
            }
        };
        
        dataChannel.onclose = () => {
            console.log(`💬 Data channel closed with ${peerId}`);
        };
    }
    
    handlePeerDisconnection(peerId) {
        const peerConnection = this.peerConnections.get(peerId);
        if (peerConnection) {
            peerConnection.close();
            this.peerConnections.delete(peerId);
        }
        
        this.dataChannels.delete(peerId);
        
        if (this.onPeerLeft) {
            this.onPeerLeft(peerId);
        }
    }
    
    startHeartbeat(roomId) {
        this.heartbeatInterval = setInterval(() => {
            // Update our timestamp to show we're still active
            const participantKey = `luxchat_participant_${roomId}_${this.userId}`;
            const currentData = localStorage.getItem(participantKey);
            
            if (currentData) {
                try {
                    const data = JSON.parse(currentData);
                    data.timestamp = Date.now();
                    localStorage.setItem(participantKey, JSON.stringify(data));
                } catch (error) {
                    console.warn('Error updating heartbeat:', error);
                }
            }
        }, 15000); // Update every 15 seconds
    }
    
    cleanupOldParticipants(roomId) {
        // Clean up participants who haven't been active for more than 2 minutes
        const cutoffTime = Date.now() - 120000;
        
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            if (key && key.startsWith(`luxchat_participant_${roomId}_`)) {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    if (data.timestamp < cutoffTime) {
                        localStorage.removeItem(key);
                        console.log(`🧹 Cleaned up old participant: ${data.username}`);
                    }
                } catch (error) {
                    localStorage.removeItem(key);
                }
            }
        }
    }
    
    sendMessage(message) {
        const messageData = {
            type: 'chat_message',
            message: message,
            timestamp: Date.now(),
            sender: this.username
        };
        
        // Send to all connected peers
        this.dataChannels.forEach((channel, peerId) => {
            if (channel.readyState === 'open') {
                channel.send(JSON.stringify(messageData));
            }
        });
    }
    
    async startVoiceChat() {
        try {
            this.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: false
            });
            
            // Add tracks to all existing peer connections
            this.peerConnections.forEach((peerConnection, peerId) => {
                this.localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, this.localStream);
                });
            });
            
            return this.localStream;
        } catch (error) {
            console.error('Error starting voice chat:', error);
            throw error;
        }
    }
    
    stopVoiceChat() {
        if (this.localStream) {
            this.localStream.getTracks().forEach(track => {
                track.stop();
            });
            this.localStream = null;
        }
    }
    
    leaveRoom() {
        // Clean up our presence
        if (this.roomId) {
            const participantKey = `luxchat_participant_${this.roomId}_${this.userId}`;
            localStorage.removeItem(participantKey);
        }
        
        // Close all peer connections
        this.peerConnections.forEach((peerConnection, peerId) => {
            peerConnection.close();
        });
        this.peerConnections.clear();
        this.dataChannels.clear();
        
        // Clean up intervals
        if (this.discoveryInterval) {
            clearInterval(this.discoveryInterval);
            this.discoveryInterval = null;
        }
        
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
        
        // Close broadcast channel
        if (this.broadcastChannel) {
            this.broadcastChannel.close();
            this.broadcastChannel = null;
        }
        
        // Stop voice chat
        this.stopVoiceChat();
        
        this.roomId = null;
        this.username = null;
    }
    
    destroy() {
        this.leaveRoom();
    }
    
    // Get connection statistics
    getConnectionStats() {
        return {
            userId: this.userId,
            roomId: this.roomId,
            connectedPeers: this.peerConnections.size,
            hasVoice: !!this.localStream,
            isInitialized: this.isInitialized
        };
    }
}
