<?php
/**
 * ============================================================================
 * ARCHIVO: config/api-contracts.php
 * PROPÓSITO: Especificación formal y contratos de datos para endpoints REST
 *            y tópicos MQTT. Diseñado para desacoplar el Frontend PHP del
 *            futuro Backend (PDO/MySQL/PostgreSQL), facilitando una integración
 *            inmediata sin refactorización visual.
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ============================================================================
 */

return [
    'version' => '1.0.0',
    'environment' => 'production_ready',
    
    // Contratos de los Endpoints REST que el Backend debe exponer
    'endpoints' => [
        'telemetry_live' => [
            'method' => 'GET',
            'path' => '/api/v1/telemetry/live',
            'description' => 'Retorna las lecturas climáticas y de sustrato más recientes de la zona activa.',
            'response_schema' => [
                'status' => 'success',
                'timestamp' => 'ISO8601 string',
                'zone_id' => 'integer',
                'data' => [
                    'temp_air_c' => 'float (ej: 24.2)',
                    'hum_air_pct' => 'float (ej: 62.4)',
                    'hum_soil_pct' => 'float (ej: 58.2)',
                    'radiation_lux' => 'integer (ej: 18500)',
                    'temp_substrate_c' => 'float (ej: 22.1)',
                    'vpd_kpa' => 'float (ej: 1.12)',
                    'dew_point_c' => 'float (ej: 16.4)',
                    'ec_ms_cm' => 'float (ej: 2.3)',
                    'co2_ppm' => 'integer (ej: 780)'
                ]
            ]
        ],
        'actuator_control' => [
            'method' => 'POST',
            'path' => '/api/v1/actuators/command',
            'description' => 'Envía comandos de control físico hacia relés, dimmers o electroválvulas.',
            'request_payload' => [
                'actuator_code' => 'string (ej: EV_01 | LED_PWM_03 | FAN_M02 | NB_01)',
                'action' => 'string (ej: START | STOP | SET_SPEED | SET_POWER)',
                'parameters' => [
                    'duration_minutes' => 'integer|null',
                    'power_pct' => 'integer|null',
                    'speed' => 'string|null (OFF|Baja|Media|Alta)'
                ]
            ]
        ],
        'sensor_calibration' => [
            'method' => 'PUT',
            'path' => '/api/v1/sensors/calibration',
            'description' => 'Actualiza coeficientes de calibración (pendiente, intercepto, offset) en EEPROM.',
            'request_payload' => [
                'sensor_code' => 'string (ej: SOIL_CAP_01)',
                'raw_dry_point' => 'integer (ej: 3140)',
                'raw_wet_point' => 'integer (ej: 1280)',
                'offset_linear' => 'float (ej: 1.5)'
            ]
        ],
        'audit_query' => [
            'method' => 'GET',
            'path' => '/api/v1/audit/logs',
            'description' => 'Consulta paginada de la bitácora de eventos criptográficos ISO-22000.',
            'query_params' => [
                'zone_id' => 'integer',
                'device_id' => 'string|null',
                'severity' => 'string|null (all|telemetry|manual|auto|alert)',
                'page' => 'integer',
                'per_page' => 'integer'
            ]
        ]
    ],

    // Mapeo de Tópicos MQTT para el Broker Local
    'mqtt_topics' => [
        'telemetry_wildcard' => 'invernadero/zona1/#',
        'climate_ingest' => 'invernadero/zona1/esp32_clima/telemetry',
        'irrigation_ingest' => 'invernadero/zona1/esp32_riego/sensors',
        'meteo_lora_ingest' => 'invernadero/exterior/lora_meteo/packet',
        'actuators_commands' => 'invernadero/zona1/actuators/cmd'
    ]
];
