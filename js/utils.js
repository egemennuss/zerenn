/**
 * Utility functions for LuxChat application
 */

// Create global LuxChat namespace
window.LuxChat = window.LuxChat || {};

// Generate unique ID
window.LuxChat.generateId = function() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
};

// Format timestamp
window.LuxChat.formatTime = function(timestamp) {
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
};

// Escape HTML to prevent XSS
window.LuxChat.escapeHtml = function(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
};

// Validate username
export function validateUsername(username) {
    const trimmed = username.trim();
    if (trimmed.length < 2) {
        return { valid: false, error: 'Username must be at least 2 characters long' };
    }
    if (trimmed.length > 20) {
        return { valid: false, error: 'Username must be no more than 20 characters long' };
    }
    if (!/^[a-zA-Z0-9_-]+$/.test(trimmed)) {
        return { valid: false, error: 'Username can only contain letters, numbers, underscores, and hyphens' };
    }
    return { valid: true, username: trimmed };
}

// Get user avatar initials
export function getUserInitials(username) {
    if (!username) return '?';
    const words = username.split(' ');
    if (words.length >= 2) {
        return (words[0][0] + words[1][0]).toUpperCase();
    }
    return username.slice(0, 2).toUpperCase();
}

// Generate avatar color based on username
export function getAvatarColor(username) {
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

// Debounce function
export function debounce(func, wait, immediate) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            timeout = null;
            if (!immediate) func(...args);
        };
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        if (callNow) func(...args);
    };
}

// Throttle function
export function throttle(func, limit) {
    let inThrottle;
    return function() {
        const args = arguments;
        const context = this;
        if (!inThrottle) {
            func.apply(context, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, limit);
        }
    };
}

// Local storage helpers
export const storage = {
    get(key, defaultValue = null) {
        try {
            const item = localStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Error reading from localStorage:', error);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Error writing to localStorage:', error);
            return false;
        }
    },
    
    remove(key) {
        try {
            localStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Error removing from localStorage:', error);
            return false;
        }
    }
};

// Session storage helpers
export const sessionStorage = {
    get(key, defaultValue = null) {
        try {
            const item = window.sessionStorage.getItem(key);
            return item ? JSON.parse(item) : defaultValue;
        } catch (error) {
            console.warn('Error reading from sessionStorage:', error);
            return defaultValue;
        }
    },
    
    set(key, value) {
        try {
            window.sessionStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (error) {
            console.warn('Error writing to sessionStorage:', error);
            return false;
        }
    },
    
    remove(key) {
        try {
            window.sessionStorage.removeItem(key);
            return true;
        } catch (error) {
            console.warn('Error removing from sessionStorage:', error);
            return false;
        }
    }
};

// Random name generator
export function generateRandomName() {
    const adjectives = [
        'Cool', 'Smart', 'Brave', 'Quick', 'Bright', 'Swift', 'Bold', 'Wise',
        'Kind', 'Calm', 'Sharp', 'Strong', 'Clever', 'Happy', 'Lucky', 'Mighty'
    ];
    
    const nouns = [
        'Tiger', 'Eagle', 'Lion', 'Wolf', 'Bear', 'Fox', 'Hawk', 'Shark',
        'Dragon', 'Phoenix', 'Falcon', 'Panther', 'Cobra', 'Raven', 'Lynx', 'Jaguar'
    ];
    
    const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const number = Math.floor(Math.random() * 999) + 1;
    
    return `${adjective}${noun}${number}`;
}

// Check if device supports WebRTC
export function supportsWebRTC() {
    return !!(navigator.mediaDevices && 
              navigator.mediaDevices.getUserMedia && 
              window.RTCPeerConnection);
}

// Check if device supports Web Audio API
export function supportsWebAudio() {
    return !!(window.AudioContext || window.webkitAudioContext);
}

// Device detection
export const device = {
    isMobile: /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent),
    isIOS: /iPad|iPhone|iPod/.test(navigator.userAgent),
    isAndroid: /Android/.test(navigator.userAgent),
    isSafari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
    isChrome: /Chrome/.test(navigator.userAgent),
    isFirefox: /Firefox/.test(navigator.userAgent)
};

// Error handling
export class AppError extends Error {
    constructor(message, code = 'UNKNOWN_ERROR', details = null) {
        super(message);
        this.name = 'AppError';
        this.code = code;
        this.details = details;
        this.timestamp = new Date().toISOString();
    }
}

// Log error
export function logError(error, context = '') {
    console.error(`[LuxChat Error] ${context}:`, error);
    
    // Store error for debugging
    const errorLog = storage.get('error_log', []);
    errorLog.push({
        message: error.message,
        code: error.code || 'UNKNOWN',
        context,
        timestamp: new Date().toISOString(),
        stack: error.stack
    });
    
    // Keep only last 50 errors
    if (errorLog.length > 50) {
        errorLog.splice(0, errorLog.length - 50);
    }
    
    storage.set('error_log', errorLog);
}

// Copy text to clipboard
export async function copyToClipboard(text) {
    try {
        if (navigator.clipboard) {
            await navigator.clipboard.writeText(text);
            return true;
        } else {
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand('copy');
            document.body.removeChild(textArea);
            return true;
        }
    } catch (error) {
        logError(error, 'copyToClipboard');
        return false;
    }
}

// Format file size
export function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Simple event emitter
export class EventEmitter {
    constructor() {
        this.events = {};
    }
    
    on(event, callback) {
        if (!this.events[event]) {
            this.events[event] = [];
        }
        this.events[event].push(callback);
    }
    
    off(event, callback) {
        if (!this.events[event]) return;
        
        this.events[event] = this.events[event].filter(cb => cb !== callback);
    }
    
    emit(event, ...args) {
        if (!this.events[event]) return;
        
        this.events[event].forEach(callback => {
            try {
                callback(...args);
            } catch (error) {
                logError(error, `EventEmitter.emit(${event})`);
            }
        });
    }
    
    once(event, callback) {
        const onceCallback = (...args) => {
            callback(...args);
            this.off(event, onceCallback);
        };
        this.on(event, onceCallback);
    }
}
