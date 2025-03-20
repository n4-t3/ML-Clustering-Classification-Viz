function runNaiveBayes() {
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
      "Need points from both classes for Naive Bayes",
      margin.left + plotWidth / 2,
      margin.top + plotHeight / 2
    );
    return;
  }

  // Fit Gaussian Naive Bayes model
  const model = fitGaussianNaiveBayes(state.points);

  visualizeNaiveBayes(model);
}

function fitGaussianNaiveBayes(points) {
  // Separate points by class
  const class1Points = points.filter((p) => p.class === 1);
  const class2Points = points.filter((p) => p.class === -1);

  // Calculate prior probabilities
  const totalPoints = points.length;
  const class1Prior = class1Points.length / totalPoints;
  const class2Prior = class2Points.length / totalPoints;

  // Calculate mean and variance for each feature in each class
  // Feature 1: x coordinate
  // Feature 2: y coordinate

  // Class 1 stats
  const class1XValues = class1Points.map((p) => p.x);
  const class1YValues = class1Points.map((p) => p.y);

  const class1XMean = mean(class1XValues);
  const class1YMean = mean(class1YValues);
  const class1XVar = variance(class1XValues, class1XMean);
  const class1YVar = variance(class1YValues, class1YMean);

  // Class -1 stats
  const class2XValues = class2Points.map((p) => p.x);
  const class2YValues = class2Points.map((p) => p.y);

  const class2XMean = mean(class2XValues);
  const class2YMean = mean(class2YValues);
  const class2XVar = variance(class2XValues, class2XMean);
  const class2YVar = variance(class2YValues, class2YMean);

  // Return the model parameters
  return {
    class1: {
      prior: class1Prior,
      x: { mean: class1XMean, var: class1XVar },
      y: { mean: class1YMean, var: class1YVar },
    },
    class2: {
      prior: class2Prior,
      x: { mean: class2XMean, var: class2XVar },
      y: { mean: class2YMean, var: class2YVar },
    },
  };
}

// Helper function to calculate mean
function mean(values) {
  return values.reduce((sum, val) => sum + val, 0) / values.length;
}

// Helper function to calculate variance
function variance(values, meanValue) {
  if (values.length <= 1) return 1; // Avoid division by zero, default to 1

  const sumSquaredDiffs = values.reduce((sum, val) => {
    return sum + Math.pow(val - meanValue, 2);
  }, 0);

  // Add a small constant to avoid very small variances
  return sumSquaredDiffs / (values.length - 1) + 0.1;
}

// Gaussian probability density function
function gaussianPdf(x, mean, variance) {
  const exponent = -Math.pow(x - mean, 2) / (2 * variance);
  return Math.exp(exponent) / Math.sqrt(2 * Math.PI * variance);
}

// Predict class probabilities using Naive Bayes
function predictNaiveBayes(model, x, y) {
  // Calculate likelihood for class 1
  const class1XLikelihood = gaussianPdf(
    x,
    model.class1.x.mean,
    model.class1.x.var
  );
  const class1YLikelihood = gaussianPdf(
    y,
    model.class1.y.mean,
    model.class1.y.var
  );
  const class1Likelihood = class1XLikelihood * class1YLikelihood;
  const class1Posterior = class1Likelihood * model.class1.prior;

  // Calculate likelihood for class -1
  const class2XLikelihood = gaussianPdf(
    x,
    model.class2.x.mean,
    model.class2.x.var
  );
  const class2YLikelihood = gaussianPdf(
    y,
    model.class2.y.mean,
    model.class2.y.var
  );
  const class2Likelihood = class2XLikelihood * class2YLikelihood;
  const class2Posterior = class2Likelihood * model.class2.prior;

  // Normalize to get probabilities
  const sum = class1Posterior + class2Posterior;

  return {
    class1Prob: class1Posterior / sum,
    class2Prob: class2Posterior / sum,
    predictedClass: class1Posterior > class2Posterior ? 1 : -1,
  };
}

function visualizeNaiveBayes(model) {
  visualizeNaiveBayesRegions(model);

  visualizeNaiveBayesDecisionBoundary(model);

  visualizeGaussianContours(model);

  // Redraw points
  drawPoints();

  drawNaiveBayesLegend(model);
}

