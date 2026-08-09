import React, { useEffect, useRef, useMemo } from 'react';

interface BiometricHudOverlayProps {
  detections: any; // faceapi.WithFaceLandmarks<faceapi.WithFaceDetection<{}>>
  displaySize: { width: number; height: number };
  status?: string;
  isGathering?: boolean;
}

export const BiometricHudOverlay: React.FC<BiometricHudOverlayProps> = React.memo(({
  detections,
  displaySize,
  status = 'READY',
  isGathering = false
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Heuristic Pose Estimation
  const pose = useMemo(() => {
    if (!detections || !detections.landmarks) return null;

    const pts = detections.landmarks.positions;
    
    // Yaw (Left/Right)
    const jawLeft = pts[0];
    const jawRight = pts[16];
    const noseBridge = pts[27];
    const dLeft = Math.sqrt(Math.pow(noseBridge.x - jawLeft.x, 2) + Math.pow(noseBridge.y - jawLeft.y, 2));
    const dRight = Math.sqrt(Math.pow(jawRight.x - noseBridge.x, 2) + Math.pow(jawRight.y - noseBridge.y, 2));
    const yaw = dLeft / dRight; // 1.0 is center

    // Pitch (Up/Down)
    const noseTip = pts[33];
    const chin = pts[8];
    const eyeCenter = pts[27];
    const dTop = Math.sqrt(Math.pow(noseTip.y - eyeCenter.y, 2));
    const dBottom = Math.sqrt(Math.pow(chin.y - noseTip.y, 2));
    const pitch = dTop / dBottom;

    // Roll (Tilt)
    const leftEye = pts[36];
    const rightEye = pts[45];
    const roll = Math.atan2(rightEye.y - leftEye.y, rightEye.x - leftEye.x) * (180 / Math.PI);

    // Distance (Eye separation)
    const eyeDist = Math.sqrt(Math.pow(rightEye.x - leftEye.x, 2) + Math.pow(rightEye.y - leftEye.y, 2));
    const distanceScore = eyeDist / displaySize.width;

    // Face detection confidence score
    const faceScore = detections?.detection?.score || 0;

    // DYNAMIC WALK-THROUGH AI:
    // Drop rigid angle constraints (yaw/pitch) to allow capture of moving people.
    // Rely exclusively on high AI confidence (>= 0.80) that a face exists.
    const isStable = Math.abs(roll) < 45 && faceScore >= 0.80;
    
    return { yaw, pitch, roll, distanceScore, faceScore, isStable };
  }, [detections, displaySize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!detections) return;

    const box = detections.detection.box;
    const landmarks = detections.landmarks;
    const pts = landmarks.positions;

    // Dynamic Colors
    const isReady = pose?.isStable && !isGathering;
    const primaryColor = isReady ? '#10b981' : '#06b6d4'; // Emerald green vs Cyan
    const secondaryColor = isReady ? 'rgba(16, 185, 129, 0.2)' : 'rgba(6, 182, 212, 0.2)';

    ctx.save();
    
    // 1. Draw Hexagonal Scanner Corners
    const r = 40; // Corner size
    const pad = 20;
    const corners = [
      { x: box.x - pad, y: box.y - pad, rotate: 0 },
      { x: box.x + box.width + pad, y: box.y - pad, rotate: Math.PI / 2 },
      { x: box.x + box.width + pad, y: box.y + box.height + pad, rotate: Math.PI },
      { x: box.x - pad, y: box.y + box.height + pad, rotate: -Math.PI / 2 }
    ];

    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 4;
    ctx.lineCap = 'round';

    corners.forEach(c => {
      ctx.save();
      ctx.translate(c.x, c.y);
      ctx.rotate(c.rotate);
      ctx.beginPath();
      ctx.moveTo(r, 0);
      ctx.lineTo(0, 0);
      ctx.lineTo(0, r);
      ctx.stroke();
      ctx.restore();
    });

    // 2. Draw Digital Pulse Effect (Scanning Beam)
    if (!isReady) {
      const time = Date.now() / 1500;
      const pulseY = box.y + (Math.sin(time * Math.PI) * 0.5 + 0.5) * box.height;
      ctx.beginPath();
      ctx.moveTo(box.x, pulseY);
      ctx.lineTo(box.x + box.width, pulseY);
      ctx.strokeStyle = primaryColor;
      ctx.setLineDash([5, 10]);
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.setLineDash([]);
      
      // Glow under beam
      const gradient = ctx.createLinearGradient(0, pulseY - 20, 0, pulseY + 20);
      gradient.addColorStop(0, 'transparent');
      gradient.addColorStop(0.5, secondaryColor);
      gradient.addColorStop(1, 'transparent');
      ctx.fillStyle = gradient;
      ctx.fillRect(box.x, pulseY - 20, box.width, 40);
    }

    // 3. Draw Face Mesh Connections (Premium Look)
    ctx.lineWidth = 0.5;
    ctx.strokeStyle = isReady ? 'rgba(16, 185, 129, 0.4)' : 'rgba(6, 182, 212, 0.3)';
    
    // Draw Jawline
    ctx.beginPath();
    for (let i = 0; i < 17; i++) ctx[i === 0 ? 'moveTo' : 'lineTo'](pts[i].x, pts[i].y);
    ctx.stroke();

    // Draw Brows
    ctx.beginPath();
    for (let i = 17; i < 22; i++) ctx[i === 17 ? 'moveTo' : 'lineTo'](pts[i].x, pts[i].y);
    ctx.stroke();
    ctx.beginPath();
    for (let i = 22; i < 27; i++) ctx[i === 22 ? 'moveTo' : 'lineTo'](pts[i].x, pts[i].y);
    ctx.stroke();

    // Cross-links (Mesh)
    ctx.beginPath();
    ctx.moveTo(pts[36].x, pts[36].y); ctx.lineTo(pts[17].x, pts[17].y); // Eye to brow
    ctx.moveTo(pts[45].x, pts[45].y); ctx.lineTo(pts[26].x, pts[26].y);
    ctx.moveTo(pts[27].x, pts[27].y); ctx.lineTo(pts[21].x, pts[21].y); // Bridge to brows
    ctx.moveTo(pts[27].x, pts[27].y); ctx.lineTo(pts[22].x, pts[22].y);
    ctx.stroke();

    // 4. Helper for drawing un-mirrored text
    const drawUnmirroredText = (text: string, x: number, y: number, fontSize: number, color: string, bgColor?: string) => {
      ctx.save();
      // Since the canvas is mirrored (-1, 1), we need to translate to the point,
      // then scale back (-1, 1) to make text upright.
      ctx.translate(x, y);
      ctx.scale(-1, 1);
      
      ctx.font = `bold ${fontSize}px "Inter", sans-serif`;
      const textWidth = ctx.measureText(text).width;
      
      if (bgColor) {
        ctx.fillStyle = bgColor;
        ctx.beginPath();
        // Use a nice rounded rect for the background
        const px = 12;
        const py = 6;
        ctx.roundRect(-textWidth/2 - px, -fontSize/2 - py - 2, textWidth + px*2, fontSize + py*2, 8);
        ctx.fill();
      }
      
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = color;
      ctx.fillText(text, 0, 0);
      ctx.restore();
    };

    // 4a. Draw Status Label (Dynamic Scan Edition)
    const statusText = isGathering ? 'MEMPROSES...' : (isReady ? 'MENGUNCI WAJAH (LOCKED)' : 'MELACAK PERGERAKAN...');
    drawUnmirroredText(
      statusText, 
      box.x + box.width/2, 
      box.y - 40, 
      14, 
      isReady ? '#ffffff' : primaryColor,
      isReady ? 'rgba(16, 185, 129, 0.9)' : 'rgba(0,0,0,0.7)'
    );

    // 4b. Guidance Labels (Yaw/Pitch)
    if (!pose?.isStable && !isGathering) {
      let guidance = '';
      if (pose && pose.yaw > 1.4) guidance = 'HADAP KIRI';
      else if (pose && pose.yaw < 0.7) guidance = 'HADAP KANAN';
      else if (pose && pose.distanceScore < 0.15) guidance = 'MAJU SEDIKIT';
      else if (pose && pose.distanceScore > 0.4) guidance = 'MUNDUR SEDIKIT';

      if (guidance) {
        drawUnmirroredText(
          guidance,
          box.x + box.width/2,
          box.y + box.height + 50,
          20,
          '#ffffff',
          'rgba(239, 68, 68, 0.9)' // Red for warning
        );
      }
    }

    ctx.restore();
  }, [detections, pose, isGathering]);

  return (
    <canvas
      ref={canvasRef}
      width={displaySize.width}
      height={displaySize.height}
      className="absolute inset-0 w-full h-full object-cover scale-x-[-1] z-20 pointer-events-none"
    />
  );
});
