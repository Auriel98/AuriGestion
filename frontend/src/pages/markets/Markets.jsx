import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  MoreVertical,
  BriefcaseBusiness,
  Play,
  CheckCircle2,
  PauseCircle,
  XCircle,
  FileText,
  Wallet,
  TrendingUp,
} from "lucide-react";

import api from "../../api/api";
import "./Markets.css";

const STATUS_LABELS = {
  draft: "Brouillon",
  active: "Actif",
  completed: "Terminé",
  suspended: "Suspendu",
  cancelled: "Annulé",
};

const STATUS_CLASSES = {
  draft: "market-status-draft",
  active: "market-status-active",
  completed: "market-status-completed",
  suspended: "market-status-suspended",
  cancelled: "market-status-cancelled",
};

const formatMoney = (value) => {
  return `${Number(value || 0).toLocaleString("fr-FR")} FCFA`;
};

const formatDate = (value) => {
  if (!value) return "—";

  return new Date(value).toLocaleDateString("fr-FR");
};

const emptyForm = {
  client_id: "",
  quote_id: "",
  title: "",
  description: "",
  start_date: "",
  end_date: "",
  contract_amount: "",
  initial_budget: "",
  notes: "",
};

export default function Markets() {
  const navigate = useNavigate();

  const [markets, setMarkets] = useState([]);
  const [clients, setClients] = useState([]);
  const [quotes, setQuotes] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    active: 0,
    completed: 0,
    suspended: 0,
    cancelled: 0,
    total_contract_amount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingMarket, setEditingMarket] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [actionMenu, setActionMenu] = useState(null);

  /**
   * =====================================================
   * CHARGEMENT
   * =====================================================
   */

  const loadMarkets = async () => {
    try {
      setLoading(true);

      const [marketsResponse, statsResponse] = await Promise.all([
        api.get("/markets"),
        api.get("/markets/stats"),
      ]);

      setMarkets(marketsResponse);
      setStats(statsResponse);
    } catch (error) {
      console.error("Erreur chargement marchés :", error);

      alert(
        error.message || "Impossible de charger les marchés."
      );
    } finally {
      setLoading(false);
    }
  };

  const loadClients = async () => {
    try {
      const response = await api.get("/clients");

      setClients(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Erreur chargement clients :", error);
      setClients([]);
    }
  };

  const loadQuotes = async () => {
    try {
      const response = await api.get("/quotes");

      setQuotes(Array.isArray(response) ? response : []);
    } catch (error) {
      console.error("Erreur chargement devis :", error);
      setQuotes([]);
    }
  };

  useEffect(() => {
    loadMarkets();
    loadClients();
    loadQuotes();
  }, []);

  /**
   * =====================================================
   * RECHERCHE / FILTRE
   * =====================================================
   */

  const filteredMarkets = useMemo(() => {
    const value = search.trim().toLowerCase();

    return markets.filter((market) => {
      const matchesSearch =
        !value ||
        market.market_number?.toLowerCase().includes(value) ||
        market.title?.toLowerCase().includes(value) ||
        market.client_name?.toLowerCase().includes(value);

      const matchesStatus =
        !statusFilter || market.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [markets, search, statusFilter]);

  /**
   * =====================================================
   * FORMULAIRE
   * =====================================================
   */

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const openCreateModal = () => {
    setEditingMarket(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEditModal = (market) => {
    setEditingMarket(market);

    setForm({
      client_id: market.client_id || "",
      quote_id: market.quote_id || "",
      title: market.title || "",
      description: market.description || "",
      start_date: market.start_date
        ? market.start_date.substring(0, 10)
        : "",
      end_date: market.end_date
        ? market.end_date.substring(0, 10)
        : "",
      contract_amount: market.contract_amount || "",
      initial_budget: "",
      notes: market.notes || "",
    });

    setActionMenu(null);
    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingMarket(null);
    setForm(emptyForm);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.client_id) {
      alert("Veuillez sélectionner un client.");
      return;
    }

    if (!form.title.trim()) {
      alert("Veuillez saisir le titre du marché.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        client_id: form.client_id,
        quote_id: form.quote_id || null,
        title: form.title.trim(),
        description: form.description || null,
        start_date: form.start_date || null,
        end_date: form.end_date || null,
        contract_amount:
          Number(form.contract_amount || 0),
        notes: form.notes || null,
      };

      if (!editingMarket) {
        payload.initial_budget =
          Number(form.initial_budget || 0);

        await api.post("/markets", payload);
      } else {
        await api.put(
          `/markets/${editingMarket.id}`,
          payload
        );
      }

      closeModal();
      await loadMarkets();
    } catch (error) {
      console.error("Erreur sauvegarde marché :", error);

      alert(
        error.message ||
          "Impossible d'enregistrer le marché."
      );
    } finally {
      setSaving(false);
    }
  };

  /**
   * =====================================================
   * STATUT
   * =====================================================
   */

  const changeStatus = async (market, status) => {
    setActionMenu(null);

    try {
      await api.patch(
        `/markets/${market.id}/status`,
        { status }
      );

      await loadMarkets();
    } catch (error) {
      console.error("Erreur statut :", error);

      alert(
        error.message ||
          "Impossible de modifier le statut."
      );
    }
  };

  /**
   * =====================================================
   * SUPPRESSION
   * =====================================================
   */

  const handleDelete = async (market) => {
    setActionMenu(null);

    const confirmed = window.confirm(
      `Voulez-vous vraiment supprimer le marché "${market.title}" ?`
    );

    if (!confirmed) return;

    try {
      await api.delete(`/markets/${market.id}`);

      await loadMarkets();
    } catch (error) {
      console.error("Erreur suppression :", error);

      alert(
        error.message ||
          "Impossible de supprimer le marché."
      );
    }
  };

  /**
   * =====================================================
   * AFFICHAGE
   * =====================================================
   */

  return (
    <div className="markets-page">

      {/* HEADER */}
      <div className="markets-header">
        <div>
          <div className="markets-title-row">
            <div className="markets-title-icon">
              <BriefcaseBusiness size={22} />
            </div>

            <div>

              <p>
                Gérez vos marchés, contrats et budgets.
              </p>
            </div>
          </div>
        </div>

        <button
          className="markets-primary-button"
          onClick={openCreateModal}
        >
          <Plus size={18} />
          Nouveau marché
        </button>
      </div>

      {/* MINI DASHBOARD */}
      <div className="markets-stats-grid">

        <div className="market-stat-card">
          <div className="market-stat-icon">
            <BriefcaseBusiness size={20} />
          </div>

          <div>
            <span>Total marchés</span>
            <strong>{stats.total || 0}</strong>
          </div>
        </div>

        <div className="market-stat-card">
          <div className="market-stat-icon">
            <Play size={20} />
          </div>

          <div>
            <span>Actifs</span>
            <strong>{stats.active || 0}</strong>
          </div>
        </div>

        <div className="market-stat-card">
          <div className="market-stat-icon">
            <CheckCircle2 size={20} />
          </div>

          <div>
            <span>Terminés</span>
            <strong>{stats.completed || 0}</strong>
          </div>
        </div>

        <div className="market-stat-card">
          <div className="market-stat-icon">
            <Wallet size={20} />
          </div>

          <div>
            <span>Montant contrats</span>
            <strong>
              {formatMoney(
                stats.total_contract_amount
              )}
            </strong>
          </div>
        </div>

      </div>

      {/* TOOLBAR */}
      <div className="markets-toolbar">

        <div className="markets-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Rechercher un marché, client..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />
        </div>

        <select
          value={statusFilter}
          onChange={(event) =>
            setStatusFilter(event.target.value)
          }
          className="markets-status-filter"
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillons</option>
          <option value="active">Actifs</option>
          <option value="completed">Terminés</option>
          <option value="suspended">Suspendus</option>
          <option value="cancelled">Annulés</option>
        </select>

      </div>

      {/* TABLE */}
      <div className="markets-card">

        {loading ? (
          <div className="markets-empty">
            Chargement des marchés...
          </div>
        ) : filteredMarkets.length === 0 ? (
          <div className="markets-empty">

            <BriefcaseBusiness size={42} />

            <h3>Aucun marché trouvé</h3>

            <p>
              Commencez par créer votre premier marché.
            </p>

            <button
              className="markets-primary-button"
              onClick={openCreateModal}
            >
              <Plus size={18} />
              Nouveau marché
            </button>

          </div>
        ) : (
          <div className="markets-table-wrapper">

            <table className="markets-table">

              <thead>
                <tr>
                  <th>Marché</th>
                  <th>Client</th>
                  <th>Période</th>
                  <th>Contrat</th>
                  <th>Budget disponible</th>
                  <th>Facturé</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>

                {filteredMarkets.map((market) => (

                  <tr key={market.id}>

                    <td>
                      <div className="market-main-info">

                        <strong>
                          {market.market_number}
                        </strong>

                        <span>
                          {market.title}
                        </span>

                      </div>
                    </td>

                    <td>
                      <span className="market-client">
                        {market.client_name}
                      </span>
                    </td>

                    <td>
                      <div className="market-period">

                        <span>
                          {formatDate(
                            market.start_date
                          )}
                        </span>

                        <span>→</span>

                        <span>
                          {formatDate(
                            market.end_date
                          )}
                        </span>

                      </div>
                    </td>

                    <td>
                      <strong>
                        {formatMoney(
                          market.contract_amount
                        )}
                      </strong>
                    </td>

                    <td>
                      <div className="market-money-info">

                        <strong>
                          {formatMoney(
                            market.available_budget
                          )}
                        </strong>

                        <small>
                          Dépensé :{" "}
                          {formatMoney(
                            market.spent_amount
                          )}
                        </small>

                      </div>
                    </td>

                    <td>
                      <div className="market-money-info">

                        <strong>
                          {formatMoney(
                            market.billed_amount
                          )}
                        </strong>

                        <small>
                          Encaissé :{" "}
                          {formatMoney(
                            market.collected_amount
                          )}
                        </small>

                      </div>
                    </td>

                    <td>
                      <span
                        className={`market-status ${
                          STATUS_CLASSES[
                            market.status
                          ] || ""
                        }`}
                      >
                        {STATUS_LABELS[
                          market.status
                        ] || market.status}
                      </span>
                    </td>

                    <td>

                      <div className="market-actions">

                        <button
                          className="market-action-button"
                          title="Voir"
                          onClick={() =>
                            navigate(
                              `/marches/${market.id}`
                            )
                          }
                        >
                          <Eye size={17} />
                        </button>

                        <button
                          className="market-action-button"
                          title="Modifier"
                          onClick={() =>
                            openEditModal(market)
                          }
                        >
                          <Pencil size={17} />
                        </button>

                        <button
                          className="market-action-button"
                          title="Actions"
                          onClick={() =>
                            setActionMenu(
                              actionMenu === market.id
                                ? null
                                : market.id
                            )
                          }
                        >
                          <MoreVertical size={17} />
                        </button>

                        {actionMenu === market.id && (

                          <div className="market-action-menu">

                            {market.status !== "active" && (
                              <button
                                onClick={() =>
                                  changeStatus(
                                    market,
                                    "active"
                                  )
                                }
                              >
                                <Play size={15} />
                                Activer
                              </button>
                            )}

                            {market.status !== "completed" && (
                              <button
                                onClick={() =>
                                  changeStatus(
                                    market,
                                    "completed"
                                  )
                                }
                              >
                                <CheckCircle2 size={15} />
                                Terminer
                              </button>
                            )}

                            {market.status !== "suspended" && (
                              <button
                                onClick={() =>
                                  changeStatus(
                                    market,
                                    "suspended"
                                  )
                                }
                              >
                                <PauseCircle size={15} />
                                Suspendre
                              </button>
                            )}

                            {market.status !== "cancelled" && (
                              <button
                                onClick={() =>
                                  changeStatus(
                                    market,
                                    "cancelled"
                                  )
                                }
                              >
                                <XCircle size={15} />
                                Annuler
                              </button>
                            )}

                            <button
                              className="danger"
                              onClick={() =>
                                handleDelete(market)
                              }
                            >
                              <Trash2 size={15} />
                              Supprimer
                            </button>

                          </div>
                        )}

                      </div>

                    </td>

                  </tr>

                ))}

              </tbody>

            </table>

          </div>
        )}

      </div>

      {/* MODAL */}
      {showModal && (

        <div
          className="markets-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeModal();
            }
          }}
        >

          <div className="markets-modal">

            <div className="markets-modal-header">

              <div>
                <h2>
                  {editingMarket
                    ? "Modifier le marché"
                    : "Nouveau marché"}
                </h2>

                <p>
                  {editingMarket
                    ? "Modifiez les informations du marché."
                    : "Créez un nouveau marché."}
                </p>
              </div>

              <button
                className="markets-modal-close"
                onClick={closeModal}
              >
                ×
              </button>

            </div>

            <form
              className="markets-form"
              onSubmit={handleSubmit}
            >

              <div className="markets-form-grid">

                <div className="markets-form-group">

                  <label>Client *</label>

                  <select
                    name="client_id"
                    value={form.client_id}
                    onChange={handleChange}
                    required
                  >
                    <option value="">
                      Sélectionner un client
                    </option>

                    {clients.map((client) => (
                      <option
                        key={client.id}
                        value={client.id}
                      >
                        {client.name}
                      </option>
                    ))}
                  </select>

                </div>

                <div className="markets-form-group">

                  <label>Devis lié</label>

                  <select
                    name="quote_id"
                    value={form.quote_id}
                    onChange={handleChange}
                  >
                    <option value="">
                      Aucun devis
                    </option>

                    {quotes.map((quote) => (
                      <option
                        key={quote.id}
                        value={quote.id}
                      >
                        {quote.quote_number}
                        {quote.client_name
                          ? ` — ${quote.client_name}`
                          : ""}
                      </option>
                    ))}
                  </select>

                </div>

                <div className="markets-form-group full">

                  <label>Titre du marché *</label>

                  <input
                    type="text"
                    name="title"
                    value={form.title}
                    onChange={handleChange}
                    placeholder="Ex : Nettoyage industriel EGENEM"
                    required
                  />

                </div>

                <div className="markets-form-group full">

                  <label>Description</label>

                  <textarea
                    name="description"
                    value={form.description}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Description du marché..."
                  />

                </div>

                <div className="markets-form-group">

                  <label>Date de début</label>

                  <input
                    type="date"
                    name="start_date"
                    value={form.start_date}
                    onChange={handleChange}
                  />

                </div>

                <div className="markets-form-group">

                  <label>Date de fin</label>

                  <input
                    type="date"
                    name="end_date"
                    value={form.end_date}
                    onChange={handleChange}
                  />

                </div>

                <div className="markets-form-group">

                  <label>Montant du contrat</label>

                  <input
                    type="number"
                    min="0"
                    step="1"
                    name="contract_amount"
                    value={form.contract_amount}
                    onChange={handleChange}
                    placeholder="0"
                  />

                </div>

                {!editingMarket && (
                  <div className="markets-form-group">

                    <label>Budget initial</label>

                    <input
                      type="number"
                      min="0"
                      step="1"
                      name="initial_budget"
                      value={form.initial_budget}
                      onChange={handleChange}
                      placeholder="0"
                    />

                  </div>
                )}

                <div className="markets-form-group full">

                  <label>Notes</label>

                  <textarea
                    name="notes"
                    value={form.notes}
                    onChange={handleChange}
                    rows="3"
                    placeholder="Notes internes..."
                  />

                </div>

              </div>

              <div className="markets-form-footer">

                <button
                  type="button"
                  className="markets-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="markets-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : editingMarket
                    ? "Enregistrer"
                    : "Créer le marché"}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
}