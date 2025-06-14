/**
 * Text chat functionality for LuxChat
 */

import { EventEmitter, generateId, formatTime, escapeHtml, storage, logError } from './utils.js';

class TextChat extends EventEmitter {
    constructor() {
        super();
        this.messages = [];
        this.participants = new Map();
        this.currentUser = null;
        this.isTyping = false;
        this.typingUsers = new Set();
        this.messageHistory = [];
        this.maxMessages = 1000;
        this.maxMessageLength = 500;
        
        // For GitHub Pages compatibility, we'll use localStorage for persistence
        this.storageKey = 'luxchat_messages';
        this.participantsKey = 'luxchat_participants';
        
        this.init();
    }
    
    init() {
        // Load existing messages and participants
        this.loadFromStorage();
        
        // Set up periodic cleanup
        setInterval(() => {
            this.cleanupOldMessages();
        }, 300000); // 5 minutes
        
        this.emit('ready');
    }
    
    loadFromStorage() {
        try {
            // Load messages
            const savedMessages = storage.get(this.storageKey, []);
            this.messages = savedMessages.slice(-this.maxMessages);
            
            // Load participants
            const savedParticipants = storage.get(this.participantsKey, {});
            this.participants = new Map(Object.entries(savedParticipants));
            
            this.emit('messagesLoaded', this.messages);
            this.emit('participantsLoaded', Array.from(this.participants.values()));
            
        } catch (error) {
            logError(error, 'TextChat.loadFromStorage');
        }
    }
    
    saveToStorage() {
        try {
            // Save messages
            storage.set(this.storageKey, this.messages);
            
            // Save participants
            const participantsObj = Object.fromEntries(this.participants);
            storage.set(this.participantsKey, participantsObj);
            
        } catch (error) {
            logError(error, 'TextChat.saveToStorage');
        }
    }
    
    joinChat(username) {
        try {
            this.currentUser = username;
            
            // Add user to participants
            const participant = {
                id: generateId(),
                username,
                joinedAt: Date.now(),
                isOnline: true,
                lastSeen: Date.now(),
                messageCount: 0
            };
            
            this.participants.set(username, participant);
            
            // Add system message
            const joinMessage = this.createSystemMessage(`${username} joined the chat`);
            this.addMessage(joinMessage);
            
            this.emit('userJoined', participant);
            this.emit('participantCountChanged', this.participants.size);
            
            // Save to storage
            this.saveToStorage();
            
            return participant;
            
        } catch (error) {
            logError(error, 'TextChat.joinChat');
            throw error;
        }
    }
    
    leaveChat(username = null) {
        try {
            const user = username || this.currentUser;
            if (!user) return;
            
            const participant = this.participants.get(user);
            if (participant) {
                participant.isOnline = false;
                participant.lastSeen = Date.now();
                
                // Add system message
                const leaveMessage = this.createSystemMessage(`${user} left the chat`);
                this.addMessage(leaveMessage);
                
                this.emit('userLeft', participant);
                this.emit('participantCountChanged', this.participants.size);
            }
            
            if (user === this.currentUser) {
                this.currentUser = null;
            }
            
            // Save to storage
            this.saveToStorage();
            
        } catch (error) {
            logError(error, 'TextChat.leaveChat');
        }
    }
    
    sendMessage(text) {
        try {
            if (!this.currentUser) {
                throw new Error('User not joined to chat');
            }
            
            if (!text || text.trim().length === 0) {
                throw new Error('Message cannot be empty');
            }
            
            if (text.length > this.maxMessageLength) {
                throw new Error(`Message too long (max ${this.maxMessageLength} characters)`);
            }
            
            const message = {
                id: generateId(),
                type: 'message',
                author: this.currentUser,
                text: text.trim(),
                timestamp: Date.now(),
                edited: false,
                editedAt: null
            };
            
            this.addMessage(message);
            
            // Update participant message count
            const participant = this.participants.get(this.currentUser);
            if (participant) {
                participant.messageCount++;
                participant.lastSeen = Date.now();
            }
            
            // Add to message history for user
            this.addToMessageHistory(text);
            
            // Save to storage
            this.saveToStorage();
            
            this.emit('messageSent', message);
            return message;
            
        } catch (error) {
            logError(error, 'TextChat.sendMessage');
            throw error;
        }
    }
    
