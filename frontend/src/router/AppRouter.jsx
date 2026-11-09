import {
    BrowserRouter,
    Routes,
    Route,
} from "react-router-dom";

import Login from "../pages/Login";
import Dashboard from "../pages/Dashboard";
import Users from "../pages/users/Users";
import Employees from "../pages/employees/Employees";
import Contracts from "../pages/contracts/Contracts";
import Attendance from "../pages/Attendance";

import DashboardLayout from "../layouts/DashboardLayout";
import ProtectedRoute from "../components/auth/ProtectedRoute";

import PayrollSettings from "../pages/payroll/PayrollSettings";
import PayrollPeriods from "../pages/payroll/PayrollPeriods";
import PayrollSlips from "../pages/payroll/PayrollSlips";
import PayrollSlipDetail from "../pages/payroll/PayrollSlipDetail";
import PayrollSlipPrint from "../pages/payroll/PayrollSlipPrint";
import EmployerCharges from "../pages/payroll/EmployerCharges";

import Company from "../pages/company/Company";
import Clients from "../pages/clients/Clients";

import Quotes from "../pages/Quotes/Quotes";
import QuoteDetail from "../pages/Quotes/QuoteDetail";

import Invoices from "../pages/Invoices/Invoices";
import InvoiceDetail from "../pages/Invoices/InvoiceDetail";

import Markets from "../pages/markets/Markets";
import MarketDetail from "../pages/markets/MarketDetail";

import Expenses from "../pages/expenses/Expenses";
import ExpenseDetail from "../pages/expenses/ExpenseDetail";

import Budget from "../pages/Budget/Budget";
import AuditLogs from "../pages/AuditLogs";


// =====================================================
// PAGE PROTÉGÉE + DASHBOARD LAYOUT
// permission (optionnel) : sans lui, il suffit d'être connecté
// =====================================================

const Page = ({ children, permission }) => (
    <ProtectedRoute permission={permission}>
        <DashboardLayout>
            {children}
        </DashboardLayout>
    </ProtectedRoute>
);


// =====================================================
// ROUTER
// =====================================================

const AppRouter = () => {

    return (
        <BrowserRouter>

            <Routes>

                {/* ==============================
                    AUTHENTIFICATION
                ============================== */}

                <Route path="/login" element={<Login />} />


                {/* ==============================
                    DASHBOARD (connecté suffit)
                ============================== */}

                <Route
                    path="/"
                    element={<Page><Dashboard /></Page>}
                />


                {/* ==============================
                    UTILISATEURS
                ============================== */}

                <Route
                    path="/users"
                    element={<Page permission="users:read"><Users /></Page>}
                />


                {/* ==============================
                    EMPLOYÉS
                ============================== */}

                <Route
                    path="/employees"
                    element={<Page permission="employees:read"><Employees /></Page>}
                />


                {/* ==============================
                    CONTRATS
                ============================== */}

                <Route
                    path="/contracts"
                    element={<Page permission="contracts:read"><Contracts /></Page>}
                />


                {/* ==============================
                    PRÉSENCE
                ============================== */}

                <Route
                    path="/attendance"
                    element={<Page permission="attendance:read"><Attendance /></Page>}
                />


                {/* ==============================
                    PAIE
                ============================== */}

                <Route
                    path="/paie/parametres"
                    element={<Page permission="payroll:read"><PayrollSettings /></Page>}
                />

                <Route
                    path="/paie/periodes"
                    element={<Page permission="payroll:read"><PayrollPeriods /></Page>}
                />

                <Route
                    path="/paie/periodes/:periodId/bulletins"
                    element={<Page permission="payroll:read"><PayrollSlips /></Page>}
                />

                <Route
                    path="/paie/bulletins/:id"
                    element={<Page permission="payroll:read"><PayrollSlipDetail /></Page>}
                />

                <Route
                    path="/paie/bulletins/:id/imprimer"
                    element={<Page permission="payroll:export_pdf"><PayrollSlipPrint /></Page>}
                />

                <Route
                    path="/paie/charges-patronales"
                    element={<Page permission="payroll:read"><EmployerCharges /></Page>}
                />


                {/* ==============================
                    ENTREPRISE
                ============================== */}

                <Route
                    path="/entreprise"
                    element={<Page permission="company:read"><Company /></Page>}
                />


                {/* ==============================
                    CLIENTS
                ============================== */}

                <Route
                    path="/clients"
                    element={<Page permission="clients:read"><Clients /></Page>}
                />


                {/* ==============================
                    DEVIS
                ============================== */}

                <Route
                    path="/devis"
                    element={<Page permission="quotes:read"><Quotes /></Page>}
                />

                <Route
                    path="/devis/:id"
                    element={<Page permission="quotes:read"><QuoteDetail /></Page>}
                />


                {/* ==============================
                    FACTURES
                ============================== */}

                <Route
                    path="/factures"
                    element={<Page permission="invoices:read"><Invoices /></Page>}
                />

                <Route
                    path="/factures/:id"
                    element={<Page permission="invoices:read"><InvoiceDetail /></Page>}
                />


                {/* ==============================
                    MARCHÉS
                ============================== */}

                <Route
                    path="/marches"
                    element={<Page permission="markets:read"><Markets /></Page>}
                />

                <Route
                    path="/marches/:id"
                    element={<Page permission="markets:read"><MarketDetail /></Page>}
                />


                {/* ==============================
                    DÉPENSES
                ============================== */}

                <Route
                    path="/depenses"
                    element={<Page permission="expenses:read"><Expenses /></Page>}
                />

                <Route
                    path="/depenses/:id"
                    element={<Page permission="expenses:read"><ExpenseDetail /></Page>}
                />


                {/* ==============================
                    BUDGET
                ============================== */}

                <Route
                    path="/budget"
                    element={<Page permission="budget:read"><Budget /></Page>}
                />


                {/* ==============================
                    JOURNAL D'AUDIT (directeur uniquement)
                ============================== */}

                <Route
                    path="/audit"
                    element={<Page permission="audit:read"><AuditLogs /></Page>}
                />

            </Routes>

        </BrowserRouter>
    );
};


export default AppRouter;