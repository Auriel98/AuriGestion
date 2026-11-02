import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Receipt,
  FileText,
  BriefcaseBusiness,
  RefreshCw,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  CircleDollarSign,
  AlertCircle,
  Eye,
  Building2,
  Landmark,
} from "lucide-react";

import api from "../../api/api";
import "./Budget.css";

const formatMoney = (value) =>
  new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "XAF",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const formatNumber = (value) =>
  new Intl.NumberFormat("fr-FR", {
    maximumFractionDigits: 1,
  }).format(Number(value) || 0);

function getMarketName(market) {
  return (
    market.title ||
    market.name ||
    market.description ||
    `Marché ${market.market_number || ""}`
  );
}

function KPI({ title, value, icon: Icon, subtitle, trend }) {
  return (
    <article className="budget-kpi">
      <div className="budget-kpi-top">
        <p className="budget-kpi-title">{title}</p>

        <span className="budget-kpi-icon">
          <Icon size={22} />
        </span>
      </div>

      <h3>{value}</h3>

      <div className="budget-kpi-bottom">
        {subtitle && <span className="budget-kpi-subtitle">{subtitle}</span>}

        {trend === "up" && (
          <ArrowUpRight size={16} className="budget-trend-up" />
        )}

        {trend === "down" && (
          <ArrowDownRight size={16} className="budget-trend-down" />
        )}
      </div>
    </article>
  );
}

