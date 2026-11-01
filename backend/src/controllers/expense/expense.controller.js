const pool = require("../../config/db");
const crypto = require("crypto");

// =====================================================
// NUMÉRO DE DÉPENSE
// DEP-2026-0001
// =====================================================
const generateExpenseNumber = async (client, companyId) => {
  const year = new Date().getFullYear();

  const result = await client.query(
    `
    INSERT INTO document_sequences (
      company_id,
      document_type,
      sequence_year,
      last_number
    )
    VALUES ($1, 'expense', $2, 1)
    ON CONFLICT (company_id, document_type, sequence_year)
    DO UPDATE SET last_number = document_sequences.last_number + 1
    RETURNING last_number
    `,
    [companyId, year]
  );

  const number = String(result.rows[0].last_number).padStart(4, "0");

  return `DEP-${year}-${number}`;
};

// =====================================================
// STATISTIQUES
// =====================================================
const getExpenseStats = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const result = await pool.query(
      `
      SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (WHERE status = 'validated')::INTEGER AS validated,
        COUNT(*) FILTER (WHERE status = 'draft')::INTEGER AS draft,
        COUNT(*) FILTER (WHERE status = 'cancelled')::INTEGER AS cancelled,

        COALESCE(
          SUM(amount) FILTER (WHERE status = 'validated'),
          0
        )::NUMERIC AS total_validated,

        COALESCE(
          SUM(amount) FILTER (
            WHERE status = 'validated'
            AND DATE_TRUNC('month', expense_date)
                = DATE_TRUNC('month', CURRENT_DATE)
          ),
          0
        )::NUMERIC AS current_month_total

      FROM expenses
      WHERE company_id = $1
      `,
      [companyId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur getExpenseStats:", error);
    res.status(500).json({
      message: "Erreur lors du chargement des statistiques des dépenses",
    });
  }
};

