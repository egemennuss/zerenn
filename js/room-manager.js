/**
 * Room Management System for Zeren
 * Handles room creation, joining, and participant management
 */

class RoomManager {
    constructor() {
        this.currentRoom = null;
        this.participants = new Map();
        this.webrtc = null;
        this.isHost = false;
        
        // Event callbacks
        this.onRoomJoined = null;
        this.onRoomLeft = null;
        this.onParticipantJoined = null;
        this.onParticipantLeft = null;
        this.onRoomError = null;
        
        this.init();
    }
    
    init() {
        // Initialize WebRTC manager
        this.webrtc = new WebRTCManager();
        
        // Set up WebRTC event handlers
        this.webrtc.onPeerJoined = (peerInfo) => {
            this.addParticipant(peerInfo.userId, peerInfo);
        };
        
        this.webrtc.onPeerLeft = (peerId) => {
            this.removeParticipant(peerId);
        };
        
        this.webrtc.onMessage = (peerId, message) => {
            // Forward message to chat system
            if (window.zerenChat && window.zerenChat.handleRemoteMessage) {
                window.zerenChat.handleRemoteMessage(message);
            }
        };
        
        this.webrtc.onVoiceStream = (peerId, stream) => {
            // Handle incoming voice stream
            this.handleIncomingVoiceStream(peerId, stream);
        };
        
        this.webrtc.onConnectionStateChange = (peerId, state) => {
            this.updateParticipantConnectionState(peerId, state);
        };

        console.log('🏠 Room Manager initialized');
    }

