import { warehouseLayout } from './warehouseLayout.js';

const canvas = document.getElementById("warehouseCanvas");
const ctx = canvas.getContext("2d");

const binsOnLoad = ['7-GG', '8-GG', '317-WD', '6-GG', '26-GG', '1972-SM', '11-GG', '33-GG', '320-WD', '318-WD', '2039-SM', '24-PB', '5-GG', '31-GG', '183-GG', '14-PB', '32-GG', '42-GG', '55-GG', '12-GG'];
const lastLocation = "1200-SM";

function initializeCanvas() {
  canvas.width = warehouseLayout.canvas.width;
  canvas.height = warehouseLayout.canvas.height;
}

function drawSquares() {
  warehouseLayout.rectangles.forEach(rect => {
    ctx.fillStyle = "rgba(162, 162, 162, 0.32)";
    ctx.fillRect(
      rect.corners.top_left.x,
      rect.corners.top_left.y,
      rect.corners.top_right.x - rect.corners.top_left.x,
      rect.corners.bottom_left.y - rect.corners.top_left.y
    );
    ctx.strokeStyle = "white";
    ctx.strokeRect(
      rect.corners.top_left.x,
      rect.corners.top_left.y,
      rect.corners.top_right.x - rect.corners.top_left.x,
      rect.corners.bottom_left.y - rect.corners.top_left.y
    );

    if (rect.label) {
      ctx.fillStyle = "white";
      ctx.font = "12px Arial";
      ctx.textAlign = "center";
      ctx.fillText(
        rect.label,
        (rect.corners.top_left.x + rect.corners.top_right.x) / 2,
        (rect.corners.top_left.y + rect.corners.bottom_left.y) / 2
      );
    }
  });
}

function getClosestBinCoordinates(input) {
    const [binNumber, label] = input.split("-");
    const binValue = parseInt(binNumber);
  
    const matchingRectangles = warehouseLayout.rectangles.filter(rect => rect.label === label);
  
    if (matchingRectangles.length === 0) {
      console.error(`No rectangles found with label "${label}".`);
      return null;
    }
  
    let closestRect = null;
    let minDistance = Infinity;
  
    matchingRectangles.forEach(rect => {
      const minValue = Math.min(...Object.values(rect.corner_values));
      const maxValue = Math.max(...Object.values(rect.corner_values));
      
      let distanceToRange;
      if (label === 'WD') {
        distanceToRange = Math.abs(binValue - Math.floor((minValue + maxValue) / 2));
      } else {
        distanceToRange = binValue < minValue ? minValue - binValue :
                          binValue > maxValue ? binValue - maxValue : 0;
      }
      
      if (distanceToRange < minDistance) {
        minDistance = distanceToRange;
        closestRect = rect;
      }
    });
  
    if (!closestRect) {
      console.error(`Unable to find a close match for the given bin number: ${input}`);
      return null;
    }
  
    let x, y;
    if (label === 'WD') {
      // For WD bins, interpolate along the left edge
      const minValue = Math.min(...Object.values(closestRect.corner_values));
      const maxValue = Math.max(...Object.values(closestRect.corner_values));
      const t = (binValue - minValue) / (maxValue - minValue);
      x = closestRect.corners.top_left.x;
      y = closestRect.corners.top_left.y + t * (closestRect.corners.bottom_left.y - closestRect.corners.top_left.y);
    } else {
      // For other bins, use the original top/bottom edge interpolation
      const clampedBinValue = Math.max(
        Math.min(binValue, Math.max(...Object.values(closestRect.corner_values))),
        Math.min(...Object.values(closestRect.corner_values))
      );
    
      const isTop = Math.abs(closestRect.corner_values.top_left - clampedBinValue) <
                    Math.abs(closestRect.corner_values.bottom_left - clampedBinValue);
    
      if (isTop) {
        // Interpolate along the top edge
        const t = (clampedBinValue - closestRect.corner_values.top_left) / 
                  (closestRect.corner_values.top_right - closestRect.corner_values.top_left);
        x = closestRect.corners.top_left.x + t * (closestRect.corners.top_right.x - closestRect.corners.top_left.x);
        y = closestRect.corners.top_left.y;
      } else {
        // Interpolate along the bottom edge
        const t = (clampedBinValue - closestRect.corner_values.bottom_left) / 
                  (closestRect.corner_values.bottom_right - closestRect.corner_values.bottom_left);
        x = closestRect.corners.bottom_left.x + t * (closestRect.corners.bottom_right.x - closestRect.corners.bottom_left.x);
        y = closestRect.corners.bottom_left.y;
      }
    }
  
    return { x, y };
}
function createGrid() {
    const grid = Array(canvas.height).fill().map(() => Array(canvas.width).fill(0));
    const bufferSize = 4; // Adjust this value to change the size of the buffer zone
  
    warehouseLayout.rectangles.forEach(rect => {
      const minY = Math.max(0, Math.floor(rect.corners.top_left.y) - bufferSize);
      const maxY = Math.min(canvas.height - 1, Math.floor(rect.corners.bottom_left.y) + bufferSize);
      const minX = Math.max(0, Math.floor(rect.corners.top_left.x) - bufferSize);
      const maxX = Math.min(canvas.width - 1, Math.floor(rect.corners.top_right.x) + bufferSize);
  
      for (let y = minY; y <= maxY; y++) {
        for (let x = minX; x <= maxX; x++) {
          grid[y][x] = 1;
        }
      }
    });
  
    return grid;
  }

