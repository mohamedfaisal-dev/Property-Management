class PDFService {
  static streamBillPDF(res: any, bill: any) {
    res.status(501).json({ error: 'Not implemented' });
  }

  static async generateBillPDF(bill: any): Promise<string> {
    return '/dummy/path/to/pdf';
  }
}

export default PDFService;
