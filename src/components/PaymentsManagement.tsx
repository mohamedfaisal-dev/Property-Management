"use client";
import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  Eye,
  Plus,
  Filter,
  Download,
  Calendar,
  User,
  Home,
  AlertCircle,
  CheckCircle,
  Clock,
  XCircle
} from 'lucide-react';
import api from '../api';

interface Bill {
  id: number;
  tenant: {
    id: number;
    name: string;
    email: string;
    phone: string;
  };
  property: {
    id: number;
    title: string;
    address: string;
    city: string;
  };
  amount: number;
  rent_amount?: number;
  charges?: number;
  total_amount?: number;
  payment_date?: string;
  month: string;
  due_date: string;
  status: 'PENDING' | 'PAID' | 'OVERDUE' | 'RECEIPT_SENT';
  description: string;
  created_at: string;
}

interface BillsStats {
  totalBills: number;
  totalAmount: number;
  pendingBills: number;
  overdueBills: number;
  statusBreakdown: Array<{
    status: string;
    count: number;
    total_amount: number;
  }>;
}

interface CreateBillForm {
  tenant_id: number;
  property_id: number;
  amount: number;
  month: string;
  due_date: string;
  description: string;
}

const PaymentsManagement: React.FC = () => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [stats, setStats] = useState<BillsStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [selectedBill, setSelectedBill] = useState<Bill | null>(null);
  const [payingBill, setPayingBill] = useState<number | null>(null);
  const [downloadingBill, setDownloadingBill] = useState<number | null>(null);
  const [selectedBillsForDownload, setSelectedBillsForDownload] = useState<number[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    search: '',
    page: 1,
    limit: 10
  });
  const [pagination, setPagination] = useState({
    total: 0,
    page: 1,
    limit: 10,
    totalPages: 0
  });

  // Form state
  const [createForm, setCreateForm] = useState<CreateBillForm>({
    tenant_id: 0,
    property_id: 0,
    amount: 0,
    month: new Date().toISOString().slice(0, 7),
    due_date: new Date().toISOString().slice(0, 10),
    description: 'Monthly rent payment'
  });

  // Additional state for form
  const [tenants, setTenants] = useState<any[]>([]);
  const [properties, setProperties] = useState<any[]>([]);

  useEffect(() => {
    fetchBills();
    fetchStats();
    fetchTenants();
    fetchProperties();
  }, [filters]);

  const fetchBills = async () => {
    try {
      setLoading(true);
      const response = await api.listBills(filters);

      if (response.data?.success && response.data?.data?.bills) {
        setBills(response.data.data.bills);
        setPagination(response.data.data.pagination);
      } else if (!response.data?.success) {
        // 4xx error response (e.g. 401, 403)
        console.warn('Bills API returned error:', response.data?.error || response.data?.message);
        setBills([]);
      } else {
        setBills([]);
      }
    } catch (err: any) {
      console.error('Error fetching bills:', err);
      setError(err.userMessage || 'Failed to fetch bills');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.getBillsStats();
      setStats(response.data.data);
    } catch (err: any) {
      console.error('Failed to fetch stats:', err);
    }
  };

  const fetchTenants = async () => {
    try {
      const response = await api.listTenants();

      if (response.data?.success && response.data?.data?.tenants) {
        setTenants(response.data.data.tenants);
      } else if (Array.isArray(response.data?.data)) {
        setTenants(response.data.data);
      } else {
        setTenants([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch tenants:', err);
      setTenants([]);
    }
  };

  const fetchProperties = async () => {
    try {
      const response = await api.listProperties();

      if (response.data?.success && response.data?.data?.properties) {
        setProperties(response.data.data.properties);
      } else if (Array.isArray(response.data?.data)) {
        setProperties(response.data.data);
      } else {
        setProperties([]);
      }
    } catch (err: any) {
      console.error('Failed to fetch properties:', err);
      setProperties([]);
    }
  };


  const handleDownloadBill = async (billId: number) => {
    try {
      setDownloadingBill(billId);

      // Use the existing API client for consistency
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token d\'authentification manquant');
      }

      // Use relative path for API (handled by Next.js proxy)
      const downloadURL = `/api/bills/${billId}/download`;

      const response = await fetch(downloadURL, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/pdf',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Échec du téléchargement (${response.status}): ${response.statusText}`);
      }

      // Check if response is actually a PDF
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/pdf')) {
        console.warn('⚠️ Type de contenu inattendu:', contentType);
      }

      // Get the filename from the response headers
      const contentDisposition = response.headers.get('content-disposition');
      let filename = `quittance-${billId}.pdf`;

      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
        }
      }

      // Create blob and download
      const blob = await response.blob();

      // Verify blob is not empty and is a PDF
      if (blob.size === 0) {
        throw new Error('Le fichier PDF téléchargé est vide');
      }

      // Check PDF magic number
      const arrayBuffer = await blob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const pdfHeader = String.fromCharCode(uint8Array[0], uint8Array[1], uint8Array[2], uint8Array[3]);
      if (pdfHeader !== '%PDF') {
        console.warn('⚠️ Le fichier téléchargé ne semble pas être un PDF valide');
      }

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      alert(`✅ Quittance téléchargée avec succès !\nFichier: ${filename}\nTaille: ${(blob.size / 1024).toFixed(1)} KB`);

    } catch (err: any) {
      console.error('❌ Erreur de téléchargement:', err);
      alert('❌ Échec du téléchargement: ' + (err.message || 'Erreur inconnue'));
    } finally {
      setDownloadingBill(null);
    }
  };

  const handleDownloadMultipleBills = async () => {
    if (selectedBillsForDownload.length === 0) {
      alert('Veuillez sélectionner au moins une facture à télécharger');
      return;
    }

    for (const billId of selectedBillsForDownload) {
      await handleDownloadBill(billId);
      // Small delay between downloads to avoid overwhelming the browser
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setSelectedBillsForDownload([]);
    alert(`${selectedBillsForDownload.length} facture(s) téléchargée(s) avec succès !`);
  };

  const toggleBillSelection = (billId: number) => {
    setSelectedBillsForDownload(prev =>
      prev.includes(billId)
        ? prev.filter(id => id !== billId)
        : [...prev, billId]
    );
  };

  const selectAllBills = () => {
    if (selectedBillsForDownload.length === bills.length) {
      setSelectedBillsForDownload([]);
    } else {
      setSelectedBillsForDownload(bills.map(bill => bill.id));
    }
  };

  const handleMarkAsPaid = async (billId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir marquer cette facture comme payée ?')) {
      return;
    }

    try {
      setPayingBill(billId);
      await api.markBillAsPaid(billId);

      // Refresh bills and stats
      await fetchBills();
      await fetchStats();

      alert('Facture marquée comme payée avec succès !');
    } catch (err: any) {
      alert(err.userMessage || 'Échec de la mise à jour de la facture');
    } finally {
      setPayingBill(null);
    }
  };

  const handleUndoPayment = async (billId: number) => {
    if (!confirm('Êtes-vous sûr de vouloir annuler le paiement de cette facture ? Le montant sera soustrait des profits.')) {
      return;
    }

    try {
      setPayingBill(billId);
      await api.undoPayment(billId);

      // Refresh bills and stats
      await fetchBills();
      await fetchStats();

      alert('Paiement annulé avec succès !');
    } catch (err: any) {
      alert(err.userMessage || 'Échec de l\'annulation du paiement');
    } finally {
      setPayingBill(null);
    }
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createBill(createForm);
      setShowCreateForm(false);
      setCreateForm({
        tenant_id: 0,
        property_id: 0,
        amount: 0,
        month: new Date().toISOString().slice(0, 7),
        due_date: new Date().toISOString().slice(0, 10),
        description: 'Monthly rent payment'
      });
      await fetchBills();
      await fetchStats();
      alert('Bill created successfully!');
    } catch (err: any) {
      alert(err.userMessage || 'Failed to create bill');
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1 // Reset to first page when filtering
    }));
  };

  const handlePageChange = (page: number) => {
    setFilters(prev => ({ ...prev, page }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'PAID':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'OVERDUE':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
      case 'RECEIPT_SENT':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'bg-yellow-100 text-yellow-800';
      case 'PAID':
        return 'bg-green-100 text-green-800';
      case 'OVERDUE':
        return 'bg-red-100 text-red-800';
      case 'RECEIPT_SENT':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading && bills.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Gestion des Paiements</h1>
          <p className="text-gray-600 mt-1">Gérer les factures, reçus et paiements</p>
        </div>
        <div className="flex gap-2">
          {selectedBillsForDownload.length > 0 && (
            <button
              onClick={handleDownloadMultipleBills}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
            >
              <Download className="w-4 h-4" />
              Télécharger ({selectedBillsForDownload.length})
            </button>
          )}
          <button
            onClick={() => setShowCreateForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Créer une Facture
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Bills</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalBills}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <DollarSign className="w-8 h-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Amount</p>
                <p className="text-2xl font-bold text-gray-900">${stats.totalAmount.toFixed(2)}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <Clock className="w-8 h-8 text-yellow-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pending</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingBills}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow">
            <div className="flex items-center">
              <AlertCircle className="w-8 h-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Overdue</p>
                <p className="text-2xl font-bold text-gray-900">{stats.overdueBills}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm"
            >
              <option value="">All Status</option>
              <option value="PENDING">Pending</option>
              <option value="PAID">Paid</option>
              <option value="OVERDUE">Overdue</option>
              <option value="RECEIPT_SENT">Receipt Sent</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="text"
              placeholder="Search bills..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm w-64"
            />
          </div>
        </div>
      </div>

      {/* Bills Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedBillsForDownload.length === bills.length && bills.length > 0}
                    onChange={selectAllBills}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    title="Sélectionner tout"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Locataire
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Propriété
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Montant
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Mois
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date d'échéance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Statut
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bills.map((bill) => (
                <tr key={bill.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <input
                      type="checkbox"
                      checked={selectedBillsForDownload.includes(bill.id)}
                      onChange={() => toggleBillSelection(bill.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      title="Sélectionner pour téléchargement"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{bill.tenant.name}</div>
                        <div className="text-sm text-gray-500">{bill.tenant.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Home className="w-4 h-4 text-gray-400 mr-2" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{bill.property.title}</div>
                        <div className="text-sm text-gray-500">{bill.property.city}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    €{(bill.total_amount || bill.amount).toFixed(2)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {bill.month}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(bill.due_date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(bill.status)}`}>
                      {getStatusIcon(bill.status)}
                      <span className="ml-1">{bill.status.replace('_', ' ')}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedBill(bill)}
                        className="text-blue-600 hover:text-blue-900"
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadBill(bill.id)}
                        disabled={downloadingBill === bill.id}
                        className="text-gray-600 hover:text-gray-900 disabled:opacity-50"
                        title="Télécharger la quittance PDF"
                      >
                        {downloadingBill === bill.id ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                      {(bill.status === 'PENDING' || bill.status === 'OVERDUE') && (
                        <button
                          onClick={() => handleMarkAsPaid(bill.id)}
                          disabled={payingBill === bill.id}
                          className="text-green-600 hover:text-green-900 disabled:opacity-50"
                          title="Marquer comme payée"
                        >
                          {payingBill === bill.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-green-600"></div>
                          ) : (
                            <CheckCircle className="w-4 h-4" />
                          )}
                        </button>
                      )}
                      {bill.status === 'PAID' && (
                        <button
                          onClick={() => handleUndoPayment(bill.id)}
                          disabled={payingBill === bill.id}
                          className="text-orange-600 hover:text-orange-900 disabled:opacity-50"
                          title="Annuler le paiement"
                        >
                          {payingBill === bill.id ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-orange-600"></div>
                          ) : (
                            <XCircle className="w-4 h-4" />
                          )}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing{' '}
                  <span className="font-medium">{(pagination.page - 1) * pagination.limit + 1}</span>
                  {' '}to{' '}
                  <span className="font-medium">
                    {Math.min(pagination.page * pagination.limit, pagination.total)}
                  </span>
                  {' '}of{' '}
                  <span className="font-medium">{pagination.total}</span>
                  {' '}results
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${page === pagination.page
                        ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                        : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                        }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Create Bill Modal */}
      {showCreateForm && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Create New Bill</h3>
              <form onSubmit={handleCreateBill} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Tenant</label>
                  <select
                    value={createForm.tenant_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, tenant_id: parseInt(e.target.value) || 0 }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value={0}>Sélectionner un locataire</option>
                    {Array.isArray(tenants) && tenants.map(tenant => (
                      <option key={tenant.id} value={tenant.id}>{tenant.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Property</label>
                  <select
                    value={createForm.property_id}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, property_id: parseInt(e.target.value) || 0 }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  >
                    <option value={0}>Sélectionner une propriété</option>
                    {Array.isArray(properties) && properties.map(property => (
                      <option key={property.id} value={property.id}>{property.title}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Amount</label>
                  <input
                    type="number"
                    step="0.01"
                    value={createForm.amount}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, amount: parseFloat(e.target.value) || 0 }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Month</label>
                  <input
                    type="month"
                    value={createForm.month}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, month: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Due Date</label>
                  <input
                    type="date"
                    value={createForm.due_date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, due_date: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700">Description</label>
                  <textarea
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                    className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2"
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateForm(false)}
                    className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Create Bill
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bill Details Modal */}
      {selectedBill && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
            <div className="mt-3">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Bill Details</h3>
                <button
                  onClick={() => setSelectedBill(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <span className="font-medium">Locataire:</span> {selectedBill.tenant.name}
                </div>
                <div>
                  <span className="font-medium">Propriété:</span> {selectedBill.property.title}
                </div>

                {selectedBill.rent_amount && selectedBill.charges !== undefined ? (
                  <>
                    <div>
                      <span className="font-medium">Loyer:</span> €{selectedBill.rent_amount.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Charges:</span> €{selectedBill.charges.toFixed(2)}
                    </div>
                    <div>
                      <span className="font-medium">Total:</span> <span className="text-lg font-bold">€{(selectedBill.total_amount || selectedBill.amount).toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div>
                    <span className="font-medium">Montant:</span> <span className="text-lg font-bold">€{selectedBill.amount.toFixed(2)}</span>
                  </div>
                )}

                <div>
                  <span className="font-medium">Mois:</span> {selectedBill.month}
                </div>
                <div>
                  <span className="font-medium">Date d'échéance:</span> {new Date(selectedBill.due_date).toLocaleDateString('fr-FR')}
                </div>
                {selectedBill.payment_date && (
                  <div>
                    <span className="font-medium">Date de paiement:</span> {new Date(selectedBill.payment_date).toLocaleDateString('fr-FR')}
                  </div>
                )}
                <div>
                  <span className="font-medium">Statut:</span>
                  <span className={`ml-2 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(selectedBill.status)}`}>
                    {getStatusIcon(selectedBill.status)}
                    <span className="ml-1">{selectedBill.status.replace('_', ' ')}</span>
                  </span>
                </div>
                <div>
                  <span className="font-medium">Description:</span> {selectedBill.description}
                </div>

                {/* Action Buttons */}
                <div className="pt-4 border-t border-gray-200">
                  <div className="grid grid-cols-1 gap-2">
                    {/* Mark as Paid Button */}
                    {(selectedBill.status === 'PENDING' || selectedBill.status === 'OVERDUE') && (
                      <button
                        onClick={() => {
                          handleMarkAsPaid(selectedBill.id);
                          setSelectedBill(null);
                        }}
                        disabled={payingBill === selectedBill.id}
                        className="flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {payingBill === selectedBill.id ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Marquage en cours...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Marquer comme payée
                          </>
                        )}
                      </button>
                    )}

                    {selectedBill.status === 'PAID' && (
                      <button
                        onClick={() => {
                          handleUndoPayment(selectedBill.id);
                          setSelectedBill(null);
                        }}
                        disabled={payingBill === selectedBill.id}
                        className="flex items-center justify-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                      >
                        {payingBill === selectedBill.id ? (
                          <>
                            <Clock className="w-4 h-4 mr-2 animate-spin" />
                            Annulation en cours...
                          </>
                        ) : (
                          <>
                            <XCircle className="w-4 h-4 mr-2" />
                            Annuler le paiement
                          </>
                        )}
                      </button>
                    )}

                    {/* Download Button */}
                    <button
                      onClick={() => handleDownloadBill(selectedBill.id)}
                      disabled={downloadingBill === selectedBill.id}
                      className="flex items-center justify-center px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {downloadingBill === selectedBill.id ? (
                        <>
                          <Clock className="w-4 h-4 mr-2 animate-spin" />
                          Téléchargement en cours...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4 mr-2" />
                          📄 Télécharger la Quittance PDF
                        </>
                      )}
                    </button>

                  </div>

                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PaymentsManagement;

