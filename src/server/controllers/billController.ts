import { Request, Response } from 'express';
import { Op } from 'sequelize';
import { Bill, Tenant, Property, Receipt, Admin, Profit } from '../models';
import PDFService from '../services/pdfService';
import BillGenerationService from '../services/billGenerationService';
import fs from 'fs';

export const getAllBills = async (req: Request, res: Response): Promise<void> => {
  try {
    const { status, page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'DESC' } = req.query;

    const whereClause: any = { admin_id: (req.admin as any).id };

    if (status) {
      whereClause.status = status;
    }

    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
    const order: any = [[sortBy, (sortOrder as string).toUpperCase()]];

    const bills = await (Bill as any).findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'address', 'city', 'country'],
        },
        {
          model: Admin,
          as: 'admin',
          attributes: ['id', 'name', 'email'],
        },
      ],
      order,
      limit: parseInt(limit as string),
      offset: parseInt(offset as any),
    });

    res.json({
      success: true,
      data: {
        bills: bills.rows,
        pagination: {
          total: bills.count,
          page: parseInt(page as string),
          limit: parseInt(limit as string),
          totalPages: Math.ceil(bills.count / parseInt(limit as string)),
        },
      },
    });
  } catch (error: any) {
    console.error('Error fetching bills:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bills',
      error: error.message,
    });
  }
};

export const getBillById = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bill = await (Bill as any).findOne({
      where: { id, admin_id: (req.admin as any).id },
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'phone', 'join_date'],
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'address', 'city', 'country', 'monthly_rent'],
        },
        {
          model: Admin,
          as: 'admin',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Receipt,
          as: 'receipts',
          attributes: ['id', 'sent_date', 'status', 'sent_to_tenant', 'sent_to_admin'],
        },
      ],
    });

    if (!bill) {
      res.status(404).json({
        success: false,
        message: 'Bill not found',
      });
      return;
    }

    res.json({
      success: true,
      data: bill,
    });
  } catch (error: any) {
    console.error('Error fetching bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bill',
      error: error.message,
    });
  }
};

export const createBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { tenant_id, property_id, amount, rent_amount, charges, month, due_date, description } = req.body;

    if (!tenant_id || !property_id || !amount || !month || !due_date) {
      res.status(400).json({
        success: false,
        message: 'Missing required fields: tenant_id, property_id, amount, month, due_date',
      });
      return;
    }

    const tenant = await (Tenant as any).findOne({
      where: { id: tenant_id, admin_id: (req.admin as any).id },
      include: [{
        model: Property,
        as: 'property',
        attributes: ['id', 'monthly_rent'],
      }],
    });

    if (!tenant) {
      res.status(404).json({
        success: false,
        message: 'Tenant not found or not authorized',
      });
      return;
    }

    const property = await (Property as any).findOne({
      where: { id: property_id, admin_id: (req.admin as any).id },
    });

    if (!property) {
      res.status(404).json({
        success: false,
        message: 'Property not found or not authorized',
      });
      return;
    }

    const existingBill = await (Bill as any).findOne({
      where: { tenant_id, month, admin_id: (req.admin as any).id },
    });

    if (existingBill) {
      res.status(400).json({
        success: false,
        message: 'Bill already exists for this tenant and month',
      });
      return;
    }

    const rentAmount = rent_amount ? parseFloat(rent_amount) : (tenant.property?.monthly_rent ? parseFloat(tenant.property.monthly_rent) : parseFloat(amount));
    const chargesAmount = charges ? parseFloat(charges) : 0;
    const totalAmount = rentAmount + chargesAmount;

    const bill = await (Bill as any).create({
      tenant_id,
      property_id,
      admin_id: (req.admin as any).id,
      amount: parseFloat(amount),
      rent_amount: rentAmount,
      charges: chargesAmount,
      total_amount: totalAmount,
      month,
      due_date,
      description: description || 'Monthly rent payment',
    });

    const createdBill = await (Bill as any).findByPk(bill.id, {
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'address', 'city'],
        },
      ],
    });

    res.status(201).json({
      success: true,
      message: 'Bill created successfully',
      data: createdBill,
    });
  } catch (error: any) {
    console.error('Error creating bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create bill',
      error: error.message,
    });
  }
};

