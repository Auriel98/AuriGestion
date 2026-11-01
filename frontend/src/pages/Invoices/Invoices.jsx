import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Receipt,
  FileText,
  Clock,
  CheckCircle2,
  Pencil,
  Trash2,
  Eye,
  Send,
  Ban,
} from "lucide-react";

import api from "../../api/api";
import "./Invoices.css";

const STATUS_LABELS = {
  draft: "Brouillon",
  issued: "Émise",
  partially_paid: "Partiellement payée",
  paid: "Payée",
  cancelled: "Annulée",
};

const STATUS_CLASS = {
  draft: "invoice-status-draft",
  issued: "invoice-status-issued",
  partially_paid: "invoice-status-partial",
  paid: "invoice-status-paid",
  cancelled: "invoice-status-cancelled",
};

const emptyItem = {
  description: "",
  quantity: 1,
  unit: "unité",
  unit_price: 0,
  discount_amount: 0,
  tax_rate: 0,
};

const emptyForm = {
  client_id: "",
  market_id: "",
  quote_id: "",
  issue_date: new Date().toISOString().slice(0, 10),
  due_date: "",
  subject: "",
  notes: "",
  items: [{ ...emptyItem }],
};

const formatMoney = (value) =>
  new Intl.NumberFormat("fr-FR", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Number(value) || 0) + " FCFA";

const formatDate = (date) => {
  if (!date) return "-";

  return new Date(date).toLocaleDateString("fr-FR");
};

// Calcul d'une ligne : brut -> remise -> net HT -> TVA -> TTC
const computeItem = (item) => {
  const quantity = Number(item.quantity) || 0;
  const unitPrice = Number(item.unit_price) || 0;
  const rawDiscount = Math.max(Number(item.discount_amount) || 0, 0);
  const taxRate = Number(item.tax_rate) || 0;

  const gross = quantity * unitPrice;
  const discount = Math.min(rawDiscount, gross); // la remise ne dépasse jamais le brut
  const net = gross - discount;
  const tax = net * (taxRate / 100);

  return {
    gross,
    discount,
    net,
    tax,
    total: net + tax,
    discountTooHigh: rawDiscount > gross,
  };
};

