// src/managers/SnapshotManager.js
// 管理 Snapshot 存储并更新 UI

export class SnapshotManager {
  constructor(containerElem) {
    this.containerElem = containerElem;
    this.snapshots = [];
  }

  addSnapshot(snapData) {
    // snapData: { time, param, sceneId, image(base64) }
    this.snapshots.push(snapData);
    this._render();
  }

  _render() {
    this.containerElem.innerHTML = '';

    this.snapshots.forEach((snap, i) => {
      const div = document.createElement('div');
      div.className = 'snapshotItem';
      div.innerHTML = `
          <div><strong>Snapshot #${i + 1}</strong> @ ${snap.time}</div>
          <div>Scene: ${snap.sceneId}, Param: ${snap.param.toFixed(2)}</div>
          <img src="${snap.image}" width="120" />
        `;
      this.containerElem.appendChild(div);
    });
  }
}
