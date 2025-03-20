function visualizeRandomForestRegions(forest) {
  // Create a grid of points and classify each using the random forest
  const gridSize = 30;
  const gridStepX = (state.xMax - state.xMin) / gridSize;
  const gridStepY = (state.yMax - state.yMin) / gridSize;

  // Create grid
  for (let i = 0; i <= gridSize; i++) {
    for (let j = 0; j <= gridSize; j++) {
      const x = state.xMin + i * gridStepX;
      const y = state.yMin + j * gridStepY;

      // Classify using the random forest
      const predictedClass = predictWithForest(forest, { x, y });

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

  // Now draw the decision boundaries from individual trees
  visualizeIndividualTrees(forest);
}

// Visualize individual tree decision boundaries
function visualizeIndividualTrees(forest) {
  // Generate different colors for each tree's boundaries
  const treeColors = [];

  for (let i = 0; i < forest.numTrees; i++) {
    // Generate pastel colors by adding transparency
    const hue = (i * 30) % 360; // spread colors across the spectrum
    treeColors.push(`hsla(${hue}, 70%, 60%, 0.5)`);
  }

  // Draw decision boundaries for each tree
  forest.trees.forEach((tree, index) => {
    const color = treeColors[index];
    drawTreeBoundaries(tree, color);
  });
}

// Draw decision boundaries for a tree
function drawTreeBoundaries(node, color) {
  if (!node || node.isLeaf) return;

  // Draw the split line
  if (node.feature === "x") {
    // Vertical line at x = value
    const x = node.value;
    const y1 = node.bounds ? node.bounds.minY : state.yMin;
    const y2 = node.bounds ? node.bounds.maxY : state.yMax;

    drawLine(x, y1, x, y2, color, 1);
  } else {
    // feature is 'y'
    // Horizontal line at y = value
    const y = node.value;
    const x1 = node.bounds ? node.bounds.minX : state.xMin;
    const x2 = node.bounds ? node.bounds.maxX : state.xMax;

    drawLine(x1, y, x2, y, color, 1);
  }

  // Recursively draw children's boundaries
  drawTreeBoundaries(node.left, color);
  drawTreeBoundaries(node.right, color);
}

// Visualize tree structures
function visualizeTreeStructures(forest) {
  // Draw a small schematic of each tree at the top of the canvas
  const numTrees = forest.numTrees;
  const treeWidth = plotWidth / numTrees;

  forest.trees.forEach((tree, index) => {
    const x = margin.left + index * treeWidth + treeWidth / 2;
    const y = margin.top + 30;

    // Draw tree index
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue(
      "--text-primary"
    );
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`Tree ${index + 1}`, x, y - 15);

    // Calculate tree depth
    const depth = calculateTreeDepth(tree);

    // Draw a simplified tree representation
    drawSimplifiedTree(tree, x, y, treeWidth * 0.8, 40, depth);
  });
}

// Calculate the depth of a tree
function calculateTreeDepth(node) {
  if (!node || node.isLeaf) return 0;

  const leftDepth = calculateTreeDepth(node.left);
  const rightDepth = calculateTreeDepth(node.right);

  return Math.max(leftDepth, rightDepth) + 1;
}

// Draw a simplified tree representation
function drawSimplifiedTree(node, x, y, width, height, maxDepth) {
  if (!node) return;

  const nodeRadius = 5;

  // Draw the current node
  ctx.beginPath();
  ctx.arc(x, y, nodeRadius, 0, Math.PI * 2);

  if (node.isLeaf) {
    // Color leaf nodes based on their class
    ctx.fillStyle =
      node.class === 1
        ? getComputedStyle(document.documentElement).getPropertyValue(
            "--class1-color"
          )
        : getComputedStyle(document.documentElement).getPropertyValue(
            "--class2-color"
          );
  } else {
    // Internal nodes are gray
    ctx.fillStyle = "#757575";
  }

  ctx.fill();

  if (!node.isLeaf && maxDepth > 1) {
    // Draw lines to children
    const childY = y + height / maxDepth;
    const childXOffset = width / 4;

    // Line to left child
    ctx.beginPath();
    ctx.moveTo(x, y + nodeRadius);
    ctx.lineTo(x - childXOffset, childY - nodeRadius);
    ctx.strokeStyle = "#757575";
    ctx.lineWidth = 1;
    ctx.stroke();

    // Line to right child
    ctx.beginPath();
    ctx.moveTo(x, y + nodeRadius);
    ctx.lineTo(x + childXOffset, childY - nodeRadius);
    ctx.stroke();

    // Recursively draw children
    drawSimplifiedTree(
      node.left,
      x - childXOffset,
      childY,
      width / 2,
      height,
      maxDepth - 1
    );
    drawSimplifiedTree(
      node.right,
      x + childXOffset,
      childY,
      width / 2,
      height,
      maxDepth - 1
    );
  }
}

// Find the best split for a specific feature using the Gini impurity
function findBestSplitForFeature(points, feature) {
  if (points.length < 2) return null;

  let bestSplit = null;
  let bestGini = 1.0; // Gini impurity ranges from 0 to 0.5

  // Sort by the feature
  const sortedPoints = [...points].sort((a, b) => a[feature] - b[feature]);

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const splitValue =
      (sortedPoints[i][feature] + sortedPoints[i + 1][feature]) / 2;

    const leftPoints = points.filter((p) => p[feature] <= splitValue);
    const rightPoints = points.filter((p) => p[feature] > splitValue);

    const gini = calculateGiniImpurity(leftPoints, rightPoints, points.length);

    if (gini < bestGini) {
      bestGini = gini;
      bestSplit = { feature, value: splitValue };
    }
  }

  return bestSplit;
}

