import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

/* ─── Vendrom brand palette (rgb 0-1) ─── */
const PALETTE = [
    [0.145, 0.388, 0.922],   // #2563EB  blue
    [0.486, 0.227, 0.929],   // #7C3AED  violet
    [0.024, 0.714, 0.831],   // #06B6D4  cyan
    [0.659, 0.333, 0.969],   // #A855F7  purple
    [0.231, 0.510, 0.965],   // #3B82F6  lighter blue
    [1.000, 1.000, 1.000],   // white
] as const;

const TUNNEL_LENGTH = 95;
const TUNNEL_RADIUS = 24;
const STAR_COUNT = 320;

/* ─── Vertex / fragment sources (stable string refs) ─── */
const STAR_VERT = `
  uniform float uTime;
  attribute vec2 aTwinkle;
  varying vec3 vColor;
  varying float vFlicker;
  void main() {
    vColor = color;
    float flickerA = 0.5 + 0.5 * sin(uTime * aTwinkle.y + aTwinkle.x);
    float flickerB = 0.5 + 0.5 * sin(uTime * (aTwinkle.y * 0.63) + aTwinkle.x * 1.7);
    vFlicker = pow(mix(flickerA, flickerB, 0.45), 1.35);
    vec4 mv = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = 1.25 + vFlicker * 2.8;
    gl_Position  = projectionMatrix * mv;
  }
`;

const STAR_FRAG = `
  varying vec3  vColor;
  varying float vFlicker;
  void main() {
    float d = length(gl_PointCoord - 0.5);
    float core = 1.0 - smoothstep(0.0, 0.5, d);
    float a = core * (0.16 + vFlicker * 1.05);
    gl_FragColor = vec4(vColor * (1.1 + vFlicker * 0.8), a);
  }
`;

/* ─── Twinkling star field ─── */
function StarField({
    count = STAR_COUNT,
    radius = TUNNEL_RADIUS,
    length = TUNNEL_LENGTH,
}: {
    count?: number;
    radius?: number;
    length?: number;
}) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matRef = useRef<any>(null!);

    const { positions, colors, twinkle } = useMemo(() => {
        const pos = new Float32Array(count * 3);
        const col = new Float32Array(count * 3);
        const twk = new Float32Array(count * 2);

        for (let i = 0; i < count; i++) {
            const a = Math.random() * Math.PI * 2;
            const r = radius * (0.1 + Math.random() * 0.9);
            pos[i * 3] = Math.cos(a) * r;
            pos[i * 3 + 1] = Math.sin(a) * r;
            pos[i * 3 + 2] = -(Math.random() * length);

            const c = PALETTE[Math.floor(Math.random() * PALETTE.length)];
            const bright = 0.4 + Math.random() * 0.6;
            col[i * 3] = c[0] * bright;
            col[i * 3 + 1] = c[1] * bright;
            col[i * 3 + 2] = c[2] * bright;

            // x: phase offset, y: twinkle speed multiplier
            twk[i * 2] = Math.random() * Math.PI * 2;
            twk[i * 2 + 1] = 1.1 + Math.random() * 2.2;
        }

        return { positions: pos, colors: col, twinkle: twk };
    }, [count, radius, length]);

    /* Stable uniform object — never recreated, so R3F v9 won't reset uTime */
    const uniforms = useMemo(() => ({ uTime: { value: 0 } }), []);

    /* Imperatively construct buffer geometry so itemSize/count are always correct */
    const geometry = useMemo(() => {
        const geo = new THREE.BufferGeometry();
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        geo.setAttribute('aTwinkle', new THREE.BufferAttribute(twinkle, 2));
        return geo;
    }, [positions, colors, twinkle]);

    useFrame(({ clock }) => {
        if (matRef.current) {
            matRef.current.uniforms.uTime.value = clock.elapsedTime;
        }
    });

    return (
        <points geometry={geometry}>
            <shaderMaterial
                ref={matRef}
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                vertexColors
                uniforms={uniforms}
                vertexShader={STAR_VERT}
                fragmentShader={STAR_FRAG}
            />
        </points>
    );
}

/* ─── Central vanishing-point glow ─── */
function CenterGlow() {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const meshRef = useRef<any>(null!);
    useFrame(({ clock }) => {
        const s = 1.0 + Math.sin(clock.elapsedTime * 0.65) * 0.07;
        meshRef.current.scale.set(s, s, 1);
    });

    return (
        <mesh ref={meshRef} position={[0, 0, -TUNNEL_LENGTH * 0.87]}>
            <planeGeometry args={[44, 44]} />
            <shaderMaterial
                transparent
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                vertexShader={`
          varying vec2 vUv;
          void main() {
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `}
                fragmentShader={`
          varying vec2 vUv;
          void main() {
            vec2  c    = vUv - 0.5;
            float d    = length(c);
            float core = exp(-d * 12.0) * 0.6;
            float halo = exp(-d *  3.5) * 0.22;
            float soft = exp(-d *  1.4) * 0.09;
            vec3 white  = vec3(1.0);
            vec3 cyan   = vec3(0.024, 0.714, 0.831);
            vec3 violet = vec3(0.486, 0.227, 0.929);
            vec3 blue   = vec3(0.145, 0.388, 0.922);
            vec3 color  = white * core
                        + cyan  * halo
                        + mix(violet, blue, smoothstep(0.05, 0.45, d)) * soft;
            gl_FragColor = vec4(color, core + halo + soft);
          }
        `}
            />
        </mesh>
    );
}

/* ─── Exported wrapper ─── */
export default function WarpSpeedBackground() {
    return (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <Canvas
                gl={{ antialias: true, alpha: true }}
                camera={{ fov: 65, near: 0.1, far: 200, position: [0, 0, 3] }}
                style={{ background: 'transparent' }}
                resize={{ debounce: 100 }}
            >
                <StarField />
                <CenterGlow />
            </Canvas>
        </div>
    );
}

export function WarpSpeedStarsOnly() {
    return (
        <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
            <Canvas
                gl={{ antialias: true, alpha: true }}
                camera={{ fov: 95, near: 0.1, far: 120, position: [0, 0, 6] }}
                style={{ background: 'transparent' }}
                resize={{ debounce: 100 }}
            >
                <StarField count={120} radius={88} length={22} />
            </Canvas>
        </div>
    );
}
