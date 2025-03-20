const state = {
  points: [],
  currentClass: 1, // 1 or -1
  selectedMethod: "svm",
  running: false,
  xMin: -10,
  xMax: 10,
  yMin: -10,
  yMax: 10,
  darkMode: false,
};

const canvas = document.getElementById("plotCanvas");
const ctx = canvas.getContext("2d");
const class1Btn = document.getElementById("class1Btn");
const class2Btn = document.getElementById("class2Btn");
const methodSelect = document.getElementById("methodSelect");
const runBtn = document.getElementById("runBtn");
const resetBtn = document.getElementById("resetBtn");
const pointCount = document.getElementById("pointCount");
const algoDescription = document.getElementById("algorithmDescription");

let canvasWidth, canvasHeight, plotWidth, plotHeight;
const margin = { top: 30, right: 30, bottom: 40, left: 50 };

const algorithmDescriptions = {
  svm: "Support Vector Machine (SVM) finds the hyperplane that best separates classes with the maximum margin between support vectors.",
  knn: "K-Nearest Neighbors classifies points based on the majority class of their k closest neighbors in the feature space.",
  "decision-tree":
    "Decision Tree partitions the space recursively based on features to create regions with homogeneous class labels.",
  "random-forest":
    "Random Forest combines multiple decision trees to improve accuracy and control overfitting.",
  "logistic-regression":
    "Logistic Regression uses a logistic function to model probability and create a linear decision boundary.",
  "naive-bayes":
    "Naive Bayes applies Bayes theorem with strong independence assumptions between features.",
  kmeans:
    "K-Means groups data into k clusters by minimizing the distance between points and their cluster centroid.",
  dbscan:
    "DBSCAN identifies clusters as dense regions separated by regions of lower density, without specifying cluster count.",
};

function resizeCanvas() {
  const container = canvas.parentElement;
  const rect = container.getBoundingClientRect();
  canvas.width = rect.width;
  canvas.height = rect.height;

  canvasWidth = canvas.width;
  canvasHeight = canvas.height;
  plotWidth = canvasWidth - margin.left - margin.right;
  plotHeight = canvasHeight - margin.top - margin.bottom;

  state.darkMode = document.body.classList.contains("dark-mode");

  if (state.points.length > 0) {
    initCanvas();
  }
}

window.addEventListener("resize", resizeCanvas);
resizeCanvas();
initCanvas();
updateAlgorithmDescription();

canvas.addEventListener("click", handleCanvasClick);
class1Btn.addEventListener("click", () => setPointClass(1));
class2Btn.addEventListener("click", () => setPointClass(-1));
methodSelect.addEventListener("change", handleMethodChange);
runBtn.addEventListener("click", handleRun);
resetBtn.addEventListener("click", handleReset);

window.initCanvas = initCanvas;

function toCanvasX(x) {
  return (
    margin.left + ((x - state.xMin) / (state.xMax - state.xMin)) * plotWidth
  );
}

function toCanvasY(y) {
  return (
    margin.top +
    plotHeight -
    ((y - state.yMin) / (state.yMax - state.yMin)) * plotHeight
  );
}

function toDataX(canvasX) {
  return (
    state.xMin +
    ((canvasX - margin.left) * (state.xMax - state.xMin)) / plotWidth
  );
}

function toDataY(canvasY) {
  return (
    state.yMin +
    ((plotHeight - (canvasY - margin.top)) * (state.yMax - state.yMin)) /
      plotHeight
  );
}

function initCanvas() {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);
  drawAxes();
  drawPoints();
  updatePointCount();
}

