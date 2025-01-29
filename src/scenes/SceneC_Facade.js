// src/scenes/SceneC_Facade.js
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';

/**
 * 场景C - 建筑幕墙立面示例
 *
 * - 以Nx*Ny的网格生成面板，每个面板由：
 *   1) 框架(四周边框)
 *   2) 玻璃
 *   3) 遮阳fin (竖直或水平)
 */
export class SceneC_Facade {
  constructor() {
    this.panelGroups = [];
    this.Nx = 5; // 列数
    this.Ny = 3; // 行数
    this.panelWidth = 4;
    this.panelHeight = 3;

    this.frameMaterial = null;
    this.glassMaterial = null;
    this.finMaterial = null;
  }

  init(scene) {
    // 场景整体用一个Group包裹，方便后续整体移动或旋转
    this.facadeGroup = new THREE.Group();
    scene.add(this.facadeGroup);

    // 1) 初始化材质
    this._initMaterials();

    // 2) 创建 Nx*Ny 个面板
    for (let y = 0; y < this.Ny; y++) {
      for (let x = 0; x < this.Nx; x++) {
        const panel = this._createOnePanel();
        // 布置在 (x, y) 格子位置
        panel.position.set(
          (x - (this.Nx - 1) / 2) * this.panelWidth,
          (this.Ny - 1 - y - (this.Ny - 1) / 2) * this.panelHeight,
          0
        );
        this.facadeGroup.add(panel);
        this.panelGroups.push(panel);
      }
    }

    // 3) 可选：让整个facade倾斜/缩小一点，方便观察
    this.facadeGroup.rotation.x = -0.1;
    this.facadeGroup.position.y = 0; // 调整离地高度
    console.log('SceneC init...');
  }

  _initMaterials() {
    // 框架材质
    this.frameMaterial = new THREE.MeshStandardMaterial({
      color: 0x333333,
      metalness: 0.2,
      roughness: 0.6,
    });
    // 玻璃材质（半透明）
    this.glassMaterial = new THREE.MeshStandardMaterial({
      color: 0x87ceeb,
      transparent: true,
      opacity: 0.6,
      metalness: 0.0,
      roughness: 0.1,
    });
    // 遮阳fin材质
    this.finMaterial = new THREE.MeshStandardMaterial({
      color: 0x999999,
      metalness: 0.3,
      roughness: 0.4,
    });
  }

  _createOnePanel() {
    const panelGroup = new THREE.Group();

    // === (1) frame ===
    const frameGroup = new THREE.Group();
    const frameThickness = 0.15;
    const frameDepth = 0.3;
    const w = this.panelWidth;
    const h = this.panelHeight;

    // top
    const topBarGeo = new THREE.BoxGeometry(w, frameThickness, frameDepth);
    const topBar = new THREE.Mesh(topBarGeo, this.frameMaterial);
    topBar.position.set(0, h / 2 - frameThickness / 2, 0);
    frameGroup.add(topBar);

    // bottom
    const botBar = topBar.clone();
    botBar.position.set(0, -h / 2 + frameThickness / 2, 0);
    frameGroup.add(botBar);

    // left
    const leftBarGeo = new THREE.BoxGeometry(
      frameThickness,
      h - frameThickness * 2,
      frameDepth
    );
    const leftBar = new THREE.Mesh(leftBarGeo, this.frameMaterial);
    leftBar.position.set(-w / 2 + frameThickness / 2, 0, 0);
    frameGroup.add(leftBar);

    // right
    const rightBar = leftBar.clone();
    rightBar.position.set(w / 2 - frameThickness / 2, 0, 0);
    frameGroup.add(rightBar);

    panelGroup.add(frameGroup);

    // === (2) glass ===
    const glassW = w - frameThickness * 2;
    const glassH = h - frameThickness * 2;
    const glassDepth = 0.02;
    const glassGeo = new THREE.BoxGeometry(glassW, glassH, glassDepth);
    const glass = new THREE.Mesh(glassGeo, this.glassMaterial);
    glass.position.z = -0.01; // 略微往内
    panelGroup.add(glass);

    // === (3) fin (竖直百叶) ===
    const finGeo = new THREE.BoxGeometry(frameThickness, h, 0.8);
    const finMesh = new THREE.Mesh(finGeo, this.finMaterial);
    finMesh.position.set(w / 4, 0, 0.2);
    panelGroup.add(finMesh);

    // 存储引用，后续更新
    panelGroup.userData = {
      frameGroup,
      glass,
      finMesh,
    };

    return panelGroup;
  }

  update({ paramLeft, paramRight }) {
    // 在参数化建筑中，可将 paramLeft, paramRight 映射到:
    // 1) fin的旋转角度 (0 ~ 90度)
    // 2) glass的透明度/颜色深浅 (0.2 ~ 0.9)
    // 当然你也可以映射到 frameDepth, 窗口开口大小等

    const finAngleDeg = paramLeft * 90;
    const finAngleRad = THREE.MathUtils.degToRad(finAngleDeg);

    const glassOpacity = 0.2 + 0.8 * paramRight;

    this.panelGroups.forEach((panel) => {
      const ud = panel.userData;
      if (!ud) return;

      // fin 旋转 (绕Y轴)
      ud.finMesh.rotation.y = finAngleRad;

      // glass 透明度
      ud.glass.material.opacity = glassOpacity;
    });
  }

  dispose(scene) {
    if (this.facadeGroup) {
      scene.remove(this.facadeGroup);
      this.panelGroups.forEach((grp) => {
        grp.children.forEach((obj) => {
          if (obj.geometry) obj.geometry.dispose();
          if (obj.material) obj.material.dispose();
        });
      });
      this.panelGroups = [];
      this.facadeGroup = null;
    }
  }
}
