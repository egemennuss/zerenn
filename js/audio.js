/**
 * Audio handling for LuxChat application
 */

import { EventEmitter, logError, supportsWebAudio } from './utils.js';

class AudioManager extends EventEmitter {
    constructor() {
        super();
        this.audioContext = null;
        this.analyser = null;
        this.microphone = null;
        this.isRecording = false;
        this.isMuted = false;
        this.volume = 0.5;
        this.audioDevices = [];
        this.selectedDeviceId = null;
        
        // Audio buffers for sound effects
        this.soundEffects = {
            join: null,
            leave: null,
            message: null,
            notification: null
        };
        
        this.init();
    }
    
    async init() {
        try {
            if (!supportsWebAudio()) {
                throw new Error('Web Audio API not supported');
            }
            
            // Initialize audio context
            this.audioContext = new (window.AudioContext || window.webkitAudioContext)();
            
            // Load sound effects
            await this.loadSoundEffects();
            
            // Get available audio devices
            await this.updateAudioDevices();
            
            this.emit('ready');
        } catch (error) {
            logError(error, 'AudioManager.init');
            this.emit('error', error);
        }
    }
    
    async loadSoundEffects() {
        const sounds = {
            join: this.createTone(800, 0.1, 'sine'),
            leave: this.createTone(400, 0.1, 'sine'),
            message: this.createTone(1000, 0.05, 'sine'),
            notification: this.createTone(1200, 0.08, 'sine')
        };
        
        this.soundEffects = sounds;
    }
    
    createTone(frequency, duration, type = 'sine') {
        if (!this.audioContext) return null;
        
        const bufferSize = this.audioContext.sampleRate * duration;
        const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
        const data = buffer.getChannelData(0);
        
        for (let i = 0; i < bufferSize; i++) {
            const time = i / this.audioContext.sampleRate;
            let sample = 0;
            
            switch (type) {
                case 'sine':
                    sample = Math.sin(2 * Math.PI * frequency * time);
                    break;
                case 'square':
                    sample = Math.sign(Math.sin(2 * Math.PI * frequency * time));
                    break;
                case 'triangle':
                    sample = (2 / Math.PI) * Math.asin(Math.sin(2 * Math.PI * frequency * time));
                    break;
                default:
                    sample = Math.sin(2 * Math.PI * frequency * time);
            }
            
            // Apply envelope (fade in/out)
            const envelope = Math.sin((i / bufferSize) * Math.PI);
            data[i] = sample * envelope * 0.3;
        }
        
        return buffer;
    }
    
