import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import api, { API_ORIGIN } from "../../api/api";

import "./EmployerCharges.css";


// =====================================================
// OUTILS
// =====================================================

const toNumber = (value) => Number(value || 0);

const formatAmount = (value) =>
    toNumber(value).toLocaleString("fr-FR", { maximumFractionDigits: 0 });

const formatDash = (value) =>
    toNumber(value) ? formatAmount(value) : "-";

const formatRate = (value) => `${toNumber(value).toFixed(2)}%`;

const percentOf = (part, total) =>
    total ? ((toNumber(part) / toNumber(total)) * 100).toFixed(2) : "0.00";

const monthLabel = (year, month) =>
    new Date(year, month - 1, 1).toLocaleDateString("fr-FR", {
        month: "long",
        year: "numeric",
    });

const currentPeriod = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
};

const initials = (row) =>
    `${row.first_name?.[0] || ""}${row.last_name?.[0] || ""}`.toUpperCase();

const emptyTotals = { gross: 0, cnss: 0, cnamgs: 0, other: 0, total: 0, months: 0 };

const SLIP_STATUS = {
    calculated: "Calculé",
    validated: "Validé",
    paid: "Payé",
};

const downloadCsv = (header, lines, filename) => {
    const csv = [header, ...lines]
        .map((line) =>
            line.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";")
        )
        .join("\n");

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");

    link.href = URL.createObjectURL(blob);
    link.download = filename;
    link.click();
    URL.revokeObjectURL(link.href);
};

const yearOptions = () => {
    const current = new Date().getFullYear();
    return [current + 1, current, current - 1, current - 2, current - 3];
};


// =====================================================
// PETITS COMPOSANTS
// =====================================================

const Employee = ({ row, onClick }) => (
    <div className="ec-emp">
        {row.photo_url ? (
            <img src={`${API_ORIGIN}${row.photo_url}`} alt="" />
        ) : (
            <span className="ec-avatar">{initials(row)}</span>
        )}

        {onClick ? (
            <button
                type="button"
                className="ec-link"
                onClick={onClick}
                title="Voir l'historique de cet employé"
            >
                {row.first_name} {row.last_name}
            </button>
        ) : (
            <span>{row.first_name} {row.last_name}</span>
        )}
    </div>
);

const Cards = ({ cards }) => (
    <section className="ec-cards">
        {cards.map((card) => (
            <div key={card.key} className="ec-card ec-kpi">
                <div>
                    <span className="ec-muted">{card.label}</span>
                    <strong>{card.value}</strong>
                    <span className="ec-muted ec-small">{card.note}</span>
                </div>
                <i className={`ec-dot ec-${card.tone}`} />
            </div>
        ))}
    </section>
);


// =====================================================
// PAGE
// =====================================================

