
export interface GameState {
  health: number;
  mental: number;
  inventory: string[];
  history: GameScene[];
  currentScene: GameScene | null;
  isLoading: boolean;
}

export interface GameScene {
  id: string;
  description: string;
  imagePrompt: string;
  imageUrl?: string;
  choices: Choice[];
  isEnding: boolean;
}

export interface Choice {
  text: string;
  action: string;
  outcomeDescription?: string;
}

export interface GeminiResponse {
  description: string;
  imagePrompt: string;
  choices: {
    text: string;
    action: string;
  }[];
  isEnding: boolean;
  statusUpdate: {
    healthChange: number;
    mentalChange: number;
    foundItem?: string;
  };
}
