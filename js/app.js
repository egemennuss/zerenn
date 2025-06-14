/**
 * Main application entry point for LuxChat
 */

import { logError } from './utils.js';
import textChat from './chat.js';
import voiceChat from './voice.js';
import audioManager from './audio.js';
import uiManager from './ui.js';

class LuxChatApp {
    constructor() {
        this.isInitialized = false;
        this.version = '1.0.0';
        this.init();
    }
    
    async init() {
        try {
            console.log(`🎉 LuxChat v${this.version} starting up...`);
            
            // Show loading screen
            uiManager.showLoadingScreen();
            
            // Initialize components in order
            await this.initializeAudio();
            await this.initializeTextChat();
            await this.initializeVoiceChat();
            await this.setupEventListeners();
            
            // Hide loading screen and show app
            setTimeout(() => {
                uiManager.hideLoadingScreen();
                this.isInitialized = true;
                console.log('✅ LuxChat initialized successfully');
            }, 2000);
            
        } catch (error) {
            logError(error, 'LuxChatApp.init');
            this.handleInitializationError(error);
        }
    }
    
    async initializeAudio() {
        return new Promise((resolve, reject) => {
            audioManager.on('ready', () => {
                console.log('🔊 Audio manager initialized');
                resolve();
            });
            
            audioManager.on('error', (error) => {
                console.warn('⚠️ Audio initialization failed:', error.message);
                // Don't reject - app can work without audio
                resolve();
            });
            
            // Timeout after 5 seconds
            setTimeout(() => {
                console.warn('⏰ Audio initialization timeout');
                resolve();
            }, 5000);
        });
    }
    
    async initializeTextChat() {
        return new Promise((resolve) => {
            textChat.on('ready', () => {
                console.log('💬 Text chat initialized');
                resolve();
            });
            
            // Timeout after 2 seconds
            setTimeout(() => {
                console.warn('⏰ Text chat initialization timeout');
                resolve();
            }, 2000);
        });
    }
    
    async initializeVoiceChat() {
        return new Promise((resolve) => {
            voiceChat.on('ready', () => {
                console.log('🎤 Voice chat initialized');
                resolve();
            });
            
            // Timeout after 3 seconds
            setTimeout(() => {
                console.warn('⏰ Voice chat initialization timeout');
                resolve();
            }, 3000);
        });
    }
    
    setupEventListeners() {
        // Text chat events
        textChat.on('messageAdded', (message) => {
            uiManager.addMessageToUI(message);
        });
        
        textChat.on('userJoined', (participant) => {
            uiManager.updateParticipantsList();
            uiManager.showNotification(`${participant.username} joined the chat`, 'success');
        });
        
        textChat.on('userLeft', (participant) => {
            uiManager.updateParticipantsList();
            uiManager.showNotification(`${participant.username} left the chat`, 'info');
        });
        
        textChat.on('participantCountChanged', () => {
            uiManager.updateUserCount();
        });
        
        textChat.on('typingStarted', (username) => {
            this.updateTypingIndicator();
        });
        
        textChat.on('typingStopped', (username) => {
            this.updateTypingIndicator();
        });
        
        // Voice chat events
        voiceChat.on('joinedVoiceChat', (username) => {
            uiManager.updateVoiceControls(true);
            audioManager.playSound('join');
        });
        
        voiceChat.on('leftVoiceChat', () => {
            uiManager.updateVoiceControls(false);
            audioManager.playSound('leave');
        });
        
        voiceChat.on('participantJoined', (participant) => {
            uiManager.updateParticipantsList();
            if (!participant.isLocal) {
                uiManager.showNotification(`${participant.username} joined voice chat`, 'success');
            }
        });
        
        voiceChat.on('participantLeft', (participant) => {
            uiManager.updateParticipantsList();
            uiManager.showNotification(`${participant.username} left voice chat`, 'info');
        });
        
        voiceChat.on('muteChanged', (isMuted) => {
            uiManager.updateMuteButton(isMuted);
        });
        
        voiceChat.on('audioLevel', (username, level) => {
            this.updateAudioVisualizer(username, level);
        });
        
        // Audio manager events
        audioManager.on('devicesUpdated', (devices) => {
            uiManager.updateAudioDevices();
        });
        
        audioManager.on('volumeChanged', (volume) => {
            // Update UI volume controls if needed
        });
        
        // Error handling
        this.setupErrorHandlers();
        
        // Performance monitoring
        this.setupPerformanceMonitoring();
    }
    
