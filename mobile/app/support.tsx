import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft2, Call, Sms, Location, ArrowDown2, ArrowRight2 } from 'iconsax-react-native';

export default function SupportScreen() {
  const router = useRouter();
  const [expandedFaq, setExpandedFaq] = useState<number | null>(0);

  const faqs = [
    {
      question: "How do I report an emergency?",
      answer: "Go to the 'Reports' tab and tap 'Report Emergency'. Select the disaster type, capture or upload an image, add your location, and submit. CDRRMO will dispatch responders immediately."
    },
    {
      question: "Can I update my report after submitting?",
      answer: "Currently, submitted reports cannot be edited to ensure accurate timestamps. However, you can add comments or updates through the specific report's tracking page."
    },
    {
      question: "How do I know if a responder is coming?",
      answer: "You will receive push notifications when your report status changes to 'Responding'. You can also track the responder's unit and status in the tracking page."
    },
    {
      question: "What should I do if my location is wrong?",
      answer: "Make sure you have granted GPS/Location permissions to the DisasTRACE app in your phone's settings. For best accuracy, stay outdoors or near a window when pinning your location."
    }
  ];

  const toggleFaq = (index: number) => {
    if (expandedFaq === index) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(index);
    }
  };

  const handleCall = () => {
    Linking.openURL('tel:0447610000');
  };

  const handleEmail = () => {
    Linking.openURL('mailto:cdrrmobaliwag@gmail.com');
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <View className="bg-[#1E3A8A] pt-16 pb-6 px-6 rounded-b-3xl relative z-10 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-4"
          >
            <ArrowLeft2 size={24} color="#FFFFFF" variant="Outline" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Help & Support</Text>
        </View>
      </View>

      <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
        
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Contact CDRRMO Baliwag</Text>
        
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-8">
          <TouchableOpacity 
            className="flex-row items-center mb-5"
            onPress={handleCall}
          >
            <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center mr-4">
              <Call size={24} color="#1E3A8A" variant="Bold" />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-slate-500">Emergency Hotline</Text>
              <Text className="text-lg font-bold text-slate-800">(044) 761-0000</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity 
            className="flex-row items-center mb-5"
            onPress={handleEmail}
          >
            <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center mr-4">
              <Sms size={24} color="#1E3A8A" variant="Bold" />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-slate-500">Email Address</Text>
              <Text className="text-base font-bold text-slate-800">cdrrmobaliwag@gmail.com</Text>
            </View>
          </TouchableOpacity>

          <View className="flex-row items-center">
            <View className="w-12 h-12 bg-blue-50 rounded-2xl items-center justify-center mr-4">
              <Location size={24} color="#1E3A8A" variant="Bold" />
            </View>
            <View className="flex-1">
              <Text className="text-sm text-slate-500">Command Center</Text>
              <Text className="text-sm font-bold text-slate-800 leading-tight">
                Baliwag Government Center, Brgy. Bagong Nayon, Baliwag City, Bulacan
              </Text>
            </View>
          </View>
        </View>

        <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Frequently Asked Questions</Text>
        
        <View className="mb-10">
          {faqs.map((faq, index) => (
            <View 
              key={index} 
              className={`bg-white border ${expandedFaq === index ? 'border-blue-200' : 'border-slate-100'} rounded-2xl mb-3 shadow-sm overflow-hidden`}
            >
              <TouchableOpacity 
                className="flex-row justify-between items-center p-4"
                onPress={() => toggleFaq(index)}
              >
                <Text className="text-sm font-bold text-slate-800 flex-1 pr-4">
                  {faq.question}
                </Text>
                {expandedFaq === index ? (
                  <ArrowDown2 size={18} color="#1E3A8A" />
                ) : (
                  <ArrowRight2 size={18} color="#94A3B8" />
                )}
              </TouchableOpacity>
              
              {expandedFaq === index && (
                <View className="px-4 pb-4 pt-1">
                  <View className="h-[1px] bg-slate-100 w-full mb-3" />
                  <Text className="text-sm text-slate-600 leading-relaxed">
                    {faq.answer}
                  </Text>
                </View>
              )}
            </View>
          ))}
        </View>

      </ScrollView>
    </View>
  );
}
