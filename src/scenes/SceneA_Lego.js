// src/scenes/SceneA_Lego.js
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';

export class SceneA_Lego {
  constructor() {
    this.blocks = [];
  }

  init(scene) {
    // 创建若干Box
    const geo = new THREE.BoxGeometry(2, 1, 2);
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(0, i * 1.2, 0);
      scene.add(mesh);
      this.blocks.push(mesh);
    }
    console.log('SceneA init...');
  }

  /**
   * @param {Object} data
   * data.paramLeft / data.paramRight  数值(0~1)
   * data.leftParamName / data.rightParamName   字符串(如 "rotate","offset","scaleZ","another")
   */
  update({ paramLeft, paramRight, leftParamName, rightParamName }) {
    // 分别解析左手、右手参数
    const valL = this._interpretParam(leftParamName, paramLeft);
    const valR = this._interpretParam(rightParamName, paramRight);

    // 给每个block做一些示例处理
    this.blocks.forEach((b, i) => {
      // 用 valL控制 block的 旋转/offset/scaleZ/... (依赖 leftParamName)
      // 用 valR控制 block的 旋转/offset/scaleZ/... (依赖 rightParamName)
      // 这里演示：同时把 valL 应用到 rotation, valR 应用到 scaleZ (如果相应名称匹配)
      // 也可以更灵活，只是例子：

      // rotationY 叠加
      if (leftParamName === 'rotate') {
        b.rotation.y = valL + i * 0.2;
      }
      if (rightParamName === 'rotate') {
        b.rotation.y = valR + i * 0.2;
      }

      // offset -> x偏移
      if (leftParamName === 'offset') {
        b.position.x = valL + i * 0.2;
      }
      if (rightParamName === 'offset') {
        b.position.x = valR + i * 0.2;
      }

      // scaleZ
      if (leftParamName === 'scaleZ') {
        b.scale.z = valL;
      }
      if (rightParamName === 'scaleZ') {
        b.scale.z = valR;
      }

      // another -> y位移
      if (leftParamName === 'another') {
        b.position.y = 1.2 * i + valL;
      }
      if (rightParamName === 'another') {
        b.position.y = 1.2 * i + valR;
      }
    });
  }

  _interpretParam(paramName, rawValue) {
    // rawValue 为 0~1
    // 根据不同 paramName 映射到不同范围
    switch (paramName) {
      case 'rotate':
        // 0~1 -> 0~2π
        return rawValue * Math.PI * 2;
      case 'offset':
        // 0~1 -> -2~+2
        return (rawValue - 0.5) * 4;
      case 'scaleZ':
        // 0~1 -> 1~2
        return 1 + rawValue;
      case 'another':
        // 0~1 -> 0~3
        return rawValue * 3;
      default:
        return 0;
    }
  }

  dispose(scene) {
    this.blocks.forEach((b) => {
      scene.remove(b);
      b.geometry.dispose();
      b.material.dispose();
    });
    this.blocks = [];
  }
}
