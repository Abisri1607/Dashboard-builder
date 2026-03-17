import { store } from './store.js';

/**
 * UI Controller Module
 * Handles Modals, Navigations, Global Buttons, and Dynamic Widget Configuration Forms
 */

class UIController {
    constructor() {
        this.currentWidgetIdBeingEdited = null;
        this.cacheDOM();
        this.bindEvents();
    }

    cacheDOM() {
        // Nav
        this.navItems = document.querySelectorAll('.nav-item');
        this.views = document.querySelectorAll('.view');
        this.viewTitle = document.getElementById('view-title');
        this.btnMobileMenu = document.getElementById('btn-mobile-menu');
        this.appSidebar = document.querySelector('.app-sidebar');
        this.sidebarOverlay = document.getElementById('sidebar-overlay');

        // Global Buttons
        this.btnConfigDash = document.getElementById('btn-configure-dashboard');
        this.btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
        this.btnSaveDash = document.getElementById('btn-save-dashboard');
        this.btnCreateOrderHeader = document.getElementById('btn-create-order');

        // Dashboard Elements
        this.dashboardEmptyState = document.getElementById('dashboard-empty-state');
        this.btnEmptyConfigure = document.getElementById('btn-empty-configure');
        this.dashboardCanvas = document.getElementById('dashboard-canvas');

        // Widget Sidebar
        this.widgetSidebar = document.getElementById('widget-sidebar');
        this.btnCloseWidgetSidebar = document.getElementById('btn-close-widget-sidebar');

        // Modals
        this.modalOverlay = document.getElementById('modal-overlay');
        
        // Modal: Create Order
        this.modalCreateOrder = document.getElementById('modal-create-order');
        this.formCreateOrder = document.getElementById('form-create-order');
        this.btnSubmitOrder = document.getElementById('btn-submit-order');
        this.inputUnitQty = document.getElementById('quantity');
        this.inputUnitPrice = document.getElementById('unitPrice');
        this.inputTotalAmt = document.getElementById('totalAmount');

        // Modal: Widget Config
        this.modalConfigWidget = document.getElementById('modal-config-widget');
        this.formConfigWidget = document.getElementById('form-config-widget');
        this.dynamicWidgetConfig = document.getElementById('dynamic-widget-config');
        this.btnSaveWidgetConfig = document.getElementById('btn-save-widget-config');
        this.btnDeleteWidgetModal = document.getElementById('btn-delete-widget-modal');

        // Close handlers
        this.modalCloseBtns = document.querySelectorAll('.modal-close, .modal-cancel');

        // Date Filter
        this.dateFilter = document.getElementById('date-filter');

        // Orders Table
        this.ordersEmptyState = document.getElementById('orders-empty-state');
        this.ordersTable = document.getElementById('orders-table');
        if (this.ordersTable) {
            this.ordersTableBody = this.ordersTable.querySelector('tbody');
        }
        // Orders Toolbar & Pagination
        this.ordersSearchInput = document.getElementById('orders-search-input');
        this.ordersStatusFilter = document.getElementById('orders-status-filter');
        this.ordersPaginationLayout = document.getElementById('orders-pagination');
        this.pageStartIdx = document.getElementById('page-start-idx');
        this.pageEndIdx = document.getElementById('page-end-idx');
        this.pageTotalIdx = document.getElementById('page-total-idx');
        this.btnPagePrev = document.getElementById('btn-page-prev');
        this.btnPageNext = document.getElementById('btn-page-next');
        this.pageNumbersContainer = document.getElementById('page-numbers');

        // Orders State
        this.ordersCurrentPage = 1;
        this.ordersPerPage = 10;
        this.ordersFilteredData = [];

        // Auth Header & Profile
        this.btnLogout = document.getElementById('btn-logout');
        this.userDisplayName = document.getElementById('user-display-name');
        this.userProfileBtn = document.getElementById('user-profile-btn');
        this.profileDropdownMenu = document.getElementById('profile-dropdown-menu');
        this.btnNavProfile = document.getElementById('btn-nav-profile');
        this.btnNavOrdersSummary = document.getElementById('btn-nav-orders-summary');

        // Profile View Elements
        this.profileDisplayUsername = document.getElementById('profile-display-username');
        this.profileDisplayUsernameInfo = document.getElementById('profile-display-username-info');
        this.profileDisplayEmail = document.getElementById('profile-display-email');
        this.profileDisplayPassword = document.getElementById('profile-display-password');
        this.formUpdateEmail = document.getElementById('form-update-email');
        this.formUpdatePassword = document.getElementById('form-update-password');
        this.formUpdateAvatar = document.getElementById('form-update-avatar');

        this.headerAvatarImg = document.getElementById('header-avatar-img');
        this.headerAvatarIcon = document.getElementById('header-avatar-icon');
        
        this.profilePageAvatarImg = document.getElementById('profile-page-avatar-img');
        this.profilePageAvatarIcon = document.getElementById('profile-page-avatar-icon');
        this.updateAvatarUrlInput = document.getElementById('update-avatar-url');

        // Theme Toggle
        this.btnThemeToggle = document.getElementById('btn-theme-toggle');

        // Toasts
        this.toastContainer = document.getElementById('toast-container');
    }

