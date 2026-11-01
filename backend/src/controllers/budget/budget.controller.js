const pool = require("../../config/db");

// =====================================================
// TABLEAU DE BORD BUDGET ET RENTABILITÉ
// =====================================================
const getBudgetDashboard = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    // Budget, dépenses et facturation par marché
    const result = await pool.query(
      `
      WITH market_budget AS (
        SELECT
          m.id AS market_id,

          COALESCE(
            SUM(
              CASE
                WHEN b.movement_type IN ('initial', 'increase')
                  THEN b.amount
                WHEN b.movement_type = 'decrease'
                  THEN -b.amount
                ELSE 0
              END
            ),
            0
          ) AS adjusted_budget

        FROM markets m

        LEFT JOIN market_budget_movements b
          ON b.market_id = m.id
         AND b.company_id = m.company_id

        WHERE m.company_id = $1
          AND m.status <> 'cancelled'

        GROUP BY m.id
      ),

      market_expenses AS (
        SELECT
          market_id,
          COALESCE(SUM(amount), 0) AS spent
        FROM expenses
        WHERE company_id = $1
          AND status = 'validated'
          AND market_id IS NOT NULL
        GROUP BY market_id
      ),

      market_invoices AS (
        SELECT
          i.market_id,
          COALESCE(SUM(i.total_amount), 0) AS billed,

          COALESCE(
            SUM(
              CASE
                WHEN i.status <> 'cancelled'
                  THEN COALESCE(i.amount_paid, 0)
                ELSE 0
              END
            ),
            0
          ) AS collected

        FROM invoices i

        WHERE i.company_id = $1
          AND i.status NOT IN ('draft', 'cancelled')
          AND i.market_id IS NOT NULL

        GROUP BY i.market_id
      )

      SELECT
        COUNT(*)::INTEGER AS market_count,

        COALESCE(SUM(mb.adjusted_budget), 0)
          AS total_budget,

        COALESCE(SUM(COALESCE(me.spent, 0)), 0)
          AS total_spent,

        COALESCE(
          SUM(mb.adjusted_budget - COALESCE(me.spent, 0)),
          0
        ) AS available_budget,

        COALESCE(SUM(COALESCE(mi.billed, 0)), 0)
          AS total_billed,

        COALESCE(SUM(COALESCE(mi.collected, 0)), 0)
          AS total_collected,

        COALESCE(
          SUM(COALESCE(mi.billed, 0) - COALESCE(mi.collected, 0)),
          0
        ) AS outstanding_amount,

        COALESCE(
          SUM(COALESCE(mi.billed, 0) - COALESCE(me.spent, 0)),
          0
        ) AS estimated_margin

      FROM market_budget mb

      LEFT JOIN market_expenses me
        ON me.market_id = mb.market_id

      LEFT JOIN market_invoices mi
        ON mi.market_id = mb.market_id
      `,
      [companyId]
    );

    // Dépenses générales validées, hors marchés
    const generalExpenses = await pool.query(
      `
      SELECT COALESCE(SUM(amount), 0) AS total
      FROM expenses
      WHERE company_id = $1
        AND status = 'validated'
        AND market_id IS NULL
      `,
      [companyId]
    );

    // Factures hors marchés
    const generalInvoices = await pool.query(
      `
      SELECT
        COALESCE(SUM(total_amount), 0) AS billed,
        COALESCE(SUM(amount_paid), 0) AS collected
      FROM invoices
      WHERE company_id = $1
        AND status NOT IN ('draft', 'cancelled')
        AND market_id IS NULL
      `,
      [companyId]
    );

    res.json({
      ...result.rows[0],
      general_expenses: generalExpenses.rows[0].total,
      general_billed: generalInvoices.rows[0].billed,
      general_collected: generalInvoices.rows[0].collected,
    });
  } catch (error) {
    console.error("Erreur getBudgetDashboard:", error);

    res.status(500).json({
      message: "Erreur lors du chargement du tableau de bord financier",
    });
  }
};

// =====================================================
// RENTABILITÉ PAR MARCHÉ
// =====================================================
const getMarketProfitability = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const result = await pool.query(
      `
      SELECT
        m.id,
        m.market_number,
        m.title,
        m.status,

        c.name AS client_name,

        COALESCE(b.budget, 0) AS adjusted_budget,

        COALESCE(e.spent, 0) AS total_spent,

        COALESCE(i.billed, 0) AS total_billed,

        COALESCE(i.collected, 0) AS total_collected,

        COALESCE(i.billed, 0) - COALESCE(i.collected, 0)
          AS outstanding_amount,

        COALESCE(i.billed, 0) - COALESCE(e.spent, 0)
          AS estimated_margin,

        CASE
          WHEN COALESCE(i.billed, 0) > 0
          THEN ROUND(
            (
              (COALESCE(i.billed, 0) - COALESCE(e.spent, 0))
              / i.billed
            ) * 100,
            2
          )
          ELSE 0
        END AS margin_percent

      FROM markets m

      LEFT JOIN clients c
        ON c.id = m.client_id
       AND c.company_id = m.company_id

      LEFT JOIN LATERAL (
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN movement_type IN ('initial', 'increase')
                  THEN amount
                WHEN movement_type = 'decrease'
                  THEN -amount
                ELSE 0
              END
            ),
            0
          ) AS budget

        FROM market_budget_movements

        WHERE market_id = m.id
          AND company_id = m.company_id
      ) b ON TRUE

      LEFT JOIN LATERAL (
        SELECT COALESCE(SUM(amount), 0) AS spent

        FROM expenses

        WHERE market_id = m.id
          AND company_id = m.company_id
          AND status = 'validated'
      ) e ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          COALESCE(SUM(total_amount), 0) AS billed,
          COALESCE(SUM(amount_paid), 0) AS collected

        FROM invoices

        WHERE market_id = m.id
          AND company_id = m.company_id
          AND status NOT IN ('draft', 'cancelled')
      ) i ON TRUE

      WHERE m.company_id = $1
        AND m.status <> 'cancelled'

      ORDER BY m.created_at DESC
      `,
      [companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur getMarketProfitability:", error);

    res.status(500).json({
      message: "Erreur lors du calcul de la rentabilité des marchés",
    });
  }
};

module.exports = {
  getBudgetDashboard,
  getMarketProfitability,
};