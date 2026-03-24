export const KPICard = ({ title, value, iconClass, trend }) => {
    return `
        <div class="bg-white p-5 rounded-2xl shadow-sm border border-secondary-100 flex flex-col gap-3 hover:shadow-md transition-all">
            <div class="flex items-center justify-between">
                <span class="text-xs font-semibold text-secondary-500 uppercase tracking-wider">${title}</span>
                <div class="p-2 bg-primary-50 text-primary-500 rounded-xl">
                    <i class="ph-duotone ${iconClass} text-xl"></i>
                </div>
            </div>
            
            <div class="flex items-end justify-between">
                <h3 class="text-2xl font-black text-secondary-900">${value}</h3>
                ${trend ? `
                    <span class="text-xs font-bold px-2 py-1 rounded-lg ${
                        trend.isPositive ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                    }">
                        ${trend.isPositive ? '+' : ''}${trend.value}
                    </span>
                ` : ''}
            </div>
        </div>
    `;
};
