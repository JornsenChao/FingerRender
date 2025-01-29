// src/managers/GestureManager.js
import {
  FilesetResolver,
  HandLandmarker,
} from 'https://cdn.skypack.dev/@mediapipe/tasks-vision';

// 利用 MediaPipe Tasks 做手部关键点检测
export class GestureManager {
  constructor(videoElement, onResultsCallback) {
    this.video = videoElement;
    this.onResultsCallback = onResultsCallback;

    this.handLandmarker = null;

    this.paramLeftRaw = 0;
    this.paramRightRaw = 0;
    this.paramLeftSmooth = 0;
    this.paramRightSmooth = 0;
    this.smoothingFactor = 0.2;

    // Pinch 阈值(越大表示手指越紧贴)
    this.pinchThreshold = 0.85;

    // 单手 Pinch -> Snapshot
    this.isLeftPinching = false;
    this.isRightPinching = false;
    this.leftPinchStartTime = 0;
    this.rightPinchStartTime = 0;

    // 双手 Pinch -> EndSession
    this.isBothPinching = false;
    this.bothPinchStartTime = 0;

    // 回调
    this.onSnapshot = null;
    this.onEndSession = null;
    this._running = true;
  }

  async init() {
    await this._setupCamera();
    const filesetResolver = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    this.handLandmarker = await HandLandmarker.createFromOptions(
      filesetResolver,
      {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-assets/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
      }
    );
    console.log('Scene init called!');
    console.log('HandLandmarker loaded.');
    this._startLoop();
  }

  async _setupCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('This browser does not support camera access.');
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    this.video.srcObject = stream;
    this.video.play();
    console.log('Successfully got camera stream');
    return new Promise((resolve) => {
      this.video.onloadedmetadata = () => resolve();
    });
  }

  _startLoop() {
    const loop = () => {
      if (!this._running) return;
      if (this.handLandmarker) {
        const now = performance.now();
        const results = this.handLandmarker.detectForVideo(this.video, now);
        this._analyze(results);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }

  _analyze(results) {
    let leftHandParam = 0;
    let rightHandParam = 0;

    if (results && results.landmarks && results.landmarks.length > 0) {
      results.landmarks.forEach((handLm) => {
        // 用平均 x 判断该手在画面的左右位置(简化方式)
        const avgX = handLm.reduce((sum, pt) => sum + pt.x, 0) / handLm.length;
        const pinchParam = this._computePinchParam(handLm);

        if (avgX < 0.5) {
          // 视为左手
          leftHandParam = pinchParam;
        } else {
          // 视为右手
          rightHandParam = pinchParam;
        }
      });
    }

    this.paramLeftRaw = leftHandParam;
    this.paramRightRaw = rightHandParam;
    // 平滑
    this.paramLeftSmooth = this._smooth(this.paramLeftSmooth, leftHandParam);
    this.paramRightSmooth = this._smooth(this.paramRightSmooth, rightHandParam);

    this._detectGestures();
    if (this.onResultsCallback) {
      this.onResultsCallback(results?.landmarks || []);
    }
  }

  _computePinchParam(hand) {
    // 简单用拇指尖 & 食指尖的距离来计算 pinchParam
    if (!hand || hand.length < 9) return 0;
    const thumbTip = hand[4];
    const indexTip = hand[8];
    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 设定一个最大可能距离(经验值)
    const maxDist = 0.3;
    let param = 1 - dist / maxDist;
    return Math.max(0, Math.min(1, param));
  }

  _smooth(prev, cur) {
    const alpha = this.smoothingFactor;
    return prev * (1 - alpha) + cur * alpha;
  }

  _detectGestures() {
    const now = performance.now();

    // ============== 单手 Pinch => Snapshot ==============
    // 左手
    const leftPinch = this.paramLeftSmooth > this.pinchThreshold;
    if (leftPinch) {
      if (!this.isLeftPinching) {
        this.isLeftPinching = true;
        this.leftPinchStartTime = now;
      } else {
        if (now - this.leftPinchStartTime > 2000) {
          // 2秒
          this.onSnapshot && this.onSnapshot('Left');
          // 避免反复触发
          this.leftPinchStartTime = now + 999999;
        }
      }
    } else {
      this.isLeftPinching = false;
    }

    // 右手
    const rightPinch = this.paramRightSmooth > this.pinchThreshold;
    if (rightPinch) {
      if (!this.isRightPinching) {
        this.isRightPinching = true;
        this.rightPinchStartTime = now;
      } else {
        if (now - this.rightPinchStartTime > 2000) {
          this.onSnapshot && this.onSnapshot('Right');
          this.rightPinchStartTime = now + 999999;
        }
      }
    } else {
      this.isRightPinching = false;
    }

    // ============== 双手Pinch => EndSession ==============
    // 如果左右手都在Pinch状态
    if (leftPinch && rightPinch) {
      if (!this.isBothPinching) {
        this.isBothPinching = true;
        this.bothPinchStartTime = now;
      } else {
        if (now - this.bothPinchStartTime > 4000) {
          // 同时握拳 4秒
          this.onEndSession && this.onEndSession();
          this.bothPinchStartTime = now + 999999;
        }
      }
    } else {
      this.isBothPinching = false;
    }
  }

  stopCamera() {
    this._running = false;
    const stream = this.video.srcObject;
    if (stream) {
      stream.getTracks().forEach((t) => t.stop());
    }
  }
}
