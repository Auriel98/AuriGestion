import { useEffect, useState } from "react";

import { API_URL } from "../../api/api";

import "./WorkforceEvolution.css";

const MONTH_LABELS = [
  "Jan",
  "Fév",
  "Mar",
  "Avr",
  "Mai",
  "Juin",
  "Juil",
  "Août",
  "Sep",
  "Oct",
  "Nov",
  "Déc",
];

// Dimensions du graphique (le SVG s'adapte à la largeur disponible)
const WIDTH = 640;
const HEIGHT = 270;
const PADDING = { top: 14, right: 12, bottom: 30, left: 36 };
const TICK_COUNT = 4;

const getMonthLabel = (month) => {
  const index = Number(month.split("-")[1]) - 1;
  return MONTH_LABELS[index] || month;
};

// Calcule un pas d'axe "rond" (1, 2, 5, 10, 20, 50...)
const getNiceStep = (maxValue) => {
  if (maxValue <= 0) return 1;

  const rough = maxValue / TICK_COUNT;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const normalized = rough / magnitude;

  let multiplier = 10;
  if (normalized <= 1) multiplier = 1;
  else if (normalized <= 2) multiplier = 2;
  else if (normalized <= 5) multiplier = 5;

  return multiplier * magnitude;
};

const WorkforceEvolution = () => {
  const [points, setPoints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const fetchEvolution = async () => {
      try {
        setLoading(true);
        setError("");

        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error("Vous devez vous connecter.");
        }

        const response = await fetch(
          `${API_URL}/dashboard/workforce-evolution`,
          {
            method: "GET",
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Impossible de récupérer l'évolution."
          );
        }

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error(
            result.message || "Réponse inattendue du serveur."
          );
        }

        setPoints(
          result.data.map((item) => ({
            month: item.month,
            employees: Number(item.employees ?? 0),
            contracts: Number(item.contracts ?? 0),
          }))
        );
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        console.error("Erreur de chargement de l'évolution :", err);
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchEvolution();

    return () => {
      controller.abort();
    };
  }, [retryCount]);

  const handleRetry = () => {
    setRetryCount((count) => count + 1);
  };

  const renderChart = () => {
    const plotWidth = WIDTH - PADDING.left - PADDING.right;
    const plotHeight = HEIGHT - PADDING.top - PADDING.bottom;

    const maxValue = Math.max(
      ...points.map((p) => Math.max(p.employees, p.contracts))
    );
    const step = getNiceStep(maxValue);
    const axisMax = step * TICK_COUNT;

    const band = plotWidth / points.length;
    const barWidth = Math.min(band * 0.46, 34);

    const getX = (index) => PADDING.left + band * index + band / 2;
    const getY = (value) =>
      PADDING.top + plotHeight - (value / axisMax) * plotHeight;

    const ticks = Array.from(
      { length: TICK_COUNT + 1 },
      (_, i) => step * i
    );

    const linePath = points
      .map(
        (p, i) => `${i === 0 ? "M" : "L"}${getX(i)},${getY(p.contracts)}`
      )
      .join(" ");

    return (
      <svg
        className="workforce-svg"
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="Évolution des employés et des contrats sur les 10 derniers mois"
      >
        {/* Grille et axe Y */}
        {ticks.map((tick) => (
          <g key={tick}>
            <line
              className="workforce-grid"
              x1={PADDING.left}
              x2={WIDTH - PADDING.right}
              y1={getY(tick)}
              y2={getY(tick)}
            />
            <text
              className="workforce-axis-label"
              x={PADDING.left - 8}
              y={getY(tick) + 4}
              textAnchor="end"
            >
              {tick}
            </text>
          </g>
        ))}

        {/* Barres : employés */}
        {points.map((p, i) => (
          <rect
            className="workforce-bar"
            key={`bar-${p.month}`}
            x={getX(i) - barWidth / 2}
            y={getY(p.employees)}
            width={barWidth}
            height={Math.max(PADDING.top + plotHeight - getY(p.employees), 0)}
            rx="3"
          >
            <title>{`${getMonthLabel(p.month)} : ${p.employees} employés`}</title>
          </rect>
        ))}

        {/* Courbe : contrats */}
        <path className="workforce-line" d={linePath} />

        {points.map((p, i) => (
          <circle
            className="workforce-dot"
            key={`dot-${p.month}`}
            cx={getX(i)}
            cy={getY(p.contracts)}
            r="4"
          >
            <title>{`${getMonthLabel(p.month)} : ${p.contracts} contrats`}</title>
          </circle>
        ))}

        {/* Axe X */}
        {points.map((p, i) => (
          <text
            className="workforce-axis-label"
            key={`label-${p.month}`}
            x={getX(i)}
            y={HEIGHT - 8}
            textAnchor="middle"
          >
            {getMonthLabel(p.month)}
          </text>
        ))}
      </svg>
    );
  };

  const renderContent = () => {
    if (loading) {
      return (
        <div className="workforce-state" aria-busy="true">
          Chargement...
        </div>
      );
    }

    if (error) {
      return (
        <div className="workforce-state error" role="alert">
          <span>{error}</span>

          <button type="button" onClick={handleRetry}>
            Réessayer
          </button>
        </div>
      );
    }

    if (points.length === 0) {
      return (
        <div className="workforce-state">
          Aucune donnée disponible pour le moment.
        </div>
      );
    }

    return renderChart();
  };

  return (
    <section
      className="workforce-evolution"
      aria-labelledby="workforce-evolution-title"
    >
      <div className="workforce-header">
        <h2 className="workforce-title" id="workforce-evolution-title">
          Évolution des effectifs
        </h2>

        <ul className="workforce-legend">
          <li>
            <span className="workforce-legend-dot employees" />
            Employés
          </li>
          <li>
            <span className="workforce-legend-dot contracts" />
            Contrats
          </li>
        </ul>
      </div>

      {renderContent()}
    </section>
  );
};

export default WorkforceEvolution;