function visualizeNaiveBayesRegions(model) {
  // Create a grid of points and calculate probabilities
  const gridSize = 30;
  const gridStepX = (state.xMax - state.xMin) / gridSize;
  const gridStepY = (state.yMax - state.yMin) / gridSize;

  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = state.xMin + i * gridStepX;
      const y = state.yMin + j * gridStepY;

      // Predict class probabilities
      const prediction = predictNaiveBayes(model, x, y);

      // Draw a small rect with color based on probabilities
      const rectWidth = plotWidth / gridSize;
      const rectHeight = plotHeight / gridSize;

      // For class 1, use blue with opacity based on probability
      if (prediction.predictedClass === 1) {
        const opacity = prediction.class1Prob * 0.3; // Scale opacity
        ctx.fillStyle = `rgba(66, 133, 244, ${opacity})`;
      } else {
        // For class -1, use red with opacity based on probability
        const opacity = prediction.class2Prob * 0.3; // Scale opacity
        ctx.fillStyle = `rgba(234, 67, 53, ${opacity})`;
      }

      ctx.fillRect(
        toCanvasX(x) - rectWidth / 2,
        toCanvasY(y) - rectHeight / 2,
        rectWidth,
        rectHeight
      );
    }
  }
}

function visualizeNaiveBayesDecisionBoundary(model) {
  // For Naive Bayes with 2D Gaussian, the decision boundary is a quadratic curve
  // I'll approximate it by sampling points along the boundary

  const boundaryPoints = [];
  const numSamples = 100;

  // Find points where the two classes have equal probability
  for (let i = 0; i <= numSamples; i++) {
    const x = state.xMin + ((state.xMax - state.xMin) * i) / numSamples;

    // Binary search to find y where probabilities are equal
    let low = state.yMin;
    let high = state.yMax;
    let iterations = 0;
    const maxIterations = 20;

    while (low < high && iterations < maxIterations) {
      const mid = (low + high) / 2;
      const prediction = predictNaiveBayes(model, x, mid);

      if (Math.abs(prediction.class1Prob - prediction.class2Prob) < 0.01) {
        // Found a boundary point
        boundaryPoints.push({ x, y: mid });
        break;
      } else if (prediction.class1Prob > prediction.class2Prob) {
        low = mid;
      } else {
        high = mid;
      }

      iterations++;
    }

    if (iterations === maxIterations) {
      // If it didn't converge, use the midpoint
      boundaryPoints.push({ x, y: (low + high) / 2 });
    }
  }

  // Draw the boundary line connecting the points
  if (boundaryPoints.length > 1) {
    ctx.beginPath();
    ctx.moveTo(toCanvasX(boundaryPoints[0].x), toCanvasY(boundaryPoints[0].y));

    for (let i = 1; i < boundaryPoints.length; i++) {
      ctx.lineTo(
        toCanvasX(boundaryPoints[i].x),
        toCanvasY(boundaryPoints[i].y)
      );
    }

    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function visualizeGaussianContours(model) {
  // Draw ellipses representing the Gaussian distributions for each class

  // Class 1 (blue) contour
  drawGaussianEllipse(
    model.class1.x.mean,
    model.class1.y.mean,
    Math.sqrt(model.class1.x.var),
    Math.sqrt(model.class1.y.var),
    "rgba(66, 133, 244, 0.5)"
  );

  // Class -1 (red) contour
  drawGaussianEllipse(
    model.class2.x.mean,
    model.class2.y.mean,
    Math.sqrt(model.class2.x.var),
    Math.sqrt(model.class2.y.var),
    "rgba(234, 67, 53, 0.5)"
  );
}

function drawGaussianEllipse(meanX, meanY, stdX, stdY, color) {
  const centerX = toCanvasX(meanX);
  const centerY = toCanvasY(meanY);

  ctx.beginPath();
  ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = "black";
  ctx.lineWidth = 1;
  ctx.stroke();

  // Draw the standard deviation ellipse (1-sigma)
  const radiusX = Math.abs(toCanvasX(meanX + stdX) - centerX);
  const radiusY = Math.abs(toCanvasY(meanY + stdY) - centerY);

  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.stroke();

  // Draw the 2-sigma ellipse
  ctx.beginPath();
  ctx.ellipse(centerX, centerY, radiusX * 2, radiusY * 2, 0, 0, Math.PI * 2);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.stroke();
  ctx.setLineDash([]);
}
