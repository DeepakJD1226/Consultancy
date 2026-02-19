// API Client for communicating with Node.js backend
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

class APIClient {
    private baseURL: string;

    constructor() {
        this.baseURL = API_URL;
    }

    private async request<T>(endpoint: string, options?: RequestInit): Promise<T> {
        const url = `${this.baseURL}${endpoint}`;

        try {
            const response = await fetch(url, {
                ...options,
                headers: {
                    'Content-Type': 'application/json',
                    ...options?.headers,
                },
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'API request failed');
            }

            return await response.json();
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Customer APIs
    customers = {
        getAll: (params?: { search?: string; business_type?: string }) => {
            const query = new URLSearchParams(params as any).toString();
            return this.request<any>(`/api/customers?${query}`);
        },
        getById: (id: string) => this.request<any>(`/api/customers/${id}`),
        create: (data: any) => this.request<any>('/api/customers', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: any) => this.request<any>(`/api/customers/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => this.request<any>(`/api/customers/${id}`, {
            method: 'DELETE',
        }),
        searchByPhone: (phone: string) => this.request<any>(`/api/customers/search?phone=${phone}`),
    };

    // Order APIs
    orders = {
        getAll: (params?: { customer_id?: string; status?: string }) => {
            const query = new URLSearchParams(params as any).toString();
            return this.request<any>(`/api/orders?${query}`);
        },
        getById: (id: string) => this.request<any>(`/api/orders/${id}`),
        create: (data: any) => this.request<any>('/api/orders', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: any) => this.request<any>(`/api/orders/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        cancel: (id: string) => this.request<any>(`/api/orders/${id}`, {
            method: 'DELETE',
        }),
        checkAvailability: (data: { fabric_type: string; quantity_meters: number }) =>
            this.request<any>('/api/orders/check-availability', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
    };

    // Inventory APIs
    inventory = {
        getAll: (params?: { fabric_type?: string; low_stock?: boolean }) => {
            const query = new URLSearchParams(params as any).toString();
            return this.request<any>(`/api/inventory?${query}`);
        },
        getById: (id: string) => this.request<any>(`/api/inventory/${id}`),
        add: (data: any) => this.request<any>('/api/inventory', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        update: (id: string, data: any) => this.request<any>(`/api/inventory/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data),
        }),
        delete: (id: string) => this.request<any>(`/api/inventory/${id}`, {
            method: 'DELETE',
        }),
        getLowStock: () => this.request<any>('/api/inventory/low-stock'),
        getSummary: () => this.request<any>('/api/inventory/summary'),
    };

    // Bill APIs
    bills = {
        getAll: (params?: { customer_id?: string; payment_status?: string }) => {
            const query = new URLSearchParams(params as any).toString();
            return this.request<any>(`/api/bills?${query}`);
        },
        getById: (id: string) => this.request<any>(`/api/bills/${id}`),
        create: (data: any) => this.request<any>('/api/bills', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        updatePayment: (id: string, status: string) =>
            this.request<any>(`/api/bills/${id}/payment`, {
                method: 'PUT',
                body: JSON.stringify({ payment_status: status }),
            }),
        download: (id: string) => `${this.baseURL}/api/bills/${id}/download`,
        getSummary: () => this.request<any>('/api/bills/summary'),
    };

    // Mill APIs
    mills = {
        getAll: () => this.request<any>('/api/mills'),
        getById: (id: string) => this.request<any>(`/api/mills/${id}`),
        create: (data: any) => this.request<any>('/api/mills', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        getRawMaterials: (params?: { mill_id?: string; status?: string }) => {
            const query = new URLSearchParams(params as any).toString();
            return this.request<any>(`/api/mills/raw-materials?${query}`);
        },
        sendRawMaterials: (data: any) => this.request<any>('/api/mills/raw-materials', {
            method: 'POST',
            body: JSON.stringify(data),
        }),
        updateRawMaterial: (id: string, data: any) =>
            this.request<any>(`/api/mills/raw-materials/${id}`, {
                method: 'PUT',
                body: JSON.stringify(data),
            }),
        getPerformance: () => this.request<any>('/api/mills/performance'),
    };

    // Reports APIs
    reports = {
        getSales: (params?: { from_date?: string; to_date?: string }) => {
            const query = new URLSearchParams(params as any).toString();
            return this.request<any>(`/api/reports/sales?${query}`);
        },
        getInventory: () => this.request<any>('/api/reports/inventory'),
        getCustomers: () => this.request<any>('/api/reports/customers'),
        getDashboard: () => this.request<any>('/api/reports/dashboard'),
    };
}

export const api = new APIClient();
export default api;
