import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Platform, StatusBar, TextInput, ActivityIndicator, Alert } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ArrowLeft, User, MapPin, Award, CheckCircle, Edit3 } from 'lucide-react-native';
import { supabase } from '../../../lib/supabase';

export default function IncidentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [existingFeedback, setExistingFeedback] = useState<any>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [loadingFeedback, setLoadingFeedback] = useState(false);

  const reportId = Array.isArray(id) ? id[0] : id || '';
  const apiUrl = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:3000';

  const getAuthHeaders = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    const headers: any = {};
    if (session?.access_token) {
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }
    return headers;
  };

  const fetchReportDetails = async () => {
    try {
      const reqHeaders = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/api/reports/${reportId}`, {
        headers: reqHeaders,
      });
      const data = await response.json();
      if (!data.error) {
        setReport(data);
      }
    } catch (error) {
      console.error('Error fetching report details:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch existing feedback for this incident
  const fetchExistingFeedback = async (incidentId: string) => {
    setLoadingFeedback(true);
    try {
      const reqHeaders = await getAuthHeaders();
      const response = await fetch(`${apiUrl}/api/incidents/feedback?incidentId=${incidentId}`, {
        headers: reqHeaders,
      });
      const data = await response.json();
      if (data.success && data.feedback) {
        setExistingFeedback(data.feedback);
        setRating(data.feedback.rating);
        setFeedback(data.feedback.comment || '');
      }
    } catch (err) {
      console.warn('[ReportDetail] Could not fetch existing feedback:', err);
    } finally {
      setLoadingFeedback(false);
    }
  };

  useEffect(() => {
    if (reportId) {
      fetchReportDetails();
    }
  }, [reportId]);

  // Once report is loaded, fetch existing feedback
  useEffect(() => {
    if (report?.incidentId) {
      fetchExistingFeedback(report.incidentId);
    }
  }, [report?.incidentId]);

  const handleFeedbackSubmit = async () => {
    if (rating === 0) {
      Alert.alert("Rating Required", "Please select a star rating before submitting.");
      return;
    }
    setSubmittingFeedback(true);
    try {
      const reqHeaders = await getAuthHeaders();
      reqHeaders['Content-Type'] = 'application/json';

      const response = await fetch(`${apiUrl}/api/incidents/feedback`, {
        method: 'POST',
        headers: reqHeaders,
        body: JSON.stringify({
          incidentId: report?.incidentId,
          reportId: report?.id,
          rating,
          feedback: feedback || undefined,
        })
      });
      const res = await response.json();
      if (res.success) {
        setExistingFeedback(res.feedback);
        setIsEditing(false);
        Alert.alert(
          res.updated ? "Feedback Updated" : "Thank You!",
          res.updated 
            ? "Your feedback has been updated successfully." 
            : "Your feedback has been recorded. Thank you for helping us improve!"
        );
      } else {
        Alert.alert("Error", res.error || "Failed to submit feedback.");
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      Alert.alert("Error", "An error occurred while submitting feedback.");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const renderStar = (index: number) => {
    const isFilled = index <= rating;
    const isDisabled = existingFeedback && !isEditing;
    return (
      <TouchableOpacity 
        key={index} 
        onPress={() => !isDisabled && setRating(index)}
        disabled={!!isDisabled}
        activeOpacity={isDisabled ? 1 : 0.6}
      >
        <Text style={{ fontSize: 40, color: isFilled ? '#EF4444' : '#CBD5E1', marginHorizontal: 4 }}>
          ★
        </Text>
      </TouchableOpacity>
    );
  };

  if (loading) {
    return (
      <View className="flex-1 bg-slate-50 justify-center items-center">
        <ActivityIndicator size="large" color="#1E3A8A" />
        <Text className="text-slate-500 font-bold mt-4">Loading Report details...</Text>
      </View>
    );
  }

  if (!report) {
    return (
      <View className="flex-1 bg-slate-50 justify-center items-center px-6">
        <Text className="text-slate-500 font-bold text-center mb-6">Report not found or has not been fully resolved by the responders.</Text>
        <TouchableOpacity className="bg-[#1E3A8A] px-6 py-3 rounded-full" onPress={() => router.back()}>
          <Text className="text-white font-bold">Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const hasSubmittedFeedback = !!existingFeedback && !isEditing;

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
        <Text className="text-sm text-blue-200 ml-9">{report.id} · {report.type}</Text>
      </View>

      <ScrollView className="flex-1 px-6 -mt-4" showsVerticalScrollIndicator={false}>
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1 mt-6">RESPONSE TIMELINE</Text>
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
          {report.logs?.map((log: any, idx: number) => {
            const isLast = idx === (report.logs?.length - 1);
            return (
              <View className="flex-row mb-6" key={idx}>
                <View className="items-center mr-4">
                  <View className="w-3.5 h-3.5 rounded-full bg-[#EF4444] items-center justify-center">
                    <View className="w-1.5 h-1.5 rounded-full bg-white" />
                  </View>
                  {!isLast && <View className="w-[2px] bg-slate-200 flex-1 my-1" />}
                </View>
                <View className="flex-1 pb-2">
                  <Text className="text-base font-bold text-slate-800">{log.action}</Text>
                  <Text className="text-sm text-slate-500">{report.date} · {log.time}</Text>
                </View>
              </View>
            );
          })}
        </View>

        <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">REPORT INFO SUMMARY</Text>
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row justify-between mb-5">
            <Text className="text-sm font-medium text-slate-500">Report ID</Text>
            <Text className="text-sm font-bold text-slate-800">{report.id}</Text>
          </View>
          <View className="flex-row justify-between mb-5 items-center">
            <Text className="text-sm font-medium text-slate-500">Type</Text>
            <Text className="text-sm font-bold text-slate-800">{report.type}</Text>
          </View>
          <View className="flex-row justify-between mb-5 items-center">
            <Text className="text-sm font-medium text-slate-500">Severity</Text>
            <View className="bg-blue-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-bold text-[#1E3A8A] uppercase">{report.severityLevel || 'MODERATE'}</Text>
            </View>
          </View>
          <View className="flex-row justify-between mb-5">
            <Text className="text-sm font-medium text-slate-500">Location</Text>
            <Text className="text-sm font-bold text-slate-800" numberOfLines={1}>{report.location}</Text>
          </View>
          <View className="flex-row justify-between mb-5">
            <Text className="text-sm font-medium text-slate-500">Nature of Call</Text>
            <Text className="text-sm font-bold text-slate-800 uppercase">{report.natureOfCall || 'EMERGENCY'}</Text>
          </View>
          <View className="flex-row justify-between">
            <Text className="text-sm font-medium text-slate-500">Handled by</Text>
            <Text className="text-sm font-bold text-slate-800">{report.responderName || 'CDRRMO Team'}</Text>
          </View>
        </View>

        <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">RESPONDER NOTE</Text>
        <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-6">
          <View className="flex-row items-center mb-5">
            <View className="w-12 h-12 rounded-full bg-blue-100 items-center justify-center mr-4">
              <User size={24} color="#1E3A8A" />
            </View>
            <View>
              <Text className="text-base font-bold text-slate-800">{report.responderName || 'Ambulance Responder'}</Text>
              <Text className="text-xs text-slate-500">Ambulance Crew · {report.date}</Text>
            </View>
          </View>
          <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <Text className="text-sm text-slate-600 leading-6">
              {report.crewFindings || 'No crew findings or medical logs were attached to this report.'}
            </Text>
          </View>
        </View>

        {/* FEEDBACK SECTION */}
        <Text className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 ml-1">
          {hasSubmittedFeedback ? 'YOUR FEEDBACK' : 'RATE US'}
        </Text>

        {loadingFeedback ? (
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-10 items-center py-10">
            <ActivityIndicator size="small" color="#1E3A8A" />
            <Text className="text-slate-400 font-medium mt-2 text-sm">Loading feedback...</Text>
          </View>
        ) : hasSubmittedFeedback ? (
          /* Already submitted — show read-only feedback with edit option */
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-10">
            <View className="flex-row items-center mb-4">
              <View className="w-10 h-10 rounded-full bg-green-100 items-center justify-center mr-3">
                <CheckCircle size={20} color="#16A34A" />
              </View>
              <View className="flex-1">
                <Text className="text-base font-bold text-slate-800">Feedback Submitted</Text>
                <Text className="text-xs text-slate-400 mt-0.5">
                  {existingFeedback.updatedAt !== existingFeedback.createdAt 
                    ? `Updated ${new Date(existingFeedback.updatedAt).toLocaleDateString()}`
                    : `Submitted ${new Date(existingFeedback.createdAt).toLocaleDateString()}`
                  }
                </Text>
              </View>
            </View>

            <View className="flex-row justify-center mb-4">
              {[1, 2, 3, 4, 5].map((index) => (
                <Text key={index} style={{ fontSize: 32, color: index <= existingFeedback.rating ? '#EF4444' : '#CBD5E1', marginHorizontal: 3 }}>
                  ★
                </Text>
              ))}
            </View>

            {existingFeedback.comment ? (
              <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mb-4">
                <Text className="text-sm text-slate-600 leading-relaxed">"{existingFeedback.comment}"</Text>
              </View>
            ) : (
              <Text className="text-sm text-slate-400 text-center mb-4">No additional comments</Text>
            )}

            <TouchableOpacity 
              className="border border-[#1E3A8A] py-3.5 rounded-2xl items-center flex-row justify-center"
              onPress={() => setIsEditing(true)}
            >
              <Edit3 size={16} color="#1E3A8A" strokeWidth={2.5} />
              <Text className="text-[#1E3A8A] text-base font-bold ml-2">Edit Feedback</Text>
            </TouchableOpacity>
          </View>
        ) : (
          /* Feedback form — for new submissions or edit mode */
          <View className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 mb-10">
            {isEditing && (
              <View className="bg-blue-50 rounded-xl px-4 py-2.5 mb-4 flex-row items-center">
                <Edit3 size={14} color="#1E3A8A" strokeWidth={2.5} />
                <Text className="text-xs font-bold text-[#1E3A8A] ml-2">Editing your previous feedback</Text>
              </View>
            )}
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
            <View className={isEditing ? "flex-row" : ""}>
              {isEditing && (
                <TouchableOpacity 
                  className="flex-1 border border-slate-200 py-4 rounded-2xl items-center mr-2"
                  onPress={() => {
                    setIsEditing(false);
                    // Restore original values
                    setRating(existingFeedback.rating);
                    setFeedback(existingFeedback.comment || '');
                  }}
                >
                  <Text className="text-slate-500 text-base font-bold">Cancel</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity 
                className={`bg-[#1E3A8A] py-4 rounded-2xl items-center shadow-sm ${isEditing ? 'flex-1 ml-2' : ''}`}
                onPress={handleFeedbackSubmit}
                disabled={submittingFeedback}
              >
                {submittingFeedback ? (
                  <ActivityIndicator color="#FFFFFF" />
                ) : (
                  <Text className="text-white text-base font-bold">
                    {isEditing ? 'Update Feedback' : 'Submit Feedback'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
