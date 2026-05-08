import { Router } from 'express';
import * as billController from '../controllers/billController';
import { verifyToken, isSuperAdmin } from '../middleware/auth';
import { validateBill } from '../middleware/validation';

const router = Router();

/**
 * @route   GET /api/bills
 * @desc    Get all bills for authenticated admin
 * @access  Private
 */
router.get('/', verifyToken, billController.getAllBills);

/**
 * @route   GET /api/bills/stats
 * @desc    Get bills statistics for authenticated admin
 * @access  Private
 */
router.get('/stats', verifyToken, billController.getBillsStats);

/**
 * @route   GET /api/bills/:id
 * @desc    Get specific bill by ID
 * @access  Private
 */
router.get('/:id', verifyToken, billController.getBillById);

/**
 * @route   POST /api/bills
 * @desc    Create a new bill
 * @access  Private
 */
router.post('/', verifyToken, ...validateBill, billController.createBill);

/**
 * @route   PUT /api/bills/:id
 * @desc    Update a bill
 * @access  Private
 */
router.put('/:id', verifyToken, billController.updateBill);

/**
 * @route   DELETE /api/bills/:id
 * @desc    Delete a bill
 * @access  Private
 */
router.delete('/:id', verifyToken, billController.deleteBill);

/**
 * @route   GET /api/bills/:id/receipts
 * @desc    Get receipt history for a bill
 * @access  Private
 */
router.get('/:id/receipts', verifyToken, billController.getReceiptHistory);

/**
 * @route   GET /api/bills/:id/download
 * @desc    Download bill as PDF
 * @access  Private
 */
router.get('/:id/download', verifyToken, billController.downloadBill);

/**
 * @route   POST /api/bills/generate-monthly
 * @desc    Manually trigger monthly bill generation (SUPER_ADMIN only)
 * @access  Private (SUPER_ADMIN)
 */
router.post('/generate-monthly', verifyToken, isSuperAdmin, billController.generateMonthlyBills);

/**
 * @route   POST /api/bills/generate-admin
 * @desc    Generate bills for current admin only
 * @access  Private
 */
router.post('/generate-admin', verifyToken, billController.generateBillsForCurrentAdmin);

/**
 * @route   GET /api/bills/generation-stats
 * @desc    Get bill generation statistics for a specific month
 * @access  Private
 */
router.get('/generation-stats', verifyToken, billController.getBillGenerationStats);

/**
 * @route   PUT /api/bills/:id/pay
 * @desc    Mark a bill as paid and update profit
 * @access  Private
 */
router.put('/:id/pay', verifyToken, billController.markBillAsPaid);

/**
 * @route   PUT /api/bills/:id/undo
 * @desc    Undo payment - Revert a paid bill back to pending
 * @access  Private
 */
router.put('/:id/undo', verifyToken, billController.undoPayment);

/**
 * @route   GET /api/bills/profits/total
 * @desc    Get total profit for authenticated admin
 * @access  Private
 */
router.get('/profits/total', verifyToken, billController.getTotalProfit);

export default router;
