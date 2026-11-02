import { Fragment, useEffect, useState } from "react";

import { ChevronDown, ChevronRight, ChevronLeft } from "lucide-react";

import { API_URL } from "../api/api";

import "./AuditLogs.css";

const PAGE_SIZE = 20;

const ACTION_LABELS = {
  INSERT: { label: "Création", color: "green" },
  UPDATE: { label: "Modification", color: "blue" },
  DELETE: { label: "Suppression", color: "red" },
};

const TABLE_LABELS = {
  users: "Utilisateurs",
  services: "Services",
  employees: "Employés",
  employee_contracts: "Contrats",
  employee_documents: "Documents employés",
  payroll_settings: "Paramètres de paie",
  payroll_components: "Rubriques de paie",
  payroll_periods: "Périodes de paie",
  payroll_slips: "Bulletins de paie",
  clients: "Clients",
  quotes: "Devis",
  markets: "Marchés",
  market_budget_movements: "Mouvements de budget",
  invoices: "Factures",
  invoice_payments: "Paiements",
  expense_categories: "Catégories de dépenses",
  expenses: "Dépenses",
};

const getTableLabel = (name) => TABLE_LABELS[name] || name;

const formatDateTime = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "-";

  return new Intl.DateTimeFormat("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
};

const formatValue = (value) => {
  if (value === null || value === undefined || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value);
  if (typeof value === "boolean") return value ? "Oui" : "Non";
  return String(value);
};

