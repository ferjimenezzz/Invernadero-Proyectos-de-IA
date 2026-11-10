/**
 * ============================================================================
 * ARCHIVO: assets/js/app.js
 * PROPÓSITO: Controlador lógico de interactividad del cliente para AgroPulse IoT.
 *            Gestiona simulación de telemetría en tiempo real, renderizado de
 *            curvas multivariables en Canvas, consola de paquetes MQTT, calibración
 *            analógica de 12 bits y control reactivo de actuadores.
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ============================================================================
 */

/**
 * Objeto maestro de estado global de la aplicación cliente.
 * Mantiene en memoria las lecturas y configuraciones para desacoplamiento con el backend.
 */
const AgroPulseState = {
    // Modo operativo del bus: 'real' o 'demo'
    operationMode: 'demo',
    // Frecuencia de actualización en milisegundos
    telemetryIntervalMs: 1500,
    // Estado de auto-refresco en Dashboard
    autoRefreshActive: true,
    // Buffer en vivo de lecturas climáticas
    telemetry: {
        tempAir: 24.2,
        humAir: 62.4,
        humSoil: 58.2,
        lux: 18500,
        tempSubstrate: 22.1,
        vpd: 1.12,
        dewPoint: 16.4,
        ec: 2.3,
        co2: 780
    },
    // Estado de actuadores
    actuators: {
        irrigationValve: { active: false, flowRate: 0.0, pressure: 2.4, duration: 5 },
        ledDimmer: { active: true, powerPct: 40 },
        extractorFan: { speed: 'Media', ceilingVentPct: 45 },
        fogger: { active: false, tankLevel: 82, mode: 'auto' },
        globalMode: 'auto'
    }
};

/**
 * Calcula el Déficit de Presión de Vapor (VPD) en kiloPascales (kPa).
 * Utiliza la ecuación de Tetens para presión de vapor saturada.
 *
 * @param {number} tempC Temperatura del aire en grados Celsius.
 * @param {number} humPct Humedad relativa en porcentaje (0 a 100).
 * @return {number} Valor de VPD calculado en kPa redondeado a 2 decimales.
 */
function calculateVPD(tempC, humPct) {
    // Presión de vapor de saturación según Tetens
    const vpsat = 0.61078 * Math.exp((17.27 * tempC) / (tempC + 237.3));
    // Presión de vapor real
    const vpair = vpsat * (humPct / 100.0);
    // Déficit resultante
    const vpd = vpsat - vpair;
    return Math.max(0, parseFloat(vpd.toFixed(2)));
}

/**
 * Calcula el Punto de Rocío (Dew Point) en grados Celsius.
 *
 * @param {number} tempC Temperatura del aire en grados Celsius.
 * @param {number} humPct Humedad relativa en porcentaje.
 * @return {number} Temperatura de punto de rocío en °C.
 */
function calculateDewPoint(tempC, humPct) {
    const a = 17.27;
    const b = 237.7;
    const alpha = ((a * tempC) / (b + tempC)) + Math.log(humPct / 100.0);
    const dew = (b * alpha) / (a - alpha);
    return parseFloat(dew.toFixed(1));
}

/**
 * ============================================================================
 * SECCIÓN: SIMULADOR DE CONSOLA MQTT (En conectividad.php)
 * ============================================================================
 */

let mqttStreamTimer = null;
let autoScrollConsole = true;

/**
 * Alterna el auto-scroll de la consola de paquetes crudos.
 *
 * @param {boolean} enabled Estado del checkbox de auto-scroll.
 */
function toggleAutoScroll(enabled) {
    autoScrollConsole = enabled;
}

/**
 * Limpia el texto acumulado en el panel de tráfico MQTT.
 */
function clearMqttConsole() {
    const consoleBox = document.getElementById('mqtt-console-output');
    if (consoleBox) {
        consoleBox.innerHTML = '<div class="text-slate-500 py-1">// Consola reiniciada. Esperando nuevas tramas serializadas...</div>';
    }
}

/**
 * Inicia la generación y recepción simulada de paquetes MQTT crudos en la consola.
 */
