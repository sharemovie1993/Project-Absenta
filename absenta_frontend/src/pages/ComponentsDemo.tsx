import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { Table } from '@/components/ui/Table';
import { Badge, StatusBadge, PaymentStatusBadge } from '@/components/ui/Badge';
import { Loader, PageLoader, ButtonLoader, CardLoader } from '@/components/ui/Loader';
import { 
  SuccessAlert,
  ErrorAlert,
  WarningAlert,
  InfoAlert,
  AlertContainer
} from '@/components/ui/Alert';
import { useToast } from '@/hooks/useToast';
import { ToastContainer } from '@/components/ui/Toast';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Edit, Trash2, Eye } from 'lucide-react';

const ComponentsDemo: React.FC = () => {
  if (import.meta.env.MODE === 'production') {
    return null;
  }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showPageLoader, setShowPageLoader] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const { showToast, toasts, removeToast, clearAllToasts } = useToast();

  // Sample data for table
  const tableData = [
    { id: 1, name: 'John Doe', email: 'john@example.com', status: 'active', role: 'Admin' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', status: 'inactive', role: 'User' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', status: 'pending', role: 'Editor' },
  ];

  const tableColumns = [
    { key: 'name', label: 'Name' },
    { key: 'email', label: 'Email' },
    { key: 'status', label: 'Status', render: (value: any) => <StatusBadge status={String(value) as any} /> },
    { key: 'role', label: 'Role' },
    { 
      key: 'actions', 
      label: 'Actions', 
      render: (_: any, __: any) => (
        <div className="flex space-x-2">
          <Button size="sm" variant="outline">
            <Eye className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="outline">
            <Edit className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="danger">
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      )
    },
  ];

  const handleToastDemo = (type: 'success' | 'error' | 'warning' | 'info') => {
    const messages = {
      success: 'Operation completed successfully!',
      error: 'An error occurred while processing your request.',
      warning: 'Please review your input before proceeding.',
      info: 'Here is some important information for you.',
    };

    showToast(messages[type], type);
  };

  const handleButtonLoading = () => {
    setIsButtonLoading(true);
    setTimeout(() => setIsButtonLoading(false), 2000);
  };

  const handlePageLoader = () => {
    setShowPageLoader(true);
    setTimeout(() => setShowPageLoader(false), 3000);
  };

  const alertsData = [
    {
      id: '1',
      type: 'success' as const,
      title: 'Success!',
      description: 'Your changes have been saved successfully.',
      dismissible: true,
    },
    {
      id: '2',
      type: 'warning' as const,
      title: 'Warning!',
      description: 'Please review your settings before proceeding.',
      dismissible: true,
    },
  ];

  return (
    <div className="container mx-auto p-6 space-y-8">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">UI Components Demo</h1>
        <p className="text-muted-foreground">
          Testing and showcasing all implemented reusable components
        </p>
      </div>

      {/* Modal Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Modal Component</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsModalOpen(true)}>
            Open Modal
          </Button>
          <Modal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            title="Demo Modal"
            size="md"
          >
            <div className="space-y-4">
              <p>This is a demo modal with Framer Motion animations.</p>
              <p>It supports dark mode and has responsive sizing.</p>
            </div>
          </Modal>
        </CardContent>
      </Card>

      {/* Table Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Table Component</CardTitle>
        </CardHeader>
        <CardContent>
          <Table
            data={tableData}
            columns={tableColumns}
            onRowClick={(row) => console.log('Row clicked:', row)}
            striped
            hoverable
          />
        </CardContent>
      </Card>

      {/* Badge Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Badge Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <h4 className="font-medium mb-2">Basic Badges</h4>
              <div className="flex flex-wrap gap-2">
                <Badge variant="default">Default</Badge>
                <Badge variant="secondary">Secondary</Badge>
                <Badge variant="destructive">Destructive</Badge>
                <Badge variant="outline">Outline</Badge>
                <Badge variant="success">Success</Badge>
                <Badge variant="warning">Warning</Badge>
                <Badge variant="error">Error</Badge>
                <Badge variant="info">Info</Badge>
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-2">Status Badges</h4>
              <div className="flex flex-wrap gap-2">
                <StatusBadge status="active" />
                <StatusBadge status="inactive" />
                <StatusBadge status="pending" />
                <StatusBadge status="completed" />
                <StatusBadge status="cancelled" />
                <StatusBadge status="draft" />
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Payment Status Badges</h4>
              <div className="flex flex-wrap gap-2">
                <PaymentStatusBadge status="paid" />
                <PaymentStatusBadge status="unpaid" />
                <PaymentStatusBadge status="overdue" />
                <PaymentStatusBadge status="partial" />
                <PaymentStatusBadge status="refunded" />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loader Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Loader Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            <div>
              <h4 className="font-medium mb-2">Loader Types</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <Loader type="spinner" />
                  <p className="text-sm mt-2">Spinner</p>
                </div>
                <div className="text-center">
                  <Loader type="dots" />
                  <p className="text-sm mt-2">Dots</p>
                </div>
                <div className="text-center">
                  <Loader type="pulse" />
                  <p className="text-sm mt-2">Pulse</p>
                </div>
                <div className="text-center">
                  <Loader type="bars" />
                  <p className="text-sm mt-2">Bars</p>
                </div>
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Loader Sizes</h4>
              <div className="flex items-center space-x-4">
                <Loader size="sm" />
                <Loader size="default" />
                <Loader size="lg" />
                <Loader size="xl" />
              </div>
            </div>

            <div>
              <h4 className="font-medium mb-2">Specialized Loaders</h4>
              <div className="space-y-4">
                <div>
                  <Button 
                    onClick={handleButtonLoading}
                    disabled={isButtonLoading}
                  >
                    {isButtonLoading && <ButtonLoader />}
                    {isButtonLoading ? 'Loading...' : 'Button with Loader'}
                  </Button>
                </div>
                
                <div>
                  <Button onClick={handlePageLoader}>
                    Show Page Loader
                  </Button>
                </div>

                <CardLoader text="Loading card content..." />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toast Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Toast System</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => handleToastDemo('success')} variant="primary">
                Success Toast
              </Button>
              <Button onClick={() => handleToastDemo('error')} variant="danger">
                Error Toast
              </Button>
              <Button onClick={() => handleToastDemo('warning')} variant="outline">
                Warning Toast
              </Button>
              <Button onClick={() => handleToastDemo('info')} variant="secondary">
                Info Toast
              </Button>
              <Button onClick={clearAllToasts} variant="outline">
                Clear All
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Alert Demo */}
      <Card>
        <CardHeader>
          <CardTitle>Alert Components</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <SuccessAlert 
              title="Success Alert"
              description="This is a success alert with dismiss functionality."
            />
            
            <ErrorAlert 
              title="Error Alert"
              description="This is an error alert that can be dismissed."
            />
            
            <WarningAlert 
              title="Warning Alert"
              description="This is a warning alert with important information."
            />
            
            <InfoAlert 
              title="Information Alert"
              description="This is an informational alert for your reference."
            />

            <div>
              <h4 className="font-medium mb-2">Alert Container</h4>
              <AlertContainer alerts={alertsData} />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Toast Container */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Page Loader */}
      {showPageLoader && (
        <PageLoader text="Loading page content..." />
      )}
    </div>
  );
};

export default ComponentsDemo;
