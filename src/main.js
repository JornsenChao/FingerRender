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

// GestureManager: 负责手势识别 + 参数输出
const gestureManager = new GestureManager(videoElement, (allHands) => {
  handVisualizer.drawResults(allHands);
});

// SnapshotManager: 管理 snapshot 存储/回放
const snapshotManager = new SnapshotManager(snapContainer);

// 初始化
async function init() {
  await gestureManager.init();

  // 绑定手势事件
  gestureManager.onSnapshot = handleSnapshot;
  gestureManager.onEndSession = handleEndSession;

  // 按钮事件
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

  // 从GestureManager取出paramValue => [0,1]
  const paramValue = gestureManager.paramValue;

  // 更新场景
  sceneManager.update(paramValue);
  sceneManager.render();
}

// 当检测到snapshot
function handleSnapshot() {
  const timeStr = new Date().toLocaleTimeString();
  const param = gestureManager.paramValue;
  const sceneId = sceneManager.currentSceneID;

  // 抓取渲染canvas截图
  const base64Img = sceneManager.getScreenshotBase64();

  // 交给SnapshotManager保存 & 更新UI
  snapshotManager.addSnapshot({
    time: timeStr,
    param,
    sceneId,
    image: base64Img,
  });
}

// 当检测到End Session
function handleEndSession() {
  console.log('Session ended by open palm');
  alert('Session ended! Check your snapshots on the right panel.');
  // 你也可在此实现: 停止摄像头, 清理场景等
}

// 启动
init();
