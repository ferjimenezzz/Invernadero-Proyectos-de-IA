<?php
/**
 * ============================================================================
 * ARCHIVO: actuadores.php
 * PROPÓSITO: Tablero de Mando Físico de Actuadores, Riego, Clima y Automatización.
 *            Permite la intervención manual o programada sobre electroválvulas,
 *            extractores, ventilas cenitales, nebulizadores y dimmer PWM,
 *            además de gestionar las políticas activas de lógica difusa.
 * VISTA EN PDF: Página 4 (Control de Actuadores y Automatización de Clima)
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ============================================================================
 */

// Título de la vista para la pestaña del navegador
$pageTitle = 'Control de Actuadores y Automatización de Clima';

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

        <!-- Contenido Específico de Actuadores -->
        <main class="p-6 space-y-6">
            
            <!-- Franja Superior de Estado de PLC y Modos de Emergencia -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                    <div class="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700">
                        <span class="px-2 py-0.5 rounded bg-emerald-100 uppercase">PLC TELEMETRÍA ZONA 1</span>
                        <span>Ciclo Vegetativo #04</span>
                    </div>
                    <h2 class="text-base font-bold text-slate-800 mt-1">Control de Actuadores y Automatización de Clima</h2>
                    <p class="text-xs text-slate-500">Control manual directo, temporizadores de seguridad y reglas de automatización activa para Zona 1 (Cultivo de Hortalizas).</p>
                </div>

                <!-- Botonera de Paro General y Conmutación de Modo Global -->
                <div class="flex flex-wrap items-center gap-4">
                    <!-- Modo Global Switch -->
                    <div class="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                        <span class="text-xs font-bold text-slate-700">MODO GLOBAL</span>
                        <span class="text-[11px] text-emerald-700 font-semibold font-mono">Automático General</span>
                        <label class="relative inline-flex items-center cursor-pointer ml-1">
                            <input type="checkbox" checked onchange="toggleGlobalMode(this.checked)" class="sr-only peer">
                            <div class="w-9 h-5 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                        </label>
                    </div>

                    <!-- Botón de Pausa de Mantenimiento -->
                    <button type="button" onclick="toggleMaintenancePause()" class="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors">
                        <i data-lucide="pause-circle" class="w-3.5 h-3.5 text-slate-500"></i>
                        <span>Pausa de Mantenimiento</span>
                    </button>

                    <!-- Botón de Paro General (Emergency Stop) -->
                    <button type="button" onclick="triggerEmergencyStop()" class="px-3.5 py-2 text-xs font-extrabold bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-md hover:shadow-lg flex items-center gap-1.5 transition-all">
                        <i data-lucide="alert-octagon" class="w-4 h-4"></i>
                        <span>* Paro General</span>
                    </button>
                </div>
            </div>

            <!-- Fila: 4 Tarjetas de Actuadores Físicos de Campo -->
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                
                <!-- ACTUADOR 1: VÁLVULA SOLENOIDE EV-01 (RIEGO) -->
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div class="flex items-center gap-2">
                                <i data-lucide="droplet" class="w-4 h-4 text-emerald-600"></i>
                                <div>
                                    <span class="text-[9px] font-mono text-slate-400 uppercase font-bold block">VÁLVULA EV-01</span>
                                    <h3 class="text-xs font-bold text-slate-800">Sistema de Riego</h3>
                                </div>
                            </div>
                            <span id="valve-status-badge" class="px-2 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-slate-600 rounded">
                                En Reposo
                            </span>
                        </div>

                        <div class="py-2 grid grid-cols-2 gap-2 text-xs font-mono">
                            <div>
                                <span class="text-slate-400 text-[10px] block">Caudal Actual</span>
                                <span id="valve-flow-display" class="font-extrabold text-slate-800">0.0 L/min</span>
                            </div>
                            <div>
                                <span class="text-slate-400 text-[10px] block">Presión Línea</span>
                                <span class="font-extrabold text-slate-800">2.4 bar</span>
                            </div>
                        </div>

                        <div class="p-2.5 bg-emerald-50/60 rounded-lg border border-emerald-100 text-[11px] text-emerald-800 leading-snug">
                            <i data-lucide="git-commit" class="w-3 h-3 inline mr-1 text-emerald-600"></i>
                            Regla vinculada: <strong>Riego si Humedad &lt; 60%</strong> por &gt;15 min continuos.
                        </div>
                    </div>

                    <div class="space-y-3 pt-2 border-t border-slate-100">
                        <div>
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">DURACIÓN MANUAL</span>
                            <div class="grid grid-cols-4 gap-1 text-xs font-semibold">
                                <button type="button" onclick="selectWaterDuration(1, this)" class="py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700">1m</button>
                                <button type="button" onclick="selectWaterDuration(5, this)" class="py-1 rounded bg-emerald-700 text-white shadow-xs">5m</button>
                                <button type="button" onclick="selectWaterDuration(15, this)" class="py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700">15m</button>
                                <button type="button" onclick="selectWaterDuration('custom', this)" class="py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700">Custom</button>
                            </div>
                        </div>

                        <button id="valve-main-btn" type="button" onclick="toggleMainWaterValve()" class="w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors">
                            <i data-lucide="play" class="w-3.5 h-3.5"></i>
                            <span>Iniciar Riego Manual</span>
                        </button>

                        <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
                            <span>Relay Solenoide #12</span>
                            <span class="text-slate-500">Bypass OFF</span>
                        </div>
                    </div>
                </div>

                <!-- ACTUADOR 2: ILUMINACIÓN LED DIMMER PWM-03 -->
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div class="flex items-center gap-2">
                                <i data-lucide="sun" class="w-4 h-4 text-amber-500"></i>
                                <div>
                                    <span class="text-[9px] font-mono text-slate-400 uppercase font-bold block">CANAL PWM-03</span>
                                    <h3 class="text-xs font-bold text-slate-800">Iluminación LED</h3>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded">
                                Activo (40%)
                            </span>
                        </div>

                        <!-- Slider Dimmer 0 - 100% -->
                        <div class="py-2 space-y-1">
                            <div class="flex items-center justify-between text-xs font-mono">
                                <span class="text-slate-500 text-[10px] uppercase font-bold">Atenuación / Dimmer</span>
                                <span id="led-dimmer-display" class="font-extrabold text-amber-600">40%</span>
                            </div>
                            <input type="range" min="0" max="100" value="40" oninput="updateLedDimmer(this.value)" class="w-full accent-amber-500 cursor-pointer">
                            <div class="flex justify-between text-[9px] font-mono text-slate-400">
                                <span>PAR / PPFD: 450 µmol/m²/s</span>
                                <span>Full Spectrum</span>
                            </div>
                        </div>

                        <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-snug">
                            <div class="flex items-center gap-1 font-bold text-slate-800 mb-0.5">
                                <i data-lucide="clock" class="w-3 h-3 text-amber-500"></i>
                                <span>Fotoperiodo Programado</span>
                            </div>
                            <p class="text-[10px] text-slate-500">Horario activo: <strong>06:00 — 20:00</strong></p>
                            <p class="text-[9px] font-mono text-slate-400 mt-0.5">14h Luz / 10h Oscuridad (Fase Vegetativa)</p>
                        </div>
                    </div>

                    <div class="space-y-2 pt-2 border-t border-slate-100">
                        <div class="flex items-center justify-between text-xs">
                            <div>
                                <span class="font-bold text-slate-700 block text-[11px]">Override Manual</span>
                                <span class="text-[10px] text-slate-400">Sobrescribir reloj astrológico</span>
                            </div>
                            <button type="button" onclick="showNotification('Override manual LED fijado en ON permanente', 'warning')" class="px-2.5 py-1 text-[10px] font-bold bg-emerald-700 text-white rounded shadow-xs">
                                ENCENDIDO
                            </button>
                        </div>
                    </div>
                </div>

                <!-- ACTUADOR 3: EXTRACTORES & VENTILA CENITAL M-02 -->
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div class="flex items-center gap-2">
                                <i data-lucide="fan" class="w-4 h-4 text-cyan-600"></i>
                                <div>
                                    <span class="text-[9px] font-mono text-slate-400 uppercase font-bold block">EXTRACTOR M-02</span>
                                    <h3 class="text-xs font-bold text-slate-800">Extractores & Techo</h3>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 text-[9px] font-mono font-bold bg-cyan-100 text-cyan-800 rounded">
                                Vel. Media
                            </span>
                        </div>

                        <!-- Selector de Velocidad -->
                        <div class="py-2 space-y-1">
                            <span class="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">VELOCIDAD DEL EXTRACTOR</span>
                            <div class="grid grid-cols-4 gap-1 text-xs font-semibold">
                                <button type="button" onclick="setExtractorSpeed('OFF', this)" class="py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">OFF</button>
                                <button type="button" onclick="setExtractorSpeed('Baja', this)" class="py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">Baja</button>
                                <button type="button" onclick="setExtractorSpeed('Media', this)" class="py-1 rounded bg-emerald-700 text-white shadow-xs">Media</button>
                                <button type="button" onclick="setExtractorSpeed('Alta', this)" class="py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600">Alta</button>
                            </div>
                        </div>

                        <!-- Ventila Cenital -->
                        <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 space-y-1 text-xs">
                            <div class="flex justify-between font-mono">
                                <span class="text-slate-600">Ventila Cenital Motorizada</span>
                                <span class="font-bold text-slate-800">45% Apertura</span>
                            </div>
                            <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div class="bg-cyan-600 h-full rounded-full" style="width: 45%;"></div>
                            </div>
                            <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                                <span>Ángulo servo: 40.5°</span>
                                <button type="button" onclick="showNotification('Calibrando servomotor cenital #3...', 'info')" class="text-emerald-700 font-semibold hover:underline flex items-center gap-1">
                                    <i data-lucide="sliders" class="w-3 h-3"></i>
                                    <span>Calibrar</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-slate-100 text-[10px] text-slate-500 font-mono">
                        <i data-lucide="zap" class="w-3 h-3 inline mr-1 text-amber-500"></i>
                        Regla: Disparo si Temp &gt; 26°C o CO₂ &gt; 1200 ppm.
                    </div>
                </div>

                <!-- ACTUADOR 4: NEBULIZADOR ULTRASÓNICO NB-01 (HUMIDIFICADOR) -->
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                            <div class="flex items-center gap-2">
                                <i data-lucide="cloud-rain" class="w-4 h-4 text-blue-500"></i>
                                <div>
                                    <span class="text-[9px] font-mono text-slate-400 uppercase font-bold block">NEBULIZADOR NB-01</span>
                                    <h3 class="text-xs font-bold text-slate-800">Humidificador</h3>
                                </div>
                            </div>
                            <span class="px-2 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-slate-600 rounded">
                                En Reposo
                            </span>
                        </div>

                        <!-- Nivel de Depósito de Agua -->
                        <div class="py-2 space-y-1">
                            <div class="flex justify-between text-xs font-mono">
                                <span class="text-slate-500 text-[10px] uppercase font-bold">Depósito Agua Desmineralizada</span>
                                <span class="font-extrabold text-blue-600">82% (Óptimo)</span>
                            </div>
                            <div class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                <div class="bg-blue-500 h-full rounded-full" style="width: 82%;"></div>
                            </div>
                            <div class="flex justify-between text-[10px] text-slate-400 font-mono">
                                <span>Capacidad: 50 Litros</span>
                                <span>Autonomía est: 4 días</span>
                            </div>
                        </div>

                        <div class="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-600 leading-snug">
                            <p class="font-semibold text-slate-800">Ambiente equilibrado:</p>
                            <p class="text-[10px] text-slate-500">Humedad Relativa actual 62% HR (Set: 60-70%).</p>
                        </div>
                    </div>

                    <div class="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                        <div>
                            <span class="font-bold text-slate-700 block text-[11px]">Modo de Operación</span>
                            <span class="text-[10px] font-mono text-emerald-700 font-bold">PID Automático</span>
                        </div>
                        <button type="button" onclick="showNotification('Modo cambiado a Mando Manual directo', 'info')" class="px-2.5 py-1 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors uppercase font-mono">
                            Cambiar a Manual
                        </button>
                    </div>
                </div>

            </div>

            <!-- Sección: Tabla de Reglas de Automatización de Lógica Difusa -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <i data-lucide="cpu" class="w-4 h-4 text-emerald-600"></i>
                            <span>Reglas de Automatización de Lógica Difusa</span>
                        </h3>
                        <p class="text-xs text-slate-500">Políticas activas que evalúan matrices ambientales multi-sensor cada 5 segundos para control autónomo.</p>
                    </div>

                    <button type="button" onclick="openAddRuleModal()" class="px-3.5 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
                        <i data-lucide="plus" class="w-3.5 h-3.5"></i>
                        <span>+ Añadir Nueva Regla / Escenario</span>
                    </button>
                </div>

                <!-- Tabla de Reglas -->
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse">
                        <thead>
                            <tr class="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                                <th class="py-2.5 px-3">Identificador</th>
                                <th class="py-2.5 px-3">Nombre de la Regla</th>
                                <th class="py-2.5 px-3">Condición Lógica</th>
                                <th class="py-2.5 px-3">Acción Ejecutada</th>
                                <th class="py-2.5 px-3">Prioridad</th>
                                <th class="py-2.5 px-3">Estado</th>
                                <th class="py-2.5 px-3 text-right">Operación</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-mono text-[11px]">
                            <!-- Regla 1 -->
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="py-3 px-3 font-bold text-slate-700">#R-01</td>
                                <td class="py-3 px-3 font-sans">
                                    <span class="font-bold text-slate-800 block">Control Térmico por Ventilación</span>
                                    <span class="text-[10px] text-slate-500">Ciclo de extracción forzada</span>
                                </td>
                                <td class="py-3 px-3 text-slate-600">
                                    <code class="text-cyan-700 font-bold">Temp_Aire &gt; 26.0°C OR CO2 &gt; 1200 ppm</code>
                                </td>
                                <td class="py-3 px-3 text-slate-700">Apertura Ventila 45% + Extractor Vel. Media</td>
                                <td class="py-3 px-3">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Alta</span>
                                </td>
                                <td class="py-3 px-3">
                                    <span class="text-emerald-700 font-bold flex items-center gap-1">
                                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        Armada
                                    </span>
                                </td>
                                <td class="py-3 px-3 text-right font-sans">
                                    <div class="flex items-center justify-end gap-2 text-slate-400">
                                        <button type="button" title="Editar regla" onclick="showNotification('Editor de regla #R-01 abierto', 'info')" class="hover:text-slate-700"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
                                        <button type="button" title="Pausar regla" onclick="showNotification('Regla #R-01 pausada temporalmente', 'warning')" class="hover:text-rose-600"><i data-lucide="power" class="w-3.5 h-3.5"></i></button>
                                    </div>
                                </td>
                            </tr>

                            <!-- Regla 2 -->
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="py-3 px-3 font-bold text-slate-700">#R-02</td>
                                <td class="py-3 px-3 font-sans">
                                    <span class="font-bold text-slate-800 block">Humectación por Umbral Capacitivo</span>
                                    <span class="text-[10px] text-slate-500">Seguridad radicular continua</span>
                                </td>
                                <td class="py-3 px-3 text-slate-600">
                                    <code class="text-amber-700 font-bold">Humedad_Suelo &lt; 60% DURANTE t &gt; 15 min</code>
                                </td>
                                <td class="py-3 px-3 text-slate-700">Pulso Solenoide EV-01 por 5 minutos (10 L)</td>
                                <td class="py-3 px-3">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800">Crítica</span>
                                </td>
                                <td class="py-3 px-3">
                                    <span class="text-emerald-700 font-bold flex items-center gap-1">
                                        <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                                        Activa
                                    </span>
                                </td>
                                <td class="py-3 px-3 text-right font-sans">
                                    <div class="flex items-center justify-end gap-2 text-slate-400">
                                        <button type="button" title="Editar regla" onclick="showNotification('Editor de regla #R-02 abierto', 'info')" class="hover:text-slate-700"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
                                        <button type="button" title="Pausar regla" onclick="showNotification('Regla #R-02 pausada', 'warning')" class="hover:text-rose-600"><i data-lucide="power" class="w-3.5 h-3.5"></i></button>
                                    </div>
                                </td>
                            </tr>

                            <!-- Regla 3 -->
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="py-3 px-3 font-bold text-slate-700">#R-03</td>
                                <td class="py-3 px-3 font-sans">
                                    <span class="font-bold text-slate-800 block">Fotoperiodo Suplementario según Lux Natural</span>
                                    <span class="text-[10px] text-slate-500">Compensación por nubosidad exterior</span>
                                </td>
                                <td class="py-3 px-3 text-slate-600">
                                    <code class="text-slate-700 font-bold">Radiacion_Ext &lt; 300 W/m² AND Hora en [06:00, 20:00]</code>
                                </td>
                                <td class="py-3 px-3 text-slate-700">Ajustar LED PWM a 65% intensidad</td>
                                <td class="py-3 px-3">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">Normal</span>
                                </td>
                                <td class="py-3 px-3">
                                    <span class="text-slate-600 font-bold flex items-center gap-1">
                                        <span class="w-2 h-2 rounded-full bg-slate-400"></span>
                                        Programada
                                    </span>
                                </td>
                                <td class="py-3 px-3 text-right font-sans">
                                    <div class="flex items-center justify-end gap-2 text-slate-400">
                                        <button type="button" title="Editar regla" onclick="showNotification('Editor de regla #R-03 abierto', 'info')" class="hover:text-slate-700"><i data-lucide="edit-3" class="w-3.5 h-3.5"></i></button>
                                        <button type="button" title="Pausar regla" onclick="showNotification('Regla #R-03 pausada', 'warning')" class="hover:text-rose-600"><i data-lucide="power" class="w-3.5 h-3.5"></i></button>
                                    </div>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <!-- Fila Inferior: Watchdog HW de Fallo Seguro -->
            <div class="p-4 bg-slate-900 text-slate-300 rounded-xl border border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
                <div class="flex items-center gap-2 text-amber-400">
                    <i data-lucide="shield-alert" class="w-4 h-4"></i>
                    <span>Watchdog HW activo: Si se pierde conectividad MQTT, los actuadores revierten a fallo seguro (Fail-Safe OFF).</span>
                </div>
                <div class="text-slate-500">
                    Última sincronización con PLC: hace 4s
                </div>
            </div>

        </main>
    </div>
