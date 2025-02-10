// src/scenes/SceneD_KKAHongkouSOHO.js
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';

/**
 * 场景D - KKA_hongkouSOHO
 *
 * 模拟一个圆角矩形竖直挤出的主楼，并在周边布置竖直装饰片(fins)。
 * 支持参数:
 *  - towerHeight:  [0..1] -> 映射到 50..120 (米/单位)
 *  - towerTaper:   [0..1] -> 顶部与底部的相对尺度 (模拟底部外扩/顶部收分)
 *  - finAngle:     [0..1] -> 0..45度
 *  - finCount:     [0..1] -> 8..64
 */
export class SceneD_KKAHongkouSOHO {
  constructor() {
    // 存储楼体和fins等
    this.towerMesh = null;
    this.finGroup = null;

    // 一些默认参数
    this.baseRadius = 1.0; // 圆角矩形的圆角半径
    this.baseWidth = 10; // 短边
    this.baseLength = 16; // 长边
    this.segments = 32; // 圆角分段
  }

  init(scene) {
    // 整个场景组
    this.rootGroup = new THREE.Group();
    scene.add(this.rootGroup);

    // 1) 创建主楼体
    // 做一个“圆角矩形” -> extrude geometry
    const shape = this._createRoundedRectShape(
      this.baseWidth / 2,
      this.baseLength / 2,
      this.baseRadius,
      this.segments
    );
    // 先给个默认extrudeHeight=80
    const extrudeSettings = {
      depth: 80, // 后面再用参数调
      bevelEnabled: false,
    };
    const extrudeGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const towerMat = new THREE.MeshStandardMaterial({ color: 0xcccccc });
    this.towerMesh = new THREE.Mesh(extrudeGeo, towerMat);
    // 让z方向当作竖直(以便更好控制) => 也可改 y 方向
    this.towerMesh.rotation.x = -Math.PI / 2;
    this.rootGroup.add(this.towerMesh);

    // 2) 创建装饰片 finGroup
    this.finGroup = new THREE.Group();
    this.rootGroup.add(this.finGroup);

    // 先布置一些 fin(默认 16个)
    this._createFins(16);

    // 稍微抬高一点，便于观察
    this.rootGroup.position.set(0, 0, 0);

    console.log('SceneD_KKAHongkouSOHO init done.');
  }

  // 圆角矩形
  _createRoundedRectShape(hw, hh, r, seg) {
    // hw=半宽, hh=半长
    const shape = new THREE.Shape();
    shape.moveTo(-hw + r, -hh);
    shape.lineTo(hw - r, -hh);
    shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
    shape.lineTo(hw, hh - r);
    shape.quadraticCurveTo(hw, hh, hw - r, hh);
    shape.lineTo(-hw + r, hh);
    shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
    shape.lineTo(-hw, -hh + r);
    shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);

