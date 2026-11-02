import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Receipt,
  CheckCircle2,
  Clock3,
  XCircle,
  Pencil,
  Trash2,
  Eye,
  Check,
  Ban,
  RefreshCw,
} from "lucide-react";

import api from "../../api/api";
import "./Expenses.css";

const initialForm = {
  market_id: "",
  category_id: "",
  expense_date: new Date().toISOString().slice(0, 10),
  description: "",
  supplier_name: "",
  amount: "",
  payment_method: "bank_transfer",
  payment_reference: "",
  receipt_url: "",
  notes: "",
};

const paymentMethods = [
  { value: "cash", label: "Espèces" },
  { value: "bank_transfer", label: "Virement bancaire" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "cheque", label: "Chèque" },
  { value: "other", label: "Autre" },
];

const statusLabels = {
  draft: "Brouillon",
  validated: "Validée",
  cancelled: "Annulée",
};

const formatMoney = (value) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value || 0)) + " FCFA";

const formatDate = (value) => {
  if (!value) return "-";

  return new Date(value).toLocaleDateString("fr-FR");
};

export default function Expenses() {
  const navigate = useNavigate();

  const [expenses, setExpenses] = useState([]);
  const [categories, setCategories] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [stats, setStats] = useState(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [marketFilter, setMarketFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [form, setForm] = useState(initialForm);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    try {
      setLoading(true);

      const [
        expensesResponse,
        statsResponse,
        categoriesResponse,
        marketsResponse,
      ] = await Promise.all([
        api.get("/expenses"),
        api.get("/expenses/stats"),
        api.get("/expenses/categories"),
        api.get("/markets"),
      ]);

      setExpenses(expensesResponse.data || []);
      setStats(statsResponse.data || {});
      setCategories(categoriesResponse.data || []);
      setMarkets(marketsResponse.data || []);
    } catch (error) {
      console.error("Erreur chargement dépenses:", error);

      // Les dépenses restent utilisables même si les marchés
      // ne sont pas encore disponibles.
      try {
        const [expensesResponse, statsResponse, categoriesResponse] =
          await Promise.all([
            api.get("/expenses"),
            api.get("/expenses/stats"),
            api.get("/expenses/categories"),
          ]);

        setExpenses(expensesResponse.data || []);
        setStats(statsResponse.data || {});
        setCategories(categoriesResponse.data || []);
      } catch (fallbackError) {
        console.error(fallbackError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredExpenses = useMemo(() => {
    const query = search.trim().toLowerCase();

    return expenses.filter((expense) => {
      const matchesSearch =
        !query ||
        expense.expense_number?.toLowerCase().includes(query) ||
        expense.description?.toLowerCase().includes(query) ||
        expense.supplier_name?.toLowerCase().includes(query);

      const matchesStatus =
        !statusFilter || expense.status === statusFilter;

      const matchesMarket =
        !marketFilter || expense.market_id === marketFilter;

      const matchesCategory =
        !categoryFilter || expense.category_id === categoryFilter;

      return (
        matchesSearch &&
        matchesStatus &&
        matchesMarket &&
        matchesCategory
      );
    });
  }, [
    expenses,
    search,
    statusFilter,
    marketFilter,
    categoryFilter,
  ]);

  const openCreateModal = () => {
    setEditingExpense(null);
    setForm({
      ...initialForm,
      expense_date: new Date().toISOString().slice(0, 10),
    });
    setShowModal(true);
  };

  const openEditModal = (expense) => {
    if (expense.status !== "draft") {
      alert("Seules les dépenses en brouillon peuvent être modifiées.");
      return;
    }

    setEditingExpense(expense);

    setForm({
      market_id: expense.market_id || "",
      category_id: expense.category_id || "",
      expense_date: expense.expense_date
        ? expense.expense_date.slice(0, 10)
        : "",
      description: expense.description || "",
      supplier_name: expense.supplier_name || "",
      amount: expense.amount || "",
      payment_method: expense.payment_method || "other",
      payment_reference: expense.payment_reference || "",
      receipt_url: expense.receipt_url || "",
      notes: expense.notes || "",
    });

    setShowModal(true);
  };

  const closeModal = () => {
    if (saving) return;

    setShowModal(false);
    setEditingExpense(null);
    setForm(initialForm);
  };

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.description.trim()) {
      alert("La description est obligatoire.");
      return;
    }

    if (!form.amount || Number(form.amount) <= 0) {
      alert("Le montant doit être supérieur à 0.");
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        market_id: form.market_id || null,
        category_id: form.category_id || null,
        amount: Number(form.amount),
      };

      if (editingExpense) {
        await api.put(
          `/expenses/${editingExpense.id}`,
          payload
        );
      } else {
        await api.post("/expenses", payload);
      }

      closeModal();
      await loadData();
    } catch (error) {
      console.error("Erreur sauvegarde dépense:", error);

      alert(
        error?.message ||
          "Impossible d'enregistrer la dépense."
      );
    } finally {
      setSaving(false);
    }
  };

  const updateStatus = async (expense, status) => {
    const label =
      status === "validated"
        ? "valider"
        : status === "cancelled"
        ? "annuler"
        : "modifier";

    if (
      !window.confirm(
        `Voulez-vous vraiment ${label} la dépense ${expense.expense_number} ?`
      )
    ) {
      return;
    }

    try {
      await api.patch(`/expenses/${expense.id}/status`, {
        status,
      });

      await loadData();
    } catch (error) {
      console.error(error);
      alert(
        error?.message ||
          "Impossible de modifier le statut."
      );
    }
  };

  const deleteExpense = async (expense) => {
    if (expense.status !== "draft") {
      alert(
        "Seules les dépenses en brouillon peuvent être supprimées."
      );
      return;
    }

    if (
      !window.confirm(
        `Supprimer la dépense ${expense.expense_number} ?`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/expenses/${expense.id}`);
      await loadData();
    } catch (error) {
      console.error(error);
      alert(
        error?.message ||
          "Impossible de supprimer la dépense."
      );
    }
  };

  const getStatusClass = (status) => {
    if (status === "validated") return "expense-status validated";
    if (status === "cancelled") return "expense-status cancelled";

    return "expense-status draft";
  };

  return (
    <div className="expenses-page">
      {/* HEADER */}
      <div className="expenses-header">
        <div>
          <p>
            Suivez les dépenses générales et celles liées aux
            marchés.
          </p>
        </div>

        <button
          className="expense-primary-button"
          onClick={openCreateModal}
        >
          <Plus size={18} />
          Nouvelle dépense
        </button>
      </div>

      {/* MINI DASHBOARD */}
      <div className="expenses-stats">
        <div className="expense-stat-card">
          <div className="expense-stat-icon">
            <Receipt size={21} />
          </div>

          <div>
            <span>Total dépenses</span>
            <strong>{stats?.total || 0}</strong>
          </div>
        </div>

        <div className="expense-stat-card">
          <div className="expense-stat-icon success">
            <CheckCircle2 size={21} />
          </div>

          <div>
            <span>Validées</span>
            <strong>{stats?.validated || 0}</strong>
          </div>
        </div>

        <div className="expense-stat-card">
          <div className="expense-stat-icon warning">
            <Clock3 size={21} />
          </div>

          <div>
            <span>Brouillons</span>
            <strong>{stats?.draft || 0}</strong>
          </div>
        </div>

        <div className="expense-stat-card">
          <div className="expense-stat-icon danger">
            <XCircle size={21} />
          </div>

          <div>
            <span>Annulées</span>
            <strong>{stats?.cancelled || 0}</strong>
          </div>
        </div>

        <div className="expense-stat-card amount">
          <div className="expense-stat-icon">
            <Receipt size={21} />
          </div>

          <div>
            <span>Total validé</span>
            <strong>
              {formatMoney(stats?.total_validated)}
            </strong>
          </div>
        </div>

        <div className="expense-stat-card amount">
          <div className="expense-stat-icon">
            <Receipt size={21} />
          </div>

          <div>
            <span>Ce mois</span>
            <strong>
              {formatMoney(stats?.current_month_total)}
            </strong>
          </div>
        </div>
      </div>

      {/* FILTRES */}
      <div className="expenses-toolbar">
        <div className="expense-search">
          <Search size={18} />

          <input
            type="text"
            placeholder="Rechercher une dépense..."
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
        >
          <option value="">Tous les statuts</option>
          <option value="draft">Brouillons</option>
          <option value="validated">Validées</option>
          <option value="cancelled">Annulées</option>
        </select>

        <select
          value={marketFilter}
          onChange={(event) =>
            setMarketFilter(event.target.value)
          }
        >
          <option value="">Tous les marchés</option>

          {markets.map((market) => (
            <option key={market.id} value={market.id}>
              {market.market_number} — {market.title}
            </option>
          ))}
        </select>

        <select
          value={categoryFilter}
          onChange={(event) =>
            setCategoryFilter(event.target.value)
          }
        >
          <option value="">Toutes les catégories</option>

          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>

        <button
          className="expense-refresh-button"
          onClick={loadData}
          title="Actualiser"
        >
          <RefreshCw size={18} />
        </button>
      </div>

      {/* TABLE */}
      <div className="expenses-card">
        <div className="expenses-card-header">
          <div>
            <h2>Liste des dépenses</h2>
            <span>
              {filteredExpenses.length} dépense
              {filteredExpenses.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {loading ? (
          <div className="expenses-empty">
            Chargement des dépenses...
          </div>
        ) : filteredExpenses.length === 0 ? (
          <div className="expenses-empty">
            <Receipt size={42} />
            <h3>Aucune dépense</h3>
            <p>
              Commencez par enregistrer votre première dépense.
            </p>

            <button
              className="expense-primary-button"
              onClick={openCreateModal}
            >
              <Plus size={17} />
              Ajouter une dépense
            </button>
          </div>
        ) : (
          <div className="expenses-table-wrapper">
            <table className="expenses-table">
              <thead>
                <tr>
                  <th>Numéro</th>
                  <th>Date</th>
                  <th>Description</th>
                  <th>Catégorie</th>
                  <th>Marché</th>
                  <th>Montant</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredExpenses.map((expense) => (
                  <tr key={expense.id}>
                    <td>
                      <strong>{expense.expense_number}</strong>
                    </td>

                    <td>
                      {formatDate(expense.expense_date)}
                    </td>

                    <td>
                      <div className="expense-description">
                        <strong>{expense.description}</strong>

                        {expense.supplier_name && (
                          <span>
                            {expense.supplier_name}
                          </span>
                        )}
                      </div>
                    </td>

                    <td>
                      {expense.category_name || (
                        <span className="muted">Non classée</span>
                      )}
                    </td>

                    <td>
                      {expense.market_number ? (
                        <div className="expense-market">
                          <strong>
                            {expense.market_number}
                          </strong>
                          <span>
                            {expense.market_title}
                          </span>
                        </div>
                      ) : (
                        <span className="general-expense">
                          Dépense générale
                        </span>
                      )}
                    </td>

                    <td>
                      <strong className="expense-amount">
                        {formatMoney(expense.amount)}
                      </strong>
                    </td>

                    <td>
                      <span className={getStatusClass(expense.status)}>
                        {statusLabels[expense.status] ||
                          expense.status}
                      </span>
                    </td>

                    <td>
                      <div className="expense-actions">
                        <button
                          title="Voir"
                          onClick={() =>
                            navigate(`/depenses/${expense.id}`)
                          }
                        >
                          <Eye size={17} />
                        </button>

                        {expense.status === "draft" && (
                          <>
                            <button
                              title="Modifier"
                              onClick={() =>
                                openEditModal(expense)
                              }
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              title="Valider"
                              className="action-success"
                              onClick={() =>
                                updateStatus(
                                  expense,
                                  "validated"
                                )
                              }
                            >
                              <Check size={17} />
                            </button>

                            <button
                              title="Supprimer"
                              className="action-danger"
                              onClick={() =>
                                deleteExpense(expense)
                              }
                            >
                              <Trash2 size={17} />
                            </button>
                          </>
                        )}

                        {expense.status === "validated" && (
                          <button
                            title="Annuler"
                            className="action-danger"
                            onClick={() =>
                              updateStatus(
                                expense,
                                "cancelled"
                              )
                            }
                          >
                            <Ban size={17} />
                          </button>
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
          className="expense-modal-overlay"
          onMouseDown={closeModal}
        >
          <div
            className="expense-modal"
            onMouseDown={(event) =>
              event.stopPropagation()
            }
          >
            <div className="expense-modal-header">
              <div>
                <h2>
                  {editingExpense
                    ? "Modifier la dépense"
                    : "Nouvelle dépense"}
                </h2>

                <p>
                  {editingExpense
                    ? editingExpense.expense_number
                    : "Saisissez les informations de la dépense"}
                </p>
              </div>

              <button onClick={closeModal}>×</button>
            </div>

            <form
              className="expense-form"
              onSubmit={handleSubmit}
            >
              <div className="expense-form-grid">
                <div className="expense-field">
                  <label>Date *</label>

                  <input
                    type="date"
                    name="expense_date"
                    value={form.expense_date}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="expense-field">
                  <label>Montant *</label>

                  <input
                    type="number"
                    name="amount"
                    min="1"
                    step="1"
                    placeholder="Ex. 150000"
                    value={form.amount}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="expense-field">
                  <label>Catégorie</label>

                  <select
                    name="category_id"
                    value={form.category_id}
                    onChange={handleChange}
                  >
                    <option value="">
                      Aucune catégorie
                    </option>

                    {categories.map((category) => (
                      <option
                        key={category.id}
                        value={category.id}
                      >
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="expense-field">
                  <label>Marché</label>

                  <select
                    name="market_id"
                    value={form.market_id}
                    onChange={handleChange}
                  >
                    <option value="">
                      Dépense générale
                    </option>

                    {markets.map((market) => (
                      <option
                        key={market.id}
                        value={market.id}
                      >
                        {market.market_number} — {market.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="expense-field full">
                  <label>Description *</label>

                  <input
                    type="text"
                    name="description"
                    placeholder="Ex. Achat de produits de nettoyage"
                    value={form.description}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="expense-field">
                  <label>Fournisseur</label>

                  <input
                    type="text"
                    name="supplier_name"
                    placeholder="Nom du fournisseur"
                    value={form.supplier_name}
                    onChange={handleChange}
                  />
                </div>

                <div className="expense-field">
                  <label>Mode de paiement</label>

                  <select
                    name="payment_method"
                    value={form.payment_method}
                    onChange={handleChange}
                  >
                    {paymentMethods.map((method) => (
                      <option
                        key={method.value}
                        value={method.value}
                      >
                        {method.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="expense-field full">
                  <label>Référence paiement</label>

                  <input
                    type="text"
                    name="payment_reference"
                    placeholder="N° transaction, chèque, virement..."
                    value={form.payment_reference}
                    onChange={handleChange}
                  />
                </div>

                <div className="expense-field full">
                  <label>Justificatif</label>

                  <input
                    type="text"
                    name="receipt_url"
                    placeholder="URL du justificatif (optionnel)"
                    value={form.receipt_url}
                    onChange={handleChange}
                  />
                </div>

                <div className="expense-field full">
                  <label>Notes</label>

                  <textarea
                    name="notes"
                    rows="4"
                    placeholder="Informations complémentaires..."
                    value={form.notes}
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div className="expense-modal-footer">
                <button
                  type="button"
                  className="expense-secondary-button"
                  onClick={closeModal}
                  disabled={saving}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="expense-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : editingExpense
                    ? "Enregistrer"
                    : "Créer la dépense"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}