</div>

<!-- Lógica Local de Actuadores -->
<script>
    /**
     * Alterna el modo global de automatización.
     * @param {boolean} isAuto Si el modo automático está encendido.
     */
    function toggleGlobalMode(isAuto) {
        showNotification(isAuto ? 'Modo Global: AUTOMÁTICO GENERAL activado' : 'Modo Global: MANDO MANUAL MANUAL forzado', isAuto ? 'success' : 'warning');
    }

    /**
     * Pausa temporalmente las rutinas por mantenimiento.
     */
    function toggleMaintenancePause() {
        showNotification('Pausa de mantenimiento por 30 minutos programada', 'warning');
    }

    /**
     * Dispara el paro general de emergencia sobre todos los relés.
     */
    function triggerEmergencyStop() {
        if (confirm('¿CONFIRMAR PARO GENERAL DE EMERGENCIA?\nTodos los actuadores, solenoides y motores se apagarán de inmediato.')) {
            document.getElementById('valve-status-badge').innerText = 'PARO SEGURIDAD';
            document.getElementById('valve-status-badge').className = 'px-2 py-0.5 text-[9px] font-mono font-bold bg-rose-100 text-rose-800 rounded';
            document.getElementById('valve-flow-display').innerText = '0.0 L/min';
            showNotification('PARO GENERAL EJECUTADO: Actuadores en estado desenergizado', 'error');
        }
    }

    /**
     * Selecciona la duración del riego manual en botones.
     */
    function selectWaterDuration(mins, btnElement) {
        const buttons = btnElement.parentElement.children;
        for (let b of buttons) {
            b.className = 'py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-700';
        }
        btnElement.className = 'py-1 rounded bg-emerald-700 text-white shadow-xs';
    }

    /**
     * Conmuta la válvula de riego principal.
     */
    let isWatering = false;
    function toggleMainWaterValve() {
        isWatering = !isWatering;
        const btn = document.getElementById('valve-main-btn');
        const badge = document.getElementById('valve-status-badge');
        const flow = document.getElementById('valve-flow-display');

        if (isWatering) {
            btn.innerHTML = '<i data-lucide="square" class="w-3.5 h-3.5"></i><span>Detener Riego</span>';
            btn.className = 'w-full py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors';
            badge.innerText = 'ABIERTA (4.2 L/m)';
            badge.className = 'px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded';
            flow.innerText = '4.2 L/min';
            showNotification('Válvula solenoide EV-01 activada', 'success');
        } else {
            btn.innerHTML = '<i data-lucide="play" class="w-3.5 h-3.5"></i><span>Iniciar Riego Manual</span>';
            btn.className = 'w-full py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center justify-center gap-1.5 transition-colors';
            badge.innerText = 'En Reposo';
            badge.className = 'px-2 py-0.5 text-[9px] font-mono font-bold bg-slate-100 text-slate-600 rounded';
            flow.innerText = '0.0 L/min';
            showNotification('Válvula solenoide EV-01 cerrada', 'info');
        }
        lucide.createIcons();
    }

    /**
     * Actualiza el valor del dimmer LED.
     * @param {number|string} val Porcentaje de potencia PWM.
     */
    function updateLedDimmer(val) {
        document.getElementById('led-dimmer-display').innerText = val + '%';
    }

    /**
     * Asigna la velocidad del extractor.
     */
    function setExtractorSpeed(speed, btnElement) {
        const buttons = btnElement.parentElement.children;
        for (let b of buttons) {
            b.className = 'py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600';
        }
        btnElement.className = 'py-1 rounded bg-emerald-700 text-white shadow-xs';
        showNotification(`Extractor M-02 fijado en velocidad ${speed}`, 'info');
    }

    /**
     * Despliega formulario para agregar una nueva regla.
     */
    function openAddRuleModal() {
        const name = prompt('Nombre de la nueva regla de automatización:');
        if (name) {
            showNotification(`Regla '${name}' añadida con prioridad Normal y estado Armada`, 'success');
        }
    }
</script>

<?php 
// Inclusión del cierre de documento y scripts globales
require_once __DIR__ . '/includes/footer.php'; 
?>
