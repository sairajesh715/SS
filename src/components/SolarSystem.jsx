import { useRef, useState, useMemo, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Stars, OrbitControls, Trail, useTexture, Html } from "@react-three/drei";
import * as THREE from "three";
import { PLANET_DATA, SUN_DATA } from "../data/planetData";

// ─── Saturn Ring Component ───────────────────────────────────────────────────
function SaturnRing({ planetColor }) {
  const ringRef = useRef();
  const ringGeometry = useMemo(() => {
    const geo = new THREE.RingGeometry(3.0, 4.8, 128);
    const pos = geo.attributes.position;
    const uv = geo.attributes.uv;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const r = Math.sqrt(x * x + y * y);
      const normalized = (r - 3.0) / (4.8 - 3.0);
      uv.setXY(i, normalized, 0.5);
    }
    return geo;
  }, []);

  return (
    <mesh ref={ringRef} rotation={[-Math.PI / 3.5, 0, 0.2]} geometry={ringGeometry}>
      <meshBasicMaterial
        color="#c8b560"
        side={THREE.DoubleSide}
        transparent
        opacity={0.7}
      />
    </mesh>
  );
}

// ─── Uranus/Neptune thin ring ────────────────────────────────────────────────
function ThinRing({ color, innerR, outerR }) {
  const geo = useMemo(() => new THREE.RingGeometry(innerR, outerR, 64), [innerR, outerR]);
  return (
    <mesh rotation={[-Math.PI / 3, 0.1, 0]} geometry={geo}>
      <meshBasicMaterial color={color} side={THREE.DoubleSide} transparent opacity={0.35} />
    </mesh>
  );
}

// ─── Glow halo ───────────────────────────────────────────────────────────────
function GlowSprite({ color, size = 1.5 }) {
  const spriteMat = useMemo(
    () =>
      new THREE.SpriteMaterial({
        color: new THREE.Color(color),
        transparent: true,
        opacity: 0.15,
        depthWrite: false,
      }),
    [color]
  );
  return <sprite material={spriteMat} scale={[size * 2.8, size * 2.8, 1]} />;
}

// ─── Orbit Ring ──────────────────────────────────────────────────────────────
function OrbitLine({ radius }) {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i <= 128; i++) {
      const angle = (i / 128) * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(angle) * radius, 0, Math.sin(angle) * radius));
    }
    return pts;
  }, [radius]);
  const geo = useMemo(() => {
    const g = new THREE.BufferGeometry().setFromPoints(points);
    return g;
  }, [points]);

  return (
    <line>
      <primitive object={geo} attach="geometry" />
      <lineBasicMaterial color="#ffffff" transparent opacity={0.06} />
    </line>
  );
}

// ─── Individual Planet ───────────────────────────────────────────────────────
function Planet({ planetKey, data, onClick, hoveredPlanet, setHoveredPlanet }) {
  const meshRef = useRef();
  const groupRef = useRef();
  const orbitRef = useRef();
  const angleRef = useRef(Math.random() * Math.PI * 2);

  const isHovered = hoveredPlanet === planetKey;

  // Build procedural sphere with vertex color perturbations
  const geometry = useMemo(() => {
    const geo = new THREE.SphereGeometry(data.radius, 64, 64);
    return geo;
  }, [data.radius]);

  const material = useMemo(() => {
    const mat = new THREE.MeshPhongMaterial({
      color: new THREE.Color(data.color),
      emissive: new THREE.Color(data.emissive || "#000"),
      emissiveIntensity: 0.25,
      shininess: 30,
    });
    return mat;
  }, [data.color, data.emissive]);

  useFrame((state, delta) => {
    angleRef.current += data.orbitSpeed * delta * 0.5;
    if (orbitRef.current) {
      orbitRef.current.position.x = Math.cos(angleRef.current) * data.orbitRadius;
      orbitRef.current.position.z = Math.sin(angleRef.current) * data.orbitRadius;
    }
    if (meshRef.current) {
      meshRef.current.rotation.y += data.rotationSpeed;
    }
    if (meshRef.current) {
      const targetScale = isHovered ? 1.3 : 1;
      meshRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);
    }
  });

  return (
    <>
      <OrbitLine radius={data.orbitRadius} />
      <group ref={orbitRef}>
        <group ref={groupRef}>
          <mesh
            ref={meshRef}
            geometry={geometry}
            material={material}
            onClick={(e) => {
              e.stopPropagation();
              onClick(planetKey);
            }}
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
                  <span className="hover-hint">Click for details</span>
                </div>
              </Html>
            )}
          </mesh>

          {/* Atmosphere glow */}
          <GlowSprite color={data.color} size={data.radius * 1.2} />

          {/* Saturn rings */}
          {planetKey === "saturn" && <SaturnRing />}
          {planetKey === "uranus" && <ThinRing color="#7de8e8" innerR={data.radius * 1.6} outerR={data.radius * 2.0} />}
          {planetKey === "neptune" && <ThinRing color="#5b73e8" innerR={data.radius * 1.5} outerR={data.radius * 1.7} />}
        </group>
      </group>
    </>
  );
}

