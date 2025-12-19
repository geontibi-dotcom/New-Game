
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, GameScene, GeminiResponse } from './types';
import { generateScene, generateImage } from './services/geminiService';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>({
    health: 100,
    mental: 100,
    inventory: [],
    history: [],
    currentScene: null,
    isLoading: false,
  });

  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const startGame = async () => {
    setGameState(prev => ({ ...prev, isLoading: true }));
    setError(null);
    try {
      const initialResponse = await generateScene("게임을 시작합니다. 주인공이 깨어난 장면부터 시작해줘.", []);
      const imageUrl = await generateImage(initialResponse.imagePrompt);
      
      const firstScene: GameScene = {
        id: Date.now().toString(),
        description: initialResponse.description,
        imagePrompt: initialResponse.imagePrompt,
        imageUrl: imageUrl,
        choices: initialResponse.choices,
        isEnding: initialResponse.isEnding,
      };

      setGameState(prev => ({
        ...prev,
        currentScene: firstScene,
        history: [firstScene],
        isLoading: false,
        health: 100,
        mental: 100,
        inventory: initialResponse.statusUpdate.foundItem ? [initialResponse.statusUpdate.foundItem] : []
      }));
    } catch (err) {
      setError("게임 데이터를 불러오는 중 오류가 발생했습니다. 다시 시도해 주세요.");
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleChoice = async (action: string) => {
    if (gameState.isLoading) return;

    setGameState(prev => ({ ...prev, isLoading: true }));
    setError(null);

    try {
      const response = await generateScene(action, gameState.history.map(h => ({ description: h.description, choices: h.choices })));
      const imageUrl = await generateImage(response.imagePrompt);

      const nextScene: GameScene = {
        id: Date.now().toString(),
        description: response.description,
        imagePrompt: response.imagePrompt,
        imageUrl: imageUrl,
        choices: response.choices,
        isEnding: response.isEnding,
      };

      setGameState(prev => {
        const newInventory = [...prev.inventory];
        if (response.statusUpdate.foundItem && !newInventory.includes(response.statusUpdate.foundItem)) {
          newInventory.push(response.statusUpdate.foundItem);
        }

        return {
          ...prev,
          health: Math.max(0, Math.min(100, prev.health + response.statusUpdate.healthChange)),
          mental: Math.max(0, Math.min(100, prev.mental + response.statusUpdate.mentalChange)),
          inventory: newInventory,
          currentScene: nextScene,
          history: [...prev.history, nextScene],
          isLoading: false
        };
      });
    } catch (err) {
      setError("응답 생성 중 오류가 발생했습니다.");
      setGameState(prev => ({ ...prev, isLoading: false }));
    }
  };

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [gameState.currentScene, gameState.isLoading]);

  if (!gameState.currentScene && !gameState.isLoading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black p-6 text-center">
        <div className="max-w-2xl">
          <h1 className="text-6xl font-orbitron font-bold mb-4 neon-glow text-violet-500 uppercase tracking-tighter">Neo Seoul</h1>
          <h2 className="text-2xl font-orbitron text-cyan-400 mb-8 tracking-widest uppercase">Shards of Memory</h2>
          <p className="text-gray-400 mb-12 leading-relaxed">
            서기 2088년, 비 내리는 네오 서울의 어두운 뒷골목.<br/>
            당신은 기억을 잃은 채 낯선 골목길에서 깨어났습니다.<br/>
            도시의 그림자 속에 숨겨진 거대한 음모를 파헤치고 잃어버린 기억의 조각을 찾으십시오.
          </p>
          <button
            onClick={startGame}
            className="px-12 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-full transition-all transform hover:scale-105 active:scale-95 shadow-[0_0_20px_rgba(139,92,246,0.4)] uppercase font-orbitron tracking-widest"
          >
            기억 추적 시작
          </button>
        </div>
        <div className="absolute bottom-10 text-xs text-gray-600 font-mono">
          SYSTEM_VERSION: 1.0.4-BETA | PROTOCOL: GEMINI_GEN_AI
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-950 flex flex-col md:flex-row overflow-hidden">
      {/* Left Panel: Visuals & Stats */}
      <div className="w-full md:w-2/3 h-1/2 md:h-full relative flex flex-col border-r border-neutral-800">
        <div className="flex-1 relative overflow-hidden">
          {gameState.currentScene?.imageUrl ? (
            <img
              src={gameState.currentScene.imageUrl}
              alt="Current Scene"
              className="absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 animate-in fade-in fill-mode-forwards"
            />
          ) : (
            <div className="absolute inset-0 bg-neutral-900 flex items-center justify-center">
              <div className="text-violet-500 animate-pulse font-orbitron">VISUALIZING...</div>
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent opacity-60"></div>
          
          {/* Overlay UI */}
          <div className="absolute top-6 left-6 right-6 flex justify-between items-start">
            <div className="glass-panel p-4 rounded-xl flex gap-6">
              <StatItem label="HP" value={gameState.health} color="text-rose-500" bgColor="bg-rose-500" />
              <StatItem label="PSY" value={gameState.mental} color="text-cyan-400" bgColor="bg-cyan-400" />
            </div>
            
            <div className="glass-panel p-4 rounded-xl max-w-xs">
              <h3 className="text-xs font-orbitron text-neutral-500 mb-2 uppercase tracking-tighter">Inventory</h3>
              <div className="flex flex-wrap gap-2">
                {gameState.inventory.length > 0 ? (
                  gameState.inventory.map((item, idx) => (
                    <span key={idx} className="text-xs bg-neutral-800 text-neutral-300 px-2 py-1 rounded border border-neutral-700">
                      {item}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-neutral-600 italic">No items found</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Action Panel for Mobile (overlaps image) */}
        <div className="md:hidden p-4 bg-black/80 backdrop-blur border-t border-white/10">
           {gameState.isLoading ? (
             <div className="flex items-center justify-center py-4">
                <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin"></div>
             </div>
           ) : (
             <div className="grid grid-cols-1 gap-2">
                {gameState.currentScene?.choices.map((choice, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleChoice(choice.action)}
                    className="w-full py-3 px-4 bg-neutral-800 hover:bg-neutral-700 text-left text-sm rounded-lg border border-neutral-700 transition-all active:scale-95"
                  >
                    {choice.text}
                  </button>
                ))}
             </div>
           )}
        </div>
      </div>

      {/* Right Panel: Narrative & Controls */}
      <div className="w-full md:w-1/3 h-1/2 md:h-full flex flex-col bg-black">
        <div ref={scrollRef} className="flex-1 overflow-y-auto p-6 space-y-8">
          {gameState.history.map((scene, index) => (
            <div key={scene.id} className={`animate-in slide-in-from-bottom-4 duration-500 ${index === gameState.history.length - 1 ? 'opacity-100' : 'opacity-40'}`}>
               <p className="text-neutral-300 leading-relaxed text-lg font-light selection:bg-violet-500/30">
                  {scene.description}
               </p>
               {index < gameState.history.length - 1 && (
                 <div className="mt-4 flex items-center gap-2">
                    <div className="h-[1px] flex-1 bg-neutral-800"></div>
                    <span className="text-[10px] font-orbitron text-neutral-600">CONTINUE</span>
                    <div className="h-[1px] flex-1 bg-neutral-800"></div>
                 </div>
               )}
            </div>
          ))}

          {gameState.isLoading && (
            <div className="flex items-center gap-4 text-violet-500 animate-pulse">
              <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce"></div>
              <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-.3s]"></div>
              <div className="w-1.5 h-1.5 bg-violet-500 rounded-full animate-bounce [animation-delay:-.5s]"></div>
              <span className="text-xs font-orbitron tracking-widest uppercase">System Processing...</span>
            </div>
          )}
          
          {error && (
            <div className="bg-red-900/20 border border-red-500/50 p-4 rounded-lg text-red-400 text-sm">
              {error}
              <button onClick={() => window.location.reload()} className="block mt-2 underline">Reload System</button>
            </div>
          )}
        </div>

        {/* Choice Interface - Desktop Only */}
        <div className="hidden md:block p-8 border-t border-neutral-800 bg-neutral-900/50">
          {!gameState.isLoading && !gameState.currentScene?.isEnding && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-orbitron text-neutral-500 uppercase tracking-[0.2em] mb-4">Input Sequence</h4>
              {gameState.currentScene?.choices.map((choice, idx) => (
                <button
                  key={idx}
                  onClick={() => handleChoice(choice.action)}
                  className="w-full group flex items-center justify-between p-4 bg-black hover:bg-violet-950/30 border border-neutral-800 hover:border-violet-500/50 rounded-xl transition-all duration-300 text-left"
                >
                  <span className="text-neutral-300 group-hover:text-white transition-colors">{choice.text}</span>
                  <span className="text-neutral-700 group-hover:text-violet-500 font-orbitron text-xs">0{idx + 1}</span>
                </button>
              ))}
            </div>
          )}

          {gameState.currentScene?.isEnding && (
            <div className="text-center">
               <h3 className="text-2xl font-orbitron text-violet-500 mb-4 tracking-widest">TRANSMISSION ENDED</h3>
               <button
                 onClick={() => window.location.reload()}
                 className="px-8 py-3 bg-neutral-800 hover:bg-neutral-700 rounded-lg text-white font-orbitron text-sm tracking-widest transition-colors"
               >
                 REBOOT SYSTEM
               </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

interface StatItemProps {
  label: string;
  value: number;
  color: string;
  bgColor: string;
}

const StatItem: React.FC<StatItemProps> = ({ label, value, color, bgColor }) => (
  <div className="flex flex-col gap-1 w-20">
    <div className="flex justify-between items-end">
      <span className={`text-[10px] font-orbitron ${color}`}>{label}</span>
      <span className="text-[10px] text-neutral-400 font-orbitron">{value}%</span>
    </div>
    <div className="h-1 bg-neutral-800 rounded-full overflow-hidden">
      <div 
        className={`h-full ${bgColor} transition-all duration-1000 ease-out`} 
        style={{ width: `${value}%` }}
      ></div>
    </div>
  </div>
);

export default App;
