import React from 'react';
import { Text, TouchableOpacity, View } from 'react-native';
import { Card } from './ui/Card';
import { User, Ambulance } from 'lucide-react-native';
import { MotiView } from 'moti';

interface RoleCardProps {
  role: 'resident' | 'responder';
  onPress: () => void;
}

export const RoleCard: React.FC<RoleCardProps> = ({ role, onPress }) => {
  const isResident = role === 'resident';
  
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} className="w-full mb-4">
      <MotiView
        from={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ type: 'timing', duration: 300 }}
      >
        <Card className="flex-row items-center space-x-4 border-2 border-transparent">
          <View className={`p-4 rounded-full ${isResident ? 'bg-blue-50' : 'bg-blue-100'}`}>
            {isResident ? (
              <User size={32} color="#1E3A8A" />
            ) : (
              <Ambulance size={32} color="#1E3A8A" />
            )}
          </View>
          <View className="flex-1 ml-4">
            <Text className="text-xl font-bold text-gray-900">
              {isResident ? 'Resident' : 'Responder'}
            </Text>
            <Text className="text-gray-500 text-sm">
              {isResident 
                ? 'Public user for reporting incidents and tracking ambulances' 
                : 'Emergency responders for accepting dispatches'}
            </Text>
          </View>
        </Card>
      </MotiView>
    </TouchableOpacity>
  );
};
