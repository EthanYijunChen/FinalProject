let poseNet;
let video;
let poses = [];
let leftHand, rightHand;
let currentCatIndex = 0;
let catData = [
    { img: 'HuhCat.png', sound: 'HuhCat', name: 'Huh Cat', bgGradient: 'linear-gradient(to right, #4fd1c5, #81e6d9)', decorImg: 'Decor1.png', fontClass: 'amatic-sc' },
    { img: 'OiiCat.png', sound: 'OiiCat', name: 'Oii Cat', bgGradient: 'linear-gradient(to right, #f687b3, #fbd5e2)', decorImg: 'Decor2.png', fontClass: 'bubblegum-sans' },
    { img: 'BababoiCat.png', sound: 'BababoiCat', name: 'Bababoi Cat', bgGradient: 'linear-gradient(to right, #f6e05e, #fefcbf)', decorImg: 'Decor3.png', fontClass: 'chewy' },
    { img: 'BananaCat.png', sound: 'BananaCat', name: 'Banana Cat', bgGradient: 'linear-gradient(to right, #f6ad55, #fed7aa)', decorImg: 'Decor4.png', fontClass: 'gochi-hand' },
    { img: 'MusicCat.png', sound: 'MusicCat', name: 'Music Cat', bgGradient: 'linear-gradient(to right, #b794f4, #d6bcfa)', decorImg: 'Decor5.png', fontClass: 'patrick-hand' }
];
let isSquished = false;
let bothHandsStartTime = null;
let audioContext;
let pitchSlider;
let sourceNodes = {};
let currentSource = null;

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
    
    leftHand = document.getElementById('left-hand');
    rightHand = document.getElementById('right-hand');
    pitchSlider = document.getElementById('pitch-slider');
    
    audioContext = new (window.AudioContext || window.webkitAudioContext)();
    document.addEventListener('click', () => {
        if (audioContext.state === 'suspended') {
            audioContext.resume();
        }
    }, { once: true });
    
    catData.forEach(cat => {
        const audioElement = document.getElementById(cat.sound);
        loadAudioBuffer(audioElement, cat.sound);
    });
    
    pitchSlider.addEventListener('input', () => {
        console.log(`Pitch set to: ${pitchSlider.value}`);
    });
    
    document.getElementById('switch-cat-button').addEventListener('click', switchCat);
    
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
    
    document.body.style.background = catData[index].bgGradient;
    
    let catName = document.getElementById('cat-name');
    catName.textContent = catData[index].name;
    catName.className = `absolute ${catData[index].fontClass}`;
    
    let decorations = document.getElementById('decorations');
    decorations.innerHTML = '';
    
    const decorCount = 10;
    const catArea = { x: 320 - 135, y: 240 - 135, w: 270, h: 270 };
    
    for (let i = 0; i < decorCount; i++) {
        let decor = document.createElement('img');
        decor.src = catData[index].decorImg;
        decor.className = 'decoration';
        
        let x, y, angle, scale;
        switch (index) {
            case 0:
                x = Math.random() * 640;
                y = Math.random() * 480;
                while (x > catArea.x && x < catArea.x + catArea.w && y > catArea.y && y < catArea.y + catArea.h) {
                    x = Math.random() * 640;
                    y = Math.random() * 480;
                }
                angle = Math.random() * 360;
                scale = 0.5 + Math.random();
                break;
            case 1:
                let radius = 200 + Math.random() * 50;
                let theta = (i / decorCount) * 2 * Math.PI;
                x = 320 + radius * Math.cos(theta);
                y = 240 + radius * Math.sin(theta);
                angle = theta * 180 / Math.PI;
                scale = 0.7 + Math.random() * 0.8;
                break;
            case 2:
                x = (i % 4) * 150 + 50;
                y = Math.floor(i / 4) * 150 + 50;
                while (x > catArea.x && x < catArea.x + catArea.w && y > catArea.y && y < catArea.y + catArea.h) {
                    x += 100;
                    y += 100;
                }
                angle = Math.random() * 90;
                scale = 0.6 + Math.random() * 0.6;
                break;
            case 3:
                x = 50 + Math.random() * 200;
                y = 50 + Math.random() * 380;
                angle = Math.random() * 180;
                scale = 0.5 + Math.random();
                break;
            case 4:
                x = 390 + Math.random() * 200;
                y = 50 + Math.random() * 380;
                angle = Math.random() * 180;
                scale = 0.5 + Math.random();
                break;
        }
        
        decor.style.left = `${x}px`;
        decor.style.top = `${y}px`;
        decor.style.transform = `rotate(${angle}deg) scale(${scale})`;
        decorations.appendChild(decor);
    }
    
    pitchSlider.value = 1.0;
}

