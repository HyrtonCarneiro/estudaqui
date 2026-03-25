// Initialize App Controllers on Load
document.addEventListener('DOMContentLoaded', () => {
    // 1. Core / Auth Init
    if (window.appControllers) window.appControllers.init();

    // 2. Feature Trackers
    if (window.cronogramaController) window.cronogramaController.init();
    if (window.cadastrosController) window.cadastrosController.init();
    if (window.pomodoroController) window.pomodoroController.init();
    if (window.materialController) window.materialController.init();
    if (window.simuladosController) window.simuladosController.init();
    if (window.editaisController) window.editaisController.init();
    
    // Initial global state update
    if (window.appControllers) {
        window.appControllers.updateDashboard();
        window.appControllers.startCountdownTimer();
    }
});
