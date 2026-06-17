import React, { useState } from 'react';
import { getInvoicesFromAPI } from '../../api/invoice.api';

const InvoiceApiTest: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testInvoiceAPI = async () => {
    console.log('🧪 Testing Invoice API...');
    
    // Check localStorage
    const token = localStorage.getItem('access_token');
    const tenantId = localStorage.getItem('tenant_id');
    
    console.log('🔑 Token in localStorage:', token ? 'EXISTS' : 'NOT_FOUND');
    console.log('🏢 Tenant ID in localStorage:', tenantId || 'NOT_FOUND (OK for SUPERADMIN)');
    
    if (!token) {
      setResult({ error: 'No access token found. Please login first.' });
      return;
    }
    
    // For SUPERADMIN, tenant_id is optional
    // If no tenant_id, API will return invoices from all tenants
    
    setLoading(true);
    try {
      const response = await getInvoicesFromAPI({});
      console.log('✅ Invoice API Response:', response);
      setResult(response);
    } catch (error) {
      console.error('❌ Invoice API Error:', error);
      setResult({ error: (error as any).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ 
      padding: '20px', 
      border: '2px solid #007bff', 
      borderRadius: '8px', 
      margin: '20px',
      backgroundColor: '#f8f9fa'
    }}>
      <h3>🧪 Invoice API Test</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Token:</strong> {localStorage.getItem('access_token') ? '✅ EXISTS' : '❌ NOT_FOUND'}
      </div>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Tenant ID:</strong> {localStorage.getItem('tenant_id') || '⚠️ NOT_FOUND (OK for SUPERADMIN)'}
      </div>
      
      <button 
        onClick={testInvoiceAPI}
        disabled={loading}
        style={{
          padding: '10px 20px',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: loading ? 'not-allowed' : 'pointer'
        }}
      >
        {loading ? 'Testing...' : 'Test Invoice API'}
      </button>
      
      {result && (
        <div style={{ 
          marginTop: '20px', 
          padding: '10px', 
          backgroundColor: 'white', 
          border: '1px solid #ddd',
          borderRadius: '4px',
          maxHeight: '300px',
          overflow: 'auto'
        }}>
          <h4>Result:</h4>
          <pre>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default InvoiceApiTest;