// Détail d'une ligne : champs modifiés, ou valeurs créées / supprimées
const renderDetails = (item) => {
  if (item.action === "UPDATE" && item.changedFields) {
    const entries = Object.entries(item.changedFields);

    return (
      <table className="audit-detail-table">
        <thead>
          <tr>
            <th>Champ</th>
            <th>Ancienne valeur</th>
            <th>Nouvelle valeur</th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([field, change]) => (
            <tr key={field}>
              <td className="audit-field">{field}</td>
              <td className="audit-old">{formatValue(change?.old)}</td>
              <td className="audit-new">{formatValue(change?.new)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  const data = item.action === "INSERT" ? item.newData : item.oldData;

  if (!data) {
    return <p className="audit-detail-empty">Aucun détail disponible.</p>;
  }

  return (
    <table className="audit-detail-table">
      <thead>
        <tr>
          <th>Champ</th>
          <th>{item.action === "INSERT" ? "Valeur créée" : "Valeur supprimée"}</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(data).map(([field, value]) => (
          <tr key={field}>
            <td className="audit-field">{field}</td>
            <td>{formatValue(value)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const emptyFilters = {
  userId: "",
  action: "",
  tableName: "",
  dateFrom: "",
  dateTo: "",
};

const AuditLogs = () => {
  const [filters, setFilters] = useState(emptyFilters);
  const [filterOptions, setFilterOptions] = useState({
    users: [],
    tables: [],
  });

  const [items, setItems] = useState([]);
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });

  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retryCount, setRetryCount] = useState(0);

  const getToken = () => {
    const token = localStorage.getItem("token");

    if (!token) {
      throw new Error("Vous devez vous connecter.");
    }

    return token;
  };

  // Valeurs des listes de filtres (chargées une seule fois)
  useEffect(() => {
    const controller = new AbortController();

    const fetchFilters = async () => {
      try {
        const response = await fetch(`${API_URL}/audit-logs/filters`, {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${getToken()}`,
          },
          signal: controller.signal,
        });

        const result = await response.json();

        if (response.ok && result.success) {
          setFilterOptions(result.data);
        }
      } catch (err) {
        if (err.name !== "AbortError") {
          console.error("Erreur de chargement des filtres :", err);
        }
      }
    };

    fetchFilters();

    return () => controller.abort();
  }, []);

  // Liste du journal
  useEffect(() => {
    const controller = new AbortController();

    const fetchLogs = async () => {
      try {
        setLoading(true);
        setError("");

        const params = new URLSearchParams({
          page: String(page),
          limit: String(PAGE_SIZE),
        });

        Object.entries(filters).forEach(([key, value]) => {
          if (value) params.append(key, value);
        });

        const response = await fetch(
          `${API_URL}/audit-logs?${params.toString()}`,
          {
            headers: {
              Accept: "application/json",
              Authorization: `Bearer ${getToken()}`,
            },
            signal: controller.signal,
          }
        );

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Impossible de récupérer le journal d'audit."
          );
        }

        if (!result.success || !Array.isArray(result.data)) {
          throw new Error("Réponse inattendue du serveur.");
        }

        setItems(result.data);
        setPagination(result.pagination);
        setExpandedId(null);
      } catch (err) {
        if (err.name === "AbortError") {
          return;
        }

        console.error("Erreur de chargement du journal :", err);
        setError(err.message);
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchLogs();

    return () => controller.abort();
  }, [filters, page, retryCount]);

  const handleFilterChange = (event) => {
    const { name, value } = event.target;

    setFilters((current) => ({ ...current, [name]: value }));
    setPage(1);
  };

  const handleReset = () => {
    setFilters(emptyFilters);
    setPage(1);
  };

  const hasFilters = Object.values(filters).some(Boolean);

  const renderContent = () => {
    if (loading) {
      return <div className="audit-state">Chargement...</div>;
    }

    if (error) {
      return (
        <div className="audit-state error" role="alert">
          <span>{error}</span>

          <button type="button" onClick={() => setRetryCount((c) => c + 1)}>
            Réessayer
          </button>
        </div>
      );
    }

    if (items.length === 0) {
      return (
        <div className="audit-state">
          Aucune entrée ne correspond à ces critères.
        </div>
      );
    }

    return (
      <div className="audit-table-wrapper">
        <table className="audit-table">
          <thead>
            <tr>
              <th aria-label="Détail" />
              <th>Date</th>
              <th>Utilisateur</th>
              <th>Action</th>
              <th>Élément</th>
            </tr>
          </thead>

          <tbody>
            {items.map((item) => {
              const action = ACTION_LABELS[item.action] || {
                label: item.action,
                color: "blue",
              };
              const isOpen = expandedId === item.id;

              return (
                <Fragment key={item.id}>
                  <tr
                    className={isOpen ? "audit-row open" : "audit-row"}
                    onClick={() => setExpandedId(isOpen ? null : item.id)}
                  >
                    <td className="audit-toggle">
                      {isOpen ? <ChevronDown /> : <ChevronRight />}
                    </td>
                    <td className="audit-date">
                      {formatDateTime(item.createdAt)}
                    </td>
                    <td>{item.userName || "Système"}</td>
                    <td>
                      <span className={`audit-badge ${action.color}`}>
                        {action.label}
                      </span>
                    </td>
                    <td>{getTableLabel(item.tableName)}</td>
                  </tr>

                  {isOpen && (
                    <tr className="audit-detail-row">
                      <td colSpan={5}>{renderDetails(item)}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  };

  return (
    <main className="audit-page">
      <div className="audit-header">
        <h1 className="audit-title">Journal d'audit</h1>
        <p className="audit-description">
          Historique des créations, modifications et suppressions, avec
          l'utilisateur qui les a effectuées.
        </p>
      </div>

      <section className="audit-card">
        <div className="audit-filters">
          <label>
            Utilisateur
            <select
              name="userId"
              value={filters.userId}
              onChange={handleFilterChange}
            >
              <option value="">Tous</option>
              {filterOptions.users.map((user) => (
                <option key={user.id} value={user.id}>
                  {user.name}
                </option>
              ))}
            </select>
          </label>

          <label>
            Action
            <select
              name="action"
              value={filters.action}
              onChange={handleFilterChange}
            >
              <option value="">Toutes</option>
              <option value="INSERT">Création</option>
              <option value="UPDATE">Modification</option>
              <option value="DELETE">Suppression</option>
            </select>
          </label>

          <label>
            Élément
            <select
              name="tableName"
              value={filters.tableName}
              onChange={handleFilterChange}
            >
              <option value="">Tous</option>
              {filterOptions.tables.map((table) => (
                <option key={table} value={table}>
                  {getTableLabel(table)}
                </option>
              ))}
            </select>
          </label>

          <label>
            Du
            <input
              type="date"
              name="dateFrom"
              value={filters.dateFrom}
              onChange={handleFilterChange}
            />
          </label>

          <label>
            Au
            <input
              type="date"
              name="dateTo"
              value={filters.dateTo}
              onChange={handleFilterChange}
            />
          </label>

          {hasFilters && (
            <button
              type="button"
              className="audit-reset"
              onClick={handleReset}
            >
              Réinitialiser
            </button>
          )}
        </div>

        {renderContent()}

        {!loading && !error && items.length > 0 && (
          <div className="audit-pagination">
            <span>
              Page {pagination.page} sur {pagination.totalPages} (
              {pagination.total} entrées)
            </span>

            <div className="audit-pagination-buttons">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                <ChevronLeft /> Précédent
              </button>

              <button
                type="button"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                Suivant <ChevronRight />
              </button>
            </div>
          </div>
        )}
      </section>
    </main>
  );
};

export default AuditLogs;