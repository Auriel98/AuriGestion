const pool = require("../../config/db");

/**
 * Recalcule le montant payé et le statut de la facture.
 */
const refreshInvoicePaymentStatus = async (client, invoiceId) => {
  const invoiceResult = await client.query(
    `
    SELECT
      id,
      total_amount,
      status
    FROM invoices
    WHERE id = $1
    FOR UPDATE
    `,
    [invoiceId]
  );

  if (invoiceResult.rows.length === 0) {
    throw new Error("Facture introuvable.");
  }

  const invoice = invoiceResult.rows[0];

  const paymentsResult = await client.query(
    `
    SELECT COALESCE(SUM(amount), 0) AS total_paid
    FROM invoice_payments
    WHERE invoice_id = $1
    `,
    [invoiceId]
  );

  const totalPaid = Number(paymentsResult.rows[0].total_paid || 0);
  const totalAmount = Number(invoice.total_amount || 0);

  let status = invoice.status;

  // Une facture annulée reste annulée.
  if (invoice.status !== "cancelled") {
    if (totalPaid <= 0) {
      status = "issued";
    } else if (totalPaid < totalAmount) {
      status = "partially_paid";
    } else {
      status = "paid";
    }
  }

  await client.query(
    `
    UPDATE invoices
    SET
      amount_paid = $1,
      status = $2,
      updated_at = NOW()
    WHERE id = $3
    `,
    [totalPaid, status, invoiceId]
  );

  return {
    totalAmount,
    totalPaid,
    remainingAmount: Math.max(totalAmount - totalPaid, 0),
    status,
  };
};

/**
 * Liste des paiements d'une facture.
 */
exports.getInvoicePayments = async (req, res) => {
  try {
    const companyId = req.user.companyId;
    const { invoiceId } = req.params;

    const invoiceResult = await pool.query(
      `
      SELECT id, invoice_number, total_amount, amount_paid, status
      FROM invoices
      WHERE id = $1
        AND company_id = $2
      `,
      [invoiceId, companyId]
    );

    if (invoiceResult.rows.length === 0) {
      return res.status(404).json({
        message: "Facture introuvable.",
      });
    }

    const paymentsResult = await pool.query(
      `
      SELECT
        ip.id,
        ip.invoice_id,
        ip.payment_date,
        ip.amount,
        ip.payment_method,
        ip.reference,
        ip.notes,
        ip.created_at
      FROM invoice_payments ip
      JOIN invoices i
        ON i.id = ip.invoice_id
      WHERE ip.invoice_id = $1
        AND i.company_id = $2
      ORDER BY ip.payment_date DESC, ip.created_at DESC
      `,
      [invoiceId, companyId]
    );

    const invoice = invoiceResult.rows[0];

    const totalAmount = Number(invoice.total_amount || 0);
    const totalPaid = Number(invoice.amount_paid || 0);

    res.json({
      invoice,
      payments: paymentsResult.rows,
      total_amount: totalAmount,
      amount_paid: totalPaid,
      remaining_amount: Math.max(totalAmount - totalPaid, 0),
    });
  } catch (error) {
    console.error("Erreur getInvoicePayments:", error);

    res.status(500).json({
      message: "Erreur lors du chargement des paiements.",
    });
  }
};

/**
 * Ajouter un paiement à une facture.
 */
