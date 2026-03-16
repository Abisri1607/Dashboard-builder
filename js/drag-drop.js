import { store } from './store.js';
import { renderWidget } from './widgets.js';

/**
 * HTML5 Drag and Drop and Layout Engine Module
 */
export class DragDropEngine {
    constructor(canvasNode) {
        this.canvas = canvasNode;
        this.draggedItemType = null;
        this.draggedItemSubtype = null;
        this.placeholder = null;
        
        this.initSidebarListeners();
        this.initCanvasListeners();
    }

    // --- Sidebar Draggables ---
    initSidebarListeners() {
        const draggables = document.querySelectorAll('.draggable');
        
        draggables.forEach(draggable => {
            draggable.addEventListener('dragstart', (e) => {
                this.draggedItemType = e.target.dataset.type;
                this.draggedItemSubtype = e.target.dataset.subtype;
                
                // Visual feedback
                e.target.classList.add('widget-dragging');
                
                // Required for Firefox
                e.dataTransfer.setData('text/plain', this.draggedItemType);
                e.dataTransfer.effectAllowed = 'copy';
                
                this.createPlaceholder();
            });

            draggable.addEventListener('dragend', (e) => {
                e.target.classList.remove('widget-dragging');
                this.removePlaceholder();
                this.draggedItemType = null;
                this.draggedItemSubtype = null;
                
                // Clear drag over styles from canvas
                this.canvas.classList.remove('canvas-drag-over');
            });
        });
    }

    // --- Canvas Drop Zone ---
    initCanvasListeners() {
        this.canvas.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessary to allow dropping
            e.dataTransfer.dropEffect = 'copy';
            this.canvas.classList.add('canvas-drag-over');
            
            // Determine position for placeholder (simplified append for now)
            if (this.placeholder && e.target === this.canvas) {
                this.canvas.appendChild(this.placeholder);
            }
        });

        this.canvas.addEventListener('dragleave', (e) => {
            // Only remove style if leaving the canvas entirely, not entering a child
            if (e.target === this.canvas) {
                this.canvas.classList.remove('canvas-drag-over');
            }
        });

        this.canvas.addEventListener('drop', (e) => {
            e.preventDefault();
            this.canvas.classList.remove('canvas-drag-over');
            
            if (!this.draggedItemType) return;

            // Define default widget config based on rules
            let defaultWidth = 4;
            let defaultHeight = 4;
            let defaultTitle = 'Untitled';

            if (this.draggedItemType === 'kpi') {
                defaultWidth = 2;
                defaultHeight = 2;
            } else if (this.draggedItemType === 'chart') {
                if (this.draggedItemSubtype === 'pie') {
                    defaultWidth = 4;
                    defaultHeight = 4;
                } else {
                    defaultWidth = 5;
                    defaultHeight = 5;
                }
            }

            const newWidgetConfig = {
                type: this.draggedItemType,
                subtype: this.draggedItemSubtype,
                title: defaultTitle,
                width: defaultWidth,
                height: defaultHeight,
                description: '',
                settings: {} // Used by the Settings Modal later
            };

            // Add to store
            store.addWidget(newWidgetConfig);
        });
    }

    // --- Grid Layout Engine & Rendering ---
    
    // We recreate the entire grid on store update for simplicity
    renderCanvas(widgets, onSettingsClick, onDeleteClick) {
        this.canvas.innerHTML = ''; // Start fresh

        if (widgets.length === 0) {
           return;
        }

        widgets.forEach(widgetConfig => {
            const widgetEl = document.createElement('div');
            widgetEl.className = 'dashboard-widget';
            widgetEl.id = `widget-node-${widgetConfig.id}`;
            
            // Apply Grid Rules responsively (Desktop 12, Tablet 8, Mobile 4 handling)
            // The CSS Grid automatically flows items. We use CSS variables to allow CSS to cap the maximum span on smaller screens.
            widgetEl.style.setProperty('--widget-width', widgetConfig.width);
            widgetEl.style.setProperty('--widget-height', widgetConfig.height);
            
            // At smaller breakpoints, if span is larger than total columns, CSS grid will shrink it automatically if min/max boundaries are set,
            // but for absolute adherence to the rules (e.g. max col is 8 on tablet), we handle that via media query CSS overrides 
            // instead of inline JS styles to keep JS clean. (See layout.css variables)

            // Header
            const header = document.createElement('div');
            header.className = 'widget-header';
            
            const title = document.createElement('h3');
            title.className = 'widget-title';
            title.textContent = widgetConfig.title;
            
            const actions = document.createElement('div');
            actions.className = 'widget-actions';
            
            const btnSettings = document.createElement('button');
            btnSettings.className = 'widget-action-btn settings';
            btnSettings.innerHTML = '<i data-lucide="settings"></i>';
            btnSettings.onclick = () => onSettingsClick(widgetConfig);
            
            const btnDelete = document.createElement('button');
            btnDelete.className = 'widget-action-btn delete';
            btnDelete.innerHTML = '<i data-lucide="trash-2"></i>';
            btnDelete.onclick = () => onDeleteClick(widgetConfig.id);
            
            actions.appendChild(btnSettings);
            actions.appendChild(btnDelete);
            
            header.appendChild(title);
            header.appendChild(actions);
            widgetEl.appendChild(header);

            // Container for inner content which will be rendered by widgets.js
            const contentContainer = document.createElement('div');
            contentContainer.className = 'widget-content-wrapper';
            contentContainer.style.height = '100%'; 
            contentContainer.style.width = '100%';
            contentContainer.style.display = 'flex';
            contentContainer.style.flexDirection = 'column';
            contentContainer.style.flexGrow = '1';
            
            widgetEl.appendChild(contentContainer);
            this.canvas.appendChild(widgetEl);

            // Trigger specific rendering with data aggregation
            renderWidget(widgetConfig, contentContainer);
        });

        // Re-init lucide icons for newly added buttons
        if(window.lucide) {
           window.lucide.createIcons();
        }
    }

    // --- Placeholders ---
    createPlaceholder() {
        this.placeholder = document.createElement('div');
        this.placeholder.className = 'drag-placeholder';
        
        // Match default size estimate
        let w = 4; let h = 4;
        if(this.draggedItemType === 'kpi') w = 2, h = 2;
        if(this.draggedItemType === 'chart' && this.draggedItemSubtype !== 'pie') w = 5, h = 5;
        
        this.placeholder.style.setProperty('--widget-width', w);
        this.placeholder.style.setProperty('--widget-height', h);
    }

    removePlaceholder() {
        if (this.placeholder && this.placeholder.parentNode) {
            this.placeholder.parentNode.removeChild(this.placeholder);
        }
        this.placeholder = null;
    }
}