    addMessage(message) {
        this.messages.push(message);
        
        // Keep only recent messages
        if (this.messages.length > this.maxMessages) {
            this.messages = this.messages.slice(-this.maxMessages);
        }
        
        this.emit('messageAdded', message);
    }
    
    createSystemMessage(text) {
        return {
            id: generateId(),
            type: 'system',
            text,
            timestamp: Date.now()
        };
    }
    
    editMessage(messageId, newText) {
        try {
            const message = this.messages.find(m => m.id === messageId);
            if (!message) {
                throw new Error('Message not found');
            }
            
            if (message.author !== this.currentUser) {
                throw new Error('Cannot edit other users messages');
            }
            
            if (message.type !== 'message') {
                throw new Error('Cannot edit system messages');
            }
            
            if (!newText || newText.trim().length === 0) {
                throw new Error('Message cannot be empty');
            }
            
            if (newText.length > this.maxMessageLength) {
                throw new Error(`Message too long (max ${this.maxMessageLength} characters)`);
            }
            
            message.text = newText.trim();
            message.edited = true;
            message.editedAt = Date.now();
            
            this.emit('messageEdited', message);
            this.saveToStorage();
            
            return message;
            
        } catch (error) {
            logError(error, 'TextChat.editMessage');
            throw error;
        }
    }
    
    deleteMessage(messageId) {
        try {
            const messageIndex = this.messages.findIndex(m => m.id === messageId);
            if (messageIndex === -1) {
                throw new Error('Message not found');
            }
            
            const message = this.messages[messageIndex];
            if (message.author !== this.currentUser) {
                throw new Error('Cannot delete other users messages');
            }
            
            if (message.type !== 'message') {
                throw new Error('Cannot delete system messages');
            }
            
            this.messages.splice(messageIndex, 1);
            
            this.emit('messageDeleted', messageId);
            this.saveToStorage();
            
            return true;
            
        } catch (error) {
            logError(error, 'TextChat.deleteMessage');
            throw error;
        }
    }
    
    startTyping() {
        if (!this.currentUser || this.isTyping) return;
        
        this.isTyping = true;
        this.emit('typingStarted', this.currentUser);
        
        // Auto-stop typing after 3 seconds
        setTimeout(() => {
            if (this.isTyping) {
                this.stopTyping();
            }
        }, 3000);
    }
    
    stopTyping() {
        if (!this.currentUser || !this.isTyping) return;
        
        this.isTyping = false;
        this.emit('typingStopped', this.currentUser);
    }
    
    userStartedTyping(username) {
        if (username === this.currentUser) return;
        
        this.typingUsers.add(username);
        this.emit('userTypingStarted', username);
        
        // Auto-remove after 5 seconds
        setTimeout(() => {
            this.userStoppedTyping(username);
        }, 5000);
    }
    
    userStoppedTyping(username) {
        if (this.typingUsers.has(username)) {
            this.typingUsers.delete(username);
            this.emit('userTypingStopped', username);
        }
    }
    
    getTypingUsers() {
        return Array.from(this.typingUsers).filter(user => user !== this.currentUser);
    }
    
    addToMessageHistory(message) {
        this.messageHistory.unshift(message);
        
        // Keep only last 50 messages in history
        if (this.messageHistory.length > 50) {
            this.messageHistory = this.messageHistory.slice(0, 50);
        }
    }
    
    getMessageHistory() {
        return [...this.messageHistory];
    }
    
