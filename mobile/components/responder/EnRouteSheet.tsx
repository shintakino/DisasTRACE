import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, Image, Modal } from 'react-native';
import BottomSheet, { BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { MapPin, ChevronDown, ChevronUp, Image as ImageIcon, X } from 'lucide-react-native';
import { useResponderStore } from '../../stores/useResponderStore';


export function EnRouteSheet() {
  const { status, activeDispatch, elapsedTimeSeconds, confirmArrival, currentSpeedKph } = useResponderStore();
  const bottomSheetRef = useRef<BottomSheet>(null);
  const snapPoints = useMemo(() => ['15%', '50%', '90%'], []);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isImageExpanded, setIsImageExpanded] = useState(false);

  useEffect(() => {
    if (status === 'en_route') {
      setIsExpanded(false);
      bottomSheetRef.current?.snapToIndex(1);
    } else {
      bottomSheetRef.current?.close();
    }
  }, [status]);

  const toggleAccordion = () => {
    setIsExpanded(!isExpanded);
    if (!isExpanded) {
      bottomSheetRef.current?.snapToIndex(2);
    } else {
      bottomSheetRef.current?.snapToIndex(1);
    }
  };

  const formatTime = (totalSeconds: number) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <>
      <BottomSheet
      ref={bottomSheetRef}
      index={status === 'en_route' ? (isExpanded ? 2 : 1) : -1}
      snapPoints={snapPoints}
      enablePanDownToClose={false}
      enableDynamicSizing={false}
      handleIndicatorStyle={{ backgroundColor: '#CBD5E1', width: 40 }}
      backgroundStyle={{ borderRadius: 24 }}
    >
      <View className="flex-1 px-6 pt-2 pb-8">
        {/* Address Header */}
        <View className="flex-row items-center mb-6">
          <View className="w-12 h-12 bg-red-100 rounded-2xl items-center justify-center border border-red-200">
            <Text className="text-red-700 font-black text-xl">🚑</Text>
          </View>
          <View className="ml-4 flex-1">
            <Text className="text-slate-800 font-bold text-base">{activeDispatch?.locationName || ''}</Text>
            <Text className="text-slate-500 text-xs mt-0.5">via Fastest Route</Text>
          </View>
        </View>

        {/* Metrics Grid */}
        <View className="flex-row space-x-3 mb-6">
          <View className="flex-1 bg-white border border-slate-100 shadow-sm shadow-slate-200 rounded-2xl p-3 items-center justify-center">
            <Text className="text-red-700 font-bold text-xl">{activeDispatch?.eta?.replace('~', '') || ''}</Text>
            <Text className="text-slate-400 text-[9px] font-bold mt-1 uppercase tracking-widest">ETA</Text>
          </View>
          <View className="flex-1 bg-slate-50 border border-slate-100 rounded-2xl p-3 items-center justify-center">
            <Text className="text-[#1E3A8A] font-bold text-xl">{formatTime(elapsedTimeSeconds)}</Text>
            <Text className="text-slate-400 text-[9px] font-bold mt-1 uppercase tracking-widest">ELAPSED</Text>
          </View>
          <View className="flex-1 bg-white border border-slate-100 shadow-sm shadow-slate-200 rounded-2xl p-3 items-center justify-center">
            <Text className="text-[#1E3A8A] font-bold text-xl">
              {currentSpeedKph > 0 ? `${currentSpeedKph} km/h` : '0 km/h'}
            </Text>
            <Text className="text-slate-400 text-[9px] font-bold mt-1 uppercase tracking-widest">SPEED</Text>
          </View>
        </View>

        {/* Expandable Incident Report */}
        <View className={`mb-6 ${isExpanded ? 'flex-1' : ''}`}>
          <TouchableOpacity 
            activeOpacity={0.9} 
            onPress={toggleAccordion}
            className={`bg-[#B91C1C] px-5 py-4 flex-row items-center justify-between shadow-sm ${isExpanded ? 'rounded-t-2xl' : 'rounded-2xl'}`}
          >
            <View>
              <Text className="text-white font-bold text-sm">Incident Report</Text>
              <Text className="text-red-200 text-xs mt-0.5">Read before arrival</Text>
            </View>
            {isExpanded ? <ChevronUp color="white" size={24} /> : <ChevronDown color="white" size={24} />}
          </TouchableOpacity>

          {isExpanded && (
            <BottomSheetScrollView className="bg-white border-x border-b border-red-200 rounded-b-2xl" contentContainerStyle={{ padding: 20 }}>
              
              {/* Reporter */}
              <View className="flex-row items-center justify-between mb-6 pb-6 border-b border-slate-100">
                <View className="flex-row items-center">
                  <View className="w-12 h-12 rounded-full bg-[#1E3A8A] items-center justify-center">
                    <Text className="text-white font-bold text-lg">{activeDispatch?.reporterInitials}</Text>
                  </View>
                  <View className="ml-3">
                    <Text className="text-[#1E3A8A] font-bold text-base">{activeDispatch?.reporterName}</Text>
                    <Text className="text-slate-500 text-xs mt-0.5">+63 968 247 7183 · Just now</Text>
                  </View>
                </View>
                <View className="bg-red-100 px-3 py-1.5 rounded-full">
                  <Text className="text-red-700 text-[10px] font-black uppercase tracking-widest">CRITICAL</Text>
                </View>
              </View>

              {/* Details Grid */}
              <View className="flex-row mb-6 pb-6 border-b border-slate-100">
                <View className="flex-1 border-r border-slate-100 pr-4">
                  <Text className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">NATURE OF CALL</Text>
                  <Text className="text-[#1E3A8A] font-bold text-sm">{activeDispatch?.natureOfCall}</Text>
                </View>
                <View className="flex-1 pl-4">
                  <Text className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">TYPE OF EMERGENCY</Text>
                  <Text className="text-[#1E3A8A] font-bold text-sm">{activeDispatch?.typeOfEmergency || activeDispatch?.type}</Text>
                </View>
              </View>

              <View className="mb-6 pb-6 border-b border-slate-100">
                <Text className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-1">PEOPLE INVOLVED</Text>
                <Text className="text-[#1E3A8A] font-bold text-sm">{activeDispatch?.peopleInvolved}</Text>
              </View>

              {/* Attachment */}
              <View className="mb-6">
                <Text className="text-slate-400 text-[10px] font-bold tracking-widest uppercase mb-3">RESIDENT&apos;S ATTACHMENT</Text>
                {activeDispatch?.attachmentUrl ? (
                  <TouchableOpacity 
                    activeOpacity={0.9} 
                    onPress={() => setIsImageExpanded(true)}
                    className="rounded-xl overflow-hidden relative h-32 bg-slate-100"
                  >
                    <Image source={{ uri: activeDispatch?.attachmentUrl }} className="w-full h-full" resizeMode="cover" />
                    <View className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 flex-row justify-between items-center">
                      <Text className="text-white text-xs font-medium">IMG_7904.jpg</Text>
                      <Text className="text-white/80 text-[10px] font-semibold">Click to expand</Text>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View className="h-32 bg-slate-50 rounded-xl items-center justify-center border border-slate-200 border-dashed">
                    <ImageIcon color="#94A3B8" size={32} />
                    <Text className="text-slate-400 text-xs mt-2">No attachment</Text>
                  </View>
                )}
              </View>

              {/* GPS Text */}
              <View className="flex-row items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                <MapPin size={16} color="#1E3A8A" className="mt-0.5" />
                <Text className="text-[#1E3A8A] font-semibold text-xs ml-2 flex-1 leading-relaxed">
                  GPS: {activeDispatch?.locationName}
                </Text>
              </View>

            </BottomSheetScrollView>
          )}
        </View>

        {/* Arrived Button */}
        <TouchableOpacity 
          className="bg-[#1E3A8A] rounded-2xl py-4 items-center shadow-lg shadow-blue-900/20 active:bg-blue-900"
          onPress={confirmArrival}
        >
          <Text className="text-white font-bold text-lg">Arrived at Scene</Text>
        </TouchableOpacity>

      </View>
    </BottomSheet>

    {/* Lightbox Modal */}
    <Modal 
      visible={isImageExpanded} 
      transparent 
      animationType="fade"
      onRequestClose={() => setIsImageExpanded(false)}
    >
      <View className="flex-1 bg-black/95 justify-center items-center relative">
        <TouchableOpacity 
          onPress={() => setIsImageExpanded(false)}
          className="absolute top-12 right-6 w-12 h-12 bg-white/10 rounded-full items-center justify-center z-50 border border-white/15"
        >
          <X size={24} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        {activeDispatch?.attachmentUrl && (
          <Image 
            source={{ uri: activeDispatch.attachmentUrl }} 
            className="w-full h-5/6" 
            resizeMode="contain" 
          />
        )}

        <View className="absolute bottom-12 left-6 right-6 items-center">
          <Text className="text-white/60 text-xs font-medium text-center">
            Tap the X or outside to close the full view
          </Text>
        </View>
      </View>
    </Modal>
  </>
  );
}
