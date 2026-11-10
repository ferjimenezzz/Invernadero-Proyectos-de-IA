<?php
/**
 * ============================================================================
 * ARCHIVO: index.php / login.php
 * PROPÓSITO: Portal de Autenticación, Registro y Diagnóstico Perimetral.
 *            Permite el inicio de sesión y creación de cuentas para agrónomos
 *            y operadores de campo, visualizando el estado del broker MQTT y
 *            certificaciones criptográficas de hardware.
 * VISTA EN PDF: Página 1 (Control Agronómico de Precisión - AgroPulse IoT)
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ============================================================================
 */

// Título de la página para la etiqueta HTML <title>
$pageTitle = 'Acceso & Registro | AgroPulse Precision Agronomy';

// Incluir cabecera base con Tailwind CSS y dependencias visuales
require_once __DIR__ . '/includes/header.php';
?>

<!-- Contenedor Maestro de la Pantalla de Acceso (Layout Dividido en 2 Columnas) -->
<main class="min-h-screen flex flex-col justify-between bg-slate-900 text-slate-100">

    <!-- Barra Superior de Acceso Rápido -->
    <header class="w-full px-8 py-4 border-b border-emerald-900/40 flex items-center justify-between bg-[#0a120e]">
        <!-- Marca y Logotipo AgroPulse -->
        <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-lg shadow-emerald-600/30">
                <i data-lucide="sprout" class="w-5 h-5"></i>
            </div>
            <div>
                <span class="text-sm font-extrabold tracking-wider text-white">AgroPulse</span>
                <span class="block text-[9px] font-mono tracking-widest text-emerald-400 font-semibold uppercase">Precision Agronomy IoT</span>
            </div>
        </div>

        <!-- Enlaces Secundarios y Beacon de Telemetría -->
        <nav class="flex items-center gap-6 text-xs font-medium text-slate-300">
            <a href="#login" onclick="switchAuthTab('login')" class="hover:text-emerald-400 transition-colors">Login</a>
            <a href="#register" onclick="switchAuthTab('register')" class="text-emerald-400 font-semibold hover:underline">Register</a>
            <a href="conectividad.php" class="hover:text-emerald-400 transition-colors">Device Setup</a>
            <div class="flex items-center gap-1.5 bg-emerald-950/80 px-2.5 py-1 rounded-full border border-emerald-500/30 text-emerald-300 text-[11px]">
                <span class="w-2 h-2 rounded-full bg-emerald-400 beacon-active"></span>
                <span>Telemetry Online</span>
            </div>
            <!-- Botón de Avatar de Acceso -->
            <div class="w-7 h-7 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300">
                <i data-lucide="user" class="w-4 h-4"></i>
            </div>
        </nav>
    </header>

    <!-- Cuerpo Central: 2 Paneles (Información Agronómica + Formulario de Acceso) -->
    <div class="flex-1 flex flex-col lg:flex-row max-w-7xl w-full mx-auto p-6 md:p-12 items-center justify-center gap-12">
        
        <!-- Panel Izquierdo: Resumen Operativo y Métricas de Misión Crítica -->
        <div class="w-full lg:w-1/2 space-y-8">
            
            <!-- Badge de Estado del Broker MQTT -->
            <div class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-900/40 border border-emerald-500/30 text-emerald-300 text-xs font-mono">
                <span class="w-2 h-2 rounded-full bg-emerald-400 beacon-active"></span>
                <span>BROKER MQTT V3.1.1 ACTIVO • 24ms</span>
            </div>

            <!-- Título y Subtítulo Agronómico -->
            <div class="space-y-3">
                <p class="text-xs font-mono font-bold tracking-widest text-emerald-400 uppercase">Telemetría de Misión Crítica</p>
                <h1 class="text-3xl md:text-5xl font-black tracking-tight text-white leading-tight">
                    Control Agronómico de <span class="text-emerald-400">Precisión</span>
                </h1>
                <p class="text-sm md:text-base text-slate-300 font-normal leading-relaxed">
                    Monitoreo continuo de déficit de presión de vapor (VPD), radiación PAR y dosificación fertirriego para módulos de invernadero automatizados.
                </p>
            </div>

            <!-- Métricas Clave de Eficiencia -->
            <div class="grid grid-cols-2 gap-4">
                <div class="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm">
                    <p class="text-2xl md:text-3xl font-extrabold text-white">+42%</p>
                    <p class="text-xs text-slate-400 mt-1">Eficiencia hídrica promedio</p>
                </div>
                <div class="p-4 rounded-xl bg-slate-800/60 border border-slate-700/60 backdrop-blur-sm">
                    <p class="text-2xl md:text-3xl font-extrabold text-white">99.98%</p>
                    <p class="text-xs text-slate-400 mt-1">Disponibilidad en campo</p>
                </div>
            </div>

            <!-- Ficha del Nodo Gateway Activo -->
            <div class="p-4 rounded-xl bg-emerald-950/40 border border-emerald-500/30 flex items-center justify-between">
                <div class="flex items-center gap-3">
                    <div class="p-2.5 rounded-lg bg-emerald-500/20 text-emerald-300">
                        <i data-lucide="radio" class="w-5 h-5"></i>
                    </div>
                    <div>
                        <p class="text-xs font-mono font-bold text-white">ESP32 Gateway Node #08</p>
                        <p class="text-[11px] font-mono text-emerald-400">VPD 1.18 kPa • PAR 840 µmol</p>
                    </div>
                </div>
                <span class="px-2.5 py-1 text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 rounded border border-emerald-500/40">
                    OPTIMAL
                </span>
            </div>

            <!-- Ficha de Seguridad Criptográfica y Firmware -->
            <div class="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-2 border-t border-slate-800">
                <div class="flex items-center gap-1.5">
                    <i data-lucide="shield-check" class="w-3.5 h-3.5 text-emerald-400"></i>
                    <span>Cifrado TLS 1.3 / mTLS en hardware</span>
                </div>
                <span>FW v2.4.8-LTS</span>
            </div>
        </div>

        <!-- Panel Derecho: Formulario Interactivo de Registro / Login -->
        <div class="w-full lg:w-1/2 max-w-md bg-white text-slate-800 p-8 rounded-2xl shadow-2xl border border-slate-200">
            
            <!-- Selector de Pestañas: Crear Cuenta vs Iniciar Sesión -->
            <div class="flex items-center justify-between border-b border-slate-200 pb-3 mb-6">
                <div class="flex gap-4">
                    <button id="tab-register-btn" type="button" onclick="switchAuthTab('register')" class="text-sm font-bold text-emerald-700 border-b-2 border-emerald-600 pb-2 transition-all">
                        Crear Cuenta
                    </button>
                    <button id="tab-login-btn" type="button" onclick="switchAuthTab('login')" class="text-sm font-semibold text-slate-400 hover:text-slate-600 pb-2 transition-all">
                        Iniciar Sesión
                    </button>
                </div>
                <div class="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-1 rounded">
                    <i data-lucide="building" class="w-3 h-3 text-emerald-600"></i>
                    <span>Portal Clúster Agrícola</span>
                </div>
            </div>

            <!-- FORMULARIO: REGISTRO (Por defecto) -->
            <form id="auth-register-form" action="dashboard.php" method="GET" class="space-y-4">
                <!-- Campo: Nombre Completo -->
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1" for="reg-name">Nombre Completo *</label>
                    <div class="relative">
                        <i data-lucide="user" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
                        <input type="text" id="reg-name" name="name" required placeholder="Elena Valenzuela" value="Elena Valenzuela" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                </div>

                <!-- Campo: Correo Electrónico -->
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1" for="reg-email">Correo Electrónico *</label>
                    <div class="relative">
                        <i data-lucide="mail" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
                        <input type="email" id="reg-email" name="email" required placeholder="elena@ejemplo.com" value="elena@ejemplo.com" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                </div>

                <!-- Campos de Contraseña (Doble Verificación) -->
                <div class="grid grid-cols-2 gap-3">
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1" for="reg-pass">Contraseña *</label>
                        <div class="relative">
                            <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute left-2.5 top-3"></i>
                            <input type="password" id="reg-pass" required value="Agronomy2026!" class="w-full pl-8 pr-2 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                        </div>
                    </div>
                    <div>
                        <label class="block text-xs font-bold text-slate-700 mb-1" for="reg-pass-conf">Confirmar *</label>
                        <div class="relative">
                            <i data-lucide="check-circle" class="w-4 h-4 text-slate-400 absolute left-2.5 top-3"></i>
                            <input type="password" id="reg-pass-conf" required value="Agronomy2026!" class="w-full pl-8 pr-2 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                        </div>
                    </div>
                </div>

                <!-- Indicador de Robustez de Contraseña -->
                <div class="space-y-1">
                    <div class="flex items-center justify-between text-[10px] text-slate-500 font-medium">
                        <span>Seguridad: Mínimo 8 caracteres</span>
                        <span class="text-emerald-600 font-semibold">Excelente</span>
                    </div>
                    <div class="w-full h-1 bg-slate-200 rounded-full flex gap-1">
                        <span class="w-1/3 bg-emerald-500 rounded-full"></span>
                        <span class="w-1/3 bg-emerald-500 rounded-full"></span>
                        <span class="w-1/3 bg-emerald-500 rounded-full"></span>
                    </div>
                </div>

                <!-- Aceptación de Términos -->
                <div class="flex items-start gap-2 pt-1">
                    <input type="checkbox" id="terms" required checked class="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300">
                    <label for="terms" class="text-[11px] text-slate-600 leading-tight">
                        Acepto los <a href="javascript:void(0)" onclick="alert('Términos del Servicio AgroPulse:\n- Acceso restringido a personal agronómico autorizado.\n- Telemetría encriptada bajo TLS 1.3 / mTLS.\n- Auditoría continua de conformidad ISO-22000.');" class="text-emerald-700 font-semibold underline">Términos del Servicio</a> y la política de privacidad.
                    </label>
                </div>

                <!-- Botón de Envío y Redirección -->
                <button type="submit" class="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                    <i data-lucide="user-plus" class="w-4 h-4"></i>
                    <span>Crear Cuenta</span>
                </button>
            </form>

            <!-- FORMULARIO: INICIAR SESIÓN (Alternativo) -->
            <form id="auth-login-form" action="dashboard.php" method="GET" class="space-y-4 hidden">
                <!-- Campo: Correo Electrónico -->
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1" for="login-email">Correo Electrónico *</label>
                    <div class="relative">
                        <i data-lucide="mail" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
                        <input type="email" id="login-email" name="login_email" placeholder="elena@ejemplo.com" value="elena@ejemplo.com" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                </div>

                <!-- Campo: Contraseña -->
                <div>
                    <label class="block text-xs font-bold text-slate-700 mb-1" for="login-pass">Contraseña *</label>
                    <div class="relative">
                        <i data-lucide="lock" class="w-4 h-4 text-slate-400 absolute left-3 top-3"></i>
                        <input type="password" id="login-pass" value="Agronomy2026!" class="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none">
                    </div>
                </div>

                <div class="flex items-center justify-between text-[11px]">
                    <label class="flex items-center gap-1.5 text-slate-600">
                        <input type="checkbox" checked class="rounded text-emerald-600 focus:ring-emerald-500 border-slate-300">
                        <span>Recordar sesión</span>
                    </label>
                    <a href="#" class="text-emerald-700 hover:underline font-semibold">¿Olvidaste tu contraseña?</a>
                </div>

                <!-- Botón de Inicio de Sesión Directo hacia Dashboard -->
                <button type="submit" class="w-full py-2.5 px-4 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2">
                    <i data-lucide="log-in" class="w-4 h-4"></i>
                    <span>Iniciar Sesión en AgroPulse</span>
                </button>
            </form>

            <!-- Pie de Formulario con Enlace Rápido -->
            <div class="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                <span id="auth-switch-text">¿Ya tienes una cuenta activa?</span>
                <button type="button" id="auth-switch-btn" onclick="toggleAuthMode()" class="text-emerald-700 font-bold hover:underline">
                    Inicia sesión aquí
                </button>
            </div>

            <!-- Protocolo LoRaWAN Ready -->
            <div class="mt-3 flex items-center justify-center gap-1.5 text-[10px] font-mono text-slate-400">
                <i data-lucide="radio" class="w-3 h-3 text-emerald-600"></i>
                <span>Gateway LoRaWAN 1.0.4 Ready</span>
            </div>
        </div>
    </div>

    <!-- Pie de Página Institucional -->
    <footer class="w-full px-8 py-4 border-t border-slate-800 text-slate-400 text-xs flex flex-col md:flex-row items-center justify-between gap-2 bg-[#0a120e]">
        <div>
            <span>AgroPulse IoT Engine v2.4.8-LTS</span>
            <span class="mx-2">•</span>
            <span>Field Gateway LoRaWAN 1.0.4</span>
        </div>
        <div class="flex items-center gap-6">
            <a href="conectividad.php" class="hover:text-emerald-400 transition-colors">System Status</a>
            <a href="#" class="hover:text-emerald-400 transition-colors">Privacy & Security</a>
            <a href="mailto:soporte@agropulse.io" class="hover:text-emerald-400 transition-colors">Agronomy Helpdesk</a>
        </div>
    </footer>
