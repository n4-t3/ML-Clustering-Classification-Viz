function runSVM() {
  initCanvas();

  const positivePoints = state.points.filter((p) => p.class === 1);
  const negativePoints = state.points.filter((p) => p.class === -1);

  // Check if we have points from both classes
  if (positivePoints.length === 0 || negativePoints.length === 0) {
    // Draw message on canvas
    if (state.darkMode) {
      ctx.fillStyle = "#bbb";
    } else {
      ctx.fillStyle = "#333";
    }
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "Need points from both classes for SVM",
      margin.left + plotWidth / 2,
      margin.top + plotHeight / 2
    );
    return;
  }

  // First, RESET all support vector flags
  for (const point of state.points) {
    point.isSupportVector = false;
  }

  // Find centroids of each class
  const positiveCentroid = {
    x: positivePoints.reduce((sum, p) => sum + p.x, 0) / positivePoints.length,
    y: positivePoints.reduce((sum, p) => sum + p.y, 0) / positivePoints.length,
  };

  const negativeCentroid = {
    x: negativePoints.reduce((sum, p) => sum + p.x, 0) / negativePoints.length,
    y: negativePoints.reduce((sum, p) => sum + p.y, 0) / negativePoints.length,
  };

  // Calculate midpoint between centroids
  const midpoint = {
    x: (positiveCentroid.x + negativeCentroid.x) / 2,
    y: (positiveCentroid.y + negativeCentroid.y) / 2,
  };

  // Calculate slope of line between centroids
  const dx = negativeCentroid.x - positiveCentroid.x;
  const dy = negativeCentroid.y - positiveCentroid.y;

  // Perpendicular slope (negative reciprocal)
  const perpSlope = dx !== 0 ? -1 / (dy / dx) : 0;

  // Find decision boundary line points
  const x1 = state.xMin;
  const y1 = midpoint.y - perpSlope * (midpoint.x - x1);
  const x2 = state.xMax;
  const y2 = midpoint.y - perpSlope * (midpoint.x - x2);

  // Draw decision boundary line
  drawLine(x1, y1, x2, y2, "#000000", 2);

  // Calculate the equation of the line: ax + by + c = 0
  const a = y2 - y1;
  const b = x1 - x2;
  const c = x2 * y1 - x1 * y2;
  const norm = Math.sqrt(a * a + b * b);

  // Function to find distance from a point to the line
  const findDistance = (point) => {
    return Math.abs(a * point.x + b * point.y + c) / norm;
  };

  // Find closest positive point (support vector)
  let closestPositivePoint = null;
  let minDistPositive = Infinity;

  for (const point of positivePoints) {
    const dist = findDistance(point);
    if (dist < minDistPositive) {
      minDistPositive = dist;
      closestPositivePoint = point;
    }
  }

  // Find closest negative point (support vector)
  let closestNegativePoint = null;
  let minDistNegative = Infinity;

  for (const point of negativePoints) {
    const dist = findDistance(point);
    if (dist < minDistNegative) {
      minDistNegative = dist;
      closestNegativePoint = point;
    }
  }

  // Mark support vectors in the state.points array
  if (closestPositivePoint && closestNegativePoint) {
    for (const point of state.points) {
      // Check if this point is one of the support vectors
      if (
        (Math.abs(point.x - closestPositivePoint.x) < 0.001 &&
          Math.abs(point.y - closestPositivePoint.y) < 0.001) ||
        (Math.abs(point.x - closestNegativePoint.x) < 0.001 &&
          Math.abs(point.y - closestNegativePoint.y) < 0.001)
      ) {
        // Mark as support vector
        point.isSupportVector = true;
      }
    }
  }

  // Calculate margin (minimum distance to decision boundary)
  const margin = Math.min(minDistPositive, minDistNegative);

  // Calculate normalized direction vector
  const dirX = a / norm;
  const dirY = b / norm;

  // Draw margin lines (parallel to decision boundary)
  // Positive margin line
  const posMarginX1 = x1 + margin * dirX;
  const posMarginY1 = y1 + margin * dirY;
  const posMarginX2 = x2 + margin * dirX;
  const posMarginY2 = y2 + margin * dirY;
  drawLine(
    posMarginX1,
    posMarginY1,
    posMarginX2,
    posMarginY2,
    "#4285F4",
    1,
    [5, 5]
  );

  // Negative margin line
  const negMarginX1 = x1 - margin * dirX;
  const negMarginY1 = y1 - margin * dirY;
  const negMarginX2 = x2 - margin * dirX;
  const negMarginY2 = y2 - margin * dirY;
  drawLine(
    negMarginX1,
    negMarginY1,
    negMarginX2,
    negMarginY2,
    "#EA4335",
    1,
    [5, 5]
  );

  // Redraw points to show support vectors
  drawPoints();

  // Draw custom SVM legend
  drawSVMLegend(margin);
}

