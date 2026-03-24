// js/logic/chartConfig.js
export const registerCharts = () => {
    // In the CDN version (script tag), Chart is already registered with all modules.
    // We just set the defaults here.
    if (typeof Chart !== 'undefined') {
        Chart.defaults.font.family = "'Inter', sans-serif";
        Chart.defaults.color = '#64748b';
        Chart.defaults.plugins.tooltip.backgroundColor = '#1e293b';
        Chart.defaults.plugins.tooltip.padding = 12;
        Chart.defaults.plugins.tooltip.cornerRadius = 8;
    }
};
