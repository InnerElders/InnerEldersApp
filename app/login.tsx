//import { useAuth } from '@/contexts/auth-context';
import { useRouter } from 'expo-router';
import LoginScreen from '@/screens/LoginScreen';

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();

  const handleLogin = () => {
    login();
    router.replace('/(tabs)');
  };

  return <LoginScreen onLogin={handleLogin} />;
}