// Draw a custom SVM legend
function drawSVMLegend(margin) {
  const legendX = margin.left + plotWidth - 200;
  const legendY = margin.top + 30;
  const lineHeight = 22;

  // Legend box
  if (state.darkMode) {
    ctx.fillStyle = "rgba(50, 50, 50, 0.9)";
    ctx.strokeStyle = "#555";
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
    ctx.strokeStyle = "#ddd";
  }
  ctx.fillRect(legendX - 10, legendY - 20, 190, 170);
  ctx.strokeRect(legendX - 10, legendY - 20, 190, 170);

  // Legend title
  if (state.darkMode) {
    ctx.fillStyle = "#bbb";
  } else {
    ctx.fillStyle = "#333";
  }
  ctx.font = "bold 16px Arial";
  ctx.textAlign = "left";
  ctx.textBaseline = "middle";
  ctx.fillText("Support Vector Machine", legendX, legendY);

  // Subtitle
  ctx.font = "12px Arial";
  ctx.fillText("Maximum Margin Classifier", legendX, legendY + lineHeight);

  // Class descriptions
  // Class 1
  ctx.fillStyle = "#4285F4";
  ctx.beginPath();
  ctx.arc(legendX + 10, legendY + 2 * lineHeight, 6, 0, Math.PI * 2);
  ctx.fill();

  if (state.darkMode) {
    ctx.fillStyle = "#bbb";
  } else {
    ctx.fillStyle = "#333";
  }
  ctx.fillText("Class 1 Points", legendX + 25, legendY + 2 * lineHeight);

  // Class -1
  ctx.fillStyle = "#EA4335";
  ctx.beginPath();
  ctx.arc(legendX + 10, legendY + 3 * lineHeight, 6, 0, Math.PI * 2);
  ctx.fill();

  if (state.darkMode) {
    ctx.fillStyle = "#bbb";
  } else {
    ctx.fillStyle = "#333";
  }
  ctx.fillText("Class -1 Points", legendX + 25, legendY + 3 * lineHeight);

  // Decision boundary
  ctx.beginPath();
  ctx.moveTo(legendX, legendY + 4 * lineHeight);
  ctx.lineTo(legendX + 20, legendY + 4 * lineHeight);
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  ctx.stroke();

  if (state.darkMode) {
    ctx.fillStyle = "#bbb";
  } else {
    ctx.fillStyle = "#333";
  }
  ctx.fillText("Decision Boundary", legendX + 25, legendY + 4 * lineHeight);

  // Margin lines
  ctx.beginPath();
  ctx.moveTo(legendX, legendY + 5 * lineHeight);
  ctx.lineTo(legendX + 20, legendY + 5 * lineHeight);
  ctx.strokeStyle = "#4285F4";
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);

  if (state.darkMode) {
    ctx.fillStyle = "#bbb";
  } else {
    ctx.fillStyle = "#333";
  }
  ctx.fillText("Margin Boundaries", legendX + 25, legendY + 5 * lineHeight);

  // Support vectors
  if (state.darkMode) {
    ctx.strokeStyle = "#bbb";
  } else {
    ctx.strokeStyle = "#333";
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(legendX + 10, legendY + 6 * lineHeight, 6, 0, Math.PI * 2);
  ctx.stroke();

  if (state.darkMode) {
    ctx.fillStyle = "#bbb";
  } else {
    ctx.fillStyle = "#333";
  }
  ctx.fillText("Support Vectors", legendX + 25, legendY + 6 * lineHeight);

  // Margin width
  if (state.darkMode) {
    ctx.fillStyle = "#bbb";
  } else {
    ctx.fillStyle = "#333";
  }
  ctx.fillText(
    `Margin width: ${margin.toFixed(2)}`,
    legendX,
    legendY + 7 * lineHeight
  );
}

