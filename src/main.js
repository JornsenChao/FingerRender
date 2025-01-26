// src/main.js
import { SceneManager } from './managers/SceneManager.js';
import { GestureManager } from './managers/GestureManager.js';
import { HandVisualizer } from './managers/HandVisualizer.js';
import { SnapshotManager } from './managers/SnapshotManager.js';
import { DragManager } from './managers/DragManager.js';

// 全局配置 (场景ID、可用参数、已选参数、组合参数等)
const appConfig = {
  chosenScene: null,
  availableParams: [], // e.g. ["rotate", "height", "scale"]
  comboParams: [], // e.g. ["rotate+scale"]
  selectedParams: [], // 最多2个 (或包含combo)
  leftParam: null,
  rightParam: null,
};

// ======== DOM 绑定 ========
const step1Panel = document.getElementById('step1');
const step2Panel = document.getElementById('step2');
const step3Panel = document.getElementById('step3');
const step4Panel = document.getElementById('step4');
const step5Panel = document.getElementById('step5');

const btnGotoStep2 = document.getElementById('btnGotoStep2');
const paramListArea = document.getElementById('paramListArea');
const btnCreateCombo = document.getElementById('btnCreateCombo');
const comboList = document.getElementById('comboList');
const btnGotoStep3 = document.getElementById('btnGotoStep3');
const selectLeftParam = document.getElementById('selectLeftParam');
const selectRightParam = document.getElementById('selectRightParam');
const btnGotoStep4 = document.getElementById('btnGotoStep4');
const btnGotoStep5 = document.getElementById('btnGotoStep5');
const btnEndDemo = document.getElementById('btnEndDemo');

// Step 1: 场景选择按钮
const sceneButtons = step1Panel.querySelectorAll('button[data-scene]');
sceneButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    const sceneId = btn.getAttribute('data-scene');
    appConfig.chosenScene = sceneId;
    console.log('Chosen scene:', sceneId);
    // 启用"下一步"按钮
    btnGotoStep2.disabled = false;
  });
});

// 多步骤流程：控制面板的显示/隐藏
function showStep(stepNum) {
  [step1Panel, step2Panel, step3Panel, step4Panel, step5Panel].forEach((el) => {
    el.classList.remove('active');
  });
  const stepEls = [
    null,
    step1Panel,
    step2Panel,
    step3Panel,
    step4Panel,
    step5Panel,
  ];
  stepEls[stepNum].classList.add('active');
}

// ========== Scene Manager & 其他 Manager ==========
let sceneManager = null;
let dragManager = null;
let gestureManager = null;
let handVisualizer = null;
let snapshotManager = null;

// 初始化时就创建 SceneManager & SnapshotManager，但不加载任何场景
function initManagers() {
  console.log('initManagers() called.');
  const container = document.getElementById('mainContainer');

  // 创建 SceneManager
  sceneManager = new SceneManager(container); // 内部会创建 renderer、camera 等
  console.log('SceneManager created:', sceneManager);

  // Snapshot UI
  const snapContainer = document.getElementById('snapshots');
  snapshotManager = new SnapshotManager(snapContainer);

  // DragManager (负责点击拖拽) - 先不启用
  dragManager = new DragManager(
    sceneManager.renderer.domElement,
    sceneManager.camera,
    sceneManager.scene
  );
}

// 第4步点击进入手势交互时，再初始化手势
async function initGestureManagers() {
  console.log('initGestureManagers() called.');
  const videoElement = document.getElementById('video');
  const landmarkCanvas = document.getElementById('landmarkCanvas');

  gestureManager = new GestureManager(videoElement, (allHands) => {
    if (handVisualizer) {
      handVisualizer.drawResults(allHands);
    }
  });

  handVisualizer = new HandVisualizer(videoElement, landmarkCanvas);

  // 绑定手势事件: Snapshot & EndSession
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

  gestureManager.onEndSession = (handLabel) => {
    alert(`手势: ${handLabel}手掌摊开4秒 -> 结束Session`);
    gestureManager.stopCamera();
    document.getElementById('cameraContainer').style.display = 'none';
  };
  await gestureManager.init();
  console.log('GestureManager init done, camera should be active now.');
}

// ======= 执行动画循环 =======
function animate() {
  requestAnimationFrame(animate);

  // 如果尚未初始化 sceneManager 或未选择场景，则跳过
  if (!sceneManager || !sceneManager.currentScene) {
    return;
  }

  // 如果已经有 gestureManager，则获取手势参数
  let paramLeft = 0;
  let paramRight = 0;
  if (gestureManager) {
    paramLeft = gestureManager.paramLeftSmooth;
    paramRight = gestureManager.paramRightSmooth;
  }

  // 根据用户配置映射到场景
  const valLeft = computeParamValue(appConfig.leftParam, paramLeft, paramRight);
  const valRight = computeParamValue(
    appConfig.rightParam,
    paramLeft,
    paramRight
  );

  // 更新 & 渲染
  sceneManager.update({
    paramLeft: valLeft,
    paramRight: valRight,
  });
  sceneManager.render();
}
animate();