    bindEvents() {
        // Navigation Switcher
        this.navItems.forEach(item => {
            item.addEventListener('click', (e) => {
                const viewId = e.target.closest('.nav-item').dataset.view;
                this.switchView(viewId, e.target.closest('.nav-item'));
            });
        });

        // Mobile Sidebar Toggle
        if (this.btnMobileMenu && this.appSidebar && this.sidebarOverlay) {
            this.btnMobileMenu.addEventListener('click', () => this.toggleMobileSidebar(true));
            this.sidebarOverlay.addEventListener('click', () => this.toggleMobileSidebar(false));
        }

        // Config Toggle
        this.btnConfigDash.addEventListener('click', () => this.toggleConfigMode(true));
        if(this.btnToggleSidebar) {
           this.btnToggleSidebar.addEventListener('click', () => {
                const isOpen = this.widgetSidebar.classList.contains('open');
                this.toggleWidgetSidebar(!isOpen);
           });
        }
        this.btnEmptyConfigure.addEventListener('click', () => {
            this.dashboardEmptyState.style.display = 'none';
            this.dashboardCanvas.style.display = 'grid';
            this.toggleConfigMode(true);
        });

        // Save Dashboard Setup
        this.btnSaveDash.addEventListener('click', async () => {
            await store.saveDashboardConfig();
            this.toggleConfigMode(false);
            this.showToast('Dashboard saved successfully!');
        });

        // Widget Sidebar toggle
        this.btnCloseWidgetSidebar.addEventListener('click', () => this.toggleWidgetSidebar(false));

        // Date Filter
        this.dateFilter.addEventListener('change', (e) => {
            store.setGlobalDateFilter(e.target.value);
            // Updating store will trigger re-renders everywhere via main.js subscription
        });

        // Orders Toolbar Filtering & Pagination
        if (this.ordersSearchInput) {
            this.ordersSearchInput.addEventListener('input', () => {
                this.ordersCurrentPage = 1;
                this.updateOrdersView();
            });
        }
        if (this.ordersStatusFilter) {
            this.ordersStatusFilter.addEventListener('change', () => {
                this.ordersCurrentPage = 1;
                this.updateOrdersView();
            });
        }
        if (this.btnPagePrev) {
            this.btnPagePrev.addEventListener('click', () => {
                if (this.ordersCurrentPage > 1) {
                    this.ordersCurrentPage--;
                    this.updateOrdersView();
                }
            });
        }
        if (this.btnPageNext) {
            this.btnPageNext.addEventListener('click', () => {
                const maxPage = Math.ceil(this.ordersFilteredData.length / this.ordersPerPage);
                if (this.ordersCurrentPage < maxPage) {
                    this.ordersCurrentPage++;
                    this.updateOrdersView();
                }
            });
        }

        // Orders View Actions
        this.btnCreateOrderHeader.addEventListener('click', () => {
            this.formCreateOrder.removeAttribute('data-edit-id');
            const title = this.modalCreateOrder.querySelector('.modal-header h2');
            if(title) title.textContent = 'Create Customer Order';
            this.formCreateOrder.reset();
            this.inputTotalAmt.value = '';
            this.openModal(this.modalCreateOrder);
        });
        
        // Auto-calculate total amount
        [this.inputUnitQty, this.inputUnitPrice].forEach(input => {
            input.addEventListener('input', () => {
                const qty = parseFloat(this.inputUnitQty.value) || 0;
                const price = parseFloat(this.inputUnitPrice.value) || 0;
                this.inputTotalAmt.value = (qty * price).toFixed(2);
            });
        });

        this.btnSubmitOrder.addEventListener('click', (e) => this.handleOrderSubmit(e));

        // Orders Table Actions (Event Delegation)
        this.ordersTableBody.addEventListener('click', async (e) => {
            const deleteBtn = e.target.closest('.delete-order-btn');
            const editBtn = e.target.closest('.edit-order-btn');

            if (deleteBtn) {
                const orderId = deleteBtn.dataset.id;
                if (confirm('Are you sure you want to delete this order?')) {
                    await store.removeCustomerOrder(orderId);
                    this.updateOrdersView(); // re-render layout
                    this.showToast('Order deleted successfully!');
                }
            } else if (editBtn) {
                const orderId = editBtn.dataset.id;
                const order = store.getCustomerOrders().find(o => o.id === orderId);
                if (order) {
                    // Populate form
                    for (const key in order) {
                        const input = this.formCreateOrder.elements[key];
                        if (input) input.value = order[key];
                    }
                    
                    this.formCreateOrder.setAttribute('data-edit-id', orderId);
                    const title = this.modalCreateOrder.querySelector('.modal-header h2');
                    if(title) title.textContent = 'Edit Customer Order';
                    
                    this.openModal(this.modalCreateOrder);
                }
            }
        });

        // Modal Close handlers
        this.modalCloseBtns.forEach(btn => {
            btn.addEventListener('click', () => this.closeAllModals());
        });
        this.modalOverlay.addEventListener('click', () => this.closeAllModals());

        // Widget Config Save/Delete
        this.btnSaveWidgetConfig.addEventListener('click', () => this.handleWidgetConfigSubmit());
        this.btnDeleteWidgetModal.addEventListener('click', () => {
            if (this.currentWidgetIdBeingEdited && confirm('Are you sure you want to delete this widget?')) {
                store.removeWidget(this.currentWidgetIdBeingEdited);
                this.closeAllModals();
            }
        });

        // Logout
        if (this.btnLogout) {
            this.btnLogout.addEventListener('click', () => {
                localStorage.removeItem('dashbuilder_token');
                localStorage.removeItem('dashbuilder_user');
                window.location.href = 'login.html';
            });
        }

        // Profile Dropdown Toggle
        if (this.userProfileBtn && this.profileDropdownMenu) {
            this.userProfileBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                this.profileDropdownMenu.classList.toggle('open');
            });

