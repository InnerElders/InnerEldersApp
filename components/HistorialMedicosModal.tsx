import React, { useState, useEffect } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Alert,
  Dimensions,
  SafeAreaView,
  Platform
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { getDB } from '@/db/dbInstance';

const { width, height } = Dimensions.get('window');

interface HistorialMedicosModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  avatar?: string;
  activeColors: any;
  fontSizeMultiplier: number;
}

interface SnapshotRecord {
  id: number;
  userId: string;
  fecha: string;
  hora: string;
  bpm: number;
  spo2: number;
  estres: number | null;
  actividad: string;
  comentarios: string;
}

export default function HistorialMedicosModal({
  visible,
  onClose,
  userId,
  avatar = '👴',
  activeColors,
  fontSizeMultiplier
}: HistorialMedicosModalProps) {
  const [records, setRecords] = useState<SnapshotRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<SnapshotRecord[]>([]);
  const [selectedRecord, setSelectedRecord] = useState<SnapshotRecord | null>(null);

  // Date filter state
  const [showCalendar, setShowCalendar] = useState(false);
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null); // "DD/MM/YYYY"
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear());
  const [currentMonth, setCurrentMonth] = useState(new Date().getMonth()); // 0-11

  const getFontSize = (base: number) => Math.round(base * fontSizeMultiplier);

  // Load records from SQLite
  const loadRecords = async () => {
    const db = getDB();
    try {
      const res = await db.getAllAsync<SnapshotRecord>(
        "SELECT * FROM registro_medico_historico WHERE userId = ? ORDER BY id DESC",
        [userId]
      );
      setRecords(res);
      filterList(res, selectedDateStr);
    } catch (e) {
      console.error('[HistorialMedicosModal] Error loading medical records:', e);
    }
  };

  useEffect(() => {
    if (visible && userId) {
      loadRecords();
      setSelectedRecord(null);
    }
  }, [visible, userId]);

  useEffect(() => {
    filterList(records, selectedDateStr);
  }, [selectedDateStr, records]);

  const filterList = (allRecords: SnapshotRecord[], dateStr: string | null) => {
    if (!dateStr) {
      setFilteredRecords(allRecords);
    } else {
      const filtered = allRecords.filter(r => r.fecha === dateStr);
      setFilteredRecords(filtered);
    }
  };

  const getStressInfo = (val: number | null) => {
    if (val === null) return { category: 'N/A', emoji: '😐', color: '#94a3b8' };
    if (val <= 25) return { category: 'Relajado', emoji: '😊', color: '#4EECD6' };
    if (val <= 50) return { category: 'Leve', emoji: '😐', color: '#A3E635' };
    if (val <= 80) return { category: 'Moderado', emoji: '😟', color: '#FB923C' };
    return { category: 'Severo', emoji: '😭', color: '#EF4444' };
  };

  // ─── Pure JS Calendar Generator ───
  const months = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(prev => prev - 1);
    } else {
      setCurrentMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(prev => prev + 1);
    } else {
      setCurrentMonth(prev => prev + 1);
    }
  };

  const selectDate = (day: number) => {
    const dStr = String(day).padStart(2, '0');
    const mStr = String(currentMonth + 1).padStart(2, '0');
    const selected = `${dStr}/${mStr}/${currentYear}`;
    setSelectedDateStr(selected);
    setShowCalendar(false);
  };

  const renderCalendar = () => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // Day of week (0-6)
    // Adjust for Monday start: (firstDayIndex + 6) % 7
    const adjustedFirstDay = firstDayIndex === 0 ? 6 : firstDayIndex - 1;
    const totalDays = new Date(currentYear, currentMonth + 1, 0).getDate();

    const dayCells = [];
    // Padding days for empty start
    for (let i = 0; i < adjustedFirstDay; i++) {
      dayCells.push(<View key={`empty-${i}`} style={styles.calendarDayCellEmpty} />);
    }

    // Days of month
    for (let day = 1; day <= totalDays; day++) {
      const dStr = String(day).padStart(2, '0');
      const mStr = String(currentMonth + 1).padStart(2, '0');
      const cellDateStr = `${dStr}/${mStr}/${currentYear}`;
      const isSelected = selectedDateStr === cellDateStr;

      dayCells.push(
        <TouchableOpacity
          key={`day-${day}`}
          style={[
            styles.calendarDayCell,
            isSelected && { backgroundColor: activeColors.primary, borderRadius: 12 }
          ]}
          onPress={() => selectDate(day)}
        >
          <Text style={[
            styles.calendarDayText,
            { color: isSelected ? '#ffffff' : activeColors.textPrimary }
          ]}>
            {day}
          </Text>
        </TouchableOpacity>
      );
    }

    // Group into weeks
    const rows = [];
    let cells = [...dayCells];
    while (cells.length > 0) {
      rows.push(
        <View key={`week-${rows.length}`} style={styles.calendarRow}>
          {cells.splice(0, 7)}
        </View>
      );
    }

    return (
      <View style={[styles.calendarContainer, { backgroundColor: activeColors.surface }]}>
        <View style={styles.calendarHeader}>
          <TouchableOpacity onPress={handlePrevMonth} style={styles.arrowBtn}>
            <Feather name="chevron-left" size={20} color={activeColors.primary} />
          </TouchableOpacity>
          <Text style={[styles.calendarTitle, { color: activeColors.textPrimary, fontSize: getFontSize(16) }]}>
            {months[currentMonth]} {currentYear}
          </Text>
          <TouchableOpacity onPress={handleNextMonth} style={styles.arrowBtn}>
            <Feather name="chevron-right" size={20} color={activeColors.primary} />
          </TouchableOpacity>
        </View>

        <View style={styles.weekLabelsRow}>
          {['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((d, i) => (
            <Text key={`label-${i}`} style={[styles.weekLabelText, { color: activeColors.textMuted }]}>{d}</Text>
          ))}
        </View>

        <View style={styles.calendarBody}>
          {rows}
        </View>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <SafeAreaView style={[styles.modalContent, { backgroundColor: activeColors.background }]}>
          
          {/* Header */}
          <View style={[styles.header, { borderBottomColor: activeColors.border }]}>
            <TouchableOpacity onPress={onClose} style={styles.closeIconBtn}>
              <Feather name="x" size={24} color={activeColors.textPrimary} />
            </TouchableOpacity>
            <Text style={[styles.headerTitle, { color: activeColors.textPrimary, fontSize: getFontSize(18) }]}>
              {selectedRecord ? 'Detalle de Registro' : 'Historial de Registros'}
            </Text>
            {!selectedRecord ? (
              <TouchableOpacity onPress={() => setShowCalendar(true)} style={styles.filterBtn}>
                <Feather name="calendar" size={20} color={activeColors.primary} />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 24 }} />
            )}
          </View>

          {/* Calendario Overlay */}
          {showCalendar && (
            <Modal transparent={true} visible={showCalendar} animationType="fade">
              <TouchableOpacity style={styles.calendarOverlay} activeOpacity={1} onPress={() => setShowCalendar(false)}>
                <TouchableOpacity activeOpacity={1} style={{ width: '85%' }}>
                  {renderCalendar()}
                </TouchableOpacity>
              </TouchableOpacity>
            </Modal>
          )}

          {/* detail view or list view */}
          {selectedRecord ? (
            // DETALLE DEL SNAPSHOT
            <ScrollView contentContainerStyle={styles.detailScroll}>
              <View style={[styles.detailHeaderCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                <View style={styles.detailTitleRow}>
                  <Text style={styles.detailAvatar}>{avatar}</Text>
                  <View>
                    <Text style={[styles.detailTitle, { color: activeColors.textPrimary, fontSize: getFontSize(18) }]}>
                      Registro Médico
                    </Text>
                    <Text style={[styles.detailTime, { color: activeColors.textSecondary, fontSize: getFontSize(13) }]}>
                      Fecha: {selectedRecord.fecha} · Hora: {selectedRecord.hora}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Vitals Grid */}
              <View style={styles.vitalsGrid}>
                {/* BPM Card */}
                <View style={[styles.vitalCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                  <View style={[styles.vitalIconContainer, { backgroundColor: '#fce7f3' }]}>
                    <Feather name="heart" size={20} color="#ec4899" />
                  </View>
                  <Text style={[styles.vitalLabel, { color: activeColors.textSecondary, fontSize: getFontSize(11) }]}>
                    Frec. Cardíaca
                  </Text>
                  <Text style={[styles.vitalValue, { color: '#ec4899', fontSize: getFontSize(22) }]}>
                    {selectedRecord.bpm} <Text style={{ fontSize: 12 }}>LPM</Text>
                  </Text>
                </View>

                {/* SpO2 Card */}
                <View style={[styles.vitalCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                  <View style={[styles.vitalIconContainer, { backgroundColor: '#e0e7ff' }]}>
                    <Feather name="activity" size={20} color="#6366f1" />
                  </View>
                  <Text style={[styles.vitalLabel, { color: activeColors.textSecondary, fontSize: getFontSize(11) }]}>
                    Sat. Oxígeno
                  </Text>
                  <Text style={[styles.vitalValue, { color: '#6366f1', fontSize: getFontSize(22) }]}>
                    {selectedRecord.spo2}%
                  </Text>
                </View>

                {/* Stress Card */}
                {(() => {
                  const stressInfo = getStressInfo(selectedRecord.estres);
                  return (
                    <View style={[styles.vitalCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                      <View style={[styles.vitalIconContainer, { backgroundColor: stressInfo.color + '18' }]}>
                        <Text style={{ fontSize: 20 }}>{stressInfo.emoji}</Text>
                      </View>
                      <Text style={[styles.vitalLabel, { color: activeColors.textSecondary, fontSize: getFontSize(11) }]}>
                        Nivel de Estrés
                      </Text>
                      <Text style={[styles.vitalValue, { color: stressInfo.color, fontSize: getFontSize(22) }]}>
                        {selectedRecord.estres !== null ? `${selectedRecord.estres}%` : '--'}
                      </Text>
                      <Text style={[styles.stressCategory, { color: stressInfo.color, fontSize: getFontSize(11) }]}>
                        {stressInfo.category}
                      </Text>
                    </View>
                  );
                })()}

                {/* Activity Card */}
                <View style={[styles.vitalCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                  <View style={[styles.vitalIconContainer, { backgroundColor: '#ffedd5' }]}>
                    <Feather name="sliders" size={20} color="#f97316" />
                  </View>
                  <Text style={[styles.vitalLabel, { color: activeColors.textSecondary, fontSize: getFontSize(11) }]}>
                    Actividad
                  </Text>
                  <Text style={[styles.vitalValue, { color: '#f97316', fontSize: getFontSize(16), marginTop: 6 }]}>
                    {selectedRecord.actividad}
                  </Text>
                </View>
              </View>

              {/* Comments Section */}
              <View style={[styles.commentsCard, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                <View style={styles.commentsHeader}>
                  <Feather name="file-text" size={16} color={activeColors.primary} style={{ marginRight: 6 }} />
                  <Text style={[styles.commentsTitle, { color: activeColors.textPrimary, fontSize: getFontSize(13) }]}>
                    Comentarios y Diagnóstico
                  </Text>
                </View>
                <Text style={[styles.commentsText, { color: activeColors.textSecondary, fontSize: getFontSize(14) }]}>
                  {selectedRecord.comentarios || 'Sin notas adicionales ingresadas.'}
                </Text>
              </View>

              <TouchableOpacity
                style={[styles.backBtn, { backgroundColor: activeColors.primary }]}
                onPress={() => setSelectedRecord(null)}
              >
                <Text style={styles.backBtnText}>Volver al Listado</Text>
              </TouchableOpacity>
            </ScrollView>
          ) : (
            // LISTADO DE REGISTROS
            <View style={{ flex: 1, padding: 16 }}>
              {selectedDateStr && (
                <View style={[styles.filterStatusRow, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}>
                  <Text style={[styles.filterStatusText, { color: activeColors.textPrimary, fontSize: getFontSize(12) }]}>
                    Filtrado por: <Text style={{ fontWeight: '700' }}>{selectedDateStr}</Text>
                  </Text>
                  <TouchableOpacity onPress={() => setSelectedDateStr(null)} style={styles.clearFilterBtn}>
                    <Text style={[styles.clearFilterText, { color: activeColors.primary, fontSize: getFontSize(12) }]}>
                      Quitar Filtro
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <FlatList
                data={filteredRecords}
                keyExtractor={(item) => item.id.toString()}
                showsVerticalScrollIndicator={false}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={[styles.recordItem, { backgroundColor: activeColors.surface, borderColor: activeColors.border }]}
                    onPress={() => setSelectedRecord(item)}
                    activeOpacity={0.7}
                  >
                    <View style={styles.recordItemLeft}>
                      <Text style={styles.recordAvatar}>{avatar}</Text>
                      <View style={{ marginLeft: 12 }}>
                        <Text style={[styles.recordTitle, { color: activeColors.textPrimary, fontSize: getFontSize(14) }]}>
                          Registro Médico
                        </Text>
                        <Text style={[styles.recordSub, { color: activeColors.textSecondary, fontSize: getFontSize(12) }]}>
                          {item.fecha} · {item.hora}
                        </Text>
                      </View>
                    </View>
                    <Feather name="chevron-right" size={18} color={activeColors.textMuted} />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={
                  <View style={styles.emptyContainer}>
                    <Feather name="activity" size={48} color={activeColors.textMuted} style={{ marginBottom: 12 }} />
                    <Text style={[styles.emptyText, { color: activeColors.textSecondary, fontSize: getFontSize(14) }]}>
                      {selectedDateStr
                        ? 'No se encontraron registros para la fecha elegida.'
                        : 'No se registran snapshots de salud para este paciente.'}
                    </Text>
                  </View>
                }
              />
            </View>
          )}

        </SafeAreaView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    height: height * 0.9,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    overflow: 'hidden',
  },
  header: {
    height: 56,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    borderBottomWidth: 1,
  },
  closeIconBtn: {
    padding: 4,
  },
  headerTitle: {
    fontWeight: '700',
    textAlign: 'center',
  },
  filterBtn: {
    padding: 8,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    marginBottom: 10,
  },
  recordItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  recordAvatar: {
    fontSize: 22,
  },
  recordTitle: {
    fontWeight: '600',
  },
  recordSub: {
    marginTop: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyText: {
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  detailScroll: {
    padding: 16,
    paddingBottom: 40,
  },
  detailHeaderCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    marginBottom: 16,
  },
  detailTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  detailAvatar: {
    fontSize: 36,
    marginRight: 14,
  },
  detailTitle: {
    fontWeight: '700',
  },
  detailTime: {
    marginTop: 2,
  },
  vitalsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  vitalCard: {
    width: (width - 44) / 2,
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 14,
    alignItems: 'flex-start',
  },
  vitalIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  vitalLabel: {
    fontWeight: '600',
    marginBottom: 4,
  },
  vitalValue: {
    fontWeight: '800',
  },
  stressCategory: {
    fontWeight: '700',
    marginTop: 4,
  },
  commentsCard: {
    borderWidth: 1.5,
    borderRadius: 20,
    padding: 16,
    marginBottom: 20,
  },
  commentsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  commentsTitle: {
    fontWeight: '700',
  },
  commentsText: {
    lineHeight: 20,
  },
  backBtn: {
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  backBtnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  filterStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    borderWidth: 1.5,
    borderRadius: 14,
    marginBottom: 14,
  },
  filterStatusText: {
    fontWeight: '500',
  },
  clearFilterBtn: {
    padding: 4,
  },
  clearFilterText: {
    fontWeight: '700',
  },
  calendarOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    borderRadius: 20,
    padding: 16,
    elevation: 5,
    shadowColor: '#0f172a',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  calendarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  arrowBtn: {
    padding: 6,
  },
  calendarTitle: {
    fontWeight: '700',
  },
  weekLabelsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  weekLabelText: {
    width: (width * 0.85 - 32) / 7,
    textAlign: 'center',
    fontWeight: '700',
    fontSize: 11,
  },
  calendarBody: {
    gap: 4,
  },
  calendarRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  calendarDayCell: {
    width: (width * 0.85 - 32) / 7 - 2,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarDayCellEmpty: {
    width: (width * 0.85 - 32) / 7 - 2,
    height: 38,
  },
  calendarDayText: {
    fontWeight: '600',
    fontSize: 13,
  },
});