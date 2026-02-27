import { useState } from 'react';
import RubiksClock from './components/RubiksClock.js';
import { HelpCircle, RotateCcw, Shuffle, FlipHorizontal } from 'lucide-react';

export default function App() {
  const [frontClocks, setFrontClocks] = useState(Array(9).fill(0));
  const [backClocks, setBackClocks] = useState(Array(9).fill(0));
  const [frontPins, setFrontPins] = useState([false, false, false, false]);
  const [backPins, setBackPins] = useState([false, false, false, false]);
  const [showingFront, setShowingFront] = useState(true);
  const [showGuide, setShowGuide] = useState(false);

  const handleWheelDrag = (side: 'front' | 'back', wheelIndex: number, delta: number) => {
    console.log(`Wheel dragged: ${side} side, wheel ${wheelIndex}, delta ${delta}`);
    // Add your logic here to update clocks based on wheel rotation
    // Example: rotate all clocks by delta
    if (side === 'front') {
      setFrontClocks(prev => prev.map(time => (time + delta + 12) % 12));
    } else {
      setBackClocks(prev => prev.map(time => (time + delta + 12) % 12));
    }
  };

  const handlePinClick = (side: 'front' | 'back', pinIndex: number) => {
    console.log(`Pin clicked: ${side} side, pin ${pinIndex}`);
    if (side === 'front') {
      setFrontPins(prev => prev.map((p, i) => i === pinIndex ? !p : p));
    } else {
      setBackPins(prev => prev.map((p, i) => i === pinIndex ? !p : p));
    }
  };

  const handleReset = () => {
    setFrontClocks(Array(9).fill(0));
    setBackClocks(Array(9).fill(0));
    setFrontPins([false, false, false, false]);
    setBackPins([false, false, false, false]);
  };

  const handleScramble = () => {
    setFrontClocks(Array(9).fill(0).map(() => Math.floor(Math.random() * 12)));
    setBackClocks(Array(9).fill(0).map(() => Math.floor(Math.random() * 12)));
  };

  const handleFlip = () => {
    setShowingFront(!showingFront);
    // You can add camera animation logic here if needed
  };

  return (
    <div className="w-full h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 relative">
      {/* Top Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-slate-800/90 backdrop-blur-sm border-b border-slate-700 shadow-lg">
        <div className="flex items-center justify-between px-6 py-3">
          <h1 className="text-xl font-bold text-white">Rubik's Clock</h1>
          
          <div className="flex items-center gap-3">
            {/* Flip Button */}
            <button
              onClick={handleFlip}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
            >
              <FlipHorizontal size={18} />
              Flip to {showingFront ? 'Back' : 'Front'}
            </button>

            {/* Reset Button */}
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
            >
              <RotateCcw size={18} />
              Reset
            </button>

            {/* Scramble Button */}
            <button
              onClick={handleScramble}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
            >
              <Shuffle size={18} />
              Scramble
            </button>

            {/* Guide Button */}
            <button
              onClick={() => setShowGuide(!showGuide)}
              className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors flex items-center gap-2 font-medium"
            >
              <HelpCircle size={18} />
              Guide
            </button>
          </div>
        </div>

        {/* Current Side Indicator */}
        <div className="px-6 pb-3">
          <div className="inline-block px-3 py-1 bg-slate-700/70 rounded-full text-sm text-slate-200">
            Currently viewing: <span className={`font-semibold ${showingFront ? 'text-blue-400' : 'text-slate-400'}`}>
              {showingFront ? 'Front (Light Blue)' : 'Back (Dark Gray)'}
            </span>
          </div>
        </div>
      </div>

      {/* Guide Panel */}
      {showGuide && (
        <div className="absolute top-24 right-6 z-20 bg-slate-800/95 backdrop-blur-sm p-6 rounded-lg shadow-2xl max-w-md border border-slate-700">
          <div className="flex items-start justify-between mb-4">
            <h2 className="text-lg font-bold text-white">How to Use</h2>
            <button
              onClick={() => setShowGuide(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              ✕
            </button>
          </div>

          <div className="space-y-4 text-sm text-slate-300">
            <div>
              <h3 className="font-semibold text-white mb-2">🎡 Wheels (Orange)</h3>
              <p>Located on the edges (top, bottom, left, right). <strong>Drag up/down</strong> to rotate connected clocks.</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">📍 Pins (Around Center)</h3>
              <p><span className="text-green-400">● Green = DOWN</span> (engaged)</p>
              <p><span className="text-red-400">● Red = UP</span> (disengaged)</p>
              <p className="mt-1"><strong>Click</strong> to toggle engagement state.</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">🔄 View Controls</h3>
              <p><strong>Drag background</strong> to rotate the 3D view and see different angles.</p>
              <p className="mt-1"><strong>Flip button</strong> to switch between front and back sides.</p>
            </div>

            <div>
              <h3 className="font-semibold text-white mb-2">🎯 Goal</h3>
              <p>Get all 18 clocks (9 front + 9 back) to show <strong>12:00</strong></p>
            </div>

            <div className="pt-3 border-t border-slate-600">
              <p className="text-xs text-slate-400">
                <strong>Note:</strong> Each clock has 12 discrete positions (like a real clock). Implement your own logic for wheel mechanics!
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 3D Clock */}
      <div className="pt-24 h-full">
        <RubiksClock
          frontClocks={frontClocks}
          backClocks={backClocks}
          frontPins={frontPins}
          backPins={backPins}
          onWheelDrag={handleWheelDrag}
          onPinClick={handlePinClick}
        />
      </div>
    </div>
  );
}
