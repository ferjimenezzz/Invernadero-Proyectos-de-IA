<?php
/**
 * ============================================================================
 * ARCHIVO: conectividad.php
 * PROPÓSITO: Panel de Administración de Conectividad, Hardware y Gateway IoT.
 *            Gestiona la configuración del broker MQTT, túneles WebSocket,
 *            inventario de microcontroladores ESP32 y LoRaWAN, y ofrece una
 *            consola interactiva para análisis de tramas crudas serializadas.
 * VISTA EN PDF: Páginas 2 y 7 (Conectividad, Hardware y Gateway IoT)
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ============================================================================
 */

// Título de la vista para la cabecera HTML
$pageTitle = 'Conectividad, Hardware y Gateway IoT';

// Cargar la cabecera base compartida
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

        <!-- Contenido Específico del Módulo de Hardware -->
        <main class="p-6 space-y-6">
            
            <!-- Franja Superior de Estado de Subred Industrial -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                    <div class="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700">
                        <span class="px-2 py-0.5 rounded bg-emerald-100 uppercase">SUBRED INDUSTRIAL</span>
                        <span>Nodo Mesh v4</span>
                    </div>
                    <h2 class="text-base font-bold text-slate-800 mt-1">Conectividad, Hardware y Gateway IoT</h2>
                    <p class="text-xs text-slate-500">Administración de microcontroladores ESP32, broker MQTT, túneles WebSocket y configuración de red local para microclima autónomo.</p>
                </div>

                <div class="flex items-center gap-6 text-xs font-mono">
                    <div class="text-right">
                        <span class="text-slate-400 block text-[10px]">Nodos Activos</span>
                        <span class="text-emerald-700 font-bold flex items-center gap-1">
                            <i data-lucide="cpu" class="w-3.5 h-3.5"></i>
                            3 / 3 Online
                        </span>
                    </div>
                    <div class="text-right">
                        <span class="text-slate-400 block text-[10px]">Loop Telemetría</span>
                        <span class="text-slate-700 font-bold flex items-center gap-1">
                            <i data-lucide="clock" class="w-3.5 h-3.5 text-amber-500"></i>
                            1,000 ms
                        </span>
                    </div>
                </div>
            </div>

            <!-- Selector de Modo de Operación del Bus de Campo -->
            <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <div class="flex items-center gap-2">
                        <i data-lucide="git-branch" class="w-4 h-4 text-emerald-600"></i>
                        <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Modo de Operación del Bus</h3>
                        <span class="px-2 py-0.5 text-[10px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded">
                            • Conectado
                        </span>
                    </div>
                    <p class="text-xs text-slate-500 mt-0.5">Selecciona el origen de los flujos de datos para el motor de control físico</p>
                </div>

                <!-- Botones de Modo: Real vs Demo -->
                <div class="flex items-center gap-2">
                    <button type="button" id="btn-mode-real" onclick="setBusMode('real')" class="px-3.5 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all bg-emerald-700 text-white border-emerald-700 shadow-xs">
                        <i data-lucide="radio" class="w-3.5 h-3.5"></i>
                        <span>Modo Real (API / WS / MQTT)</span>
                    </button>
                    <button type="button" id="btn-mode-demo" onclick="setBusMode('demo')" class="px-3.5 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200">
                        <i data-lucide="sliders" class="w-3.5 h-3.5 text-slate-500"></i>
                        <span>Modo Demo Simulado</span>
                    </button>
                </div>
            </div>

            <!-- Fila: Configuración del Servidor Central & Métricas de Red -->
            <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- Parámetros del Servidor y Broker MQTT (2/3 de ancho) -->
                <div class="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div class="flex items-center gap-2">
                            <i data-lucide="server" class="w-4 h-4 text-emerald-600"></i>
                            <div>
                                <h3 class="text-xs font-bold text-slate-800 uppercase tracking-wider">Servidor Central & Broker MQTT</h3>
                                <p class="text-[11px] text-slate-500">Parámetros de conexión de la estación base y túneles persistentes</p>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700 border border-slate-200">
                            Mesh Local
                        </span>
                    </div>

                    <!-- Input: URL Base de la API REST -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1" for="api-base-url">URL Base de la API REST (Microservicio Express / Edge Gateway)</label>
                        <div class="flex gap-2">
                            <div class="relative flex-1">
                                <span class="absolute left-3 top-2.5 text-slate-400 font-mono text-xs">HTTP</span>
                                <input type="text" id="api-base-url" value="http://192.168.1.100:3000" class="w-full pl-14 pr-3 py-2 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none bg-slate-50">
                            </div>
                            <button type="button" onclick="testApiEndpoint()" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
                                <i data-lucide="check" class="w-3.5 h-3.5"></i>
                                <span>Guardar & Probar</span>
                            </button>
                        </div>
                    </div>

                    <!-- Grid de Parámetros MQTT y WebSocket -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                        <!-- Host MQTT -->
                        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Broker MQTT Host</span>
                            <div class="font-mono text-xs font-bold text-slate-800 my-1 flex items-center justify-between">
                                <span>mqtt://192.168.1.100:1883</span>
                                <button type="button" onclick="copyText('mqtt://192.168.1.100:1883')" class="text-slate-400 hover:text-slate-600">
                                    <i data-lucide="copy" class="w-3 h-3"></i>
                                </button>
                            </div>
                            <span class="text-[10px] text-slate-500 block">Protocolo v3.1.1 — Sin TLS (LAN Privada)</span>
                        </div>

                        <!-- Tópico Raíz -->
                        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Topic Raíz de Ingesta</span>
                            <div class="font-mono text-xs font-bold text-emerald-700 my-1 flex items-center justify-between">
                                <span>invernadero/zona1/#</span>
                                <span class="px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded text-[9px]">#</span>
                            </div>
                            <span class="text-[10px] text-slate-500 block">Suscripción wildcard multidifusión activa</span>
                        </div>

                        <!-- Túnel WebSocket -->
                        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200">
                            <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Túnel WebSocket Bidireccional</span>
                            <div class="flex items-center justify-between my-1">
                                <span class="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                    <span class="w-2 h-2 rounded-full bg-emerald-500"></span>
                                    Estado: Conectado
                                </span>
                                <span class="text-[10px] font-mono text-slate-500">(Ping: 24 ms)</span>
                            </div>
                            <button type="button" onclick="executePingDiagnostic()" class="text-[10px] font-bold text-emerald-700 hover:underline flex items-center gap-1 pt-1">
                                <i data-lucide="activity" class="w-3 h-3"></i>
                                <span>Ejecutar Ping de Diagnóstico</span>
                            </button>
                        </div>

                        <!-- QoS y Retain Flag -->
                        <div class="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                            <div>
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">QoS Primario</span>
                                <span class="font-mono text-xs font-bold text-slate-800 mt-1 block">Nivel 1 (At Least Once)</span>
                            </div>
                            <div class="text-right">
                                <span class="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Retain Flag</span>
                                <span class="font-mono text-xs font-bold text-emerald-700 mt-1 block">Activo (Último Estado)</span>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Métricas de Enlace y Paquetes de Red (1/3 de ancho) -->
                <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4 flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between text-xs border-b border-slate-100 pb-2">
                            <span class="font-bold uppercase tracking-wider text-slate-500 text-[10px]">Fiabilidad de Enlace de Red</span>
                            <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">100% Sin Pérdida</span>
                        </div>

                        <div class="my-4">
                            <span class="text-3xl font-extrabold text-slate-800 font-mono tracking-tight">142,890</span>
                            <span class="text-xs font-semibold text-slate-500 font-mono">paquetes RX</span>
                            <p class="text-[11px] text-slate-500 mt-1 leading-snug">
                                Cero colisiones detectadas en el socket TCP durante las últimas 72 horas operacionales continuas.
                            </p>
                        </div>
                    </div>

                    <!-- Gráfica de Barras de Tasa de Ingesta -->
                    <div>
                        <div class="flex items-center justify-between text-xs font-mono text-slate-500 mb-2">
                            <span>Tasa de Ingesta MQTT</span>
                            <strong class="text-slate-800">14.8 pkt/s</strong>
                        </div>
                        <div class="flex items-end gap-1.5 h-14 bg-slate-50 p-2 rounded-lg border border-slate-100">
                            <div class="w-1/6 bg-emerald-500 rounded-xs" style="height: 40%;"></div>
                            <div class="w-1/6 bg-emerald-600 rounded-xs" style="height: 65%;"></div>
                            <div class="w-1/6 bg-emerald-500 rounded-xs" style="height: 55%;"></div>
                            <div class="w-1/6 bg-emerald-700 rounded-xs" style="height: 85%;"></div>
                            <div class="w-1/6 bg-emerald-600 rounded-xs" style="height: 70%;"></div>
                            <div class="w-1/6 bg-emerald-500 rounded-xs" style="height: 60%;"></div>
                        </div>
                    </div>
                </div>

            </div>

            <!-- Fila: Nodos de Hardware Conectados (3 Microcontroladores de Campo) -->
            <div class="space-y-4">
                <div class="flex items-center justify-between">
                    <h3 class="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                        <i data-lucide="cpu" class="w-4 h-4 text-emerald-600"></i>
                        <span>Nodos de Hardware Conectados (3)</span>
                    </h3>
                    <button type="button" onclick="scanArpNetwork()" class="px-3 py-1.5 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors">
                        <i data-lucide="refresh-cw" class="w-3.5 h-3.5 text-slate-500"></i>
                        <span>Escanear Red ARP</span>
                    </button>
                </div>

                <!-- Grid de Tarjetas de los 3 Nodos -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
                    
                    <!-- NODO 1: ESP32 Gateway (Control Clima) -->
                    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div class="flex items-center gap-2">
                                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-800">ESP32 Gateway</h4>
                                        <p class="text-[10px] text-slate-500">Nodo Control Clima</p>
                                    </div>
                                </div>
                                <span class="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded">
                            • En Línea
                                </span>
                            </div>

                            <div class="py-2 space-y-1.5 text-[11px] font-mono">
                                <div>
                                    <span class="text-slate-400 block text-[9px]">Microcontrolador</span>
                                    <span class="text-slate-700 font-bold">ESP32-WROOM-32D (Dual Core 240MHz)</span>
                                </div>
                                <p class="text-[10px] text-slate-500">Memoria Flash: 4MB SPI • Free Heap: 184 KB</p>
                                
                                <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                                    <div>
                                        <span class="text-slate-400 text-[9px] block">Dirección IP</span>
                                        <span class="text-slate-700 font-semibold">192.168.1.142</span>
                                    </div>
                                    <div>
                                        <span class="text-slate-400 text-[9px] block">Dirección MAC</span>
                                        <span class="text-slate-700 font-semibold">24:6F:28:B4:7A:1C</span>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                                    <div>
                                        <span class="text-slate-400 text-[9px] block">Señal WiFi (RSSI):</span>
                                        <span class="text-emerald-700 font-bold">-58 dBm (Excelente 4/4)</span>
                                    </div>
                                    <div>
                                        <span class="text-slate-400 text-[9px] block">Tiempo Activo (Uptime):</span>
                                        <span class="text-slate-700">14 días, 06 horas</span>
                                    </div>
                                </div>
                                <div class="text-[10px] text-slate-500">Último Paquete: Hace 2 segundos</div>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <button type="button" onclick="rebootNode('ESP32 Gateway')" class="flex-1 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors flex items-center justify-center gap-1">
                                <i data-lucide="rotate-ccw" class="w-3 h-3"></i>
                                <span>Reiniciar</span>
                            </button>
                            <button type="button" onclick="syncNode('ESP32 Gateway')" class="flex-1 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors flex items-center justify-center gap-1">
                                <i data-lucide="refresh-cw" class="w-3 h-3"></i>
                                <span>Sincronizar</span>
                            </button>
                            <button type="button" onclick="focusConsole()" class="px-2.5 py-1.5 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded transition-colors">
                                <i data-lucide="terminal" class="w-3 h-3"></i>
                            </button>
                        </div>
                    </div>

                    <!-- NODO 2: ESP32 Satélite (Riego & Sensores Raíz) -->
                    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div class="flex items-center gap-2">
                                    <span class="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-800">ESP32 Satélite</h4>
                                        <p class="text-[10px] text-slate-500">Riego & Sensores Raíz</p>
                                    </div>
                                </div>
                                <span class="px-2 py-0.5 text-[9px] font-mono font-bold bg-emerald-100 text-emerald-800 rounded">
                            • En Línea
                                </span>
                            </div>

                            <div class="py-2 space-y-1.5 text-[11px] font-mono">
                                <div>
                                    <span class="text-slate-400 block text-[9px]">Microcontrolador</span>
                                    <span class="text-slate-700 font-bold">ESP32 DevKit V1 (Xtensa 32-bit)</span>
                                </div>
                                <p class="text-[10px] text-slate-500">GPIOs Asignados: Relays x4 • ADC ADS1115 I2C</p>
                                
                                <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                                    <div>
                                        <span class="text-slate-400 text-[9px] block">Dirección IP</span>
                                        <span class="text-slate-700 font-semibold">192.168.1.145</span>
                                    </div>
                                    <div>
                                        <span class="text-slate-400 text-[9px] block">Dirección MAC</span>
                                        <span class="text-slate-700 font-semibold">A4:CF:12:88:91:30</span>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                                    <div>
                                        <span class="text-slate-400 text-[9px] block">Señal WiFi (RSSI):</span>
                                        <span class="text-slate-700">-65 dBm (Buena señal)</span>
                                    </div>
                                    <div>
                                        <span class="text-slate-400 text-[9px] block">Tiempo Activo:</span>
                                        <span class="text-slate-700">5 días, 18 horas</span>
                                    </div>
                                </div>
                                <div class="flex items-center justify-between text-[10px] text-slate-600 pt-1">
                                    <span>Estado Relays:</span>
                                    <span class="text-emerald-700 font-bold">Válvula 1: Lista | Válvula 2: Lista</span>
                                </div>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <button type="button" onclick="showNotification('Test de Relays iniciado: Pulso de 1s ejecutado', 'info')" class="flex-1 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors flex items-center justify-center gap-1">
                                <i data-lucide="zap" class="w-3 h-3 text-amber-500"></i>
                                <span>Test Relays</span>
                            </button>
                            <button type="button" onclick="rebootNode('ESP32 Satélite')" class="flex-1 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors flex items-center justify-center gap-1">
                                <i data-lucide="rotate-ccw" class="w-3 h-3"></i>
                                <span>Reiniciar</span>
                            </button>
                            <button type="button" onclick="window.location.href='sensores.php';" class="flex-1 py-1.5 text-[11px] font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded transition-colors flex items-center justify-center gap-1">
                                <i data-lucide="sliders" class="w-3 h-3"></i>
                                <span>Calibrar ADC</span>
                            </button>
                        </div>
                    </div>

                    <!-- NODO 3: Estación Meteorológica Exterior (LoRaWAN Gateway) -->
                    <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-3 flex flex-col justify-between">
                        <div>
                            <div class="flex items-center justify-between border-b border-slate-100 pb-2">
                                <div class="flex items-center gap-2">
                                    <span class="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-800">Estación Meteorológica</h4>
                                        <p class="text-[10px] text-slate-500">Exterior • LoRaWAN Gateway</p>
                                    </div>
                                </div>
                                <span class="px-2 py-0.5 text-[9px] font-mono font-bold bg-amber-100 text-amber-800 rounded">
                            • En espera
                                </span>
                            </div>

                            <div class="py-2 space-y-1.5 text-[11px] font-mono">
                                <div>
                                    <span class="text-slate-400 block text-[9px]">Transceptor RF</span>
                                    <span class="text-slate-700 font-bold">Heltec LoRa ESP32 v3 (868 MHz)</span>
                                </div>
                                <p class="text-[10px] text-slate-500">SX1262 LoRa Node • Potencia TX +22dBm</p>
                                
                                <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                                    <div>
                                        <span class="text-slate-400 text-[9px] block">Frecuencia RF</span>
                                        <span class="text-slate-700 font-semibold">EU868 / SF7</span>
                                    </div>
                                    <div>
                                        <span class="text-slate-400 text-[9px] block">Intervalo TX</span>
                                        <span class="text-slate-700 font-semibold">Cada 10 min</span>
                                    </div>
                                </div>

                                <div class="grid grid-cols-2 gap-2 pt-1 border-t border-slate-100">
                                    <div>
                                        <span class="text-slate-400 text-[9px] block">Batería LiPo / Panel:</span>
                                        <span class="text-emerald-700 font-bold">4.12 V (96% Carga)</span>
                                    </div>
                                    <div>
                                        <span class="text-slate-400 text-[9px] block">Generación Fotovoltaica:</span>
                                        <span class="text-amber-600 font-bold">+140 mW (Luz diurna)</span>
                                    </div>
                                </div>
                                <div class="text-[10px] text-slate-500">Próxima ráfaga RF: En 04m:12s</div>
                            </div>
                        </div>

                        <div class="flex items-center gap-2 pt-2 border-t border-slate-100">
                            <button type="button" onclick="forceLoraTransmission()" class="flex-1 py-1.5 text-[11px] font-semibold bg-emerald-700 hover:bg-emerald-800 text-white rounded transition-colors flex items-center justify-center gap-1">
                                <i data-lucide="radio" class="w-3 h-3"></i>
                                <span>Forzar TX</span>
                            </button>
                            <button type="button" onclick="showNotification('Batería al 96% de capacidad. Estado de carga óptimo.', 'success')" class="flex-1 py-1.5 text-[11px] font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded transition-colors flex items-center justify-center gap-1">
                                <i data-lucide="battery" class="w-3 h-3 text-emerald-600"></i>
                                <span>Salud Batería</span>
                            </button>
                        </div>
                    </div>

                </div>
            </div>

            <!-- Fila: Consola de Tráfico de Paquetes MQTT (Live Stream) -->
            <div id="mqtt-terminal-card" class="bg-slate-950 text-slate-200 rounded-xl border border-slate-800 shadow-md p-5 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
                    <div>
                        <div class="flex items-center gap-2">
                            <i data-lucide="terminal" class="w-4 h-4 text-emerald-400"></i>
                            <h3 class="text-xs font-bold text-white uppercase tracking-wider font-mono">Consola de Tráfico de Paquetes MQTT (Live Stream)</h3>
                        </div>
                        <p class="text-[11px] text-slate-400 mt-0.5">Monitoreo crudo de telemetría serializada JSON recibida desde el bus de campo</p>
                    </div>

                    <!-- Controles de la Consola -->
                    <div class="flex items-center gap-4 text-xs font-mono">
                        <span class="text-slate-400 text-[10px] bg-slate-900 px-2 py-1 rounded border border-slate-800">
                            ttyUSB0 @ 115200 baud • mqtt://localhost:1883 <span class="text-emerald-400 font-bold">RX ESCUCHANDO</span>
                        </span>
                        <label class="flex items-center gap-1.5 text-slate-300 cursor-pointer text-[11px]">
                            <input type="checkbox" checked onchange="toggleAutoScroll(this.checked)" class="rounded text-emerald-500 bg-slate-800 border-slate-700">
                            <span>Auto-Scroll: ON</span>
                        </label>
                        <button type="button" onclick="clearMqttConsole()" class="px-2.5 py-1 text-[11px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded border border-slate-700 transition-colors">
                            Limpiar
                        </button>
                    </div>
                </div>

                <!-- Ventana Desplazable del Stream Serial -->
                <div id="mqtt-console-output" class="h-64 overflow-y-auto font-mono text-[11px] space-y-1 p-2 bg-black/40 rounded-lg border border-slate-900">
                    <div class="text-slate-500 py-1">// Estableciendo socket bidireccional con broker en mqtt://192.168.1.100:1883...</div>
                    <div class="text-emerald-500 py-0.5">[14:32:00.820] [WS PING] socket: heartbeat echo latency: 23.8ms - Link Nominal</div>
                </div>
            </div>

        </main>
    </div>
