const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./routes/user/user.routes");
const profileRoutes = require("./routes/profile/profile.routes");
const employeeRoutes = require("./routes/employee/employee.routes");
const contractRoutes = require("./routes/contract/contract.routes");
const documentRoutes = require("./routes/document/document.routes");
const attendanceRoutes = require("./routes/attendance/attendance.routes");

const payrollRuleRoutes = require("./routes/payroll/payrollRule.routes");
const payrollComponentRoutes = require("./routes/payroll/payrollComponent.routes");
const payrollPeriodRoutes = require("./routes/payroll/payrollPeriod.routes");
const payrollSlipRoutes = require("./routes/payroll/payrollSlip.routes");
const payrollSlipLineRoutes = require("./routes/payroll/payrollSlipLine.routes");
const payrollSettingsRoutes = require("./routes/payroll/payrollSettings.routes");
const payrollBracketRoutes = require("./routes/payroll/payrollBracket.routes");
const employerChargesRoutes = require("./routes/payroll/employerCharges.routes");

const companyRoutes = require("./modules/company/company.routes");

const clientRoutes = require("./routes/client/client.routes");
const quoteRoutes = require("./routes/quote/quote.routes");
const invoiceRoutes = require("./routes/invoice/invoice.routes");
const paymentRoutes = require("./routes/payment/payment.routes");
const marketRoutes = require("./routes/market/market.routes");
const expenseRoutes = require("./routes/expense/expense.routes");
const budgetRoutes = require("./routes/budget/budget.routes");

const dashboardRoutes = require("./routes/dashboard/dashboardRoutes");

// Journal d'audit
const auditRoutes = require("./routes/audit/auditRoutes");

const app = express();

// ========================================
// CONFIGURATION DE SÉCURITÉ HTTP
// ========================================

app.use(
    helmet({
        crossOriginResourcePolicy: {
            policy: "cross-origin",
        },
    })
);

// ========================================
// CONFIGURATION CORS
// Origines autorisées configurables via .env :
// CORS_ORIGINS=http://localhost:5173,http://193.70.0.4
// ========================================

const allowedOrigins = (
    process.env.CORS_ORIGINS || "http://localhost:5173"
)
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(
    cors({
        origin: (origin, callback) => {
            // Requêtes sans origine (Postman, curl, serveur à serveur)
            if (!origin || allowedOrigins.includes(origin)) {
                return callback(null, true);
            }

            const error = new Error("Origine non autorisée par CORS.");
            error.status = 403;

            return callback(error);
        },
        credentials: true,
        methods: [
            "GET",
            "POST",
            "PUT",
            "PATCH",
            "DELETE",
            "OPTIONS",
        ],
        allowedHeaders: [
            "Content-Type",
            "Authorization",
        ],
    })
);

// ========================================
// MIDDLEWARES DE TRAITEMENT DES REQUÊTES
// ========================================

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ========================================
// FICHIERS UPLOADÉS
// Photos de profil et documents
// ========================================

app.use(
    "/uploads",
    express.static(
        path.resolve(process.env.UPLOAD_DIR || "uploads")
    )
);

// ========================================
// VÉRIFICATION DE L'ÉTAT DE L'API
// ========================================

app.get("/api/health", (req, res) => {
    res.json({
        success: true,
        message: "Auri Gestion API OK",
    });
});

// ========================================
// AUTHENTIFICATION, UTILISATEURS ET PROFIL
// ========================================

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/profile", profileRoutes);

// ========================================
// RESSOURCES HUMAINES
// ========================================

app.use("/api/employees", employeeRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/attendance", attendanceRoutes);

// ========================================
// PAIE
// ========================================

app.use("/api/payroll/rules", payrollRuleRoutes);
app.use("/api/payroll/components", payrollComponentRoutes);
app.use("/api/payroll/periods", payrollPeriodRoutes);
app.use("/api/payroll/slips", payrollSlipRoutes);
app.use("/api/payroll/slips", payrollSlipLineRoutes);
app.use("/api/payroll/settings", payrollSettingsRoutes);
app.use("/api/payroll/employer-charges", employerChargesRoutes);
app.use("/api/payroll", payrollBracketRoutes);

// ========================================
// ENTREPRISE
// ========================================

app.use("/api/company", companyRoutes);

// ========================================
// GESTION COMMERCIALE
// ========================================

app.use("/api/clients", clientRoutes);
app.use("/api/quotes", quoteRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api", paymentRoutes);
app.use("/api/markets", marketRoutes);

// ========================================
// FINANCES
// ========================================

app.use("/api/expenses", expenseRoutes);
app.use("/api/budget", budgetRoutes);

// ========================================
// TABLEAU DE BORD
// ========================================

app.use("/api/dashboard", dashboardRoutes);

// ========================================
// JOURNAL D'AUDIT
// GET /api/audit-logs
// ========================================

app.use("/api/audit-logs", auditRoutes);

// ========================================
// GESTION DES ROUTES INEXISTANTES
// ========================================

app.use((req, res) => {
    res.status(404).json({
        success: false,
        message: `Route introuvable : ${req.method} ${req.originalUrl}`,
    });
});

// ========================================
// GESTION GLOBALE DES ERREURS
// ========================================

app.use((err, req, res, next) => {
    console.error("Erreur serveur :", err);

    if (res.headersSent) {
        return next(err);
    }

    res.status(err.status || 500).json({
        success: false,
        message:
            err.status && err.status < 500
                ? err.message
                : "Une erreur interne est survenue.",
    });
});

module.exports = app;