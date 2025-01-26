// src/managers/SnapshotManager.js
// 管理 Snapshot 存储并更新 UI

export class SnapshotManager {
  constructor(containerElem) {
    this.containerElem = containerElem;
    this.snapshots = [];
  }

  addSnapshot(snapData) {
    // snapData: { time, param: {left, right}, sceneId, image(base64), triggeredBy }
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
        <div>Scene: ${snap.sceneId}, Param: L=${snap.param.left}, R=${
        snap.param.right
      }</div>
        <div>Triggered by: ${snap.triggeredBy}</div>
        <img src="${snap.image}" width="120" />
      `;
      this.containerElem.appendChild(div);
    });
  }
}
