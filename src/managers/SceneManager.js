// src/managers/SceneManager.js
import * as THREE from 'https://unpkg.com/three@0.152.2/build/three.module.js?module';
import { OrbitControls } from 'https://unpkg.com/three@0.152.2/examples/jsm/controls/OrbitControls.js?module';

// 引入具体场景
import { SceneA_Lego } from '../scenes/SceneA_Lego.js';
import { SceneB_Columns } from '../scenes/SceneB_Columns.js';
import { SceneC_Facade } from '../scenes/SceneC_Facade.js';
import { SceneD_KKAHongkouSOHO } from '../scenes/SceneD_KKAHongkouSOHO.js';

export class SceneManager {
  constructor(domContainer) {
    this.domContainer = domContainer;
    this.scene = new THREE.Scene();
    this.camera = null;
    this.renderer = null;
    this.controls = null;

    this.currentScene = null;
    this.currentSceneID = null;

    this._initThree();
  }

  _initThree() {
    const w = window.innerWidth;
    const h = window.innerHeight;

    this.camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000);
    this.camera.position.set(0, 5, 20);

    this.renderer = new THREE.WebGLRenderer({ antialias: true });
    this.renderer.setSize(w, h);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.domElement.classList.add('webgl');
    this.domContainer.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;

    const ambLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight.position.set(10, 10, 10);
    this.scene.add(dirLight);

    window.addEventListener('resize', () => {
      const nw = window.innerWidth;
      const nh = window.innerHeight;
      this.camera.aspect = nw / nh;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(nw, nh);
    });
  }

  loadScene(sceneID) {
    // 如果有旧场景, 先 dispose
    if (this.currentScene && this.currentScene.dispose) {
      this.currentScene.dispose(this.scene);
    }
    this._clearScene();

    let newScene;
    if (sceneID === 'sceneA') {
      newScene = new SceneA_Lego();
    } else if (sceneID === 'sceneB') {
      newScene = new SceneB_Columns();
    } else if (sceneID === 'sceneC') {
      newScene = new SceneC_Facade();
      console.log('Loading SceneC_Facade...');
    } else if (sceneID === 'sceneD') {
      newScene = new SceneD_KKAHongkouSOHO();
    } else {
      console.warn('Unknown sceneID:', sceneID);
      return;
    }

    this.currentScene = newScene;
    this.currentSceneID = sceneID;
    this.currentScene.init(this.scene); // 调用场景init()
  }

  _clearScene() {
    // 保留灯光和相机
    const toKeep = [];
    this.scene.children.forEach((obj) => {
      if (obj.isLight || obj.isCamera) {
        toKeep.push(obj);
      } else {
        this.scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
      }
    });
  }

  /**
   * @param {Object} paramData - { paramLeft, paramRight, leftParamName, rightParamName }
   */
  update(paramData) {
    if (this.currentScene && this.currentScene.update) {
      this.currentScene.update(paramData);
      // console.log('Scene update', paramData); // 可调试时打开
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
