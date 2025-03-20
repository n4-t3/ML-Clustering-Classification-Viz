function runDecisionTree() {
  initCanvas();

  const positivePoints = state.points.filter((p) => p.class === 1);
  const negativePoints = state.points.filter((p) => p.class === -1);

  // Check if we have points from both classes
  if (positivePoints.length === 0 || negativePoints.length === 0) {
    ctx.fillStyle = "#333";
    ctx.font = "16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(
      "Need points from both classes for Decision Tree",
      margin.left + plotWidth / 2,
      margin.top + plotHeight / 2
    );
    return;
  }

  const rootNode = buildDecisionTree(state.points, 0);

  visualizeDecisionTreeRegions(rootNode);

  visualizeTreeStructure(rootNode);
}

// Build a simple decision tree using recursive binary partitioning
function buildDecisionTree(points, depth, maxDepth = 3) {
  // Stop conditions
  if (depth >= maxDepth) {
    return createLeafNode(points);
  }

  // Check if all points have the same class
  const allSameClass = points.every((p) => p.class === points[0].class);
  if (allSameClass) {
    return createLeafNode(points);
  }

  // Find the best split
  const split = findBestSplit(points);

  // If no good split found, create a leaf node
  if (!split) {
    return createLeafNode(points);
  }

  // Divide the points based on the split
  const leftPoints = points.filter((p) => {
    if (split.feature === "x") {
      return p.x <= split.value;
    } else {
      return p.y <= split.value;
    }
  });

  const rightPoints = points.filter((p) => {
    if (split.feature === "x") {
      return p.x > split.value;
    } else {
      return p.y > split.value;
    }
  });

  // Handle edge case where all points end up on one side
  if (leftPoints.length === 0 || rightPoints.length === 0) {
    return createLeafNode(points);
  }

  // Create a new internal node
  const node = {
    isLeaf: false,
    feature: split.feature,
    value: split.value,
    left: buildDecisionTree(leftPoints, depth + 1, maxDepth),
    right: buildDecisionTree(rightPoints, depth + 1, maxDepth),
    bounds: calculateBounds(points),
    depth: depth,
  };

  return node;
}

// Calculate bounds for a set of points
function calculateBounds(points) {
  if (points.length === 0) return null;

  let minX = points[0].x;
  let maxX = points[0].x;
  let minY = points[0].y;
  let maxY = points[0].y;

  for (const point of points) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  return { minX, maxX, minY, maxY };
}

function createLeafNode(points) {
  // Determine the majority class
  let class1Count = 0;
  let class2Count = 0;

  for (const point of points) {
    if (point.class === 1) {
      class1Count++;
    } else {
      class2Count++;
    }
  }

  const majorityClass = class1Count >= class2Count ? 1 : -1;

  return {
    isLeaf: true,
    class: majorityClass,
    points: points,
    bounds: calculateBounds(points),
  };
}

// Find the best split using the Gini impurity
function findBestSplit(points) {
  if (points.length < 2) return null;

  let bestSplit = null;
  let bestGini = 1.0; // Gini impurity ranges from 0 to 0.5

  // Try splitting on X
  const sortedByX = [...points].sort((a, b) => a.x - b.x);
  for (let i = 0; i < sortedByX.length - 1; i++) {
    const splitValue = (sortedByX[i].x + sortedByX[i + 1].x) / 2;

    const leftPoints = points.filter((p) => p.x <= splitValue);
    const rightPoints = points.filter((p) => p.x > splitValue);

    const gini = calculateGiniImpurity(leftPoints, rightPoints, points.length);

    if (gini < bestGini) {
      bestGini = gini;
      bestSplit = { feature: "x", value: splitValue };
    }
  }

  // Try splitting on Y
  const sortedByY = [...points].sort((a, b) => a.y - b.y);
  for (let i = 0; i < sortedByY.length - 1; i++) {
    const splitValue = (sortedByY[i].y + sortedByY[i + 1].y) / 2;

    const leftPoints = points.filter((p) => p.y <= splitValue);
    const rightPoints = points.filter((p) => p.y > splitValue);

    const gini = calculateGiniImpurity(leftPoints, rightPoints, points.length);

    if (gini < bestGini) {
      bestGini = gini;
      bestSplit = { feature: "y", value: splitValue };
    }
  }

  return bestSplit;
}

function calculateGiniImpurity(leftPoints, rightPoints, totalPoints) {
  const leftWeight = leftPoints.length / totalPoints;
  const rightWeight = rightPoints.length / totalPoints;

  const leftGini = calculateNodeGini(leftPoints);
  const rightGini = calculateNodeGini(rightPoints);

  return leftWeight * leftGini + rightWeight * rightGini;
}

function calculateNodeGini(points) {
  if (points.length === 0) return 0;

  const class1Prob = points.filter((p) => p.class === 1).length / points.length;
  const class2Prob = 1 - class1Prob;

  return 1 - (Math.pow(class1Prob, 2) + Math.pow(class2Prob, 2));
}

function visualizeDecisionTreeRegions(rootNode) {
  // Create a grid of points and classify each using the decision tree
  const gridSize = 30;
  const gridStepX = (state.xMax - state.xMin) / gridSize;
  const gridStepY = (state.yMax - state.yMin) / gridSize;

  // Create grid
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = state.xMin + i * gridStepX;
      const y = state.yMin + j * gridStepY;

      // Classify using the decision tree
      const predictedClass = predictWithTree(rootNode, { x, y });

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

  drawDecisionBoundaries(rootNode);

  drawPoints();
}

function predictWithTree(node, point) {
  if (node.isLeaf) {
    return node.class;
  }

  if (node.feature === "x") {
    if (point.x <= node.value) {
      return predictWithTree(node.left, point);
    } else {
      return predictWithTree(node.right, point);
    }
  } else {
    // feature is 'y'
    if (point.y <= node.value) {
      return predictWithTree(node.left, point);
    } else {
      return predictWithTree(node.right, point);
    }
  }
}

function drawDecisionBoundaries(node) {
  if (!node || node.isLeaf) return;

  // Draw the split line
  if (node.feature === "x") {
    // Vertical line at x = value
    const x = node.value;
    const y1 = node.bounds ? node.bounds.minY : state.yMin;
    const y2 = node.bounds ? node.bounds.maxY : state.yMax;

    drawLine(x, y1, x, y2, "#000", 2 - node.depth * 0.5);
  } else {
    // feature is 'y'
    // Horizontal line at y = value
    const y = node.value;
    const x1 = node.bounds ? node.bounds.minX : state.xMin;
    const x2 = node.bounds ? node.bounds.maxX : state.xMax;

    drawLine(x1, y, x2, y, "#000", 2 - node.depth * 0.5);
  }

  // Recursively draw children's boundaries
  drawDecisionBoundaries(node.left);
  drawDecisionBoundaries(node.right);
}

function visualizeTreeStructure(rootNode) {
  // This would draw a schematic representation of the tree
  // For simplicity, I just showed the decision thresholds

  // Display text with the decision nodes
  let treeText = "Decision Tree Structure:";

  // Draw root node decision
  if (!rootNode.isLeaf) {
    treeText += ` ${rootNode.feature.toUpperCase()} ≤ ${rootNode.value.toFixed(
      2
    )}`;
  } else {
    treeText += ` Leaf (${rootNode.class})`;
  }

  // Draw text at the bottom of the canvas
  ctx.fillStyle = "#333";
  ctx.font = "14px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "bottom";
  ctx.fillText(treeText, margin.left + plotWidth / 2, canvas.height - 10);
}
