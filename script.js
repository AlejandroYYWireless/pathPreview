import { warehouseLayout } from './warehouseLayout.js';

const canvas = document.getElementById("warehouseCanvas");
const ctx = canvas.getContext("2d");

const binsOnLoad = ['7-GG', '8-GG', '317-WD', '6-GG', '26-GG', '1972-SM', '11-GG', '33-GG', '320-WD', '318-WD', '2039-SM', '24-PB', '5-GG', '31-GG', '183-GG', '14-PB', '32-GG', '42-GG', '55-GG', '12-GG'];
const lastLocation = "950-SM";

function initializeCanvas() {
  canvas.width = warehouseLayout.canvas.width;
  canvas.height = warehouseLayout.canvas.height;
}
class BinaryHeap {
    constructor(scoreFunction) {
      this.content = [];
      this.scoreFunction = scoreFunction;
    }
  
    push(element) {
      this.content.push(element);
      this.bubbleUp(this.content.length - 1);
    }
  
    pop() {
      const result = this.content[0];
      const end = this.content.pop();
      if (this.content.length > 0) {
        this.content[0] = end;
        this.sinkDown(0);
      }
      return result;
    }
  
    remove(node) {
      const length = this.content.length;
      for (let i = 0; i < length; i++) {
        if (this.content[i] !== node) continue;
        const end = this.content.pop();
        if (i === length - 1) break;
        this.content[i] = end;
        this.bubbleUp(i);
        this.sinkDown(i);
        break;
      }
    }
  
    size() {
      return this.content.length;
    }
  
    bubbleUp(n) {
      const element = this.content[n];
      const score = this.scoreFunction(element);
      while (n > 0) {
        const parentN = Math.floor((n + 1) / 2) - 1;
        const parent = this.content[parentN];
        if (score >= this.scoreFunction(parent)) break;
        this.content[parentN] = element;
        this.content[n] = parent;
        n = parentN;
      }
    }
  
    sinkDown(n) {
      const length = this.content.length;
      const element = this.content[n];
      const elemScore = this.scoreFunction(element);
  
      while (true) {
        let child2N = (n + 1) * 2;
        let child1N = child2N - 1;
        let swap = null;
        let child1Score;
        if (child1N < length) {
          const child1 = this.content[child1N];
          child1Score = this.scoreFunction(child1);
          if (child1Score < elemScore) swap = child1N;
        }
        if (child2N < length) {
          const child2 = this.content[child2N];
          const child2Score = this.scoreFunction(child2);
          if (child2Score < (swap === null ? elemScore : child1Score)) {
            swap = child2N;
          }
        }
        if (swap === null) break;
        this.content[n] = this.content[swap];
        this.content[swap] = element;
        n = swap;
      }
    }
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
      
      const distanceToRange = binValue < minValue ? minValue - binValue :
                              binValue > maxValue ? binValue - maxValue : 0;
      
      if (distanceToRange < minDistance) {
        minDistance = distanceToRange;
        closestRect = rect;
      }
    });
  
    if (!closestRect) {
      console.error(`Unable to find a close match for the given bin number: ${input}`);
      return null;
    }
  
    const clampedBinValue = Math.max(
      Math.min(binValue, Math.max(...Object.values(closestRect.corner_values))),
      Math.min(...Object.values(closestRect.corner_values))
    );
  
    // Determine if the point should be on the top or bottom
    const isTop = Math.abs(closestRect.corner_values.top_left - clampedBinValue) <
                  Math.abs(closestRect.corner_values.bottom_left - clampedBinValue);
  
    let x, y;
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
    const openHeap = new BinaryHeap(node => node.f);
    const closedSet = new Set();
    const startNode = { x: start.x, y: start.y, f: 0, g: 0, h: 0 };
    const goalNode = { x: goal.x, y: goal.y };
  
    openHeap.push(startNode);
  
    while (openHeap.size() > 0) {
      const currentNode = openHeap.pop();
  
      if (currentNode.x === goalNode.x && currentNode.y === goalNode.y) {
        return reconstructPath(currentNode);
      }
  
      closedSet.add(`${currentNode.x},${currentNode.y}`);
  
      const neighbors = getNeighbors(currentNode, grid);
  
      for (const neighbor of neighbors) {
        if (closedSet.has(`${neighbor.x},${neighbor.y}`)) continue;
  
        const gScore = currentNode.g + 1; // Assuming each step costs 1
        const hScore = manhattanDistance(neighbor, goalNode);
        const fScore = gScore + hScore;
  
        const existingNode = openHeap.content.find(n => n.x === neighbor.x && n.y === neighbor.y);
  
        if (!existingNode) {
          neighbor.g = gScore;
          neighbor.h = hScore;
          neighbor.f = fScore;
          neighbor.parent = currentNode;
          openHeap.push(neighbor);
        } else if (gScore < existingNode.g) {
          openHeap.remove(existingNode);
          existingNode.g = gScore;
          existingNode.f = fScore;
          existingNode.parent = currentNode;
          openHeap.push(existingNode);
        }
      }
    }
  
    return null; // No path found
  }

function reconstructPath(node) {
    const path = [];
    while (node) {
      path.unshift({ x: node.x, y: node.y });
      node = node.parent;
    }
    return path;
  }
  
  function manhattanDistance(a, b) {
    return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
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

    // console.error(`Unable to find a free point near (${point.x}, ${point.y})`);
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
  
      const path = aStar(startFree, endFree, grid);
      if (!path) {
        console.warn(`No path found to bin ${binInput}`);
        continue;
      }
  
      const pathLength = calculatePathLength(path);
      
      if (pathLength < shortestPathLength) {
        shortestPathLength = pathLength;
        bestBin = binInput;
        shortestPath = path;
      }
    }
  
    if (bestBin && shortestPath) {
      return { bestBin, path: shortestPath };
    }
  
    console.error("Unable to find a valid path to any bin.");
    return null;
  }
  
  function calculatePathLength(path) {
    let length = 0;
    for (let i = 1; i < path.length; i++) {
      length += euclideanDistance(path[i-1], path[i]);
    }
    return length;
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
      ctx.strokeStyle = "#fff5ee";
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