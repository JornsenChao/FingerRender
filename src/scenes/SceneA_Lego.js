// src/scenes/SceneA_Lego.js
// 简单的“乐高风格”叠合块场景

import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';

export class SceneA_Lego {
  constructor() {
    this.blocks = [];
  }

  init(scene) {
    // 创建5个Box叠加
    const geometry = new THREE.BoxGeometry(2, 1, 2);
    for (let i = 0; i < 5; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x4caf50 });
      mat.color.setHSL(0.3 + i * 0.1, 1, 0.5);

      const mesh = new THREE.Mesh(geometry, mat);
      mesh.position.set(0, i * 1.1, 0);
      scene.add(mesh);
      this.blocks.push(mesh);
    }
  }

  update({ paramLeft, paramRight }) {
    // paramLeft, paramRight in [0,1]
    // 让方块做一些旋转 + 偏移
    const maxAngle = Math.PI * 2;
    const angleLeft = paramLeft * maxAngle;
    const angleRight = paramRight * maxAngle;

    this.blocks.forEach((block, i) => {
      block.rotation.y = angleLeft + i * 0.2 * angleRight;
      // 也让某些方块上下浮动一点
      block.position.x = Math.sin(angleRight + i) * 0.5;
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
