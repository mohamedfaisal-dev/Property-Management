"use client";
import React, { useEffect, useState } from 'react';
import { Search, Plus, X, Edit, Trash2 } from 'lucide-react';
import api from '../api';

// Type assertion to help TypeScript understand the api object structure
const apiClient = api as any;

interface Tenant {
  id: number | string;
  admin_id?: number;
  property_id?: number | string;
  name?: string;
  fullName?: string;
  email?: string;
  phone?: string;
  propertyName?: string;
  propertyId?: string;
  checkInDate?: string;
  checkOutDate?: string;
  stayDuration?: number;
  status?: 'active' | 'upcoming' | 'completed';
  avatar?: string;
  document_path?: string;
  rent_amount?: number;
}

interface NewTenantForm {
  fullName: string;
  email: string;
  phone: string;
  propertyId: string;
  checkInDate: string;
  checkOutDate: string;
  documents: File[];
  rent?: string;
}

const TunnetSectionFixed: React.FC = () => {

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTenant, setNewTenant] = useState<NewTenantForm>({
    fullName: '',
    email: '',
    phone: '',
    propertyId: '',
    checkInDate: '',
    checkOutDate: '',
    documents: [],
    rent: ''
  });
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [properties, setProperties] = useState<{ id: number; title: string }[]>([]);
  const [isLoadingProperties, setIsLoadingProperties] = useState(false);
  const [propertiesError, setPropertiesError] = useState<string | null>(null);
  const [isLoadingTenants, setIsLoadingTenants] = useState(false);
  const [tenantsError, setTenantsError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState<NewTenantForm>({
    fullName: '',
    email: '',
    phone: '',
    propertyId: '',
    checkInDate: '',
    checkOutDate: '',
    documents: [],
    rent: ''
  });

  // Fetch properties from API
  const fetchProperties = async () => {
    setIsLoadingProperties(true);
    setPropertiesError(null);

    try {
      // Check if token exists before making API calls
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping properties API call');
        setProperties([]);
        setIsLoadingProperties(false);
        return;
      }

      const response = await api.listProperties();

      if (response.data?.success && response.data?.data?.properties) {
        const propertiesData = response.data.data.properties.map((property: any) => ({
          id: property.id,
          title: property.title
        }));
        setProperties(propertiesData);
      } else {
        setPropertiesError('Failed to load properties');
        setProperties([]);
        console.log('❌ Failed to load properties - invalid response structure');
      }
    } catch (error: any) {
      console.error('❌ Error fetching properties:', error);
      setPropertiesError(error.response?.data?.error || 'Failed to load properties');
      setProperties([]);
    } finally {
      setIsLoadingProperties(false);
    }
  };

  // Fetch tenants from API
  const fetchTenants = async () => {
    setIsLoadingTenants(true);
    setTenantsError(null);

    try {
      // Check if token exists before making API calls
      const token = localStorage.getItem('token');
      if (!token) {
        console.log('No token found, skipping tenants API call');
        setTenants([]);
        setIsLoadingTenants(false);
        return;
      }

      const response = await api.listTenants();
      const tData = response.data?.data?.tenants || [];

      const mapped = tData.map((t: any) => ({
        id: String(t.id),
        fullName: t.name,
        email: t.email || '',
        phone: t.phone || '',
        propertyName: properties.find((p: any) => p.id === t.property_id)?.title || '',
        propertyId: t.property_id ? String(t.property_id) : '',
        checkInDate: t.lease_start || '',
        checkOutDate: t.lease_end || '',
        stayDuration: 0,
        status: t.status?.toLowerCase() || 'active',
        avatar: '',
        documents: [],
        rent_amount: t.rent_amount,
        document_path: t.documents
      }));

      setTenants(mapped);
    } catch (e: any) {
      console.error('❌ Error loading tenants:', e);
      setTenantsError(e.response?.data?.error || 'Failed to load tenants');
      setTenants([]);
    } finally {
      setIsLoadingTenants(false);
    }
  };

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      await fetchProperties();
      await fetchTenants();
    };
    loadData();
  }, []);

  // Re-fetch tenants when properties change
  useEffect(() => {
    if (properties.length > 0) {
      fetchTenants();
    }
  }, [properties]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Tenant form submitted');

    // Client-side validation
    if (!newTenant.fullName.trim()) {
      console.log('❌ Validation failed: Name is required');
      alert('Please enter tenant name');
      return;
    }
    if (!newTenant.email.trim()) {
      console.log('❌ Validation failed: Email is required');
      alert('Please enter tenant email');
      return;
    }
    if (!newTenant.propertyId) {
      console.log('❌ Validation failed: Property is required');
      alert('Please select a property');
      return;
    }

    const propertyId = parseInt(newTenant.propertyId);
    if (isNaN(propertyId)) {
      console.log('❌ Validation failed: Invalid property ID');
      alert('Invalid property selected');
      return;
    }

    const tenantData: any = {
      name: newTenant.fullName.trim(),
      email: newTenant.email.trim(),
      property_id: propertyId
    };

    // Only add optional fields if they have values
    if (newTenant.phone?.trim()) {
      tenantData.phone = newTenant.phone.trim();
    }
    if (newTenant.rent && !isNaN(parseFloat(newTenant.rent))) {
      tenantData.rent_amount = parseFloat(newTenant.rent);
    }

    console.log('📤 Sending tenant data:', tenantData);

    try {
      const response = await apiClient.createTenant(tenantData);
      console.log('✅ Tenant created successfully:', response.data);

      setIsModalOpen(false);
      setNewTenant({ fullName: '', email: '', phone: '', propertyId: '', checkInDate: '', checkOutDate: '', documents: [], rent: '' });

      // Refresh tenant list
      console.log('🔄 Refreshing tenant list after creation...');
      await fetchTenants();
    } catch (err: any) {
      console.error('❌ Create tenant error:', err);
      let errorMsg = err?.response?.data?.error || err?.message || 'Failed to add tenant. Please try again.';

      // Handle rate limiting error
      if (errorMsg.includes('Too many requests')) {
        errorMsg = 'Rate limit exceeded. Please wait a moment before trying again.';
      }

      const details = err?.response?.data?.details;
      if (details) {
        console.error('📋 Validation details:', details);
        alert(`${errorMsg}\n\nDetails: ${JSON.stringify(details, null, 2)}`);
      } else {
        alert(errorMsg);
      }
    }
  };

  // Handle edit tenant
  const handleEditTenant = (tenant: Tenant) => {
    console.log('✏️ Editing tenant:', tenant);
    setEditingTenant(tenant);
    setEditForm({
      fullName: tenant.fullName || '',
      email: tenant.email || '',
      phone: tenant.phone || '',
      propertyId: tenant.propertyId || '',
      checkInDate: tenant.checkInDate || '',
      checkOutDate: tenant.checkOutDate || '',
      documents: [],
      rent: tenant.rent_amount ? String(tenant.rent_amount) : ''
    });
    setIsEditModalOpen(true);
  };

  // Handle delete tenant
  const handleDeleteTenant = async (tenantId: string) => {
    console.log('🗑️ Deleting tenant:', tenantId);
    if (!confirm('Are you sure you want to delete this tenant? This action cannot be undone.')) {
      return;
    }

    try {
      await apiClient.deleteTenantApi(tenantId);
      console.log('✅ Tenant deleted successfully');
      alert('Tenant deleted successfully');
      // Refresh the tenant list
      await fetchTenants();
    } catch (error: any) {
      console.error('❌ Error deleting tenant:', error);
      let errorMsg = error?.response?.data?.error || error?.message || 'Failed to delete tenant. Please try again.';

      // Handle rate limiting error
      if (errorMsg.includes('Too many requests')) {
        errorMsg = 'Rate limit exceeded. Please wait a moment before trying again.';
      }

      alert(errorMsg);
    }
  };

  // Handle edit form submission
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTenant) return;

    console.log('📝 Edit tenant form submitted');

    // Client-side validation
    if (!editForm.fullName.trim()) {
      alert('Please enter tenant name');
      return;
    }
    if (!editForm.email.trim()) {
      alert('Please enter tenant email');
      return;
    }
    if (!editForm.propertyId) {
      alert('Please select a property');
      return;
    }

    const propertyId = parseInt(editForm.propertyId);
    if (isNaN(propertyId)) {
      alert('Invalid property selected');
      return;
    }

    const tenantData: any = {
      name: editForm.fullName.trim(),
      email: editForm.email.trim(),
      property_id: propertyId
    };

    // Only add optional fields if they have values
    if (editForm.phone?.trim()) {
      tenantData.phone = editForm.phone.trim();
    }
    if (editForm.rent && !isNaN(parseFloat(editForm.rent))) {
      tenantData.rent_amount = parseFloat(editForm.rent);
    }

    console.log('📤 Updating tenant data:', tenantData);

    try {
      const response = await apiClient.updateTenant(editingTenant.id, tenantData);
      console.log('✅ Tenant updated successfully:', response.data);

      setIsEditModalOpen(false);
      setEditingTenant(null);
      setEditForm({
        fullName: '',
        email: '',
        phone: '',
        propertyId: '',
        checkInDate: '',
        checkOutDate: '',
        documents: [],
        rent: ''
      });

      // Refresh tenant list
      console.log('🔄 Refreshing tenant list after update...');
      await fetchTenants();
    } catch (err: any) {
      console.error('❌ Update tenant error:', err);
      let errorMsg = err?.response?.data?.error || err?.message || 'Failed to update tenant. Please try again.';

      // Handle rate limiting error
      if (errorMsg.includes('Too many requests')) {
        errorMsg = 'Rate limit exceeded. Please wait a moment before trying again.';
      }

      const details = err?.response?.data?.details;
      if (details) {
        console.error('📋 Validation details:', details);
        alert(`${errorMsg}\n\nDetails: ${JSON.stringify(details, null, 2)}`);
      } else {
        alert(errorMsg);
      }
    }
  };

  const filteredTenants = tenants.filter(tenant =>
    tenant.fullName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.propertyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    tenant.propertyId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Tenant Management</h1>


      {/* Status Panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="p-3 bg-blue-50 rounded">
          <h3 className="font-semibold">Properties Status:</h3>
          {isLoadingProperties ? (
            <p>Loading properties...</p>
          ) : propertiesError ? (
            <p className="text-red-600">Error: {propertiesError}</p>
          ) : (
            <p className="text-green-600">✓ Found {properties.length} properties</p>
          )}
        </div>

        <div className="p-3 bg-green-50 rounded">
          <h3 className="font-semibold">Tenants Status:</h3>
          {isLoadingTenants ? (
            <p>Loading tenants...</p>
          ) : tenantsError ? (
            <p className="text-red-600">Error: {tenantsError}</p>
          ) : (
            <p className="text-green-600">✓ Found {tenants.length} tenants</p>
          )}
        </div>
      </div>

      {/* Search and Add Button */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Search tenants..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Tenant</span>
        </button>
      </div>

      {/* Tenants Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTenants.map((tenant) => (
          <div
            key={tenant.id}
            className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-all duration-300"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-semibold">
                      {tenant.fullName?.charAt(0) || 'T'}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{tenant.fullName}</h3>
                    <p className="text-sm text-gray-500">{tenant.email}</p>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEditTenant(tenant)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit tenant"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteTenant(String(tenant.id))}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete tenant"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-1 text-sm text-gray-600">
                <p><strong>Property:</strong> {tenant.propertyName || 'N/A'}</p>
                <p><strong>Phone:</strong> {tenant.phone || 'N/A'}</p>
                <p><strong>Rent:</strong> ${tenant.rent_amount || 'N/A'}</p>
                <p><strong>Status:</strong>
                  <span className={`ml-1 px-2 py-1 rounded-full text-xs ${tenant.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : tenant.status === 'upcoming'
                      ? 'bg-yellow-100 text-yellow-800'
                      : 'bg-gray-100 text-gray-800'
                    }`}>
                    {tenant.status}
                  </span>
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* No Results */}
      {filteredTenants.length === 0 && !isLoadingTenants && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-2">
            <Search className="w-12 h-12 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">No tenants found</h3>
          <p className="text-gray-600">Try adjusting your search terms or add a new tenant.</p>
        </div>
      )}

      {/* Loading State */}
      {isLoadingTenants && (
        <div className="text-center py-12">
          <div className="text-blue-400 mb-2">
            <div className="w-12 h-12 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-1">Loading tenants...</h3>
          <p className="text-gray-600">Please wait while we fetch the tenant data.</p>
        </div>
      )}

      {/* Add New Tenant Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Add New Tenant</h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={newTenant.fullName}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={newTenant.email}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={newTenant.phone}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property *
                </label>
                <select
                  required
                  value={newTenant.propertyId}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, propertyId: e.target.value }))}
                  disabled={isLoadingProperties}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLoadingProperties ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                >
                  <option value="">
                    {isLoadingProperties ? 'Loading properties...' : 'Select a property'}
                  </option>
                  {properties.map((property) => (
                    <option key={property.id} value={String(property.id)}>
                      {property.title}
                    </option>
                  ))}
                </select>
                {propertiesError && (
                  <p className="text-sm text-red-600 mt-1">{propertiesError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rent Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={newTenant.rent}
                  onChange={(e) => setNewTenant(prev => ({ ...prev, rent: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Tenant Modal */}
      {isEditModalOpen && editingTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Edit Tenant</h2>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingTenant(null);
                  setEditForm({
                    fullName: '',
                    email: '',
                    phone: '',
                    propertyId: '',
                    checkInDate: '',
                    checkOutDate: '',
                    documents: [],
                    rent: ''
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={editForm.email}
                  onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property *
                </label>
                <select
                  required
                  value={editForm.propertyId}
                  onChange={(e) => setEditForm(prev => ({ ...prev, propertyId: e.target.value }))}
                  disabled={isLoadingProperties}
                  className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${isLoadingProperties ? 'bg-gray-100 cursor-not-allowed' : ''
                    }`}
                >
                  <option value="">
                    {isLoadingProperties ? 'Loading properties...' : 'Select a property'}
                  </option>
                  {properties.map((property) => (
                    <option key={property.id} value={String(property.id)}>
                      {property.title}
                    </option>
                  ))}
                </select>
                {propertiesError && (
                  <p className="text-sm text-red-600 mt-1">{propertiesError}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rent Amount
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={editForm.rent}
                  onChange={(e) => setEditForm(prev => ({ ...prev, rent: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditingTenant(null);
                    setEditForm({
                      fullName: '',
                      email: '',
                      phone: '',
                      propertyId: '',
                      checkInDate: '',
                      checkOutDate: '',
                      documents: [],
                      rent: ''
                    });
                  }}
                  className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Update Tenant
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TunnetSectionFixed;
