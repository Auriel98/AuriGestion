import { useEffect, useState } from "react";
import { Layers, ShieldCheck, Coins, CalendarDays } from "lucide-react";
import api from "../../api/api";
import MiniDashboard from "../../components/dashboard/MiniDashboard";
import "./PayrollSettings.css";

const tabs = [
  { id: "general", label: "Général" },
  { id: "components", label: "Composants" },
  { id: "rules", label: "Cotisations & taxes" },
];

const emptyComponent = {
  code: "",
  name: "",
  category: "earning",
  calculation_method: "manual",
  base_code: "",
  rate: "",
  fixed_amount: "",
  ceiling_amount: "",
  floor_amount: "",
  taxable: false,
  cnss_subject: false,
  cnamgs_subject: false,
  tcs_subject: false,
  irpp_subject: false,
};

const emptyRule = {
  code: "",
  name: "",
  rule_type: "cotisation",
  calculation_method: "percentage",
  employee_rate: "",
  employer_rate: "",
  ceiling_amount: "",
  floor_amount: "",
  exemption_amount: "",
  base_type: "gross_salary",
  effective_from: "",
  effective_to: "",
  description: "",
};

const toArray = (data, key) =>
  Array.isArray(data) ? data : Array.isArray(data?.[key]) ? data[key] : [];

