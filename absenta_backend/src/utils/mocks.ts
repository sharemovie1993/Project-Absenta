export const mockTenant = {
    id: 'mock-tenant-id-123',
    name: 'Koperasi Demo',
    subdomain: 'demo',
    status: 'ACTIVE'
};

export const mockUser = {
    id: 'mock-user-id',
    email: 'admin@demo.com',
    role: 'ADMIN',
    tenantId: mockTenant.id
};

export const mockPlan = {
    id: 'mock-plan-basic',
    name: 'Basic Plan',
    price: 100000
};

export const mockSubscription = {
    id: 'mock-sub-id',
    tenantId: mockTenant.id,
    planId: mockPlan.id,
    status: 'ACTIVE',
    plan: mockPlan
};
