
import { useNavigate } from "react-router-dom";

import {
  UserPlus,
  FileText,
  CalendarCheck,
  ReceiptText,
  FilePlus2,
  ChevronRight,
} from "lucide-react";

import "./QuickActions.css";

const actions = [
  {
    key: "add-employee",
    label: "Ajouter un employé",
    icon: UserPlus,
    color: "orange",
    path: "/employees",
  },
  {
    key: "create-contract",
    label: "Gérer les contrats",
    icon: FileText,
    color: "blue",
    path: "/contracts",
  },
  {
    key: "record-attendance",
    label: "Enregistrer une présence",
    icon: CalendarCheck,
    color: "green",
    path: "/attendance",
  },
  {
    key: "generate-payslip",
    label: "Gérer la paie",
    icon: ReceiptText,
    color: "purple",
    path: "/paie/periodes",
  },
  {
    key: "create-quote",
    label: "Créer un devis",
    icon: FilePlus2,
    color: "teal",
    path: "/devis",
  },
];

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <section
      className="quick-actions"
      aria-labelledby="quick-actions-title"
    >
      <h2
        className="quick-actions-title"
        id="quick-actions-title"
      >
        Actions rapides
      </h2>

      <ul className="quick-actions-list">
        {actions.map((action) => {
          const Icon = action.icon;

          return (
            <li key={action.key}>
              <button
                type="button"
                className="quick-action-item"
                onClick={() => navigate(action.path)}
                aria-label={action.label}
              >
                <span
                  className={`quick-action-icon ${action.color}`}
                >
                  <Icon size={20} />
                </span>

                <span className="quick-action-label">
                  {action.label}
                </span>

                <ChevronRight
                  size={18}
                  className="quick-action-arrow"
                />
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
};

export default QuickActions;
