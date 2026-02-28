import { useRef, useState, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, OrbitControls } from "@react-three/drei";
import * as THREE from "three";
import { PLANET_DATA } from "../data/planetData";
import { TEXTURE_MAKERS, makeBumpMap } from "../utils/planetTextures";

const easeInOutQuart = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

/* ── Material config per planet ─────────────────────────────────────────── */
const MAT_CONFIG = {
  sun:     { roughness: 0.3, metalness: 0.0, bump: false },
  mercury: { roughness: 0.95, metalness: 0.05, bump: true  },
  venus:   { roughness: 0.55, metalness: 0.0,  bump: false },
  earth:   { roughness: 0.72, metalness: 0.05, bump: true  },
  mars:    { roughness: 0.92, metalness: 0.05, bump: true  },
  jupiter: { roughness: 0.6,  metalness: 0.0,  bump: false },
  saturn:  { roughness: 0.65, metalness: 0.0,  bump: false },
  uranus:  { roughness: 0.45, metalness: 0.02, bump: false },
  neptune: { roughness: 0.4,  metalness: 0.02, bump: false },
};

/* ── Atmosphere layer colors ────────────────────────────────────────────── */
const ATMO = {
  venus:   { color: "#e8c06a", opacity: 0.38 },
  earth:   { color: "#3366cc", opacity: 0.22 },
  mars:    { color: "#cc5533", opacity: 0.12 },
  jupiter: { color: "#c89050", opacity: 0.09 },
  saturn:  { color: "#d4c060", opacity: 0.08 },
  uranus:  { color: "#7de8e8", opacity: 0.20 },
  neptune: { color: "#4466ee", opacity: 0.22 },
};

/* ── Saturn Ring ────────────────────────────────────────────────────────── */
function SaturnRing() {
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(3.1, 5.0, 128);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const xi = pos.getX(i), yi = pos.getY(i);
      const rr = Math.sqrt(xi * xi + yi * yi);
      uv.setXY(i, (rr - 3.1) / (5.0 - 3.1), 0.5);
    }
    return g;
  }, []);

  const ringTex = useMemo(() => {
    const c = document.createElement("canvas");
    c.width = 512; c.height = 1;
    const x = c.getContext("2d");
    const g = x.createLinearGradient(0, 0, 512, 0);
    g.addColorStop(0.0,  "rgba(200,180,100,0.0)");
    g.addColorStop(0.05, "rgba(220,200,120,0.85)");
    g.addColorStop(0.20, "rgba(240,215,140,0.9)");
    g.addColorStop(0.40, "rgba(200,185,110,0.65)");
    g.addColorStop(0.55, "rgba(180,165,90,0.55)");
    g.addColorStop(0.70, "rgba(160,148,80,0.40)");
    g.addColorStop(0.85, "rgba(140,130,70,0.20)");
    g.addColorStop(1.0,  "rgba(120,110,60,0.0)");
    x.fillStyle = g; x.fillRect(0, 0, 512, 1);
    return new THREE.CanvasTexture(c);
  }, []);

  return (
    <mesh rotation={[-Math.PI / 3.5, 0, 0.2]} geometry={geo}>
      <meshBasicMaterial map={ringTex} side={THREE.DoubleSide} transparent opacity={1} depthWrite={false} />
    </mesh>
  );
}

function ThinRing({ color, innerR, outerR }) {
  const geo = useMemo(() => new THREE.RingGeometry(innerR, outerR, 64), [innerR, outerR]);
  return (
    <mesh rotation={[-Math.PI / 3, 0.1, 0]} geometry={geo}>
      <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.3} />
    </mesh>
  );
}

function OrbitLine({ radius }) {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius));
    }
    return pts;
  }, [radius]);
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <line>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color="#ffffff" transparent opacity={0.06} />
    </line>
  );
}

/* ── Atmosphere glow (BackSide inner sphere) ────────────────────────────── */
function Atmosphere({ radius, color, opacity }) {
  return (
    <mesh scale={1.055}>
      <sphereGeometry args={[radius, 32, 32]} />
      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        side={THREE.BackSide}
        depthWrite={false}
      />
    </mesh>
  );
}

