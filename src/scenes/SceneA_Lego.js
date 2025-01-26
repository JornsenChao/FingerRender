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
  }

  update({ paramLeft, paramRight }) {
    // 两个参数都在 [0,1]
    // 做一个简易演示：左参数控制整体旋转，右参数控制上下摆动
    const angle = paramLeft * Math.PI * 2;

    this.blocks.forEach((b, i) => {
      b.rotation.y = angle + i * 0.2;
      b.position.x = Math.sin(angle + i * 0.5) * 1.0 * paramRight;
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
