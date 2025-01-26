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

    // Pinch & Palm 状态
    this.pinchThreshold = 0.85;
    this.isLeftPinching = false;
    this.isRightPinching = false;
    this.leftPinchStartTime = 0;
    this.rightPinchStartTime = 0;

    this.palmOpenThreshold = 0.05;
    this.isLeftPalmOpen = false;
    this.isRightPalmOpen = false;
    this.leftPalmOpenStartTime = 0;
    this.rightPalmOpenStartTime = 0;

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
        // 用平均 x 判断左/右(简化方式)
        const avgX = handLm.reduce((sum, pt) => sum + pt.x, 0) / handLm.length;
        const pinchParam = this._computePinchParam(handLm);

        if (avgX < 0.5) {
          leftHandParam = pinchParam;
        } else {
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
    if (!hand || hand.length < 9) return 0;
    const thumbTip = hand[4];
    const indexTip = hand[8];
    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
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
    // 左手 Pinch
    const leftPinch = this.paramLeftSmooth > this.pinchThreshold;
    if (leftPinch) {
      if (!this.isLeftPinching) {
        this.isLeftPinching = true;
        this.leftPinchStartTime = now;
      } else {
        if (now - this.leftPinchStartTime > 2000) {
          this.onSnapshot && this.onSnapshot('Left');
          this.leftPinchStartTime = now + 999999; // 防止重复
        }
      }
    } else {
      this.isLeftPinching = false;
    }

    // 右手 Pinch
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

    // 左手 Palm Open
    const leftPalmOpen = this.paramLeftSmooth < this.palmOpenThreshold;
    if (leftPalmOpen) {
      if (!this.isLeftPalmOpen) {
        this.isLeftPalmOpen = true;
        this.leftPalmOpenStartTime = now;
      } else {
        if (now - this.leftPalmOpenStartTime > 4000) {
          this.onEndSession && this.onEndSession('Left');
          this.leftPalmOpenStartTime = now + 999999;
        }
      }
    } else {
      this.isLeftPalmOpen = false;
    }

    // 右手 Palm Open
    const rightPalmOpen = this.paramRightSmooth < this.palmOpenThreshold;
    if (rightPalmOpen) {
      if (!this.isRightPalmOpen) {
        this.isRightPalmOpen = true;
        this.rightPalmOpenStartTime = now;
      } else {
        if (now - this.rightPalmOpenStartTime > 4000) {
          this.onEndSession && this.onEndSession('Right');
          this.rightPalmOpenStartTime = now + 999999;
        }
      }
    } else {
      this.isRightPalmOpen = false;
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
