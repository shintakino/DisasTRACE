import React, { useEffect, useRef, useState, type RefObject } from 'react';
import { ActivityIndicator, Keyboard, KeyboardAvoidingView, Modal, Platform, ScrollView, Text, TextInput, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { keyboardViewportHeight } from '../../lib/otp-input';

interface Props {
  visible: boolean;
  phone: string;
  digits: string[];
  inputRefs: RefObject<TextInput | null>[];
  error: string | null;
  verifying: boolean;
  resending: boolean;
  timer: number;
  onClose: () => void;
  onChange: (text: string, index: number) => void;
  onBackspace: (index: number) => void;
  onResend: () => void;
}

export function OtpVerificationModal(props: Props) {
  const root = useRef<View>(null);
  const scroll = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  const { height } = useWindowDimensions();
  const [frame, setFrame] = useState({ top: 0, height });
  const [keyboardTop, setKeyboardTop] = useState<number | null>(null);
  const measure = () => root.current?.measureInWindow((_x, top, _width, measuredHeight) => setFrame({ top, height: measuredHeight }));
  useEffect(() => {
    if (!props.visible) return;
    const show = Keyboard.addListener('keyboardDidShow', event => {
      setKeyboardTop(event.endCoordinates.screenY);
      requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: false }));
    });
    const hide = Keyboard.addListener('keyboardDidHide', () => setKeyboardTop(null));
    return () => { show.remove(); hide.remove(); };
  }, [props.visible]);
  const availableHeight = Platform.OS === 'android' ? keyboardViewportHeight(frame.top, frame.height, keyboardTop) : undefined;

  return (
    <Modal visible={props.visible} transparent animationType="slide" onRequestClose={props.onClose}
      onShow={() => { setKeyboardTop(null); measure(); props.inputRefs[0].current?.focus(); }}>
      <View ref={root} className="flex-1 bg-black/60" onLayout={measure}>
        <KeyboardAvoidingView style={availableHeight === undefined ? { flex: 1 } : { height: availableHeight }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView ref={scroll} className="flex-1" contentContainerStyle={{ flexGrow: 1, justifyContent: 'flex-end' }}
            keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            <TouchableOpacity className="flex-grow min-h-4" activeOpacity={1} onPress={props.onClose} accessibilityLabel="Close phone verification" />
            <View className="bg-[#0B1536] rounded-t-[32px] p-6" style={{ paddingBottom: keyboardTop === null ? Math.max(insets.bottom, 16) + 16 : 16 }}>
              <Text className="text-2xl font-bold text-white text-center mb-2">Verify Mobile Number</Text>
              <Text className="text-white/70 text-center mb-6">Enter the 6-digit verification code sent to {props.phone}</Text>
              <View className="flex-row justify-between mb-6">
                {props.digits.map((digit, index) => (
                  <TextInput key={index} ref={props.inputRefs[index]} value={digit}
                    className="w-[14%] aspect-square bg-[#15286A] rounded-xl border border-white/20 text-center text-white text-2xl font-bold"
                    accessibilityLabel={`Verification digit ${index + 1} of 6`} keyboardType="number-pad" maxLength={6}
                    autoComplete={index === 0 ? 'sms-otp' : 'off'} textContentType={index === 0 ? 'oneTimeCode' : 'none'}
                    editable={!props.verifying && !props.resending} selectTextOnFocus
                    onFocus={() => requestAnimationFrame(() => scroll.current?.scrollToEnd({ animated: false }))}
                    onChangeText={text => props.onChange(text, index)}
                    onKeyPress={event => { if (event.nativeEvent.key === 'Backspace') props.onBackspace(index); }} />
                ))}
              </View>
              {props.error && <Text accessibilityRole="alert" className="text-red-300 text-center mb-4">{props.error}</Text>}
              {(props.verifying || props.resending) && <View className="flex-row justify-center items-center gap-2 mb-4"><ActivityIndicator color="#10B981" /><Text className="text-white">{props.resending ? 'Sending code...' : 'Verifying code...'}</Text></View>}
              {props.timer > 0 ? <Text className="text-white/70 text-center">Resend code in {props.timer}s</Text>
                : <TouchableOpacity onPress={props.onResend} disabled={props.verifying || props.resending}><Text className="text-[#10B981] text-center font-bold">Resend Verification Code</Text></TouchableOpacity>}
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
