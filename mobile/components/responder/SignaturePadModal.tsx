import React, { useState, useRef } from 'react';
import { View, Text, TouchableOpacity, PanResponder, Modal } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { RotateCcw, Check, X, PenTool } from 'lucide-react-native';

interface SignaturePadModalProps {
  visible: boolean;
  title: string;
  subtitle?: string;
  initialPath?: string;
  onSave: (pathData: string) => void;
  onClose: () => void;
}

export function SignaturePadModal({
  visible,
  title,
  subtitle,
  initialPath,
  onSave,
  onClose,
}: SignaturePadModalProps) {
  const [paths, setPaths] = useState<string[]>(initialPath ? [initialPath] : []);
  const [currentPath, setCurrentPath] = useState<string>('');

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath(`M ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderMove: (evt) => {
        const { locationX, locationY } = evt.nativeEvent;
        setCurrentPath((prev) => `${prev} L ${locationX.toFixed(1)} ${locationY.toFixed(1)}`);
      },
      onPanResponderRelease: () => {
        setCurrentPath((prev) => {
          if (prev && prev.length > 5) {
            setPaths((p) => [...p, prev]);
          }
          return '';
        });
      },
    })
  ).current;

  const handleClear = () => {
    setPaths([]);
    setCurrentPath('');
  };

  const handleDone = () => {
    const fullPath = paths.join(' ');
    onSave(fullPath);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 bg-slate-900/80 justify-center items-center p-4">
        <View className="bg-white w-full max-w-lg rounded-3xl p-5 shadow-2xl">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-2">
            <View className="flex-1 pr-2">
              <Text className="text-[#1E3A8A] font-extrabold text-base">{title}</Text>
              {subtitle ? <Text className="text-slate-500 text-xs mt-0.5">{subtitle}</Text> : null}
            </View>
            <TouchableOpacity onPress={onClose} className="p-2 bg-slate-100 rounded-full">
              <X size={18} color="#64748B" />
            </TouchableOpacity>
          </View>

          {/* Canvas Box */}
          <View 
            className="w-full h-56 bg-slate-50 border-2 border-dashed border-slate-300 rounded-2xl overflow-hidden my-3 relative justify-center items-center"
            {...panResponder.panHandlers}
          >
            <Svg className="w-full h-full">
              {paths.map((p, i) => (
                <Path key={i} d={p} stroke="#1E3A8A" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {currentPath ? (
                <Path d={currentPath} stroke="#1E3A8A" strokeWidth={3.5} fill="none" strokeLinecap="round" strokeLinejoin="round" />
              ) : null}
            </Svg>
            {paths.length === 0 && !currentPath ? (
              <View className="absolute inset-0 justify-center items-center pointer-events-none">
                <PenTool size={32} color="#CBD5E1" />
                <Text className="text-slate-400 font-bold text-xs mt-2">Draw E-Signature here using finger</Text>
              </View>
            ) : null}
          </View>

          {/* Actions */}
          <View className="flex-row justify-between items-center mt-2">
            <TouchableOpacity 
              onPress={handleClear}
              className="flex-row items-center px-4 py-2.5 bg-slate-100 rounded-xl"
            >
              <RotateCcw size={16} color="#64748B" />
              <Text className="text-slate-600 font-bold text-xs ml-2">Clear</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleDone}
              className="flex-row items-center px-6 py-2.5 bg-[#1E3A8A] rounded-xl shadow-md"
            >
              <Check size={16} color="white" />
              <Text className="text-white font-bold text-xs ml-2">Save Signature</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}
