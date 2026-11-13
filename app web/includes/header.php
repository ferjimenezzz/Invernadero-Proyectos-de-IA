<?php
/**
 * ============================================================================
 * ARCHIVO: includes/header.php
 * PROPÓSITO: Cabecera HTML compartida para todas las vistas de AgroPulse IoT.
 *            Carga el framework de diseño Tailwind CSS, tipografías técnicas,
 *            librería de iconos y define la estructura inicial del DOM.
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ARQUITECTURA: Frontend PHP Modular con Interfaz Reactiva Desacoplada
 * ============================================================================
 */

// Asegurar que la sesión esté iniciada para persistencia de estado simulado en navegación
if (session_status() === PHP_SESSION_NONE && !headers_sent()) {
    // Inicia la sesión para almacenar preferencias temporales suprimiendo advertencias de sandbox CLI
    @session_start();
}

/**
 * Función auxiliar para detectar la vista activa y aplicar estilos al menú de navegación.
 *
 * @param string $pageName Nombre del archivo o identificador de página a contrastar.
 * @return string Clases CSS de Tailwind aplicables al elemento activo o inactivo.
 */
function getNavActiveClass(string $pageName): string {
    // Extraer el nombre del script actual sin la ruta del directorio
    $current = basename($_SERVER['PHP_SELF']);
    // Comparar si el script en ejecución coincide con el objetivo
    if ($current === $pageName) {
        // Retornar estilos para enlace activo: fondo verde esmeralda con texto contrastante
        return 'bg-emerald-600 text-white font-semibold shadow-sm shadow-emerald-500/20';
    }
    // Retornar estilos neutros para enlaces inactivos con efecto hover interactivo
    return 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors';
}
?>
<!DOCTYPE html>
<html lang="es" class="h-full bg-slate-50 antialiased">
<head>
    <!-- Metadatos de codificación y compatibilidad -->
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="ie=edge">
    <title><?php echo isset($pageTitle) ? htmlspecialchars($pageTitle) . ' | AgroPulse IoT' : 'AgroPulse - Telemetría de Misión Crítica'; ?></title>

    <!-- Tailwind CSS v3 via CDN oficial para entrega inmediata sin compilación previa -->
    <script src="https://cdn.tailwindcss.com"></script>
    <script>
        // Configuración extendida de Tailwind para la paleta temática agro-tecnológica
        tailwind.config = {
            theme: {
                extend: {
                    colors: {
                        agro: {
                            50: '#f0fdf4',
                            100: '#dcfce7',
                            200: '#bbf7d0',
                            500: '#10b981',
                            600: '#059669',
                            700: '#047857',
                            800: '#065f46',
                            900: '#064e3b',
                            dark: '#0d1712',
                            panel: '#15241b'
                        }
                    },
                    fontFamily: {
                        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
                        mono: ['"JetBrains Mono"', 'Consolas', 'Courier New', 'monospace']
                    }
                }
            }
        };
    </script>

    <!-- Tipografías de Google Fonts: Inter para UI limpia y JetBrains Mono para datos de telemetría cruda -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">

    <!-- Iconos Lucide vía CDN para componentes visuales de instrumentación -->
    <script src="https://unpkg.com/lucide@latest"></script>

    <!-- Estilos específicos de animación de consola y barras de progreso -->
    <style>
        /* Personalización de scrollbar para consolas de telemetría y tablas densas */
        ::-webkit-scrollbar {
            width: 6px;
            height: 6px;
        }
        ::-webkit-scrollbar-track {
            background: #0f172a;
        }
        ::-webkit-scrollbar-thumb {
            background: #334155;
            border-radius: 3px;
        }
        ::-webkit-scrollbar-thumb:hover {
            background: #10b981;
        }
        /* Efecto de parpadeo de pulso en vivo para beacons de hardware */
        @keyframes radar-pulse {
            0% { transform: scale(0.95); opacity: 0.8; }
            50% { transform: scale(1.15); opacity: 1; }
            100% { transform: scale(0.95); opacity: 0.8; }
        }
        .beacon-active {
            animation: radar-pulse 2s infinite ease-in-out;
        }
    </style>
</head>
<body class="h-full text-slate-800 bg-[#f8faf9] flex flex-col font-sans">
