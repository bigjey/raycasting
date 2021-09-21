const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const GRID_SIZE = { x: 10, y: 10 };
const TILE_SIZE = 64;
const RESOLUTION = 320;
const STRIP_WIDTH = (GRID_SIZE.x * TILE_SIZE) / RESOLUTION;

const PLAYER_SPEED = 150;
const TURN_SPEED = 180;
const MAX_VIEW_DISTANCE = 2000;
const FOV = 70;

canvas.width = GRID_SIZE.x * TILE_SIZE * 2;
canvas.height = GRID_SIZE.y * TILE_SIZE;

ctx.lineWidth = 1;
ctx.imageSmoothingEnabled = false;

const textures = {};
const sprites = {};
const animations = {};

let hideClipping = true;
let usePerpDist = false;

const hitsBuffer = new Array(RESOLUTION);

// prettier-ignore
const grid = [
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 1, 2, 1, 1, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 1, 0, 0, 0, 2],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
];

const playerPos = { x: 110, y: 540 };
let viewAngle = -70;

let lastFrameTime = Date.now();
function tick() {
  const t = Date.now();
  const dt = t - lastFrameTime;
  lastFrameTime = t;

  update(dt / 1000);
  render();

  requestAnimationFrame(tick);
}

const ENEMY_STATE = {
  IDLE: 1,
  WALK: 2,
  HIT: 3,
  DEATH: 4,
  ALERT: 5,
  SHOOT: 6,
};

const enemies = [];

function update(dt) {
  const radians = degToRad(viewAngle);
  const viewDirection = {
    x: Math.cos(radians),
    y: Math.sin(radians),
  };
  let moveDirection = 0;

  if (keysPressed["KeyA"]) {
    viewAngle = (viewAngle - TURN_SPEED * dt + 360) % 360;
  }

  if (keysPressed["KeyD"]) {
    viewAngle = (viewAngle + TURN_SPEED * dt + 360) % 360;
  }

  if (keysPressed["KeyM"]) {
    keysPressed["KeyM"] = false;
    hideClipping = !hideClipping;
  }

  if (keysPressed["KeyK"]) {
    keysPressed["KeyK"] = false;
    usePerpDist = !usePerpDist;
  }

  if (keysPressed["KeyW"]) {
    moveDirection = 1;
  } else if (keysPressed["KeyS"]) {
    moveDirection = -1;
  }

  if (moveDirection !== 0) {
    const newPosX =
      playerPos.x + moveDirection * viewDirection.x * PLAYER_SPEED * dt;
    const newPosY =
      playerPos.y + moveDirection * viewDirection.y * PLAYER_SPEED * dt;

    const tileX = Math.floor(playerPos.x / TILE_SIZE);
    const tileY = Math.floor(playerPos.y / TILE_SIZE);

    const newTileX = Math.floor(newPosX / TILE_SIZE);
    const newTileY = Math.floor(newPosY / TILE_SIZE);

    if (grid[newTileY][tileX] === 0) {
      playerPos.y = newPosY;
    }

    if (grid[tileY][newTileX] === 0) {
      playerPos.x = newPosX;
    }
  }

  for (let i = 0; i < RESOLUTION; i++) {
    const rayAngle = degToRad((i - RESOLUTION / 2) * (FOV / RESOLUTION));

    const rayDirection = {
      x: Math.cos(degToRad(viewAngle) + rayAngle),
      y: Math.sin(degToRad(viewAngle) + rayAngle),
    };

    const beta = degToRad((i - RESOLUTION / 2) * (FOV / RESOLUTION));

    hitsBuffer[i] = castRay(rayDirection, beta);
  }

  enemies.sort((a, b) => {
    const px = playerPos.x;
    const py = playerPos.y;
    const d1 =
      (px - a.pos.x) * (px - a.pos.x) + (py - a.pos.y) * (py - a.pos.y);
    const d2 =
      (px - b.pos.x) * (px - b.pos.x) + (py - b.pos.y) * (py - b.pos.y);
    return d2 - d1;
  });

  for (const enemy of enemies) {
    enemy.update();
  }
}

