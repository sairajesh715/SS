import { useState, useCallback, Suspense } from "react";
import { motion, AnimatePresence } from "framer-motion";
import SolarSystem from "./components/SolarSystem";
import PlanetModal from "./components/PlanetModal";
import Chatbot from "./components/Chatbot";
import { PLANET_DATA, SUN_DATA } from "./data/planetData";
import "./App.css";

function LoadingScreen() {
  return (
    <div className="loading-screen">
      <div className="loading-orb" />
      <p className="loading-text">Initializing Solar System…</p>
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
  const [showGuide, setShowGuide]           = useState(true);
  const [isZooming, setIsZooming]           = useState(false);
  const [tooltip, setTooltip]               = useState(null); // { name, color, x, y }
  const [isZoomedIn, setIsZoomedIn]         = useState(false);
  const [resetTrigger, setResetTrigger]     = useState(0);

  const handlePlanetClick = (key) => {
    const data = key === "sun" ? SUN_DATA : PLANET_DATA[key];
    setSelectedPlanet(data);
    setShowGuide(false);
    setIsZoomedIn(true);
  };

  const handleResetView = () => {
    setSelectedPlanet(null);
    setIsZoomedIn(false);
    setResetTrigger(n => n + 1);
  };

  const handleSidebarSelect = (key) => {
    const data = key === "sun" ? SUN_DATA : PLANET_DATA[key];
    setSelectedPlanet(data);
    setShowGuide(false);
  };

  const handleClose = () => setSelectedPlanet(null);

  const handleHover = useCallback((name, color, x, y) => {
    setTooltip({ name, color, x, y });
  }, []);

  const handleUnhover = useCallback(() => {
    setTooltip(null);
  }, []);

  return (
    <div className="app-root" data-theme="dark">
      {/* Nebula background */}
      <div className="nebula-bg" />

      {/* 3D Canvas */}
      <Suspense fallback={<LoadingScreen />}>
        <div className="canvas-wrapper">
          <SolarSystem
            onPlanetClick={handlePlanetClick}
            setZooming={setIsZooming}
            onHover={handleHover}
            onUnhover={handleUnhover}
            resetTrigger={resetTrigger}
          />
        </div>
      </Suspense>

      {/* Hover tooltip — pure DOM, no drei Html */}
      {tooltip && (
        <div
          className="planet-hover-label"
          style={{
            position: "fixed",
            left: tooltip.x,
            top: tooltip.y,
            transform: "translate(-50%, calc(-100% - 14px))",
            "--planet-color": tooltip.color,
            background: `radial-gradient(circle, ${tooltip.color}22, transparent)`,
            borderColor: `${tooltip.color}88`,
            color: tooltip.color,
            zIndex: 8,
          }}
        >
          {tooltip.name}
          <span className="hover-hint">Click to explore</span>
        </div>
      )}

      {/* Zoom vignette overlay */}
      <AnimatePresence>
        {isZooming && (
          <motion.div
            className="zoom-vignette"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          />
        )}
      </AnimatePresence>

      {/* Back to Overview button — visible only when zoomed into a planet */}
      <AnimatePresence>
        {isZoomedIn && !isZooming && (
          <motion.button
            className="reset-view-btn"
            onClick={handleResetView}
            initial={{ opacity: 0, y: -16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.25 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            ← Overview
          </motion.button>
        )}
      </AnimatePresence>

      {/* Header */}
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

      {/* Sidebar */}
      <div className="sidebar">
        <PlanetList onSelect={handleSidebarSelect} />
      </div>

      {/* Guide toast */}
      <AnimatePresence>
        {showGuide && (
          <motion.div
            className="guide-toast"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            transition={{ delay: 1.2 }}
          >
            <span>🖱️</span>
            <div>
              <p><strong>Hover</strong> to identify planets</p>
              <p><strong>Click</strong> to zoom in &amp; explore</p>
              <p><strong>Left-drag</strong> to pan · <strong>Right-drag</strong> to rotate</p>
              <p><strong>Scroll</strong> to zoom</p>
            </div>
            <button className="guide-close" onClick={() => setShowGuide(false)}>✕</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Planet modal */}
      <AnimatePresence>
        {selectedPlanet && <PlanetModal planet={selectedPlanet} onClose={handleClose} />}
      </AnimatePresence>

      {/* Chatbot */}
      <Chatbot />
    </div>
  );
}
