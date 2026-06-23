import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ChevronLeft } from 'lucide-react-native';

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
      driverName,
      vehiclePlate,
      passengerName,
      placesVisited,
      purpose,
      tripLog,
      gasolineConsumed,
      lubricants,
      speedometer
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
            <View>
              <Text className="text-slate-400 text-[10px] font-black tracking-widest uppercase mb-1">Name of Driver</Text>
              <TextInput value={driverName} onChangeText={setDriverName} placeholder="Driver Name" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
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
              <TextInput value={tripLog.distance} onChangeText={(val) => setTripLog({...tripLog, distance: val})} placeholder="15 km" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium text-xs" />
            </View>
          </View>

          {/* Fuel Consumption */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Gasoline Consumed (Liters)</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Bal in Tank</Text>
                <TextInput value={gasolineConsumed.balance} onChangeText={(val) => setGasolineConsumed({...gasolineConsumed, balance: val})} placeholder="20" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Issued Stock</Text>
                <TextInput value={gasolineConsumed.issued} onChangeText={(val) => setGasolineConsumed({...gasolineConsumed, issued: val})} placeholder="10" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Purchased</Text>
                <TextInput value={gasolineConsumed.purchase} onChangeText={(val) => setGasolineConsumed({...gasolineConsumed, purchase: val})} placeholder="0" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Total</Text>
                <TextInput value={gasolineConsumed.total} onChangeText={(val) => setGasolineConsumed({...gasolineConsumed, total: val})} placeholder="30" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Trip Deduct</Text>
                <TextInput value={gasolineConsumed.deduction} onChangeText={(val) => setGasolineConsumed({...gasolineConsumed, deduction: val})} placeholder="5" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Bal End</Text>
                <TextInput value={gasolineConsumed.balanceEnd} onChangeText={(val) => setGasolineConsumed({...gasolineConsumed, balanceEnd: val})} placeholder="25" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
          </View>

          {/* Lubricants & Speedometer */}
          <Text className="text-[#1E3A8A] font-bold text-xs tracking-widest uppercase mb-3">Lubricants & Meter</Text>
          <View className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm mb-6 space-y-3">
            <View className="flex-row space-x-3">
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Car Oil (L)</Text>
                <TextInput value={lubricants.carOil} onChangeText={(val) => setLubricants({...lubricants, carOil: val})} placeholder="0" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
              <View className="flex-1">
                <Text className="text-slate-400 text-[8px] font-bold uppercase mb-1">Lube Oil (L)</Text>
                <TextInput value={lubricants.lubeOil} onChangeText={(val) => setLubricants({...lubricants, lubeOil: val})} placeholder="0" className="border border-slate-200 rounded-xl px-2 py-1.5 bg-slate-50 text-slate-800 font-medium text-xs" />
              </View>
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Speedometer Begin Reading</Text>
              <TextInput value={speedometer.beginning} onChangeText={(val) => setSpeedometer({...speedometer, beginning: val})} placeholder="12450 km" className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
            <View>
              <Text className="text-slate-400 text-[9px] font-black tracking-widest uppercase mb-1">Remarks</Text>
              <TextInput value={speedometer.remarks} onChangeText={(val) => setSpeedometer({...speedometer, remarks: val})} placeholder="Engine normal. No issues." className="border border-slate-200 rounded-xl px-3 py-2 bg-slate-50 text-slate-800 font-medium" />
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}
