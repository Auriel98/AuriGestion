const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const path = require("path");

const authRoutes = require("./modules/auth/auth.routes");
const userRoutes = require("./routes/user/user.routes");
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
const companyRoutes = require("./modules/company/company.routes");


const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(cors({ origin: "http://localhost:5173" }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  "/uploads",
  express.static(path.resolve(process.env.UPLOAD_DIR || "uploads"))
);

app.get("/api/health", (req, res) => {
  res.json({ success: true, message: "EGENEM SaaS API OK" });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/employees", employeeRoutes);
app.use("/api/contracts", contractRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/attendance", attendanceRoutes);
app.use("/api/payroll/rules", payrollRuleRoutes);
app.use("/api/payroll/components", payrollComponentRoutes);
app.use("/api/payroll/periods", payrollPeriodRoutes);
app.use("/api/payroll/slips", payrollSlipRoutes);
app.use("/api/payroll/slips", payrollSlipLineRoutes);
app.use("/api/payroll/settings" ,payrollSettingsRoutes);
app.use("/api/payroll", payrollBracketRoutes);
app.use("/api/company", companyRoutes);

module.exports = app;