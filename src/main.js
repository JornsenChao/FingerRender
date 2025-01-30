// src/main.js
import { SceneManager } from './managers/SceneManager.js';
import { GestureManager } from './managers/GestureManager.js';
import { HandVisualizer } from './managers/HandVisualizer.js';
import { SnapshotManager } from './managers/SnapshotManager.js';
import { DragManager } from './managers/DragManager.js';

// 全局配置对象
const appConfig = {
  chosenScene: null,
  availableParams: [],
  comboParams: [],
  leftParam: null,
  rightParam: null,
  isDragOn: false,
  isGestureOn: false,
};

// ================== DOM 绑定 ===================
const sceneButtons = document.querySelectorAll(
  '#sceneSubmenu button[data-scene]'
);
const menuTutorial = document.getElementById('menuTutorial');
const menuSaved = document.getElementById('menuSaved');
const menuAbout = document.getElementById('menuAbout');

const tutorialPanel = document.getElementById('tutorialPanel');
const savedPanel = document.getElementById('savedPanel');
const aboutPanel = document.getElementById('aboutPanel');

const selectLeftParam = document.getElementById('selectLeftParam');
const selectRightParam = document.getElementById('selectRightParam');
const btnCreateCombo = document.getElementById('btnCreateCombo');
const btnToggleDrag = document.getElementById('btnToggleDrag');
const btnToggleGesture = document.getElementById('btnToggleGesture');

const cameraContainer = document.getElementById('cameraContainer');
const snapshotsPanel = document.getElementById('snapshotsPanel');

// =========== Scene Manager, Gesture, etc. =============
let sceneManager = null;
let dragManager = null;
let gestureManager = null;
let handVisualizer = null;
let snapshotManager = null;

// =========== 初始化 =============
function init() {
  // 创建 SceneManager
  const container = document.getElementById('threeContainer');
  sceneManager = new SceneManager(container);

  // SnapshotManager
  snapshotManager = new SnapshotManager(snapshotsPanel);

  // DragManager
  dragManager = new DragManager(
    sceneManager.renderer.domElement,
    sceneManager.camera,
    sceneManager.scene
  );
  dragManager.disable(); // 初始关闭

  // 手势功能：暂时不初始化，等用户点击“Gesture: ON”后再init
  gestureManager = null;

  // 绑定 sidebar按钮
  sceneButtons.forEach((btn) => {
    btn.addEventListener('click', onChooseScene);
  });
  menuTutorial.addEventListener('click', () => togglePanel(tutorialPanel));
  menuSaved.addEventListener('click', () => togglePanel(savedPanel));
  menuAbout.addEventListener('click', () => togglePanel(aboutPanel));

  // 绑定 底部面板交互
  btnCreateCombo.addEventListener('click', onCreateCombo);
  btnToggleDrag.addEventListener('click', onToggleDrag);
  btnToggleGesture.addEventListener('click', onToggleGesture);

  // 启动动画循环
  animate();
}

// ========== 切换场景 ==========
function onChooseScene(e) {
  const sceneId = e.target.getAttribute('data-scene');
  appConfig.chosenScene = sceneId;
  console.log('Chosen scene:', sceneId);

  // 根据场景ID，填充可用参数
  switch (sceneId) {
    case 'sceneA':
      appConfig.availableParams = ['rotate', 'offset', 'another', 'scaleZ'];
      break;
    case 'sceneB':
      appConfig.availableParams = ['tilt', 'roofHeight', 'fooParam'];
      break;
    case 'sceneC':
      appConfig.availableParams = ['finAngle', 'glassTint'];
      break;
    default:
      appConfig.availableParams = [];
  }
  appConfig.comboParams = [];

  // 重置下拉菜单
  refreshParamSelectors();

  // 真正加载场景
  sceneManager.loadScene(sceneId);
}

// 刷新 左右手下拉菜单选项
function refreshParamSelectors() {
  // 清空
  selectLeftParam.innerHTML = '';
  selectRightParam.innerHTML = '';

  // 取可选列表
  const paramList = appConfig.availableParams.concat(appConfig.comboParams);

  if (paramList.length === 0) {
    // 如果场景还没选择，空列表
    const opt = document.createElement('option');
    opt.value = '';
    opt.textContent = 'No params';
    selectLeftParam.appendChild(opt.cloneNode(true));
    selectRightParam.appendChild(opt.cloneNode(true));
    return;
  }

  // 构建 <option>
  paramList.forEach((p) => {
    const opt1 = document.createElement('option');
    opt1.value = p;
    opt1.textContent = p;
    selectLeftParam.appendChild(opt1);

    const opt2 = document.createElement('option');
    opt2.value = p;
    opt2.textContent = p;
    selectRightParam.appendChild(opt2);
  });

  // 默认选第一项
  selectLeftParam.selectedIndex = 0;
  selectRightParam.selectedIndex = 1 < paramList.length ? 1 : 0;

  // 更新appConfig
  appConfig.leftParam = selectLeftParam.value;
  appConfig.rightParam = selectRightParam.value;
}

