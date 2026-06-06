const BACKGROUND_MUSIC_SOURCE = 'petra_sihombing.mpeg';

// HTML audio controller for the background music track.
class BackgroundTrack {
  constructor(audioId, source) {
    this.audio = document.getElementById(audioId);
    this.source = source;
    this.isPlaying = false;

    if (this.audio && this.source && !this.audio.currentSrc) {
      const sourceEl = this.audio.querySelector('source');
      if (sourceEl) {
        sourceEl.src = this.source;
      } else {
        this.audio.src = this.source;
      }
      this.audio.load();
    }
  }

  async start() {
    if (!this.audio) return false;
    this.audio.volume = 0.45;

    try {
      await this.audio.play();
      this.isPlaying = true;
    } catch (error) {
      this.isPlaying = false;
      console.warn('Background music could not start:', error);
    }

    return this.isPlaying;
  }

  pause() {
    if (!this.audio) return;
    this.audio.pause();
    this.isPlaying = false;
  }

  toggle() {
    if (this.isPlaying) {
      this.pause();
      return Promise.resolve(false);
    }

    return this.start();
  }
}

// Web Audio API Music Box Synthesizer for small celebratory chimes
class MusicBox {
  constructor() {
    this.audioCtx = null;
    this.isPlaying = false;
    this.tempo = 110; // BPM
    this.beatDuration = 60 / this.tempo;
    this.timerId = null;
    this.gainNode = null;
    this.delayNode = null;
    this.feedbackNode = null;
    
    this.notes = {
      'C4': 261.63, 'D4': 293.66, 'E4': 329.63, 'F4': 349.23, 'G4': 392.00,
      'A4': 440.00, 'Bb4': 466.16, 'B4': 493.88, 'C5': 523.25, 'D5': 587.33,
      'E5': 659.25, 'F5': 698.46, 'G5': 783.99, 'A5': 880.00
    };

    this.sparkleMelody = [
      ['C5', 0.18], ['E5', 0.18], ['G5', 0.18], ['A5', 0.35]
    ];
  }

  init() {
    if (this.audioCtx) return;

    this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    
    this.gainNode = this.audioCtx.createGain();
    this.gainNode.gain.setValueAtTime(0.2, this.audioCtx.currentTime);

    this.delayNode = this.audioCtx.createDelay(1.0);
    this.delayNode.delayTime.setValueAtTime(0.35, this.audioCtx.currentTime);
    
    this.feedbackNode = this.audioCtx.createGain();
    this.feedbackNode.gain.setValueAtTime(0.45, this.audioCtx.currentTime);

    const filterNode = this.audioCtx.createBiquadFilter();
    filterNode.type = 'lowpass';
    filterNode.frequency.setValueAtTime(1400, this.audioCtx.currentTime);

    this.delayNode.connect(this.feedbackNode);
    this.feedbackNode.connect(this.delayNode);
    this.delayNode.connect(filterNode);
    filterNode.connect(this.gainNode);
    this.gainNode.connect(this.audioCtx.destination);
  }

  playNote(noteName, time, duration) {
    if (!this.notes[noteName] || !this.audioCtx) return;
    const freq = this.notes[noteName];
    
    const osc1 = this.audioCtx.createOscillator();
    const osc2 = this.audioCtx.createOscillator();
    const noteGain = this.audioCtx.createGain();

    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(freq, time);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, time);

