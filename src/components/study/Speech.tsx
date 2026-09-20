import type { ReactNode } from "react";
import { useAudio } from "../../lib/use-audio";
export function Speak({
  text,
  className = "speak-btn",
  label = "Read aloud",
  children = "🔊",
}: {
  text: string;
  className?: string;
  label?: string;
  children?: ReactNode;
}) {
  const audio = useAudio(text);
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={label}
        title={label}
        disabled={audio.busy && !className.includes("read-card-btn")}
        onClick={audio.playing && className.includes("read-card-btn") ? audio.stopPlayback : audio.speak}
      >
        {audio.playing && className.includes("read-card-btn") ? "⏹ 停止朗读" : audio.busy ? "..." : children}
      </button>
      {audio.message && (
        <span role="status" className="audio-feedback">
          {audio.message}
        </span>
      )}
    </>
  );
}
export function Follow({
  text,
  className,
  label,
}: {
  text: string;
  className: string;
  label: string;
}) {
  const audio = useAudio(text);
  return (
    <>
      <button
        type="button"
        className={className}
        aria-label={label}
        disabled={audio.busy}
        onClick={audio.recording ? audio.stopRecording : audio.startRecording}
      >
        {audio.recording ? "⏹ 结束录音" : audio.busy ? "评分中…" : "🎙️ 跟读"}
      </button>
      {audio.message && (
        <p className="follow-result" role="status">
          {audio.message}
        </p>
      )}
    </>
  );
}
