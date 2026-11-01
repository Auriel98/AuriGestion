import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Search,
  Eye,
  Pencil,
  Trash2,
  Send,
  CheckCircle,
  XCircle,
  FileText,
  X,
  Calculator,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

import api from "../../api/api";
import MiniDashboard from "../../components/dashboard/MiniDashboard";

import "./Quotes.css";

const emptyItem = () => ({
  description: "",
  quantity: 1,
  unit: "prestation",
  unit_price: 0,
  discount_amount: 0,
  tax_rate: 0,
});

const emptyForm = {
  client_id: "",
  issue_date: new Date().toISOString().slice(0, 10),
  valid_until: "",
  subject: "",
  notes: "",
  items: [emptyItem()],
};

const statusLabels = {
  draft: "Brouillon",
  sent: "Envoyé",
  accepted: "Accepté",
  rejected: "Refusé",
  expired: "Expiré",
  cancelled: "Annulé",
};

const formatMoney = (value) =>
  new Intl.NumberFormat("fr-FR").format(Number(value) || 0);

const calculateItem = (item) => {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  const discount = Number(item.discount_amount) || 0;
  const taxRate = Number(item.tax_rate) || 0;

  const gross = quantity * unitPrice;
  const net = Math.max(0, gross - discount);
  const tax = net * (taxRate / 100);
  const total = net + tax;

  return {
    gross,
    discount,
    tax,
    total,
  };
};

