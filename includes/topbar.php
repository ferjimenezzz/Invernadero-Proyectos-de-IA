<?php
/**
 * ============================================================================
 * ARCHIVO: includes/topbar.php
 * PROPÓSITO: Barra superior horizontal compartida en todas las vistas de gestión.
 *            Exhibe la zona agronómica seleccionada, los indicadores de enlace
 *            en tiempo real (Latencia, Broker MQTT) y el perfil del usuario activo.
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ============================================================================
 */
?>
<!-- Barra Superior de Diagnóstico y Estado en Vivo -->
<header class="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shrink-0 shadow-xs z-20">
    
    <!-- Zona de Monitoreo Activa y Beacon de Red -->
    <div class="flex items-center gap-6">
        <!-- Selector/Identificador de la Zona Agrícola -->
        <div class="flex items-center gap-2 text-slate-800 font-semibold text-xs bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200">
            <i data-lucide="map-pin" class="w-3.5 h-3.5 text-emerald-600"></i>
            <span>Zona 1 — Cultivo de Hortalizas</span>
            <i data-lucide="chevron-down" class="w-3 h-3 text-slate-400 cursor-pointer hover:text-slate-600"></i>
        </div>

        <!-- Indicadores de Enlace Telemétrico -->
        <div class="flex items-center gap-4 text-xs font-medium text-slate-600">
            <!-- Estado General del Enlace -->
            <div class="flex items-center gap-1.5">
                <span class="w-2 h-2 rounded-full bg-emerald-500 beacon-active"></span>
                <span class="font-semibold text-slate-700">En línea</span>
            </div>
            
            <span class="text-slate-300">|</span>

            <!-- Latencia del Socket / Túnel de Comunicación -->
            <div class="flex items-center gap-1.5 font-mono text-[11px] text-slate-500">
                <i data-lucide="zap" class="w-3 h-3 text-amber-500"></i>
                <span>Latencia: <strong class="text-slate-700">24ms</strong></span>
            </div>

            <span class="text-slate-300">|</span>

            <!-- Estado del Broker MQTT Local -->
            <div class="flex items-center gap-1.5 text-[11px]">
                <i data-lucide="radio" class="w-3 h-3 text-emerald-600"></i>
                <span>MQTT: <strong class="text-emerald-700">Conectado</strong></span>
            </div>
        </div>
    </div>

    <!-- Perfil del Operador Agrónomo y Alertas del Sistema -->
    <div class="flex items-center gap-4">
        <!-- Campana de Notificaciones con Badge de Alertas Pendientes -->
        <div class="relative cursor-pointer hover:opacity-80 transition-opacity" onclick="window.location.href='historico.php?filtro=alertas';">
            <button type="button" aria-label="Notificaciones" class="p-1.5 text-slate-500 hover:text-slate-700 rounded-full hover:bg-slate-100 relative">
                <i data-lucide="bell" class="w-4 h-4"></i>
                <!-- Badge de alerta no leída -->
                <span class="absolute top-0.5 right-0.5 w-4 h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    1
                </span>
            </button>
        </div>

        <span class="h-5 w-px bg-slate-200"></span>

        <!-- Ficha de Usuario: Agrónoma Principal -->
        <div class="flex items-center gap-3">
            <div class="text-right">
                <p class="text-xs font-bold text-slate-800 leading-tight">Dra. Elena Ramos</p>
                <p class="text-[10px] text-emerald-600 font-semibold tracking-wide">Agrónoma Principal</p>
            </div>
            <!-- Avatar con Iniciales y Borde Temático -->
            <div class="w-8 h-8 rounded-full bg-emerald-100 border-2 border-emerald-500 flex items-center justify-center text-emerald-800 font-bold text-xs shadow-xs">
                ER
            </div>
        </div>
    </div>
</header>