function initMqttConsoleStream() {
    const consoleBox = document.getElementById('mqtt-console-output');
    if (!consoleBox) return;

    // Detener timer previo si existiera
    if (mqttStreamTimer) clearInterval(mqttStreamTimer);

    // Muestra paquetes serializados cada 2.5 segundos
    mqttStreamTimer = setInterval(() => {
        const now = new Date();
        const timeStr = now.toTimeString().split(' ')[0] + '.' + String(now.getMilliseconds()).padStart(3, '0');
        
        // Paquetes representativos de los 3 nodos de campo
        const samplePackets = [
            {
                topic: 'invernadero/zona1/esp32_clima/telemetry',
                payload: {
                    node: 'esp32_01',
                    temp_c: parseFloat((24.0 + (Math.random() * 0.6 - 0.3)).toFixed(1)),
                    hum_pct: parseFloat((62.0 + (Math.random() * 0.8 - 0.4)).toFixed(1)),
                    vpd_kpa: parseFloat((1.10 + (Math.random() * 0.06 - 0.03)).toFixed(2)),
                    rssi: -58
                }
            },
            {
                topic: 'invernadero/zona1/esp32_riego/sensors',
                payload: {
                    node: 'esp32_riego',
                    moisture_ch1: parseFloat((58.0 + (Math.random() * 0.4 - 0.2)).toFixed(1)),
                    moisture_ch2: 64.0,
                    ec_ms: 2.3,
                    v_bat: 4.95
                }
            },
            {
                topic: 'invernadero/exterior/lora_meteo/packet',
                payload: {
                    devEUI: '70B3D57ED0056F82',
                    lux: Math.floor(18000 + Math.random() * 800),
                    wind_ms: 2.4,
                    solar_v: 4.12,
                    snr: 9.5
                }
            }
        ];

        // Seleccionar un paquete aleatorio
        const pkt = samplePackets[Math.floor(Math.random() * samplePackets.length)];
        
        // Crear elemento de línea de log con resaltado sintáctico
        const line = document.createElement('div');
        line.className = 'py-0.5 leading-relaxed font-mono text-[11px] hover:bg-slate-800/60 px-1 rounded';
        line.innerHTML = `
            <span class="text-slate-500">[${timeStr}]</span> 
            <span class="text-amber-400 font-semibold">[MQTT RX]</span> 
            <span class="text-cyan-400">topic: ${pkt.topic}</span>
            <div class="text-emerald-400 pl-4 break-all">${JSON.stringify(pkt.payload)}</div>
        `;

        consoleBox.appendChild(line);

        // Limitar buffer a 60 líneas para optimizar memoria en el cliente
        if (consoleBox.childNodes.length > 60) {
            consoleBox.removeChild(consoleBox.firstChild);
        }

        // Auto-scroll si está habilitado
        if (autoScrollConsole) {
            consoleBox.scrollTop = consoleBox.scrollHeight;
        }
    }, 2400);
}

/**
 * ============================================================================
 * SECCIÓN: CALIBRADOR ANALÓGICO ADC (En sensores.php)
 * ============================================================================
 */

/**
 * Recalcula en tiempo real el porcentaje de humedad basado en la lectura cruda ADC.
 * Fórmula de interpolación lineal calibrada: y = -0.0537x + 168.8 + offset
 *
 * @param {number|string} rawAdc Lectura analógica de 12 bits (0 a 4095).
 */
function updateCalibrationOutput(rawAdc) {
    const rawVal = parseInt(rawAdc, 10) || 0;
    const offsetInput = document.getElementById('cal-offset-input');
    const offset = offsetInput ? parseFloat(offsetInput.value) || 0 : 1.5;

    // Calcular mediante ecuación de calibración
    let converted = (-0.0537 * rawVal) + 168.8 + offset;
    converted = Math.max(0, Math.min(100, converted)); // Acotar a [0, 100]%

    // Actualizar elementos visuales en el DOM
    const rawLabel = document.getElementById('cal-raw-display');
    const convLabel = document.getElementById('cal-converted-display');
    const slider = document.getElementById('cal-adc-slider');

    if (rawLabel) rawLabel.innerText = `${rawVal} / 4095`;
    if (convLabel) convLabel.innerText = `${converted.toFixed(1)} %`;
    if (slider && slider.value !== String(rawVal)) slider.value = rawVal;
}

/**
 * ============================================================================
 * SECCIÓN: RENDERIZADOR DE GRÁFICA MULTIVARIABLE CANVAS (En dashboard.php)
 * ============================================================================
 */

/**
 * Dibuja la curva multivariable climática histórica en el elemento Canvas.
 *
 * @param {string} canvasId Identificador del elemento <canvas>.
 */
