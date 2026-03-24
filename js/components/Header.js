export const Header = ({ projectTitle, userName }) => {
    return `
        <header class="h-16 w-full bg-white border-b border-secondary-100 px-6 flex items-center justify-between shadow-sm z-10 sticky top-0">
            <div class="flex items-center gap-4">
                <h2 class="text-lg font-bold text-secondary-800">${projectTitle}</h2>
            </div>

            <div class="flex items-center gap-4">
                <div class="hidden md:flex items-center bg-secondary-50 border border-secondary-100 rounded-xl px-3 py-1.5 focus-within:ring-2 focus-within:ring-primary-100 transition-all">
                    <i class="ph ph-magnifying-glass text-secondary-400 text-lg"></i>
                    <input 
                        type="text" 
                        placeholder="Buscar..." 
                        class="bg-transparent border-none outline-none text-sm px-2 text-secondary-600 w-48"
                    />
                </div>

                <button class="p-2 text-secondary-500 hover:bg-secondary-50 rounded-xl transition-all relative">
                    <i class="ph-duotone ph-bell text-xl"></i>
                    <span class="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                </button>

                <button class="flex items-center gap-3 p-1 pl-3 hover:bg-secondary-50 rounded-xl transition-all">
                    <span class="text-sm font-medium text-secondary-700 hidden sm:inline">${userName}</span>
                    <div class="w-9 h-9 bg-primary-100 text-primary-600 flex items-center justify-center rounded-xl font-bold border border-primary-200 uppercase">
                        ${userName.charAt(0)}
                    </div>
                    <i class="ph ph-caret-down text-secondary-400 text-xs"></i>
                </button>
            </div>
        </header>
    `;
};