    generateRoomCode() {
        // Generate a 6-character room code
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 6; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    async createRoom(username, roomName = null) {
        try {
            const roomCode = this.generateRoomCode();
            const roomData = {
                code: roomCode,
                name: roomName || `${username}'s Room`,
                host: username,
                created: Date.now(),
                participants: 1,
                isPublic: true
            };
            this.currentRoom = roomData;
            this.isHost = true;
            await this.webrtc.joinRoom(roomCode, username);
            this.addParticipant(this.webrtc.userId, {
                userId: this.webrtc.userId,
                username: username,
                isHost: true,
                joinedAt: Date.now(),
                connectionState: 'connected'
            });
            this.saveRoomToHistory(roomData);
            if (this.onRoomJoined) {
                this.onRoomJoined(roomData);
            }
            return roomData;
        } catch (error) {
            console.error('Error creating room:', error);
            if (this.onRoomError) {
                this.onRoomError('Failed to create room: ' + error.message);
            }
            throw error;
        }
    }

    async joinRoom(roomCode, username) {
        try {
            // Make room joining more forgiving
            roomCode = roomCode.toUpperCase().trim();
            
            // Accept various room code formats (be more flexible)
            if (roomCode.length < 4) {
                throw new Error('Room code too short (minimum 4 characters)');
            }
            
            // Normalize room code for consistency
            if (roomCode.length > 6) {
                roomCode = roomCode.substring(0, 6);
            }
            
            // Pad short codes with zeros
            if (roomCode.length < 6) {
                roomCode = roomCode.padStart(6, '0');
            }
            
            console.log(`🏠 Attempting to join room: ${roomCode} as ${username}`);
            
            // Try to join via WebRTC (this will simulate connection for now)
            await this.webrtc.joinRoom(roomCode, username);
            
            const roomData = {
                code: roomCode,
                name: `Room ${roomCode}`,
                host: null,
                joined: Date.now(),
                participants: 1
            };
            
            this.currentRoom = roomData;
            this.isHost = false;
            
            // Add ourselves as a participant
            this.addParticipant(this.webrtc.userId, {
                userId: this.webrtc.userId,
                username: username,
                isHost: false,
                joinedAt: Date.now(),
                connectionState: 'connected'
            });
            
            // Store room info
            this.saveRoomToHistory(roomData);
            
            // For GitHub Pages - simulate finding other participants
            this.simulateRoomParticipants(roomCode, username);
            
            if (this.onRoomJoined) {
                this.onRoomJoined(roomData);
            }
            
            console.log(`✅ Successfully joined room: ${roomCode}`);
            return true;
            
        } catch (error) {
            console.error('Error joining room:', error);
            if (this.onRoomError) {
                this.onRoomError('Failed to join room: ' + error.message);
            }
            throw error;
        }
    }
    
    // Simulate other participants in the room for demonstration
    simulateRoomParticipants(roomCode, currentUsername) {
        // Check if there are other participants in localStorage
        const roomParticipants = this.webrtc.getRoomParticipants(roomCode);
        
        // Count real participants (excluding ourselves)
        const otherParticipants = Object.keys(roomParticipants).filter(id => id !== this.webrtc.userId);
        
        console.log(`👥 Found ${otherParticipants.length} other participants in room ${roomCode}`);
        
        // Update participant count
        if (this.currentRoom) {
            this.currentRoom.participants = otherParticipants.length + 1;
        }
        
        // Add other participants to our local list
        for (const participantId of otherParticipants) {
            const participantInfo = roomParticipants[participantId];
            if (participantInfo && participantInfo.username !== currentUsername) {
                this.addParticipant(participantId, {
                    userId: participantId,
                    username: participantInfo.username,
                    isHost: false,
                    joinedAt: participantInfo.timestamp,
                    connectionState: 'connected'
                });
            }
        }
    }
    
    leaveRoom() {
        if (!this.currentRoom) return;
        
        // Leave WebRTC room
        this.webrtc.leaveRoom();
        
        // Clear participants
        this.participants.clear();
        
        if (this.onRoomLeft) {
            this.onRoomLeft(this.currentRoom);
        }
        
        this.currentRoom = null;
        this.isHost = false;
    }
    
    addParticipant(userId, participantData) {
        this.participants.set(userId, participantData);
        
        if (this.onParticipantJoined) {
            this.onParticipantJoined(participantData);
        }
        
        // Update room participant count
        if (this.currentRoom) {
            this.currentRoom.participants = this.participants.size;
        }
    }
    
    removeParticipant(userId) {
        const participant = this.participants.get(userId);
        if (participant) {
            this.participants.delete(userId);
            
            if (this.onParticipantLeft) {
                this.onParticipantLeft(participant);
            }
            
            // Update room participant count
            if (this.currentRoom) {
                this.currentRoom.participants = this.participants.size;
            }
        }
    }
    
    updateParticipantConnectionState(userId, state) {
        const participant = this.participants.get(userId);
        if (participant) {
            participant.connectionState = state;
            
            // Notify UI of connection state change
            if (window.luxChat && window.luxChat.updateParticipantUI) {
                window.luxChat.updateParticipantUI(participant);
            }
        }
    }
    
    handleIncomingVoiceStream(peerId, stream) {
        const participant = this.participants.get(peerId);
        if (participant) {
            participant.voiceStream = stream;
            
            // Create audio element for the stream
            const audio = document.createElement('audio');
            audio.srcObject = stream;
            audio.autoplay = true;
            audio.playsInline = true;
            audio.style.display = 'none';
            document.body.appendChild(audio);
            
            participant.audioElement = audio;
            
            // Update UI
            if (window.luxChat && window.luxChat.updateParticipantUI) {
                window.luxChat.updateParticipantUI(participant);
            }
        }
    }
    
    async startVoiceChat() {
        try {
            const stream = await this.webrtc.startVoiceChat();
            return stream;
        } catch (error) {
            console.error('Error starting voice chat:', error);
            throw error;
        }
    }
    
    stopVoiceChat() {
        this.webrtc.stopVoiceChat();
        
        // Remove audio elements
        this.participants.forEach(participant => {
            if (participant.audioElement) {
                participant.audioElement.remove();
                delete participant.audioElement;
                delete participant.voiceStream;
            }
        });
    }
    
    toggleMute() {
        return this.webrtc.toggleMute();
    }
    
    sendMessage(message) {
        if (!this.currentRoom) {
            throw new Error('Not in a room');
        }
        
        return this.webrtc.sendMessage(message);
    }
    
    getParticipants() {
        return Array.from(this.participants.values());
    }
    
    getParticipantCount() {
        return this.participants.size;
    }
    
    getCurrentRoom() {
        return this.currentRoom;
    }
    
    isInRoom() {
        return !!this.currentRoom;
    }
    
    getRoomCode() {
        return this.currentRoom ? this.currentRoom.code : null;
    }
    
    saveRoomToHistory(roomData) {
        try {
            let history = JSON.parse(localStorage.getItem('zeren_room_history') || '[]');
            
            // Remove existing entry for this room
            history = history.filter(room => room.code !== roomData.code);
            
            // Add new entry at the beginning
            history.unshift({
                code: roomData.code,
                name: roomData.name,
                lastJoined: Date.now()
            });
            
            // Keep only last 10 rooms
            history = history.slice(0, 10);
            
            localStorage.setItem('zeren_room_history', JSON.stringify(history));
        } catch (error) {
            console.warn('Could not save room to history:', error);
        }
    }
    
    getRoomHistory() {
        try {
            return JSON.parse(localStorage.getItem('zeren_room_history') || '[]');
        } catch (error) {
            console.warn('Could not load room history:', error);
            return [];
        }
    }
    
    clearRoomHistory() {
        localStorage.removeItem('zeren_room_history');
    }
    
    // Room discovery (for finding public rooms)
    getPublicRooms() {
        // In a real implementation, this would query a server
        // For GitHub Pages, we'll simulate with local data
        return [
            {
                code: 'DEMO01',
                name: 'General Chat',
                participants: 3,
                isPublic: true
            },
            {
                code: 'DEMO02',
                name: 'Tech Talk',
                participants: 5,
                isPublic: true
            }
        ];
    }
    
    // Utility methods
    generateRoomLink(roomCode = null) {
        const code = roomCode || this.getRoomCode();
        if (!code) return null;
        
        const baseUrl = window.location.origin + window.location.pathname;
        return `${baseUrl}?room=${code}`;
    }
    
    parseRoomFromUrl() {
        const urlParams = new URLSearchParams(window.location.search);
        return urlParams.get('room');
    }
    
    // Cleanup
    destroy() {
        this.leaveRoom();
        
        if (this.webrtc) {
            this.webrtc.leaveRoom();
        }
        
        this.participants.clear();
    }
}

// Export for use in other modules
window.RoomManager = RoomManager;
