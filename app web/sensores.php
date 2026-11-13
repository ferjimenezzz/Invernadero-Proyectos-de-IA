<?php
/**
 * ============================================================================
 * ARCHIVO: sensores.php
 * PROPÓSITO: Módulo de Gestión de Sensores, Calibración Analógica y Umbrales.
 *            Permite la calibración de sondas de sustrato capacitivas mediante
 *            ajuste de curvas de transferencia de 12 bits, configuración de
 *            umbrales biológicos y asignación de canales de alerta.
 * VISTA EN PDF: Página 3 (Gestión de Sensores y Umbrales de Cultivo)
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ============================================================================
 */

// Título de la vista para la barra del navegador
$pageTitle = 'Gestión de Sensores y Umbrales de Cultivo';

// Inclusión de la cabecera HTML global
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

        <!-- Contenido Específico del Módulo de Sensores -->
        <main class="p-6 space-y-6">
            
            <!-- Franja Superior de Perfil Agronómico y Acciones -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                    <div class="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700">
                        <span class="px-2 py-0.5 rounded bg-emerald-100 uppercase">PARÁMETROS DE CAMPO</span>
                        <span>HARDWARE V3.1</span>
                    </div>
                    <h2 class="text-base font-bold text-slate-800 mt-1">Gestión de Sensores y Umbrales de Cultivo</h2>
                    <p class="text-xs text-slate-500">Calibración de sondas físicas, configuración de límites críticos y reglas de alerta push/webhook.</p>
                </div>

                <div class="flex flex-wrap items-center gap-3">
                    <!-- Selector de Perfil Agronómico -->
                    <div class="bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg text-left">
                        <span class="text-[9px] font-mono text-slate-400 block uppercase font-bold">Perfil Agronómico</span>
                        <span class="text-xs font-bold text-slate-800">Tomate indeterminado — Fase Floración</span>
                    </div>

                    <!-- Botón de Exportación -->
                    <button type="button" onclick="exportCalibrationConfig()" class="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors">
                        <i data-lucide="download" class="w-3.5 h-3.5 text-slate-500"></i>
                        <span>Exportar Calibración</span>
                    </button>

                    <!-- Botón de Agregar Sensor -->
                    <button type="button" onclick="openAddSensorModal()" class="px-3 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                        <span>+ Agregar Sensor</span>
                    </button>
                </div>
            </div>

            <!-- Fila: Inventario de Sondas (2/3) + Panel de Calibración Rápida (1/3) -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- Tabla: Inventario de Sondas & Interfaces Activas (2/3 de ancho) -->
                <div class="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                                <i data-lucide="activity" class="w-4 h-4 text-emerald-600"></i>
                                <span>Inventario de Sondas & Interfaces Activas</span>
                            </h3>
                        </div>
                        <div class="flex items-center gap-2 text-[11px] font-mono">
                            <span class="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold">5 Conectadas</span>
                            <span class="text-slate-400">|</span>
                            <span class="text-slate-500">Muestreo ADC: <strong>500ms</strong></span>
                        </div>
                    </div>

                    <!-- Tabla de Instrumentación -->
                    <div class="overflow-x-auto">
                        <table class="w-full text-left text-xs border-collapse">
                            <thead>
                                <tr class="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                                    <th class="py-2.5 px-3">Sensor y Variable</th>
                                    <th class="py-2.5 px-3">Modelo</th>
                                    <th class="py-2.5 px-3">Pin / Bus</th>
                                    <th class="py-2.5 px-3">Estado / Enlace</th>
                                    <th class="py-2.5 px-3">Lectura Actual</th>
                                    <th class="py-2.5 px-3">Offset</th>
                                    <th class="py-2.5 px-3 text-right">Acción</th>
                                </tr>
                            </thead>
                            <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
                                <!-- Fila 1: Sonda Suelo 1 (Activa para Calibración) -->
                                <tr class="bg-emerald-50/40 hover:bg-emerald-50 transition-colors">
                                    <td class="py-3 px-3 font-sans">
                                        <div class="font-bold text-slate-800 flex items-center gap-1.5">
                                            <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                                            Sonda Humedad Suelo #1
                                        </div>
                                        <span class="text-[10px] text-slate-500 font-sans">Sustrato Línea A (Cama 1)</span>
                                    </td>
                                    <td class="py-3 px-3 text-slate-600">Capacitive v1.2</td>
                                    <td class="py-3 px-3 text-slate-700 font-bold">ADC Canal A0</td>
                                    <td class="py-3 px-3">
                                        <span class="text-emerald-700 font-semibold flex items-center gap-1">
                                            <i data-lucide="wifi" class="w-3 h-3"></i>
                                            RSSI -62 dBm
                                        </span>
                                    </td>
                                    <td class="py-3 px-3 font-bold text-slate-800 text-xs">58.2 %</td>
                                    <td class="py-3 px-3 text-emerald-700 font-semibold">+1.5 %</td>
                                    <td class="py-3 px-3 text-right font-sans">
                                        <button type="button" onclick="selectSensorForCalibration('Sonda Humedad Suelo #1', 2340, 1.5)" class="px-2.5 py-1 text-[10px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded transition-colors shadow-xs">
                                            Calibrar & Test
                                        </button>
                                    </td>
                                </tr>

                                <!-- Fila 2: Sonda Suelo 2 -->
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="py-3 px-3 font-sans">
                                        <div class="font-bold text-slate-800">Sonda Humedad Suelo #2</div>
                                        <span class="text-[10px] text-slate-500 font-sans">Sustrato Línea B (Cama 2)</span>
                                    </td>
                                    <td class="py-3 px-3 text-slate-600">Capacitive v1.2</td>
                                    <td class="py-3 px-3 text-slate-700">ADC Canal A1</td>
                                    <td class="py-3 px-3 text-slate-600">• En línea</td>
                                    <td class="py-3 px-3 font-bold text-slate-800 text-xs">64.0 %</td>
                                    <td class="py-3 px-3 text-slate-500">0.0 %</td>
                                    <td class="py-3 px-3 text-right font-sans">
                                        <button type="button" onclick="selectSensorForCalibration('Sonda Humedad Suelo #2', 2180, 0.0)" class="px-2.5 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors">
                                            Calibrar
                                        </button>
                                    </td>
                                </tr>

                                <!-- Fila 3: Sensor Clima DHT22 -->
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="py-3 px-3 font-sans">
                                        <div class="font-bold text-slate-800">Sensor Clima Principal</div>
                                        <span class="text-[10px] text-slate-500 font-sans">Temp. & Humedad Relativa</span>
                                    </td>
                                    <td class="py-3 px-3 text-slate-600">DHT22 / AM2302</td>
                                    <td class="py-3 px-3 text-slate-700">GPIO 4</td>
                                    <td class="py-3 px-3 text-slate-600">100% Cableado</td>
                                    <td class="py-3 px-3 font-bold text-slate-800 text-xs">24.2 °C | 62% RH</td>
                                    <td class="py-3 px-3 text-slate-500">-0.3 °C</td>
                                    <td class="py-3 px-3 text-right font-sans">
                                        <button type="button" onclick="showNotification('Ajuste de offset DHT22 listo', 'info')" class="px-2.5 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors">
                                            Calibrar
                                        </button>
                                    </td>
                                </tr>

                                <!-- Fila 4: Radiación Solar BH1750 -->
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="py-3 px-3 font-sans">
                                        <div class="font-bold text-slate-800">Radiación Solar / Lux</div>
                                        <span class="text-[10px] text-slate-500 font-sans">Fotoperiodo Dosel Superior</span>
                                    </td>
                                    <td class="py-3 px-3 text-slate-600">BH1750 Lux</td>
                                    <td class="py-3 px-3 text-slate-700">I2C 0x23</td>
                                    <td class="py-3 px-3 text-slate-600">• En línea</td>
                                    <td class="py-3 px-3 font-bold text-slate-800 text-xs">18,500 lux</td>
                                    <td class="py-3 px-3 text-slate-500">&times;1.02</td>
                                    <td class="py-3 px-3 text-right font-sans">
                                        <button type="button" onclick="showNotification('Factor de ganancia óptica BH1750 nominal', 'info')" class="px-2.5 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors">
                                            Calibrar
                                        </button>
                                    </td>
                                </tr>

                                <!-- Fila 5: Temp Sustrato DS18B20 -->
                                <tr class="hover:bg-slate-50 transition-colors">
                                    <td class="py-3 px-3 font-sans">
                                        <div class="font-bold text-slate-800">Temp. Sustrato</div>
                                        <span class="text-[10px] text-slate-500 font-sans">Radicular Profundidad 15cm</span>
                                    </td>
                                    <td class="py-3 px-3 text-slate-600">DS18B20 OneWire</td>
                                    <td class="py-3 px-3 text-slate-700">1-Wire Pin 15</td>
                                    <td class="py-3 px-3 text-slate-600">• En línea</td>
                                    <td class="py-3 px-3 font-bold text-slate-800 text-xs">22.1 °C</td>
                                    <td class="py-3 px-3 text-slate-500">+0.1 °C</td>
                                    <td class="py-3 px-3 text-right font-sans">
                                        <button type="button" onclick="showNotification('Offset de sonda térmica DS18B20 guardado', 'info')" class="px-2.5 py-1 text-[10px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors">
                                            Calibrar
                                        </button>
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                <!-- Tarjeta: Prueba y Calibración Rápida Interactiva (1/3 de ancho) -->
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                        <div>
                            <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800">Prueba y Calibración Rápida</h3>
                            <p id="active-cal-name" class="text-[11px] text-slate-500">Sonda Humedad Suelo #1 (ADC_CH0)</p>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800">
                            Sonda Activa
                        </span>
                    </div>

                    <!-- Lectura Convertida Actual -->
                    <div>
                        <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Lectura convertida actual:</span>
                        <div class="my-1">
                            <span id="cal-converted-display" class="text-3xl font-extrabold text-emerald-800 font-mono">58.2 %</span>
                        </div>
                    </div>

                    <!-- Lectura Cruda ADC (0 - 4095) con Barra Deslizante Interactiva -->
                    <div class="space-y-1.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                        <div class="flex justify-between text-xs font-mono">
                            <span class="text-slate-500 text-[10px] uppercase font-bold">LECTURA CRUDA (ADC RAW 12-BIT):</span>
                            <span id="cal-raw-display" class="text-slate-800 font-extrabold">2340 / 4095</span>
                        </div>
                        
                        <!-- Slider interactivo que recalcula en vivo mediante app.js -->
                        <input type="range" id="cal-adc-slider" min="0" max="4095" value="2340" oninput="updateCalibrationOutput(this.value)" class="w-full accent-emerald-600 cursor-pointer">
                        
                        <div class="flex justify-between text-[9px] font-mono text-slate-400">
                            <span>0 (0V)</span>
                            <span>Seco: 3100</span>
                            <span>Saturado: 1200</span>
                            <span>4095 (3.3V)</span>
                        </div>
                    </div>

                    <!-- Puntos de Calibración de Laboratorio -->
                    <div class="space-y-1 text-xs">
                        <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Puntos de Calibración de Laboratorio</span>
                        <div class="grid grid-cols-2 gap-2 font-mono text-[11px]">
                            <div class="p-2 bg-slate-50 rounded border border-slate-200">
                                <span class="text-slate-400 text-[9px] block">1. Seco al Aire (0% RH)</span>
                                <span class="font-bold text-slate-800">3140</span>
                                <span class="text-[9px] text-slate-500 block">Punto base de resequedad</span>
                            </div>
                            <div class="p-2 bg-slate-50 rounded border border-slate-200">
                                <span class="text-slate-400 text-[9px] block">2. Agua Destilada (100%)</span>
                                <span class="font-bold text-slate-800">1280</span>
                                <span class="text-[9px] text-slate-500 block">Punto base saturación</span>
                            </div>
                        </div>
                    </div>

                    <!-- Offset Lineal Manual -->
                    <div>
                        <label class="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1" for="cal-offset-input">Offset Lineal Manual</label>
                        <div class="flex items-center gap-2">
                            <button type="button" onclick="adjustOffset(-0.5)" class="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center">-</button>
                            <input type="number" step="0.1" id="cal-offset-input" value="1.5" onchange="updateCalibrationOutput(document.getElementById('cal-adc-slider').value)" class="flex-1 py-1 px-3 text-xs text-center font-mono font-bold border border-slate-300 rounded focus:ring-2 focus:ring-emerald-500">
                            <button type="button" onclick="adjustOffset(0.5)" class="w-8 h-8 rounded bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 flex items-center justify-center">+</button>
                        </div>
                    </div>

                    <!-- Ecuación de Transformación y Botón Guardar -->
                    <div class="pt-2 border-t border-slate-100 space-y-2">
                        <div class="p-2 bg-slate-900 text-emerald-400 rounded font-mono text-[11px] text-center">
                            Curva: y = -0.0537x + 168.8
                        </div>
                        <button type="button" onclick="saveCalibrationCurve()" class="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors">
                            <i data-lucide="save" class="w-3.5 h-3.5"></i>
                            <span>Guardar Curva de Calibración</span>
                        </button>
                        <p class="text-[10px] text-slate-400 text-center font-mono">Parámetros grabados en EEPROM del ESP32</p>
                    </div>
                </div>

            </div>

            <!-- Fila: Pasarela Activa Microcontrolador ESP32-WROOM -->
            <div class="p-4 bg-emerald-950 text-emerald-100 rounded-xl border border-emerald-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div class="flex items-center gap-3">
                    <div class="p-2.5 rounded-lg bg-emerald-800/60 text-emerald-300">
                        <i data-lucide="cpu" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <h4 class="text-xs font-bold uppercase tracking-wider text-white">Microcontrolador ESP32-WROOM • Pasarela Activa</h4>
                        <p class="text-[11px] text-emerald-300/80">Lecturas analógicas muestreadas con resolución de 12 bits (0-4095). Atenuación ADC configurada a 11dB (0-3.3V).</p>
                    </div>
                </div>
                <div class="flex items-center gap-3 font-mono text-xs">
                    <span class="text-emerald-300">Vref Cal: <strong class="text-white">1100mV</strong></span>
                    <button type="button" onclick="showNotification('Sincronización de pasarela ADC completada', 'success')" class="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg transition-colors">
                        Forzar Sincronización
                    </button>
                </div>
            </div>

            <!-- Sección: Umbrales de Alerta & Desviación Climática (4 Tarjetas de Límites) -->
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <i data-lucide="sliders-horizontal" class="w-4 h-4 text-emerald-600"></i>
                            <span>Umbrales de Alerta & Desviación Climática</span>
                        </h3>
                        <p class="text-xs text-slate-500">Límites configurados para activar ventanas automatizadas, nebulizadores, riego e incidencias push.</p>
                    </div>
                    <span class="text-xs font-mono font-semibold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded">
                        Motor de Reglas: Activo (Evaluando cada 10s)
                    </span>
                </div>

                <!-- Grid de las 4 Tarjetas de Umbrales -->
                <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    
                    <!-- UMBRAL 1: TEMPERATURA AIRE -->
                    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800">Temperatura Aire</span>
                            <span class="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">24.2 °C</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div class="p-1.5 bg-slate-50 rounded border border-slate-200">
                                <span class="text-slate-400 block">MÍN ABSOLUTO</span>
                                <span class="font-bold text-slate-700">18.0 °C</span>
                            </div>
                            <div class="p-1.5 bg-slate-50 rounded border border-slate-200">
                                <span class="text-slate-400 block">MÁX CRÍTICO</span>
                                <span class="font-bold text-rose-600">32.0 °C</span>
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                                <span>Rango Óptimo 21.0 °C - 27.0 °C</span>
                            </div>
                            <div class="h-2 bg-gradient-to-r from-blue-300 via-emerald-400 to-rose-400 rounded-full"></div>
                            <div class="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                                <span>15°C</span>
                                <span>21°C</span>
                                <span>27°C</span>
                                <span>35°C</span>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-slate-100 text-[10px] space-y-1">
                            <span class="font-bold text-slate-400 uppercase tracking-wider block">CANALES DE ALERTA</span>
                            <label class="flex items-center gap-1.5 text-slate-600"><input type="checkbox" checked class="rounded text-emerald-600"> Notificación Push Móvil</label>
                            <label class="flex items-center gap-1.5 text-slate-600"><input type="checkbox" checked class="rounded text-emerald-600"> Webhook MQTT (Broker Local)</label>
                            <label class="flex items-center gap-1.5 text-slate-600"><input type="checkbox" class="rounded text-emerald-600"> Correo Electrónico Agrónomo</label>
                        </div>
                    </div>

                    <!-- UMBRAL 2: HUMEDAD DEL AIRE -->
                    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800">Humedad del Aire</span>
                            <span class="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">62% RH</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div class="p-1.5 bg-slate-50 rounded border border-slate-200">
                                <span class="text-slate-400 block">MÍNIMO PERMITIDO</span>
                                <span class="font-bold text-slate-700">45 %</span>
                            </div>
                            <div class="p-1.5 bg-slate-50 rounded border border-slate-200">
                                <span class="text-slate-400 block">MÁXIMO ESPORAS</span>
                                <span class="font-bold text-rose-600">85 %</span>
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                                <span>Rango Óptimo 55% - 75% RH</span>
                            </div>
                            <div class="h-2 bg-gradient-to-r from-amber-300 via-emerald-400 to-blue-400 rounded-full"></div>
                            <div class="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                                <span>30%</span>
                                <span>55%</span>
                                <span>75%</span>
                                <span>95%</span>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-slate-100 text-[10px] space-y-1">
                            <span class="font-bold text-slate-400 uppercase tracking-wider block">CANALES DE ALERTA</span>
                            <label class="flex items-center gap-1.5 text-slate-600"><input type="checkbox" checked class="rounded text-emerald-600"> Notificación Push Móvil</label>
                            <label class="flex items-center gap-1.5 text-slate-600"><input type="checkbox" checked class="rounded text-emerald-600"> Webhook MQTT (Fogger Relay)</label>
                            <label class="flex items-center gap-1.5 text-slate-600"><input type="checkbox" checked class="rounded text-emerald-600"> Registro en Bitácora CSV</label>
                        </div>
                    </div>

                    <!-- UMBRAL 3: HUMEDAD DEL SUELO -->
                    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800">Humedad del Suelo</span>
                            <span class="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">58.2 %</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div class="p-1.5 bg-slate-50 rounded border border-slate-200">
                                <span class="text-slate-400 block">MÍN. MARCHITEZ</span>
                                <span class="font-bold text-amber-600">50.0 %</span>
                            </div>
                            <div class="p-1.5 bg-slate-50 rounded border border-slate-200">
                                <span class="text-slate-400 block">MÁX. SATURACIÓN</span>
                                <span class="font-bold text-slate-700">90.0 %</span>
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                                <span>Capacidad de Campo Óptima 60% - 80%</span>
                            </div>
                            <div class="h-2 bg-gradient-to-r from-rose-400 via-amber-300 to-emerald-400 rounded-full"></div>
                            <div class="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                                <span>40%</span>
                                <span>60%</span>
                                <span>80%</span>
                                <span>100%</span>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <div>
                                <span class="text-[9px] font-bold text-slate-400 uppercase block">DISPARADOR DE RIEGO</span>
                                <span class="font-bold text-slate-700">Válvula Solenoide #1</span>
                            </div>
                            <div class="text-right">
                                <span class="text-[9px] text-slate-400 block">Auto-Run</span>
                                <label class="relative inline-flex items-center cursor-pointer">
                                    <input type="checkbox" checked class="sr-only peer">
                                    <div class="w-8 h-4 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-3 after:w-3 after:transition-all peer-checked:bg-emerald-600"></div>
                                </label>
                            </div>
                        </div>
                    </div>

                    <!-- UMBRAL 4: RADIACIÓN LUMÍNICA -->
                    <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
                        <div class="flex items-center justify-between">
                            <span class="text-xs font-bold text-slate-800">Radiación Lumínica</span>
                            <span class="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">18.5k lux</span>
                        </div>
                        <div class="grid grid-cols-2 gap-2 text-[10px] font-mono">
                            <div class="p-1.5 bg-slate-50 rounded border border-slate-200">
                                <span class="text-slate-400 block">MÍN. FOTOPERIODO</span>
                                <span class="font-bold text-slate-700">10,000 lux</span>
                            </div>
                            <div class="p-1.5 bg-slate-50 rounded border border-slate-200">
                                <span class="text-slate-400 block">MÁX. SATURACIÓN</span>
                                <span class="font-bold text-rose-600">40,000 lux</span>
                            </div>
                        </div>
                        <div>
                            <div class="flex justify-between text-[10px] font-semibold text-slate-500 mb-1">
                                <span>Rango Fotosintético Activo 15k - 35k lux</span>
                            </div>
                            <div class="h-2 bg-gradient-to-r from-slate-300 via-amber-300 to-rose-400 rounded-full"></div>
                            <div class="flex justify-between text-[9px] text-slate-400 font-mono mt-1">
                                <span>5k</span>
                                <span>15k</span>
                                <span>35k</span>
                                <span>50k lux</span>
                            </div>
                        </div>
                        <div class="pt-2 border-t border-slate-100 text-[10px]">
                            <span class="font-bold text-slate-400 uppercase tracking-wider block">ACCIÓN DE SOMBREO</span>
                            <div class="flex items-center justify-between mt-1">
                                <span class="font-semibold text-slate-700">Malla Térmica Motorizada</span>
                                <span class="text-[9px] text-slate-500 font-mono">Despliegue &gt; 40k lux</span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Fila Inferior: Detalles de Campo y Registro Histórico de Calibraciones -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <!-- Tarjeta 1: Cama de Cultivo -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span class="text-[9px] font-mono font-bold text-emerald-700 uppercase block">NODO FÍSICO A1 • CAMA DE CULTIVO</span>
                    <h4 class="text-xs font-bold text-slate-800 mt-1">Tomates Beefsteak — Raíz Activa</h4>
                    <p class="text-[11px] text-slate-500 mt-1">3 Sondas Capacitivas instaladas a 10cm, 25cm y 40cm para perfil estratigráfico hídrico.</p>
                </div>

                <!-- Tarjeta 2: Revestimiento Epoxi Sonda -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                    <span class="text-[9px] font-mono font-bold text-emerald-700 uppercase block">MONITOREO DE SUSTRATO</span>
                    <h4 class="text-xs font-bold text-slate-800 mt-1">Sonda Capacitiva v1.2</h4>
                    <p class="text-[11px] text-slate-500 mt-1">Revestimiento epoxi anti-corrosión galvánica con aislamiento de plano de tierra.</p>
                </div>

                <!-- Tarjeta 3: Historial de Calibraciones -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-2">
                    <span class="text-[9px] font-mono font-bold text-emerald-700 uppercase block">Historial de Calibraciones</span>
                    <div class="space-y-1 text-[11px] font-mono text-slate-600">
                        <div class="flex justify-between">
                            <span>Sonda #1 Sustrato</span>
                            <span class="text-slate-400">Ayer 16:42 (Elena R.)</span>
                        </div>
                        <div class="flex justify-between">
                            <span>Sensor Lux BH1750</span>
                            <span class="text-slate-400">12 Mar 09:15 (Auto)</span>
                        </div>
                        <div class="flex justify-between">
                            <span>DHT22 Clima</span>
                            <span class="text-slate-400">05 Mar 14:02 (Elena R.)</span>
                        </div>
                    </div>
                    <button type="button" onclick="showNotification('Descargando bitácora SHA-256 criptográfica', 'success')" class="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1 pt-1">
                        <i data-lucide="shield-check" class="w-3 h-3"></i>
                        <span>Descargar Log Criptográfico</span>
                    </button>
                </div>

            </div>

        </main>
    </div>
