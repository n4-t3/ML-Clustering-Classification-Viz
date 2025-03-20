function runKNN() {
  initCanvas();

  if (state.points.length < 2) {
    ctx.fillStyle = "#333";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "Need at least 2 points for KNN",
      margin.left + plotWidth / 2,
      margin.top + plotHeight / 2
    );
    return;
  }

  // Default to k=3, but can be adjusted based on data size
  let k = 3;
  if (state.points.length <= 5) {
    k = 1;
  } else if (state.points.length <= 10) {
    k = 2;
  }

  visualizeKNNRegions(k);

  drawKNNLegend(k);
}

function visualizeKNNRegions(k) {
  const gridSize = 30; // Number of points in each direction (lowered for performance)
  const gridStepX = (state.xMax - state.xMin) / gridSize;
  const gridStepY = (state.yMax - state.yMin) / gridSize;

  // Create grid
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = state.xMin + i * gridStepX;
      const y = state.yMin + j * gridStepY;

      // Classify this grid point using KNN
      const predictedClass = predictKNN(x, y, k);

      // Draw a small rect representing this grid point
      const rectWidth = plotWidth / gridSize;
      const rectHeight = plotHeight / gridSize;

      ctx.fillStyle =
        predictedClass === 1
          ? "rgba(66, 133, 244, 0.2)" // blue for class 1
          : "rgba(234, 67, 53, 0.2)"; // red for class -1

      ctx.fillRect(
        toCanvasX(x) - rectWidth / 2,
        toCanvasY(y) - rectHeight / 2,
        rectWidth,
        rectHeight
      );
    }
  }

  // Redraw points on top
  drawPoints();

  // Visualize a demo point if we have both classes
  const hasClass1 = state.points.some((p) => p.class === 1);
  const hasClass2 = state.points.some((p) => p.class === -1);

  if (hasClass1 && hasClass2) {
    // Choose a demo point near the center
    const demoX = (state.xMin + state.xMax) / 2 + Math.random() * 2 - 1;
    const demoY = (state.yMin + state.yMax) / 2 + Math.random() * 2 - 1;

    // Visualize the KNN decision for this demo point
    visualizeKNNDecision(demoX, demoY, k);
  }
}

function predictKNN(x, y, k) {
  // Calculate distances to all points
  const distances = state.points.map((point) => {
    return {
      point: point,
      distance: Math.sqrt(Math.pow(x - point.x, 2) + Math.pow(y - point.y, 2)),
    };
  });

  // Sort by distance
  distances.sort((a, b) => a.distance - b.distance);

  // Take k nearest neighbors
  const kNearest = distances.slice(0, k);

  // Count classes among k nearest
  let class1Count = 0;
  let class2Count = 0;

  kNearest.forEach((item) => {
    if (item.point.class === 1) {
      class1Count++;
    } else {
      class2Count++;
    }
  });

  // Return the majority class
  return class1Count >= class2Count ? 1 : -1;
}
