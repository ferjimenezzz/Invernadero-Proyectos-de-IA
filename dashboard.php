<?php
/**
 * ============================================================================
 * ARCHIVO: dashboard.php
 * PROPÓSITO: Tablero principal de Monitoreo en Tiempo Real para microclima y sustrato.
 *            Presenta las tarjetas de telemetría atómica, gráfico multivariable
 *            con bandas de umbrales agronómicos, cálculo biofísico de VPD,
 *            acceso rápido a actuadores y flujo de alertas recientes.
 * VISTA EN PDF: Página 5 (Monitoreo en Tiempo Real • Zona 1: Hortalizas)
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ============================================================================
 */

// Título de la vista para la barra del navegador
$pageTitle = 'Dashboard de Monitoreo en Tiempo Real';

// Cargar la cabecera HTML global
require_once __DIR__ . '/includes/header.php';
?>

<!-- Contenedor Maestro con Layout Dividido (Sidebar + Área de Contenido Principal) -->
<div class="flex h-screen overflow-hidden bg-slate-50">
    
    <!-- Barra Lateral de Navegación -->
    <?php require_once __DIR__ . '/includes/sidebar.php'; ?>

    <!-- Área de Trabajo Principal con Scroll Independiente -->
    <div class="flex-1 flex flex-col min-w-0 overflow-y-auto">
        
        <!-- Barra Superior de Diagnóstico y Estado en Vivo -->
        <?php require_once __DIR__ . '/includes/topbar.php'; ?>

        <!-- Contenido Específico del Tablero -->
        <main class="p-6 space-y-6">
            
            <!-- Franja de Control Superior: Título de Zona y Acciones de Telemetría -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                    <h2 class="text-base font-bold text-slate-800 flex items-center gap-2">
                        <i data-lucide="gauge" class="w-4 h-4 text-emerald-600"></i>
                        <span>Monitoreo en Tiempo Real • Zona 1: Hortalizas y Tomate Cherry</span>
                    </h2>
                    <div class="flex items-center gap-2 mt-1 text-xs text-slate-500 font-mono">
                        <span class="inline-flex items-center gap-1.5 text-emerald-700 font-semibold">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 beacon-active"></span>
                            Telemetría Activa
                        </span>
                        <span>|</span>
                        <span>Última actualización: <strong id="last-update-text" class="text-slate-700">hace 5s</strong></span>
                        <span>|</span>
                        <span>Frecuencia muestreo: <strong class="text-slate-700">500ms</strong></span>
                    </div>
                </div>

                <!-- Botonera de Exportación y Refresco Operativo -->
                <div class="flex items-center gap-3">
                    <!-- Toggle de Auto-refresco -->
                    <label class="flex items-center gap-2 text-xs font-semibold text-slate-600 cursor-pointer">
                        <input type="checkbox" id="auto-refresh-toggle" checked onchange="toggleAutoRefresh(this.checked)" class="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300">
                        <span>Auto-refresco (5s)</span>
                    </label>

                    <!-- Botón de Refresco Manual -->
                    <button type="button" onclick="refreshTelemetryManual()" class="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors">
                        <i data-lucide="rotate-cw" class="w-3.5 h-3.5"></i>
                        <span>Refrescar</span>
                    </button>

                    <!-- Botón de Exportación Directa hacia Histórico -->
                    <button type="button" onclick="window.location.href='historico.php';" class="px-3 py-1.5 text-xs font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
                        <i data-lucide="download" class="w-3.5 h-3.5"></i>
                        <span>Exportar Telemetría</span>
                    </button>
                </div>
            </div>

            <!-- Fila de Tarjetas de Telemetría Atómica (5 Métricas Físicas Clave) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                
                <!-- 1. TEMPERATURA DEL AIRE -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between text-slate-500 text-xs">
                        <span class="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                            <i data-lucide="thermometer" class="w-3.5 h-3.5 text-cyan-600"></i>
                            Temp. Aire
                        </span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Óptimo</span>
                    </div>
                    <div class="my-3">
                        <span id="metric-temp-air" class="text-3xl font-extrabold text-slate-800 font-mono tracking-tight">24.2</span>
                        <span class="text-sm font-semibold text-slate-500 font-mono">°C</span>
                    </div>
                    <div class="space-y-1 text-[11px] border-t border-slate-100 pt-2 text-slate-500 font-mono">
                        <div class="flex justify-between">
                            <span>Rango: 21.0 - 27.0°C</span>
                            <span class="text-emerald-600 font-bold">↗ +0.4%</span>
                        </div>
                        <div class="text-[10px] text-slate-400 flex justify-between">
                            <span>Min: 21.8°C</span>
                            <span>Max: 25.1°C</span>
                        </div>
                    </div>
                </div>

                <!-- 2. HUMEDAD DEL AIRE (RELATIVA) -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between text-slate-500 text-xs">
                        <span class="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                            <i data-lucide="droplets" class="w-3.5 h-3.5 text-emerald-600"></i>
                            Hum. Aire
                        </span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">Normal</span>
                    </div>
                    <div class="my-3">
                        <span id="metric-hum-air" class="text-3xl font-extrabold text-slate-800 font-mono tracking-tight">62.4</span>
                        <span class="text-sm font-semibold text-slate-500 font-mono">%</span>
                    </div>
                    <div class="space-y-1 text-[11px] border-t border-slate-100 pt-2 text-slate-500 font-mono">
                        <div class="flex justify-between">
                            <span>Rango: 50.0 - 80.0%</span>
                            <span class="text-slate-500 font-bold">→ 0.0%</span>
                        </div>
                        <div class="text-[10px] text-slate-400 flex justify-between">
                            <span>Min: 59.5%</span>
                            <span>Max: 64.2%</span>
                        </div>
                    </div>
                </div>

                <!-- 3. HUMEDAD DEL SUELO (CAPACITIVA) -->
                <div class="bg-white p-4 rounded-xl border-2 border-amber-300 shadow-xs flex flex-col justify-between bg-amber-50/20">
                    <div class="flex items-center justify-between text-slate-500 text-xs">
                        <span class="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1 text-amber-800">
                            <i data-lucide="sprout" class="w-3.5 h-3.5 text-amber-600"></i>
                            Hum. Suelo
                        </span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 flex items-center gap-1">
                            <i data-lucide="alert-triangle" class="w-3 h-3 text-amber-600"></i>
                            Bajo Umbral
                        </span>
                    </div>
                    <div class="my-3">
                        <span id="metric-hum-soil" class="text-3xl font-extrabold text-amber-700 font-mono tracking-tight">58.2</span>
                        <span class="text-sm font-semibold text-slate-500 font-mono">%</span>
                    </div>
                    <div class="space-y-1 text-[11px] border-t border-amber-100 pt-2 text-slate-600 font-mono">
                        <div class="flex justify-between">
                            <span>Rango: 60.0 - 80.0%</span>
                            <span class="text-rose-600 font-bold">↘ -1.8%</span>
                        </div>
                        <div class="flex items-center justify-between pt-1">
                            <span class="text-[10px] text-slate-500">Riego en espera</span>
                            <button type="button" onclick="triggerQuickWatering()" class="px-2 py-0.5 text-[10px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded transition-colors">
                                Activar
                            </button>
                        </div>
                    </div>
                </div>

                <!-- 4. RADIACIÓN SOLAR / ILUMINACIÓN -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between text-slate-500 text-xs">
                        <span class="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                            <i data-lucide="sun" class="w-3.5 h-3.5 text-amber-500"></i>
                            Radiación / Lux
                        </span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Óptimo</span>
                    </div>
                    <div class="my-3">
                        <span id="metric-lux" class="text-3xl font-extrabold text-slate-800 font-mono tracking-tight">18.5k</span>
                        <span class="text-sm font-semibold text-slate-500 font-mono">lux</span>
                    </div>
                    <div class="space-y-1 text-[11px] border-t border-slate-100 pt-2 text-slate-500 font-mono">
                        <div class="flex justify-between">
                            <span>Rango: 12k - 30k lux</span>
                            <span class="text-slate-600">Sol + 40% LED</span>
                        </div>
                        <div class="text-[10px] text-slate-400 flex justify-between">
                            <span>PPFD: 412 µmol</span>
                            <span class="text-emerald-600 font-semibold">PAR: Normal</span>
                        </div>
                    </div>
                </div>

                <!-- 5. TEMPERATURA DEL SUSTRATO (RADICULAR) -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between text-slate-500 text-xs">
                        <span class="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1">
                            <i data-lucide="layers" class="w-3.5 h-3.5 text-teal-600"></i>
                            Temp. Sustrato
                        </span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-teal-100 text-teal-800">Estable</span>
                    </div>
                    <div class="my-3">
                        <span id="metric-temp-sub" class="text-3xl font-extrabold text-slate-800 font-mono tracking-tight">22.1</span>
                        <span class="text-sm font-semibold text-slate-500 font-mono">°C</span>
                    </div>
                    <div class="space-y-1 text-[11px] border-t border-slate-100 pt-2 text-slate-500 font-mono">
                        <div class="flex justify-between">
                            <span>Rango: 20.0 - 25.0°C</span>
                            <span class="text-emerald-600 font-bold">→ +0.1%</span>
                        </div>
                        <div class="text-[10px] text-slate-400 flex justify-between">
                            <span>Min: 21.4°C</span>
                            <span>Max: 22.8°C</span>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Sección Media: Gráfica Multivariable + Acciones Rápidas & Alertas -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- Columna Izquierda (2/3 de ancho): Curva Histórica y Parámetros Biofísicos -->
                <div class="lg:col-span-2 space-y-6">
                    
                    <!-- Tarjeta del Lienzo de Gráfica Multivariable -->
                    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                        <!-- Cabecera de la Gráfica y Filtros de Intervalo -->
                        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                            <div>
                                <h3 class="text-sm font-bold text-slate-800">Curva Histórica Multivariable en Tiempo Real</h3>
                                <p class="text-xs text-slate-500">Correlación de microclima y dinámica de sustrato en invernadero</p>
                            </div>
                            
                            <!-- Selectores de Ventana Temporal -->
                            <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs font-semibold">
                                <button type="button" class="px-2.5 py-1 rounded bg-white text-emerald-800 shadow-xs">1h</button>
                                <button type="button" class="px-2.5 py-1 rounded text-slate-600 hover:text-slate-900">6h</button>
                                <button type="button" class="px-2.5 py-1 rounded text-slate-600 hover:text-slate-900">24h</button>
                                <button type="button" class="px-2.5 py-1 rounded text-slate-600 hover:text-slate-900">7d</button>
                            </div>
                        </div>

                        <!-- Leyendas de Serie y Líneas Críticas -->
                        <div class="flex flex-wrap items-center gap-4 text-xs font-medium text-slate-600 mb-3 border-b border-slate-100 pb-2">
                            <div class="flex items-center gap-1.5">
                                <span class="w-3 h-3 rounded-full bg-cyan-600"></span>
                                <span>Temperatura Aire (°C)</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="w-3 h-3 rounded-full bg-emerald-600"></span>
                                <span>Humedad Relativa (%)</span>
                            </div>
                            <div class="flex items-center gap-1.5">
                                <span class="w-3 h-3 rounded-full bg-amber-500"></span>
                                <span>Humedad Suelo (%)</span>
                            </div>
                            <div class="flex items-center gap-1.5 ml-auto text-rose-500 font-mono text-[11px]">
                                <span class="w-3 h-0.5 border-t-2 border-dashed border-rose-500"></span>
                                <span>Línea Umbral Crítico</span>
                            </div>
                        </div>

                        <!-- Lienzo Interactivo HTML5 Canvas -->
                        <div class="w-full relative h-[280px]">
                            <canvas id="telemetryHistoryChart" class="w-full h-full block"></canvas>
                        </div>
                    </div>

                    <!-- Fila de Cálculos Agronómicos Derivados (VPD, Rocío, EC, CO2) -->
                    <div class="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        
                        <!-- Déficit de Presión de Vapor (VPD) -->
                        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Déficit Presión Vapor (VPD)</span>
                            <div class="my-1.5">
                                <span id="calc-vpd" class="text-xl font-extrabold text-emerald-800 font-mono">1.12</span>
                                <span class="text-xs text-slate-500 font-mono">kPa</span>
                            </div>
                            <span class="text-[11px] text-emerald-700 font-semibold block">Transpiración perfecta</span>
                        </div>

                        <!-- Punto de Rocío (Dew Point) -->
                        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Punto de Rocío (Dew)</span>
                            <div class="my-1.5">
                                <span id="calc-dew" class="text-xl font-extrabold text-slate-800 font-mono">16.4</span>
                                <span class="text-xs text-slate-500 font-mono">°C</span>
                            </div>
                            <span class="text-[11px] text-slate-500 block">Margen seguro (&gt;7.8°C)</span>
                        </div>

                        <!-- Conductividad Eléctrica (EC) -->
                        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Conductividad Eléc. (EC)</span>
                            <div class="my-1.5">
                                <span class="text-xl font-extrabold text-slate-800 font-mono">2.3</span>
                                <span class="text-xs text-slate-500 font-mono">mS/cm</span>
                            </div>
                            <span class="text-[11px] text-slate-500 block">Nutrientes nivel 1</span>
                        </div>

                        <!-- CO2 Fotosintético -->
                        <div class="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">CO₂ Fotosintético</span>
                            <div class="my-1.5">
                                <span class="text-xl font-extrabold text-slate-800 font-mono">780</span>
                                <span class="text-xs text-slate-500 font-mono">ppm</span>
                            </div>
                            <span class="text-[11px] text-slate-500 block">Inyección normal</span>
                        </div>

                    </div>

                </div>

                <!-- Columna Derecha (1/3 de ancho): Acciones Rápidas y Alertas Recientes -->
                <div class="space-y-6">
                    
                    <!-- Tarjeta: Acciones Rápidas de Zona -->
                    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                        <div class="flex items-center justify-between">
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <i data-lucide="sliders" class="w-4 h-4 text-emerald-600"></i>
                                Acciones Rápidas
                            </h3>
                            <span class="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded">
                                MODO AUTO
                            </span>
                        </div>
                        <p class="text-[11px] text-slate-500">Intervención manual temporal para actuadores de zona.</p>

                        <!-- Control 1: Válvula de Riego #01 -->
                        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                            <div>
                                <p class="text-xs font-bold text-slate-800">Válvula Riego #01</p>
                                <p class="text-[11px] text-slate-500">Inactivo (Suelo 58.2%)</p>
                            </div>
                            <button id="quick-valve-btn" type="button" onclick="toggleQuickValve()" class="px-3 py-1.5 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors">
                                Activar 5m
                            </button>
                        </div>

                        <!-- Control 2: Extractores Techo -->
                        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                            <div>
                                <p class="text-xs font-bold text-slate-800">Extractores Techo</p>
                                <p class="text-[11px] text-slate-500">Activo — 65% RPM</p>
                            </div>
                            <!-- Switch Toggle -->
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" checked onchange="showNotification('Extractores Techo modificados', 'info')" class="sr-only peer">
                                <div class="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>

                        <!-- Control 3: Nebulizador Humedad -->
                        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                            <div>
                                <p class="text-xs font-bold text-slate-800">Nebulizador Humedad</p>
                                <p class="text-[11px] text-slate-500">Standby (HR 62.4%)</p>
                            </div>
                            <label class="relative inline-flex items-center cursor-pointer">
                                <input type="checkbox" onchange="showNotification('Nebulizador en modo espera', 'info')" class="sr-only peer">
                                <div class="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                            </label>
                        </div>

                        <!-- Control 4: Cortina de Sombreo -->
                        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                            <div>
                                <p class="text-xs font-bold text-slate-800">Cortina de Sombreo</p>
                                <p class="text-[11px] text-slate-500">Desplegada al 30%</p>
                            </div>
                            <div class="flex items-center gap-1 font-mono text-xs font-bold text-slate-700">
                                <button type="button" class="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center">-</button>
                                <span class="px-1.5">30%</span>
                                <button type="button" class="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 flex items-center justify-center">+</button>
                            </div>
                        </div>

                        <!-- Enlace de Navegación hacia Control Completo -->
                        <a href="actuadores.php" class="block text-center text-xs font-semibold text-emerald-700 hover:text-emerald-800 hover:underline pt-1">
                            Ir a Tablero de Actuadores Completo &rarr;
                        </a>
                    </div>

                    <!-- Tarjeta: Flujo de Alertas Recientes -->
                    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <div class="flex items-center justify-between">
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                                <i data-lucide="bell" class="w-4 h-4 text-rose-500"></i>
                                Alertas Recientes
                            </h3>
                            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                        </div>

                        <div class="space-y-3 pt-1">
                            <!-- Alerta 1: Humedad de Suelo -->
                            <div class="p-3 rounded-lg bg-amber-50/70 border-l-4 border-amber-500 text-xs">
                                <div class="flex items-center justify-between font-bold text-amber-900">
                                    <span>Humedad de suelo descendió &lt; 60%</span>
                                    <span class="text-[10px] font-mono text-amber-700">10:42 AM</span>
                                </div>
                                <p class="text-[11px] text-amber-800 mt-1 leading-snug">
                                    Lectura actual: 58.2%. Ciclo de goteo programado listo para ejecución.
                                </p>
                            </div>

                            <!-- Alerta 2: Ventilador Cenital -->
                            <div class="p-3 rounded-lg bg-emerald-50/70 border-l-4 border-emerald-500 text-xs">
                                <div class="flex items-center justify-between font-bold text-emerald-900">
                                    <span>Ventilador Cenital activado</span>
                                    <span class="text-[10px] font-mono text-emerald-700">09:15 AM</span>
                                </div>
                                <p class="text-[11px] text-emerald-800 mt-1 leading-snug">
                                    Disparado por gradiente térmico T &gt; 26.0°C. Reducción a 24.2°C completada.
                                </p>
                            </div>

                            <!-- Alerta 3: Gateway LoRaWAN -->
                            <div class="p-3 rounded-lg bg-slate-50 border-l-4 border-slate-400 text-xs">
                                <div class="flex items-center justify-between font-bold text-slate-700">
                                    <span>Gateway LoRaWAN Sincronizado</span>
                                    <span class="text-[10px] font-mono text-slate-500">08:00 AM</span>
                                </div>
                                <p class="text-[11px] text-slate-600 mt-1 leading-snug">
                                    12 nodos de telemetría reportando paquetes sin pérdidas de trama (0% packet drop).
                                </p>
                            </div>
                        </div>

                        <!-- Pie de Alertas con Enlace hacia Histórico Completo -->
                        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                            <span class="text-slate-400 font-mono">Buffer: 3,420 registros</span>
                            <a href="historico.php?filtro=alertas" class="text-emerald-700 font-bold hover:underline">
                                Ver registro completo &rarr;
                            </a>
                        </div>
                    </div>

                </div>

            </div>

        </main>
    </div>
