let poseNet;
let video;
let poses = [];
let ball;
let currentCatIndex = 0;
let catData = [
    { img: 'HuhCat.png', sound: 'HuhCat' },
    { img: 'OiiCat.png', sound: 'OiiCat' },
    { img: 'BababoiCat.png', sound: 'BababoiCat' },
    { img: 'BananaCat.png', sound: 'BananaCat' }
];
let isSquished = false;
let bothHandsStartTime = null;
let audioContext;
let pitchSlider;
let sourceNodes = {};
let lastSoundTime = 0;
const soundCooldown = 500; // 500ms cooldown between sounds

function setup() {
    let canvas = createCanvas(640, 480);
    canvas.parent('canvas-container');
    
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();
    
    poseNet = ml5.poseNet(video, modelLoaded);
    poseNet.on('pose', (results) => {
        poses = results;
    });
    
    ball = document.getElementById('ball');
    pitchSlider = document.getElementById('pitch-slider');
    
    // Initialize Web Audio API
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    // Resume AudioContext on user interaction
    document.addEventListener('click', () => {
        if (audioContext.state === 'suspended') {
            audioContext.resume().then(() => {
                console.log('AudioContext resumed');
            });
        }
    }, { once: true });
    
    // Load audio buffers for pitch shifting
    catData.forEach(cat => {
        const audioElement = document.getElementById(cat.sound);
        loadAudioBuffer(audioElement, cat.sound);
    });
    
    // Log pitch changes
    pitchSlider.addEventListener('input', () => {
        console.log(`Pitch set to: ${pitchSlider.value}`);
    });
    
    loadCat(currentCatIndex);
}

function modelLoaded() {
    console.log('PoseNet Initialized');
}

function loadAudioBuffer(audioElement, soundId) {
    fetch(audioElement.src)
        .then(response => response.arrayBuffer())
        .then(arrayBuffer => audioContext.decodeAudioData(arrayBuffer))
        .then(audioBuffer => {
            sourceNodes[soundId] = { buffer: audioBuffer, source: null };
            console.log(`Audio buffer loaded for ${soundId}`);
        })
        .catch(err => console.error(`Error loading audio for ${soundId}:`, err));
}

function loadCat(index) {
    let catContainer = document.getElementById('cat-container');
    catContainer.innerHTML = '';
    let newCat = createImg(catData[index].img, 'cat image');
    newCat.class('cat-image');
    newCat.parent(catContainer);
    newCat.size(250, 250);
    
    // Reset pitch slider to default (1.0)
    pitchSlider.value = 1.0;
}

function playSound(soundId) {
    const currentTime = Date.now();
    if (currentTime - lastSoundTime < soundCooldown) {
        return; // Prevent rapid sound triggers
    }
    
    if (!sourceNodes[soundId] || !sourceNodes[soundId].buffer) {
        console.warn(`Audio buffer for ${soundId} not loaded yet`);
        return;
    }
    
    // Stop any existing source for this sound
    if (sourceNodes[soundId].source) {
        sourceNodes[soundId].source.stop();
        sourceNodes[soundId].source = null;
    }
    
    try {
        const source = audioContext.createBufferSource();
        source.buffer = sourceNodes[soundId].buffer;
        
        // Apply pitch shift
        const pitch = parseFloat(pitchSlider.value);
        source.playbackRate.value = pitch;
        
        // Adjust duration to maintain original speed
        source.start(0, 0, source.buffer.duration / pitch);
        
        source.connect(audioContext.destination);
        sourceNodes[soundId].source = source;
        
        // Clean up after playback
        source.onended = () => {
            sourceNodes[soundId].source = null;
        };
        
        lastSoundTime = currentTime;
    } catch (err) {
        console.error(`Error playing sound ${soundId}:`, err);
    }
}

function draw() {
    background(255);
    image(video, 0, 0, width, height);
    
    if (poses.length > 0) {
        const pose = poses[0].pose;
        
        if (pose.rightWrist.confidence > 0.2) {
            const x = width - pose.rightWrist.x;
            const y = pose.rightWrist.y;
            
            ball.style.left = `${x - 15}px`;
            ball.style.top = `${y - 15}px`;
            
            checkCatInteraction(x, y);
        }
        
        if (pose.leftWrist.confidence > 0.2 && pose.rightWrist.confidence > 0.2) {
            const leftX = width - pose.leftWrist.x;
            const leftY = pose.leftWrist.y;
            const rightX = width - pose.rightWrist.x;
            const rightY = pose.rightWrist.y;
            
            const distance = dist(leftX, leftY, rightX, rightY);
            
            if (distance < 150) {
                if (!bothHandsStartTime) {
                    bothHandsStartTime = millis();
                } else if (millis() - bothHandsStartTime > 2000) {
                    switchCat();
                }
            } else {
                bothHandsStartTime = null;
            }
        }
    }
}

function checkCatInteraction(x, y) {
    const catArea = {
        x: width/2 - 135,  
        y: height/2 - 135,
        w: 270,
        h: 270
    };
    
    if (x > catArea.x && x < catArea.x + catArea.w &&
        y > catArea.y && y < catArea.y + catArea.h) {
        if (!isSquished) {
            document.querySelector('.cat-image').classList.add('squished');
            playSound(catData[currentCatIndex].sound);
            isSquished = true;
        }
    } else {
        if (isSquished) {
            document.querySelector('.cat-image').classList.remove('squished');
            isSquished = false;
        }
    }
}

function switchCat() {
    currentCatIndex = (currentCatIndex + 1) % catData.length;
    loadCat(currentCatIndex);
    bothHandsStartTime = null;
    isSquished = false;
    console.log(`switch to cat: ${catData[currentCatIndex].img}`);
}

function dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}