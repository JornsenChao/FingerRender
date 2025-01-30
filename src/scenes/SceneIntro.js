// src/scenes/SceneIntro.js
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';

export class SceneIntro {
  constructor() {
    this.meshes = [];
    this.group = null;
  }

  init(scene) {
    this.group = new THREE.Group();
    scene.add(this.group);

    // 创建一个随机几何或简单Cube
    // 例如随机生成一些立方体
    for (let i = 0; i < 5; i++) {
      const geo = new THREE.BoxGeometry(
        1 + Math.random() * 1,
        1 + Math.random() * 1,
        1 + Math.random() * 1
      );
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(Math.random(), Math.random(), Math.random()),
      });
      const box = new THREE.Mesh(geo, mat);
      box.position.set(
        (Math.random() - 0.5) * 5,
        i * 1.5,
        (Math.random() - 0.5) * 5
      );
      this.group.add(box);
      this.meshes.push(box);
    }

    console.log('SceneIntro init done.');
  }

  update({ paramLeft, paramRight }) {
    // 让整个 group 旋转
    if (this.group) {
      this.group.rotation.y += 0.01;
    }
  }

  dispose(scene) {
    if (this.group) {
      scene.remove(this.group);
      this.meshes.forEach((m) => {
        m.geometry.dispose();
        m.material.dispose();
      });
      this.meshes = [];
      this.group = null;
    }
  }
}
