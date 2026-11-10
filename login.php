<?php
/**
 * ============================================================================
 * ARCHIVO: login.php
 * PROPÓSITO: Alias y punto de redirección para el portal de inicio de sesión.
 *            Garantiza compatibilidad con enlaces estándar /login.php.
 * PROYECTO: AgroPulse - Telemetría Agronómica de Precisión IoT
 * ============================================================================
 */

// Redireccionar al formulario con la pestaña de inicio de sesión activada
header('Location: index.php#login');
exit();