function renderMultivariableChart(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const width = canvas.parentElement.clientWidth;
    const height = 280;

    // Ajustar resolución retina
    canvas.width = width * window.devicePixelRatio;
    canvas.height = height * window.devicePixelRatio;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Limpiar canvas
    ctx.clearRect(0, 0, width, height);

    // Configurar márgenes
    const padX = 40;
    const padY = 30;
    const graphW = width - padX - 20;
    const graphH = height - padY * 2;

    // Puntos de datos de prueba para las 3 variables (1h a 7d)
    const timeLabels = ['10:00 AM', '10:15 AM', '10:30 AM', '10:45 AM', '11:00 AM', 'Ahora (11:14)'];
    const tempPoints = [23.1, 23.5, 24.0, 24.6, 24.4, 24.2]; // Temp en °C
    const humPoints = [66.0, 64.5, 63.8, 62.0, 61.5, 62.4];  // Humedad en %
    const soilPoints = [68.0, 66.5, 64.0, 61.2, 59.4, 58.2]; // Suelo en %

    // Dibujar rejilla horizontal de referencia
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    for (let i = 0; i <= 4; i++) {
        const y = padY + (graphH / 4) * i;
        ctx.beginPath();
        ctx.moveTo(padX, y);
        ctx.lineTo(width - 20, y);
        ctx.stroke();
    }
    ctx.setLineDash([]); // Restaurar línea sólida

    // Línea de Umbral Máximo Crítico 27°C (rojo suave)
    const yMaxCrit = padY + graphH * (1 - 0.75);
    ctx.strokeStyle = '#f43f5e';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 3]);
    ctx.beginPath();
    ctx.moveTo(padX, yMaxCrit);
    ctx.lineTo(width - 20, yMaxCrit);
    ctx.stroke();

    ctx.fillStyle = '#f43f5e';
    ctx.font = '10px "JetBrains Mono", monospace';
    ctx.fillText('Umbral Máx. 27°C', width - 110, yMaxCrit - 4);

    // Línea de Umbral Mínimo 60% Suelo (ámbar)
    const yMinCrit = padY + graphH * (1 - 0.40);
    ctx.strokeStyle = '#f59e0b';
    ctx.beginPath();
    ctx.moveTo(padX, yMinCrit);
    ctx.lineTo(width - 20, yMinCrit);
    ctx.stroke();
    ctx.fillText('Umbral Mín. 60%', width - 105, yMinCrit - 4);
    ctx.setLineDash([]);

    /**
     * Dibuja una serie de datos en el plano cartesiano.
     * @param {Array<number>} points Puntos numéricos.
     * @param {number} min Val mínimo del eje.
     * @param {number} max Val máximo del eje.
     * @param {string} color Color de trazo en hex.
     */
    function drawSeries(points, min, max, color) {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.beginPath();

        const stepX = graphW / (points.length - 1);
        points.forEach((val, index) => {
            const normY = (val - min) / (max - min);
            const x = padX + stepX * index;
            const y = padY + graphH * (1 - normY);

            if (index === 0) {
                ctx.moveTo(x, y);
            } else {
                ctx.lineTo(x, y);
            }
        });
        ctx.stroke();

        // Dibujar nodos atómicos circulares en cada punto
        points.forEach((val, index) => {
            const normY = (val - min) / (max - min);
            const x = padX + stepX * index;
            const y = padY + graphH * (1 - normY);

            ctx.fillStyle = '#ffffff';
            ctx.beginPath();
            ctx.arc(x, y, 4, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = color;
            ctx.beginPath();
            ctx.arc(x, y, 2.5, 0, Math.PI * 2);
            ctx.fill();
        });
    }

    // Trazo de Humedad de Suelo (Naranja #f59e0b)
    drawSeries(soilPoints, 40, 80, '#f59e0b');

    // Trazo de Humedad Relativa (Verde Esmeralda #059669)
    drawSeries(humPoints, 40, 80, '#059669');

    // Trazo de Temperatura del Aire (Cian #0284c7)
    drawSeries(tempPoints, 20, 30, '#0284c7');

    // Etiquetas del eje X (Marcas de tiempo)
    ctx.fillStyle = '#64748b';
    ctx.font = '10px Inter, sans-serif';
    ctx.textAlign = 'center';
    const stepX = graphW / (timeLabels.length - 1);
    timeLabels.forEach((label, i) => {
        const x = padX + stepX * i;
        ctx.fillText(label, x, height - 10);
    });
}

/**
 * Inicializador global al cargar cualquier vista.
 */
document.addEventListener('DOMContentLoaded', () => {
    // Si la consola MQTT existe en la vista actual, inicializarla
    if (document.getElementById('mqtt-console-output')) {
        initMqttConsoleStream();
    }

    // Si el canvas de gráfica existe, renderizar
    if (document.getElementById('telemetryHistoryChart')) {
        renderMultivariableChart('telemetryHistoryChart');
        // Redibujar en resize para responsividad fluida
        window.addEventListener('resize', () => renderMultivariableChart('telemetryHistoryChart'));
    }
});