export const updateBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { amount, due_date, status, description } = req.body;

    const bill = await (Bill as any).findOne({
      where: { id, admin_id: (req.admin as any).id },
    });

    if (!bill) {
      res.status(404).json({
        success: false,
        message: 'Bill not found',
      });
      return;
    }

    if (amount !== undefined) bill.amount = parseFloat(amount);
    if (due_date !== undefined) bill.due_date = due_date;
    if (status !== undefined) bill.status = status;
    if (description !== undefined) bill.description = description;

    await bill.save();

    res.json({
      success: true,
      message: 'Bill updated successfully',
      data: bill,
    });
  } catch (error: any) {
    console.error('Error updating bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update bill',
      error: error.message,
    });
  }
};

export const deleteBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bill = await (Bill as any).findOne({
      where: { id, admin_id: (req.admin as any).id },
    });

    if (!bill) {
      res.status(404).json({
        success: false,
        message: 'Bill not found',
      });
      return;
    }

    await bill.destroy();

    res.json({
      success: true,
      message: 'Bill deleted successfully',
    });
  } catch (error: any) {
    console.error('Error deleting bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete bill',
      error: error.message,
    });
  }
};

export const getReceiptHistory = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const receipts = await (Receipt as any).findAll({
      where: { bill_id: id, admin_id: (req.admin as any).id },
      order: [['sent_date', 'DESC']],
    });

    res.json({
      success: true,
      data: receipts,
    });
  } catch (error: any) {
    console.error('Error fetching receipt history:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch receipt history',
      error: error.message,
    });
  }
};

export const getBillsStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const admin_id = (req.admin as any)?.id;

    if (!admin_id) {
      res.status(401).json({ success: false, message: 'Unauthorized' });
      return;
    }

    const stats = await (Bill as any).findAll({
      where: { admin_id },
      attributes: [
        'status',
        [(Bill as any).sequelize.fn('COUNT', (Bill as any).sequelize.col('id')), 'count'],
        [(Bill as any).sequelize.fn('SUM', (Bill as any).sequelize.col('amount')), 'total_amount'],
      ],
      group: ['status'],
    });

    const totalBills = await (Bill as any).count({ where: { admin_id } });
    const totalAmount = await (Bill as any).sum('amount', { where: { admin_id } });
    const pendingBills = await (Bill as any).count({ where: { admin_id, status: 'PENDING' } });
    const overdueBills = await (Bill as any).count({
      where: {
        admin_id,
        status: 'OVERDUE',
        due_date: { [Op.lt]: new Date() },
      },
    });

    res.json({
      success: true,
      data: {
        totalBills,
        totalAmount: parseFloat(totalAmount || 0),
        pendingBills,
        overdueBills,
        statusBreakdown: stats,
      },
    });
  } catch (error: any) {
    console.error('Error fetching bills stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bills statistics',
      error: error.message,
    });
  }
};

export const downloadBill = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bill = await (Bill as any).findOne({
      where: { id, admin_id: (req.admin as any).id },
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email', 'phone'],
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title', 'address', 'city', 'country', 'monthly_rent'],
        },
        {
          model: Admin,
          as: 'admin',
          attributes: ['id', 'name', 'email'],
        },
      ],
    });

    if (!bill) {
      res.status(404).json({
        success: false,
        message: 'Bill not found',
      });
      return;
    }

    const pdfPath = await (PDFService as any).generateBillPDF(bill);
    if (!bill.pdf_path || bill.pdf_path !== pdfPath) {
      await bill.update({ pdf_path: pdfPath });
    }
    
    try {
      const stat = fs.statSync(pdfPath);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="facture-${bill.id}-${bill.month}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', stat.size);
      res.setHeader('X-Content-Type-Options', 'nosniff');
    } catch (statErr: any) {
      console.warn('Could not stat PDF before streaming:', statErr.message);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `inline; filename="facture-${bill.id}-${bill.month}.pdf"`);
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('X-Content-Type-Options', 'nosniff');
    }

    const readStream = fs.createReadStream(pdfPath);
    readStream.on('error', (err) => {
      console.error('Error reading PDF file:', err);
      if (!res.headersSent) {
        res.status(500).json({ success: false, message: 'Error reading bill PDF' });
      } else {
        try { res.end(); } catch (_) { }
      }
    });

    readStream.pipe(res);

  } catch (error: any) {
    console.error('Error downloading bill:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to download bill',
      error: error.message,
    });
  }
};

export const generateMonthlyBills = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month } = req.body;

    console.log(`🔄 Manual bill generation triggered by admin ${(req.admin as any).id} for month: ${month || 'current'}`);

    const result = await (BillGenerationService as any).generateMonthlyBills(month);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.statistics,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Error in manual bill generation:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate monthly bills',
      error: error.message,
    });
  }
};

