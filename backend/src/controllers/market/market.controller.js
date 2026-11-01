const pool = require("../../config/db");
const crypto = require("crypto");

/**
 * Génère un numéro de marché :
 * MAR-2026-0001
 */
const generateMarketNumber = async (client, companyId) => {
  const year = new Date().getFullYear();

  const result = await client.query(
    `
    INSERT INTO document_sequences (
      company_id,
      document_type,
      sequence_year,
      last_number
    )
    VALUES ($1, 'market', $2, 1)
    ON CONFLICT (company_id, document_type, sequence_year)
    DO UPDATE SET last_number = document_sequences.last_number + 1
    RETURNING last_number
    `,
    [companyId, year]
  );

  const number = String(result.rows[0].last_number).padStart(4, "0");

  return `MAR-${year}-${number}`;
};

/**
 * =========================================================
 * STATISTIQUES DES MARCHÉS
 * =========================================================
 */
const getMarketStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const result = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total,

        COUNT(*) FILTER (
          WHERE status = 'draft'
        )::int AS draft,

        COUNT(*) FILTER (
          WHERE status = 'active'
        )::int AS active,

        COUNT(*) FILTER (
          WHERE status = 'completed'
        )::int AS completed,

        COUNT(*) FILTER (
          WHERE status = 'suspended'
        )::int AS suspended,

        COUNT(*) FILTER (
          WHERE status = 'cancelled'
        )::int AS cancelled,

        COALESCE(
          SUM(contract_amount)
          FILTER (WHERE status != 'cancelled'),
          0
        )::numeric AS total_contract_amount

      FROM markets
      WHERE company_id = $1
      `,
      [companyId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur getMarketStats:", error);

    res.status(500).json({
      message: "Erreur lors du chargement des statistiques des marchés",
    });
  }
};

/**
 * =========================================================
 * LISTE DES MARCHÉS
 * =========================================================
 */
const getMarkets = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const result = await pool.query(
      `
      SELECT
        m.id,
        m.market_number,
        m.title,
        m.description,
        m.start_date,
        m.end_date,
        m.contract_amount,
        m.status,
        m.notes,
        m.client_id,
        m.quote_id,
        m.created_at,
        m.updated_at,

        c.name AS client_name,
        c.client_type,

        /* Budget initial + augmentations - diminutions */
        COALESCE(
          (
            SELECT SUM(
              CASE
                WHEN mbm.movement_type IN ('initial', 'increase')
                  THEN mbm.amount
                WHEN mbm.movement_type = 'decrease'
                  THEN -mbm.amount
                ELSE 0
              END
            )
            FROM market_budget_movements mbm
            WHERE mbm.market_id = m.id
              AND mbm.company_id = m.company_id
          ),
          0
        )::numeric AS budget_amount,

        /* Dépenses liées au marché */
        COALESCE(
          (
            SELECT SUM(e.amount)
            FROM expenses e
            WHERE e.market_id = m.id
              AND e.company_id = m.company_id
              AND e.status = 'validated'
          ),
          0
        )::numeric AS spent_amount,

        /* Factures émises sur le marché */
        COALESCE(
          (
            SELECT SUM(i.total_amount)
            FROM invoices i
            WHERE i.market_id = m.id
              AND i.company_id = m.company_id
              AND i.status != 'cancelled'
              AND i.status != 'draft'
          ),
          0
        )::numeric AS billed_amount,

        /* Paiements encaissés */
        COALESCE(
          (
            SELECT SUM(ip.amount)
            FROM invoice_payments ip
            INNER JOIN invoices i
              ON i.id = ip.invoice_id
            WHERE i.market_id = m.id
              AND i.company_id = m.company_id
              AND i.status != 'cancelled'
          ),
          0
        )::numeric AS collected_amount

      FROM markets m

      INNER JOIN clients c
        ON c.id = m.client_id
       AND c.company_id = m.company_id

      WHERE m.company_id = $1

      ORDER BY m.created_at DESC
      `,
      [companyId]
    );

    const markets = result.rows.map((market) => {
      const budget = Number(market.budget_amount || 0);
      const spent = Number(market.spent_amount || 0);
      const billed = Number(market.billed_amount || 0);
      const collected = Number(market.collected_amount || 0);

      return {
        ...market,

        budget_amount: budget,
        spent_amount: spent,

        available_budget: budget - spent,

        billed_amount: billed,
        collected_amount: collected,

        outstanding_amount: billed - collected,

        profitability: billed - spent,
      };
    });

    res.json(markets);
  } catch (error) {
    console.error("Erreur getMarkets:", error);

    res.status(500).json({
      message: "Erreur lors du chargement des marchés",
    });
  }
};

/**
 * =========================================================
 * DÉTAIL D'UN MARCHÉ
 * =========================================================
 */
const getMarketById = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const marketResult = await pool.query(
      `
      SELECT
        m.*,

        c.name AS client_name,
        c.client_type,
        c.email AS client_email,
        c.phone AS client_phone,
        c.address AS client_address,

        q.quote_number

      FROM markets m

      INNER JOIN clients c
        ON c.id = m.client_id
       AND c.company_id = m.company_id

      LEFT JOIN quotes q
        ON q.id = m.quote_id
       AND q.company_id = m.company_id

      WHERE m.id = $1
        AND m.company_id = $2

      LIMIT 1
      `,
      [id, companyId]
    );

    if (marketResult.rows.length === 0) {
      return res.status(404).json({
        message: "Marché introuvable",
      });
    }

    const market = marketResult.rows[0];

    /**
     * Budget
     */
    const budgetResult = await pool.query(
      `
      SELECT
        COALESCE(
          SUM(
            CASE
              WHEN movement_type = 'initial'
                THEN amount
              ELSE 0
            END
          ),
          0
        ) AS initial_amount,

        COALESCE(
          SUM(
            CASE
              WHEN movement_type = 'increase'
                THEN amount
              ELSE 0
            END
          ),
          0
        ) AS increase_amount,

        COALESCE(
          SUM(
            CASE
              WHEN movement_type = 'decrease'
                THEN amount
              ELSE 0
            END
          ),
          0
        ) AS decrease_amount

      FROM market_budget_movements

      WHERE market_id = $1
        AND company_id = $2
      `,
      [id, companyId]
    );

    /**
     * Dépenses
     */
    const expensesResult = await pool.query(
      `
      SELECT
        e.id,
        e.expense_number,
        e.expense_date,
        e.description,
        e.supplier_name,
        e.amount,
        e.payment_method,
        e.payment_reference,
        e.receipt_url,
        e.status,
        e.notes,
        ec.name AS category_name

      FROM expenses e

      LEFT JOIN expense_categories ec
        ON ec.id = e.category_id
       AND ec.company_id = e.company_id

      WHERE e.market_id = $1
        AND e.company_id = $2

      ORDER BY e.expense_date DESC, e.created_at DESC
      `,
      [id, companyId]
    );

    /**
     * Factures
     */
    const invoicesResult = await pool.query(
      `
      SELECT
        i.id,
        i.invoice_number,
        i.issue_date,
        i.due_date,
        i.subject,
        i.subtotal,
        i.tax_amount,
        i.total_amount,
        i.amount_paid,
        i.status

      FROM invoices i

      WHERE i.market_id = $1
        AND i.company_id = $2

      ORDER BY i.issue_date DESC, i.created_at DESC
      `,
      [id, companyId]
    );

    /**
     * Mouvements budgétaires
     */
    const movementsResult = await pool.query(
      `
      SELECT
        id,
        movement_type,
        amount,
        movement_date,
        reference,
        reason,
        created_at

      FROM market_budget_movements

      WHERE market_id = $1
        AND company_id = $2

      ORDER BY movement_date DESC, created_at DESC
      `,
      [id, companyId]
    );

    const budgetData = budgetResult.rows[0];

    const initial = Number(budgetData.initial_amount || 0);
    const increases = Number(budgetData.increase_amount || 0);
    const decreases = Number(budgetData.decrease_amount || 0);

    const budget = initial + increases - decreases;

    const spent = expensesResult.rows
      .filter((expense) => expense.status === "validated")
      .reduce((total, expense) => total + Number(expense.amount || 0), 0);

    const billed = invoicesResult.rows
      .filter(
        (invoice) =>
          invoice.status !== "cancelled" && invoice.status !== "draft"
      )
      .reduce(
        (total, invoice) => total + Number(invoice.total_amount || 0),
        0
      );

    const collected = invoicesResult.rows.reduce(
      (total, invoice) => total + Number(invoice.amount_paid || 0),
      0
    );

    res.json({
      ...market,

      budget_summary: {
        initial,
        increases,
        decreases,
        budget,
        spent,
        available: budget - spent,
      },

      financial_summary: {
        billed,
        collected,
        outstanding: billed - collected,
        profitability: billed - spent,
      },

      movements: movementsResult.rows,
      expenses: expensesResult.rows,
      invoices: invoicesResult.rows,
    });
  } catch (error) {
    console.error("Erreur getMarketById:", error);

    res.status(500).json({
      message: "Erreur lors du chargement du marché",
    });
  }
};

/**
 * =========================================================
 * CRÉER UN MARCHÉ
 * =========================================================
 */
const createMarket = async (req, res) => {
  const client = await pool.connect();

  try {
    const companyId = req.user.companyId;

    const {
      client_id,
      quote_id,
      title,
      description,
      start_date,
      end_date,
      contract_amount,
      initial_budget,
      notes,
    } = req.body;

    if (!client_id) {
      return res.status(400).json({
        message: "Le client est obligatoire",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Le titre du marché est obligatoire",
      });
    }

    /**
     * Vérifier le client
     */
    const clientCheck = await client.query(
      `
      SELECT id
      FROM clients
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
      `,
      [client_id, companyId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(400).json({
        message: "Client invalide",
      });
    }

    /**
     * Vérifier le devis si fourni
     */
    if (quote_id) {
      const quoteCheck = await client.query(
        `
        SELECT id
        FROM quotes
        WHERE id = $1
          AND company_id = $2
        LIMIT 1
        `,
        [quote_id, companyId]
      );

      if (quoteCheck.rows.length === 0) {
        return res.status(400).json({
          message: "Devis invalide",
        });
      }
    }

    await client.query("BEGIN");

    const marketNumber = await generateMarketNumber(client, companyId);

    const marketId = crypto.randomUUID();

    const marketResult = await client.query(
      `
      INSERT INTO markets (
        id,
        company_id,
        client_id,
        quote_id,
        market_number,
        title,
        description,
        start_date,
        end_date,
        contract_amount,
        status,
        notes
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        'draft',
        $11
      )
      RETURNING *
      `,
      [
        marketId,
        companyId,
        client_id,
        quote_id || null,
        marketNumber,
        title.trim(),
        description || null,
        start_date || null,
        end_date || null,
        Number(contract_amount || 0),
        notes || null,
      ]
    );

    /**
     * Budget initial optionnel
     */
    const initialBudget = Number(initial_budget || 0);

    if (initialBudget > 0) {
      await client.query(
        `
        INSERT INTO market_budget_movements (
          id,
          company_id,
          market_id,
          movement_type,
          amount,
          movement_date,
          reason
        )
        VALUES (
          $1,
          $2,
          $3,
          'initial',
          $4,
          CURRENT_DATE,
          'Budget initial du marché'
        )
        `,
        [crypto.randomUUID(), companyId, marketId, initialBudget]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Marché créé avec succès",
      market: marketResult.rows[0],
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    console.error("Erreur createMarket:", error);

    res.status(500).json({
      message: "Erreur lors de la création du marché",
    });
  } finally {
    client.release();
  }
};

/**
 * =========================================================
 * MODIFIER UN MARCHÉ
 * =========================================================
 */
const updateMarket = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const {
      client_id,
      quote_id,
      title,
      description,
      start_date,
      end_date,
      contract_amount,
      notes,
    } = req.body;

    if (!client_id) {
      return res.status(400).json({
        message: "Le client est obligatoire",
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        message: "Le titre du marché est obligatoire",
      });
    }

    const clientCheck = await pool.query(
      `
      SELECT id
      FROM clients
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
      `,
      [client_id, companyId]
    );

    if (clientCheck.rows.length === 0) {
      return res.status(400).json({
        message: "Client invalide",
      });
    }

    if (quote_id) {
      const quoteCheck = await pool.query(
        `
        SELECT id
        FROM quotes
        WHERE id = $1
          AND company_id = $2
        LIMIT 1
        `,
        [quote_id, companyId]
      );

      if (quoteCheck.rows.length === 0) {
        return res.status(400).json({
          message: "Devis invalide",
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE markets

      SET
        client_id = $1,
        quote_id = $2,
        title = $3,
        description = $4,
        start_date = $5,
        end_date = $6,
        contract_amount = $7,
        notes = $8,
        updated_at = NOW()

      WHERE id = $9
        AND company_id = $10

      RETURNING *
      `,
      [
        client_id,
        quote_id || null,
        title.trim(),
        description || null,
        start_date || null,
        end_date || null,
        Number(contract_amount || 0),
        notes || null,
        id,
        companyId,
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Marché introuvable",
      });
    }

    res.json({
      message: "Marché modifié avec succès",
      market: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur updateMarket:", error);

    res.status(500).json({
      message: "Erreur lors de la modification du marché",
    });
  }
};

