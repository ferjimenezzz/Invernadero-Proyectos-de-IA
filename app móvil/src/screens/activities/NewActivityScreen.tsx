import React, { useMemo, useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { Avatar, Badge, Button, IconBox, InfoNote } from '../../components/common';
import { FieldLabel, SelectField, TextArea, TileSelector, type TileOption } from '../../components/activities';
import { StackScreenLayout } from '../../components/layout/ScreenLayout';
import { createActivity } from '../../services/api';
import { beds, people } from '../../data/mockModules';
import { colors, ms, radius, spacing, typography } from '../../theme';
import type { RootScreenProps } from '../../navigation/types';
import type { ActivityType } from '../../types/activities';

const TYPES: TileOption<ActivityType>[] = [
  { value: 'riego', title: 'Riego', subtitle: 'Nutritivo / H2O', icon: 'water-outline' },
  { value: 'inspeccion', title: 'Inspección', subtitle: 'Salud y plagas', icon: 'magnify' },
  { value: 'medicion', title: 'Medición', subtitle: 'Tallo y biomasa', icon: 'leaf' },
  { value: 'fertilizacion', title: 'Fertilización', subtitle: 'Bioestimulantes', icon: 'flask-outline' },
  {
    value: 'mantenimiento',
    title: 'Mantenimiento',
    subtitle: 'Calibración de goteros, bombas o sustrato',
    icon: 'wrench-outline',
    wide: true,
  },
];

/** Próximos 7 días y franjas de 30 min, sin depender de un date-picker nativo. */
function buildDays() {
  const fmt = new Intl.DateTimeFormat('es-MX', { day: 'numeric', month: 'short', year: 'numeric' });
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() + i);
    const prefix = i === 0 ? 'Hoy, ' : i === 1 ? 'Mañana, ' : '';
    return { id: d.toISOString().slice(0, 10), label: prefix + fmt.format(d) };
  });
}
const HOURS = Array.from({ length: 29 }, (_, i) => {
  const h = 6 + Math.floor(i / 2);
  const m = i % 2 ? '30' : '00';
  return { id: `${h}:${m}`, label: `${String(h).padStart(2, '0')}:${m} hrs` };
});

interface Photo {
  uri: string;
  name: string;
  size: string;
}

