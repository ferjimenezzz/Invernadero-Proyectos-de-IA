<?php
/**
 * ============================================================================
 * ARCHIVO: includes/footer.php
 * PROPÓSITO: Cierre del documento HTML, inicialización de iconos SVG interactivos
 *            y scripts compartidos para notificaciones tipo Toast y navegación.
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ============================================================================
 */
?>

<!-- Contenedor Flotante para Notificaciones del Sistema (Toasts) -->
<div id="toast-container" class="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"></div>

<!-- Scripts Clave del Frontend -->
<script src="assets/js/app.js"></script>
<script>
    // Inicialización inmediata de la iconografía de Lucide al cargar la estructura del DOM
    document.addEventListener('DOMContentLoaded', () => {
        // Convierte todos los tags <i data-lucide="..."> en SVGs vectoriales optimizados
        if (typeof lucide !== 'undefined') {
            lucide.createIcons();
        }
    });

    /**
     * Muestra una notificación emergente visual (Toast) en pantalla.
     *
     * @param {string} message Mensaje a desplegar al usuario.
     * @param {string} [type='success'] Tipo de alerta: 'success' | 'warning' | 'error' | 'info'.
     */
    function showNotification(message, type = 'success') {
        const container = document.getElementById('toast-container');
        if (!container) return;

        // Crear elemento de notificación
        const toast = document.createElement('div');
        toast.className = 'pointer-events-auto flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg text-xs font-semibold transition-all transform duration-300 translate-y-2 opacity-0 text-white';

        // Determinar colores según el tipo
        if (type === 'success') {
            toast.classList.add('bg-emerald-600');
        } else if (type === 'warning') {
            toast.classList.add('bg-amber-600');
        } else if (type === 'error') {
            toast.classList.add('bg-rose-600');
        } else {
            toast.classList.add('bg-slate-800');
        }

        toast.innerHTML = `<span>${message}</span>`;
        container.appendChild(toast);

        // Animar entrada
        setTimeout(() => {
            toast.classList.remove('translate-y-2', 'opacity-0');
            toast.classList.add('translate-y-0', 'opacity-100');
        }, 50);

        // Remover automáticamente tras 3.5 segundos
        setTimeout(() => {
            toast.classList.add('opacity-0', 'translate-y-2');
            setTimeout(() => toast.remove(), 300);
        }, 3500);
    }
</script>
</body>
</html>
