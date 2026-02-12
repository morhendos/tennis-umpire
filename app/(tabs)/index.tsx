import { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMatch } from '@/lib/useMatch';
import { useFlic } from '@/lib/useFlic';
import { announceFullScore } from '@/lib/speech';
import { MatchFormatType } from '@/lib/scoring';
import { useColors } from '@/constants/colors';
import { CoinFlip } from '@/components/CoinFlip';
import { SetupScreen } from '@/components/SetupScreen';
import { MatchScreen } from '@/components/MatchScreen';
import { ScreenWrapper } from '@/components/ScreenWrapper';

export default function ScoreboardScreen() {
  const insets = useSafeAreaInsets();
  const c = useColors();
  const { match, startMatch, scorePoint, undo, resetMatch, canUndo, audioEnabled, toggleAudio } = useMatch();

  // Connect Flic buttons to match scoring
  const flic = useFlic({
    onScorePoint: useCallback((player: 'A' | 'B') => {
      if (match) scorePoint(player);
    }, [match, scorePoint]),
    onUndo: useCallback(() => {
      if (match && canUndo) undo();
    }, [match, canUndo, undo]),
    onAnnounceScore: useCallback(() => {
      if (match) announceFullScore(match);
    }, [match]),
    enabled: !!match,
  });
  
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
      <ScreenWrapper colors={c}>
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
        flicState={{
          isInitialized: flic.isInitialized,
          buttons: flic.buttons,
          assignments: flic.assignments,
          swapAssignments: flic.swapAssignments,
        }}
      />
    );
  }

  // Match Screen (Portrait or Landscape)
  const flicActive = flic.isInitialized 
    && !!flic.assignments.playerA 
    && !!flic.assignments.playerB;

  return (
    <MatchScreen
      match={match}
      scorePoint={scorePoint}
      undo={undo}
      canUndo={canUndo}
      audioEnabled={audioEnabled}
      toggleAudio={toggleAudio}
      onResetMatch={handleResetMatch}
      flicActive={flicActive}
    />
  );
}

const styles = StyleSheet.create({
  safeContent: {
    flex: 1,
  },
});