function drawAxes() {
  if (state.darkMode) {
    ctx.fillStyle = "#2c2c2c";
  } else {
    ctx.fillStyle = "#f9f9f9";
  }
  ctx.fillRect(margin.left, margin.top, plotWidth, plotHeight);

  if (state.darkMode) {
    ctx.strokeStyle = "#444";
  } else {
    ctx.strokeStyle = "#e0e0e0";
  }
  ctx.lineWidth = 1;

  // Vertical grid lines
  for (let x = state.xMin; x <= state.xMax; x++) {
    if (x === 0) continue;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(x), toCanvasY(state.yMin));
    ctx.lineTo(toCanvasX(x), toCanvasY(state.yMax));
    ctx.stroke();
  }

  // Horizontal grid lines
  for (let y = state.yMin; y <= state.yMax; y++) {
    if (y === 0) continue;
    ctx.beginPath();
    ctx.moveTo(toCanvasX(state.xMin), toCanvasY(y));
    ctx.lineTo(toCanvasX(state.xMax), toCanvasY(y));
    ctx.stroke();
  }

  if (state.darkMode) {
    ctx.strokeStyle = "#bbb";
  } else {
    ctx.strokeStyle = "#333";
  }
  ctx.lineWidth = 2;

  ctx.beginPath();
  ctx.moveTo(toCanvasX(state.xMin), toCanvasY(0));
  ctx.lineTo(toCanvasX(state.xMax), toCanvasY(0));
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(toCanvasX(0), toCanvasY(state.yMin));
  ctx.lineTo(toCanvasX(0), toCanvasY(state.yMax));
  ctx.stroke();

  if (state.darkMode) {
    ctx.fillStyle = "#bbb";
  } else {
    ctx.fillStyle = "#333";
  }
  ctx.font = "16px Arial";
  ctx.textAlign = "center";
  ctx.fillText("X", toCanvasX(state.xMax) + 20, toCanvasY(0) + 5);
  ctx.fillText("Y", toCanvasX(0) - 5, toCanvasY(state.yMax) - 10);

  ctx.font = "12px Arial";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  for (let x = state.xMin; x <= state.xMax; x++) {
    if (x === 0) continue;
    const canvasX = toCanvasX(x);
    const canvasY = toCanvasY(0);

    ctx.beginPath();
    ctx.moveTo(canvasX, canvasY - 5);
    ctx.lineTo(canvasX, canvasY + 5);
    ctx.stroke();

    ctx.fillText(x.toString(), canvasX, canvasY + 15);
  }

  ctx.textAlign = "right";
  for (let y = state.yMin; y <= state.yMax; y++) {
    if (y === 0) continue;
    const canvasX = toCanvasX(0);
    const canvasY = toCanvasY(y);

    ctx.beginPath();
    ctx.moveTo(canvasX - 5, canvasY);
    ctx.lineTo(canvasX + 5, canvasY);
    ctx.stroke();

    ctx.fillText(y.toString(), canvasX - 10, canvasY);
  }

  ctx.textAlign = "right";
  ctx.fillText("0", toCanvasX(0) - 10, toCanvasY(0) + 15);
}

function drawPoints() {
  state.points.forEach((point) => {
    drawPoint(point);
  });
}

function drawPoint(point) {
  const canvasX = toCanvasX(point.x);
  const canvasY = toCanvasY(point.y);

  ctx.beginPath();
  ctx.arc(canvasX, canvasY, 6, 0, Math.PI * 2);

  if (point.class === 1) {
    ctx.fillStyle = "#4285F4";
  } else {
    ctx.fillStyle = "#EA4335";
  }

  ctx.fill();

  if (state.darkMode) {
    ctx.strokeStyle = "#333";
  } else {
    ctx.strokeStyle = "white";
  }
  ctx.lineWidth = 2;
  ctx.stroke();

  if (point.isSupportVector) {
    ctx.beginPath();
    ctx.arc(canvasX, canvasY, 12, 0, Math.PI * 2);
    ctx.strokeStyle = point.class === 1 ? "#4285F4" : "#EA4335";
    ctx.lineWidth = 2;
    ctx.stroke();

    console.log("Drawing support vector at:", point.x, point.y);
  }
}

function handleCanvasClick(e) {
  if (state.running) return;

  const rect = canvas.getBoundingClientRect();

  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;

  const clickX = (e.clientX - rect.left) * scaleX;
  const clickY = (e.clientY - rect.top) * scaleY;

  const dataX = toDataX(clickX);
  const dataY = toDataY(clickY);

  if (
    dataX >= state.xMin &&
    dataX <= state.xMax &&
    dataY >= state.yMin &&
    dataY <= state.yMax
  ) {
    state.points.push({
      x: dataX,
      y: dataY,
      class: state.currentClass,
      isSupportVector: false,
    });

    initCanvas();
    updatePointCount();
  }
}

function setPointClass(classValue) {
  state.currentClass = classValue;

  if (classValue === 1) {
    class1Btn.classList.add("active");
    class2Btn.classList.remove("active");
  } else {
    class1Btn.classList.remove("active");
    class2Btn.classList.add("active");
  }
}

