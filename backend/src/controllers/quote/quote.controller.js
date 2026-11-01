const pool = require("../../config/db");

/**
 * Générer le prochain numéro de devis
 * Format : DEV-2026-0001
 */
const generateQuoteNumber = async (client, companyId) => {
  const year = new Date().getFullYear();

  const result = await client.query(
    `
    INSERT INTO document_sequences (
      company_id,
      document_type,
      sequence_year,
      last_number
    )
    VALUES ($1, 'DEV', $2, 1)
    ON CONFLICT (company_id, document_type, sequence_year)
    DO UPDATE SET
      last_number = document_sequences.last_number + 1
    RETURNING last_number
    `,
    [companyId, year]
  );

  const number = String(result.rows[0].last_number).padStart(4, "0");

  return `DEV-${year}-${number}`;
};


/**
 * Statistiques des devis
 */
const getQuoteStats = async (req, res) => {
  try {
    const { companyId } = req.user;

    const result = await pool.query(
      `
      SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (
          WHERE status = 'draft'
        )::INTEGER AS draft,
        COUNT(*) FILTER (
          WHERE status = 'sent'
        )::INTEGER AS sent,
        COUNT(*) FILTER (
          WHERE status = 'accepted'
        )::INTEGER AS accepted,
        COUNT(*) FILTER (
          WHERE status = 'rejected'
        )::INTEGER AS rejected,
        COALESCE(SUM(total_amount), 0) AS total_amount
      FROM quotes
      WHERE company_id = $1
      `,
      [companyId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur getQuoteStats :", error);

    res.status(500).json({
      message: "Erreur lors du chargement des statistiques.",
    });
  }
};


/**
 * Liste des devis
 */
const getQuotes = async (req, res) => {
  try {
    const { companyId } = req.user;

    const result = await pool.query(
      `
      SELECT
        q.*,
        c.name AS client_name,
        c.client_type,
        c.email AS client_email,
        c.phone AS client_phone,

        (
          SELECT COUNT(*)
          FROM quote_items qi
          WHERE qi.quote_id = q.id
        )::INTEGER AS item_count

      FROM quotes q

      INNER JOIN clients c
        ON c.id = q.client_id

      WHERE q.company_id = $1

      ORDER BY q.issue_date DESC, q.created_at DESC
      `,
      [companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur getQuotes :", error);

    res.status(500).json({
      message: "Erreur lors du chargement des devis.",
    });
  }
};


/**
 * Détail d'un devis avec ses lignes
 */
const getQuoteById = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const quoteResult = await pool.query(
      `
      SELECT
        q.*,

        c.name AS client_name,
        c.client_type,
        c.contact_name,
        c.email AS client_email,
        c.phone AS client_phone,
        c.address AS client_address,
        c.city AS client_city,
        c.country AS client_country,
        c.nif AS client_nif,
        c.rccm AS client_rccm

      FROM quotes q

      INNER JOIN clients c
        ON c.id = q.client_id

      WHERE q.id = $1
        AND q.company_id = $2
      `,
      [id, companyId]
    );

    if (quoteResult.rowCount === 0) {
      return res.status(404).json({
        message: "Devis introuvable.",
      });
    }

    const itemsResult = await pool.query(
      `
      SELECT *
      FROM quote_items
      WHERE quote_id = $1
      ORDER BY sort_order ASC, created_at ASC
      `,
      [id]
    );

    res.json({
      quote: quoteResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (error) {
    console.error("Erreur getQuoteById :", error);

    res.status(500).json({
      message: "Erreur lors du chargement du devis.",
    });
  }
};


/**
 * Créer un devis
 */
const createQuote = async (req, res) => {
  const client = await pool.connect();

  try {
    const { companyId } = req.user;

    const {
      client_id,
      issue_date,
      valid_until,
      subject,
      notes,
      items = [],
    } = req.body;

    if (!client_id) {
      return res.status(400).json({
        message: "Le client est obligatoire.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Le devis doit contenir au moins une ligne.",
      });
    }

    await client.query("BEGIN");

    // Vérifier que le client appartient à l'entreprise
    const clientCheck = await client.query(
      `
      SELECT id
      FROM clients
      WHERE id = $1
        AND company_id = $2
      `,
      [client_id, companyId]
    );

    if (clientCheck.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Client invalide.",
      });
    }

    const quoteNumber = await generateQuoteNumber(
      client,
      companyId
    );

    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;

    const calculatedItems = items.map((item, index) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const discount = Number(item.discount_amount) || 0;
      const taxRate = Number(item.tax_rate) || 0;

      const lineGross = quantity * unitPrice;
      const lineNet = Math.max(0, lineGross - discount);
      const lineTax = lineNet * (taxRate / 100);
      const lineTotal = lineNet + lineTax;

      subtotal += lineGross;
      discountAmount += discount;
      taxAmount += lineTax;

      return {
        description: item.description,
        quantity,
        unit: item.unit || "unité",
        unit_price: unitPrice,
        discount_amount: discount,
        tax_rate: taxRate,
        tax_amount: lineTax,
        total_amount: lineTotal,
        sort_order: index,
      };
    });

    const totalAmount =
      subtotal - discountAmount + taxAmount;

    const quoteResult = await client.query(
      `
      INSERT INTO quotes (
        company_id,
        client_id,
        quote_number,
        issue_date,
        valid_until,
        subject,
        notes,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        status
      )
      VALUES (
        $1, $2, $3, $4, $5,
        $6, $7, $8, $9, $10,
        $11, 'draft'
      )
      RETURNING *
      `,
      [
        companyId,
        client_id,
        quoteNumber,
        issue_date || new Date(),
        valid_until || null,
        subject || null,
        notes || null,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
      ]
    );

    const quote = quoteResult.rows[0];

    for (const item of calculatedItems) {
      if (!item.description) {
        throw new Error(
          "Une ligne du devis ne contient pas de désignation."
        );
      }

      await client.query(
        `
        INSERT INTO quote_items (
          quote_id,
          description,
          quantity,
          unit,
          unit_price,
          discount_amount,
          tax_rate,
          tax_amount,
          total_amount,
          sort_order
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10
        )
        `,
        [
          quote.id,
          item.description,
          item.quantity,
          item.unit,
          item.unit_price,
          item.discount_amount,
          item.tax_rate,
          item.tax_amount,
          item.total_amount,
          item.sort_order,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      message: "Devis créé avec succès.",
      quote,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erreur createQuote :", error);

    res.status(500).json({
      message: "Erreur lors de la création du devis.",
    });
  } finally {
    client.release();
  }
};


/**
 * Modifier un devis
 *
 * Pour l'instant, on autorise la modification uniquement
 * lorsqu'il est encore en brouillon.
 */
const updateQuote = async (req, res) => {
  const client = await pool.connect();

  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const {
      client_id,
      issue_date,
      valid_until,
      subject,
      notes,
      items = [],
    } = req.body;

    if (!client_id) {
      return res.status(400).json({
        message: "Le client est obligatoire.",
      });
    }

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        message: "Le devis doit contenir au moins une ligne.",
      });
    }

    await client.query("BEGIN");

    const existing = await client.query(
      `
      SELECT *
      FROM quotes
      WHERE id = $1
        AND company_id = $2
        AND status = 'draft'
      `,
      [id, companyId]
    );

    if (existing.rowCount === 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Devis introuvable ou non modifiable.",
      });
    }

    let subtotal = 0;
    let discountAmount = 0;
    let taxAmount = 0;

    const calculatedItems = items.map((item, index) => {
      const quantity = Number(item.quantity) || 0;
      const unitPrice = Number(item.unit_price) || 0;
      const discount = Number(item.discount_amount) || 0;
      const taxRate = Number(item.tax_rate) || 0;

      const lineGross = quantity * unitPrice;
      const lineNet = Math.max(0, lineGross - discount);
      const lineTax = lineNet * (taxRate / 100);
      const lineTotal = lineNet + lineTax;

      subtotal += lineGross;
      discountAmount += discount;
      taxAmount += lineTax;

      return {
        description: item.description,
        quantity,
        unit: item.unit || "unité",
        unit_price: unitPrice,
        discount_amount: discount,
        tax_rate: taxRate,
        tax_amount: lineTax,
        total_amount: lineTotal,
        sort_order: index,
      };
    });

    const totalAmount =
      subtotal - discountAmount + taxAmount;

    await client.query(
      `
      UPDATE quotes
      SET
        client_id = $1,
        issue_date = $2,
        valid_until = $3,
        subject = $4,
        notes = $5,
        subtotal = $6,
        discount_amount = $7,
        tax_amount = $8,
        total_amount = $9,
        updated_at = CURRENT_TIMESTAMP

      WHERE id = $10
        AND company_id = $11
      `,
      [
        client_id,
        issue_date || new Date(),
        valid_until || null,
        subject || null,
        notes || null,
        subtotal,
        discountAmount,
        taxAmount,
        totalAmount,
        id,
        companyId,
      ]
    );

    await client.query(
      `
      DELETE FROM quote_items
      WHERE quote_id = $1
      `,
      [id]
    );

    for (const item of calculatedItems) {
      if (!item.description) {
        throw new Error(
          "Une ligne du devis ne contient pas de désignation."
        );
      }

      await client.query(
        `
        INSERT INTO quote_items (
          quote_id,
          description,
          quantity,
          unit,
          unit_price,
          discount_amount,
          tax_rate,
          tax_amount,
          total_amount,
          sort_order
        )
        VALUES (
          $1, $2, $3, $4, $5,
          $6, $7, $8, $9, $10
        )
        `,
        [
          id,
          item.description,
          item.quantity,
          item.unit,
          item.unit_price,
          item.discount_amount,
          item.tax_rate,
          item.tax_amount,
          item.total_amount,
          item.sort_order,
        ]
      );
    }

    await client.query("COMMIT");

    res.json({
      message: "Devis modifié avec succès.",
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erreur updateQuote :", error);

    res.status(500).json({
      message: "Erreur lors de la modification du devis.",
    });
  } finally {
    client.release();
  }
};


/**
 * Modifier le statut
 */
const updateQuoteStatus = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "draft",
      "sent",
      "accepted",
      "rejected",
      "expired",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Statut de devis invalide.",
      });
    }

    const result = await pool.query(
      `
      UPDATE quotes
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
        AND company_id = $3
      RETURNING *
      `,
      [status, id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        message: "Devis introuvable.",
      });
    }

    res.json({
      message: "Statut du devis mis à jour.",
      quote: result.rows[0],
    });
  } catch (error) {
    console.error("Erreur updateQuoteStatus :", error);

    res.status(500).json({
      message: "Erreur lors de la modification du statut.",
    });
  }
};


/**
 * Supprimer un devis
 */
const deleteQuote = async (req, res) => {
  try {
    const { companyId } = req.user;
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM quotes
      WHERE id = $1
        AND company_id = $2
        AND status = 'draft'
      RETURNING id
      `,
      [id, companyId]
    );

    if (result.rowCount === 0) {
      return res.status(400).json({
        message:
          "Devis introuvable ou impossible à supprimer.",
      });
    }

    res.json({
      message: "Devis supprimé avec succès.",
    });
  } catch (error) {
    console.error("Erreur deleteQuote :", error);

    res.status(500).json({
      message: "Erreur lors de la suppression du devis.",
    });
  }
};


module.exports = {
  getQuoteStats,
  getQuotes,
  getQuoteById,
  createQuote,
  updateQuote,
  updateQuoteStatus,
  deleteQuote,
};