const EmployerCharges = () => {

    const [tab, setTab] = useState("month");

    const [period, setPeriod] = useState(currentPeriod());
    const [year, setYear] = useState(String(new Date().getFullYear()));
    const [scope, setScope] = useState("all");
    const [serviceId, setServiceId] = useState("");
    const [status, setStatus] = useState("actif");

    const [services, setServices] = useState([]);

    // Vue « Par mois »
    const [rows, setRows] = useState([]);
    const [totals, setTotals] = useState(emptyTotals);

    // Vue « Cumul »
    const [cumul, setCumul] = useState({
        employees: [],
        months: [],
        totals: emptyTotals,
    });

    // Historique d'un employé
    const [history, setHistory] = useState(null);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const requestId = useRef(0);
    const historyRef = useRef(null);


    // -------------------------------------------------
    // Services (filtre)
    // -------------------------------------------------

    useEffect(() => {
        api.get("/payroll/employer-charges/services")
            .then((res) => setServices(res.data || []))
            .catch(() => setServices([]));
    }, []);


    // -------------------------------------------------
    // Chargement (selon l'onglet)
    // -------------------------------------------------

    const load = useCallback(async () => {
        const current = ++requestId.current;

        setLoading(true);
        setError("");

        try {
            if (tab === "month") {
                const [y, m] = period.split("-").map(Number);

                if (!y || !m) return;

                const params = new URLSearchParams({ year: y, month: m, status });

                if (serviceId) params.set("service_id", serviceId);

                const res = await api.get(
                    `/payroll/employer-charges?${params.toString()}`
                );

                if (current !== requestId.current) return;

                setRows(res.data?.rows || []);
                setTotals(res.data?.totals || emptyTotals);
            } else {
                const params = new URLSearchParams({ year, scope, status });

                if (serviceId) params.set("service_id", serviceId);

                const res = await api.get(
                    `/payroll/employer-charges/cumulative?${params.toString()}`
                );

                if (current !== requestId.current) return;

                setCumul({
                    employees: res.data?.employees || [],
                    months: res.data?.months || [],
                    totals: res.data?.totals || emptyTotals,
                });
            }
        } catch (err) {
            if (current !== requestId.current) return;

            setRows([]);
            setTotals(emptyTotals);
            setCumul({ employees: [], months: [], totals: emptyTotals });
            setError(err.message);
        } finally {
            if (current === requestId.current) setLoading(false);
        }
    }, [tab, period, year, scope, serviceId, status]);

    useEffect(() => {
        load();
    }, [load]);


    // -------------------------------------------------
    // Historique d'un employé
    // -------------------------------------------------

    const openHistory = async (employeeId) => {
        const historyYear =
            tab === "month" ? period.split("-")[0] : year;

        setHistoryLoading(true);
        setError("");

        try {
            const params = new URLSearchParams({
                year: historyYear,
                scope: tab === "month" ? "all" : scope,
            });

            const res = await api.get(
                `/payroll/employer-charges/employee/${employeeId}?${params.toString()}`
            );

            setHistory({ ...res.data, year: historyYear });

            setTimeout(
                () => historyRef.current?.scrollIntoView({ behavior: "smooth" }),
                50
            );
        } catch (err) {
            setError(err.message);
        } finally {
            setHistoryLoading(false);
        }
    };


    // -------------------------------------------------
    // Exports
    // -------------------------------------------------

    const exportMonth = () =>
        downloadCsv(
            [
                "Employé", "Matricule", "Poste", "Salaire brut",
                "CNSS base", "CNSS taux", "CNSS montant",
                "CNAMGS base", "CNAMGS taux", "CNAMGS montant",
                "Autres charges", "Total charges patronales",
            ],
            rows.map((r) => [
                `${r.first_name} ${r.last_name}`, r.matricule, r.position || "",
                toNumber(r.gross_salary),
                toNumber(r.cnss_base), toNumber(r.cnss_rate), toNumber(r.cnss_amount),
                toNumber(r.cnamgs_base), toNumber(r.cnamgs_rate), toNumber(r.cnamgs_amount),
                toNumber(r.other_amount), toNumber(r.total_amount),
            ]),
            `charges-patronales-${period}.csv`
        );

    const exportCumul = () =>
        downloadCsv(
            [
                "Employé", "Matricule", "Poste", "Mois",
                "Salaire brut cumulé", "CNSS", "CNAMGS",
                "Autres charges", "Total versé",
            ],
            cumul.employees.map((r) => [
                `${r.first_name} ${r.last_name}`, r.matricule, r.position || "",
                toNumber(r.months_count), toNumber(r.gross_salary),
                toNumber(r.cnss_amount), toNumber(r.cnamgs_amount),
                toNumber(r.other_amount), toNumber(r.total_amount),
            ]),
            `charges-patronales-cumul-${year}.csv`
        );

    const exportHistory = () => {
        if (!history) return;

        downloadCsv(
            [
                "Mois", "Salaire brut", "CNSS", "CNAMGS",
                "Autres charges", "Total versé", "Statut",
            ],
            history.rows.map((r) => [
                monthLabel(r.period_year, r.period_month),
                toNumber(r.gross_salary), toNumber(r.cnss_amount),
                toNumber(r.cnamgs_amount), toNumber(r.other_amount),
                toNumber(r.total_amount), SLIP_STATUS[r.slip_status] || r.slip_status,
            ]),
            `cotisations-${history.employee.matricule}-${history.year}.csv`
        );
    };

    const handleExport = tab === "month" ? exportMonth : exportCumul;
    const canExport =
        tab === "month" ? rows.length > 0 : cumul.employees.length > 0;


    // -------------------------------------------------
    // Cartes
    // -------------------------------------------------

    const cards = useMemo(() => {
        const t = tab === "month" ? totals : cumul.totals;

        const note =
            tab === "month"
                ? "Ce mois"
                : `${t.months || 0} mois · ${year === "all" ? "toutes années" : year}`;

        return [
            {
                key: "total",
                label: tab === "month" ? "Total charges patronales" : "Total versé par la société",
                value: formatAmount(t.total) + " FCFA",
                note,
                tone: "orange",
            },
            {
                key: "cnss",
                label: "Total CNSS (Employeur)",
                value: formatAmount(t.cnss) + " FCFA",
                note: `${percentOf(t.cnss, t.gross)}% du brut`,
                tone: "green",
            },
            {
                key: "cnamgs",
                label: "Total CNAMGS (Employeur)",
                value: formatAmount(t.cnamgs) + " FCFA",
                note: `${percentOf(t.cnamgs, t.gross)}% du brut`,
                tone: "blue",
            },
            {
                key: "other",
                label: "Total autres charges",
                value: toNumber(t.other) ? formatAmount(t.other) + " FCFA" : "-",
                note: `${percentOf(t.other, t.gross)}% du brut`,
                tone: "violet",
            },
        ];
    }, [tab, totals, cumul.totals, year]);


    // -------------------------------------------------
    // Rendu
    // -------------------------------------------------

    return (
        <div className="ec-page">

            <div className="ec-head ec-noprint">
                <div className="ec-tabs" role="tablist">
                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === "month"}
                        className={tab === "month" ? "ec-tab ec-tab-on" : "ec-tab"}
                        onClick={() => setTab("month")}
                    >
                        Par mois
                    </button>

                    <button
                        type="button"
                        role="tab"
                        aria-selected={tab === "cumul"}
                        className={tab === "cumul" ? "ec-tab ec-tab-on" : "ec-tab"}
                        onClick={() => setTab("cumul")}
                    >
                        Cumul
                    </button>
                </div>

                <div className="ec-actions">
                    <button
                        type="button"
                        className="ec-btn"
                        onClick={handleExport}
                        disabled={!canExport}
                    >
                        Exporter (Excel)
                    </button>

                    <button
                        type="button"
                        className="ec-btn ec-btn-primary"
                        onClick={() => window.print()}
                    >
                        Imprimer le rapport
                    </button>
                </div>
            </div>


            <Cards cards={cards} />


            <section className="ec-card ec-filters ec-noprint">
                {tab === "month" ? (
                    <label>
                        Période de paie
                        <input
                            type="month"
                            value={period}
                            onChange={(e) => setPeriod(e.target.value)}
                        />
                    </label>
                ) : (
                    <>
                        <label>
                            Année
                            <select value={year} onChange={(e) => setYear(e.target.value)}>
                                <option value="all">Toutes les années</option>
                                {yearOptions().map((y) => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </label>

                        <label>
                            Bulletins pris en compte
                            <select value={scope} onChange={(e) => setScope(e.target.value)}>
                                <option value="all">Calculés, validés et payés</option>
                                <option value="validated">Validés et payés</option>
                            </select>
                        </label>
                    </>
                )}

                <label>
                    Service / Département
                    <select
                        value={serviceId}
                        onChange={(e) => setServiceId(e.target.value)}
                    >
                        <option value="">Tous les services</option>
                        {services.map((service) => (
                            <option key={service.id} value={service.id}>
                                {service.name}
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Statut employé
                    <select value={status} onChange={(e) => setStatus(e.target.value)}>
                        <option value="actif">Actif</option>
                        <option value="inactif">Inactif</option>
                        <option value="all">Tous</option>
                    </select>
                </label>

                <button
                    type="button"
                    className="ec-btn ec-btn-primary ec-refresh"
                    onClick={load}
                >
                    Actualiser
                </button>
            </section>


            {error && <div className="ec-error">{error}</div>}


            {/* =========================================
                ONGLET : PAR MOIS
            ========================================= */}
            {tab === "month" && (
                <section className="ec-card ec-detail">
                    <h2>Détail des charges patronales par employé</h2>
                    <p className="ec-muted">
                        Calculées sur la base du salaire brut. Cliquez sur un employé
                        pour voir son historique.
                    </p>

                    <div className="ec-scroll">
                        <table className="ec-table">
                            <thead>
                                <tr>
                                    <th rowSpan={2} className="ec-left">Employé</th>
                                    <th rowSpan={2} className="ec-left">Matricule</th>
                                    <th rowSpan={2} className="ec-left">Poste</th>
                                    <th rowSpan={2}>Salaire brut<br />(FCFA)</th>
                                    <th colSpan={3} className="ec-center ec-sep">CNSS (Employeur)</th>
                                    <th colSpan={3} className="ec-center ec-sep">CNAMGS (Employeur)</th>
                                    <th className="ec-center ec-sep">Autres charges</th>
                                    <th rowSpan={2} className="ec-sep">Total charges<br />patronales</th>
                                </tr>
                                <tr>
                                    <th className="ec-sep">Base</th>
                                    <th>Taux</th>
                                    <th>Montant</th>
                                    <th className="ec-sep">Base</th>
                                    <th>Taux</th>
                                    <th>Montant</th>
                                    <th className="ec-sep">Montant</th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading && (
                                    <tr>
                                        <td colSpan={12} className="ec-center ec-empty">Chargement…</td>
                                    </tr>
                                )}

                                {!loading && !rows.length && (
                                    <tr>
                                        <td colSpan={12} className="ec-center ec-empty">
                                            Aucun bulletin calculé pour cette période.
                                        </td>
                                    </tr>
                                )}

                                {!loading && rows.map((r) => (
                                    <tr key={r.slip_id}>
                                        <td className="ec-left">
                                            <Employee row={r} onClick={() => openHistory(r.employee_id)} />
                                        </td>
                                        <td className="ec-left">{r.matricule}</td>
                                        <td className="ec-left ec-wrap">{r.position}</td>
                                        <td>{formatAmount(r.gross_salary)}</td>

                                        <td className="ec-sep">{formatAmount(r.cnss_base)}</td>
                                        <td>{formatRate(r.cnss_rate)}</td>
                                        <td>{formatAmount(r.cnss_amount)}</td>

                                        <td className="ec-sep">{formatAmount(r.cnamgs_base)}</td>
                                        <td>{formatRate(r.cnamgs_rate)}</td>
                                        <td>{formatAmount(r.cnamgs_amount)}</td>

                                        <td className="ec-sep ec-center">{formatDash(r.other_amount)}</td>
                                        <td className="ec-sep ec-total">{formatAmount(r.total_amount)}</td>
                                    </tr>
                                ))}
                            </tbody>

                            {!loading && rows.length > 0 && (
                                <tfoot>
                                    <tr>
                                        <td colSpan={3} className="ec-left">Total</td>
                                        <td>{formatAmount(totals.gross)}</td>
                                        <td className="ec-sep" />
                                        <td />
                                        <td>{formatAmount(totals.cnss)}</td>
                                        <td className="ec-sep" />
                                        <td />
                                        <td>{formatAmount(totals.cnamgs)}</td>
                                        <td className="ec-sep ec-center">{formatDash(totals.other)}</td>
                                        <td className="ec-sep ec-total">{formatAmount(totals.total)}</td>
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>

                    <div className="ec-foot ec-muted">
                        Affichage de {rows.length ? 1 : 0} à {rows.length} sur {rows.length} employés
                    </div>
                </section>
            )}


            {/* =========================================
                ONGLET : CUMUL
            ========================================= */}
            {tab === "cumul" && (
                <>
                    <section className="ec-card ec-detail">
                        <h2>Cumul par employé</h2>
                        <p className="ec-muted">
                            Total des charges patronales versées pour chaque employé.
                            Cliquez sur un employé pour voir le détail mois par mois.
                        </p>

                        <div className="ec-scroll">
                            <table className="ec-table">
                                <thead>
                                    <tr>
                                        <th className="ec-left">Employé</th>
                                        <th className="ec-left">Matricule</th>
                                        <th className="ec-left">Poste</th>
                                        <th>Mois</th>
                                        <th>Salaire brut cumulé</th>
                                        <th className="ec-sep">CNSS</th>
                                        <th>CNAMGS</th>
                                        <th>Autres</th>
                                        <th className="ec-sep">Total versé</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {loading && (
                                        <tr>
                                            <td colSpan={9} className="ec-center ec-empty">Chargement…</td>
                                        </tr>
                                    )}

                                    {!loading && !cumul.employees.length && (
                                        <tr>
                                            <td colSpan={9} className="ec-center ec-empty">
                                                Aucun bulletin pour cette sélection.
                                            </td>
                                        </tr>
                                    )}

                                    {!loading && cumul.employees.map((r) => (
                                        <tr key={r.employee_id}>
                                            <td className="ec-left">
                                                <Employee row={r} onClick={() => openHistory(r.employee_id)} />
                                            </td>
                                            <td className="ec-left">{r.matricule}</td>
                                            <td className="ec-left ec-wrap">{r.position}</td>
                                            <td>{toNumber(r.months_count)}</td>
                                            <td>{formatAmount(r.gross_salary)}</td>
                                            <td className="ec-sep">{formatAmount(r.cnss_amount)}</td>
                                            <td>{formatAmount(r.cnamgs_amount)}</td>
                                            <td>{formatDash(r.other_amount)}</td>
                                            <td className="ec-sep ec-total">{formatAmount(r.total_amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>

                                {!loading && cumul.employees.length > 0 && (
                                    <tfoot>
                                        <tr>
                                            <td colSpan={4} className="ec-left">Total société</td>
                                            <td>{formatAmount(cumul.totals.gross)}</td>
                                            <td className="ec-sep">{formatAmount(cumul.totals.cnss)}</td>
                                            <td>{formatAmount(cumul.totals.cnamgs)}</td>
                                            <td>{formatDash(cumul.totals.other)}</td>
                                            <td className="ec-sep ec-total">{formatAmount(cumul.totals.total)}</td>
                                        </tr>
                                    </tfoot>
                                )}
                            </table>
                        </div>
                    </section>


                    <section className="ec-card ec-detail">
                        <h2>Total versé par la société, mois par mois</h2>

                        <div className="ec-scroll">
                            <table className="ec-table">
                                <thead>
                                    <tr>
                                        <th className="ec-left">Mois</th>
                                        <th>Employés</th>
                                        <th>Salaire brut</th>
                                        <th className="ec-sep">CNSS</th>
                                        <th>CNAMGS</th>
                                        <th>Autres</th>
                                        <th className="ec-sep">Total versé</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {!loading && !cumul.months.length && (
                                        <tr>
                                            <td colSpan={7} className="ec-center ec-empty">
                                                Aucune période pour cette sélection.
                                            </td>
                                        </tr>
                                    )}

                                    {!loading && cumul.months.map((m) => (
                                        <tr key={`${m.period_year}-${m.period_month}`}>
                                            <td className="ec-left ec-cap">
                                                {monthLabel(m.period_year, m.period_month)}
                                            </td>
                                            <td>{toNumber(m.employees_count)}</td>
                                            <td>{formatAmount(m.gross_salary)}</td>
                                            <td className="ec-sep">{formatAmount(m.cnss_amount)}</td>
                                            <td>{formatAmount(m.cnamgs_amount)}</td>
                                            <td>{formatDash(m.other_amount)}</td>
                                            <td className="ec-sep ec-total">{formatAmount(m.total_amount)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </section>
                </>
            )}


            {/* =========================================
                HISTORIQUE D'UN EMPLOYÉ
            ========================================= */}
            <div ref={historyRef} />

            {historyLoading && (
                <div className="ec-card ec-detail ec-muted">Chargement de l'historique…</div>
            )}

            {history && !historyLoading && (
                <section className="ec-card ec-detail">
                    <div className="ec-history-head">
                        <div>
                            <h2>
                                Cotisations de {history.employee.first_name} {history.employee.last_name}
                            </h2>
                            <p className="ec-muted">
                                {history.employee.matricule}
                                {history.employee.position ? ` · ${history.employee.position}` : ""}
                                {" · "}
                                {history.year === "all" ? "Toutes les années" : history.year}
                            </p>
                        </div>

                        <div className="ec-actions ec-noprint">
                            <button
                                type="button"
                                className="ec-btn"
                                onClick={exportHistory}
                                disabled={!history.rows.length}
                            >
                                Exporter
                            </button>

                            <button
                                type="button"
                                className="ec-btn"
                                onClick={() => setHistory(null)}
                            >
                                Fermer
                            </button>
                        </div>
                    </div>

                    <div className="ec-scroll">
                        <table className="ec-table">
                            <thead>
                                <tr>
                                    <th className="ec-left">Mois</th>
                                    <th>Salaire brut</th>
                                    <th className="ec-sep">CNSS</th>
                                    <th>CNAMGS</th>
                                    <th>Autres</th>
                                    <th className="ec-sep">Total versé</th>
                                    <th className="ec-center">Bulletin</th>
                                </tr>
                            </thead>

                            <tbody>
                                {!history.rows.length && (
                                    <tr>
                                        <td colSpan={7} className="ec-center ec-empty">
                                            Aucun bulletin pour cet employé sur cette période.
                                        </td>
                                    </tr>
                                )}

                                {history.rows.map((r) => (
                                    <tr key={r.slip_id}>
                                        <td className="ec-left ec-cap">
                                            {monthLabel(r.period_year, r.period_month)}
                                        </td>
                                        <td>{formatAmount(r.gross_salary)}</td>
                                        <td className="ec-sep">{formatAmount(r.cnss_amount)}</td>
                                        <td>{formatAmount(r.cnamgs_amount)}</td>
                                        <td>{formatDash(r.other_amount)}</td>
                                        <td className="ec-sep ec-total">{formatAmount(r.total_amount)}</td>
                                        <td className="ec-center">
                                            {SLIP_STATUS[r.slip_status] || r.slip_status}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>

                            {history.rows.length > 0 && (
                                <tfoot>
                                    <tr>
                                        <td className="ec-left">Total cumulé ({history.totals.months} mois)</td>
                                        <td>{formatAmount(history.totals.gross)}</td>
                                        <td className="ec-sep">{formatAmount(history.totals.cnss)}</td>
                                        <td>{formatAmount(history.totals.cnamgs)}</td>
                                        <td>{formatDash(history.totals.other)}</td>
                                        <td className="ec-sep ec-total">{formatAmount(history.totals.total)}</td>
                                        <td />
                                    </tr>
                                </tfoot>
                            )}
                        </table>
                    </div>
                </section>
            )}

        </div>
    );
};

export default EmployerCharges;