/**
 * =========================================================
 * CHANGER LE STATUT
 * =========================================================
 */
const updateMarketStatus = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "draft",
      "active",
      "completed",
      "cancelled",
      "suspended",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Statut de marché invalide",
      });
    }

    const result = await pool.query(
      `
      UPDATE markets

      SET
        status = $1,
        updated_at = NOW()

      WHERE id = $2
        AND company_id = $3

      RETURNING *
      `,
      [status, id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Marché introuvable",
      });
    }

    res.json({
      message: "Statut du marché mis à jour",
      market: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur updateMarketStatus:", error);

    res.status(500).json({
      message: "Erreur lors de la mise à jour du statut",
    });
  }
};

/**
 * =========================================================
 * SUPPRIMER UN MARCHÉ
 * =========================================================
 */
const deleteMarket = async (req, res) => {
  const client = await pool.connect();

  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const marketCheck = await client.query(
      `
      SELECT id, status
      FROM markets
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
      `,
      [id, companyId]
    );

    if (marketCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Marché introuvable",
      });
    }

    /**
     * Vérifier les dépenses
     */
    const expensesCheck = await client.query(
      `
      SELECT COUNT(*)::int AS count
      FROM expenses
      WHERE market_id = $1
        AND company_id = $2
        AND status != 'cancelled'
      `,
      [id, companyId]
    );

    if (expensesCheck.rows[0].count > 0) {
      return res.status(400).json({
        message:
          "Impossible de supprimer ce marché car il possède des dépenses.",
      });
    }

    /**
     * Vérifier les factures
     */
    const invoicesCheck = await client.query(
      `
      SELECT COUNT(*)::int AS count
      FROM invoices
      WHERE market_id = $1
        AND company_id = $2
        AND status != 'cancelled'
      `,
      [id, companyId]
    );

    if (invoicesCheck.rows[0].count > 0) {
      return res.status(400).json({
        message:
          "Impossible de supprimer ce marché car il possède des factures.",
      });
    }

    await client.query("BEGIN");

    await client.query(
      `
      DELETE FROM markets

      WHERE id = $1
        AND company_id = $2
      `,
      [id, companyId]
    );

    await client.query("COMMIT");

    res.json({
      message: "Marché supprimé avec succès",
    });
  } catch (error) {
    await client.query("ROLLBACK").catch(() => {});

    console.error("Erreur deleteMarket:", error);

    res.status(500).json({
      message: "Erreur lors de la suppression du marché",
    });
  } finally {
    client.release();
  }
};

