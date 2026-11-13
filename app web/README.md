# AgroPulse IoT — Control Agronómico de Precisión

Sistema de telemetría de misión crítica, control agronómico, calibración de sensores de campo, orquestación de actuadores y trazabilidad para invernaderos automatizados (ISO-22000).

---

## 🌾 Módulos del Sistema (Front-end)

1. **Acceso & Registro (`index.php`, `login.php`):**
   - Portal con diseño agronómico, métricas de misión crítica (+42% eficiencia hídrica, 99.98% disponibilidad en campo) y diagnóstico del nodo gateway ESP32 #08.
   - Pestañas dinámicas para crear cuenta e iniciar sesión con redirección automática hacia el Dashboard.

2. **Dashboard de Monitoreo en Tiempo Real (`dashboard.php`):**
   - 5 tarjetas de telemetría atómica (Temperatura del Aire, Humedad Relativa, Humedad de Suelo, Radiación Solar/Lux y Temperatura del Sustrato).
   - Curva histórica multivariable renderizada en tiempo real mediante HTML5 Canvas con bandas de umbral crítico (27 °C y 60%).
   - Cálculo biofísico de Déficit de Presión de Vapor (VPD: 1.12 kPa), Punto de Rocío (16.4 °C), Conductividad Eléctrica (EC) y CO₂ fotosintético.
   - Acciones rápidas de intervención manual y bitácora de alertas recientes.

3. **Conectividad, Hardware y Gateway IoT (`conectividad.php`):**
   - Selector interactivo de modo operativo (*Modo Real API/WS/MQTT* vs *Modo Demo Simulado*).
   - Parámetros de conexión a Broker MQTT (`mqtt://192.168.1.100:1883`) y API REST.
   - Diagnóstico de microcontroladores de campo: ESP32 Gateway (Clima), ESP32 Satélite (Riego/ADS1115) y Estación Meteorológica Heltec LoRaWAN (868 MHz).
   - Consola CLI en vivo de tráfico de paquetes MQTT (`ttyUSB0 @ 115200 baud`) con auto-scroll y resaltado sintáctico.

4. **Gestión de Sensores y Umbrales (`sensores.php`):**
   - Inventario de instrumentación de campo (sondas capacitivas v1.2, DHT22, BH1750, DS18B20).
   - Calibrador analógico interactivo para lecturas crudas ADC de 12 bits (0–4095) con ecuación de transferencia:
     $$y = -0.0537x + 168.8 + \text{offset}$$
   - Configuración de límites biológicos críticos y disparadores de alerta push/webhook.

5. **Control de Actuadores y Automatización (`actuadores.php`):**
   - Mandos físicos para electroválvula EV-01, dimmer LED PWM-03 (0–100%), extractor M-02 con ventila cenital motorizada (45%) y nebulizador ultrasónico NB-01.
   - Mecanismos de seguridad: botón de *Paro General* de emergencia y *Pausa de Mantenimiento*.
   - Matriz de reglas de automatización de lógica difusa (#R-01, #R-02, #R-03) con modal para crear nuevos escenarios.

6. **Histórico de Registros y Reportes de Auditoría (`historico.php`):**
   - Filtros multidimensionales (dispositivo, rango temporal, franja circadiana y severidad).
   - Registro cronológico atómico de eventos con buscador en vivo.
   - Configurador de reportes certificados en PDF (formato A4, 300 DPI con firma digital SHA-256) y exportación de datos a CSV.

---

## 🛠️ Stack Tecnológico

- **Lenguaje:** PHP 8.x nativo modular.
- **Framework de Estilos:** Tailwind CSS v3.4 vía CDN (Paleta temática *Agro Dark/Emerald*).
- **Tipografías:** Inter (UI) y JetBrains Mono (Telemetría / Terminales).
- **Iconografía:** Lucide Icons.
- **Gráficas:** Canvas 2D sin librerías externas pesadas.

---

## 🚀 Despliegue Local (XAMPP)

1. Clonar o ubicar el repositorio dentro del directorio `htdocs` de XAMPP:
   ```bash
   cd c:\xampp\htdocs
   git clone https://github.com/ferjimenezzz/Invernadero-Proyectos-de-IA.git "Aplicación web Proyectos de IA"
   ```
2. Iniciar el servicio de **Apache** desde el panel de control de XAMPP.
3. Abrir el navegador e ingresar a:
   ```
   http://localhost/Aplicación web Proyectos de IA/
   ```

---

## 🔌 Contratos para Integración Backend

Los contratos de endpoints y tópicos MQTT están definidos y tipados en:
`config/api-contracts.php`
Listo para conectar el backend sin alterar el marcado visual.