    return shape;
  }

  _createFins(count) {
    // 先清空已有
    while (this.finGroup.children.length) {
      const child = this.finGroup.children.pop();
      if (child.geometry) child.geometry.dispose();
      if (child.material) child.material.dispose();
    }

    // 沿圆角矩形周边放置 fin
    // 简单起见，均匀取count个点(等角度)
    // 也可根据实际周长分布
    const mat = new THREE.MeshStandardMaterial({ color: 0x999999 });

    for (let i = 0; i < count; i++) {
      // fin本身的几何: 一个细长矩形(或三角形/多边形)
      const finGeo = new THREE.BoxGeometry(0.3, 10, 1);
      const finMesh = new THREE.Mesh(finGeo, mat);

      // 默认将fin中点对齐(把它放到底部Extrude体上)
      finMesh.position.set(0, 0, 0);
      // 暂存
      this.finGroup.add(finMesh);
    }
  }

  update({ paramLeft, paramRight, leftParamName, rightParamName }) {
    // 将 0..1 转成场景所需的实际数值
    const towerH = this._getParamValue(
      'towerHeight',
      paramLeft,
      paramRight,
      leftParamName,
      rightParamName
    );
    const towerTaperVal = this._getParamValue(
      'towerTaper',
      paramLeft,
      paramRight,
      leftParamName,
      rightParamName
    );
    const finAngleVal = this._getParamValue(
      'finAngle',
      paramLeft,
      paramRight,
      leftParamName,
      rightParamName
    );
    const finCountVal = this._getParamValue(
      'finCount',
      paramLeft,
      paramRight,
      leftParamName,
      rightParamName
    );

    // 1) 更新楼体高度 + taper
    this._updateTowerMesh(towerH, towerTaperVal);

    // 2) 更新fin数量(如果有变化，可做个整型处理)
    const finCount = Math.floor(8 + finCountVal * 56); // [8..64]
    this._updateFinCount(finCount);

    // 3) 更新fin角度
    this._updateFinAngle(finAngleVal);
  }

  _updateTowerMesh(heightParam, taperParam) {
    if (!this.towerMesh) return;

    // 设定 extrudeHeight 在 [50..120]
    const newHeight = 50 + heightParam * 70;

    // taper: 0 => top=1.0, 1 => top=0.7 (示例:顶部更收)
    const topScale = 1 - 0.3 * taperParam;

    // 我们需要重建geometry或用scale Y?
    // 若想更逼真地“顶部收分”，可做 param extrusion with shape keys
    // 这里简单演示：整体extrude + 顶部做scale
    // => approach: 先 extrude => 通过 scale + pivot 让顶部收分
    // 但THREE默认 extrude一次。我们这里就用 scale + pivot hack:

    // (A) 重新生成 extrude geometry:
    // 这里为了简单，把 extrude 的 geometry 重新创建:
    const shape = this._createRoundedRectShape(
      this.baseWidth / 2,
      this.baseLength / 2,
      this.baseRadius,
      this.segments
    );
    const extrudeSettings = {
      depth: newHeight,
      bevelEnabled: false,
    };
    const newGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);

    // (B) 顶部收分
    // 我们可以自己遍历 geometry顶层顶点坐标, 乘以 topScale.
    // 省事起见，这里做一个简化：只要Z越大(顶面)的点 => x,y乘 topScale
    const posAttr = newGeo.attributes.position;
    for (let i = 0; i < posAttr.count; i++) {
      const zVal = posAttr.getZ(i);
      // z=0 =>底, z=newHeight=>顶
      const ratio = zVal / newHeight; // 0~1
      const scaleFactor = 1 - (1 - topScale) * ratio;
      // 底部ratio=0 => scale=1, 顶部ratio=1 => scale=topScale

      const x0 = posAttr.getX(i);
      const y0 = posAttr.getY(i);
      posAttr.setXY(i, x0 * scaleFactor, y0 * scaleFactor);
    }
    posAttr.needsUpdate = true;
    newGeo.computeVertexNormals();

    // 替换
    this.towerMesh.geometry.dispose();
    this.towerMesh.geometry = newGeo;
  }

  _updateFinCount(count) {
    // 若现有fin数量与count不一致，则重建
    const currentCount = this.finGroup.children.length;
    if (currentCount !== count) {
      this._createFins(count);
    }
  }

  _updateFinAngle(finVal) {
    // finVal [0..1] => 0..45度
    const angleDeg = finVal * 45;
    const angleRad = THREE.MathUtils.degToRad(angleDeg);

    // 将fins均匀分布在楼体外周，并倾斜
    const count = this.finGroup.children.length;
    if (count === 0) return;

    // approximate perimeter
    const perimeter = (this.baseWidth + this.baseLength) * 2;
    for (let i = 0; i < count; i++) {
      const fin = this.finGroup.children[i];
      // 周向分布
      const t = i / count; // [0..1)
      const theta = t * Math.PI * 2;
      // 这里只是简化做个近似“圆形”分布
      const radius = Math.max(this.baseWidth, this.baseLength) * 0.6;

      // x,z分布(把z当成水平, x当成水平, y当竖直)
      // 也可结合实际圆角矩形周长精细分布
      const px = Math.cos(theta) * radius;
      const pz = Math.sin(theta) * radius;

      fin.position.set(px, 0, pz);

      // fin高度可与towerMesh相同, 先简单固定
      fin.scale.y = 8; // 让它稍微短一点

      // 倾斜
      // Y轴朝上 => 让fin朝向外部 => fin看向( px, 0, pz )方向
      fin.lookAt(0, 0, 0);
      // 额外加一个 angleRad 绕自身的roll
      fin.rotation.z += angleRad;
    }
  }

  /**
   * 识别指定参数名是否为左或右，并返回 paramValue(0~1)
   */
  _getParamValue(targetName, pL, pR, nameL, nameR) {
    let val = 0;
    if (nameL === targetName) {
      val += pL;
    }
    if (nameR === targetName) {
      val += pR;
    }
    // 简单相加(若左右手都选同一参数, 就可能高于1). 可再做clamp
    return Math.min(val, 1);
  }

  dispose(scene) {
    if (this.rootGroup) {
      scene.remove(this.rootGroup);
      // 回收资源
      if (this.towerMesh) {
        this.towerMesh.geometry.dispose();
        this.towerMesh.material.dispose();
        this.towerMesh = null;
      }
      if (this.finGroup) {
        this.finGroup.children.forEach((child) => {
          child.geometry.dispose();
          child.material.dispose();
        });
        this.finGroup = null;
      }
      this.rootGroup = null;
    }
  }
}
