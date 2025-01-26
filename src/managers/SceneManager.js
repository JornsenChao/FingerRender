// src/managers/SceneManager.js
// 管理Three.js主场景、光源、相机、渲染，允许加载/切换不同的“子场景”模块

import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';
import { OrbitControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js?module';

// 引入具体场景模块
import { SceneA_Lego } from '../scenes/SceneA_Lego.js';
import { SceneB_Columns } from '../scenes/SceneB_Columns.js';

export class SceneManager {
  constructor(domContainer) {
    this.domContainer = domContainer;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    // 当前加载的场景对象 (sceneA, sceneB, etc.)
    this.currentScene = null;
    this.currentSceneID = null;

    this._initThree();
    // 默认加载 Scene A
    this.loadScene('sceneA');
  }

  _initThree() {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // 相机
    this.camera = new THREE.PerspectiveCamera(60, width / height, 0.1, 1000);
    this.camera.position.set(0, 5, 20);

    // 渲染器
    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.domContainer.appendChild(this.renderer.domElement);

    // OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.1;

    // 环境光
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    // 方向光
    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 10, 10);
    this.scene.add(dirLight);

    // 监听窗口大小变化
    window.addEventListener('resize', () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    });
  }

  // 切换场景
  loadScene(sceneID) {
    // 卸载旧场景
    if (this.currentScene && this.currentScene.dispose) {
      this.currentScene.dispose(this.scene);
    }

    // 清空 scene 中之前的对象 (不包括灯光和相机)
    // 只移除 mesh / geometry / material
    this._clearScene();

    // 加载新的场景
    if (sceneID === 'sceneA') {
      this.currentScene = new SceneA_Lego();
    } else if (sceneID === 'sceneB') {
      this.currentScene = new SceneB_Columns();
    } else {
      console.warn('Unknown sceneID:', sceneID);
      return;
    }

    this.currentSceneID = sceneID;
    // 初始化场景的物体
    this.currentScene.init(this.scene);
  }

  _clearScene() {
    // 保留灯光(前两项), 清理其他Mesh
    const keepLights = [];
    this.scene.children.forEach((obj) => {
      if (obj.isLight || obj.isCamera) {
        keepLights.push(obj);
      } else {
        this.scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
    });
  }

  // 每帧更新
  update(paramValue) {
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(paramValue);
    }
  }

  render() {
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }

  getScreenshotBase64() {
    return this.renderer.domElement.toDataURL('image/png');
  }
}
