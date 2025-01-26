// main.js
import { SceneManager } from './SceneManager.js';
import { GestureManager } from './GestureManager.js';

const container = document.body; // 也可创建一个div容器
const sceneManager = new SceneManager(container);

const videoElement = document.getElementById('video');
const gestureManager = new GestureManager(videoElement);

// 存储 Snapshot 的数组
let snapshots = [];

// 初始化流程
async function init() {
  // 1. 初始化手势识别
  await gestureManager.init();

  // 2. 设置回调：当手势检测到Snapshot或结束时
  gestureManager.onSnapshot = handleSnapshot;
  gestureManager.onEndSession = handleEndSession;

  // 3. 进入渲染循环
  animate();
}

function animate() {
  requestAnimationFrame(animate);

  // 从GestureManager取出连续参数 (0~1)
  const rotationParam = gestureManager.paramValue;

  // 更新Scene
  sceneManager.updateBlocks(rotationParam);
  sceneManager.render();
}

// 快照回调
function handleSnapshot() {
  // 记录当前参数
  const time = new Date().toLocaleTimeString();
  const rotationParam = gestureManager.paramValue;

  // 抓取屏幕截图（base64）
  const base64Img = sceneManager.renderer.domElement.toDataURL('image/png');

  const snapshotData = {
    time,
    rotationParam,
    image: base64Img,
  };
  snapshots.push(snapshotData);

  // 更新UI
  renderSnapshots();
}

// 结束会话回调
function handleEndSession() {
  console.log('Session Ended by open palm gesture');
  alert('Session ended! Check your snapshots on the right panel.');
  // 你可以做更多逻辑，如停止摄像头、清理Scene，或跳转到其他界面
}

// 在右侧面板渲染 Snapshots
function renderSnapshots() {
  const snapContainer = document.getElementById('snapshots');
  snapContainer.innerHTML = ''; // 清空

  snapshots.forEach((snap, index) => {
    const div = document.createElement('div');
    div.className = 'snapshotItem';
    div.innerHTML = `
      <div><strong>Snapshot #${index + 1}</strong> @ ${snap.time}</div>
      <div>Rotation Param: ${snap.rotationParam.toFixed(2)}</div>
      <img src="${snap.image}" width="120" />
    `;
    snapContainer.appendChild(div);
  });
}

// 启动
init();