</main>

<!-- Lógica de Alternancia entre Registro y Login -->
<script>
    /**
     * Alterna la visualización entre la pestaña de registro y la de login.
     *
     * @param {'register'|'login'} mode Modo de autenticación seleccionado.
     */
    function switchAuthTab(mode) {
        const regForm = document.getElementById('auth-register-form');
        const loginForm = document.getElementById('auth-login-form');
        const regBtn = document.getElementById('tab-register-btn');
        const loginBtn = document.getElementById('tab-login-btn');
        const switchText = document.getElementById('auth-switch-text');
        const switchBtn = document.getElementById('auth-switch-btn');

        if (mode === 'login') {
            regForm.classList.add('hidden');
            loginForm.classList.remove('hidden');

            loginBtn.className = 'text-sm font-bold text-emerald-700 border-b-2 border-emerald-600 pb-2 transition-all';
            regBtn.className = 'text-sm font-semibold text-slate-400 hover:text-slate-600 pb-2 transition-all';

            switchText.innerText = '¿No tienes cuenta aún?';
            switchBtn.innerText = 'Regístrate aquí';
        } else {
            loginForm.classList.add('hidden');
            regForm.classList.remove('hidden');

            regBtn.className = 'text-sm font-bold text-emerald-700 border-b-2 border-emerald-600 pb-2 transition-all';
            loginBtn.className = 'text-sm font-semibold text-slate-400 hover:text-slate-600 pb-2 transition-all';

            switchText.innerText = '¿Ya tienes una cuenta activa?';
            switchBtn.innerText = 'Inicia sesión aquí';
        }
    }

    /**
     * Alterna cíclicamente el modo de autenticación al presionar el texto inferior.
     */
    function toggleAuthMode() {
        const isRegisterVisible = !document.getElementById('auth-register-form').classList.contains('hidden');
        switchAuthTab(isRegisterVisible ? 'login' : 'register');
    }
</script>

<?php 
// Inclusión del cierre de documento y utilidades globales
require_once __DIR__ . '/includes/footer.php'; 
?>