export default function Budget() {
  const navigate = useNavigate();

  const [dashboard, setDashboard] = useState(null);
  const [markets, setMarkets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [marginFilter, setMarginFilter] = useState("all");

  const loadData = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const [dashboardResponse, marketsResponse] = await Promise.all([
        api.get("/budget/dashboard"),
        api.get("/budget/rentabilite"),
      ]);

      const dashboardData =
        dashboardResponse?.data?.data ??
        dashboardResponse?.data ??
        dashboardResponse;

      const marketsData =
        marketsResponse?.data?.data ??
        marketsResponse?.data ??
        marketsResponse;

      setDashboard(dashboardData);

      setMarkets(
        Array.isArray(marketsData)
          ? marketsData
          : marketsData?.markets ||
              marketsData?.rentabilite ||
              marketsData?.data ||
              []
      );
    } catch (err) {
      console.error("Erreur chargement budget :", err);

      setError(
        err?.response?.data?.message ||
          "Impossible de charger les données du budget."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const summary = useMemo(() => {
    const data = dashboard || {};

    return {
      marketCount: Number(data.market_count ?? data.marketCount ?? 0),
      totalBudget: Number(data.total_budget ?? data.totalBudget ?? 0),
      totalSpent: Number(data.total_spent ?? data.totalSpent ?? 0),
      availableBudget: Number(
        data.available_budget ?? data.availableBudget ?? 0
      ),
      totalBilled: Number(data.total_billed ?? data.totalBilled ?? 0),
      totalCollected: Number(
        data.total_collected ?? data.totalCollected ?? 0
      ),
      outstanding: Number(
        data.outstanding_amount ?? data.outstandingAmount ?? 0
      ),
      estimatedMargin: Number(
        data.estimated_margin ?? data.estimatedMargin ?? 0
      ),
      generalExpenses: Number(
        data.general_expenses ?? data.generalExpenses ?? 0
      ),
      generalBilled: Number(data.general_billed ?? data.generalBilled ?? 0),
      generalCollected: Number(
        data.general_collected ?? data.generalCollected ?? 0
      ),
    };
  }, [dashboard]);

  const filteredMarkets = useMemo(() => {
    const query = search.trim().toLowerCase();

    return markets.filter((market) => {
      const searchableText = [
        market.market_number,
        market.title,
        market.name,
        market.description,
        market.client_name,
        market.client_company,
        market.status,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      const matchesSearch = !query || searchableText.includes(query);

      const margin = Number(
        market.estimated_margin ?? market.estimatedMargin ?? 0
      );

      const matchesMargin =
        marginFilter === "all" ||
        (marginFilter === "positive" && margin > 0) ||
        (marginFilter === "negative" && margin < 0) ||
        (marginFilter === "zero" && margin === 0);

      return matchesSearch && matchesMargin;
    });
  }, [markets, search, marginFilter]);

  const getValue = (market, snakeCase, camelCase) =>
    Number(market[snakeCase] ?? market[camelCase] ?? 0);

  if (loading && !dashboard) {
    return (
      <div className="budget-page">
        <div className="budget-loading">
          <RefreshCw className="budget-spinner" size={24} />
          <p>Chargement des données financières...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="budget-page">
      <header className="budget-header">
        <div>

          <p>
            Suivez les dépenses, les budgets disponibles et la rentabilité de
            vos marchés.
          </p>
        </div>

        <button
          type="button"
          className="budget-refresh"
          onClick={loadData}
          disabled={loading}
        >
          <RefreshCw size={17} className={loading ? "budget-spinner" : ""} />
          Actualiser
        </button>
      </header>

      {error && (
        <div className="budget-error">
          <AlertCircle size={20} />
          <span>{error}</span>

          <button type="button" onClick={loadData}>
            Réessayer
          </button>
        </div>
      )}

      {/* KPI */}
      <section className="budget-kpi-grid">
        <KPI
          title="Budget des marchés"
          value={formatMoney(summary.totalBudget)}
          icon={Wallet}
          subtitle={`${summary.marketCount} marché(s)`}
        />

        <KPI
          title="Dépenses validées"
          value={formatMoney(summary.totalSpent)}
          icon={Receipt}
          subtitle="Dépenses liées aux marchés"
          trend="down"
        />

        <KPI
          title="Budget disponible"
          value={formatMoney(summary.availableBudget)}
          icon={CircleDollarSign}
          subtitle="Après dépenses validées"
        />

        <KPI
          title="Montant facturé"
          value={formatMoney(summary.totalBilled)}
          icon={FileText}
          subtitle="Factures des marchés"
        />

        <KPI
          title="Montant encaissé"
          value={formatMoney(summary.totalCollected)}
          icon={Landmark}
          subtitle="Paiements enregistrés"
          trend="up"
        />

        <KPI
          title="Reste à encaisser"
          value={formatMoney(summary.outstanding)}
          icon={TrendingDown}
          subtitle="Montants non encore encaissés"
        />
      </section>

      {/* RENTABILITÉ GLOBALE */}
      <section className="budget-profit-banner">
        <div className="budget-profit-icon">
          <TrendingUp size={26} />
        </div>

        <div className="budget-profit-content">
          <span>MARGE ESTIMÉE DES MARCHÉS</span>

          <strong
            className={summary.estimatedMargin < 0 ? "negative-margin" : ""}
          >
            {formatMoney(summary.estimatedMargin)}
          </strong>

          <p>
            Calculée à partir du montant facturé moins les dépenses validées
            rattachées aux marchés.
          </p>
        </div>

        <div className="budget-profit-extra">
          <div>
            <span className="budget-extra-icon">
              <Receipt size={16} />
            </span>
            <div>
              <span>Dépenses générales validées</span>
              <strong>{formatMoney(summary.generalExpenses)}</strong>
            </div>
          </div>

          <div>
            <span className="budget-extra-icon">
              <FileText size={16} />
            </span>
            <div>
              <span>Facturation hors marché</span>
              <strong>{formatMoney(summary.generalBilled)}</strong>
            </div>
          </div>

          <div>
            <span className="budget-extra-icon">
              <Landmark size={16} />
            </span>
            <div>
              <span>Encaissements hors marché</span>
              <strong>{formatMoney(summary.generalCollected)}</strong>
            </div>
          </div>
        </div>
      </section>

      {/* RECHERCHE */}
      <div className="budget-filters">
        <div className="budget-search">
          <Search size={18} />

          <input
            type="search"
            placeholder="Rechercher un marché, un client..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <select
          value={marginFilter}
          onChange={(event) => setMarginFilter(event.target.value)}
          aria-label="Filtrer par marge"
        >
          <option value="all">Toutes les marges</option>
          <option value="positive">Marge positive</option>
          <option value="negative">Marge négative</option>
          <option value="zero">Marge nulle</option>
        </select>
      </div>

      {/* TABLEAU */}
      <section className="budget-table-section">
        <div className="budget-section-heading">
          <div>
            <h2>
              <BriefcaseBusiness size={20} />
              Rentabilité par marché
            </h2>

            <p>{filteredMarkets.length} marché(s) affiché(s)</p>
          </div>
        </div>

        <div className="budget-table-wrapper">
          <table className="budget-table">
            <thead>
              <tr>
                <th>MARCHÉ</th>
                <th>CLIENT</th>
                <th>BUDGET</th>
                <th>DÉPENSES</th>
                <th>DISPONIBLE</th>
                <th>FACTURÉ</th>
                <th>ENCAISSÉ</th>
                <th>À ENCAISSER</th>
                <th>MARGE</th>
                <th>ACTIONS</th>
              </tr>
            </thead>

            <tbody>
              {filteredMarkets.map((market) => {
                const budget = getValue(
                  market,
                  "adjusted_budget",
                  "adjustedBudget"
                );
                const spent = getValue(market, "total_spent", "totalSpent");
                const available = getValue(
                  market,
                  "available_budget",
                  "availableBudget"
                );
                const billed = getValue(
                  market,
                  "total_billed",
                  "totalBilled"
                );
                const collected = getValue(
                  market,
                  "total_collected",
                  "totalCollected"
                );
                const outstanding = getValue(
                  market,
                  "outstanding_amount",
                  "outstandingAmount"
                );
                const margin = getValue(
                  market,
                  "estimated_margin",
                  "estimatedMargin"
                );
                const marginPercent = getValue(
                  market,
                  "margin_percent",
                  "marginPercent"
                );

                return (
                  <tr
                    key={market.id}
                    onClick={() => navigate(`/marches/${market.id}`)}
                    className="budget-clickable-row"
                  >
                    <td>
                      <div className="budget-market-name">
                        <strong>{market.market_number || "Marché"}</strong>
                        <span>{getMarketName(market)}</span>
                      </div>
                    </td>

                    <td>
                      <div className="budget-client">
                        <Building2 size={15} />
                        {market.client_name || market.client_company || "—"}
                      </div>
                    </td>

                    <td className="budget-bold">{formatMoney(budget)}</td>

                    <td className="budget-expense-value">
                      {formatMoney(spent)}
                    </td>

                    <td
                      className={
                        available < 0
                          ? "budget-negative-value"
                          : "budget-positive-value"
                      }
                    >
                      {formatMoney(available)}
                    </td>

                    <td className="budget-bold">{formatMoney(billed)}</td>

                    <td className="budget-positive-value">
                      {formatMoney(collected)}
                    </td>

                    <td className="budget-bold">
                      {formatMoney(outstanding)}
                    </td>

                    <td>
                      <span
                        className={
                          margin < 0
                            ? "budget-pill negative"
                            : "budget-pill positive"
                        }
                      >
                        {margin < 0 ? (
                          <TrendingDown size={13} />
                        ) : (
                          <TrendingUp size={13} />
                        )}
                        {formatMoney(margin)} · {formatNumber(marginPercent)} %
                      </span>
                    </td>

                    <td>
                      <button
                        type="button"
                        className="budget-action-btn"
                        title="Voir le marché"
                        onClick={(event) => {
                          event.stopPropagation();
                          navigate(`/marches/${market.id}`);
                        }}
                      >
                        <Eye size={17} />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {!filteredMarkets.length && (
                <tr>
                  <td colSpan={10} className="budget-empty">
                    <BriefcaseBusiness size={30} />

                    <strong>Aucun marché trouvé</strong>

                    <span>
                      Vérifiez vos filtres ou créez un marché pour commencer.
                    </span>

                    <button type="button" onClick={() => navigate("/marches")}>
                      Consulter les marchés
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="budget-table-footer">
          <span>Les montants sont exprimés en FCFA (XAF).</span>
          <span>Cliquez sur un marché pour consulter son détail.</span>
        </div>
      </section>
    </div>
  );
}