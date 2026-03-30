// Initialize App Controllers on Load
document.addEventListener('DOMContentLoaded', () => {
    // 1. Core / Auth Init
    if (window.appControllers) window.appControllers.init();

    // 2. Feature Trackers
    if (window.dashboardController && window.dashboardController.init) window.dashboardController.init();
    if (window.cronogramaController) window.cronogramaController.init();
    if (window.cadastrosController) window.cadastrosController.init();
    if (window.pomodoroController) window.pomodoroController.init();
    if (window.materialController) window.materialController.init();
    if (window.editaisController) window.editaisController.init();
    if (window.adminController) window.adminController.init();
    if (window.linksController) window.linksController.init();
    
    // Initial global state update
    if (window.appControllers) {
        window.appControllers.updateDashboard();
        window.appControllers.startCountdownTimer();
    }
});
