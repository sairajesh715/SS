import { useRef, useState, useMemo, useCallback } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, OrbitControls, Html } from "@react-three/drei";
import * as THREE from "three";
import { PLANET_DATA, SUN_DATA } from "../data/planetData";

const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);
const easeInOutQuart = (t) =>
  t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;

// ─── Saturn Ring ─────────────────────────────────────────────────────────────
function SaturnRing() {
  const geo = useMemo(() => {
    const g = new THREE.RingGeometry(3.0, 4.8, 128);
    const pos = g.attributes.position;
    const uv = g.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      uv.setXY(i, (r - 3.0) / (4.8 - 3.0), 0.5);
    }
    return g;
  }, []);
  return (
    <mesh rotation={[-Math.PI / 3.5, 0, 0.2]} geometry={geo}>
      <meshBasicMaterial color="#c8b560" side={THREE.DoubleSide} transparent opacity={0.72} />
    </mesh>
  );
}

function ThinRing({ color, innerR, outerR }) {
  const geo = useMemo(() => new THREE.RingGeometry(innerR, outerR, 64), [innerR, outerR]);
  return (
    <mesh rotation={[-Math.PI / 3, 0.1, 0]} geometry={geo}>
      <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.35} />
    </mesh>
  );
}

function GlowSprite({ color, size = 1.5 }) {
  const mat = useMemo(
    () => new THREE.SpriteMaterial({ color: new THREE.Color(color), transparent: true, opacity: 0.15, depthWrite: false }),
    [color]
  );
  return <sprite material={mat} scale={[size * 2.8, size * 2.8, 1]} />;
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

// ─── Planet ───────────────────────────────────────────────────────────────────
function Planet({ planetKey, data, onClick, hoveredPlanet, setHoveredPlanet }) {
  const meshRef = useRef();
  const orbitRef = useRef();
  const angleRef = useRef(Math.random() * Math.PI * 2);
  const isHovered = hoveredPlanet === planetKey;

  const geometry = useMemo(() => new THREE.SphereGeometry(data.radius, 64, 64), [data.radius]);
  const material = useMemo(
    () =>
      new THREE.MeshPhongMaterial({
        color: new THREE.Color(data.color),
        emissive: new THREE.Color(data.emissive || "#000"),
        emissiveIntensity: 0.25,
        shininess: 30,
      }),
    [data.color, data.emissive]
  );

  useFrame((state, delta) => {
    angleRef.current += data.orbitSpeed * delta * 0.5;
    if (orbitRef.current) {
      orbitRef.current.position.x = Math.cos(angleRef.current) * data.orbitRadius;
      orbitRef.current.position.z = Math.sin(angleRef.current) * data.orbitRadius;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += data.rotationSpeed;
      const target = isHovered ? 1.3 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(target, target, target), 0.1);
    }
  });

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      const wp = new THREE.Vector3();
      e.object.getWorldPosition(wp);
      onClick(planetKey, wp, data.radius);
    },
    [planetKey, data.radius, onClick]
  );

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
          }}
          onPointerOut={(e) => {
            e.stopPropagation();
            setHoveredPlanet(null);
            document.body.style.cursor = "default";
          }}
        >
          {isHovered && (
            <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
              <div
                className="planet-hover-label"
                style={{
                  "--planet-color": data.color,
                  background: `radial-gradient(circle, ${data.color}22, transparent)`,
                  borderColor: `${data.color}88`,
                  color: data.color,
                }}
              >
                {data.name}
                <span className="hover-hint">Click to explore</span>
              </div>
            </Html>
          )}
        </mesh>
        <GlowSprite color={data.color} size={data.radius * 1.2} />
        {planetKey === "saturn" && <SaturnRing />}
        {planetKey === "uranus" && <ThinRing color="#7de8e8" innerR={data.radius * 1.6} outerR={data.radius * 2.0} />}
        {planetKey === "neptune" && <ThinRing color="#5b73e8" innerR={data.radius * 1.5} outerR={data.radius * 1.7} />}
      </group>
    </>
  );
}

