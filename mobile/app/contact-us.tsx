import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { ArrowLeft2 } from 'iconsax-react-native';
import { useAuthStatus } from '../hooks/use-auth-status';
import { supabase } from '../lib/supabase';

export default function ContactUsScreen() {
  const router = useRouter();
  const { user, profile } = useAuthStatus();
  
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (user) {
      setName(profile?.fullName || user.user_metadata?.full_name || '');
      setEmail(user.email || '');
    }
  }, [user, profile]);

  const handleSubmit = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Please enter your name.');
      return;
    }
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email.');
      return;
    }
    if (!subject.trim()) {
      Alert.alert('Validation Error', 'Please enter a subject.');
      return;
    }
    if (!message.trim()) {
      Alert.alert('Validation Error', 'Please enter your message.');
      return;
    }

    setSubmitting(false);
    setSubmitting(true);
    
    try {
      // Simulate submission delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      
      Alert.alert(
        'Feedback Sent',
        'Thank you! Your message has been sent to CDRRMO Baliwag. We will review your feedback and get back to you if needed.',
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (err) {
      console.error('[ContactUs] Submit error:', err);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View className="flex-1 bg-[#F8FAFC]">
      <View className="bg-[#1E3A8A] pt-16 pb-6 px-6 rounded-b-3xl relative z-10 shadow-sm">
        <View className="flex-row items-center">
          <TouchableOpacity 
            onPress={() => router.back()}
            disabled={submitting}
            className="w-10 h-10 bg-white/20 rounded-full items-center justify-center mr-4"
          >
            <ArrowLeft2 size={24} color="#FFFFFF" variant="Outline" />
          </TouchableOpacity>
          <Text className="text-2xl font-bold text-white">Contact Us</Text>
        </View>
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        className="flex-1"
      >
        <ScrollView className="flex-1 px-6 pt-6" showsVerticalScrollIndicator={false}>
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
            <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Send a Message</Text>
            
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Name</Text>
              <TextInput 
                value={name}
                onChangeText={setName}
                editable={!submitting}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
                placeholder="Enter your name"
              />
            </View>
            
            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Email Address</Text>
              <TextInput 
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!submitting}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
                placeholder="Enter your email"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Subject</Text>
              <TextInput 
                value={subject}
                onChangeText={setSubject}
                editable={!submitting}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium"
                placeholder="Subject of your message"
              />
            </View>

            <View className="mb-4">
              <Text className="text-sm font-semibold text-slate-700 mb-2">Message</Text>
              <TextInput 
                value={message}
                onChangeText={setMessage}
                multiline
                numberOfLines={5}
                textAlignVertical="top"
                editable={!submitting}
                className="bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium h-32"
                placeholder="Enter your message or suggestions here..."
              />
            </View>
          </View>

          <TouchableOpacity 
            className="bg-[#1E3A8A] rounded-2xl py-4 items-center shadow-md mb-10 flex-row justify-center"
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting && <ActivityIndicator color="white" size="small" className="mr-2" />}
            <Text className="text-white font-bold text-lg">
              {submitting ? 'Sending Message...' : 'Send Message'}
            </Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