function euclideanDistance(a, b) {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
}

function getNeighbors(node, grid) {
  const neighbors = [];
  const directions = [
    { dx: 0, dy: -1 }, { dx: 1, dy: 0 }, { dx: 0, dy: 1 }, { dx: -1, dy: 0 }
  ];

  for (const dir of directions) {
    const newX = Math.floor(node.x + dir.dx);
    const newY = Math.floor(node.y + dir.dy);

    if (
      newX >= 0 && newX < grid[0].length &&
      newY >= 0 && newY < grid.length &&
      grid[newY][newX] === 0
    ) {
      neighbors.push({ x: newX, y: newY });
    }
  }

  return neighbors;
}

function aStar(start, goal, grid) {
  const openSet = [start];
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  gScore.set(`${start.x},${start.y}`, 0);
  fScore.set(`${start.x},${start.y}`, euclideanDistance(start, goal));

  while (openSet.length > 0) {
    let current = openSet.reduce((a, b) =>
      fScore.get(`${a.x},${a.y}`) < fScore.get(`${b.x},${b.y}`) ? a : b
    );

    if (current.x === goal.x && current.y === goal.y) {
      return reconstructPath(cameFrom, current);
    }

    openSet.splice(openSet.indexOf(current), 1);

    for (const neighbor of getNeighbors(current, grid)) {
      const tentativeGScore = gScore.get(`${current.x},${current.y}`) + 1;

      if (
        !gScore.has(`${neighbor.x},${neighbor.y}`) ||
        tentativeGScore < gScore.get(`${neighbor.x},${neighbor.y}`)
      ) {
        cameFrom.set(`${neighbor.x},${neighbor.y}`, current);
        gScore.set(`${neighbor.x},${neighbor.y}`, tentativeGScore);
        fScore.set(
          `${neighbor.x},${neighbor.y}`,
          tentativeGScore + euclideanDistance(neighbor, goal)
        );

        if (!openSet.some((node) => node.x === neighbor.x && node.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }

  return null; // No path found
}

function reconstructPath(cameFrom, current) {
  const path = [current];
  while (cameFrom.has(`${current.x},${current.y}`)) {
    current = cameFrom.get(`${current.x},${current.y}`);
    path.unshift(current);
  }
  return path;
}



function findClosestFreePoint(point, grid) {
    const maxDistance = Math.min(100, Math.max(grid.length, grid[0].length));
    const visited = new Set();
    const bufferSize = 5; // This should match the bufferSize in createGrid

    // Check if the initial point is already free
    const initialX = Math.floor(point.x);
    const initialY = Math.floor(point.y);
    if (initialX >= bufferSize && initialX < grid[0].length - bufferSize &&
        initialY >= bufferSize && initialY < grid.length - bufferSize &&
        grid[initialY][initialX] === 0) {
        return { x: initialX, y: initialY };
    }

    for (let d = 1; d <= maxDistance; d++) {
        for (let dy = -d; dy <= d; dy++) {
            for (let dx = -d; dx <= d; dx++) {
                if (Math.abs(dx) + Math.abs(dy) === d) {
                    const x = Math.floor(point.x + dx);
                    const y = Math.floor(point.y + dy);
                    const key = `${x},${y}`;

                    if (!visited.has(key)) {
                        visited.add(key);
                        if (
                            x >= bufferSize && x < grid[0].length - bufferSize &&
                            y >= bufferSize && y < grid.length - bufferSize &&
                            grid[y][x] === 0
                        ) {
                            return { x, y };
                        }
                    }
                }
            }
        }
    }

    console.error(`Unable to find a free point near (${point.x}, ${point.y})`);
    return null;
}

function drawPoint(x, y, color) {
  ctx.beginPath();
  ctx.arc(x, y, 5, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1;
  ctx.stroke();
  ctx.closePath();
}

function findBestBin() {
    const grid = createGrid();
    const start = getClosestBinCoordinates(lastLocation);
    if (!start) {
      console.error(`Unable to find coordinates for last location: ${lastLocation}`);
      return null;
    }
  
    const startFree = findClosestFreePoint(start, grid);
    if (!startFree) {
      console.error(`Unable to find a free point near the start location: ${JSON.stringify(start)}`);
      return null;
    }
  
    let bestBin = null;
    let shortestPath = null;
    let shortestPathLength = Infinity;
  
    for (const binInput of binsOnLoad) {
      const end = getClosestBinCoordinates(binInput);
      if (!end) {
        console.warn(`Skipping bin ${binInput} as coordinates couldn't be found`);
        continue;
      }
  
      const endFree = findClosestFreePoint(end, grid);
      if (!endFree) {
        console.warn(`Skipping bin ${binInput} as no free point could be found nearby`);
        continue;
      }
  
      const distance = euclideanDistance(startFree, endFree);
      
      // If the distance is very small, create a minimal path
      if (distance < 2) {
        const minimalPath = [
          startFree,
          { x: startFree.x + 1, y: startFree.y },
          { x: startFree.x + 1, y: startFree.y + 1 },
          { x: startFree.x, y: startFree.y + 1 },
          endFree
        ];
        return { bestBin: binInput, path: minimalPath };
      }
  
      if (distance < shortestPathLength) {
        shortestPathLength = distance;
        bestBin = binInput;
        shortestPath = [startFree, endFree];
      }
    }
  
    if (bestBin && shortestPath) {
      const path = aStar(shortestPath[0], shortestPath[1], grid);
      return { bestBin, path };
    }
  
    console.error("Unable to find a valid path to any bin.");
    return null;
 }


function drawAnimatedPath(path, endBinCoordinates) {
    const totalLength = path.reduce((total, point, index) => {
      if (index === 0) return 0;
      return total + euclideanDistance(path[index - 1], point);
    }, 0);
  
    function easeOutQuint(t) {
      return 1 - Math.pow(1 - t, 5);
    }
  
    let glowRadius = 10;
    let glowDirection = 1;
  
    function animate(currentTime) {
      if (!animate.startTime) animate.startTime = currentTime;
      const elapsed = currentTime - animate.startTime;
      const duration = 2000; // 2 seconds for the path animation
      const progress = Math.min(elapsed / duration, 1);
  
      const t = easeOutQuint(progress);
      const targetLength = totalLength * t;
  
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawSquares(); // Redraw the background
  
      // Draw and animate the glow effect
      glowRadius += 0.2 * glowDirection;
      if (glowRadius > 20 || glowRadius < 10) glowDirection *= -1;
      drawGlow(endBinCoordinates.x, endBinCoordinates.y, glowRadius, 'rgba(0, 255, 255, 0.5)');
  
      ctx.beginPath();
      ctx.moveTo(path[0].x, path[0].y);
  
      let currentLength = 0;
      let currentPoint = path[0];
      for (let i = 1; i < path.length; i++) {
        const segmentLength = euclideanDistance(path[i-1], path[i]);
        if (currentLength + segmentLength > targetLength) {
          const remainingLength = targetLength - currentLength;
          const segmentT = remainingLength / segmentLength;
          currentPoint = {
            x: path[i-1].x + (path[i].x - path[i-1].x) * segmentT,
            y: path[i-1].y + (path[i].y - path[i-1].y) * segmentT
          };
          ctx.lineTo(currentPoint.x, currentPoint.y);
          break;
        } else {
          ctx.lineTo(path[i].x, path[i].y);
          currentLength += segmentLength;
          currentPoint = path[i];
        }
      }
  
      // Draw the outer white line
      ctx.strokeStyle = "#f7f7f7";
      ctx.lineWidth = 8;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.stroke();
  
      // Draw the inner gray line
      ctx.strokeStyle = "gray";
      ctx.lineWidth = 3;
      ctx.stroke();
  
      // Draw start point (gray to match inner line)
      drawPoint(path[0].x, path[0].y, "gray", 6);
      
      // Draw end point (cyan neon)
      drawPoint(path[path.length - 1].x, path[path.length - 1].y, "rgb(0, 255, 255)", 6);
  
      requestAnimationFrame(animate);
    }
  
    requestAnimationFrame(animate);
  }
  
  function drawGlow(x, y, radius, color) {
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.8, 'rgba(0, 255, 255, 0.1)');
    gradient.addColorStop(1, 'rgba(0, 255, 255, 0)');
  
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = gradient;
    ctx.fill();
  }
  
  
  function initialize() {
    initializeCanvas();
    drawSquares();
  
    const result = findBestBin();
  
    if (result && result.bestBin && result.path) {
      console.log(`Best bin: ${result.bestBin}`);
      
      const start = getClosestBinCoordinates(lastLocation);
      const end = getClosestBinCoordinates(result.bestBin);
  
      if (start && end) {
        drawAnimatedPath(result.path, end);  // Pass the end coordinates here
        drawPoint(start.x, start.y, "blue");
        // We don't need to draw the end point here as it's now drawn in the animation
      }
    } else {
      console.error("Unable to find a valid path to any bin.");
    }
  }
  
  // The drawAnimatedPath function remains the same as in your provided code
  
  // Run the initialization when the script loads
  initialize();