function animateDecisionBoundary(
  x1,
  y1,
  x2,
  y2,
  step,
  positivePoints,
  negativePoints
) {
  if (!state.running) return;

  // I'll animate in 30 steps
  const totalSteps = 30;

  if (step <= totalSteps) {
    // Clear and redraw the basic canvas
    initCanvas();

    // Calculate intermediate points for animation
    const progress = step / totalSteps;
    const currentX2 = x1 + (x2 - x1) * progress;
    const currentY2 = y1 + (y2 - y1) * progress;

    // Draw the current line segment
    drawLine(x1, y1, currentX2, currentY2);

    // Schedule next frame
    setTimeout(() => {
      animateDecisionBoundary(
        x1,
        y1,
        x2,
        y2,
        step + 1,
        positivePoints,
        negativePoints
      );
    }, 16); // Approximately 60fps
  } else {
    // Animation finished, draw full decision boundary
    drawLine(x1, y1, x2, y2);

    // Now find and visualize support vectors
    visualizeSupportVectors(x1, y1, x2, y2, positivePoints, negativePoints);
  }
}

function visualizeSupportVectors(
  x1,
  y1,
  x2,
  y2,
  positivePoints,
  negativePoints
) {
  if (!state.running) return;

  // Reset all support vector flags first
  state.points.forEach((p) => (p.isSupportVector = false));

  // Calculate the equation of the line: ax + by + c = 0
  const a = y2 - y1;
  const b = x1 - x2;
  const c = x2 * y1 - x1 * y2;
  const norm = Math.sqrt(a * a + b * b);

  // Function to find distance from a point to the line
  const findDistance = (point) => {
    return Math.abs(a * point.x + b * point.y + c) / norm;
  };

  // Find closest positive point
  let closestPositive = positivePoints[0];
  let minDistPositive = findDistance(closestPositive);

  for (const point of positivePoints) {
    const dist = findDistance(point);
    if (dist < minDistPositive) {
      minDistPositive = dist;
      closestPositive = point;
    }
  }

  // Find closest negative point
  let closestNegative = negativePoints[0];
  let minDistNegative = findDistance(closestNegative);

  for (const point of negativePoints) {
    const dist = findDistance(point);
    if (dist < minDistNegative) {
      minDistNegative = dist;
      closestNegative = point;
    }
  }

  // Mark the support vectors (find the points in state.points that match)
  state.points.forEach((p) => {
    if (
      (Math.abs(p.x - closestPositive.x) < 0.001 &&
        Math.abs(p.y - closestPositive.y) < 0.001) ||
      (Math.abs(p.x - closestNegative.x) < 0.001 &&
        Math.abs(p.y - closestNegative.y) < 0.001)
    ) {
      p.isSupportVector = true;
    }
  });

  // Redraw points to show support vectors
  drawPoints();

  // Calculate margin (minimum distance to decision boundary)
  const margin = Math.min(minDistPositive, minDistNegative);

  // Calculate normalized direction vector
  const dirX = a / norm;
  const dirY = b / norm;

  // Draw margin lines (parallel to decision boundary)
  // Positive margin line
  drawMarginLine(
    x1,
    y1,
    x2,
    y2,
    margin,
    dirX,
    dirY,
    state.darkMode ? "#4285F4" : "#4285F4"
  );

  // Negative margin line
  drawMarginLine(
    x1,
    y1,
    x2,
    y2,
    -margin,
    dirX,
    dirY,
    state.darkMode ? "#EA4335" : "#EA4335"
  );

  // Draw legend
  drawLegend();
}

// Draw a margin line parallel to the decision boundary
function drawMarginLine(x1, y1, x2, y2, distance, dirX, dirY, color) {
  // Calculate shifted points for parallel line
  const shiftX = distance * dirX;
  const shiftY = distance * dirY;

  const marginX1 = x1 + shiftX;
  const marginY1 = y1 + shiftY;
  const marginX2 = x2 + shiftX;
  const marginY2 = y2 + shiftY;

  // Draw the margin line as a dashed line
  drawLine(marginX1, marginY1, marginX2, marginY2, color, 1, [5, 5]);
}
