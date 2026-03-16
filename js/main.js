import { store } from './store.js';
import { ui } from './ui.js';
import { DragDropEngine } from './drag-drop.js';

let dragDrop;

// --- Initialization ---
document.addEventListener('DOMContentLoaded', async () => {
    // 1. Initialize view (Dashboard empty state will show by default if no data)
    ui.switchView('dashboard', document.querySelector('[data-view="dashboard"]'));
    
    // 2. Load async data from MongoDB via Store API
    await store.loadInitialData();
    ui.fetchAndRenderProfileDetails(); // Ensures header avatar loads immediately

    // 3. Initialize Drag & Drop functionality
    const canvasNode = document.getElementById('dashboard-canvas');
    dragDrop = new DragDropEngine(canvasNode);

    // 4. Initial Render
    renderDashboard();
    
    // 5. Subscribe to Store Changes
    store.subscribe(() => {
        renderDashboard();
        // If we are on orders view, also update the table
        if (document.getElementById('view-customer-orders').classList.contains('view-active')) {
             ui.renderOrdersTable(store.getCustomerOrders());
        }
    });

    // 6. Init global icons
    if (window.lucide) {
        window.lucide.createIcons();
    }
});

/**
 * Renders the dashboard based on the current store state.
 * This function is called on initial load and whenever the store state changes.
 */
function renderDashboard() {
    const dashboardConfig = store.getDashboardConfig();
    const canvasNode = document.getElementById('dashboard-canvas');

    // 1. Render Grid Canvas and Widgets
    dragDrop.renderCanvas(
        dashboardConfig, 
        (widgetConfig) => ui.openWidgetSettings(widgetConfig), // onSettingsClick
        (id) => {                                              // onDeleteClick
            if (confirm('Are you sure you want to delete this widget?')) {
                store.removeWidget(id);
            }
        }
    );

    // 2. Manage Empty States on Dashboard
    const isConfigMode = canvasNode.classList.contains('config-mode');
    if (dashboardConfig.length === 0 && !isConfigMode && document.getElementById('view-dashboard').classList.contains('view-active')) {
        ui.dashboardEmptyState.style.display = 'flex';
        canvasNode.style.display = 'none';
        ui.btnConfigDash.style.display = 'none';
    } else {
        ui.dashboardEmptyState.style.display = 'none';
        canvasNode.style.display = 'grid';
        if (!isConfigMode && document.getElementById('view-dashboard').classList.contains('view-active')) {
            ui.btnConfigDash.style.display = 'inline-flex';
        }
    }
}
