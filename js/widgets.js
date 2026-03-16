import { store } from './store.js';

/**
 * Widget Rendering and Data Aggregation Module
 */

// Helper to format currency
const formatCurrency = (value) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
// Helper to truncate long text
const truncateText = (text, maxLength) => text.length > maxLength ? text.substring(0, maxLength) + '...' : text;

// Registry to keep track of chart instances so we can destroy them before re-rendering
const chartInstances = {};

export const renderWidget = (widgetConfig, containerNode) => {
    containerNode.innerHTML = ''; // Clear existing content

    const widgetBody = document.createElement('div');
    widgetBody.className = `widget-body widget-${widgetConfig.type}`;

    switch (widgetConfig.type) {
        case 'kpi':
            renderKPI(widgetConfig, widgetBody);
            break;
        case 'chart':
            renderChart(widgetConfig, widgetBody);
            break;
        case 'table':
            renderTable(widgetConfig, widgetBody);
            break;
        default:
            widgetBody.innerHTML = '<p>Unknown widget type</p>';
    }

    containerNode.appendChild(widgetBody);
};

// --- KPI Rendering ---

const renderKPI = (config, container) => {
    const orders = store.getCustomerOrders();
    const metric = config.settings?.metric || 'Total amount';
    const aggregation = config.settings?.aggregation || 'Sum';
    const format = config.settings?.format || 'Number';
    const precision = parseInt(config.settings?.precision || 0, 10);

    let val = 0;

    // Determine field mapping
    const fieldMap = {
        'Total amount': 'totalAmount',
        'Quantity': 'quantity',
        'Unit price': 'unitPrice'
    };
    const fieldKey = fieldMap[metric] || 'totalAmount';

    if (orders.length > 0) {
        const values = orders.map(o => parseFloat(o[fieldKey]) || 0);

        if (aggregation === 'Sum') {
            val = values.reduce((a, b) => a + b, 0);
        } else if (aggregation === 'Average') {
            val = values.reduce((a, b) => a + b, 0) / values.length;
        } else if (aggregation === 'Count') {
            val = values.length;
        }
    }

    // Formatting
    let displayValue = val.toFixed(precision);
    if (format === 'Currency') {
        // use standard formatter with specific fraction digits
        displayValue = new Intl.NumberFormat('en-US', { 
            style: 'currency', 
            currency: 'USD',
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
        }).format(val);
    } else {
         displayValue = new Intl.NumberFormat('en-US', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision
        }).format(val);
    }

    container.innerHTML = `
        <div class="kpi-value">${displayValue}</div>
        <div class="kpi-desc">${config.description || ''}</div>
    `;
};


// --- Chart Rendering ---

const renderChart = (config, container) => {
    const orders = store.getCustomerOrders();
    
    // Default Settings
    const xAxisLabel = config.settings?.xAxis || 'Product';
    const yAxisLabel = config.settings?.yAxis || 'Total amount';
    const color = config.settings?.color || '#1a75ff';
    const showLabel = config.settings?.showLabel || false;
    const showLegend = config.settings?.showLegend !== false; // Default true for pie
    const pieChartData = config.settings?.chartData || 'Product';

    // Data Aggregation logic for charts
    // Group by X axis, aggregate Y Axis (Sum)
    
    // Map UI labels to data model keys
    const fieldMap = {
        'Product': 'product',
        'Quantity': 'quantity',
        'Unit price': 'unitPrice',
        'Total amount': 'totalAmount',
        'Status': 'status',
        'Created by': 'createdBy',
        'Order date': 'createdAt' // roughly Mapping duration/date
    };

    let labels = [];
    let dataValues = [];

    if (config.subtype === 'pie') {
        // Pie Chart Aggregation (Count occurrences or sum total amount based on 'choose chart data')
         const groupField = fieldMap[pieChartData] || 'product';
         const aggregated = orders.reduce((acc, order) => {
            const key = order[groupField] || 'Unknown';
            acc[key] = (acc[key] || 0) + 1; // Default to Count for pie if not numeric, ideally we'd let them pick, but rules say 'refer to data'
            return acc;
         }, {});

         labels = Object.keys(aggregated);
         dataValues = Object.values(aggregated);

    } else {
        // Bar, Line, Area, Scatter
        const xField = fieldMap[xAxisLabel] || 'product';
        const yField = fieldMap[yAxisLabel] || 'totalAmount';

        const aggregated = orders.reduce((acc, order) => {
            let key = order[xField] || 'Unknown';
            if(xField === 'createdAt') {
                key = new Date(key).toLocaleDateString();
            }
            
            const val = parseFloat(order[yField]) || 0;
            
            if (!acc[key]) acc[key] = 0;
            acc[key] += val;
            return acc;
        }, {});

        labels = Object.keys(aggregated);
        dataValues = Object.values(aggregated);
    }

    // Chart.js Canvas creation
    const wrapper = document.createElement('div');
    wrapper.className = 'chart-wrapper';
    const canvas = document.createElement('canvas');
    wrapper.appendChild(canvas);
    container.appendChild(wrapper);

    // Destroy existing chart if re-rendering in same container (not strictly needed since we recreate canvas, but good practice)
    if (chartInstances[config.id]) {
        chartInstances[config.id].destroy();
    }

    // Define Chart config
    let chartType = config.subtype === 'area' ? 'line' : config.subtype;
    let fillArea = config.subtype === 'area';

    const chartConfig = {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: config.subtype === 'pie' ? pieChartData : yAxisLabel,
                data: dataValues,
                backgroundColor: config.subtype === 'pie' ? generateColors(labels.length) : color + '80', // 50% opacity for bar/area
                borderColor: config.subtype === 'pie' ? '#fff' : color,
                borderWidth: 1,
                fill: fillArea,
                tension: 0.4 // Smooth curves for line/area
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: config.subtype === 'pie' ? showLegend : false,
                    position: 'bottom'
                },
                datalabels: {
                    // Requires chartjs-plugin-datalabels if we wanted actual text labels on bars, 
                    // for now we'll just toggle tooltips or basic display
                }
            }
        }
    };

    if (config.subtype !== 'pie') {
        chartConfig.options.scales = {
            y: { beginAtZero: true }
        };
    }

    // Instantiate Chart
    chartInstances[config.id] = new Chart(canvas, chartConfig);
};