    noteGain.gain.setValueAtTime(0, time);
    noteGain.gain.linearRampToValueAtTime(0.8, time + 0.005);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.05);

    osc1.connect(noteGain);
    osc2.connect(noteGain);
    noteGain.connect(this.gainNode);
    noteGain.connect(this.delayNode);

    osc1.start(time);
    osc1.stop(time + duration);
    osc2.start(time);
    osc2.stop(time + duration);
  }

  playMelody(melodyArray, loop = false, onFinished = null) {
    let currentTime = this.audioCtx.currentTime + 0.1;
    
    melodyArray.forEach((noteData) => {
      const note = noteData[0];
      const beats = noteData[1];
      const duration = beats * this.beatDuration;
      
      if (note !== 'REST') {
        const humanizeOffset = (Math.random() - 0.5) * 0.015;
        this.playNote(note, currentTime + humanizeOffset, duration * 1.5);
      }
      currentTime += duration;
    });

    if (loop) {
      const totalMelodyDuration = melodyArray.reduce((acc, note) => acc + (note[1] * this.beatDuration), 0);
      this.timerId = setTimeout(() => {
        if (this.isPlaying) this.playMelody(melodyArray, true);
      }, totalMelodyDuration * 1000);
    } else if (onFinished) {
      const totalMelodyDuration = melodyArray.reduce((acc, note) => acc + (note[1] * this.beatDuration), 0);
      this.timerId = setTimeout(() => {
        if (this.isPlaying) onFinished();
      }, totalMelodyDuration * 1000);
    }
  }

  start() {
    this.init();
    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  stop() {
    this.isPlaying = false;
    if (this.timerId) {
      clearTimeout(this.timerId);
    }
  }

  toggle() {
    if (this.isPlaying) {
      this.stop();
      if (this.gainNode) {
        this.gainNode.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.5);
      }
    } else {
      if (this.gainNode && this.audioCtx) {
        this.gainNode.gain.setValueAtTime(0, this.audioCtx.currentTime);
        this.gainNode.gain.linearRampToValueAtTime(0.2, this.audioCtx.currentTime + 0.5);
      }
      this.start();
    }
    return this.isPlaying;
  }

  chime(noteName, duration = 0.18) {
    this.start();
    this.playNote(noteName, this.audioCtx.currentTime, duration);
  }

  sparkle() {
    this.start();
    this.playMelody(this.sparkleMelody, false);
  }
}

// Canvas-Based Confetti Particle System
class ConfettiSystem {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.particles = [];
    this.isAnimating = false;
    
    this.colors = [
      '#FFD1DC',
      '#A9DAFF',
      '#B99BFF',
      '#FFE57A',
      '#FFB18A',
      '#E95F9E',
      '#7DDFFF'
    ];