export default function PayrollSettings() {
  const [activeTab, setActiveTab] = useState("general");

  const [settings, setSettings] = useState({
    currency: "FCFA",
    monthly_work_days: 30,
    monthly_work_hours: 173.33,
    rounding_decimals: 0,
  });

  const [components, setComponents] = useState([]);
  const [rules, setRules] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [componentModal, setComponentModal] = useState(false);
  const [ruleModal, setRuleModal] = useState(false);

  const [editingComponent, setEditingComponent] = useState(null);
  const [editingRule, setEditingRule] = useState(null);

  const [componentForm, setComponentForm] = useState(emptyComponent);
  const [ruleForm, setRuleForm] = useState(emptyRule);

  const loadData = async () => {
    try {
      setLoading(true);
      setMessage("");

      const [settingsRes, componentsRes, rulesRes] = await Promise.allSettled([
        api.get("/payroll/settings"),
        api.get("/payroll/components"),
        api.get("/payroll/rules"),
      ]);

      if (settingsRes.status === "fulfilled" && settingsRes.value) {
        const s = settingsRes.value;
        setSettings({
          currency: s.currency || "FCFA",
          monthly_work_days: s.monthly_work_days ?? 30,
          monthly_work_hours: s.monthly_work_hours ?? 173.33,
          rounding_decimals: s.rounding_decimals ?? 0,
        });
      } else if (settingsRes.status === "rejected") {
        setMessage(
          "Les paramètres de paie ne sont pas encore configurés. Clique sur « Initialiser la paie »."
        );
      }

      setComponents(
        componentsRes.status === "fulfilled"
          ? toArray(componentsRes.value, "components")
          : []
      );

      setRules(
        rulesRes.status === "fulfilled"
          ? toArray(rulesRes.value, "rules")
          : []
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const saveSettings = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);
      setMessage("");

      await api.put("/payroll/settings", {
        currency: settings.currency,
        monthly_work_days: Number(settings.monthly_work_days),
        monthly_work_hours: Number(settings.monthly_work_hours),
        rounding_decimals: Number(settings.rounding_decimals),
      });

      setMessage("Paramètres enregistrés.");
    } catch (error) {
      setMessage(error.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const initializePayroll = async () => {
    try {
      setSaving(true);
      setMessage("");

      await api.post("/payroll/settings/initialize");

      await loadData();

      setMessage("Configuration de paie initialisée avec succès.");
    } catch (error) {
      setMessage(error.message || "Erreur lors de l'initialisation.");
    } finally {
      setSaving(false);
    }
  };

  const openNewComponent = () => {
    setEditingComponent(null);
    setComponentForm(emptyComponent);
    setComponentModal(true);
  };

  const openEditComponent = (component) => {
    setEditingComponent(component);

    setComponentForm({
      code: component.code || "",
      name: component.name || "",
      category: component.category || "earning",
      calculation_method: component.calculation_method || "manual",
      base_code: component.base_code || "",
      rate: component.rate ?? "",
      fixed_amount: component.fixed_amount ?? "",
      ceiling_amount: component.ceiling_amount ?? "",
      floor_amount: component.floor_amount ?? "",
      taxable: !!component.taxable,
      cnss_subject: !!component.cnss_subject,
      cnamgs_subject: !!component.cnamgs_subject,
      tcs_subject: !!component.tcs_subject,
      irpp_subject: !!component.irpp_subject,
    });

    setComponentModal(true);
  };

  const saveComponent = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const payload = {
        ...componentForm,
        rate:
          componentForm.rate === ""
            ? null
            : Number(componentForm.rate),
        fixed_amount:
          componentForm.fixed_amount === ""
            ? null
            : Number(componentForm.fixed_amount),
        ceiling_amount:
          componentForm.ceiling_amount === ""
            ? null
            : Number(componentForm.ceiling_amount),
        floor_amount:
          componentForm.floor_amount === ""
            ? null
            : Number(componentForm.floor_amount),
      };

      if (editingComponent) {
        await api.put(
          `/payroll/components/${editingComponent.id}`,
          payload
        );
      } else {
        await api.post("/payroll/components", payload);
      }

      setComponentModal(false);
      await loadData();
      setMessage("Composant enregistré.");
    } catch (error) {
      setMessage(error.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const toggleComponent = async (component) => {
    try {
      await api.patch(
        `/payroll/components/${component.id}/status`,
        {
          is_active: !component.is_active,
        }
      );

      await loadData();
    } catch (error) {
      setMessage(error.message || "Erreur lors du changement de statut.");
    }
  };

  const openNewRule = () => {
    setEditingRule(null);
    setRuleForm(emptyRule);
    setRuleModal(true);
  };

  const openEditRule = (rule) => {
    setEditingRule(rule);

    setRuleForm({
      code: rule.code || "",
      name: rule.name || "",
      rule_type: rule.rule_type || "cotisation",
      calculation_method: rule.calculation_method || "percentage",
      employee_rate: rule.employee_rate ?? "",
      employer_rate: rule.employer_rate ?? "",
      ceiling_amount: rule.ceiling_amount ?? "",
      floor_amount: rule.floor_amount ?? "",
      exemption_amount: rule.exemption_amount ?? "",
      base_type: rule.base_type || "gross_salary",
      effective_from: rule.effective_from
        ? String(rule.effective_from).slice(0, 10)
        : "",
      effective_to: rule.effective_to
        ? String(rule.effective_to).slice(0, 10)
        : "",
      description: rule.description || "",
    });

    setRuleModal(true);
  };

  const saveRule = async (e) => {
    e.preventDefault();

    try {
      setSaving(true);

      const payload = {
        ...ruleForm,
        employee_rate:
          ruleForm.employee_rate === ""
            ? 0
            : Number(ruleForm.employee_rate),
        employer_rate:
          ruleForm.employer_rate === ""
            ? 0
            : Number(ruleForm.employer_rate),
        ceiling_amount:
          ruleForm.ceiling_amount === ""
            ? null
            : Number(ruleForm.ceiling_amount),
        floor_amount:
          ruleForm.floor_amount === ""
            ? null
            : Number(ruleForm.floor_amount),
        exemption_amount:
          ruleForm.exemption_amount === ""
            ? 0
            : Number(ruleForm.exemption_amount),
      };

      if (editingRule) {
        await api.put(`/payroll/rules/${editingRule.id}`, payload);
      } else {
        await api.post("/payroll/rules", payload);
      }

      setRuleModal(false);
      await loadData();
      setMessage("Règle enregistrée.");
    } catch (error) {
      setMessage(error.message || "Erreur lors de l'enregistrement.");
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = async (rule) => {
    try {
      await api.patch(`/payroll/rules/${rule.id}/status`, {
        is_active: !rule.is_active,
      });

      await loadData();
    } catch (error) {
      setMessage(error.message || "Erreur lors du changement de statut.");
    }
  };

  if (loading) {
    return (
      <div className="payroll-settings-page">
        <div className="payroll-loading">
          Chargement des paramètres de paie...
        </div>
      </div>
    );
  }

  const activeComponents = components.filter(
    (item) => item.is_active
  ).length;

  const activeRules = rules.filter(
    (item) => item.is_active
  ).length;

  return (
    <div className="payroll-settings-page">

      <div className="page-header">
        <div>
          <h1>Paramètres de paie</h1>
          <p>
            Configurez les éléments utilisés pour calculer les bulletins.
          </p>
        </div>

        <button
          className="btn btn-primary"
          onClick={initializePayroll}
          disabled={saving}
        >
          Initialiser la paie
        </button>
      </div>

      {message && (
        <div className="payroll-message">
          {message}
        </div>
      )}

      <MiniDashboard
        stats={[
          {
            label: "Composants actifs",
            value: activeComponents,
            icon: Layers,
          },
          {
            label: "Règles actives",
            value: activeRules,
            icon: ShieldCheck,
          },
          {
            label: "Devise",
            value: settings.currency,
            icon: Coins,
          },
          {
            label: "Jours mensuels",
            value: settings.monthly_work_days,
            icon: CalendarDays,
          },
        ]}
      />

      <div className="payroll-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={activeTab === tab.id ? "active" : ""}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "general" && (
        <form
          className="settings-card"
          onSubmit={saveSettings}
        >
          <div className="card-title">
            <h2>Configuration générale</h2>
            <p>Paramètres utilisés par le moteur de paie.</p>
          </div>

          <div className="form-grid">

            <div className="form-group">
              <label>Devise</label>
              <input
                value={settings.currency}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    currency: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Jours mensuels</label>
              <input
                type="number"
                step="0.01"
                value={settings.monthly_work_days}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    monthly_work_days: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Heures mensuelles</label>
              <input
                type="number"
                step="0.01"
                value={settings.monthly_work_hours}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    monthly_work_hours: e.target.value,
                  })
                }
              />
            </div>

            <div className="form-group">
              <label>Décimales d'arrondi</label>
              <input
                type="number"
                min="0"
                max="4"
                value={settings.rounding_decimals}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    rounding_decimals: e.target.value,
                  })
                }
              />
            </div>

          </div>

          <div className="form-actions">
            <button
              className="btn btn-primary"
              type="submit"
              disabled={saving}
            >
              Enregistrer
            </button>
          </div>
        </form>
      )}

      {activeTab === "components" && (
        <div className="settings-card">

          <div className="section-header">
            <div>
              <h2>Composants de paie</h2>
              <p>
                Salaires, primes, indemnités, retenues et autres éléments.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={openNewComponent}
            >
              + Nouveau composant
            </button>
          </div>

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Désignation</th>
                  <th>Type</th>
                  <th>Calcul</th>
                  <th>Fiscalité</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {components.map((component) => (
                  <tr key={component.id}>

                    <td>
                      <strong>{component.code}</strong>
                    </td>

                    <td>{component.name}</td>

                    <td>
                      {component.category === "earning"
                        ? "Gain"
                        : component.category === "deduction"
                        ? "Retenue"
                        : component.category}
                    </td>

                    <td>{component.calculation_method}</td>

                    <td>
                      <div className="tax-flags">
                        {component.irpp_subject && (
                          <span>IRPP</span>
                        )}

                        {component.cnss_subject && (
                          <span>CNSS</span>
                        )}

                        {component.cnamgs_subject && (
                          <span>CNAMGS</span>
                        )}

                        {component.tcs_subject && (
                          <span>TCS</span>
                        )}
                      </div>
                    </td>

                    <td>
                      <button
                        className={
                          component.is_active
                            ? "status active"
                            : "status inactive"
                        }
                        onClick={() =>
                          toggleComponent(component)
                        }
                      >
                        {component.is_active
                          ? "Actif"
                          : "Inactif"}
                      </button>
                    </td>

                    <td>
                      <button
                        className="table-action"
                        onClick={() =>
                          openEditComponent(component)
                        }
                      >
                        Modifier
                      </button>
                    </td>

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === "rules" && (
        <div className="settings-card">

          <div className="section-header">
            <div>
              <h2>Cotisations & taxes</h2>
              <p>
                Configurez les taux et bases de calcul.
              </p>
            </div>

            <button
              className="btn btn-primary"
              onClick={openNewRule}
            >
              + Nouvelle règle
            </button>
          </div>

          <div className="table-wrapper">
            <table>

              <thead>
                <tr>
                  <th>Code</th>
                  <th>Règle</th>
                  <th>Salarié</th>
                  <th>Employeur</th>
                  <th>Base</th>
                  <th>Calcul</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>

              <tbody>
                {rules.map((rule) => (
                  <tr key={rule.id}>

                    <td>
                      <strong>{rule.code}</strong>
                    </td>

                    <td>{rule.name}</td>

                    <td>
                      {rule.employee_rate ?? 0} %
                    </td>

                    <td>
                      {rule.employer_rate ?? 0} %
                    </td>

                    <td>
                      {rule.base_type}
                    </td>

                    <td>
                      {rule.calculation_method}
                    </td>

                    <td>
                      <button
                        className={
                          rule.is_active
                            ? "status active"
                            : "status inactive"
                        }
                        onClick={() =>
                          toggleRule(rule)
                        }
                      >
                        {rule.is_active
                          ? "Actif"
                          : "Inactif"}
                      </button>
                    </td>

                    <td>
                      <button
                        className="table-action"
                        onClick={() =>
                          openEditRule(rule)
                        }
                      >
                        Modifier
                      </button>

                      {rule.calculation_method === "progressive" && (
                        <button
                          className="table-action"
                          onClick={() =>
                            alert(
                              "Gestion des tranches IRPP : prochaine étape"
                            )
                          }
                        >
                          Tranches
                        </button>
                      )}
                    </td>

                  </tr>
                ))}
              </tbody>

            </table>
          </div>
        </div>
      )}

      {/* MODAL COMPOSANT */}

      {componentModal && (
        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">
              <div>
                <h2>
                  {editingComponent
                    ? "Modifier le composant"
                    : "Nouveau composant"}
                </h2>
                <p>
                  Définissez le comportement du composant.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setComponentModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveComponent}>

              <div className="form-grid">

                <div className="form-group">
                  <label>Code</label>
                  <input
                    required
                    value={componentForm.code}
                    disabled={!!editingComponent}
                    onChange={(e) =>
                      setComponentForm({
                        ...componentForm,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Désignation</label>
                  <input
                    required
                    value={componentForm.name}
                    onChange={(e) =>
                      setComponentForm({
                        ...componentForm,
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Catégorie</label>
                  <select
                    value={componentForm.category}
                    onChange={(e) =>
                      setComponentForm({
                        ...componentForm,
                        category: e.target.value,
                      })
                    }
                  >
                    <option value="earning">Gain</option>
                    <option value="deduction">Retenue</option>
                    <option value="information">
                      Information
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Méthode de calcul</label>
                  <select
                    value={componentForm.calculation_method}
                    onChange={(e) =>
                      setComponentForm({
                        ...componentForm,
                        calculation_method: e.target.value,
                      })
                    }
                  >
                    <option value="manual">Manuel</option>
                    <option value="fixed">Montant fixe</option>
                    <option value="percentage">
                      Pourcentage
                    </option>
                    <option value="progressive">
                      Progressif
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Taux (%)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={componentForm.rate}
                    onChange={(e) =>
                      setComponentForm({
                        ...componentForm,
                        rate: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Montant fixe</label>
                  <input
                    type="number"
                    step="0.01"
                    value={componentForm.fixed_amount}
                    onChange={(e) =>
                      setComponentForm({
                        ...componentForm,
                        fixed_amount: e.target.value,
                      })
                    }
                  />
                </div>

              </div>

              <div className="tax-options">

                <label>
                  <input
                    type="checkbox"
                    checked={componentForm.taxable}
                    onChange={(e) =>
                      setComponentForm({
                        ...componentForm,
                        taxable: e.target.checked,
                      })
                    }
                  />
                  Imposable
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={componentForm.cnss_subject}
                    onChange={(e) =>
                      setComponentForm({
                        ...componentForm,
                        cnss_subject: e.target.checked,
                      })
                    }
                  />
                  Soumis CNSS
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={componentForm.cnamgs_subject}
                    onChange={(e) =>
                      setComponentForm({
                        ...componentForm,
                        cnamgs_subject: e.target.checked,
                      })
                    }
                  />
                  Soumis CNAMGS
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={componentForm.tcs_subject}
                    onChange={(e) =>
                      setComponentForm({
                        ...componentForm,
                        tcs_subject: e.target.checked,
                      })
                    }
                  />
                  Soumis TCS
                </label>

                <label>
                  <input
                    type="checkbox"
                    checked={componentForm.irpp_subject}
                    onChange={(e) =>
                      setComponentForm({
                        ...componentForm,
                        irpp_subject: e.target.checked,
                      })
                    }
                  />
                  Soumis IRPP
                </label>

              </div>

              <div className="modal-actions">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() =>
                    setComponentModal(false)
                  }
                >
                  Annuler
                </button>

                <button
                  className="btn btn-primary"
                  disabled={saving}
                >
                  Enregistrer
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* MODAL REGLE */}

      {ruleModal && (
        <div className="modal-overlay">

          <div className="modal">

            <div className="modal-header">
              <div>
                <h2>
                  {editingRule
                    ? "Modifier la règle"
                    : "Nouvelle règle"}
                </h2>

                <p>
                  Configurez le calcul de la cotisation ou taxe.
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() => setRuleModal(false)}
              >
                ×
              </button>
            </div>

            <form onSubmit={saveRule}>

              <div className="form-grid">

                <div className="form-group">
                  <label>Code</label>
                  <input
                    required
                    value={ruleForm.code}
                    disabled={!!editingRule}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        code: e.target.value.toUpperCase(),
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Nom</label>
                  <input
                    required
                    value={ruleForm.name}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        name: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Type</label>
                  <select
                    value={ruleForm.rule_type}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        rule_type: e.target.value,
                      })
                    }
                  >
                    <option value="cotisation">
                      Cotisation
                    </option>
                    <option value="tax">
                      Taxe
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Méthode</label>
                  <select
                    value={ruleForm.calculation_method}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        calculation_method: e.target.value,
                      })
                    }
                  >
                    <option value="percentage">
                      Pourcentage
                    </option>

                    <option value="progressive">
                      Progressif
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Taux salarié (%)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={ruleForm.employee_rate}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        employee_rate: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Taux employeur (%)</label>
                  <input
                    type="number"
                    step="0.0001"
                    value={ruleForm.employer_rate}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        employer_rate: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Base de calcul</label>
                  <select
                    value={ruleForm.base_type}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        base_type: e.target.value,
                      })
                    }
                  >
                    <option value="gross_salary">
                      Salaire brut
                    </option>

                    <option value="taxable_salary">
                      Salaire imposable
                    </option>

                    <option value="base_salary">
                      Salaire de base
                    </option>

                    <option value="after_social_contributions">
                      Après cotisations sociales
                    </option>
                  </select>
                </div>

                <div className="form-group">
                  <label>Plafond</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ruleForm.ceiling_amount}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        ceiling_amount: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Exonération</label>
                  <input
                    type="number"
                    step="0.01"
                    value={ruleForm.exemption_amount}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        exemption_amount: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Date d'effet</label>
                  <input
                    type="date"
                    required
                    value={ruleForm.effective_from}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        effective_from: e.target.value,
                      })
                    }
                  />
                </div>

                <div className="form-group">
                  <label>Fin de validité</label>
                  <input
                    type="date"
                    value={ruleForm.effective_to}
                    onChange={(e) =>
                      setRuleForm({
                        ...ruleForm,
                        effective_to: e.target.value,
                      })
                    }
                  />
                </div>

              </div>

              <div className="form-group full">
                <label>Description</label>

                <textarea
                  rows="3"
                  value={ruleForm.description}
                  onChange={(e) =>
                    setRuleForm({
                      ...ruleForm,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <div className="modal-actions">

                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setRuleModal(false)}
                >
                  Annuler
                </button>

                <button
                  className="btn btn-primary"
                  disabled={saving}
                >
                  Enregistrer
                </button>

              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}