function playSound(soundId) {
    if (!sourceNodes[soundId] || !sourceNodes[soundId].buffer) {
        console.warn(`Audio buffer for ${soundId} not loaded yet`);
        return;
    }
    
    if (currentSource) {
        currentSource.stop();
        currentSource = null;
    }
    
    if (sourceNodes[soundId].source) {
        sourceNodes[soundId].source.stop();
        sourceNodes[soundId].source = null;
    }
    
    try {
        const source = audioContext.createBufferSource();
        source.buffer = sourceNodes[soundId].buffer;
        
        const pitch = parseFloat(pitchSlider.value);
        source.playbackRate.value = pitch;
        
        source.start(0);
        
        source.connect(audioContext.destination);
        sourceNodes[soundId].source = source;
        currentSource = source;
        
        source.onended = () => {
            sourceNodes[soundId].source = null;
            if (currentSource === source) {
                currentSource = null;
            }
        };
    } catch (err) {
        console.error(`Error playing sound ${soundId}:`, err);
    }
}

function draw() {
    if (poses.length > 0) {
        const pose = poses[0].pose;
        
        leftHand.classList.remove('visible');
        rightHand.classList.remove('visible');
        leftHand.style.display = 'none';
        rightHand.style.display = 'none';
        
        let wristX, wristY;
        let useLeftWrist = false;
        
        if (pose.rightWrist.confidence > 0.2 && pose.leftWrist.confidence > 0.2) {
            if (pose.leftWrist.confidence > pose.rightWrist.confidence) {
                wristX = width - pose.leftWrist.x;
                wristY = pose.leftWrist.y;
                useLeftWrist = true;
            } else {
                wristX = width - pose.rightWrist.x;
                wristY = pose.rightWrist.y;
            }
        } else if (pose.rightWrist.confidence > 0.2) {
            wristX = width - pose.rightWrist.x;
            wristY = pose.rightWrist.y;
        } else if (pose.leftWrist.confidence > 0.2) {
            wristX = width - pose.leftWrist.x;
            wristY = pose.leftWrist.y;
            useLeftWrist = true;
        }
        
        if (wristX !== undefined && wristY !== undefined) {
            const hand = useLeftWrist ? leftHand : rightHand;
            hand.style.display = 'block';
            hand.classList.add('visible');
            hand.style.left = `${wristX - 25}px`;
            hand.style.top = `${wristY - 25}px`;
            
            checkCatInteraction(wristX, wristY, useLeftWrist);
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

function checkCatInteraction(x, y, useLeftWrist) {
    const catArea = {
        x: width/2 - 135,  
        y: height/2 - 135,
        w: 270,
        h: 270
    };
    
    const catImage = document.querySelector('.cat-image');
    
    if (x > catArea.x && x < catArea.x + catArea.w &&
        y > catArea.y && y < catArea.y + catArea.h) {
        if (!isSquished) {
            if (useLeftWrist) {
                catImage.classList.add('squished-left');
            } else {
                catImage.classList.add('squished');
            }
            playSound(catData[currentCatIndex].sound);
            isSquished = true;
        }
    } else {
        if (isSquished) {
            catImage.classList.remove('squished');
            catImage.classList.remove('squished-left');
            isSquished = false;
        }
    }
}

function switchCat() {
    if (currentSource) {
        currentSource.stop();
        currentSource = null;
    }
    
    Object.keys(sourceNodes).forEach(soundId => {
        if (sourceNodes[soundId].source) {
            sourceNodes[soundId].source.stop();
            sourceNodes[soundId].source = null;
        }
    });
    
    currentCatIndex = (currentCatIndex + 1) % catData.length;
    loadCat(currentCatIndex);
    bothHandsStartTime = null;
    isSquished = false;
    console.log(`switch to cat: ${catData[currentCatIndex].img}`);
}

function dist(x1, y1, x2, y2) {
    return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
}