            // Close dropdown when clicking outside
            document.addEventListener('click', (e) => {
                if (!this.userProfileBtn.contains(e.target)) {
                    this.profileDropdownMenu.classList.remove('open');
                }
            });
        }

        // Navigate to Profile from Dropdown
        if (this.btnNavProfile) {
            this.btnNavProfile.addEventListener('click', () => {
                this.switchView('profile');
                this.profileDropdownMenu.classList.remove('open');
            });
        }

        // Navigate to Orders Summary from Dropdown
        if (this.btnNavOrdersSummary) {
            this.btnNavOrdersSummary.addEventListener('click', () => {
                const navElement = document.querySelector('.nav-item[data-view="customer-orders"]');
                this.switchView('customer-orders', navElement);
                this.profileDropdownMenu.classList.remove('open');
            });
        }

        // Theme Toggle Logic
        if (this.btnThemeToggle) {
            const sunIcon = this.btnThemeToggle.querySelector('.sun-icon');
            const moonIcon = this.btnThemeToggle.querySelector('.moon-icon');
            
            // Initial render based on loaded script in head
            if (document.documentElement.getAttribute('data-theme') === 'light') {
                if(sunIcon) sunIcon.style.display = 'block';
                if(moonIcon) moonIcon.style.display = 'none';
            }

            this.btnThemeToggle.addEventListener('click', () => {
                const isLight = document.documentElement.getAttribute('data-theme') === 'light';
                if (isLight) {
                    document.documentElement.removeAttribute('data-theme');
                    localStorage.setItem('dashbuilder_theme', 'dark');
                    if(sunIcon) sunIcon.style.display = 'none';
                    if(moonIcon) moonIcon.style.display = 'block';
                } else {
                    document.documentElement.setAttribute('data-theme', 'light');
                    localStorage.setItem('dashbuilder_theme', 'light');
                    if(sunIcon) sunIcon.style.display = 'block';
                    if(moonIcon) moonIcon.style.display = 'none';
                }
            });
        }

        // Profile Update Forms
        if (this.formUpdateEmail) {
            this.formUpdateEmail.addEventListener('submit', (e) => this.handleUpdateEmail(e));
        }
        if (this.formUpdatePassword) {
            this.formUpdatePassword.addEventListener('submit', (e) => this.handleUpdatePassword(e));
        }
        if (this.formUpdateAvatar) {
            this.formUpdateAvatar.addEventListener('submit', (e) => this.handleUpdateAvatar(e));
        }

        // Set initial User Name
        if (this.userDisplayName) {
            try {
                const user = JSON.parse(localStorage.getItem('dashbuilder_user'));
                if (user && user.username) {
                    this.userDisplayName.textContent = user.username;
                }
            } catch (e) { }
        }
    }

    // --- Mobile Sidebar ---
    toggleMobileSidebar(forceState) {
        if (!this.appSidebar || !this.sidebarOverlay) return;
        
        if (forceState) {
            this.appSidebar.classList.add('open');
            this.sidebarOverlay.classList.add('active');
        } else {
            this.appSidebar.classList.remove('open');
            this.sidebarOverlay.classList.remove('active');
        }
    }

    // --- View Navigation ---
    switchView(viewId, navElement = null) {
        // Update Nav Active State if triggered from sidebar
        this.navItems.forEach(nav => nav.classList.remove('active'));
        if (navElement) {
            navElement.classList.add('active');
        }

        // Close Mobile Sidebar on navigation
        if (this.appSidebar && this.sidebarOverlay) {
            this.toggleMobileSidebar(false);
        }

        // Update Views Visibility
        this.views.forEach(view => view.classList.remove('view-active'));
        const targetView = document.getElementById(`view-${viewId}`);
        if(targetView) targetView.classList.add('view-active');

        // Reset Header & Buttons states initially 
        this.btnConfigDash.style.display = 'none';
        this.btnToggleSidebar.style.display = 'none';
        this.btnSaveDash.style.display = 'none';
        this.btnCreateOrderHeader.style.display = 'none';
        this.toggleWidgetSidebar(false);
        if(this.dashboardCanvas) this.dashboardCanvas.classList.remove('config-mode');

        // Specific View logic
        if (viewId === 'dashboard') {
            this.viewTitle.textContent = 'Dashboard';
            
            // Check if dashboard empty
            const widgets = store.getDashboardConfig();
            if (widgets.length === 0 && !this.dashboardCanvas.classList.contains('config-mode')) {
                this.dashboardEmptyState.style.display = 'flex';
                this.dashboardCanvas.style.display = 'none';
            } else {
                this.dashboardEmptyState.style.display = 'none';
                this.dashboardCanvas.style.display = 'grid';
                if (!this.dashboardCanvas.classList.contains('config-mode')) {
                    this.btnConfigDash.style.display = 'inline-flex';
                }
            }
        } else if (viewId === 'customer-orders') {
            this.viewTitle.textContent = 'Customer Orders';
            this.btnCreateOrderHeader.style.display = 'inline-flex';
            this.ordersCurrentPage = 1; // Reset on view nav
            if(this.ordersSearchInput) this.ordersSearchInput.value = '';
            if(this.ordersStatusFilter) this.ordersStatusFilter.value = 'All';
            this.updateOrdersView();
        } else if (viewId === 'profile') {
            this.viewTitle.textContent = 'My Profile';
            this.fetchAndRenderProfileDetails();
        }
    }

    // --- Dashboard Config Toggles ---
    toggleConfigMode(isActive) {
        if (isActive) {
            this.dashboardCanvas.classList.add('config-mode');
            this.btnConfigDash.style.display = 'none';
            if (this.btnToggleSidebar) this.btnToggleSidebar.style.display = 'inline-flex';
            this.btnSaveDash.style.display = 'inline-flex';
            this.toggleWidgetSidebar(true);
        } else {
            this.dashboardCanvas.classList.remove('config-mode');
            this.btnSaveDash.style.display = 'none';
            if (this.btnToggleSidebar) this.btnToggleSidebar.style.display = 'none';
            this.btnConfigDash.style.display = 'inline-flex';
            this.toggleWidgetSidebar(false);
        }
    }

    toggleWidgetSidebar(isOpen) {
        if (isOpen) {
            this.widgetSidebar.classList.add('open');
        } else {
            this.widgetSidebar.classList.remove('open');
        }
    }

    // --- Modals ---
    openModal(modalElement) {
        this.modalOverlay.classList.add('open');
        modalElement.classList.add('open');
    }

    closeAllModals() {
        this.modalOverlay.classList.remove('open');
        this.modalCreateOrder.classList.remove('open');
        this.modalConfigWidget.classList.remove('open');
        this.formCreateOrder.reset();
        this.formConfigWidget.reset();
        this.currentWidgetIdBeingEdited = null;
        this.dynamicWidgetConfig.innerHTML = '';
        
        // Remove error states
        document.querySelectorAll('.has-error').forEach(el => el.classList.remove('has-error'));
    }

    // --- Order Form Logic ---
    async handleOrderSubmit(e) {
        e.preventDefault();
        
        // Basic Validation
        let isValid = true;
        const requiredInputs = this.formCreateOrder.querySelectorAll('[required]');
        
        requiredInputs.forEach(input => {
            const group = input.closest('.form-group');
            if (!input.value.trim()) {
                isValid = false;
                if(group) group.classList.add('has-error');
            } else {
                if(group) group.classList.remove('has-error');
            }
        });

        if (!isValid) return;

        // Collect Form Data
        const formData = new FormData(this.formCreateOrder);
        const orderData = Object.fromEntries(formData.entries());
        // For disabled/readonly inputs like totalAmount, get it manually if missing
        if(!orderData.totalAmount) orderData.totalAmount = this.inputTotalAmt.value;
        
        // Save to store (Create or Edit)
        this.setButtonLoading(this.btnSubmitOrder, true);
        const editId = this.formCreateOrder.getAttribute('data-edit-id');
        
        try {
            if (editId) {
                await store.editCustomerOrder(editId, orderData);
                this.showToast('Customer order updated successfully!');
                this.formCreateOrder.removeAttribute('data-edit-id');
            } else {
                await store.addCustomerOrder(orderData);
                this.showToast('Customer order created successfully!');
            }
        } finally {
            this.setButtonLoading(this.btnSubmitOrder, false);
            this.closeAllModals();
            
            // Switch back to orders view if we aren't there and re-render
            if(!document.getElementById('view-customer-orders').classList.contains('view-active')) {
                 document.querySelector('[data-view="customer-orders"]').click();
            } else {
                 this.updateOrdersView();
            }
        }
    }

    // --- Loading State Helpers ---
    setButtonLoading(btn, isLoading) {
        if (!btn) return;
        if (isLoading) {
            btn.classList.add('is-loading');
            if(!btn.querySelector('.loading-spinner')) {
                const spinner = document.createElement('div');
                spinner.className = 'loading-spinner';
                btn.prepend(spinner);
            }
        } else {
            btn.classList.remove('is-loading');
            const spinner = btn.querySelector('.loading-spinner');
            if(spinner) spinner.remove();
        }
    }

    // --- Toast Notifications ---
    showToast(message, type = 'success') {
        if (!this.toastContainer) return;
        
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        
        const iconName = type === 'success' ? 'check-circle' : 'alert-circle';
        
        toast.innerHTML = `
            <div class="toast-icon">
                <i data-lucide="${iconName}"></i>
            </div>
            <div class="toast-message">${message}</div>
        `;
        
        this.toastContainer.appendChild(toast);
        if(window.lucide) window.lucide.createIcons({root: toast});
        
        // Trigger animation
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });
        
        // Remove after 3 seconds
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                if(toast.parentNode) toast.parentNode.removeChild(toast);
            }, 400); // match transition duration
        }, 3000);
    }

    // --- Orders Table Rendering & Pagination ---
    updateOrdersView() {
        if (!this.ordersTableBody || !this.ordersEmptyState) return;

        const allOrders = store.getCustomerOrders();
        let filtered = allOrders;

        // Apply filters
        if (this.ordersSearchInput && this.ordersStatusFilter) {
            const searchTerm = this.ordersSearchInput.value.toLowerCase();
            const statusFilter = this.ordersStatusFilter.value;

            filtered = allOrders.filter(order => {
                const nameMatch = `${order.firstName || ''} ${order.lastName || ''}`.toLowerCase().includes(searchTerm);
                const emailMatch = (order.emailId || '').toLowerCase().includes(searchTerm);
                const statusMatch = statusFilter === 'All' || order.status === statusFilter;
                
                return (nameMatch || emailMatch) && statusMatch;
            });
        }

        this.ordersFilteredData = filtered;
        const totalItems = filtered.length;
        if(this.pageTotalIdx) this.pageTotalIdx.textContent = totalItems;

        if (totalItems === 0) {
            if(this.ordersPaginationLayout) this.ordersPaginationLayout.style.display = 'none';
            this.renderOrdersTable([]);
            return;
        }

        // Pagination calculations
        const maxPage = Math.ceil(totalItems / this.ordersPerPage);
        if (this.ordersCurrentPage > maxPage) this.ordersCurrentPage = maxPage;
        if (this.ordersCurrentPage < 1) this.ordersCurrentPage = 1;

        const startIndex = (this.ordersCurrentPage - 1) * this.ordersPerPage;
        const endIndex = Math.min(startIndex + this.ordersPerPage, totalItems);

        if(this.pageStartIdx) this.pageStartIdx.textContent = startIndex + 1;
        if(this.pageEndIdx) this.pageEndIdx.textContent = endIndex;

        // Update Buttons
        if(this.btnPagePrev) this.btnPagePrev.disabled = this.ordersCurrentPage === 1;
        if(this.btnPageNext) this.btnPageNext.disabled = this.ordersCurrentPage === maxPage;

        // Render Page Numbers
        if (this.pageNumbersContainer) {
            this.pageNumbersContainer.innerHTML = '';
            for (let i = 1; i <= maxPage; i++) {
                const btn = document.createElement('button');
                btn.className = `btn btn-outline ${i === this.ordersCurrentPage ? 'active' : ''}`;
                btn.style.padding = '0.2rem 0.6rem';
                btn.style.minWidth = '32px';
                btn.style.fontSize = '0.85rem';
                btn.textContent = i;
                
                if (i === this.ordersCurrentPage) {
                    btn.style.background = 'var(--primary)';
                    btn.style.color = 'white';
                    btn.style.borderColor = 'var(--primary)';
                }
                
                btn.addEventListener('click', () => {
                    this.ordersCurrentPage = i;
                    this.updateOrdersView();
                });
                this.pageNumbersContainer.appendChild(btn);
            }
        }

        if(this.ordersPaginationLayout) this.ordersPaginationLayout.style.display = 'flex';

        // Slice data and render
        const paginatedData = filtered.slice(startIndex, endIndex);
        this.renderOrdersTable(paginatedData);
    }

    renderOrdersTable(ordersData) {
        if (!this.ordersTableBody || !this.ordersEmptyState || !this.ordersTable) return;

        const orders = ordersData || [];

        if (orders.length === 0) {
            this.ordersTable.style.display = 'none';
            this.ordersEmptyState.style.display = 'flex';
        } else {
            this.ordersTable.style.display = 'table';
            this.ordersEmptyState.style.display = 'none';
            
            this.ordersTableBody.innerHTML = '';
            
            // Generate rows
            orders.forEach(order => {
                const tr = document.createElement('tr');
                const fullName = `${order.firstName} ${order.lastName}`;
                
                let statusClass = 'status-pending';
                if(order.status === 'Completed') statusClass = 'status-completed';
                if(order.status === 'In progress') statusClass = 'status-progress';

                const formattedAmt = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.totalAmount || 0);
                const orderDateObj = order.createdAt ? new Date(order.createdAt) : new Date();

                tr.innerHTML = `
                    <td>${fullName}</td>
                    <td>${order.emailId}</td>
                    <td>${order.product}</td>
                    <td><span class="status-badge ${statusClass}">${order.status}</span></td>
                    <td>${formattedAmt}</td>
                    <td>${orderDateObj.toLocaleDateString()}</td>
                    <td>
                        <button class="btn-icon edit-order-btn" data-id="${order.id}" title="Edit Order" style="margin-right: -4px;">
                            <i data-lucide="edit"></i>
                        </button>
                        <button class="btn-icon delete-order-btn" data-id="${order.id}" title="Delete Order">
                            <i data-lucide="trash-2"></i>
                        </button>
                    </td>
                `;
                this.ordersTableBody.appendChild(tr);
            });
            // Re-init lucide icons for newly added buttons
            if(window.lucide) {
                window.lucide.createIcons();
            }
        }
    }

    // --- Dynamic Widget Config logic ---
    openWidgetSettings(widgetConfig) {
        this.currentWidgetIdBeingEdited = widgetConfig.id;
        
        let htmlSnippet = `
            <div class="form-section">
                <h3>Basic Settings</h3>
                <div class="form-grid two-cols">
                    <div class="form-group span-2">
                        <label>Widget Title <span class="required">*</span></label>
                        <input type="text" name="title" value="${widgetConfig.title}" required>
                         <span class="error-msg">Please fill the field</span>
                    </div>
                </div>
            </div>
            <div class="form-section">
                <h3>Dimensions (1-12 columns)</h3>
                <div class="form-grid two-cols">
                    <div class="form-group">
                        <label>Width <span class="required">*</span></label>
                        <input type="number" name="width" min="1" max="12" value="${widgetConfig.width}" required>
                    </div>
                    <div class="form-group">
                        <label>Height <span class="required">*</span></label>
                        <input type="number" name="height" min="1" value="${widgetConfig.height}" required>
                    </div>
                </div>
            </div>
        `;

        const s = widgetConfig.settings || {};

        if (widgetConfig.type === 'kpi') {
            htmlSnippet += `
                <div class="form-section">
                    <h3>KPI Data Settings</h3>
                    <div class="form-grid two-cols">
                        <div class="form-group">
                            <label>Select Metric</label>
                            <select name="metric">
                                <option value="Total amount" ${s.metric === 'Total amount' ? 'selected' : ''}>Total amount</option>
                                <option value="Quantity" ${s.metric === 'Quantity' ? 'selected' : ''}>Quantity</option>
                                <option value="Unit price" ${s.metric === 'Unit price' ? 'selected' : ''}>Unit price</option>
                                <option value="Orders" ${s.metric === 'Orders' ? 'selected' : ''}>Count of Orders</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Aggregation</label>
                            <select name="aggregation">
                                <option value="Sum" ${s.aggregation === 'Sum' ? 'selected' : ''}>Sum</option>
                                <option value="Average" ${s.aggregation === 'Average' ? 'selected' : ''}>Average</option>
                                <option value="Count" ${s.aggregation === 'Count' ? 'selected' : ''}>Count</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Data format</label>
                            <select name="format">
                                <option value="Number" ${s.format === 'Number' ? 'selected' : ''}>Number</option>
                                <option value="Currency" ${s.format === 'Currency' ? 'selected' : ''}>Currency</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Decimal Precision</label>
                            <input type="number" name="precision" min="0" value="${s.precision !== undefined ? s.precision : 0}">
                        </div>
                         <div class="form-group span-2">
                            <label>Description</label>
                            <textarea name="description">${widgetConfig.description || ''}</textarea>
                        </div>
                    </div>
                </div>
            `;
        } else if (widgetConfig.type === 'chart') {
            
            if (widgetConfig.subtype === 'pie') {
               htmlSnippet += `
                    <div class="form-section">
                        <h3>Pie Chart Settings</h3>
                        <div class="form-grid two-cols">
                            <div class="form-group">
                                <label>Choose chart segmentation</label>
                                <select name="chartData">
                                    <option value="Product" ${s.chartData === 'Product' ? 'selected' : ''}>Product</option>
                                    <option value="Status" ${s.chartData === 'Status' ? 'selected' : ''}>Status</option>
                                    <option value="Created by" ${s.chartData === 'Created by' ? 'selected' : ''}>Created by</option>
                                    <option value="Country" ${s.chartData === 'Country' ? 'selected' : ''}>Country</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label style="display: flex; align-items: center; gap: 0.5rem; height: 100%;">
                                    <input type="checkbox" name="showLegend" style="width: auto;" ${s.showLegend !== false ? 'checked' : ''}> Show legend
                                </label>
                            </div>
                        </div>
                    </div>
               `;
            } else {
                htmlSnippet += `
                    <div class="form-section">
                        <h3>Data Selection</h3>
                        <div class="form-grid two-cols">
                            <div class="form-group">
                                <label>X-Axis (Category)</label>
                                <select name="xAxis">
                                    <option value="Product" ${s.xAxis === 'Product' ? 'selected' : ''}>Product</option>
                                    <option value="Order date" ${s.xAxis === 'Order date' ? 'selected' : ''}>Order date</option>
                                    <option value="Status" ${s.xAxis === 'Status' ? 'selected' : ''}>Status</option>
                                    <option value="Created by" ${s.xAxis === 'Created by' ? 'selected' : ''}>Created by</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Y-Axis (Metrics)</label>
                                <select name="yAxis">
                                    <option value="Total amount" ${s.yAxis === 'Total amount' ? 'selected' : ''}>Total amount</option>
                                    <option value="Quantity" ${s.yAxis === 'Quantity' ? 'selected' : ''}>Quantity</option>
                                    <option value="Unit price" ${s.yAxis === 'Unit price' ? 'selected' : ''}>Unit price</option>
                                </select>
                            </div>
                            <div class="form-group">
                                <label>Chart Color</label>
                                <input type="color" name="color" value="${s.color || '#1a75ff'}" style="height: 40px; padding: 2px;">
                            </div>
                        </div>
                    </div>
                `;
            }

        } else if (widgetConfig.type === 'table') {
             htmlSnippet += `
                <div class="form-section">
                    <h3>Table Settings</h3>
                    <div class="form-grid two-cols">
                         <div class="form-group">
                            <label>Sort By</label>
                            <select name="sortBy">
                                <option value="Order date" ${s.sortBy === 'Order date' ? 'selected' : ''}>Order date</option>
                                <option value="Total amount" ${s.sortBy === 'Total amount' ? 'selected' : ''}>Total amount</option>
                                <option value="Customer name" ${s.sortBy === 'Customer name' ? 'selected' : ''}>Customer name</option>
                                <option value="Status" ${s.sortBy === 'Status' ? 'selected' : ''}>Status</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Direction</label>
                            <select name="sortDir">
                                <option value="Descending" ${s.sortDir === 'Descending' ? 'selected' : ''}>Descending</option>
                                <option value="Ascending" ${s.sortDir === 'Ascending' ? 'selected' : ''}>Ascending</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Pagination (Limit)</label>
                            <select name="pagination">
                                <option value="5" ${s.pagination === '5' ? 'selected' : ''}>5 Rows</option>
                                <option value="10" ${s.pagination === '10' ? 'selected' : ''}>10 Rows</option>
                                <option value="15" ${s.pagination === '15' ? 'selected' : ''}>15 Rows</option>
                            </select>
                        </div>
                         <div class="form-group">
                            <label>Header Background</label>
                            <input type="color" name="headerBg" value="${s.headerBg || '#54bd95'}" style="height: 40px; padding: 2px;">
                        </div>
                    </div>
                </div>
            `;
        }

        this.dynamicWidgetConfig.innerHTML = htmlSnippet;
        this.openModal(this.modalConfigWidget);
    }

    handleWidgetConfigSubmit() {
        const formData = new FormData(this.formConfigWidget);
        const data = Object.fromEntries(formData.entries());
        
        // Basic validation
        if(!data.title) {
            this.formConfigWidget.querySelector('[name="title"]').closest('.form-group').classList.add('has-error');
            return;
        }
        
        if (this.currentWidgetIdBeingEdited) {
            
            // Map flat form data back to nested widget config structure
            const currentWidget = store.getDashboardConfig().find(w => w.id === this.currentWidgetIdBeingEdited);
            
            const updates = {
                title: data.title,
                width: parseInt(data.width, 10),
                height: parseInt(data.height, 10),
                description: data.description || '',
                settings: { ...currentWidget.settings }
            };

            // Remove top-level picked props from remaining data to stuff into settings object
            delete data.title;
            delete data.width;
            delete data.height;
            delete data.description;

            // Handle checkbox for showLegend not showing up in FormData if false
            if (currentWidget.subtype === 'pie') {
                data.showLegend = this.formConfigWidget.querySelector('input[name="showLegend"]')?.checked;
            }

            updates.settings = { ...updates.settings, ...data };

            store.updateWidget(this.currentWidgetIdBeingEdited, updates);
        }
        
        this.closeAllModals();
    }

    // --- Profile Management Logic ---
    async fetchAndRenderProfileDetails() {
        const token = localStorage.getItem('dashbuilder_token');
        if (!token) return;

        try {
            const res = await fetch('/api/auth/me', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();

            if (res.ok) {
                if(this.profileDisplayUsername) this.profileDisplayUsername.textContent = data.username;
                if(this.profileDisplayUsernameInfo) this.profileDisplayUsernameInfo.textContent = data.username;
                if(this.profileDisplayEmail) this.profileDisplayEmail.textContent = data.email;
                if(this.profileDisplayPassword) this.profileDisplayPassword.textContent = data.passwordHint || '********';
                
                if (data.avatarUrl) {
                    if (this.headerAvatarImg) {
                        this.headerAvatarImg.src = data.avatarUrl;
                        this.headerAvatarImg.style.display = 'block';
                    }
                    if (this.headerAvatarIcon) this.headerAvatarIcon.style.display = 'none';
                    
                    if (this.profilePageAvatarImg) {
                        this.profilePageAvatarImg.src = data.avatarUrl;
                        this.profilePageAvatarImg.style.display = 'block';
                    }
                    if (this.profilePageAvatarIcon) this.profilePageAvatarIcon.style.display = 'none';
                    if (this.updateAvatarUrlInput) this.updateAvatarUrlInput.value = data.avatarUrl;
                } else {
                    if (this.headerAvatarImg) this.headerAvatarImg.style.display = 'none';
                    if (this.headerAvatarIcon) this.headerAvatarIcon.style.display = 'block';
                    
                    if (this.profilePageAvatarImg) this.profilePageAvatarImg.style.display = 'none';
                    if (this.profilePageAvatarIcon) this.profilePageAvatarIcon.style.display = 'flex';
                    if (this.updateAvatarUrlInput) this.updateAvatarUrlInput.value = '';
                }
            } else {
                this.showToast(data.message || 'Failed to load profile', 'error');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            this.showToast('Server error while loading profile details.', 'error');
        }
    }

    async handleUpdateEmail(e) {
        e.preventDefault();
        const newEmailInput = document.getElementById('update-email');
        const newEmail = newEmailInput.value;
        const token = localStorage.getItem('dashbuilder_token');
        const submitBtn = this.formUpdateEmail.querySelector('button[type="submit"]');

        this.setButtonLoading(submitBtn, true);

        try {
            const res = await fetch('/api/auth/email', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ newEmail })
            });
            const data = await res.json();

            if (res.ok) {
                this.showToast('Email updated successfully!');
                newEmailInput.value = '';
                this.fetchAndRenderProfileDetails(); // Refresh view
                
                // Update local storage cache
                const userCache = JSON.parse(localStorage.getItem('dashbuilder_user')) || {};
                userCache.email = data.user.email;
                localStorage.setItem('dashbuilder_user', JSON.stringify(userCache));
                
            } else {
                this.showToast(data.message || 'Failed to update email', 'error');
            }
        } catch (err) {
            this.showToast('Server error. Could not update email.', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    async handleUpdatePassword(e) {
        e.preventDefault();
        const currentPasswordInput = document.getElementById('current-password');
        const newPasswordInput = document.getElementById('new-password');
        const token = localStorage.getItem('dashbuilder_token');
        const submitBtn = this.formUpdatePassword.querySelector('button[type="submit"]');

        this.setButtonLoading(submitBtn, true);

        try {
            const res = await fetch('/api/auth/password', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ 
                    currentPassword: currentPasswordInput.value,
                    newPassword: newPasswordInput.value
                })
            });
            const data = await res.json();

            if (res.ok) {
                this.showToast('Password updated successfully!');
                currentPasswordInput.value = '';
                newPasswordInput.value = '';
                this.fetchAndRenderProfileDetails(); // Refresh view to show new hint
            } else {
                this.showToast(data.message || 'Failed to update password', 'error');
            }
        } catch (err) {
            this.showToast('Server error. Could not update password.', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }

    async handleUpdateAvatar(e) {
        e.preventDefault();
        const avatarUrl = this.updateAvatarUrlInput.value.trim();
        const token = localStorage.getItem('dashbuilder_token');
        const submitBtn = this.formUpdateAvatar.querySelector('button[type="submit"]');

        this.setButtonLoading(submitBtn, true);

        try {
            const res = await fetch('/api/auth/avatar', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ avatarUrl })
            });
            const data = await res.json();

            if (res.ok) {
                this.showToast('Avatar updated successfully!');
                this.fetchAndRenderProfileDetails(); // Refresh view to show new avatar
            } else {
                this.showToast(data.message || 'Failed to update avatar', 'error');
            }
        } catch (err) {
            this.showToast('Server error. Could not update avatar.', 'error');
        } finally {
            this.setButtonLoading(submitBtn, false);
        }
    }
}

export const ui = new UIController();
