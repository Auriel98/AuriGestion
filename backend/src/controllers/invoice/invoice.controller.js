const pool = require("../../config/db");

/**
 * Générer un numéro de facture :
 * FAC-2026-0001
 */
const generateInvoiceNumber = async (client, companyId) => {
  const year = new Date().getFullYear();

  const result = await client.query(
    `
      INSERT INTO document_sequences (
        company_id,
        document_type,
        sequence_year,
        last_number
      )
      VALUES ($1, 'invoice', $2, 1)
      ON CONFLICT (company_id, document_type, sequence_year)
      DO UPDATE SET last_number =
        document_sequences.last_number + 1
      RETURNING last_number
    `,
    [companyId, year]
  );

  const number = String(result.rows[0].last_number).padStart(4, "0");

  return `FAC-${year}-${number}`;
};

/**
 * Calculer les totaux des lignes
 */
const calculateItems = (items = []) => {
  let subtotal = 0;
  let discountAmount = 0;
  let taxAmount = 0;

  const calculatedItems = items.map((item) => {
    const quantity = Number(item.quantity) || 0;
    const unitPrice = Number(item.unit_price) || 0;
    const discount = Number(item.discount_amount) || 0;
    const taxRate = Number(item.tax_rate) || 0;

    const gross = quantity * unitPrice;
    const net = Math.max(gross - discount, 0);
    const tax = net * (taxRate / 100);
    const total = net + tax;

    subtotal += net;
    discountAmount += discount;
    taxAmount += tax;

    return {
      description: item.description,
      quantity,
      unit: item.unit || "unité",
      unit_price: unitPrice,
      discount_amount: discount,
      tax_rate: taxRate,
      tax_amount: tax,
      total_amount: total,
    };
  });

  return {
    items: calculatedItems,
    subtotal,
    discountAmount,
    taxAmount,
    totalAmount: subtotal + taxAmount,
  };
};

/**
 * STATISTIQUES
 */
