const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");

const ui = document.getElementById("ui");
const gameOverScreen = document.getElementById("gameOver");
const finalScore = document.getElementById("finalScore");

// Audio
const bgm = document.getElementById("bgm");
const hitSound = document.getElementById("hitSound");
const shootSound = document.getElementById("shootSound");
const gameOverMusic = document.getElementById("gameOverMusic");

let firstInteraction = false;
function startAudio() {
  if (!firstInteraction) {
    bgm.play();
    firstInteraction = true;
  }
}
window.addEventListener("keydown", startAudio);
window.addEventListener("click", startAudio);

// --- LOAD IMAGES ---
const playerFrames = [];
const policeFrames = [];
const carImg = new Image();
carImg.src = "images/car.png";
const waterImg = new Image();
waterImg.src = "images/water.png";

for (let i = 0; i < 4; i++) {
  const img = new Image();
  img.src = `images/player_${i}.png`;
  playerFrames.push(img);
}

for (let i = 0; i < 4; i++) {
  const img = new Image();
  img.src = `images/police_${i}.png`;
  policeFrames.push(img);
}

// --- GAME VARIABLES ---
let player, police, cars, water, keys, score, gameRunning, speed;
let playerFrame = 0, playerFrameDelay = 0;
let policeFrame = 0, policeFrameDelay = 0;

// --- INIT ---
function init() {
  player = { x: 50, y: canvas.height / 2, size: 70 };
  police = [];
  cars = [];
  water = [];
  keys = {};
  score = 0;
  gameRunning = true;
  speed = 2;
  spawnPolice();
  spawnCars();
}

// --- SPAWN ENEMIES ---
function spawnPolice() {
  setInterval(() => {
    if (gameRunning) {
      police.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - 80),
        size: 70,
        speed: speed
      });
    }
  }, 2000);
}

function spawnCars() {
  setInterval(() => {
    if (gameRunning) {
      cars.push({
        x: canvas.width,
        y: Math.random() * (canvas.height - 60),
        width: 100,
        height: 50,
        speed: speed * 0.8,
        shootCooldown: 0
      });
    }
  }, 5000);
}

// --- COLLISION ---
function isColliding(obj1, obj2, shrinkFactor = 0.6) {
  const obj1CenterX = obj1.x + (obj1.size || obj1.width) / 2;
  const obj1CenterY = obj1.y + (obj1.size || obj1.height) / 2;
  const obj2CenterX = obj2.x + (obj2.size || obj2.width) / 2;
  const obj2CenterY = obj2.y + (obj2.size || obj2.height) / 2;

  const dx = obj1CenterX - obj2CenterX;
  const dy = obj1CenterY - obj2CenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const obj1Radius = (Math.min(obj1.size || obj1.width, obj1.size || obj1.height) / 2) * shrinkFactor;
  const obj2Radius = (Math.min(obj2.size || obj2.width, obj2.size || obj2.height) / 2) * shrinkFactor;

  return distance < obj1Radius + obj2Radius;
}

// --- UPDATE ---
function update() {
  if (!gameRunning) return;

  // Player movement
  if (keys["ArrowUp"] && player.y > 0) player.y -= 4;
  if (keys["ArrowDown"] && player.y < canvas.height - player.size) player.y += 4;
  if (keys["ArrowLeft"] && player.x > 0) player.x -= 4;
  if (keys["ArrowRight"] && player.x < canvas.width - player.size) player.x += 4;

  // Move police
  police.forEach(p => { p.x -= p.speed; });

  // Move cars and shoot water
  cars.forEach(c => {
    c.x -= c.speed;
    c.shootCooldown--;
    if (c.shootCooldown <= 0) {
      fireBurst(c);
      c.shootCooldown = 100;
    }
  });

  // Move water bullets
  for (let i = water.length - 1; i >= 0; i--) {
    let w = water[i];
    w.x += w.vx;
    w.y += w.vy;

    if (isColliding(player, w)) {
      hitSound.play();
      endGame();
      return; // stop updating further
    }

    // Remove offscreen bullets
    if (w.x + w.width < 0 || w.x > canvas.width || w.y + w.height < 0 || w.y > canvas.height) {
      water.splice(i, 1);
    }
  }

  // Collision with police
  for (let p of police) {
    if (isColliding(player, p)) {
      hitSound.play();
      endGame();
      return;
    }
  }

  // Collision with cars
  for (let c of cars) {
    if (isColliding(player, c)) {
      hitSound.play();
      endGame();
      return;
    }
  }

  // Cleanup offscreen enemies
  police = police.filter(p => p.x + p.size > 0);
  cars = cars.filter(c => c.x + c.width > 0);

  // Score & difficulty
  score++;
  ui.innerText = "Score: " + score;
  if (score % 300 === 0) speed += 0.5;

  // Animate frames
  playerFrameDelay++;
  if (playerFrameDelay > 10) {
    playerFrame = (playerFrame + 1) % playerFrames.length;
    playerFrameDelay = 0;
  }
  policeFrameDelay++;
  if (policeFrameDelay > 10) {
    policeFrame = (policeFrame + 1) % policeFrames.length;
    policeFrameDelay = 0;
  }
}

// --- FIRE BULLETS ---
function fireBurst(car) {
  shootSound.play();
  let angleSpread = Math.min(0.4, score / 2000);
  const bullets = [
    { angle: 0 },
    { angle: -angleSpread },
    { angle: angleSpread }
  ];
  bullets.forEach(b => {
    let baseSpeed = Math.max(4, car.speed + 3);
    water.push({
      x: car.x - 6,
      y: car.y + car.height / 2 - 2.5,
      width: 20,
      height: 10,
      vx: -baseSpeed * Math.cos(b.angle),
      vy: baseSpeed * Math.sin(b.angle)
    });
  });
}

// --- DRAW ---
function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Player
  ctx.drawImage(playerFrames[playerFrame], player.x, player.y, player.size, player.size);

  // Police
  police.forEach(p => ctx.drawImage(policeFrames[policeFrame], p.x, p.y, p.size, p.size));

  // Cars
  cars.forEach(c => ctx.drawImage(carImg, c.x, c.y, c.width, c.height));

  // Water
  water.forEach(w => ctx.drawImage(waterImg, w.x, w.y, w.width, w.height));

  // Game Over
  if (!gameRunning) {
    ctx.fillStyle = "red";
    ctx.font = "50px Arial";
    ctx.fillText("GAME OVER", canvas.width / 2 - 150, canvas.height / 2);
  }
}

// --- GAME LOOP ---
function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

// --- END / RESTART ---
function endGame() {
  gameRunning = false;
  bgm.pause();
  gameOverMusic.play();
  finalScore.innerText = "Your Score: " + score;
  gameOverScreen.style.display = "block";
}

function restartGame() {
  init();
  gameOverScreen.style.display = "none";
  bgm.currentTime = 0;
  gameOverMusic.pause();
  bgm.play();
}

// Controls
window.addEventListener("keydown", e => (keys[e.key] = true));
window.addEventListener("keyup", e => (keys[e.key] = false));

// Start
init();
gameLoop();
