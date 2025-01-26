// src/managers/GestureManager.js
// 利用 MediaPipe Tasks (HandLandmarker) 做手部关键点检测，输出左右手分别的 paramValue，并检测快照和结束手势。

export class GestureManager {
  constructor(videoElement, onResultsCallback) {
    this.video = videoElement;
    this.onResultsCallback = onResultsCallback; // 每帧把识别结果回调，用于可视化

    this.handLandmarker = null;

    // 原始参数 (0~1)，不经过滤波
    this.paramLeftRaw = 0;
    this.paramRightRaw = 0;

    // 平滑后参数
    this.paramLeftSmooth = 0;
    this.paramRightSmooth = 0;
    this.smoothingFactor = 0.2; // 越接近1越灵敏，越接近0越平滑

    // Pinch & Palm 状态判定
    this.pinchThreshold = 0.8; // 当 param > 0.8 时，认为是“Pinch捏合”
    this.isLeftPinching = false;
    this.isRightPinching = false;
    this.leftPinchStartTime = 0;
    this.rightPinchStartTime = 0;

    this.palmOpenThreshold = 0.1; // 当 param < 0.1 时(说明拇指食指距离很大) + 其它手指抬起 => PalmOpen
    this.isLeftPalmOpen = false;
    this.isRightPalmOpen = false;
    this.leftPalmOpenStartTime = 0;
    this.rightPalmOpenStartTime = 0;

    // 事件回调
    this.onSnapshot = null; // 当Pinch稳定超过1秒 => snapshot
    this.onEndSession = null; // 当PalmOpen稳定超过2秒 => end session
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

  stopCamera() {
    const stream = this.video.srcObject;
    if (!stream) return;
    const tracks = stream.getTracks();
    tracks.forEach((track) => track.stop());
    this.video.srcObject = null;
  }

  _startDetectionLoop() {
    const processFrame = () => {
      if (!this.handLandmarker) return;
      const now = performance.now();
      const results = this.handLandmarker.detectForVideo(this.video, now);

      // 解析结果
      this._analyzeResults(results);

      // 回调给外部可视化
      if (this.onResultsCallback && results?.landmarks) {
        this.onResultsCallback(results.landmarks);
      }

      requestAnimationFrame(processFrame);
    };
    requestAnimationFrame(processFrame);
  }

  _analyzeResults(results) {
    // 默认值：没有手 => 0
    let leftHandParam = 0;
    let rightHandParam = 0;

    if (results && results.landmarks && results.landmarks.length > 0) {
      // 最多检测到2只手
      // 这里根据 handedness(Left/Right) 来区分，也可以用 bounding box x位置来区分
      results.landmarks.forEach((handLandmarks, i) => {
        const handedness = results.worldLandmarks[i]?.[0]?.x;
        // MediaPipe 任务里，尚未直接给 hand 的 Left/Right 标识；可以自己判断 x 坐标或 index
        // 这里只是示例：假设 x 坐标小的为左手，大的为右手
        // *** 如果你想更准确分左右手，需要更复杂的判定或更先进的分类模型 ***

        const avgX =
          handLandmarks.reduce((sum, pt) => sum + pt.x, 0) /
          handLandmarks.length;
        const pinchParam = this._computePinchParam(handLandmarks);

        if (avgX < 0.5) {
          // 视为左手
          leftHandParam = pinchParam;
        } else {
          // 视为右手
          rightHandParam = pinchParam;
        }
      });
    }

    // 记录原始值
    this.paramLeftRaw = leftHandParam;
    this.paramRightRaw = rightHandParam;

    // 平滑滤波
    this.paramLeftSmooth = this._smooth(this.paramLeftSmooth, leftHandParam);
    this.paramRightSmooth = this._smooth(this.paramRightSmooth, rightHandParam);

    // 检测 Pinch / Palm 状态
    this._detectStates();
  }

  _computePinchParam(hand) {
    // 计算“拇指-食指”的距离 => param(0~1)
    // 距离越近 => param越大(1表示完全捏合)
    if (!hand || hand.length < 9) return 0;

    const thumbTip = hand[4];
    const indexTip = hand[8];

    const dx = thumbTip.x - indexTip.x;
    const dy = thumbTip.y - indexTip.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    const maxDist = 0.3; // 距离大于0.3基本算张开手
    let param = 1 - dist / maxDist;
    param = Math.max(0, Math.min(1, param));
    return param;
  }

  _smooth(prevValue, newValue) {
    // 简单指数平滑
    const alpha = this.smoothingFactor;
    return prevValue * (1 - alpha) + newValue * alpha;
  }

  _detectStates() {
    const now = performance.now();

    // --- Left Hand Pinch ---
    const leftIsPinch = this.paramLeftSmooth > this.pinchThreshold;
    if (leftIsPinch) {
      if (!this.isLeftPinching) {
        this.isLeftPinching = true;
        this.leftPinchStartTime = now;
      } else {
        // 如果持续超过1秒，则触发 snapshot
        if (now - this.leftPinchStartTime > 1000) {
          if (this.onSnapshot) {
            this.onSnapshot('Left');
          }
          // 为防止短时间重复触发，把 startTime 设置的极大
          this.leftPinchStartTime = now + 999999;
        }
      }
    } else {
      this.isLeftPinching = false;
    }

    // --- Right Hand Pinch ---
    const rightIsPinch = this.paramRightSmooth > this.pinchThreshold;
    if (rightIsPinch) {
      if (!this.isRightPinching) {
        this.isRightPinching = true;
        this.rightPinchStartTime = now;
      } else {
        // 如果持续超过1秒，则触发 snapshot
        if (now - this.rightPinchStartTime > 1000) {
          if (this.onSnapshot) {
            this.onSnapshot('Right');
          }
          this.rightPinchStartTime = now + 999999;
        }
      }
    } else {
      this.isRightPinching = false;
    }

    // --- Left Hand Palm Open ---
    const leftPalmOpen = this._isPalmOpen(this.paramLeftSmooth);
    if (leftPalmOpen) {
      if (!this.isLeftPalmOpen) {
        this.isLeftPalmOpen = true;
        this.leftPalmOpenStartTime = now;
      } else {
        if (now - this.leftPalmOpenStartTime > 2000) {
          if (this.onEndSession) {
            this.onEndSession('Left');
          }
          this.leftPalmOpenStartTime = now + 999999;
        }
      }
    } else {
      this.isLeftPalmOpen = false;
    }

    // --- Right Hand Palm Open ---
    const rightPalmOpen = this._isPalmOpen(this.paramRightSmooth);
    if (rightPalmOpen) {
      if (!this.isRightPalmOpen) {
        this.isRightPalmOpen = true;
        this.rightPalmOpenStartTime = now;
      } else {
        if (now - this.rightPalmOpenStartTime > 6000) {
          if (this.onEndSession) {
            this.onEndSession('Right');
          }
          this.rightPalmOpenStartTime = now + 999999;
        }
      }
    } else {
      this.isRightPalmOpen = false;
    }
  }

  _isPalmOpen(param) {
    // 当 param < palmOpenThreshold，说明拇指与食指距离远 => 大概率手掌展开
    // (更准确的PalmOpen检测还需看中指,无名指,小指位置，但这里先简化)
    return param < this.palmOpenThreshold;
  }
}