exports.getInvoiceStats = async (req, res) => {
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
          WHERE status = 'issued'
        )::int AS issued,
        COUNT(*) FILTER (
          WHERE status = 'partially_paid'
        )::int AS partially_paid,
        COUNT(*) FILTER (
          WHERE status = 'paid'
        )::int AS paid,
        COUNT(*) FILTER (
          WHERE status = 'cancelled'
        )::int AS cancelled,

        COALESCE(
          SUM(total_amount)
          FILTER (WHERE status <> 'cancelled'),
          0
        ) AS total_amount,

        COALESCE(
          SUM(amount_paid)
          FILTER (WHERE status <> 'cancelled'),
          0
        ) AS amount_paid

      FROM invoices
      WHERE company_id = $1
      `,
      [companyId]
    );

    const stats = result.rows[0];

    stats.total_amount = Number(stats.total_amount);
    stats.amount_paid = Number(stats.amount_paid);
    stats.remaining_amount =
      stats.total_amount - stats.amount_paid;

    res.json(stats);
  } catch (error) {
    console.error("Erreur getInvoiceStats:", error);

    res.status(500).json({
      message: "Erreur lors du chargement des statistiques.",
    });
  }
};

/**
 * LISTE DES FACTURES
 */
exports.getInvoices = async (req, res) => {
  try {
    const companyId = req.user.companyId;

    const result = await pool.query(
      `
      SELECT
        i.id,
        i.invoice_number,
        i.issue_date,
        i.due_date,
        i.subject,
        i.subtotal,
        i.discount_amount,
        i.tax_amount,
        i.total_amount,
        i.amount_paid,
        i.status,

        c.id AS client_id,
        c.name AS client_name,

        m.id AS market_id,
        m.market_number,
        m.title AS market_title,

        COUNT(ii.id)::int AS item_count

      FROM invoices i

      JOIN clients c
        ON c.id = i.client_id

      LEFT JOIN markets m
        ON m.id = i.market_id

      LEFT JOIN invoice_items ii
        ON ii.invoice_id = i.id

      WHERE i.company_id = $1

      GROUP BY
        i.id,
        c.id,
        m.id

      ORDER BY i.issue_date DESC, i.created_at DESC
      `,
      [companyId]
    );

    res.json(result.rows);
  } catch (error) {
    console.error("Erreur getInvoices:", error);

    res.status(500).json({
      message: "Erreur lors du chargement des factures.",
    });
  }
};

/**
 * DETAIL D'UNE FACTURE
 */
exports.getInvoiceById = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const invoiceResult = await pool.query(
      `
      SELECT
        i.*,

        c.name AS client_name,
        c.client_type,
        c.contact_name,
        c.email AS client_email,
        c.phone AS client_phone,
        c.address AS client_address,
        c.city AS client_city,
        c.country AS client_country,
        c.nif AS client_nif,
        c.rccm AS client_rccm,

        m.market_number,
        m.title AS market_title

      FROM invoices i

      JOIN clients c
        ON c.id = i.client_id

      LEFT JOIN markets m
        ON m.id = i.market_id

      WHERE i.id = $1
        AND i.company_id = $2
      `,
      [id, companyId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        message: "Facture introuvable.",
      });
    }

    const itemsResult = await pool.query(
      `
      SELECT *
      FROM invoice_items
      WHERE invoice_id = $1
      ORDER BY sort_order ASC, created_at ASC
      `,
      [id]
    );

    const paymentsResult = await pool.query(
      `
      SELECT *
      FROM invoice_payments
      WHERE invoice_id = $1
      ORDER BY payment_date DESC, created_at DESC
      `,
      [id]
    );

    res.json({
      ...invoiceResult.rows[0],
      items: itemsResult.rows,
      payments: paymentsResult.rows,
    });
  } catch (error) {
    console.error("Erreur getInvoiceById:", error);

    res.status(500).json({
      message: "Erreur lors du chargement de la facture.",
    });
  }
};

/**
 * CREER UNE FACTURE
 */
exports.createInvoice = async (req, res) => {
  const client = await pool.connect();

  try {
    const companyId = req.user.companyId;

    const {
      client_id,
      market_id,
      quote_id,
      issue_date,
      due_date,
      subject,
      notes,
      items = [],
    } = req.body;

    if (!client_id) {
      return res.status(400).json({
        message: "Le client est obligatoire.",
      });
    }

    if (!items.length) {
      return res.status(400).json({
        message: "La facture doit contenir au moins une ligne.",
      });
    }

    const calculated = calculateItems(items);

    await client.query("BEGIN");

    // Vérifier le client
    const clientCheck = await client.query(
      `
      SELECT id
      FROM clients
      WHERE id = $1
        AND company_id = $2
      `,
      [client_id, companyId]
    );

    if (clientCheck.rows.length === 0) {
      throw new Error("Client introuvable.");
    }

    const invoiceNumber = await generateInvoiceNumber(
      client,
      companyId
    );

    const invoiceResult = await client.query(
      `
      INSERT INTO invoices (
        company_id,
        client_id,
        market_id,
        quote_id,
        invoice_number,
        issue_date,
        due_date,
        subject,
        notes,
        subtotal,
        discount_amount,
        tax_amount,
        total_amount,
        amount_paid,
        status
      )
      VALUES (
        $1, $2, $3, $4, $5,
        COALESCE($6::date, CURRENT_DATE),
        $7,
        $8,
        $9,
        $10,
        $11,
        $12,
        $13,
        0,
        'draft'
      )
      RETURNING *
      `,
      [
        companyId,
        client_id,
        market_id || null,
        quote_id || null,
        invoiceNumber,
        issue_date || null,
        due_date || null,
        subject || null,
        notes || null,
        calculated.subtotal,
        calculated.discountAmount,
        calculated.taxAmount,
        calculated.totalAmount,
      ]
    );

    const invoice = invoiceResult.rows[0];

    for (let index = 0; index < calculated.items.length; index++) {
      const item = calculated.items[index];

      await client.query(
        `
        INSERT INTO invoice_items (
          invoice_id,
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
          invoice.id,
          item.description,
          item.quantity,
          item.unit,
          item.unit_price,
          item.discount_amount,
          item.tax_rate,
          item.tax_amount,
          item.total_amount,
          index,
        ]
      );
    }

    await client.query("COMMIT");

    res.status(201).json({
      ...invoice,
      items: calculated.items,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erreur createInvoice:", error);

    res.status(500).json({
      message:
        error.message || "Erreur lors de la création de la facture.",
    });
  } finally {
    client.release();
  }
};