    setupErrorHandlers() {
        // Global error handler
        window.addEventListener('error', (event) => {
            logError(new Error(event.message), 'Global error handler');
            uiManager.showNotification('An unexpected error occurred', 'error');
        });
        
        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            logError(new Error(event.reason), 'Unhandled promise rejection');
            uiManager.showNotification('An unexpected error occurred', 'error');
        });
        
        // Component error handlers
        textChat.on('error', (error) => {
            logError(error, 'TextChat error');
            uiManager.showNotification(`Chat error: ${error.message}`, 'error');
        });
        
        voiceChat.on('error', (error) => {
            logError(error, 'VoiceChat error');
            uiManager.showNotification(`Voice chat error: ${error.message}`, 'error');
        });
        
        audioManager.on('error', (error) => {
            logError(error, 'AudioManager error');
            uiManager.showNotification(`Audio error: ${error.message}`, 'error');
        });
    }
    
    setupPerformanceMonitoring() {
        // Monitor memory usage
        if (performance.memory) {
            setInterval(() => {
                const memory = performance.memory;
                const usedMB = Math.round(memory.usedJSHeapSize / 1024 / 1024);
                const limitMB = Math.round(memory.jsHeapSizeLimit / 1024 / 1024);
                
                if (usedMB > limitMB * 0.8) {
                    console.warn('⚠️ High memory usage detected:', `${usedMB}MB / ${limitMB}MB`);
                }
            }, 30000); // Check every 30 seconds
        }
        
        // Monitor frame rate
        let frameCount = 0;
        let lastTime = performance.now();
        
        const checkFPS = () => {
            frameCount++;
            const currentTime = performance.now();
            
            if (currentTime - lastTime >= 1000) {
                const fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
                
                if (fps < 30) {
                    console.warn('⚠️ Low frame rate detected:', fps, 'FPS');
                }
                
                frameCount = 0;
                lastTime = currentTime;
            }
            
            requestAnimationFrame(checkFPS);
        };
        
        requestAnimationFrame(checkFPS);
    }
    
    handleInitializationError(error) {
        console.error('❌ Failed to initialize LuxChat:', error);
        
        // Show error message to user
        document.body.innerHTML = `
            <div style="
                display: flex;
                align-items: center;
                justify-content: center;
                min-height: 100vh;
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                font-family: 'Inter', sans-serif;
                text-align: center;
                padding: 2rem;
            ">
                <div>
                    <h1 style="font-size: 3rem; margin-bottom: 1rem;">⚠️</h1>
                    <h2 style="font-size: 1.5rem; margin-bottom: 1rem;">Initialization Failed</h2>
                    <p style="margin-bottom: 2rem; opacity: 0.9;">
                        LuxChat failed to start properly. Please refresh the page and try again.
                    </p>
                    <button onclick="window.location.reload()" style="
                        background: rgba(255, 255, 255, 0.2);
                        border: 2px solid white;
                        color: white;
                        padding: 1rem 2rem;
                        border-radius: 0.5rem;
                        font-size: 1rem;
                        cursor: pointer;
                        transition: all 0.3s ease;
                    ">
                        Refresh Page
                    </button>
                    <details style="margin-top: 2rem; text-align: left;">
                        <summary style="cursor: pointer; margin-bottom: 1rem;">Technical Details</summary>
                        <pre style="
                            background: rgba(0, 0, 0, 0.3);
                            padding: 1rem;
                            border-radius: 0.5rem;
                            font-size: 0.875rem;
                            overflow: auto;
                            white-space: pre-wrap;
                        ">${error.stack || error.message}</pre>
                    </details>
                </div>
            </div>
        `;
    }
    
    updateTypingIndicator() {
        const typingUsers = textChat.getTypingUsers();
        const indicator = document.getElementById('typing-indicator');
        
        if (!indicator) return;
        
        if (typingUsers.length === 0) {
            indicator.textContent = '';
        } else if (typingUsers.length === 1) {
            indicator.textContent = `${typingUsers[0]} is typing...`;
        } else if (typingUsers.length === 2) {
            indicator.textContent = `${typingUsers[0]} and ${typingUsers[1]} are typing...`;
        } else {
            indicator.textContent = `${typingUsers.length} users are typing...`;
        }
    }
    
    updateAudioVisualizer(username, level) {
        const participant = document.querySelector(`[data-username="${username}"]`);
        if (!participant) return;
        
        const voiceIndicator = participant.querySelector('.participant-voice-indicator');
        if (!voiceIndicator) return;
        
        // Update visual indicator based on audio level
        const intensity = Math.min(level * 3, 1); // Amplify the level
        
        if (intensity > 0.1) {
            voiceIndicator.style.opacity = '1';
            voiceIndicator.style.transform = `scale(${1 + intensity * 0.5})`;
            voiceIndicator.style.boxShadow = `0 0 ${intensity * 20}px rgba(72, 187, 120, 0.6)`;
        } else {
            voiceIndicator.style.opacity = '0.3';
            voiceIndicator.style.transform = 'scale(1)';
            voiceIndicator.style.boxShadow = 'none';
        }
    }
    
    // Public API methods
    getStatus() {
        return {
            version: this.version,
            initialized: this.isInitialized,
            textChat: textChat.state,
            voiceChat: voiceChat.state,
            audio: audioManager.state
        };
    }
    
    exportData() {
        try {
            return {
                version: this.version,
                timestamp: Date.now(),
                messages: textChat.exportMessages(),
                settings: uiManager.settings
            };
        } catch (error) {
            logError(error, 'LuxChatApp.exportData');
            throw error;
        }
    }
    
    importData(data) {
        try {
            if (data.messages) {
                textChat.importMessages(data.messages);
            }
            
            if (data.settings) {
                Object.assign(uiManager.settings, data.settings);
                uiManager.saveSettings();
            }
            
            uiManager.showNotification('Data imported successfully', 'success');
        } catch (error) {
            logError(error, 'LuxChatApp.importData');
            throw error;
        }
    }
    
    // Cleanup and shutdown
    destroy() {
        textChat.destroy();
        voiceChat.destroy();
        audioManager.destroy();
        uiManager.cleanup();
        
        console.log('👋 LuxChat shutdown complete');
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Make app globally available for debugging
    window.luxChat = new LuxChatApp();
    
    // Add keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        // Ctrl/Cmd + Enter to toggle voice chat
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            if (voiceChat.isInVoiceChat) {
                voiceChat.leaveVoiceChat();
            } else {
                voiceChat.joinVoiceChat(textChat.currentUser);
            }
        }
        
        // Ctrl/Cmd + M to toggle mute
        if ((e.ctrlKey || e.metaKey) && e.key === 'm') {
            e.preventDefault();
            voiceChat.toggleMute();
        }
        
        // Ctrl/Cmd + T to toggle theme
        if ((e.ctrlKey || e.metaKey) && e.key === 't') {
            e.preventDefault();
            uiManager.toggleTheme();
        }
    });
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        // Service worker would be registered here for offline functionality
        // navigator.serviceWorker.register('/sw.js');
    });
}

// Handle visibility change (tab switching)
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        // App is now hidden
        textChat.stopTyping();
    } else {
        // App is now visible
        // Could refresh participant list, check for new messages, etc.
    }
});

export default LuxChatApp;
