import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import * as THREE from 'three';

interface ThreeStoneTileProps {
  children: ReactNode;
  className?: string;
}

const ThreeStoneTile = ({ children, className = '' }: ThreeStoneTileProps) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [snapshot, setSnapshot] = useState<string>('');

  useEffect(() => {
    const roundedRectShape = (w: number, h: number, r: number) => {
      const x = -w / 2;
      const y = -h / 2;
      const shape = new THREE.Shape();
      shape.moveTo(x + r, y);
      shape.lineTo(x + w - r, y);
      shape.quadraticCurveTo(x + w, y, x + w, y + r);
      shape.lineTo(x + w, y + h - r);
      shape.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
      shape.lineTo(x + r, y + h);
      shape.quadraticCurveTo(x, y + h, x, y + h - r);
      shape.lineTo(x, y + r);
      shape.quadraticCurveTo(x, y, x + r, y);
      return shape;
    };

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, 420 / 260, 0.1, 100);
    camera.position.z = 5.2;
    const canvas = document.createElement('canvas');
    canvas.width = 420;
    canvas.height = 260;
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: true });
    renderer.setSize(420, 260);
    renderer.setPixelRatio(1);
    renderer.setClearColor(0x000000, 0);

    const cardShape = roundedRectShape(3.9, 2.35, 0.24);
    const geometry = new THREE.ExtrudeGeometry(cardShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSize: 0.06,
      bevelThickness: 0.06,
      bevelSegments: 3,
      steps: 1,
      curveSegments: 10,
    });
    const material = new THREE.MeshStandardMaterial({
      color: '#e7e7e7',
      roughness: 0.88,
      metalness: 0.04,
      emissive: '#f5f5f5',
      emissiveIntensity: 0.08,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    mesh.rotation.x = -0.2;
    mesh.rotation.y = 0.18;
    mesh.position.z = -0.18;

    const insetShape = roundedRectShape(3.2, 1.8, 0.17);
    const innerCutGeo = new THREE.ExtrudeGeometry(insetShape, {
      depth: 0.03,
      bevelEnabled: true,
      bevelSize: 0.015,
      bevelThickness: 0.015,
      bevelSegments: 2,
      steps: 1,
      curveSegments: 8,
    });
    const innerCutMat = new THREE.MeshStandardMaterial({
      color: '#d9d9d9',
      roughness: 0.95,
      metalness: 0.01,
    });
    const innerCut = new THREE.Mesh(innerCutGeo, innerCutMat);
    innerCut.position.z = 0.06;
    innerCut.rotation.x = -0.2;
    innerCut.rotation.y = 0.18;
    scene.add(innerCut);

    const ambient = new THREE.AmbientLight('#ffffff', 1.5);
    scene.add(ambient);

    const key = new THREE.DirectionalLight('#ffffff', 1.25);
    key.position.set(3.2, 4.5, 4.5);
    scene.add(key);

    const fill = new THREE.DirectionalLight('#94a3b8', 0.45);
    fill.position.set(-4.5, -2.5, 3.2);
    scene.add(fill);

    renderer.render(scene, camera);
    setSnapshot(canvas.toDataURL('image/png'));

    return () => {
      geometry.dispose();
      material.dispose();
      innerCutGeo.dispose();
      innerCutMat.dispose();
      renderer.dispose();
    };
  }, []);

  useEffect(() => {
    const node = cardRef.current;
    if (!node) return;

    const onMove = (event: PointerEvent) => {
      const rect = node.getBoundingClientRect();
      const x = (event.clientX - rect.left) / (rect.width || 1) - 0.5;
      const y = (event.clientY - rect.top) / (rect.height || 1) - 0.5;
      node.style.setProperty('--tx', `${x * 7}deg`);
      node.style.setProperty('--ty', `${-y * 7}deg`);
    };

    const onLeave = () => {
      node.style.setProperty('--tx', '0deg');
      node.style.setProperty('--ty', '0deg');
    };

    node.addEventListener('pointermove', onMove);
    node.addEventListener('pointerleave', onLeave);
    return () => {
      node.removeEventListener('pointermove', onMove);
      node.removeEventListener('pointerleave', onLeave);
    };
  }, []);

  return (
    <div ref={cardRef} className={`three-stone-tile ${className}`}>
      <div className="three-stone-canvas" style={snapshot ? { backgroundImage: `url(${snapshot})` } : undefined} aria-hidden="true" />
      <div className="three-stone-content">{children}</div>
    </div>
  );
};

export default ThreeStoneTile;