// =====================================================
// CATÉGORIES
// =====================================================
const getExpenseCategories = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        description,
        status,
        (status = 'active') AS is_active,
        created_at
      FROM expense_categories
      WHERE company_id = $1
      ORDER BY name ASC
      `,
      [companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur getExpenseCategories:", error);
    res.status(500).json({
      message: "Erreur lors du chargement des catégories",
    });
  }
};

const createExpenseCategory = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { name, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        message: "Le nom de la catégorie est obligatoire",
      });
    }

    const result = await pool.query(
      `
      INSERT INTO expense_categories (
        id,
        company_id,
        name,
        description,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        'active'
      )
      RETURNING
        id,
        name,
        description,
        status,
        (status = 'active') AS is_active,
        created_at
      `,
      [
        crypto.randomUUID(),
        companyId,
        name.trim(),
        description || null,
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error("Erreur createExpenseCategory:", error);

    if (error.code === "23505") {
      return res.status(409).json({
        message: "Cette catégorie existe déjà",
      });
    }

    res.status(500).json({
      message: "Erreur lors de la création de la catégorie",
    });
  }
};

// =====================================================
// LISTE DES DÉPENSES
// =====================================================
const getExpenses = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const {
      search = "",
      status = "",
      market_id = "",
      category_id = "",
    } = req.query;

    const values = [companyId];
    const conditions = ["e.company_id = $1"];

    if (search.trim()) {
      values.push(`%${search.trim()}%`);

      conditions.push(`
        (
          e.expense_number ILIKE $${values.length}
          OR e.description ILIKE $${values.length}
          OR COALESCE(e.supplier_name, '') ILIKE $${values.length}
        )
      `);
    }

    if (status) {
      values.push(status);
      conditions.push(`e.status = $${values.length}`);
    }

    if (market_id) {
      values.push(market_id);
      conditions.push(`e.market_id = $${values.length}`);
    }

    if (category_id) {
      values.push(category_id);
      conditions.push(`e.category_id = $${values.length}`);
    }

    const result = await pool.query(
      `
      SELECT
        e.*,

        c.name AS category_name,

        m.market_number,
        m.title AS market_title,

        cl.name AS client_name

      FROM expenses e

      LEFT JOIN expense_categories c
        ON c.id = e.category_id

      LEFT JOIN markets m
        ON m.id = e.market_id

      LEFT JOIN clients cl
        ON cl.id = m.client_id

      WHERE ${conditions.join(" AND ")}

      ORDER BY e.expense_date DESC, e.created_at DESC
      `,
      values
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur getExpenses:", error);
    res.status(500).json({
      message: "Erreur lors du chargement des dépenses",
    });
  }
};

// =====================================================
// DÉTAIL
// =====================================================
const getExpenseById = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const result = await pool.query(
      `
      SELECT
        e.*,

        c.name AS category_name,

        m.market_number,
        m.title AS market_title,

        cl.id AS client_id,
        cl.name AS client_name

      FROM expenses e

      LEFT JOIN expense_categories c
        ON c.id = e.category_id

      LEFT JOIN markets m
        ON m.id = e.market_id

      LEFT JOIN clients cl
        ON cl.id = m.client_id

      WHERE e.id = $1
        AND e.company_id = $2
      `,
      [id, companyId]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Dépense introuvable",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur getExpenseById:", error);
    res.status(500).json({
      message: "Erreur lors du chargement de la dépense",
    });
  }
};

// =====================================================
// CRÉATION
// =====================================================
const createExpense = async (req, res) => {
  const client = await pool.connect();

  try {
    const companyId = req.user.companyId;

    const {
      market_id,
      category_id,
      expense_date,
      description,
      supplier_name,
      amount,
      payment_method,
      payment_reference,
      receipt_url,
      notes,
    } = req.body;

    if (!expense_date) {
      return res.status(400).json({
        message: "La date de dépense est obligatoire",
      });
    }

    if (!description || !description.trim()) {
      return res.status(400).json({
        message: "La description est obligatoire",
      });
    }

    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({
        message: "Le montant doit être supérieur à 0",
      });
    }

    await client.query("BEGIN");

    // Vérifier le marché
    if (market_id) {
      const marketCheck = await client.query(
        `
        SELECT id
        FROM markets
        WHERE id = $1
          AND company_id = $2
        `,
        [market_id, companyId]
      );

      if (!marketCheck.rows.length) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Marché invalide",
        });
      }
    }

    // Vérifier la catégorie
    if (category_id) {
      const categoryCheck = await client.query(
        `
        SELECT id
        FROM expense_categories
        WHERE id = $1
          AND company_id = $2
          AND status = 'active'
        `,
        [category_id, companyId]
      );

      if (!categoryCheck.rows.length) {
        await client.query("ROLLBACK");

        return res.status(400).json({
          message: "Catégorie invalide",
        });
      }
    }

    const expenseNumber = await generateExpenseNumber(
      client,
      companyId
    );

    const id = crypto.randomUUID();

    const result = await client.query(
      `
      INSERT INTO expenses (
        id,
        company_id,
        market_id,
        category_id,
        expense_number,
        expense_date,
        description,
        supplier_name,
        amount,
        payment_method,
        payment_reference,
        receipt_url,
        notes,
        status
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
        $11,
        $12,
        $13,
        'draft'
      )
      RETURNING *
      `,
      [
        id,
        companyId,
        market_id || null,
        category_id || null,
        expenseNumber,
        expense_date,
        description.trim(),
        supplier_name || null,
        Number(amount),
        payment_method || "other",
        payment_reference || null,
        receipt_url || null,
        notes || null,
      ]
    );

    await client.query("COMMIT");

    res.status(201).json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erreur createExpense:", error);

    res.status(500).json({
      message: "Erreur lors de la création de la dépense",
    });
  } finally {
    client.release();
  }
};

// =====================================================
// MODIFICATION
// =====================================================
const updateExpense = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const {
      market_id,
      category_id,
      expense_date,
      description,
      supplier_name,
      amount,
      payment_method,
      payment_reference,
      receipt_url,
      notes,
    } = req.body;

    const existing = await pool.query(
      `
      SELECT *
      FROM expenses
      WHERE id = $1
        AND company_id = $2
      `,
      [id, companyId]
    );

    if (!existing.rows.length) {
      return res.status(404).json({
        message: "Dépense introuvable",
      });
    }

    if (existing.rows[0].status !== "draft") {
      return res.status(400).json({
        message:
          "Seules les dépenses en brouillon peuvent être modifiées",
      });
    }

    if (
      !expense_date ||
      !description ||
      !description.trim() ||
      !amount ||
      Number(amount) <= 0
    ) {
      return res.status(400).json({
        message: "Date, description et montant sont obligatoires",
      });
    }

    // Vérifier le marché
    if (market_id) {
      const marketCheck = await pool.query(
        `
        SELECT id
        FROM markets
        WHERE id = $1
          AND company_id = $2
        `,
        [market_id, companyId]
      );

      if (!marketCheck.rows.length) {
        return res.status(400).json({
          message: "Marché invalide",
        });
      }
    }

    // Vérifier la catégorie
    if (category_id) {
      const categoryCheck = await pool.query(
        `
        SELECT id
        FROM expense_categories
        WHERE id = $1
          AND company_id = $2
          AND status = 'active'
        `,
        [category_id, companyId]
      );

      if (!categoryCheck.rows.length) {
        return res.status(400).json({
          message: "Catégorie invalide",
        });
      }
    }

    const result = await pool.query(
      `
      UPDATE expenses
      SET
        market_id = $1,
        category_id = $2,
        expense_date = $3,
        description = $4,
        supplier_name = $5,
        amount = $6,
        payment_method = $7,
        payment_reference = $8,
        receipt_url = $9,
        notes = $10,
        updated_at = NOW()
      WHERE id = $11
        AND company_id = $12
      RETURNING *
      `,
      [
        market_id || null,
        category_id || null,
        expense_date,
        description.trim(),
        supplier_name || null,
        Number(amount),
        payment_method || "other",
        payment_reference || null,
        receipt_url || null,
        notes || null,
        id,
        companyId,
      ]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur updateExpense:", error);

    res.status(500).json({
      message: "Erreur lors de la modification de la dépense",
    });
  }
};

// =====================================================
// STATUT
// =====================================================
const updateExpenseStatus = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "draft",
      "validated",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Statut de dépense invalide",
      });
    }

    const result = await pool.query(
      `
      UPDATE expenses
      SET
        status = $1,
        updated_at = NOW()
      WHERE id = $2
        AND company_id = $3
      RETURNING *
      `,
      [status, id, companyId]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        message: "Dépense introuvable",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur updateExpenseStatus:", error);

    res.status(500).json({
      message: "Erreur lors de la modification du statut",
    });
  }
};

// =====================================================
// SUPPRESSION
// =====================================================
const deleteExpense = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const existing = await pool.query(
      `
      SELECT status
      FROM expenses
      WHERE id = $1
        AND company_id = $2
      `,
      [id, companyId]
    );

    if (!existing.rows.length) {
      return res.status(404).json({
        message: "Dépense introuvable",
      });
    }

    if (existing.rows[0].status !== "draft") {
      return res.status(400).json({
        message:
          "Seules les dépenses en brouillon peuvent être supprimées",
      });
    }

    await pool.query(
      `
      DELETE FROM expenses
      WHERE id = $1
        AND company_id = $2
      `,
      [id, companyId]
    );

    res.json({
      message: "Dépense supprimée avec succès",
    });
  } catch (error) {
    console.error("Erreur deleteExpense:", error);

    res.status(500).json({
      message: "Erreur lors de la suppression de la dépense",
    });
  }
};

module.exports = {
  getExpenseStats,
  getExpenseCategories,
  createExpenseCategory,
  getExpenses,
  getExpenseById,
  createExpense,
  updateExpense,
  updateExpenseStatus,
  deleteExpense,
};