function Quotes() {
  const navigate = useNavigate();

  const [quotes, setQuotes] = useState([]);
  const [clients, setClients] = useState([]);
  const [stats, setStats] = useState({});

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [showModal, setShowModal] = useState(false);
  const [editingQuote, setEditingQuote] = useState(null);

  const [form, setForm] = useState(emptyForm);

  const [message, setMessage] = useState("");

  const loadData = async () => {
    try {
      setLoading(true);

      const [quotesData, clientsData, statsData] =
        await Promise.all([
          api.get("/quotes"),
          api.get("/clients"),
          api.get("/quotes/stats"),
        ]);

      setQuotes(
        Array.isArray(quotesData)
          ? quotesData
          : quotesData.quotes || []
      );

      setClients(
        Array.isArray(clientsData)
          ? clientsData
          : clientsData.clients || []
      );

      setStats(statsData || {});
    } catch (error) {
      console.error(error);
      setMessage(
        error.message ||
          "Impossible de charger les devis."
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredQuotes = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return quotes;

    return quotes.filter((quote) =>
      [
        quote.quote_number,
        quote.client_name,
        quote.subject,
        statusLabels[quote.status],
      ]
        .filter(Boolean)
        .some((value) =>
          String(value).toLowerCase().includes(term)
        )
    );
  }, [quotes, search]);

  const totals = useMemo(() => {
    return form.items.reduce(
      (acc, item) => {
        const calculated = calculateItem(item);

        acc.subtotal += calculated.gross;
        acc.discount += calculated.discount;
        acc.tax += calculated.tax;
        acc.total += calculated.total;

        return acc;
      },
      {
        subtotal: 0,
        discount: 0,
        tax: 0,
        total: 0,
      }
    );
  }, [form.items]);

  const openCreate = () => {
    setEditingQuote(null);

    setForm({
      ...emptyForm,
      issue_date: new Date()
        .toISOString()
        .slice(0, 10),
    });

    setMessage("");
    setShowModal(true);
  };

  const openEdit = async (quote) => {
    try {
      setMessage("");

      const data = await api.get(
        `/quotes/${quote.id}`
      );

      const detail = data.quote || data;

      setEditingQuote(detail);

      setForm({
        client_id: detail.client_id || "",
        issue_date: detail.issue_date
          ? String(detail.issue_date).slice(0, 10)
          : "",
        valid_until: detail.valid_until
          ? String(detail.valid_until).slice(0, 10)
          : "",
        subject: detail.subject || "",
        notes: detail.notes || "",
        items:
          data.items?.length > 0
            ? data.items.map((item) => ({
                description: item.description || "",
                quantity: item.quantity || 1,
                unit: item.unit || "prestation",
                unit_price: item.unit_price || 0,
                discount_amount:
                  item.discount_amount || 0,
                tax_rate: item.tax_rate || 0,
              }))
            : [emptyItem()],
      });

      setShowModal(true);
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Impossible de charger le devis."
      );
    }
  };

  const updateItem = (index, field, value) => {
    setForm((current) => {
      const items = [...current.items];

      items[index] = {
        ...items[index],
        [field]: value,
      };

      return {
        ...current,
        items,
      };
    });
  };

  const addItem = () => {
    setForm((current) => ({
      ...current,
      items: [
        ...current.items,
        emptyItem(),
      ],
    }));
  };

  const removeItem = (index) => {
    if (form.items.length === 1) return;

    setForm((current) => ({
      ...current,
      items: current.items.filter(
        (_, itemIndex) => itemIndex !== index
      ),
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!form.client_id) {
      setMessage("Veuillez sélectionner un client.");
      return;
    }

    const validItems = form.items.filter(
      (item) =>
        item.description.trim() &&
        Number(item.quantity) > 0
    );

    if (validItems.length === 0) {
      setMessage(
        "Ajoutez au moins une prestation valide."
      );
      return;
    }

    try {
      setSaving(true);
      setMessage("");

      const payload = {
        client_id: form.client_id,
        issue_date: form.issue_date,
        valid_until:
          form.valid_until || null,
        subject: form.subject || null,
        notes: form.notes || null,
        items: validItems.map((item) => ({
          description: item.description.trim(),
          quantity: Number(item.quantity) || 0,
          unit: item.unit || "prestation",
          unit_price:
            Number(item.unit_price) || 0,
          discount_amount:
            Number(item.discount_amount) || 0,
          tax_rate:
            Number(item.tax_rate) || 0,
        })),
      };

      if (editingQuote) {
        await api.put(
          `/quotes/${editingQuote.id}`,
          payload
        );

        setMessage("Devis modifié avec succès.");
      } else {
        await api.post("/quotes", payload);

        setMessage("Devis créé avec succès.");
      }

      setShowModal(false);
      setEditingQuote(null);
      setForm(emptyForm);

      await loadData();
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Erreur lors de l'enregistrement du devis."
      );
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (quote, status) => {
    try {
      await api.patch(
        `/quotes/${quote.id}/status`,
        { status }
      );

      setMessage("Statut du devis mis à jour.");

      await loadData();
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Impossible de modifier le statut."
      );
    }
  };

  const deleteQuote = async (quote) => {
    if (
      !window.confirm(
        `Supprimer le devis ${quote.quote_number} ?`
      )
    ) {
      return;
    }

    try {
      await api.delete(`/quotes/${quote.id}`);

      setMessage("Devis supprimé.");

      await loadData();
    } catch (error) {
      console.error(error);

      setMessage(
        error.message ||
          "Impossible de supprimer le devis."
      );
    }
  };

  const viewQuote = (quote) => {
    navigate(`/devis/${quote.id}`);
  };

  if (loading) {
    return (
      <div className="quotes-page">
        <div className="quotes-loading">
          Chargement des devis...
        </div>
      </div>
    );
  }

  return (
    <div className="quotes-page">

      {/* HEADER */}
      <div className="quotes-header">

        <div>
          <h1>Devis</h1>

          <p>
            Créez et gérez les devis envoyés à vos clients.
          </p>
        </div>

        <button
          className="quotes-primary-button"
          onClick={openCreate}
        >
          <Plus size={18} />
          Nouveau devis
        </button>

      </div>

      {/* MESSAGE */}
      {message && (
        <div className="quotes-message">
          {message}

          <button
            onClick={() => setMessage("")}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* MINI DASHBOARD */}
      <MiniDashboard
        stats={[
          {
            label: "Total",
            value: stats.total || 0,
            icon: FileText,
          },
          {
            label: "Brouillons",
            value: stats.draft || 0,
            icon: Pencil,
          },
          {
            label: "Envoyés",
            value: stats.sent || 0,
            icon: Send,
          },
          {
            label: "Acceptés",
            value: stats.accepted || 0,
            icon: CheckCircle,
          },
        ]}
      />

      {/* SEARCH */}
      <div className="quotes-toolbar">

        <div className="quotes-search">

          <Search size={18} />

          <input
            type="text"
            placeholder="Rechercher un devis, un client..."
            value={search}
            onChange={(event) =>
              setSearch(event.target.value)
            }
          />

        </div>

      </div>

      {/* TABLE */}
      <div className="quotes-card">

        <div className="quotes-card-header">

          <div>
            <h2>Liste des devis</h2>

            <p>
              {filteredQuotes.length} devis affiché(s)
            </p>
          </div>

        </div>

        <div className="quotes-table-wrapper">

          <table className="quotes-table">

            <thead>
              <tr>
                <th>N° devis</th>
                <th>Client</th>
                <th>Date</th>
                <th>Validité</th>
                <th>Total</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>

              {filteredQuotes.length === 0 ? (
                <tr>
                  <td
                    colSpan="7"
                    className="quotes-empty"
                  >
                    Aucun devis trouvé.
                  </td>
                </tr>
              ) : (
                filteredQuotes.map((quote) => (
                  <tr key={quote.id}>

                    <td>
                      <strong>
                        {quote.quote_number}
                      </strong>
                    </td>

                    <td>
                      <div className="quote-client">

                        <strong>
                          {quote.client_name}
                        </strong>

                        {quote.client_email && (
                          <span>
                            {quote.client_email}
                          </span>
                        )}

                      </div>
                    </td>

                    <td>
                      {quote.issue_date
                        ? new Date(
                            quote.issue_date
                          ).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>

                    <td>
                      {quote.valid_until
                        ? new Date(
                            quote.valid_until
                          ).toLocaleDateString("fr-FR")
                        : "—"}
                    </td>

                    <td>
                      <strong>
                        {formatMoney(
                          quote.total_amount
                        )}{" "}
                        FCFA
                      </strong>
                    </td>

                    <td>
                      <span
                        className={`quote-status ${quote.status}`}
                      >
                        {statusLabels[
                          quote.status
                        ] || quote.status}
                      </span>
                    </td>

                    <td>

                      <div className="quote-actions">

                        <button
                          title="Ouvrir"
                          onClick={() =>
                            viewQuote(quote)
                          }
                        >
                          <Eye size={17} />
                        </button>

                        {quote.status === "draft" && (
                          <button
                            title="Modifier"
                            onClick={() =>
                              openEdit(quote)
                            }
                          >
                            <Pencil size={17} />
                          </button>
                        )}

                        {quote.status === "draft" && (
                          <button
                            title="Envoyer"
                            onClick={() =>
                              changeStatus(
                                quote,
                                "sent"
                              )
                            }
                          >
                            <Send size={17} />
                          </button>
                        )}

                        {quote.status === "sent" && (
                          <>
                            <button
                              title="Accepter"
                              onClick={() =>
                                changeStatus(
                                  quote,
                                  "accepted"
                                )
                              }
                            >
                              <CheckCircle size={17} />
                            </button>

                            <button
                              title="Refuser"
                              onClick={() =>
                                changeStatus(
                                  quote,
                                  "rejected"
                                )
                              }
                            >
                              <XCircle size={17} />
                            </button>
                          </>
                        )}

                        {quote.status === "draft" && (
                          <button
                            title="Supprimer"
                            className="danger"
                            onClick={() =>
                              deleteQuote(quote)
                            }
                          >
                            <Trash2 size={17} />
                          </button>
                        )}

                      </div>

                    </td>

                  </tr>
                ))
              )}

            </tbody>

          </table>

        </div>

      </div>

      {/* MODAL */}
      {showModal && (
        <div
          className="quotes-modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              setShowModal(false);
            }
          }}
        >

          <div className="quotes-modal">

            <div className="quotes-modal-header">

              <div>
                <h2>
                  {editingQuote
                    ? "Modifier le devis"
                    : "Nouveau devis"}
                </h2>

                <p>
                  Préparez le devis à envoyer au client.
                </p>
              </div>

              <button
                className="quotes-close"
                onClick={() =>
                  setShowModal(false)
                }
              >
                <X size={20} />
              </button>

            </div>

            <form onSubmit={handleSubmit}>

              {/* INFOS */}
              <div className="quotes-form-section">

                <div className="quotes-section-title">
                  <FileText size={18} />

                  <div>
                    <h3>Informations du devis</h3>

                    <p>
                      Identifiez le client et le devis.
                    </p>
                  </div>
                </div>

                <div className="quotes-form-grid">

                  <div className="quotes-field">

                    <label>
                      Client *
                    </label>

                    <select
                      required
                      value={form.client_id}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          client_id:
                            event.target.value,
                        })
                      }
                    >
                      <option value="">
                        Sélectionner un client
                      </option>

                      {clients
                        .filter(
                          (client) =>
                            client.status ===
                            "active"
                        )
                        .map((client) => (
                          <option
                            key={client.id}
                            value={client.id}
                          >
                            {client.name}
                          </option>
                        ))}
                    </select>

                  </div>

                  <div className="quotes-field">

                    <label>
                      Date du devis *
                    </label>

                    <input
                      type="date"
                      required
                      value={form.issue_date}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          issue_date:
                            event.target.value,
                        })
                      }
                    />

                  </div>

                  <div className="quotes-field">

                    <label>
                      Valable jusqu'au
                    </label>

                    <input
                      type="date"
                      value={form.valid_until}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          valid_until:
                            event.target.value,
                        })
                      }
                    />

                  </div>

                  <div className="quotes-field quotes-field-full">

                    <label>
                      Objet du devis
                    </label>

                    <input
                      type="text"
                      placeholder="Ex. Nettoyage industriel du site"
                      value={form.subject}
                      onChange={(event) =>
                        setForm({
                          ...form,
                          subject:
                            event.target.value,
                        })
                      }
                    />

                  </div>

                </div>

              </div>

              {/* PRESTATIONS */}
              <div className="quotes-form-section">

                <div className="quotes-section-title">

                  <Calculator size={18} />

                  <div>
                    <h3>Prestations</h3>

                    <p>
                      Ajoutez les prestations et leurs tarifs.
                    </p>
                  </div>

                </div>

                <div className="quote-items">

                  {form.items.map(
                    (item, index) => {
                      const calculated =
                        calculateItem(item);

                      return (
                        <div
                          className="quote-item"
                          key={index}
                        >

                          <div className="quote-item-number">
                            {index + 1}
                          </div>

                          <div className="quote-item-fields">

                            <div className="quotes-field description">

                              <label>
                                Désignation *
                              </label>

                              <input
                                type="text"
                                placeholder="Ex. Nettoyage industriel"
                                value={
                                  item.description
                                }
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "description",
                                    event.target.value
                                  )
                                }
                              />

                            </div>

                            <div className="quotes-field">

                              <label>
                                Qté
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.quantity
                                }
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "quantity",
                                    event.target.value
                                  )
                                }
                              />

                            </div>

                            <div className="quotes-field">

                              <label>
                                Unité
                              </label>

                              <input
                                type="text"
                                placeholder="prestation"
                                value={item.unit}
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "unit",
                                    event.target.value
                                  )
                                }
                              />

                            </div>

                            <div className="quotes-field">

                              <label>
                                Prix unitaire
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={
                                  item.unit_price
                                }
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "unit_price",
                                    event.target.value
                                  )
                                }
                              />

                            </div>

                            <div className="quotes-field">

                              <label>
                                Remise
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="1"
                                value={
                                  item.discount_amount
                                }
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "discount_amount",
                                    event.target.value
                                  )
                                }
                              />

                            </div>

                            <div className="quotes-field">

                              <label>
                                Taxe %
                              </label>

                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                value={
                                  item.tax_rate
                                }
                                onChange={(event) =>
                                  updateItem(
                                    index,
                                    "tax_rate",
                                    event.target.value
                                  )
                                }
                              />

                            </div>

                            <div className="quote-item-total">

                              <span>
                                Total
                              </span>

                              <strong>
                                {formatMoney(
                                  calculated.total
                                )}{" "}
                                FCFA
                              </strong>

                            </div>

                          </div>

                          {form.items.length > 1 && (
                            <button
                              type="button"
                              className="quote-remove-item"
                              title="Supprimer la ligne"
                              onClick={() =>
                                removeItem(index)
                              }
                            >
                              <Trash2 size={17} />
                            </button>
                          )}

                        </div>
                      );
                    }
                  )}

                </div>

                <button
                  type="button"
                  className="quote-add-item"
                  onClick={addItem}
                >
                  <Plus size={17} />
                  Ajouter une prestation
                </button>

              </div>

              {/* NOTES */}
              <div className="quotes-form-section">

                <div className="quotes-field">

                  <label>
                    Notes / conditions
                  </label>

                  <textarea
                    rows="4"
                    placeholder="Conditions de paiement, délai, remarques..."
                    value={form.notes}
                    onChange={(event) =>
                      setForm({
                        ...form,
                        notes: event.target.value,
                      })
                    }
                  />

                </div>

              </div>

              {/* TOTAL */}
              <div className="quote-total-box">

                <div>
                  <span>
                    Sous-total
                  </span>

                  <strong>
                    {formatMoney(
                      totals.subtotal
                    )}{" "}
                    FCFA
                  </strong>
                </div>

                <div>
                  <span>
                    Remise
                  </span>

                  <strong>
                    -{" "}
                    {formatMoney(
                      totals.discount
                    )}{" "}
                    FCFA
                  </strong>
                </div>

                <div>
                  <span>
                    Taxes
                  </span>

                  <strong>
                    {formatMoney(
                      totals.tax
                    )}{" "}
                    FCFA
                  </strong>
                </div>

                <div className="quote-total-final">

                  <span>
                    TOTAL
                  </span>

                  <strong>
                    {formatMoney(
                      totals.total
                    )}{" "}
                    FCFA
                  </strong>

                </div>

              </div>

              {/* ACTIONS */}
              <div className="quotes-modal-actions">

                <button
                  type="button"
                  className="quotes-secondary-button"
                  onClick={() =>
                    setShowModal(false)
                  }
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="quotes-primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : editingQuote
                    ? "Enregistrer les modifications"
                    : "Créer le devis"}
                </button>

              </div>

            </form>

          </div>

        </div>
      )}

    </div>
  );
}

export default Quotes;