</div>

<!-- Lógica Local de Refresco de Telemetría -->
<script>
    let refreshTimer = null;

    /**
     * Alterna la ejecución del temporizador de actualización periódica.
     * @param {boolean} active Si se activa o no el ciclo de 5 segundos.
     */
    function toggleAutoRefresh(active) {
        if (active) {
            refreshTimer = setInterval(refreshTelemetryManual, 5000);
            showNotification('Auto-refresco activado (5s)', 'info');
        } else {
            clearInterval(refreshTimer);
            showNotification('Auto-refresco pausado', 'warning');
        }
    }

    /**
     * Realiza un refresco simulado de los valores con leves variaciones estocásticas.
     */
    function refreshTelemetryManual() {
        const tempAir = (24.0 + (Math.random() * 0.4 - 0.2)).toFixed(1);
        const humAir = (62.0 + (Math.random() * 0.8 - 0.4)).toFixed(1);
        const humSoil = (58.0 + (Math.random() * 0.4 - 0.2)).toFixed(1);
        
        document.getElementById('metric-temp-air').innerText = tempAir;
        document.getElementById('metric-hum-air').innerText = humAir;
        document.getElementById('metric-hum-soil').innerText = humSoil;

        const vpd = calculateVPD(parseFloat(tempAir), parseFloat(humAir));
        const dew = calculateDewPoint(parseFloat(tempAir), parseFloat(humAir));

        document.getElementById('calc-vpd').innerText = vpd;
        document.getElementById('calc-dew').innerText = dew;
        document.getElementById('last-update-text').innerText = 'hace 1s';

        showNotification('Telemetría de Zona 1 actualizada', 'success');
    }

    /**
     * Dispara el pulso de riego rápido manual de 5 minutos.
     */
    function triggerQuickWatering() {
        const btn = document.getElementById('quick-valve-btn');
        btn.innerText = 'Riego Activo (04:59)';
        btn.className = 'px-3 py-1.5 text-xs font-bold bg-amber-600 text-white rounded-lg animate-pulse';
        showNotification('Válvula EV-01 activada por 5 minutos', 'success');
    }

    /**
     * Alterna la válvula rápida.
     */
    function toggleQuickValve() {
        triggerQuickWatering();
    }

    // Inicializar ciclo de refresco automático
    refreshTimer = setInterval(refreshTelemetryManual, 5000);
</script>

<?php 
// Inclusión del cierre de documento y scripts globales
require_once __DIR__ . '/includes/footer.php'; 
?>