function render() {
  const radians = degToRad(viewAngle);

  const viewDirection = {
    x: Math.cos(radians),
    y: Math.sin(radians),
  };

  ctx.fillStyle = "#ddd";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#777";
  for (let y = 0; y < GRID_SIZE.y; y++) {
    for (let x = 0; x < GRID_SIZE.x; x++) {
      if (grid[y][x] !== 0) {
        ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  ctx.fillStyle = "#383838";
  ctx.fillRect(canvas.width / 2, 0, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = "#707070";
  ctx.fillRect(
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2,
    canvas.height / 2
  );

  for (let i = 0; i < RESOLUTION; i++) {
    const hit = hitsBuffer[i];

    ctx.strokeStyle = "#f602";
    ctx.beginPath();
    ctx.moveTo(playerPos.x, playerPos.y);
    ctx.lineTo(
      hit ? hit.x : playerPos.x + viewDirection.x * MAX_VIEW_DISTANCE,
      hit ? hit.y : playerPos.y + viewDirection.y * MAX_VIEW_DISTANCE
    );
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = "orange";
    ctx.beginPath();
    ctx.arc(hit.x, hit.y, 3, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    const wallHeight = (GRID_SIZE.y * TILE_SIZE) / hit.distanceP;
    const wallColor =
      255 - 255 * (hit.distanceP / 15) - (hit.side === "h" ? 20 : 0);

    // ctx.fillStyle = `rgb(${wallColor}, ${wallColor}, ${wallColor})`;
    // ctx.fillRect(
    //   GRID_SIZE.x * TILE_SIZE + i * STRIP_WIDTH,
    //   (GRID_SIZE.y * TILE_SIZE) / 2 - wallHeight / 2,
    //   STRIP_WIDTH,
    //   wallHeight
    // );

    let texX =
      hit.side === "h"
        ? (hit.y % TILE_SIZE) / TILE_SIZE
        : (hit.x % TILE_SIZE) / TILE_SIZE;

    let sprite;
    switch (hit.tile) {
      case 1: {
        sprite = textures[`brick_wall_${hit.side}`];
        break;
      }
      case 2: {
        sprite = textures[`eagle_${hit.side}`];
        break;
      }
      case 3: {
        sprite = textures[`wall_${hit.side}`];
        break;
      }
      default: {
      }
    }

    texX = Math.floor(texX * sprite.width);

    ctx.drawImage(
      sprite,
      texX,
      0,
      1,
      sprite.height,
      GRID_SIZE.x * TILE_SIZE + i * STRIP_WIDTH,
      (GRID_SIZE.y * TILE_SIZE) / 2 - wallHeight / 2,
      STRIP_WIDTH,
      wallHeight
    );
  }

  ctx.fillStyle = "green";
  ctx.beginPath();
  ctx.arc(playerPos.x, playerPos.y, 16, 0, Math.PI * 2);
  ctx.closePath();
  ctx.fill();

  for (const enemy of enemies) {
    enemy.render();
  }
}

function degToRad(deg) {
  return (Math.PI / 180) * deg;
}

function radToDeg(rad) {
  return (rad * 180) / Math.PI;
}

function castRay(direction, beta) {
  const dx =
    direction.y == 0 ? 0 : direction.x == 0 ? 1 : Math.abs(1 / direction.x);
  const dy =
    direction.x == 0 ? 0 : direction.y == 0 ? 1 : Math.abs(1 / direction.y);

  let distanceX = 0;
  let distanceY = 0;
  let stepX;
  let stepY;
  const posX = playerPos.x / TILE_SIZE;
  const posY = playerPos.y / TILE_SIZE;
  let tileX = parseInt(posX);
  let tileY = parseInt(posY);

  let hit = false;
  let distance;

  if (direction.x < 0) {
    stepX = -1;
    distanceX = (posX - tileX) * dx;
  } else {
    stepX = 1;
    distanceX = (tileX + 1 - posX) * dx;
  }

  if (direction.y < 0) {
    stepY = -1;
    distanceY = (posY - tileY) * dy;
  } else {
    stepY = 1;
    distanceY = (tileY + 1 - posY) * dy;
  }

  let iterations = 0;
  let side;

  while (iterations < 100) {
    if (distanceX < distanceY) {
      distance = distanceX;
      side = "h";
      distanceX += dx;
      tileX += stepX;
    } else {
      distance = distanceY;
      side = "v";
      distanceY += dy;
      tileY += stepY;
    }

    if (grid[tileY][tileX] !== 0) {
      const hitX = (posX + direction.x * distance) * TILE_SIZE;
      const hitY = (posY + direction.y * distance) * TILE_SIZE;

      return {
        x: hitX,
        y: hitY,
        distance: distance,
        distanceP: distance * Math.cos(beta),
        side,
        tile: grid[tileY][tileX],
      };
    }

    iterations++;
  }
}

const loadTexture = async (path) => {
  return new Promise((res, rej) => {
    const img = new Image();

    img.addEventListener("load", () => {
      res(img);
    });

    img.addEventListener("error", () => {
      rej(`${path}: not loaded`);
    });

    img.src = path;
  });
};

const loadSprite = async (path, countX, countY, sizeX, sizeY, gapX, gapY) => {
  return new Promise((res, rej) => {
    const img = new Image();

    img.addEventListener("load", () => {
      const sprite = {
        img,
        countX,
        countY,
        sizeX,
        sizeY,
        gapX,
        gapY,
      };
      res(sprite);
    });

    img.addEventListener("error", () => {
      rej(`${path}: not loaded`);
    });

    img.src = path;
  });
};

const renderSprite = (sprite, offsetX, offsetY, x, y, w, h) => {
  const image = sprite.img;
  const sx = offsetX * sprite.sizeX + offsetX * sprite.gapX;
  const sy = offsetY * sprite.sizeY + offsetY * sprite.gapY;
  const sWidth = sprite.sizeX;
  const sHeight = sprite.sizeY;

  ctx.drawImage(image, sx, sy, sWidth, sHeight, x, y, w, h);
};

const createAnimation = (sprite, frames) => {
  return {
    sprite,
    frames,
  };
};

class Animator {
  constructor() {
    this.speed = 0;
    this.currentFrame = 0;
    this.animation = null;
    this.started = 0;
    this.totalFrames = 0;
    this.loop = false;
  }

  setAnimation(animationName, options = {}) {
    const animation = animations[animationName];
    if (!animation) {
      console.trace(animationName, options);
      return;
    }

    const { speed = 1000, loop = true, reset = true } = options;

    this.animation = animation;
    this.speed = speed;
    this.loop = loop;

    if (reset) {
      this.currentFrame = 0;
      this.started = Date.now();
    }

    this.totalFrames = this.animation.frames.length;
  }

  update() {
    if (!this.animation) return;

    const t = Date.now() - this.started;

    this.currentFrame = Math.floor(t / this.speed);

    if (!this.loop && this.currentFrame > this.totalFrames - 1) {
      this.currentFrame = this.totalFrames - 1;
    }
  }

  render(x, y, w, h) {
    if (!this.animation) return;

    renderSprite(
      this.animation.sprite,
      this.animation.frames[this.currentFrame % this.totalFrames][0],
      this.animation.frames[this.currentFrame % this.totalFrames][1],
      x,
      y,
      w,
      h
    );
  }

  getCurrentSprite() {
    if (!this.animation) return;

    const sprite = this.animation.sprite;

    const offsetX =
      this.animation.frames[this.currentFrame % this.totalFrames][0];
    const offsetY =
      this.animation.frames[this.currentFrame % this.totalFrames][1];

    const image = sprite.img;
    const sx = offsetX * sprite.sizeX + offsetX * sprite.gapX;
    const sy = offsetY * sprite.sizeY + offsetY * sprite.gapY;
    const sWidth = sprite.sizeX;
    const sHeight = sprite.sizeY;

    return { image, sx, sy, sWidth, sHeight };
  }
}

class Enemy1 {
  constructor(pos, dir, initialState = ENEMY_STATE.IDLE) {
    this.animator = new Animator();

    this.setState(initialState);

    this.pos = { ...pos };
    this.dir = { ...dir };
  }

  update() {
    const angle = radToDeg(
      angleBetweenVectors(this.dir, {
        x: this.pos.x - playerPos.x,
        y: this.pos.y - playerPos.y,
      })
    );

    const dir = Math.floor(((angle + 22.5 + 360) % 360) / 45);

    let d;
    switch (dir) {
      case 6:
        d = "e";
        break;
      case 7:
        d = "ne";
        break;
      case 0:
        d = "n";
        break;
      case 1:
        d = "nw";
        break;
      case 2:
        d = "w";
        break;
      case 3:
        d = "sw";
        break;
      case 4:
        d = "s";
        break;
      case 5:
        d = "se";
        break;

      default:
        d = "s";
    }

    switch (this.state) {
      case ENEMY_STATE.WALK:
        this.animator.setAnimation("enemy_2_walk_" + d, {
          speed: 200,
          reset: false,
        });
        break;
      case ENEMY_STATE.IDLE:
        this.animator.setAnimation("enemy_2_idle_" + d, {
          speed: 200,
          reset: false,
        });
        break;
    }

    this.animator.update();
  }

  render() {
    ctx.strokeStyle = "blue";
    ctx.beginPath();
    ctx.moveTo(this.pos.x, this.pos.y);
    ctx.lineTo(this.pos.x + this.dir.x * 32, this.pos.y + this.dir.y * 32);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(this.pos.x, this.pos.y, 10, 0, Math.PI * 2);
    ctx.closePath();
    ctx.fill();

    const angle = degToRad(viewAngle);
    const viewDirection = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };

    const distanceToPlayer = Math.sqrt(
      Math.pow(this.pos.x - playerPos.x, 2) +
        Math.pow(this.pos.y - playerPos.y, 2)
    );

    const directionToEnemy = normalizeVector({
      x: this.pos.x - playerPos.x,
      y: this.pos.y - playerPos.y,
    });

    const theta = angleBetweenVectors(viewDirection, directionToEnemy);

    const dx = this.pos.x - playerPos.x;
    const dy = this.pos.y - playerPos.y;

    const distance = Math.sqrt(dx * dx + dy * dy);
    const scale = 640 / distance;
    const w = 64 * scale;
    const h = 64 * scale;

    const xFactor = theta / degToRad(FOV / 2);

    const x = 320 + 320 * xFactor - w / 2;
    const y = 320 - h / 2;

    const spriteStartX = Math.floor(x / STRIP_WIDTH);
    const spriteEndX = Math.floor((x + w) / STRIP_WIDTH);

    let startX = Math.floor(spriteStartX);
    if (startX < 0) startX = 0;

    let endX = Math.floor((x + w) / STRIP_WIDTH);
    if (endX > RESOLUTION - 1) endX = RESOLUTION - 1;

    if (startX >= RESOLUTION) {
      return;
    }

    if (endX < 0) {
      return;
    }

    const sd = this.animator.getCurrentSprite();

    // ctx.drawImage(
    //   sd.image,
    //   sd.sx,
    //   sd.sy,
    //   sd.sWidth,
    //   sd.sHeight,
    //   640 + x,
    //   y,
    //   w,
    //   h
    // );

    ctx.fillStyle = "#fff7";
    for (let i = startX; i < endX; i++) {
      const sampleX = Math.floor(
        ((i - spriteStartX) / (spriteEndX - spriteStartX)) * sd.sWidth
      );
      if (
        !hideClipping ||
        distanceToPlayer <
          hitsBuffer[i][usePerpDist ? "distanceP" : "distance"] * TILE_SIZE
      ) {
        ctx.drawImage(
          sd.image,
          sd.sx + sampleX,
          sd.sy,
          1,
          sd.sHeight,
          640 + i * STRIP_WIDTH,
          y,
          STRIP_WIDTH,
          h
        );
      }
    }
  }

  setState(state) {
    this.state = state;

    switch (state) {
      case ENEMY_STATE.ALERT:
        this.animator.setAnimation("enemy_2_alert", {
          speed: 200,
          loop: false,
        });
        break;
      case ENEMY_STATE.DEATH:
        this.animator.setAnimation("enemy_2_death", {
          speed: 200,
          loop: false,
        });
        break;
      case ENEMY_STATE.SHOOT:
        this.animator.setAnimation("enemy_2_shoot", {
          speed: 200,
          loop: false,
        });
        break;
      case ENEMY_STATE.HIT:
        this.animator.setAnimation("enemy_2_hit", {
          speed: 200,
          loop: false,
        });
        break;
    }
  }
}

const angleBetweenVectors = (v1, v2) => {
  var a2 = Math.atan2(v1.y, v1.x);
  var a1 = Math.atan2(v2.y, v2.x);
  var sign = a1 > a2 ? 1 : -1;
  var angle = a1 - a2;
  var K = -sign * Math.PI * 2;
  var angle = Math.abs(K + angle) < Math.abs(angle) ? K + angle : angle;

  return angle;
};

const normalizeVector = (v) => {
  const m = Math.sqrt(v.x * v.x + v.y * v.y);
  return { x: v.x / m, y: v.y / m };
};

const keysPressed = {};
document.addEventListener("keyup", function (e) {
  keysPressed[e.code] = false;
});
document.addEventListener("keydown", function (e) {
  keysPressed[e.code] = true;
});

(async () => {
  let loaded = false;
  try {
    textures["wall_h"] = await loadTexture("./assets/wall_h.png");
    textures["wall_v"] = await loadTexture("./assets/wall_v.png");
    textures["brick_wall_h"] = await loadTexture("./assets/brick_wall_h.png");
    textures["brick_wall_v"] = await loadTexture("./assets/brick_wall_v.png");
    textures["eagle_h"] = await loadTexture("./assets/eagle_h.png");
    textures["eagle_v"] = await loadTexture("./assets/eagle_v.png");

    sprites["enemy_2"] = await loadSprite(
      "./assets/enemy_2.png",
      8,
      7,
      64,
      64,
      1,
      1
    );

    animations["enemy_2_idle_s"] = createAnimation(sprites["enemy_2"], [
      [0, 0],
    ]);

    animations["enemy_2_idle_sw"] = createAnimation(sprites["enemy_2"], [
      [1, 0],
    ]);

    animations["enemy_2_idle_w"] = createAnimation(sprites["enemy_2"], [
      [2, 0],
    ]);

    animations["enemy_2_idle_nw"] = createAnimation(sprites["enemy_2"], [
      [3, 0],
    ]);

    animations["enemy_2_idle_n"] = createAnimation(sprites["enemy_2"], [
      [4, 0],
    ]);

    animations["enemy_2_idle_ne"] = createAnimation(sprites["enemy_2"], [
      [5, 0],
    ]);

    animations["enemy_2_idle_e"] = createAnimation(sprites["enemy_2"], [
      [6, 0],
    ]);

    animations["enemy_2_idle_se"] = createAnimation(sprites["enemy_2"], [
      [7, 0],
    ]);

    animations["enemy_2_walk_s"] = createAnimation(sprites["enemy_2"], [
      [0, 1],
      [0, 2],
      [0, 3],
      [0, 4],
    ]);

    animations["enemy_2_walk_sw"] = createAnimation(sprites["enemy_2"], [
      [1, 1],
      [1, 2],
      [1, 3],
      [1, 4],
    ]);

    animations["enemy_2_walk_w"] = createAnimation(sprites["enemy_2"], [
      [2, 1],
      [2, 2],
      [2, 3],
      [2, 4],
    ]);

    animations["enemy_2_walk_nw"] = createAnimation(sprites["enemy_2"], [
      [3, 1],
      [3, 2],
      [3, 3],
      [3, 4],
    ]);

    animations["enemy_2_walk_n"] = createAnimation(sprites["enemy_2"], [
      [4, 1],
      [4, 2],
      [4, 3],
      [4, 4],
    ]);

    animations["enemy_2_walk_ne"] = createAnimation(sprites["enemy_2"], [
      [5, 1],
      [5, 2],
      [5, 3],
      [5, 4],
    ]);

    animations["enemy_2_walk_e"] = createAnimation(sprites["enemy_2"], [
      [6, 1],
      [6, 2],
      [6, 3],
      [6, 4],
    ]);

    animations["enemy_2_walk_se"] = createAnimation(sprites["enemy_2"], [
      [7, 1],
      [7, 2],
      [7, 3],
      [7, 4],
    ]);

    animations["enemy_2_alert"] = createAnimation(sprites["enemy_2"], [[0, 6]]);

    animations["enemy_2_hit"] = createAnimation(sprites["enemy_2"], [[7, 5]]);

    animations["enemy_2_shoot"] = createAnimation(sprites["enemy_2"], [
      [1, 6],
      [2, 6],
    ]);

    animations["enemy_2_death"] = createAnimation(sprites["enemy_2"], [
      [0, 5],
      [1, 5],
      [2, 5],
      [3, 5],
      [4, 5],
    ]);

    loaded = true;
  } catch (e) {
    console.log(e);
  }

  if (loaded) {
    enemies.push(new Enemy1({ x: 100, y: 100 }, { x: 0, y: 1 }));

    // enemies.push(new Enemy1({ x: 200, y: 300 }, { x: 0, y: 1 }));
    // enemies.push(new Enemy1({ x: 300, y: 300 }, { x: 0, y: 1 }));
    // enemies.push(new Enemy1({ x: 400, y: 300 }, { x: 0, y: 1 }));
    // enemies.push(new Enemy1({ x: 500, y: 300 }, { x: 0, y: 1 }));

    // enemies.push(new Enemy1({ x: 250, y: 500 }, { x: 0, y: -1 }));
    // enemies.push(new Enemy1({ x: 350, y: 500 }, { x: 0, y: -1 }));
    // enemies.push(new Enemy1({ x: 450, y: 500 }, { x: 0, y: -1 }));
    // enemies.push(new Enemy1({ x: 550, y: 500 }, { x: 0, y: -1 }));

    enemies.push(new Enemy1({ x: 500, y: 140 }, { x: 0, y: 1 }));
    enemies.push(new Enemy1({ x: 64 * 6, y: 64 * 4.1 }, { x: 0, y: 1 }));

    tick();
  } else {
    console.log("not loaded");
  }
})();
