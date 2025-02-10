// src/scenes/SceneC_Facade.js
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';

/**
 * 场景C - 建筑幕墙立面示例
 * 支持参数:
 *   - finAngle   : [0..1] -> [0..90度]
 *   - glassTint  : [0..1] -> 透明度[0.2..1]
 *   - frameDepth : [0..1] -> [0.1..0.5]
 *   - panelScale : [0..1] -> [0.5..1.5]
 */
export class SceneC_Facade {
  constructor() {
    this.panelGroups = [];
    this.Nx = 5; // 列数
    this.Ny = 3; // 行数
    this.panelWidth = 4;
    this.panelHeight = 3;

    this.facadeGroup = null;
    this.frameMaterial = null;
    this.glassMaterial = null;
    this.finMaterial = null;
  }

  init(scene) {
    // 场景整体用一个Group包裹
    this.facadeGroup = new THREE.Group();
    scene.add(this.facadeGroup);

    this._initMaterials();

    // 创建 Nx*Ny 个面板
    for (let y = 0; y < this.Ny; y++) {
      for (let x = 0; x < this.Nx; x++) {
        const panel = this._createOnePanel();
        panel.position.set(
          (x - (this.Nx - 1) / 2) * this.panelWidth,
          (this.Ny - 1 - y - (this.Ny - 1) / 2) * this.panelHeight,
          0
        );
        this.facadeGroup.add(panel);
        this.panelGroups.push(panel);
      }
    }

    // 初始微倾斜，便于观察
    this.facadeGroup.rotation.x = -0.1;
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

    const frameThickness = 0.15;
    const frameDepth = 0.3;
    const w = this.panelWidth;
    const h = this.panelHeight;

    // === Frame (上,下,左,右) ===
    const frameGroup = new THREE.Group();
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

    // === Glass ===
    const glassW = w - frameThickness * 2;
    const glassH = h - frameThickness * 2;
    const glassDepth = 0.02;
    const glassGeo = new THREE.BoxGeometry(glassW, glassH, glassDepth);
    const glass = new THREE.Mesh(glassGeo, this.glassMaterial);
    glass.position.z = -0.01; // 略微往内
    panelGroup.add(glass);

    // === Fin (竖直百叶) ===
    const finGeo = new THREE.BoxGeometry(frameThickness, h, 0.8);
    const finMesh = new THREE.Mesh(finGeo, this.finMaterial);
    finMesh.position.set(w / 4, 0, 0.2);
    panelGroup.add(finMesh);

    panelGroup.userData = {
      frameGroup,
      glass,
      finMesh,
      frameThickness,
      frameDepth, // 初始默认 0.3
    };
    return panelGroup;
  }

  /**
   * @param {Object} data
   * data.paramLeft / data.paramRight  数值(0~1)
   * data.leftParamName / data.rightParamName  字符串
   */
  update({ paramLeft, paramRight, leftParamName, rightParamName }) {
    // 先解析出4种可能的参数值
    const finAngleVal = this._getValueByParamName(
      'finAngle',
      paramLeft,
      paramRight,
      leftParamName,
      rightParamName
    );
    const glassVal = this._getValueByParamName(
      'glassTint',
      paramLeft,
      paramRight,
      leftParamName,
      rightParamName
    );
    const frameDepthVal = this._getValueByParamName(
      'frameDepth',
      paramLeft,
      paramRight,
      leftParamName,
      rightParamName
    );
    const scaleVal = this._getValueByParamName(
      'panelScale',
      paramLeft,
      paramRight,
      leftParamName,
      rightParamName
    );

    // 应用到 facade
    // 1) finAngle => [0..90度]
    const angleRad = THREE.MathUtils.degToRad(finAngleVal * 90);

    // 2) glassVal => [0.2..1.0]
    const glassOpacity = 0.2 + glassVal * 0.8;

    // 3) frameDepth => [0.1..0.5]
    const fDepth = 0.1 + frameDepthVal * 0.4;

    // 4) panelScale => [0.5..1.5]
    const sc = 0.5 + scaleVal;

    // 更新每个panel
    this.panelGroups.forEach((panel) => {
      const ud = panel.userData;
      if (!ud) return;

      // fin 旋转 (绕Y轴)
      ud.finMesh.rotation.y = angleRad;

      // glass 透明度
      ud.glass.material.opacity = glassOpacity;

      // 更新 frameDepth
      // 该 panel 的 frameGroup 里每个 Bar 都需要 geometry.width = fDepth (Z 方向)
      // 简化做法：直接改scale.z
      ud.frameGroup.children.forEach((bar) => {
        bar.scale.z = fDepth / 0.3; // 原本是0.3
      });
    });

    // 整体 facadeGroup缩放
    if (this.facadeGroup) {
      this.facadeGroup.scale.set(sc, sc, sc);
    }
  }

  // 根据参数名，判断它是否对应 leftParamName or rightParamName
  // 并返回对应 rawValue(0~1)。若该参数名未被选，则返回0
  _getValueByParamName(targetName, paramLeft, paramRight, leftName, rightName) {
    let val = 0;
    if (leftName === targetName) {
      val += paramLeft;
    }
    if (rightName === targetName) {
      val += paramRight;
    }
    // 如果左手右手都选了同一个参数，则合并(或取平均)也可以；这里示例用累加
    // 你也可以根据需求改成 Math.max(paramLeft, paramRight) / 2 etc.
    return val;
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
