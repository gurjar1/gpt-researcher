import React, { useState, useEffect } from 'react';
import ResearchPageLayout from '@/components/layouts/ResearchPageLayout';
import DeepResearchLayout from '@/components/layouts/DeepResearchLayout';
import CopilotLayout from '@/components/layouts/CopilotLayout';
import MobileLayout from '@/components/layouts/MobileLayout';
import { ChatBoxSettings } from '@/types/data';

interface LayoutProps {
  children: React.ReactNode;
  loading: boolean;
  isStopped: boolean;
  showResult: boolean;
  onStop?: () => void;
  onNewResearch?: () => void;
  chatBoxSettings: ChatBoxSettings;
  setChatBoxSettings: React.Dispatch<React.SetStateAction<ChatBoxSettings>>;
  mainContentRef?: React.RefObject<HTMLDivElement>;
  showScrollButton?: boolean;
  onScrollToBottom?: () => void;
  toastOptions?: Record<string, any>;
  toggleSidebar?: () => void;
  isProcessingChat?: boolean;
}

// Convert to a proper React component to avoid hooks rules violation
const AppLayout: React.FC<LayoutProps> = ({
  children,
  loading,
  isStopped,
  showResult,
  onStop,
  onNewResearch,
  chatBoxSettings,
  setChatBoxSettings,
  mainContentRef,
  showScrollButton = false,
  onScrollToBottom,
  toastOptions = {},
  toggleSidebar,
  isProcessingChat = false
}) => {
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile on client-side
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener('resize', checkIfMobile);

    // Cleanup
    return () => window.removeEventListener('resize', checkIfMobile);
  }, []);

  // If on mobile, use the mobile layout
  if (isMobile) {
    return (
      <MobileLayout
        loading={loading}
        isStopped={isStopped}
        showResult={showResult}
        onStop={onStop}
        onNewResearch={onNewResearch}
        chatBoxSettings={chatBoxSettings}
        setChatBoxSettings={setChatBoxSettings}
        mainContentRef={mainContentRef}
        toastOptions={toastOptions}
        toggleSidebar={toggleSidebar}
      >
        {children}
      </MobileLayout>
    );
  }

  // For desktop, use either the copilot or research layout based on settings
  if (chatBoxSettings.layoutType === 'copilot') {
    return (
      <CopilotLayout
        loading={loading}
        isStopped={isStopped}
        showResult={showResult}
        onStop={onStop}
        onNewResearch={onNewResearch}
        chatBoxSettings={chatBoxSettings}
        setChatBoxSettings={setChatBoxSettings}
        mainContentRef={mainContentRef}
        toastOptions={toastOptions}
        toggleSidebar={toggleSidebar}
      >
        {children}
      </CopilotLayout>
    );
  }

  // Default to DeepResearchLayout for desktop (sidebar, no header/footer)
  return (
    <DeepResearchLayout
      loading={loading}
      isStopped={isStopped}
      showResult={showResult}
      onStop={onStop}
      onNewResearch={onNewResearch || (() => { })}
      chatBoxSettings={chatBoxSettings}
      setChatBoxSettings={setChatBoxSettings}
      mainContentRef={mainContentRef}
      showScrollButton={showScrollButton}
      onScrollToBottom={onScrollToBottom}
      toastOptions={toastOptions}
    >
      {children}
    </DeepResearchLayout>
  );
};

// Keep the old function for backwards compatibility but delegate to component
export const getAppropriateLayout = (props: LayoutProps) => {
  return <AppLayout {...props} />;
};

export default AppLayout;