// Helper for Pie Chart colors
const generateColors = (count) => {
    const baseColors = ['#1a75ff', '#6e56cf', '#10b981', '#f59e0b', '#ef4444', '#0ea5e9', '#ec4899'];
    let colors = [];
    for(let i = 0; i < count; i++) {
        colors.push(baseColors[i % baseColors.length]);
    }
    return colors;
};

// --- Table Rendering ---

const renderTable = (config, container) => {
    const orders = store.getCustomerOrders();
    
    // Default Settings
    const columns = config.settings?.columns || ['Customer name', 'Product', 'Total amount', 'Status'];
    const sortBy = config.settings?.sortBy || 'Order date';
    const sortDir = config.settings?.sortDir || 'Descending';
    const limit = parseInt(config.settings?.pagination || 5, 10);
    const fontSize = config.settings?.fontSize || 14;
    const headerBg = config.settings?.headerBackground || '#54bd95';

    // Field mapping
    const fieldMap = {
        'Customer ID': 'id',
        'Customer name': o => `${o.firstName} ${o.lastName}`,
        'Email id': 'emailId',
        'Phone number': 'phoneNumber',
        'Address': o => `${o.streetAddress}, ${o.city}`,
        'Order ID': 'id',
        'Order date': 'createdAt',
        'Product': 'product',
        'Quantity': 'quantity',
        'Unit price': 'unitPrice',
        'Total amount': 'totalAmount',
        'Status': 'status',
        'Created by': 'createdBy'
    };

    // Sorting
    let sortedOrders = [...orders];
    const sortField = fieldMap[sortBy] || 'createdAt';
    
    sortedOrders.sort((a, b) => {
        let valA = typeof sortField === 'function' ? sortField(a) : a[sortField];
        let valB = typeof sortField === 'function' ? sortField(b) : b[sortField];
        
        // Handle dates specificially if sortby is order date
        if (sortBy === 'Order date') {
            valA = new Date(valA).getTime();
            valB = new Date(valB).getTime();
        }

        if (valA < valB) return sortDir === 'Ascending' ? -1 : 1;
        if (valA > valB) return sortDir === 'Ascending' ? 1 : -1;
        return 0;
    });

    // Pagination (Frontend only slice)
    const paginatedOrders = sortedOrders.slice(0, limit);

    // Build Table HTML
    let tableHTML = `<table class="data-table" style="font-size: ${fontSize}px;">`;
    
    // Thead
    tableHTML += `<thead><tr>`;
    columns.forEach(col => {
        tableHTML += `<th style="background-color: ${headerBg}; color: #fff;">${col}</th>`;
    });
    tableHTML += `</tr></thead><tbody>`;

    // Tbody
    if (paginatedOrders.length === 0) {
        tableHTML += `<tr><td colspan="${columns.length}" style="text-align: center;">No data available</td></tr>`;
    } else {
        paginatedOrders.forEach(order => {
            tableHTML += `<tr>`;
            columns.forEach(col => {
                const mapper = fieldMap[col];
                let val = typeof mapper === 'function' ? mapper(order) : order[mapper];
                
                // Formatting tweaks
                if (col === 'Total amount' || col === 'Unit price') {
                    val = formatCurrency(val);
                } else if (col === 'Order date') {
                    val = new Date(val).toLocaleDateString();
                } else if (col === 'Status') {
                    const statusClass = val === 'Completed' ? 'status-completed' : 
                                      (val === 'In progress' ? 'status-progress' : 'status-pending');
                    val = `<span class="status-badge ${statusClass}">${val}</span>`;
                }

                tableHTML += `<td>${val || '-'}</td>`;
            });
            tableHTML += `</tr>`;
        });
    }

    tableHTML += `</tbody></table>`;
    container.innerHTML = tableHTML;
};
