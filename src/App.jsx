import { useState, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SolarSystem from "./components/SolarSystem";
import PlanetModal from "./components/PlanetModal";
import { PLANET_DATA, SUN_DATA } from "./data/planetData";
import "./App.css";

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-orb" />
      <p className="loading-text">Initializing Solar System...</p>
      <div className="loading-bar">
        <div className="loading-fill" />
      </div>
    </div>
  );
}

function PlanetList({ onSelect }) {
  const planets = [
    { key: "sun", name: "Sun", color: "#FDB813" },
    ...Object.entries(PLANET_DATA).map(([k, v]) => ({ key: k, name: v.name, color: v.color })),
  ];
  return (
    <div className="planet-list-panel">
      <h3 className="panel-title">Solar Bodies</h3>
      <div className="planet-list">
        {planets.map((p) => (
          <button key={p.key} className="planet-list-btn" onClick={() => onSelect(p.key)}>
            <span className="planet-dot" style={{ background: p.color, boxShadow: `0 0 8px ${p.color}88` }} />
            <span className="planet-list-name">{p.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default function App() {
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [showGuide, setShowGuide] = useState(true);

  const handlePlanetClick = (key) => {
    const data = key === "sun" ? SUN_DATA : PLANET_DATA[key];
    setSelectedPlanet(data);
    setShowGuide(false);
  };

  const handleClose = () => setSelectedPlanet(null);

  return (
    <div className="app-root">
      <div className="nebula-bg" />

      <Suspense fallback={<LoadingScreen />}>
        <div className="canvas-wrapper">
          <SolarSystem onPlanetClick={handlePlanetClick} />
        </div>
      </Suspense>

      <header className="top-bar">
        <div className="logo-block">
          <div className="logo-icon">🌌</div>
          <div>
            <h1 className="logo-title">Solar System</h1>
            <p className="logo-sub">Interactive Explorer</p>
          </div>
        </div>
        <div className="top-controls">
          <span className="top-badge">8 Planets · Live Orbits</span>
        </div>
      </header>

      <div className="sidebar">
        <PlanetList onSelect={handlePlanetClick} />
      </div>

      <AnimatePresence>
        {showGuide && (
          <motion.div
            className="guide-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 1 }}
          >
            <span>🖱️</span>
            <div>
              <p><strong>Hover</strong> a planet to see its name</p>
              <p><strong>Click</strong> any planet for details</p>
              <p><strong>Drag / Scroll</strong> to explore</p>
            </div>
            <button className="guide-close" onClick={() => setShowGuide(false)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {selectedPlanet && (
          <PlanetModal planet={selectedPlanet} onClose={handleClose} />
        )}
      </AnimatePresence>
    </div>
  );
}