    window.addEventListener('resize', () => this.resizeCanvas());
    this.resizeCanvas();
  }

  resizeCanvas() {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  explode(sourceX, sourceY, customCount) {
    const particleCount = customCount || 180;
    // Don't clear particles so multiple bursts can overlay
    
    for (let i = 0; i < particleCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 5 + Math.random() * 15;
      
      this.particles.push({
        x: sourceX,
        y: sourceY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - (4 + Math.random() * 5),
        size: 5 + Math.random() * 8,
        color: this.colors[Math.floor(Math.random() * this.colors.length)],
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 12,
        opacity: 1,
        gravity: 0.18 + Math.random() * 0.22,
        drag: 0.95 + Math.random() * 0.02
      });
    }

    if (!this.isAnimating) {
      this.isAnimating = true;
      this.animate();
    }
  }

  spawnDrifter() {
    if (this.particles.length > 80) return;
    
    this.particles.push({
      x: Math.random() * this.canvas.width,
      y: -20,
      vx: (Math.random() - 0.5) * 1.5,
      vy: 1 + Math.random() * 2,
      size: 3 + Math.random() * 6,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 4,
      opacity: 0.8,
      gravity: 0.05 + Math.random() * 0.05,
      drag: 0.99
    });
  }

  animate() {
    if (!this.isAnimating) return;
    
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (Math.random() < 0.12) {
      this.spawnDrifter();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.vy += p.gravity;
      
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed;
      
      if (p.y > this.canvas.height * 0.7) {
        p.opacity -= 0.015;
      }

      if (p.y > this.canvas.height || p.opacity <= 0 || p.x < 0 || p.x > this.canvas.width) {
        this.particles.splice(i, 1);
        continue;
      }

      this.ctx.save();
      this.ctx.translate(p.x, p.y);
      this.ctx.rotate((p.rotation * Math.PI) / 180);
      this.ctx.globalAlpha = p.opacity;
      this.ctx.fillStyle = p.color;
      
      this.ctx.fillRect(-p.size / 2, -p.size, p.size, p.size * 1.5);
      this.ctx.restore();
    }

    if (this.particles.length > 0) {
      requestAnimationFrame(() => this.animate());
    } else {
      this.isAnimating = false;
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }
}

// Pixel Keyer to Remove solid white background
function applyChromaKeyRemoval(imgId) {
  const img = document.getElementById(imgId);
  if (!img) return;

  const processImage = () => {
    try {
      if (img.src.startsWith('data:') || img.src.includes('mom_portrait_transparent.png') || img.src.includes('mama.png')) return;
      
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      
      ctx.drawImage(img, 0, 0);
      
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      
      // Key out pixels that are very close to white.
      for (let i = 0; i < data.length; i += 4) {
        const r = data[i];
        const g = data[i+1];
        const b = data[i+2];
        
        if (r > 242 && g > 242 && b > 242) {
          data[i+3] = 0;
        }
      }
      
      ctx.putImageData(imgData, 0, 0);
      img.src = canvas.toDataURL();
    } catch (error) {
      console.warn('Portrait background removal skipped:', error);
    }
  };

  img.addEventListener('load', processImage, { once: true });

  if (img.complete) {
    processImage();
  }
}

// App Controller
document.addEventListener('DOMContentLoaded', () => {
  // Key out the background of the portrait photo
  applyChromaKeyRemoval('mom-photo');

  const cardWrapper = document.getElementById('card-wrapper');
  const cardInner = document.getElementById('card-inner');
  const sectionLanding = document.getElementById('section-landing');
  const clickPrompt = document.getElementById('click-prompt');
  
  // Collage Pile selectors
  const collageContainer = document.getElementById('collage-container');
  const collagePile = document.getElementById('collage-pile');
  const polaroids = document.querySelectorAll('.polaroid-card');
  const btnGather = document.getElementById('btn-gather');

  // Music & Confetti
  const backgroundMusic = new BackgroundTrack('background-audio', BACKGROUND_MUSIC_SOURCE);
  const synth = new MusicBox();
  const confetti = new ConfettiSystem('confetti-canvas');
  let cardFlipped = false;
  let collageActive = false;

  // Music Button UI Control
  const musicToggle = document.getElementById('music-toggle');
  const playIcon = musicToggle.querySelector('.music-icon.play');
  const muteIcon = musicToggle.querySelector('.music-icon.mute');

  function updateMusicIcon(isPlaying) {
    if (isPlaying) {
      playIcon.classList.add('hidden');
      muteIcon.classList.remove('hidden');
    } else {
      playIcon.classList.remove('hidden');
      muteIcon.classList.add('hidden');
    }
  }

  musicToggle.addEventListener('click', async () => {
    const isPlaying = await backgroundMusic.toggle();
    updateMusicIcon(isPlaying);
  });

  function celebrateGift(presentElement, burstCount = 12) {
    const container = presentElement.closest('.present-container') || presentElement;
    const sparkleColors = ['#FFD1DC', '#A9DAFF', '#B99BFF', '#FFE57A', '#FFB18A', '#E95F9E'];

    container.classList.remove('celebrating');
    container.offsetWidth;
    container.classList.add('celebrating');

    for (let i = 0; i < burstCount; i++) {
      const sparkle = document.createElement('span');
      const angle = (Math.PI * 2 * i) / burstCount + Math.random() * 0.45;
      const distance = 54 + Math.random() * 48;
      sparkle.className = 'gift-sparkle';
      sparkle.style.setProperty('--sparkle-x', `${Math.cos(angle) * distance}px`);
      sparkle.style.setProperty('--sparkle-y', `${Math.sin(angle) * distance}px`);
      sparkle.style.setProperty('--sparkle-color', sparkleColors[i % sparkleColors.length]);
      container.appendChild(sparkle);
      sparkle.addEventListener('animationend', () => sparkle.remove(), { once: true });
    }

    setTimeout(() => container.classList.remove('celebrating'), 1000);
  }

  // Step 1: Click Card Front to Flip Card and Start Confetti/Music
  cardInner.addEventListener('click', (e) => {
    // If it's already flipped, let the back click take over
    if (cardFlipped) return;
    
    // Stop event propagation to prevent triggering the back click simultaneously
    e.stopPropagation();
    
    cardFlipped = true;
    
    // Hide instructions
    clickPrompt.style.opacity = '0';
    clickPrompt.style.transform = 'scale(0.8)';
    setTimeout(() => clickPrompt.classList.add('hidden'), 500);

    // 1. Flip card
    cardInner.classList.add('flipped');

    // 2. Play background track and prepare small chimes
    backgroundMusic.start().then(updateMusicIcon);
    synth.start();
    musicToggle.classList.remove('hidden');

    // 3. Fire Confetti from center of the card
    const cardRect = cardInner.getBoundingClientRect();
    const sourceX = cardRect.left + cardRect.width / 2;
    const sourceY = cardRect.top + cardRect.height / 2;
    
    setTimeout(() => {
      confetti.explode(sourceX, sourceY);
    }, 450);
  });

  // Step 1.5: Flip Card Back to Front
  const btnFlipBack = document.getElementById('btn-flip-back');
  if (btnFlipBack) {
    btnFlipBack.addEventListener('click', (e) => {
      e.stopPropagation(); // Stop event bubbling so it doesn't trigger cardBack click
      cardInner.classList.remove('flipped');
      cardFlipped = false;
      cardBack.querySelector('.present-cube')?.classList.remove('open', 'jiggle');
      
      // Fade back in front instructions
      clickPrompt.classList.remove('hidden');
      clickPrompt.offsetWidth; // force reflow
      clickPrompt.style.opacity = '1';
      clickPrompt.style.transform = 'scale(1)';
    });
  }

  // Step 2: Click the Birthday Message Card to Explode Collage
  const cardBack = document.getElementById('card-back');
  cardBack.addEventListener('click', () => {
    if (!cardFlipped || collageActive) return;
    collageActive = true;

    // Get the cube inside the greeting card back
    const cube = cardBack.querySelector('.present-cube');
    
    // Play chime sound (G4)
    synth.chime('G4', 0.25);
    
    // Explode minor confetti from the present center
    const rect = cube.getBoundingClientRect();
    const sourceX = rect.left + rect.width / 2;
    const sourceY = rect.top + rect.height / 2;
    confetti.explode(sourceX, sourceY, 35);
    celebrateGift(cube, 10);

    // Trigger jiggle
    cube.classList.remove('jiggle');
    cube.offsetWidth;
    cube.classList.add('jiggle');

    // Let the box anticipate, then open before transitioning to polaroids.
    setTimeout(() => {
      cube.classList.remove('jiggle');
      cube.classList.add('open');
      confetti.explode(sourceX, sourceY, 70);
      celebrateGift(cube, 14);
    }, 780);

    setTimeout(() => {
      // Remove jiggle so it's clean if we return later
      cube.classList.remove('jiggle');

      // 1. Shrink, rotate, and fade out the landing greeting card wrapper
      cardWrapper.style.transform = 'perspective(1000px) scale(0.05) rotate(15deg)';
      cardWrapper.style.opacity = '0';
      
      // 2. Fade out the landing section
      sectionLanding.classList.add('hidden');
      
      // 3. Show the Polaroid collage container overlay
      collageContainer.classList.remove('hidden');
      collageContainer.offsetWidth; // Force reflow
      collageContainer.classList.add('active');
      
      // 4. Fire the Polaroid Explosion
      explodePolaroids();
    }, 1260);
  });

  // Drag and drop state variables
  let activeCard = null;
  let isDragging = false;
  let startX = 0;
  let startY = 0;
  let startTx = 0;
  let startTy = 0;
  let maxZIndex = 100;
  let lastTouchTime = 0;

  // Scatter Polaroids across screen at random positions/angles
  function explodePolaroids() {
    const isMobile = window.innerWidth <= 768;
    const cardWidth = isMobile ? 120 : 170;
    const cardHeight = isMobile ? 155 : 205;
    
    // Safety padding to ensure cards don't touch screen edges and avoid headers
    const padX = cardWidth / 2 + 15; 
    const padY = cardHeight / 2 + 35;

    const W = window.innerWidth;
    const H = window.innerHeight;

    // Distribute them evenly across the safe viewport space
    const rangeX = W - 2 * padX;
    const rangeY = H - 2 * padY;

    polaroids.forEach((card, idx) => {
      const tx = (Math.random() - 0.5) * rangeX;
      // Slight offset down on Y to keep away from top-bar buttons
      const ty = (Math.random() - 0.5) * rangeY + 15;
      const rot = (Math.random() - 0.5) * 36; // Nice warm scattered angles
      
      card.style.setProperty('--tx', `${tx}px`);
      card.style.setProperty('--ty', `${ty}px`);
      card.style.setProperty('--rot', `${rot}deg`);

      // Random initial z-index for overlapping
      const zIndex = Math.floor(Math.random() * 20) + 10;
      card.style.zIndex = zIndex;

      // Clear overrides from gather and set transition delay
      card.style.transform = '';
      card.style.opacity = '';
      card.style.transitionDelay = `${idx * 0.08}s`;

      card.classList.remove('floating', 'focused', 'dragging');

      // Staggered activation of floating animation
      setTimeout(() => {
        if (collageActive && !card.classList.contains('focused') && !card.classList.contains('dragging')) {
          card.classList.add('floating');
          card.style.transitionDelay = '';
        }
      }, (idx * 0.08 + 0.8) * 1000);
    });
  }

  // Handle Drag-and-Drop + Click Zoom Logic
  polaroids.forEach(card => {
    const startDrag = (e) => {
      if (!collageActive) return;

      // Prevent mobile simulated mouse events (ghost clicks) from double-triggering zoom
      if (e.type === 'touchstart') {
        lastTouchTime = Date.now();
      } else if (e.type === 'mousedown' && Date.now() - lastTouchTime < 600) {
        return;
      }

      // Check if it's touch or mouse
      const clientX = e.type === 'touchstart' ? e.touches[0].clientX : e.clientX;
      const clientY = e.type === 'touchstart' ? e.touches[0].clientY : e.clientY;

      activeCard = card;
      isDragging = false;
      startX = clientX;
      startY = clientY;

      const txVal = parseFloat(card.style.getPropertyValue('--tx')) || 0;
      const tyVal = parseFloat(card.style.getPropertyValue('--ty')) || 0;
      startTx = txVal;
      startTy = tyVal;

      maxZIndex++;
      card.style.zIndex = maxZIndex;

      // Disable transition delay during direct drag interactions
      card.style.transitionDelay = '0s';
    };

    card.addEventListener('mousedown', startDrag);
    card.addEventListener('touchstart', startDrag, { passive: true });
    card.addEventListener('dragstart', (e) => e.preventDefault());
  });

  const onMove = (e) => {
    if (!activeCard) return;
    if (activeCard.classList.contains('focused')) return;

    const clientX = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const clientY = e.type === 'touchmove' ? e.touches[0].clientY : e.clientY;

    const dx = clientX - startX;
    const dy = clientY - startY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If movement is larger than 15px, it is a drag, not a click
    if (!isDragging && dist > 15) {
      isDragging = true;
      activeCard.classList.add('dragging');
      activeCard.classList.remove('floating');
    }

    if (isDragging) {
      // Prevent default scrolling on mobile when actively dragging
      if (e.type === 'touchmove' && e.cancelable) {
        e.preventDefault();
      }

      const newTx = startTx + dx;
      const newTy = startTy + dy;
      
      activeCard.style.setProperty('--tx', `${newTx}px`);
      activeCard.style.setProperty('--ty', `${newTy}px`);
    }
  };

  const onEnd = () => {
    if (!activeCard) return;

    if (isDragging) {
      activeCard.classList.remove('dragging');
      activeCard.classList.add('floating');
    } else {
      // Small travel distance -> Treat as a Click Zoom
      toggleZoom(activeCard);
    }

    activeCard = null;
    isDragging = false;
  };

  window.addEventListener('mousemove', onMove);
  window.addEventListener('touchmove', onMove, { passive: false });
  window.addEventListener('mouseup', onEnd);
  window.addEventListener('touchend', onEnd);

  function toggleZoom(card) {
    const isFocused = card.classList.contains('focused');
    
    // Zoom out any currently focused polaroids first
    document.querySelectorAll('.polaroid-card.focused').forEach(c => {
      c.classList.remove('focused');
      c.classList.add('floating');
    });

    if (!isFocused) {
      // Zoom in this card
      card.classList.add('focused');
      card.classList.remove('floating');
      collagePile.classList.add('dimmed');
    } else {
      // Just zoom it out
      collagePile.classList.remove('dimmed');
    }
  }

  // Clicking outside zoomed polaroid clears zoom
  collagePile.addEventListener('click', (e) => {
    if (e.target === collagePile) {
      document.querySelectorAll('.polaroid-card.focused').forEach(c => {
        c.classList.remove('focused');
        c.classList.add('floating');
      });
      collagePile.classList.remove('dimmed');
    }
  });

  // Step 4: Gather Memories - Animate Polaroids back to center and return to greeting
  btnGather.addEventListener('click', () => {
    // Zoom out any focused card
    document.querySelectorAll('.polaroid-card.focused').forEach(c => {
      c.classList.remove('focused');
    });
    collagePile.classList.remove('dimmed');

    // Remove floating from all cards
    polaroids.forEach(card => {
      card.classList.remove('floating');
    });

    // Smoothly fly Polaroids back to center card position
    polaroids.forEach((card, idx) => {
      card.style.transitionDelay = `${(polaroids.length - 1 - idx) * 0.08}s`;
      card.style.transform = 'translate(-50%, -50%) scale(0) rotate(0deg)';
      card.style.opacity = '0';
    });

    // Fade out overlay container
    setTimeout(() => {
      collageContainer.classList.remove('active');
      
      setTimeout(() => {
        collageContainer.classList.add('hidden');
        collageActive = false;
        
        // Show landing greeting card
        sectionLanding.classList.remove('hidden');
        // Trigger style recalculation
        sectionLanding.offsetWidth; 
        
        cardWrapper.style.transform = 'perspective(1000px) scale(1) rotate(0deg)';
        cardWrapper.style.opacity = '1';
        cardBack.querySelector('.present-cube')?.classList.remove('open', 'jiggle');
      }, 600);
    }, polaroids.length * 80 + 800);
  });

  // Private Message Letter Page Logic
  const letterContainer = document.getElementById('letter-container');
  const btnOpenLetter = document.getElementById('btn-open-letter');
  const btnCloseLetter = document.getElementById('btn-close-letter');
  const thankYouContainer = document.getElementById('thank-you-container');
  const btnOpenThankYou = document.getElementById('btn-open-thank-you');
  const btnCloseThankYou = document.getElementById('btn-close-thank-you');

  function initWavyBorder() {
    const width = 500;
    const height = 600;
    const numWavesX = 14;
    const numWavesY = 17;
    const waveSize = 10;

    const xStep = width / numWavesX;
    const yStep = height / numWavesY;

    let d = "M 0,0";

    // Top edge (left to right)
    for (let i = 0; i < numWavesX; i++) {
      const x1 = i * xStep;
      const x2 = (i + 1) * xStep;
      const mx = x1 + xStep / 2;
      const my = -waveSize;
      d += ` Q ${mx},${my} ${x2},0`;
    }

    // Right edge (top to bottom)
    for (let i = 0; i < numWavesY; i++) {
      const y1 = i * yStep;
      const y2 = (i + 1) * yStep;
      const mx = width + waveSize;
      const my = y1 + yStep / 2;
      d += ` Q ${mx},${my} ${width},${y2}`;
    }

    // Bottom edge (right to left)
    for (let i = 0; i < numWavesX; i++) {
      const x1 = width - i * xStep;
      const x2 = width - (i + 1) * xStep;
      const mx = x1 - xStep / 2;
      const my = height + waveSize;
      d += ` Q ${mx},${my} ${x2},${height}`;
    }

    // Left edge (bottom to top)
    for (let i = 0; i < numWavesY; i++) {
      const y1 = height - i * yStep;
      const y2 = height - (i + 1) * yStep;
      const mx = -waveSize;
      const my = y1 - yStep / 2;
      d += ` Q ${mx},${my} 0,${y2}`;
    }

    d += " Z";

    const path = document.getElementById('wavy-border-path');
    if (path) {
      path.setAttribute('d', d);
    }
  }

  // Generate the wavy border path initially
  initWavyBorder();

  const letterPresentWrapper = document.getElementById('letter-present-wrapper');
  const letterPresentBox = document.getElementById('letter-present-box');
  const letterPresentHint = document.getElementById('letter-present-hint');
  const letterCard = document.getElementById('letter-card');
  let letterClicksLeft = 3;

  // Interactive present unboxing logic
  letterPresentBox.addEventListener('click', (e) => {
    if (letterClicksLeft <= 0) return;
    
    // Trigger jiggle animation on the cube inside
    const cube = letterPresentBox.querySelector('.present-cube');
    cube.classList.remove('jiggle');
    // Trigger reflow to restart animation
    cube.offsetWidth; 
    cube.classList.add('jiggle');
    
    // Get absolute coordinates of the present center to burst confetti
    const rect = letterPresentBox.getBoundingClientRect();
    const sourceX = rect.left + rect.width / 2;
    const sourceY = rect.top + rect.height / 2;
    
    letterClicksLeft--;
    
    if (letterClicksLeft === 2) {
      synth.chime('C5', 0.15);
      confetti.explode(sourceX, sourceY, 35);
      celebrateGift(letterPresentBox, 8);
      letterPresentHint.innerHTML = 'Unwrapping the ribbons...<br><span>Keep clicking! (2 left)</span>';
      
      // Remove jiggle after animation ends to resume floating
      setTimeout(() => {
        if (!cube.classList.contains('open')) {
          cube.classList.remove('jiggle');
        }
      }, 820);
    } else if (letterClicksLeft === 1) {
      synth.chime('E5', 0.15);
      confetti.explode(sourceX, sourceY, 35);
      celebrateGift(letterPresentBox, 10);
      letterPresentHint.innerHTML = 'Almost there, Mama...<br><span>Just one more click!</span>';
      
      // Remove jiggle after animation ends to resume floating
      setTimeout(() => {
        if (!cube.classList.contains('open')) {
          cube.classList.remove('jiggle');
        }
      }, 820);
    } else if (letterClicksLeft === 0) {
      synth.sparkle();
      
      // Confetti explosion
      confetti.explode(sourceX, sourceY, 180);
      celebrateGift(letterPresentBox, 18);
      
      // Update hint text
      letterPresentHint.innerHTML = 'Tadaaa!';
      
      // Wait for the 3rd jiggle to complete before opening the box
      setTimeout(() => {
        cube.classList.remove('jiggle');
        cube.classList.add('open');
        
        // Fade out only the hint text
        letterPresentHint.classList.add('fade-out');
        
        // Staggered popup of the letter coming out of the open box
        setTimeout(() => {
          letterCard.classList.add('active');
        }, 350);
        
        // Cleanup present box container display after animation
        setTimeout(() => {
          letterPresentWrapper.style.display = 'none';
        }, 1400);
      }, 820);
    }
  });

  // Open Letter
  btnOpenLetter.addEventListener('click', () => {
    // Zoom out any focused polaroids
    document.querySelectorAll('.polaroid-card.focused').forEach(c => {
      c.classList.remove('focused');
      c.classList.add('floating');
    });
    collagePile.classList.remove('dimmed');

    // Reset present unboxing state
    letterClicksLeft = 3;
    letterPresentWrapper.style.display = 'flex';
    letterPresentWrapper.classList.remove('fade-out');
    
    const cube = letterPresentBox.querySelector('.present-cube');
    if (cube) {
      cube.classList.remove('open', 'jiggle');
    }
    letterPresentHint.classList.remove('fade-out');
    letterPresentHint.innerHTML = 'A special gift for Mama...<br><span>Click the gift to open!</span>';
    letterCard.classList.remove('active');

    // Show letter container
    letterContainer.classList.remove('hidden');
    // Trigger style reflow
    letterContainer.offsetWidth;
    letterContainer.classList.add('active');
  });

  // Close Letter
  btnCloseLetter.addEventListener('click', () => {
    letterContainer.classList.remove('active');
    setTimeout(() => {
      letterContainer.classList.add('hidden');
      letterCard.classList.remove('active');
    }, 600);
  });

  // Final thank you page
  if (btnOpenThankYou && thankYouContainer) {
    btnOpenThankYou.addEventListener('click', () => {
      thankYouContainer.classList.remove('hidden');
      thankYouContainer.offsetWidth;
      thankYouContainer.classList.add('active');
      confetti.explode(window.innerWidth / 2, window.innerHeight * 0.42, 90);
      synth.sparkle();
    });
  }

  if (btnCloseThankYou && thankYouContainer) {
    btnCloseThankYou.addEventListener('click', () => {
      thankYouContainer.classList.remove('active');
      setTimeout(() => {
        thankYouContainer.classList.add('hidden');
      }, 600);
    });
  }

  // Cursor Sparkle Trail particle generator
  let lastMouseX = 0;
  let lastMouseY = 0;
  const trailThrottling = 8; // min pixels mouse must move before spawning another sparkle

  window.addEventListener('mousemove', (e) => {
    const dx = e.clientX - lastMouseX;
    const dy = e.clientY - lastMouseY;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist > trailThrottling) {
      spawnSparkle(e.clientX, e.clientY);
      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    }
  });

  window.addEventListener('touchmove', (e) => {
    if (e.touches.length > 0) {
      const touch = e.touches[0];
      const dx = touch.clientX - lastMouseX;
      const dy = touch.clientY - lastMouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > trailThrottling) {
        spawnSparkle(touch.clientX, touch.clientY);
        lastMouseX = touch.clientX;
        lastMouseY = touch.clientY;
      }
    }
  }, { passive: true });

  const sparkleChars = ['✦', '✧', '★'];
  const sparkleColors = ['#FFE57A']; // Yellow only

  function spawnSparkle(x, y) {
    const sparkle = document.createElement('span');
    sparkle.className = 'cursor-sparkle';
    sparkle.textContent = sparkleChars[Math.floor(Math.random() * sparkleChars.length)];
    sparkle.style.color = sparkleColors[Math.floor(Math.random() * sparkleColors.length)];
    sparkle.style.left = `${x}px`;
    sparkle.style.top = `${y}px`;

    // Randomize scale
    const size = 10 + Math.random() * 14;
    sparkle.style.fontSize = `${size}px`;

    // Randomize translation offset
    const dx = (Math.random() - 0.5) * 60;
    const dy = (Math.random() - 0.5) * 60 - 20; // drift slightly upwards
    sparkle.style.setProperty('--dx', `${dx}px`);
    sparkle.style.setProperty('--dy', `${dy}px`);

    document.body.appendChild(sparkle);

    sparkle.addEventListener('animationend', () => {
      sparkle.remove();
    }, { once: true });
  }

  // Dynamic Flower Petals background generator
  function initFlowerPetals() {
    const landing = document.getElementById('section-landing');
    if (!landing) return;

    const container = document.createElement('div');
    container.className = 'petal-container';
    // Insert behind the main card elements
    landing.insertBefore(container, landing.firstChild);

    const petalCount = 18;
    for (let i = 0; i < petalCount; i++) {
      spawnPetal(container, true);
    }
  }

  function spawnPetal(container, initial = false) {
    const petal = document.createElement('div');
    petal.className = 'petal';

    const startX = Math.random() * 100;
    petal.style.left = `${startX}%`;

    const startY = initial ? (Math.random() * 100) : -5;
    petal.style.top = initial ? `${startY}%` : `-20px`;

    const size = Math.random() * 10 + 8; // 8px to 18px
    petal.style.width = `${size}px`;
    petal.style.height = `${size}px`;

    const gradients = [
      'linear-gradient(135deg, rgba(255, 192, 203, 0.55) 0%, rgba(255, 175, 189, 0.45) 100%)',
      'linear-gradient(135deg, rgba(255, 218, 185, 0.6) 0%, rgba(255, 182, 193, 0.45) 100%)',
      'linear-gradient(135deg, rgba(255, 230, 235, 0.5) 0%, rgba(255, 192, 203, 0.4) 100%)'
    ];
    petal.style.background = gradients[Math.floor(Math.random() * gradients.length)];

    const swayX = (Math.random() - 0.5) * 160;
    const rotZ = 180 + Math.random() * 360;
    petal.style.setProperty('--sway-x', `${swayX}px`);
    petal.style.setProperty('--rot-z', `${rotZ}deg`);

    const duration = Math.random() * 8 + 8; // 8s to 16s
    petal.style.animationDuration = `${duration}s`;

    if (initial) {
      const delay = Math.random() * -12;
      petal.style.animationDelay = `${delay}s`;
    }

    container.appendChild(petal);

    petal.addEventListener('animationiteration', () => {
      petal.style.left = `${Math.random() * 100}%`;
      petal.style.top = `-20px`;
      
      const newSwayX = (Math.random() - 0.5) * 160;
      const newRotZ = 180 + Math.random() * 360;
      petal.style.setProperty('--sway-x', `${newSwayX}px`);
      petal.style.setProperty('--rot-z', `${newRotZ}deg`);
    });
  }

  // 3D Card Tilt (Parallax) interaction
  function initCardTilt() {
    const cardWrapper = document.getElementById('card-wrapper');
    if (!cardWrapper) return;

    window.addEventListener('mousemove', (e) => {
      // Only tilt if card is visible (not hidden after unboxing)
      if (cardWrapper.style.opacity === '0') return;

      const rect = cardWrapper.getBoundingClientRect();
      const cardX = rect.left + rect.width / 2;
      const cardY = rect.top + rect.height / 2;

      const dx = e.clientX - cardX;
      const dy = e.clientY - cardY;

      // Soft 3D tilt angles
      const rotateX = -(dy / window.innerHeight) * 16;
      const rotateY = (dx / window.innerWidth) * 16;

      cardWrapper.style.transform = `perspective(1000px) scale(1) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`;
    });

    document.addEventListener('mouseleave', () => {
      if (cardWrapper.style.opacity !== '0') {
        cardWrapper.style.transform = 'perspective(1000px) scale(1) rotateX(0deg) rotateY(0deg)';
      }
    });
  }

  // Initialize Landing Page animations
  initFlowerPetals();
  initCardTilt();
});