/* ── Individual Planet ──────────────────────────────────────────────────── */
function Planet({ planetKey, data, onClick, hoveredPlanet, setHoveredPlanet, onHover, onUnhover }) {
  const meshRef = useRef();
  const orbitRef = useRef();
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const isHovered = hoveredPlanet === planetKey;
  const cfg = MAT_CONFIG[planetKey] || { roughness: 0.8, metalness: 0.05, bump: false };

  const texture  = useMemo(() => TEXTURE_MAKERS[planetKey]?.() ?? null, [planetKey]);
  const bumpMap  = useMemo(() => cfg.bump ? makeBumpMap(planetKey.length * 17, 256, 128, 0.4) : null, [planetKey, cfg.bump]);

  const material = useMemo(() => new THREE.MeshStandardMaterial({
    map: texture,
    bumpMap: bumpMap ?? undefined,
    bumpScale: 0.012,
    roughness: cfg.roughness,
    metalness: cfg.metalness,
  }), [texture, bumpMap, cfg.roughness, cfg.metalness]);

  const geometry = useMemo(() => new THREE.SphereGeometry(data.radius, 64, 64), [data.radius]);

  useFrame((_, delta) => {
    angleRef.current += data.orbitSpeed * delta * 0.5;
    if (orbitRef.current) {
      orbitRef.current.position.x = Math.cos(angleRef.current) * data.orbitRadius;
      orbitRef.current.position.z = Math.sin(angleRef.current) * data.orbitRadius;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += data.rotationSpeed;
      const t = isHovered ? 1.22 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(t, t, t), 0.1);
    }
  });

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    const wp = new THREE.Vector3();
    e.object.getWorldPosition(wp);
    onClick(planetKey, wp, data.radius);
  }, [planetKey, data.radius, onClick]);

  const atmo = ATMO[planetKey];

  return (
    <>
      <OrbitLine radius={data.orbitRadius} />
      <group ref={orbitRef}>
        <mesh
          ref={meshRef}
          geometry={geometry}
          material={material}
          onClick={handleClick}
          onPointerOver={(e) => {
            e.stopPropagation();
            setHoveredPlanet(planetKey);
            document.body.style.cursor = "pointer";
            onHover(data.name, data.color, e.clientX, e.clientY);
          }}
          onPointerMove={(e) => {
            if (hoveredPlanet === planetKey) {
              onHover(data.name, data.color, e.clientX, e.clientY);
            }
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHoveredPlanet(null);
            document.body.style.cursor = "default";
            onUnhover();
          }}
        />

        {/* Atmosphere glow */}
        {atmo && <Atmosphere radius={data.radius} color={atmo.color} opacity={atmo.opacity} />}

        {planetKey === "saturn"  && <SaturnRing />}
        {planetKey === "uranus"  && <ThinRing color="#7de8e8" innerR={data.radius * 1.6} outerR={data.radius * 2.0} />}
        {planetKey === "neptune" && <ThinRing color="#5b73e8" innerR={data.radius * 1.5} outerR={data.radius * 1.7} />}
      </group>
    </>
  );
}

/* ── Sun ────────────────────────────────────────────────────────────────── */
function Sun({ onClick, hoveredPlanet, setHoveredPlanet, onHover, onUnhover }) {
  const meshRef   = useRef();
  const coronaRef = useRef();

  const sunTex = useMemo(() => TEXTURE_MAKERS.sun(), []);
  const material = useMemo(() => new THREE.MeshStandardMaterial({
    map: sunTex,
    emissiveMap: sunTex,
    emissive: new THREE.Color("#ff8800"),
    emissiveIntensity: 0.9,
    roughness: 0.3,
    metalness: 0.0,
  }), [sunTex]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.0018;
      meshRef.current.material.emissiveIntensity = 0.85 + Math.sin(t * 1.3) * 0.12;
    }
    if (coronaRef.current) {
      coronaRef.current.scale.setScalar(1 + Math.sin(t * 0.7) * 0.025);
    }
  });

  const handleClick = useCallback((e) => {
    e.stopPropagation();
    const wp = new THREE.Vector3();
    e.object.getWorldPosition(wp);
    onClick("sun", wp, 2.5);
  }, [onClick]);

  return (
    <group>
      <mesh ref={meshRef} material={material}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPlanet("sun");
          document.body.style.cursor = "pointer";
          onHover("The Sun", "#FDB813", e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (hoveredPlanet === "sun") {
            onHover("The Sun", "#FDB813", e.clientX, e.clientY);
          }
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoveredPlanet(null);
          document.body.style.cursor = "default";
          onUnhover();
        }}
      >
        <sphereGeometry args={[2.5, 64, 64]} />
      </mesh>

      {/* Corona glow layers */}
      <group ref={coronaRef}>
        <mesh><sphereGeometry args={[2.75, 32, 32]} /><meshBasicMaterial color="#ff9900" transparent opacity={0.12} side={THREE.BackSide} depthWrite={false} /></mesh>
        <sprite scale={[11, 11, 1]}><spriteMaterial color="#FDB813" transparent opacity={0.10} depthWrite={false} /></sprite>
        <sprite scale={[18, 18, 1]}><spriteMaterial color="#ff6600" transparent opacity={0.05} depthWrite={false} /></sprite>
        <sprite scale={[26, 26, 1]}><spriteMaterial color="#ff3300" transparent opacity={0.025} depthWrite={false} /></sprite>
      </group>

      <pointLight color="#fff5e0" intensity={3.5} distance={220} decay={2} />
      <pointLight color="#ff8c00" intensity={1.8} distance={90}  decay={2} />
    </group>
  );
}