export function NewActivityScreen({ navigation }: RootScreenProps<'RegistrarActividad'>) {
  const days = useMemo(buildDays, []);
  const [type, setType] = useState<ActivityType>('riego');
  const [bed, setBed] = useState(beds[1].id);
  const [day, setDay] = useState(days[0].id);
  const [hour, setHour] = useState('16:30');
  const [responsible, setResponsible] = useState(people[0].initials);
  const [description, setDescription] = useState('');
  const [observations, setObservations] = useState('');
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [saving, setSaving] = useState(false);

  const person = people.find((p) => p.initials === responsible) ?? people[0];
  const valid = description.trim().length >= 10;

  const pickPhoto = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permiso requerido', 'Activa el acceso a fotos para adjuntar evidencia.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.7 });
    if (res.canceled) return;
    const asset = res.assets[0];
    const mb = asset.fileSize ? asset.fileSize / 1024 / 1024 : 0;
    if (mb > 5) {
      Alert.alert('Archivo muy grande', 'El máximo permitido es 5 MB.');
      return;
    }
    setPhotos((p) => [
      ...p,
      { uri: asset.uri, name: asset.fileName ?? `IMG_${Date.now()}.jpg`, size: mb ? `${mb.toFixed(1)} MB` : '—' },
    ]);
  };

  const save = async () => {
    if (!valid) {
      Alert.alert('Falta información', 'Escribe una descripción de al menos 10 caracteres.');
      return;
    }
    setSaving(true);
    try {
      const [h, m] = hour.split(':').map(Number);
      const date = new Date(`${day}T00:00:00`);
      date.setHours(h, m);
      await createActivity({
        type,
        bedId: bed,
        date,
        responsible: person,
        description,
        observations,
        photos: photos.map(({ name, size }) => ({ name, size })),
      });
      navigation.goBack();
    } finally {
      setSaving(false);
    }
  };

  const discard = () => {
    if (!description && !observations && photos.length === 0) return navigation.goBack();
    Alert.alert('¿Descartar actividad?', 'Se perderán los datos capturados.', [
      { text: 'Seguir editando', style: 'cancel' },
      { text: 'Descartar', style: 'destructive', onPress: () => navigation.goBack() },
    ]);
  };

  return (
    <StackScreenLayout title="Registrar Actividad">
      {/* Barra Cancelar / título / Guardar */}
      <View style={styles.formBar}>
        <Pressable onPress={discard} style={styles.barBtn} hitSlop={8}>
          <MaterialCommunityIcons name="close" size={ms(18)} color={colors.textPrimary} />
          <Text style={[typography.body, { color: colors.textPrimary }]}>Cancelar</Text>
        </Pressable>
        <View style={{ alignItems: 'center' }}>
          <Text style={[typography.h3, { color: colors.textPrimary }]}>Nueva Actividad</Text>
          <Text style={[typography.caption, { color: colors.primary }]}>Bitácora Agronómica</Text>
        </View>
        <Pressable onPress={save} hitSlop={8} disabled={saving}>
          <Text style={[typography.body, { color: colors.primaryDark, fontWeight: '700', opacity: valid ? 1 : 0.5 }]}>
            Guardar
          </Text>
        </Pressable>
      </View>

      <View>
        <FieldLabel label="Tipo de actividad" required hint="Selecciona uno" />
        <TileSelector options={TYPES} value={type} onChange={setType} />
      </View>

      <View>
        <FieldLabel label="Cantero o Módulo de Cultivo" required />
        <SelectField icon="sprout-outline" title="Cantero o módulo" value={bed} options={beds} onChange={setBed} />
      </View>

      <View>
        <FieldLabel label="Fecha y Hora de Ejecución" required />
        <View style={styles.twoCols}>
          <SelectField
            icon="calendar-blank-outline"
            overline="Fecha"
            title="Fecha de ejecución"
            value={day}
            options={days}
            onChange={setDay}
            style={styles.col}
          />
          <SelectField
            icon="clock-outline"
            overline="Hora"
            title="Hora de ejecución"
            value={hour}
            options={HOURS}
            onChange={setHour}
            style={styles.col}
          />
        </View>
      </View>

      <View>
        <FieldLabel label="Responsable de la tarea" required />
        <SelectField
          icon="account-outline"
          title="Responsable"
          value={responsible}
          options={people.map((p) => ({ id: p.initials, label: `${p.name} — ${p.role}` }))}
          onChange={setResponsible}
        />
        <View style={styles.personPreview}>
          <Avatar initials={person.initials} color={person.color} size={40} />
          <View style={{ flex: 1 }}>
            <Text style={[typography.body, { color: colors.textPrimary, fontWeight: '600' }]}>{person.name}</Text>
            <Text style={[typography.bodySm, { color: colors.textMuted }]}>{person.role}</Text>
          </View>
          <Badge label="Pregrado" />
        </View>
      </View>

      <View>
        <FieldLabel label="Descripción detallada" required hint="Requerido" />
        <TextArea
          value={description}
          onChangeText={setDescription}
          placeholder="Ej. Aplicación de 15 litros de solución nutritiva bioestimulante en cantero de hierbas aromáticas (1.2 mS/cm)."
          showCount
        />
      </View>

      <View>
        <FieldLabel label="Observaciones fitosanitarias" optional />
        <TextArea
          value={observations}
          onChangeText={setObservations}
          placeholder="Ej. Sustrato drena correctamente. Sin anomalías en raíces superficiales."
        />
      </View>

      <View>
        <FieldLabel label="Evidencia Fotográfica" hint={`${photos.length} archivo${photos.length === 1 ? '' : 's'} adjunto${photos.length === 1 ? '' : 's'}`} />
        <View style={{ gap: spacing.sm }}>
          {photos.map((p, i) => (
            <View key={p.uri} style={styles.photoRow}>
              <Image source={{ uri: p.uri }} style={styles.thumb} />
              <View style={{ flex: 1 }}>
                <Text style={[typography.bodySm, { color: colors.textPrimary, fontWeight: '500' }]} numberOfLines={1}>
                  {p.name}
                </Text>
                <Text style={[typography.caption, { color: colors.primary }]}>✓ Verificado • {p.size}</Text>
              </View>
              <Pressable onPress={() => setPhotos((ph) => ph.filter((_, j) => j !== i))} hitSlop={8} accessibilityLabel="Eliminar foto">
                <MaterialCommunityIcons name="trash-can-outline" size={ms(20)} color={colors.textMuted} />
              </Pressable>
            </View>
          ))}
          <Pressable onPress={pickPhoto} style={styles.upload} accessibilityRole="button">
            <IconBox name="camera-outline" size={34} background={colors.surface} round />
            <Text style={[typography.bodySm, { color: colors.primaryDark, fontWeight: '600' }]}>
              {photos.length ? 'Subir otra foto' : 'Subir foto'} (Máx. 5MB)
            </Text>
          </Pressable>
        </View>
      </View>

      <InfoNote
        icon="access-point"
        tone="mint"
        text="Sensor Humedad Cantero 2 • 68% HR — Recomendación agronómica: riego completado con éxito."
      />

      <Button label="Guardar actividad en bitácora" icon="content-save-outline" size="lg" loading={saving} onPress={save} />
      <Button label="Cancelar y descartar" variant="light" onPress={discard} />

      <InfoNote
        icon="cloud-check-outline"
        text="Los datos se sincronizarán con el servidor universitario y la bitácora académica del Grupo de Investigación Hortícola."
        style={{ backgroundColor: 'transparent' }}
      />
    </StackScreenLayout>
  );
}

const styles = StyleSheet.create({
  formBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceMuted,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  barBtn: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  twoCols: { flexDirection: 'row', gap: spacing.sm },
  col: { flex: 1 },
  personPreview: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.md,
    marginTop: spacing.sm,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    padding: spacing.sm,
  },
  thumb: { width: ms(56), height: ms(56), borderRadius: radius.sm, backgroundColor: colors.surfaceSunken },
  upload: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    backgroundColor: colors.surfaceSunken,
    borderRadius: radius.md,
    padding: spacing.md,
  },
});
