// src/managers/GestureManager.js
// 利用 MediaPipe Hands (@mediapipe/tasks-vision) 做手部关键点检测

export class GestureManager {
  constructor(videoElement, onResultsCallback) {
    this.video = videoElement;
    this.onResultsCallback = onResultsCallback; // 每帧将检测结果回调，用于可视化

    this.handLandmarker = null;
    this.paramValue = 0; // 连续参数(0~1), 由拇指-食指距离映射

    // 手势检测状态
    this.isPinching = false;
    this.pinchStartTime = 0;
    this.isPalmOpen = false;
    this.palmOpenStartTime = 0;

    // 事件回调
    this.onSnapshot = null; // 捏合1s
    this.onEndSession = null; // 张开手掌2s
  }

  async init() {
    await this._setupCamera();

    const vision = await import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest'
    );
    const { FilesetResolver, HandLandmarker } = vision;

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
    this._startDetectionLoop();
  }

  async _setupCamera() {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert("This browser doesn't support camera access.");
      return;
    }
    const stream = await navigator.mediaDevices.getUserMedia({ video: true });
    this.video.srcObject = stream;
    this.video.play();
    return new Promise((resolve) => {
      this.video.onloadedmetadata = () => resolve();
    });
  }

  _startDetectionLoop() {
    const processFrame = () => {
      if (!this.handLandmarker) return;

      const now = performance.now();
      const results = this.handLandmarker.detectForVideo(this.video, now);

      this._analyzeResults(results);

      // 回调给外部做可视化
      if (this.onResultsCallback && results?.landmarks) {
        this.onResultsCallback(results.landmarks);
      }
      requestAnimationFrame(processFrame);
    };
    requestAnimationFrame(processFrame);
  }

  _analyzeResults(results) {
    if (!results || !results.landmarks || results.landmarks.length === 0) {
      this.paramValue = 0;
      this.isPinching = false;
      this.isPalmOpen = false;
      return;
    }

    const hand = results.landmarks[0]; // 只用第一只手
    const thumbTip = hand[4];
    const indexTip = hand[8];

    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 将 dist(0~0.25)映射到 paramValue(0~1)
    const maxDist = 0.25;
    let param = 1 - dist / maxDist;
    param = Math.max(0, Math.min(1, param));
    this.paramValue = param;

    // ======= 简易手势：Pinch、OpenPalm =======
    if (dist < 0.05) {
      // Pinch
      if (!this.isPinching) {
        this.isPinching = true;
        this.pinchStartTime = performance.now();
      } else {
        // 判断捏合是否超过1秒
        const pinchDur = performance.now() - this.pinchStartTime;
        if (pinchDur > 1000) {
          if (this.onSnapshot) {
            this.onSnapshot();
          }
          // 避免重复触发
          this.pinchStartTime = performance.now() + 999999;
        }
      }
    } else {
      this.isPinching = false;
    }

    // OpenPalm: 简化判定
    const middleTip = hand[12];
    const ringTip = hand[16];
    const pinkyTip = hand[20];
    const isOpen =
      dist > 0.15 &&
      indexTip.y < middleTip.y &&
      indexTip.y < ringTip.y &&
      indexTip.y < pinkyTip.y;

    if (isOpen) {
      if (!this.isPalmOpen) {
        this.isPalmOpen = true;
        this.palmOpenStartTime = performance.now();
      } else {
        const openDur = performance.now() - this.palmOpenStartTime;
        if (openDur > 2000) {
          if (this.onEndSession) {
            this.onEndSession();
          }
          this.palmOpenStartTime = performance.now() + 999999;
        }
      }
    } else {
      this.isPalmOpen = false;
    }
  }
}