</div>

<!-- Lógica Local de Calibración -->
<script>
    /**
     * Carga un sensor seleccionado en el panel interactivo de calibración.
     * @param {string} name Nombre del sensor.
     * @param {number} rawVal Valor analógico de 12 bits.
     * @param {number} offset Offset en porcentaje.
     */
    function selectSensorForCalibration(name, rawVal, offset) {
        document.getElementById('active-cal-name').innerText = name;
        document.getElementById('cal-offset-input').value = offset;
        updateCalibrationOutput(rawVal);
        showNotification(`Sensor '${name}' cargado en panel de calibración`, 'info');
    }

    /**
     * Ajusta el offset manualmente con los botones de incremento/decremento.
     * @param {number} delta Variación a sumar al offset actual.
     */
    function adjustOffset(delta) {
        const offsetInput = document.getElementById('cal-offset-input');
        let current = parseFloat(offsetInput.value) || 0;
        offsetInput.value = (current + delta).toFixed(1);
        updateCalibrationOutput(document.getElementById('cal-adc-slider').value);
    }

    /**
     * Guarda la curva de calibración en la EEPROM simulada.
     */
    function saveCalibrationCurve() {
        const sensor = document.getElementById('active-cal-name').innerText;
        const offset = document.getElementById('cal-offset-input').value;
        showNotification(`Parámetros de calibración (Offset ${offset}%) grabados en EEPROM del ESP32 para ${sensor}`, 'success');
    }

    /**
     * Exporta la configuración de calibración agronómica en JSON.
     */
    function exportCalibrationConfig() {
        const data = {
            zone: "Zona 1 Cultivo de Hortalizas",
            profile: "Tomate indeterminado - Fase Floración",
            sensors: [
                { id: "SOIL_01", adc_ch: 0, slope: -0.0537, intercept: 168.8, offset: 1.5 },
                { id: "SOIL_02", adc_ch: 1, slope: -0.0537, intercept: 168.8, offset: 0.0 }
            ],
            timestamp: new Date().toISOString()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Calibracion_Sensores_Zona1.json';
        a.click();
        showNotification('Configuración de calibración descargada', 'success');
    }

    /**
     * Abre modal para agregar un nuevo sensor.
     */
    function openAddSensorModal() {
        const name = prompt('Ingrese el identificador del nuevo sensor (ej: Sonda Capacitiva Cama 3):');
        if (name) {
            showNotification(`Sensor '${name}' registrado en la pasarela. Asignando canal ADC disponible...`, 'success');
        }
    }
</script>

<?php 
// Inclusión del cierre de documento y scripts globales
require_once __DIR__ . '/includes/footer.php'; 
?>
