import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react-native';

const getTodayDateString = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

interface CalendarModalProps {
  visible: boolean;
  currentVal: string;
  onSelect: (dateStr: string) => void;
  onClose: () => void;
}

function CalendarModal({ visible, currentVal, onSelect, onClose }: CalendarModalProps) {
  const initialDate = currentVal ? new Date(currentVal) : new Date();
  const [selectedYear, setSelectedYear] = useState(
    isNaN(initialDate.getTime()) ? new Date().getFullYear() : initialDate.getFullYear()
  );
  const [selectedMonth, setSelectedMonth] = useState(
    isNaN(initialDate.getTime()) ? new Date().getMonth() : initialDate.getMonth()
  );

  const monthNames = [
    "January", "February", "March", "April", "May", "June", 
    "July", "August", "September", "October", "November", "December"
  ];

  const getDaysInMonth = (year: number, month: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getStartDayOfMonth = (year: number, month: number) => {
    return new Date(year, month, 1).getDay();
  };

  const daysInMonth = getDaysInMonth(selectedYear, selectedMonth);
  const startDay = getStartDayOfMonth(selectedYear, selectedMonth);

  const handlePrevMonth = () => {
    if (selectedMonth === 0) {
      setSelectedMonth(11);
      setSelectedYear(selectedYear - 1);
    } else {
      setSelectedMonth(selectedMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 11) {
      setSelectedMonth(0);
      setSelectedYear(selectedYear + 1);
    } else {
      setSelectedMonth(selectedMonth + 1);
    }
  };

  const gridCells = [];
  for (let i = 0; i < startDay; i++) {
    gridCells.push({ key: `empty-${i}`, dayNum: null });
  }
  for (let i = 1; i <= daysInMonth; i++) {
    gridCells.push({ key: `day-${i}`, dayNum: i });
  }

  const rows = [];
  for (let i = 0; i < gridCells.length; i += 7) {
    rows.push(gridCells.slice(i, i + 7));
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-900/60 justify-center items-center p-5">
        <View className="bg-white w-full max-w-[340px] rounded-3xl p-5 shadow-xl">
          <View className="flex-row justify-between items-center mb-4">
            <TouchableOpacity onPress={handlePrevMonth} className="p-2">
              <ChevronLeft size={20} color="#1E3A8A" />
            </TouchableOpacity>
            <Text className="text-base font-bold text-[#1E3A8A]">
              {monthNames[selectedMonth]} {selectedYear}
            </Text>
            <TouchableOpacity onPress={handleNextMonth} className="p-2">
              <ChevronRight size={20} color="#1E3A8A" />
            </TouchableOpacity>
          </View>

          <View className="flex-row mb-2">
            {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((w, idx) => (
              <Text key={idx} className="flex-1 text-center text-[10px] font-black text-slate-400 uppercase">
                {w}
              </Text>
            ))}
          </View>

          <View className="mb-4">
            {rows.map((row, rowIdx) => (
              <View key={rowIdx} className="flex-row my-1">
                {row.map((cell) => {
                  if (cell.dayNum === null) {
                    return <View key={cell.key} className="flex-1" />;
                  }

                  const cellDateStr = `${selectedYear}-${String(selectedMonth + 1).padStart(2, '0')}-${String(cell.dayNum).padStart(2, '0')}`;
                  const isSelected = cellDateStr === currentVal;
                  
                  return (
                    <TouchableOpacity
                      key={cell.key}
                      onPress={() => {
                        onSelect(cellDateStr);
                        onClose();
                      }}
                      className={`flex-1 aspect-square justify-center items-center rounded-full ${isSelected ? 'bg-[#1E3A8A]' : 'bg-transparent'}`}
                    >
                      <Text className={`text-xs font-bold ${isSelected ? 'text-white' : 'text-slate-700'}`}>
                        {cell.dayNum}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
                {row.length < 7 && Array.from({ length: 7 - row.length }).map((_, i) => (
                  <View key={`pad-${i}`} className="flex-1" />
                ))}
              </View>
            ))}
          </View>

          <View className="flex-row justify-between border-t border-slate-100 pt-3">
            <TouchableOpacity
              onPress={() => {
                const today = new Date();
                const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
                onSelect(todayStr);
                onClose();
              }}
              className="py-2 px-3"
            >
              <Text className="text-xs font-bold text-[#1E3A8A]">Today</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={onClose}
              className="py-2 px-3"
            >
              <Text className="text-xs font-bold text-slate-500">Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface TripTicketModalProps {
  visible: boolean;
  onClose: () => void;
  data: any;
  onSave: (ticketData: any) => void;
}

export function TripTicketModal({ visible, onClose, data, onSave }: TripTicketModalProps) {
  const [driverName, setDriverName] = useState(data?.driverName || '');
  const [vehiclePlate, setVehiclePlate] = useState(data?.vehiclePlate || '');
  const [passengerName, setPassengerName] = useState(data?.passengerName || '');
  const [placesVisited, setPlacesVisited] = useState(data?.placesVisited || '');
  const [purpose, setPurpose] = useState(data?.purpose || '');
  const [date, setDate] = useState(() => data?.date || getTodayDateString());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [driverPhone, setDriverPhone] = useState(data?.signatures?.driverPhone || '');

  const [tripLog, setTripLog] = useState(data?.tripLog || {
    departureOffice: '', arrivalScene: '', departureScene: '', arrivalOffice: '', distance: ''
  });

  const [gasolineConsumed, setGasolineConsumed] = useState(data?.gasolineConsumed || {
    balance: '', issued: '', purchase: '', total: '', deduction: '', balanceEnd: ''
  });

  const [lubricants, setLubricants] = useState(data?.lubricants || {
    carOil: '', lubeOil: '', grease: ''
  });

  const [speedometer, setSpeedometer] = useState(data?.speedometer || {
    beginning: '', remarks: ''
  });

  const handleSave = () => {
    onSave({
      date,
      driverName,
      vehiclePlate,
      passengerName,
      placesVisited,
      purpose,
      tripLog,
      gasolineConsumed,
      lubricants,
      speedometer,
      signatures: {
        ...data?.signatures,
        driverPhone
      }
    });
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="overFullScreen">
      <SafeAreaView className="flex-1 bg-[#16203A]">
        {/* Header */}
        <View className="px-4 py-4 flex-row items-center justify-between border-b border-blue-800/50">
          <TouchableOpacity onPress={onClose} className="w-10 h-10 items-center justify-center">
            <ChevronLeft color="white" size={24} />
          </TouchableOpacity>
          <Text className="text-white text-base font-bold">Driver's Trip Ticket</Text>
          <TouchableOpacity onPress={handleSave} className="bg-emerald-600 px-4 py-2 rounded-xl">
            <Text className="text-white font-bold text-xs">Save</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 bg-slate-50" contentContainerStyle={{ padding: 20, paddingBottom: 100 }}>
          {/* Trip Details */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Trip & Vehicle Details</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">Name of Driver</Text>
                <TextInput value={driverName} onChangeText={setDriverName} placeholder="Driver Name" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">Date of Travel</Text>
                <TouchableOpacity 
                  onPress={() => setShowDatePicker(true)}
                  className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 flex-row items-center justify-between min-h-[38px]"
                >
                  <Text className="text-slate-800 font-medium text-xs">
                    {date || 'Select Date'}
                  </Text>
                  <Calendar size={14} color="#64748B" />
                </TouchableOpacity>
              </View>
            </View>
            <View>
              <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">Gov Car Plate No.</Text>
              <TextInput value={vehiclePlate} onChangeText={setVehiclePlate} placeholder="SGG-123" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">Authorized Passenger(s)</Text>
              <TextInput value={passengerName} onChangeText={setPassengerName} placeholder="Dr. Juan Dela Cruz / Crew" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">Place/s to be Visited</Text>
              <TextInput value={placesVisited} onChangeText={setPlacesVisited} placeholder="Sabang -> BDH -> HQ" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">Purpose of Travel</Text>
              <TextInput value={purpose} onChangeText={setPurpose} placeholder="Emergency Medical Response & Transport" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
          </View>

          {/* Trip Log (Times) */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Time & Distance Log</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Dprt Office</Text>
                <TextInput value={tripLog.departureOffice} onChangeText={(val) => setTripLog({...tripLog, departureOffice: val})} placeholder="10:00 AM" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Arr Scene</Text>
                <TextInput value={tripLog.arrivalScene} onChangeText={(val) => setTripLog({...tripLog, arrivalScene: val})} placeholder="10:05 AM" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Dprt Scene</Text>
                <TextInput value={tripLog.departureScene} onChangeText={(val) => setTripLog({...tripLog, departureScene: val})} placeholder="10:20 AM" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Arr Office</Text>
                <TextInput value={tripLog.arrivalOffice} onChangeText={(val) => setTripLog({...tripLog, arrivalOffice: val})} placeholder="10:45 AM" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Distance Travelled (km)</Text>
              <TextInput 
                value={tripLog.distance} 
                onChangeText={(val) => {
                  let cleaned = val.replace(/[^0-9.]/g, '');
                  const parts = cleaned.split('.');
                  if (parts.length > 2) {
                    cleaned = parts[0] + '.' + parts.slice(1).join('');
                  }
                  setTripLog({...tripLog, distance: cleaned});
                }} 
                keyboardType="numeric"
                placeholder="15" 
                className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" 
              />
            </View>
          </View>

          {/* Fuel Consumption */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Gasoline Consumed (Liters)</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Bal in Tank</Text>
                <TextInput 
                  value={gasolineConsumed.balance} 
                  onChangeText={(val) => {
                    let cleaned = val.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    if (parts.length > 2) {
                      cleaned = parts[0] + '.' + parts.slice(1).join('');
                    }
                    setGasolineConsumed({...gasolineConsumed, balance: cleaned});
                  }} 
                  keyboardType="numeric"
                  placeholder="20" 
                  className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Issued Stock</Text>
                <TextInput 
                  value={gasolineConsumed.issued} 
                  onChangeText={(val) => {
                    let cleaned = val.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    if (parts.length > 2) {
                      cleaned = parts[0] + '.' + parts.slice(1).join('');
                    }
                    setGasolineConsumed({...gasolineConsumed, issued: cleaned});
                  }} 
                  keyboardType="numeric"
                  placeholder="10" 
                  className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                />
              </View>
            </View>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Purchased</Text>
                <TextInput 
                  value={gasolineConsumed.purchase} 
                  onChangeText={(val) => {
                    let cleaned = val.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    if (parts.length > 2) {
                      cleaned = parts[0] + '.' + parts.slice(1).join('');
                    }
                    setGasolineConsumed({...gasolineConsumed, purchase: cleaned});
                  }} 
                  keyboardType="numeric"
                  placeholder="0" 
                  className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Total</Text>
                <TextInput 
                  value={gasolineConsumed.total} 
                  onChangeText={(val) => {
                    let cleaned = val.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    if (parts.length > 2) {
                      cleaned = parts[0] + '.' + parts.slice(1).join('');
                    }
                    setGasolineConsumed({...gasolineConsumed, total: cleaned});
                  }} 
                  keyboardType="numeric"
                  placeholder="30" 
                  className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                />
              </View>
            </View>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Trip Deduct</Text>
                <TextInput 
                  value={gasolineConsumed.deduction} 
                  onChangeText={(val) => {
                    let cleaned = val.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    if (parts.length > 2) {
                      cleaned = parts[0] + '.' + parts.slice(1).join('');
                    }
                    setGasolineConsumed({...gasolineConsumed, deduction: cleaned});
                  }} 
                  keyboardType="numeric"
                  placeholder="5" 
                  className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Bal End</Text>
                <TextInput 
                  value={gasolineConsumed.balanceEnd} 
                  onChangeText={(val) => {
                    let cleaned = val.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    if (parts.length > 2) {
                      cleaned = parts[0] + '.' + parts.slice(1).join('');
                    }
                    setGasolineConsumed({...gasolineConsumed, balanceEnd: cleaned});
                  }} 
                  keyboardType="numeric"
                  placeholder="25" 
                  className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                />
              </View>
            </View>
          </View>

          {/* Lubricants & Speedometer */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Lubricants & Meter</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Car Oil (L)</Text>
                <TextInput 
                  value={lubricants.carOil} 
                  onChangeText={(val) => {
                    let cleaned = val.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    if (parts.length > 2) {
                      cleaned = parts[0] + '.' + parts.slice(1).join('');
                    }
                    setLubricants({...lubricants, carOil: cleaned});
                  }} 
                  keyboardType="numeric"
                  placeholder="0" 
                  className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Lube Oil (L)</Text>
                <TextInput 
                  value={lubricants.lubeOil} 
                  onChangeText={(val) => {
                    let cleaned = val.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    if (parts.length > 2) {
                      cleaned = parts[0] + '.' + parts.slice(1).join('');
                    }
                    setLubricants({...lubricants, lubeOil: cleaned});
                  }} 
                  keyboardType="numeric"
                  placeholder="0" 
                  className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Grease (kg)</Text>
                <TextInput 
                  value={lubricants.grease} 
                  onChangeText={(val) => {
                    let cleaned = val.replace(/[^0-9.]/g, '');
                    const parts = cleaned.split('.');
                    if (parts.length > 2) {
                      cleaned = parts[0] + '.' + parts.slice(1).join('');
                    }
                    setLubricants({...lubricants, grease: cleaned});
                  }} 
                  keyboardType="numeric"
                  placeholder="0" 
                  className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" 
                />
              </View>
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Speedometer Begin Reading</Text>
              <TextInput 
                value={speedometer.beginning} 
                onChangeText={(val) => {
                  let cleaned = val.replace(/[^0-9.]/g, '');
                  const parts = cleaned.split('.');
                  if (parts.length > 2) {
                    cleaned = parts[0] + '.' + parts.slice(1).join('');
                  }
                  setSpeedometer({...speedometer, beginning: cleaned});
                }} 
                keyboardType="numeric"
                placeholder="12450" 
                className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" 
              />
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Remarks</Text>
              <TextInput value={speedometer.remarks} onChangeText={(val) => setSpeedometer({...speedometer, remarks: val})} placeholder="Engine normal. No issues." className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
          </View>

          {/* Driver Contact */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Driver Contact</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Driver Cellphone Number</Text>
              <TextInput value={driverPhone} onChangeText={setDriverPhone} keyboardType="phone-pad" placeholder="0917-123-4567" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
          </View>
        </ScrollView>
        <CalendarModal 
          visible={showDatePicker}
          currentVal={date}
          onSelect={(dateStr) => setDate(dateStr)}
          onClose={() => setShowDatePicker(false)}
        />
      </SafeAreaView>
    </Modal>
  );
}