// ─── Sun Component ───────────────────────────────────────────────────────────
function Sun({ onClick, hoveredPlanet, setHoveredPlanet }) {
  const meshRef = useRef();
  const glowRef = useRef();
  const isHovered = hoveredPlanet === "sun";

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (meshRef.current) {
      meshRef.current.rotation.y += 0.002;
      meshRef.current.material.emissiveIntensity = 0.9 + Math.sin(t * 1.5) * 0.1;
    }
    if (glowRef.current) {
      glowRef.current.scale.setScalar(1 + Math.sin(t * 0.8) * 0.05);
    }
  });

  return (
    <group>
      {/* Core sun */}
      <mesh
        ref={meshRef}
        onClick={(e) => {
          e.stopPropagation();
          onClick("sun");
        }}
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
        <meshStandardMaterial
          color="#FDB813"
          emissive="#ff6a00"
          emissiveIntensity={0.9}
        />
        {isHovered && (
          <Html center distanceFactor={12} style={{ pointerEvents: "none" }}>
            <div
              className="planet-hover-label"
              style={{
                "--planet-color": "#FDB813",
                background: "radial-gradient(circle, #FDB81322, transparent)",
                borderColor: "#FDB81388",
                color: "#FDB813",
              }}
            >
              The Sun
              <span className="hover-hint">Click for details</span>
            </div>
          </Html>
        )}
      </mesh>

      {/* Outer glow layers */}
      <sprite ref={glowRef}>
        <spriteMaterial
          color="#ff8c00"
          transparent
          opacity={0.12}
          depthWrite={false}
        />
      </sprite>
      <sprite scale={[9, 9, 1]}>
        <spriteMaterial color="#FDB813" transparent opacity={0.08} depthWrite={false} />
      </sprite>
      <sprite scale={[14, 14, 1]}>
        <spriteMaterial color="#ff4500" transparent opacity={0.04} depthWrite={false} />
      </sprite>

      {/* Point light from sun */}
      <pointLight color="#fff7e6" intensity={3} distance={200} decay={2} />
      <pointLight color="#ff8c00" intensity={1.5} distance={80} decay={2} />
    </group>
  );
}

// ─── Asteroid Belt ───────────────────────────────────────────────────────────
function AsteroidBelt() {
  const points = useMemo(() => {
    const pts = [];
    for (let i = 0; i < 800; i++) {
      const angle = Math.random() * Math.PI * 2;
      const r = 16.5 + (Math.random() - 0.5) * 1.5;
      const y = (Math.random() - 0.5) * 0.4;
      pts.push(new THREE.Vector3(Math.cos(angle) * r, y, Math.sin(angle) * r));
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

// ─── Scene wrapper ────────────────────────────────────────────────────────────
function Scene({ onPlanetClick }) {
  const [hoveredPlanet, setHoveredPlanet] = useState(null);

  return (
    <>
      <color attach="background" args={["#000008"]} />
      <ambientLight intensity={0.08} />
      <Stars radius={200} depth={80} count={6000} factor={5} saturation={0.3} fade speed={0.4} />

      <Sun onClick={onPlanetClick} hoveredPlanet={hoveredPlanet} setHoveredPlanet={setHoveredPlanet} />
      <AsteroidBelt />

      {Object.entries(PLANET_DATA).map(([key, data]) => (
        <Planet
          key={key}
          planetKey={key}
          data={data}
          onClick={onPlanetClick}
          hoveredPlanet={hoveredPlanet}
          setHoveredPlanet={setHoveredPlanet}
        />
      ))}

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={8}
        maxDistance={120}
        zoomSpeed={0.8}
        rotateSpeed={0.5}
        dampingFactor={0.08}
        enableDamping
      />
    </>
  );
}

// ─── Main Export ─────────────────────────────────────────────────────────────
export default function SolarSystem({ onPlanetClick }) {
  return (
    <Canvas
      camera={{ position: [0, 30, 60], fov: 55 }}
      gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
      dpr={[1, 2]}
    >
      <Scene onPlanetClick={onPlanetClick} />
    </Canvas>
  );
}
