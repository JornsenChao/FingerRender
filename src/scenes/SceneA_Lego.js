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

  update({ paramLeft, paramRight }) {
    // paramLeft ~ rotate
    // paramRight ~ scaleZ
    const angle = paramLeft * Math.PI * 2;

    // 我们把 scaleZ 范围设定：在 [1, 2] 之间(或随你喜欢)
    const zScale = 1 + paramRight;

    this.blocks.forEach((b, i) => {
      // 旋转
      b.rotation.y = angle + i * 0.2;

      // Z 方向缩放
      b.scale.z = zScale;
    });
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
