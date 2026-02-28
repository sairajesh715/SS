import { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
  Legend,
} from "recharts";

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="modal-tooltip">
        <p className="label">{label}</p>
        <p style={{ color: payload[0].color || "#fff" }}>
          {payload[0].name}: {payload[0].value}
          {payload[0].name === "temp" ? "°C" : "%"}
        </p>
      </div>
    );
  }
  return null;
};

const CustomPieTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    return (
      <div className="modal-tooltip">
        <p style={{ color: payload[0].payload.color }}>
          {payload[0].name}: {payload[0].value}%
        </p>
      </div>
    );
  }
  return null;
};

export default function PlanetModal({ planet, onClose }) {
  const modalRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  if (!planet) return null;

  const isSun = planet.name === "The Sun";

  return (
    <AnimatePresence>
      <motion.div
        className="modal-backdrop"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          ref={modalRef}
          className="modal-container"
          initial={{ opacity: 0, scale: 0.8, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.85, y: 40 }}
          transition={{ type: "spring", damping: 25, stiffness: 300 }}
        >
          {/* Header */}
          <div className="modal-header" style={{ "--planet-color": planet.color }}>
            <div className="modal-planet-orb" style={{ background: `radial-gradient(circle at 35% 35%, ${planet.color}dd, ${planet.color}44 60%, transparent)`, boxShadow: `0 0 40px ${planet.color}88, 0 0 80px ${planet.color}44` }} />
            <div className="modal-title-block">
              <motion.h1
                className="modal-planet-name"
                style={{ color: planet.color, textShadow: `0 0 30px ${planet.color}99` }}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 }}
              >
                {planet.name}
              </motion.h1>
              <p className="modal-description">{planet.description}</p>
            </div>
            <button className="modal-close" onClick={onClose}>✕</button>
          </div>

          <div className="modal-body">
            {/* Quick Stats */}
            <motion.section
              className="modal-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
            >
              <h2 className="section-title">
                <span className="section-icon">📊</span> Quick Stats
              </h2>
              <div className="stats-grid">
                {!isSun ? (
                  <>
                    <StatCard icon="📏" label="Diameter" value={planet.diameter} color={planet.color} />
                    <StatCard icon="🌍" label="Distance from Sun" value={planet.distance} color={planet.color} />
                    <StatCard icon="⚡" label="Gravity" value={planet.gravity} color={planet.color} />
                    <StatCard icon="🌙" label="Moons" value={planet.moons} color={planet.color} />
                    <StatCard icon="🌞" label="Day Length" value={planet.dayLength} color={planet.color} />
                    <StatCard icon="🔄" label="Year Length" value={planet.yearLength} color={planet.color} />
                  </>
                ) : (
                  <>
                    <StatCard icon="📏" label="Diameter" value={planet.diameter} color={planet.color} />
                    <StatCard icon="⚖️" label="Mass" value={planet.mass} color={planet.color} />
                    <StatCard icon="🔥" label="Surface Temp" value={`${planet.temperature.surface.toLocaleString()}°C`} color={planet.color} />
                    <StatCard icon="💥" label="Core Temp" value={`${planet.temperature.core.toLocaleString()}°C`} color={planet.color} />
                    <StatCard icon="🌟" label="Corona Temp" value={`${planet.temperature.corona.toLocaleString()}°C`} color={planet.color} />
                    <StatCard icon="⏳" label="Age" value={planet.age} color={planet.color} />
                  </>
                )}
              </div>
            </motion.section>

            <div className="charts-grid">
              {/* Atmosphere / Composition */}
              <motion.section
                className="modal-section chart-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                <h2 className="section-title">
                  <span className="section-icon">🌫️</span>
                  {isSun ? " Composition" : " Atmospheric Composition"}
                </h2>
                {!isSun && (
                  <div className="atmo-meta">
                    <span className="atmo-badge" style={{ background: `${planet.color}22`, border: `1px solid ${planet.color}55`, color: planet.color }}>
                      {planet.atmosphere.type}
                    </span>
                    <span className="atmo-pressure">Pressure: {planet.atmosphere.pressure}</span>
                  </div>
                )}
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie
                        data={isSun ? planet.composition : planet.atmosphere.composition}
                        cx="50%"
                        cy="50%"
                        innerRadius={55}
                        outerRadius={90}
                        paddingAngle={3}
                        dataKey="value"
                        nameKey="name"
                      >
                        {(isSun ? planet.composition : planet.atmosphere.composition).map((entry, i) => (
                          <Cell key={i} fill={entry.color} stroke={entry.color} strokeWidth={1} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomPieTooltip />} />
                      <Legend
                        formatter={(value, entry) => (
                          <span style={{ color: entry.color, fontSize: "0.75rem" }}>{value}</span>
                        )}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </motion.section>

              {/* Minerals */}
              {!isSun && (
                <motion.section
                  className="modal-section chart-section"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.25 }}
                >
                  <h2 className="section-title">
                    <span className="section-icon">⛏️</span> Mineral Composition
                  </h2>
                  <div className="chart-wrap">
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={planet.minerals} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis
                          type="number"
                          tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          unit="%"
                        />
                        <YAxis
                          type="category"
                          dataKey="name"
                          tick={{ fill: "rgba(255,255,255,0.7)", fontSize: 11 }}
                          tickLine={false}
                          axisLine={false}
                          width={75}
                        />
                        <Tooltip
                          cursor={{ fill: "rgba(255,255,255,0.03)" }}
                          content={({ active, payload }) =>
                            active && payload?.length ? (
                              <div className="modal-tooltip">
                                <p style={{ color: payload[0].payload.color }}>{payload[0].payload.name}: {payload[0].value}%</p>
                              </div>
                            ) : null
                          }
                        />
                        <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                          {planet.minerals.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </motion.section>
              )}
            </div>

            {/* Temperature Profile */}
            {!isSun && (
              <motion.section
                className="modal-section"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                <h2 className="section-title">
                  <span className="section-icon">🌡️</span> Temperature Profile
                </h2>
                <div className="temp-summary">
                  <div className="temp-stat cold">
                    <span className="temp-label">Min</span>
                    <span className="temp-val">{planet.temperature.min}°C</span>
                  </div>
                  <div className="temp-stat avg" style={{ color: planet.color }}>
                    <span className="temp-label">Avg</span>
                    <span className="temp-val">{planet.temperature.avg}°C</span>
                  </div>
                  <div className="temp-stat hot">
                    <span className="temp-label">Max</span>
                    <span className="temp-val">{planet.temperature.max}°C</span>
                  </div>
                </div>
                <div className="chart-wrap">
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={planet.temperatureData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                      <defs>
                        <linearGradient id="tempGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={planet.color} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={planet.color} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="time" tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} tickLine={false} axisLine={false} />
                      <YAxis tick={{ fill: "rgba(255,255,255,0.5)", fontSize: 11 }} tickLine={false} axisLine={false} unit="°C" />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="temp"
                        stroke={planet.color}
                        strokeWidth={2.5}
                        dot={{ r: 4, fill: planet.color, strokeWidth: 0 }}
                        activeDot={{ r: 6, fill: "#fff", stroke: planet.color, strokeWidth: 2 }}
                        name="temp"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </motion.section>
            )}

            {/* Fun Facts */}
            <motion.section
              className="modal-section"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.35 }}
            >
              <h2 className="section-title">
                <span className="section-icon">✨</span> Key Facts
              </h2>
              <div className="facts-list">
                {planet.facts.map((fact, i) => (
                  <motion.div
                    key={i}
                    className="fact-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.35 + i * 0.07 }}
                    style={{ borderLeft: `3px solid ${planet.color}` }}
                  >
                    <span className="fact-num" style={{ color: planet.color }}>0{i + 1}</span>
                    <span>{fact}</span>
                  </motion.div>
                ))}
              </div>
            </motion.section>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

function StatCard({ icon, label, value, color }) {
  return (
    <div className="stat-card" style={{ "--accent": color }}>
      <span className="stat-icon">{icon}</span>
      <div className="stat-info">
        <span className="stat-label">{label}</span>
        <span className="stat-value" style={{ color }}>{value}</span>
      </div>
    </div>
  );
}
