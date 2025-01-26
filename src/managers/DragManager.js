// src/managers/DragManager.js
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';

export class DragManager {
  constructor(domElement, camera, scene) {
    this.domElement = domElement;
    this.camera = camera;
    this.scene = scene;

    this.raycaster = new THREE.Raycaster();
    this.mouse = new THREE.Vector2();

    this.draggingObject = null;
    this.isEnabled = false;

    // 事件绑定
    this._onMouseDown = this._onMouseDown.bind(this);
    this._onMouseMove = this._onMouseMove.bind(this);
    this._onMouseUp = this._onMouseUp.bind(this);
  }

  enable() {
    if (this.isEnabled) return;
    this.isEnabled = true;
    this.domElement.addEventListener('mousedown', this._onMouseDown);
    this.domElement.addEventListener('mousemove', this._onMouseMove);
    this.domElement.addEventListener('mouseup', this._onMouseUp);
  }

  disable() {
    this.isEnabled = false;
    this.domElement.removeEventListener('mousedown', this._onMouseDown);
    this.domElement.removeEventListener('mousemove', this._onMouseMove);
    this.domElement.removeEventListener('mouseup', this._onMouseUp);
    this.draggingObject = null;
  }

  _onMouseDown(e) {
    e.preventDefault();
    this.mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
    this.mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

    this.raycaster.setFromCamera(this.mouse, this.camera);
    const intersects = this.raycaster.intersectObjects(
      this.scene.children,
      true
    );
    if (intersects.length > 0) {
      this.draggingObject = intersects[0].object; // pick the first hit
    }
  }

  _onMouseMove(e) {
    if (!this.draggingObject) return;

    // 简单逻辑：将鼠标移动量转化为 3D 对象的 x, y 偏移
    const deltaX = e.movementX * 0.01;
    const deltaY = e.movementY * 0.01;

    // 让物体在 XZ 平面移动
    // （也可在 XY 平面或别的逻辑）
    this.draggingObject.position.x += deltaX;
    this.draggingObject.position.z += -deltaY; // 鼠标往上移 => z 减少
  }

  _onMouseUp(e) {
    this.draggingObject = null;
  }
}
