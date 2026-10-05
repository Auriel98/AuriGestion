import React from "react";
import { X } from "lucide-react";


// Fenêtre modale commune aux écrans de paie.
// Les formulaires (avec leurs boutons) se placent dans {children}.

const PayrollModal = ({ title, onClose, children, wide = false }) => {

    return (
        <div
            className="payroll-modal-overlay"
            onMouseDown={(e) => {
                if (e.target === e.currentTarget) onClose();
            }}
        >

            <div
                className={`payroll-modal ${wide ? "payroll-modal-wide" : ""}`}
            >

                <div className="payroll-modal-header">

                    <h3>{title}</h3>

                    <button
                        type="button"
                        className="payroll-icon-btn"
                        onClick={onClose}
                        aria-label="Fermer"
                    >
                        <X size={18} />
                    </button>

                </div>

                <div className="payroll-modal-body">
                    {children}
                </div>

            </div>

        </div>
    );
};


export default PayrollModal;