// 用户点击 +Combo
function onCreateCombo() {
  const paramList = appConfig.availableParams;
  if (paramList.length < 2) {
    alert('Not enough base params to create combo.');
    return;
  }
  const comboName = paramList[0] + '+' + paramList[1];
  if (!appConfig.comboParams.includes(comboName)) {
    appConfig.comboParams.push(comboName);
    refreshParamSelectors();
  }
}

// 切换 Drag ON/OFF
function onToggleDrag() {
  appConfig.isDragOn = !appConfig.isDragOn;
  if (appConfig.isDragOn) {
    dragManager.enable();
    btnToggleDrag.textContent = 'Drag: ON';
  } else {
    dragManager.disable();
    btnToggleDrag.textContent = 'Drag: OFF';
  }
}

// 切换 Gesture ON/OFF
function onToggleGesture() {
  appConfig.isGestureOn = !appConfig.isGestureOn;
  if (appConfig.isGestureOn) {
    initGestureIfNeeded();
    cameraContainer.style.display = 'block';
    btnToggleGesture.textContent = 'Gesture: ON';
  } else {
    stopGesture();
    cameraContainer.style.display = 'none';
    btnToggleGesture.textContent = 'Gesture: OFF';
  }
}

// 初始化手势识别(只做一次)
async function initGestureIfNeeded() {
  if (gestureManager) {
    return; // 已初始化过
  }
  console.log('initGestureIfNeeded...');

  const videoElement = document.getElementById('video');
  const landmarkCanvas = document.getElementById('landmarkCanvas');
  gestureManager = new GestureManager(videoElement, (allHands) => {
    if (handVisualizer) {
      handVisualizer.drawResults(allHands);
    }
  });
  handVisualizer = new HandVisualizer(videoElement, landmarkCanvas);

  // 绑定回调
  gestureManager.onSnapshot = (handLabel) => {
    console.log(`Snapshot triggered by ${handLabel} hand`);
    const timeStr = new Date().toLocaleTimeString();
    const base64Img = sceneManager.getScreenshotBase64();
    snapshotManager.addSnapshot({
      time: timeStr,
      param: {
        left: gestureManager.paramLeftSmooth.toFixed(2),
        right: gestureManager.paramRightSmooth.toFixed(2),
      },
      sceneId: appConfig.chosenScene,
      image: base64Img,
      triggeredBy: handLabel,
    });
  };
  gestureManager.onEndSession = () => {
    alert('双手同时Pinch 4秒 -> 手势Session结束');
    onToggleGesture(); // 等价于手动关闭Gesture
  };

  await gestureManager.init();
  console.log('GestureManager init done, camera should be active now.');
}

// 停止手势
function stopGesture() {
  if (!gestureManager) return;
  gestureManager.stopCamera();
  gestureManager = null;
  handVisualizer = null;
}

// ========== 展开/关闭 Overlay 面板 ==========
function togglePanel(panelElem) {
  const isActive = panelElem.classList.contains('active');
  // 先关闭全部
  [tutorialPanel, savedPanel, aboutPanel].forEach((p) => {
    p.classList.remove('active');
  });
  // 若原本没开，则打开
  if (!isActive) {
    panelElem.classList.add('active');
  }
}

// ========== 动画循环 / 参数映射 ==========
function animate() {
  requestAnimationFrame(animate);

  if (!sceneManager || !sceneManager.currentScene) {
    return;
  }

  // 如果手势已开启，则获取 raw param
  let paramLeft = 0;
  let paramRight = 0;
  if (gestureManager) {
    paramLeft = gestureManager.paramLeftSmooth;
    paramRight = gestureManager.paramRightSmooth;
  }

  // 实时从 select 读当前值
  appConfig.leftParam = selectLeftParam.value;
  appConfig.rightParam = selectRightParam.value;

  // 计算要传给场景的实际数值
  const valLeft = computeParamValue(appConfig.leftParam, paramLeft, paramRight);
  const valRight = computeParamValue(
    appConfig.rightParam,
    paramLeft,
    paramRight
  );

  sceneManager.update({
    paramLeft: valLeft,
    paramRight: valRight,
  });
  sceneManager.render();
}

// 根据 paramName 做简单逻辑映射
function computeParamValue(paramName, rawL, rawR) {
  if (!paramName) return 0;
  // 如果是 "pA+pB" 这种combo，示例：取平均
  if (paramName.includes('+')) {
    return (rawL + rawR) / 2;
  }
  // 简单默认: 如果 paramName == leftParam -> 用 rawL, 否则用 rawR
  // 你也可根据 paramName 做更复杂的映射
  return paramName === appConfig.leftParam ? rawL : rawR;
}

// 启动
init();
