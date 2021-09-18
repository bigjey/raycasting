const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

const GRID_SIZE = { x: 10, y: 10 };
const TILE_SIZE = 64;
const RESOLUTION = 200;
const STRIP_WIDTH = (GRID_SIZE.x * TILE_SIZE) / RESOLUTION;

const PLAYER_SPEED = 150;
const TURN_SPEED = 180;
const MAX_VIEW_DISTANCE = 2000;
const FOV = 70;

canvas.width = GRID_SIZE.x * TILE_SIZE * 2;
canvas.height = GRID_SIZE.y * TILE_SIZE;

document.body.appendChild(canvas);

ctx.lineWidth = 1;
ctx.imageSmoothingEnabled = false;

const sprites = {};

// prettier-ignore
const grid = [
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 1, 2, 1, 1, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 1, 0, 0, 0, 2],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 0, 0, 0, 0, 0, 1, 0, 0, 3],
    [3, 0, 0, 1, 2, 1, 1, 1, 0, 3],
    [3, 0, 0, 0, 0, 0, 1, 0, 0, 3],
    [3, 0, 0, 0, 0, 0, 0, 0, 0, 3],
    [3, 3, 3, 3, 3, 3, 3, 3, 3, 3],
];

const playerPos = { x: 110, y: 540 };
let viewAngle = -45;

let lastFrameTime = Date.now();
function tick() {
  const t = Date.now();
  const dt = t - lastFrameTime;
  lastFrameTime = t;

  render();
  update(dt / 1000);

  requestAnimationFrame(tick);
}

function update(dt) {
  const radians = degToRad(viewAngle);
  const viewDirection = {
    x: Math.cos(radians),
    y: Math.sin(radians),
  };
  let moveDirection = 0;

  if (keysPressed["KeyA"]) {
    viewAngle -= TURN_SPEED * dt;
  }
  if (keysPressed["KeyD"]) {
    viewAngle += TURN_SPEED * dt;
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

  // ctx.strokeStyle = "#555";
  // ctx.beginPath();
  // for (let y = 0; y < GRID_SIZE.y; y++) {
  //   for (let x = 0; x < GRID_SIZE.x; x++) {
  //     ctx.moveTo(x * TILE_SIZE, 0);
  //     ctx.lineTo(x * TILE_SIZE, GRID_SIZE.y * TILE_SIZE);

  //     ctx.moveTo(0, y * TILE_SIZE);
  //     ctx.lineTo(GRID_SIZE.x * TILE_SIZE, y * TILE_SIZE);
  //   }
  // }
  // ctx.closePath();
  // ctx.stroke();

  // var grd = ctx.createLinearGradient(0, 0, 0, canvas.height);
  // grd.addColorStop(0, "red");
  // grd.addColorStop(0.5, "white");
  // grd.addColorStop(1, "red");

  // ctx.fillStyle = grd;
  // ctx.fillRect(canvas.width / 2, 0, canvas.width / 2, canvas.height);

  // view ray
  // ctx.strokeStyle = "#0f0";
  // ctx.beginPath();
  // ctx.moveTo(playerPos.x, playerPos.y);
  // ctx.lineTo(
  //   playerPos.x + viewDirection.x * MAX_VIEW_DISTANCE,
  //   playerPos.y + viewDirection.y * MAX_VIEW_DISTANCE
  // );
  // ctx.closePath();
  // ctx.stroke();

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
    const rayAngle = degToRad((i - RESOLUTION / 2) * (FOV / RESOLUTION));

    const rayDirection = {
      x: Math.cos(degToRad(viewAngle) + rayAngle),
      y: Math.sin(degToRad(viewAngle) + rayAngle),
    };

    const hit = castRay(rayDirection);

    ctx.strokeStyle = "#f006";
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

    const beta = rayAngle;
    const d = hit.distance * Math.cos(beta);

    const wallHeight = (GRID_SIZE.y * TILE_SIZE) / d;
    const wallColor = 255 - 255 * (d / 15) - (hit.side === "h" ? 20 : 0);

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
        sprite = sprites[`brick_wall_${hit.side}`];
        break;
      }
      case 2: {
        sprite = sprites[`eagle_${hit.side}`];
        break;
      }
      case 3: {
        sprite = sprites[`wall_${hit.side}`];
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
}

function degToRad(deg) {
  return (Math.PI / 180) * deg;
}

function castRay(direction) {
  // x difference for every 1 of y
  // prettier-ignore
  const dx = (direction.y == 0) ? 0 : ((direction.x == 0) ? 1 : Math.abs(1 / direction.x));
  // y difference for every 1 of x
  // prettier-ignore
  const dy = (direction.x == 0) ? 0 : ((direction.y == 0) ? 1 : Math.abs(1 / direction.y));

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
  while (!hit && iterations < 1000) {
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
      hit = true;

      const hitX = (posX + direction.x * distance) * TILE_SIZE;
      const hitY = (posY + direction.y * distance) * TILE_SIZE;

      return { x: hitX, y: hitY, distance, side, tile: grid[tileY][tileX] };
    }

    iterations++;
  }
}

const loadSprite = async (path) => {
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

const angleBetweenVectors = (v1, v2) => Math.atan2(v2.y - v1.y, v2.x - v1.x);

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
    sprites["wall_h"] = await loadSprite("./assets/wall_h.png");
    sprites["wall_v"] = await loadSprite("./assets/wall_v.png");
    sprites["brick_wall_h"] = await loadSprite("./assets/brick_wall_h.png");
    sprites["brick_wall_v"] = await loadSprite("./assets/brick_wall_v.png");
    sprites["eagle_h"] = await loadSprite("./assets/eagle_h.png");
    sprites["eagle_v"] = await loadSprite("./assets/eagle_v.png");
    loaded = true;
  } catch (e) {
    console.log(e);
  }

  if (loaded) {
    console.log(sprites);
    tick();
  } else {
    console.log("not loaded");
  }
})();
