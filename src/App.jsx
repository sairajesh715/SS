import { useState, Suspense } from "react";
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
  const [theme, setTheme] = useState("dark");
  const [selectedPlanet, setSelectedPlanet] = useState(null);
  const [showGuide, setShowGuide] = useState(true);
  const [isZooming, setIsZooming] = useState(false);

  const handlePlanetClick = (key) => {
    const data = key === "sun" ? SUN_DATA : PLANET_DATA[key];
    setSelectedPlanet(data);
    setShowGuide(false);
  };

  const handleSidebarSelect = (key) => {
    // Sidebar click just opens modal directly (no zoom from sidebar)
    const data = key === "sun" ? SUN_DATA : PLANET_DATA[key];
    setSelectedPlanet(data);
    setShowGuide(false);
  };

  const handleClose = () => setSelectedPlanet(null);
  const toggleTheme = () => setTheme((t) => (t === "dark" ? "light" : "dark"));

  return (
    <div className="app-root" data-theme={theme}>
      {/* Nebula background */}
      <div className="nebula-bg" />

      {/* 3D Canvas */}
      <Suspense fallback={<LoadingScreen />}>
        <div className="canvas-wrapper">
          <SolarSystem onPlanetClick={handlePlanetClick} setZooming={setIsZooming} />
        </div>
      </Suspense>

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
          {/* Theme toggle */}
          <motion.button
            className="theme-toggle"
            onClick={toggleTheme}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={`Switch to ${theme === "dark" ? "light" : "dark"} theme`}
          >
            <motion.span
              key={theme}
              initial={{ rotate: -30, opacity: 0 }}
              animate={{ rotate: 0, opacity: 1 }}
              exit={{ rotate: 30, opacity: 0 }}
              transition={{ duration: 0.2 }}
            >
              {theme === "dark" ? "☀️" : "🌙"}
            </motion.span>
            <span className="theme-label">{theme === "dark" ? "Light" : "Dark"}</span>
          </motion.button>
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
              <p><strong>Drag / Scroll</strong> to navigate</p>
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