function updatePointCount() {
  const class1Count = state.points.filter((p) => p.class === 1).length;
  const class2Count = state.points.filter((p) => p.class === -1).length;
  pointCount.textContent = `Points: ${state.points.length} (Class 1: ${class1Count}, Class -1: ${class2Count})`;
}

function handleReset() {
  state.points = [];
  state.running = false;
  runBtn.textContent = "Run";
  initCanvas();
  updatePointCount();
}

function handleMethodChange(e) {
  state.selectedMethod = e.target.value;
  updateAlgorithmDescription();
}

function updateAlgorithmDescription() {
  const description =
    algorithmDescriptions[state.selectedMethod] || "No description available.";
  algoDescription.textContent = description;
}

function handleRun() {
  if (state.points.length < 2) {
    alert("Please add at least 2 points (preferably with different classes)");
    return;
  }

  state.running = !state.running;

  if (state.running) {
    runBtn.textContent = "Stop";

    switch (state.selectedMethod) {
      case "svm":
        runSVM();
        break;
      case "knn":
        runKNN();
        break;
      case "decision-tree":
        runDecisionTree();
        break;
      case "random-forest":
        runRandomForest();
        break;
      case "logistic-regression":
        runLogisticRegression();
        break;
      case "naive-bayes":
        runNaiveBayes();
        break;
      case "kmeans":
        runKMeans();
        break;
      case "dbscan":
        runDBSCAN();
        break;
    }
  } else {
    runBtn.textContent = "Run";
    initCanvas();
  }
}

function drawLine(x1, y1, x2, y2, color = "#000", width = 2, dashPattern = []) {
  const canvasX1 = toCanvasX(x1);
  const canvasY1 = toCanvasY(y1);
  const canvasX2 = toCanvasX(x2);
  const canvasY2 = toCanvasY(y2);

  ctx.beginPath();
  ctx.moveTo(canvasX1, canvasY1);
  ctx.lineTo(canvasX2, canvasY2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;

  if (dashPattern.length > 0) {
    ctx.setLineDash(dashPattern);
  } else {
    ctx.setLineDash([]);
  }

  ctx.stroke();
  ctx.setLineDash([]);
}

function drawLegend() {
  const legendX = margin.left + plotWidth - 150;
  const legendY = margin.top + 30;
  const lineHeight = 20;

  // Legend box
  if (state.darkMode) {
    ctx.fillStyle = "rgba(50, 50, 50, 0.8)";
    ctx.strokeStyle = "#555";
  } else {
    ctx.fillStyle = "rgba(255, 255, 255, 0.8)";
    ctx.strokeStyle = "#ddd";
  }
  ctx.fillRect(legendX - 10, legendY - 20, 160, 110);
  ctx.strokeRect(legendX - 10, legendY - 20, 160, 110);

  if (state.darkMode) {
    ctx.fillStyle = "#bbb";
  } else {
    ctx.fillStyle = "#333";
  }
  ctx.fillText("Class -1", legendX + 25, legendY + 2 * lineHeight);

  if (state.darkMode) {
    ctx.strokeStyle = "#bbb";
  } else {
    ctx.strokeStyle = "#333";
  }
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(legendX + 10, legendY + 3 * lineHeight, 6, 0, Math.PI * 2);
  ctx.stroke();

  if (state.darkMode) {
    ctx.fillStyle = "#bbb";
  } else {
    ctx.fillStyle = "#333";
  }
  ctx.fillText("Support Vectors", legendX + 25, legendY + 3 * lineHeight);
}
ctx.font = "bold 14px Arial";
ctx.textAlign = "left";
ctx.textBaseline = "middle";
ctx.fillText(
  `${state.selectedMethod.toUpperCase()} Visualization`,
  legendX,
  legendY
);

ctx.fillStyle = "#4285F4";
ctx.beginPath();
ctx.arc(legendX + 10, legendY + lineHeight, 6, 0, Math.PI * 2);
ctx.fill();

if (state.darkMode) {
  ctx.fillStyle = "#bbb";
} else {
  ctx.fillStyle = "#333";
}
ctx.font = "14px Arial";
ctx.fillText("Class 1", legendX + 25, legendY + lineHeight);

ctx.fillStyle = "#EA4335";
ctx.beginPath();
ctx.arc(legendX + 10, legendY + 2 * lineHeight, 6, 0, Math.PI * 2);
ctx.fill();

if (state.darkMode) {
  ctx.fillStyle = "#bbb";
} else {
  ctx.fillStyle = "#333";
}
