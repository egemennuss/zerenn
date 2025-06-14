/**
 * Voice chat functionality using WebRTC
 */

import { EventEmitter, logError, supportsWebRTC, generateId } from './utils.js';
import audioManager from './audio.js';

class VoiceChat extends EventEmitter {
    constructor() {
        super();
        this.isConnected = false;
        this.isInVoiceChat = false;
        this.participants = new Map();
        this.peerConnections = new Map();
        this.localStream = null;
        this.configuration = {
            iceServers: [
                { urls: 'stun:stun.l.google.com:19302' },
                { urls: 'stun:stun1.l.google.com:19302' },
                { urls: 'stun:stun2.l.google.com:19302' }
            ]
        };
        
        // For GitHub Pages compatibility, we'll simulate WebRTC behavior
        this.simulationMode = true;
        this.currentUser = null;
        
        this.init();
    }
    
    init() {
        if (!supportsWebRTC()) {
            console.warn('WebRTC not supported, using simulation mode');
            this.simulationMode = true;
        }
        
        // Listen to audio manager events
        audioManager.on('recordingStarted', (stream) => {
            this.localStream = stream;
            this.emit('localStreamStarted', stream);
        });
        
        audioManager.on('recordingStopped', () => {
            this.localStream = null;
            this.emit('localStreamStopped');
        });
        
        audioManager.on('muteToggled', (isMuted) => {
            this.emit('muteChanged', isMuted);
            this.broadcastMuteStatus(isMuted);
        });
        
        this.emit('ready');
    }
    
    async joinVoiceChat(username) {
        try {
            this.currentUser = username;
            
            if (this.simulationMode) {
                return this.joinVoiceChatSimulation(username);
            }
            
            // Real WebRTC implementation
            await audioManager.startRecording();
            this.isInVoiceChat = true;
            
            // Add self to participants
            this.participants.set(username, {
                id: generateId(),
                username,
                isMuted: false,
                isLocal: true,
                stream: this.localStream,
                audioLevel: 0
            });
            
            this.emit('joinedVoiceChat', username);
            this.emit('participantJoined', this.participants.get(username));
            
            return true;
            
        } catch (error) {
            logError(error, 'VoiceChat.joinVoiceChat');
            this.emit('error', error);
            throw error;
        }
    }
    
    async joinVoiceChatSimulation(username) {
        try {
            // Simulate audio permission request
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Simulate starting audio recording
            await audioManager.startRecording();
            this.isInVoiceChat = true;
            
            // Add self to participants
            this.participants.set(username, {
                id: generateId(),
                username,
                isMuted: false,
                isLocal: true,
                stream: this.localStream,
                audioLevel: 0
            });
            
            // Simulate other participants joining
            setTimeout(() => {
                this.simulateParticipantJoin('DemoUser1');
            }, 2000);
            
            setTimeout(() => {
                this.simulateParticipantJoin('DemoUser2');
            }, 4000);
            
            this.emit('joinedVoiceChat', username);
            this.emit('participantJoined', this.participants.get(username));
            
            // Play join sound
            audioManager.playSound('join');
            
            return true;
            
        } catch (error) {
            logError(error, 'VoiceChat.joinVoiceChatSimulation');
            throw error;
        }
    }
    
    simulateParticipantJoin(username) {
        if (this.participants.has(username)) return;
        
        const participant = {
            id: generateId(),
            username,
            isMuted: Math.random() > 0.7, // 30% chance of being muted
            isLocal: false,
            stream: null,
            audioLevel: 0
        };
        
        this.participants.set(username, participant);
        this.emit('participantJoined', participant);
        
        // Simulate audio levels
        this.simulateAudioLevels(username);
    }
    
    simulateAudioLevels(username) {
        const participant = this.participants.get(username);
        if (!participant || participant.isLocal) return;
        
        const updateLevel = () => {
            if (!this.participants.has(username) || !this.isInVoiceChat) return;
            
            // Generate random audio level (simulate speaking)
            const speaking = Math.random() > 0.8; // 20% chance of speaking
            const level = speaking ? Math.random() * 0.8 + 0.2 : Math.random() * 0.1;
            
            participant.audioLevel = level;
            this.emit('audioLevel', username, level);
            
            setTimeout(updateLevel, 100 + Math.random() * 200);
        };
        
        setTimeout(updateLevel, Math.random() * 2000);
    }
    
    async leaveVoiceChat() {
        try {
            if (!this.isInVoiceChat) return;
            
            // Stop local recording
            await audioManager.stopRecording();
            
            // Close all peer connections
            for (const [peerId, connection] of this.peerConnections) {
                connection.close();
            }
            this.peerConnections.clear();
            
            // Clear participants
            this.participants.clear();
            
            this.isInVoiceChat = false;
            this.localStream = null;
            
            this.emit('leftVoiceChat');
            
            // Play leave sound
            audioManager.playSound('leave');
            
        } catch (error) {
            logError(error, 'VoiceChat.leaveVoiceChat');
        }
    }
    
    toggleMute() {
        if (!this.isInVoiceChat) return false;
        
        const isMuted = audioManager.toggleMute();
        
        // Update local participant
        if (this.currentUser && this.participants.has(this.currentUser)) {
            this.participants.get(this.currentUser).isMuted = isMuted;
        }
        
        return isMuted;
    }
    