export default function Invoices() {
  const navigate = useNavigate();

  const [invoices, setInvoices] = useState([]);
  const [clients, setClients] = useState([]);
  const [markets, setMarkets] = useState([]);

  const [stats, setStats] = useState({
    total: 0,
    draft: 0,
    issued: 0,
    partially_paid: 0,
    paid: 0,
    cancelled: 0,
    total_amount: 0,
    amount_paid: 0,
    remaining_amount: 0,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState(null);

  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const [invoiceRes, statsRes, clientsRes] = await Promise.all([
        api.get("/invoices"),
        api.get("/invoices/stats"),
        api.get("/clients"),
      ]);

      setInvoices(invoiceRes || []);
      setStats(statsRes || {});
      setClients(clientsRes || []);

      // Les marchés seront utilisés dès que leur module frontend sera disponible.
      try {
        const marketsRes = await api.get("/markets");
        setMarkets(marketsRes || []);
      } catch {
        setMarkets([]);
      }
    } catch (error) {
      console.error(error);
      alert(error.message || "Erreur lors du chargement des factures.");
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => {
    const value = search.toLowerCase().trim();

    return invoices.filter((invoice) => {
      const matchesSearch =
        !value ||
        invoice.invoice_number?.toLowerCase().includes(value) ||
        invoice.client_name?.toLowerCase().includes(value) ||
        invoice.subject?.toLowerCase().includes(value);

      const matchesStatus =
        statusFilter === "all" || invoice.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [invoices, search, statusFilter]);

  const totals = useMemo(() => {
    let gross = 0;
    let discount = 0;
    let net = 0;
    let tax = 0;
    let total = 0;

    form.items.forEach((item) => {
      const line = computeItem(item);

      gross += line.gross;
      discount += line.discount;
      net += line.net;
      tax += line.tax;
      total += line.total;
    });

    return { gross, discount, net, tax, total };
  }, [form.items]);

  const openCreate = () => {
    setEditingId(null);
    setForm({
      ...emptyForm,
      items: [{ ...emptyItem }],
      issue_date: new Date().toISOString().slice(0, 10),
    });
    setShowModal(true);
  };

  const openEdit = async (invoice) => {
    try {
      const data = await api.get(`/invoices/${invoice.id}`);

      setEditingId(invoice.id);

      setForm({
        client_id: data.client_id || "",
        market_id: data.market_id || "",
        quote_id: data.quote_id || "",
        issue_date: data.issue_date ? data.issue_date.slice(0, 10) : "",
        due_date: data.due_date ? data.due_date.slice(0, 10) : "",
        subject: data.subject || "",
        notes: data.notes || "",
        items:
          data.items?.length > 0
            ? data.items.map((item) => ({
                description: item.description || "",
                quantity: item.quantity || 1,
                unit: item.unit || "unité",
                unit_price: item.unit_price || 0,
                discount_amount: item.discount_amount || 0,
                tax_rate: item.tax_rate || 0,
              }))
            : [{ ...emptyItem }],
      });

      setShowModal(true);
    } catch (error) {
      alert(error.message || "Impossible de charger la facture.");
    }
  };

  const updateForm = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const updateItem = (index, field, value) => {
    setForm((prev) => ({
      ...prev,
      items: prev.items.map((item, i) =>
        i === index
          ? {
              ...item,
              [field]: value,
            }
          : item
      ),
    }));
  };

  const addItem = () => {
    setForm((prev) => ({
      ...prev,
      items: [...prev.items, { ...emptyItem }],
    }));
  };

  const removeItem = (index) => {
    if (form.items.length === 1) return;

    setForm((prev) => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index),
    }));
  };

  const saveInvoice = async (event) => {
    event.preventDefault();

    if (!form.client_id) {
      alert("Veuillez sélectionner un client.");
      return;
    }

    const validItems = form.items.filter(
      (item) =>
        item.description.trim() &&
        Number(item.quantity) > 0 &&
        Number(item.unit_price) >= 0
    );

    if (!validItems.length) {
      alert("Ajoutez au moins une ligne valide.");
      return;
    }

    const invalidDiscount = validItems.find((item) => {
      const discount = Number(item.discount_amount) || 0;
      const gross = Number(item.quantity) * Number(item.unit_price);
      return discount < 0 || discount > gross;
    });

    if (invalidDiscount) {
      alert(
        `La remise de la ligne « ${invalidDiscount.description} » doit être comprise entre 0 et le montant de la ligne.`
      );
      return;
    }

    try {
      setSaving(true);

      const payload = {
        ...form,
        client_id: form.client_id,
        market_id: form.market_id || null,
        quote_id: form.quote_id || null,
        items: validItems.map((item) => ({
          ...item,
          quantity: Number(item.quantity),
          unit_price: Number(item.unit_price),
          discount_amount: Number(item.discount_amount) || 0,
          tax_rate: Number(item.tax_rate) || 0,
        })),
      };

      if (editingId) {
        await api.put(`/invoices/${editingId}`, payload);
      } else {
        await api.post("/invoices", payload);
      }

      setShowModal(false);
      await loadData();

      alert(
        editingId
          ? "Facture modifiée avec succès."
          : "Facture créée avec succès."
      );
    } catch (error) {
      alert(error.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const changeStatus = async (invoice, status) => {
    try {
      await api.patch(`/invoices/${invoice.id}/status`, {
        status,
      });

      await loadData();
    } catch (error) {
      alert(error.message || "Erreur lors du changement de statut.");
    }
  };

  const deleteInvoice = async (invoice) => {
    if (!window.confirm(`Supprimer la facture ${invoice.invoice_number} ?`)) {
      return;
    }

    try {
      await api.delete(`/invoices/${invoice.id}`);
      await loadData();
    } catch (error) {
      alert(error.message || "Impossible de supprimer la facture.");
    }
  };

  return (
    <div className="invoices-page">
      <div className="page-header">
        <div>
          <h1>Factures</h1>
          <p>Créez et gérez les factures de vos clients.</p>
        </div>

        <button className="primary-button" onClick={openCreate}>
          <Plus size={18} />
          Nouvelle facture
        </button>
      </div>

      {/* MINI DASHBOARD */}
      <div className="invoice-stats-grid">
        <div className="invoice-stat-card">
          <div className="invoice-stat-icon">
            <Receipt size={20} />
          </div>
          <div>
            <span>Total factures</span>
            <strong>{stats.total || 0}</strong>
          </div>
        </div>

        <div className="invoice-stat-card">
          <div className="invoice-stat-icon">
            <FileText size={20} />
          </div>
          <div>
            <span>Brouillons</span>
            <strong>{stats.draft || 0}</strong>
          </div>
        </div>

        <div className="invoice-stat-card">
          <div className="invoice-stat-icon">
            <Clock size={20} />
          </div>
          <div>
            <span>En attente</span>
            <strong>{(stats.issued || 0) + (stats.partially_paid || 0)}</strong>
          </div>
        </div>

        <div className="invoice-stat-card">
          <div className="invoice-stat-icon">
            <CheckCircle2 size={20} />
          </div>
          <div>
            <span>Payées</span>
            <strong>{stats.paid || 0}</strong>
          </div>
        </div>

        <div className="invoice-stat-card invoice-stat-money">
          <div>
            <span>Total facturé</span>
            <strong>{formatMoney(stats.total_amount)}</strong>
          </div>
        </div>

        <div className="invoice-stat-card invoice-stat-money">
          <div>
            <span>Reste à encaisser</span>
            <strong>{formatMoney(stats.remaining_amount)}</strong>
          </div>
        </div>
      </div>

      {/* FILTRES */}
      <div className="invoice-toolbar">
        <div className="invoice-search">
          <Search size={18} />
          <input
            type="text"
            placeholder="Rechercher une facture ou un client..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="all">Tous les statuts</option>
          <option value="draft">Brouillons</option>
          <option value="issued">Émises</option>
          <option value="partially_paid">Partiellement payées</option>
          <option value="paid">Payées</option>
          <option value="cancelled">Annulées</option>
        </select>
      </div>

      {/* TABLE */}
      <div className="invoice-table-card">
        {loading ? (
          <div className="invoice-empty">Chargement des factures...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="invoice-empty">
            <Receipt size={42} />
            <h3>Aucune facture</h3>
            <p>Créez votre première facture pour commencer.</p>
          </div>
        ) : (
          <div className="invoice-table-wrapper">
            <table className="invoice-table">
              <thead>
                <tr>
                  <th>Facture</th>
                  <th>Client</th>
                  <th>Date</th>
                  <th>Échéance</th>
                  <th>Montant</th>
                  <th>Payé</th>
                  <th>Statut</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id}>
                    <td>
                      <strong>{invoice.invoice_number}</strong>
                      {invoice.subject && <small>{invoice.subject}</small>}
                    </td>

                    <td>{invoice.client_name}</td>

                    <td>{formatDate(invoice.issue_date)}</td>

                    <td>{formatDate(invoice.due_date)}</td>

                    <td>
                      <strong>{formatMoney(invoice.total_amount)}</strong>
                      {Number(invoice.discount_amount) > 0 && (
                        <small>
                          dont remise : {formatMoney(invoice.discount_amount)}
                        </small>
                      )}
                    </td>

                    <td>{formatMoney(invoice.amount_paid)}</td>

                    <td>
                      <span
                        className={`invoice-status ${
                          STATUS_CLASS[invoice.status]
                        }`}
                      >
                        {STATUS_LABELS[invoice.status] || invoice.status}
                      </span>
                    </td>

                    <td>
                      <div className="invoice-actions">
                        <button
                          title="Voir"
                          onClick={() => navigate(`/factures/${invoice.id}`)}
                        >
                          <Eye size={17} />
                        </button>

                        {invoice.status === "draft" && (
                          <>
                            <button
                              title="Modifier"
                              onClick={() => openEdit(invoice)}
                            >
                              <Pencil size={17} />
                            </button>

                            <button
                              title="Émettre"
                              onClick={() => changeStatus(invoice, "issued")}
                            >
                              <Send size={17} />
                            </button>

                            <button
                              title="Supprimer"
                              className="danger"
                              onClick={() => deleteInvoice(invoice)}
                            >
                              <Trash2 size={17} />
                            </button>
                          </>
                        )}

                        {invoice.status === "issued" && (
                          <button
                            title="Annuler"
                            className="danger"
                            onClick={() => changeStatus(invoice, "cancelled")}
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
          className="invoice-modal-overlay"
          onMouseDown={() => setShowModal(false)}
        >
          <div
            className="invoice-modal"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="invoice-modal-header">
              <div>
                <h2>
                  {editingId ? "Modifier la facture" : "Nouvelle facture"}
                </h2>
                <p>Renseignez les informations de facturation.</p>
              </div>

              <button
                type="button"
                className="invoice-close"
                onClick={() => setShowModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveInvoice}>
              <div className="invoice-form-grid">
                <div className="form-group">
                  <label>Client *</label>

                  <select
                    value={form.client_id}
                    onChange={(e) => updateForm("client_id", e.target.value)}
                    required
                  >
                    <option value="">Sélectionner un client</option>

                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Marché</label>

                  <select
                    value={form.market_id}
                    onChange={(e) => updateForm("market_id", e.target.value)}
                  >
                    <option value="">Aucun marché</option>

                    {markets.map((market) => (
                      <option key={market.id} value={market.id}>
                        {market.market_number} — {market.title}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>Date de facture *</label>

                  <input
                    type="date"
                    value={form.issue_date}
                    onChange={(e) => updateForm("issue_date", e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Date d'échéance</label>

                  <input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => updateForm("due_date", e.target.value)}
                  />
                </div>

                <div className="form-group form-group-full">
                  <label>Objet</label>

                  <input
                    type="text"
                    placeholder="Ex : Prestation de nettoyage..."
                    value={form.subject}
                    onChange={(e) => updateForm("subject", e.target.value)}
                  />
                </div>
              </div>

              {/* LIGNES */}
              <div className="invoice-items-section">
                <div className="invoice-section-title">
                  <div>
                    <h3>Lignes de facture</h3>
                    <p>Ajoutez les prestations ou produits.</p>
                  </div>

                  <button
                    type="button"
                    className="secondary-button"
                    onClick={addItem}
                  >
                    <Plus size={17} />
                    Ajouter une ligne
                  </button>
                </div>

                <div className="invoice-items">
                  {form.items.map((item, index) => {
                    const line = computeItem(item);

                    return (
                      <div className="invoice-item-row" key={index}>
                        <div className="invoice-item-description">
                          <label>Description</label>

                          <input
                            type="text"
                            placeholder="Description"
                            value={item.description}
                            onChange={(e) =>
                              updateItem(index, "description", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label>Qté</label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.quantity}
                            onChange={(e) =>
                              updateItem(index, "quantity", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label>Unité</label>

                          <input
                            type="text"
                            value={item.unit}
                            onChange={(e) =>
                              updateItem(index, "unit", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label>Prix unitaire</label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.unit_price}
                            onChange={(e) =>
                              updateItem(index, "unit_price", e.target.value)
                            }
                          />
                        </div>

                        <div>
                          <label>Remise (FCFA)</label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.discount_amount}
                            className={line.discountTooHigh ? "input-error" : ""}
                            onChange={(e) =>
                              updateItem(
                                index,
                                "discount_amount",
                                e.target.value
                              )
                            }
                          />
                          {line.discountTooHigh && (
                            <small className="field-error">
                              Supérieure au montant de la ligne
                            </small>
                          )}
                        </div>

                        <div>
                          <label>TVA %</label>

                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={item.tax_rate}
                            onChange={(e) =>
                              updateItem(index, "tax_rate", e.target.value)
                            }
                          />
                        </div>

                        <div className="invoice-item-total">
                          <label>Total TTC</label>

                          <strong>{formatMoney(line.total)}</strong>
                        </div>

                        <button
                          type="button"
                          className="remove-item-button"
                          onClick={() => removeItem(index)}
                          disabled={form.items.length === 1}
                          title="Supprimer la ligne"
                        >
                          <Trash2 size={17} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* NOTES + TOTAL */}
              <div className="invoice-bottom">
                <div className="form-group">
                  <label>Notes</label>

                  <textarea
                    rows="5"
                    placeholder="Conditions, informations complémentaires..."
                    value={form.notes}
                    onChange={(e) => updateForm("notes", e.target.value)}
                  />
                </div>

                <div className="invoice-form-total">
                  <div>
                    <span>Sous-total brut</span>
                    <strong>{formatMoney(totals.gross)}</strong>
                  </div>

                  <div>
                    <span>Remise</span>
                    <strong>- {formatMoney(totals.discount)}</strong>
                  </div>

                  <div>
                    <span>Total HT</span>
                    <strong>{formatMoney(totals.net)}</strong>
                  </div>

                  <div>
                    <span>Taxes</span>
                    <strong>{formatMoney(totals.tax)}</strong>
                  </div>

                  <div className="invoice-grand-total">
                    <span>Total TTC</span>
                    <strong>{formatMoney(totals.total)}</strong>
                  </div>
                </div>
              </div>

              <div className="invoice-modal-footer">
                <button
                  type="button"
                  className="secondary-button"
                  onClick={() => setShowModal(false)}
                >
                  Annuler
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving
                    ? "Enregistrement..."
                    : editingId
                    ? "Enregistrer les modifications"
                    : "Créer la facture"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}