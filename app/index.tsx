import { useAuthStore } from '@/store/authStore';
import { Redirect } from 'expo-router';

export default function Index() {
  const { isAuthenticated, isLoading } = useAuthStore();
  
  if (isLoading) {
    return null;
  }
  
  return <Redirect href={isAuthenticated ? '/tabs/dashboard' : '/auth/splash'} />;
}
