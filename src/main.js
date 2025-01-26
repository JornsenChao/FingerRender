// src/main.js
import { GestureManager } from './managers/GestureManager.js';
import { HandVisualizer } from './managers/HandVisualizer.js';
import { SceneManager } from './managers/SceneManager.js';
import { SnapshotManager } from './managers/SnapshotManager.js';

// ---- DOM ----
const videoElement = document.getElementById('video');
const landmarkCanvas = document.getElementById('landmarkCanvas');
const btnSceneA = document.getElementById('btnSceneA');
const btnSceneB = document.getElementById('btnSceneB');
const snapContainer = document.getElementById('snapshots');

// ---- 实例化各 Manager ----

// SceneManager: 内部会创建Three.js渲染器、相机、光源等
const sceneManager = new SceneManager(document.body);

// HandVisualizer: 在摄像头画面上绘制手势关键点
const handVisualizer = new HandVisualizer(videoElement, landmarkCanvas);

// GestureManager: 负责手势识别 + 连续参数输出(左手/右手)，以及手势事件(pinching => snapshot, palm open => end session)
const gestureManager = new GestureManager(videoElement, (allHands) => {
  // 每帧回调: 在摄像头上可视化手势关键点
  handVisualizer.drawResults(allHands);
});

// SnapshotManager: 管理 snapshot 存储/回放
const snapshotManager = new SnapshotManager(snapContainer);

// 初始化
async function init() {
  await gestureManager.init();

  // 绑定手势事件回调
  gestureManager.onSnapshot = handleSnapshot;
  gestureManager.onEndSession = handleEndSession;

  // 场景切换按钮
  btnSceneA.addEventListener('click', () => {
    sceneManager.loadScene('sceneA');
  });
  btnSceneB.addEventListener('click', () => {
    sceneManager.loadScene('sceneB');
  });

  // 启动渲染循环
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  // 从GestureManager取出两只手的参数
  const paramLeft = gestureManager.paramLeftSmooth;
  const paramRight = gestureManager.paramRightSmooth;

  // 把这两个参数打包给场景
  sceneManager.update({
    paramLeft,
    paramRight,
  });
  sceneManager.render();
}

// 当检测到snapshot事件
function handleSnapshot(handLabel) {
  const timeStr = new Date().toLocaleTimeString();
  const sceneId = sceneManager.currentSceneID;

  // 抓取渲染canvas的截图
  const base64Img = sceneManager.getScreenshotBase64();

  // 记录当前参数
  const paramData = {
    left: gestureManager.paramLeftSmooth.toFixed(2),
    right: gestureManager.paramRightSmooth.toFixed(2),
  };

  // 交给SnapshotManager保存 & 更新UI
  snapshotManager.addSnapshot({
    time: timeStr,
    param: paramData,
    sceneId,
    image: base64Img,
    triggeredBy: handLabel,
  });
}

// 当检测到End Session事件
function handleEndSession(handLabel) {
  console.log('Session ended by open palm on', handLabel);
  alert(
    `Session ended by ${handLabel} hand palm open! Check your snapshots on the right panel.`
  );
  // （可选）在此实现: 停止摄像头, 清理场景等
  // gestureManager.stopCamera();
}

// 启动
init();
