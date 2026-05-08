import { Router, Request, Response } from 'express';
import { Expense } from '../models';
import { verifyToken, isAdmin } from '../middleware/auth';

const router = Router();

router.use(verifyToken, isAdmin);

// POST /api/expenses → Add new expense
router.post('/', async (req: Request, res: Response) => {
  try {
    const { type, amount, date } = req.body;
    if (!type || !String(type).trim()) {
      res.status(400).json({ success: false, error: 'Expense type is required' });
      return;
    }
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      res.status(400).json({ success: false, error: 'Amount must be a positive number' });
      return;
    }

    const when = date ? new Date(date) : new Date();
    const yyyy = when.getFullYear();
    const mm = String(when.getMonth() + 1).padStart(2, '0');
    const dd = String(when.getDate()).padStart(2, '0');

    // For general expenses (not property-specific), we need property_id to be nullable
    // Let's skip property_id for now since it's for general expense tracking
    const created = await (Expense as any).create({
      admin_id: (req.admin as any).id,
      month: `${yyyy}-${mm}`,
      category: String(type).trim(),
      amount: amt,
      notes: null,
      created_at: new Date(`${yyyy}-${mm}-${dd}`),
    });

    res.status(201).json({ success: true, data: { expense: created } });
  } catch (error) {
    console.error('Create expense error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// GET /api/expenses → Fetch all expenses (for current admin)
router.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await (Expense as any).findAll({
      where: { admin_id: (req.admin as any).id },
      order: [['created_at', 'DESC']],
    });
    res.json({ success: true, data: { expenses: rows } });
  } catch (error) {
    console.error('List expenses error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// DELETE /api/expenses/:id → Delete an expense (scoped to current admin)
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isFinite(id) || id <= 0) {
      res.status(400).json({ success: false, error: 'Invalid expense id' });
      return;
    }

    const expense = await (Expense as any).findOne({
      where: { id, admin_id: (req.admin as any).id },
    });
    if (!expense) {
      res.status(404).json({ success: false, error: 'Expense not found' });
      return;
    }

    await expense.destroy();
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Delete expense error:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

export default router;