exports.createInvoicePayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const companyId = req.user.companyId;
    const { invoiceId } = req.params;

    const {
      payment_date,
      amount,
      payment_method,
      reference,
      notes,
    } = req.body;

    const paymentAmount = Number(amount);

    if (!paymentAmount || paymentAmount <= 0) {
      return res.status(400).json({
        message: "Le montant du paiement doit être supérieur à 0.",
      });
    }

    const allowedMethods = [
      "cash",
      "bank_transfer",
      "mobile_money",
      "cheque",
      "other",
    ];

    if (!payment_method || !allowedMethods.includes(payment_method)) {
      return res.status(400).json({
        message: "Mode de paiement invalide.",
      });
    }

    await client.query("BEGIN");

    const invoiceResult = await client.query(
      `
      SELECT
        id,
        invoice_number,
        total_amount,
        amount_paid,
        status
      FROM invoices
      WHERE id = $1
        AND company_id = $2
      FOR UPDATE
      `,
      [invoiceId, companyId]
    );

    if (invoiceResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Facture introuvable.",
      });
    }

    const invoice = invoiceResult.rows[0];

    if (invoice.status === "cancelled") {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message:
          "Impossible d'enregistrer un paiement sur une facture annulée.",
      });
    }

    const totalAmount = Number(invoice.total_amount || 0);
    const currentPaid = Number(invoice.amount_paid || 0);
    const remaining = totalAmount - currentPaid;

    if (remaining <= 0) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: "Cette facture est déjà entièrement payée.",
      });
    }

    if (paymentAmount > remaining) {
      await client.query("ROLLBACK");

      return res.status(400).json({
        message: `Le paiement dépasse le reste à payer de ${remaining} FCFA.`,
      });
    }

    const paymentResult = await client.query(
      `
      INSERT INTO invoice_payments (
        company_id,
        invoice_id,
        payment_date,
        amount,
        payment_method,
        reference,
        notes
      )
      VALUES (
        $1,
        $2,
        COALESCE($3::date, CURRENT_DATE),
        $4,
        $5,
        $6,
        $7
      )
      RETURNING *
      `,
      [
        companyId,
        invoiceId,
        payment_date || null,
        paymentAmount,
        payment_method,
        reference || null,
        notes || null,
      ]
    );

    const paymentStatus = await refreshInvoicePaymentStatus(
      client,
      invoiceId
    );

    await client.query("COMMIT");

    res.status(201).json({
      message: "Paiement enregistré avec succès.",
      payment: paymentResult.rows[0],
      invoice: {
        id: invoice.id,
        invoice_number: invoice.invoice_number,
        total_amount: paymentStatus.totalAmount,
        amount_paid: paymentStatus.totalPaid,
        remaining_amount: paymentStatus.remainingAmount,
        status: paymentStatus.status,
      },
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erreur createInvoicePayment:", error);

    res.status(500).json({
      message:
        error.message ||
        "Erreur lors de l'enregistrement du paiement.",
    });
  } finally {
    client.release();
  }
};

/**
 * Supprimer un paiement.
 *
 * Après suppression, la facture est recalculée.
 */
exports.deleteInvoicePayment = async (req, res) => {
  const client = await pool.connect();

  try {
    const companyId = req.user.companyId;
    const { id } = req.params;

    await client.query("BEGIN");

    const paymentResult = await client.query(
      `
      SELECT
        ip.id,
        ip.invoice_id
      FROM invoice_payments ip
      JOIN invoices i
        ON i.id = ip.invoice_id
      WHERE ip.id = $1
        AND i.company_id = $2
      FOR UPDATE
      `,
      [id, companyId]
    );

    if (paymentResult.rows.length === 0) {
      await client.query("ROLLBACK");

      return res.status(404).json({
        message: "Paiement introuvable.",
      });
    }

    const invoiceId = paymentResult.rows[0].invoice_id;

    await client.query(
      `
      DELETE FROM invoice_payments
      WHERE id = $1
      `,
      [id]
    );

    const paymentStatus = await refreshInvoicePaymentStatus(
      client,
      invoiceId
    );

    await client.query("COMMIT");

    res.json({
      message: "Paiement supprimé avec succès.",
      invoice: paymentStatus,
    });
  } catch (error) {
    await client.query("ROLLBACK");

    console.error("Erreur deleteInvoicePayment:", error);

    res.status(500).json({
      message: "Erreur lors de la suppression du paiement.",
    });
  } finally {
    client.release();
  }
};