/**
 * MODIFIER UNE FACTURE
 * Seulement si brouillon
 */
exports.updateInvoice = async (req, res) => {
  const client = await pool.connect();

  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const {
      client_id,
      market_id,
      quote_id,
      issue_date,
      due_date,
      subject,
      notes,
      items = [],
    } = req.body;

    await client.query("BEGIN");

    const existingResult = await client.query(
      `
      SELECT *
      FROM invoices
      WHERE id = $1
        AND company_id = $2
      FOR UPDATE
      `,
      [id, companyId]
    );

    if (existingResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Facture introuvable.",
      });
    }

    const existing = existingResult.rows[0];

    if (existing.status !== "draft") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Seule une facture brouillon peut être modifiée.",
      });
    }

    if (!client_id) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Le client est obligatoire.",
      });
    }

    if (!items.length) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "La facture doit contenir au moins une ligne.",
      });
    }

    const calculated = calculateItems(items);

    await client.query(
      `
      UPDATE invoices
      SET
        client_id = $1,
        market_id = $2,
        quote_id = $3,
        issue_date = COALESCE($4::date, issue_date),
        due_date = $5,
        subject = $6,
        notes = $7,
        subtotal = $8,
        discount_amount = $9,
        tax_amount = $10,
        total_amount = $11,
        updated_at = NOW()
      WHERE id = $12
        AND company_id = $13
      `,
      [
        client_id,
        market_id || null,
        quote_id || null,
        issue_date || null,
        due_date || null,
        subject || null,
        notes || null,
        calculated.subtotal,
        calculated.discountAmount,
        calculated.taxAmount,
        calculated.totalAmount,
        id,
        companyId,
      ]
    );

    await client.query(
      `
      DELETE FROM invoice_items
      WHERE invoice_id = $1
      `,
      [id]
    );

    for (let index = 0; index < calculated.items.length; index++) {
      const item = calculated.items[index];

      await client.query(
        `
        INSERT INTO invoice_items (
          invoice_id,
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
          index,
        ]
      );
    }

    await client.query("COMMIT");

    const result = await pool.query(
      `
      SELECT *
      FROM invoices
      WHERE id = $1
        AND company_id = $2
      `,
      [id, companyId]
    );

    res.json(result.rows[0]);
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erreur updateInvoice:", error);

    res.status(500).json({
      message:
        error.message || "Erreur lors de la modification.",
    });
  } finally {
    client.release();
  }
};

/**
 * CHANGER LE STATUT
 */
exports.updateInvoiceStatus = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = [
      "draft",
      "issued",
      "partially_paid",
      "paid",
      "cancelled",
    ];

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        message: "Statut de facture invalide.",
      });
    }

    const result = await pool.query(
      `
      UPDATE invoices
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
        message: "Facture introuvable.",
      });
    }

    res.json(result.rows[0]);
  } catch (error) {
    console.error("Erreur updateInvoiceStatus:", error);

    res.status(500).json({
      message: "Erreur lors de la modification du statut.",
    });
  }
};

/**
 * SUPPRIMER
 * Seulement une facture brouillon
 */
exports.deleteInvoice = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    const result = await pool.query(
      `
      DELETE FROM invoices
      WHERE id = $1
        AND company_id = $2
        AND status = 'draft'
      RETURNING id
      `,
      [id, companyId]
    );

    if (result.rows.length === 0) {
      return res.status(400).json({
        message:
          "Facture introuvable ou impossible à supprimer. Seules les factures brouillon peuvent être supprimées.",
      });
    }

    res.json({
      message: "Facture supprimée avec succès.",
    });
  } catch (error) {
    console.error("Erreur deleteInvoice:", error);

    res.status(500).json({
      message: "Erreur lors de la suppression.",
    });
  }
};