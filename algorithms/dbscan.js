function runDBSCAN() {
  initCanvas();

  if (state.points.length < 3) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
      "--text-primary"
    );
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "Need at least 3 points for DBSCAN clustering",
      margin.left + plotWidth / 2,
      margin.top + plotHeight / 2
    );
    return;
  }

  const pointsForClustering = state.points.map((p, idx) => ({
    x: p.x,
    y: p.y,
    id: idx,
  }));

  //epsilon (neighborhood radius)
  const epsilon = determineEpsilon(pointsForClustering);

  // Auto-determine minPts (minimum points in neighborhood)
  // For 2D data, a good rule of thumb is 2*dimensions = 4
  const minPts = Math.min(4, Math.max(2, Math.floor(state.points.length / 10)));

  animateDBSCAN(pointsForClustering, epsilon, minPts, 0);
}

// Determine a good epsilon value using k-distance graph
function determineEpsilon(points) {
  // Calculate distances to k-nearest neighbors for each point
  const k = Math.min(4, points.length - 1);
  const kDistances = [];

  for (const point of points) {
    const distances = [];

    for (const otherPoint of points) {
      if (point !== otherPoint) {
        const distance = Math.sqrt(
          Math.pow(point.x - otherPoint.x, 2) +
            Math.pow(point.y - otherPoint.y, 2)
        );
        distances.push(distance);
      }
    }

    // Sort distances and take the k-th
    distances.sort((a, b) => a - b);
    kDistances.push(distances[k - 1]);
  }

  // Sort k-distances
  kDistances.sort((a, b) => a - b);

  // Find the "elbow" point (where the slope changes significantly)
  const percentile = 0.8; // 80th percentile taken for simplicity
  const index = Math.floor(kDistances.length * percentile);
  return kDistances[index];
}

function dbscan(points, epsilon, minPts) {
  const clusters = new Array(points.length).fill(-1); // -1 = unvisited, 0 = noise, 1+ = cluster ID
  let currentCluster = 0;

  for (let i = 0; i < points.length; i++) {
    if (clusters[i] !== -1) continue;

    const neighbors = getNeighbors(points, i, epsilon);

    // If not enough neighbors, mark as noise (0)
    if (neighbors.length < minPts) {
      clusters[i] = 0;
      continue;
    }

    currentCluster++;
    clusters[i] = currentCluster;

    const neighborQueue = [...neighbors];

    while (neighborQueue.length > 0) {
      const neighborIdx = neighborQueue.shift();

      // If noise, add to cluster
      if (clusters[neighborIdx] === 0) {
        clusters[neighborIdx] = currentCluster;
      }

      if (clusters[neighborIdx] === -1) {
        clusters[neighborIdx] = currentCluster;

        const newNeighbors = getNeighbors(points, neighborIdx, epsilon);

        // If core point, add its unprocessed neighbors to queue
        if (newNeighbors.length >= minPts) {
          for (const newNeighbor of newNeighbors) {
            if (clusters[newNeighbor] === -1 || clusters[newNeighbor] === 0) {
              if (!neighborQueue.includes(newNeighbor)) {
                neighborQueue.push(newNeighbor);
              }
            }
          }
        }
      }
    }
  }

  return {
    clusters,
    numClusters: currentCluster,
    clusterCounts: countClusterMembers(clusters, currentCluster),
  };
}

// Get indices of neighbors within epsilon radius
function getNeighbors(points, pointIdx, epsilon) {
  const neighbors = [];
  const point = points[pointIdx];

  for (let i = 0; i < points.length; i++) {
    if (i !== pointIdx) {
      const distance = Math.sqrt(
        Math.pow(point.x - points[i].x, 2) + Math.pow(point.y - points[i].y, 2)
      );

      if (distance <= epsilon) {
        neighbors.push(i);
      }
    }
  }

  return neighbors;
}

// Count members in each cluster
function countClusterMembers(clusters, numClusters) {
  const counts = new Array(numClusters + 1).fill(0);

  for (const cluster of clusters) {
    if (cluster >= 0) {
      counts[cluster]++;
    }
  }

  return counts;
}

function animateDBSCAN(points, epsilon, minPts, step) {
  if (!state.running) return;

  const result = dbscan(points, epsilon, minPts);

  switch (step) {
    case 0:
      initCanvas();
      drawDBSCANExplanation(points, epsilon, minPts);
      setTimeout(() => {
        animateDBSCAN(points, epsilon, minPts, 1);
      }, 1500);
      break;

    case 1:
      // Show epsilon neighborhoods
      initCanvas();
      visualizeEpsilonNeighborhoods(points, epsilon);
      setTimeout(() => {
        animateDBSCAN(points, epsilon, minPts, 2);
      }, 1500);
      break;

    case 2:
      // Show core points
      initCanvas();
      visualizeCorePoints(points, epsilon, minPts);
      setTimeout(() => {
        animateDBSCAN(points, epsilon, minPts, 3);
      }, 1500);
      break;

    case 3:
      // Show final clusters
      initCanvas();
      visualizeDBSCANClusters(points, result);
      break;
  }
}