    broadcastMuteStatus(isMuted) {
        // In real implementation, this would send the mute status to other peers
        // For simulation, we just emit the event
        this.emit('muteBroadcast', this.currentUser, isMuted);
    }
    
    // WebRTC Peer Connection Management
    async createPeerConnection(peerId) {
        if (this.simulationMode) return null;
        
        try {
            const peerConnection = new RTCPeerConnection(this.configuration);
            
            // Add local stream tracks
            if (this.localStream) {
                this.localStream.getTracks().forEach(track => {
                    peerConnection.addTrack(track, this.localStream);
                });
            }
            
            // Handle remote stream
            peerConnection.ontrack = (event) => {
                const [stream] = event.streams;
                this.handleRemoteStream(peerId, stream);
            };
            
            // Handle ICE candidates
            peerConnection.onicecandidate = (event) => {
                if (event.candidate) {
                    this.emit('iceCandidate', peerId, event.candidate);
                }
            };
            
            // Handle connection state changes
            peerConnection.onconnectionstatechange = () => {
                this.emit('connectionStateChange', peerId, peerConnection.connectionState);
                
                if (peerConnection.connectionState === 'failed') {
                    this.handleConnectionFailure(peerId);
                }
            };
            
            this.peerConnections.set(peerId, peerConnection);
            return peerConnection;
            
        } catch (error) {
            logError(error, 'VoiceChat.createPeerConnection');
            throw error;
        }
    }
    
    async createOffer(peerId) {
        if (this.simulationMode) return null;
        
        try {
            const peerConnection = await this.createPeerConnection(peerId);
            const offer = await peerConnection.createOffer();
            await peerConnection.setLocalDescription(offer);
            
            return offer;
            
        } catch (error) {
            logError(error, 'VoiceChat.createOffer');
            throw error;
        }
    }
    
    async createAnswer(peerId, offer) {
        if (this.simulationMode) return null;
        
        try {
            const peerConnection = await this.createPeerConnection(peerId);
            await peerConnection.setRemoteDescription(offer);
            
            const answer = await peerConnection.createAnswer();
            await peerConnection.setLocalDescription(answer);
            
            return answer;
            
        } catch (error) {
            logError(error, 'VoiceChat.createAnswer');
            throw error;
        }
    }
    
    async handleAnswer(peerId, answer) {
        if (this.simulationMode) return;
        
        try {
            const peerConnection = this.peerConnections.get(peerId);
            if (peerConnection) {
                await peerConnection.setRemoteDescription(answer);
            }
        } catch (error) {
            logError(error, 'VoiceChat.handleAnswer');
        }
    }
    
    async handleIceCandidate(peerId, candidate) {
        if (this.simulationMode) return;
        
        try {
            const peerConnection = this.peerConnections.get(peerId);
            if (peerConnection) {
                await peerConnection.addIceCandidate(candidate);
            }
        } catch (error) {
            logError(error, 'VoiceChat.handleIceCandidate');
        }
    }
    
    handleRemoteStream(peerId, stream) {
        // Create audio element for remote stream
        const audioElement = audioManager.createAudioElement(stream);
        
        // Update participant with stream
        for (const [username, participant] of this.participants) {
            if (participant.id === peerId) {
                participant.stream = stream;
                participant.audioElement = audioElement;
                this.emit('participantStreamUpdate', participant);
                break;
            }
        }
    }
    
    handleConnectionFailure(peerId) {
        // Remove failed connection
        const connection = this.peerConnections.get(peerId);
        if (connection) {
            connection.close();
            this.peerConnections.delete(peerId);
        }
        
        // Remove participant
        for (const [username, participant] of this.participants) {
            if (participant.id === peerId) {
                if (participant.audioElement) {
                    audioManager.removeAudioElement(participant.audioElement);
                }
                this.participants.delete(username);
                this.emit('participantLeft', participant);
                break;
            }
        }
    }
    
    // Voice activity detection
    startVoiceActivityDetection() {
        if (!this.isInVoiceChat) return;
        
        audioManager.on('audioLevel', (level) => {
            if (this.currentUser && this.participants.has(this.currentUser)) {
                this.participants.get(this.currentUser).audioLevel = level;
                this.emit('audioLevel', this.currentUser, level);
            }
        });
    }
    
    // Utility methods
    getParticipant(username) {
        return this.participants.get(username);
    }
    
    getParticipants() {
        return Array.from(this.participants.values());
    }
    
    getParticipantCount() {
        return this.participants.size;
    }
    
    isSpeaking(username, threshold = 0.1) {
        const participant = this.participants.get(username);
        return participant ? participant.audioLevel > threshold : false;
    }
    
    // Cleanup
    destroy() {
        this.leaveVoiceChat();
        this.removeAllListeners();
    }
    
    // Getters
    get state() {
        return {
            isConnected: this.isConnected,
            isInVoiceChat: this.isInVoiceChat,
            participantCount: this.participants.size,
            participants: this.getParticipants(),
            currentUser: this.currentUser,
            simulationMode: this.simulationMode
        };
    }
}

// Export singleton instance
export default new VoiceChat();