/**
 * =========================================================
 * LISTE DES MOUVEMENTS BUDGÉTAIRES
 * =========================================================
 */
const getBudgetMovements = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { marketId } = req.params;

    const result = await pool.query(
      `
      SELECT
        mbm.*
      FROM market_budget_movements mbm

      INNER JOIN markets m
        ON m.id = mbm.market_id
       AND m.company_id = mbm.company_id

      WHERE mbm.market_id = $1
        AND mbm.company_id = $2

      ORDER BY mbm.movement_date DESC, mbm.created_at DESC
      `,
      [marketId, companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur getBudgetMovements:", error);

    res.status(500).json({
      message: "Erreur lors du chargement du budget",
    });
  }
};

/**
 * =========================================================
 * AJOUTER UN MOUVEMENT BUDGÉTAIRE
 * =========================================================
 */
const createBudgetMovement = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { marketId } = req.params;

    const {
      movement_type,
      amount,
      movement_date,
      reference,
      reason,
    } = req.body;

    const allowedTypes = ["initial", "increase", "decrease"];

    if (!allowedTypes.includes(movement_type)) {
      return res.status(400).json({
        message: "Type de mouvement budgétaire invalide",
      });
    }

    const numericAmount = Number(amount);

    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({
        message: "Le montant doit être supérieur à 0",
      });
    }

    const marketCheck = await pool.query(
      `
      SELECT id
      FROM markets
      WHERE id = $1
        AND company_id = $2
      LIMIT 1
      `,
      [marketId, companyId]
    );

    if (marketCheck.rows.length === 0) {
      return res.status(404).json({
        message: "Marché introuvable",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO market_budget_movements (
        id,
        company_id,
        market_id,
        movement_type,
        amount,
        movement_date,
        reference,
        reason
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8
      )
      RETURNING *
      `,
      [
        crypto.randomUUID(),
        companyId,
        marketId,
        movement_type,
        numericAmount,
        movement_date || new Date(),
        reference || null,
        reason || null,
      ]
    );

    res.status(201).json({
      message: "Mouvement budgétaire ajouté",
      movement: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur createBudgetMovement:", error);

    res.status(500).json({
      message: "Erreur lors de l'ajout du mouvement budgétaire",
    });
  }
};

/**
 * =========================================================
 * SUPPRIMER UN MOUVEMENT BUDGÉTAIRE
 * =========================================================
 */
const deleteBudgetMovement = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM market_budget_movements

      WHERE id = $1
        AND company_id = $2

      RETURNING id
      `,
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        message: "Mouvement budgétaire introuvable",
      });
    }

    res.json({
      message: "Mouvement budgétaire supprimé",
    });
  } catch (error) {
    console.error("Erreur deleteBudgetMovement:", error);

    res.status(500).json({
      message: "Erreur lors de la suppression du mouvement",
    });
  }
};

module.exports = {
  getMarketStats,
  getMarkets,
  getMarketById,
  createMarket,
  updateMarket,
  updateMarketStatus,
  deleteMarket,

  getBudgetMovements,
  createBudgetMovement,
  deleteBudgetMovement,
};