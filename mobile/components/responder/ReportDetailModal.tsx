import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Modal, Image } from 'react-native';
import { X, Truck, Image as ImageIcon } from 'lucide-react-native';

export function ReportDetailModal({ 
  visible, 
  report, 
  onClose 
}: { 
  visible: boolean; 
  report: any; 
  onClose: () => void 
}) {
  const [activeTab, setActiveTab] = useState('FROM RESIDENT');
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  if (!report) return null;

  return (
    <>
      <Modal visible={visible} transparent animationType="fade">
      <View className="flex-1 bg-black/40 justify-center items-center p-4">
        <View className="bg-white rounded-3xl w-full max-w-md shadow-lg overflow-hidden mt-10" style={{ maxHeight: '85%' }}>
          
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 20 }}>
            {/* Header section with Close Button */}
            <View className="p-6 pb-2">
              <View className="flex-row justify-between items-start mb-6">
                <View className="flex-1">
                  <View className="flex-row items-center mb-4">
                    <View className="w-10 h-10 rounded-full bg-[#1E3A8A] items-center justify-center mr-3">
                      <Text className="text-white font-bold">RB</Text>
                    </View>
                    <View>
                      <Text className="text-base font-bold text-slate-800">Renzy Bastes</Text>
                      <Text className="text-xs text-slate-500">Responder</Text>
                    </View>
                  </View>
                  <View className="flex-row items-center">
                    <View className="w-10 h-10 rounded-full bg-[#1E3A8A] items-center justify-center mr-3">
                      <Text className="text-white font-bold">CG</Text>
                    </View>
                    <View>
                      <Text className="text-base font-bold text-slate-800">Christopher Guanzing</Text>
                      <Text className="text-xs text-slate-500">Responder</Text>
                    </View>
                  </View>
                </View>
                
                <TouchableOpacity 
                  onPress={onClose}
                  className="w-10 h-10 bg-blue-50 rounded-full items-center justify-center"
                >
                  <X size={20} color="#1E3A8A" strokeWidth={2.5} />
                </TouchableOpacity>
              </View>

              {/* ID and Ambulance Icon */}
              <View className="items-center justify-center mb-6">
                <View className="w-16 h-16 rounded-full bg-slate-100 items-center justify-center mb-3">
                  <Truck size={32} color="#1E3A8A" />
                </View>
                <Text className="text-xl font-bold text-slate-800">{report.id}</Text>
                <Text className="text-sm font-bold text-slate-500 mt-1">AMB-001</Text>
              </View>

              {/* Tabs */}
              <View className="flex-row items-center mb-6">
                <TouchableOpacity 
                  onPress={() => setActiveTab('INCIDENT INFORMATION')}
                  className={`mr-4 pb-1`}
                >
                  <Text className={`text-xs font-bold uppercase ${activeTab === 'INCIDENT INFORMATION' ? 'text-slate-500' : 'text-slate-300'}`}>
                    INCIDENT INFORMATION
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => setActiveTab('FROM RESIDENT')}
                  className={`px-4 py-1.5 rounded-full ${activeTab === 'FROM RESIDENT' ? 'bg-[#E0E7FF]' : 'bg-transparent'}`}
                >
                  <Text className={`text-xs font-bold uppercase ${activeTab === 'FROM RESIDENT' ? 'text-[#1E3A8A]' : 'text-slate-300'}`}>
                    FROM RESIDENT
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Content Body */}
            <View className="px-6">
              {activeTab === 'FROM RESIDENT' ? (
                <>
                  <Text className="text-xs font-bold text-[#1E3A8A] uppercase tracking-widest mb-4">RESIDENT'S REPORT</Text>
              
              <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-6">
                <View className="flex-row justify-between mb-4">
                  <Text className="text-sm font-medium text-slate-500">Nature of Call</Text>
                  <Text className="text-sm font-bold text-[#1E3A8A]">{report.natureOfCall || 'Emergency'}</Text>
                </View>
                <View className="flex-row justify-between mb-4 items-center">
                  <Text className="text-sm font-medium text-slate-500">Type of Emergency</Text>
                  <Text className="text-sm font-bold text-[#1E3A8A]">{report.type}</Text>
                </View>
                <View className="flex-row justify-between mb-4 items-center">
                  <Text className="text-sm font-medium text-slate-500">Severity Level</Text>
                  <Text className="text-sm font-bold text-[#1E3A8A]">{report.severityLevel || 'Critical'}</Text>
                </View>
                <View className="flex-row justify-between mb-4">
                  <Text className="text-sm font-medium text-slate-500">People Involved</Text>
                  <Text className="text-sm font-bold text-[#1E3A8A]">{report.peopleInvolved !== undefined ? String(report.peopleInvolved) : '3'}</Text>
                </View>
                <View className="flex-row justify-between mb-6">
                  <Text className="text-sm font-medium text-slate-500">Location</Text>
                  <Text className="text-sm font-bold text-[#1E3A8A]">{report.location}</Text>
                </View>
                
                {/* Attached Image */}
                <View className="w-full">
                  {report.residentPhotoUrl ? (
                    <TouchableOpacity 
                      activeOpacity={0.9} 
                      onPress={() => setExpandedImage(report.residentPhotoUrl)}
                      className="w-full h-32 bg-slate-100 rounded-xl overflow-hidden relative justify-end"
                    >
                      <Image 
                        source={{ uri: report.residentPhotoUrl }} 
                        className="absolute inset-0 w-full h-full" 
                        resizeMode="cover" 
                      />
                      <View className="absolute inset-0 bg-black/10" />
                      <View className="absolute bottom-0 left-0 right-0 bg-black/60 p-2 flex-row justify-between items-center">
                        <Text className="text-white text-xs font-semibold">IMG_7904.jpg</Text>
                        <Text className="text-white/80 text-[10px] font-medium">Click to expand</Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View className="w-full h-32 bg-slate-50 rounded-xl items-center justify-center border border-slate-200 border-dashed">
                      <ImageIcon color="#94A3B8" size={32} />
                      <Text className="text-slate-400 text-xs mt-2 font-medium">No attached image</Text>
                    </View>
                  )}
                </View>
              </View>

              {report.status !== 'RESPONDING' && (
                <>
                  <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">CREW'S ACTUAL FINDINGS {report.status === 'ONGOING' ? '(DRAFT)' : ''}</Text>
                  
                  <View className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-6">
                    <View className="flex-row justify-between mb-4">
                      <Text className="text-sm font-medium text-slate-500">Nature of Call</Text>
                      <Text className="text-sm font-bold text-[#1E3A8A]">{report.natureOfCall || 'Emergency'}</Text>
                    </View>
                    <View className="flex-row justify-between mb-4 items-center">
                      <Text className="text-sm font-medium text-slate-500">Type of Emergency</Text>
                      <Text className="text-sm font-bold text-[#1E3A8A]">{report.type}</Text>
                    </View>
                    <View className="flex-row justify-between mb-4 items-center">
                      <Text className="text-sm font-medium text-slate-500">Severity Level</Text>
                      <Text className="text-sm font-bold text-[#1E3A8A]">{report.severityLevel || 'Critical'}</Text>
                    </View>
                    <View className="flex-row justify-between mb-4">
                      <Text className="text-sm font-medium text-slate-500">People Involved</Text>
                      <Text className="text-sm font-bold text-[#1E3A8A]">{report.peopleInvolved !== undefined ? String(report.peopleInvolved) : '3'}</Text>
                    </View>
                    <View className="flex-row justify-between mb-4">
                      <Text className="text-sm font-medium text-slate-500">Location</Text>
                      <Text className="text-sm font-bold text-[#1E3A8A]">{report.location}</Text>
                    </View>

                    {/* Dynamic Crew Notes */}
                    {report.crewFindings && (
                      <View className="bg-slate-50 p-4 rounded-2xl border border-slate-100 mt-2 mb-4">
                        <Text className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Crew Notes</Text>
                        <Text className="text-sm text-slate-600 leading-relaxed">{report.crewFindings}</Text>
                      </View>
                    )}

                    {/* Scene Photos if available */}
                    {report.scenePhotos && report.scenePhotos.length > 0 && (
                      <View className="mt-2">
                        <Text className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">SCENE PHOTOS</Text>
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row">
                          {report.scenePhotos.map((photo: string, idx: number) => (
                            <TouchableOpacity
                              key={idx}
                              activeOpacity={0.9}
                              onPress={() => setExpandedImage(photo)}
                              className="w-20 h-20 bg-slate-100 rounded-xl overflow-hidden border border-slate-100 mr-3 relative"
                            >
                              <Image source={{ uri: photo }} className="w-full h-full" resizeMode="cover" />
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                </>
              )}
              </>
            ) : (
              <View className="items-center justify-center py-10">
                <Text className="text-slate-400">Incident information details...</Text>
              </View>
            )}
            </View>
          </ScrollView>
        </View>
      </View>
    </Modal>

    {/* Lightbox Modal */}
    <Modal 
      visible={!!expandedImage} 
      transparent 
      animationType="fade"
      onRequestClose={() => setExpandedImage(null)}
    >
      <View className="flex-1 bg-black/95 justify-center items-center relative">
        <TouchableOpacity 
          onPress={() => setExpandedImage(null)}
          className="absolute top-12 right-6 w-12 h-12 bg-white/10 rounded-full items-center justify-center z-50 border border-white/15"
        >
          <X size={24} color="#FFFFFF" strokeWidth={2.5} />
        </TouchableOpacity>

        {expandedImage && (
          <Image 
            source={{ uri: expandedImage }} 
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
