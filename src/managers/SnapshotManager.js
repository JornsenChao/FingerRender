// src/managers/SnapshotManager.js
export class SnapshotManager {
  constructor(containerElem) {
    this.containerElem = containerElem;
    this.snapshots = [];
  }

  addSnapshot(snapData) {
    // snapData = { time, param:{left,right}, sceneId, image, triggeredBy }
    this.snapshots.push(snapData);
    this._render();
  }

  _render() {
    this.containerElem.innerHTML = '';
    this.snapshots.forEach((snap, idx) => {
      const div = document.createElement('div');
      div.className = 'snapshotItem';
      div.innerHTML = `
        <div><strong>#${idx + 1}</strong> @ ${snap.time}</div>
        <div>Scene: ${snap.sceneId}, L=${snap.param.left}, R=${
        snap.param.right
      }</div>
        <div>Triggered by: ${snap.triggeredBy}</div>
        <img src="${snap.image}" width="120" />
      `;
      this.containerElem.appendChild(div);
    });
  }
}