export const getBillGenerationStats = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month } = req.query;

    if (!month) {
      res.status(400).json({
        success: false,
        message: 'Month parameter is required (YYYY-MM format)',
      });
      return;
    }

    const result = await (BillGenerationService as any).getBillGenerationStats(month as string);

    if (result.success) {
      res.json({
        success: true,
        data: result.data,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Error getting bill generation stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get bill generation statistics',
      error: error.message,
    });
  }
};

export const generateBillsForCurrentAdmin = async (req: Request, res: Response): Promise<void> => {
  try {
    const { month } = req.body;

    console.log(`🔄 Bill generation for admin ${(req.admin as any).id} triggered for month: ${month || 'current'}`);

    const result = await (BillGenerationService as any).generateBillsForAdmin((req.admin as any).id, month);

    if (result.success) {
      res.json({
        success: true,
        message: result.message,
        data: result.statistics,
      });
    } else {
      res.status(500).json({
        success: false,
        message: result.message,
        error: result.error,
      });
    }
  } catch (error: any) {
    console.error('Error generating bills for admin:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate bills for admin',
      error: error.message,
    });
  }
};

export const markBillAsPaid = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bill = await (Bill as any).findOne({
      where: { id, admin_id: (req.admin as any).id },
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title'],
        },
      ],
    });

    if (!bill) {
      res.status(404).json({
        success: false,
        message: 'Facture non trouvée',
      });
      return;
    }

    if (bill.status === 'PAID') {
      res.status(400).json({
        success: false,
        message: 'Cette facture est déjà marquée comme payée',
      });
      return;
    }

    const amountToAdd = parseFloat(bill.total_amount || bill.amount);

    bill.status = 'PAID';
    bill.payment_date = new Date();
    await bill.save();

    await (Profit as any).incrementProfit((req.admin as any).id, amountToAdd);

    const totalProfit = await (Profit as any).getTotalProfit((req.admin as any).id);

    console.log(`✅ Bill ${id} marked as paid. Added €${amountToAdd.toFixed(2)} to profit. New total: €${totalProfit.toFixed(2)}`);

    res.json({
      success: true,
      message: 'Facture marquée comme payée avec succès',
      data: {
        bill: {
          id: bill.id,
          status: bill.status,
          payment_date: bill.payment_date,
          amount: amountToAdd,
        },
        profit: {
          total: totalProfit,
          added: amountToAdd,
        },
      },
    });

  } catch (error: any) {
    console.error('Error marking bill as paid:', error);
    res.status(500).json({
      success: false,
      message: 'Échec de la mise à jour de la facture',
      error: error.message,
    });
  }
};

export const undoPayment = async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const bill = await (Bill as any).findOne({
      where: { id, admin_id: (req.admin as any).id },
      include: [
        {
          model: Tenant,
          as: 'tenant',
          attributes: ['id', 'name', 'email'],
        },
        {
          model: Property,
          as: 'property',
          attributes: ['id', 'title'],
        },
      ],
    });

    if (!bill) {
      res.status(404).json({
        success: false,
        message: 'Facture non trouvée',
      });
      return;
    }

    if (bill.status !== 'PAID') {
      res.status(400).json({
        success: false,
        message: 'Cette facture n\'est pas marquée comme payée',
      });
      return;
    }

    const amountToSubtract = parseFloat(bill.total_amount || bill.amount);

    bill.status = 'PENDING';
    bill.payment_date = null;
    await bill.save();

    await (Profit as any).incrementProfit((req.admin as any).id, -amountToSubtract);

    const totalProfit = await (Profit as any).getTotalProfit((req.admin as any).id);

    console.log(`✅ Bill ${id} payment undone. Subtracted €${amountToSubtract.toFixed(2)} from profit. New total: €${totalProfit.toFixed(2)}`);

    res.json({
      success: true,
      message: 'Paiement annulé avec succès',
      data: {
        bill: {
          id: bill.id,
          status: bill.status,
          payment_date: bill.payment_date,
          amount: amountToSubtract,
        },
        profit: {
          total: totalProfit,
          subtracted: amountToSubtract,
        },
      },
    });

  } catch (error: any) {
    console.error('Error undoing payment:', error);
    res.status(500).json({
      success: false,
      message: 'Échec de l\'annulation du paiement',
      error: error.message,
    });
  }
};

export const getTotalProfit = async (req: Request, res: Response): Promise<void> => {
  try {
    const totalProfit = await (Profit as any).getTotalProfit((req.admin as any).id);

    res.json({
      success: true,
      data: {
        total_profit: totalProfit,
      },
    });
  } catch (error: any) {
    console.error('Error fetching total profit:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch total profit',
      error: error.message,
    });
  }
};