// 根据用户自定义的“组合参数”规则，计算最终值
function computeParamValue(paramName, rawL, rawR) {
  if (!paramName) return 0;

  // 如果是 "rotate+scale" 这种组合 => 简单示例：取(rawL + rawR)/2
  if (paramName.includes('+')) {
    return (rawL + rawR) / 2;
  } else if (paramName.includes('*')) {
    // "rotate*offset" => rawL * rawR
    return rawL * rawR;
  } else {
    // 普通单一参数 => 简单地用 rawL，如果 rawL 为 0 则用 rawR
    return rawL > 0 ? rawL : rawR;
  }
}

// ========== Step 1 -> Step 2 ==========
btnGotoStep2.addEventListener('click', async () => {
  if (!appConfig.chosenScene) return;
  showStep(2);

  // 假设从场景文件里获取可用参数列表；此处用模拟数据
  if (appConfig.chosenScene === 'sceneA') {
    appConfig.availableParams = ['rotate', 'offset', 'another'];
  } else {
    appConfig.availableParams = ['tilt', 'roofHeight', 'fooParam'];
  }

  // 渲染 paramList
  paramListArea.innerHTML = '';
  appConfig.availableParams.forEach((p) => {
    const ck = document.createElement('input');
    ck.type = 'checkbox';
    ck.value = p;
    ck.addEventListener('change', () => onParamCheckChange());
    const label = document.createElement('label');
    label.textContent = p;
    label.style.marginRight = '10px';

    paramListArea.appendChild(ck);
    paramListArea.appendChild(label);
  });
});

function onParamCheckChange() {
  // 记录选中了哪些参数
  const checked = [];
  paramListArea.querySelectorAll('input[type=checkbox]').forEach((ck) => {
    if (ck.checked) checked.push(ck.value);
  });
  appConfig.selectedParams = checked.concat(appConfig.comboParams);

  // 如果总数(已选 + combo) >= 2，启用“下一步”
  btnGotoStep3.disabled = appConfig.selectedParams.length < 2;
}

// ========== Step 2: 创建组合参数 ==========
btnCreateCombo.addEventListener('click', () => {
  // 简单示例：自动创建 pA + pB
  if (appConfig.availableParams.length >= 2) {
    const pA = appConfig.availableParams[0];
    const pB = appConfig.availableParams[1];
    const comboName = `${pA}+${pB}`;
    if (!appConfig.comboParams.includes(comboName)) {
      appConfig.comboParams.push(comboName);
      renderComboList();
    }
    onParamCheckChange();
  }
});

function renderComboList() {
  comboList.innerHTML = '';
  appConfig.comboParams.forEach((combo) => {
    const div = document.createElement('div');
    div.textContent = `组合参数: ${combo}`;
    comboList.appendChild(div);
  });
}

// ========== Step 2 -> Step 3 ==========
btnGotoStep3.addEventListener('click', () => {
  showStep(3);

  // 在选择菜单里列出当前可用的(已勾选的 + combo)
  const params = appConfig.selectedParams;
  [selectLeftParam, selectRightParam].forEach((sel) => {
    sel.innerHTML = '';
    params.forEach((p) => {
      const opt = document.createElement('option');
      opt.value = p;
      opt.textContent = p;
      sel.appendChild(opt);
    });
  });
});

// ========== Step 3 -> Step 4 ==========
btnGotoStep4.addEventListener('click', () => {
  // 读取选择
  appConfig.leftParam = selectLeftParam.value;
  appConfig.rightParam = selectRightParam.value;
  showStep(4);

  // 这时才在 SceneManager 里真正加载场景
  sceneManager.loadScene(appConfig.chosenScene);

  // 启用拖拽
  dragManager.enable();
  console.log('Dragging enabled.');
});

// ========== Step 4 -> Step 5 ==========
btnGotoStep5.addEventListener('click', () => {
  // 关闭拖拽
  dragManager.disable();
  console.log('Dragging disabled.');

  // 进入手势交互
  showStep(5);

  // 显示摄像头容器
  document.getElementById('cameraContainer').style.display = 'block';

  // 初始化手势识别
  initGestureManagers();
});

// ========== Step 5: End Demo ==========
btnEndDemo.addEventListener('click', () => {
  if (gestureManager) {
    gestureManager.stopCamera();
  }
  document.getElementById('cameraContainer').style.display = 'none';
  alert('Demo 结束！');
});

// 启动时，初始化 Manager，进入 Step 1
initManagers();
showStep(1);
