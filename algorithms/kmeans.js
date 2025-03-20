function runKMeans() {
  initCanvas();

  if (state.points.length < 3) {
    if (state.darkMode) {
      ctx.fillStyle = "#bbb";
    } else {
      ctx.fillStyle = "#333";
    }
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "Need at least 3 points for K-Means clustering",
      margin.left + plotWidth / 2,
      margin.top + plotHeight / 2
    );
    return;
  }

  // For K-Means, we'll ignore the class labels and cluster based on position
  const pointsForClustering = state.points.map((p) => ({ x: p.x, y: p.y }));

  // Determine k (number of clusters) - use a simple heuristic
  const k = Math.min(
    5,
    Math.max(2, Math.floor(Math.sqrt(state.points.length / 2)))
  );

  const { centroids, assignments } = runKMeansClustering(
    pointsForClustering,
    k
  );

  visualizeKMeansResults(pointsForClustering, centroids, assignments);
}

function runKMeansClustering(points, k, maxIterations = 100) {
  // Initialize centroids randomly from the data points
  let centroids = [];
  const usedIndices = new Set();

  for (let i = 0; i < k; i++) {
    // Select a random point that hasn't been selected yet
    let randomIndex;
    do {
      randomIndex = Math.floor(Math.random() * points.length);
    } while (usedIndices.has(randomIndex) && usedIndices.size < points.length);

    usedIndices.add(randomIndex);
    centroids.push({ ...points[randomIndex] });
  }

  let assignments = new Array(points.length).fill(0);
  let oldAssignments = null;
  let iterations = 0;
  let converged = false;

  while (!converged && iterations < maxIterations) {
    // Assign points to the nearest centroid
    oldAssignments = [...assignments];

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      let minDistance = Infinity;
      let closestCentroid = 0;

      for (let j = 0; j < centroids.length; j++) {
        const centroid = centroids[j];
        const distance = Math.sqrt(
          Math.pow(point.x - centroid.x, 2) + Math.pow(point.y - centroid.y, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = j;
        }
      }

      assignments[i] = closestCentroid;
    }

    // Check for convergence
    converged = true;
    for (let i = 0; i < assignments.length; i++) {
      if (assignments[i] !== oldAssignments[i]) {
        converged = false;
        break;
      }
    }

    // Update centroids
    const counts = new Array(k).fill(0);
    const newCentroids = new Array(k).fill(0).map(() => ({ x: 0, y: 0 }));

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const cluster = assignments[i];

      newCentroids[cluster].x += point.x;
      newCentroids[cluster].y += point.y;
      counts[cluster]++;
    }

    for (let i = 0; i < k; i++) {
      if (counts[i] > 0) {
        newCentroids[i].x /= counts[i];
        newCentroids[i].y /= counts[i];
      } else {
        // If a cluster has no points, reinitialize it
        const randomIndex = Math.floor(Math.random() * points.length);
        newCentroids[i] = { ...points[randomIndex] };
      }
    }

    centroids = newCentroids;
    iterations++;
  }

  return { centroids, assignments, iterations };
}

function visualizeKMeansResults(points, centroids, assignments) {
  const clusterColors = generateClusterColors(centroids.length);

  // Draw into regions close to each of a given set of points to visualize cluster boundaries
  drawVoronoiRegions(centroids, clusterColors);

  // Draw points with their cluster colors
  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const cluster = assignments[i];
    const color = clusterColors[cluster];

    const canvasX = toCanvasX(point.x);
    const canvasY = toCanvasY(point.y);

    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.fill();

    if (state.darkMode) {
      ctx.strokeStyle = "#333";
    } else {
      ctx.strokeStyle = "white";
    }
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw centroids
  for (let i = 0; i < centroids.length; i++) {
    const centroid = centroids[i];
    const canvasX = toCanvasX(centroid.x);
    const canvasY = toCanvasY(centroid.y);

    // Draw larger circle for centroid
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 8, 0, Math.PI * 2);
    ctx.fillStyle = clusterColors[i];
    ctx.fill();
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Draw 'X' mark inside
    ctx.beginPath();
    ctx.moveTo(canvasX - 4, canvasY - 4);
    ctx.lineTo(canvasX + 4, canvasY + 4);
    ctx.moveTo(canvasX + 4, canvasY - 4);
    ctx.lineTo(canvasX - 4, canvasY + 4);
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw small info text (without full legend)
  if (state.darkMode) {
    ctx.fillStyle = "#bbb";
  } else {
    ctx.fillStyle = "#333";
  }
  ctx.font = "14px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText(
    `K-Means Clustering (k=${centroids.length})`,
    margin.left + 10,
    margin.top + 10
  );
}

function generateClusterColors(k) {
  const colors = [];

  // Predefined colors for the 2 clusters class 1 and class -1
  const baseColors = [
    "#4361ee", // blue
    "#ef476f", // red
  ];

  for (let i = 0; i < k; i++) {
    if (i < baseColors.length) {
      colors.push(baseColors[i]);
    } else {
      // Generate random colors if we need more than predefined
      const r = Math.floor(Math.random() * 200 + 55);
      const g = Math.floor(Math.random() * 200 + 55);
      const b = Math.floor(Math.random() * 200 + 55);
      colors.push(`rgb(${r}, ${g}, ${b})`);
    }
  }

  return colors;
}

function drawVoronoiRegions(centroids, colors) {
  // Create a grid of points and assign each to nearest centroid
  const gridSize = 30;
  const gridStepX = (state.xMax - state.xMin) / gridSize;
  const gridStepY = (state.yMax - state.yMin) / gridSize;

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = state.xMin + i * gridStepX;
      const y = state.yMin + j * gridStepY;

      let minDistance = Infinity;
      let closestCentroid = 0;

      for (let c = 0; c < centroids.length; c++) {
        const centroid = centroids[c];
        const distance = Math.sqrt(
          Math.pow(x - centroid.x, 2) + Math.pow(y - centroid.y, 2)
        );

        if (distance < minDistance) {
          minDistance = distance;
          closestCentroid = c;
        }
      }

      // Draw a small rect with cluster color and low opacity
      const rectWidth = plotWidth / gridSize;
      const rectHeight = plotHeight / gridSize;

      ctx.fillStyle = colors[closestCentroid] + "40"; // Add 25% opacity
      ctx.fillRect(
        toCanvasX(x) - rectWidth / 2,
        toCanvasY(y) - rectHeight / 2,
        rectWidth,
        rectHeight
      );
    }
  }
}
