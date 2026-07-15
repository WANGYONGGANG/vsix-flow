import { Play, Pause, RotateCcw } from 'lucide-react';

interface Props {
  isPlaying: boolean;
  progress: number;
  onPlay: () => void;
  onPause: () => void;
  onReplay: () => void;
  onSeek: (v: number) => void;
}

export default function LivePlayer({ isPlaying, progress, onPlay, onPause, onReplay, onSeek }: Props) {
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={isPlaying ? onPause : onPlay}
        className="rounded p-1.5 hover:bg-fund-card transition-colors"
        title={isPlaying ? '暂停' : '播放'}
      >
        {isPlaying ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button
        onClick={onReplay}
        className="rounded p-1.5 hover:bg-fund-card transition-colors"
        title="重播"
      >
        <RotateCcw size={16} />
      </button>
      <div className="flex items-center gap-1 w-24">
        <span className="text-xs text-fund-fg/50">{Math.floor(progress * 100)}%</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={progress}
          onChange={(e) => onSeek(parseFloat(e.target.value))}
          className="flex-1 h-1 accent-fund-up"
        />
      </div>
    </div>
  );
}