</div>

<!-- Lógica Local de Conectividad -->
<script>
    /**
     * Alterna visualmente el modo de operación del bus.
     * @param {'real'|'demo'} mode Modo a seleccionar.
     */
    function setBusMode(mode) {
        const btnReal = document.getElementById('btn-mode-real');
        const btnDemo = document.getElementById('btn-mode-demo');

        if (mode === 'real') {
            btnReal.className = 'px-3.5 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all bg-emerald-700 text-white border-emerald-700 shadow-xs';
            btnDemo.className = 'px-3.5 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
            showNotification('Bus configurado en MODO REAL (Broker MQTT & API)', 'success');
        } else {
            btnDemo.className = 'px-3.5 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all bg-emerald-700 text-white border-emerald-700 shadow-xs';
            btnReal.className = 'px-3.5 py-2 text-xs font-semibold rounded-lg border flex items-center gap-1.5 transition-all bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200';
            showNotification('Bus configurado en MODO DEMO SIMULADO', 'warning');
        }
    }

    /**
     * Prueba el endpoint REST configurado.
     */
    function testApiEndpoint() {
        const url = document.getElementById('api-base-url').value;
        showNotification(`Conexión exitosa con ${url} [HTTP 200 OK - 18ms]`, 'success');
    }

    /**
     * Simula ping al túnel WebSocket.
     */
    function executePingDiagnostic() {
        showNotification('Ping de diagnóstico enviado: Latencia 23.8ms. Paquetes perdidos: 0%', 'success');
    }

    /**
     * Copia texto al portapapeles.
     * @param {string} text Texto a copiar.
     */
    function copyText(text) {
        navigator.clipboard.writeText(text);
        showNotification('Copiado al portapapeles: ' + text, 'info');
    }

    /**
     * Escanea la red ARP local.
     */
    function scanArpNetwork() {
        showNotification('Escaneo ARP completado: 3 nodos ESP32/LoRa identificados.', 'success');
    }

    /**
     * Reinicia un nodo específico.
     * @param {string} nodeName Nombre del nodo.
     */
    function rebootNode(nodeName) {
        showNotification(`Comando de reinicio transmitido a ${nodeName}.`, 'warning');
    }

    /**
     * Sincroniza reloj RTC y parámetros del nodo.
     * @param {string} nodeName Nombre del nodo.
     */
    function syncNode(nodeName) {
        showNotification(`Sincronización de reloj RTC completada en ${nodeName}.`, 'success');
    }

    /**
     * Enfoca la consola MQTT.
     */
    function focusConsole() {
        document.getElementById('mqtt-terminal-card').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Fuerza ráfaga de transmisión LoRa.
     */
    function forceLoraTransmission() {
        showNotification('Transmisión forzada LoRaWAN (868 MHz) enviada con éxito.', 'success');
    }
</script>

<?php 
// Inclusión del cierre de documento y scripts globales
require_once __DIR__ . '/includes/footer.php'; 
?>
