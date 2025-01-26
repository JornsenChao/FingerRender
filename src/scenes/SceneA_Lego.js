// src/scenes/SceneA_Lego.js
// 简单的“乐高风格”叠合块场景

import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';

export class SceneA_Lego {
  constructor() {
    this.blocks = [];
  }

  init(scene) {
    // 创建5个Box叠加
    const geometry = new THREE.BoxGeometry(2, 0.5, 2);
    for (let i = 0; i < 8; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
      mat.color.setHSL(0.3 + i * 0.1, 1, 0.5);

      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(0, i * 1.1, 0);
      scene.add(mesh);
      this.blocks.push(mesh);
    }
  }

  update(paramValue) {
    // paramValue in [0,1] => 旋转
    const maxAngle = Math.PI * 2;
    const angle = paramValue * maxAngle;

    this.blocks.forEach((block, i) => {
      block.rotation.y = angle + i * 0.1 * angle;
    });
  }

  dispose(scene) {
    // 移除自己创建的mesh, geometry, material
    this.blocks.forEach((block) => {
      scene.remove(block);
      block.geometry.dispose();
      block.material.dispose();
    });
    this.blocks = [];
  }
}
