import { useState, useCallback, useRef } from 'react';

type SoundName = 'swap' | 'match' | 'invalid' | 'fall' | 'gameover' | 'bomb' | 'laser' | 'electric';

export const useSounds = () => {
  const [isMuted, setIsMuted] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);

  const initAudio = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') return;
    try {
      const context = new (window.AudioContext || (window as any).webkitAudioContext)();
      const gainNode = context.createGain();
      gainNode.connect(context.destination);
      audioCtxRef.current = context;
      masterGainRef.current = gainNode;
    } catch (e) {
      console.error("Web Audio API is not supported in this browser.");
    }
  }, []);

  const playSound = useCallback((sound: SoundName) => {
    initAudio();
    const audioCtx = audioCtxRef.current;
    const masterGain = masterGainRef.current;

    if (!audioCtx || !masterGain || isMuted) return;

    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    
    const now = audioCtx.currentTime;

    switch (sound) {
      case 'swap': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.linearRampToValueAtTime(1200, now + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      case 'match': {
        const notes = [600, 800, 1000, 1200];
        notes.forEach((note, i) => {
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'triangle';
            osc.frequency.setValueAtTime(note, now + i * 0.05);
            gain.gain.setValueAtTime(0.3, now + i * 0.05);
            gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + 0.2);
            osc.connect(gain);
            gain.connect(masterGain);
            osc.start(now + i * 0.05);
            osc.stop(now + i * 0.05 + 0.2);
        });
        break;
      }
      case 'invalid': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(100, now);
        osc.frequency.exponentialRampToValueAtTime(50, now + 0.2);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
      case 'fall': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(400, now);
        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case 'gameover': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        gain.gain.setValueAtTime(0.5, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.exponentialRampToValueAtTime(110, now + 0.8);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.8);
        break;
      }
      case 'bomb': {
        const noise = audioCtx.createBufferSource();
        const buffer = audioCtx.createBuffer(1, audioCtx.sampleRate * 0.5, audioCtx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < data.length; i++) {
          data[i] = Math.random() * 2 - 1;
        }
        noise.buffer = buffer;
        
        const filter = audioCtx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1000, now);
        filter.frequency.exponentialRampToValueAtTime(100, now + 0.4);

        const gain = audioCtx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);

        noise.connect(filter).connect(gain).connect(masterGain);
        noise.start(now);
        noise.stop(now + 0.5);
        break;
      }
       case 'laser': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(2000, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.3);
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.3);
        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.3);
        break;
      }
      case 'electric': {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        const lfo = audioCtx.createOscillator();
        lfo.type = 'square';
        lfo.frequency.setValueAtTime(30, now);

        const lfoGain = audioCtx.createGain();
        lfoGain.gain.setValueAtTime(500, now);

        lfo.connect(lfoGain).connect(osc.frequency);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1200, now);
        
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

        osc.connect(gain);
        gain.connect(masterGain);
        lfo.start(now);
        lfo.stop(now + 0.2);
        osc.start(now);
        osc.stop(now + 0.2);
        break;
      }
    }
  }, [isMuted, initAudio]);

  const toggleMute = useCallback(() => {
    setIsMuted(prev => !prev);
  }, []);

  return { playSound, isMuted, toggleMute };
};
