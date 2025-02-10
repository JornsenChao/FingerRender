// src/scenes/SceneB_Columns.js
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';

export class SceneB_Columns {
  constructor() {
    this.columns = [];
    this.roof = null;
  }

  init(scene) {
    const colGeo = new THREE.CylinderGeometry(0.2, 0.2, 3, 16);
    for (let i = 0; i < 4; i++) {
      const mat = new THREE.MeshStandardMaterial({ color: 0x607d8b });
      const col = new THREE.Mesh(colGeo, mat);
      col.position.set(i * 2 - 3, 1.5, 0);
      scene.add(col);
      this.columns.push(col);
    }

    const roofGeo = new THREE.BoxGeometry(8, 0.2, 2);
    const roofMat = new THREE.MeshStandardMaterial({ color: 0xffc107 });
    this.roof = new THREE.Mesh(roofGeo, roofMat);
    this.roof.position.set(0, 3, 0);
    scene.add(this.roof);

    console.log('SceneB init...');
  }

  update({ paramLeft, paramRight, leftParamName, rightParamName }) {
    // 分别解析
    const valL = this._interpretParam(leftParamName, paramLeft);
    const valR = this._interpretParam(rightParamName, paramRight);

    // 应用到柱子和屋顶
    // 如果 leftParamName或 rightParamName === 'tilt'，就让柱子倾斜
    // 如果 === 'roofHeight'，抬高屋顶
    // 如果 === 'fooParam'，随便做点事(比如改变柱子颜色)
    if (this.columns) {
      // 先假设 tilt 只看valL + valR(可叠加)
      const totalTilt =
        valL * (leftParamName === 'tilt' ? 1 : 0) +
        valR * (rightParamName === 'tilt' ? 1 : 0);
      this.columns.forEach((col, i) => {
        const sign = i % 2 === 0 ? 1 : -1;
        col.rotation.z = sign * totalTilt;
      });

      // fooParam: 简单改颜色
      if (leftParamName === 'fooParam' && valL > 0.5) {
        this.columns.forEach((col) => {
          col.material.color.setHex(0xff6666); // 偏红
        });
      } else if (rightParamName === 'fooParam' && valR > 0.5) {
        this.columns.forEach((col) => {
          col.material.color.setHex(0x6666ff); // 偏蓝
        });
      } else {
        // 恢复默认
        this.columns.forEach((col) => {
          col.material.color.setHex(0x607d8b);
        });
      }
    }

    // 屋顶
    if (this.roof) {
      // 如果 leftParamName='roofHeight'，valL影响屋顶高度
      // 如果 rightParamName='roofHeight'，valR也影响 (可叠加或二选一)
      const roofH =
        3 +
        (leftParamName === 'roofHeight' ? valL : 0) * 2 +
        (rightParamName === 'roofHeight' ? valR : 0) * 2;
      this.roof.position.y = roofH;
    }
  }

  _interpretParam(paramName, rawValue) {
    switch (paramName) {
      case 'tilt':
        // 0~1 -> 0~0.5 rad
        return rawValue * 0.5;
      case 'roofHeight':
        // 0~1 -> 0~1 => 后面再乘2
        return rawValue;
      case 'fooParam':
        // 0~1 => 用来判断>0.5就改变颜色
        return rawValue;
      default:
        return 0;
    }
  }

  dispose(scene) {
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