    searchMessages(query, limit = 50) {
        if (!query || query.trim().length === 0) return [];
        
        const searchTerm = query.toLowerCase().trim();
        const results = this.messages
            .filter(message => 
                message.type === 'message' && 
                message.text.toLowerCase().includes(searchTerm)
            )
            .slice(-limit);
            
        return results;
    }
    
    getMessagesByUser(username, limit = 100) {
        return this.messages
            .filter(message => message.author === username)
            .slice(-limit);
    }
    
    getMessagesAfter(timestamp) {
        return this.messages.filter(message => message.timestamp > timestamp);
    }
    
    getMessagesInRange(startTime, endTime) {
        return this.messages.filter(message => 
            message.timestamp >= startTime && message.timestamp <= endTime
        );
    }
    
    cleanupOldMessages() {
        const oneWeekAgo = Date.now() - (7 * 24 * 60 * 60 * 1000);
        const originalLength = this.messages.length;
        
        this.messages = this.messages.filter(message => 
            message.timestamp > oneWeekAgo
        );
        
        if (this.messages.length !== originalLength) {
            this.saveToStorage();
            this.emit('messagesCleanedUp', originalLength - this.messages.length);
        }
    }
    
    clearChat() {
        try {
            this.messages = [];
            this.saveToStorage();
            this.emit('chatCleared');
        } catch (error) {
            logError(error, 'TextChat.clearChat');
        }
    }
    
    exportMessages() {
        try {
            const exportData = {
                messages: this.messages,
                participants: Object.fromEntries(this.participants),
                exportedAt: Date.now(),
                version: '1.0'
            };
            
            return JSON.stringify(exportData, null, 2);
        } catch (error) {
            logError(error, 'TextChat.exportMessages');
            throw error;
        }
    }
    
    importMessages(jsonData) {
        try {
            const data = JSON.parse(jsonData);
            
            if (!data.messages || !Array.isArray(data.messages)) {
                throw new Error('Invalid import data format');
            }
            
            // Merge with existing messages
            const importedMessages = data.messages.filter(msg => 
                !this.messages.some(existing => existing.id === msg.id)
            );
            
            this.messages.push(...importedMessages);
            this.messages.sort((a, b) => a.timestamp - b.timestamp);
            
            // Keep only recent messages
            if (this.messages.length > this.maxMessages) {
                this.messages = this.messages.slice(-this.maxMessages);
            }
            
            this.saveToStorage();
            this.emit('messagesImported', importedMessages.length);
            
            return importedMessages.length;
            
        } catch (error) {
            logError(error, 'TextChat.importMessages');
            throw error;
        }
    }
    
    // Getters
    getMessage(messageId) {
        return this.messages.find(m => m.id === messageId);
    }
    
    getMessages(limit = null) {
        return limit ? this.messages.slice(-limit) : [...this.messages];
    }
    
    getParticipant(username) {
        return this.participants.get(username);
    }
    
    getParticipants() {
        return Array.from(this.participants.values());
    }
    
    getOnlineParticipants() {
        return Array.from(this.participants.values()).filter(p => p.isOnline);
    }
    
    getParticipantCount() {
        return this.participants.size;
    }
    
    getOnlineCount() {
        return this.getOnlineParticipants().length;
    }
    
    // Utility methods
    isUserOnline(username) {
        const participant = this.participants.get(username);
        return participant ? participant.isOnline : false;
    }
    
    getUserMessageCount(username) {
        const participant = this.participants.get(username);
        return participant ? participant.messageCount : 0;
    }
    
    // Cleanup
    destroy() {
        this.saveToStorage();
        this.removeAllListeners();
    }
    
    // State getter
    get state() {
        return {
            messageCount: this.messages.length,
            participantCount: this.participants.size,
            onlineCount: this.getOnlineCount(),
            currentUser: this.currentUser,
            isTyping: this.isTyping,
            typingUsers: this.getTypingUsers()
        };
    }
}

// Export singleton instance
export default new TextChat();