// ─── Sun ──────────────────────────────────────────────────────────────────────
function Sun({ onClick, hoveredPlanet, setHoveredPlanet }) {
  const meshRef = useRef();
  const isHovered = hoveredPlanet === "sun";

  useFrame((state) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
      meshRef.current.material.emissiveIntensity = 0.9 + Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
    }
  });

  const handleClick = useCallback(
    (e) => {
      e.stopPropagation();
      const wp = new THREE.Vector3();
      e.object.getWorldPosition(wp);
      onClick("sun", wp, 2.5);
    },
    [onClick]
  );

  return (
    <group>
      <mesh
        ref={meshRef}
        onClick={handleClick}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHoveredPlanet("sun");
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={(e) => {
          e.stopPropagation();
          setHoveredPlanet(null);
          document.body.style.cursor = "default";
        }}
      >
        <sphereGeometry args={[2.5, 64, 64]} />
        <meshStandardMaterial color="#FDB813" emissive="#ff6a00" emissiveIntensity={0.9} />
        {isHovered && (
          <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
            <div
              className="planet-hover-label"
              style={{
                background: "radial-gradient(circle, #FDB81322, transparent)",
                borderColor: "#FDB81388",
                color: "#FDB813",
              }}
            >
              The Sun
              <span className="hover-hint">Click to explore</span>
            </div>
          </Html>
        )}
      </mesh>
      <sprite scale={[9, 9, 1]}>
        <spriteMaterial color="#FDB813" transparent opacity={0.1} depthWrite={false} />
      </sprite>
      <sprite scale={[16, 16, 1]}>
        <spriteMaterial color="#ff4500" transparent opacity={0.04} depthWrite={false} />
      </sprite>
      <pointLight color="#fff7e6" intensity={3} distance={200} decay={2} />
      <pointLight color="#ff8c00" intensity={1.5} distance={80} decay={2} />
    </group>
  );
}

function AsteroidBelt() {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 800; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 16.5 + (Math.random() - 0.5) * 1.5;
      pts.push(new THREE.Vector3(Math.cos(angle) * r, (Math.random() - 0.5) * 0.4, Math.sin(angle) * r));
    }
    return pts;
  }, []);
  const geo = useMemo(() => new THREE.BufferGeometry().setFromPoints(points), [points]);
  return (
    <points geometry={geo}>
      <pointsMaterial color="#888" size={0.04} transparent opacity={0.5} />
    </points>
  );
}

// ─── Zoom Flash Overlay ───────────────────────────────────────────────────────
function ZoomVignette({ active, color }) {
  return null; // handled via CSS overlay in App
}

// ─── Scene ────────────────────────────────────────────────────────────────────
function Scene({ onPlanetClick, setZooming }) {
  const { camera } = useThree();
  const [hoveredPlanet, setHoveredPlanet] = useState(null);
  const orbitRef = useRef();
  const zoomRef = useRef(null);

  const handlePlanetClick = useCallback(
    (key, worldPos, radius) => {
      // Calculate zoom destination: come in from current camera direction
      const dir = camera.position.clone().sub(worldPos).normalize();
      const dist = Math.max(radius * 5.5, 4);
      const endPos = worldPos.clone().addScaledVector(dir, dist);

      zoomRef.current = {
        startPos: camera.position.clone(),
        startTarget: orbitRef.current ? orbitRef.current.target.clone() : new THREE.Vector3(),
        endPos,
        endTarget: worldPos.clone(),
        progress: 0,
        key,
        color: key === "sun" ? "#FDB813" : (PLANET_DATA[key]?.color || "#fff"),
      };

      if (orbitRef.current) orbitRef.current.enabled = false;
      setZooming(true);
      document.body.style.cursor = "default";
    },
    [camera, setZooming]
  );

  useFrame((state, delta) => {
    const z = zoomRef.current;
    if (!z) return;

    z.progress = Math.min(z.progress + delta * 0.75, 1);
    const t = easeInOutQuart(z.progress);

    state.camera.position.lerpVectors(z.startPos, z.endPos, t);
    const lookAt = new THREE.Vector3().lerpVectors(z.startTarget, z.endTarget, t);
    state.camera.lookAt(lookAt);

    if (z.progress >= 1) {
      const key = z.key;
      const endTarget = z.endTarget.clone();
      zoomRef.current = null;

      if (orbitRef.current) {
        orbitRef.current.target.copy(endTarget);
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
      <ambientLight intensity={0.08} />
      <Stars radius={200} depth={80} count={6000} factor={5} saturation={0.3} fade speed={0.4} />

      <Sun onClick={handlePlanetClick} hoveredPlanet={hoveredPlanet} setHoveredPlanet={setHoveredPlanet} />
      <AsteroidBelt />

      {Object.entries(PLANET_DATA).map(([key, data]) => (
        <Planet
          key={key}
          planetKey={key}
          data={data}
          onClick={handlePlanetClick}
          hoveredPlanet={hoveredPlanet}
          setHoveredPlanet={setHoveredPlanet}
        />
      ))}

      <OrbitControls
        ref={orbitRef}
        enablePan
        enableZoom
        enableRotate
        minDistance={4}
        maxDistance={120}
        zoomSpeed={0.8}
        rotateSpeed={0.5}
        dampingFactor={0.08}
        enableDamping
      />
    </>
  );
}

// ─── Export ───────────────────────────────────────────────────────────────────
export default function SolarSystem({ onPlanetClick, setZooming }) {
  return (
    <Canvas
      camera={{ position: [0, 30, 60], fov: 55 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 2]}
    >
      <Scene onPlanetClick={onPlanetClick} setZooming={setZooming} />
    </Canvas>
  );
}