/* ── Asteroid Belt ──────────────────────────────────────────────────────── */
function AsteroidBelt() {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 900; i++) {
      const a = Math.random() * Math.PI * 2;
      const rr = 16.5 + (Math.random() - 0.5) * 1.8;
      pts.push(new THREE.Vector3(Math.cos(a) * rr, (Math.random() - 0.5) * 0.5, Math.sin(a) * rr));
    }
    return pts;
  }, []);
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return <points geometry={geo}><pointsMaterial color="#aaa" size={0.035} transparent opacity={0.45} /></points>;
}

/* ── Scene ──────────────────────────────────────────────────────────────── */
function Scene({ onPlanetClick, setZooming, onHover, onUnhover }) {
  const { camera } = useThree();
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const orbitRef = useRef();
  const zoomRef  = useRef(null);

  const handlePlanetClick = useCallback((key, worldPos, radius) => {
    const dir  = camera.position.clone().sub(worldPos).normalize();
    const dist = Math.max(radius * 5.5, 4);
    const endPos = worldPos.clone().addScaledVector(dir, dist);

    zoomRef.current = {
      startPos:    camera.position.clone(),
      startTarget: orbitRef.current ? orbitRef.current.target.clone() : new THREE.Vector3(),
      endPos,
      endTarget:   worldPos.clone(),
      progress:    0,
      key,
    };
    if (orbitRef.current) orbitRef.current.enabled = false;
    setZooming(true);
    document.body.style.cursor = "default";
  }, [camera, setZooming]);

  useFrame((state, delta) => {
    const z = zoomRef.current;
    if (!z) return;
    z.progress = Math.min(z.progress + delta * 0.75, 1);
    const t = easeInOutQuart(z.progress);
    state.camera.position.lerpVectors(z.startPos, z.endPos, t);
    state.camera.lookAt(new THREE.Vector3().lerpVectors(z.startTarget, z.endTarget, t));

    if (z.progress >= 1) {
      const key = z.key, et = z.endTarget.clone();
      zoomRef.current = null;
      if (orbitRef.current) {
        orbitRef.current.target.copy(et);
        orbitRef.current.update();
        orbitRef.current.enabled = true;
      }
      setZooming(false);
      onPlanetClick(key);
    }
  });

  return (
    <>
      <color attach="background" args={["#000008"]} />
      <ambientLight intensity={0.06} />
      <directionalLight position={[-80, 20, -60]} intensity={0.08} color="#aabbff" />
      <Stars radius={200} depth={80} count={7000} factor={5} saturation={0.4} fade speed={0.3} />

      <Sun
        onClick={handlePlanetClick}
        hoveredPlanet={hoveredPlanet}
        setHoveredPlanet={setHoveredPlanet}
        onHover={onHover}
        onUnhover={onUnhover}
      />
      <AsteroidBelt />

      {Object.entries(PLANET_DATA).map(([key, data]) => (
        <Planet key={key} planetKey={key} data={data}
          onClick={handlePlanetClick}
          hoveredPlanet={hoveredPlanet}
          setHoveredPlanet={setHoveredPlanet}
          onHover={onHover}
          onUnhover={onUnhover}
        />
      ))}

      {/* Left-drag = pan, right-drag = rotate, scroll = zoom */}
      <OrbitControls ref={orbitRef}
        enablePan enableZoom enableRotate
        screenSpacePanning
        mouseButtons={{ LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE }}
        minDistance={4} maxDistance={120}
        zoomSpeed={0.8} panSpeed={0.8} rotateSpeed={0.5}
        dampingFactor={0.08} enableDamping
      />
    </>
  );
}

export default function SolarSystem({ onPlanetClick, setZooming, onHover, onUnhover }) {
  return (
    <Canvas camera={{ position: [0, 30, 60], fov: 55 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 2]}
    >
      <Scene onPlanetClick={onPlanetClick} setZooming={setZooming} onHover={onHover} onUnhover={onUnhover} />
    </Canvas>
  );
}