    async updateAudioDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            this.audioDevices = devices.filter(device => device.kind === 'audioinput');
            this.emit('devicesUpdated', this.audioDevices);
        } catch (error) {
            logError(error, 'AudioManager.updateAudioDevices');
        }
    }
    
    async startRecording(deviceId = null) {
        try {
            if (this.isRecording) {
                await this.stopRecording();
            }
            
            const constraints = {
                audio: {
                    deviceId: deviceId || this.selectedDeviceId || 'default',
                    echoCancellation: true,
                    noiseSuppression: true,
                    autoGainControl: true
                }
            };
            
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            this.microphone = stream;
            
            // Create analyser for audio visualization
            this.analyser = this.audioContext.createAnalyser();
            this.analyser.fftSize = 256;
            
            const source = this.audioContext.createMediaStreamSource(stream);
            source.connect(this.analyser);
            
            this.isRecording = true;
            this.emit('recordingStarted', stream);
            
            // Start audio level monitoring
            this.startAudioLevelMonitoring();
            
        } catch (error) {
            logError(error, 'AudioManager.startRecording');
            this.emit('error', error);
            throw error;
        }
    }
    
    async stopRecording() {
        try {
            if (this.microphone) {
                this.microphone.getTracks().forEach(track => track.stop());
                this.microphone = null;
            }
            
            this.isRecording = false;
            this.emit('recordingStopped');
            
        } catch (error) {
            logError(error, 'AudioManager.stopRecording');
        }
    }
    
    toggleMute() {
        if (!this.microphone) return false;
        
        this.isMuted = !this.isMuted;
        this.microphone.getAudioTracks().forEach(track => {
            track.enabled = !this.isMuted;
        });
        
        this.emit('muteToggled', this.isMuted);
        return this.isMuted;
    }
    
    setVolume(volume) {
        this.volume = Math.max(0, Math.min(1, volume));
        this.emit('volumeChanged', this.volume);
    }
    
    playSound(soundName) {
        try {
            if (!this.audioContext || !this.soundEffects[soundName]) return;
            
            if (this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            
            const source = this.audioContext.createBufferSource();
            const gainNode = this.audioContext.createGain();
            
            source.buffer = this.soundEffects[soundName];
            gainNode.gain.value = this.volume;
            
            source.connect(gainNode);
            gainNode.connect(this.audioContext.destination);
            
            source.start();
            
        } catch (error) {
            logError(error, 'AudioManager.playSound');
        }
    }
    
    startAudioLevelMonitoring() {
        if (!this.analyser) return;
        
        const bufferLength = this.analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        const updateLevel = () => {
            if (!this.isRecording) return;
            
            this.analyser.getByteFrequencyData(dataArray);
            
            // Calculate average audio level
            let sum = 0;
            for (let i = 0; i < bufferLength; i++) {
                sum += dataArray[i];
            }
            const average = sum / bufferLength;
            const level = average / 255; // Normalize to 0-1
            
            this.emit('audioLevel', level);
            
            requestAnimationFrame(updateLevel);
        };
        
        updateLevel();
    }
    
    // WebRTC audio handling
    createAudioElement(stream) {
        const audio = document.createElement('audio');
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.playsInline = true;
        audio.volume = this.volume;
        
        // Hide the audio element
        audio.style.display = 'none';
        document.body.appendChild(audio);
        
        return audio;
    }
    
    removeAudioElement(audio) {
        if (audio && audio.parentNode) {
            audio.srcObject = null;
            audio.parentNode.removeChild(audio);
        }
    }
    
    // Audio effects
    async applyAudioEffects(stream, effects = {}) {
        if (!this.audioContext) return stream;
        
        try {
            const source = this.audioContext.createMediaStreamSource(stream);
            let currentNode = source;
            
            // Apply reverb
            if (effects.reverb) {
                const convolver = this.audioContext.createConvolver();
                convolver.buffer = await this.createReverbBuffer();
                currentNode.connect(convolver);
                currentNode = convolver;
            }
            
            // Apply filter
            if (effects.filter) {
                const filter = this.audioContext.createBiquadFilter();
                filter.type = effects.filter.type || 'lowpass';
                filter.frequency.value = effects.filter.frequency || 1000;
                currentNode.connect(filter);
                currentNode = filter;
            }
            
            // Apply compressor
            if (effects.compressor) {
                const compressor = this.audioContext.createDynamicsCompressor();
                compressor.threshold.value = effects.compressor.threshold || -24;
                compressor.knee.value = effects.compressor.knee || 30;
                compressor.ratio.value = effects.compressor.ratio || 12;
                compressor.attack.value = effects.compressor.attack || 0.003;
                compressor.release.value = effects.compressor.release || 0.25;
                currentNode.connect(compressor);
                currentNode = compressor;
            }
            
            // Create destination stream
            const destination = this.audioContext.createMediaStreamDestination();
            currentNode.connect(destination);
            
            return destination.stream;
            
        } catch (error) {
            logError(error, 'AudioManager.applyAudioEffects');
            return stream;
        }
    }
    
    async createReverbBuffer() {
        if (!this.audioContext) return null;
        
        const sampleRate = this.audioContext.sampleRate;
        const length = sampleRate * 2; // 2 seconds of reverb
        const buffer = this.audioContext.createBuffer(2, length, sampleRate);
        
        for (let channel = 0; channel < 2; channel++) {
            const channelData = buffer.getChannelData(channel);
            for (let i = 0; i < length; i++) {
                channelData[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
            }
        }
        
        return buffer;
    }
    
    // Cleanup
    destroy() {
        this.stopRecording();
        
        if (this.audioContext) {
            this.audioContext.close();
            this.audioContext = null;
        }
        
        this.removeAllListeners();
    }
    
    // Getters
    get isInitialized() {
        return !!this.audioContext;
    }
    
    get state() {
        return {
            isRecording: this.isRecording,
            isMuted: this.isMuted,
            volume: this.volume,
            devices: this.audioDevices,
            selectedDevice: this.selectedDeviceId
        };
    }
}

// Export singleton instance
export default new AudioManager();
