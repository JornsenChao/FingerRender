// GestureManager.js
// MediaPipe Hands docs: https://developers.google.com/mediapipe/solutions/vision/hand_landmarker

export class GestureManager {
  constructor(videoElement) {
    this.video = videoElement;
    this.handLandmarker = null;
    this.canvasCtx = null;

    // 连续参数: 这里示例“拇指-食指”距离（0~1之间）
    this.paramValue = 0;

    // 手势检测的一些状态
    this.isPinching = false; // 是否处于捏合状态
    this.pinchStartTime = 0; // 捏合开始时刻
    this.isPalmOpen = false; // 是否张开手掌
    this.palmOpenStartTime = 0; // 手掌张开开始时刻

    // 回调: 当检测到snapshot/结束等事件时会回调
    this.onSnapshot = null;
    this.onEndSession = null;
  }

  async init() {
    // 1. 申请摄像头
    await this._setupCamera();

    // 2. 动态加载MediaPipe Hands Web API
    // （此处使用官方@mediapipe版本2023-01, 若过期可到官方文档查看最新CDN）
    const vision = await import(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest'
    );
    const { FilesetResolver, HandLandmarker, HandLandmarkerResult } = vision;

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
        numHands: 2, // 最多检测两只手
      }
    );

    console.log('HandLandmarker loaded.');

    // 启动循环检测
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
      this.video.onloadedmetadata = () => {
        resolve();
      };
    });
  }

  _startDetectionLoop() {
    const processVideoFrame = () => {
      if (!this.handLandmarker) return;

      // 每帧进行检测
      const results = this.handLandmarker.detectForVideo(
        this.video,
        performance.now()
      );
      this._analyzeResults(results);
      requestAnimationFrame(processVideoFrame);
    };
    requestAnimationFrame(processVideoFrame);
  }

  _analyzeResults(results) {
    if (!results || !results.landmarks || results.landmarks.length === 0) {
      // 未检测到手，重置一些状态
      this.paramValue = 0;
      this.isPinching = false;
      this.isPalmOpen = false;
      return;
    }

    // 仅使用第一只手
    const hand = results.landmarks[0];
    // 拿拇指和食指指尖
    const thumbTip = hand[4];
    const indexTip = hand[8];

    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    // (注: MediaPipe返回的 x,y 是0~1归一化到图像尺寸, 也可结合 width/height 得到像素坐标)
    const dist = Math.sqrt(dx * dx + dy * dy);

    // 这里简单把 距离(0~0.2) 区间 映射到 paramValue(0~1)，做个演示
    // 你可根据自己体验再调节
    const maxDist = 0.25;
    let param = 1 - dist / maxDist;
    if (param < 0) param = 0;
    if (param > 1) param = 1;
    this.paramValue = param;

    // === 简单手势：Pinch / Open Palm ===
    // 1) Pinch：当拇指-食指距离 < 0.05 时认为在捏合
    if (dist < 0.05) {
      if (!this.isPinching) {
        // 新开始捏合
        this.isPinching = true;
        this.pinchStartTime = performance.now();
      } else {
        // 已经在捏合中，看看时间是否超过1s
        const pinchDuration = performance.now() - this.pinchStartTime;
        if (pinchDuration > 1000) {
          // 触发snapshot
          if (this.onSnapshot) {
            this.onSnapshot();
          }
          // 重置时间，避免多次疯狂触发
          this.pinchStartTime = performance.now() + 999999;
        }
      }
    } else {
      this.isPinching = false;
    }

    // 2) Open palm: 假设5指尖 spread开来 =>
    //   此处简单判断: thumbTip.x < indexTip.x, 并加上中指[12],无名指[16],小指[20]...等更多条件
    //   这里为了简化演示，只做一个非常粗略的"indexTip y < other tips y"之类判断
    //   真实项目需要更严谨的指尖坐标判断
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
        const openDuration = performance.now() - this.palmOpenStartTime;
        if (openDuration > 2000) {
          // 触发结束
          if (this.onEndSession) {
            this.onEndSession();
          }
          // 同样避免重复触发
          this.palmOpenStartTime = performance.now() + 999999;
        }
      }
    } else {
      this.isPalmOpen = false;
    }
  }
}
