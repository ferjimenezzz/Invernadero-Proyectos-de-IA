<?php
/**
 * ============================================================================
 * ARCHIVO: historico.php
 * PROPÓSITO: Módulo de Trazabilidad, Auditoría Agronómica y Reportes ISO-22000.
 *            Proporciona consulta histórica de telemetría multi-variable,
 *            activaciones de actuadores, desviaciones de umbral y generación
 *            de informes técnicos certificados con firma criptográfica.
 * VISTA EN PDF: Página 6 (Histórico de Registros y Reportes de Auditoría)
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ============================================================================
 */

// Título de la vista para la pestaña del navegador
$pageTitle = 'Histórico de Registros y Reportes de Auditoría ISO-22000';

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

        <!-- Contenido Específico de Auditoría e Históricos -->
        <main class="p-6 space-y-6">
            
            <!-- Franja Superior de Certificación ISO y Acciones de Exportación -->
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
                <div>
                    <div class="flex items-center gap-2 text-xs font-mono font-bold text-emerald-700">
                        <span class="px-2 py-0.5 rounded bg-emerald-100 uppercase">AUDITORÍA AGRONÓMICA</span>
                        <span>TRAZABILIDAD ISO-22000</span>
                    </div>
                    <h2 class="text-base font-bold text-slate-800 mt-1">Histórico de Registros y Reportes de Auditoría</h2>
                    <p class="text-xs text-slate-500">Trazabilidad completa de lecturas de telemetría, activaciones de actuadores, calibraciones y eventos del microclima en Zona 1 — Cultivo de Hortalizas.</p>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                    <!-- Botón Limpiar Filtros -->
                    <button type="button" onclick="resetAuditFilters()" class="px-3 py-2 text-xs font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors">
                        <i data-lucide="rotate-ccw" class="w-3.5 h-3.5 text-slate-400"></i>
                        <span>Limpiar Filtros</span>
                    </button>

                    <!-- Botón Generar Reporte PDF -->
                    <button type="button" onclick="focusPdfConfig()" class="px-3 py-2 text-xs font-bold bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
                        <i data-lucide="file-text" class="w-3.5 h-3.5"></i>
                        <span>Generar Reporte PDF</span>
                        <span class="px-1.5 py-0.2 bg-emerald-800 text-[10px] rounded text-emerald-200">4 filtros</span>
                    </button>

                    <!-- Botón Exportar CSV -->
                    <button type="button" onclick="exportCsvData()" class="px-3 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 rounded-lg shadow-xs flex items-center gap-1.5 transition-colors">
                        <i data-lucide="download" class="w-3.5 h-3.5 text-slate-500"></i>
                        <span>Exportar CSV</span>
                    </button>
                </div>
            </div>

            <!-- Fila: 4 Tarjetas de Métricas de Auditoría (KPIs) -->
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                
                <!-- KPI 1: Eventos Filtrados -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-bold uppercase tracking-wider text-[10px] text-slate-500">Eventos Filtrados</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-semibold bg-slate-100 text-slate-700">24h Trailing</span>
                    </div>
                    <div class="my-3">
                        <span class="text-3xl font-extrabold text-slate-800 font-mono tracking-tight">1,428</span>
                        <span class="text-xs text-slate-400 font-mono">/ 48,920 tot</span>
                    </div>
                    <div class="text-[11px] text-slate-500 font-mono border-t border-slate-100 pt-2">
                        2.9% del volumen global del nodo
                    </div>
                </div>

                <!-- KPI 2: Ciclos de Actuadores -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-bold uppercase tracking-wider text-[10px] text-slate-500">Ciclos de Actuadores</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Nominal</span>
                    </div>
                    <div class="my-3">
                        <span class="text-3xl font-extrabold text-slate-800 font-mono tracking-tight">34</span>
                        <span class="text-xs text-slate-500 font-mono">disparos</span>
                    </div>
                    <div class="flex justify-between text-[11px] text-slate-500 font-mono border-t border-slate-100 pt-2">
                        <span>28 Automáticos (PID/Reglas)</span>
                        <span>6 Manuales</span>
                    </div>
                </div>

                <!-- KPI 3: Desviaciones de Umbral -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-bold uppercase tracking-wider text-[10px] text-slate-500">Desviaciones de Umbral</span>
                        <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">3 Leves</span>
                    </div>
                    <div class="my-3">
                        <span class="text-3xl font-extrabold text-amber-600 font-mono tracking-tight">3</span>
                        <span class="text-xs text-slate-500 font-mono">eventos</span>
                    </div>
                    <div class="text-[11px] text-emerald-700 font-mono border-t border-slate-100 pt-2">
                        Sonda Suelo #1 (Humedad &lt; 60%) resuelto
                    </div>
                </div>

                <!-- KPI 4: Tasa de Conformidad -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div class="flex items-center justify-between text-xs">
                        <span class="font-bold uppercase tracking-wider text-[10px] text-slate-500">Tasa de Conformidad</span>
                        <span class="text-emerald-700 font-mono font-bold text-xs">+0.6%</span>
                    </div>
                    <div class="my-3">
                        <span class="text-3xl font-extrabold text-emerald-700 font-mono tracking-tight">98.4%</span>
                        <span class="text-xs text-slate-500 font-mono">en rango ideal</span>
                    </div>
                    <div class="text-[11px] text-slate-400 font-mono border-t border-slate-100 pt-2">
                        1.6% drift ambiental compensado
                    </div>
                </div>

            </div>

            <!-- Fila: Criterios de Segmentación y Filtrado -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div class="flex items-center gap-2">
                        <i data-lucide="filter" class="w-4 h-4 text-emerald-600"></i>
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800">Criterios de Segmentación y Filtrado</h3>
                    </div>
                    <span class="text-xs font-mono text-slate-500">Mostrando 1,428 registros filtrados (de 48,920 totales en almacenamiento Flash)</span>
                </div>

                <!-- Selectores de Filtrado Primario -->
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <label class="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1" for="filter-device">Dispositivo / Sensor / Actuador <span class="text-slate-300">hw_id</span></label>
                        <select id="filter-device" onchange="applyFilters()" class="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50">
                            <option value="all">Todos los dispositivos</option>
                            <option value="soil_1" selected>Sonda Humedad Suelo #1 (Cama A1)</option>
                            <option value="soil_2">Sonda Humedad Suelo #2 (Cama A2)</option>
                            <option value="dht22">Sensor Clima DHT22 (Principal)</option>
                            <option value="bh1750">Sensor Radiación BH1750</option>
                            <option value="valve_1">Válvula Riego #01</option>
                            <option value="fan_2">Extractor M-02</option>
                        </select>
                    </div>

                    <div>
                        <label class="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1" for="filter-date">Rango Temporal / Ventana <span class="text-slate-300">utc-5</span></label>
                        <input type="text" id="filter-date" value="Últimos 7 días (18 Oct — 24 Oct 2024)" class="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50">
                    </div>

                    <div>
                        <label class="block text-[10px] font-mono font-bold uppercase text-slate-400 mb-1" for="filter-circadian">Franja Horaria / Ciclo Circadiano <span class="text-slate-300">photoperiod</span></label>
                        <select id="filter-circadian" onchange="applyFilters()" class="w-full py-2 px-3 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50">
                            <option value="all" selected>Todo el día (00:00:00 — 23:59:59)</option>
                            <option value="light">Fotoperiodo Activo (06:00:00 — 20:00:00)</option>
                            <option value="dark">Fase Oscura (20:00:01 — 05:59:59)</option>
                        </select>
                    </div>
                </div>

                <!-- Pestañas de Severidad y Tipo de Registro -->
                <div class="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
                    <div class="flex items-center gap-2">
                        <span class="text-[10px] font-bold text-slate-400 uppercase font-mono mr-1">SEVERIDAD:</span>
                        <div class="flex items-center gap-1 bg-slate-100 p-1 rounded-lg font-semibold">
                            <button type="button" onclick="setSeverityTab('all', this)" class="px-3 py-1 rounded bg-white text-emerald-800 shadow-xs">Todos (1,428)</button>
                            <button type="button" onclick="setSeverityTab('telemetry', this)" class="px-3 py-1 rounded text-slate-600 hover:text-slate-900">Lectura Telemetría (1,340)</button>
                            <button type="button" onclick="setSeverityTab('manual', this)" class="px-3 py-1 rounded text-slate-600 hover:text-slate-900">Accionamiento Manual (6)</button>
                            <button type="button" onclick="setSeverityTab('auto', this)" class="px-3 py-1 rounded text-slate-600 hover:text-slate-900">Regla Automática (79)</button>
                            <button type="button" onclick="setSeverityTab('alert', this)" class="px-3 py-1 rounded text-slate-600 hover:text-slate-900">Alerta / Umbral (3)</button>
                        </div>
                    </div>
                    <span class="text-[11px] font-mono text-slate-500">Frecuencia de muestreo: 30s por canal</span>
                </div>
            </div>

            <!-- Fila: Configurador de Informe PDF Certificado + Vista Previa -->
            <div id="pdf-configurator-card" class="grid grid-cols-1 lg:grid-cols-3 gap-6">
                
                <!-- Panel de Configuración del Informe (2/3) -->
                <div class="lg:col-span-2 bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                    <div class="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div class="flex items-center gap-2">
                            <i data-lucide="file-check" class="w-4 h-4 text-emerald-600"></i>
                            <div>
                                <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800">Configurador de Informe PDF Certificado</h3>
                                <p class="text-[11px] text-slate-500">Generación de documento agronómico para auditorías, técnicos agrícolas y trazabilidad.</p>
                            </div>
                        </div>
                        <span class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-700">
                            Formato A4 • 300 DPI
                        </span>
                    </div>

                    <!-- Input Nombre de Archivo -->
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1" for="pdf-filename">Nombre de Archivo de Exportación</label>
                        <input type="text" id="pdf-filename" value="Reporte_Auditoria_Zona1_Oct2024.pdf" class="w-full py-2 px-3 text-xs font-mono border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50">
                    </div>

                    <!-- Opciones de Secciones a Incluir en el Documento -->
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs pt-1">
                        <label class="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5 cursor-pointer hover:bg-slate-100">
                            <input type="checkbox" checked class="mt-0.5 rounded text-emerald-600">
                            <div>
                                <span class="font-bold text-slate-800 block">Resumen Ejecutivo Climático</span>
                                <span class="text-[10px] text-slate-500">Medias, percentiles y DLI acumulado del ciclo.</span>
                            </div>
                        </label>

                        <label class="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5 cursor-pointer hover:bg-slate-100">
                            <input type="checkbox" checked class="mt-0.5 rounded text-emerald-600">
                            <div>
                                <span class="font-bold text-slate-800 block">Gráfica de Anomalías y Deriva</span>
                                <span class="text-[10px] text-slate-500">Curvas de estrés térmico e hídrico registradas.</span>
                            </div>
                        </label>

                        <label class="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5 cursor-pointer hover:bg-slate-100">
                            <input type="checkbox" checked class="mt-0.5 rounded text-emerald-600">
                            <div>
                                <span class="font-bold text-slate-800 block">Bitácora de Incidentes y Umbrales</span>
                                <span class="text-[10px] text-slate-500">Tiempos de respuesta y mitigación de alertas.</span>
                            </div>
                        </label>

                        <label class="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-start gap-2.5 cursor-pointer hover:bg-slate-100">
                            <input type="checkbox" checked class="mt-0.5 rounded text-emerald-600">
                            <div>
                                <span class="font-bold text-slate-800 block">Datos Crudos / Telemetría MQTT</span>
                                <span class="text-[10px] text-slate-500">Incluir payloads JSON en apéndice técnico.</span>
                            </div>
                        </label>
                    </div>

                    <!-- Botones de Acción -->
                    <div class="pt-2 border-t border-slate-100 flex items-center gap-3">
                        <button type="button" onclick="downloadPdfReport()" class="px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-sm flex items-center gap-1.5 transition-colors">
                            <i data-lucide="download" class="w-3.5 h-3.5"></i>
                            <span>Descargar PDF Filtrado</span>
                        </button>
                        <button type="button" onclick="showNotification('Reporte programado: Envío semanal configurado a elena@ejemplo.com', 'success')" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-lg border border-slate-200 flex items-center gap-1.5 transition-colors">
                            <i data-lucide="mail" class="w-3.5 h-3.5 text-slate-500"></i>
                            <span>Programar Envío por Correo</span>
                        </button>
                    </div>
                </div>

                <!-- Mini Vista Previa de Maquetación PDF (1/3) -->
                <div class="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col justify-between">
                    <div>
                        <div class="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
                            <span class="text-[10px] font-mono uppercase font-bold text-slate-400">VISTA PREVIA DE MAQUETACIÓN PDF</span>
                            <span class="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded font-bold">A4</span>
                        </div>

                        <!-- Hoja Simulada en Miniatura -->
                        <div class="p-3 bg-slate-50 border border-slate-300 rounded shadow-xs text-[10px] space-y-2 font-mono">
                            <div class="flex items-center justify-between border-b border-slate-200 pb-1">
                                <div>
                                    <span class="font-bold text-slate-800 block">AgroPulse IoT</span>
                                    <span class="text-[8px] text-slate-400 uppercase">CERTIFICADO AGRÓNOMO</span>
                                </div>
                                <div class="text-right text-[8px] text-slate-500">
                                    <span>DOC-AP-2024-9104</span>
                                    <span class="block">Fecha: 24/10/2024</span>
                                </div>
                            </div>

                            <div class="text-[9px] text-slate-600">
                                <div class="flex justify-between">
                                    <span>VPD & Curva Térmica (Zona 1)</span>
                                    <span class="text-emerald-700 font-bold">Ideal: 0.95 kPa</span>
                                </div>
                                <div class="h-8 bg-emerald-100/50 rounded flex items-center justify-center text-emerald-700 text-[8px] my-1">
                                    [ Gráfica de Telemetría Trailing 7D ]
                                </div>
                            </div>

                            <div class="grid grid-cols-2 gap-1 text-[8px]">
                                <div class="p-1 bg-white border border-slate-200 rounded">
                                    <span>Temp Promedio:</span>
                                    <strong class="block text-slate-800">23.8 °C ± 0.4</strong>
                                </div>
                                <div class="p-1 bg-white border border-slate-200 rounded">
                                    <span>Humedad Suelo:</span>
                                    <strong class="block text-emerald-700">63.1 % (Óptimo)</strong>
                                </div>
                            </div>

                            <div class="pt-1 border-t border-slate-200 text-[8px] space-y-0.5">
                                <div class="flex justify-between text-slate-500">
                                    <span>Riego EV-01 (15m)</span>
                                    <span>08:00</span>
                                    <span class="text-emerald-700 font-bold">Completado</span>
                                </div>
                                <div class="flex justify-between text-slate-500">
                                    <span>Sonda Suelo Umbral</span>
                                    <span>07:44</span>
                                    <span class="text-amber-700 font-bold">Ajustado</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <!-- Firma Digital Criptográfica -->
                    <div class="pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] font-mono">
                        <div>
                            <span class="font-bold text-slate-800 block">Dra. Elena Ramos</span>
                            <span class="text-[9px] text-slate-400">Firma Digital Criptográfica (SHA-256)</span>
                        </div>
                        <span class="px-2 py-0.5 text-[9px] bg-emerald-100 text-emerald-800 rounded font-bold">
                            Auditado OK
                        </span>
                    </div>
                </div>

            </div>

            <!-- Sección: Registro Cronológico de Actividad (Bitácora Detallada) -->
            <div class="bg-white p-5 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
                    <div>
                        <h3 class="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-2">
                            <i data-lucide="list" class="w-4 h-4 text-emerald-600"></i>
                            <span>Registro Cronológico de Actividad</span>
                        </h3>
                        <p class="text-xs text-slate-500">Eventos atómicos ordenados en orden cronológico inverso.</p>
                    </div>

                    <!-- Buscador en Vivo por Valor o Trigger -->
                    <div class="relative w-full sm:w-64">
                        <i data-lucide="search" class="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5"></i>
                        <input type="text" id="audit-search-input" oninput="filterAuditTable(this.value)" placeholder="Buscar por valor o trigger..." class="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 bg-slate-50">
                    </div>
                </div>

                <!-- Tabla de Trazabilidad -->
                <div class="overflow-x-auto">
                    <table class="w-full text-left text-xs border-collapse" id="audit-table">
                        <thead>
                            <tr class="border-b border-slate-200 text-slate-400 font-mono text-[10px] uppercase">
                                <th class="py-2.5 px-3">Marca de Tiempo (UTC-5)</th>
                                <th class="py-2.5 px-3">Origen / Dispositivo</th>
                                <th class="py-2.5 px-3">Tipo de Evento</th>
                                <th class="py-2.5 px-3">Parámetro / Detalle del Valor</th>
                                <th class="py-2.5 px-3">Disparador / Usuario</th>
                                <th class="py-2.5 px-3 text-right">Estado / Impacto</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-100 font-mono text-[11px]" id="audit-tbody">
                            
                            <!-- Fila 1 -->
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="py-3 px-3">
                                    <span class="font-bold text-slate-800 block">24 Oct 2024, 11:14:22</span>
                                    <span class="text-[10px] text-slate-400">Hace 2 minutos</span>
                                </td>
                                <td class="py-3 px-3 font-sans">
                                    <span class="font-bold text-slate-800 block">Sensor Clima DHT22</span>
                                    <span class="text-[10px] text-slate-500 font-mono">ID: DHT-Z1-01</span>
                                </td>
                                <td class="py-3 px-3">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">Lectura Periódica</span>
                                </td>
                                <td class="py-3 px-3 text-slate-700">
                                    <strong class="text-slate-800">24.2 °C • 62.8% HR</strong> <span class="text-emerald-700 ml-1">Rango Óptimo</span>
                                </td>
                                <td class="py-3 px-3 text-slate-600">ESP32-Gateway</td>
                                <td class="py-3 px-3 text-right font-sans">
                                    <span class="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">Normal</span>
                                </td>
                            </tr>

                            <!-- Fila 2 -->
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="py-3 px-3">
                                    <span class="font-bold text-slate-800 block">24 Oct 2024, 10:48:05</span>
                                    <span class="text-[10px] text-slate-400">Hace 28 minutos</span>
                                </td>
                                <td class="py-3 px-3 font-sans">
                                    <span class="font-bold text-slate-800 block">Válvula Riego #01</span>
                                    <span class="text-[10px] text-slate-500 font-mono">EV-CAN-102</span>
                                </td>
                                <td class="py-3 px-3">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800">Accionamiento Manual</span>
                                </td>
                                <td class="py-3 px-3 text-slate-700">
                                    Apertura pulso forzado <span class="text-slate-500 text-[10px]">(Duración: 15 min • 4.2 L/min)</span>
                                </td>
                                <td class="py-3 px-3 text-slate-800 font-semibold">Dra. Elena Ramos</td>
                                <td class="py-3 px-3 text-right font-sans">
                                    <span class="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">Control Ejecutado</span>
                                </td>
                            </tr>

                            <!-- Fila 3 -->
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="py-3 px-3">
                                    <span class="font-bold text-slate-800 block">24 Oct 2024, 09:15:00</span>
                                    <span class="text-[10px] text-slate-400">Hace 2 horas</span>
                                </td>
                                <td class="py-3 px-3 font-sans">
                                    <span class="font-bold text-slate-800 block">Extractor M-02</span>
                                    <span class="text-[10px] text-slate-500 font-mono">FAN-PWM-02</span>
                                </td>
                                <td class="py-3 px-3">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">Disparo Regla #R-02</span>
                                </td>
                                <td class="py-3 px-3 text-slate-700">
                                    Velocidad 65% PWM <span class="text-slate-500 text-[10px]">(Gradiente térmico solar &gt; 26°C)</span>
                                </td>
                                <td class="py-3 px-3 text-slate-600">Watchdog Automático</td>
                                <td class="py-3 px-3 text-right font-sans">
                                    <span class="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">Control Ejecutado</span>
                                </td>
                            </tr>

                            <!-- Fila 4 -->
                            <tr class="bg-amber-50/30 hover:bg-amber-50 transition-colors">
                                <td class="py-3 px-3">
                                    <span class="font-bold text-slate-800 block">24 Oct 2024, 07:44:11</span>
                                    <span class="text-[10px] text-slate-400">Hace 3h 30m</span>
                                </td>
                                <td class="py-3 px-3 font-sans">
                                    <span class="font-bold text-amber-900 block">Sonda Humedad Suelo #1</span>
                                    <span class="text-[10px] text-slate-500 font-mono">SOIL-CAP-01</span>
                                </td>
                                <td class="py-3 px-3">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">Alerta de Umbral Mínimo</span>
                                </td>
                                <td class="py-3 px-3 text-amber-800 font-bold">
                                    58.2 % VWC <span class="text-amber-700 font-normal text-[10px]">(Por debajo del umbral mín. 60.0%)</span>
                                </td>
                                <td class="py-3 px-3 text-slate-600">ESP32-Gateway</td>
                                <td class="py-3 px-3 text-right font-sans">
                                    <span class="px-2 py-0.5 text-[10px] font-bold bg-amber-100 text-amber-800 rounded">Advertencia</span>
                                </td>
                            </tr>

                            <!-- Fila 5 -->
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="py-3 px-3">
                                    <span class="font-bold text-slate-800 block">24 Oct 2024, 06:00:02</span>
                                    <span class="text-[10px] text-slate-400">Hace 5h 14m</span>
                                </td>
                                <td class="py-3 px-3 font-sans">
                                    <span class="font-bold text-slate-800 block">Sensor Radiación BH1750</span>
                                    <span class="text-[10px] text-slate-500 font-mono">LUX-I2C-04</span>
                                </td>
                                <td class="py-3 px-3">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">Transición Fotoperiodo</span>
                                </td>
                                <td class="py-3 px-3 text-slate-700">
                                    32,450 Lux • 420 µmol/m²/s PAR
                                </td>
                                <td class="py-3 px-3 text-slate-600">Reloj RTC DS3231</td>
                                <td class="py-3 px-3 text-right font-sans">
                                    <span class="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded">Normal</span>
                                </td>
                            </tr>

                            <!-- Fila 6 -->
                            <tr class="hover:bg-slate-50 transition-colors">
                                <td class="py-3 px-3">
                                    <span class="font-bold text-slate-800 block">23 Oct 2024, 22:00:00</span>
                                    <span class="text-[10px] text-slate-400">Ayer</span>
                                </td>
                                <td class="py-3 px-3 font-sans">
                                    <span class="font-bold text-slate-800 block">Controlador LED PWM</span>
                                    <span class="text-[10px] text-slate-500 font-mono">LED-DRV-01</span>
                                </td>
                                <td class="py-3 px-3">
                                    <span class="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">Apagado Programado</span>
                                </td>
                                <td class="py-3 px-3 text-slate-700">
                                    Canal Rojo/Azul: 0% <span class="text-slate-500 text-[10px]">(Entrada en fotoperiodo oscuro)</span>
                                </td>
                                <td class="py-3 px-3 text-slate-600">Watchdog Automático</td>
                                <td class="py-3 px-3 text-right font-sans">
                                    <span class="px-2 py-0.5 text-[10px] font-bold bg-blue-100 text-blue-800 rounded">Control Ejecutado</span>
                                </td>
                            </tr>

                        </tbody>
                    </table>
                </div>

                <!-- Paginación y Contador de Registros -->
                <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-100 text-xs">
                    <span class="text-slate-500 font-mono text-[11px]">Registros por página: <strong>50</strong> • Mostrando 1–50 de 1,428 registros</span>
                    
                    <div class="flex items-center gap-1 font-mono text-xs">
                        <button type="button" class="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center">&lt;</button>
                        <button type="button" class="w-7 h-7 rounded bg-emerald-700 text-white font-bold flex items-center justify-center">1</button>
                        <button type="button" class="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center">2</button>
                        <button type="button" class="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center">3</button>
                        <span class="px-1 text-slate-400">...</span>
                        <button type="button" class="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 flex items-center justify-center">29</button>
                        <button type="button" class="w-7 h-7 rounded border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 flex items-center justify-center">&gt;</button>
                    </div>
                </div>
            </div>

        </main>
    </div>
