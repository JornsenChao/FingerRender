// src/scenes/SceneB_Columns.js
// 简单的“柱廊+屋顶”场景

import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';

export class SceneB_Columns {
  constructor() {
    this.columns = [];
    this.roof = null;
  }

  init(scene) {
    const columnGeo = new THREE.CylinderGeometry(0.2, 0.2, 3, 16);

    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x607d8b });
      const col = new THREE.Mesh(columnGeo, mat);
      col.position.set(i * 2 - 3, 1.5, 0);
      scene.add(col);
      this.columns.push(col);
    }

    const roofGeo = new THREE.BoxGeometry(8, 0.2, 2);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xffc107 });
    this.roof = new THREE.Mesh(roofGeo, roofMat);
    this.roof.position.set(0, 3, 0);
    scene.add(this.roof);
  }

  update(paramValue) {
    // paramValue => 让柱子略倾斜, 屋顶抬高
    this.columns.forEach((col, i) => {
      const tilt = (i % 2 === 0 ? 1 : -1) * (paramValue * 0.2);
      col.rotation.z = tilt;
    });
    if (this.roof) {
      this.roof.position.y = 3 + paramValue * 2;
    }
  }

  dispose(scene) {
    // 清理资源
    this.columns.forEach((col) => {
      scene.remove(col);
      col.geometry.dispose();
      col.material.dispose();
    });
    this.columns = [];

    if (this.roof) {
      scene.remove(this.roof);
      this.roof.geometry.dispose();
      this.roof.material.dispose();
      this.roof = null;
    }
  }
}
