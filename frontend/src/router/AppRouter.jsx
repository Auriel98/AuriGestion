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
import Company from "../pages/company/Company";
// =====================================================
// PAGE PROTÉGÉE + DASHBOARD LAYOUT
// =====================================================

const Page = ({ children }) => (
    <ProtectedRoute>
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

                <Route
                    path="/login"
                    element={<Login />}
                />


                {/* ==============================
                    DASHBOARD
                ============================== */}

                <Route
                    path="/"
                    element={
                        <Page>
                            <Dashboard />
                        </Page>
                    }
                />


                {/* ==============================
                    UTILISATEURS
                ============================== */}

                <Route
                    path="/users"
                    element={
                        <Page>
                            <Users />
                        </Page>
                    }
                />


                {/* ==============================
                    EMPLOYÉS
                ============================== */}

                <Route
                    path="/employees"
                    element={
                        <Page>
                            <Employees />
                        </Page>
                    }
                />


                {/* ==============================
                    CONTRATS
                ============================== */}

                <Route
                    path="/contracts"
                    element={
                        <Page>
                            <Contracts />
                        </Page>
                    }
                />


                {/* ==============================
                    PRÉSENCE
                ============================== */}

                <Route
                    path="/attendance"
                    element={
                        <Page>
                            <Attendance />
                        </Page>
                    }
                />


                {/* =================================================
                    PAIE
                ================================================= */}


                {/* Paramètres de paie */}

                <Route
                    path="/paie/parametres"
                    element={
                        <Page>
                            <PayrollSettings />
                        </Page>
                    }
                />


                {/* Liste des périodes */}

                <Route
                    path="/paie/periodes"
                    element={
                        <Page>
                            <PayrollPeriods />
                        </Page>
                    }
                />


                {/* Bulletins d'une période */}

                <Route
                    path="/paie/periodes/:periodId/bulletins"
                    element={
                        <Page>
                            <PayrollSlips />
                        </Page>
                    }
                />


                {/* Détail d'un bulletin */}

                <Route
                    path="/paie/bulletins/:id"
                    element={
                        <Page>
                            <PayrollSlipDetail />
                        </Page>
                    }
                />


                {/* Impression du bulletin */}

                <Route
                    path="/paie/bulletins/:id/imprimer"
                    element={
                        <Page>
                            <PayrollSlipPrint />
                        </Page>
                    }
                />
                {/* ==============================
                    ENTREPRISE
                ============================== */}

                <Route
                    path="/entreprise"
                    element={
                        <Page>
                            <Company />
                        </Page>
                    }
                />

            </Routes>

        </BrowserRouter>
    );
};


export default AppRouter;