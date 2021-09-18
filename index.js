const canvas = document.createElement("canvas");
const ctx = canvas.getContext("2d");

const GRID_SIZE = { x: 10, y: 10 };
const TILE_SIZE = 64;
const RESOLUTION = 32;
const STRIP_WIDTH = (GRID_SIZE.x * TILE_SIZE) / RESOLUTION;

const PLAYER_SPEED = 150;
const TURN_SPEED = 90;
const MAX_VIEW_DISTANCE = 2000;
const FOV = 70;

canvas.width = GRID_SIZE.x * TILE_SIZE * 2;
canvas.height = GRID_SIZE.y * TILE_SIZE;

document.body.appendChild(canvas);

ctx.lineWidth = 1;

// prettier-ignore
const grid = [
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 1, 1, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 1, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 1, 1, 1, 1, 0, 1],
    [1, 0, 0, 0, 0, 0, 1, 0, 0, 1],
    [1, 0, 0, 0, 0, 0, 0, 0, 0, 1],
    [1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
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

  if (keysPressed["KeyA"]) {
    viewAngle -= TURN_SPEED * dt;
  }
  if (keysPressed["KeyD"]) {
    viewAngle += TURN_SPEED * dt;
  }
  if (keysPressed["KeyW"]) {
    //   move forward
    playerPos.x += viewDirection.x * PLAYER_SPEED * dt;
    playerPos.y += viewDirection.y * PLAYER_SPEED * dt;
  } else if (keysPressed["KeyS"]) {
    playerPos.x -= viewDirection.x * PLAYER_SPEED * dt;
    playerPos.y -= viewDirection.y * PLAYER_SPEED * dt;
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
      if (grid[y][x] === 1) {
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

  ctx.fillStyle = "#383838";
  ctx.fillRect(canvas.width / 2, 0, canvas.width / 2, canvas.height / 2);
  ctx.fillStyle = "#707070";
  ctx.fillRect(
    canvas.width / 2,
    canvas.height / 2,
    canvas.width / 2,
    canvas.height / 2
  );

  const hits = [];
  for (let i = 0; i < RESOLUTION; i++) {
    const radians = degToRad(
      viewAngle + (i - RESOLUTION / 2) * (FOV / RESOLUTION)
    );

    const viewDirection = {
      x: Math.cos(radians),
      y: Math.sin(radians),
    };

    const hit = castRay(viewDirection);
    hits.push(hit);

    ctx.strokeStyle = "#f006";
    ctx.beginPath();
    ctx.moveTo(playerPos.x, playerPos.y);
    ctx.lineTo(
      hit ? hit.x : playerPos.x + viewDirection.x * MAX_VIEW_DISTANCE,
      hit ? hit.y : playerPos.y + viewDirection.y * MAX_VIEW_DISTANCE
    );
    ctx.closePath();
    ctx.stroke();

    if (hit) {
      ctx.fillStyle = "orange";
      ctx.beginPath();
      ctx.arc(hit.x, hit.y, 3, 0, Math.PI * 2);
      ctx.closePath();
      ctx.fill();
    }
  }

  for (let i = 0; i < hits.length; i++) {
    const hit = hits[i];
    // console.log(hit.distance, hit.perpDistance);
    const beta = angleBetweenVectors(
      { x: playerPos.x - hit.x, y: playerPos.y - hit.y },
      viewDirection
    );
    const p =
      (hit.x - playerPos.x) * Math.cos(beta) +
      (hit.y - playerPos.y) * Math.sin(beta);

    // console.log(hit.distance * TILE_SIZE, p);

    const wallHeight = Math.max(
      GRID_SIZE.y * TILE_SIZE - hit.perpDistance * TILE_SIZE,
      40
    );
    const c = 255 - 255 * (hit.perpDistance / 30);

    ctx.fillStyle = `rgba(${c},${c},${c})`;
    ctx.fillRect(
      GRID_SIZE.x * TILE_SIZE + i * STRIP_WIDTH,
      (GRID_SIZE.y * TILE_SIZE) / 2 - wallHeight / 2,
      STRIP_WIDTH,
      wallHeight
    );
  }

  ctx.strokeStyle = "#f0f4";
  ctx.beginPath();
  ctx.moveTo(playerPos.x, playerPos.y);
  ctx.lineTo(
    playerPos.x + viewDirection.x * MAX_VIEW_DISTANCE,
    playerPos.y + viewDirection.y * MAX_VIEW_DISTANCE
  );
  ctx.closePath();
  ctx.stroke();

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
  let perpDistance;

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
  while (!hit && iterations < 1000) {
    if (distanceX < distanceY) {
      distance = distanceX;
      distanceX += dx;
      tileX += stepX;
      perpDistance = (tileX - posX + (1 - stepX) / 2) / direction.x;
    } else {
      distance = distanceY;
      distanceY += dy;
      tileY += stepY;
      perpDistance = (tileY - posY + (1 - stepY) / 2) / direction.y;
    }

    if (grid[tileY][tileX] === 1) {
      hit = true;

      const hitX = (posX + direction.x * distance) * TILE_SIZE;
      const hitY = (posY + direction.y * distance) * TILE_SIZE;

      return { x: hitX, y: hitY, distance, perpDistance };
    }

    iterations++;
  }
}

const angleBetweenVectors = (v1, v2) => Math.atan2(v2.y - v1.y, v2.x - v1.x);

const keysPressed = {};
document.addEventListener("keyup", function (e) {
  keysPressed[e.code] = false;
});
document.addEventListener("keydown", function (e) {
  keysPressed[e.code] = true;
});

tick();
