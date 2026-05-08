import { Link } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { AuthApiError } from '@/services/auth';
import { login } from '@/store/auth-store';

function validateEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Correo y contrasena son obligatorios.');
      return;
    }
    if (!validateEmail(email)) {
      setError('Ingresa un correo valido.');
      return;
    }
    if (password.length < 8) {
      setError('La contrasena debe tener al menos 8 caracteres.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await login({ email: email.trim().toLowerCase(), password });
    } catch (requestError) {
      if (requestError instanceof AuthApiError) {
        if (requestError.code === 'INVALID_CREDENTIALS') setError('Credenciales invalidas.');
        else if (requestError.code === 'USER_INACTIVE') setError('Tu usuario esta inactivo.');
        else setError(requestError.message);
      } else {
        setError('No fue posible iniciar sesion.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      <KeyboardAvoidingView behavior={Platform.select({ ios: 'padding', android: undefined })} style={styles.flex}>
        <View style={styles.content}>
          <View style={styles.brand}>
          </View>

          <View style={styles.card}>
            <Text style={styles.welcome}>Welcome</Text>

            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor="#8f8f8f"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />

            <Text style={styles.label}>Password</Text>
            <View style={styles.passwordWrap}>
              <TextInput
                style={styles.passwordInput}
                placeholder="Password"
                placeholderTextColor="#8f8f8f"
                value={password}
                secureTextEntry={!showPassword}
                onChangeText={setPassword}
              />
              <Pressable
                onPress={() => setShowPassword((current) => !current)}
                style={({ pressed }) => [styles.eyeButton, pressed && styles.eyeButtonPressed]}>
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={22}
                  color="#7d1ab1"
                />
              </Pressable>
            </View>

            <Link href="/(auth)/forgot-password" style={styles.forgotLink}>
              Forgot Password?
            </Link>

            {error ? <Text style={styles.error}>{error}</Text> : null}

            <Pressable
              style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed, loading && styles.loginButtonDisabled]}
              onPress={handleLogin}
              disabled={loading}>
              {loading ? <ActivityIndicator color="#1d1d1d" /> : <Text style={styles.loginButtonText}>Login</Text>}
            </Pressable>

            <Text style={styles.infoText}>Not a client yet?</Text>
            <Link href="mailto:soporte@demo.local" style={styles.infoLink}>
              Click here for more information!
            </Link>
          </View>

          <View style={styles.social}>
            <Text style={styles.socialTitle}>Follow us on social media</Text>
            <View style={styles.socialIcons}>
              <Ionicons name="logo-facebook" size={28} color="#ffffff" />
              <Ionicons name="logo-instagram" size={28} color="#ffffff" />
              <Ionicons name="logo-youtube" size={28} color="#ffffff" />
              <Ionicons name="logo-tiktok" size={28} color="#ffffff" />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: '#6b0ca8',
    flex: 1,
  },
  flex: {
    flex: 1,
  },
  glowTop: {
    backgroundColor: '#7f1cc0',
    borderRadius: 280,
    height: 320,
    left: -80,
    opacity: 0.28,
    position: 'absolute',
    top: -140,
    width: 320,
  },
  glowBottom: {
    backgroundColor: '#4d007e',
    borderRadius: 280,
    bottom: -180,
    height: 360,
    opacity: 0.3,
    position: 'absolute',
    right: -90,
    width: 360,
  },
  content: {
    alignItems: 'center',
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 24,
  },
  brand: {
    alignItems: 'center',
    marginTop: 8,
  },
  brandTop: {
    color: '#ffffff',
    fontSize: 56,
    fontWeight: '900',
    letterSpacing: 1.5,
    lineHeight: 56,
  },
  brandCheck: {
    color: '#9ad73a',
  },
  brandBottom: {
    color: '#9ad73a',
    fontSize: 46,
    fontWeight: '700',
    letterSpacing: 1.3,
    lineHeight: 48,
    marginTop: -4,
  },
  card: {
    backgroundColor: '#ececec',
    borderRadius: 18,
    maxWidth: 460,
    paddingHorizontal: 18,
    paddingVertical: 20,
    width: '100%',
  },
  welcome: {
    color: '#7019a7',
    fontSize: 36,
    fontWeight: '900',
    marginBottom: 14,
    textAlign: 'center',
  },
  label: {
    color: '#1a1a1a',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#f2f2f2',
    borderColor: '#b6b6b6',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1a1a1a',
    fontSize: 18,
    marginBottom: 14,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  passwordWrap: {
    alignItems: 'center',
    backgroundColor: '#f2f2f2',
    borderColor: '#b6b6b6',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    marginBottom: 12,
  },
  passwordInput: {
    color: '#1a1a1a',
    flex: 1,
    fontSize: 18,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  eyeButton: {
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  eyeButtonPressed: {
    opacity: 0.7,
  },
  forgotLink: {
    color: '#202020',
    fontSize: 17,
    marginBottom: 14,
    textAlign: 'center',
  },
  error: {
    color: '#b41f1f',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
    textAlign: 'center',
  },
  loginButton: {
    alignItems: 'center',
    backgroundColor: '#98cf2e',
    borderRadius: 8,
    paddingVertical: 12,
  },
  loginButtonPressed: {
    opacity: 0.86,
  },
  loginButtonDisabled: {
    opacity: 0.75,
  },
  loginButtonText: {
    color: '#141414',
    fontSize: 30,
    fontWeight: '900',
  },
  infoText: {
    color: '#1d1d1d',
    fontSize: 16,
    marginTop: 14,
    textAlign: 'center',
  },
  infoLink: {
    backgroundColor: '#e5d3ea',
    borderRadius: 8,
    color: '#6f1ca4',
    fontSize: 17,
    fontWeight: '700',
    marginTop: 10,
    overflow: 'hidden',
    paddingVertical: 10,
    textAlign: 'center',
  },
  social: {
    alignItems: 'center',
    marginTop: 18,
  },
  socialTitle: {
    color: '#f7f2fb',
    fontSize: 15,
    marginBottom: 10,
  },
  socialIcons: {
    flexDirection: 'row',
    gap: 14,
  },
});
