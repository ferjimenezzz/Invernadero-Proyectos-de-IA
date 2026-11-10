<?php
/**
 * ============================================================================
 * ARCHIVO: includes/sidebar.php
 * PROPÓSITO: Barra lateral de navegación maestra para AgroPulse IoT.
 *            Proporciona acceso directo a todos los módulos funcionales del
 *            invernadero inteligente, estado de almacenamiento y firmware.
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ============================================================================
 */

// Obtener el script en ejecución para resaltar dinámicamente el botón activo
$currentScript = basename($_SERVER['PHP_SELF']);

/**
 * Genera el markup de un ítem de navegación del sidebar.
 *
 * @param string $href Destino de redirección relativa (ej: dashboard.php).
 * @param string $icon Nombre del icono de Lucide a renderizar.
 * @param string $label Etiqueta visual del enlace.
 * @param string $currentScript Archivo actual evaluado para determinar estado activo.
 * @return string Fragmento HTML del botón de enlace.
 */
function renderSidebarItem(string $href, string $icon, string $label, string $currentScript): string {
    // Comprobar coincidencia exacta de ruta
    $isActive = ($currentScript === $href);
    
    // Asignar clases de color y contraste según el estado activo/inactivo
    $classes = $isActive
        ? 'bg-emerald-700/80 text-white font-medium shadow-sm border-l-4 border-emerald-400'
        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 border-l-4 border-transparent';

    // Generar bloque HTML con accesibilidad y evento de navegación
    return '
    <a href="' . htmlspecialchars($href) . '" class="flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-lg transition-all ' . $classes . '">
        <i data-lucide="' . htmlspecialchars($icon) . '" class="w-4 h-4 ' . ($isActive ? 'text-white' : 'text-slate-500') . '"></i>
        <span>' . htmlspecialchars($label) . '</span>
    </a>';
}
?>

<!-- Contenedor Maestro de la Barra Lateral -->
<aside class="w-64 bg-white border-r border-slate-200 flex flex-col justify-between shrink-0 h-screen sticky top-0 shadow-sm z-30">
    
    <!-- Sección Superior: Identidad Corporativa y Enlaces Principales -->
    <div>
        <!-- Cabecera de Marca: Invernadero AgroPulse -->
        <div class="p-4 border-b border-slate-100 flex items-center gap-3">
            <!-- Icono distintivo tipo nodo agrícola -->
            <div class="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-md shadow-emerald-500/20">
                <i data-lucide="sprout" class="w-5 h-5"></i>
            </div>
            <div>
                <h1 class="text-sm font-bold text-slate-800 tracking-tight leading-none">Invernadero</h1>
                <p class="text-[10px] font-mono tracking-wider text-emerald-600 font-semibold uppercase mt-0.5">AgroPulse IoT</p>
            </div>
        </div>

        <!-- Lista de Módulos Operacionales con Redirección Funcional -->
        <nav class="p-3 space-y-1">
            <?php 
                // Renderizado de botón hacia el panel de telemetría en tiempo real
                echo renderSidebarItem('dashboard.php', 'layout-dashboard', 'Dashboard', $currentScript);
                
                // Renderizado de botón hacia el control de actuadores, motores y reglas difusas
                echo renderSidebarItem('actuadores.php', 'sliders', 'Actuadores & Control', $currentScript);
                
                // Renderizado de botón hacia la calibración de sondas y configuración de límites
                echo renderSidebarItem('sensores.php', 'activity', 'Sensores & Umbrales', $currentScript);
                
                // Renderizado de botón hacia el broker MQTT, microcontroladores y túneles WS
                echo renderSidebarItem('conectividad.php', 'cpu', 'Conectividad & HW', $currentScript);
                
                // Renderizado de botón hacia la bitácora de auditoría ISO-22000 y reportes certificados
                echo renderSidebarItem('historico.php', 'file-text', 'Histórico & Reportes', $currentScript);
            ?>
        </nav>
    </div>

    <!-- Sección Inferior: Estado del Hardware Local y Asistencia -->
    <div class="p-4 border-t border-slate-100 space-y-3 bg-slate-50/70">
        
        <!-- Indicador de Almacenamiento Flash / Buffer Local -->
        <div>
            <div class="flex items-center justify-between text-[11px] font-medium text-slate-500 mb-1">
                <span class="tracking-wider uppercase font-semibold text-[10px]">Almacenamiento Local</span>
                <span class="font-mono font-bold text-slate-700">68%</span>
            </div>
            <!-- Barra de capacidad con progreso dinámico -->
            <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                <div class="bg-emerald-600 h-full rounded-full" style="width: 68%;"></div>
            </div>
        </div>

        <!-- Metadatos de Firmware y Acceso a Ayuda -->
        <div class="flex items-center justify-between pt-1 text-[11px] text-slate-500 font-medium">
            <span class="font-mono text-[10px] text-slate-600">Firmware v2.4.1</span>
            <!-- Botón de asistencia que despliega modal de ayuda agronómica -->
            <button type="button" onclick="alert('Centro de Ayuda AgroPulse:\n- Manual de calibración ADC disponible en /docs/calibracion.pdf\n- Protocolo MQTT: Broker local en puerto 1883\n- Soporte Agrónomo: soporte@agropulse.io');" class="inline-flex items-center gap-1 text-slate-600 hover:text-emerald-700 transition-colors">
                <i data-lucide="help-circle" class="w-3.5 h-3.5"></i>
                <span>Ayuda</span>
            </button>
        </div>

        <!-- Enlace de Desconexión / Retorno a Login -->
        <div class="pt-2 border-t border-slate-200/60 flex items-center justify-between">
            <a href="index.php" class="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1.5 transition-colors">
                <i data-lucide="log-out" class="w-3.5 h-3.5"></i>
                <span>Cerrar Sesión</span>
            </a>
            <span class="text-[10px] font-mono text-slate-400">Node #08</span>
        </div>
    </div>
</aside>
