// SceneManager.js
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';
import { OrbitControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js?module';

export class SceneManager {
  constructor(container) {
    this.container = container;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.blocks = []; // 存储“分段叠合”乐高块Mesh
    this.currentRotation = 0; // 用来演示手势映射，如旋转角度

    this._initThree();
    this._createLegoBlocks();
  }

  _initThree() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 相机
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 5, 20);

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.container.appendChild(this.renderer.domElement);

    // 轨道控制器
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // 主光源
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 10, 10);
    this.scene.add(dirLight);

    // 监听窗口变化
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  // 创建一个“分段叠合”示例（5个乐高块）
  _createLegoBlocks() {
    const geometry = new THREE.BoxGeometry(2, 1, 2);
    const material = new THREE.MeshStandardMaterial({ color: 0x4caf50 });

    for (let i = 0; i < 5; i++) {
      const mesh = new THREE.Mesh(geometry, material.clone());
      mesh.position.set(0, i * 1.1, 0); // 叠加在Y方向
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      // 为了视觉区分，每一段稍微变一下颜色
      mesh.material.color.setHSL(0.3 + i * 0.1, 1, 0.5);
      this.scene.add(mesh);
      this.blocks.push(mesh);
    }
  }

  // 将“rotationParam”映射到乐高块的旋转或偏移
  updateBlocks(rotationParam) {
    // rotationParam 假设在 [0, 1] 范围，用来控制角度
    const maxAngle = Math.PI * 2; // 最多可旋转一整圈
    const angle = rotationParam * maxAngle;

    this.blocks.forEach((block, i) => {
      // 让每个块相对于底部块有一点叠加旋转
      block.rotation.y = angle + i * 0.3 * angle;
      // 也可以做平移或缩放:
      // block.position.x = Math.sin(angle + i) * 2;
    });
  }

  // 每帧调用
  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