</div>

<!-- Lógica Local de Auditoría y Filtros -->
<script>
    /**
     * Aplica filtros basados en los controles del formulario superior.
     */
    function applyFilters() {
        const device = document.getElementById('filter-device').value;
        const circadian = document.getElementById('filter-circadian').value;
        showNotification(`Filtros aplicados: Dispositivo [${device}], Ciclo [${circadian}]`, 'info');
    }

    /**
     * Cambia la pestaña de severidad activa y filtra visualmente la tabla.
     */
    function setSeverityTab(severity, btnElement) {
        const buttons = btnElement.parentElement.children;
        for (let b of buttons) {
            b.className = 'px-3 py-1 rounded text-slate-600 hover:text-slate-900';
        }
        btnElement.className = 'px-3 py-1 rounded bg-white text-emerald-800 shadow-xs';

        const rows = document.querySelectorAll('#audit-tbody tr');
        rows.forEach(row => {
            if (severity === 'all') {
                row.style.display = '';
            } else if (severity === 'alert' && !row.innerText.includes('Alerta')) {
                row.style.display = 'none';
            } else if (severity === 'manual' && !row.innerText.includes('Manual')) {
                row.style.display = 'none';
            } else if (severity === 'auto' && !row.innerText.includes('Regla')) {
                row.style.display = 'none';
            } else if (severity === 'telemetry' && !row.innerText.includes('Periódica')) {
                row.style.display = 'none';
            } else {
                row.style.display = '';
            }
        });
    }

    /**
     * Filtra las filas de la tabla según el texto ingresado en el buscador.
     * @param {string} query Texto a contrastar.
     */
    function filterAuditTable(query) {
        const q = query.toLowerCase();
        const rows = document.querySelectorAll('#audit-tbody tr');
        rows.forEach(row => {
            const text = row.innerText.toLowerCase();
            row.style.display = text.includes(q) ? '' : 'none';
        });
    }

    /**
     * Reinicia todos los filtros de búsqueda a su estado predeterminado.
     */
    function resetAuditFilters() {
        document.getElementById('filter-device').value = 'soil_1';
        document.getElementById('filter-circadian').value = 'all';
        document.getElementById('audit-search-input').value = '';
        const rows = document.querySelectorAll('#audit-tbody tr');
        rows.forEach(row => row.style.display = '');
        showNotification('Filtros reiniciados a valores por defecto', 'info');
    }

    /**
     * Enfoca el panel de configuración de PDF.
     */
    function focusPdfConfig() {
        document.getElementById('pdf-configurator-card').scrollIntoView({ behavior: 'smooth' });
    }

    /**
     * Descarga el reporte agronómico generado en PDF.
     */
    function downloadPdfReport() {
        const filename = document.getElementById('pdf-filename').value || 'Reporte_AgroPulse.pdf';
        showNotification(`Generando "${filename}" con hash SHA-256 criptográfico...`, 'info');
        
        setTimeout(() => {
            // Generar archivo de texto simulando PDF exportado
            const content = `AGROPULSE IOT - CERTIFICADO DE AUDITORÍA AGRONÓMICA ISO-22000\nDOC: DOC-AP-2024-9104\nAuditor: Dra. Elena Ramos\nZona: Zona 1 Cultivo de Hortalizas\nTotal Registros: 1,428\nTasa Conformidad: 98.4%\nFirma Digital: 8f92b76e104acbd3291845fa8b36e09341725b3901a84f\n`;
            const blob = new Blob([content], { type: 'application/pdf' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            a.click();
            showNotification(`Descarga completada: ${filename}`, 'success');
        }, 1000);
    }

    /**
     * Exporta los datos de auditoría a CSV.
     */
    function exportCsvData() {
        const csv = "Marca_Tiempo,Dispositivo,Tipo_Evento,Parametro_Valor,Disparador,Estado\n" +
            "2024-10-24 11:14:22,DHT-Z1-01,Lectura Periodica,24.2 C 62.8% HR,ESP32-Gateway,Normal\n" +
            "2024-10-24 10:48:05,EV-CAN-102,Accionamiento Manual,Apertura 15m 4.2 L/min,Dra. Elena Ramos,Ejecutado\n" +
            "2024-10-24 09:15:00,FAN-PWM-02,Disparo Regla #R-02,65% PWM Temp > 26C,Watchdog,Ejecutado\n" +
            "2024-10-24 07:44:11,SOIL-CAP-01,Alerta Umbral,58.2% VWC,ESP32-Gateway,Advertencia\n";
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'Auditoria_Zona1_' + new Date().toISOString().slice(0, 10) + '.csv';
        a.click();
        showNotification('Bitácora exportada en formato CSV', 'success');
    }

    // Si viene el parámetro ?filtro=alertas en la URL, aplicar filtro inmediatamente
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('filtro') === 'alertas') {
        setTimeout(() => {
            const alertBtn = document.querySelectorAll('.bg-slate-100 button')[4];
            if (alertBtn) setSeverityTab('alert', alertBtn);
        }, 200);
    }
</script>

<?php 
// Inclusión del cierre de documento y scripts globales
require_once __DIR__ . '/includes/footer.php'; 
?>
