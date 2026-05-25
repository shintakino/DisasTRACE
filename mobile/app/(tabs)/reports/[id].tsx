import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, StatusBar, TextInput } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, User, X, Truck } from 'lucide-react-native';
import { Image } from 'react-native';
export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [rating, setRating] = useState(4);
  const [feedback, setFeedback] = useState('');

  // Default mock data based on design 18/19/20
  const reportId = Array.isArray(id) ? id[0] : id || 'DR-2026-0841';
  const type = 'Medical Emergency';

  const renderStar = (index: number) => {
    const isFilled = index <= rating;
    return (
      <TouchableOpacity key={index} onPress={() => setRating(index)}>
        <Text style={{ fontSize: 40, color: isFilled ? '#64748B' : '#CBD5E1', marginHorizontal: 2 }}>
          ★
        </Text>
      </TouchableOpacity>
    );
  };


  return (
    <View className="flex-1 bg-slate-50">
      <View className="bg-[#1E3A8A] pt-14 pb-8 px-6" style={{ paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight! + 20 : 60 }}>
        <TouchableOpacity 
          className="flex-row items-center mb-1" 
          onPress={() => router.back()}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
          <ArrowLeft color="#FFFFFF" size={24} strokeWidth={2.5} />
          <Text className="text-2xl font-bold text-white ml-3">Incident Detail</Text>
        </TouchableOpacity>
        <Text className="text-sm text-blue-200 ml-9">{reportId} · {type}</Text>
      </View>

      <ScrollView className="flex-1 px-6 -mt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1 mt-6">RESPONSE TIMELINE</Text>
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
          
          <View className="flex-row mb-6">
            <View className="items-center mr-4">
              <View className="w-3 h-3 rounded-full bg-[#1E3A8A]" />
              <View className="w-[2px] bg-slate-200 flex-1 my-1" />
            </View>
            <View className="flex-1 pb-2">
              <Text className="text-base font-bold text-slate-800">Report Submitted</Text>
              <Text className="text-sm text-slate-500">Mar 10 · 02:10 PM · Non-emergency</Text>
            </View>
          </View>
          
          <View className="flex-row mb-6">
            <View className="items-center mr-4">
              <View className="w-3 h-3 rounded-full bg-[#1E3A8A]" />
              <View className="w-[2px] bg-slate-200 flex-1 my-1" />
            </View>
            <View className="flex-1 pb-2">
              <Text className="text-base font-bold text-slate-800">Reviewed by PACC</Text>
              <Text className="text-sm text-slate-500">Mar 10 · 02:12 PM · Officer J. Dela Cruz</Text>
            </View>
          </View>
          
          <View className="flex-row mb-6">
            <View className="items-center mr-4">
              <View className="w-3 h-3 rounded-full bg-[#1E3A8A]" />
              <View className="w-[2px] bg-slate-200 flex-1 my-1" />
            </View>
            <View className="flex-1 pb-2">
              <Text className="text-base font-bold text-slate-800">Transferred to Barangay</Text>
              <Text className="text-sm text-slate-500">Mar 10 · 02:14 PM · Tarcan Barangay Hall</Text>
            </View>
          </View>

          <View className="flex-row mb-6">
            <View className="items-center mr-4">
              <View className="w-3 h-3 rounded-full bg-[#1E3A8A]" />
              <View className="w-[2px] bg-slate-200 flex-1 my-1" />
            </View>
            <View className="flex-1 pb-2">
              <Text className="text-base font-bold text-slate-800">Barangay Responded</Text>
              <Text className="text-sm text-slate-500">Mar 10 · 02:31 PM · Scene cleared</Text>
            </View>
          </View>

          <View className="flex-row">
            <View className="items-center mr-4">
              <View className="w-3 h-3 rounded-full bg-[#1E3A8A]" />
            </View>
            <View className="flex-1 pb-0">
              <Text className="text-base font-bold text-slate-800">Incident Resolved</Text>
              <Text className="text-sm text-slate-500">Mar 10 · 02:44 PM · Response Time: 34 min</Text>
            </View>
          </View>

        </View>

        <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">REPORT INFO SUMMARY</Text>
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row justify-between mb-5">
            <Text className="text-sm font-medium text-slate-500">Report ID</Text>
            <Text className="text-sm font-bold text-slate-800">{reportId}</Text>
          </View>
          <View className="flex-row justify-between mb-5 items-center">
            <Text className="text-sm font-medium text-slate-500">Type</Text>
            <Text className="text-sm font-bold text-slate-800">{type}</Text>
          </View>
          <View className="flex-row justify-between mb-5 items-center">
            <Text className="text-sm font-medium text-slate-500">Severity</Text>
            <View className="bg-blue-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-[#1E3A8A] uppercase">MODERATE</Text>
            </View>
          </View>
          <View className="flex-row justify-between mb-5">
            <Text className="text-sm font-medium text-slate-500">Location</Text>
            <Text className="text-sm font-bold text-slate-800">Tarcan, Baliwag, Bulacan</Text>
          </View>
          <View className="flex-row justify-between mb-5">
            <Text className="text-sm font-medium text-slate-500">Response Time</Text>
            <Text className="text-sm font-bold text-red-600">35 minutes</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm font-medium text-slate-500">Handled by</Text>
            <Text className="text-sm font-bold text-slate-800">Tarcan Barangay</Text>
          </View>
        </View>

        <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">RESPONDER NOTE</Text>
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row items-center mb-5">
            <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-4">
              <User size={24} color="#1E3A8A" />
            </View>
            <View>
              <Text className="text-base font-bold text-slate-800">Officer J. Dela Cruz</Text>
              <Text className="text-xs text-slate-500">Barangay Officer · Mar 10, 02:44 PM</Text>
            </View>
          </View>
          <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Text className="text-sm text-slate-600 leading-6">
              Patient complained of mild dizziness and was assisted by barangay responders. Patient was transported to the nearest hospital for check-up. Patient was endorsed to hospital staff upon arrival.
            </Text>
          </View>
        </View>

        <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">RATE US</Text>
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-10">
          <Text className="text-base font-bold text-slate-800 mb-4">How was the response?</Text>
          <View className="flex-row justify-center mb-6">
            {[1, 2, 3, 4, 5].map(renderStar)}
          </View>
          <TextInput 
            className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-slate-800 h-28 text-left align-top mb-6"
            placeholder="Leave a note (optional)..."
            placeholderTextColor="#94A3B8"
            multiline
            value={feedback}
            onChangeText={setFeedback}
          />
          <TouchableOpacity className="bg-[#1E3A8A] py-4 rounded-2xl items-center shadow-sm">
            <Text className="text-white text-base font-bold">Submit Feedback</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>
    </View>
  );
}
