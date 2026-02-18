import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import Spline from '@splinetool/react-spline';

const SPLINE_SCENE_URL = import.meta.env.VITE_SPLINE_SCENE_URL as string | undefined;

const LandingImmersiveLayer = () => {
  const threeWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = threeWrapRef.current;
    if (!mount) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 1000);
    camera.position.z = 24;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    const particles = 1400;
    const positions = new Float32Array(particles * 3);
    for (let i = 0; i < particles; i += 1) {
      positions[i * 3] = (Math.random() - 0.5) * 90;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 60;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 65;
    }

    const pointsGeometry = new THREE.BufferGeometry();
    pointsGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const pointsMaterial = new THREE.PointsMaterial({
      color: '#38bdf8',
      size: 0.12,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    });

    const points = new THREE.Points(pointsGeometry, pointsMaterial);
    scene.add(points);

    const lineGroup = new THREE.Group();
    scene.add(lineGroup);

    for (let i = 0; i < 24; i += 1) {
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 12),
        new THREE.Vector3((Math.random() - 0.5) * 24, (Math.random() - 0.5) * 24, (Math.random() - 0.5) * 12),
        new THREE.Vector3((Math.random() - 0.5) * 35, (Math.random() - 0.5) * 16, (Math.random() - 0.5) * 12),
      ]);
      const geo = new THREE.TubeGeometry(curve, 42, 0.02, 8, false);
      const mat = new THREE.MeshBasicMaterial({ color: '#0ea5e9', transparent: true, opacity: 0.2 });
      const line = new THREE.Mesh(geo, mat);
      lineGroup.add(line);
    }

    let targetX = 0;
    let targetY = 0;

    const onPointerMove = (event: PointerEvent) => {
      const width = window.innerWidth || 1;
      const height = window.innerHeight || 1;
      targetX = (event.clientX / width - 0.5) * 0.7;
      targetY = (event.clientY / height - 0.5) * 0.35;
    };

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      if (!width || !height) return;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };

    let raf = 0;
    const animate = () => {
      points.rotation.y += 0.0008;
      points.rotation.x += 0.00035;
      lineGroup.rotation.y += 0.0005;

      scene.rotation.y += (targetX - scene.rotation.y) * 0.03;
      scene.rotation.x += (targetY - scene.rotation.x) * 0.03;

      renderer.render(scene, camera);
      raf = window.requestAnimationFrame(animate);
    };

    resize();
    animate();

    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('resize', resize);

    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('resize', resize);

      pointsGeometry.dispose();
      pointsMaterial.dispose();
      lineGroup.children.forEach((child: unknown) => {
        const mesh = child as { geometry?: { dispose?: () => void }; material?: { dispose?: () => void } };
        mesh.geometry?.dispose?.();
        mesh.material?.dispose?.();
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="landing-immersive" aria-hidden="true">
      {SPLINE_SCENE_URL ? (
        <div className="landing-spline-layer">
          <Spline scene={SPLINE_SCENE_URL} />
        </div>
      ) : null}
      <div ref={threeWrapRef} className="landing-three-layer" />
    </div>
  );
};

export default LandingImmersiveLayer;
