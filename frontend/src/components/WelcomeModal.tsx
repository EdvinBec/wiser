import {useEffect, useState} from 'react';
import {useAuth} from '@/contexts/AuthContext.shared';
import {AuthModal} from '@/components/AuthModal';

export function WelcomeModal() {
  const [showModal, setShowModal] = useState(false);
  const {isAuthenticated} = useAuth();

  useEffect(() => {
    // Don't show if user is already authenticated
    if (isAuthenticated) return;

    // Check if user has seen the welcome modal before
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');

    if (!hasSeenWelcome) {
      setShowModal(true);
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, [isAuthenticated]);

  const handleClose = () => {
    setShowModal(false);
  };

  return (
    <AuthModal
      open={showModal}
      onClose={handleClose}
    />
  );
}
