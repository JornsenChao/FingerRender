// src/managers/HandVisualizer.js
export class HandVisualizer {
  constructor(videoElement, canvasElement) {
    this.video = videoElement;
    this.canvas = canvasElement;
    this.ctx = this.canvas.getContext('2d');
  }

  drawResults(allHandsLandmarks) {
    this.canvas.width = this.video.videoWidth;
    this.canvas.height = this.video.videoHeight;

    this.ctx.save();
    // 先把video帧画上
    this.ctx.drawImage(this.video, 0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();

    const CONN = [
      [0, 1],
      [1, 2],
      [2, 3],
      [3, 4], // thumb
      [0, 5],
      [5, 6],
      [6, 7],
      [7, 8], // index
      [5, 9],
      [9, 10],
      [10, 11],
      [11, 12],
      [9, 13],
      [13, 14],
      [14, 15],
      [15, 16],
      [13, 17],
      [17, 18],
      [18, 19],
      [19, 20],
      [0, 17],
    ];

    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = 'lime';
    this.ctx.fillStyle = 'red';

    allHandsLandmarks.forEach((hand) => {
      const pxPoints = hand.map((pt) => ({
        x: pt.x * this.canvas.width,
        y: pt.y * this.canvas.height,
      }));

      // connections
      CONN.forEach(([s, e]) => {
        const p1 = pxPoints[s],
          p2 = pxPoints[e];
        this.ctx.beginPath();
        this.ctx.moveTo(p1.x, p1.y);
        this.ctx.lineTo(p2.x, p2.y);
        this.ctx.stroke();
      });

      // keypoints
      pxPoints.forEach((p) => {
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, 4, 0, 2 * Math.PI);
        this.ctx.fill();
      });
    });
  }
}
