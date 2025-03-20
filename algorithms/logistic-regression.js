function runLogisticRegression() {
  initCanvas();

  const positivePoints = state.points.filter((p) => p.class === 1);
  const negativePoints = state.points.filter((p) => p.class === -1);

  // Check if we have points from both classes
  if (positivePoints.length === 0 || negativePoints.length === 0) {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
      "--text-primary"
    );
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "Need points from both classes for Logistic Regression",
      margin.left + plotWidth / 2,
      margin.top + plotHeight / 2
    );
    return;
  }

  // Fit logistic regression model using gradient descent
  const model = fitLogisticRegression(state.points);

  visualizeLogisticRegression(model);
}

// Sigmoid function for logistic regression
function sigmoid(z) {
  return 1 / (1 + Math.exp(-z));
}

function fitLogisticRegression(points, learningRate = 0.1, iterations = 100) {
  let w1 = 0; // Weight for x
  let w2 = 0; // Weight for y
  let b = 0; // Bias term

  // Convert class labels from {-1, 1} to {0, 1} for logistic regression
  const yValues = points.map((p) => (p.class === 1 ? 1 : 0));

  // Gradient descent
  for (let iter = 0; iter < iterations; iter++) {
    let dw1 = 0,
      dw2 = 0,
      db = 0;

    for (let i = 0; i < points.length; i++) {
      const point = points[i];
      const x = point.x;
      const y = point.y;
      const actualClass = yValues[i];

      // Calculate prediction
      const z = w1 * x + w2 * y + b;
      const prediction = sigmoid(z);

      // Calculate gradients
      const error = prediction - actualClass;
      dw1 += error * x;
      dw2 += error * y;
      db += error;
    }

    // Update parameters
    w1 -= (learningRate * dw1) / points.length;
    w2 -= (learningRate * dw2) / points.length;
    b -= (learningRate * db) / points.length;
  }

  return { w1, w2, b };
}

function visualizeLogisticRegression(model) {
  // First visualize the probability regions
  visualizeProbabilityRegions(model);

  // Draw the decision boundary (where probability = 0.5)
  drawDecisionBoundary(model);

  // Redraw points on top
  drawPoints();
}

function visualizeProbabilityRegions(model) {
  // Create a grid of points and calculate probability for each
  const gridSize = 30;
  const gridStepX = (state.xMax - state.xMin) / gridSize;
  const gridStepY = (state.yMax - state.yMin) / gridSize;

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = state.xMin + i * gridStepX;
      const y = state.yMin + j * gridStepY;

      // Calculate z and probability
      const z = model.w1 * x + model.w2 * y + model.b;
      const probability = sigmoid(z);

      // Blues for class 1, reds for class -1
      let color;
      if (probability >= 0.5) {
        // Blue gradient for class 1
        const intensity = (probability - 0.5) * 2; // Scale 0.5-1 to 0-1
        const r = Math.round(66 * (1 - intensity));
        const g = Math.round(133 * (1 - intensity));
        const b = 244;
        color = `rgba(${r}, ${g}, ${b}, 0.2)`;
      } else {
        // Red gradient for class -1
        const intensity = (0.5 - probability) * 2; // Scale 0-0.5 to 0-1
        const r = 234;
        const g = Math.round(67 * (1 - intensity));
        const b = Math.round(53 * (1 - intensity));
        color = `rgba(${r}, ${g}, ${b}, 0.2)`;
      }

      // Draw a small rect representing this grid point
      const rectWidth = plotWidth / gridSize;
      const rectHeight = plotHeight / gridSize;

      ctx.fillStyle = color;
      ctx.fillRect(
        toCanvasX(x) - rectWidth / 2,
        toCanvasY(y) - rectHeight / 2,
        rectWidth,
        rectHeight
      );
    }
  }
}

function drawDecisionBoundary(model) {
  // The decision boundary is where w1*x + w2*y + b = 0
  // Solve for y: y = (-w1*x - b) / w2

  if (model.w2 === 0) {
    // Vertical line at x = -b/w1
    const x = -model.b / model.w1;
    drawLine(x, state.yMin, x, state.yMax, "black", 2);
  } else {
    const x1 = state.xMin;
    const y1 = (-model.w1 * x1 - model.b) / model.w2;
    const x2 = state.xMax;
    const y2 = (-model.w1 * x2 - model.b) / model.w2;

    animateDecisionBoundary(x1, y1, x2, y2, 0);
  }
}

function animateDecisionBoundary(x1, y1, x2, y2, step) {
  if (!state.running) return;

  // Animation will be in 30 steps
  const totalSteps = 30;

  if (step <= totalSteps) {
    // Calculate intermediate points for animation
    const progress = step / totalSteps;
    const currentX2 = x1 + (x2 - x1) * progress;
    const currentY2 = y1 + (y2 - y1) * progress;

    // Draw the current line segment
    drawLine(x1, y1, currentX2, currentY2, "black", 2);

    // Schedule next frame
    setTimeout(() => {
      animateDecisionBoundary(x1, y1, x2, y2, step + 1);
    }, 16); // Approximately 60fps
  } else {
    drawLine(x1, y1, x2, y2, "black", 2);
  }
}