function drawDBSCANExplanation(points, epsilon, minPts) {
  for (const point of points) {
    const canvasX = toCanvasX(point.x);
    const canvasY = toCanvasY(point.y);

    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
      "--accent-color"
    );
    ctx.fill();
    ctx.strokeStyle = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--bg-secondary");
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
    "--text-primary"
  );
  ctx.font = "16px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "top";

  const textX = margin.left + 20;
  let textY = margin.top + 20;
  const lineHeight = 24;

  ctx.fillText(`DBSCAN Clustering`, textX, textY);
  textY += lineHeight;
  ctx.fillText(
    `Epsilon (ε): ${epsilon.toFixed(2)} - neighborhood radius`,
    textX,
    textY
  );
  textY += lineHeight;
  ctx.fillText(
    `MinPts: ${minPts} - minimum points in a neighborhood`,
    textX,
    textY
  );
  textY += lineHeight;
  ctx.fillText(`Total Points: ${points.length}`, textX, textY);
}

function visualizeEpsilonNeighborhoods(points, epsilon) {
  for (const point of points) {
    const canvasX = toCanvasX(point.x);
    const canvasY = toCanvasY(point.y);

    ctx.beginPath();
    ctx.arc(
      canvasX,
      canvasY,
      Math.abs(toCanvasX(point.x + epsilon) - canvasX),
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(66, 133, 244, 0.1)";
    ctx.fill();
    ctx.strokeStyle = "rgba(66, 133, 244, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2);
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
      "--accent-color"
    );
    ctx.fill();
    ctx.strokeStyle = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--bg-secondary");
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
    "--text-primary"
  );
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(
    `Showing ε-neighborhood (radius = ${epsilon.toFixed(2)}) for each point`,
    margin.left + plotWidth / 2,
    margin.top + 20
  );
}

function visualizeCorePoints(points, epsilon, minPts) {
  const corePoints = [];

  for (let i = 0; i < points.length; i++) {
    const neighbors = getNeighbors(points, i, epsilon);
    if (neighbors.length + 1 >= minPts) {
      // +1 to include the point itself
      corePoints.push(i);
    }
  }

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const canvasX = toCanvasX(point.x);
    const canvasY = toCanvasY(point.y);

    // Draw epsilon neighborhood
    ctx.beginPath();
    ctx.arc(
      canvasX,
      canvasY,
      Math.abs(toCanvasX(point.x + epsilon) - canvasX),
      0,
      Math.PI * 2
    );
    ctx.fillStyle = "rgba(66, 133, 244, 0.1)";
    ctx.fill();
    ctx.strokeStyle = "rgba(66, 133, 244, 0.5)";
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2);

    if (corePoints.includes(i)) {
      // Core point (red)
      ctx.fillStyle = "#ef476f";
    } else {
      // Non-core point (yellow)
      ctx.fillStyle = "#ffd166";
    }

    ctx.fill();
    ctx.strokeStyle = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--bg-secondary");
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
    "--text-primary"
  );
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "top";
  ctx.fillText(
    `Core points (red) have at least ${minPts} points in their ε-neighborhood`,
    margin.left + plotWidth / 2,
    margin.top + 20
  );
}

function visualizeDBSCANClusters(points, result) {
  const { clusters, numClusters, clusterCounts } = result;

  const clusterColors = generateClusterColors(numClusters + 1);

  for (let i = 0; i < points.length; i++) {
    const point = points[i];
    const cluster = clusters[i];
    const canvasX = toCanvasX(point.x);
    const canvasY = toCanvasY(point.y);

    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2);

    if (cluster === 0) {
      // Noise points (black)
      ctx.fillStyle = "#000000";
    } else {
      // Clustered points
      ctx.fillStyle = clusterColors[cluster];
    }

    ctx.fill();
    ctx.strokeStyle = getComputedStyle(
      document.documentElement
    ).getPropertyValue("--bg-secondary");
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Draw connections between points in the same cluster
  for (let i = 0; i < points.length; i++) {
    const point1 = points[i];
    const cluster1 = clusters[i];

    if (cluster1 > 0) {
      // Skip noise points
      for (let j = i + 1; j < points.length; j++) {
        const point2 = points[j];
        const cluster2 = clusters[j];

        if (cluster1 === cluster2) {
          const distance = Math.sqrt(
            Math.pow(point1.x - point2.x, 2) + Math.pow(point1.y - point2.y, 2)
          );

          if (distance <= determineEpsilon(points) * 1.5) {
            ctx.beginPath();
            ctx.moveTo(toCanvasX(point1.x), toCanvasY(point1.y));
            ctx.lineTo(toCanvasX(point2.x), toCanvasY(point2.y));
            ctx.strokeStyle = clusterColors[cluster1] + "80"; // 50% opacity
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
    }
  }

}

function generateClusterColors(numClusters) {
  const colors = [];

  // Predefined colors for up to 2 clusters class 1 and class -1
  const baseColors = [
    "#ffffff", // 0 = noise (black, not from this array)
    "#4361ee", // blue
    "#ef476f", // red
  ];

  for (let i = 0; i < numClusters; i++) {
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
