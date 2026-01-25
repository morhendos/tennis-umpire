import { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMatch } from '@/lib/useMatch';
import { MatchFormatType } from '@/lib/scoring';
import { COLORS } from '@/constants/colors';
import { CoinFlip } from '@/components/CoinFlip';
import { SetupScreen } from '@/components/SetupScreen';
import { MatchScreen } from '@/components/MatchScreen';
import { ScreenWrapper } from '@/components/ScreenWrapper';

export default function ScoreboardScreen() {
  const insets = useSafeAreaInsets();
  const { match, startMatch, scorePoint, undo, resetMatch, canUndo, audioEnabled, toggleAudio } = useMatch();
  
  // Setup state
  const [playerAName, setPlayerAName] = useState('');
  const [playerBName, setPlayerBName] = useState('');
  const [selectedFormat, setSelectedFormat] = useState<MatchFormatType>('best_of_3');
  const [setupStep, setSetupStep] = useState<'players' | 'format'>('players');
  const [showCoinFlip, setShowCoinFlip] = useState(false);

  // Handlers
  const handleBeginMatch = () => {
    setShowCoinFlip(true);
  };

  const handleNextStep = () => {
    setSetupStep('format');
  };

  const handleBackStep = () => {
    setSetupStep('players');
  };

  const handleResetMatch = () => {
    resetMatch();
    setSetupStep('players');
  };

  const handleCoinFlipComplete = (server: 'A' | 'B') => {
    setShowCoinFlip(false);
    startMatch(playerAName.trim(), playerBName.trim(), server, selectedFormat);
  };

  // Coin Flip Screen
  if (showCoinFlip) {
    return (
      <ScreenWrapper>
        <View style={[styles.safeContent, { 
          paddingTop: insets.top, 
          paddingBottom: insets.bottom,
          paddingLeft: insets.left,
          paddingRight: insets.right,
        }]}>
          <CoinFlip 
            playerA={playerAName.trim()} 
            playerB={playerBName.trim()} 
            onComplete={handleCoinFlipComplete}
          />
        </View>
      </ScreenWrapper>
    );
  }

  // Setup Screen (Players or Format selection)
  if (!match) {
    return (
      <SetupScreen
        step={setupStep}
        playerAName={playerAName}
        playerBName={playerBName}
        selectedFormat={selectedFormat}
        onPlayerANameChange={setPlayerAName}
        onPlayerBNameChange={setPlayerBName}
        onFormatChange={setSelectedFormat}
        onNextStep={handleNextStep}
        onBackStep={handleBackStep}
        onBeginMatch={handleBeginMatch}
      />
    );
  }

  // Match Screen (Portrait or Landscape)
  return (
    <MatchScreen
      match={match}
      scorePoint={scorePoint}
      undo={undo}
      canUndo={canUndo}
      audioEnabled={audioEnabled}
      toggleAudio={toggleAudio}
      onResetMatch={handleResetMatch}
    />
  );
}

const styles = StyleSheet.create({
  safeContent: {
    flex: 1,
  },
});