// Calculate Gini impurity
function calculateGiniImpurity(leftPoints, rightPoints, totalPoints) {
  const leftWeight = leftPoints.length / totalPoints;
  const rightWeight = rightPoints.length / totalPoints;

  const leftGini = calculateNodeGini(leftPoints);
  const rightGini = calculateNodeGini(rightPoints);

  return leftWeight * leftGini + rightWeight * rightGini;
}

// Calculate Gini impurity for a single node
function calculateNodeGini(points) {
  if (points.length === 0) return 0;

  const class1Prob = points.filter((p) => p.class === 1).length / points.length;
  const class2Prob = 1 - class1Prob;

  return 1 - (Math.pow(class1Prob, 2) + Math.pow(class2Prob, 2));
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

function predictWithForest(forest, point) {
  // Get predictions from all trees
  const predictions = forest.trees.map((tree) => predictWithTree(tree, point));

  // Count votes for each class
  const class1Votes = predictions.filter((p) => p === 1).length;
  const class2Votes = predictions.filter((p) => p === -1).length;

  // Return majority vote
  return class1Votes >= class2Votes ? 1 : -1;
}

function predictWithTree(node, point) {
  if (node.isLeaf) {
    return node.class;
  }

  if (point[node.feature] <= node.value) {
    return predictWithTree(node.left, point);
  } else {
    return predictWithTree(node.right, point);
  }
}

function runRandomForest() {
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
      "Need points from both classes for Random Forest",
      margin.left + plotWidth / 2,
      margin.top + plotHeight / 2
    );
    return;
  }

  // Determine number of trees based on dataset size
  const numTrees = Math.min(
    10,
    Math.max(3, Math.floor(state.points.length / 3))
  );

  const forest = buildRandomForest(state.points, numTrees);

  visualizeRandomForestRegions(forest);

  visualizeTreeStructures(forest);

  drawPoints();
}

function buildRandomForest(points, numTrees) {
  const trees = [];

  for (let i = 0; i < numTrees; i++) {
    // Bootstrap sampling (random sampling with replacement)
    const samplePoints = bootstrapSample(points);

    // Build a decision tree on the sample
    const tree = buildDecisionTree(samplePoints, 0, 3, i);

    trees.push(tree);
  }

  return { trees, numTrees };
}

function bootstrapSample(points) {
  const sample = [];
  const n = points.length;

  for (let i = 0; i < n; i++) {
    const randomIndex = Math.floor(Math.random() * n);
    sample.push({ ...points[randomIndex] });
  }

  return sample;
}

// Build a decision tree with randomized feature selection
function buildDecisionTree(points, depth, maxDepth, treeIndex) {
  // Stop conditions
  if (depth >= maxDepth) {
    return createLeafNode(points);
  }

  // Check if all points have the same class
  const allSameClass = points.every((p) => p.class === points[0].class);
  if (allSameClass) {
    return createLeafNode(points);
  }

  // For random forest, we randomly choose the feature to split on
  // In our 2D case, we randomly choose between x and y
  const featureToUse = Math.random() < 0.5 ? "x" : "y";

  // Find the best split for the selected feature
  const split = findBestSplitForFeature(points, featureToUse);

  // If no good split found, create a leaf node
  if (!split) {
    return createLeafNode(points);
  }

  // Divide the points based on the split
  const leftPoints = points.filter((p) => p[split.feature] <= split.value);
  const rightPoints = points.filter((p) => p[split.feature] > split.value);

  // Handle edge case where all points end up on one side
  if (leftPoints.length === 0 || rightPoints.length === 0) {
    return createLeafNode(points);
  }

  // Create a new internal node
  const node = {
    isLeaf: false,
    feature: split.feature,
    value: split.value,
    left: buildDecisionTree(leftPoints, depth + 1, maxDepth, treeIndex),
    right: buildDecisionTree(rightPoints, depth + 1, maxDepth, treeIndex),
    bounds: calculateBounds(points),
    depth: depth,
    treeIndex: treeIndex,
  };

  return node;
}
