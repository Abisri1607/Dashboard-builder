// --- STATE STORE (NOW CONNECTED TO MONGODB API) ---
class Store {
    constructor() {
        this.dashboard_config = [];
        this.customer_orders = [];
        this.listeners = [];
        this.dateFilter = 'all';
        this.apiBase = 'http://localhost:3000/api/data';
    }

    subscribe(listener) {
        this.listeners.push(listener);
    }

    notify() {
        this.listeners.forEach(listener => listener());
    }

    getAuthHeaders() {
        const token = localStorage.getItem('dashbuilder_token');
        return {
            'Content-Type': 'application/json',
            'Authorization': token ? `Bearer ${token}` : ''
        };
    }

    async loadInitialData() {
        try {
            const [ordersRes, dashRes] = await Promise.all([
                fetch(`${this.apiBase}/orders`, { headers: this.getAuthHeaders() }),
                fetch(`${this.apiBase}/dashboard`, { headers: this.getAuthHeaders() })
            ]);

            if (ordersRes.ok) this.customer_orders = await ordersRes.json();
            if (dashRes.ok) {
                const configRaw = await dashRes.json();
                // Map the DB structure back to what frontend expects
                this.dashboard_config = configRaw.map(w => ({
                    ...w,
                    id: w.frontendId // Assign the front-end UUID back to id
                }));
            }
            
            this.notify();
        } catch (err) {
            console.error('Error loading data from API', err);
        }
    }

    // --- Dashboard Config ---
    getDashboardConfig() {
        return this.dashboard_config;
    }

    async saveDashboardConfig() {
        try {
            await fetch(`${this.apiBase}/dashboard`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(this.dashboard_config)
            });
            console.log("Dashboard saved to DB.");
        } catch (err) {
            console.error('Failed to save dashboard', err);
        }
    }

    async addWidget(widgetConfig) {
        const newWidget = {
            ...widgetConfig,
            id: 'wdg_' + Date.now().toString(36) + Math.random().toString(36).substr(2)
        };
        this.dashboard_config.push(newWidget);
        await this.saveDashboardConfig(); // Auto-save on drop
        this.notify();
    }

    updateWidgetLocally(id, updates) {
       const index = this.dashboard_config.findIndex(w => w.id === id);
       if (index !== -1) {
           this.dashboard_config[index] = { ...this.dashboard_config[index], ...updates };
       }
    }

    async updateWidget(id, updates) {
        this.updateWidgetLocally(id, updates);
        await this.saveDashboardConfig();
        this.notify();
    }

    async removeWidget(id) {
        this.dashboard_config = this.dashboard_config.filter(w => w.id !== id);
        await this.saveDashboardConfig();
        this.notify();
    }

    updateWidgetPosition(id, newIndex) {
        const currentIndex = this.dashboard_config.findIndex(w => w.id === id);
        if (currentIndex === -1) return;
        
        const widget = this.dashboard_config.splice(currentIndex, 1)[0];
        this.dashboard_config.splice(newIndex, 0, widget);
        
        // Local re-render
        this.notify();
    }

    // --- Orders ---
    getCustomerOrders() {
        return this.customer_orders;
    }

    async addCustomerOrder(orderData) {
        try {
            const res = await fetch(`${this.apiBase}/orders`, {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(orderData)
            });
            const savedOrder = await res.json();
            if (res.ok) {
                // Prepend since API sorts by latest
                this.customer_orders.unshift(savedOrder);
                this.notify();
            }
        } catch (err) {
            console.error('Failed to add order', err);
        }
    }

    async editCustomerOrder(id, orderData) {
        try {
            const res = await fetch(`${this.apiBase}/orders/${id}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(orderData)
            });
            const updatedOrder = await res.json();
            if (res.ok) {
                const index = this.customer_orders.findIndex(o => o.id === id);
                if (index !== -1) {
                    this.customer_orders[index] = updatedOrder;
                    this.notify();
                }
            }
        } catch (err) {
            console.error('Failed to update order', err);
        }
    }

    async removeCustomerOrder(id) {
        try {
            const res = await fetch(`${this.apiBase}/orders/${id}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });
            
            if (res.ok) {
                this.customer_orders = this.customer_orders.filter(o => o.id !== id);
                this.notify();
            }
        } catch (err) {
            console.error('Failed to delete order', err);
        }
    }

    setGlobalDateFilter(filterVal) {
        this.dateFilter = filterVal;
        this.notify();
    }

    getGlobalDateFilter() {
        return this.dateFilter;
    }
}

export const store = new Store();
